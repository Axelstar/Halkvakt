// MET NORDICS ANALYS FÖR EN ÄLDRE VINTER (förregistreringen FLER-VINTRAR §2, DECISIONS #666–#668): timvis analys 31/10–31/3 ur MET
// Norways arkiv metpparchive, i RUTORNA ur kuvösens release kuvos-metnordic-2024-25 (metnordic_stationer.csv, rutan närmast varje
// station i static.json 6/10) och i kuvösens analysform (station_id,tid_utc + sju fält, strålningen timvärden rakt av) — samma rutor
// och samma fil som kandidaten tränades på, så att fysik/niva2/metnordic.py läser den oförändrad. Hämtningen är historikens
// (ingest/metnordic-historik.ts: dygn(), samma DAP-tolkning och omförsök), bara stationerna i indatans stations.csv, ett dygn i taget,
// återupptagbar, med tidsbudget (MNV_MINUTER). En förbindelse åt gången (MET:s villkor).
//
// FÖRPROVET först: arkivets filer har inte alltid haft de sju fälten. Läst 22/10 (DDS, metpparchive): långvågen
// (integral_of_surface_downwelling_longwave_flux_in_air_wrt_time) saknas från 2018 till 13/3 2022 och finns från 14/3 2022, och
// 2018/19 har x_wind_10m/y_wind_10m i stället för wind_speed_10m. Kandidaten räknas med uppmätt långvåg (fysiken 'lw' och särdraget
// cloudlow), så en vinter utan fältet kan inte räknas som förregistreringen säger; förprovet fäller den innan något hämtas.
// Rutnätet ska vara 2018-filernas och 2024-filernas: 2321 × 1796.
//
// Kör:      node --experimental-strip-types fysik/vintrar/metnordic_vinter.ts --forprov <fran-dag> <till-dag>
//           node --experimental-strip-types fysik/vintrar/metnordic_vinter.ts --delar <fran-dag> <till-dag> <dygn per del>
//           node --experimental-strip-types fysik/vintrar/metnordic_vinter.ts --hamta <utmapp> <fran-dag> <till-dag> --rutor <metnordic_stationer.csv> --stationer <stations.csv>
// Självtest: node --experimental-strip-types fysik/vintrar/metnordic_vinter.ts --sjalvtest        (i ci.yml)
// Källa: MET Norway, MET Nordic (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpparchive/catalog.html
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FALT, dagar } from "../../kuvos/metnordic-prognos.ts";
import { rutorUrFil, rutan, avkortade, dapSvar, type Hamtare } from "../../ingest/metnordic-live.ts";
import { dygn, filnamnArkiv, RUBRIK_ANALYS } from "../../ingest/metnordic-historik.ts";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
export const RUTNAT = [2321, 1796];

/** Som historikens hämtare: 404 är en timme som saknas i arkivet (tomt svar), annat fel hämtas om fyra gånger. */
async function hamta(url: string): Promise<{ buf: Uint8Array; ms: number }> {
  for (let forsok = 0; forsok < 4; forsok++) {
    const t = Date.now();
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(180_000) });
      if (r.status === 404) return { buf: new Uint8Array(0), ms: Date.now() - t };
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return { buf: new Uint8Array(await r.arrayBuffer()), ms: Date.now() - t };
    } catch (e) {
      if (forsok === 3) throw new Error(`${url.slice(0, 120)}…: ${(e as Error).message}`);
      console.log(`  försök ${forsok + 1}: ${(e as Error).message} — väntar och hämtar om`);
      await new Promise((ok) => setTimeout(ok, 10_000 * (forsok + 1)));
    }
  }
  throw new Error("ohämtat");
}

/** Fälten som saknas i en DDS (beskrivningen av filen), eller som har ett annat rutnät än [1][y][x]. */
export function saknadeFalt(dds: string, rutnat = RUTNAT): string[] {
  return FALT.map(([f]) => f).filter((f) => !dds.includes(`Float32 ${f}[time = 1][y = ${rutnat[0]}][x = ${rutnat[1]}];`));
}

/** Provdygnen: första dygnet, den första i varje månad och sista dygnet — timme 00 (och 23 det sista). */
export function provtimmar(fran: string, till: string): [string, number][] {
  const d = dagar(fran, till);
  const ut: [string, number][] = [[fran, 0]];
  for (const x of d) if (x.endsWith("-01") && x !== fran) ut.push([x, 0]);
  ut.push([till, 0], [till, 23]);
  return ut;
}

export async function forprov(fran: string, till: string, h: Hamtare = hamta, rutnat = RUTNAT) {
  const fel: { fil: string; saknas: string[] }[] = [];
  for (const [dag, t] of provtimmar(fran, till)) {
    const url = filnamnArkiv(dag, t).replace(/\.dods$/u, ".dds");
    const { buf } = await h(url);
    const fil = url.split("/").pop()!;
    if (!buf.length) { fel.push({ fil, saknas: ["(filen saknas i arkivet)"] }); continue; }
    const s = saknadeFalt(new TextDecoder().decode(buf), rutnat);
    console.log(`${fil}: ${s.length ? "SAKNAR " + s.join(", ") : `alla sju fälten på rutnätet ${rutnat.join(" × ")}`}`);
    if (s.length) fel.push({ fil, saknas: s });
  }
  return fel;
}

/** Delarna för flödets matris: [fran, till] i bitar om högst n dygn. */
export function delar(fran: string, till: string, n: number) {
  const d = dagar(fran, till), ut: { fran: string; till: string }[] = [];
  for (let i = 0; i < d.length; i += n) ut.push({ fran: d[i], till: d[Math.min(i + n, d.length) - 1] });
  return ut;
}

export async function hamtaVinter(rutorFil: string, stationerFil: string, ut: string, fran: string, till: string, h: Hamtare = hamta,
  paus = 5000, minuter = Number(process.env.MNV_MINUTER || 0)) {
  mkdirSync(join(ut, "dagar"), { recursive: true });
  const sids = new Set(readFileSync(stationerFil, "utf8").trim().split("\n").slice(1).map((r) => r.split(",")[0].trim()));
  const alla = rutorUrFil(rutorFil).rutor;
  const r = alla.filter((x) => sids.has(x.id)).map((x) => ({ ...x, km: 0 }));
  const utan = [...sids].filter((s) => !alla.some((x) => x.id === s));
  if (utan.length) throw new Error(`${utan.length} av indatans stationer saknar ruta i ${rutorFil}: ${utan.slice(0, 5).join(", ")} …`);
  const box = rutan(r);
  console.log(`${r.length} stationer (av ${alla.length} rutor i filen); ruta y ${box.y0}–${box.y1}, x ${box.x0}–${box.x1} (${box.by}×${box.bx}); ${fran}–${till}`);
  const slutTid = minuter ? Date.now() + minuter * 60_000 : Infinity;
  let hamtade = 0, saknade = 0, byte = 0, ms = 0;
  for (const dag of dagar(fran, till)) {
    const fil = join(ut, "dagar", `${dag}.csv.gz`);
    if (existsSync(fil)) continue;                                       // återupptagen körning: dygnet finns
    if (Date.now() > slutTid) { console.log(`tidsbudgeten slut före ${dag}: de klara dygnen sparas, nästa körning tar vid där`); process.exit(3); }
    const d = await dygn(dag, r, box, h, paus);
    saknade += d.saknade; byte += d.byte; ms += d.ms; hamtade += 24 - d.saknade;
    const tmp = fil + ".tmp"; writeFileSync(tmp, gzipSync(d.rader.join("\n") + (d.rader.length ? "\n" : ""))); renameSync(tmp, fil);
    console.log(`${dag}: ${24 - d.saknade} timmar, ${d.rader.length} rader, ${(d.byte / 1e6).toFixed(0)} MB på ${(d.ms / 1000).toFixed(0)} s`);
  }
  const slut = join(ut, `metnordic_analys_${fran}_${till}.csv.gz`);
  const filer = readdirSync(join(ut, "dagar")).filter((f) => f.endsWith(".csv.gz") && f.slice(0, 10) >= fran && f.slice(0, 10) <= till).sort();
  writeFileSync(slut, gzipSync(Buffer.concat([Buffer.from(RUBRIK_ANALYS + "\n"), ...filer.map((f) => gunzipSync(readFileSync(join(ut, "dagar", f))))])));
  const s = { fran, till, dygn: filer.length, timmar_hamtade: hamtade, timmar_saknade: saknade, stationer: r.length,
    byte_mb: Math.round(byte / 1e6), sekunder: Math.round(ms / 1000), avkortade_svar: avkortade, fil: slut };
  writeFileSync(join(ut, `sammanfattning_${fran}_${till}.json`), JSON.stringify(s, null, 1));
  console.log(`klart: ${hamtade} timmar hämtade i den här körningen, ${saknade} saknade i arkivet, ${s.byte_mb} MB på ${s.sekunder} s → ${slut}`);
  return s;
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const d = mkdtempSync(join(tmpdir(), "mnv-")), ut = join(d, "ut");
  // Rutfilen har tre stationer, indatan två: 1001 i (1,1) och 1003 i (3,4) ⇒ rutan 3 hög och 4 bred; 1002 läses inte.
  writeFileSync(join(d, "rutor.csv"), "station_id,lat,lon,ruta_y,ruta_x,avstand_km\n1001,60,15,1,1,0.3\n1002,61,16,0,0,0.2\n1003,62,17,3,4,0.4\n");
  writeFileSync(join(d, "stations.csv"), "sid,lon,lat\n1001,15,60\n1003,17,62\n");
  const dds = (falt: string[]) => falt.map((f) => `        Float32 ${f}[time = 1][y = 2321][x = 1796];`).join("\n");
  let anrop = 0;
  const fejk: Hamtare = async (u) => {
    anrop++;
    if (u.endsWith(".dds")) {
      // Före 2022: utan långvåg och med vindkomponenterna (som 2018/19); från 2022: alla sju.
      const alla = FALT.map(([f]) => f), ar = Number(/metpparchive\/(\d{4})\//u.exec(u)![1]);
      return { buf: new TextEncoder().encode(dds(ar < 2022 ? alla.filter((f) => !f.includes("longwave") && f !== "wind_speed_10m") : alla)), ms: 1 };
    }
    if (u.includes("20230101T05Z")) return { buf: new Uint8Array(0), ms: 1 };                       // saknas i arkivet
    const t = Number(/T(\d{2})Z/u.exec(u)![1]);
    return { buf: dapSvar(FALT.map(([f]) => ({ namn: f, dims: [1, 3, 4], data: Array.from({ length: 12 }, (_, i) => f === "air_temperature_2m" ? 273.15 + t + i * 0.01 : 3600) }))), ms: 2 };
  };
  const logg = console.log; console.log = () => {};
  let f1: Awaited<ReturnType<typeof forprov>> = [], f2: typeof f1 = [];
  try { f1 = await forprov("2018-10-31", "2019-03-31", fejk); f2 = await forprov("2022-10-31", "2023-03-31", fejk); } finally { console.log = logg; }
  k(f1.length === 8 && f1.every((x) => x.saknas.includes("integral_of_surface_downwelling_longwave_flux_in_air_wrt_time") && x.saknas.includes("wind_speed_10m")),
    `förprovet fäller 2018/19 på långvågen och vinden i alla åtta provtimmarna: ${JSON.stringify(f1.map((x) => x.saknas.length))}`);
  k(f2.length === 0, `förprovet släpper en vinter med alla fält: ${JSON.stringify(f2)}`);
  k(JSON.stringify(provtimmar("2022-10-31", "2023-03-31")) === JSON.stringify([["2022-10-31", 0], ["2022-11-01", 0], ["2022-12-01", 0], ["2023-01-01", 0], ["2023-02-01", 0], ["2023-03-01", 0], ["2023-03-31", 0], ["2023-03-31", 23]]),
    `provtimmarna: ${JSON.stringify(provtimmar("2022-10-31", "2023-03-31"))}`);
  k(saknadeFalt(dds(FALT.map(([f]) => f)).replace("[y = 2321]", "[y = 2320]")).length === 1, "ett fält på ett annat rutnät räknas som saknat");
  const dl = delar("2022-10-31", "2023-03-31", 15);
  k(dl.length === 11 && dl[0].fran === "2022-10-31" && dl[0].till === "2022-11-14" && dl[10].till === "2023-03-31", `delarna: ${JSON.stringify(dl)}`);
  anrop = 0; console.log = () => {};
  let s: Awaited<ReturnType<typeof hamtaVinter>> | null = null, e1 = "";
  try { s = await hamtaVinter(join(d, "rutor.csv"), join(d, "stations.csv"), ut, "2022-12-31", "2023-01-01", fejk, 0, 0); } catch (e) { e1 = (e as Error).message; } finally { console.log = logg; }
  k(!!s && !e1, `hämtningen mot den fejkade källan går igenom: ${e1}`);
  if (s) {
    k(s.dygn === 2 && s.timmar_hamtade === 47 && s.timmar_saknade === 1 && s.stationer === 2 && anrop === 48, `två dygn, 47 timmar, en saknad, 48 anrop: ${JSON.stringify({ ...s, fil: undefined })} (${anrop} anrop)`);
    const rader = gunzipSync(readFileSync(s.fil)).toString().trim().split("\n");
    k(rader[0] === "station_id,tid_utc,t2m_c,rh2m,vind10_ms,moln,nederbord_mm,langvag_jm2,kortvag_jm2" && rader.length === 1 + 47 * 2,
      `slutfilen: analysfilens rubrik och 94 rader: ${rader[0]} (${rader.length})`);
    k(rader[1] === "1001,2022-12-31T00:00:00Z,0.00,3600,3600,3600,3600,3600,3600" && rader.some((x) => x.startsWith("1003,2023-01-01T23:00:00Z,23.11,")),
      `stationerna i sina rutor (1001 i rutans första cell, 1003 i cell 11 = rad 2, kolumn 3), luften i °C: ${rader[1]}`);
    k(!rader.some((x) => x.startsWith("1002,")), "en station utanför indatan läses inte");
    anrop = 0; console.log = () => {};
    const s2 = await hamtaVinter(join(d, "rutor.csv"), join(d, "stations.csv"), ut, "2022-12-31", "2023-01-01", fejk, 0, 0).finally(() => { console.log = logg; });
    k(s2.timmar_hamtade === 0 && s2.dygn === 2 && anrop === 0, `återupptagningen hoppar över klara dygn: ${s2.timmar_hamtade} timmar, ${anrop} anrop`);
  }
  writeFileSync(join(d, "stations2.csv"), "sid,lon,lat\n1001,15,60\n9999,17,62\n");
  let e2 = ""; console.log = () => {};
  try { await hamtaVinter(join(d, "rutor.csv"), join(d, "stations2.csv"), join(d, "ut2"), "2022-12-31", "2022-12-31", fejk, 0, 0); } catch (e) { e2 = (e as Error).message; } finally { console.log = logg; }
  k(e2.includes("saknar ruta"), `en station i indatan utan ruta fäller hämtningen: ${e2}`);
  if (fel) process.exit(1);
  console.log("✓ självtest: förprovet (fälten och rutnätet, 2018/19 fälls), delarna, hämtningen i kuvösens rutor och analysform, en saknad timme, återupptagningen och en station utan ruta");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  const arg = process.argv.slice(2);
  const v = (n: string) => { const i = arg.indexOf(n); return i >= 0 && arg[i + 1] ? arg[i + 1] : ""; };
  if (arg.includes("--sjalvtest")) await sjalvtest();
  else if (arg[0] === "--forprov" && arg[1] && arg[2]) {
    const fel = await forprov(arg[1], arg[2]);
    if (fel.length) {
      const falt = [...new Set(fel.flatMap((x) => x.saknas))];
      console.error(`::error::MET Nordics arkiv saknar ${falt.join(", ")} i ${fel.length} av ${provtimmar(arg[1], arg[2]).length} provtimmar ${arg[1]}–${arg[2]}. ` +
        "Kandidaten räknas med de sju fälten (förregistreringen §2), så vintern kan inte räknas som förregistrerad — frågan går till Bengt.");
      process.exit(1);
    }
  } else if (arg[0] === "--delar" && arg[1] && arg[2] && arg[3]) console.log(JSON.stringify(delar(arg[1], arg[2], Number(arg[3]))));
  else if (arg[0] === "--hamta" && arg[1] && arg[2] && arg[3] && v("--rutor") && v("--stationer")) await hamtaVinter(v("--rutor"), v("--stationer"), arg[1], arg[2], arg[3]);
  else { console.error("kör: metnordic_vinter.ts --forprov <fran> <till> | --delar <fran> <till> <n> | --hamta <ut> <fran> <till> --rutor <fil> --stationer <fil> | --sjalvtest"); process.exit(2); }
}
