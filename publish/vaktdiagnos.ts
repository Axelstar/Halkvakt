// VAKTDIAGNOSEN — delad av varje grind (DECISIONS #141).
//
// FÖDD UR ETT AV MINA EGNA FEL. Grind R-A svarade "0 rader överlever vakten — OAVGJORT" som om det
// vore ett underlagsbesked. Det var det inte: `ingest/fi.ts` hämtade aldrig luftfuktighet, så
// korsgivarkontrollen `humidity_pct >= 90` filtrerade bort VARJE RAD i arkivet. Ett villkor som
// tyst filtrerar allt därför att fältet inte finns, presenterat som en mätning.
//
// Samma familj som `Boolean(precipitation)`, som vinddatan före #84, som 0f:s kadens. Skillnaden
// mellan dessa tre svar är hela skillnaden mellan att veta något och att tro att man gör det:
//
//   FÄLTET SAKNAS    — ledet går inte att utvärdera. Grinden ska säga OAVGJORT och peka på fältet.
//   VAKTEN FÄLLER    — fältet finns, ingen rad klarar villkoret. Det ÄR ett mätresultat.
//   VAKTEN SLÄPPER   — rader klarar. Normalfallet.
//
// En nolla utan den uppdelningen är inte ett svar. Därför räknar varje grind numera sina vaktled
// FÖR SIG, före allt annat, och skriver ut dem.

export type Led = {
  namn: string;
  /** Bär raden fältet alls? T.ex. "humidity_pct IS NOT NULL". */
  bar: string;
  /** Klarar raden vakten? T.ex. "humidity_pct >= 90". */
  villkor: string;
};

export type Utfall = "SAKNAS" | "FÄLLER ALLT" | "SLÄPPER" | "TOMT ARKIV";

/** Domen för ett vaktled. Ordningen är avsiktlig — ett saknat fält slår allt annat. */
export function ledutfall(alla: number, bar: number, klarar: number): Utfall {
  if (alla === 0) return "TOMT ARKIV";
  if (bar === 0) return "SAKNAS";
  if (klarar === 0) return "FÄLLER ALLT";
  return "SLÄPPER";
}

/** Går grinden att utvärdera alls? Ett enda ouvärderbart led räcker för att svara nej. */
export function garAttUtvardera(utfall: Utfall[]): boolean {
  return utfall.length > 0 && !utfall.some((u) => u === "SAKNAS" || u === "TOMT ARKIV");
}

export function sql(tabell: string, fonster: string, led: Led[]): string {
  const kol = led.flatMap((l, i) => [
    `count(*) FILTER (WHERE ${l.bar})::int AS bar_${i}`,
    `count(*) FILTER (WHERE (${l.bar}) AND (${l.villkor}))::int AS klarar_${i}`,
  ]);
  return `SELECT count(*)::int AS alla, ${kol.join(", ")} FROM ${tabell} ${fonster}`;
}

const IKON: Record<Utfall, string> = {
  "SLÄPPER": "✅", "FÄLLER ALLT": "⚠️ ", "SAKNAS": "⛔", "TOMT ARKIV": "⛔",
};

/** Kör diagnosen och skriv ut den. Returnerar utfallen så grinden kan gatas på dem. */
export async function vaktdiagnos(
  q: (s: string, p?: unknown[]) => Promise<any[]>,
  tabell: string, fonster: string, led: Led[], p: unknown[] = [],
): Promise<{ alla: number; utfall: Utfall[]; garAttUtvardera: boolean }> {
  const r = (await q(sql(tabell, fonster, led), p))[0];
  const alla = Number(r.alla);
  const utfall: Utfall[] = [];
  console.log(`VAKTDIAGNOS — ${tabell}: ${alla} rader i fönstret`);
  console.log(`  ${"vaktled".padEnd(34)} ${"bär fältet".padStart(11)} ${"klarar vakten".padStart(14)}`);
  for (let i = 0; i < led.length; i++) {
    const bar = Number(r[`bar_${i}`]), klarar = Number(r[`klarar_${i}`]);
    const u = ledutfall(alla, bar, klarar);
    utfall.push(u);
    console.log(`  ${IKON[u]} ${led[i].namn.padEnd(32)} ${String(bar).padStart(11)} ${String(klarar).padStart(14)}`);
    if (u === "SAKNAS") {
      console.log(`     ⛔ FÄLTET FINNS INTE I DET HÄR ARKIVET — ledet går inte att utvärdera.`);
      console.log(`        En nolla här är INTE ett mätresultat. Grinden svarar OAVGJORT.`);
    } else if (u === "FÄLLER ALLT") {
      console.log(`     ⚠️  fältet finns men ingen rad klarar villkoret — det ÄR ett mätresultat.`);
    }
  }
  const ok = garAttUtvardera(utfall);
  if (!ok) console.log(`  ⇒ GRINDEN GÅR INTE ATT UTVÄRDERA: minst ett vaktled saknar sitt fält.`);
  console.log("");
  return { alla, utfall, garAttUtvardera: ok };
}
