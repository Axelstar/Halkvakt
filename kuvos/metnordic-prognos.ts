// MET NORDICS PROGNOSER FÖR KUVÖSEN (DECISIONS #518, #519, kort #308): MET Norways arkiverade MET Nordic-prognoser (1 km, körningar
// 00, 06, 12 och 18 UTC) för vintern 2024/25, i samma rutor som analysen (metnordic_stationer.csv i releasen kuvos-metnordic-2024-25).
// Hämtas EN gång till en öppen release; läsningen läser filen, aldrig nätet. Byggd på analysens hämtning (kuvos/metnordic.ts på grenen
// kuvos/rutnatet-469, ec30eff): samma DAP-tolkning, samma rutor, en förbindelse åt gången enligt tjänstens villkor.
//
// Vad som hämtas: timstegen 0–29 ur varje körning (fysiken startar om från analysens tillstånd vid körningen och räknar framåt, #519),
// samma sju fält som analysen, i rutan över alla stationer — fem anrop om sex timsteg per körning (uppmätt 11/10: 12 s och 156 MB per
// anrop; ett anrop kostar omkring 10 s oavsett storlek, så färre och större anrop är billigast).
// Två skillnader mot analysfilen, uppmätta 11/10 (VÄRDEVAKTEN): strålningen i prognosen är SUMMERAD från körningens start, så
// timvärdet räknas som skillnaden mot förra timsteget (timsteg 0 blir tomt); nederbörden är per timme men saknar värde i timsteg 0
// (fyllnadsvärdet 9,97e36, som blir tomt). Allt annat skrivs i källans enheter, temperaturen K → °C. Små negativa nederbördsvärden
// (−0,002 mm) skrivs som de är; värdevakten redovisar dem.
//
// Kör:      node --experimental-strip-types kuvos/metnordic-prognos.ts <metnordic_stationer.csv> <utmapp> <fran-dag> <till-dag> [körningar, t.ex. 6]
// Självtest: node --experimental-strip-types kuvos/metnordic-prognos.ts --sjalvtest
// Källa: MET Norway, MET Nordic (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpparchive/catalog.html
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, readdirSync } from "node:fs";
import { createGzip, gunzipSync } from "node:zlib";
import { join } from "node:path";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
const BAS = "https://thredds.met.no/thredds/dodsC/metpparchive";
export const KORNINGAR = [0, 6, 12, 18], TIMSTEG = 30, PER_ANROP = 6;
/** Fälten i analysfilens ordning; källans namn → kolumnnamn; summerad = strålningen, som räknas om till timvärden. */
export const FALT: [string, string, boolean][] = [
  ["air_temperature_2m", "t2m_c", false],
  ["relative_humidity_2m", "rh2m", false],
  ["wind_speed_10m", "vind10_ms", false],
  ["cloud_area_fraction", "moln", false],
  ["precipitation_amount", "nederbord_mm", false],
  ["integral_of_surface_downwelling_longwave_flux_in_air_wrt_time", "langvag_jm2", true],
  ["integral_of_surface_downwelling_shortwave_flux_in_air_wrt_time", "kortvag_jm2", true],
];
export const RUBRIK = `station_id,korning_utc,ledtid_h,tid_utc,${FALT.map(([, k]) => k).join(",")}`;

export type Falt = { namn: string; dims: number[]; data: Float32Array };

/** Ett DAP2-svar (.dods) → fälten i rubrikens ordning (som kuvos/metnordic.ts). Kastar om längderna inte stämmer med rubriken. */
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

/** Kolumnvärdet som text: saknat (NaN, källans fyllnadsvärde) blir tomt, aldrig noll. Temperaturen K → °C. */
export function varde(kolumn: string, v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) > 1e20) return "";
  if (kolumn === "t2m_c") { const c = Math.round((v - 273.15) * 100) / 100; return (c === 0 ? 0 : c).toFixed(2); }
  return String(Math.round(v * 1000) / 1000);
}

/** Timvärdet ur en summa från körningens start: skillnaden mot förra timsteget; timsteg 0 och ett saknat grannvärde blir NaN. */
export function timvarde(nu: number, forra: number | undefined): number {
  const ok = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && Math.abs(v) < 1e20;
  return ok(nu) && ok(forra) ? nu - forra : NaN;
}

export function filnamn(dag: string, korning: number) {
  const [y, m, d] = dag.split("-"), hh = String(korning).padStart(2, "0");
  return `${BAS}/${y}/${m}/${d}/met_forecast_1_0km_nordic_${y}${m}${d}T${hh}Z.nc.dods`;
}

async function hamta(url: string): Promise<Uint8Array | null> {
  for (let forsok = 0; forsok < 6; forsok++) {
    try {
      // Ett anrop som hänger stoppar hela hämtningen (den går i följd), så varje anrop får tre minuter.
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(180_000) });
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

export function dagar(fran: string, till: string): string[] {
  const ut: string[] = [];
  for (let t = Date.parse(fran + "T00:00:00Z"); t <= Date.parse(till + "T00:00:00Z"); t += 86400000) ut.push(new Date(t).toISOString().slice(0, 10));
  return ut;
}

export type Ruta = { id: string; y: number; x: number };
export function lasRutor(csv: string): Ruta[] {
  const [rubrik, ...rader] = csv.trim().split("\n");
  const k = rubrik.split(","), iy = k.indexOf("ruta_y"), ix = k.indexOf("ruta_x");
  if (k[0] !== "station_id" || iy < 0 || ix < 0) throw new Error("metnordic_stationer.csv: fel rubrik");
  return rader.map((r) => { const c = r.split(","); return { id: c[0], y: Number(c[iy]), x: Number(c[ix]) }; });
}

/** Raderna för en körning ur dess svar (timstegen i ordning): varje station och timsteg, strålningen som timvärde. */
export function raderForKorning(korningIso: string, steg: Map<string, Falt>[], rutor: Ruta[], y0: number, x0: number, bx: number): string[] {
  const t0 = Date.parse(korningIso), ut: string[] = [];
  const forra = new Map<string, number[]>();                         // senaste summan per (fält, station), för timvärdena
  for (let k = 0; k < steg.length; k++) {
    const tid = new Date(t0 + k * 3600_000).toISOString().replace(".000", "");
    const falt = steg[k];
    for (let s = 0; s < rutor.length; s++) {
      const i = (rutor[s].y - y0) * bx + (rutor[s].x - x0);
      const v = FALT.map(([f, kol, summerad]) => {
        const x = falt.get(f)!.data[i];
        if (!summerad) return varde(kol, x);
        let fs = forra.get(f); if (!fs) { fs = new Array(rutor.length); forra.set(f, fs); }
        const h = timvarde(x, k === 0 ? undefined : fs[s]); fs[s] = x;
        return varde(kol, h);
      });
      ut.push(`${rutor[s].id},${korningIso},${k},${tid},${v.join(",")}`);
    }
  }
  return ut;
}

async function main(stationerCsv: string, mapp: string, fran: string, till: string, korningar = KORNINGAR) {
  mkdirSync(join(mapp, "dagar"), { recursive: true });
  const rutor = lasRutor(readFileSync(stationerCsv, "utf8"));
  const y0 = Math.min(...rutor.map((r) => r.y)), y1 = Math.max(...rutor.map((r) => r.y));
  const x0 = Math.min(...rutor.map((r) => r.x)), x1 = Math.max(...rutor.map((r) => r.x));
  const by = y1 - y0 + 1, bx = x1 - x0 + 1;
  console.log(`${rutor.length} stationer; ruta y ${y0}–${y1}, x ${x0}–${x1} (${by}×${bx}); ${fran}–${till}; timsteg 0–${TIMSTEG - 1}`);
  let hamtade = 0, saknade = 0;
  for (const dag of dagar(fran, till)) {
    const fil = join(mapp, "dagar", `${dag}.csv.gz`);
    if (existsSync(fil)) continue;                                       // återupptagen körning: dygnet finns
    const rader: string[] = [];
    for (const kh of korningar) {
      const korningIso = `${dag}T${String(kh).padStart(2, "0")}:00:00Z`;
      const steg: Map<string, Falt>[] = [];
      let saknas = false;
      for (let a = 0; a < TIMSTEG && !saknas; a += PER_ANROP) {
        const urval = FALT.map(([f]) => `${f}.${f}${encodeURIComponent(`[${a}:${a + PER_ANROP - 1}][${y0}:${y1}][${x0}:${x1}]`)}`).join(",");
        // Ett svar kan komma med 200 men avkortat (uppmätt 6/10 för analysen) — då hämtas det om, högst sex gånger.
        let tolkat: Falt[] | null = null;
        for (let forsok = 0; forsok < 6 && !tolkat; forsok++) {
          const b = await hamta(`${filnamn(dag, kh)}?${urval}`);
          if (!b) { saknas = true; break; }
          try { tolkat = tolkaDods(b); } catch (e) {
            if (forsok === 5) throw e;
            console.log(`  ${korningIso} timsteg ${a}: ${(e as Error).message} — hämtar om`);
            await new Promise((ok) => setTimeout(ok, 5000 * (forsok + 1)));
          }
        }
        if (!tolkat) break;
        const fm = new Map(tolkat.map((f) => [f.namn, f]));
        for (const [f] of FALT) {
          const x = fm.get(f);
          if (!x) throw new Error(`${korningIso}: fältet ${f} saknas i svaret`);
          if (x.dims.join() !== `${PER_ANROP},${by},${bx}`) throw new Error(`${korningIso}: ${f} har ${x.dims} — rutnätet eller tidsaxeln har ändrats`);
        }
        const n = by * bx;
        for (let k = 0; k < PER_ANROP; k++)
          steg.push(new Map(FALT.map(([f]) => { const x = fm.get(f)!; return [f, { namn: f, dims: [by, bx], data: x.data.subarray(k * n, (k + 1) * n) }]; })));
      }
      if (saknas || steg.length !== TIMSTEG) { saknade++; console.log(`  saknas: ${korningIso}`); continue; }
      for (const r of raderForKorning(korningIso, steg, rutor, y0, x0, bx)) rader.push(r);
      hamtade++;
    }
    const tmp = fil + ".tmp", gz = createGzip(), ut = gz.pipe(createWriteStream(tmp));
    gz.end(rader.join("\n") + (rader.length ? "\n" : ""));
    await new Promise<void>((ok) => ut.on("finish", () => ok()));
    renameSync(tmp, fil);                                                // ett dygn är antingen helt skrivet eller inte alls
    console.log(`${dag}: ${rader.length / Math.max(1, rutor.length * TIMSTEG)} körningar`);
  }
  // Slutfilen för intervallet: dygnen i ordning, rubriken först.
  const slut = join(mapp, `metnordic_prognos_${fran}_${till}.csv.gz`), gz = createGzip(), ut = gz.pipe(createWriteStream(slut));
  gz.write(RUBRIK + "\n");
  for (const f of readdirSync(join(mapp, "dagar")).filter((f) => f.endsWith(".csv.gz") && f >= fran && f.slice(0, 10) <= till).sort())
    gz.write(gunzipSync(readFileSync(join(mapp, "dagar", f))));
  await new Promise<void>((ok) => { ut.on("finish", () => ok()); gz.end(); });
  console.log(`klart: ${hamtade} körningar hämtade i den här körningen, ${saknade} saknade i arkivet → ${slut}`);
}

function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  // DAP-svar med ett fält [2 timsteg][1][2]; värdena ska komma tillbaka exakt, och ett avkortat svar ska fällas.
  const rubrik = new TextEncoder().encode("Dataset {\n  Structure {\n    Float32 a[time = 2][y = 1][x = 2];\n  } a;\n} t.nc;\n\nData:\n");
  const kropp = new DataView(new ArrayBuffer(8 + 16)); kropp.setUint32(0, 4); kropp.setUint32(4, 4);
  [1, 2, 3, 9.96921e36].forEach((v, i) => kropp.setFloat32(8 + 4 * i, v));
  const svar = new Uint8Array(rubrik.length + 24); svar.set(rubrik); svar.set(new Uint8Array(kropp.buffer), rubrik.length);
  const f = tolkaDods(svar);
  k(f.length === 1 && f[0].dims.join() === "2,1,2" && f[0].data[2] === 3, "tolkaDods läser fält och dimensioner");
  let fallde = false; try { tolkaDods(svar.slice(0, svar.length - 3)); } catch { fallde = true; }
  k(fallde, "ett avkortat svar fälls");
  k(varde("nederbord_mm", 9.96921e36) === "" && varde("t2m_c", 273.15) === "0.00" && varde("nederbord_mm", -0.002) === "-0.002", "saknat blir tomt, negativt brus står kvar");
  k(Number.isNaN(timvarde(5, undefined)) && timvarde(12, 5) === 7 && Number.isNaN(timvarde(12, 9.96921e36)), "timvärdet ur summan");
  // En körning med två stationer, tre timsteg: strålningen summerad 0, 10, 25 ⇒ tomt, 10, 15; nederbörden tom i timsteg 0.
  const rutor: Ruta[] = [{ id: "A", y: 5, x: 7 }, { id: "B", y: 5, x: 8 }];
  const steg = [0, 1, 2].map((t) => new Map(FALT.map(([f, , summerad]) => [f, { namn: f, dims: [1, 2],
    data: Float32Array.from([0, 1].map((s) => summerad ? [0, 10, 25][t] * (s + 1) : f === "precipitation_amount" && t === 0 ? 9.96921e36 : f === "air_temperature_2m" ? 273.15 + t : 0.5)) }])));
  const rader = raderForKorning("2025-01-15T06:00:00Z", steg, rutor, 5, 7, 2);
  k(rader.length === 6, `sex rader (två stationer × tre timsteg): ${rader.length}`);
  k(rader[0] === "A,2025-01-15T06:00:00Z,0,2025-01-15T06:00:00Z,0.00,0.5,0.5,0.5,,,", `första raden: ${rader[0]}`);
  k(rader[3] === "B,2025-01-15T06:00:00Z,1,2025-01-15T07:00:00Z,1.00,0.5,0.5,0.5,0.5,20,20", `B timsteg 1: ${rader[3]}`);
  k(rader[5] === "B,2025-01-15T06:00:00Z,2,2025-01-15T08:00:00Z,2.00,0.5,0.5,0.5,0.5,30,30", `B timsteg 2: ${rader[5]}`);
  k(RUBRIK.split(",").length === rader[0].split(",").length, "rubriken har lika många kolumner som raderna");
  k(filnamn("2025-01-15", 6).endsWith("/2025/01/15/met_forecast_1_0km_nordic_20250115T06Z.nc.dods"), "filnamnet");
  k(lasRutor("station_id,lat,lon,ruta_y,ruta_x\n1001,59,15,251,680\n").map((r) => `${r.id}:${r.y}:${r.x}`).join() === "1001:251:680", "rutorna läses ur analysens stationsfil");
  if (fel) process.exit(1);
  console.log("✓ självtest: DAP-tolkningen, saknade värden, strålningen som timvärde ur summan, raderna per körning och timsteg, filnamnet och rutorna");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  if (process.argv.includes("--sjalvtest")) sjalvtest();
  else {
    const [stationer, mapp, fran, till, valda] = process.argv.slice(2);
    if (!stationer || !mapp || !fran || !till) { console.error("kör: metnordic-prognos.ts <metnordic_stationer.csv> <utmapp> <fran-dag> <till-dag>"); process.exit(2); }
    await main(stationer, mapp, fran, till, valda ? valda.split(",").map(Number) : KORNINGAR);
  }
}
