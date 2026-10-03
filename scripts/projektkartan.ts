// Projektkartan (Bengts ja 3/10, DECISIONS #446): navet över hela bygget. En datafil, docs/projektkartan.json, bär
// varje del med block, läge, bevis eller nyckel, vad som saknas, beroenden, kort, beslut och var delen beskrivs i
// stomdokumenten, plus flödet mellan blocken och målen. Skriptet granskar filen och skriver docs/PROJEKTKARTAN.html;
// sidan ändras aldrig för hand. Läget är underordnat beviset: grönt kräver bevis, blått en nyckel, orange och rött en
// lista över vad som saknas.
// Sidan (Bengts val 3/10): flödet från källorna till förarna med en stapel per block överst, sedan vad som står i
// vägen för målen, sedan delarna bakom ett klick per block och ett blad per del längst ner.
//   node --experimental-strip-types scripts/projektkartan.ts            skriver sidan
//   node --experimental-strip-types scripts/projektkartan.ts --check    fäller på fel i filen och en sida som inte är aktuell
//   node --experimental-strip-types scripts/projektkartan.ts --sjalvtest
// Efter en skrivning: republicera artefakten (STOMREGELN).
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { oppnaKort, avsnitt } from "./kortkartan.ts";

type Lage = "gron" | "orange" | "rod" | "bla" | "gra";
type Del = { id: string; namn: string; block: string; lage: Lage; klar?: number; bevis?: string; nyckel?: string; saknas?: string[];
  beror: string[]; kort: string[]; beslut?: string[]; beskrivs: string[] };
type Block = { id: string; namn: string; om: string; plats: string; pil?: string };
type Mal = { id: string; namn: string; om: string; klart_nar: string; datum: string; delar: string[] };
type Karta = { projektmal: { text: string; kalla: string }; block: Block[]; mal: Mal[]; delar: Del[] };
type Sida = { fil: string; namn: string; url?: string };
type KortInfo = { nyckel: string; nr: string; titel: string; agare: string };

const LAGEN: Record<Lage, { namn: string; krav: string }> = {
  gron: { namn: "Klar", krav: "klar och i drift, med bevis" },
  orange: { namn: "Delvis", krav: "byggd men inte prövad, i skuggan eller utan dom" },
  bla: { namn: "Väntar", krav: "väntar på ett beslut eller en nyckel" },
  rod: { namn: "Ej påbörjad", krav: "finns bara som kort, idé eller tröskeldokument" },
  gra: { namn: "Stängd", krav: "medvetet stängd eller parkerad" },
};
const ORDNING = Object.keys(LAGEN) as Lage[];

/** Fel i datafilen. Tomt = filen håller. */
export function granska(k: Karta, oppna: KortInfo[], sidor: Record<string, Sida>, sidtext: (fil: string) => string): string[] {
  const fel: string[] = [];
  const block = new Set(k.block.map((b) => b.id));
  for (const b of k.block) {
    const under = b.plats.startsWith("under:") ? b.plats.slice(6) : null;
    if (b.plats !== "flode" && b.plats !== "sida" && !under) fel.push(`block ${b.id}: okänd plats "${b.plats}"`);
    if (under && k.block.find((x) => x.id === under)?.plats !== "flode") fel.push(`block ${b.id}: ligger under "${under}", som inte är ett steg i flödet`);
  }
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
    // Den skattade andelen klar (Bengt 3/10: "en skattning av hur långt det är kommet i %"). Grönt är 100 % av sig självt.
    if (d.lage === "gron" && d.klar !== undefined) fel.push(`${d.id}: grön bär en skattning; grönt är 100 %`);
    if ((d.lage === "orange" || d.lage === "bla") && (typeof d.klar !== "number" || d.klar < 0 || d.klar > 99))
      fel.push(`${d.id}: ${LAGEN[d.lage].namn.toLowerCase()} utan skattad andel klar (0–99 %)`);
    if (d.lage === "rod" && d.klar !== undefined && (d.klar < 0 || d.klar > 20)) fel.push(`${d.id}: ej påbörjad med skattningen ${d.klar} % (högst 20)`);
    for (const b of d.beror) {
      if (b === d.id) fel.push(`${d.id}: beror på sig själv`);
      else if (!ids.has(b)) fel.push(`${d.id}: beror på okänd del "${b}"`);
    }
    for (const c of d.kort) { if (!oppen.has(c)) fel.push(`${d.id}: kortet ${c} är inte öppet på tavlan`); burna.add(c); }
    for (const ref of d.beskrivs) {
      const [kod, nr] = ref.split(" ");
      const s = sidor[kod];
      if (!s) { fel.push(`${d.id}: okänd sida i "${ref}"`); continue; }
      if (!avsnitt(sidtext(s.fil), s.fil.endsWith(".html"), nr)) fel.push(`${d.id}: avsnittet ${ref} finns inte`);
    }
  }
  for (const m of k.mal) {
    for (const x of m.delar) if (!ids.has(x)) fel.push(`målet ${m.id}: okänd del "${x}"`);
    if (!m.klart_nar?.trim()) fel.push(`målet ${m.id}: saknar "klart när"`);
  }
  for (const c of oppna) if (!burna.has(c.nyckel)) fel.push(`öppet kort utan del: ${c.nyckel} ${c.titel.slice(0, 70)}`);
  return fel;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const kortTitel = (s: string) => (s.length <= 100 ? s : s.slice(0, s.lastIndexOf(" ", 100)) + " …");

/** Det som står i vägen för ett mål: målets delar och, under dem, allt de beror på som inte är klart. En del visas en gång. */
export function hinder(m: Mal, del: Map<string, Del>): { d: Del; djup: number }[] {
  const ut: { d: Del; djup: number }[] = [];
  const sedda = new Set<string>();
  const ga = (id: string, djup: number) => {
    const d = del.get(id)!;
    if (d.lage === "gron" || sedda.has(id)) return;
    sedda.add(id);
    ut.push({ d, djup });
    for (const b of d.beror) ga(b, djup + 1);
  };
  for (const id of m.delar) ga(id, 0);
  return ut;
}

/** Andel klar: grönt 100 %, annars delens skattning (ej påbörjad utan skattning = 0). */
export const andel = (d: Del) => (d.lage === "gron" ? 100 : d.klar ?? 0);
export const medel = (ds: Del[]) => (ds.length ? Math.round(ds.reduce((s, d) => s + andel(d), 0) / ds.length) : 100);

/** Allt ett mål vilar på: målets delar och allt de beror på, klart eller inte. Det är målets procent. */
export function malDelar(m: Mal, del: Map<string, Del>): Del[] {
  const s = new Set<string>();
  const ga = (id: string) => { if (s.has(id)) return; s.add(id); for (const b of del.get(id)!.beror) ga(b); };
  m.delar.forEach(ga);
  return [...s].map((id) => del.get(id)!);
}

/** Hävstången (Bengt 3/10: "gör vi det så bockas det och det också"): för varje del som inte är klar, hur många mål
 *  som väntar på den och hur många andra ej klara delar som bygger på den, direkt eller längre fram. */
export function havstang(k: Karta, del: Map<string, Del>): Map<string, { mal: string[]; delar: number }> {
  const bygger = new Map<string, string[]>();
  for (const d of k.delar) for (const b of d.beror) bygger.set(b, [...(bygger.get(b) ?? []), d.id]);
  const ut = new Map<string, { mal: string[]; delar: number }>();
  for (const d of k.delar) {
    if (d.lage === "gron") continue;
    const sedda = new Set<string>();
    const ko = [...(bygger.get(d.id) ?? [])];
    while (ko.length) { const x = ko.pop()!; if (sedda.has(x)) continue; sedda.add(x); ko.push(...(bygger.get(x) ?? [])); }
    const delar = [...sedda].filter((x) => del.get(x)!.lage !== "gron").length;
    const mal = k.mal.filter((m) => hinder(m, del).some((h) => h.d.id === d.id)).map((m) => m.namn);
    ut.set(d.id, { mal, delar });
  }
  return ut;
}

/** Sidan: projektets mål och procenten, flödet, målen, det som lönar sig först, delarna bakom ett klick, bladen. */
export function sida(k: Karta, oppna: KortInfo[], sidor: Record<string, Sida>, sidtext: (fil: string) => string): string {
  const kort = new Map(oppna.map((c) => [c.nyckel, c]));
  const del = new Map(k.delar.map((d) => [d.id, d]));
  const levererar = new Map<string, string[]>();
  for (const d of k.delar) for (const b of d.beror) levererar.set(b, [...(levererar.get(b) ?? []), d.id]);
  const ordning = k.delar.filter((d) => (d.lage === "gron" || d.lage === "orange") && d.beror.some((b) => del.get(b)?.lage === "rod"));
  const lank = (id: string) => { const d = del.get(id)!; return `<a class="ref ${d.lage}" href="#del-${id}">${esc(d.namn)}</a>`; };
  const ref = (r: string) => {
    const [kod, nr] = r.split(" ");
    const s = sidor[kod];
    const t = avsnitt(sidtext(s.fil), s.fil.endsWith(".html"), nr) ?? "";
    const text = `${esc(s.namn)} §${nr} ${esc(t)}`;
    return s.url && s.fil.endsWith(".html") ? `<a href="${s.url}#avsnitt-${nr}">${text}</a>` : `${text} <span class="mono">${esc(s.fil)}</span>`;
  };
  const kortrad = (d: Del) => d.lage === "bla" ? `väntar: ${d.nyckel}` : (d.saknas?.[0] ?? "");

  const total = medel(k.delar);
  const hav = havstang(k, del);
  const framsteg = (pct: number) => `<div class="framsteg" role="img" aria-label="${pct} procent klart"><span style="width: ${pct}%"></span></div>`;

  // Ett block som steg: namn, andel klar, och delarna bakom ett klick.
  const steg = (b: Block, klass = "steg") => {
    const delar = k.delar.filter((d) => d.block === b.id);
    const pct = medel(delar);
    const rutor = delar.map((d) => `<a class="ruta ${d.lage}" href="#del-${d.id}" data-id="${d.id}" data-beror="${d.beror.join(" ")}"><span>${esc(d.namn)}</span><span class="pct">${andel(d)} %</span><span class="sr">, ${LAGEN[d.lage].namn.toLowerCase()}</span></a>`).join("\n          ");
    return `<section class="${klass}" aria-label="${esc(b.namn)}">
      <div class="steg-namn">${esc(b.namn)}</div>
      ${b.pil ? `<div class="steg-pil">${esc(b.pil)}</div>` : ""}
      ${framsteg(pct)}
      <div class="steg-tal"><b>${pct} %</b> klart</div>
      <details>
        <summary>Visa delarna (${delar.length})</summary>
        <div class="rutor">
          ${rutor}
        </div>
      </details>
    </section>`;
  };

  const flode = k.block.filter((b) => b.plats === "flode");
  const ut: string[] = [];
  ut.push(`<title>Halkvaktens projektkarta</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500&display=swap">
<!-- GENERERAD av scripts/projektkartan.ts ur docs/projektkartan.json. Ändra inte här: ändra datafilen och kör skriptet. -->
<style>
  /* Layout: the same paper sheet as the core documents. Top: the flow from sources to drivers, one step per block
     with a stacked bar of states; testing hangs under the engine, favourites and governance sit beside the flow.
     Then what stands in the way of each goal, then the build-order warnings, then one sheet per part. The parts of a
     block open behind a click; hovering a part marks what it depends on and what depends on it. */
  :root {
    --papper: #F6F7F5; --blad: #FFFFFF; --black: #16202A; --dampad: #4A5763; --linje: #D9DFE3; --ram: #C3CBD1;
    --gul: #A8720A; --gul-yta: #FFF3D6;
    --gron: #1F7A45; --gron-yta: #E4F2EA; --orange: #B35C00; --orange-yta: #FFE9D2; --rod: #A63A2A; --rod-yta: #F9E1DC;
    --bla: #1F5F99; --bla-yta: #E1EDF8; --gra: #6B7680; --gra-yta: #ECEFF1;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --papper: #0B1014; --blad: #121A20; --black: #E6ECEF; --dampad: #9DAAB3; --linje: #26323B; --ram: #34424C;
      --gul: #FFC94A; --gul-yta: #2A2310;
      --gron: #4CC382; --gron-yta: #12261B; --orange: #FFA552; --orange-yta: #2E1E0E; --rod: #F08A7A; --rod-yta: #2B1714;
      --bla: #7DB8F0; --bla-yta: #13222F; --gra: #9AA5AE; --gra-yta: #1B2329;
      color-scheme: dark;
    }
  }
  :root[data-theme="dark"] {
    --papper: #0B1014; --blad: #121A20; --black: #E6ECEF; --dampad: #9DAAB3; --linje: #26323B; --ram: #34424C;
    --gul: #FFC94A; --gul-yta: #2A2310;
    --gron: #4CC382; --gron-yta: #12261B; --orange: #FFA552; --orange-yta: #2E1E0E; --rod: #F08A7A; --rod-yta: #2B1714;
    --bla: #7DB8F0; --bla-yta: #13222F; --gra: #9AA5AE; --gra-yta: #1B2329;
    color-scheme: dark;
  }
  body { background: var(--papper); color: var(--black); padding-inline: 16px; padding-block: 28px 48px;
         font: 400 16px/1.6 "Source Serif 4", Georgia, "Times New Roman", serif; }
  .blad { max-width: 1240px; margin: 0 auto; background: var(--blad); border: 1px solid var(--linje);
          padding: clamp(20px, 4vw, 48px); display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  h1, h2, h3, .etikett, .chip, .fakta b, .steg-namn, .mal-namn, summary { font-family: "Instrument Sans", "Helvetica Neue", Arial, sans-serif; }
  h1 { font-size: clamp(30px, 5vw, 42px); line-height: 1.08; font-weight: 700; margin: 0; letter-spacing: -0.01em; text-wrap: balance; }
  h2 { font-size: 21px; font-weight: 700; margin: 18px 0 0; text-wrap: balance; }
  h3 { font-size: 16px; font-weight: 600; margin: 0; }
  p { margin: 0; max-width: 72ch; }
  a { color: inherit; }
  a:focus-visible, summary:focus-visible { outline: 2px solid var(--gul); outline-offset: 2px; }
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

  /* The flow: steps left to right with arrows; under 900 px they stack top to bottom. */
  .flode { display: flex; align-items: flex-start; gap: 0; }
  .kolumn { flex: 1 1 0; min-width: 0; display: grid; gap: 10px; }
  .pil { flex: none; align-self: flex-start; margin-top: 18px; width: 22px; text-align: center; color: var(--dampad);
         font: 600 18px "Instrument Sans", Arial, sans-serif; }
  .pil::before { content: "→"; }
  .steg, .under, .sidosteg { border: 1px solid var(--ram); border-radius: 8px; padding: 10px; display: grid; gap: 6px; min-width: 0; background: var(--blad); }
  .under { border-style: dashed; }
  .under-pil { text-align: center; color: var(--dampad); font: 600 14px "Instrument Sans", Arial, sans-serif; }
  .steg-namn { font-size: 15px; font-weight: 700; line-height: 1.25; }
  .steg-pil { font-size: 13px; line-height: 1.35; color: var(--dampad); }
  .framsteg { height: 10px; border-radius: 999px; overflow: hidden; background: var(--linje); }
  .framsteg > span { display: block; height: 100%; background: var(--gron); border-radius: 999px; }
  .steg-tal { font-size: 13px; line-height: 1.35; color: var(--dampad); font-variant-numeric: tabular-nums; }
  .steg-tal b { font-size: 18px; color: var(--black); font-family: "Instrument Sans", Arial, sans-serif; }
  .helhet { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 22px; align-items: center;
            border: 1px solid var(--ram); border-radius: 8px; padding: 16px 18px; }
  .helhet-tal { font: 700 clamp(40px, 7vw, 56px)/1 "Instrument Sans", Arial, sans-serif; font-variant-numeric: tabular-nums; }
  .helhet .framsteg { height: 14px; }
  .helhet-text { display: grid; gap: 8px; min-width: 0; }
  @media (max-width: 520px) { .helhet { grid-template-columns: minmax(0, 1fr); } }
  .forst { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
  .forst-lista { border: 1px solid var(--ram); border-radius: 8px; padding: 12px 14px; display: grid; gap: 8px; align-content: start; }
  .forst-lista ol { margin: 0; padding-left: 1.4em; display: grid; gap: 8px; }
  .forst-lista li { font-size: 14px; line-height: 1.4; }
  .forst-lista .varfor { display: block; color: var(--dampad); font-size: 13px; }
  details > summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--dampad); }
  .rutor { display: grid; gap: 5px; margin-top: 6px; }
  .sidor { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
  @media (max-width: 900px) {
    .flode { flex-direction: column; align-items: stretch; }
    .pil { margin: 4px 0; width: auto; align-self: center; }
    .pil::before { content: "↓"; }
  }

  .ruta { display: flex; gap: 8px; align-items: baseline; padding: 5px 8px; border-radius: 6px; background: var(--y);
          text-decoration: none; font: 500 13px/1.3 "Instrument Sans", Arial, sans-serif; color: var(--black);
          outline: 2px solid transparent; outline-offset: -2px; }
  .ruta::before { content: ""; flex: none; width: 9px; height: 9px; border-radius: 50%; background: var(--c); transform: translateY(1px); }
  .ruta > span:first-child { flex: 1; min-width: 0; }
  .ruta .pct { flex: none; color: var(--dampad); font-variant-numeric: tabular-nums; }
  .ruta:hover, .ruta:focus-visible { outline-color: var(--black); }
  .ruta.markerad-beror { outline: 2px dashed var(--black); }
  .ruta.markerad-levererar { outline: 2px solid var(--dampad); }
  .ruta .sr, .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  .mal { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
  .mal-kort { border: 1px solid var(--ram); border-radius: 8px; padding: 12px 14px; display: grid; gap: 6px; align-content: start; }
  .mal-namn { font-size: 16px; font-weight: 700; }
  .mal-kort ul { list-style: none; padding: 0; display: grid; gap: 4px; }
  .mal-kort li { font-size: 14px; line-height: 1.4; display: grid; gap: 1px; }
  .mal-kort li .varfor { color: var(--dampad); font-size: 13px; }
  .mal-klar { color: var(--gron); font-size: 14px; font-weight: 600; }

  .varning { border: 1px solid var(--linje); border-radius: 6px; padding: 12px 16px; display: grid; gap: 6px; }
  ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; }
  .delar-block { display: grid; gap: 0; }
  .block-rubrik { margin: 14px 0 4px; }
  .del { border-top: 1px solid var(--linje); scroll-margin-top: 16px; }
  .del > summary { display: flex; gap: 10px; align-items: baseline; padding: 6px 2px; cursor: pointer; list-style: none;
                   font: 500 14.5px/1.35 "Instrument Sans", Arial, sans-serif; color: var(--black); }
  .del > summary::-webkit-details-marker { display: none; }
  .del > summary::before { content: "▸"; color: var(--dampad); flex: none; }
  .del[open] > summary::before { content: "▾"; }
  .del-namn { flex: 1; min-width: 0; }
  .del-pct { flex: none; width: 3.2em; text-align: right; color: var(--dampad); font-variant-numeric: tabular-nums; }
  .del[open] > .rad { padding: 4px 2px 12px 1.4em; }
  .rad { display: grid; grid-template-columns: 9.5em minmax(0, 1fr); gap: 2px 12px; font-size: 15px; margin: 0; }
  .rad > dt { color: var(--dampad); font: 600 13px/1.6 "Instrument Sans", Arial, sans-serif; }
  .rad > dd { margin: 0; min-width: 0; }
  .ref { text-decoration-color: var(--c); text-underline-offset: 3px; }
  @media (max-width: 520px) { .rad { grid-template-columns: minmax(0, 1fr); } .rad > dd { margin-bottom: 6px; } }
</style>

<main class="blad">
  <div class="etikett">Navet över bygget · skrivs ur docs/projektkartan.json</div>
  <h1>Halkvaktens projektkarta</h1>
  <p class="ingress">Hela Halkvakt på en sida: hur långt bygget har kommit, målen vi bygger mot, vad som lönar sig att göra först, och ett blad per del. Läget är underordnat beviset: grönt kräver ett bevis, och säger koden eller ett prov något annat är det kartan som är fel.</p>
  <section class="helhet" aria-label="Hela bygget">
    <div class="helhet-tal">${total} %</div>
    <div class="helhet-text">
      ${framsteg(total)}
      <p><b>Projektets mål:</b> ${esc(k.projektmal.text)} <span class="litet">(${esc(k.projektmal.kalla)})</span></p>
      <p class="litet">Procenten är ett medel över ${k.delar.length} delar: en grön del räknas som 100 %, de andra med sin skattade andel. ${oppna.length} öppna kort hänger på delarna.</p>
    </div>
  </section>
  <p class="grov"><b>Skattning 3/10.</b> Läget och procenten är satta i stora drag av Claude ur stomdokumenten, tavlan och beslutsloggen, och delarna väger lika. De mäts mot koden och tröskeldokumenten i nästa varv (kort #286).</p>
  <div class="forklaring">
    ${ORDNING.map((l) => `<span><span class="chip ${l}">${LAGEN[l].namn}</span> ${LAGEN[l].krav}</span>`).join("\n    ")}
  </div>

  <h2 id="flodet">Hur långt vi har kommit</h2>
  <p class="litet">Datan går från vänster till höger. Varje block visar hur stor del av det som är klart. Klicka på <i>Visa delarna</i> för att se delarna med sina procent; pekar du på en del markeras det den beror på med streckad ram och det som beror på den med hel ram.</p>
  <div class="flode" id="karta">`);
  flode.forEach((b, i) => {
    if (i > 0) ut.push(`    <span class="pil" aria-hidden="true"></span>`);
    const under = k.block.filter((x) => x.plats === `under:${b.id}`);
    ut.push(`    <div class="kolumn">
    ${steg(b)}`);
    for (const u of under) ut.push(`    <div class="under-pil" aria-hidden="true">↑</div>
    ${steg(u, "under")}`);
    ut.push("    </div>");
  });
  ut.push(`  </div>
  <div class="sidor">`);
  for (const b of k.block.filter((x) => x.plats === "sida")) ut.push(`    ${steg(b, "sidosteg")}`);
  ut.push(`  </div>

  <h2 id="malen">Målen</h2>
  <p class="litet">Fem mål på vägen mot projektets mål, i tidsordning. Varje mål säger när det är nått, när det ska vara nått, hur långt det har kommit räknat över allt det vilar på, och vad som återstår.</p>
  <div class="mal">`);
  k.mal.forEach((m, i) => {
    const h = hinder(m, del);
    const pct = medel(malDelar(m, del));
    ut.push(`    <section class="mal-kort" aria-labelledby="mal-${m.id}">
      <div class="mal-namn" id="mal-${m.id}">${i + 1}. ${esc(m.namn)}</div>
      <p><b>Klart när</b> ${esc(m.klart_nar)}</p>
      <p class="litet"><b>Datum:</b> ${esc(m.datum)}</p>
      ${framsteg(pct)}
      <div class="steg-tal"><b>${pct} %</b> klart, räknat över ${malDelar(m, del).length} delar</div>`);
    if (!h.length) ut.push(`      <p class="mal-klar">Inget står i vägen.</p>`);
    else {
      ut.push(`      <p class="litet">Kvar, ${h.length} ${h.length === 1 ? "del" : "delar"}:</p>
      <ul>`);
      for (const { d, djup } of h)
        ut.push(`        <li style="padding-left: ${djup * 1.1}em"><span>${djup ? "↳ " : ""}<span class="chip ${d.lage}">${LAGEN[d.lage].namn}</span> ${lank(d.id)}</span><span class="varfor">${esc(kortrad(d))}</span></li>`);
      ut.push("      </ul>");
    }
    ut.push("    </section>");
  });
  ut.push(`  </div>`);

  // Det som lönar sig först: mest hävstång först. Två listor, eftersom ett beslut inte byggs utan fattas.
  const rang = (ids: string[]) => ids.sort((a, b) => {
    const x = hav.get(a)!, y = hav.get(b)!;
    return y.mal.length - x.mal.length || y.delar - x.delar || andel(del.get(b)!) - andel(del.get(a)!);
  }).slice(0, 8);
  const bygga = rang(k.delar.filter((d) => (d.lage === "orange" || d.lage === "rod") && d.beror.every((b) => del.get(b)!.lage === "gron")).map((d) => d.id));
  const beslut = rang(k.delar.filter((d) => d.lage === "bla").map((d) => d.id));
  const punkt = (id: string) => {
    const d = del.get(id)!, x = hav.get(id)!;
    const vad = [x.mal.length ? `${x.mal.length} mål (${x.mal.join(", ")})` : "", x.delar ? `${x.delar} ${x.delar === 1 ? "del" : "delar"} till` : ""].filter(Boolean).join(" och ");
    return `<li><span class="chip ${d.lage}">${andel(d)} %</span> ${lank(id)}<span class="varfor">${vad ? `Låser upp ${esc(vad)}. ` : "Låser inte upp något annat. "}${esc(kortrad(d))}</span></li>`;
  };
  ut.push(`
  <h2 id="forst">Gör först: det som låser upp mest</h2>
  <p class="litet">Ju fler mål och delar som väntar på en del, desto mer lönar det sig att göra den tidigt. Listorna räknar på kartans beroenden.</p>
  <div class="forst">
    <section class="forst-lista" aria-labelledby="forst-bygga">
      <h3 id="forst-bygga">Att bygga nu</h3>
      <p class="litet">Delar som inte väntar på något annat, mest hävstång först.</p>
      <ol>${bygga.map(punkt).join("")}</ol>
    </section>
    <section class="forst-lista" aria-labelledby="forst-beslut">
      <h3 id="forst-beslut">Beslut och nycklar</h3>
      <p class="litet">Det som väntar på ett beslut eller en nyckel, mest hävstång först.</p>
      <ol>${beslut.map(punkt).join("")}</ol>
    </section>
  </div>

  <h2 id="byggordningen">Byggordningen</h2>`);
  if (ordning.length) {
    ut.push(`  <div class="varning">
    <p>Delar som är klara eller på väg men beror på något som inte är påbörjat:</p>
    <ul>`);
    for (const d of ordning) ut.push(`      <li>${lank(d.id)} beror på ${d.beror.filter((b) => del.get(b)?.lage === "rod").map(lank).join(", ")}</li>`);
    ut.push("    </ul>\n  </div>");
  } else ut.push(`  <p class="litet">Ingen klar eller påbörjad del beror på något som inte är påbörjat.</p>`);
  ut.push(`
  <h2 id="delarna">Alla delar</h2>
  <p class="litet">En rad per del, ordnade efter block. Klicka på en rad för att se bevis, vad som saknas, beroenden, kort och var delen beskrivs.</p>`);
  for (const b of k.block) {
    ut.push(`  <section class="delar-block" aria-labelledby="block-${b.id}">
  <h3 id="block-${b.id}" class="block-rubrik">${esc(b.namn)} <span class="litet">· ${medel(k.delar.filter((x) => x.block === b.id))} % klart</span></h3>`);
    for (const d of k.delar.filter((x) => x.block === b.id)) {
      const rader: string[] = [];
      if (d.lage !== "gron") rader.push(`<dt>Skattat klart</dt><dd>${andel(d)} %</dd>`);
      if (d.bevis) rader.push(`<dt>Bevis</dt><dd>${esc(d.bevis)}</dd>`);
      if (d.nyckel) rader.push(`<dt>Nyckel</dt><dd>${esc(d.nyckel)}</dd>`);
      if (d.saknas?.length) rader.push(`<dt>Saknas</dt><dd><ul>${d.saknas.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></dd>`);
      if (d.beror.length) rader.push(`<dt>Beror på</dt><dd>${d.beror.map(lank).join(", ")}</dd>`);
      const lev = levererar.get(d.id) ?? [];
      if (lev.length) rader.push(`<dt>Levererar till</dt><dd>${lev.map(lank).join(", ")}</dd>`);
      if (d.kort.length) rader.push(`<dt>Kort</dt><dd><ul>${d.kort.map((c) => { const i = kort.get(c)!; return `<li>${esc((i.nr ? i.nr + " " : "") + kortTitel(i.titel))} <span class="litet">· ${esc(i.agare)}</span></li>`; }).join("")}</ul></dd>`);
      if (d.beslut?.length) rader.push(`<dt>Beslut</dt><dd>DECISIONS ${d.beslut.join(", ")}</dd>`);
      if (d.beskrivs.length) rader.push(`<dt>Beskrivs i</dt><dd><ul>${d.beskrivs.map((r) => `<li>${ref(r)}</li>`).join("")}</ul></dd>`);
      ut.push(`  <details class="del" id="del-${d.id}">
    <summary><span class="del-namn">${esc(d.namn)}</span><span class="chip ${d.lage}">${LAGEN[d.lage].namn}</span><span class="del-pct">${andel(d)} %</span></summary>
    <dl class="rad">${rader.join("")}</dl>
  </details>`);
    }
    ut.push("  </section>");
  }
  ut.push(`  <p class="litet">Sidan skrivs av <span class="mono">scripts/projektkartan.ts</span> ur <span class="mono">docs/projektkartan.json</span> och tavlans öppna kort. Kontrollen i ci.yml fäller grönt utan bevis, blått utan nyckel, orange och rött utan lista, okända beroenden, block och mål, öppna kort utan del och en sida som inte är aktuell (DECISIONS #446).</p>
</main>
<script>
  // Mark what the pointed-at part depends on (dashed) and what depends on it (solid). Read-only; links work without it.
  (function () {
    var karta = document.querySelector(".blad");
    if (!karta) return;
    var rutor = Array.prototype.slice.call(karta.querySelectorAll(".ruta"));
    function rensa() { rutor.forEach(function (r) { r.classList.remove("markerad-beror", "markerad-levererar"); }); }
    function peka(r) {
      rensa();
      var id = r.getAttribute("data-id");
      var beror = (r.getAttribute("data-beror") || "").split(" ").filter(Boolean);
      rutor.forEach(function (x) {
        if (beror.indexOf(x.getAttribute("data-id")) >= 0) x.classList.add("markerad-beror");
        if ((x.getAttribute("data-beror") || "").split(" ").indexOf(id) >= 0) x.classList.add("markerad-levererar");
      });
    }
    rutor.forEach(function (r) {
      r.addEventListener("mouseenter", function () { peka(r); });
      r.addEventListener("focus", function () { peka(r); });
      r.addEventListener("mouseleave", rensa);
      r.addEventListener("blur", rensa);
    });
    // A link to a part opens its folded row.
    function oppna() {
      var id = (location.hash || "").slice(1);
      var el = id && document.getElementById(id);
      if (el && el.tagName === "DETAILS") { el.open = true; el.scrollIntoView({ block: "start" }); }
    }
    window.addEventListener("hashchange", oppna);
    oppna();
  })();
</script>
`);
  return ut.join("\n");
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/projektkartan.ts");

if (direkt && process.argv[2] === "--sjalvtest") {
  const pm = { text: "T", kalla: "K" };
  const k: Karta = {
    projektmal: pm,
    block: [{ id: "a", namn: "A", om: "", plats: "flode" }, { id: "c", namn: "C", om: "", plats: "under:a" }, { id: "d", namn: "D", om: "", plats: "under:c" }],
    mal: [{ id: "m", namn: "M", om: "", klart_nar: "", datum: "", delar: ["x", "q"] }],
    delar: [
      { id: "x", namn: "X", block: "a", lage: "gron", bevis: "körning 1", beror: [], kort: ["#1"], beskrivs: ["S 2"] },
      { id: "y", namn: "Y", block: "a", lage: "gron", klar: 50, beror: ["z", "y"], kort: ["#9"], beskrivs: ["S 7"] },
      { id: "z", namn: "Z", block: "b", lage: "orange", beror: [], kort: [], beskrivs: [] },
      { id: "w", namn: "W", block: "a", lage: "rod", klar: 40, saknas: ["s"], beror: [], kort: [], beskrivs: [] },
    ],
  };
  const oppna = [{ nyckel: "#1", nr: "#1", titel: "ETT", agare: "Bengt" }, { nyckel: "#2", nr: "#2", titel: "TVÅ", agare: "Axel" }];
  const sidor = { S: { fil: "s.html", namn: "Sidan" } };
  const fel = granska(k, oppna, sidor, () => "<h2>2. Två</h2>");
  const vant = ["y: grön utan bevis", "y: grön bär en skattning; grönt är 100 %", "y: beror på sig själv", "y: kortet #9 är inte öppet på tavlan",
    "y: avsnittet S 7 finns inte", "z: okänt block \"b\"", "z: delvis utan lista över vad som saknas",
    "z: delvis utan skattad andel klar (0–99 %)", "w: ej påbörjad med skattningen 40 % (högst 20)", "öppet kort utan del: #2 TVÅ",
    "målet m: okänd del \"q\"", "målet m: saknar \"klart när\"", "block d: ligger under \"c\", som inte är ett steg i flödet"];
  const ok = vant.every((v) => fel.includes(v)) && fel.length === vant.length;
  if (!ok) { console.error("✗ självtest: granskningen", fel); process.exit(1); }
  const del = new Map<string, Del>([
    ["g", { id: "g", namn: "G", block: "a", lage: "orange", klar: 40, saknas: ["s"], beror: ["h", "i"], kort: [], beskrivs: [] }],
    ["h", { id: "h", namn: "H", block: "a", lage: "gron", bevis: "b", beror: ["j"], kort: [], beskrivs: [] }],
    ["i", { id: "i", namn: "I", block: "a", lage: "bla", klar: 20, nyckel: "n", beror: ["j"], kort: [], beskrivs: [] }],
    ["j", { id: "j", namn: "J", block: "a", lage: "rod", saknas: ["s"], beror: [], kort: [], beskrivs: [] }],
  ]);
  const mal: Mal = { id: "m", namn: "M", om: "", klart_nar: "k", datum: "", delar: ["g", "j"] };
  const h = hinder(mal, del).map((x) => `${x.d.id}${x.djup}`).join(" ");
  if (h !== "g0 i1 j2") { console.error("✗ självtest: hindren", h); process.exit(1); }
  // Målets procent räknas över allt det vilar på: g 40, h 100, i 20, j 0 ⇒ 40.
  const pct = medel(malDelar(mal, del));
  if (pct !== 40) { console.error("✗ självtest: målets procent", pct); process.exit(1); }
  // Hävstången: j bär h, i och g (två ej klara) och målet; h är grön och har ingen.
  const hv = havstang({ projektmal: pm, block: [], mal: [mal], delar: [...del.values()] }, del);
  if (hv.get("j")!.delar !== 2 || hv.get("j")!.mal.join() !== "M" || hv.has("h")) { console.error("✗ självtest: hävstången", [...hv]); process.exit(1); }
  const html = sida({ projektmal: pm, block: [k.block[0]], mal: [], delar: [k.delar[0]] }, [oppna[0]], sidor, () => "<h2>2. Två</h2>");
  if (!html.includes('href="#del-x"') || !html.includes("körning 1") || !html.includes("Sidan §2 Två") || !html.includes("100 %")) { console.error("✗ självtest: sidan"); process.exit(1); }
  console.log("✓ självtest: fel i delar, skattningar, block och mål fälls; hindren och hävstången går bara genom det som inte är klart; målets procent räknas över allt det vilar på");
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
