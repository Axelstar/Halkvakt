// Småvägsröstens punktfil och besked → SmavagHazard (DECISIONS #828 byggsteg 7, #844). THE reference for the apps' readers
// (Kotlin SmavagFil.kt in the app, Swift SmavagFil.swift in HalkvaktEngine); all three are held to engine/fixtures/smavagprov.json.
// The point file (smavag.json, ingest/smavagspunkter-db.ts) lists every small-road point once, in the order of the bits in
// live.json's `smavag` (publish/snapshot-core.ts smavagBitar: bit i is point i, eight per byte, the first point in the lowest bit,
// base64). Schema 2 adds each point's road (`vag`) and its place along the road (`ordning`).
//
// Silence is a feature: an unknown schema, a besked made for another file, a wrong point count, a wrong byte count or a value that is
// not a whole number gives no hazards at all — never a guess. Only roads with at least one warning point become hazards, and a road
// with a single point is left out, since the engine's road test needs a line between two neighbours and could never let it speak.
// Kept out of snapshot.ts on purpose: the functions bundle snapshot.ts, and the point file is read by the apps only.
import type { SmavagHazard } from "./types.ts";

/** smavag.json, schema 2: the points' positions in the bits' order, and for each point its road and place along the road. */
export interface SmavagFil { schema: number; punkter: [number, number][]; vag?: number[]; ordning?: number[] }
/** live.json's `smavag`: the point file's sha256, the number of points and the warning points as bits in base64. */
export interface SmavagBesked { fil: string; n: number; bitar: string }

export function smavagHazards(fil: SmavagFil | null | undefined, besked: SmavagBesked | null | undefined,
                              filSha: string | null | undefined): SmavagHazard[] {
  if (!fil || !besked || !filSha || fil.schema !== 2 || besked.fil !== filSha) return [];
  const n = fil.punkter.length, vag = fil.vag, ord = fil.ordning;
  if (!vag || !ord || besked.n !== n || vag.length !== n || ord.length !== n) return [];
  for (let i = 0; i < n; i++) if (!Number.isInteger(vag[i]) || !Number.isInteger(ord[i])) return [];
  let bytes: string;
  try { bytes = atob(besked.bitar); } catch { return []; }
  if (bytes.length !== Math.ceil(n / 8)) return [];
  const varnar = (i: number) => ((bytes.charCodeAt(i >> 3) >> (i & 7)) & 1) === 1;
  const varnandeVagar = new Set<number>();
  for (let i = 0; i < n; i++) if (varnar(i)) varnandeVagar.add(vag[i]);
  const perVag = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (!varnandeVagar.has(vag[i])) continue;
    let l = perVag.get(vag[i]);
    if (!l) perVag.set(vag[i], (l = []));
    l.push(i);
  }
  const out: SmavagHazard[] = [];
  for (const v of [...perVag.keys()].sort((a, b) => a - b)) {
    const idx = perVag.get(v)!.sort((a, b) => ord[a] - ord[b]);
    if (idx.length < 2) continue;
    const warn: number[] = [];
    idx.forEach((i, j) => { if (varnar(i)) warn.push(j); });
    out.push({ id: `smv:${v}`, kind: "smavag", points: idx.map((i) => fil.punkter[i]), warn });
  }
  return out;
}
