// MET NORDIC — HISTORIEN FÖR UPPSTARTEN, steg 2 på kort #343 (DECISIONS #556; Bengt 14/10: "börja med steg 2"). Kedjans längsta
// fönster är 45 dygn (tdeep, prognos.py FONSTER = 24 · 45), så innan den kan räkna levande behöver varje punkt 45 dygns timvis analys
// bakåt. Den hämtas EN gång ur MET Norways arkiv metpparchive, i rutan över stationerna och väglagspunkterna, i samma form som kuvösens
// analysfil (station_id,tid_utc + de sju fälten; strålningen är timvärden rakt av), till den öppna releasen metnordic-live-2026-27.
// Samma DAP-tolkning som kuvösen, samma rutsökning, en förbindelse åt gången; avkortade svar hämtas om och räknas (metnordic-live.ts).
//
// Delar om nio dygn, var och en återupptagbar: ett dygn är antingen helt skrivet (dagar/<dag>.csv.gz) eller inte alls, och en körning
// som nås av tidsbudgeten (MNH_MINUTER) stannar mellan två dygn med kod 3 så att artefakten hinner sparas; nästa körning tar vid där.
// En timme som saknas i arkivet (404) hoppas över och räknas — förväntan är noll, och kedjans timindex kräver hela dygn.
//
// Kör:      node --experimental-strip-types ingest/metnordic-historik.ts --hamta <utmapp> <fran-dag> <till-dag> [--rot <repo>]
// Självtest: node --experimental-strip-types ingest/metnordic-historik.ts --sjalvtest        (i ci.yml)
// Källa: MET Norway, MET Nordic (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpparchive/catalog.html
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { join } from "node:path";
import { FALT, tolkaDods, varde, dagar, type Falt, type Ruta } from "../kuvos/metnordic-prognos.ts";
import { narmasteRuta, laddaPunkter, rutan, hamtaTolkat, avkortade, dapSvar, type Hamtare, type Punkt } from "./metnordic-live.ts";

const UA = "Halkvakt-live/0.1 (+https://github.com/Axelstar/Halkvakt)";
const BAS = "https://thredds.met.no/thredds/dodsC/metpparchive";
/** Analysfilens rubrik, som kuvösens release kuvos-metnordic-2024-25 (fysik/niva2/metnordic.py läser den). */
export const RUBRIK_ANALYS = `station_id,tid_utc,${FALT.map(([, k]) => k).join(",")}`;

export function filnamnArkiv(dag: string, timme: number) {
  const [y, m, d] = dag.split("-");
  return `${BAS}/${y}/${m}/${d}/met_analysis_1_0km_nordic_${y}${m}${d}T${String(timme).padStart(2, "0")}Z.nc.dods`;
}

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

/** Punkternas rutor ur ett arkivdygns lat och lon (fasta fält i varje fil), och rutan över dem. */
export async function rutor(punkter: Punkt[], dag: string, h: Hamtare, paus: number) {
  const fil = filnamnArkiv(dag, 12);
  const la = (await hamtaTolkat(`${fil}?latitude.latitude`, "latitude", h, paus)).falt[0];
  const lo = (await hamtaTolkat(`${fil}?longitude.longitude`, "longitude", h, paus)).falt[0];
  const [ny, nx] = la.dims;
  const r: (Ruta & { km: number })[] = punkter.map((p) => ({ id: p.id, ...narmasteRuta(p.lat, p.lon, la.data, lo.data, ny, nx) }));
  return { rutor: r, box: rutan(r), ny, nx };
}

/** Ett dygns rader: 24 timmar, varje punkt, analysens värden rakt av; timmar som saknas i arkivet räknas. */
export async function dygn(dag: string, r: (Ruta & { km: number })[], box: ReturnType<typeof rutan>, h: Hamtare, paus: number) {
  const rader: string[] = []; let saknade = 0, byte = 0, ms = 0;
  const urval = FALT.map(([f]) => `${f}.${f}${encodeURIComponent(`[0:0][${box.y0}:${box.y1}][${box.x0}:${box.x1}]`)}`).join(",");
  for (let t = 0; t < 24; t++) {
    const svar = await hamtaTolkat(`${filnamnArkiv(dag, t)}?${urval}`, `${dag} ${t}Z`, h, paus);
    if (!svar) { saknade++; console.log(`  saknas i arkivet: ${dag} ${String(t).padStart(2, "0")}Z`); continue; }
    const { falt, byte: b, ms: m } = svar;
    byte += b; ms += m;
    const fm = new Map(falt.map((f) => [f.namn, f]));
    for (const [f] of FALT) {
      const x = fm.get(f); if (!x) throw new Error(`${dag} ${t}Z: fältet ${f} saknas i svaret`);
      if (x.dims.join() !== `1,${box.by},${box.bx}`) throw new Error(`${dag} ${t}Z: ${f} har ${x.dims} — rutnätet har ändrats`);
    }
    const tid = `${dag}T${String(t).padStart(2, "0")}:00:00Z`;
    for (const p of r) rader.push(`${p.id},${tid},${FALT.map(([f, kol]) => varde(kol, fm.get(f)!.data[(p.y - box.y0) * box.bx + (p.x - box.x0)])).join(",")}`);
  }
  return { rader, saknade, byte, ms };
}

export async function hamtaHistorik(rot: string, ut: string, fran: string, till: string, h: Hamtare = hamta, paus = 5000, minuter = Number(process.env.MNH_MINUTER || 0)) {
  mkdirSync(join(ut, "dagar"), { recursive: true });
  const punkter = laddaPunkter(rot);
  const { rutor: r, box, ny, nx } = await rutor(punkter, fran, h, paus);
  const maxKm = Math.max(...r.map((x) => x.km));
  console.log(`rutnätet ${ny}×${nx}; ${punkter.length} punkter; ruta y ${box.y0}–${box.y1}, x ${box.x0}–${box.x1} (${box.by}×${box.bx}); längst från rutmitten ${maxKm.toFixed(2)} km; ${fran}–${till}`);
  writeFileSync(join(ut, "metnordic_punkter.csv"), "station_id,lat,lon,ruta_y,ruta_x,avstand_km\n" +
    punkter.map((p, i) => `${p.id},${p.lat},${p.lon},${r[i].y},${r[i].x},${r[i].km.toFixed(2)}`).join("\n") + "\n");
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
  const delar = readdirSync(join(ut, "dagar")).filter((f) => f.endsWith(".csv.gz") && f.slice(0, 10) >= fran && f.slice(0, 10) <= till).sort();
  writeFileSync(slut, gzipSync(Buffer.concat([Buffer.from(RUBRIK_ANALYS + "\n"), ...delar.map((f) => gunzipSync(readFileSync(join(ut, "dagar", f))))])));
  const s = { fran, till, dygn: delar.length, timmar_hamtade: hamtade, timmar_saknade: saknade, punkter: punkter.length, max_km: Number(maxKm.toFixed(2)),
    byte_mb: Math.round(byte / 1e6), sekunder: Math.round(ms / 1000), avkortade_svar: avkortade, fil: slut };
  writeFileSync(join(ut, `sammanfattning_${fran}_${till}.json`), JSON.stringify(s, null, 1));
  console.log(`klart: ${hamtade} timmar hämtade i den här körningen, ${saknade} saknade i arkivet, ${s.byte_mb} MB på ${s.sekunder} s, ${avkortade} avkortade svar → ${slut}`);
  return s;
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const { mkdtempSync } = await import("node:fs"), { tmpdir } = await import("node:os");
  // Ett rutnät 4×5, en station i (1,1) och en vägpunkt i (3,4) ⇒ rutan 3 hög och 4 bred, så att höjd och bredd inte kan förväxlas;
  // luften stiger 0,01 ° per cell i rutan. Två dygn, där 2026-09-01 saknar timmen 05Z. Fejken räknar anropen.
  const gy = 4, gx = 5, gla: number[] = [], glo: number[] = [];
  for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) { gla.push(60 + y * 0.01 + x * 0.001); glo.push(15 + x * 0.02); }
  const rot = mkdtempSync(join(tmpdir(), "mnh-")), ut = join(rot, "ut");
  mkdirSync(join(rot, "data/vagdata"), { recursive: true });
  writeFileSync(join(rot, "data/vagdata/stationer.json"), JSON.stringify({ rader: [{ id: 1001, lat: gla[1 * gx + 1], lon: glo[1 * gx + 1] }] }));
  writeFileSync(join(rot, "data/vagdata/vaglagspunkter.json"), JSON.stringify({ rader: [{ lat: gla[3 * gx + 4], lon: glo[3 * gx + 4] }] }));
  let anrop = 0;
  const fejk: Hamtare = async (u) => {
    anrop++;
    if (u.includes("?latitude.")) return { buf: dapSvar([{ namn: "latitude", dims: [gy, gx], data: gla }]), ms: 1 };
    if (u.includes("?longitude.")) return { buf: dapSvar([{ namn: "longitude", dims: [gy, gx], data: glo }]), ms: 1 };
    if (u.includes("20260901T05Z")) return { buf: new Uint8Array(0), ms: 1 };                       // saknas i arkivet
    const t = Number(/T(\d{2})Z/u.exec(u)![1]);
    return { buf: dapSvar(FALT.map(([f]) => ({ namn: f, dims: [1, 3, 4], data: Array.from({ length: 12 }, (_, i) => f === "air_temperature_2m" ? 273.15 + t + i * 0.01 : 1_000_000) }))), ms: 2 };
  };
  const logg = console.log; console.log = () => {};
  let s: Awaited<ReturnType<typeof hamtaHistorik>> | null = null, e1 = "";
  try { s = await hamtaHistorik(rot, ut, "2026-08-31", "2026-09-01", fejk, 0, 0); } catch (e) { e1 = (e as Error).message; } finally { console.log = logg; }
  k(!!s && !e1, `historiken mot den fejkade källan går igenom: ${e1}`);
  if (s) {
    k(s.dygn === 2 && s.timmar_hamtade === 47 && s.timmar_saknade === 1 && s.punkter === 2 && s.avkortade_svar === 0 && anrop === 2 + 48, `två dygn, 47 timmar, en saknad, 50 anrop: ${JSON.stringify({ ...s, fil: undefined })} (${anrop} anrop)`);
    const text = gunzipSync(readFileSync(s.fil)).toString();
    const rader = text.trim().split("\n");
    // Rubriken är kedjans kontrakt (fysik/niva2/metnordic.py läser kolumnerna vid namn) och jämförs med sin ordalydelse.
    k(rader[0] === "station_id,tid_utc,t2m_c,rh2m,vind10_ms,moln,nederbord_mm,langvag_jm2,kortvag_jm2" && rader.length === 1 + 47 * 2
      && rader[1] === "1001,2026-08-31T00:00:00Z,0.00,1000000,1000000,1000000,1000000,1000000,1000000",
      `slutfilen: rubriken, 94 rader, stationen i rutans första cell, strålningen rakt av: ${rader[0]} | ${rader[1]}`);
    k(rader.some((x) => x.startsWith("v00000,2026-09-01T23:00:00Z,23.11,")), "vägpunkten med v + sid i rutans sista cell (rad 2, kolumn 3 i 3×4 ⇒ cell 11), sista timmen, luften i °C");
    k(existsSync(join(ut, "metnordic_punkter.csv")) && readFileSync(join(ut, "metnordic_punkter.csv"), "utf8").split("\n")[1].startsWith("1001,"), "punktfilen skrivs");
    // Återupptagningen: en andra körning hämtar ingenting (båda dygnen finns) men skriver slutfilen igen.
    anrop = 0; console.log = () => {};
    const s2 = await hamtaHistorik(rot, ut, "2026-08-31", "2026-09-01", fejk, 0, 0).finally(() => { console.log = logg; });
    k(s2.timmar_hamtade === 0 && s2.dygn === 2 && anrop === 2, `återupptagningen hoppar över klara dygn: ${s2.timmar_hamtade} timmar, ${anrop} anrop`);
  }
  k(filnamnArkiv("2026-08-30", 5).endsWith("/2026/08/30/met_analysis_1_0km_nordic_20260830T05Z.nc.dods"), "arkivets filnamn");
  if (fel) process.exit(1);
  console.log("✓ självtest: historiken mot en fejkad källa — rutorna, två dygn med en saknad timme, slutfilen i analysfilens form, punktfilen, och återupptagningen");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  const arg = process.argv.slice(2);
  const v = (n: string, d: string) => { const i = arg.indexOf(n); return i >= 0 && arg[i + 1] ? arg[i + 1] : d; };
  if (arg.includes("--sjalvtest")) await sjalvtest();
  else if (arg[0] === "--hamta" && arg[1] && arg[2] && arg[3]) await hamtaHistorik(v("--rot", "."), arg[1], arg[2], arg[3]);
  else { console.error("kör: metnordic-historik.ts --hamta <utmapp> <fran-dag> <till-dag> [--rot <repo>] | --sjalvtest"); process.exit(2); }
}
