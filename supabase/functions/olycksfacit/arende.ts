// Olycksfacit, steg 3 (DECISIONS #797, kort #376): dagens ärende, de rena delarna. Ärendet ligger i det publika repot och bär
// därför bara Trafikverkets öppna data (väg, tid och läge) och koderna och antalen — aldrig kandidatens tal (förslaget §4).

export const FORSTA_DAG = "2026-11-06";   // första svenska dygnet som fångsten täcker helt (fångsten i drift 6/11 07:45 UTC)
export const ETIKETT = "olycka";
export const TILLDELAD = "895845";          // Bengt, som dom-ärendena (DECISIONS #649)
export const PAMINN_DYGN = 7;
export const MARK = (dag: string) => `<!-- olycksfacit:${dag} -->`;

export type Olycka = {
  tid: string;            // start, ISO UTC
  vag: string | null;
  lon: number;
  lat: number;
  utfall: "VARNADE" | "TYST_TACKT" | "TYST_OTACKT";
  orsaker: string[];
  klass: "TYDLIG" | "TROLIG" | "OKLAR" | "INTE" | null;
  skal: string | null;
  dubblett: boolean;
};

const KLASSER = ["TYDLIG", "TROLIG", "OKLAR", "INTE"] as const;
const UTFALL = ["VARNADE", "TYST_TACKT", "TYST_OTACKT"] as const;

/** En tyst olycka med tydlig eller trolig koppling till halka ska ha en åtgärd innan ärendet stängs. */
export function behoverAtgard(o: Olycka): boolean {
  return !o.dubblett && (o.klass === "TYDLIG" || o.klass === "TROLIG") && o.utfall !== "VARNADE";
}

export function arendeTitel(dag: string): string {
  return `Olycksfacit ${dag}`;
}

/** Klockslaget i svensk tid, HH:MM. */
export function svenskTid(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function arendeKropp(dag: string, olyckor: Olycka[]): string {
  const egna = olyckor.filter((o) => !o.dubblett);
  const dubbletter = olyckor.length - egna.length;
  const antal = (k: string, u: string) => egna.filter((o) => o.klass === k && o.utfall === u).length;
  const rad = (namn: string, varden: number[]) => `| ${namn} | ${varden.join(" | ")} | ${varden.reduce((a, b) => a + b, 0)} |`;
  const tabell = [
    "| Kopplingen till halka | Varnade | Tyst, täckt | Tyst, otäckt | Summa |",
    "| :-- | --: | --: | --: | --: |",
    ...KLASSER.map((k) => rad(k, UTFALL.map((u) => antal(k, u)))),
    rad("**Summa**", UTFALL.map((u) => egna.filter((o) => o.utfall === u).length)),
  ];

  const orsaker = new Map<string, number>();
  for (const o of egna) if (o.utfall !== "VARNADE") for (const s of o.orsaker) orsaker.set(s, (orsaker.get(s) ?? 0) + 1);
  const orsaksrader = [...orsaker].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sv")).map(([s, n]) => `| ${s} | ${n} |`);

  const atgarda = egna.filter(behoverAtgard);
  const lista = atgarda.map((o) =>
    `- [ ] ${svenskTid(o.tid)} ${o.vag ?? "okänd väg"} (${o.lon.toFixed(3)}, ${o.lat.toFixed(3)}) — ${o.utfall === "TYST_TACKT" ? "tyst, täckt" : "tyst, otäckt"}, ` +
    `${o.klass} (${o.skal ?? "?"}) — ${o.orsaker.join(" · ")} — **Åtgärd:** `);

  return [
    MARK(dag),
    `**Olycksfacit för ${dag}** (svensk tid; DECISIONS #796 och #797, kort #376). Olyckan är facit för varningssystemen, inte för vägen ` +
      "(DECISIONS #247): tabellen visar vad A1, kandidaten och A2 sa vid olyckans start, och klassningen efter ett dygn " +
      "(docs/TROSKLAR-OLYCKSFACIT.md).",
    "",
    ...tabell,
    "",
    `${egna.length} olyckor${dubbletter ? `; ${dubbletter} dubbletter (samma olycka inom 300 m och 30 minuter) räknas inte` : ""}.`,
    "",
    ...(orsaksrader.length ? ["**Orsakerna till tystnaden** (de tysta olyckorna, alla klasser):", "", "| Orsak | Antal |", "| :-- | --: |", ...orsaksrader, ""] : []),
    ...(atgarda.length
      ? ["**Att åtgärda** — tysta olyckor med tydlig eller trolig koppling till halka:", "", ...lista, "",
         "**Stängningsregeln:** ärendet stängs först när varje rad ovan har en åtgärd: ett kort på tavlan (`kort #NN`, nytt eller " +
         `befintligt) eller *ingen åtgärd* med skälet (DECISIONS #797). Står det öppet i ${PAMINN_DYGN} dygn påminner funktionen.`]
      : ["Ingen tyst olycka med tydlig eller trolig koppling till halka det här dygnet. Ärendet stängs av funktionen."]),
  ].join("\n");
}

export function paminnelse(dag: string, dygn: number): string {
  return `${MARK(dag)}\nPåminnelse: ärendet har stått öppet i ${dygn} dygn. Varje rad under *Att åtgärda* ska ha ett kort eller ` +
    "*ingen åtgärd* med skälet innan det stängs (DECISIONS #797).";
}
