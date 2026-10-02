// FÖRE RESAN — HUR OFTA SKULLE PENDLARENS NOTIS HA KOMMIT? (kort #233 del 1, DECISIONS #441; Bengt 2/10: "ja räkna på allt men bara
// som information inte något bygge alls"). LÄS-ONLY på kuvösens vinter 2024/25. Räknar hur ofta motorn hade sagt något längs en
// pendlingsväg vid kollen före avfärd. Det är FYRNINGAR, inte utfall: ingen yta efter kollen läses, inget facit, ingen träff.
//
// Bestämt innan körningen (DECISIONS #441):
//   - Pendlingsvägarna: de 20 svenska skuggrutterna, de första och de sista 30 km av varje — 40 vägar. Morgonen i den ena riktningen,
//     eftermiddagen i den andra.
//   - Kollerna: vardagar 1/11 2024 – 31/3 2025, kl. 06:45 och 16:00 svensk tid (en halvtimme före 07:15 och 16:30).
//   - Lägesbilden vid kollen: varje stations senaste rad inom tre timmar före kollen, med snapshotens vakter (#75, radvakten,
//     karantänen och den långsamma vakten) — som `weather_latest` och WX_SANE i driften. Stationerna blir frysriskpunkter som i
//     motorns snapshot-adapter (yta och fukt); broarna är inte med.
//   - Motorn (engine/src) kör vägen i 80 km/h, en punkt var femte sekund, som skuggmotorn. Notis = minst en varning.
//   - Två tal: (A) notis när motorn säger något alls, (B) notis bara när något är NYTT sedan vägens förra koll.
//   - Kuvösen har bara stationerna. Väglaget, olyckorna och vägarbetena saknas, så det här är frysrisken ensam — ett golv, inte ett tak.
//   - Ingen gräns är satt för hur ofta en notis får komma. Talen är information (Bengts ord).
// Kör: knappen kuvos med inmatningen matning = den här filen.
import { readFileSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import { haversineM } from "../../engine/src/geo.ts";
import type { Fix, Hazard } from "../../engine/src/types.ts";
import { RADVAKT_SQL, karantanSql } from "../../publish/snapshot-core.ts";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const pg = (await import("pg")).default;
const db = new pg.Client({ connectionString: url });
await db.connect();
await db.query("SET TimeZone = 'UTC'");
await db.query("SET statement_timeout = 0");

const PENDLING_KM = 30;
const src = readFileSync("supabase/functions/skuggmotor/main.ts", "utf8");
const start = src.indexOf("const ROUTES: Record<string, [number, number][]> = {");
const R: Record<string, [number, number][]> = new Function(`return ${src.slice(src.indexOf("{", start), src.indexOf("\n};", start) + 2)}`)();

// Den del av linjen som ligger inom de första `km` kilometerna.
function kapa(line: [number, number][], km: number): [number, number][] {
  const ut: [number, number][] = [line[0]]; let kvar = km * 1000;
  for (let i = 1; i < line.length && kvar > 0; i++) {
    const a = line[i - 1], b = line[i], d = haversineM({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] });
    if (d <= kvar) { ut.push(b); kvar -= d; } else { const f = kvar / d; ut.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); kvar = 0; }
  }
  return ut;
}
function spar(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = kmh / 3.6, fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const steps = Math.max(1, Math.round(haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 }) / (mps * stepS)));
    for (let s = 0; s < steps; s++) { const f = s / steps; fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh }); t += stepS; }
  }
  return fixes;
}
type Vag = { namn: string; dit: Fix[]; hem: Fix[]; lat: number; box: [number, number, number, number] };
const vagar: Vag[] = [];
for (const [namn, linje] of Object.entries(R)) {
  for (const [del, l] of [["början", kapa(linje, PENDLING_KM)], ["slutet", kapa([...linje].reverse(), PENDLING_KM)]] as const) {
    const lons = l.map((p) => p[0]), lats = l.map((p) => p[1]);
    vagar.push({ namn: `${namn} (${del})`, dit: spar(l), hem: spar([...l].reverse()), lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                 box: [Math.min(...lons) - 0.2, Math.min(...lats) - 0.1, Math.max(...lons) + 0.2, Math.max(...lats) + 0.1] });
  }
}

// Kollerna: vardagar, 06:45 och 16:00 svensk tid. Perioden har bara ett byte: sommartid från 30/3 2025.
const kollar: { t: Date; morgon: boolean; manad: string }[] = [];
for (let d = new Date(Date.UTC(2024, 10, 1)); d < new Date(Date.UTC(2025, 3, 1)); d = new Date(d.getTime() + 86_400_000)) {
  const vd = d.getUTCDay(); if (vd === 0 || vd === 6) continue;
  const off = d >= new Date(Date.UTC(2025, 2, 30)) ? 2 : 1;
  kollar.push({ t: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 6 - off, 45)), morgon: true, manad: d.toISOString().slice(0, 7) });
  kollar.push({ t: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 16 - off, 0)), morgon: false, manad: d.toISOString().slice(0, 7) });
}

const LAGE = `
  WITH senast AS (
    SELECT DISTINCT ON (station_id) station_id, sample_time, surface_temp_c, air_temp_c, rain, snow, precipitation, ST_X(geom) AS lon, ST_Y(geom) AS lat
    FROM weather_observations WHERE sample_time > $1::timestamptz - interval '3 hours' AND sample_time <= $1::timestamptz AND surface_temp_c IS NOT NULL
    ORDER BY station_id, sample_time DESC)
  SELECT station_id, lon, lat, surface_temp_c AS yta,
         (rain OR snow OR (precipitation IS NOT NULL AND precipitation <> '' AND lower(precipitation) NOT IN ('no', 'dry'))) AS fukt
  FROM senast w
  WHERE (air_temp_c IS NULL OR surface_temp_c >= air_temp_c - 12) AND ${RADVAKT_SQL} AND ${karantanSql("w")}`;

console.log(`PENDLAREN PÅ KUVÖSENS VINTER — fyrningar vid kollen före avfärd, inga utfall (DECISIONS #441)\n`);
console.log(`${vagar.length} pendlingsvägar (${PENDLING_KM} km var), ${kollar.length} koller (${kollar.length / 2} vardagar × 2), motorn i 80 km/h.`);

type Rad = { vag: number; morgon: boolean; manad: string; nar: string; a: boolean; b: boolean; n: number };
const rader: Rad[] = [];
const forra = new Map<number, Set<string>>();
let tomma = 0;
for (const k of kollar) {
  const lage = (await db.query(LAGE, [k.t.toISOString()])).rows as any[];
  if (!lage.length) tomma++;
  vagar.forEach((v, i) => {
    const faror: Hazard[] = lage.filter((s) => s.lon >= v.box[0] && s.lon <= v.box[2] && s.lat >= v.box[1] && s.lat <= v.box[3])
      .map((s) => ({ id: `wx:${s.station_id}`, kind: "icing_point", lon: Number(s.lon), lat: Number(s.lat), meta: { surfaceTempC: s.yta === null ? null : Number(s.yta), moisture: s.fukt === true } }) as Hazard);
    const ids = new Set(new AlertEngine(faror).run(k.morgon ? v.dit : v.hem).filter((a) => a.kind === "icing_point").map((a) => a.hazardId));
    const fore = forra.get(i) ?? new Set<string>();
    const nya = [...ids].filter((x) => !fore.has(x)).length;
    rader.push({ vag: i, morgon: k.morgon, manad: k.manad, nar: k.t.toISOString().slice(0, 16), a: ids.size > 0, b: nya > 0, n: ids.size });
    forra.set(i, ids);
  });
}
const andel = (xs: Rad[], f: (r: Rad) => boolean) => xs.length ? `${(100 * xs.filter(f).length / xs.length).toFixed(1).replace(".", ",")} %` : "–";
console.log(`Koller utan någon station i lägesbilden: ${tomma}\n`);
console.log(`ALLA: ${rader.length} pendlarkoller · (A) notis: ${rader.filter((r) => r.a).length} (${andel(rader, (r) => r.a)}) · (B) bara nytt: ${rader.filter((r) => r.b).length} (${andel(rader, (r) => r.b)})`);
const mor = rader.filter((r) => r.morgon), eft = rader.filter((r) => !r.morgon);
console.log(`  morgon 06:45: (A) ${andel(mor, (r) => r.a)} · (B) ${andel(mor, (r) => r.b)}   eftermiddag 16:00: (A) ${andel(eft, (r) => r.a)} · (B) ${andel(eft, (r) => r.b)}`);
const medN = rader.filter((r) => r.a).map((r) => r.n);
console.log(`  stationer per notis: medel ${(medN.reduce((s, x) => s + x, 0) / (medN.length || 1)).toFixed(1).replace(".", ",")}, högst ${Math.max(0, ...medN)}`);
console.log(`  per vecka och väg (10 koller): (A) ${(10 * rader.filter((r) => r.a).length / rader.length).toFixed(1).replace(".", ",")} notiser · (B) ${(10 * rader.filter((r) => r.b).length / rader.length).toFixed(1).replace(".", ",")}`);

console.log("\nPer månad: månad · (A) · (B)");
for (const m of [...new Set(rader.map((r) => r.manad))].sort()) { const x = rader.filter((r) => r.manad === m); console.log(`  ${m} · ${andel(x, (r) => r.a)} · ${andel(x, (r) => r.b)}`); }

console.log("\nPer breddgrad (vägens mitt): band · vägar · (A) · (B) · notiser per vecka (A) · (B)");
for (const [band, f] of [["under 58 °N", (l: number) => l < 58], ["58–62 °N", (l: number) => l >= 58 && l < 62], ["över 62 °N", (l: number) => l >= 62]] as const) {
  const v = new Set(vagar.map((x, i) => [x, i] as const).filter(([x]) => f(x.lat)).map(([, i]) => i)); const x = rader.filter((r) => v.has(r.vag));
  console.log(`  ${band} · ${v.size} · ${andel(x, (r) => r.a)} · ${andel(x, (r) => r.b)} · ${x.length ? (10 * x.filter((r) => r.a).length / x.length).toFixed(1).replace(".", ",") : "–"} · ${x.length ? (10 * x.filter((r) => r.b).length / x.length).toFixed(1).replace(".", ",") : "–"}`);
}

console.log("\nPer väg (A, andel av vägens koller), sorterat:");
const perVag = vagar.map((v, i) => { const x = rader.filter((r) => r.vag === i); return { namn: v.namn, lat: v.lat, a: x.filter((r) => r.a).length / x.length, b: x.filter((r) => r.b).length / x.length }; })
  .sort((p, q) => q.a - p.a);
for (const p of perVag) console.log(`  ${(100 * p.a).toFixed(0).padStart(3)} % · nytt ${(100 * p.b).toFixed(0).padStart(3)} % · ${p.lat.toFixed(1)} °N · ${p.namn}`);
await db.end();
