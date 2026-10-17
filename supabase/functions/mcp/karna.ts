// Halkvakts MCP-server, kärnan (DECISIONS #630, kort #281). Deno-fri och ren: den får JSON-RPC-meddelandet, en funktion som
// hämtar sajtens publika datafiler och klockan, och lämnar svaret. index.ts sköter HTTP, takspärren och cachen.
//
// Regler, samma som appen och sajten:
// - Bara det datan bär: vad Trafikverket rapporterar och vad vägväderstationerna mäter nu. Inga prognoser, och inga avstånd
//   (stationerna är punktkällor).
// - Varje svar säger klockslaget och källan. Data äldre än två timmar sägs.
// - Servern sparar inga frågor. Ingenting här skriver något någonstans.

export type Hamta = (fil: string) => Promise<unknown>;

type Lan = { kod: number; namn: string; kort: string; slug: string; halt: number; vagavsnitt: number; kalla: number;
  kallast: { namn: string; yta: number } | null; olyckor: number };
type LanFil = { generated_at: string; lan: Lan[] };
type Stracka = { plats: string; halt: boolean; text: string; info: string[] };
type StrackVag = { vag: string; strackor: Stracka[]; kallast: { namn: string; yta: number } | null; kalla: number };
type StrackFil = { generated_at: string; lan: { slug: string; kort: string; vagar: StrackVag[] }[] };
type MetaFil = { generated_at: string; smhi_vinter?: { event: string; niva: string; omrade: string }[] };

export const PROTOKOLL = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const SIDBAS = "https://halkvakt.se";
const SMHI_VAG = /snö|underkyl|isbel|ishalk|halk/i;   // samma ord som marknadsforing/posta.mjs
const GAMMAL_H = 2;

// ---------- Formen på tal och tider (varumärkesguiden: riktigt minus, decimalkomma, 24-timmars tid) ----------

export const grad = (c: number) => `${c.toFixed(1).replace(".", ",").replace("-", "−")} °C`;
const kl = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" })
  .format(new Date(iso));
const plural = (n: number, en: string, flera: string) => `${n} ${n === 1 ? en : flera}`;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

function kallrad(generated_at: string, nu: Date): string {
  const alder = (nu.getTime() - new Date(generated_at).getTime()) / 3_600_000;
  const rad = `Källa: Trafikverkets öppna data via Halkvakt, läget kl. ${kl(generated_at)}. Det är rapporterat nuläge, ingen prognos.`;
  return alder > GAMMAL_H ? `${rad} Obs: datan är ${Math.floor(alder)} timmar gammal.` : rad;
}

// ---------- Län och vägar ur fritext ----------

export function hittaLan(fritt: string, lan: Lan[]): Lan | null {
  const q = norm(fritt).replace(/s? lan$/, "").replace(/ lan$/, "");
  return lan.find((l) => [l.slug, l.kort, l.namn].some((x) => {
    const n = norm(x).replace(/s? lan$/, "");
    return n === q || norm(x) === norm(fritt);
  })) ?? null;
}

/** "E18", "e 18", "E18 Karlstad" → "E 18"; "riksväg 26", "rv26", "väg 26", "26" → "Väg 26". Samma form som strackor.json. */
export function vagNamn(fritt: string): string | null {
  const q = norm(fritt);
  const e = q.match(/\be ?(\d{1,3})\b/);
  if (e) return `E ${Number(e[1])}`;
  const v = q.match(/\b(?:riksvag|rv|vag|lansvag|lv)? ?(\d{1,3})\b/);
  return v ? `Väg ${Number(v[1])}` : null;
}

// ---------- Verktygen ----------

const LAN_ARG = { type: "string", description: "Länet, t.ex. Värmland, Västra Götaland eller Norrbottens län." };

export const VERKTYG = [
  { name: "lage_i_lan", title: "Väglaget i ett län",
    description: "Väglaget i ett svenskt län just nu: hur många vägavsnitt Trafikverket rapporterar med halka, hur många vägväderstationer som visar vägbana under noll, den kallaste vägbanan och pågående olyckor.",
    inputSchema: { type: "object", properties: { lan: LAN_ARG }, required: ["lan"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "vag", title: "Väglaget på en väg",
    description: "Väglaget på en E-väg eller riksväg just nu, sträcka för sträcka enligt Trafikverket, i ett län eller i alla län vägen går genom, med den kallaste vägbanan vid vägen.",
    inputSchema: { type: "object", properties: { vag: { type: "string", description: "Vägen, t.ex. E18, E4 eller riksväg 26." }, lan: { ...LAN_ARG, description: "Valfritt: bara i det här länet." } }, required: ["vag"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "sverige_just_nu", title: "Väglaget i Sverige",
    description: "Läget i hela Sverige just nu: län där Trafikverket rapporterar halka eller där vägbanan är under noll, rikstalen och SMHI:s varningar som rör väglaget.",
    inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "kallaste_stationer", title: "Kallaste vägbanorna",
    description: "Var vägbanan är kallast i Sverige just nu: den kallaste vägväderstationen i varje län, kallast först, med namn och temperatur. Bara stationer på 0 °C eller kallare.",
    inputSchema: { type: "object", properties: { antal: { type: "integer", minimum: 1, maximum: 21, description: "Hur många län, 1–21. Standard 5." } } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
];

const text = (t: string, fel = false) => ({ content: [{ type: "text", text: t }], ...(fel ? { isError: true } : {}) });

async function lageILan(arg: Record<string, unknown>, hamta: Hamta, nu: Date) {
  const d = await hamta("lan.json") as LanFil;
  const l = hittaLan(String(arg.lan ?? ""), d.lan);
  if (!l) return text(`Hittar inget län som heter "${String(arg.lan ?? "")}". Länen är: ${d.lan.map((x) => x.kort).join(", ")}.`, true);
  const rader = [
    l.halt ? `I ${l.kort} rapporterar Trafikverket halka eller vinterväglag på ${l.halt} av länets ${l.vagavsnitt} vägavsnitt.`
      : `I ${l.kort} rapporterar Trafikverket ingen halka på länets ${l.vagavsnitt} vägavsnitt.`,
    l.kalla && l.kallast ? `${plural(l.kalla, "vägväderstation visar", "vägväderstationer visar")} vägbana på 0 °C eller kallare, kallast ${grad(l.kallast.yta)} vid ${l.kallast.namn}.`
      : "Ingen vägväderstation i länet visar vägbana under noll.",
    l.olyckor ? `${plural(l.olyckor, "olycka eller hinder pågår", "olyckor eller hinder pågår")} enligt Trafikverket.` : "",
    `Mer: ${SIDBAS}/lan/${l.slug}/`,
    kallrad(d.generated_at, nu),
  ];
  return text(rader.filter(Boolean).join("\n"));
}

async function vag(arg: Record<string, unknown>, hamta: Hamta, nu: Date) {
  const d = await hamta("strackor.json") as StrackFil;
  const namn = vagNamn(String(arg.vag ?? ""));
  if (!namn) return text(`Förstår inte vägen "${String(arg.vag ?? "")}". Skriv t.ex. E18 eller riksväg 26.`, true);
  let lan = d.lan;
  if (arg.lan) {
    const lanFil = await hamta("lan.json") as LanFil;
    const l = hittaLan(String(arg.lan), lanFil.lan);
    if (!l) return text(`Hittar inget län som heter "${String(arg.lan)}".`, true);
    lan = d.lan.filter((x) => x.slug === l.slug);
  }
  const traffar = lan.flatMap((l) => l.vagar.filter((v) => v.vag === namn).map((v) => ({ l, v })));
  const visa = namn.replace("Väg ", "riksväg ").replace("E ", "E");
  if (!traffar.length) return text(`Halkvakt följer inte ${visa}${arg.lan ? " i det länet" : ""}. Vägarna som följs är E-vägarna och de större riksvägarna i varje län.`, true);
  const rader: string[] = [];
  for (const { l, v } of traffar) {
    const hala = v.strackor.filter((s) => s.halt);
    const sträckor = hala.map((s) => `${s.plats.replace(/ - /g, "–")} (${[s.text, ...s.info].filter(Boolean).join(", ")})`);
    rader.push(hala.length ? `${l.kort}: halka på ${hala.length} av ${v.strackor.length} sträckor: ${sträckor.join("; ")}.`
      : `${l.kort}: ingen halka rapporterad på vägens ${v.strackor.length} sträckor.`);
    if (v.kallast) rader.push(`  Kallast vid vägen: ${grad(v.kallast.yta)} vid ${v.kallast.namn}.`);
  }
  return text([`${visa} enligt Trafikverket:`, ...rader, kallrad(d.generated_at, nu)].join("\n"));
}

async function sverige(hamta: Hamta, nu: Date) {
  const [d, m] = await Promise.all([hamta("lan.json") as Promise<LanFil>, hamta("meta.json") as Promise<MetaFil>]);
  const halt = d.lan.filter((l) => l.halt > 0).sort((a, b) => b.halt - a.halt);
  const kalla = d.lan.filter((l) => l.halt === 0 && l.kalla > 0).sort((a, b) => b.kalla - a.kalla);
  const varningar = (m.smhi_vinter ?? []).filter((v) => SMHI_VAG.test(v.event) && !/havs?\b/i.test(v.omrade));
  const rader = [
    halt.length ? `Trafikverket rapporterar halka i ${plural(halt.length, "län", "län")}: ${halt.map((l) => `${l.kort} (${l.halt} av ${l.vagavsnitt} vägavsnitt)`).join(", ")}.`
      : "Trafikverket rapporterar ingen halka i något län.",
    kalla.length ? `Vägbana under noll men ingen rapporterad halka: ${kalla.map((l) => `${l.kort} (${plural(l.kalla, "station", "stationer")})`).join(", ")}.` : "",
    // Rikstalen ur länen: meta.json räknar även Finlands och Danmarks stationer.
    `I Sverige visar ${plural(d.lan.reduce((n, l) => n + l.kalla, 0), "vägväderstation", "vägväderstationer")} vägbana på 0 °C eller kallare, och ${plural(d.lan.reduce((n, l) => n + l.olyckor, 0), "olycka eller hinder pågår", "olyckor eller hinder pågår")}.`,
    varningar.length ? `SMHI varnar: ${varningar.map((v) => `${v.niva} varning, ${v.event.toLowerCase()}, ${v.omrade}`).join("; ")}.` : "SMHI har ingen varning som rör väglaget.",
    `Läget per län: ${SIDBAS}/lan/`,
    kallrad(d.generated_at, nu),
  ];
  return text(rader.filter(Boolean).join("\n"));
}

async function kallaste(arg: Record<string, unknown>, hamta: Hamta, nu: Date) {
  // Ur lan.json, inte ur vader.geojson: där står varje stations råvärde, även trasiga givare (−49,9 °C i Ollsta 17/10).
  // Länens kallast har gått genom samma vakter som sajten och appen, så listan blir länens kallaste, en per län.
  const antal = Math.min(21, Math.max(1, Math.floor(Number(arg.antal ?? 5)) || 5));
  const d = await hamta("lan.json") as LanFil;
  const lista = d.lan.filter((l) => l.kallast).sort((a, b) => a.kallast!.yta - b.kallast!.yta).slice(0, antal);
  if (!lista.length) return text("Ingen vägväderstation visar vägbana på 0 °C eller kallare just nu.");
  return text(["Kallast vägbana just nu, den kallaste stationen i varje län:",
    ...lista.map((l, i) => `${i + 1}. ${l.kallast!.namn} (${l.kort}): ${grad(l.kallast!.yta)}`), kallrad(d.generated_at, nu)].join("\n"));
}

// ---------- JSON-RPC ----------

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const svar = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fel = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Ett JSON-RPC-meddelande in, svaret ut. Notiser (utan id) får null: HTTP-lagret svarar då 202 utan kropp. */
export async function hantera(m: Rpc, hamta: Hamta, nu = new Date()): Promise<object | null> {
  if (!m || typeof m !== "object" || m.jsonrpc !== "2.0" || typeof m.method !== "string") return fel(m?.id, -32600, "Ogiltig förfrågan");
  if (m.id === undefined) return null;
  switch (m.method) {
    case "initialize": {
      const onskad = String(m.params?.protocolVersion ?? "");
      return svar(m.id, {
        protocolVersion: PROTOKOLL.includes(onskad) ? onskad : PROTOKOLL[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "halkvakt", title: "Halkvakt", version: "1.0.0", websiteUrl: SIDBAS },
        instructions: "Väglaget i Sverige just nu ur Trafikverkets öppna data: halka per län och väg, vägbanans temperatur vid vägväderstationerna och SMHI:s varningar. Svaren är rapporterat nuläge, ingen prognos. Ange alltid klockslaget och källan när du återger dem.",
      });
    }
    case "ping": return svar(m.id, {});
    case "tools/list": return svar(m.id, { tools: VERKTYG });
    case "tools/call": {
      const namn = String(m.params?.name ?? "");
      const arg = (m.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        if (namn === "lage_i_lan") return svar(m.id, await lageILan(arg, hamta, nu));
        if (namn === "vag") return svar(m.id, await vag(arg, hamta, nu));
        if (namn === "sverige_just_nu") return svar(m.id, await sverige(hamta, nu));
        if (namn === "kallaste_stationer") return svar(m.id, await kallaste(arg, hamta, nu));
        return fel(m.id, -32602, `Okänt verktyg: ${namn}`);
      } catch {
        return svar(m.id, text("Läget gick inte att hämta just nu. Försök igen om en stund, eller se halkvakt.se/lan.", true));
      }
    }
    default: return fel(m.id, -32601, `Okänd metod: ${m.method}`);
  }
}
