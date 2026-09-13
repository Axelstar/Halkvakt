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

/** Enkel överenskommelse mellan två källor som BÅDA har en åsikt. null = ingen jämförelse möjlig. */
export function samstammiga(radar: boolean | null, station: boolean | null): boolean | null {
  return radar === null || station === null ? null : radar === station;
}
