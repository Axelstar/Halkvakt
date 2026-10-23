// MET NORDICS ANALYS FÖR DEN NYA KANDIDATEN (förregistreringen NY-KANDIDAT-2027-28 §1 och §2, DECISIONS #670): samma rutor, samma
// arkiv och samma analysfil som fysik/vintrar/metnordic_vinter.ts, men utan långvågen och med vinden ur x och y där MET saknar
// vindhastigheten. Långvågen räknas alla år och alla timmar ur fysikens reserv i kedjan (fysik/ny_kandidat/kedjan.py), så den hämtas
// aldrig: kolumnen langvag_jm2 står kvar i rubriken (kedjans läsare, fysik/niva2/metnordic.py, läser kolumnerna vid namn) men är tom.
//
// Vinden per vinter (VIND): 2018/19 har x_wind_10m och y_wind_10m i stället för wind_speed_10m (DDS läst 22/10, #670), så där är
// vind10_ms = √(x² + y²) — hastigheten är densamma i rutnätets och jordens axlar. De andra vintrarna läser wind_speed_10m som förut.
// Förprovet (provtimmarna ur metnordic_vinter.ts) kräver vinterns fält på rutnätet 2321 × 1796, och för 2018/19 dessutom att
// wind_speed_10m verkligen saknas — finns den, stämmer inte förregistreringens premiss och frågan går till Bengt.
// Filerna: dagar/<dag>.csv.gz (återupptagbart, ett dygn helt eller inte alls) och metnordic_reserv_<fran>_<till>.csv.gz med
// analysfilens rubrik. Bara öppna data (MET Norway, NLOD / CC BY 4.0) — inga Trafikverksdata.
//
// Kör:      node --experimental-strip-types fysik/ny_kandidat/metnordic_reserv.ts --forprov <vinter>
//           node --experimental-strip-types fysik/ny_kandidat/metnordic_reserv.ts --delar <vinter> <dygn per del>
//           node --experimental-strip-types fysik/ny_kandidat/metnordic_reserv.ts --valj <vinter> <mapp>      delarnas filer i mappen
//           node --experimental-strip-types fysik/ny_kandidat/metnordic_reserv.ts --hamta <utmapp> <fran> <till> --vinter <vinter>
//                --rutor <metnordic_stationer.csv> --stationer <stations.csv>
// Självtest: node --experimental-strip-types fysik/ny_kandidat/metnordic_reserv.ts --sjalvtest        (i ci.yml)
// Källa: MET Norway, MET Nordic (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpparchive/catalog.html
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FALT, varde, dagar } from "../../kuvos/metnordic-prognos.ts";
import { rutorUrFil, rutan, hamtaTolkat, avkortade, dapSvar, type Hamtare } from "../../ingest/metnordic-live.ts";
import { filnamnArkiv, RUBRIK_ANALYS } from "../../ingest/metnordic-historik.ts";
import { RUTNAT, provtimmar, delar } from "../vintrar/metnordic_vinter.ts";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
export const LANGVAG = "integral_of_surface_downwelling_longwave_flux_in_air_wrt_time";
export const VIND: Record<string, "fart" | "xy"> = { "2018-19": "xy", "2019-20": "fart", "2020-21": "fart", "2021-22": "fart", "2022-23": "fart" };
const KOL = new Map(FALT.map(([f, k]) => [f, k]));
/** Analysfilens kolumner efter station_id och tid_utc, i rubrikens ordning. */
export const KOLUMNER = RUBRIK_ANALYS.split(",").slice(2);

/** Fälten som hämtas: allt utom långvågen, och vinden som hastighet eller som x och y. */
export function faltFor(lage: "fart" | "xy"): string[] {
  const bas = FALT.map(([f]) => f).filter((f) => f !== LANGVAG && f !== "wind_speed_10m");
  return lage === "xy" ? [...bas, "x_wind_10m", "y_wind_10m"] : [...bas, "wind_speed_10m"];
}

export function vinterns(vinter: string) {
  const lage = VIND[vinter];
  if (!lage) throw new Error(`vintern ${vinter}: väntat en av ${Object.keys(VIND).join(", ")}`);
  const a = Number(vinter.slice(0, 4));
  return { lage, fran: `${a}-10-31`, till: `${a + 1}-03-31` };
}

/** Vindhastigheten ur komponenterna; saknat (NaN, källans fyllnadsvärde) blir NaN och skrivs tomt, aldrig noll. */
export function hastighet(x: number, y: number): number {
  const ok = (v: number) => Number.isFinite(v) && Math.abs(v) < 1e20;
  return ok(x) && ok(y) ? Math.hypot(x, y) : NaN;
}

/** Som metnordic_vinter.ts hämtare: 404 är en timme som saknas i arkivet (tomt svar), annat fel hämtas om fyra gånger. */
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

const finns = (dds: string, f: string, rutnat: number[]) => dds.includes(`Float32 ${f}[time = 1][y = ${rutnat[0]}][x = ${rutnat[1]}];`);

/** Förprovet för en vinter: vinterns fält på rutnätet i varje provtimme; för x/y-vintern också att vindhastigheten saknas. */
export async function forprov(vinter: string, h: Hamtare = hamta, rutnat = RUTNAT) {
  const { lage, fran, till } = vinterns(vinter);
  const fel: { fil: string; saknas: string[] }[] = [];
  let medLangvag = 0;
  for (const [dag, t] of provtimmar(fran, till)) {
    const url = filnamnArkiv(dag, t).replace(/\.dods$/u, ".dds");
    const { buf } = await h(url);
    const fil = url.split("/").pop()!;
    if (!buf.length) { fel.push({ fil, saknas: ["(filen saknas i arkivet)"] }); continue; }
    const dds = new TextDecoder().decode(buf);
    const s = faltFor(lage).filter((f) => !finns(dds, f, rutnat));
    if (lage === "xy" && finns(dds, "wind_speed_10m", rutnat)) s.push("(wind_speed_10m finns — förregistreringens premiss för x/y stämmer inte)");
    if (finns(dds, LANGVAG, rutnat)) medLangvag++;
    console.log(`${fil}: ${s.length ? "FEL " + s.join(", ") : `vinterns ${faltFor(lage).length} fält på rutnätet ${rutnat.join(" × ")} (vinden ${lage === "xy" ? "ur x och y" : "som hastighet"})`}`);
    if (s.length) fel.push({ fil, saknas: s });
  }
  console.log(`långvågen finns i ${medLangvag} av ${provtimmar(fran, till).length} provtimmar — den hämtas inte (fysikens reserv, §1)`);
  return { fel, lage, medLangvag };
}

/** Ett dygns rader i analysfilens form: 24 timmar, varje station i sin ruta; långvågen tom, vinden enligt läget. */
export async function dygnReserv(dag: string, r: { id: string; y: number; x: number }[], box: ReturnType<typeof rutan>, lage: "fart" | "xy",
  h: Hamtare, paus: number) {
  const falt = faltFor(lage);
  const urval = falt.map((f) => `${f}.${f}${encodeURIComponent(`[0:0][${box.y0}:${box.y1}][${box.x0}:${box.x1}]`)}`).join(",");
  const rader: string[] = []; let saknade = 0, byte = 0, ms = 0;
  for (let t = 0; t < 24; t++) {
    const svar = await hamtaTolkat(`${filnamnArkiv(dag, t)}?${urval}`, `${dag} ${t}Z`, h, paus);
    if (!svar) { saknade++; console.log(`  saknas i arkivet: ${dag} ${String(t).padStart(2, "0")}Z`); continue; }
    byte += svar.byte; ms += svar.ms;
    const fm = new Map(svar.falt.map((f) => [f.namn, f]));
    for (const f of falt) {
      const x = fm.get(f); if (!x) throw new Error(`${dag} ${t}Z: fältet ${f} saknas i svaret`);
      if (x.dims.join() !== `1,${box.by},${box.bx}`) throw new Error(`${dag} ${t}Z: ${f} har ${x.dims} — rutnätet har ändrats`);
    }
    const tid = `${dag}T${String(t).padStart(2, "0")}:00:00Z`;
    for (const p of r) {
      const i = (p.y - box.y0) * box.bx + (p.x - box.x0);
      const v = (f: string) => fm.get(f)!.data[i];
      const kol: Record<string, string> = { langvag_jm2: "" };
      for (const f of falt) if (KOL.has(f)) kol[KOL.get(f)!] = varde(KOL.get(f)!, v(f));
      if (lage === "xy") kol.vind10_ms = varde("vind10_ms", hastighet(v("x_wind_10m"), v("y_wind_10m")));
      rader.push(`${p.id},${tid},${KOLUMNER.map((k) => { if (!(k in kol)) throw new Error(`kolumnen ${k} saknar fält`); return kol[k]; }).join(",")}`);
    }
  }
  return { rader, saknade, byte, ms };
}

export async function hamtaVinter(rutorFil: string, stationerFil: string, ut: string, fran: string, till: string, vinter: string,
  h: Hamtare = hamta, paus = 5000, minuter = Number(process.env.MNV_MINUTER || 0)) {
  const { lage } = vinterns(vinter);
  mkdirSync(join(ut, "dagar"), { recursive: true });
  const sids = new Set(readFileSync(stationerFil, "utf8").trim().split("\n").slice(1).map((x) => x.split(",")[0].trim()));
  const alla = rutorUrFil(rutorFil).rutor;
  const r = alla.filter((x) => sids.has(x.id));
  const utan = [...sids].filter((s) => !alla.some((x) => x.id === s));
  if (utan.length) throw new Error(`${utan.length} av indatans stationer saknar ruta i ${rutorFil}: ${utan.slice(0, 5).join(", ")} …`);
  const box = rutan(r);
  console.log(`${r.length} stationer (av ${alla.length} rutor i filen); ruta y ${box.y0}–${box.y1}, x ${box.x0}–${box.x1} (${box.by}×${box.bx}); ${fran}–${till}; vinden ${lage === "xy" ? "ur x och y" : "som hastighet"}, ingen långvåg`);
  const slutTid = minuter ? Date.now() + minuter * 60_000 : Infinity;
  let hamtade = 0, saknade = 0, byte = 0, ms = 0;
  for (const dag of dagar(fran, till)) {
    const fil = join(ut, "dagar", `${dag}.csv.gz`);
    if (existsSync(fil)) continue;                                       // återupptagen körning: dygnet finns
    if (Date.now() > slutTid) { console.log(`tidsbudgeten slut före ${dag}: de klara dygnen sparas, nästa körning tar vid där`); process.exit(3); }
    const d = await dygnReserv(dag, r, box, lage, h, paus);
    saknade += d.saknade; byte += d.byte; ms += d.ms; hamtade += 24 - d.saknade;
    const tmp = fil + ".tmp"; writeFileSync(tmp, gzipSync(d.rader.join("\n") + (d.rader.length ? "\n" : ""))); renameSync(tmp, fil);
    console.log(`${dag}: ${24 - d.saknade} timmar, ${d.rader.length} rader, ${(d.byte / 1e6).toFixed(0)} MB på ${(d.ms / 1000).toFixed(0)} s`);
  }
  const slut = join(ut, `metnordic_reserv_${fran}_${till}.csv.gz`);
  const filer = readdirSync(join(ut, "dagar")).filter((f) => f.endsWith(".csv.gz") && f.slice(0, 10) >= fran && f.slice(0, 10) <= till).sort();
  writeFileSync(slut, gzipSync(Buffer.concat([Buffer.from(RUBRIK_ANALYS + "\n"), ...filer.map((f) => gunzipSync(readFileSync(join(ut, "dagar", f))))])));
  const s = { fran, till, vinter, vind: lage, langvag: "hämtas inte (fysikens reserv)", dygn: filer.length, timmar_hamtade: hamtade,
    timmar_saknade: saknade, stationer: r.length, byte_mb: Math.round(byte / 1e6), sekunder: Math.round(ms / 1000), avkortade_svar: avkortade, fil: slut };
  writeFileSync(join(ut, `sammanfattning_${fran}_${till}.json`), JSON.stringify(s, null, 1));
  console.log(`klart: ${hamtade} timmar hämtade i den här körningen, ${saknade} saknade i arkivet, ${s.byte_mb} MB på ${s.sekunder} s → ${slut}`);
  return s;
}

/** Delarnas filer i en mapp (en release): metnordic_reserv_<del> för varje del, eller för en vinter med vindhastigheten den frysta
 *  kedjans metnordic_analys_<del> (kuvos-vintrar.yml, samma rutor och samma sex fält; långvågen töms vid läsningen). Saknas en del
 *  kastas ett fel. */
export function valjDelar(vinter: string, filer: string[], n = 15) {
  const { lage, fran, till } = vinterns(vinter);
  const har = new Set(filer);
  return delar(fran, till, n).map((d) => {
    const egen = `metnordic_reserv_${d.fran}_${d.till}.csv.gz`, frysta = `metnordic_analys_${d.fran}_${d.till}.csv.gz`;
    if (har.has(egen)) return egen;
    if (lage === "fart" && har.has(frysta)) return frysta;
    throw new Error(`delen ${d.fran}–${d.till} saknas (${egen}${lage === "fart" ? ` eller ${frysta}` : ""})`);
  });
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const d = mkdtempSync(join(tmpdir(), "mnr-")), ut = join(d, "ut");
  writeFileSync(join(d, "rutor.csv"), "station_id,lat,lon,ruta_y,ruta_x,avstand_km\n1001,60,15,1,1,0.3\n1002,61,16,0,0,0.2\n1003,62,17,3,4,0.4\n");
  writeFileSync(join(d, "stations.csv"), "sid,lon,lat\n1001,15,60\n1003,17,62\n");
  const dds = (falt: string[]) => falt.map((f) => `        Float32 ${f}[time = 1][y = 2321][x = 1796];`).join("\n");
  const alla7 = FALT.map(([f]) => f);
  // Arkivet som 22/10: 2018 utan långvåg och utan vindhastighet men med x och y; 2019–2021 utan långvåg; från 2022 alla.
  let urls: string[] = [];
  const arkiv = (opts: { fartFinns2018?: boolean; fart2019Saknas?: boolean } = {}): Hamtare => async (u) => {
    urls.push(u);
    const ar = Number(/metpparchive\/(\d{4})\//u.exec(u)![1]);
    if (u.endsWith(".dds")) {
      let f = alla7.filter((x) => ar >= 2022 || x !== LANGVAG);
      if (ar === 2018 || (ar === 2019 && /\/2019\/0[1-3]\//u.test(u))) f = f.filter((x) => opts.fartFinns2018 || x !== "wind_speed_10m").concat(["x_wind_10m", "y_wind_10m"]);
      if (ar === 2019 && opts.fart2019Saknas) f = f.filter((x) => x !== "wind_speed_10m");
      return { buf: new TextEncoder().encode(dds(f)), ms: 1 };
    }
    if (u.includes("20230101T05Z")) return { buf: new Uint8Array(0), ms: 1 };                       // saknas i arkivet
    const t = Number(/T(\d{2})Z/u.exec(u)![1]);
    const begarda = decodeURIComponent(u.split("?")[1]).split(",").map((x) => x.split(".")[0]);
    return { buf: dapSvar(begarda.map((f) => ({ namn: f, dims: [1, 3, 4], data: Array.from({ length: 12 }, (_, i) =>
      f === "air_temperature_2m" ? 273.15 + t + i * 0.01 : f === "x_wind_10m" ? 3 : f === "y_wind_10m" ? -4 : f === "wind_speed_10m" ? 2.5 : 3600) }))), ms: 2 };
  };
  const logg = console.log; const tyst = async <T,>(f: () => Promise<T>) => { console.log = () => {}; try { return await f(); } finally { console.log = logg; } };
  k(JSON.stringify(faltFor("xy")) === JSON.stringify(["air_temperature_2m", "relative_humidity_2m", "cloud_area_fraction", "precipitation_amount",
    "integral_of_surface_downwelling_shortwave_flux_in_air_wrt_time", "x_wind_10m", "y_wind_10m"]) && !faltFor("fart").includes(LANGVAG) && faltFor("fart").includes("wind_speed_10m"),
    `fälten: ingen långvåg, vinden som x/y eller hastighet: ${faltFor("xy")} | ${faltFor("fart")}`);
  k(hastighet(3, -4) === 5 && Number.isNaN(hastighet(NaN, 1)) && Number.isNaN(hastighet(1, 9.96921e36)), "hastigheten √(x² + y²), saknat blir NaN");
  const p18 = await tyst(() => forprov("2018-19", arkiv()));
  k(p18.fel.length === 0 && p18.lage === "xy" && p18.medLangvag === 0, `förprovet släpper 2018/19 med x och y och utan långvåg: ${JSON.stringify(p18.fel)}`);
  const p18b = await tyst(() => forprov("2018-19", arkiv({ fartFinns2018: true })));
  k(p18b.fel.length === 8 && p18b.fel.every((x) => x.saknas.some((s) => s.includes("premiss"))), `förprovet fäller 2018/19 om vindhastigheten finns (premissen): ${p18b.fel.length}`);
  const p19 = await tyst(() => forprov("2019-20", arkiv({ fart2019Saknas: true })));
  k(p19.fel.length > 0 && p19.fel.every((x) => x.saknas.includes("wind_speed_10m")), `förprovet fäller en hastighetsvinter utan vindhastighet: ${JSON.stringify(p19.fel.map((x) => x.fil))}`);
  const p22 = await tyst(() => forprov("2022-23", arkiv()));
  k(p22.fel.length === 0 && p22.medLangvag === 8, `förprovet släpper 2022/23 och räknar långvågen utan att kräva den: ${JSON.stringify(p22)}`);
  k(JSON.stringify(vinterns("2020-21")) === JSON.stringify({ lage: "fart", fran: "2020-10-31", till: "2021-03-31" }), "vinterns datum och läge");
  // Hämtningen, x/y-läget: 2018/19:s form på två dygn kring nyår, en timme saknas.
  urls = [];
  const s = await tyst(() => hamtaVinter(join(d, "rutor.csv"), join(d, "stations.csv"), ut, "2022-12-31", "2023-01-01", "2018-19", arkiv(), 0, 0));
  k(s.dygn === 2 && s.timmar_hamtade === 47 && s.timmar_saknade === 1 && s.stationer === 2 && s.vind === "xy" && urls.length === 48,
    `två dygn, 47 timmar, en saknad, 48 anrop: ${JSON.stringify({ ...s, fil: undefined })} (${urls.length})`);
  k(urls.every((u) => !u.includes("longwave") && !u.includes("wind_speed_10m") && u.includes("x_wind_10m") && u.includes("y_wind_10m")),
    "x/y-läget begär aldrig långvågen eller vindhastigheten, alltid x och y");
  const rader = gunzipSync(readFileSync(s.fil)).toString().trim().split("\n");
  k(rader[0] === RUBRIK_ANALYS && rader[0] === "station_id,tid_utc,t2m_c,rh2m,vind10_ms,moln,nederbord_mm,langvag_jm2,kortvag_jm2" && rader.length === 1 + 47 * 2,
    `slutfilen: analysfilens rubrik och 94 rader: ${rader[0]} (${rader.length})`);
  k(rader[1] === "1001,2022-12-31T00:00:00Z,0.00,3600,5,3600,3600,,3600", `vinden √(3² + 4²) = 5 och långvågen tom: ${rader[1]}`);
  k(rader.some((x) => x.startsWith("1003,2023-01-01T23:00:00Z,23.11,")) && !rader.some((x) => x.startsWith("1002,")), "stationerna i sina rutor, bara indatans");
  k(rader.slice(1).every((x) => x.split(",")[7] === "" && x.split(",").length === 9), "långvågen tom på varje rad");
  // Hastighetsläget: vindhastigheten rakt av, fortfarande ingen långvåg.
  urls = [];
  const s2 = await tyst(() => hamtaVinter(join(d, "rutor.csv"), join(d, "stations.csv"), join(d, "ut2"), "2022-12-31", "2022-12-31", "2022-23", arkiv(), 0, 0));
  const r2 = gunzipSync(readFileSync(s2.fil)).toString().trim().split("\n");
  k(r2[1] === "1001,2022-12-31T00:00:00Z,0.00,3600,2.5,3600,3600,,3600" && urls.every((u) => !u.includes("longwave") && u.includes("wind_speed_10m") && !u.includes("x_wind")),
    `hastighetsläget: vind10_ms ur wind_speed_10m, ingen långvåg begärd: ${r2[1]}`);
  urls = [];
  const s3 = await tyst(() => hamtaVinter(join(d, "rutor.csv"), join(d, "stations.csv"), ut, "2022-12-31", "2023-01-01", "2018-19", arkiv(), 0, 0));
  k(s3.timmar_hamtade === 0 && s3.dygn === 2 && urls.length === 0, `återupptagningen hoppar över klara dygn: ${s3.timmar_hamtade} timmar, ${urls.length} anrop`);
  // Delarnas filer: egna före den frysta kedjans; den frysta kedjans bara för en hastighetsvinter; en saknad del fäller.
  const dl = delar("2022-10-31", "2023-03-31", 15);
  const egna = dl.map((x) => `metnordic_reserv_${x.fran}_${x.till}.csv.gz`), frysta = dl.map((x) => `metnordic_analys_${x.fran}_${x.till}.csv.gz`);
  k(JSON.stringify(valjDelar("2022-23", [...frysta.slice(0, 3), ...egna.slice(3), egna[0]])) === JSON.stringify([egna[0], ...frysta.slice(1, 3), ...egna.slice(3)]),
    "delarna: egen fil före den frysta kedjans, den frysta kedjans där den egna saknas");
  let e1 = ""; try { valjDelar("2018-19", delar("2018-10-31", "2019-03-31", 15).map((x) => `metnordic_analys_${x.fran}_${x.till}.csv.gz`)); } catch (e) { e1 = (e as Error).message; }
  k(e1.includes("saknas"), `2018/19 tar aldrig den frysta kedjans filer (de har ingen vind): ${e1}`);
  let e2 = ""; try { valjDelar("2020-21", []); } catch (e) { e2 = (e as Error).message; }
  k(e2.includes("saknas"), "en saknad del fäller");
  let e3 = ""; try { vinterns("2024-25"); } catch (e) { e3 = (e as Error).message; }
  k(e3.includes("väntat"), "2024/25 hämtas inte här (kuvösens release)");
  if (fel) process.exit(1);
  console.log("✓ självtest: fälten utan långvåg, vinden ur x och y (√(x² + y²)) och som hastighet, förprovet (premissen för 2018/19, en saknad vindhastighet), hämtningen i analysfilens form med tom långvåg, återupptagningen och delarnas filer");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  const arg = process.argv.slice(2);
  const v = (n: string) => { const i = arg.indexOf(n); return i >= 0 && arg[i + 1] ? arg[i + 1] : ""; };
  if (arg.includes("--sjalvtest")) await sjalvtest();
  else if (arg[0] === "--forprov" && arg[1]) {
    const p = await forprov(arg[1]);
    if (p.fel.length) {
      console.error(`::error::förprovet för ${arg[1]} föll i ${p.fel.length} provtimmar: ${[...new Set(p.fel.flatMap((x) => x.saknas))].join(", ")}. ` +
        "Vintern kan inte hämtas som förregistreringen NY-KANDIDAT-2027-28 säger — frågan går till Bengt.");
      process.exit(1);
    }
  } else if (arg[0] === "--delar" && arg[1] && arg[2]) { const { fran, till } = vinterns(arg[1]); console.log(JSON.stringify(delar(fran, till, Number(arg[2])))); }
  else if (arg[0] === "--valj" && arg[1] && arg[2]) console.log(valjDelar(arg[1], readdirSync(arg[2])).map((f) => join(arg[2], f)).join("\n"));
  else if (arg[0] === "--hamta" && arg[1] && arg[2] && arg[3] && v("--vinter") && v("--rutor") && v("--stationer"))
    await hamtaVinter(v("--rutor"), v("--stationer"), arg[1], arg[2], arg[3], v("--vinter"));
  else { console.error("kör: metnordic_reserv.ts --forprov <vinter> | --delar <vinter> <n> | --valj <vinter> <mapp> | --hamta <ut> <fran> <till> --vinter <v> --rutor <fil> --stationer <fil> | --sjalvtest"); process.exit(2); }
}
