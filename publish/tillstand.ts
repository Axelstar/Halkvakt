// TILLSTÅNDSSKATTAREN — kort #89 steg 2 (TROSKLAR-OVERGANGAR §9, Bengts order 13/9).
//
// VAD DEN ÄR. Motorn minns RESAN men inte VÄGEN: prevFix, odometer, kurs, tystnadsklocka,
// fired-karta — noll minne om vad ytan var för en timme sedan (engine.ts:50–54, verifierat i
// förstudiens §1b). Fukthålet är ett SYMPTOM av det. Skattaren är det saknade minnet, byggt
// UTANFÖR motorn: ett skattat yttillstånd per segment och timme, räknat ur arkiven.
//
// VAD DEN INTE ÄR. Ingen tillståndsmaskin i motorn — det vore våning två före grunden. Den
// skriver inget, larmar inget och rör ingen röst. Den räknas fram ur `radar_precip` och
// `weather_observations`, båda arkiv som redan finns, och kan därför räknas om i efterhand för
// vilket fönster som helst. Det är hela poängen: skuggan behöver ingen skrivande kolumn så
// länge INGÅNGARNA är sparade, och då finns den också när frosten kommer.
//
// BARA BLÖT OCH TORR. Snö, slask, packad och is väntar på #45:s dom, precis som förstudien säger.
//
// TRÖSKLARNA ÄR INTE MINA. Svepen nedan är TROSKLAR-OVERGANGAR §2:s, ord för ord. Skattaren
// uppfinner ingen parameter; den läser dokumentets och skriver ut vad varje punkt ger.
//
// DEN VIKTIGASTE REGELN: FRÅNVARO ÄR INTE TORRT.
// `radar_precip` skriver bara rader när radarn SÅG nederbörd inom täckningen — en saknad rad
// betyder torrt ELLER utanför täckning, och tabellen kan inte skilja dem åt (DECISIONS #162).
// Radarn kan därför aldrig ensam säga "torr". Bara stationen kan, och bara när den faktiskt
// observerat genom fönstret. Utan observation blir svaret "okänt", aldrig "torr" — en tyst
// osanning om torrhet är precis vad värdevakten finns emot.

export type Tillstand = "blöt" | "torr" | "okänt";

/** TROSKLAR-OVERGANGAR §2, oförändrade. */
export const N_SVEP = [1, 2, 3, 4] as const;        // timmar efter sista regnet vägen räknas blöt
export const REGN_SVEP = [0, 0.2, 0.5] as const;    // mm/30 min vid stationen — "> 0" är första steget
export const R_SVEP = [0.1, 0.5, 2] as const;       // mm/h i rate_mean_mmh, RÅRADARSKALA (§2)

export type Underlag = {
  /** Timmar sedan stationens senaste kvalificerande regn. null = inget sådant regn i fönstret. */
  timmarSedanStationsregn: number | null;
  /** Timmar sedan radarns senaste eko ≥ r över segmentet. null = ingen sådan rad. */
  timmarSedanRadarregn: number | null;
  /** Har stationen observationer som täcker hela fönstret bakåt? Utan det går "torr" inte att påstå. */
  stationenTacker: boolean;
};

/** Skattar yttillståndet för ett segment vid en given timme. Ren funktion, inget I/O. */
export function skatta(u: Underlag, N: number): Tillstand {
  const inomN = (t: number | null) => t !== null && Number.isFinite(t) && t >= 0 && t <= N;
  if (inomN(u.timmarSedanStationsregn) || inomN(u.timmarSedanRadarregn)) return "blöt";
  return u.stationenTacker ? "torr" : "okänt";
}

// ── S2: NIVÅ OCH BEVIS (bedömning v3 S2, kort #89, DECISIONS #341; integrationskartan §7.5 och §8 E) ──────────────────
//
// VARFÖR. `skatta()` svarar blöt | torr | okänt och kastar bort HUR blött: regn för 20 minuter sedan med 2 mm och regn för
// fyra timmar sedan med 0,2 mm blir samma ord. Försprånget (#153, kartans §8 A) ska uttrycka allvar som TID, och tid kan
// bara sättas ur ett graderat mått — en tregradig enum ger tre försprång. S2 lägger därför till en funktion BREDVID
// `skatta()` (§5.3: lägg till, ersätt aldrig), vars `tillstand` alltid är exakt `skatta()`s svar.
//
// INGET NYTT TAL. Varje nivå är ANTALET STEG i ett svep som redan står i ett fastställt dokument:
//   väta   = hur många N i N_SVEP som ger blött          (TROSKLAR-OVERGANGAR §2) — hur nyligen
//   mängd  = hur många steg i REGN_SVEP stationens regn klarar (samma) — hur mycket
//   radar  = hur många steg i R_SVEP radarns intensitet klarar  (samma)
//   frys   = ytan mot klassgränsen K1 med osäkerhetszonen K2 (TROSKLAR-FRYSKLASSNINGEN §2): under · nära · över.
//            "nära" är frysklassningens idé: nära gränsen får skattaren säga att den inte vet.
// FRÅNVARO ÄR FORTFARANDE INTE TORRT, och inte heller noll: en okänd regnmängd är null, inte 0; ingen radarrad är null.
// Argumenten prövas mot svepen (D1, TROSKLAR-KOMBINATIONEN §5) — ett eget tal avvisas högljutt.

/** TROSKLAR-FRYSKLASSNINGEN §2, oförändrade — samma som scripts/grind-k-a.ts, vaktade av kontraktsgrinden. */
export const K1_GRANS = [0, 0.5, 1.0] as const;        // klassgränsen, °C
export const K2_ZON = [0, 0.5, 1.0] as const;          // osäkerhetszonen — skattaren får avstå

export type Bevis = Underlag & {
  /** Stationens senaste kvalificerande regnmängd, mm per 30 min. null/utelämnad = okänd (inte noll). */
  mmSenaste?: number | null;
  /** Radarns högsta rate_mean_mmh över segmentet i fönstret, råradarskala. null/utelämnad = ingen rad. */
  radarMmh?: number | null;
  /** Stationens yttemperatur nu, °C. null/utelämnad = ingen mätning. */
  yta?: number | null;
};
export type Frys = "under" | "nära" | "över";
export type Niva = {
  tillstand: Tillstand;              // exakt skatta(bevis, N) — kontraktet orört
  vata: number;                      // 0…N_SVEP.length
  mangd: number | null;              // 0…REGN_SVEP.length, null = okänd
  radar: number | null;              // 0…R_SVEP.length, null = ingen rad
  kallor: ("station" | "radar")[];   // vilka källor som bär vätan inom N
  frys: Frys | null;                 // null = ingen yta
  bevis: string;                     // läsbar rad för skuggloggen och rapporten
};

const giltig = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
const fmt = (x: number) => x.toFixed(1).replace(".", ",");

export function skattaNiva(b: Bevis, N: number, K1: number, K2: number): Niva {
  if (!(N_SVEP as readonly number[]).includes(N)) throw new Error(`skattaNiva: N=${N} står inte i N_SVEP (${N_SVEP.join(" · ")})`);
  if (!(K1_GRANS as readonly number[]).includes(K1)) throw new Error(`skattaNiva: K1=${K1} står inte i K1_GRANS (${K1_GRANS.join(" · ")})`);
  if (!(K2_ZON as readonly number[]).includes(K2)) throw new Error(`skattaNiva: K2=${K2} står inte i K2_ZON (${K2_ZON.join(" · ")})`);
  const tillstand = skatta(b, N);
  const vata = N_SVEP.filter((n) => skatta(b, n) === "blöt").length;
  const mangd = giltig(b.mmSenaste) ? REGN_SVEP.filter((m, i) => (i === 0 ? b.mmSenaste! > 0 : b.mmSenaste! >= m)).length : null;
  const radar = giltig(b.radarMmh) ? R_SVEP.filter((r) => b.radarMmh! >= r).length : null;
  const inomN = (t: number | null) => t !== null && Number.isFinite(t) && t >= 0 && t <= N;
  const kallor: ("station" | "radar")[] = [];
  if (inomN(b.timmarSedanStationsregn)) kallor.push("station");
  if (inomN(b.timmarSedanRadarregn)) kallor.push("radar");
  const yta = typeof b.yta === "number" && Number.isFinite(b.yta) ? b.yta : null;
  const frys: Frys | null = yta === null ? null : yta <= K1 - K2 ? "under" : yta > K1 + K2 ? "över" : "nära";
  const bevis = [
    tillstand,
    `väta ${vata}/${N_SVEP.length}`,
    `mängd ${mangd === null ? "okänd" : `${mangd}/${REGN_SVEP.length}`}`,
    `radar ${radar === null ? "ingen rad" : `${radar}/${R_SVEP.length}`}`,
    kallor.length ? `källor ${kallor.join("+")}` : "inga källor inom N",
    yta === null ? "yta okänd" : `yta ${fmt(yta)} °C ${frys} ${fmt(K1)} ±${fmt(K2)}`,
  ].join(" · ");
  return { tillstand, vata, mangd, radar, kallor, frys, bevis };
}

/** Enkel överenskommelse mellan två källor som BÅDA har en åsikt. null = ingen jämförelse möjlig. */
export function samstammiga(radar: boolean | null, station: boolean | null): boolean | null {
  return radar === null || station === null ? null : radar === station;
}
