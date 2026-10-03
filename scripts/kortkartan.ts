// Kortkartan (Bengts order 3/10, DECISIONS #445): varje öppet kort på tavlan hör till ett område i
// stomdokumenten, och varje stomdokument visar sina öppna kort ordnade efter sina egna avsnitt.
// Kopplingen bor på ETT ställe, docs/kortkartan.json; det här skriptet skriver listan i alla sidor,
// så att sju handskrivna listor inte kan glida isär (samma skäl som kontraktsgrinden).
//   node --experimental-strip-types scripts/kortkartan.ts            skriver listorna
//   node --experimental-strip-types scripts/kortkartan.ts --check    fäller på okopplade kort, kopplingar
//                                                                     till stängda kort, okända avsnitt
//                                                                     och listor som inte är aktuella
//   node --experimental-strip-types scripts/kortkartan.ts --sjalvtest
// Efter en skrivning: republicera de artefakter vars källa ändrades (STOMREGELN).
import { readFileSync, writeFileSync, renameSync } from "node:fs";

type Kort = { nyckel: string; nr: string; titel: string; agare: string };
type Sida = { fil: string; namn: string };
type Karta = { sidor: Record<string, Sida>; kort: Record<string, string[]> };

const START = "<!-- ÖPPNA KORT: genereras av scripts/kortkartan.ts ur TAVLA.md och docs/kortkartan.json, ändra inte för hand -->";
const SLUT = "<!-- /ÖPPNA KORT -->";

function agare(rubrik: string): string {
  if (rubrik.startsWith("AXELS NÄSTA")) return "Axels nästa steg";
  if (rubrik.startsWith("Axel — beslut")) return "Axel, beslut";
  if (rubrik.startsWith("Axel")) return "Axel";
  if (rubrik.startsWith("Bengt")) return "Bengt";
  if (rubrik.startsWith("Claude — olåst")) return "Claude";
  if (rubrik.startsWith("Claude — låst")) return "Claude, låst";
  if (rubrik.includes("GÖRA")) return "pågår";
  return rubrik;
}

function rensa(s: string): string {
  return s.replace(/\*\*|`/g, "").replace(/(^|\s)\*([^*]+)\*/g, "$1$2").replace(/\s+/g, " ").trim();
}

function kort(n: number, s: string): string {
  if (s.length <= n) return s;
  const k = s.slice(0, n);
  return k.slice(0, k.lastIndexOf(" ")) + " …";
}

/** De öppna korten: rader som börjar med "- [ ]", med ägaren ur närmaste rubrik ovanför. */
export function oppnaKort(tavla: string): Kort[] {
  const ut: Kort[] = [];
  let rubrik = "";
  for (const rad of tavla.split("\n")) {
    const r = rad.match(/^#{2,3} (.+)$/u);
    if (r) { rubrik = r[1].trim(); continue; }
    if (!rad.startsWith("- [ ] ")) continue;
    const text = rad.slice(6);
    const nr = text.match(/^[^*]*\*\*(#\d{1,3}[a-z]?)\b/u);
    let titel: string;
    if (nr) {
      const fet = text.match(/\*\*#\d{1,3}[a-z]?\s*([^*]+)\*\*/u);
      titel = fet ? fet[1] : text;
    } else {
      const utan = text.replace(/^(↩︎|\p{Extended_Pictographic}|️|\s)+/gu, "");
      const fet = utan.match(/^\*\*([^*]+)\*\*/u);
      titel = fet ? fet[1].replace(/:$/u, "") : utan.split(/ \(| — |\. /u)[0];
    }
    titel = rensa(titel);
    ut.push({ nyckel: nr ? nr[1] : titel, nr: nr ? nr[1] : "", titel, agare: agare(rubrik) });
  }
  return ut;
}

/** Avsnittets rubrik på sidan: "<h2>8. Batteri…</h2>" i html, "## 8. …" eller "### 4.2 …" i markdown. */
function avsnitt(sidtext: string, html: boolean, nr: string): string | null {
  const e = nr.replace(".", "\\.");
  const m = html
    ? sidtext.match(new RegExp(`<h2[^>]*>${e}\\. ([^<]+)</h2>`, "u"))
    : sidtext.match(new RegExp(`^#{2,3} ${e}\\.? (.+)$`, "mu"));
  return m ? rensa(m[1]) : null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Bygger blocket för en sida. Ordning: sidans avsnitt i nummerordning, korten i tavlans ordning. */
export function block(kod: string, sidtext: string, html: boolean, alla: Kort[], karta: Karta, fel: string[]): string {
  const per = new Map<string, Kort[]>();
  for (const k of alla) for (const ref of karta.kort[k.nyckel] ?? []) {
    const [s, nr] = ref.split(" ");
    if (s !== kod) continue;
    if (!per.has(nr)) per.set(nr, []);
    per.get(nr)!.push(k);
  }
  const nummer = [...per.keys()].sort((a, b) => a.localeCompare(b, "sv", { numeric: true }));
  const antal = new Set([...per.values()].flat().map((k) => k.nyckel)).size;
  const rad = (k: Kort) => `${k.nr ? k.nr + " " : ""}${kort(110, k.titel)}`;
  if (html) {
    const delar = [START, `  <h2 id="oppna-kort">Öppna kort</h2>`,
      `  <p class="litet">Korten på tavlan som rör den här sidan, ordnade efter sidans avsnitt: ${antal} av ${alla.length} öppna kort. Ägaren står efter strecket. Listan skrivs av <span class="mono">scripts/kortkartan.ts</span> ur <span class="mono">TAVLA.md</span> och <span class="mono">docs/kortkartan.json</span>.</p>`];
    for (const nr of nummer) {
      const titel = avsnitt(sidtext, true, nr);
      if (!titel) { fel.push(`${kod} ${nr}: avsnittet finns inte på sidan`); continue; }
      delar.push(`  <h3><a href="#avsnitt-${nr}">${nr}. ${esc(titel)}</a></h3>`, "  <ul>");
      for (const k of per.get(nr)!) delar.push(`    <li>${esc(rad(k))} <span class="litet">· ${esc(k.agare)}</span></li>`);
      delar.push("  </ul>");
    }
    delar.push(SLUT);
    return delar.join("\n");
  }
  const delar = [START, "## Öppna kort", "",
    `Korten på tavlan som rör den här sidan, ordnade efter sidans avsnitt: ${antal} av ${alla.length} öppna kort. Ägaren står efter strecket. Listan skrivs av \`scripts/kortkartan.ts\` ur \`TAVLA.md\` och \`docs/kortkartan.json\`.`, ""];
  for (const nr of nummer) {
    const titel = avsnitt(sidtext, false, nr);
    if (!titel) { fel.push(`${kod} ${nr}: avsnittet finns inte på sidan`); continue; }
    delar.push(`**§${nr} ${titel}**`, "");
    for (const k of per.get(nr)!) delar.push(`- ${rad(k)} — ${k.agare}`);
    delar.push("");
  }
  delar.push(SLUT);
  return delar.join("\n");
}

/** Sidan med blocket på plats: ersätter ett befintligt block, annars före </main> (html) eller sist (md).
 *  I html får varje "<h2>N. " ett id, så att listans länkar når avsnittet. */
export function medBlock(sidtext: string, html: boolean, b: string): string {
  let t = html ? sidtext.replace(/<h2>(\d+)\. /gu, '<h2 id="avsnitt-$1">$1. ') : sidtext;
  const i = t.indexOf(START), j = t.indexOf(SLUT);
  if (i >= 0 && j > i) return t.slice(0, i) + b + t.slice(j + SLUT.length);
  if (html) {
    const m = t.lastIndexOf("</main>");
    if (m < 0) throw new Error("sidan saknar </main>");
    return t.slice(0, m) + "\n" + b + "\n" + t.slice(m);
  }
  return t.replace(/\n*$/u, "\n\n") + b + "\n";
}

if (process.argv[2] === "--sjalvtest") {
  const tavla = "### Bengt\n- [ ] 📍 **#12 ETT KORT** (text) **#99 annat**\n  fortsättning\n- [x] **#13 STÄNGT**\n" +
    "### Claude — låst (väntar på nyckel)\n- [ ] ↩︎ **Introduktionen** (iOS) — x\n- [ ] ↩︎ Välkomsttext till alla (extern). **Fet:** y\n";
  const k = oppnaKort(tavla);
  const ok1 = k.length === 3 && k[0].nyckel === "#12" && k[0].titel === "ETT KORT" && k[0].agare === "Bengt"
    && k[1].nyckel === "Introduktionen" && k[1].agare === "Claude, låst" && k[2].nyckel === "Välkomsttext till alla";
  if (!ok1) { console.error("✗ självtest 1: tavlan läses fel", k); process.exit(1); }
  const karta: Karta = { sidor: {}, kort: { "#12": ["X 2"], "Introduktionen": ["X 2", "X 9"] } };
  const fel: string[] = [];
  const sida = "<main>\n<h2>2. Två</h2>\n</main>";
  const b = block("X", sida, true, k, karta, fel);
  const ny = medBlock(sida, true, b);
  const ok2 = fel.length === 1 && fel[0].startsWith("X 9") && ny.includes('<h2 id="avsnitt-2">2. Två</h2>')
    && ny.includes("#12 ETT KORT") && medBlock(ny, true, b) === ny;
  if (!ok2) { console.error("✗ självtest 2: blocket", fel, ny); process.exit(1); }
  console.log("✓ självtest: öppna kort läses med ägare, kort utan nummer får rubriken som nyckel, okänt avsnitt fälls, skrivningen är idempotent");
  process.exit(0);
}

const rot = new URL("../", import.meta.url);
const las = (f: string) => readFileSync(new URL(f, rot), "utf8");
const karta: Karta = JSON.parse(las("docs/kortkartan.json"));
const alla = oppnaKort(las("TAVLA.md"));
const fel: string[] = [];
const oppna = new Set(alla.map((k) => k.nyckel));
for (const k of alla) if (!karta.kort[k.nyckel]?.length) fel.push(`okopplat kort: ${k.nyckel} ${kort(80, k.titel)} (${k.agare})`);
for (const n of Object.keys(karta.kort)) if (!oppna.has(n)) fel.push(`kopplat men inte öppet på tavlan: ${n}`);
for (const [n, refs] of Object.entries(karta.kort)) for (const r of refs) if (!karta.sidor[r.split(" ")[0]]) fel.push(`${n}: okänd sida i "${r}"`);
const check = process.argv[2] === "--check";
const andrade: string[] = [];
for (const [kod, sida] of Object.entries(karta.sidor)) {
  const html = sida.fil.endsWith(".html");
  const text = las(sida.fil);
  const ny = medBlock(text, html, block(kod, text, html, alla, karta, fel));
  if (ny === text) continue;
  andrade.push(sida.fil);
  if (!check) {
    const tmp = new URL(sida.fil + ".tmp", rot);
    writeFileSync(tmp, ny); renameSync(tmp, new URL(sida.fil, rot));   // atomiskt: en avbruten skrivning lämnar sidan hel
  }
}
for (const f of fel) console.error("✗ " + f);
if (check) {
  for (const f of andrade) console.error(`✗ listan är inte aktuell: ${f} — kör scripts/kortkartan.ts och republicera`);
  if (fel.length || andrade.length) process.exit(1);
  console.log(`✓ kortkartan: ${alla.length} öppna kort, alla kopplade, alla listor aktuella`);
} else {
  console.log(`${alla.length} öppna kort. Skrivna: ${andrade.length ? andrade.join(", ") : "inga ändringar"}`);
  if (fel.length) process.exit(1);
}
