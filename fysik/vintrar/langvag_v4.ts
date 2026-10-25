// LÅNGVÅGEN UR MET:S OMRÄKNING V4 FÖR DEN FRYSTA KANDIDATENS ÄLDRE VINTRAR (utkastet till tillägget till FORREGISTRERING-FLER-VINTRAR,
// Ä1; Bengt 25/10: "bygg så att du återanvänder allt som går att återanvända", DECISIONS #711). Den nya kandidatens delar i releasen
// kuvos-vintrar-<vinter> (metnordic_fylld_<del>, annars metnordic_reserv_<del>, valda som fysik/ny_kandidat/metnordic_reserv.ts
// valjDelar väljer dem) bär redan MET:s arkiv med sex fält i analysfilens form, tillägget T2:s timmar ur v4 och vinden ur x och y för
// 2018/19 — allt utom långvågen, vars kolumn langvag_jm2 står tom. Här fylls BARA långvågen, timme för timme:
//   - före 14/3 2022 ur v4 (metpparchivev4), eftersom arkivet saknar fältet från 2018 till 13/3 2022 (#670, #707);
//   - från 14/3 2022 ur arkivet (metpparchive), som för 2022/23.
// Inget annat fält ändras, och raderna och deras ordning är källdelens. Värdet skrivs som den frystas hämtning skriver det
// (ingest/metnordic-historik.ts dygn(): varde('langvag_jm2', …), timvärdet rakt av). En timme som saknas i sin källa (404), eller ett
// fyllnadsvärde, blir tomt och räknas mot kedjans krav på högst 1 % per fält (MAX_IFYLLT).
// Utfilerna, bredvid källdelen i releasen, som står kvar: metnordic_lw4_<fran>_<till>.csv.gz och lw4_<fran>_<till>.json (källans namn
// och summa, timmarna per källa, de saknade timmarna och utfilens summa). Bara öppna data (MET Norway, NLOD / CC BY 4.0) — inga
// Trafikverksdata och inga modelltal. En förbindelse åt gången (MET:s villkor).
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
import { varde } from "../../kuvos/metnordic-prognos.ts";
import { rutorUrFil, rutan, hamtaTolkat, dapSvar, type Hamtare } from "../../ingest/metnordic-live.ts";
import { filnamnArkiv, RUBRIK_ANALYS } from "../../ingest/metnordic-historik.ts";
import { LANGVAG, filnamnV4, valjDelar } from "../ny_kandidat/metnordic_reserv.ts";
import { delar } from "./metnordic_vinter.ts";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
/** Vintrarna i tillägget: de fyra som arkivet inte bär långvågen för. 2022/23 och 2024/25 räknas som förut. */
export const VINTRAR_V4 = ["2018-19", "2019-20", "2020-21", "2021-22"];
/** Första timmen med långvågen i arkivet (DDS läst 22/10, #670). Timmar före den tas ur v4. */
export const SKARV = "2022-03-14T00:00:00Z";
const LV = RUBRIK_ANALYS.split(",").indexOf("langvag_jm2");

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

/** Källan för en timme: v4 före skarven, arkivet från den. */
export const kallaFor = (tid: string): "v4" | "arkivet" => (tid < SKARV ? "v4" : "arkivet");

/** Timmens fil (DAP) i sin källa. */
export function filFor(tid: string): string {
  const dag = tid.slice(0, 10), t = Number(tid.slice(11, 13));
  return kallaFor(tid) === "v4" ? filnamnV4(dag, t) : filnamnArkiv(dag, t);
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

/** Långvågen för en timme vid varje station i sin ruta; null när timmen saknas i källan (404). */
async function timmensLangvag(tid: string, r: { id: string; y: number; x: number }[], box: ReturnType<typeof rutan>, h: Hamtare, paus: number) {
  const urval = `${LANGVAG}.${LANGVAG}${encodeURIComponent(`[0:0][${box.y0}:${box.y1}][${box.x0}:${box.x1}]`)}`;
  const svar = await hamtaTolkat(`${filFor(tid)}?${urval}`, tid, h, paus);
  if (!svar) return null;
  const f = svar.falt.find((x) => x.namn === LANGVAG);
  if (!f) throw new Error(`${tid}: långvågen saknas i svaret ur ${kallaFor(tid)}`);
  if (f.dims.join() !== `1,${box.by},${box.bx}`) throw new Error(`${tid}: långvågen har ${f.dims} — rutnätet har ändrats`);
  return new Map(r.map((p) => [p.id, varde("langvag_jm2", f.data[(p.y - box.y0) * box.bx + (p.x - box.x0)])]));
}

/** Ä1 för en del: långvågen fylls i varje rad ur sin källa; allt annat är källdelens, byte för byte. */
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
  const s = { fran, till, kalla: basename(delFil), kalla_sha256: createHash("sha256").update(b).digest("hex"), skarv: SKARV,
    timmar: tider.length, ur_v4: 0, ur_arkivet: 0, saknas: [] as string[], tomma_varden: 0, rader: k.length, stationer: r.length,
    sekunder: 0, fil: "", fil_sha256: "" };
  const t0 = Date.now(), per = new Map<string, Map<string, string>>();
  for (const tid of tider) {
    const v = await timmensLangvag(tid, r, box, h, paus);
    if (!v) { s.saknas.push(tid); console.log(`  saknas i ${kallaFor(tid)}: ${tid}`); continue; }
    per.set(tid, v); if (kallaFor(tid) === "v4") s.ur_v4++; else s.ur_arkivet++;
  }
  s.sekunder = Math.round((Date.now() - t0) / 1000);
  const nya = k.map((x) => { const y = [...x]; y[LV] = per.get(x[1])?.get(x[0]) ?? ""; if (y[LV] === "") s.tomma_varden++; return y.join(","); });
  mkdirSync(ut, { recursive: true });
  const fil = join(ut, `metnordic_lw4_${fran}_${till}.csv.gz`);
  writeFileSync(fil, gzipSync(RUBRIK_ANALYS + "\n" + nya.join("\n") + (nya.length ? "\n" : "")));
  s.fil = basename(fil); s.fil_sha256 = createHash("sha256").update(readFileSync(fil)).digest("hex");
  writeFileSync(join(ut, `lw4_${fran}_${till}.json`), JSON.stringify(s, null, 1));
  console.log(`${s.kalla}: ${s.timmar} timmar, ${s.ur_v4} ur v4, ${s.ur_arkivet} ur arkivet, ${s.saknas.length} saknas, ${s.tomma_varden} tomma värden ` +
    `av ${s.rader}, ${s.sekunder} s → ${s.fil} (${s.fil_sha256.slice(0, 12)}…)`);
  return s;
}

async function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const d = mkdtempSync(join(tmpdir(), "lw4-"));
  // Rutfilen har tre stationer, delen två: 1001 i (1,1) och 1003 i (3,4) ⇒ rutan 3 hög och 4 bred; 1002 läses inte.
  writeFileSync(join(d, "rutor.csv"), "station_id,lat,lon,ruta_y,ruta_x,avstand_km\n1001,60,15,1,1,0.3\n1002,61,16,0,0,0.2\n1003,62,17,3,4,0.4\n");
  const tider = ["2022-03-13T23:00:00Z", "2022-03-14T00:00:00Z", "2022-03-14T05:00:00Z"];
  const kalla = tider.flatMap((t, i) => [`1001,${t},-${i}.50,0.9,2.5,0.7,0,,${i * 1000}`, `1003,${t},${i}.25,0.8,5,0.2,0.1,,0`]);
  const del = join(d, "metnordic_fylld_2022-03-13_2022-03-14.csv.gz");
  writeFileSync(del, gzipSync(RUBRIK_ANALYS + "\n" + kalla.join("\n") + "\n"));
  const fore = createHash("sha256").update(readFileSync(del)).digest("hex");
  let urls: string[] = [];
  const kallan = (o: { saknas?: string } = {}): Hamtare => async (u) => {
    urls.push(u);
    if (o.saknas && u.includes(o.saknas)) return { buf: new Uint8Array(0), ms: 1 };
    const bas = u.includes("/metpparchivev4/") ? 1_000_000 : 2_000_000, t = Number(/T(\d{2})Z/u.exec(u)![1]);
    const begarda = decodeURIComponent(u.split("?")[1]).split(",").map((x) => x.split(".")[0]);
    return { buf: dapSvar(begarda.map((f) => ({ namn: f, dims: [1, 3, 4], data: Array.from({ length: 12 }, (_, i) => bas + t * 100 + i + 0.0004) }))), ms: 1 };
  };
  const logg = console.log; const tyst = async <T,>(f: () => Promise<T>) => { console.log = () => {}; try { return await f(); } finally { console.log = logg; } };
  k(kallaFor("2022-03-13T23:00:00Z") === "v4" && kallaFor(SKARV) === "arkivet" && filFor("2019-01-15T06:00:00Z").includes("/metpparchivev4/2019/01/15/")
    && filFor("2022-03-14T00:00:00Z").includes("/metpparchive/2022/03/14/") && !filFor("2022-03-14T00:00:00Z").includes("v4"), "källan: v4 före 14/3 2022, arkivet från den");
  const s = await tyst(() => langvagDel(del, join(d, "ut"), join(d, "rutor.csv"), kallan({ saknas: "20220314T05Z" }), 0));
  const ut = gunzipSync(readFileSync(join(d, "ut", "metnordic_lw4_2022-03-13_2022-03-14.csv.gz"))).toString().trim().split("\n");
  k(s.timmar === 3 && s.ur_v4 === 1 && s.ur_arkivet === 1 && JSON.stringify(s.saknas) === JSON.stringify(["2022-03-14T05:00:00Z"]) && s.tomma_varden === 2
    && s.rader === 6 && s.stationer === 2, `delen: en timme ur v4, en ur arkivet, en saknad med två tomma värden: ${JSON.stringify({ ...s, kalla_sha256: undefined, fil_sha256: undefined })}`);
  k(urls.length === 3 && urls[0].includes("/metpparchivev4/2022/03/13/") && urls[0].includes("T23Z") && urls[1].includes("/metpparchive/2022/03/14/")
    && urls.every((u) => { const f = decodeURIComponent(u.split("?")[1]).split(",").map((x) => x.split(".")[0]); return f.length === 1 && f[0] === LANGVAG; }),
    `bara långvågen begärs, en timme i taget ur sin källa: ${urls.map((u) => u.split("?")[0].split("/thredds/")[1] ?? u.split("?")[0]).join(" | ")}`);
  k(ut[0] === RUBRIK_ANALYS && ut.length === 7, `utfilen: analysfilens rubrik och sex rader: ${ut.length}`);
  k(ut[1] === "1001,2022-03-13T23:00:00Z,-0.50,0.9,2.5,0.7,0,1002300,0" && ut[2] === "1003,2022-03-13T23:00:00Z,0.25,0.8,5,0.2,0.1,1002311,0",
    `v4:s värde i sin ruta (1001 i index 0, 1003 i index 11), avrundat som hämtningen: ${ut[1]} | ${ut[2]}`);
  k(ut[3] === "1001,2022-03-14T00:00:00Z,-1.50,0.9,2.5,0.7,0,2000000,1000", `arkivets värde från skarven: ${ut[3]}`);
  k(ut[5] === "1001,2022-03-14T05:00:00Z,-2.50,0.9,2.5,0.7,0,,2000" && ut[6].split(",")[7] === "", `en saknad timme förblir tom: ${ut[5]}`);
  k(ut.slice(1).every((x, i) => { const a = x.split(","), b = kalla[i].split(","); a[7] = ""; return a.join(",") === b.join(","); }),
    "alla andra kolumner och radordningen är källdelens, byte för byte");
  const j = JSON.parse(readFileSync(join(d, "ut", "lw4_2022-03-13_2022-03-14.json"), "utf8"));
  k(j.kalla === basename(del) && j.kalla_sha256 === fore && j.fil === "metnordic_lw4_2022-03-13_2022-03-14.csv.gz" && /^[0-9a-f]{64}$/u.test(j.fil_sha256) && j.skarv === SKARV,
    `lw4_<del>.json: källa, summor och skarven: ${JSON.stringify(j).slice(0, 180)}`);
  k(createHash("sha256").update(readFileSync(del)).digest("hex") === fore, "källdelen står kvar orörd");
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
  console.log("✓ självtest: källan per timme (v4 före 14/3 2022, arkivet från den), bara långvågen begärd, värdet i sin ruta avrundat som hämtningen, en saknad timme tom, allt annat byte för byte källans, källan orörd, en källa med långvåg och en station utan ruta fälls, och planen (den fyllda delen först, de fyra vintrarna)");
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
