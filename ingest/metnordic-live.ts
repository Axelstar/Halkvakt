// MET NORDIC LEVANDE — steg 1 på kort #343 (DECISIONS #556; Bengt 14/10: "börja med steg 1"): den senaste analysen och den senaste
// prognoskörningen ur MET Norways katalog metpplatest (tre rullande dygn, en analys och en körning VARJE timme, 57 timsteg), i rutan
// över stationerna och väglagspunkterna, i samma form som kuvösens arkivfiler (kuvos/metnordic-prognos.ts: RUBRIK, raderForKorning)
// så att kedjan kan läsa dem oförändrad. Samma DAP-tolkning, samma rutsökning (kuvos/metnordic.ts på grenen kuvos/rutnatet-469,
// ec30eff), en förbindelse åt gången enligt tjänstens villkor.
//
// Första läget är MÄTNINGEN (--mat), förregistrerad under DECISIONS #556: hur färsk katalogen är, hur stort ett anrop är och hur lång
// tid det tar, hur långt punkterna ligger från sin rutmitt, och värdenas spann (VÄRDEVAKTEN) — innan något lagras eller någon kedja
// körs. Raderna skrivs till --ut som en artefakt att läsa, aldrig till repot eller en tabell. Volymen per timme räknas upp till dygn och
// månad, så att körplatsen (val 3 i §4.2) kan väljas på ett tal och inte på en gissning.
//
// Två skillnader mot arkivet, lästa 14/10 06 UTC: körningarna kommer varje timme (arkivet: 00, 06, 12, 18) och bär 57 timsteg (arkivet:
// 30), och prognosfilen har probability_of_snow_phase, som arkivet saknar. Pariteten med kuvösen (steg 4) kräver kuvösens regel för snö
// (nederbörd vid luft ≤ +1 °C), inte det nya fältet.
//
// Kör:      node --experimental-strip-types ingest/metnordic-live.ts --mat [--ut <mapp>] [--rot <repo>]
// Självtest: node --experimental-strip-types ingest/metnordic-live.ts --sjalvtest        (i ci.yml)
// Källa: MET Norway, MET Nordic (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpplatest/catalog.html
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FALT, RUBRIK, PER_ANROP, tolkaDods, raderForKorning, varde, type Falt, type Ruta } from "../kuvos/metnordic-prognos.ts";
import { SPANN } from "../scripts/vardevakten.ts";

const UA = "Halkvakt-live/0.1 (+https://github.com/Axelstar/Halkvakt)";
const KATALOG = "https://thredds.met.no/thredds/catalog/metpplatest/catalog.html";
const BAS = "https://thredds.met.no/thredds/dodsC/metpplatest";
/** Timstegen 0–17 ur en körning: +6 h-klassen är stegen 6–11 (DECISIONS #519), med marginal för en körning som kommer sent. */
export const STEG_LIVE = 18;
/** Punkterna: stationerna med sitt id, väglagspunkterna med "v" + sid (radnumret, som särdragsfilerna; 21 id förekommer två gånger). */
export const PUNKTFILER = ["data/vagdata/stationer.json", "data/vagdata/vaglagspunkter.json"];
/** De sju fältens spann bor i värdevakten (scripts/vardevakten.ts, MET Nordic-blocket, DECISIONS #480), aldrig här: ett värde utanför
 *  räknas och redovisas, det rättas inte. Nederbördens små negativa brus (−0,002 mm, kuvos/metnordic-prognos.ts) ligger under golvet 0. */
export const FALTEN = RUBRIK.split(",").slice(4);

export type Typ = "analysis" | "forecast";
/** Katalogens senaste fil av en typ: stämpeln ur filnamnet, tiden som ISO och hur många filer typen har. Inget annat i sidan tolkas. */
export function senasteIKatalog(html: string, typ: Typ): { stamp: string; iso: string; antal: number } | null {
  const re = new RegExp(`met_${typ}_1_0km_nordic_(\\d{8}T\\d{2}Z)\\.nc`, "g");
  const stamplar = [...new Set([...html.matchAll(re)].map((m) => m[1]))].sort();
  if (!stamplar.length) return null;
  const s = stamplar[stamplar.length - 1];
  return { stamp: s, iso: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:00:00Z`, antal: stamplar.length };
}
export const filnamnLive = (typ: Typ, stamp: string) => `${BAS}/met_${typ}_1_0km_nordic_${stamp}.nc.dods`;

/** Närmaste rutmitt till (lat, lon) i ett krökt rutnät: grovsökning på var tionde ruta, sedan fullständig sökning ±20 rutor runt
 *  grovträffen. Avståndet räknas på planet med cos(lat) — rutorna är 1 km, så felet är försumbart. (kuvos/metnordic.ts, ec30eff) */
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

export type Punkt = { id: string; lat: number; lon: number };
export function laddaPunkter(rot: string): Punkt[] {
  const st = JSON.parse(readFileSync(join(rot, PUNKTFILER[0]), "utf8")).rader as { id: string | number; lat: number; lon: number }[];
  const vp = JSON.parse(readFileSync(join(rot, PUNKTFILER[1]), "utf8")).rader as { lat: number; lon: number }[];
  return [...st.map((s) => ({ id: String(s.id), lat: s.lat, lon: s.lon })),
          ...vp.map((p, i) => ({ id: "v" + String(i).padStart(5, "0"), lat: p.lat, lon: p.lon }))];
}

export function rutan(rutor: Ruta[]) {
  const y0 = Math.min(...rutor.map((r) => r.y)), y1 = Math.max(...rutor.map((r) => r.y));
  const x0 = Math.min(...rutor.map((r) => r.x)), x1 = Math.max(...rutor.map((r) => r.x));
  return { y0, y1, x0, x1, by: y1 - y0 + 1, bx: x1 - x0 + 1 };
}

/** Spannet per kolumn över raderna (kolumnerna efter de fyra första), och hur många värden som saknas eller ligger utanför SPANN. */
export function spannUrRader(rader: string[]) {
  const kol = RUBRIK.split(",").slice(4);
  const ut: Record<string, { min: number; max: number; saknas: number; utanfor: number; n: number }> = {};
  for (const k of kol) ut[k] = { min: Infinity, max: -Infinity, saknas: 0, utanfor: 0, n: 0 };
  for (const rad of rader) {
    const v = rad.split(",").slice(4);
    kol.forEach((k, i) => {
      const s = ut[k]; s.n++;
      if (v[i] === "" || v[i] === undefined) { s.saknas++; return; }
      const x = Number(v[i]);
      if (x < s.min) s.min = x; if (x > s.max) s.max = x;
      const [lo, hi] = SPANN[k]; if (x < lo || x > hi) s.utanfor++;
    });
  }
  return ut;
}

/** Volymen uppräknad: en analys och en körning (STEG_LIVE steg) varje timme. */
export function volym(byteAnalys: number, bytePrognos: number) {
  const perTimme = byteAnalys + bytePrognos;
  return { per_timme_mb: perTimme / 1e6, per_dygn_gb: perTimme * 24 / 1e9, per_manad_gb: perTimme * 24 * 30 / 1e9 };
}

async function hamta(url: string): Promise<{ buf: Uint8Array; ms: number }> {
  for (let forsok = 0; forsok < 4; forsok++) {
    const t = Date.now();
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(180_000) });
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

/** Avkortade svar: ett svar kan komma med 200 men kapat (kuvösen såg det 6/10; mätningen 14/10 06:22 fick 3,75 MB av 26 MB). Då hämtas
 *  det om, högst sex gånger, och varje kapat svar räknas — det är ett av mätningens tal, inte ett fel som döljs. */
export let avkortade = 0;
/** Ett tomt svar är en fil som saknas (404, arkivets hämtare) och ger null; mätningen kräver sina filer (kravs). */
export async function hamtaTolkat(url: string, vad: string, h: (u: string) => Promise<{ buf: Uint8Array; ms: number }> = hamta, paus = 5000) {
  for (let forsok = 0; ; forsok++) {
    const { buf, ms } = await h(url);
    if (!buf.length) return null;
    try { return { falt: tolkaDods(buf), byte: buf.length, ms }; }
    catch (e) {
      avkortade++;
      if (forsok === 5) throw e;
      console.log(`  ${vad}: ${(e as Error).message} — hämtar om`);
      await new Promise((ok) => setTimeout(ok, paus * (forsok + 1)));
    }
  }
}

const kravs = <T,>(x: T | null, vad: string): T => { if (x === null) throw new Error(`${vad}: filen saknas i katalogen (404)`); return x; };

async function hamtaKatalog(): Promise<string> {
  return (await fetch(KATALOG, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) })).text();
}

export type Hamtare = (u: string) => Promise<{ buf: Uint8Array; ms: number }>;
/** Mätningen. Källan (h, katalog) och pausen är utbytbara så att självtestet kör HELA vägen mot en fejkad källa — den andra
 *  tryckningen 14/10 06:46 hämtade allt och föll på sammanfattningens sista rad, som inget prov hade kört. */
export async function mat(rot: string, ut: string, h: Hamtare = hamta, katalog: () => Promise<string> = hamtaKatalog, paus = 5000) {
  mkdirSync(ut, { recursive: true });
  const nu = Date.now();
  const html = await katalog();
  const an = senasteIKatalog(html, "analysis"), fc = senasteIKatalog(html, "forecast");
  if (!an || !fc) throw new Error("katalogen saknar analys eller prognos");
  const lag = (iso: string) => Math.round((nu - Date.parse(iso)) / 60_000);
  console.log(`katalogen: analys ${an.iso} (${an.antal} filer, ${lag(an.iso)} min gammal), prognos ${fc.iso} (${fc.antal} filer, ${lag(fc.iso)} min gammal)`);

  // Rutnätet och punkternas rutor, en gång per körning (lat och lon är fasta fält i varje fil).
  const anFil = filnamnLive("analysis", an.stamp);
  const grid: { la: Falt; lo: Falt; byte: number; ms: number } = { la: null!, lo: null!, byte: 0, ms: 0 };
  for (const f of ["latitude", "longitude"] as const) {
    const { falt, byte, ms } = kravs(await hamtaTolkat(`${anFil}?${f}.${f}`, f, h, paus), f);
    grid.byte += byte; grid.ms += ms; (grid as any)[f === "latitude" ? "la" : "lo"] = falt[0];
  }
  const [ny, nx] = grid.la.dims;
  const punkter = laddaPunkter(rot);
  const rutor: (Ruta & { km: number })[] = punkter.map((p) => ({ id: p.id, ...narmasteRuta(p.lat, p.lon, grid.la.data, grid.lo.data, ny, nx) }));
  const box = rutan(rutor);
  const maxKm = Math.max(...rutor.map((r) => r.km)), over = rutor.filter((r) => r.km > 1.5).length;
  console.log(`rutnätet ${ny}×${nx}; ${punkter.length} punkter (${punkter.length - rutor.filter((r) => r.id.startsWith("v")).length} stationer); ` +
    `ruta y ${box.y0}–${box.y1}, x ${box.x0}–${box.x1} (${box.by}×${box.bx}); längst från rutmitten ${maxKm.toFixed(2)} km, över 1,5 km: ${over}`);

  const anrop: { vad: string; byte: number; ms: number }[] = [{ vad: "lat+lon (rutnätet, en gång)", byte: grid.byte, ms: grid.ms }];
  const urval = (a: number, b: number) => FALT.map(([f]) => `${f}.${f}${encodeURIComponent(`[${a}:${b}][${box.y0}:${box.y1}][${box.x0}:${box.x1}]`)}`).join(",");
  const kontroll = (falt: Falt[], steg: number, vad: string) => {
    const fm = new Map(falt.map((f) => [f.namn, f]));
    for (const [f] of FALT) {
      const x = fm.get(f); if (!x) throw new Error(`${vad}: fältet ${f} saknas i svaret`);
      if (x.dims.join() !== `${steg},${box.by},${box.bx}`) throw new Error(`${vad}: ${f} har ${x.dims} — rutnätet eller tidsaxeln har ändrats`);
    }
    return fm;
  };
  // Analysen: ett timsteg, sju fält.
  const a = kravs(await hamtaTolkat(`${anFil}?${urval(0, 0)}`, "analysen", h, paus), "analysen");
  const anFm = kontroll(a.falt, 1, "analysen");
  anrop.push({ vad: `analysen ${an.stamp}, 1 timsteg`, byte: a.byte, ms: a.ms });
  // Prognosen: stegen 0–17 i anrop om sex, som kuvösen.
  const fcFil = filnamnLive("forecast", fc.stamp), steg: Map<string, Falt>[] = [];
  let bytePrognos = 0;
  for (let s = 0; s < STEG_LIVE; s += PER_ANROP) {
    const r = kravs(await hamtaTolkat(`${fcFil}?${urval(s, s + PER_ANROP - 1)}`, `prognosen steg ${s}`, h, paus), `prognosen steg ${s}`);
    const fm = kontroll(r.falt, PER_ANROP, `prognosen steg ${s}`);
    anrop.push({ vad: `prognosen ${fc.stamp}, steg ${s}–${s + PER_ANROP - 1}`, byte: r.byte, ms: r.ms }); bytePrognos += r.byte;
    const n = box.by * box.bx;
    for (let k = 0; k < PER_ANROP; k++)
      steg.push(new Map(FALT.map(([f]) => { const x = fm.get(f)!; return [f, { namn: f, dims: [box.by, box.bx], data: x.data.subarray(k * n, (k + 1) * n) }]; })));
  }
  // Raderna i kuvösens form. Analysens strålning är redan timvärden (kuvos/metnordic.ts skriver dem rakt av), så analysens rad byggs
  // direkt; prognosens strålning är summerad från körningens start och räknas om till timvärden av raderForKorning (steg 0 blir tomt).
  const anRader = rutor.map((r) => `${r.id},${an.iso},0,${an.iso},${FALT.map(([f, kol]) => varde(kol, anFm.get(f)!.data[(r.y - box.y0) * box.bx + (r.x - box.x0)])).join(",")}`);
  const rader = [...anRader, ...raderForKorning(fc.iso, steg, rutor, box.y0, box.x0, box.bx)];
  const fil = join(ut, `metnordic_live_${an.stamp}.csv.gz`);
  writeFileSync(fil, gzipSync(RUBRIK + "\n" + rader.join("\n") + "\n"));
  const sp = spannUrRader(rader), vol = volym(a.byte, bytePrognos);
  console.log("\nanrop:"); for (const x of anrop) console.log(`  ${x.vad.padEnd(44)} ${(x.byte / 1e6).toFixed(1).padStart(7)} MB ${(x.ms / 1000).toFixed(1).padStart(6)} s`);
  console.log(`\nvolymen om detta hämtas varje timme: ${vol.per_timme_mb.toFixed(0)} MB/timme, ${vol.per_dygn_gb.toFixed(2)} GB/dygn, ${vol.per_manad_gb.toFixed(1)} GB/månad`);
  console.log(`\nspannen (${rader.length} rader; SPANN deklarerat före mätningen):`);
  for (const [k, s] of Object.entries(sp)) {
    const [lo, hi, enhet] = SPANN[k];
    console.log(`  ${k.padEnd(13)} ${s.min.toFixed(3).padStart(12)} – ${s.max.toFixed(3).padStart(12)} ${enhet.padEnd(16)} saknas ${s.saknas}, utanför [${lo}, ${hi}]: ${s.utanfor}${s.utanfor ? "  ⚠" : ""}`);
  }
  console.log(`\nraderna: ${fil} (${rader.length} rader, ${rutor.length} punkter × ${1 + STEG_LIVE} timsteg); avkortade svar som hämtades om: ${avkortade}`);
  const sammanfattning = { katalog: { analys: an.iso, analys_min_gammal: lag(an.iso), prognos: fc.iso, prognos_min_gammal: lag(fc.iso), filer: an.antal },
    rutnat: { ny, nx, ...box }, punkter: { n: punkter.length, max_km: Number(maxKm.toFixed(2)), over_1_5_km: over }, anrop, avkortade_svar: avkortade,
    volym: vol, spann: sp };
  writeFileSync(join(ut, "sammanfattning.json"), JSON.stringify(sammanfattning, null, 1));
  console.log("\nSAMMANFATTNING " + JSON.stringify({ ...sammanfattning, spann: undefined, anrop: undefined }));
  return sammanfattning;
}

/** Ett DAP2-svar ur fält, i samma form som tolkaDods läser (självtestets fejkade källa). */
export function dapSvar(falt: { namn: string; dims: number[]; data: number[] }[]): Uint8Array {
  const rubrik = new TextEncoder().encode("Dataset {\n" + falt.map((f) => `  Structure {\n    Float32 ${f.namn}${f.dims.map((d) => `[d = ${d}]`).join("")};\n  } ${f.namn};\n`).join("") + "} t.nc;\n\nData:\n");
  const n = falt.reduce((s, f) => s + 8 + 4 * f.data.length, 0);
  const ut = new Uint8Array(rubrik.length + n); ut.set(rubrik);
  const dv = new DataView(ut.buffer); let p = rubrik.length;
  for (const f of falt) {
    dv.setUint32(p, f.data.length); dv.setUint32(p + 4, f.data.length); p += 8;
    for (const v of f.data) { dv.setFloat32(p, v); p += 4; }
  }
  return ut;
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  // Avkortade svar: två kapade svar och sedan ett helt ⇒ det hela tolkas och två räknas; sex kapade i rad ⇒ fel.
  const rubrik = new TextEncoder().encode("Dataset {\n  Structure {\n    Float32 a[time = 1][y = 1][x = 2];\n  } a;\n} t.nc;\n\nData:\n");
  const kropp = new DataView(new ArrayBuffer(16)); kropp.setUint32(0, 2); kropp.setUint32(4, 2); kropp.setFloat32(8, 1.5); kropp.setFloat32(12, 2.5);
  const helt = new Uint8Array(rubrik.length + 16); helt.set(rubrik); helt.set(new Uint8Array(kropp.buffer), rubrik.length);
  let n = 0;
  const fejk = async () => ({ buf: ++n < 3 ? helt.slice(0, helt.length - 3) : helt, ms: 1 });
  const h = await hamtaTolkat("u", "prov", fejk, 0);
  k(!!h && h.falt[0].data[1] === 2.5 && h.byte === helt.length && avkortade === 2 && n === 3, `avkortade svar hämtas om: ${avkortade} räknade, ${n} försök`);
  k((await hamtaTolkat("u", "prov", async () => ({ buf: new Uint8Array(0), ms: 1 }), 0)) === null && avkortade === 2, "ett tomt svar (404) är null och räknas inte som avkortat");
  let foll = false; n = -100;
  try { await hamtaTolkat("u", "prov", fejk, 0); } catch { foll = true; }
  k(foll && avkortade === 8, `sex kapade i rad fäller, och alla räknas: ${avkortade}`);
  avkortade = 0;
  const html = `x "catalog.html?dataset=metpplatest/met_analysis_1_0km_nordic_20261014T05Z.nc" "…met_analysis_1_0km_nordic_20261014T04Z.nc"
    "…met_forecast_1_0km_nordic_20261014T03Z.nc" "…met_analysis_1_0km_nordic_20261014T05Z.nc"`;
  const an = senasteIKatalog(html, "analysis"), fc = senasteIKatalog(html, "forecast");
  k(an?.stamp === "20261014T05Z" && an.iso === "2026-10-14T05:00:00Z" && an.antal === 2, `katalogen: senaste analysen ${JSON.stringify(an)}`);
  k(fc?.stamp === "20261014T03Z" && fc.antal === 1 && senasteIKatalog("inget", "analysis") === null, "katalogen: prognosen, och tomt blir null");
  k(filnamnLive("forecast", "20261014T03Z") === `${BAS}/met_forecast_1_0km_nordic_20261014T03Z.nc.dods`, "filnamnet");
  // Närmaste ruta på ett snett rutnät 60×60 med 0,01° steg: punkten mitt i en ruta ska träffa just den rutan (kuvösens prov).
  const ny = 60, nx = 60, la = new Float32Array(ny * nx), lo = new Float32Array(ny * nx);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { la[y * nx + x] = 60 + y * 0.01 + x * 0.001; lo[y * nx + x] = 15 + x * 0.02; }
  const r = narmasteRuta(la[33 * nx + 41], lo[33 * nx + 41], la, lo, ny, nx);
  k(r.y === 33 && r.x === 41 && r.km < 0.001, `närmaste rutan: ${JSON.stringify(r)}`);
  const b = rutan([{ id: "a", y: 5, x: 7 }, { id: "b", y: 9, x: 3 }]);
  k(b.y0 === 5 && b.y1 === 9 && b.x0 === 3 && b.x1 === 7 && b.by === 5 && b.bx === 5, `rutan: ${JSON.stringify(b)}`);
  // Spannen: ett saknat värde räknas som saknat, ett över taket och ett under golvet räknas som utanför, ett inom räknas inte.
  const sp = spannUrRader(["A,k,0,t,-3.50,0.9,-1,0.5,,1000,2000", "B,k,0,t,45.00,0.8,3,0.4,0.2,900,1500"]);
  k(sp.t2m_c.min === -3.5 && sp.t2m_c.max === 45 && sp.t2m_c.utanfor === 1 && sp.nederbord_mm.saknas === 1 && sp.rh2m.utanfor === 0
    && sp.vind10_ms.utanfor === 1, `spannen: ${JSON.stringify(sp.t2m_c)} ${JSON.stringify(sp.vind10_ms)}`);
  const v = volym(26e6, 3 * 156e6);
  k(Math.abs(v.per_timme_mb - 494) < 0.5 && Math.abs(v.per_dygn_gb - 11.856) < 0.01 && Math.abs(v.per_manad_gb - 355.68) < 0.1, `volymen: ${JSON.stringify(v)}`);
  k(FALTEN.length === 7 && FALTEN.every((f) => Array.isArray(SPANN[f]) && SPANN[f].length === 3), "värdevakten deklarerar alla rubrikens sju fält");
  k(STEG_LIVE >= 12, "+6 h-klassen (steg 6–11) ryms i STEG_LIVE");
  // Hela mätningen mot en fejkad källa: ett rutnät 4×5, en station i ruta (1,1) och en vägpunkt i (3,4) ⇒ rutan 3 hög och 4 bred
  // (höjd och bredd kan inte förväxlas; analysens luft stiger 0,01 ° per cell); analysen ett steg, prognosen sex steg per anrop med
  // summerad strålning. Sammanfattningen och raderna ska komma ut, utan ett enda nätanrop.
  const gy = 4, gx = 5, gla: number[] = [], glo: number[] = [];
  for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) { gla.push(60 + y * 0.01 + x * 0.001); glo.push(15 + x * 0.02); }
  const rot = mkdtempSync(join(tmpdir(), "mnl-")), ut = join(rot, "ut");
  mkdirSync(join(rot, "data/vagdata"), { recursive: true });
  writeFileSync(join(rot, PUNKTFILER[0]), JSON.stringify({ rader: [{ id: 1001, lat: gla[1 * gx + 1], lon: glo[1 * gx + 1] }] }));
  writeFileSync(join(rot, PUNKTFILER[1]), JSON.stringify({ rader: [{ lat: gla[3 * gx + 4], lon: glo[3 * gx + 4] }] }));
  // Prognosens strålning är summerad från körningens start över ALLA anrop (steg s + k + 1 gånger basen); analysens är timvärdet,
  // och analysens luft stiger 0,01 ° per cell i rutan (12 celler).
  const varden = (steg: number, summerad: boolean, bas: number, s0: number, f = "") => Array.from({ length: steg * 12 }, (_, i) =>
    summerad && steg > 1 ? bas * (s0 + Math.floor(i / 12) + 1) : steg === 1 && f === "air_temperature_2m" ? bas + i * 0.01 : bas);
  const basen: Record<string, number> = { air_temperature_2m: 274.15, relative_humidity_2m: 0.5, wind_speed_10m: 3, cloud_area_fraction: 0.4,
    precipitation_amount: 0.1, integral_of_surface_downwelling_longwave_flux_in_air_wrt_time: 1_000_000, integral_of_surface_downwelling_shortwave_flux_in_air_wrt_time: 500_000 };
  const storlek: Record<string, number> = {};
  const fejkH: Hamtare = async (u) => {
    let buf: Uint8Array;
    if (u.includes("?latitude.")) buf = dapSvar([{ namn: "latitude", dims: [gy, gx], data: gla }]);
    else if (u.includes("?longitude.")) buf = dapSvar([{ namn: "longitude", dims: [gy, gx], data: glo }]);
    else { const steg = u.includes("met_analysis_") ? 1 : PER_ANROP, s0 = Number(/%5B(\d+)%3A/u.exec(u)?.[1] ?? 0);
      buf = dapSvar(FALT.map(([f, , summerad]) => ({ namn: f, dims: [steg, 3, 4], data: varden(steg, summerad, basen[f], s0, f) }))); }
    storlek[u.includes("met_analysis_") ? (u.includes("?l") ? "grid" : "analys") : "prognos"] = buf.length;
    return { buf, ms: 7 };
  };
  const logg = console.log; console.log = () => {};
  let s: Awaited<ReturnType<typeof mat>> | null = null, fel2 = "";
  try { s = await mat(rot, ut, fejkH, async () => html, 0); } catch (e) { fel2 = (e as Error).message; } finally { console.log = logg; }
  k(!!s && !fel2, `mätningen mot den fejkade källan går igenom: ${fel2}`);
  if (s) {
    k(s.katalog.analys === "2026-10-14T05:00:00Z" && s.punkter.n === 2 && s.punkter.max_km < 0.01 && s.rutnat.by === 3 && s.rutnat.bx === 4, `katalogen, punkterna och rutan: ${JSON.stringify({ ...s, spann: undefined, anrop: undefined })}`);
    k(s.anrop.length === 5 && s.anrop[1].byte === storlek.analys && s.anrop[2].byte === storlek.prognos && s.avkortade_svar === 0, `anropen: ${JSON.stringify(s.anrop)}`);
    k(Math.abs(s.volym.per_timme_mb - (storlek.analys + 3 * storlek.prognos) / 1e6) < 1e-9, `volymen räknas ur analysen och prognosens tre anrop: ${JSON.stringify(s.volym)}`);
    k(Object.keys(s.spann).length === 7 && s.spann.t2m_c.min === 1 && s.spann.t2m_c.max === 1.11 && s.spann.t2m_c.utanfor === 0 && s.spann.langvag_jm2.min === 1_000_000
      && s.spann.langvag_jm2.max === 1_000_000 && s.spann.langvag_jm2.saknas === 2 && s.spann.langvag_jm2.utanfor === 0,
      `spannen: temperaturen i °C med vägpunkten i rutans sista cell (1,11); analysens strålning rakt av och prognosens som timvärde ur summan över anropen (bara steg 0 saknas, två punkter): ${JSON.stringify(s.spann.t2m_c)} ${JSON.stringify(s.spann.langvag_jm2)}`);
    k(existsSync(join(ut, "metnordic_live_20261014T05Z.csv.gz")) && existsSync(join(ut, "sammanfattning.json")), "raderna och sammanfattningen skrivs");
  }
  if (fel) process.exit(1);
  console.log("✓ självtest: avkortade svar, katalogens senaste fil, filnamnet, närmaste rutan, rutan, spannen, volymen, och hela mätningen mot en fejkad källa");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  const arg = process.argv.slice(2);
  const v = (n: string, d: string) => { const i = arg.indexOf(n); return i >= 0 && arg[i + 1] ? arg[i + 1] : d; };
  if (arg.includes("--sjalvtest")) await sjalvtest();
  else if (arg.includes("--mat")) await mat(v("--rot", "."), v("--ut", "mn-live"));
  else { console.error("kör: metnordic-live.ts --mat [--ut <mapp>] [--rot <repo>] | --sjalvtest"); process.exit(2); }
}
