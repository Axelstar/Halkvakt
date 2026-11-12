// Småvägsröstens punktfil och besked → SmavagHazard (DECISIONS #828 byggsteg 7, #844). THE reference for the apps' readers
// (Kotlin SmavagFil.kt in the app, Swift SmavagFil.swift in HalkvaktEngine); all three are held to engine/fixtures/smavagprov.json.
// The point file (smavag.json, ingest/smavagspunkter-db.ts) lists every small-road point once, in the order of the bits in
// live.json's `smavag` (publish/snapshot-core.ts smavagBitar: bit i is point i, eight per byte, the first point in the lowest bit,
// base64). Schema 2 adds each point's road (`vag`) and its place along the road (`ordning`).
//
// Silence is a feature: an unknown schema, a besked made for another file, a wrong point count, a wrong byte count, a value that is
// not a whole number or a broken end gives no hazards at all — never a guess. Only roads with at least one warning point become
// hazards. `andar` (DECISIONS #847) holds each road's two ends, 200 m in from the junctions: they go first and last on the road and
// never warn, and they give the engine's road test a line also on a road with a single point. A road left with fewer than two
// points (no ends, one point) is left out, since the road test could never let it speak.
// Kept out of snapshot.ts on purpose: the functions bundle snapshot.ts, and the point file is read by the apps only.
import type { SmavagHazard } from "./types.ts";

/** smavag.json, schema 2: the points' positions in the bits' order, and for each point its road and place along the road. */
export interface SmavagFil { schema: number; punkter: [number, number][]; vag?: number[]; ordning?: number[];
                             andar?: Record<string, [number, number, number, number]> }
/** live.json's `smavag`: the point file's sha256, the number of points and the warning points as bits in base64. */
export interface SmavagBesked { fil: string; n: number; bitar: string }

export function smavagHazards(fil: SmavagFil | null | undefined, besked: SmavagBesked | null | undefined,
                              filSha: string | null | undefined): SmavagHazard[] {
  if (!fil || !besked || !filSha || fil.schema !== 2 || besked.fil !== filSha) return [];
  const n = fil.punkter.length, vag = fil.vag, ord = fil.ordning;
  if (!vag || !ord || besked.n !== n || vag.length !== n || ord.length !== n) return [];
  for (let i = 0; i < n; i++) if (!Number.isInteger(vag[i]) || !Number.isInteger(ord[i])) return [];
  const andar = fil.andar;
  if (andar !== undefined) {
    if (!andar || typeof andar !== "object" || Array.isArray(andar)) return [];
    for (const [k, a] of Object.entries(andar))
      if (!/^\d+$/.test(k) || !Array.isArray(a) || a.length !== 4 || !a.every((x) => typeof x === "number" && Number.isFinite(x))) return [];
  }
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
    const a = andar?.[String(v)];
    const points: [number, number][] = [...(a ? [[a[0], a[1]] as [number, number]] : []), ...idx.map((i) => fil.punkter[i]),
                                        ...(a ? [[a[2], a[3]] as [number, number]] : [])];
    if (points.length < 2) continue;
    const forst = a ? 1 : 0, warn: number[] = [];
    idx.forEach((i, j) => { if (varnar(i)) warn.push(j + forst); });
    out.push({ id: `smv:${v}`, kind: "smavag", points, warn });
  }
  return out;
}
