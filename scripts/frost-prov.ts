// Frost-provet (tavelkort "Frost-ankare (NO)", steg 2 efter rekognoseringen):
// does the Norrland >20 km gap shrink when Norway's Frost stations join the anchor set?
// Anchor ladder, measured over the published 818-segment skeleton (2 km sampling):
//   (a) SE VViS only          — the baseline (12.6 % Norrland, per ankaranalysen)
//   (b) + FI stations          — the measured 11.5 % step (parallel session 1/9)
//   (c) + NO Frost, Vegvesen-held only — road-side stations, closest NO analogue to VViS
//   (d) + NO Frost, all active air-temp stations
// NOTE: Frost anchors are AIR temperature (secondary, like SMHI-luftankare) — this
// measures anchor DISTANCE only; their predictive value is judged per TROSKLAR-SKUGGAN.
// Run (CI): frost-prov.yml (workflow_dispatch). Needs FROST_CLIENT_ID.

const id = process.env.FROST_CLIENT_ID;
if (!id) { console.error("FROST_CLIENT_ID not set"); process.exit(1); }
const auth = "Basic " + Buffer.from(id + ":").toString("base64");
const CDN = "https://axelstar.github.io/halkvakt-karta/data/";
const NORRLAND = new Set([21, 22, 23, 24, 25]);
const SAMPLE_KM = 2;

type Pt = [number, number];
function havKm(a: Pt, b: Pt): number {
  const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function sampleLine(line: Pt[], stepKm: number): Pt[] {
  const out: Pt[] = []; let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = havKm(line[i], line[i + 1]); if (d === 0) continue;
    let t = carry;
    while (t < d) { const f = t / d; out.push([line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f]); t += stepKm; }
    carry = t - d;
  }
  if (line.length) out.push(line[line.length - 1]);
  return out;
}
async function frost(path: string): Promise<any> {
  const r = await fetch("https://frost.met.no" + path, { headers: { Authorization: auth } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${path} -> ${r.status}: ${body.slice(0, 400)}`);
  return JSON.parse(body);
}
const cdn = (n: string) => fetch(CDN + n + `?t=${Date.now()}`).then((r) => { if (!r.ok) throw new Error(`${n}: ${r.status}`); return r.json(); });

const [vaglag, vader, src, ts] = await Promise.all([
  cdn("vaglag.geojson"), cdn("vader.geojson"),
  frost("/sources/v0.jsonld?types=SensorSystem&country=NO"),
  frost("/observations/availableTimeSeries/v0.jsonld?elements=air_temperature"),
]);
const se: Pt[] = vader.features.filter((f: any) => f.properties.land === "SE").map((f: any) => f.geometry.coordinates as Pt);
const fi: Pt[] = vader.features.filter((f: any) => f.properties.land === "FI").map((f: any) => f.geometry.coordinates as Pt);
const activeIds = new Set<string>();
for (const t of ts.data ?? []) if (!t.validTo) activeIds.add(String(t.sourceId).split(":")[0]);
const noAll: Pt[] = [], noVeg: Pt[] = [];
for (const s of src.data ?? []) {
  if (!activeIds.has(s.id) || s.geometry?.coordinates?.length !== 2) continue;
  noAll.push(s.geometry.coordinates as Pt);
  if ((s.stationHolders ?? []).some((h: string) => /vegvesen/i.test(h))) noVeg.push(s.geometry.coordinates as Pt);
}
console.log(`Ankare: SE ${se.length} · FI ${fi.length} · NO aktiva ${noAll.length} (varav Vegvesen ${noVeg.length})`);

// Sample the skeleton once; measure nearest-anchor distance per anchor set.
const lines = (g: any): Pt[][] => g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
const samples: { p: Pt; norr: boolean }[] = [];
for (const f of vaglag.features) {
  const norr = NORRLAND.has(Number(f.properties.lan ?? 0));
  for (const line of lines(f.geometry)) for (const p of sampleLine(line, SAMPLE_KM)) samples.push({ p, norr });
}
console.log(`Segmentskelett: ${vaglag.features.length} segment, ${samples.length} provpunkter à ${SAMPLE_KM} km\n`);
function measure(label: string, anchors: Pt[]) {
  const all: number[] = [], norr: number[] = [];
  for (const { p, norr: isN } of samples) {
    let best = Infinity;
    for (const a of anchors) { const d = havKm(p, a); if (d < best) best = d; }
    all.push(best); if (isN) norr.push(best);
  }
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const o20 = (xs: number[]) => xs.filter((d) => d > 20).length / xs.length * 100;
  console.log(`${label.padEnd(34)} nationellt ${med(all).toFixed(1)} km / ${o20(all).toFixed(1)} %   Norrland ${med(norr).toFixed(1)} km / ${o20(norr).toFixed(1)} %`);
}
console.log("ankaruppsättning                   median / andel >20 km");
measure("(a) SE VViS", se);
measure("(b) + FI", [...se, ...fi]);
measure("(c) + NO Frost (bara Vegvesen)", [...se, ...fi, ...noVeg]);
measure("(d) + NO Frost (alla aktiva)", [...se, ...fi, ...noAll]);
console.log("\nOBS: Frost-ankare är LUFTTEMPERATUR (sekundära, som SMHI) — detta mäter avstånd,");
console.log("inte prognosvärde; värdet prövas enligt TROSKLAR-SKUGGAN när vinterdata finns.");
