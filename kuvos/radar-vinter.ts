// KUVÖSENS RADAR (kort #232, PLAN-KUVOSEN steg 4, DECISIONS #441): SMHI:s Sverigekomposit för vintern 2024/25, en per halvtimme,
// samplad mot de 818 väglagssegmenten med DRIFTENS kärna (ingest/radar-karna.ts) och skriven som radar_precip-rader till en fil.
// Grids lagras aldrig, som i driften. Filen läggs i releasen och läses in i kuvösens databas av kuvos/smhi-inlasning.ts.
//
// ARKIVET HAR BARA TIF (mätt 2/10: dagslistningarna för 2024/25 bär png och tif, h5-länken ger 404). Därför tif-läsaren i kuvos/tif.ts
// och läget --jamfor, som bevisar att tif och h5 ger samma rader för samma tidpunkt innan vintern hämtas.
//
// Halvtimmar, inte driftens timtakt: kuvösen stegar i halvtimmar och snapshotens fönster (RADAR_MAX_ALDER_MIN = 70) täcker båda.
//
// Kör:  node --experimental-strip-types kuvos/radar-vinter.ts --jamfor <YYYY-MM-DD> <vaglag.geojson>
//       node --experimental-strip-types kuvos/radar-vinter.ts <vaglag.geojson> <ut.csv.gz> [från] [till]
// Källa: SMHI öppna data (CC BY 4.0).
import { readFileSync, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import proj4 from "proj4";
import { segmentRader, rateFromRaw } from "../ingest/radar-karna.ts";
import { lasTif, pixel, TIF_PROJ } from "./tif.ts";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
const API = "https://opendata-download-radar.smhi.se/api/version/latest/area/sweden/product/comp";
/** Kompositens kodning, som h5-filen deklarerar den (dataset1/data1/what). Att tif delar den bevisas av --jamfor. */
export const KODNING = { gain: 0.4, offset: -30, nodata: 255, undetect: 0 };

const tvaSiffror = (n: number) => String(n).padStart(2, "0");
export function tifUrl(t: Date): string {
  const y = t.getUTCFullYear(), m = tvaSiffror(t.getUTCMonth() + 1), d = tvaSiffror(t.getUTCDate());
  return `${API}/${y}/${m}/${d}/radar_${String(y).slice(2)}${m}${d}${tvaSiffror(t.getUTCHours())}${tvaSiffror(t.getUTCMinutes())}.tif`;
}

export function segmentFil(fil: string): { id: string; line: [number, number][] }[] {
  const g = JSON.parse(readFileSync(fil, "utf8"));
  return g.features.filter((f: any) => f.geometry?.type === "LineString")
    .map((f: any) => ({ id: String(f.properties.segment_id), line: f.geometry.coordinates }));
}

const tillTif = proj4("EPSG:4326", TIF_PROJ);
export function tifRate(buf: Uint8Array) {
  const tif = lasTif(buf);
  return (lon: number, lat: number) => {
    const [x, y] = tillTif.forward([lon, lat]);
    const raw = pixel(tif, x, y);
    return raw === null ? null : rateFromRaw(raw, KODNING);
  };
}

async function hamta(url: string): Promise<Uint8Array | null> {
  // SMHI svarar 429 på för täta hämtningar (mätt 2/10 vid åtta parallella). Retry-After respekteras, annars växande väntan.
  for (let forsok = 0; forsok < 8; forsok++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 404) return null;
      if (r.status === 429) {
        const vanta = Number(r.headers.get("retry-after")) || 10 * (forsok + 1);
        await new Promise((ok) => setTimeout(ok, vanta * 1000));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    } catch (e) {
      if (forsok === 7) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * (forsok + 1)));
    }
  }
  throw new Error(`${url}: fortfarande 429 efter åtta försök`);
}

// ── --jamfor: samma tidpunkt ur h5 (driftens format, läst som radar.ts läser den) och ur tif. Raderna ska vara desamma.
async function jamfor(dag: string, segFil: string) {
  const h5wasm = (await import("h5wasm")).default;
  const Module: any = await h5wasm.ready;
  const segments = segmentFil(segFil);
  const lista: any = await (await fetch(`${API}/${dag.replaceAll("-", "/")}.json`, { headers: { "User-Agent": UA } })).json();
  const h5 = new Map<string, string>(), tif = new Map<string, string>();
  for (const f of lista.files ?? []) for (const x of f.formats ?? []) {
    if (x.key === "h5") h5.set(f.valid, x.link);
    if (x.key === "tif") tif.set(f.valid, x.link);
  }
  const tider = [...h5.keys()].filter((v) => tif.has(v) && /:(00|30)$/.test(v)).sort();
  console.log(`--jamfor ${dag}: ${tider.length} halvtimmar med både h5 och tif`);
  let lika = 0, baraH5 = 0, baraTif = 0, diffSum = 0, diffN = 0, diffMax = 0;
  for (const v of tider) {
    // h5 som driften läser den (ingest/radar.ts §2) — bara för provet, aldrig för vintern.
    Module.FS.writeFile("j.h5", (await hamta(h5.get(v)!))!);
    const file = new h5wasm.File("j.h5", "r");
    const a = (g: any, n: string) => { const x = g?.attrs?.[n]?.value; return Number(Array.isArray(x) || ArrayBuffer.isView(x) ? (x as any)[0] : x); };
    const where: any = file.get("where"), dw: any = file.get("dataset1/data1/what");
    const projdef = String(where.attrs.projdef.value);
    const xscale = a(where, "xscale"), yscale = a(where, "yscale");
    const toGrid = proj4("EPSG:4326", projdef);
    const [xll] = toGrid.forward([a(where, "LL_lon"), a(where, "LL_lat")]);
    const [, yur] = toGrid.forward([a(where, "UR_lon"), a(where, "UR_lat")]);
    const k = { gain: a(dw, "gain"), offset: a(dw, "offset"), nodata: a(dw, "nodata"), undetect: a(dw, "undetect") };
    if (k.gain !== KODNING.gain || k.offset !== KODNING.offset || k.nodata !== KODNING.nodata || k.undetect !== KODNING.undetect)
      throw new Error(`h5:s kodning ${JSON.stringify(k)} skiljer sig från KODNING — tif-antagandet måste prövas om`);
    const ds: any = file.get("dataset1/data1/data"); const data = ds.value as Uint8Array; const [rows, cols] = ds.shape as number[];
    const h5Rate = (lon: number, lat: number) => {
      const [x, y] = toGrid.forward([lon, lat]);
      const c = Math.floor((x - xll) / xscale), r = Math.floor((yur - y) / yscale);
      if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
      return rateFromRaw(data[r * cols + c], k);
    };
    const A = segmentRader(segments, h5Rate);
    file.close();
    const B = segmentRader(segments, tifRate((await hamta(tif.get(v)!))!));
    const am = new Map(A.ids.map((id, i) => [id, A.means[i]])), bm = new Map(B.ids.map((id, i) => [id, B.means[i]]));
    let l = 0;
    for (const [id, m] of am) if (bm.has(id)) { l++; const d = Math.abs(m - bm.get(id)!); diffSum += d; diffN++; diffMax = Math.max(diffMax, d); }
    lika += l; baraH5 += am.size - l; baraTif += bm.size - l;
    console.log(`  ${v}: h5 ${A.events} segment med regn, tif ${B.events}, båda ${l} · utanför täckning h5 ${A.outside}, tif ${B.outside} av ${A.sampled}`);
  }
  const alla = lika + baraH5 + baraTif;
  console.log(`SUMMA: ${alla} segmenthändelser · i båda ${lika} (${alla ? Math.round((lika / alla) * 1000) / 10 : 0} %) · bara h5 ${baraH5} · bara tif ${baraTif}`);
  console.log(`  medelregnets skillnad där båda ser regn: medel ${diffN ? (diffSum / diffN).toFixed(3) : "—"} mm/h, största ${diffMax.toFixed(2)} mm/h`);
}

// ── Vintern: varje halvtimme, några hämtningar åt gången, raderna till en gzip-fil i tidsordning.
async function vintern(segFil: string, utFil: string, fran: Date, till: Date) {
  const segments = segmentFil(segFil);
  const tider: Date[] = [];
  for (let t = fran.getTime(); t <= till.getTime(); t += 30 * 60_000) tider.push(new Date(t));
  const gz = createGzip(); const ut = gz.pipe(createWriteStream(utFil));
  gz.write("segment_id,observed_at,rate_max_mmh,rate_mean_mmh\n");
  const perManad = new Map<string, { filer: number; saknas: number; rader: number }>();
  const PARALLELLT = 2;
  for (let i = 0; i < tider.length; i += PARALLELLT) {
    const grupp = tider.slice(i, i + PARALLELLT);
    const svar = await Promise.all(grupp.map(async (t) => ({ t, buf: await hamta(tifUrl(t)) })));
    for (const { t, buf } of svar) {
      const man = t.toISOString().slice(0, 7);
      const m = perManad.get(man) ?? { filer: 0, saknas: 0, rader: 0 }; perManad.set(man, m);
      if (!buf) { m.saknas++; continue; }
      m.filer++;
      const r = segmentRader(segments, tifRate(buf));
      for (let k = 0; k < r.ids.length; k++) gz.write(`${r.ids[k]},${t.toISOString()},${r.maxes[k]},${r.means[k]}\n`);
      m.rader += r.ids.length;
    }
    if ((i / PARALLELLT) % 100 === 0) console.log(`  … ${grupp[0].toISOString()}`);
  }
  await new Promise<void>((ok) => { ut.on("finish", () => ok()); gz.end(); });
  console.log(`radar för vintern: ${segments.length} segment, ${tider.length} halvtimmar`);
  console.log("månad    kompositer  saknas  rader (segment med regn)");
  for (const [man, m] of [...perManad].sort()) console.log(`${man}  ${String(m.filer).padStart(10)}  ${String(m.saknas).padStart(6)}  ${String(m.rader).padStart(8)}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const a = process.argv.slice(2);
  if (a[0] === "--jamfor") await jamfor(a[1], a[2]);
  else if (a.length >= 2) await vintern(a[0], a[1], new Date(a[2] ?? "2024-10-31T22:00:00Z"), new Date(a[3] ?? "2025-03-31T23:30:00Z"));
  else { console.error("användning: se huvudet"); process.exit(1); }
}
