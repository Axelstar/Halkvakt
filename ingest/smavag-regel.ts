// SMÅVÄGSRÖSTENS REGEL UTANFÖR DATABASEN (DECISIONS #843, kort #647; halkvakt-kuvos F57 §9 punkt 3). Samma beslut som sql/105
// smavag_regel(): en punkt med rad i timmen (regel D säger fryser) varnar när den strängare N3 säger fukt, eller när radarn i punktens
// bit har ett medel på minst RADAR_MMH mm/h i någon komposit de senaste RADAR_MIN minuterna; annars är den torr. Backtesten räknar
// timmens underlag med den, och `smavag-live-db.ts jamfor` prövar varje timme i drift att den ger samma underlag som databasen.
// Gränserna är kopior av sql/105 och vaktas av kontraktsgrinden; biten är radar-karna.ts SMAVAG_BIT, utan egen kopia.
// Flyttalen: radar.ts skriver medlen som JavaScript-tal till numeric, alltså med talets kortaste decimalform, och den läses tillbaka
// till exakt samma tal. Jämförelsen mot 0,1 ger då samma svar i båda språken (närmaste tal under 0,1 skrivs 0.09999999999999999).
//   node --experimental-strip-types ingest/smavag-regel.ts --sjalvtest
import { pathToFileURL } from "node:url";
import { SMAVAG_BIT } from "./radar-karna.ts";

export const RADAR_MMH = 0.1;
export const RADAR_MIN = 60;

export type Punkt = { vag: string; ordning: number };
export type Radarrad = { bit: string; observed_at: Date; rate_mean_mmh: number };
export type Underlagsrad = { punkt: string; ned: boolean; radar_mmh: number | null };

/** Punktens radarbit, `<väg>-<ordning div SMAVAG_BIT>`, som sql/105 och radar-karna.ts. */
export function bit(p: Punkt): string {
  return `${p.vag}-${Math.floor(p.ordning / SMAVAG_BIT)}`;
}

/** Varje bits högsta medel bland kompositerna efter nu − RADAR_MIN minuter (strikt efter, som `>` i sql/105). */
export function radarPerBit(rr: Radarrad[], nu: Date): Map<string, number> {
  const fran = nu.getTime() - RADAR_MIN * 60e3;
  const m = new Map<string, number>();
  for (const r of rr) {
    if (r.observed_at.getTime() <= fran) continue;
    const f = m.get(r.bit);
    if (f === undefined || r.rate_mean_mmh > f) m.set(r.bit, r.rate_mean_mmh);
  }
  return m;
}

/** Timmens varnande punkter i id-ordning (som underlaget i smavag-live-db.ts): N3 eller radarn i biten. Raderna är regel D:s
 *  punkter som fryser; en punkt utan läge i `punkter` tas inte med, som JOIN:en i sql/105. */
export function varnande(rader: { punkt: string; ned: boolean }[], punkter: Map<string, Punkt>, radar: Map<string, number>): Underlagsrad[] {
  const ut: Underlagsrad[] = [];
  for (const r of rader) {
    const p = punkter.get(r.punkt);
    if (!p) continue;
    const mmh = radar.get(bit(p)) ?? null;
    if (r.ned || (mmh ?? 0) >= RADAR_MMH) ut.push({ punkt: r.punkt, ned: r.ned, radar_mmh: mmh });
  }
  return ut.sort((a, b) => (a.punkt < b.punkt ? -1 : a.punkt > b.punkt ? 1 : 0));
}

function sjalvtest(): number {
  const fel: string[] = [];
  const nu = new Date("2026-11-12T10:20:00Z");
  const fore = (min: number) => new Date(nu.getTime() - min * 60e3);
  if (bit({ vag: "v00001", ordning: 4 }) !== "v00001-0" || bit({ vag: "v00001", ordning: 5 }) !== "v00001-1") fel.push("biten delar vid 5");
  const radar = radarPerBit([
    { bit: "v1-0", observed_at: fore(10), rate_mean_mmh: 0.05 },
    { bit: "v1-0", observed_at: fore(40), rate_mean_mmh: 0.1 },
    { bit: "v2-0", observed_at: fore(60), rate_mean_mmh: 5 },
    { bit: "v3-0", observed_at: fore(59.9), rate_mean_mmh: 0.09999999999999999 },
  ], nu);
  if (radar.get("v1-0") !== 0.1) fel.push("bitens högsta medel i fönstret");
  if (radar.has("v2-0")) fel.push("en komposit exakt 60 minuter bort är utanför, som > i sql/105");
  if (radar.get("v3-0") !== 0.09999999999999999) fel.push("en komposit strax innanför fönstret");
  const punkter = new Map<string, Punkt>([
    ["r00002", { vag: "v1", ordning: 0 }], ["r00001", { vag: "v2", ordning: 0 }], ["r00003", { vag: "v3", ordning: 3 }],
    ["r00004", { vag: "v4", ordning: 0 }],
  ]);
  const u = varnande([
    { punkt: "r00002", ned: false }, { punkt: "r00001", ned: true }, { punkt: "r00003", ned: false },
    { punkt: "r00004", ned: false }, { punkt: "r09999", ned: true },
  ], punkter, radar);
  const vantat = [{ punkt: "r00001", ned: true, radar_mmh: null }, { punkt: "r00002", ned: false, radar_mmh: 0.1 }];
  if (JSON.stringify(u) !== JSON.stringify(vantat)) fel.push(`varnande punkter: ${JSON.stringify(u)}`);
  console.log(`självtest smavag-regel: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (process.argv[2] === "--sjalvtest") process.exit(sjalvtest());
  console.error("--sjalvtest");
  process.exit(2);
}
