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
