// SAVED ROUTES (favoriterna steg 2, kort #357; DECISIONS #616, #625). Pure logic, no I/O: the apps keep the file themselves, on the
// phone and outside every backup. Kotlin twin android/engine/.../Rutter.kt and Swift twin HalkvaktEngine/Rutter.swift, proven equal
// by the shared fixture engine/fixtures/rutter.json (scripts/rutter-facit.ts); the numbers are in kontraktsgrinden.
//
// A route is the road the driver actually drove, collected during the trip and offered after it — never an address, never a
// route search on the net. The collector thins the fixes to one point per RUTT_STEG_M (FAVORITER §6: one point per 50–100 m;
// a 34 km commute is a few hundred points, a few kilobytes) and always keeps the last fix, so the route ends where the trip did.
import { haversineM, samplePolyline } from "./geo.ts";
import { farorLangsRutten } from "./rutfilter.ts";
import type { Hazard } from "./types.ts";

/** One kept point per this many metres of driving (FAVORITER §6). */
export const RUTT_STEG_M = 75;
/** At most this many saved routes (DECISIONS #616, 5.2). */
export const MAX_RUTTER = 5;

export type Punkt = [number, number];   // [lon, lat], WGS84

/** Thins a trip's fixes as they arrive: a fix is kept when it lies at least RUTT_STEG_M from the last kept one. */
export class Ruttinsamlare {
  private kept: Punkt[] = [];
  private last: Punkt | null = null;
  private lastKept = false;

  add(lon: number, lat: number): void {
    this.last = [lon, lat];
    const k = this.kept[this.kept.length - 1];
    this.lastKept = !k || haversineM({ lon: k[0], lat: k[1] }, { lon, lat }) >= RUTT_STEG_M;
    if (this.lastKept) this.kept.push(this.last);
  }

  /** The route so far: the kept points, plus the last fix when it was not kept, so the route ends where the trip did. */
  route(): Punkt[] {
    const out = [...this.kept];
    if (this.last && !this.lastKept) out.push(this.last);
    return out;
  }
}

export type SparadRutt = { id: string; namn: string; sparad: string; punkter: Punkt[] };
export type Rutter = { schema: 1; rutter: SparadRutt[] };

/** Adds a route, or answers null when MAX_RUTTER are already saved — the driver removes one first; nothing is pushed out silently. */
export function laggTill(r: Rutter, ny: SparadRutt): Rutter | null {
  if (r.rutter.length >= MAX_RUTTER) return null;
  return { schema: 1, rutter: [...r.rutter, ny] };
}

/** Removes one route by id; an unknown id leaves the list as it is. */
export function taBort(r: Rutter, id: string): Rutter {
  return { schema: 1, rutter: r.rutter.filter((x) => x.id !== id) };
}

/** The name suggestions after a trip (DECISIONS #625): fixed ones and the date. Free text is always possible in the apps. */
export function namnforslag(dag: number, manad: number): string[] {
  return ["Till jobbet", "Hem", `Resa ${dag}/${manad}`];
}

/** Recognising the way home (DECISIONS #637): a new trip that lies along a saved one, in either direction, is the same trip and gets
 *  no new question. Both ways, so that a shorter trip on part of the road is not "the same". */
export const SAMMA_RESA_M = 100;
export const SAMMA_RESA_ANDEL = 0.8;

/** Share of a's points, sampled every SAMMA_RESA_M, that lie within SAMMA_RESA_M of b. */
function andelNara(a: Punkt[], b: Punkt[]): number {
  const prov = samplePolyline(a, SAMMA_RESA_M).map((q, i) => ({ id: `p${i}`, kind: "accident", lon: q.lon, lat: q.lat } as Hazard));
  return prov.length ? farorLangsRutten(prov, b, SAMMA_RESA_M).length / prov.length : 0;
}

/** Is b the same trip as a, in either direction? At least SAMMA_RESA_ANDEL of each lies within SAMMA_RESA_M of the other. */
export function sammaResa(a: Punkt[], b: Punkt[]): boolean {
  return a.length >= 2 && b.length >= 2 && andelNara(a, b) >= SAMMA_RESA_ANDEL && andelNara(b, a) >= SAMMA_RESA_ANDEL;
}
