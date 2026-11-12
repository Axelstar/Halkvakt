// Minimal geodesy for the alert engine. WGS84 throughout, metres out.
// Haversine is accurate to ~0.5 % — far inside our tolerances (alerts are 100s of metres).

const R = 6_371_000; // mean Earth radius, metres
const D2R = Math.PI / 180;

export interface LonLat { lon: number; lat: number; }

export function haversineM(a: LonLat, b: LonLat): number {
  const dLat = (b.lat - a.lat) * D2R;
  const dLon = (b.lon - a.lon) * D2R;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Initial great-circle bearing a→b, degrees [0, 360). */
export function bearingDeg(a: LonLat, b: LonLat): number {
  const φ1 = a.lat * D2R, φ2 = b.lat * D2R, dλ = (b.lon - a.lon) * D2R;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  const θ = Math.atan2(y, x) / D2R;
  return (θ + 360) % 360;
}

/** Metres from p to the straight segment a–b, in a flat plane around p (equirectangular, the Earth radius above). Exact enough for
 *  the small roads' road test (DECISIONS #844), whose lines are at most a few kilometres and whose margin is 80 m. The same
 *  arithmetic in Engine.kt and Engine.swift, step for step. */
export function distToSegmentM(p: LonLat, a: LonLat, b: LonLat): number {
  const kx = R * D2R * Math.cos(p.lat * D2R), ky = R * D2R;
  const ax = (a.lon - p.lon) * kx, ay = (a.lat - p.lat) * ky;
  const dx = (b.lon - a.lon) * kx, dy = (b.lat - a.lat) * ky;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Absolute angular difference, degrees [0, 180]. */
export function angDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Is point p inside the forward corridor from `pos` along `headingDeg`?
 * Very-near points (< nearM) count as ahead: bearing is numerically unstable there,
 * and something 20 m away is on top of us regardless of angle.
 */
export function isAhead(
  pos: LonLat, headingDeg_: number, p: LonLat, halfAngleDeg: number, nearM = 30,
): { ahead: boolean; distM: number } {
  const distM = haversineM(pos, p);
  if (distM < nearM) return { ahead: true, distM };
  const ahead = angDiffDeg(bearingDeg(pos, p), headingDeg_) <= halfAngleDeg;
  return { ahead, distM };
}

export interface Box { minLon: number; maxLon: number; minLat: number; maxLat: number; }

/** The smallest lon/lat box around the points (an empty list gives an infinitely distant box). */
export function boxOf(pts: LonLat[]): Box {
  const b = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
  for (const p of pts) {
    if (p.lon < b.minLon) b.minLon = p.lon;
    if (p.lon > b.maxLon) b.maxLon = p.lon;
    if (p.lat < b.minLat) b.minLat = p.lat;
    if (p.lat > b.maxLat) b.maxLat = p.lat;
  }
  return b;
}

/**
 * A lower bound on haversineM(p, q) for every q in the box — never more than the true distance (kort #375). The larger of two
 * bounds: the latitude gap alone (s ≥ sin²(Δφ/2)), and the longitude gap at the most poleward latitude involved
 * (s ≥ cos φ₁ cos φ₂ sin²(Δλ/2) ≥ cos² φmax sin²(Δλ/2)).
 */
export function minDistToBoxM(p: LonLat, b: Box): number {
  const dLat = p.lat < b.minLat ? b.minLat - p.lat : p.lat > b.maxLat ? p.lat - b.maxLat : 0;
  const dLon = p.lon < b.minLon ? b.minLon - p.lon : p.lon > b.maxLon ? p.lon - b.maxLon : 0;
  const latMax = Math.max(Math.abs(p.lat), Math.abs(b.minLat), Math.abs(b.maxLat));
  const lonM = 2 * R * Math.asin(Math.min(1, Math.cos(latMax * D2R) * Math.sin(Math.min(Math.PI, dLon * D2R) / 2)));
  return Math.max(R * dLat * D2R, lonM);
}

/**
 * Half-widths in degrees of a lat/lon window around the points that holds every position within distM of one of them — the
 * engine's grid (DECISIONS #795). Exact for a position with latitude in [−90, 90] and longitude in [−180, 180], from the haversine
 * sum s = sin²(Δφ/2) + cos φ₁ cos φ₂ sin²(Δλ/2) and d = 2R·asin √s with d ≤ distM < πR:
 *   · s ≥ sin²(Δφ/2) gives d ≥ R|Δφ|, so |Δφ| ≤ distM / R = dLat;
 *   · both latitudes then lie in the window, where cos φ ≥ cos φmax > 0, so |sin(Δλ/2)| ≤ sin(distM / 2R) / cos φmax = k;
 *   · k < 1 leaves |Δλ| ≤ 2·asin k = dLon or |Δλ| ≥ 360° − dLon, and the second needs a longitude outside [−180, 180] when every
 *     point's |lon| + dLon < 180 (no way round the back of the antimeridian).
 * null when no window proves anything — distM not in [0, πR), the window reaching a pole (φmax ≥ 90° or k ≥ 1) or the
 * antimeridian, or no finite point — and the caller must then treat the points as reachable from everywhere. A point with a
 * non-finite coordinate is skipped: haversineM is NaN for it, and NaN is never within a distance.
 */
export function reachWindow(pts: LonLat[], distM: number): { dLat: number; dLon: number } | null {
  if (!(distM >= 0 && distM < Math.PI * R)) return null;
  let minLat = Infinity, maxLat = -Infinity, maxAbsLon = -Infinity;
  for (const p of pts) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (Math.abs(p.lon) > maxAbsLon) maxAbsLon = Math.abs(p.lon);
  }
  const dLat = distM / R / D2R;
  const latMax = Math.max(Math.abs(minLat - dLat), Math.abs(maxLat + dLat));
  if (!(latMax < 90)) return null;
  const k = Math.sin(distM / (2 * R)) / Math.cos(latMax * D2R);
  if (!(k < 1)) return null;
  const dLon = (2 * Math.asin(k)) / D2R;
  if (!(maxAbsLon + dLon < 180)) return null;
  return { dLat, dLon };
}

/** Resample a polyline to points at most stepM apart (vertices always included). */
export function samplePolyline(line: [number, number][], stepM: number): LonLat[] {
  const out: LonLat[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = { lon: line[i][0], lat: line[i][1] };
    out.push(a);
    if (i === line.length - 1) break;
    const b = { lon: line[i + 1][0], lat: line[i + 1][1] };
    const segLen = haversineM(a, b);
    const n = Math.floor(segLen / stepM);
    for (let k = 1; k <= n; k++) {
      const f = (k * stepM) / segLen;
      if (f >= 1) break;
      // Linear interpolation in lon/lat — fine at ≤100 m steps in Sweden.
      out.push({ lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f });
    }
  }
  return out;
}
