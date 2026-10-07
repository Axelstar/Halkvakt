// Stomvakten (Bengts ja 7/10, DECISIONS #484, kort #304): varje nytt beslut i DECISIONS.md slutar med en rad som namnger de
// stomdokument det rör — `**Stomdokument:** MAT, SYS` eller `**Stomdokument:** inga — skälet` — och de namngivna dokumentens
// handtext ändras i samma push eller PR. Handtext är sidan utan det skripten skriver (lägesraderna och listorna över öppna
// kort), så en omskriven lägesrad räknas inte: det var just den som fick dokumenten att se färska ut 3/10–7/10 (DECISIONS #483).
// Vakten ser bara inlägg som läggs till, aldrig gamla. Ett "inga" kan den inte pröva; det gör morgonens dokumentsynk.
//   node --experimental-strip-types scripts/stomvakten.ts --bas <sha>   prövar besluten som lagts till sedan <sha> (md-vakt.yml)
//   node --experimental-strip-types scripts/stomvakten.ts --lage        varje stomdokuments senaste handtextändring och besluten sedan dess
//   node --experimental-strip-types scripts/stomvakten.ts --tillatna    rör grenen bara dokumenten? (dokumentsynkens PR, #484 (d))
//   node --experimental-strip-types scripts/stomvakten.ts --sjalvtest
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { utanGenererat } from "./kartsynk.ts";
import { stockholm } from "./projektkartan.ts";

type Sida = { fil: string; namn: string };
type Inlagg = { id: string; text: string };
type Rad = { inga: true; skal: string } | { inga: false; koder: string[] };

/** Filer som dokumentsynkens gren får röra utöver de sju (#484 (d)). DECISIONS.md hör inte hit: ett beslut väntar på Bengts ord. */
const OCKSA = ["docs/KALENDERN.md", "TAVLA.md", "STATUS.md", "docs/projektkartan.json", "docs/PROJEKTKARTAN.html", "docs/kortkartan.json"];
const RUBRIK = /^## #(\d+[a-z]?(?:-[a-zåäö]+)?)(?![\w-])/gmu;   // samma som scripts/beslutsnumren.ts
const RADEN = /^\*\*Stomdokument:\*\*[ \t]*(.*)$/gmu;

const lf = (s: string) => s.replace(/\r\n/g, "\n");
export const handtext = (s: string) => utanGenererat(lf(s));

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

/** Felen i de nya inläggen. fore/efter ger en fils text före och efter ändringen (null = filen fanns inte). */
export function prova(nya: Inlagg[], sidor: Record<string, Sida>, fore: (fil: string) => string | null, efter: (fil: string) => string | null): string[] {
  const fel: string[] = [];
  const koder = Object.keys(sidor).join(", ");
  for (const n of nya) {
    const r = stomrad(n.text);
    if (!r) { fel.push(`#${n.id} saknar raden **Stomdokument:** sist i inlägget — namnge ${koder}, eller skriv inga med ett skäl`); continue; }
    if (r.inga) { if (!/\p{L}{3}/u.test(r.skal)) fel.push(`#${n.id}: **Stomdokument:** inga — skälet saknas`); continue; }
    if (!r.koder.length) { fel.push(`#${n.id}: **Stomdokument:** är tom — namnge ${koder}, eller skriv inga med ett skäl`); continue; }
    for (const k of r.koder) {
      const s = sidor[k];
      if (!s) { fel.push(`#${n.id}: okänt stomdokument "${k}" — giltiga är ${koder}`); continue; }
      const f = fore(s.fil), e = efter(s.fil);
      if (f !== null && e !== null && handtext(f) === handtext(e))
        fel.push(`#${n.id} namnger ${k}, men handtexten i ${s.fil} är oförändrad i den här ändringen — rätta ${s.namn} i samma commit, ` +
          `eller ändra raden (lägesraderna och korten räknas inte, de skrivs av skripten)`);
    }
  }
  return fel;
}

/** Filerna dokumentsynkens gren får röra: de sju och OCKSA. */
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
  // MAT ändrar bara lägesraderna (räknas inte), BED ändrar handtexten.
  const L = (x: string) => `a<!-- LÄGESRADER §1: s -->\n${x}\n<!-- /LÄGESRADER -->b`;
  const filer: Record<string, [string, string]> = { "m.html": [L("gammal"), L("ny")], "b.md": ["hand 1", "hand 2"] };
  const fel = prova(nya, sidor, (f) => filer[f]?.[0] ?? null, (f) => filer[f]?.[1] ?? null);
  const ok3 = fel.length === 4 && fel[0].startsWith("#11 saknar") && fel[1].startsWith("#12 namnger MAT") && fel[2].startsWith("#14:")
    && fel[3].includes('okänt stomdokument "KAL"');
  filer["m.html"] = [L("x") + "hand 1", L("x") + "hand 2"];
  const ok4 = prova([nya[1]], sidor, (f) => filer[f][0], (f) => filer[f][1]).length === 0;
  const ok5 = tillatna(["m.html", "STATUS.md", "DECISIONS.md", "scripts/x.ts"], sidor).join(",") === "DECISIONS.md,scripts/x.ts";
  const ok6 = handtext("a\r\nb") === "a\nb";
  if (!(ok1 && ok2 && ok3 && ok4 && ok5 && ok6)) { console.error("✗ stomvakten självtest", { ok1, ok2, ok3, ok4, ok5, ok6, fel }); process.exit(1); }
  console.log("✓ stomvakten självtest: nya beslut hittas, raden läses (koder, inga med skäl), saknad rad, tomt skäl, okänd kod och en " +
    "oförändrad handtext fälls, omskrivna lägesrader räknas inte, och dokumentsynkens gren får bara röra dokumenten");
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
    if (fel.length) { console.error(`✗ grenen rör mer än dokumenten: ${fel.join(", ")} — vänta på Bengts "slå ihop"`); process.exit(1); }
    console.log(`✓ grenen rör bara dokumenten (${filer.length} filer) — får slås ihop på grön körning på exakt huvudet (DECISIONS #484)`);
    return;
  }

  if (arg.includes("--lage")) {
    const nu = lf(readFileSync("DECISIONS.md", "utf8"));
    console.log("STOMDOKUMENTEN — senaste ändring av handtexten, och besluten som lagts till sedan dess:");
    for (const [kod, s] of Object.entries(sidor)) {
      const h = senasteHandtext(s.fil);
      if (!h) { console.log(`${kod}  ${s.namn}: ingen handtextändring bland de 80 senaste commitsen`); continue; }
      const sedan = nyaInlagg(visa(h.sha, "DECISIONS.md") ?? "", nu);
      const om = sedan.map((n) => {
        const r = stomrad(n.text);
        return `#${n.id}${!r ? " (utan rad)" : r.inga ? "" : r.koder.includes(kod) ? ` ⚠ namnger ${kod}` : ""}`;
      });
      console.log(`${kod}  ${s.namn}: ${stockholm(h.tid)} (${h.sha.slice(0, 7)}) · ${sedan.length ? `${sedan.length} beslut sedan dess: ${om.join(", ")}` : "inga beslut sedan dess"}`);
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
  const fel = prova(nya, sidor, (f) => visa(bas, f), fran);
  for (const f of fel) console.error("✗ " + f);
  if (fel.length) process.exit(1);
  console.log(nya.length
    ? `✓ stomvakten: ${nya.length} nya beslut (${nya.map((n) => "#" + n.id).join(", ")}) namnger sina stomdokument, och handtexten följer med`
    : `✓ stomvakten: inga nya beslut sedan ${bas.slice(0, 7)}`);
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/stomvakten.ts");
if (direkt) main();
