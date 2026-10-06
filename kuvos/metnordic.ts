// KUVÖSENS RUTNÄT (Axels ord 6/10, DECISIONS #469, kort #296): MET Nordic Analysis — Meteorologisk institutts (MET Norway)
// timvisa analys på 1 km för Norden — för vintern 2024/25, samplad i rutan där varje Trafikverksstation står. Hämtas EN gång,
// som SMHI-filerna (kuvos/smhi-vinter.ts), och läggs i en privat release med manifest; provet läser filen, aldrig nätet.
//
// Vad som hämtas: sju fält per timme (lufttemperatur 2 m, relativ fukt 2 m, vind 10 m, molnmängd, nederbörd, inkommande lång- och
// kortvågsstrålning) ur en ruta som täcker alla stationerna, och två fasta fält en gång (rutans höjd och landandel). Inget tolkas:
// värdena skrivs i källans enheter utom temperaturen (K → °C, avrundad till två decimaler). Värdevakten deklarerar spannen innan
// något fält används i en mätning (CLAUDE.md, VÄRDEVAKTEN).
//
// Läckaget: analysens lufttemperatur rättas mot SMHI:s, FMI:s och MET:s stationer och mot Netatmo — inte mot Trafikverkets
// vägväderstationer (MET Nordic-dokumentationen, läst 6/10). Att gömma en Trafikverksstation i provet gömmer den alltså helt.
//
// Artighet: tjänstens villkor ber om EN förbindelse åt gången. Hämtningen går i följd, en timme per anrop (alla sju fälten i ett
// anrop, ~26 MB, ~5 s), och skriver en fil per dygn så att en avbruten körning fortsätter där den slutade.
//
// Kör:      node --experimental-strip-types kuvos/metnordic.ts <static.json> <utmapp> [fran-dag] [till-dag]
// Självtest: node --experimental-strip-types kuvos/metnordic.ts --sjalvtest
// Källa: MET Norway, MET Nordic Analysis (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpparchive/catalog.html
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, readdirSync, writeFileSync } from "node:fs";
import { createGzip } from "node:zlib";
import { join } from "node:path";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
const BAS = "https://thredds.met.no/thredds/dodsC/metpparchive";
/** Samma vinter som SMHI-filerna (kuvos/smhi-vinter.ts FRAN/TILL). */
export const FORSTA_DAG = "2024-10-31", SISTA_DAG = "2025-03-31";
/** Fälten i den ordning de skrivs; källans namn → kolumnnamn. */
export const FALT: [string, string][] = [
  ["air_temperature_2m", "t2m_c"],
  ["relative_humidity_2m", "rh2m"],
  ["wind_speed_10m", "vind10_ms"],
  ["cloud_area_fraction", "moln"],
  ["precipitation_amount", "nederbord_mm"],
  ["integral_of_surface_downwelling_longwave_flux_in_air_wrt_time", "langvag_jm2"],
  ["integral_of_surface_downwelling_shortwave_flux_in_air_wrt_time", "kortvag_jm2"],
];

export type Falt = { namn: string; dims: number[]; data: Float32Array };

/** Ett DAP2-svar (.dods) → fälten i rubrikens ordning. Svaret är en textrubrik, raden "Data:", och sedan per fält två
 *  32-bitars längder (XDR, stor-endian) följda av värdena som stor-endian float32. Kastar om längderna inte stämmer med
 *  rubriken — ett trasigt svar ska larma, inte bli tal. */
export function tolkaDods(buf: Uint8Array): Falt[] {
  const markor = new TextEncoder().encode("\nData:\n");
  let start = -1;
  for (let i = 0; i + markor.length <= buf.length && i < 1 << 20; i++) {
    let lika = true;
    for (let k = 0; k < markor.length; k++) if (buf[i + k] !== markor[k]) { lika = false; break; }
    if (lika) { start = i + markor.length; break; }
  }
  if (start < 0) throw new Error(`DAP-svaret saknar "Data:" — början: ${JSON.stringify(new TextDecoder().decode(buf.slice(0, 200)))}`);
  const rubrik = new TextDecoder().decode(buf.slice(0, start));
  const falt: { namn: string; dims: number[] }[] = [];
  for (const m of rubrik.matchAll(/Float32 (\w+)((?:\[\w+ = \d+\])+);/g))
    falt.push({ namn: m[1], dims: [...m[2].matchAll(/= (\d+)\]/g)].map((d) => Number(d[1])) });
  if (!falt.length) throw new Error("DAP-rubriken har inga Float32-fält");
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = start;
  return falt.map(({ namn, dims }) => {
    const n = dims.reduce((a, b) => a * b, 1);
    const n1 = dv.getUint32(p), n2 = dv.getUint32(p + 4);
    if (n1 !== n || n2 !== n) throw new Error(`${namn}: rubriken säger ${n} värden, svaret ${n1}/${n2}`);
    p += 8;
    if (p + 4 * n > buf.length) throw new Error(`${namn}: svaret är avkortat (${buf.length} byte)`);
    const data = new Float32Array(n);
    for (let i = 0; i < n; i++, p += 4) data[i] = dv.getFloat32(p);
    return { namn, dims, data };
  });
}

/** Närmaste rutmitt till (lat, lon) i ett krökt rutnät: grovsökning på var tionde ruta, sedan fullständig sökning ±20 rutor runt
 *  grovträffen. Avståndet räknas på planet med cos(lat) — rutorna är 1 km, så felet är försumbart. */
export function narmasteRuta(lat: number, lon: number, la: Float32Array, lo: Float32Array, ny: number, nx: number) {
  const c = Math.cos(lat * Math.PI / 180);
  const d2 = (i: number) => (la[i] - lat) ** 2 + ((lo[i] - lon) * c) ** 2;
  let bast = -1, bd = Infinity;
  for (let y = 0; y < ny; y += 10) for (let x = 0; x < nx; x += 10) { const i = y * nx + x, d = d2(i); if (d < bd) { bd = d; bast = i; } }
  const y0 = Math.floor(bast / nx), x0 = bast % nx;
  for (let y = Math.max(0, y0 - 20); y <= Math.min(ny - 1, y0 + 20); y++)
    for (let x = Math.max(0, x0 - 20); x <= Math.min(nx - 1, x0 + 20); x++) { const i = y * nx + x, d = d2(i); if (d < bd) { bd = d; bast = i; } }
  return { y: Math.floor(bast / nx), x: bast % nx, km: Math.sqrt(bd) * 111.2 };
}

/** Kolumnvärdet som text: saknat (NaN, källans fyllnadsvärde) blir tomt, aldrig noll. Temperaturen K → °C. */
export function varde(kolumn: string, v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) > 1e20) return "";
  if (kolumn === "t2m_c") { const c = Math.round((v - 273.15) * 100) / 100; return (c === 0 ? 0 : c).toFixed(2); }
  return String(Math.round(v * 1000) / 1000);
}

function filnamn(dag: string, timme: number) {
  const [y, m, d] = dag.split("-");
  return `${BAS}/${y}/${m}/${d}/met_analysis_1_0km_nordic_${y}${m}${d}T${String(timme).padStart(2, "0")}Z.nc.dods`;
}

async function hamta(url: string): Promise<Uint8Array | null> {
  for (let forsok = 0; forsok < 6; forsok++) {
    try {
      // Ett anrop som hänger stoppar hela hämtningen (den går i följd), så varje anrop får två minuter.
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return new Uint8Array(await r.arrayBuffer());
    } catch (e) {
      if (forsok === 5) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1)));
    }
  }
  return null;
}

function dagar(fran: string, till: string): string[] {
  const ut: string[] = [];
  for (let t = Date.parse(fran + "T00:00:00Z"); t <= Date.parse(till + "T00:00:00Z"); t += 86400000) ut.push(new Date(t).toISOString().slice(0, 10));
  return ut;
}

async function main(staticJson: string, mapp: string, fran = FORSTA_DAG, till = SISTA_DAG) {
  mkdirSync(join(mapp, "dagar"), { recursive: true });
  const stationer: { id: string; lat: number; lon: number }[] = JSON.parse(readFileSync(staticJson, "utf8")).stations;
  // Rutnätet och stationernas rutor, en gång (samma rutnät i hela arkivet; kontrolleras mot varje svars storlek nedan).
  const ref = filnamn(fran, 12);
  const [la, lo, hojd, land] = await Promise.all(["latitude", "longitude", "altitude", "land_area_fraction"].map(async (f) => {
    const b = await hamta(`${ref}?${f}.${f}`); if (!b) throw new Error(`${ref}: ${f} saknas`); return tolkaDods(b)[0];
  }));
  const [ny, nx] = la.dims;
  const rutor = stationer.map((s) => ({ ...s, ...narmasteRuta(s.lat, s.lon, la.data, lo.data, ny, nx) }));
  const y0 = Math.min(...rutor.map((r) => r.y)), y1 = Math.max(...rutor.map((r) => r.y));
  const x0 = Math.min(...rutor.map((r) => r.x)), x1 = Math.max(...rutor.map((r) => r.x));
  const bx = x1 - x0 + 1, by = y1 - y0 + 1;
  writeFileSync(join(mapp, "metnordic_stationer.csv"), "station_id,lat,lon,ruta_y,ruta_x,ruta_lat,ruta_lon,avstand_km,ruta_hojd_m,ruta_land\n" +
    rutor.map((r) => { const i = r.y * nx + r.x;
      return `${r.id},${r.lat},${r.lon},${r.y},${r.x},${la.data[i].toFixed(5)},${lo.data[i].toFixed(5)},${r.km.toFixed(2)},${varde("", hojd.data[i])},${varde("", land.data[i])}`; }).join("\n") + "\n");
  console.log(`${stationer.length} stationer, längst från rutmitten ${Math.max(...rutor.map((r) => r.km)).toFixed(2)} km; ruta y ${y0}–${y1}, x ${x0}–${x1} (${by}×${bx})`);
  const urval = FALT.map(([f]) => `${f}.${f}${encodeURIComponent(`[0:0][${y0}:${y1}][${x0}:${x1}]`)}`).join(",");

  let saknade = 0, timmar = 0;
  for (const dag of dagar(fran, till)) {
    const fil = join(mapp, "dagar", `${dag}.csv.gz`);
    if (existsSync(fil)) continue;                                       // återupptagen körning: dygnet finns
    const rader: string[] = [];
    for (let h = 0; h < 24; h++) {
      const tid = `${dag}T${String(h).padStart(2, "0")}:00:00Z`;
      const t0 = Date.now();
      const b = await hamta(`${filnamn(dag, h)}?${urval}`);
      if (process.env.MN_TIDER) console.log(`  ${tid}: ${b ? b.length : "saknas"} byte på ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      if (!b) { saknade++; console.log(`  saknas: ${tid}`); continue; }
      const falt = new Map(tolkaDods(b).map((f) => [f.namn, f]));
      for (const [f] of FALT) {
        const x = falt.get(f);
        if (!x) throw new Error(`${tid}: fältet ${f} saknas i svaret`);
        if (x.dims.at(-1) !== bx || x.dims.at(-2) !== by) throw new Error(`${tid}: ${f} har ${x.dims} — rutnätet har ändrats`);
      }
      for (const r of rutor) {
        const i = (r.y - y0) * bx + (r.x - x0);
        rader.push(`${r.id},${tid},${FALT.map(([f, k]) => varde(k, falt.get(f)!.data[i])).join(",")}`);
      }
      timmar++;
    }
    const tmp = fil + ".tmp", gz = createGzip(), ut = gz.pipe(createWriteStream(tmp));
    gz.end(rader.join("\n") + (rader.length ? "\n" : ""));
    await new Promise<void>((ok) => ut.on("finish", () => ok()));
    renameSync(tmp, fil);                                                // ett dygn är antingen helt skrivet eller inte alls
    console.log(`${dag}: ${rader.length / Math.max(1, rutor.length)} timmar`);
  }
  // Slutfilen: dygnen i ordning, rubriken först.
  const slut = join(mapp, "metnordic_2024-25.csv.gz"), gz = createGzip(), ut = gz.pipe(createWriteStream(slut));
  gz.write(`station_id,tid_utc,${FALT.map(([, k]) => k).join(",")}\n`);
  const { gunzipSync } = await import("node:zlib");
  for (const f of readdirSync(join(mapp, "dagar")).filter((f) => f.endsWith(".csv.gz")).sort())
    gz.write(gunzipSync(readFileSync(join(mapp, "dagar", f))));
  await new Promise<void>((ok) => { ut.on("finish", () => ok()); gz.end(); });
  console.log(`klart: ${timmar} timmar hämtade i den här körningen, ${saknade} saknade i arkivet → ${slut}`);
}

function sjalvtest() {
  // Ett påhittat DAP-svar med två fält i rubrikens ordning; värdena ska komma tillbaka exakt, och ett avkortat svar ska fällas.
  const rubrik = new TextEncoder().encode("Dataset {\n  Structure {\n    Float32 a[time = 1][y = 2][x = 2];\n  } a;\n" +
    "  Structure {\n    Float32 b[time = 1][y = 2][x = 2];\n  } b;\n} test.nc;\n\nData:\n");
  const kropp = new DataView(new ArrayBuffer(2 * (8 + 16)));
  let p = 0;
  for (const v of [[1, 2, 3, 4], [273.15, NaN, 9.96921e36, -5.5]]) { kropp.setUint32(p, 4); kropp.setUint32(p + 4, 4); p += 8; for (const x of v) { kropp.setFloat32(p, x); p += 4; } }
  const svar = new Uint8Array(rubrik.length + kropp.byteLength); svar.set(rubrik); svar.set(new Uint8Array(kropp.buffer), rubrik.length);
  const f = tolkaDods(svar);
  if (f.length !== 2 || f[0].namn !== "a" || f[0].data[3] !== 4 || f[1].dims.join() !== "1,2,2") throw new Error("tolkaDods läste fel");
  if (varde("t2m_c", f[1].data[0]) !== "0.00" || varde("x", f[1].data[1]) !== "" || varde("x", f[1].data[2]) !== "") throw new Error("varde: saknat blev inte tomt");
  let fallde = false; try { tolkaDods(svar.slice(0, svar.length - 3)); } catch { fallde = true; }
  if (!fallde) throw new Error("ett avkortat svar fälldes inte");
  // Närmaste ruta på ett snett rutnät 60×60 med 0,01° steg: punkten mitt i en ruta ska träffa just den rutan.
  const ny = 60, nx = 60, la = new Float32Array(ny * nx), lo = new Float32Array(ny * nx);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { la[y * nx + x] = 60 + y * 0.01 + x * 0.001; lo[y * nx + x] = 15 + x * 0.02; }
  const r = narmasteRuta(60 + 37 * 0.01 + 41 * 0.001, 15 + 41 * 0.02, la, lo, ny, nx);
  if (r.y !== 37 || r.x !== 41 || r.km > 0.01) throw new Error(`narmasteRuta: ${JSON.stringify(r)}`);
  console.log("självtest: DAP-tolkningen, saknade värden, avkortat svar och närmaste ruta — alla rätt");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  if (process.argv[2] === "--sjalvtest") sjalvtest();
  else {
    const [s, mapp, fran, till] = process.argv.slice(2);
    if (!s || !mapp) { console.error("användning: metnordic.ts <static.json> <utmapp> [fran-dag] [till-dag] | --sjalvtest"); process.exit(1); }
    await main(s, mapp, fran, till);
  }
}
