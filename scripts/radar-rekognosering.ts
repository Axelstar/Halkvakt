// Radar-rekognoseringen (kort #43 steg 1, docs/RADAR-PLAN.md §3): ren läsning av de
// två kandidatkällorna. Inget lagras, inget byggs — sonden svarar på planens frågor:
//   A. SMHI:s öppna radardata: åtkomst, API-struktur, format, filstorlek, kadens.
//   B. Fjälltäckningen PÅ RIKTIGT: MET:s nowcast svarar 422 utanför radartäckning —
//      en punktsvep längs referensrutterna ritar täckningskartan åt oss.
//   C. Licenser + volymkalkyl.
// Felkroppsläxan: alla svar skrivs ut råa (status + snutt) — inga gissade strukturer.
// MET:s villkor kräver identifierande User-Agent; repo-URL används, inga personuppgifter.
//
// Kör (CI): node --experimental-strip-types scripts/radar-rekognosering.ts

const UA = "Halkvakt-rekognosering/0.1 (+https://github.com/Axelstar/Halkvakt)";
const get = (url: string) => fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });

let smhiOk = false, metOk = false;

// ── A. SMHI radar: prova kandidatvägar, skriv ut vad som faktiskt svarar.
console.log("=== A. SMHI öppna radardata (opendata-download-radar.smhi.se) ===");
const now = new Date();
const y = now.getUTCFullYear(), m = String(now.getUTCMonth() + 1).padStart(2, "0"), d = String(now.getUTCDate()).padStart(2, "0");
const candidates = [
  "https://opendata-download-radar.smhi.se/api",
  "https://opendata-download-radar.smhi.se/api/version/latest.json",
  "https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp.json",
  `https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp/${y}/${m}/${d}.json`,
];
let dayListing: any = null;
for (const url of candidates) {
  try {
    const r = await get(url);
    const text = await r.text();
    console.log(`\n${url}\n  HTTP ${r.status} ${r.headers.get("content-type") ?? ""} (${text.length} tecken)`);
    console.log(`  ${text.slice(0, 220).replace(/\s+/g, " ")}`);
    if (r.ok) {
      smhiOk = true;
      if (url.includes(`/${y}/`)) { try { dayListing = JSON.parse(text); } catch { /* not json */ } }
    }
  } catch (e) { console.log(`\n${url}\n  FEL: ${String((e as Error).message)}`); }
}
// Kadens + storlek ur dagens listning om den gick att läsa.
if (dayListing?.files?.length) {
  const files = dayListing.files;
  console.log(`\nDagens listning: ${files.length} filposter.`);
  const times = files.map((f: any) => Number(f.valid ?? f.updated ?? 0)).filter((t: number) => t > 0).sort((a: number, b: number) => a - b);
  if (times.length > 2) {
    const gaps = times.slice(1).map((t: number, i: number) => (t - times[i]) / 60000);
    gaps.sort((a: number, b: number) => a - b);
    console.log(`Kadens (median tid mellan filer): ${gaps[Math.floor(gaps.length / 2)].toFixed(0)} min`);
  }
  const f0 = files[files.length - 1];
  console.log(`Senaste filpost (rå): ${JSON.stringify(f0).slice(0, 400)}`);
  const link = (f0.formats ?? []).map((x: any) => x.link).find((l: string) => l) ?? f0.link;
  if (link) {
    try {
      const r = await fetch(link, { headers: { "User-Agent": UA } });
      const buf = await r.arrayBuffer();
      console.log(`Nedladdningsprov ${link}\n  HTTP ${r.status}, ${r.headers.get("content-type")}, ${(buf.byteLength / 1024).toFixed(0)} kB`);
      console.log(`Volymkalkyl: ~${(buf.byteLength / 1024).toFixed(0)} kB/fil × 288 filer/dygn (5-min) ≈ ${(buf.byteLength * 288 / 1e6).toFixed(0)} MB rå/dygn — grids lagras ALDRIG (planens §2), samplas till segmentrader.`);
    } catch (e) { console.log(`Nedladdningsprov FEL: ${String((e as Error).message)}`); }
  }
} else {
  console.log("\n(Dagens listning gick inte att tolka som {files:[…]} — strukturen ovan är underlaget för nästa varv.)");
}

// ── B. MET nowcast: täckningssvep längs referensrutterna (422 = utanför radartäckning).
console.log("\n=== B. Fjälltäckningen: MET nowcast 2.0, punktsvep (200 = täckt, 422 = radarskugga) ===");
const POINTS: [string, number, number][] = [
  ["E22 Skåne (Hörby)", 55.85, 13.74], ["E6 Halland (Falkenberg)", 56.90, 12.49],
  ["E6 Bohuslän (Munkedal)", 58.47, 11.68], ["Rv40 Borås", 57.72, 12.94],
  ["E4 Småland (Värnamo)", 57.19, 14.04], ["E4 Östergötland (Linköping)", 58.41, 15.62],
  ["E4 Södertälje", 59.20, 17.63], ["E4 Uppsala", 59.86, 17.64],
  ["E4 Gävle", 60.67, 17.14], ["E4 Hudiksvall", 61.73, 17.11],
  ["E4 Sundsvall", 62.39, 17.31], ["E4 Örnsköldsvik", 63.29, 18.72],
  ["E4 Umeå", 63.83, 20.26], ["E4 Skellefteå", 64.75, 21.06],
  ["E4 Piteå", 65.32, 21.48], ["E4 Luleå", 65.58, 22.15],
  ["E10 Gällivare", 67.13, 20.66], ["E10 Kiruna", 67.86, 20.23],
  ["E14 Östersund", 63.18, 14.64], ["E14 Åre/fjället", 63.40, 13.08],
  ["E14 Storlien (norsk gräns)", 63.32, 12.10], ["Rv70 Mora", 61.00, 14.54],
  ["E18 Karlstad", 59.38, 13.50], ["Inlandet Vilhelmina", 64.62, 16.65],
  ["Inlandet Arvidsjaur", 65.59, 19.17], ["Fjället Tärnaby", 65.43, 15.31],
];
let covered = 0, uncovered = 0, failed = 0;
for (const [label, lat, lon] of POINTS) {
  try {
    const r = await get(`https://api.met.no/weatherapi/nowcast/2.0/complete?lat=${lat}&lon=${lon}`);
    let extra = "";
    if (r.ok) {
      const j: any = await r.json();
      const det = j?.properties?.timeseries?.[0]?.data?.instant?.details;
      const rate = det?.precipitation_rate;
      const radar = j?.properties?.meta?.radar_coverage;
      extra = ` regn nu: ${rate ?? "?"} mm/h${radar ? `, radar_coverage: ${radar}` : ""}`;
      covered++; metOk = true;
    } else if (r.status === 422) { extra = " ⇒ UTANFÖR radartäckning"; uncovered++; metOk = true; }
    else failed++;
    console.log(`${label.padEnd(28)} ${String(lat).padStart(6)},${String(lon).padEnd(6)} HTTP ${r.status}${extra}`);
  } catch (e) { failed++; console.log(`${label.padEnd(28)} FEL: ${String((e as Error).message)}`); }
  await new Promise((ok) => setTimeout(ok, 1100)); // met.no: var artig, ~1 anrop/s
}
console.log(`\nTäckningssvep: ${covered} täckta, ${uncovered} i radarskugga, ${failed} fel, av ${POINTS.length} punkter.`);

// ── C. Licenser.
console.log("\n=== C. Licenser ===");
console.log("SMHI öppna data: CC BY 4.0 — källa anges. MET (api.met.no): NLOD 2.0/CC BY 4.0 —");
console.log("källa anges + identifierande User-Agent (denna sond: repo-URL, inga personuppgifter).");
console.log("\nInget byggs på detta förrän källbeslutet (steg 2, DECISIONS-rad Axel + Bengt).");

if (!smhiOk && !metOk) { console.error("REKOGNOSERINGSVAKT: ingen av källorna svarade — sonden är trasig eller nätet blockerat."); process.exit(1); }
