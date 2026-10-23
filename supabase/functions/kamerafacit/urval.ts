// Kamerafacitets urval — REN logik, prövad i Node (test/kamerafacit.test.ts). Bengts ja 26/9 till V2 och V3 (DECISIONS #380,
// docs/UTREDNING-FARTKAMEROR-2026-09-26.md §7).
//
// V2: bilden vid väglagskameran närmast varje AKTUELL frysrisk i hela landet — inte bara där en skuggrutt råkar gå. I dagsljus en
//     bild i timmen; i mörker en bild per kamera och natt (den första), eftersom en nattbild mest blir "okänd". Den första bilden
//     efter soluppgång — gryningsbilden — kommer då av sig själv. Tak per dygn.
// V3: tystnadsstickprovet — två bilder i timmen vid kalla stationer UTAN larm, bara i dagsljus. Det enda sättet att se snö där
//     appen teg (tystnadsfelet, #98).

export type Kamera = { id: string; lon: number; lat: number; url: string };
export type Punkt = { id: string; lon: number; lat: number };

export const FARA_M = 15_000;       // samma radie som skuggmotorns facit (archiveFacit)
export const STATION_M = 1_000;     // en kamera "vid" stationen — 738 av 744 står vid en VViS-station (#55)
export const V2_TAK = 150;          // bilder per dygn (UTC) — lagringens värsta fall ≈ 540 MB till 1 mars
/** Högst så många av dygnets V2-bilder får tas i mörker (Bengt 22/10, DECISIONS #676). Mätningen 22/10 (DB-knappen 39791886348):
 *  taket fylldes under första timmen efter midnatt UTC 9 dygn av 11, nästan bara nattbilder, så dagsljuset fick inga. */
export const V2_NATT_TAK = 30;
export const V3_PER_TIMME = 2;

export function haversineM(aLon: number, aLat: number, bLon: number, bLat: number): number {
  const R = 6_371_000, r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Solens höjd över horisonten i grader (NOAA:s förenklade formel, ±1°) — räcker för att skilja natt från dag. */
export function solhojd(lon: number, lat: number, t: Date): number {
  const r = Math.PI / 180;
  const dagar = t.getTime() / 86_400_000 - 10_957.5;                      // dygn sedan J2000.0
  const L = (280.46 + 0.9856474 * dagar) % 360;
  const g = ((357.528 + 0.9856003 * dagar) % 360) * r;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r;
  const eps = (23.439 - 0.0000004 * dagar) * r;
  const dekl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (280.46061837 + 360.98564736629 * dagar) % 360;
  const timvinkel = ((gmst + lon) * r - ra);
  return Math.asin(Math.sin(lat * r) * Math.sin(dekl) + Math.cos(lat * r) * Math.cos(dekl) * Math.cos(timvinkel)) / r;
}

export const dagsljus = (k: { lon: number; lat: number }, t: Date) => solhojd(k.lon, k.lat, t) > 0;

/** V2: kameran närmast varje fara inom FARA_M — en gång per kamera, i farornas ordning. */
export function kamerorVidFaror(faror: Punkt[], kameror: Kamera[]): Kamera[] {
  const ut = new Map<string, Kamera>();
  for (const f of faror) {
    let bast: Kamera | null = null, bd = FARA_M;
    for (const k of kameror) { const d = haversineM(f.lon, f.lat, k.lon, k.lat); if (d < bd) { bd = d; bast = k; } }
    if (bast && !ut.has(bast.id)) ut.set(bast.id, bast);
  }
  return [...ut.values()];
}

/** V2: ska kameran fotas nu? Dagsljus ⇒ ja (en i timmen, vägen dedupar). Mörker ⇒ bara om den inte har någon V2-bild från de
 *  senaste tolv timmarna — en per natt, och en fara som stod redan i eftermiddags får sin nästa bild i gryningen. */
export function taV2(dag: boolean, harNyligBild: boolean): boolean {
  return dag || !harNyligBild;
}

/** V2:s urval för en körning (#676): kamerorna i ordning, dagsljus så länge dygnets tak räcker, mörker bara så länge nattkvoten
 *  (V2_NATT_TAK minus dygnets nattbilder hittills) räcker och kameran inte har en bild från de senaste tolv timmarna. */
export function valjV2(kameror: Kamera[], dag: (k: Kamera) => boolean, harNyligBild: (k: Kamera) => boolean,
                       v2IDag: number, nattIDag: number, tak = V2_TAK, nattTak = V2_NATT_TAK): Kamera[] {
  let platser = Math.max(0, tak - v2IDag), natt = Math.max(0, nattTak - nattIDag);
  const ut: Kamera[] = [];
  for (const k of kameror) {
    if (platser <= 0) break;
    if (dag(k)) { ut.push(k); platser--; }
    else if (natt > 0 && taV2(false, harNyligBild(k))) { ut.push(k); platser--; natt--; }
  }
  return ut;
}

/** Dygnets nattbilder hittills: V2-bilderna vars kamera var i mörker vid bildens timme (`h<N>` i namnet, vag()). */
export function nattbilderIDag(bilder: { k: string; h: number }[], kameror: Kamera[]): number {
  const per = new Map(kameror.map((k) => [k.id, k]));
  return bilder.filter((b) => { const k = per.get(b.k); return k !== undefined && !dagsljus(k, new Date(b.h * 3_600_000)); }).length;
}

/** V3: kameror vid kalla stationer utan larm, i dagsljus — [antal] stycken, deterministiskt valda per timme (samma timme ⇒ samma val). */
export function valjStickprov(kandidater: Kamera[], timme: number, t: Date, antal = V3_PER_TIMME): Kamera[] {
  const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
  return kandidater.filter((k) => dagsljus(k, t))
    .sort((a, b) => hash(`${a.id}:${timme}`) - hash(`${b.id}:${timme}`))
    .slice(0, antal);
}

/** Sökvägen i facit-hinken. `h<N>` = timmen (epoch/3600) — kontaktarket läser den (scripts/kontaktark.py). */
export const vag = (variant: "v2" | "v3", t: Date, kameraId: string) =>
  `${variant}/${t.toISOString().slice(0, 10)}/${kameraId}-h${Math.floor(t.getTime() / 3_600_000)}.jpg`;
