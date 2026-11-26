// Olycksfacit, steg 3 och 4 (DECISIONS #797 och #802, kort #376): dagens och veckans ärende, de rena delarna. Ärendena ligger i det
// publika repot och bär därför bara Trafikverkets öppna data (väg, tid och läge) och koderna och antalen — aldrig kandidatens tal
// (förslaget §4). Bedömningen per olycka, förbättringsområdet och veckans regler står i docs/TROSKLAR-OLYCKSFACIT.md §9; det nya
// upplägget (förifyllda åtgärder, läsningen i veckans ärende, nämnaren och kollisionerna, DECISIONS #852) i §11.
import { vagForst, vagKod, vagText } from "../_shared/vagnamn.ts";   // vägen som appen och sajten skriver den (DECISIONS #882)

export const FORSTA_DAG = "2026-11-06";   // första svenska dygnet som fångsten täcker helt (fångsten i drift 6/11 07:45 UTC)
export const ETIKETT = "olycka";
export const TILLDELAD = "895845";          // Bengt, som dom-ärendena (DECISIONS #649)
export const PAMINN_DYGN = 7;
/** Dygn från det svenska dygnets slut till morgonen då dess ärende skrivs: dagens ärende gäller dygnet i går, och veckans skrivs måndagen
 *  efter veckan. Klassningen sker när olyckan är minst sex timmar gammal och har lämnat flödet, så gårdagens sista olyckor är klassade
 *  05.17 UTC (TROSKLAR-OLYCKSFACIT §10, DECISIONS #842; förut 2, i förrgår och tisdagen). */
export const DYGN_EFTER = 1;
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
  art: string | null;     // olycksarten (sql/110, D3); null före sql/110
  smavag: string | null;  // småvägsröstens lager vid starten (sql/110, C): varnar, torr, fryser inte, …; null utan lagret
  flackvisVat: boolean;   // K:s sträcka hade fläckvis Våt i A1:s text (K-lagrets flackvis_vat)
  ytaMin?: number | null; // stationens lägsta yta (sql/110), för sidan Olyckor (DECISIONS #938); null utan station
  fuktEfter?: boolean;    // fukt vid stationen (sql/110)
  rimfrostEfter?: boolean;// rimfrost vid stationen (sql/110)
  fukthink?: string | null;   // väderhinken i fuktskuggan (sql/138, DECISIONS #940); null utan station, undefined utan rad där
  dygnsdel?: "dag" | "natt";  // fuktskuggans del av dygnet: dag = 07–18 svensk tid
  halkaEfter?: boolean | null; // Trafikverket satte halka på A1:s sträcka inom sex timmar (§3); null utan sträcka inom 100 m
};

const KLASSER = ["TYDLIG", "TROLIG", "OKLAR", "INTE"] as const;
const UTFALL = ["VARNADE", "TYST_TACKT", "TYST_OTACKT"] as const;

/** D2 (TROSKLAR-OLYCKSFACIT §11): en kollision på frusen väg är TROLIG och räknas i statistiken, men får ingen åtgärdsrad. */
export const kollision = (o: Olycka): boolean => o.klass === "TROLIG" && o.art === "flera fordon";

/** Regel 3b (TROSKLAR-OLYCKSFACIT §4 och §13, DECISIONS #942): TROLIG på Trafikverkets väglag efteråt. Rätt varning i klassen
 *  redovisas för sig och får inte anföras utåt (§9.6), eftersom facit och A1 läser samma källa. */
export const vaglaget = (o: Olycka): boolean => o.klass === "TROLIG" && (o.skal ?? "").startsWith("väglaget efteråt");

/** §14 (Bengt 21/11, DECISIONS #946): facit som inte bygger på stationen — halkordet i texten (TYDLIG) eller Trafikverkets väglag
 *  efteråt (`halka_efter`, också TROLIG, väglaget). En miss utan det är en miss bara på stationen: samma station avgör facit och A2. */
export const oberoendeFacit = (o: Olycka): boolean => o.klass === "TYDLIG" || o.halkaEfter === true || vaglaget(o);

/** En tyst olycka med tydlig eller trolig koppling till halka ska ha en åtgärd, utom en kollision (D2). */
export function behoverAtgard(o: Olycka): boolean {
  return !o.dubblett && (o.klass === "TYDLIG" || o.klass === "TROLIG") && o.utfall !== "VARNADE" && !kollision(o);
}

/** Småvägsröstens besked vid starten, i ord för ärendet (inga tal, #768). Null utan småvägspunkt inom 0,5 km eller utan lagret. */
export function smavagText(o: Olycka): string | null {
  if (o.smavag === null || o.smavag === "ingen småvägspunkt") return null;
  return ({ "varnar": "skulle ha talat", "torr": "teg, torrt", "fryser inte": "teg, fryser inte", "ingen timme": "ingen timme",
            "gallrad": "timmen gallrad" } as Record<string, string>)[o.smavag] ?? o.smavag;
}

/** A (§11): den förifyllda åtgärden när en miss passar ett känt mönster, annars null. Bengt kan alltid skriva om den. */
export function forifylld(o: Olycka): string | null {
  if (!behoverAtgard(o)) return null;
  const sv = smavagText(o);
  if (o.utfall === "TYST_OTACKT" && sv !== null)
    return "kort #647 — förifylld (M1 småväg): ingen väglagssträcka eller vägpunkt inom reglernas avstånd, men en punkt i " +
      `småvägsröstens punktfil inom 0,5 km; småvägsrösten: ${sv}.`;
  if (o.utfall === "TYST_TACKT" && o.klass === "TROLIG" && (o.skal ?? "").endsWith(" och rimfrost"))
    return "kort #46 — förifylld (M2 rimfrost): TROLIG på rimfrost utan fukt vid stationen.";
  if (o.utfall === "TYST_TACKT" && o.flackvisVat && o.orsaker.includes("K: fukt saknades"))
    return "kort #645 — förifylld (M3 fläckvis Våt): A1:s sträcka hade fläckvis Våt, och K räknade den torr.";
  return null;
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
  if (bedomning(o) !== "MISS" || kollision(o)) return null;   // en kollision får ingen åtgärd och inget område (D2)
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

// Formaterarna skapas en gång: ett nytt Intl.DateTimeFormat per anrop tog omkring 1,7 ms, och admins sida Olyckor anropar svenskDag
// tiotusentals gånger. Sidan gick 26/11 över edge-funktionens CPU-gräns och visade exempeldata (DECISIONS #970).
const TID_SV = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });
const DAG_SV = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" });

/** Klockslaget i svensk tid, HH:MM. */
export function svenskTid(iso: string): string {
  return TID_SV.format(new Date(iso));
}

/** Dagen i svensk tid, ÅÅÅÅ-MM-DD. */
export function svenskDag(iso: string): string {
  return DAG_SV.format(new Date(iso));
}

const plats = (o: Olycka) => `${vagText(o.vag) ?? "okänd väg"} (${o.lon.toFixed(3)}, ${o.lat.toFixed(3)})`;
const rattVarning = (o: Olycka, medDag: boolean) =>
  `- ${medDag ? `${svenskDag(o.tid)} ` : ""}${svenskTid(o.tid)} ${plats(o)} — ${o.klass} (${o.skal ?? "?"}) — varnade: ${o.talade.join(", ") || "?"}${vaglaget(o) ? " — anförs inte utåt (väglaget, §13)" : ""}`;
/** En miss att åtgärda, utan kryssrutan och åtgärden. */
const missRad = (o: Olycka, medDag: boolean) => {
  const sv = smavagText(o);
  return `${medDag ? `${svenskDag(o.tid)} ` : ""}${svenskTid(o.tid)} ${plats(o)} — ${o.utfall === "TYST_TACKT" ? "tyst, täckt" : "tyst, otäckt"}, ` +
    `${o.klass} (${o.skal ?? "?"}) — ${o.orsaker.join(" · ")} — område: ${omrade(o) ?? "?"}${sv ? ` — småvägsrösten: ${sv}` : ""}`;
};
/** Kollisionerna på frusen väg (D2): antalet och hur många där Halkvakt varnade, eller inget. */
const kollisionsRad = (egna: Olycka[]): string[] => {
  const k = egna.filter(kollision);
  return k.length
    ? [`**Kollisioner på frusen väg** (TROLIG, flera fordon; TROSKLAR-OLYCKSFACIT §11): ${k.length}, varav ${k.filter((o) => o.utfall === "VARNADE").length} ` +
       "där Halkvakt varnade. De räknas i statistiken och får inga åtgärdsrader.", ""]
    : [];
};

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
  // A och B (§11): en förifylld rad är bokförd; de övriga läses i veckans ärende, och dagens stängs av funktionen.
  const lista = atgarda.map((o) => {
    const f = forifylld(o);
    return f ? `- [x] ${missRad(o, false)} — **Åtgärd:** ${f}` : `- [ ] ${missRad(o, false)} — **Åtgärd:** i veckans ärende`;
  });
  const ratta = egna.filter((o) => bedomning(o) === "RÄTT VARNING");

  return [
    MARK(dag),
    `**Olycksfacit för ${dag}** (svensk tid; DECISIONS #796 och #797, kort #376). Olyckan är facit för varningssystemen, inte för vägen ` +
      "(DECISIONS #247): tabellen visar vad A1, kandidaten och A2 sa vid olyckans start, och klassningen när olyckan är minst " +
      "sex timmar gammal och har lämnat flödet " +
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
    ...kollisionsRad(egna),
    ...(atgarda.length
      ? ["**Att åtgärda** — tysta olyckor med tydlig eller trolig koppling till halka:", "", ...lista, "",
         "**Läsningen** (TROSKLAR-OLYCKSFACIT §11): en rad som passar ett känt mönster har en förifylld åtgärd, som kan skrivas om. " +
         "De övriga läses i veckans ärende, som stängs när varje rad har en åtgärd: ett kort på tavlan (`kort #NN`) eller " +
         "*ingen åtgärd* med skälet. Det här ärendet stängs av funktionen."]
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

/** B (§11): veckans tysta halkkopplade olyckor utan förifylld åtgärd, från de dygn vars ärende lämnade dem hit (veckolasning). */
export function veckansLasrader(veckans: Olycka[], lasdagar: ReadonlySet<string>): Olycka[] {
  return veckans.filter((o) => behoverAtgard(o) && forifylld(o) === null && lasdagar.has(svenskDag(o.tid)));
}

/** E (§11): nämnaren, per klass hur ofta Halkvakt varnade. INTE delas på viltet och ytan över +3 °C. */
export const NAMNARE: [string, (o: Olycka) => boolean][] = [
  ["TYDLIG", (o) => o.klass === "TYDLIG"],
  ["TROLIG, ett fordon", (o) => o.klass === "TROLIG" && !kollision(o) && !vaglaget(o)],
  ["TROLIG, kollision", (o) => kollision(o) && !vaglaget(o)],
  ["TROLIG, väglaget", vaglaget],
  ["OKLAR", (o) => o.klass === "OKLAR"],
  ["INTE, vilt", (o) => o.klass === "INTE" && o.skal === "vilt"],
  ["INTE, varmt", (o) => o.klass === "INTE" && o.skal !== "vilt"],
];

/** §9.5 punkt 8 (Bengt 20/11, DECISIONS #925): vid de halkkopplade olyckorna, om Trafikverkets väglag (A1) och kandidaten (K) varnade
 *  på samma plats eller bara den ena. Raderna utesluter varandra och täcker alla, så de summerar till de halkkopplade. */
export const OVERLAPP: [string, (t: string[]) => boolean][] = [
  ["Både A1 och K", (t) => t.includes("A1") && t.includes("K")],
  ["Bara A1", (t) => t.includes("A1") && !t.includes("K")],
  ["Bara K", (t) => t.includes("K") && !t.includes("A1")],
  ["Varken A1 eller K, men ett annat lager", (t) => !t.includes("A1") && !t.includes("K") && t.length > 0],
  ["Inget lager", (t) => t.length === 0],
];

export function overlappRader(veckans: Olycka[], sasong: Olycka[]): string[] {
  const n = (x: Olycka[], f: (t: string[]) => boolean) => x.filter((o) => f(o.talade)).length;
  return ["| Lagren vid starten | Veckan | Säsongen | Andel av säsongen |", "| :-- | --: | --: | --: |",
    ...OVERLAPP.map(([namn, f]) => `| ${namn} | ${n(veckans, f)} | ${n(sasong, f)} | ${procent(n(sasong, f), sasong.length)} |`),
    `| **Summa** | ${veckans.length} | ${sasong.length} | ${procent(sasong.length, sasong.length)} |`];
}

/** §14: veckans och säsongens missar delade på facit som inte bygger på stationen och facit bara på stationen. */
function oberoendeRader(veckans: Olycka[], sasong: Olycka[]): string[] {
  const m = (x: Olycka[]) => x.filter((o) => bedomning(o) === "MISS");
  const v = m(veckans), s = m(sasong), n = (x: Olycka[], ob: boolean) => x.filter((o) => oberoendeFacit(o) === ob).length;
  return ["**Missarna mot facit som inte bygger på stationen** (TROSKLAR-OLYCKSFACIT §14): en ändring av ett lager som läser " +
      "stationen (A2, K) prövas på den första raden, eftersom samma station annars både varnar och avgör facit.",
    "", "| Missarna | Veckan | Säsongen |", "| :-- | --: | --: |",
    `| Med facit som inte bygger på stationen: halkordet eller väglaget efteråt | ${n(v, true)} | ${n(s, true)} |`,
    `| Bara på stationen | ${n(v, false)} | ${n(s, false)} |`, `| **Summa** | ${v.length} | ${s.length} |`, ""];
}

// ── Vägbitarna (TROSKLAR-OLYCKSFACIT §15, DECISIONS #957) ──
// En vägbit är en väg inom en ruta om ungefär 10 × 10 km: banden är 0,09 grader latitud, och längdgraden delas så att rutan blir
// 10 km bred i bandets mitt. Rutan är fast, så samma vägbit får samma namn varje vecka och varje vinter. Bara summor per vägbit, aldrig
// en olycka för sig. Redovisning: ingen klass, bedömning, regel eller varning ändras.
export const VAGBIT_GRAD = 0.09;        // bandets höjd i grader latitud, omkring 10 km
export const VAGBIT_MINST = 2;          // en vägbit står i listan först med två olyckor under säsongen
export const VAGBIT_TOPP = 10;          // raderna per lista

/** Vägbitens nyckel och namn: vägen och rutans mitt. Utan väg är vägen *okänd väg*. */
export function vagbit(o: Pick<Olycka, "vag" | "lon" | "lat">): { nyckel: string; namn: string } {
  const band = Math.floor(o.lat / VAGBIT_GRAD), mittLat = (band + 0.5) * VAGBIT_GRAD;
  const bredd = VAGBIT_GRAD / Math.cos((mittLat * Math.PI) / 180), kol = Math.floor(o.lon / bredd);
  const vag = vagKod(o.vag);
  return { nyckel: `${vag ?? "-"}|${band}|${kol}`,
           namn: `${vagForst(o.vag) ?? "Okänd väg"} kring (${((kol + 0.5) * bredd).toFixed(2)}, ${mittLat.toFixed(2)})` };
}

/** Topplistan: vägbitarna med flest olyckor under säsongen, minst VAGBIT_MINST, med veckans antal och hur många där Halkvakt varnade. */
export function vagbitsRader(veckans: Olycka[], sasong: Olycka[]): string[] {
  const n = new Map<string, { namn: string; s: number; v: number; varnade: number }>();
  for (const o of sasong) {
    const b = vagbit(o), r = n.get(b.nyckel) ?? { namn: b.namn, s: 0, v: 0, varnade: 0 };
    r.s++; if (o.utfall === "VARNADE") r.varnade++; n.set(b.nyckel, r);
  }
  for (const o of veckans) { const r = n.get(vagbit(o).nyckel); if (r) r.v++; }
  const topp = [...n.values()].filter((r) => r.s >= VAGBIT_MINST)
    .sort((a, b) => b.s - a.s || b.v - a.v || a.namn.localeCompare(b.namn, "sv")).slice(0, VAGBIT_TOPP);
  return topp.length
    ? ["| Vägbit | Säsongen | Veckan | Varnade (säsongen) |", "| :-- | --: | --: | --: |",
       ...topp.map((r) => `| ${r.namn} | ${r.s} | ${r.v} | ${r.varnade} |`)]
    : [`Ingen vägbit har ${VAGBIT_MINST} olyckor eller fler under säsongen.`];
}

/** §9.5 punkt 10: de två topplistorna, halkolyckorna (TYDLIG och TROLIG) och alla olyckor, utan dubbletter. */
function vagbitsAvsnitt(egna: Olycka[], s: Olycka[]): string[] {
  return [`**Vägbitarna med flest olyckor** (TROSKLAR-OLYCKSFACIT §15): en vägbit är en väg inom en fast ruta om ungefär 10 × 10 km, ` +
      `namngiven efter rutans mitt. Säsongen sedan ${FORSTA_DAG}, de ${VAGBIT_TOPP} med flest och minst ${VAGBIT_MINST}. Listan är ` +
      "redovisning och används inte i varningarna.",
    "", "*Halkolyckorna* (TYDLIG och TROLIG):", "", ...vagbitsRader(egna.filter(halkkopplad), s.filter(halkkopplad)),
    "", "*Alla olyckor:*", "", ...vagbitsRader(egna, s), ""];
}

export function veckaKropp(vecka: string, fran: string, till: string, veckans: Olycka[], sasong: Olycka[],
                           lasdagar: ReadonlySet<string> = new Set()): string {
  const egna = veckans.filter((o) => !o.dubblett);
  const bed = (b: Bedomning, x: Olycka[]) => x.filter((o) => bedomning(o) === b).length;
  const halk = egna.filter(halkkopplad);
  const ratta = egna.filter((o) => bedomning(o) === "RÄTT VARNING");
  const forslag = veckansForslag(egna);
  const lasrader = veckansLasrader(egna, lasdagar);
  const namnare = NAMNARE.map(([namn, f]) => { const x = egna.filter(f); return [namn, x.length, x.filter((o) => o.utfall === "VARNADE").length] as const; });
  const s = sasong.filter((o) => !o.dubblett);
  const sHalk = s.filter(halkkopplad), sRatta = bed("RÄTT VARNING", s);
  const sVag = s.filter((o) => vaglaget(o) && bedomning(o) === "RÄTT VARNING").length;
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
    "**Lagren tillsammans** vid de halkkopplade olyckorna (TROSKLAR-OLYCKSFACIT §9.5 punkt 8): om Trafikverkets väglag (A1) och " +
      `kandidaten (K) varnade på samma plats eller bara den ena. *Bara K* är där kandidaten varnade och väglaget inte. Säsongen sedan ${FORSTA_DAG}.`,
    "",
    ...overlappRader(halk, sHalk),
    "",
    "**Nämnaren** (TROSKLAR-OLYCKSFACIT §11): hur ofta Halkvakt varnade, per klass. Det är inte en träffsäkerhet, men det visar var " +
      "varningarna hamnar.",
    "",
    "| Klass | Olyckor | Varnade | Andel |",
    "| :-- | --: | --: | --: |",
    ...namnare.map(([namn, n, v]) => `| ${namn} | ${n} | ${v} | ${procent(v, n)} |`),
    "",
    ...kollisionsRad(egna),
    ...(veckansOmraden.length
      ? ["**Missarna per förbättringsområde:**", "", "| Område | Missar |", "| :-- | --: |", ...veckansOmraden, ""]
      : ["Inga missar den här veckan.", ""]),
    ...oberoendeRader(egna, s),
    ...vagbitsAvsnitt(egna, s),
    ...(ratta.length ? ["**Rätt varning, fall för fall:**", "", ...ratta.map((o) => rattVarning(o, true)), ""] : []),
    `**Säsongen sedan ${FORSTA_DAG}:** ${sHalk.length} halkkopplade olyckor; ` +
      `Halkvakt hade rätt varning vid ${sRatta} av dem (${procent(sRatta, sHalk.length)}) och missade ${bed("MISS", s)}.` +
      (sVag ? ` Av de rätta varningarna är ${sVag} i klassen TROLIG, väglaget, och de får inte anföras utåt (§13).` : ""),
    "",
    ...(sasongensOmraden.length ? ["| Område (säsongen) | Missar |", "| :-- | --: |", ...sasongensOmraden, ""] : []),
    "**Säljregeln** (§9.6): bara RÄTT VARNING får anföras utåt, med orden *Halkvakt hade en aktiv varning på platsen när olyckan " +
      "började*, lagret utskrivet och säsongens andel bredvid — aldrig att en förare varnades eller att en olycka hade undvikits." +
      " Rätt varning i klassen TROLIG, väglaget, anförs inte (§13).",
    "",
    ...(lasrader.length
      ? ["**Att åtgärda: veckans missar** — tysta olyckor med tydlig eller trolig koppling till halka utan förifylld åtgärd " +
         "(TROSKLAR-OLYCKSFACIT §11):", "", ...lasrader.map((o) => `- [ ] ${missRad(o, true)} — **Åtgärd:** `), ""]
      : []),
    ...(forslag.length
      ? [`**Att åtgärda** — förbättringsområden med minst ${ATERKOMMANDE} missar den här veckan:`, "",
         ...forslag.map(([a, n]) => `- [ ] ${a} — ${n} missar — **Åtgärd:** `), ""]
      : [`Inget förbättringsområde har ${ATERKOMMANDE} missar eller fler den här veckan.`, ""]),
    ...(lasrader.length || forslag.length
      ? ["**Stängningsregeln:** ärendet stängs först när varje rad ovan har en åtgärd: ett kort på tavlan (`kort #NN`), en fråga i " +
         `bedömningens §4.2 eller *ingen åtgärd* med skälet (DECISIONS #802, #852). Står det öppet i ${PAMINN_DYGN} dygn påminner funktionen.`]
      : ["Ingen rad att åtgärda. Ärendet stängs av funktionen."]),
  ].join("\n");
}

export function veckaPaminnelse(vecka: string, dygn: number): string {
  return `${MARKV(vecka)}\nPåminnelse: ärendet har stått öppet i ${dygn} dygn. Varje rad under *Att åtgärda* ska ha ett kort, en ` +
    "fråga i §4.2 eller *ingen åtgärd* med skälet innan det stängs (DECISIONS #802).";
}
