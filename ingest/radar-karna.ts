// Radarns kärna (kort #43 steg 3, DECISIONS #60): det som gör en komposit till rader i radar_precip — Z–R, provpunkterna längs
// segmenten och händelsegränsen. Delad mellan driftens pilot (ingest/radar.ts, h5) och kuvösens vinter (kuvos/radar-vinter.ts, tif,
// DECISIONS #441), så att kuvösen räknar EXAKT som driften. Ren logik, inget I/O.

export const SAMPLE_KM = 2;        // samma steg som ankaranalysen
export const MIN_RATE_MMH = 0.1;   // händelsegräns: under detta skrivs inget

/** Kompositens pixelvärde → regn (mm/h). null = utanför täckning, 0 = täckt utan eko. dBZ → regn via Marshall–Palmer
 *  (Z = 200·R^1.6) — pilotens enkla standardval, kalibreras mot stationernas rain_sum_mm i v3, inte gissas bättre här. */
export function rateFromRaw(raw: number, k: { gain: number; offset: number; nodata: number; undetect: number }): number | null {
  if (raw === k.nodata) return null;       // utanför radartäckning
  if (raw === k.undetect) return 0;        // täckt, inget eko
  const dbz = raw * k.gain + k.offset;
  return Math.pow(Math.pow(10, dbz / 10) / 200, 1 / 1.6);
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export function sampleLine(line: [number, number][], stepKm: number): [number, number][] {
  const out: [number, number][] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const d = haversineKm(line[i], line[i + 1]);
    if (d === 0) continue;
    let t = carry;
    while (t < d) {
      const f = t / d;
      out.push([line[i][0] + (line[i + 1][0] - line[i][0]) * f, line[i][1] + (line[i + 1][1] - line[i][1]) * f]);
      t += stepKm;
    }
    carry = t - d;
  }
  if (line.length) out.push(line[line.length - 1]);
  return out;
}

/** Segmenten mot en komposit: händelsefiltrerade rader (max och medel, två decimaler) och räknarna till bevisraden. */
export function segmentRader(segments: { id: string; line: [number, number][] }[], rateAt: (lon: number, lat: number) => number | null) {
  let events = 0, sampled = 0, outside = 0, maxRate = 0;
  const ids: string[] = [], maxes: number[] = [], means: number[] = [];
  for (const seg of segments) {
    let mx = 0, sum = 0, n = 0;
    for (const p of sampleLine(seg.line, SAMPLE_KM)) {
      const rr = rateAt(p[0], p[1]);
      sampled++;
      if (rr === null) { outside++; continue; }
      mx = Math.max(mx, rr); sum += rr; n++;
    }
    if (n > 0 && mx >= MIN_RATE_MMH) {
      events++; maxRate = Math.max(maxRate, mx);
      ids.push(seg.id); maxes.push(Math.round(mx * 100) / 100); means.push(Math.round((sum / n) * 100) / 100);
    }
  }
  return { ids, maxes, means, events, sampled, outside, maxRate };
}

/** Storstädernas grupper mot en komposit (sql/090, DECISIONS #804, kort #378): radarn läses i varje stadspunkt, inte längs en linje,
 *  eftersom en grupp kan rymma flera vägar eller gator. Samma händelsegräns och avrundning som segmentRader. */
export function gruppRader(grupper: { id: string; punkter: [number, number][] }[], rateAt: (lon: number, lat: number) => number | null) {
  let events = 0, sampled = 0, outside = 0, maxRate = 0;
  const ids: string[] = [], maxes: number[] = [], means: number[] = [];
  for (const g of grupper) {
    let mx = 0, sum = 0, n = 0;
    for (const p of g.punkter) {
      const rr = rateAt(p[0], p[1]);
      sampled++;
      if (rr === null) { outside++; continue; }
      mx = Math.max(mx, rr); sum += rr; n++;
    }
    if (n > 0 && mx >= MIN_RATE_MMH) {
      events++; maxRate = Math.max(maxRate, mx);
      ids.push(g.id); maxes.push(Math.round(mx * 100) / 100); means.push(Math.round((sum / n) * 100) / 100);
    }
  }
  return { ids, maxes, means, events, sampled, outside, maxRate };
}

/** Småvägsröstens radar (sql/104, DECISIONS #828, kort #647): punkterna i smavagspunkt (sql/103) läses i bitar om högst BIT punkter i
 *  följd längs sin väg, och varje bit blir en grupp i gruppRader. Biten är `<väg>-<ordning div BIT>`; regeln (steg 5) ska dela på
 *  samma sätt och läsa den här konstanten, inte en egen kopia. Gallringen håller två timmar, eftersom regeln läser den senaste timmen. */
export const SMAVAG_BIT = 5;
export const SMAVAG = {
  grupper: `SELECT vag || '-' || (ordning / ${SMAVAG_BIT}) AS bit, array_agg(ARRAY[lon, lat] ORDER BY ordning) AS p FROM smavagspunkt GROUP BY 1`,
  skriv: `INSERT INTO radar_smavag (bit, observed_at, rate_max_mmh, rate_mean_mmh)
    SELECT u.bit, $2::timestamptz, u.mx, u.mn FROM UNNEST($1::text[], $3::numeric[], $4::numeric[]) AS u(bit, mx, mn)
    ON CONFLICT (bit, observed_at) DO NOTHING`,
  gallra: `DELETE FROM radar_smavag WHERE observed_at < now() - interval '2 hours'`,
};

/** Radarn kring stationerna (sql/130, DECISIONS #917; halkvakt-kuvos F61 §12): driftkontrollen av småvägsrösten prövar röstens hela fukt,
 *  den strängare N3 eller radarn, vid stationerna. Ytan är kompositens pixlar vars mitt ligger högst STATION_RADIE_M från stationen, mätt
 *  i kompositens projektion: halva längden av en bit om SMAVAG_BIT punkter, omkring 4,5 km. Värdet är max och medel över ytans täckta
 *  pixlar, med samma händelsegräns och avrundning som gruppRader. Gallringen håller fyra dygn: dygnsrapporten lägger varje dygn i den
 *  privata hinken morgonen efter och räknar ikapp två dygn bakåt (kuvos-smavag-uppfoljning.yml). */
export const STATION_RADIE_M = 2250;
export type Rutnat = { cols: number; rows: number; x0: number; y0: number; xscale: number; yscale: number };

/** Ytan kring varje station: index (rad · cols + kolumn) för pixlarna vars mitt ligger högst `radie` från stationen. x0 och y0 är
 *  rutnätets västra och övre kant i projektionen, rad 0 överst, som rateAt i radar.ts. En station utan pixel i rutnätet får ingen yta. */
export function stationsytor(stationer: { id: string; lon: number; lat: number }[], g: Rutnat,
                             forward: (p: [number, number]) => number[], radie = STATION_RADIE_M): Map<string, number[]> {
  const ut = new Map<string, number[]>();
  for (const s of stationer) {
    const [x, y] = forward([s.lon, s.lat]);
    const c0 = Math.max(0, Math.floor((x - radie - g.x0) / g.xscale) - 1), c1 = Math.min(g.cols - 1, Math.floor((x + radie - g.x0) / g.xscale) + 1);
    const r0 = Math.max(0, Math.floor((g.y0 - y - radie) / g.yscale) - 1), r1 = Math.min(g.rows - 1, Math.floor((g.y0 - y + radie) / g.yscale) + 1);
    const idx: number[] = [];
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (Math.hypot(g.x0 + (c + 0.5) * g.xscale - x, g.y0 - (r + 0.5) * g.yscale - y) <= radie - 2) idx.push(r * g.cols + c);
    if (idx.length) ut.set(s.id, idx);
  }
  return ut;
}

/** Stationerna mot en komposit: max och medel över ytans täckta pixlar (rate(i) null = utanför täckningen), händelsefiltrerat och
 *  avrundat som gruppRader. */
export function stationRader(ytor: Map<string, number[]>, rate: (i: number) => number | null) {
  const ids: string[] = [], maxes: number[] = [], means: number[] = [];
  for (const [id, yta] of ytor) {
    let mx = 0, sum = 0, n = 0;
    for (const i of yta) {
      const rr = rate(i);
      if (rr === null) continue;
      mx = Math.max(mx, rr); sum += rr; n++;
    }
    if (n > 0 && mx >= MIN_RATE_MMH) { ids.push(id); maxes.push(Math.round(mx * 100) / 100); means.push(Math.round((sum / n) * 100) / 100); }
  }
  return { ids, maxes, means };
}

/** Satserna för radar_station och radar_station_komposit (sql/130). skriv lägger kompositens rad och stationernas i EN sats, så att en
 *  komposit aldrig står läst utan sina rader; samma komposit en gång till ändrar inget (timmens körning och kvartens kan läsa samma). */
export const STATION = {
  finns: `SELECT to_regclass('public.radar_station_komposit') IS NOT NULL AS ja`,
  skriv: `WITH k AS (INSERT INTO radar_station_komposit (observed_at) VALUES ($2::timestamptz) ON CONFLICT (observed_at) DO NOTHING)
    INSERT INTO radar_station (station_id, observed_at, rate_max_mmh, rate_mean_mmh)
    SELECT u.id, $2::timestamptz, u.mx, u.mn FROM UNNEST($1::text[], $3::numeric[], $4::numeric[]) AS u(id, mx, mn)
    ON CONFLICT (station_id, observed_at) DO NOTHING`,
  gallra: `DELETE FROM radar_station WHERE observed_at < now() - interval '4 days'`,
  gallraKompositer: `DELETE FROM radar_station_komposit WHERE observed_at < now() - interval '4 days'`,
};
