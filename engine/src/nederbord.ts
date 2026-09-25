// Nederbördstypen — regn, slask eller snö (kort #45, docs/TROSKLAR-NEDERBORDSTYPEN.md, DECISIONS #361). Ren logik, inget I/O.
//
// Trafikverkets `precipitation` är en UPPMÄTT typ (rain / sleet / snow / no), inte ett ja/nej (steg 1, 25/9). Vid en station med
// typgivare är sorten alltså en mätning; våtbulben behövs bara där ingen givare ser, och får där bara stärka eller förlänga en
// varning (T3/T6). Allt här är skugga: motorn och apparna läser inget av det förrän domen i mars 2027 (§6).

export type Klass = "regn" | "slask" | "sno";
export type Givarklass = Klass | "ingen" | "okand";
export type SmhiKlass = Klass | "underkylt" | "ingen" | "utesluten";

/** §3: svepet — snögränsen L och regngränsen U (°C Tw). Första paret är kortets och det primära. */
export const SVEP: readonly { L: number; U: number }[] = [
  { L: 0, U: 1.5 }, { L: 0, U: 2 }, { L: 0.5, U: 1.5 }, { L: 0.5, U: 2 },
];
/** §4: bandet där jämförelsen görs (°C Tw). Utanför är svaret trivialt och skulle blåsa upp träffen. */
export const BAND_C: readonly [number, number] = [-3, 5];

// Tre decimaler innan en gräns jämförs: flyttalsläxan 13/9 (4,8 − 4,4 är inte 0,4 i TypeScript).
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Mättnadsångtrycket över vatten (hPa), WMO:s Magnusform (Guide nr 8). */
const es = (t: number) => 6.112 * Math.exp((17.62 * t) / (243.12 + t));
/** Standardtryck: stationstrycket arkiveras inte (§7 punkt 6). */
export const TRYCK_HPA = 1013.25;

/** Våtbulbstemperaturen (°C, tre decimaler) ur luftens temperatur och relativa fuktighet: WMO:s psykrometerekvation
 *  e = es(Tw) − 6,53·10⁻⁴·(1 + 0,000944·Tw)·p·(T − Tw), löst med halvering. Stulls formel prövades först och föll på sin egen
 *  kontroll 25/9: den ligger 0,2–0,7 °C för lågt nära 0 °C — just där klassgränserna ligger. null utanför −40…+50 °C och 0–100 %. */
export function vatbulb(t: number | null | undefined, rh: number | null | undefined): number | null {
  if (t == null || rh == null || !Number.isFinite(t) || !Number.isFinite(rh)) return null;
  if (t < -40 || t > 50 || rh <= 0 || rh > 100) return null;
  const e = (rh / 100) * es(t);
  let lo = t - 40, hi = t;   // Tw ligger alltid mellan daggpunkten och T; −40 grader under T räcker med råge
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    const f = es(m) - 6.53e-4 * (1 + 0.000944 * m) * TRYCK_HPA * (t - m) - e;
    if (f > 0) hi = m; else lo = m;
  }
  return r3((lo + hi) / 2);
}

/** Tw ≤ L ⇒ snö · L < Tw < U ⇒ slask · Tw ≥ U ⇒ regn (§3). */
export function klassa(tw: number, L: number, U: number): Klass {
  const v = r3(tw);
  return v <= L ? "sno" : v < U ? "slask" : "regn";
}

/** Samma torrord som snapshotkärnan — kontraktsgrinden vaktar att listorna inte glider isär. */
const DRY = new Set(["no", "dry"]);

/** Stationsgivarens sträng. En okänd sträng är okänd och aldrig en klass (§7 punkt 5); null är "ingen typgivare". */
export function givarklass(s: string | null | undefined): Givarklass {
  if (s == null || s === "") return "okand";
  const v = s.toLowerCase();
  if (DRY.has(v)) return "ingen";
  if (v === "rain") return "regn";
  if (v === "sleet") return "slask";
  if (v === "snow") return "sno";
  return "okand";
}

const fran = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** §4: SMHI:s rådande väder (parameter 13). 100-serien följer WMO 4680; 156 heter "Tätt duggregn" i SMHI:s lista men är
 *  tätt UNDERKYLT duggregn i WMO (§7 punkt 2). Koder under 100 (manuella stationer) och allt ej listat utesluts. */
const SMHI_KODER: Record<"regn" | "slask" | "sno" | "underkylt", readonly number[]> = {
  regn: [...fran(150, 153), 157, 158, ...fran(160, 163), ...fran(180, 184)],
  slask: [167, 168],
  sno: [145, 146, ...fran(170, 173), 177, ...fran(185, 187)],
  underkylt: [147, 148, ...fran(154, 156), ...fran(164, 166)],
};

export function smhiKlass(kod: number | string | null | undefined): SmhiKlass {
  const k = Number(kod);
  if (kod == null || kod === "" || !Number.isInteger(k)) return "utesluten";
  for (const [klass, koder] of Object.entries(SMHI_KODER)) if (koder.includes(k)) return klass as SmhiKlass;
  return k >= 100 && k <= 139 ? "ingen" : "utesluten";
}
