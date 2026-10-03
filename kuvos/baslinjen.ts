// KUVÖSENS BASLINJE (kort #232, DECISIONS #455 punkt 2): dagens frysrisk vid stationerna och broarna (`icing_point`), ur
// körflödets varningar (`kuvos/korning.ts --ut`). Den redovisas med antal fyrningar och episoder per serie men döms inte på egen yta:
// utlösaren är stationens yta, så egen-yta-facit vore nästan cirkulär. De andra delarna läggs ovanpå den.
//
// En episod är en fara per natt, och natten går från middag till middag i svensk tid — samma natt som T-A, R-A och uppspelningen
// (DECISIONS #246, #366). Skiftet och zonen är kopior; kontraktsgrinden vaktar dem.
// Kör: node --experimental-strip-types kuvos/baslinjen.ts <varningar.ndjson>
import { readFileSync } from "node:fs";

const ZON = "Europe/Stockholm";
const NATT_SKIFT_H = 12;
const DAG = new Intl.DateTimeFormat("sv-SE", { timeZone: ZON, year: "numeric", month: "2-digit", day: "2-digit" });
/** Nattens etikett: dagen då natten börjar, i svensk tid. */
export const natt = (epochS: number) => DAG.format(new Date((epochS - NATT_SKIFT_H * 3600) * 1000));

export type Varning = { serie: string; vag: string; steg: string; t: number; kind: string; id: string; d: number };
type Tal = { varningar: number; faror: Set<string>; episoder: Set<string>; stationsepisoder: number; broepisoder: number };

/** Per serie och totalt per månad (nattens månad): varningar, distinkta faror och episoder. Bara frysrisken räknas. */
export function baslinjen(varningar: Varning[]) {
  const ut = new Map<string, Tal & { perManad: Map<string, { varningar: number; episoder: Set<string> }> }>();
  for (const v of varningar) {
    if (v.kind !== "icing_point") continue;
    const s = ut.get(v.serie) ?? { varningar: 0, faror: new Set(), episoder: new Set(), stationsepisoder: 0, broepisoder: 0, perManad: new Map() };
    ut.set(v.serie, s);
    const n = natt(Date.parse(v.steg) / 1000 + v.t), ep = `${v.id}|${n}`;
    s.varningar++; s.faror.add(v.id);
    if (!s.episoder.has(ep)) { s.episoder.add(ep); if (v.id.startsWith("bro:")) s.broepisoder++; else s.stationsepisoder++; }
    const m = s.perManad.get(n.slice(0, 7)) ?? { varningar: 0, episoder: new Set() };
    s.perManad.set(n.slice(0, 7), m);
    m.varningar++; m.episoder.add(ep);
  }
  return ut;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const fil = process.argv[2];
  if (!fil) { console.error("ange varningsfilen från kuvos/korning.ts --ut"); process.exit(1); }
  const varningar = readFileSync(fil, "utf8").split("\n").filter(Boolean).map((r) => JSON.parse(r) as Varning);
  console.log(`BASLINJEN — dagens frysrisk och broarna (DECISIONS #455 punkt 2): antal, ingen dom. ${varningar.length} varningar i filen.`);
  for (const [serie, s] of [...baslinjen(varningar)].sort()) {
    console.log(`\nSerie ${serie}: ${s.varningar} fyrningar · ${s.faror.size} faror · ${s.episoder.size} episoder ` +
      `(stationer ${s.stationsepisoder}, broar ${s.broepisoder})`);
    for (const [m, x] of [...s.perManad].sort()) console.log(`  ${m}: ${x.varningar} fyrningar · ${x.episoder.size} episoder`);
  }
}
