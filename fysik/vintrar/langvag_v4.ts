// LÅNGVÅGEN UR MET:S OMRÄKNING V4 FÖR DEN FRYSTA KANDIDATENS ÄLDRE VINTRAR (utkastet till tillägget till FORREGISTRERING-FLER-VINTRAR,
// Ä1; Bengt 25/10: "bygg så att du återanvänder allt som går att återanvända", DECISIONS #711). Den nya kandidatens delar i releasen
// kuvos-vintrar-<vinter> (metnordic_fylld_<del>, annars metnordic_reserv_<del>, valda som fysik/ny_kandidat/metnordic_reserv.ts
// valjDelar väljer dem) bär redan MET:s arkiv med sex fält i analysfilens form, tillägget T2:s timmar ur v4 och vinden ur x och y för
// 2018/19: allt utom långvågen, vars kolumn langvag_jm2 står tom. Här fylls långvågen, timme för timme, och i Ä6:s timmar även
// kortvågen:
//   - före 14/3 2022 ur v4 (metpparchivev4), eftersom arkivet saknar fältet från 2018 till 13/3 2022 (#670, #707). Bara långvågen;
//     kortvågen är källdelens;
//   - 14/3 2022 00 UTC till och med 31/3 2022 23 UTC ur v4, både långvågen OCH kortvågen i samma DAP-anrop (andra tillägget Ä6,
//     signerat 25/10, DECISIONS #719). Arkivet bär där lång- och kortvågen som summor som växer timme för timme och nollställs med
//     några timmars mellanrum, inte timvärden; v4 har timvärden (stickprovet §4 b). Arkivet begärs aldrig för de timmarna. Saknas
//     timmen i v4 (404) blir båda kolumnerna tomma och timmen listas i saknas;
//   - från 1/4 2022 ur arkivet (metpparchive), som för 2022/23. Tilläggets vintrar slutar 31/3 2022, så det händer inte i dag;
//   - en sådan timme som arkivet saknar helt (404) ur v4, som Ä2 tar timmens andra fält (Bengt 25/10, tilläggets §10 e:
//     "Väg 2: ta långvågen ur v4 också för timmen 25/3 2022 08 UTC", DECISIONS #714). Timmarna listas i ur_v4_efter_skarven.
//     Timmen 25/3 08 UTC ligger sedan Ä6 i v4-perioden och tas därför ur v4 direkt.
// Inget annat fält ändras, och raderna och deras ordning är källdelens. Värdena skrivs som den frystas hämtning skriver dem
// (ingest/metnordic-historik.ts dygn(): varde('langvag_jm2', …) och varde('kortvag_jm2', …), timvärdet rakt av). En timme som saknas,
// eller ett fyllnadsvärde, blir tomt och räknas mot kedjans krav på högst 1 % per fält (MAX_IFYLLT).
// Utfilerna, bredvid källdelen i releasen, som står kvar: metnordic_lw4_<fran>_<till>.csv.gz och lw4_<fran>_<till>.json (källans namn
// och summa, timmarna per källa, kortvag_ur_v4 och a6: true, de saknade timmarna och utfilens summa). Bara öppna data (MET Norway,
// NLOD / CC BY 4.0), inga Trafikverksdata och inga modelltal. En förbindelse åt gången (MET:s villkor).
//
// Kör:      node --experimental-strip-types fysik/vintrar/langvag_v4.ts --plan <mapp>          matrisen ur <mapp>/<vinter>.txt (releasernas namn)
//           node --experimental-strip-types fysik/vintrar/langvag_v4.ts --fyll <del.csv.gz> <utmapp> --rutor <metnordic_stationer.csv>
// Självtest: node --experimental-strip-types fysik/vintrar/langvag_v4.ts --sjalvtest        (i ci.yml)
// Källa: MET Norway, MET Nordic (NLOD / CC BY 4.0), https://thredds.met.no/thredds/catalog/metpparchivev4/catalog.html
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { FALT, varde } from "../../kuvos/metnordic-prognos.ts";
import { rutorUrFil, rutan, hamtaTolkat, dapSvar, type Hamtare } from "../../ingest/metnordic-live.ts";
import { filnamnArkiv, RUBRIK_ANALYS } from "../../ingest/metnordic-historik.ts";
import { LANGVAG, filnamnV4, valjDelar } from "../ny_kandidat/metnordic_reserv.ts";
import { delar } from "./metnordic_vinter.ts";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
/** Vintrarna i tillägget: de fyra som arkivet inte bär långvågen för. 2022/23 och 2024/25 räknas som förut. */
export const VINTRAR_V4 = ["2018-19", "2019-20", "2020-21", "2021-22"];
/** Första timmen med långvågen i arkivet (DDS läst 22/10, #670). Timmar före den tas ur v4. */
export const SKARV = "2022-03-14T00:00:00Z";
/** Ä6 (DECISIONS #719): timmarna i [SKARV, A6_TILL) tas ur v4, både lång- och kortvågen; arkivet bär där summor, inte timvärden. */
export const A6_TILL = "2022-04-01T00:00:00Z";
/** Kortvågens fält i källan, ur den frystas fältlista (kuvos/metnordic-prognos.ts FALT). */
export const KORTVAG = FALT.find(([, kol]) => kol === "kortvag_jm2")![0];
const LV = RUBRIK_ANALYS.split(",").indexOf("langvag_jm2"), KV = RUBRIK_ANALYS.split(",").indexOf("kortvag_jm2");
/** Fälten som hämtas för en timme, som [källans namn, kolumn, ordet i loggen]. */
type Stralning = [string, "langvag_jm2" | "kortvag_jm2", string];
const BARA_LV: Stralning[] = [[LANGVAG, "langvag_jm2", "långvågen"]];
const LV_OCH_KV: Stralning[] = [...BARA_LV, [KORTVAG, "kortvag_jm2", "kortvågen"]];

/** Som metnordic_vinter.ts hämtare: 404 är en timme som saknas (tomt svar), annat fel hämtas om fyra gånger. */
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

/** Ä6:s timmar: 14/3 2022 00 UTC till och med 31/3 2022 23 UTC. */
export const iA6 = (tid: string) => tid >= SKARV && tid < A6_TILL;

/** Källan för en timme: v4 före skarven och i Ä6:s timmar, arkivet från 1/4 2022. */
export const kallaFor = (tid: string): "v4" | "arkivet" => (tid < SKARV || iA6(tid) ? "v4" : "arkivet");

/** Timmens fil (DAP) i sin källa, eller i den källa som anges. */
export function filFor(tid: string, kalla: "v4" | "arkivet" = kallaFor(tid)): string {
  const dag = tid.slice(0, 10), t = Number(tid.slice(11, 13));
  return kalla === "v4" ? filnamnV4(dag, t) : filnamnArkiv(dag, t);
}

/** Matrisen: för varje vinter i tillägget den nya kandidatens delar i releasen, i delarnas ordning. */
export function plan(listor: Record<string, string[]>) {
  return VINTRAR_V4.flatMap((v) => {
    if (!listor[v]) throw new Error(`vintern ${v}: releasens namnlista saknas`);
    const a = Number(v.slice(0, 4));
    const dl = delar(`${a}-10-31`, `${a + 1}-03-31`, 15);
    return valjDelar(v, listor[v]).map((kalla, i) => ({ vinter: v, kalla, fran: dl[i].fran, till: dl[i].till }));
  });
}

/** Strålningen för en timme vid varje station i sin ruta, ett fält i taget men alla i samma DAP-anrop (som dygn() begär sina
 *  fält): en karta station → värde per fält, i fältens ordning. null när timmen saknas i källan (404). */
async function timmensStralning(tid: string, r: { id: string; y: number; x: number }[], box: ReturnType<typeof rutan>, h: Hamtare, paus: number,
  kalla: "v4" | "arkivet" = kallaFor(tid), falt: Stralning[] = BARA_LV) {
  const urval = falt.map(([f]) => `${f}.${f}${encodeURIComponent(`[0:0][${box.y0}:${box.y1}][${box.x0}:${box.x1}]`)}`).join(",");
  const svar = await hamtaTolkat(`${filFor(tid, kalla)}?${urval}`, tid, h, paus);
  if (!svar) return null;
  return falt.map(([namn, kol, ord]) => {
    const f = svar.falt.find((x) => x.namn === namn);
    if (!f) throw new Error(`${tid}: ${ord} saknas i svaret ur ${kalla}`);
    if (f.dims.join() !== `1,${box.by},${box.bx}`) throw new Error(`${tid}: ${ord} har ${f.dims}, rutnätet har ändrats`);
    return new Map(r.map((p) => [p.id, varde(kol, f.data[(p.y - box.y0) * box.bx + (p.x - box.x0)])]));
  });
}

/** Ä1 och Ä6 för en del: långvågen fylls i varje rad ur sin källa, och i Ä6:s timmar skrivs kortvågen över ur v4; allt annat är
 *  källdelens, byte för byte. */
export async function langvagDel(delFil: string, ut: string, rutorFil: string, h: Hamtare = hamta, paus = 5000) {
  const m = /_(\d{4}-\d\d-\d\d)_(\d{4}-\d\d-\d\d)\.csv\.gz$/u.exec(basename(delFil));
  if (!m) throw new Error(`${basename(delFil)}: väntat <namn>_<fran>_<till>.csv.gz`);
  const [, fran, till] = m;
  const b = readFileSync(delFil);
  const [rubrik, ...rader] = gunzipSync(b).toString().trim().split("\n");
  if (rubrik !== RUBRIK_ANALYS) throw new Error(`${basename(delFil)}: rubriken är inte analysfilens: ${rubrik}`);
  const k = rader.map((x) => x.split(","));
  const medLv = k.filter((x) => x[LV] !== "").length;
  if (medLv) throw new Error(`${basename(delFil)}: ${medLv} rader har redan långvåg — källan ska vara den nya kandidatens del, där den är tom`);
  const ids = [...new Set(k.map((x) => x[0]))];
  const alla = rutorUrFil(rutorFil).rutor, r = alla.filter((x) => ids.includes(x.id));
  const utan = ids.filter((s) => !alla.some((x) => x.id === s));
  if (utan.length) throw new Error(`${utan.length} av delens stationer saknar ruta i ${rutorFil}: ${utan.slice(0, 5).join(", ")}`);
  const box = rutan(r);
  const tider = [...new Set(k.map((x) => x[1]))].sort();
  const s = { fran, till, kalla: basename(delFil), kalla_sha256: createHash("sha256").update(b).digest("hex"), skarv: SKARV, a6: true,
    timmar: tider.length, ur_v4: 0, ur_arkivet: 0, kortvag_ur_v4: 0, ur_v4_efter_skarven: [] as string[], saknas: [] as string[],
    tomma_varden: 0, rader: k.length, stationer: r.length, sekunder: 0, fil: "", fil_sha256: "" };
  const t0 = Date.now(), per = new Map<string, Map<string, string>>(), perKv = new Map<string, Map<string, string>>();
  for (const tid of tider) {
    const a6 = iA6(tid);                                               // Ä6: båda fälten ur v4 i samma anrop, aldrig arkivet
    let kalla = kallaFor(tid), v = await timmensStralning(tid, r, box, h, paus, kalla, a6 ? LV_OCH_KV : BARA_LV);
    if (!v && kalla === "arkivet") {                                   // arkivet saknar timmen helt: v4, som Ä2 (tillägget §10 e)
      v = await timmensStralning(tid, r, box, h, paus, "v4");
      if (v) { kalla = "v4"; s.ur_v4_efter_skarven.push(tid); console.log(`  saknas i arkivet, ur v4: ${tid}`); }
    }
    if (!v) { s.saknas.push(tid); console.log(`  saknas i ${kalla === "arkivet" ? "arkivet och v4" : "v4"}${a6 ? " (lång- och kortvågen tomma, Ä6)" : ""}: ${tid}`); continue; }
    per.set(tid, v[0]); if (kalla === "v4") s.ur_v4++; else s.ur_arkivet++;
    if (a6) { perKv.set(tid, v[1]); s.kortvag_ur_v4++; }
  }
  s.sekunder = Math.round((Date.now() - t0) / 1000);
  const nya = k.map((x) => {
    const y = [...x]; y[LV] = per.get(x[1])?.get(x[0]) ?? ""; if (y[LV] === "") s.tomma_varden++;
    if (iA6(x[1])) y[KV] = perKv.get(x[1])?.get(x[0]) ?? "";           // Ä6: kortvågen ur v4, tom när v4 saknar timmen
    return y.join(",");
  });
  mkdirSync(ut, { recursive: true });
  const fil = join(ut, `metnordic_lw4_${fran}_${till}.csv.gz`);
  writeFileSync(fil, gzipSync(RUBRIK_ANALYS + "\n" + nya.join("\n") + (nya.length ? "\n" : "")));
  s.fil = basename(fil); s.fil_sha256 = createHash("sha256").update(readFileSync(fil)).digest("hex");
  writeFileSync(join(ut, `lw4_${fran}_${till}.json`), JSON.stringify(s, null, 1));
  console.log(`${s.kalla}: ${s.timmar} timmar, ${s.ur_v4} ur v4 (${s.kortvag_ur_v4} med kortvågen, Ä6), ${s.ur_arkivet} ur arkivet, ` +
    `${s.saknas.length} saknas, ${s.tomma_varden} tomma värden av ${s.rader}, ${s.sekunder} s → ${s.fil} (${s.fil_sha256.slice(0, 12)}…)`);
  return s;
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const d = mkdtempSync(join(tmpdir(), "lw4-"));
  // Rutfilen har tre stationer, delen två: 1001 i (1,1) och 1003 i (3,4) ⇒ rutan 3 hög och 4 bred; 1002 läses inte.
  writeFileSync(join(d, "rutor.csv"), "station_id,lat,lon,ruta_y,ruta_x,avstand_km\n1001,60,15,1,1,0.3\n1002,61,16,0,0,0.2\n1003,62,17,3,4,0.4\n");
  // Fem timmar: en före skarven (v4, bara långvågen), tre i Ä6:s timmar (v4, lång- och kortvågen; 14/3 05 saknas i v4 i första
  // körningen) och en efter (arkivet, bara långvågen). Källdelens kortvåg hos 1001 är trappformad, en summa som växer: 1, 2, 3, 4, 5 MJ/m².
  const tider = ["2022-03-13T23:00:00Z", "2022-03-14T00:00:00Z", "2022-03-14T05:00:00Z", "2022-03-31T23:00:00Z", "2022-04-01T00:00:00Z"];
  const kalla = tider.flatMap((t, i) => [`1001,${t},-${i}.50,0.9,2.5,0.7,0,,${(i + 1) * 1_000_000}`, `1003,${t},${i}.25,0.8,5,0.2,0.1,,${i}`]);
  const del = join(d, "metnordic_fylld_2022-03-13_2022-04-01.csv.gz");
  writeFileSync(del, gzipSync(RUBRIK_ANALYS + "\n" + kalla.join("\n") + "\n"));
  const fore = createHash("sha256").update(readFileSync(del)).digest("hex");
  let urls: string[] = []; const allaUrls: string[] = [];
  // Den fejkade källan: v4 1 000 000 och arkivet 2 000 000, plus timmen · 100 och rutans index; kortvågen 50 000 över långvågen.
  const kallan = (o: { saknas?: string; baraArkiv?: boolean } = {}): Hamtare => async (u) => {
    urls.push(u); allaUrls.push(u);
    if (o.saknas && u.includes(o.saknas) && !(o.baraArkiv && u.includes("/metpparchivev4/"))) return { buf: new Uint8Array(0), ms: 1 };
    const bas = u.includes("/metpparchivev4/") ? 1_000_000 : 2_000_000, t = Number(/T(\d{2})Z/u.exec(u)![1]);
    return { buf: dapSvar(begarda(u).map((f) => ({ namn: f, dims: [1, 3, 4],
      data: Array.from({ length: 12 }, (_, i) => bas + t * 100 + i + 0.0004 + (f === KORTVAG ? 50_000 : 0)) }))), ms: 1 };
  };
  const begarda = (u: string) => decodeURIComponent(u.split("?")[1]).split(",").map((x) => x.split(".")[0]);
  const tidUr = (u: string) => { const m = /nordic_(\d{4})(\d\d)(\d\d)T(\d\d)Z/u.exec(u)!; return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:00:00Z`; };
  const kort = (x: string[]) => x.map((u) => `${u.split("?")[0].split("/dodsC/")[1] ?? u.split("?")[0]} [${begarda(u).map((f) => f === LANGVAG ? "LV" : f === KORTVAG ? "KV" : f)}]`).join(" | ");
  const logg = console.log; const tyst = async <T,>(f: () => Promise<T>) => { console.log = () => {}; try { return await f(); } finally { console.log = logg; } };
  k(KORTVAG === "integral_of_surface_downwelling_shortwave_flux_in_air_wrt_time" && LANGVAG === "integral_of_surface_downwelling_longwave_flux_in_air_wrt_time",
    `fälten: kortvågen ur den frystas FALT (${KORTVAG}) och långvågen`);
  k(!iA6("2022-03-13T23:00:00Z") && iA6(SKARV) && iA6("2022-03-31T23:00:00Z") && !iA6(A6_TILL) && A6_TILL === "2022-04-01T00:00:00Z",
    "Ä6:s timmar: 14/3 2022 00 UTC till och med 31/3 2022 23 UTC");
  k(kallaFor("2022-03-13T23:00:00Z") === "v4" && kallaFor(SKARV) === "v4" && kallaFor("2022-03-31T23:00:00Z") === "v4" && kallaFor(A6_TILL) === "arkivet"
    && filFor("2019-01-15T06:00:00Z").includes("/metpparchivev4/2019/01/15/") && filFor(SKARV).includes("/metpparchivev4/2022/03/14/")
    && filFor(A6_TILL).includes("/metpparchive/2022/04/01/") && !filFor(A6_TILL).includes("v4") && filFor(SKARV, "arkivet").includes("/metpparchive/2022/03/14/"),
    "källan: v4 före 14/3 2022 och i Ä6:s timmar, arkivet från 1/4 2022");
  const s = await tyst(() => langvagDel(del, join(d, "ut"), join(d, "rutor.csv"), kallan({ saknas: "20220314T05Z" }), 0));
  const ut = gunzipSync(readFileSync(join(d, "ut", "metnordic_lw4_2022-03-13_2022-04-01.csv.gz"))).toString().trim().split("\n");
  k(s.timmar === 5 && s.ur_v4 === 3 && s.ur_arkivet === 1 && s.kortvag_ur_v4 === 2 && s.a6 === true
    && JSON.stringify(s.saknas) === JSON.stringify(["2022-03-14T05:00:00Z"]) && s.tomma_varden === 2
    && s.ur_v4_efter_skarven.length === 0 && s.rader === 10 && s.stationer === 2,
    `delen: tre timmar ur v4 (två med kortvågen), en ur arkivet, en saknad i v4 med två tomma värden: ${JSON.stringify({ ...s, kalla_sha256: undefined, fil_sha256: undefined })}`);
  k(urls.length === 5 && urls.slice(0, 4).every((u) => u.includes("/metpparchivev4/")) && urls[4].includes("/metpparchive/2022/04/01/")
    && urls.map(tidUr).join() === tider.join()
    && urls.every((u) => JSON.stringify(begarda(u)) === JSON.stringify(iA6(tidUr(u)) ? [LANGVAG, KORTVAG] : [LANGVAG])),
    `en timme i taget ur sin källa; lång- och kortvågen i samma anrop i Ä6:s timmar, annars bara långvågen: ${kort(urls)}`);
  k(ut[0] === RUBRIK_ANALYS && ut.length === 11, `utfilen: analysfilens rubrik och tio rader: ${ut.length}`);
  k(ut[1] === "1001,2022-03-13T23:00:00Z,-0.50,0.9,2.5,0.7,0,1002300,1000000" && ut[2] === "1003,2022-03-13T23:00:00Z,0.25,0.8,5,0.2,0.1,1002311,0",
    `före skarven: v4:s långvåg i sin ruta (1001 i index 0, 1003 i index 11), avrundad som hämtningen, och kortvågen orörd: ${ut[1]} | ${ut[2]}`);
  k(ut[3] === "1001,2022-03-14T00:00:00Z,-1.50,0.9,2.5,0.7,0,1000000,1050000" && ut[4] === "1003,2022-03-14T00:00:00Z,1.25,0.8,5,0.2,0.1,1000011,1050011"
    && ut[7] === "1001,2022-03-31T23:00:00Z,-3.50,0.9,2.5,0.7,0,1002300,1052300" && ut[8] === "1003,2022-03-31T23:00:00Z,3.25,0.8,5,0.2,0.1,1002311,1052311",
    `Ä6: lång- och kortvågen ur v4 i sin ruta, den trappformade kortvågen överskriven: ${ut[3]} | ${ut[4]} | ${ut[7]}`);
  k(ut[5] === "1001,2022-03-14T05:00:00Z,-2.50,0.9,2.5,0.7,0,," && ut[6] === "1003,2022-03-14T05:00:00Z,2.25,0.8,5,0.2,0.1,,",
    `Ä6: en timme som saknas i v4 blir tom i både lång- och kortvågen: ${ut[5]} | ${ut[6]}`);
  k(ut[9] === "1001,2022-04-01T00:00:00Z,-4.50,0.9,2.5,0.7,0,2000000,5000000" && ut[10] === "1003,2022-04-01T00:00:00Z,4.25,0.8,5,0.2,0.1,2000011,4",
    `efter Ä6: arkivets långvåg och kortvågen orörd: ${ut[9]} | ${ut[10]}`);
  k(ut.slice(1).every((x, i) => { const a = x.split(","), b = kalla[i].split(","); a[LV] = ""; if (iA6(a[1])) a[KV] = b[KV]; return a.join(",") === b.join(","); }),
    "alla andra kolumner och radordningen är källdelens, byte för byte, och kortvågen utanför Ä6:s timmar");
  const j = JSON.parse(readFileSync(join(d, "ut", "lw4_2022-03-13_2022-04-01.json"), "utf8"));
  k(j.kalla === basename(del) && j.kalla_sha256 === fore && j.fil === "metnordic_lw4_2022-03-13_2022-04-01.csv.gz" && /^[0-9a-f]{64}$/u.test(j.fil_sha256) && j.skarv === SKARV
    && j.a6 === true && j.kortvag_ur_v4 === 2,
    `lw4_<del>.json: källa, summor, skarven, a6 och kortvag_ur_v4: ${JSON.stringify(j).slice(0, 220)}`);
  k(createHash("sha256").update(readFileSync(del)).digest("hex") === fore, "källdelen står kvar orörd");
  // Arkivet saknar timmen 1/4 00 helt, v4 har den: långvågen ur v4, som Ä2 (tillägget §10 e), kortvågen orörd. 14/3 05 finns nu i v4.
  urls = [];
  const s2 = await tyst(() => langvagDel(del, join(d, "ut4"), join(d, "rutor.csv"), kallan({ saknas: "20220401T00Z", baraArkiv: true }), 0));
  const ut4 = gunzipSync(readFileSync(join(d, "ut4", "metnordic_lw4_2022-03-13_2022-04-01.csv.gz"))).toString().trim().split("\n");
  k(s2.ur_v4 === 5 && s2.ur_arkivet === 0 && s2.kortvag_ur_v4 === 3 && s2.saknas.length === 0 && s2.tomma_varden === 0
    && JSON.stringify(s2.ur_v4_efter_skarven) === JSON.stringify(["2022-04-01T00:00:00Z"]) && ut4[9] === "1001,2022-04-01T00:00:00Z,-4.50,0.9,2.5,0.7,0,1000000,5000000"
    && ut4[5] === "1001,2022-03-14T05:00:00Z,-2.50,0.9,2.5,0.7,0,1000500,1050500"
    && urls.length === 6 && urls[4].includes("/metpparchive/2022/04/01/") && urls[5].includes("/metpparchivev4/2022/04/01/")
    && JSON.stringify(begarda(urls[5])) === JSON.stringify([LANGVAG]),
    `arkivets lucka efter Ä6 fylls ur v4 med bara långvågen: ${ut4[9]} ${JSON.stringify(s2.ur_v4_efter_skarven)} ${kort(urls)}`);
  k(allaUrls.filter((u) => iA6(tidUr(u))).length === 6 && allaUrls.filter((u) => iA6(tidUr(u))).every((u) => u.includes("/metpparchivev4/")),
    `Ä6: arkivet begärs aldrig för timmarna 14/3 00 till 31/3 23, inte heller när v4 saknar timmen: ${kort(allaUrls.filter((u) => iA6(tidUr(u))))}`);
  // En källa som redan har långvåg, och en station utan ruta, fälls.
  const med = join(d, "metnordic_fylld_2022-03-15_2022-03-15.csv.gz");
  writeFileSync(med, gzipSync(RUBRIK_ANALYS + "\n1001,2022-03-15T00:00:00Z,1.00,0.9,2.5,0.7,0,999,0\n"));
  let e1 = ""; try { await tyst(() => langvagDel(med, join(d, "ut2"), join(d, "rutor.csv"), kallan(), 0)); } catch (e) { e1 = (e as Error).message; }
  k(e1.includes("redan långvåg"), `en källa med långvåg skrivs aldrig över: ${e1}`);
  const utan = join(d, "metnordic_fylld_2022-03-16_2022-03-16.csv.gz");
  writeFileSync(utan, gzipSync(RUBRIK_ANALYS + "\n9999,2022-03-16T00:00:00Z,1.00,0.9,2.5,0.7,0,,0\n"));
  let e2 = ""; try { await tyst(() => langvagDel(utan, join(d, "ut3"), join(d, "rutor.csv"), kallan(), 0)); } catch (e) { e2 = (e as Error).message; }
  k(e2.includes("saknar ruta"), `en station utan ruta fäller delen: ${e2}`);
  k(!existsSync(join(d, "ut2")) && !existsSync(join(d, "ut3")), "en fälld del skriver ingenting");
  // Planen: den fyllda delen före den egna, alla fyra vintrarna, 2022/23 och 2024/25 aldrig.
  const listor: Record<string, string[]> = {};
  for (const v of VINTRAR_V4) {
    const a = Number(v.slice(0, 4)), dl = delar(`${a}-10-31`, `${a + 1}-03-31`, 15);
    listor[v] = [...dl.map((x) => `metnordic_reserv_${x.fran}_${x.till}.csv.gz`), ...dl.slice(0, 5).map((x) => `metnordic_fylld_${x.fran}_${x.till}.csv.gz`), `ifs_${v}.tar.gz`];
  }
  const p = plan(listor);
  k(p.length === 44 && p[0].vinter === "2018-19" && p[0].kalla === "metnordic_fylld_2018-10-31_2018-11-14.csv.gz" && p[5].kalla === "metnordic_reserv_2019-01-14_2019-01-28.csv.gz"
    && p[43].vinter === "2021-22" && p[43].till === "2022-03-31" && p.every((x) => VINTRAR_V4.includes(x.vinter)),
    `planen: 44 delar, den fyllda före den egna: ${JSON.stringify([p.length, p[0], p[5], p[43]])}`);
  let e3 = ""; try { plan({ "2018-19": listor["2018-19"] }); } catch (e) { e3 = (e as Error).message; }
  k(e3.includes("saknas"), `en vinter utan namnlista fäller planen: ${e3}`);
  let e4 = ""; try { plan({ ...listor, "2020-21": listor["2020-21"].filter((x) => !x.includes("_2020-10-31_")) }); } catch (e) { e4 = (e as Error).message; }
  k(e4.includes("saknas"), `en saknad del fäller planen: ${e4}`);
  if (fel) process.exit(1);
  console.log("✓ självtest: källan per timme (v4 före 14/3 2022 och i Ä6:s timmar 14/3 00 till 31/3 23, arkivet från 1/4 2022, v4 där arkivet saknar timmen), " +
    "bara långvågen begärd utanför Ä6, lång- och kortvågen i samma anrop i Ä6 och arkivet aldrig där, den trappformade kortvågen överskriven ur v4 och orörd " +
    "före skarven, värdena i sin ruta avrundade som hämtningen, en timme som saknas i v4 tom i båda, allt annat byte för byte källans, listan med a6 och " +
    "kortvag_ur_v4, källan orörd, en källa med långvåg och en station utan ruta fälls, och planen (den fyllda delen först, de fyra vintrarna)");
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv) {
  const arg = process.argv.slice(2);
  const v = (n: string) => { const i = arg.indexOf(n); return i >= 0 && arg[i + 1] ? arg[i + 1] : ""; };
  if (arg.includes("--sjalvtest")) await sjalvtest();
  else if (arg[0] === "--plan" && arg[1])
    console.log(JSON.stringify(plan(Object.fromEntries(VINTRAR_V4.map((x) => [x, readFileSync(join(arg[1], `${x}.txt`), "utf8").trim().split("\n").filter(Boolean)])))));
  else if (arg[0] === "--fyll" && arg[1] && arg[2] && v("--rutor")) await langvagDel(arg[1], arg[2], v("--rutor"));
  else { console.error("kör: langvag_v4.ts --plan <mapp> | --fyll <del.csv.gz> <utmapp> --rutor <metnordic_stationer.csv> | --sjalvtest"); process.exit(2); }
}
