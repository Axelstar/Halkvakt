// Projektkartan (Bengts ja 3/10, DECISIONS #446): navet över hela bygget. En datafil, docs/projektkartan.json, bär
// varje del med block, läge, bevis eller nyckel, vad som saknas, beroenden, kort, beslut och var delen beskrivs i
// stomdokumenten. Skriptet granskar filen och skriver docs/PROJEKTKARTAN.html; sidan ändras aldrig för hand.
// Läget är underordnat beviset: grönt kräver bevis, blått en nyckel, orange och rött en lista över vad som saknas.
//   node --experimental-strip-types scripts/projektkartan.ts            skriver sidan
//   node --experimental-strip-types scripts/projektkartan.ts --check    fäller på fel i filen och en sida som inte är aktuell
//   node --experimental-strip-types scripts/projektkartan.ts --sjalvtest
// Efter en skrivning: republicera artefakten (STOMREGELN).
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { oppnaKort, avsnitt } from "./kortkartan.ts";

type Lage = "gron" | "orange" | "rod" | "bla" | "gra";
type Del = { id: string; namn: string; block: string; lage: Lage; bevis?: string; nyckel?: string; saknas?: string[];
  beror: string[]; kort: string[]; beslut?: string[]; beskrivs: string[] };
type Block = { id: string; namn: string; om: string };
type Karta = { block: Block[]; delar: Del[] };
type Sida = { fil: string; namn: string; url?: string };
type KortInfo = { nyckel: string; nr: string; titel: string; agare: string };

const LAGEN: Record<Lage, { namn: string; krav: string }> = {
  gron: { namn: "Klar", krav: "klar och i drift, med bevis" },
  orange: { namn: "Delvis", krav: "byggd men inte prövad, i skuggan eller utan dom" },
  rod: { namn: "Ej påbörjad", krav: "finns bara som kort, idé eller tröskeldokument" },
  bla: { namn: "Väntar", krav: "väntar på ett beslut eller en nyckel" },
  gra: { namn: "Stängd", krav: "medvetet stängd eller parkerad" },
};

/** Fel i datafilen. Tomt = filen håller. */
export function granska(k: Karta, oppna: KortInfo[], sidor: Record<string, Sida>, sidtext: (fil: string) => string): string[] {
  const fel: string[] = [];
  const block = new Set(k.block.map((b) => b.id));
  const ids = new Set<string>();
  for (const d of k.delar) {
    if (ids.has(d.id)) fel.push(`${d.id}: id:t finns två gånger`);
    ids.add(d.id);
  }
  const oppen = new Set(oppna.map((c) => c.nyckel));
  const burna = new Set<string>();
  for (const d of k.delar) {
    if (!block.has(d.block)) fel.push(`${d.id}: okänt block "${d.block}"`);
    if (!(d.lage in LAGEN)) fel.push(`${d.id}: okänt läge "${d.lage}"`);
    if (d.lage === "gron" && !d.bevis?.trim()) fel.push(`${d.id}: grön utan bevis`);
    if (d.lage === "bla" && !d.nyckel?.trim()) fel.push(`${d.id}: blå utan nyckel`);
    if ((d.lage === "orange" || d.lage === "rod") && !d.saknas?.length) fel.push(`${d.id}: ${LAGEN[d.lage].namn.toLowerCase()} utan lista över vad som saknas`);
    for (const b of d.beror) {
      if (b === d.id) fel.push(`${d.id}: beror på sig själv`);
      else if (!k.delar.some((x) => x.id === b)) fel.push(`${d.id}: beror på okänd del "${b}"`);
    }
    for (const c of d.kort) { if (!oppen.has(c)) fel.push(`${d.id}: kortet ${c} är inte öppet på tavlan`); burna.add(c); }
    for (const ref of d.beskrivs) {
      const [kod, nr] = ref.split(" ");
      const s = sidor[kod];
      if (!s) { fel.push(`${d.id}: okänd sida i "${ref}"`); continue; }
      if (!avsnitt(sidtext(s.fil), s.fil.endsWith(".html"), nr)) fel.push(`${d.id}: avsnittet ${ref} finns inte`);
    }
  }
  for (const c of oppna) if (!burna.has(c.nyckel)) fel.push(`öppet kort utan del: ${c.nyckel} ${c.titel.slice(0, 70)}`);
  return fel;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const kortTitel = (s: string) => (s.length <= 100 ? s : s.slice(0, s.lastIndexOf(" ", 100)) + " …");

/** Sidan. Kartan överst (blocken som kolumner, delarna som rutor), sedan ett blad per del. */
export function sida(k: Karta, oppna: KortInfo[], sidor: Record<string, Sida>, sidtext: (fil: string) => string): string {
  const kort = new Map(oppna.map((c) => [c.nyckel, c]));
  const del = new Map(k.delar.map((d) => [d.id, d]));
  const levererar = new Map<string, string[]>();
  for (const d of k.delar) for (const b of d.beror) levererar.set(b, [...(levererar.get(b) ?? []), d.id]);
  const antal = (l: Lage) => k.delar.filter((d) => d.lage === l).length;
  const ordning = k.delar.filter((d) => (d.lage === "gron" || d.lage === "orange") &&
    d.beror.some((b) => del.get(b)?.lage === "rod"));
  const lank = (id: string) => { const d = del.get(id)!; return `<a class="ref ${d.lage}" href="#del-${id}">${esc(d.namn)}</a>`; };
  const ref = (r: string) => {
    const [kod, nr] = r.split(" ");
    const s = sidor[kod];
    const t = avsnitt(sidtext(s.fil), s.fil.endsWith(".html"), nr) ?? "";
    const text = `${esc(s.namn)} §${nr} ${esc(t)}`;
    return s.url && s.fil.endsWith(".html") ? `<a href="${s.url}#avsnitt-${nr}">${text}</a>` : `${text} <span class="mono">${esc(s.fil)}</span>`;
  };
  const ut: string[] = [];
  ut.push(`<title>Halkvaktens projektkarta</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap">
<!-- GENERERAD av scripts/projektkartan.ts ur docs/projektkartan.json. Ändra inte här: ändra datafilen och kör skriptet. -->
<style>
  /* Layout: the same paper sheet as the core documents. The map up top (one column per block, one tile per part,
     coloured by state), the build-order warnings, then one sheet per part. Hovering a tile marks what it depends on
     and what depends on it; without script the tiles are plain links to the sheets. */
  :root {
    --papper: #F6F7F5; --blad: #FFFFFF; --black: #16202A; --dampad: #4A5763; --linje: #D9DFE3;
    --gul: #A8720A; --gul-yta: #FFF3D6;
    --gron: #1F7A45; --gron-yta: #E4F2EA; --orange: #B35C00; --orange-yta: #FFE9D2; --rod: #A63A2A; --rod-yta: #F9E1DC;
    --bla: #1F5F99; --bla-yta: #E1EDF8; --gra: #6B7680; --gra-yta: #ECEFF1;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --papper: #0B1014; --blad: #121A20; --black: #E6ECEF; --dampad: #9DAAB3; --linje: #26323B;
      --gul: #FFC94A; --gul-yta: #2A2310;
      --gron: #4CC382; --gron-yta: #12261B; --orange: #FFA552; --orange-yta: #2E1E0E; --rod: #F08A7A; --rod-yta: #2B1714;
      --bla: #7DB8F0; --bla-yta: #13222F; --gra: #9AA5AE; --gra-yta: #1B2329;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --papper: #0B1014; --blad: #121A20; --black: #E6ECEF; --dampad: #9DAAB3; --linje: #26323B;
    --gul: #FFC94A; --gul-yta: #2A2310;
    --gron: #4CC382; --gron-yta: #12261B; --orange: #FFA552; --orange-yta: #2E1E0E; --rod: #F08A7A; --rod-yta: #2B1714;
    --bla: #7DB8F0; --bla-yta: #13222F; --gra: #9AA5AE; --gra-yta: #1B2329;
    color-scheme: dark;
  }
  body { background: var(--papper); color: var(--black); padding-inline: 16px; padding-block: 28px 48px;
         font: 400 16px/1.6 "Source Serif 4", Georgia, "Times New Roman", serif; }
  .blad { max-width: 1180px; margin: 0 auto; background: var(--blad); border: 1px solid var(--linje);
          padding: clamp(20px, 4vw, 48px); display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  h1, h2, h3, .etikett, th, .ruta-namn, .chip, .fakta b, .block-namn { font-family: "Instrument Sans", "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: clamp(30px, 5vw, 42px); line-height: 1.08; font-weight: 700; margin: 0; letter-spacing: -0.01em; text-wrap: balance; }
  h2 { font-size: 21px; font-weight: 700; margin: 18px 0 0; text-wrap: balance; }
  h3 { font-size: 16px; font-weight: 600; margin: 0; }
  p { margin: 0; max-width: 72ch; }
  a { color: inherit; }
  a:focus-visible { outline: 2px solid var(--gul); outline-offset: 2px; }
  .etikett { font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gul); }
  .ingress { font-size: 18px; color: var(--dampad); }
  .litet { font-size: 14px; color: var(--dampad); }
  .mono { font-family: "JetBrains Mono", ui-monospace, Menlo, monospace; font-size: 0.82em; }
  .grov { background: var(--gul-yta); border-radius: 4px; padding: 10px 14px; font-size: 15px; }
  .fakta { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: 14px; color: var(--dampad);
           border-top: 1px solid var(--linje); border-bottom: 1px solid var(--linje); padding-block: 10px; }
  .fakta b { color: var(--black); font-weight: 600; font-variant-numeric: tabular-nums; }
  .forklaring { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 14px; color: var(--dampad); }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
          padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
  .chip::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .gron { --c: var(--gron); --y: var(--gron-yta); } .orange { --c: var(--orange); --y: var(--orange-yta); }
  .rod { --c: var(--rod); --y: var(--rod-yta); } .bla { --c: var(--bla); --y: var(--bla-yta); } .gra { --c: var(--gra); --y: var(--gra-yta); }
  .chip.gron, .chip.orange, .chip.rod, .chip.bla, .chip.gra { color: var(--c); background: var(--y); }

  .kartan { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; align-items: start; }
  .block { border: 1px solid var(--linje); border-radius: 8px; padding: 10px; display: grid; gap: 6px; min-width: 0; }
  .block-namn { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dampad); }
  .ruta { display: flex; gap: 8px; align-items: baseline; padding: 6px 8px; border-radius: 6px; background: var(--y);
          text-decoration: none; font: 500 13.5px/1.3 "Instrument Sans", Arial, sans-serif; color: var(--black);
          outline: 2px solid transparent; outline-offset: -2px; }
  .ruta::before { content: ""; flex: none; width: 9px; height: 9px; border-radius: 50%; background: var(--c); transform: translateY(1px); }
  .ruta:hover, .ruta:focus-visible { outline-color: var(--black); }
  .ruta.markerad-beror { outline: 2px dashed var(--black); }
  .ruta.markerad-levererar { outline: 2px solid var(--dampad); }
  .kartan.pekar .ruta:not(.markerad-beror):not(.markerad-levererar):not(:hover):not(:focus-visible) { opacity: 0.45; }
  .ruta .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  .varning { border: 1px solid var(--linje); border-radius: 6px; padding: 12px 16px; display: grid; gap: 6px; }
  ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; }
  .delar-block { display: grid; gap: 14px; }
  .del { border-top: 1px solid var(--linje); padding-top: 12px; display: grid; gap: 6px; scroll-margin-top: 16px; }
  .del-rubrik { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: baseline; }
  .rad { display: grid; grid-template-columns: 9.5em minmax(0, 1fr); gap: 2px 12px; font-size: 15px; }
  .rad > dt { color: var(--dampad); font: 600 13px/1.6 "Instrument Sans", Arial, sans-serif; }
  .rad > dd { margin: 0; min-width: 0; }
  .ref { text-decoration-color: var(--c); text-underline-offset: 3px; }
  @media (max-width: 520px) { .rad { grid-template-columns: minmax(0, 1fr); } .rad > dd { margin-bottom: 6px; } }
  @media (prefers-reduced-motion: no-preference) { .ruta { transition: opacity 120ms; } }
</style>

<main class="blad">
  <div class="etikett">Navet över bygget · skrivs ur docs/projektkartan.json</div>
  <h1>Halkvaktens projektkarta</h1>
  <p class="ingress">Hela Halkvakt på en sida: varje del, hur långt den har kommit, vad som saknas och vad den hänger ihop med. Klicka på en del för att se dess blad. Läget är underordnat beviset: grönt kräver ett bevis, blått en nyckel, orange och rött en lista över vad som saknas, och säger koden eller ett prov något annat är det kartan som är fel.</p>
  <p class="grov"><b>Grov version 3/10.</b> Läget är satt i stora drag ur stomdokumenten, tavlan och beslutsloggen. Delarna mäts mot koden och tröskeldokumenten i nästa varv (kort #286).</p>
  <div class="fakta">
    <span><b>${k.delar.length}</b> delar i <b>${k.block.length}</b> block</span>
    ${(Object.keys(LAGEN) as Lage[]).map((l) => `<span><b>${antal(l)}</b> ${LAGEN[l].namn.toLowerCase()}</span>`).join("\n    ")}
    <span><b>${oppna.length}</b> öppna kort, alla på en del</span>
  </div>
  <div class="forklaring">
    ${(Object.keys(LAGEN) as Lage[]).map((l) => `<span><span class="chip ${l}">${LAGEN[l].namn}</span> ${LAGEN[l].krav}</span>`).join("\n    ")}
  </div>

  <h2 id="kartan">Kartan</h2>
  <p class="litet">Ett block per kolumn, i flödets ordning från källorna till förarna. Pekar du på en del markeras det den beror på med streckad ram och det som beror på den med hel ram.</p>
  <div class="kartan" id="karta">`);
  for (const b of k.block) {
    ut.push(`    <section class="block" aria-label="${esc(b.namn)}">
      <div class="block-namn">${esc(b.namn)}</div>`);
    for (const d of k.delar.filter((x) => x.block === b.id))
      ut.push(`      <a class="ruta ${d.lage}" href="#del-${d.id}" data-id="${d.id}" data-beror="${d.beror.join(" ")}"><span>${esc(d.namn)}</span><span class="sr">, ${LAGEN[d.lage].namn.toLowerCase()}</span></a>`);
    ut.push("    </section>");
  }
  ut.push("  </div>");
  ut.push(`
  <h2 id="byggordningen">Byggordningen</h2>`);
  if (ordning.length) {
    ut.push(`  <div class="varning">
    <p>Delar som är klara eller på väg men beror på något som inte är påbörjat:</p>
    <ul>`);
    for (const d of ordning) ut.push(`      <li>${lank(d.id)} beror på ${d.beror.filter((b) => del.get(b)?.lage === "rod").map(lank).join(", ")}</li>`);
    ut.push("    </ul>\n  </div>");
  } else ut.push(`  <p class="litet">Ingen klar eller påbörjad del beror på något som inte är påbörjat.</p>`);
  ut.push(`
  <h2 id="delarna">Delarna</h2>`);
  for (const b of k.block) {
    ut.push(`  <section class="delar-block" aria-labelledby="block-${b.id}">
  <h2 id="block-${b.id}">${esc(b.namn)}</h2>
  <p class="litet">${esc(b.om)}</p>`);
    for (const d of k.delar.filter((x) => x.block === b.id)) {
      const rader: string[] = [];
      if (d.bevis) rader.push(`<dt>Bevis</dt><dd>${esc(d.bevis)}</dd>`);
      if (d.nyckel) rader.push(`<dt>Nyckel</dt><dd>${esc(d.nyckel)}</dd>`);
      if (d.saknas?.length) rader.push(`<dt>Saknas</dt><dd><ul>${d.saknas.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></dd>`);
      if (d.beror.length) rader.push(`<dt>Beror på</dt><dd>${d.beror.map(lank).join(", ")}</dd>`);
      const lev = levererar.get(d.id) ?? [];
      if (lev.length) rader.push(`<dt>Levererar till</dt><dd>${lev.map(lank).join(", ")}</dd>`);
      if (d.kort.length) rader.push(`<dt>Kort</dt><dd><ul>${d.kort.map((c) => { const i = kort.get(c)!; return `<li>${esc((i.nr ? i.nr + " " : "") + kortTitel(i.titel))} <span class="litet">· ${esc(i.agare)}</span></li>`; }).join("")}</ul></dd>`);
      if (d.beslut?.length) rader.push(`<dt>Beslut</dt><dd>DECISIONS ${d.beslut.join(", ")}</dd>`);
      if (d.beskrivs.length) rader.push(`<dt>Beskrivs i</dt><dd><ul>${d.beskrivs.map((r) => `<li>${ref(r)}</li>`).join("")}</ul></dd>`);
      ut.push(`  <article class="del" id="del-${d.id}">
    <div class="del-rubrik"><h3>${esc(d.namn)}</h3><span class="chip ${d.lage}">${LAGEN[d.lage].namn}</span></div>
    <dl class="rad">${rader.join("")}</dl>
  </article>`);
    }
    ut.push("  </section>");
  }
  ut.push(`  <p class="litet">Sidan skrivs av <span class="mono">scripts/projektkartan.ts</span> ur <span class="mono">docs/projektkartan.json</span> och tavlans öppna kort. Kontrollen i ci.yml fäller grönt utan bevis, blått utan nyckel, orange och rött utan lista, okända beroenden, öppna kort utan del och en sida som inte är aktuell (DECISIONS #446).</p>
</main>
<script>
  // Mark what the pointed-at part depends on (dashed) and what depends on it (solid). Read-only; links work without it.
  (function () {
    var karta = document.getElementById("karta");
    if (!karta) return;
    var rutor = Array.prototype.slice.call(karta.querySelectorAll(".ruta"));
    function rensa() { karta.classList.remove("pekar"); rutor.forEach(function (r) { r.classList.remove("markerad-beror", "markerad-levererar"); }); }
    function peka(r) {
      rensa();
      var id = r.getAttribute("data-id");
      var beror = (r.getAttribute("data-beror") || "").split(" ").filter(Boolean);
      rutor.forEach(function (x) {
        if (beror.indexOf(x.getAttribute("data-id")) >= 0) x.classList.add("markerad-beror");
        if ((x.getAttribute("data-beror") || "").split(" ").indexOf(id) >= 0) x.classList.add("markerad-levererar");
      });
      karta.classList.add("pekar");
    }
    rutor.forEach(function (r) {
      r.addEventListener("mouseenter", function () { peka(r); });
      r.addEventListener("focus", function () { peka(r); });
      r.addEventListener("mouseleave", rensa);
      r.addEventListener("blur", rensa);
    });
  })();
</script>
`);
  return ut.join("\n");
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/projektkartan.ts");

if (direkt && process.argv[2] === "--sjalvtest") {
  const k: Karta = { block: [{ id: "a", namn: "A", om: "" }], delar: [
    { id: "x", namn: "X", block: "a", lage: "gron", bevis: "körning 1", beror: [], kort: ["#1"], beskrivs: ["S 2"] },
    { id: "y", namn: "Y", block: "a", lage: "gron", beror: ["z", "y"], kort: ["#9"], beskrivs: ["S 7"] },
    { id: "z", namn: "Z", block: "b", lage: "orange", beror: [], kort: [], beskrivs: [] },
  ] };
  const oppna = [{ nyckel: "#1", nr: "#1", titel: "ETT", agare: "Bengt" }, { nyckel: "#2", nr: "#2", titel: "TVÅ", agare: "Axel" }];
  const sidor = { S: { fil: "s.html", namn: "Sidan" } };
  const fel = granska(k, oppna, sidor, () => "<h2>2. Två</h2>");
  const vant = ["y: grön utan bevis", "y: beror på sig själv", "y: kortet #9 är inte öppet på tavlan", "y: avsnittet S 7 finns inte",
    "z: okänt block \"b\"", "z: delvis utan lista över vad som saknas", "öppet kort utan del: #2 TVÅ"];
  const ok = vant.every((v) => fel.includes(v)) && fel.length === vant.length;
  if (!ok) { console.error("✗ självtest: granskningen", fel); process.exit(1); }
  const html = sida({ block: k.block, delar: [k.delar[0]] }, [oppna[0]], sidor, () => "<h2>2. Två</h2>");
  if (!html.includes('href="#del-x"') || !html.includes("körning 1") || !html.includes("Sidan §2 Två")) { console.error("✗ självtest: sidan"); process.exit(1); }
  console.log("✓ självtest: grönt utan bevis, självberoende, stängt kort, okänt avsnitt och block, orange utan lista och kort utan del fälls; sidan bär rutor, bevis och hänvisningar");
  process.exit(0);
}

if (direkt) {
  const rot = new URL("../", import.meta.url);
  const las = (f: string) => readFileSync(new URL(f, rot), "utf8");
  const karta: Karta = JSON.parse(las("docs/projektkartan.json"));
  const sidor: Record<string, Sida> = JSON.parse(las("docs/kortkartan.json")).sidor;
  const oppna = oppnaKort(las("TAVLA.md"));
  const fel = granska(karta, oppna, sidor, las);
  for (const f of fel) console.error("✗ " + f);
  if (fel.length) process.exit(1);
  const ny = sida(karta, oppna, sidor, las);
  const FIL = "docs/PROJEKTKARTAN.html";
  let gammal = "";
  try { gammal = las(FIL); } catch { /* första skrivningen */ }
  if (process.argv[2] === "--check") {
    if (ny !== gammal) { console.error(`✗ ${FIL} är inte aktuell — kör scripts/projektkartan.ts och republicera`); process.exit(1); }
    console.log(`✓ projektkartan: ${karta.delar.length} delar, alla öppna kort på en del, sidan aktuell`);
  } else if (ny !== gammal) {
    const tmp = new URL(FIL + ".tmp", rot);
    writeFileSync(tmp, ny); renameSync(tmp, new URL(FIL, rot));   // atomiskt
    console.log(`Skriven: ${FIL} (${karta.delar.length} delar)`);
  } else console.log("Inga ändringar.");
}
