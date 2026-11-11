// APP-RÄKNAREN — appens anonyma dagsräknare (DECISIONS #772; Axel och Bengt 1/11; sex områden DECISIONS #787, 3/11).
//
// Tar emot ETT ord per anrop: {h, v, app, ver, k}. h är händelsen, v värdet, app vilken app, ver appens version och k kohorten
// (ny | befintlig: installerad före eller efter räknaren). Inget annat — ingen position, inget enhets-id, ingen tid: raden räknas
// upp på dygnet den kommer in (svensk tid, sql/077, sql/082). Ett vaktpass syns bara som start, längd i fyra hinkar och hur det
// slutade; aldrig sträcka eller plats. Det som sparas är "i dag valde 14 iPhone-ägare Alltid", aldrig vem. 0.3.15 skickar inte
// ver och k; de raderna får '' i båda. Räknaren är alltid på och står i integritet.html (variant A).
//
// ÖPPEN ENDPOINT MED FLIT, som facit-svar: appen kan inte bära en hemlighet (CLAUDE.md). Skyddet är formen — fyra kända
// händelser med kända värden, storleksgräns, tak per dygn — och tabellen är dubbellåst (sql/077) så inget läses tillbaka
// annat än sammanställningen bakom statistik.html:s nyckel. Ingen IP sparas och ingen loggas; taket räknas globalt per dygn.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const TAK_PER_DYGN = 20000;   // tusen förare × ett par starter är ett par tusen — taket är mot flod, inte mot förare
const MAX_BYTES = 192;   // ver och k gör anropet längre (#787); gränsen gäller fortfarande ett enda ord
const kors = (...delar: string[][]): string[] =>
  delar.reduce<string[]>((acc, d) => acc.flatMap((a) => d.map((b) => (a ? `${a}:${b}` : b))), [""]);
const FAROR = ["accident", "slippery_segment", "icing_point", "wildlife", "camera", "kandidat"];
const HANDELSER: Record<string, Set<string>> = {
  // 1 · vägen in (en gång per enhet och värde)
  onboarding_klar: new Set([""]),
  behorighet: new Set(["alltid", "nar", "nekad"]),
  notiser: new Set(["pa", "nekad"]),
  forsta_starten: new Set([""]),
  forsta_varningen: new Set([""]),
  // 2 · aktiva förare: en gång per dygn som vakten gick, med dagar sedan telefonen började räkna
  aktiv_dag: new Set(["0", "1-7", "8-30", "over30"]),
  // 3 · vaktpasset: varje start, och hur passet slutade (start:längd:slut)
  vakt_startad: new Set(["hand", "sjalv"]),
  resa_slut: new Set(kors(["sjalv", "knapp", "intent"], ["under3", "3-15", "15-45", "over45", "okand"],
    ["parkerad", "sjalv", "hand", "avbruten"])),
  // 4 · varningarna: fara och avstånd när rösten talade, ett kort som ersattes, och om bannern kom fram
  varning: new Set(kors(FAROR, ["under400", "400-800", "800-1200", "1200-3000", "over3000"])),
  varning_ersatt: new Set(FAROR),
  banner: new Set(["visad", "tyst"]),
  // 5 · inställningarna föraren ändrar
  installning: new Set([...kors(FAROR.slice(0, 5), ["pa", "av"]), ...kors(["forvarning"], ["400", "800", "1200"]),
    ...kors(["autostart"], ["pa", "av"])]),
  // 6 · det som går fel, en gång per vaktpass och sort
  fel: new Set(["plats_borta", "gammal_data", "hamtning_fel"]),
};
const VERSION = /^\d{1,2}\.\d{1,2}\.\d{1,3}$/;
const KOHORTER = new Set(["ny", "befintlig"]);

const svar = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return svar(405, { fel: "bara POST" });
  const text = await req.text();
  if (text.length > MAX_BYTES) return svar(413, { fel: `mer än ${MAX_BYTES} byte` });
  let d: any;
  try { d = JSON.parse(text); } catch { return svar(400, { fel: "ogiltig JSON" }); }
  const h = typeof d?.h === "string" && Object.hasOwn(HANDELSER, d.h) ? d.h : null;   // hasOwn: "toString" är inte en händelse
  const v = typeof d?.v === "string" ? d.v : "";
  const app = d?.app === "android" || d?.app === "ios" ? d.app : null;
  const ver = typeof d?.ver === "string" && VERSION.test(d.ver) ? d.ver : "";
  const k = typeof d?.k === "string" && KOHORTER.has(d.k) ? d.k : "";
  if (!h || !app || !HANDELSER[h].has(v)) {
    return svar(400, { fel: "h (en känd händelse), v (värdet händelsen känner) och app (android|ios) krävs" });
  }
  try {
    const [n] = await sql`SELECT coalesce(sum(antal), 0)::int AS n FROM app_raknare WHERE dag = (now() at time zone 'Europe/Stockholm')::date`;
    if (n.n >= TAK_PER_DYGN) return svar(429, { fel: "dygnstaket nått" });
    await sql`SELECT app_raknare_okna(${app}, ${ver}, ${k}, ${h}, ${v})`;
    return new Response(null, { status: 204 });
  } catch (e) {
    return svar(500, { fel: String(e).slice(0, 120) });
  }
});
