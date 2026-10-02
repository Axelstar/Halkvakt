// SMHI:S RADARARKIV SOM GEOTIFF (kort #232, PLAN-KUVOSEN steg 4, DECISIONS #441). Driftens radarpilot läser kompositen som
// HDF5/ODIM (ingest/radar.ts), men arkivet för vintern 2024/25 har bara png och tif — h5-länken ger 404 (mätt 2/10). Tif-kompositen
// har ett eget rutnät: UTM zon 33 på GRS80 (som SWEREF 99 TM), 471 × 887 pixlar à ~2 015 m, 8 bitar, LZW i remsor.
//
// Läsaren är skriven här i stället för att ta in ett bibliotek: formatet är EN fast sort, och varje antagande om den är en vakt som
// fäller högljutt (RoadNumber-läxan på binärformat — samma princip som radar.ts:s geometrivakter). En fil som inte är exakt den sorten
// avvisas, den tolkas inte.
//
// Pixelvärdet → dBZ med kompositens h5-kodning (gain 0,4, offset −30, 255 = utanför täckning, 0 = inget eko). Att tif bär samma
// kodning är MÄTT, inte antaget: kuvos/radar-vinter.ts --jamfor läser samma tidpunkt ur båda formaten (DECISIONS #441).

export type Tif = { bredd: number; hojd: number; data: Uint8Array; x0: number; y0: number; pixel: number };

/** Projektionen för SMHI:s tif-komposit, i proj4-form. GeoKey 3074 = 16033 är UTM zon 33 N; ellipsoiden är GRS80. */
export const TIF_PROJ = "+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs";

/** TIFF-LZW (MSB först, 9–12 bitar, tidig byteökning). */
export function lzw(inn: Uint8Array, vantat: number): Uint8Array {
  const ut = new Uint8Array(vantat);
  let n = 0, bit = 0, bredd = 9;
  let tabell: Uint8Array[] = [];
  const nollstall = () => { tabell = []; for (let i = 0; i < 256; i++) tabell.push(Uint8Array.of(i)); tabell.push(new Uint8Array(0), new Uint8Array(0)); bredd = 9; };
  const las = () => {
    let v = 0;
    for (let i = 0; i < bredd; i++) {
      const b = bit >> 3;
      if (b >= inn.length) return 257;
      v = (v << 1) | ((inn[b] >> (7 - (bit & 7))) & 1);
      bit++;
    }
    return v;
  };
  nollstall();
  let forra: Uint8Array | null = null;
  for (;;) {
    const kod = las();
    if (kod === 257) break;
    if (kod === 256) { nollstall(); forra = null; continue; }
    let post: Uint8Array;
    if (kod < tabell.length) post = tabell[kod];
    else if (kod === tabell.length && forra) { post = new Uint8Array(forra.length + 1); post.set(forra); post[forra.length] = forra[0]; }
    else throw new Error(`LZW: kod ${kod} utanför tabellen (${tabell.length})`);
    if (n + post.length > vantat) throw new Error(`LZW: mer data än remsan rymmer (${vantat})`);
    ut.set(post, n); n += post.length;
    if (forra) { const ny = new Uint8Array(forra.length + 1); ny.set(forra); ny[forra.length] = post[0]; tabell.push(ny); }
    forra = post;
    if (tabell.length + 1 >= (1 << bredd) && bredd < 12) bredd++;
  }
  if (n !== vantat) throw new Error(`LZW: ${n} byte avkodade, remsan ska ha ${vantat}`);
  return ut;
}

/** Läser SMHI:s radarkomposit som tif. Kastar på allt som inte är exakt den kända sorten. */
export function lasTif(buf: Uint8Array): Tif {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf[0] !== 0x49 || buf[1] !== 0x49 || dv.getUint16(2, true) !== 42) throw new Error("TIF-VAKT: inte en little-endian TIFF");
  const ifd = dv.getUint32(4, true), antal = dv.getUint16(ifd, true);
  const taggar = new Map<number, number[]>();
  const STORLEK: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 12: 8 };
  for (let i = 0; i < antal; i++) {
    const p = ifd + 2 + i * 12;
    const tagg = dv.getUint16(p, true), typ = dv.getUint16(p + 2, true), n = dv.getUint32(p + 4, true);
    const s = STORLEK[typ];
    if (!s) continue;
    const bas = n * s <= 4 ? p + 8 : dv.getUint32(p + 8, true);
    const v: number[] = [];
    for (let k = 0; k < n; k++) {
      const q = bas + k * s;
      v.push(typ === 3 ? dv.getUint16(q, true) : typ === 4 ? dv.getUint32(q, true) : typ === 12 ? dv.getFloat64(q, true) : buf[q]);
    }
    taggar.set(tagg, v);
  }
  const t = (k: number) => { const v = taggar.get(k); if (!v) throw new Error(`TIF-VAKT: tagg ${k} saknas`); return v; };
  const bredd = t(256)[0], hojd = t(257)[0];
  if (t(258)[0] !== 8 || t(259)[0] !== 5 || t(277)[0] !== 1 || (taggar.get(317)?.[0] ?? 1) !== 1)
    throw new Error(`TIF-VAKT: väntade 8 bitar, LZW, en kanal, ingen prediktor — fick ${t(258)} · ${t(259)} · ${t(277)} · ${taggar.get(317)}`);
  const geo = t(34735), nyckel = (k: number) => { for (let i = 4; i < geo.length; i += 4) if (geo[i] === k) return geo[i + 3]; return null; };
  if (nyckel(1024) !== 1 || nyckel(3074) !== 16033)
    throw new Error(`TIF-VAKT: väntade projicerat UTM 33 N (GeoKey 3074 = 16033), fick ${nyckel(1024)} · ${nyckel(3074)}`);
  const [sx, sy] = t(33550), tp = t(33922);
  if (Math.abs(sx - sy) > 0.01 || tp[0] !== 0 || tp[1] !== 0) throw new Error(`TIF-VAKT: pixlarna är inte kvadratiska eller ankaret inte hörnet: ${sx}×${sy}, ${tp}`);
  const rps = t(278)[0], offs = t(273), bytes = t(279);
  const data = new Uint8Array(bredd * hojd);
  for (let i = 0; i < offs.length; i++) {
    const rader = Math.min(rps, hojd - i * rps);
    data.set(lzw(buf.subarray(offs[i], offs[i] + bytes[i]), rader * bredd), i * rps * bredd);
  }
  return { bredd, hojd, data, x0: tp[3], y0: tp[4], pixel: sx };
}

/** Pixelvärdet i (x, y) i tif:ens projektion: null utanför rutnätet. Rad 0 är övre kanten (y0). */
export function pixel(tif: Tif, x: number, y: number): number | null {
  const c = Math.floor((x - tif.x0) / tif.pixel), r = Math.floor((tif.y0 - y) / tif.pixel);
  if (c < 0 || c >= tif.bredd || r < 0 || r >= tif.hojd) return null;
  return tif.data[r * tif.bredd + c];
}
