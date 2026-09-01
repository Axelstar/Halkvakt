// Ankaranalysen med båda ankartyperna (byggplan v3: "När filen finns gör Claude om
// ankaranalysen" — kort #38b(2), DECISIONS #51 steg 2). Reads ONLY the published CDN
// (no key, runnable anywhere): the 818-segment skeleton, the weather stations, and
// kameror-vaglag.geojson. Answers two questions:
//   1. Anchor density nationally and in Norrland (län 21–25), stations-only vs
//      stations+cameras — does the 13 % >20 km gap shrink?
//   2. Ankarklippning of the 20 reference routes: anchors along each route, max gap.
// Run: node --experimental-strip-types scripts/ankaranalys.ts

const CDN = "https://axelstar.github.io/halkvakt-karta/data/";
const SAMPLE_KM = 2;      // sampling step along segments
const ROUTE_NEAR_KM = 5;  // an anchor belongs to a route if within this distance
const NORRLAND = new Set([21, 22, 23, 24, 25]); // Gävleborg…Norrbotten

type Pt = [number, number];
function havKm(a: Pt, b: Pt): number {
  const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function sampleLine(line: Pt[], stepKm: number): Pt[] {
  const out: Pt[] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = havKm(line[i], line[i + 1]);
    if (d === 0) continue;
    let t = carry;
    while (t < d) {
      const f = t / d;
      out.push([line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f]);
      t += stepKm;
    }
    carry = t - d;
  }
  if (line.length) out.push(line[line.length - 1]);
  return out;
}
function nearestKm(p: Pt, anchors: Pt[]): number {
  let best = Infinity;
  for (const a of anchors) { const d = havKm(p, a); if (d < best) best = d; }
  return best;
}
function med(xs: number[]): number { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; }

const j = (n: string) => fetch(CDN + n + `?t=${Date.now()}`).then((r) => { if (!r.ok) throw new Error(`${n}: ${r.status}`); return r.json(); });
const [vaglag, vader, kamFil] = await Promise.all([j("vaglag.geojson"), j("vader.geojson"), j("kameror-vaglag.geojson")]);

const stationer: Pt[] = vader.features.filter((f: any) => f.properties.land === "SE").map((f: any) => f.geometry.coordinates as Pt);
const kameror: Pt[] = kamFil.features.map((f: any) => f.geometry.coordinates as Pt);
const alla = [...stationer, ...kameror];
console.log(`Ankare: ${stationer.length} stationer + ${kameror.length} väglagskameror = ${alla.length}`);

// 1. Anchor density over the 818-segment skeleton, sampled every SAMPLE_KM.
const lines = (g: any): Pt[][] => g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
const perLan = new Map<number, { stat: number[]; alla: number[] }>();
let nSeg = 0;
for (const f of vaglag.features) {
  nSeg++;
  const lan = Number(f.properties.lan ?? 0);
  let bucket = perLan.get(lan);
  if (!bucket) { bucket = { stat: [], alla: [] }; perLan.set(lan, bucket); }
  for (const line of lines(f.geometry))
    for (const p of sampleLine(line, SAMPLE_KM)) {
      bucket.stat.push(nearestKm(p, stationer));
      bucket.alla.push(nearestKm(p, alla));
    }
}
const agg = (which: "stat" | "alla", lanFilter?: Set<number>) => {
  const xs: number[] = [];
  for (const [lan, b] of perLan) if (!lanFilter || lanFilter.has(lan)) xs.push(...b[which]);
  return { n: xs.length, med: med(xs), over20: xs.filter((d) => d > 20).length / xs.length };
};
console.log(`\nSegmentskelett: ${nSeg} segment, ${agg("stat").n} provpunkter à ${SAMPLE_KM} km`);
console.log("                       median   andel >20 km");
for (const [label, filt] of [["Nationellt", undefined], ["Norrland (21–25)", NORRLAND]] as const)
  for (const [typ, which] of [["bara stationer", "stat"], ["+ kameror", "alla"]] as const) {
    const a = agg(which as "stat" | "alla", filt as Set<number> | undefined);
    console.log(`${label.padEnd(17)} ${typ.padEnd(15)} ${a.med.toFixed(1).padStart(5)} km ${(a.over20 * 100).toFixed(1).padStart(9)} %`);
  }

// 2. Ankarklippning of the 20 reference routes (same fixed polylines as the shadow engine).
const ROUTES: Record<string, Pt[]> = {
  "E22 Malmö→Kristianstad": [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
  "Väg 23 Höör→Osby":       [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
  "Väg 19 Ystad→Kristianstad": [[13.82,55.43],[13.87,55.50],[13.95,55.55],[14.02,55.63],[14.10,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],
  "E6 Malmö→Halmstad": [[12.99,55.61],[12.83,55.87],[12.70,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],
  "E6 Halmstad→Göteborg": [[12.86,56.67],[12.49,56.90],[12.25,57.11],[12.08,57.49],[11.97,57.71]],
  "E6 Göteborg→Strömstad": [[11.97,57.71],[11.98,57.87],[11.82,58.07],[11.94,58.35],[11.68,58.47],[11.32,58.72],[11.17,58.94]],
  "Rv40 Göteborg→Jönköping": [[11.97,57.71],[12.22,57.68],[12.94,57.72],[13.42,57.79],[14.16,57.78]],
  "E4 Helsingborg→Jönköping": [[12.70,56.05],[13.28,56.28],[13.60,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],
  "E4 Jönköping→Linköping": [[14.16,57.78],[14.47,58.02],[14.65,58.23],[15.13,58.32],[15.62,58.41]],
  "E4 Linköping→Södertälje": [[15.62,58.41],[16.19,58.59],[17.01,58.75],[17.63,59.20]],
  "E4 Södertälje→Uppsala": [[17.63,59.20],[18.07,59.33],[17.92,59.65],[17.64,59.86]],
  "E4 Uppsala→Gävle": [[17.64,59.86],[17.51,60.34],[17.14,60.67]],
  "E4 Gävle→Sundsvall": [[17.14,60.67],[17.06,61.30],[17.11,61.73],[17.31,62.39]],
  "E4 Sundsvall→Umeå": [[17.31,62.39],[17.94,62.63],[18.72,63.29],[19.50,63.57],[20.26,63.83]],
  "E4 Umeå→Luleå": [[20.26,63.83],[21.06,64.75],[21.48,65.32],[22.15,65.58]],
  "E10 Luleå→Kiruna": [[22.15,65.58],[21.69,65.83],[20.66,67.13],[20.23,67.86]],
  "E14 Sundsvall→Åre": [[17.31,62.39],[15.66,62.53],[15.42,62.75],[14.64,63.18],[13.08,63.40]],
  "E18 Karlstad→Örebro": [[13.50,59.38],[14.11,59.31],[14.52,59.33],[15.21,59.27]],
  "E18 Örebro→Stockholm": [[15.21,59.27],[15.84,59.39],[16.55,59.61],[17.07,59.64],[18.07,59.33]],
  "Rv70 Enköping→Mora": [[17.07,59.64],[16.60,59.92],[16.17,60.15],[15.98,60.28],[15.43,60.48],[15.13,60.55],[14.99,60.73],[15.12,60.89],[14.54,61.00]],
};
console.log(`\nAnkarklippning av referensrutterna (ankare ≤ ${ROUTE_NEAR_KM} km från linjen):`);
console.log("rutt                          längd  ankare(stat)  ankare(alla)  maxgap(stat)  maxgap(alla)");
for (const [name, line] of Object.entries(ROUTES)) {
  const pts = sampleLine(line, 1); // km-positions along the route: index = km
  const lengthKm = pts.length - 1;
  const cut = (anchors: Pt[]) => {
    // Position of every anchor near the route = km-index of its closest sample.
    const posSet = new Set<number>();
    for (const a of anchors) {
      let bi = -1, bd = ROUTE_NEAR_KM;
      for (let i = 0; i < pts.length; i++) { const d = havKm(a, pts[i]); if (d < bd) { bd = d; bi = i; } }
      if (bi >= 0) posSet.add(bi);
    }
    const pos = [...posSet].sort((a, b) => a - b);
    let maxGap = lengthKm ? (pos.length ? Math.max(pos[0], lengthKm - pos[pos.length - 1]) : lengthKm) : 0;
    for (let i = 1; i < pos.length; i++) maxGap = Math.max(maxGap, pos[i] - pos[i - 1]);
    return { n: pos.length, maxGap };
  };
  const s = cut(stationer), b = cut(alla);
  console.log(`${name.padEnd(28)} ${String(lengthKm).padStart(4)} km ${String(s.n).padStart(9)} ${String(b.n).padStart(13)} ${String(s.maxGap).padStart(10)} km ${String(b.maxGap).padStart(10)} km`);
}
