// FACITRADIEN — hur långt är det från ett skugglarm till närmaste väglagskamera?
// (kort #157, Bengts order 14/9 "mät radien". DECISIONS #176.)
//
// VARFÖR FRÅGAN STÄLLS. `archiveFacit` i skuggmotorn sparar en kamerabild vid varje larm, som facit
// att granska senare. Bucketen innehöll noll objekt efter 5 657 körningar, och när grenarna gjordes
// högljudda (#173) kom skälet: **"ingen kamera inom 15 km"**. Radien är hårdkodad och har aldrig
// mätts mot skuggrutterna.
//
// HYPOTESEN, SKRIVEN FÖRE SVARET: om radien är fel för de här rutterna ska andelen larm med en
// kamera inom 15 km vara LÅG — under en tredjedel. Är den däremot hög är radien inte det som
// tömmer bucketen, och då finns ett led till som inte syns ännu.
//
// INGEN RADIE ÄNDRAS AV DEN HÄR KÖRNINGEN. Skriptet skriver ut hela svepet så att valet kan göras
// på mätning, precis som G_tak och byvindtaket gjordes. Att flytta en tröskel för att utfallet ser
// bättre ut på andra sidan är precis vad husets disciplin finns emot — också för ett tal som aldrig
// skrivits in i ett tröskeldokument.
//
// Helt läsande: en GET mot kartlagret och en fråga till skuggloggen. Inget skrivs.
// Run: DATABASE_URL=... node --experimental-strip-types scripts/facitradien.ts [dagar=14]
// Självtest utan DB: scripts/facitradien.ts --sjalvtest

const KARTA = "https://axelstar.github.io/halkvakt-karta/data/kameror-vaglag.geojson";
const NUVARANDE_M = 15000;                          // radien i archiveFacit i dag
const SVEP_M = [5000, 10000, 15000, 20000, 30000, 50000];
const MIN_LARM = 100;                               // under detta ⊘ OAVGJORT, aldrig ett tal

/** Avstånd i meter mellan två WGS84-punkter. Samma formel som skuggmotorns haversineM. */
export function meter(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const la1 = a.lat * rad, la2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Närmaste avstånd från en punkt till en mängd kameror. null = inga kameror alls. */
export function narmast(p: { lon: number; lat: number }, kameror: { lon: number; lat: number }[]): number | null {
  let b: number | null = null;
  for (const k of kameror) {
    const d = meter(p, k);
    if (b === null || d < b) b = d;
  }
  return b;
}

const km = (m: number) => (m / 1000).toFixed(1);
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "–");

if (process.argv.includes("--sjalvtest")) {
  console.log("SJÄLVTEST — avståndet mot känd sanning\n");
  let ok = true;
  const k = (namn: string, fick: unknown, vantat: unknown) => {
    if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); ok = false; }
    else console.log(`  ok: ${namn} = ${fick}`);
  };
  // En breddgrad är ~111 km — samma prov som grind T-A:s haversine bär.
  k("en breddgrad ≈ 111 km", Math.round(meter({ lon: 15, lat: 59 }, { lon: 15, lat: 60 }) / 1000), 111);
  k("samma punkt ger noll", meter({ lon: 15, lat: 59 }, { lon: 15, lat: 59 }), 0);
  k("närmast väljer rätt av tre",
    Math.round(narmast({ lon: 15, lat: 59 }, [{ lon: 16, lat: 59 }, { lon: 15.1, lat: 59 }, { lon: 17, lat: 59 }])! / 100),
    Math.round(meter({ lon: 15, lat: 59 }, { lon: 15.1, lat: 59 }) / 100));
  k("utan kameror finns inget avstånd", narmast({ lon: 15, lat: 59 }, []), null);
  k("svepet bär den nuvarande radien", SVEP_M.includes(NUVARANDE_M), true);
  if (!ok) { console.error("\nSJÄLVTEST FÄLLDE."); process.exit(1); }
  console.log("\nSJÄLVTEST OK: avståndet räknar rätt och svepet innehåller det tal som gäller i dag.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAGAR = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 14);
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows as any[];

console.log(`FACITRADIEN — avstånd från skugglarm till närmaste väglagskamera (${DAGAR} dygn)\n`);
console.log(`  HYPOTES (skriven före svaret): är radien fel för de här rutterna ska andelen larm med`);
console.log(`  en kamera inom ${km(NUVARANDE_M)} km vara LÅG — under en tredjedel. Är den hög är radien`);
console.log(`  inte det som tömmer bucketen, och då finns ett led till som inte syns ännu.\n`);

const geo = await (await fetch(`${KARTA}?t=${Date.now()}`)).json();
const kameror = (geo?.features ?? []).flatMap((f: any) => {
  const c = f?.geometry?.coordinates;
  return Array.isArray(c) && c.length >= 2 ? [{ lon: Number(c[0]), lat: Number(c[1]) }] : [];
});
console.log(`  ${kameror.length} väglagskameror ur kartlagret`);
if (!kameror.length) { console.error("\nUNDERLAGSVAKT: inga kameror — avbryter."); await pool.end(); process.exit(1); }

const larm = await q(`
  SELECT s.route, (a->>'kind') AS kind,
         (a->>'lon')::float8 AS lon, (a->>'lat')::float8 AS lat
  FROM shadow_log s, jsonb_array_elements(s.alerts) a
  WHERE s.land = 'SE' AND s.run_at > now() - $1 * interval '1 day'
    AND (a->>'lon') IS NOT NULL AND (a->>'lat') IS NOT NULL`, [DAGAR]);
console.log(`  ${larm.length} skugglarm i Sverige med position\n`);
if (larm.length < MIN_LARM) {
  console.log(`  ⊘ OAVGJORT — färre än ${MIN_LARM} larm. Talen nedan skrivs ut men bär ingen dom.`);
}

const avstand = larm.map((l) => narmast({ lon: Number(l.lon), lat: Number(l.lat) }, kameror)!).sort((a, b) => a - b);
const p = (x: number) => avstand[Math.min(avstand.length - 1, Math.floor(x * avstand.length))];

console.log("FÖRDELNINGEN");
console.log(`  median ${km(p(0.5))} km · p25 ${km(p(0.25))} · p75 ${km(p(0.75))} · p90 ${km(p(0.9))}`);
console.log(`  närmast ${km(avstand[0])} km · längst bort ${km(avstand[avstand.length - 1])} km\n`);

console.log(`SVEPET — hur många larm fångas vid varje radie?`);
for (const r of SVEP_M) {
  const n = avstand.filter((d) => d <= r).length;
  console.log(`  ${String(km(r)).padStart(5)} km: ${String(n).padStart(6)} av ${avstand.length}`
    + ` (${pct(n, avstand.length)})${r === NUVARANDE_M ? "   ← GÄLLER I DAG" : ""}`);
}

console.log(`\nPER RUTT — var sitter problemet?`);
const perRutt = new Map<string, number[]>();
for (const l of larm) {
  const d = narmast({ lon: Number(l.lon), lat: Number(l.lat) }, kameror)!;
  (perRutt.get(l.route) ?? perRutt.set(l.route, []).get(l.route)!).push(d);
}
const rutter = [...perRutt.entries()].map(([r, d]) => ({
  rutt: r, n: d.length, inom: d.filter((x) => x <= NUVARANDE_M).length,
  median: [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)],
})).sort((a, b) => a.inom / a.n - b.inom / b.n);
console.log(`  rutt                              larm   inom ${km(NUVARANDE_M)} km   median`);
for (const r of rutter.slice(0, 10))
  console.log(`  ${r.rutt.slice(0, 32).padEnd(32)} ${String(r.n).padStart(6)} ${pct(r.inom, r.n).padStart(12)} ${(km(r.median) + " km").padStart(9)}`);
if (rutter.length > 10) console.log(`  … och ${rutter.length - 10} rutter till`);

console.log(`\nVAD DEN HÄR KÖRNINGEN INTE GÖR: den ändrar ingen radie. Talen ovan är underlag för ett`);
console.log(`beslut, inte beslutet. En vidgad radie betyder att bilden visar en ANNAN vägsträcka än`);
console.log(`larmet gällde — facit blir då lösare, inte bara mer. Det är avvägningen som ska göras.`);

await pool.end();
