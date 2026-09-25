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

import { RADVAKT_SQL, brottSql, givarfelSql, GIVARFEL_LUFT_MIN_C, GIVARFEL_GAP_C, KARANTAN_DYGN, KARANTAN_BROTT }
  from "./snapshot-core.ts";

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
  const fraga = sql(tabell, fonster, led);
  // Fönstret interpoleras oftast direkt (`${DAGAR}`), och då finns inga platshållare. Skickas
  // ändå parametrar svarar Postgres med ett bindfel (08P01) som inte säger vad som är fel.
  // Grind R-A föll på precis det 12/9 — säg det i klartext i stället.
  if (p.length && !fraga.includes("$1"))
    throw new Error(`vaktdiagnos: frågan har inga platshållare men ${p.length} parametrar skickades — ` +
      `fönstret interpolerar troligen värdet direkt. Skicka inga parametrar, eller använd $1 i fönstret.`);
  const r = (await q(fraga, p))[0];
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

/** Kort #234:s två vakter som diagnosled (DECISIONS #299), så att varje grind visar hur många rader de tar. Talen
 *  importeras ur snapshotkärnan — samma källa som driften. `tabell` är arkivet (det finska har eget schema). */
export function led234(tabell = "weather_observations"): Led[] {
  return [
    { namn: `#234 radvakt: luft>=${GIVARFEL_LUFT_MIN_C}, gap<${GIVARFEL_GAP_C}`,
      bar: "surface_temp_c IS NOT NULL AND air_temp_c IS NOT NULL", villkor: RADVAKT_SQL },
    { namn: `#234 karantän: <${KARANTAN_BROTT} brott/${KARANTAN_DYGN} dygn`,
      bar: "surface_temp_c IS NOT NULL", villkor: `${brottSql(tabell, tabell)} < ${KARANTAN_BROTT}` },
    // Den långsamma vakten (kort #236) finns bara för det svenska arkivet — sql/030 räknar bara det.
    ...(tabell === "weather_observations"
      ? [{ namn: "#236 långsam vakt: dygn i felet", bar: "surface_temp_c IS NOT NULL", villkor: `NOT ${givarfelSql(tabell)}` }]
      : []),
  ];
}

/** SAKNADE DYGN (kort #252, DECISIONS #352). Sedan 24/9 raderas exporterade dygn äldre än 30 dagar när databasen passerar
 *  350 MB (sql/034). En mätning över ett längre fönster krymper då tyst — ett dygn utan rader räknas aldrig som ett lugnt dygn,
 *  det skrivs ut. Dygn före arkivets början saknas inte; början är det tidigaste av första exporterade dygnet och första raden,
 *  så att raderade dygn inte tas för dygn före arkivet. */
export function saknadeDagar(medData: Set<string>, dagar: number, arkivetsBorjan: string | null, nu: Date = new Date()): string[] {
  const ut: string[] = [];
  const start = new Date(nu.getTime() - dagar * 86_400_000).toISOString().slice(0, 10), idag = nu.toISOString().slice(0, 10);
  for (let d = new Date(`${start}T00:00:00Z`); d.toISOString().slice(0, 10) <= idag; d = new Date(d.getTime() + 86_400_000)) {
    const dag = d.toISOString().slice(0, 10);
    if (arkivetsBorjan !== null && dag < arkivetsBorjan) continue;
    if (!medData.has(dag)) ut.push(dag);
  }
  return ut;
}
export async function saknadeDygn(q: (s: string, p?: unknown[]) => Promise<any[]>, tabell: string, dagar: number): Promise<string[]> {
  const med = await q(`SELECT DISTINCT (sample_time AT TIME ZONE 'UTC')::date::text AS d FROM ${tabell}
    WHERE sample_time > now() - $1 * interval '1 day'`, [dagar]);
  let borjan: string | null = null;
  try {
    const [b] = await q(`SELECT least((SELECT min(dag) FROM arkiv_export), (SELECT min(sample_time) FROM ${tabell})::date)::text AS b`);
    borjan = b?.b ?? null;
  } catch {
    const [b] = await q(`SELECT (SELECT min(sample_time) FROM ${tabell})::date::text AS b`);   // arkiv_export finns bara i Supabase
    borjan = b?.b ?? null;
  }
  return saknadeDagar(new Set(med.map((r) => String(r.d))), dagar, borjan);
}
export function skrivSaknade(saknade: string[]): void {
  if (!saknade.length) return;
  console.log(`⚠ SAKNADE DYGN: väderarkivet har inga rader för ${saknade.length} dygn i fönstret (${saknade.join(", ")}) — exporterade`
    + ` och raderade (sql/034) eller aldrig hämtade. De räknas inte; läs tillbaka ur exporten (arkiv/weather_observations/) före en dom.\n`);
}

