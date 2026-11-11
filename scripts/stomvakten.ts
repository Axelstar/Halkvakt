// Stomvakten (Bengts ja 7/10, DECISIONS #484, kort #304): varje nytt beslut i DECISIONS.md slutar med en rad som namnger de
// stomdokument det rör — `**Stomdokument:** MAT, SYS` eller `**Stomdokument:** inga — skälet`. Sedan 11/10 (Bengts order, DECISIONS
// #522) stäms de namngivna dokumentens handtext av en gång per dygn av morgonens dokumentsynk, inte i varje PR. --lage visar synken,
// per dokument, varje beslut från LAGE_FRAN som namnger dokumentet men inte nämns med sitt nummer i dess handtext. Så länge synken
// inte bokfört beslutet är det öppet (⚠). Bokför synken det i STATUS som *#NN (KOD): ingen handtext, skälet*, flyttas det till
// *bokförda utan handtext* och står kvar där. Det beror inte på när handtexten senast ändrades (DECISIONS #811). Förut listades besluten
// sedan dokumentets senaste handtextändring, och 7/11 försvann #804 och #809 ur listan när synken rättade samma sidor för olycksfacit.
// Handtext är sidan utan det skripten skriver (lägesraderna och listorna över öppna kort), så en omskriven lägesrad räknas inte
// (DECISIONS #483).
// --bas ser bara inlägg som läggs till, aldrig gamla. Ett "inga" kan vakten inte pröva; det gör morgonens dokumentsynk.
//   node --experimental-strip-types scripts/stomvakten.ts --bas <sha>   prövar besluten som lagts till sedan <sha> (md-vakt.yml)
//   node --experimental-strip-types scripts/stomvakten.ts --lage        per stomdokument: besluten som namnger det men inte nämns (⚠) och de bokförda
//   node --experimental-strip-types scripts/stomvakten.ts --tillatna    rör grenen bara dokumenten? (dokumentsynkens PR; samma lista prövar synk-ihop, #731)
//   node --experimental-strip-types scripts/stomvakten.ts --sjalvtest
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { utanGenererat } from "./kartsynk.ts";
import { stockholm } from "./projektkartan.ts";

type Sida = { fil: string; namn: string };
type Inlagg = { id: string; text: string };
type Rad = { inga: true; skal: string } | { inga: false; koder: string[] };

/** Filer som dokumentsynkens gren får röra utöver stomdokumenten (#484 (d)). DECISIONS.md hör inte hit: ett beslut väntar på Bengts ord.
 *  docs/takten.json skrivs av projektkartan.ts ur git-historiken (#515) och ändras när main flyttat (Bengt 11/10, #518).
 *  docs/fristerna.json rättas i synkens steg 4 (#649); 25/10 föll --tillatna på den (DECISIONS #731). */
const OCKSA = ["docs/KALENDERN.md", "TAVLA.md", "STATUS.md", "docs/projektkartan.json", "docs/PROJEKTKARTAN.html", "docs/kortkartan.json", "docs/takten.json",
  "docs/fristerna.json"];
const RUBRIK = /^## #(\d+[a-z]?(?:-[a-zåäö]+)?)(?![\w-])/gmu;   // samma som scripts/beslutsnumren.ts
const RADEN = /^\*\*Stomdokument:\*\*[ \t]*(.*)$/gmu;

const lf = (s: string) => s.replace(/\r\n/g, "\n");
export const handtext = (s: string) => utanGenererat(lf(s));

/** --lage prövar besluten från och med detta nummer. De äldre stämdes av i genomgångarna 7/10 (#483) och 7/11 (#810).
 *  Kortens nummer (kort #NN) når inte hit på länge, så ett kortnummer i en sida tas inte för ett beslut. */
export const LAGE_FRAN = 772;

/** Besluten som en text nämner med nummer, med intervallen utskrivna: "#799–#801" ger 799, 800 och 801. */
export function namnda(text: string): Set<number> {
  const ut = new Set<number>();
  for (const m of text.matchAll(/#(\d+)(?:\s*[–-]\s*#?(\d+))?/gu)) {
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for (let n = a; n <= Math.min(b, a + 50); n++) ut.add(n);
  }
  return ut;
}

/** Synkens poster i STATUS som säger att ett beslut inte får handtext. Formerna i STATUS 3–7/11 är
 *  "#NN: ingen handtext", "#NN och #MM: …", "#NN, #MM (MAT, SYS): …" och "#NN–#MM: …". Per beslut ges dagen och
 *  koderna inom parentesen; tom lista betyder alla koder som beslutet namnger. */
export function bokforda(status: string, kodlista: string[]): Map<number, { koder: string[]; dag: string }[]> {
  const ut = new Map<number, { koder: string[]; dag: string }[]>();
  const NR = String.raw`#\d+[a-z]?(?:\s*[–-]\s*#\d+)?`;
  const POST = new RegExp(String.raw`(${NR}(?:(?:\s*,\s*|\s+och\s+)${NR})*)\s*(\([^)]*\))?\s*:\s*ingen handtext`, "gu");
  for (const rad of lf(status).split("\n")) {
    const dag = rad.match(/^- (\d{1,2}\/\d{1,2})/u)?.[1] ?? "?";
    for (const m of rad.matchAll(POST)) {
      const koder = m[2] ? kodlista.filter((k) => new RegExp(String.raw`\b${k}\b`, "u").test(m[2])) : [];
      for (const n of namnda(m[1])) ut.set(n, [...(ut.get(n) ?? []), { koder, dag }]);
    }
  }
  return ut;
}

type Lage = { oppna: string[]; bokforda: string[] };
/** Per stomdokument: besluten från start som namnger det men inte nämns i dess handtext. De är öppna, eller bokförda av synken
 *  som utan handtext. */
export function lage(inlagg: Inlagg[], handtexter: Record<string, string>, status: string, start = LAGE_FRAN): Record<string, Lage> {
  const kodlista = Object.keys(handtexter);
  const bok = bokforda(status, kodlista);
  const ut: Record<string, Lage> = {};
  for (const kod of kodlista) {
    const sett = namnda(handtexter[kod]);
    const l: Lage = { oppna: [], bokforda: [] };
    for (const n of inlagg) {
      const nr = parseInt(n.id, 10);
      const r = stomrad(n.text);
      if (!(nr >= start) || !r || r.inga || !r.koder.includes(kod) || sett.has(nr)) continue;
      const b = (bok.get(nr) ?? []).filter((x) => !x.koder.length || x.koder.includes(kod)).pop();
      if (b) l.bokforda.push(`#${n.id} (${b.dag})`); else l.oppna.push(`#${n.id}`);
    }
    ut[kod] = l;
  }
  return ut;
}

/** Inläggen i efter som inte fanns i fore, var och en från sin rubrik till nästa rubrik på nivå 2. */
export function nyaInlagg(fore: string, efter: string): Inlagg[] {
  const fanns = new Set([...lf(fore).matchAll(RUBRIK)].map((m) => m[1]));
  const t = lf(efter);
  const starter = [...t.matchAll(RUBRIK)].map((m) => ({ id: m[1], i: m.index! }));
  return starter.filter((s) => !fanns.has(s.id)).map((s) => {
    const slut = t.slice(s.i + 3).search(/^## /mu);
    return { id: s.id, text: slut < 0 ? t.slice(s.i) : t.slice(s.i, s.i + 3 + slut) };
  });
}

/** Inläggets sista Stomdokument-rad. null = raden saknas. */
export function stomrad(text: string): Rad | null {
  const m = [...text.matchAll(RADEN)].pop();
  if (!m) return null;
  const v = m[1].trim();
  const inga = v.match(/^inga\b[\s—–:,.-]*(.*)$/iu);
  if (inga) return { inga: true, skal: inga[1].trim() };
  return { inga: false, koder: v.split(/[,;]/u).map((x) => x.trim().split(/\s+/u)[0].replace(/[.:]$/u, "")).filter(Boolean) };
}

/** Felen i de nya inläggen: raden saknas, ett inga utan skäl, en tom rad eller en okänd kod. Handtexten prövas av synken (#522). */
export function prova(nya: Inlagg[], sidor: Record<string, Sida>): string[] {
  const fel: string[] = [];
  const koder = Object.keys(sidor).join(", ");
  for (const n of nya) {
    const r = stomrad(n.text);
    if (!r) { fel.push(`#${n.id} saknar raden **Stomdokument:** sist i inlägget — namnge ${koder}, eller skriv inga med ett skäl`); continue; }
    if (r.inga) { if (!/\p{L}{3}/u.test(r.skal)) fel.push(`#${n.id}: **Stomdokument:** inga — skälet saknas`); continue; }
    if (!r.koder.length) { fel.push(`#${n.id}: **Stomdokument:** är tom — namnge ${koder}, eller skriv inga med ett skäl`); continue; }
    for (const k of r.koder) if (!sidor[k]) fel.push(`#${n.id}: okänt stomdokument "${k}" — giltiga är ${koder}`);
  }
  return fel;
}

/** Filerna dokumentsynkens gren får röra: stomdokumenten (kortkartan.json sidor) och OCKSA. */
export function tillatna(filer: string[], sidor: Record<string, Sida>): string[] {
  const ok = new Set([...Object.values(sidor).map((s) => s.fil), ...OCKSA]);
  return filer.filter((f) => !ok.has(f));
}

const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
function visa(ref: string, fil: string): string | null {
  try { return execFileSync("git", ["show", `${ref}:${fil}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
}
const fran = (fil: string) => { try { return readFileSync(fil, "utf8"); } catch { return null; } };

/** Senaste commit där filens handtext ändrades, bland de 80 senaste som rörde filen. */
function senasteHandtext(fil: string): { sha: string; tid: string } | null {
  for (const rad of git("log", "-n", "80", "--format=%H %cI", "--", fil).trim().split("\n").filter(Boolean)) {
    const [sha, tid] = rad.split(" ");
    const f = visa(`${sha}^`, fil), e = visa(sha, fil);
    if (f === null || e === null || handtext(f) !== handtext(e)) return { sha, tid };
  }
  return null;
}

function sjalvtest(): void {
  const sidor: Record<string, Sida> = { MAT: { fil: "m.html", namn: "Mätningar" }, BED: { fil: "b.md", namn: "Bedömningen" } };
  const fore = "# D\n\n## #10 (1/1) Gammalt\ntext\n";
  const efter = fore + "\n## #11 (2/1) Utan rad\ntext\n\n## #12 (2/1) Med rad\ntext\n**Stomdokument:** MAT, BED §4.2\n" +
    "\n## #13 (2/1) Inga\n**Stomdokument:** inga — bara kod\n\n## #14 (2/1) Inga utan skäl\n**Stomdokument:** inga\n" +
    "\n## #15 (2/1) Okänt\n**Stomdokument:** KAL\n";
  const nya = nyaInlagg(fore, efter);
  const ok1 = nya.map((n) => n.id).join(",") === "11,12,13,14,15" && !nya[0].text.includes("#12");
  const r = stomrad(nya[1].text);
  const ok2 = r !== null && !r.inga && r.koder.join(",") === "MAT,BED" && stomrad(nya[0].text) === null
    && (stomrad(nya[2].text) as any)?.skal === "bara kod";
  // Ett namngivet dokument vars handtext inte ändrats fälls inte längre (#522); raden, skälet och koderna prövas.
  const fel = prova(nya, sidor);
  const ok3 = fel.length === 3 && fel[0].startsWith("#11 saknar") && fel[1].startsWith("#14:") && fel[2].includes('okänt stomdokument "KAL"');
  const L = (x: string) => `a<!-- LÄGESRADER §1: s -->\n${x}\n<!-- /LÄGESRADER -->b`;
  const ok4 = prova([nya[1]], sidor).length === 0 && handtext(L("gammal")) === handtext(L("ny"));
  const ok5 = tillatna(["m.html", "STATUS.md", "docs/takten.json", "docs/fristerna.json", "DECISIONS.md", "scripts/x.ts"], sidor).join(",") === "DECISIONS.md,scripts/x.ts";
  const ok6 = handtext("a\r\nb") === "a\nb";
  // Kuvösregeln (#489) är borta: kuvösen och dess sida stäms av i det privata halkvakt-kuvos (DECISIONS #768).
  // --lage (#811): ett beslut som namnger dokumentet men inte nämns i dess handtext är öppet. Ett beslut som nämns, också i ett
  // intervall, är stängt. Synkens post flyttar beslutet till de bokförda för de koder posten gäller, och ett nummer i en lägesrad
  // räknas inte som att beslutet nämns.
  const D = "## #20 (1/1) A\n**Stomdokument:** MAT, BED\n\n## #21 (1/1) B\n**Stomdokument:** MAT\n\n## #22 (1/1) C\n**Stomdokument:** MAT, BED\n" +
    "\n## #23 (1/1) D\n**Stomdokument:** BED\n\n## #24 (1/1) E\n**Stomdokument:** inga — kod\n\n## #9 (1/1) Gammalt\n**Stomdokument:** MAT\n";
  const st = "- 7/11 03:30 UTC (Claude): Dokumentsynk. Poster i ⚠: #22 (MAT): ingen handtext, skäl; #23: ingen handtext, skäl.\n";
  const lg = lage(nyaInlagg("", D), { MAT: handtext(L("#21") + " se #20"), BED: "text #19–#20" }, st, 10);
  const ok7 = JSON.stringify(lg) === JSON.stringify({
    MAT: { oppna: ["#21"], bokforda: ["#22 (7/11)"] }, BED: { oppna: ["#22"], bokforda: ["#23 (7/11)"] } });
  const bk = bokforda("- 3/11 x: #782 och #783: ingen handtext, y; #790–#792: ingen handtext; #799, #800 (MAT, SYS): ingen handtext",
    ["MAT", "SYS", "APP"]);
  const ok8 = [782, 783, 790, 791, 792, 799, 800].every((n) => bk.has(n)) && bk.size === 7 && bk.get(799)![0].koder.join(",") === "MAT,SYS"
    && bk.get(782)![0].koder.length === 0 && bk.get(790)![0].dag === "3/11";
  if (!(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8)) {
    console.error("✗ stomvakten självtest", { ok1, ok2, ok3, ok4, ok5, ok6, ok7, ok8, fel, lg }); process.exit(1);
  }
  console.log("✓ stomvakten självtest: nya beslut hittas, raden läses (koder, inga med skäl), saknad rad, tomt skäl och okänd kod " +
    "fälls, omskrivna lägesrader räknas inte som handtext, dokumentsynkens gren får bara röra dokumenten, och --lage håller ett " +
    "namngivet beslut öppet tills handtexten nämner det eller synken bokför det, för de koder posten gäller");
}

function main(): void {
  const arg = process.argv.slice(2);
  if (arg.includes("--sjalvtest")) return sjalvtest();
  const sidor: Record<string, Sida> = JSON.parse(readFileSync("docs/kortkartan.json", "utf8")).sidor;

  if (arg.includes("--tillatna")) {
    git("fetch", "-q", "origin");
    const filer = git("diff", "--name-only", "origin/main...HEAD").split("\n").filter(Boolean);
    const fel = tillatna(filer, sidor);
    if (!filer.length) { console.error("✗ grenen ändrar ingenting"); process.exit(1); }
    if (fel.length) { console.error(`✗ grenen rör mer än dokumenten: ${fel.join(", ")} — synk-ihop slår inte ihop den (DECISIONS #731)`); process.exit(1); }
    console.log(`✓ grenen rör bara dokumenten (${filer.length} filer) — synk-ihop slår ihop PR:en när ci och md-vakt är gröna (DECISIONS #731)`);
    return;
  }

  if (arg.includes("--lage")) {
    const alla = nyaInlagg("", readFileSync("DECISIONS.md", "utf8"));
    const ht = Object.fromEntries(Object.entries(sidor).map(([k, s]) => [k, handtext(fran(s.fil) ?? "")]));
    const l = lage(alla, ht, fran("STATUS.md") ?? "");
    const utan = alla.filter((n) => parseInt(n.id, 10) >= LAGE_FRAN && !stomrad(n.text)).map((n) => `#${n.id}`);
    console.log(`STOMDOKUMENTEN — besluten från #${LAGE_FRAN} som namnger ett dokument men inte nämns i dess handtext: öppna (⚠) ` +
      "och bokförda utan handtext i STATUS (#811):");
    if (utan.length) console.log(`     utan rad **Stomdokument:**: ${utan.join(", ")}`);
    for (const [kod, s] of Object.entries(sidor)) {
      const h = senasteHandtext(s.fil);
      const nar = h ? `handtexten ${stockholm(h.tid)} (${h.sha.slice(0, 7)})` : "ingen handtextändring bland de 80 senaste commitsen";
      const { oppna, bokforda: bok } = l[kod];
      console.log(`${kod}  ${s.namn}: ${nar} · ${oppna.length ? `⚠ ${oppna.join(", ")}` : "inga öppna"}` +
        (bok.length ? ` · bokförda utan handtext: ${bok.join(", ")}` : ""));
    }
    return;
  }

  const i = arg.indexOf("--bas");
  const bas = i >= 0 ? arg[i + 1] : "";
  if (!bas) { console.error("✗ ange --bas <sha>, --lage, --tillatna eller --sjalvtest"); process.exit(2); }
  if (/^0+$/.test(bas)) { console.log("⚠ ingen bas (ny gren) — stomvakten hoppar över"); return; }
  const foreD = visa(bas, "DECISIONS.md");
  if (foreD === null) { console.error(`✗ basen ${bas.slice(0, 7)} går inte att läsa — hämta den (fetch-depth 0)`); process.exit(2); }
  const nya = nyaInlagg(foreD, fran("DECISIONS.md") ?? "");
  const fel = prova(nya, sidor);
  for (const f of fel) console.error("✗ " + f);
  if (fel.length) process.exit(1);
  console.log(nya.length
    ? `✓ stomvakten: ${nya.length} nya beslut (${nya.map((n) => "#" + n.id).join(", ")}) namnger sina stomdokument; handtexten stäms av i morgonens synk (#522)`
    : `✓ stomvakten: inga nya beslut sedan ${bas.slice(0, 7)}`);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/stomvakten.ts");
if (direkt) main();
