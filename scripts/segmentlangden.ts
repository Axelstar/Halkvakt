// Segmentlängden (kort #52, Bengts "mät"). Frågan var: går det att göra segmenten kortare?
// I stället för att resonera om reprisreglerna körs motorn skarpt mot syntetiska resor.
//
// HELT REN: ingen databas, inget nät, ingen hemlighet. Bara engine/src och en rak väg.
//
// TRE VARIANTER per längd:
//   A SOM I DAG    — ett segment, ett id. Repriser efter 10 min OCH 5 km (types.ts).
//   B DELAT        — samma geometri klippt i ~5 km-bitar, var bit ett EGET id. Ett nytt id
//                    har ingen fired-historik och är därför berättigat direkt.
//   C EN GÅNG/SEGMENT — den föreslagna regeln "samma segment talar inte igen förrän
//                    klassningen ändras". Härleds ur A:s utfall som antalet DISTINKTA id
//                    som talade; ingen motorändring behövs för att räkna den.
//
// Längderna är MÄTTA, inte påhittade: km/segment per län ur vinterbaltet #1 (5/9).
//
// Run: node --experimental-strip-types scripts/segmentlangden.ts
// Självtest: scripts/segmentlangden.ts --sjalvtest

import { AlertEngine } from "../engine/src/engine.ts";
import type { Fix, Hazard } from "../engine/src/types.ts";

const LON = 15.0, LAT0 = 62.0, M_PER_DEG = 111320;
const FART = 90;                       // km/h — landsvägsfart
const MPS = (FART * 1000) / 3600;      // 25 m/s

const lat = (m: number) => LAT0 + m / M_PER_DEG;

/** Rak nordgående resa längs hela sträckan, en fix i sekunden. */
function resa(langdM: number): Fix[] {
  const sek = Math.round(langdM / MPS);
  return Array.from({ length: sek + 1 }, (_, t) => ({ t, lon: LON, lat: lat(t * MPS), speedKmh: FART }));
}

/** Ett segment, eller samma sträcka klippt i bitar om delM anges. */
function segment(langdM: number, info: string[], delM?: number): Hazard[] {
  const meta = { code: 1, info };     // code 1 = "Normalt" — exakt #52-fallet
  if (!delM) return [{ id: "seg:hel", kind: "slippery_segment",
    line: [[LON, lat(0)], [LON, lat(langdM)]], meta }];
  const n = Math.max(1, Math.round(langdM / delM));
  return Array.from({ length: n }, (_, k) => ({
    id: `seg:del-${k}`, kind: "slippery_segment" as const,
    line: [[LON, lat((k * langdM) / n)], [LON, lat(((k + 1) * langdM) / n)]] as [number, number][], meta }));
}

function kor(langdM: number, info: string[], delM?: number) {
  const larm = new AlertEngine(segment(langdM, info, delM)).run(resa(langdM));
  return { antal: larm.length, distinkta: new Set(larm.map(a => a.hazardId)).size,
           tider: larm.map(a => a.t) };
}

// ── Självtest med känd sanning. Två påståenden som går att räkna ut för hand.
if (process.argv.includes("--sjalvtest")) {
  let ok = true;
  // (1) 5 km i 90 km/h tar 200 s < reprisfönstret 600 s ⇒ EXAKT ett larm.
  const kort = kor(5000, ["Packad snö"]);
  console.log(`SJÄLVTEST 1 — 5 km (200 s körtid, reprisfönster 600 s): ${kort.antal} larm, väntat 1`);
  if (kort.antal !== 1) { console.error("SJÄLVTEST: kort segment ska ge exakt ett larm"); ok = false; }
  // (2) Torr väg ska ge TYSTNAD — annars mäter riggen något annat än vi tror.
  const torrt = kor(59000, ["Torrt"]);
  console.log(`SJÄLVTEST 2 — 59 km klassat "Torrt": ${torrt.antal} larm, väntat 0`);
  if (torrt.antal !== 0) { console.error("SJÄLVTEST: torr väg ska vara tyst"); ok = false; }
  if (!ok) process.exit(1);
  console.log("SJÄLVTEST OK: riggen kör motorn rätt och larmar bara på det den ska.");
  process.exit(0);
}

// ── Skarpt. Uppmätta km/segment ur vinterbaltet #1.
const FALL: [string, number][] = [
  ["Jämtland", 59.0], ["Västerbotten", 50.4], ["Norrbotten", 47.1],
  ["Dalarna", 37.6], ["utanför Norrland (snitt)", 24.9], ["Stockholm", 18.4],
];

console.log(`Segmentlängden (kort #52) — hur många gånger talar ett "Packad snö"-segment?`);
console.log(`Rak resa i ${FART} km/h längs hela segmentet. code 1 + "Packad snö". Motorn körd skarpt.\n`);
console.log(`${"".padEnd(26)} ${"körtid".padStart(7)} ${"A som i dag".padStart(12)} ${"B delat 5 km".padStart(13)} ${"C en gång".padStart(10)}`);
for (const [namn, km] of FALL) {
  const m = km * 1000;
  const a = kor(m, ["Packad snö"]);
  const b = kor(m, ["Packad snö"], 5000);
  const min = (m / MPS / 60).toFixed(0);
  console.log(`  ${namn.padEnd(24)} ${(min + " min").padStart(7)} ${String(a.antal).padStart(12)} ${String(b.antal).padStart(13)} ${String(a.distinkta).padStart(10)}`);
}

const j = kor(59000, ["Packad snö"]);
const jb = kor(59000, ["Packad snö"], 5000);
console.log(`\nJÄMTLAND I DETALJ (59 km, ${(59000 / MPS / 60).toFixed(0)} min):`);
console.log(`  A talar vid minut ${j.tider.map(t => (t / 60).toFixed(0)).join(", ")}`);
console.log(`  B talar ${jb.antal} gånger, vid minut ${jb.tider.map(t => (t / 60).toFixed(0)).join(", ")}`);
console.log(`\nLÄSNING:`);
console.log(`  Att KORTA segmenten (B) ökar larmen — ett nytt id har ingen reprishistorik och är`);
console.log(`  berättigat direkt, så varje bit talar en gång. Geometrin är inte spaken.`);
console.log(`  C visar vad den föreslagna regeln skulle ge: ett larm per segment, oavsett längd.`);
console.log(`  Mätningen säger inte vilken variant som är RÄTT — bara vad var och en kostar i röst.`);
