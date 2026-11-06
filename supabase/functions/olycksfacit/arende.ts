// Olycksfacit, steg 3 och 4 (DECISIONS #797 och #802, kort #376): dagens och veckans ärende, de rena delarna. Ärendena ligger i det
// publika repot och bär därför bara Trafikverkets öppna data (väg, tid och läge) och koderna och antalen — aldrig kandidatens tal
// (förslaget §4). Bedömningen per olycka, förbättringsområdet och veckans regler står i docs/TROSKLAR-OLYCKSFACIT.md §9.

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
  talade: string[];       // lagren som varnade vid starten (A1, A2, K), ur olycksfacit_lager
};

const KLASSER = ["TYDLIG", "TROLIG", "OKLAR", "INTE"] as const;
const UTFALL = ["VARNADE", "TYST_TACKT", "TYST_OTACKT"] as const;

/** En tyst olycka med tydlig eller trolig koppling till halka ska ha en åtgärd innan ärendet stängs. */
export function behoverAtgard(o: Olycka): boolean {
  return !o.dubblett && (o.klass === "TYDLIG" || o.klass === "TROLIG") && o.utfall !== "VARNADE";
}

// ── Steg 4 (TROSKLAR-OLYCKSFACIT §9) ──
export const BEDOMNINGAR = ["RÄTT VARNING", "VARNING, HALKA INTE BEKRÄFTAD", "MISS", "OKLAR TYSTNAD", "RÄTT TYSTNAD"] as const;
export type Bedomning = (typeof BEDOMNINGAR)[number];
export const OMRADEN = ["Täckningen", "Spridningsspärren", "Vetot", "Ytan i modellen", "Rimfrosten", "Fukten syntes inte",
  "Kandidatens drift", "Övrigt"] as const;
export type Omrade = (typeof OMRADEN)[number];
export const ATERKOMMANDE = 2;   // missar med samma område samma vecka (§9.5, val 6)
const LAGER = ["A1", "K", "A2"] as const;

const halkkopplad = (o: Olycka) => o.klass === "TYDLIG" || o.klass === "TROLIG";

/** Bedömningen per olycka (§9.2). Dubbletter och olyckor som inte är klassade än får ingen. */
export function bedomning(o: Olycka): Bedomning | null {
  if (o.dubblett || o.klass === null) return null;
  if (o.utfall === "VARNADE") return halkkopplad(o) ? "RÄTT VARNING" : "VARNING, HALKA INTE BEKRÄFTAD";
  if (halkkopplad(o)) return "MISS";
  return o.klass === "OKLAR" ? "OKLAR TYSTNAD" : "RÄTT TYSTNAD";
}

/** Förbättringsområdet för en miss (§9.3), ur fångstens orsaker. Bara en miss har ett område. */
export function omrade(o: Olycka): Omrade | null {
  if (bedomning(o) !== "MISS") return null;
  const k = o.orsaker.find((x) => x.startsWith("K: "))?.slice(3) ?? "";
  if (o.utfall === "TYST_OTACKT" || k === "ingen vägpunkt") return "Täckningen";
  if (k === "spridningsspärren") return "Spridningsspärren";
  if (k === "veto") return "Vetot";
  if (k === "yta över 0") return "Ytan i modellen";
  if (k === "fukt saknades") return o.orsaker.includes("rimfrost") ? "Rimfrosten" : "Fukten syntes inte";
  if (k === "ingen timme" || k === "inget värde") return "Kandidatens drift";
  return "Övrigt";
}

export function arendeTitel(dag: string): string {
  return `Olycksfacit ${dag}`;
}

/** Klockslaget i svensk tid, HH:MM. */
export function svenskTid(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Dagen i svensk tid, ÅÅÅÅ-MM-DD. */
export function svenskDag(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

const plats = (o: Olycka) => `${o.vag ?? "okänd väg"} (${o.lon.toFixed(3)}, ${o.lat.toFixed(3)})`;
const rattVarning = (o: Olycka, medDag: boolean) =>
  `- ${medDag ? `${svenskDag(o.tid)} ` : ""}${svenskTid(o.tid)} ${plats(o)} — ${o.klass} (${o.skal ?? "?"}) — varnade: ${o.talade.join(", ") || "?"}`;

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
    `- [ ] ${svenskTid(o.tid)} ${plats(o)} — ${o.utfall === "TYST_TACKT" ? "tyst, täckt" : "tyst, otäckt"}, ` +
    `${o.klass} (${o.skal ?? "?"}) — ${o.orsaker.join(" · ")} — område: ${omrade(o) ?? "?"} — **Åtgärd:** `);
  const ratta = egna.filter((o) => bedomning(o) === "RÄTT VARNING");

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
    ...(ratta.length
      ? ["**Rätt varning** — Halkvakt hade en aktiv varning på platsen när olyckan började, och olyckan har tydlig eller trolig " +
         "koppling till halka (TROSKLAR-OLYCKSFACIT §9):", "", ...ratta.map((o) => rattVarning(o, false)), ""]
      : []),
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

// ── Veckans ärende (§9.5) ──
export const MARKV = (vecka: string) => `<!-- olycksfacit:vecka:${vecka} -->`;

export function veckaTitel(vecka: string): string {
  return `Olycksfacit vecka ${vecka}`;
}

function perOmrade(olyckor: Olycka[]): Map<Omrade, number> {
  const n = new Map<Omrade, number>();
  for (const o of olyckor) { const a = omrade(o); if (a) n.set(a, (n.get(a) ?? 0) + 1); }
  return n;
}

/** De återkommande förbättringsområdena: minst ATERKOMMANDE missar med samma område under veckan. */
export function veckansForslag(veckans: Olycka[]): [Omrade, number][] {
  const n = perOmrade(veckans);
  return OMRADEN.filter((a) => (n.get(a) ?? 0) >= ATERKOMMANDE).map((a) => [a, n.get(a)!]);
}

const procent = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : "–");
const omradesRader = (olyckor: Olycka[]) => { const n = perOmrade(olyckor); return OMRADEN.filter((a) => n.has(a)).map((a) => `| ${a} | ${n.get(a)} |`); };

export function veckaKropp(vecka: string, fran: string, till: string, veckans: Olycka[], sasong: Olycka[]): string {
  const egna = veckans.filter((o) => !o.dubblett);
  const bed = (b: Bedomning, x: Olycka[]) => x.filter((o) => bedomning(o) === b).length;
  const halk = egna.filter(halkkopplad);
  const ratta = egna.filter((o) => bedomning(o) === "RÄTT VARNING");
  const forslag = veckansForslag(egna);
  const s = sasong.filter((o) => !o.dubblett);
  const sHalk = s.filter(halkkopplad), sRatta = bed("RÄTT VARNING", s);
  const veckansOmraden = omradesRader(egna), sasongensOmraden = omradesRader(s);
  return [
    MARKV(vecka),
    `**Olycksfacit för vecka ${vecka}**, ${fran}–${till} (svensk tid; DECISIONS #802, kort #376). Bedömningen per olycka och ` +
      "förbättringsområdena står i docs/TROSKLAR-OLYCKSFACIT.md §9. *Varnade* betyder att minst ett av appens lager hade en aktiv " +
      "varning på platsen när olyckan började; det säger inte att någon förare med appen var där.",
    "",
    "| Bedömning | Olyckor |",
    "| :-- | --: |",
    ...BEDOMNINGAR.map((b) => `| ${b} | ${bed(b, egna)} |`),
    `| **Summa** | ${egna.length} |`,
    "",
    `**Lagren vid de halkkopplade olyckorna** (TYDLIG och TROLIG, ${halk.length}): ` +
      LAGER.map((l) => `${l} varnade vid ${halk.filter((o) => o.talade.includes(l)).length}`).join(", ") + ".",
    "",
    ...(veckansOmraden.length
      ? ["**Missarna per förbättringsområde:**", "", "| Område | Missar |", "| :-- | --: |", ...veckansOmraden, ""]
      : ["Inga missar den här veckan.", ""]),
    ...(ratta.length ? ["**Rätt varning, fall för fall:**", "", ...ratta.map((o) => rattVarning(o, true)), ""] : []),
    `**Säsongen sedan ${FORSTA_DAG}:** ${sHalk.length} halkkopplade olyckor; ` +
      `Halkvakt hade rätt varning vid ${sRatta} av dem (${procent(sRatta, sHalk.length)}) och missade ${bed("MISS", s)}.`,
    "",
    ...(sasongensOmraden.length ? ["| Område (säsongen) | Missar |", "| :-- | --: |", ...sasongensOmraden, ""] : []),
    "**Säljregeln** (§9.6): bara RÄTT VARNING får anföras utåt, med orden *Halkvakt hade en aktiv varning på platsen när olyckan " +
      "började*, lagret utskrivet och säsongens andel bredvid — aldrig att en förare varnades eller att en olycka hade undvikits.",
    "",
    ...(forslag.length
      ? [`**Att åtgärda** — förbättringsområden med minst ${ATERKOMMANDE} missar den här veckan:`, "",
         ...forslag.map(([a, n]) => `- [ ] ${a} — ${n} missar — **Åtgärd:** `), "",
         "**Stängningsregeln:** ärendet stängs först när varje rad ovan har en åtgärd: ett kort på tavlan (`kort #NN`), en fråga i " +
         `bedömningens §4.2 eller *ingen åtgärd* med skälet (DECISIONS #802). Står det öppet i ${PAMINN_DYGN} dygn påminner funktionen.`]
      : [`Inget förbättringsområde har ${ATERKOMMANDE} missar eller fler den här veckan. Ärendet stängs av funktionen.`]),
  ].join("\n");
}

export function veckaPaminnelse(vecka: string, dygn: number): string {
  return `${MARKV(vecka)}\nPåminnelse: ärendet har stått öppet i ${dygn} dygn. Varje rad under *Att åtgärda* ska ha ett kort, en ` +
    "fråga i §4.2 eller *ingen åtgärd* med skälet innan det stängs (DECISIONS #802).";
}
