// Grind S-B och S-C — segmentprognosens skuggdrift (docs/TROSKLAR-SKUGGAN.md §2–§3, kort #38b steg 4, DECISIONS #327).
//
// Skuggmotorn loggar sedan 23/9 vad segmentprognosen SKULLE ha flaggat (`shadow_log.prognos.p`, DECISIONS #325) och vad
// stationerna på rutten mätte medan den gjorde det (`prognos.h`, DECISIONS #326). Den här knappen dömer de raderna mot §3:s
// fällda värden. Loggen är rå, domen räknar (Axel, DECISIONS #196). Ingen tröskel sätts här: facitradien och frysgränsen
// importeras ur segmentmotorn, grind B:s och C:s tal står en gång, här, och i dokumentet.
//
// TVÅ LÄGEN, och det är blindningen (inga träffandelar före utsatt tid):
//   --underlag (standard)  BARA ANTAL: varv, episoder, händelser per källa, halkperioder, hur långt C1/C2 kommit.
//   --dom                  andelarna B1–B3 med marginalvakten och grindutfallet. Körs vid domens tidpunkt (mars 2027),
//                          eller när Bengt uttryckligen beställer en läsning.
//
// VAD VARJE MÅTT VILAR PÅ (§2):
//  · SKUGGVARNING = en EPISOD: samma provpunkt (rutt, km) flaggad (frys, status ≥ 1) i varv som ligger högst EPISOD_GAP_H
//    isär. Ett varv var trettionde minut får inte räknas som en ny varning var trettionde minut.
//  · B1 FALSKLARM (DECISIONS #352): en HOLDOUT-EPISOD — en station inom facitradien av rutten vars skattning ur de ÖVRIGA
//    ankarna (h[3], leave-one-out) är ≤ frysgränsen i varv ≤ EPISOD_GAP_H isär — döms av stationens egen mätning i samma
//    varv (±30 min, snävare än §2:s ±45): > +2 °C i något varv ⇒ FALSK; ≤ frysgränsen ⇒ BEKRÄFTAD; annars OMÄTBAR och aldrig
//    med i B1. Kamerabild bekräftar men fäller aldrig (§2). Före 25/9 dömde stationen episoder i prognosen PÅ rutten, som
//    stationen själv vägde tyngst i — falsklarm nära en station kunde då inte uppstå. Episoderna på rutten bär B3.
//  · B2 MISS: en FACITHÄNDELSE (SMHI-isvarning, halka i situation_archive, väglag kod ≥ 2 från operatören, förarens "stämde")
//    inom facitradien av rutten, på ett TÄCKT segment (närmaste provpunkt hade status ≥ 1), där ingen provpunkt inom
//    facitradien var flaggad i något varv de MISS_FONSTER_H timmarna före händelsen. Orsaksklassad: nederbörd vid närmaste
//    station inom ±1 h ⇒ NEDERBÖRDSDRIVEN (blixthalkans hål, #16 — redovisas, räknas inte i B2), annars UTSTRÅLNING.
//  · B3 MERVÄRDE: bland BEKRÄFTADE episoder, andelen där punktmotorn (samma rads `alerts`, punktfaror med position inom
//    facitradien) var tyst hela episoden eller talade först > B3_SEN_MIN efter episodens start. Läses sedan 23/9 som "rätt
//    på kartan eller mätt varning förlängd" (DECISIONS #319) — talet är oförändrat.
//  · C1 ≥ 20 bedömbara händelser över ≥ 3 halkperioder (händelser mer än PERIOD_GAP_D dygn isär är olika perioder) ·
//    C2 ≥ 30 bedömbara holdout-episoder · C3 backtest och drift åt samma håll: holdout-radernas grova fel mot grind A:s dömda
//    A2 (3,5 %, DECISIONS #321) ≤ 10 pe; `--grindA2 <procent>` ersätter talet. FÖNSTRET är hela perioden sedan prognosloggens
//    start 23/9 (DECISIONS #352) — dokumentet dömer hela vintern. I dom-läget skrivs andelarna först när C1 och C2 är uppfyllda.
//
//  · KAMERA (`kamerafacit`, sql/033, DECISIONS #329): en bild klassad is/snö/slask inom facitradien är en FACITHÄNDELSE (B2)
//    och BEKRÄFTAR en episod som pågick när bilden togs (B1:s täljare påverkas aldrig — kameran fäller inte, §2). Våt, bar
//    och okänd gör ingenting i domen.
// Segmentlarm från punktmotorn utan position (`geo: "segment"`) räknas inte i B3.
//
// Run: DATABASE_URL=... node --experimental-strip-types publish/grind-s-b.ts [dagar — utan: sedan 23/9] [--underlag|--dom] [--grindA2 3.5]
// Självtest utan DB: publish/grind-s-b.ts --sjalvtest
import { Z, andelSe, utfallTak, utfallGolv, grindutfall, type Utfall } from "./marginal.ts";
import { narmastLangs, FRYS_C } from "../engine/src/segment.ts";
import { skuggmotornsRutter, hamtaHandelser, FACIT_KM, type Rutter, type Handelse } from "./skuggfacit.ts";

const B1_MAX = 0.20, B2_MAX = 0.30, B3_MIN = 0.25;                        // §3 grind B
const C1_MIN_HANDELSER = 20, C1_MIN_PERIODER = 3, C2_MIN_EPISODER = 30, C3_MAX_PE = 10;   // §3 grind C
const FALSK_YTA_C = 2;            // §2: station > +2 °C fäller
const MISS_FONSTER_H = 2;         // §2: flaggad inom 2 h före händelsen
const B3_SEN_MIN = 30;            // §3: punktmotorn tyst eller > 30 min senare
const EPISOD_GAP_H = 2;           // flaggade varv närmare än så på samma punkt är samma varning
const PERIOD_GAP_D = 2;           // halkperioder
const PROGNOS_START = "2026-09-23";  // prognosloggens första dygn (DECISIONS #325) — fönstret (#352)
const GRIND_A2_DOMD = 3.5;        // grind A:s dömda A2 i procent (DECISIONS #321) — C3:s backtestsida (#352)

export type Punkt = [number, number | null, number | null, number, number, number];
export type HoldoutRad = [number, string, number, number | null, number | null, number];
export type Larm = { kind: string; geo?: string; lon?: number; lat?: number };
export type Varv = { t: Date; rutt: string; p: Punkt[]; h: HoldoutRad[]; alerts: Larm[] };
export type Episod = { rutt: string; km: number; start: Date; slut: Date; varv: Varv[] };

const H = 3600_000;

/** Episoder: flaggade provpunkter per (rutt, km), varv som ligger ≤ EPISOD_GAP_H isär hör ihop. */
export function episoder(varv: Varv[]): Episod[] {
  const per = new Map<string, Varv[]>();
  for (const v of [...varv].sort((a, b) => +a.t - +b.t))
    for (const q of v.p) if (q[5] === 1 && q[4] >= 1) {
      const k = `${v.rutt}|${q[0]}`;
      (per.get(k) ?? per.set(k, []).get(k)!).push(v);
    }
  const ut: Episod[] = [];
  for (const [k, vs] of per) {
    const [rutt, kmS] = k.split("|"); const km = Number(kmS);
    let cur: Varv[] = [];
    for (const v of vs) {
      if (cur.length && +v.t - +cur[cur.length - 1].t > EPISOD_GAP_H * H) { ut.push({ rutt, km, start: cur[0].t, slut: cur[cur.length - 1].t, varv: cur }); cur = []; }
      cur.push(v);
    }
    if (cur.length) ut.push({ rutt, km, start: cur[0].t, slut: cur[cur.length - 1].t, varv: cur });
  }
  return ut.sort((a, b) => +a.start - +b.start || a.rutt.localeCompare(b.rutt) || a.km - b.km);
}

export type Stationsdom = "BEKRÄFTAD" | "FALSK" | "OMÄTBAR";
export type Lage = { rutt: string; km: number; t: Date };
/** Var på rutterna en händelse ligger (inom facitradien), annars null. */
export function lage(e: { lon: number; lat: number; t: Date }, rutter: Rutter): Lage | null {
  let bast: Lage & { d: number } | null = null;
  for (const [rutt, line] of Object.entries(rutter)) {
    const n = narmastLangs(e, line);
    if (n.km <= FACIT_KM && (!bast || n.km < bast.d)) bast = { rutt, km: n.vid, t: e.t, d: n.km };
  }
  return bast;
}
/** B1: vad mätte holdout-stationen inom facitradien av punkten under episoden? Varm ⇒ FALSK; frusen ⇒ BEKRÄFTAD.
 *  En kamerabild med halka inom facitradien, tagen medan episoden pågick (±30 min), bekräftar också — men fäller aldrig (§2). */
export function stationsdom(ep: Episod, kameror: Lage[] = []): Stationsdom {
  let varm = false, frusen = false;
  for (const v of ep.varv)
    for (const h of v.h) if (Math.abs(h[0] - ep.km) <= FACIT_KM) {
      if (h[2] > FALSK_YTA_C) varm = true;
      else if (h[2] <= FRYS_C) frusen = true;
    }
  const kamera = kameror.some((k) => k.rutt === ep.rutt && Math.abs(k.km - ep.km) <= FACIT_KM
    && +k.t >= +ep.start - 30 * 60_000 && +k.t <= +ep.slut + 30 * 60_000);
  return varm ? "FALSK" : frusen || kamera ? "BEKRÄFTAD" : "OMÄTBAR";
}

/** B1 och C2 (DECISIONS #352): HOLDOUT-EPISODER — stationens leave-one-out-skattning ≤ frysgränsen i varv ≤ EPISOD_GAP_H isär. */
export type HoldoutEpisod = { rutt: string; station: string; km: number; start: Date; slut: Date; matt: number[] };
export function holdoutEpisoder(varv: Varv[]): HoldoutEpisod[] {
  const per = new Map<string, { t: Date; km: number; matt: number }[]>();
  for (const v of [...varv].sort((a, b) => +a.t - +b.t))
    for (const h of v.h) if (h[3] !== null && h[3] <= FRYS_C) {
      const k = `${v.rutt}\u0001${h[1]}`;
      (per.get(k) ?? per.set(k, []).get(k)!).push({ t: v.t, km: h[0], matt: h[2] });
    }
  const ut: HoldoutEpisod[] = [];
  for (const [k, rs] of per) {
    const [rutt, station] = k.split("\u0001");
    let cur: typeof rs = [];
    const stang = () => { if (cur.length) ut.push({ rutt, station, km: cur[0].km, start: cur[0].t, slut: cur[cur.length - 1].t, matt: cur.map((c) => c.matt) }); cur = []; };
    for (const r of rs) { if (cur.length && +r.t - +cur[cur.length - 1].t > EPISOD_GAP_H * H) stang(); cur.push(r); }
    stang();
  }
  return ut.sort((a, b) => +a.start - +b.start || a.rutt.localeCompare(b.rutt) || a.km - b.km);
}
/** Stationen dömer en prognos som inte innehåller den: > +2 °C ⇒ FALSK, ≤ frysgränsen (eller halka i bild) ⇒ BEKRÄFTAD. */
export function holdoutDom(ep: HoldoutEpisod, kameror: Lage[] = []): Stationsdom {
  if (ep.matt.some((m) => m > FALSK_YTA_C)) return "FALSK";
  const kamera = kameror.some((k) => k.rutt === ep.rutt && Math.abs(k.km - ep.km) <= FACIT_KM
    && +k.t >= +ep.start - 30 * 60_000 && +k.t <= +ep.slut + 30 * 60_000);
  return ep.matt.some((m) => m <= FRYS_C) || kamera ? "BEKRÄFTAD" : "OMÄTBAR";
}

/** B3: var punktmotorn tyst under episoden, eller kom den > B3_SEN_MIN efter starten? Bara punktfaror med position. */
export function mervarde(ep: Episod, rutter: Rutter): boolean {
  const line = rutter[ep.rutt];
  if (!line) return false;
  let forst: Date | null = null;
  for (const v of ep.varv)
    for (const a of v.alerts)
      if ((a.kind === "icing_point" || a.kind === "slippery_segment") && typeof a.lon === "number" && typeof a.lat === "number") {
        const n = narmastLangs({ lon: a.lon, lat: a.lat }, line);
        if (n.km <= FACIT_KM && Math.abs(n.vid - ep.km) <= FACIT_KM && (forst === null || v.t < forst)) forst = v.t;
      }
  return forst === null || +forst - +ep.start > B3_SEN_MIN * 60_000;
}

export type Handelsedom = { utfall: "TRÄFF" | "MISS" | "OBEDÖMBAR"; orsak: "UTSTRÅLNING" | "NEDERBÖRD" | null; rutt: string | null; km: number | null };
/** B2: låg händelsen på ett täckt segment, och var någon provpunkt inom facitradien flaggad de två timmarna före? */
export function handelsedom(e: Handelse, varv: Varv[], rutter: Rutter): Handelsedom {
  let bast: { rutt: string; km: number; d: number } | null = null;
  for (const [rutt, line] of Object.entries(rutter)) {
    const n = narmastLangs(e, line);
    if (n.km <= FACIT_KM && (!bast || n.km < bast.d)) bast = { rutt, km: n.vid, d: n.km };
  }
  if (!bast) return { utfall: "OBEDÖMBAR", orsak: null, rutt: null, km: null };
  const fore = varv.filter((v) => v.rutt === bast!.rutt && +v.t <= +e.t && +e.t - +v.t <= MISS_FONSTER_H * H);
  if (!fore.length) return { utfall: "OBEDÖMBAR", orsak: null, rutt: bast.rutt, km: bast.km };
  const senaste = fore.reduce((a, b) => (+b.t > +a.t ? b : a));
  const nara = (q: Punkt) => Math.abs(q[0] - bast!.km) <= FACIT_KM;
  const tackt = senaste.p.some((q) => nara(q) && q[4] >= 1);
  if (!tackt) return { utfall: "OBEDÖMBAR", orsak: null, rutt: bast.rutt, km: bast.km };
  const flaggad = fore.some((v) => v.p.some((q) => nara(q) && q[5] === 1 && q[4] >= 1));
  if (flaggad) return { utfall: "TRÄFF", orsak: null, rutt: bast.rutt, km: bast.km };
  return { utfall: "MISS", orsak: e.nederbord ? "NEDERBÖRD" : "UTSTRÅLNING", rutt: bast.rutt, km: bast.km };
}

/** Halkperioder: bedömbara händelser sorterade i tid; ett hopp > PERIOD_GAP_D dygn börjar en ny period. */
export function halkperioder(tider: Date[]): number {
  const ts = [...tider].sort((a, b) => +a - +b);
  let n = 0;
  for (let i = 0; i < ts.length; i++) if (i === 0 || +ts[i] - +ts[i - 1] > PERIOD_GAP_D * 24 * H) n++;
  return n;
}

/** Holdout-radernas grova fel (> 2 °C) i fönstret — C3:s driftsida, samma mått som grind A:s A2. */
export function holdoutGrova(varv: Varv[]): { n: number; grova: number } {
  let n = 0, grova = 0;
  for (const v of varv) for (const h of v.h) if (h[3] !== null && h[2] <= 5) { n++; if (Math.abs(h[3] - h[2]) > 2) grova++; }
  return { n, grova };
}

export function rakna(varv: Varv[], handelser: Handelse[], rutter: Rutter) {
  const eps = episoder(varv);
  const kameror = handelser.filter((e) => e.kalla === "kamera").map((e) => lage(e, rutter)).filter((x): x is Lage => x !== null);
  const domar = eps.map((ep) => ({ ep, dom: stationsdom(ep, kameror) }));
  const bekraftade = domar.filter((d) => d.dom === "BEKRÄFTAD"), falska = domar.filter((d) => d.dom === "FALSK"), omatbara = domar.filter((d) => d.dom === "OMÄTBAR");
  const merv = bekraftade.filter((d) => mervarde(d.ep, rutter));
  const hd = handelser.map((e) => ({ e, d: handelsedom(e, varv, rutter) }));
  const traffar = hd.filter((x) => x.d.utfall === "TRÄFF"), missar = hd.filter((x) => x.d.utfall === "MISS"), obed = hd.filter((x) => x.d.utfall === "OBEDÖMBAR");
  const missUtstr = missar.filter((x) => x.d.orsak === "UTSTRÅLNING"), missNed = missar.filter((x) => x.d.orsak === "NEDERBÖRD");
  const bedomda = traffar.length + missUtstr.length;   // nederbördsmissar står bredvid, aldrig i B2
  const perioder = halkperioder([...traffar, ...missar].map((x) => x.e.t));
  const heps = holdoutEpisoder(varv);
  const hdomar = heps.map((ep) => ({ ep, dom: holdoutDom(ep, kameror) }));
  const b1Bekr = hdomar.filter((d) => d.dom === "BEKRÄFTAD"), b1Falska = hdomar.filter((d) => d.dom === "FALSK"), b1Omat = hdomar.filter((d) => d.dom === "OMÄTBAR");
  return { eps, bekraftade, falska, omatbara, merv, traffar, missar, missUtstr, missNed, obed, bedomda, perioder, grova: holdoutGrova(varv),
           heps, b1Bekr, b1Falska, b1Omat };
}

export function rapport(varv: Varv[], handelser: Handelse[], rutter: Rutter, lage: "underlag" | "dom", grindA2: number | null, label: string, selftest = false) {
  const r = rakna(varv, handelser, rutter);
  const kallor = new Map<string, number>();
  for (const e of handelser) kallor.set(e.kalla, (kallor.get(e.kalla) ?? 0) + 1);
  console.log(`Grind S-B/S-C — segmentprognosens skuggdrift (${label}) · läge: ${lage.toUpperCase()}`);
  console.log(`Varv med prognos ${varv.length} på ${new Set(varv.map((v) => v.rutt)).size} rutter · provpunkter ${varv.reduce((a, v) => a + v.p.length, 0)} · holdout-rader ${varv.reduce((a, v) => a + v.h.length, 0)}`);
  console.log(`Holdout-episoder (B1, leave-one-out) ${r.heps.length}: bedömbara ${r.b1Bekr.length + r.b1Falska.length}, OMÄTBARA ${r.b1Omat.length} (stationen mellan ${FRYS_C} och ${FALSK_YTA_C} °C)`);
  console.log(`Episoder på rutten (B3) ${r.eps.length}: med station eller kamera ${r.bekraftade.length + r.falska.length}, OMÄTBARA ${r.omatbara.length} (ingen holdout inom ${FACIT_KM} km)`);
  console.log(`Facithändelser ${handelser.length} — ${[...kallor].map(([k, n]) => `${k} ${n}`).join(" · ") || "inga"}; på täckta segment ${r.traffar.length + r.missar.length}, OBEDÖMBARA ${r.obed.length}`);
  console.log(`Halkperioder ${r.perioder}`);
  const c1 = r.traffar.length + r.missar.length >= C1_MIN_HANDELSER && r.perioder >= C1_MIN_PERIODER;
  const c2 = r.b1Bekr.length + r.b1Falska.length >= C2_MIN_EPISODER;
  console.log(`C1 ${r.traffar.length + r.missar.length}/${C1_MIN_HANDELSER} händelser, ${r.perioder}/${C1_MIN_PERIODER} perioder → ${c1 ? "uppfyllt" : "inte än"} · C2 ${r.b1Bekr.length + r.b1Falska.length}/${C2_MIN_EPISODER} bedömbara holdout-episoder → ${c2 ? "uppfyllt" : "inte än"}`);
  if (lage === "underlag") {
    console.log(`\nUNDERLAG, INGA ANDELAR: blindningen gäller till domens tidpunkt (mars 2027). Kör med --dom på Bengts order.`);
    return null;
  }
  // Andelarna först när C1 och C2 är uppfyllda (DECISIONS #352) — självtestet räknar dem ändå, utan att det är en läsning.
  if ((!c1 || !c2) && !selftest) {
    console.log(`\n⏳ INGEN DOM — grind C inte uppfylld. Andelarna skrivs först när C1 och C2 är uppfyllda; utfallet är ALLTID fortsatt skugga (§4 c).`);
    return null;
  }
  const b1n = r.b1Bekr.length + r.b1Falska.length, b1 = b1n ? r.b1Falska.length / b1n : NaN;
  const b2 = r.bedomda ? r.missUtstr.length / r.bedomda : NaN;
  const b3 = r.bekraftade.length ? r.merv.length / r.bekraftade.length : NaN;
  const u = (v: number, n: number, tr: number, golv: boolean): Utfall | "—" => n ? (golv ? utfallGolv(v, tr, andelSe(v, n)) : utfallTak(v, tr, andelSe(v, n))) : "—";
  const pe = (v: number, n: number) => n ? ` [±${(Z * andelSe(v, n) * 100).toFixed(1)} pe]` : "";
  const uB1 = u(b1, b1n, B1_MAX, false), uB2 = u(b2, r.bedomda, B2_MAX, false), uB3 = u(b3, r.bekraftade.length, B3_MIN, true);
  console.log(`\nB1 falsklarm ≤ ${B1_MAX * 100} %: ${b1n ? (b1 * 100).toFixed(1) + " %" : "—"}${pe(b1, b1n)} (${r.b1Falska.length} falska holdout-episoder av ${b1n}) → ${uB1}`);
  console.log(`B2 utstrålningsmissar ≤ ${B2_MAX * 100} %: ${r.bedomda ? (b2 * 100).toFixed(1) + " %" : "—"}${pe(b2, r.bedomda)} (${r.missUtstr.length} av ${r.bedomda}) → ${uB2}`);
  console.log(`B3 mervärde ≥ ${B3_MIN * 100} %: ${r.bekraftade.length ? (b3 * 100).toFixed(1) + " %" : "—"}${pe(b3, r.bekraftade.length)} (${r.merv.length} av ${r.bekraftade.length} bekräftade där punktmotorn var tyst eller > ${B3_SEN_MIN} min senare) → ${uB3}`);
  const a2 = r.grova.n ? r.grova.grova / r.grova.n : NaN;
  const c3 = grindA2 === null || !r.grova.n ? "OAVGJORT" : Math.abs(a2 * 100 - grindA2) <= C3_MAX_PE ? "KLARAR" : "FALLER";
  console.log(`C3 drift mot backtest: holdout-radernas grova fel ${r.grova.n ? (a2 * 100).toFixed(1) + " %" : "—"} på ${r.grova.n} rader${grindA2 === null ? " — grind A:s A2 ej given (--grindA2)" : ` mot grind A ${grindA2} %`} → ${c3}`);
  console.log(`Nederbördsdrivna missar ${r.missNed.length} (till #16, inte B2)`);
  if (selftest) return { b1, b2, b3, uB1, uB2, uB3, c1, c2, c3 };
  const dom = grindutfall([uB1, uB2, uB3, c3] as Utfall[]);
  console.log(`\nDOM: GRIND B ${dom === "KLARAR" ? "KLARAD — §4 (a)/(b) avgörs av banden" : dom === "FALLER" ? "FALLEN — tyst (§4 c)" : "OAVGJORD — mät vidare"}`);
  return dom;
}

// ── Självtest: en rutt, sju varv, fyra händelser med känd sanning.
if (process.argv.includes("--sjalvtest")) {
  const LINE: [number, number][] = [[13.0, 56.0], [13.5, 56.0]];                 // ≈ 31 km
  const rutter: Rutter = { "Provrutt": LINE };
  const t0 = new Date("2026-12-01T00:00:00Z");
  const tid = (min: number) => new Date(+t0 + min * 60_000);
  const lonVid = (km: number) => 13.0 + km / 31.1 * 0.5;
  const pt = (km: number, frys: 0 | 1, status: 0 | 1 | 2 = 1): Punkt => [km, frys ? -1.5 : 3, status ? 5 : null, status ? 5 : 0, status, frys];
  // Provpunkter var 5 km; km 25 är okänd (status 0) i alla varv.
  const p = (flagg: number[]): Punkt[] => [0, 5, 10, 15, 20, 25, 30].map((km) => pt(km, flagg.includes(km) ? 1 : 0, km === 25 ? 0 : 1));
  const varv: Varv[] = [
    // "tyst" vid km 5,2: prognosen UTAN stationen säger 0,5, stationen mäter +3 — ett falsklarm som prognosen PÅ rutten (km 5
    // aldrig flaggad) aldrig visade. Fällan ligger där den gamla B1 gav noll (DECISIONS #352).
    { t: tid(0),   rutt: "Provrutt", p: p([10, 20]), h: [[5.2, "tyst", 3, 0.5, 5, 4], [10.5, "kall", -1, -0.5, 6, 4], [20.8, "varm", 4, 0.2, 7, 4]], alerts: [] },
    { t: tid(30),  rutt: "Provrutt", p: p([10, 20]), h: [[10.5, "kall", -1.2, -0.4, 6, 4], [20.8, "varm", 3.5, 0.1, 7, 4]], alerts: [] },
    { t: tid(60),  rutt: "Provrutt", p: p([10]),     h: [[10.5, "kall", -0.8, -0.3, 6, 4], [20.8, "varm", 3.9, 1.5, 7, 4]],
      alerts: [{ kind: "icing_point", geo: "punkt", lon: lonVid(10.2), lat: 56.0 }] },                     // punktmotorn 60 min efter start ⇒ mervärde
    { t: tid(90),  rutt: "Provrutt", p: p([]),       h: [[10.5, "kall", 0.5, 0.2, 6, 4], [20.8, "varm", 4.2, 1.8, 7, 4]], alerts: [] },
    { t: tid(600), rutt: "Provrutt", p: p([30]),     h: [[10.5, "kall", 2.5, 2.1, 6, 4], [20.8, "varm", 5, 4.4, 7, 4]], alerts: [] },   // km 30: ingen holdout inom 2 km ⇒ OMÄTBAR
    { t: tid(630), rutt: "Provrutt", p: p([30]),     h: [[10.5, "kall", 2.4, 2.0, 6, 4], [20.8, "varm", 5, 4.4, 7, 4]], alerts: [] },
    { t: tid(660), rutt: "Provrutt", p: p([]),       h: [[10.5, "kall", 2.6, 2.2, 6, 4], [20.8, "varm", 5, 4.4, 7, 4]], alerts: [] },
  ];
  const handelser: Handelse[] = [
    { id: "E1", t: tid(45),  lon: lonVid(10.3), lat: 56.0,   kalla: "situation", nederbord: false },   // flaggad före ⇒ TRÄFF
    { id: "E2", t: tid(80),  lon: lonVid(15.4), lat: 56.0,   kalla: "smhi",      nederbord: false },   // täckt, aldrig flaggad ⇒ MISS utstrålning
    { id: "E3", t: tid(80),  lon: lonVid(5.1),  lat: 56.0,   kalla: "väglag",    nederbord: true },    // täckt, aldrig flaggad, regn ⇒ MISS nederbörd (inte B2)
    { id: "E4", t: tid(80),  lon: lonVid(25.2), lat: 56.0,   kalla: "förare",    nederbord: false },   // km 25 okänd ⇒ OBEDÖMBAR
    { id: "E5", t: tid(80),  lon: lonVid(15.0), lat: 56.06,  kalla: "smhi",      nederbord: false },   // 6,7 km från rutten ⇒ OBEDÖMBAR
    { id: "E6", t: tid(615), lon: lonVid(30.4), lat: 56.0,   kalla: "kamera",    nederbord: false },   // snö i bild vid km 30 medan episoden pågår ⇒ bekräftar den (utan station) och är en TRÄFF
    { id: "E7", t: tid(15),  lon: lonVid(20.6), lat: 56.0,   kalla: "kamera",    nederbord: false },   // snö i bild vid km 20 — stationen där mätte +4: stationen fäller, kameran får inte rädda
  ];
  const r = rakna(varv, handelser, rutter);
  const k = (namn: string, fick: unknown, vantat: unknown) => { if (fick !== vantat) { console.error(`  FEL: ${namn} = ${fick}, väntat ${vantat}`); process.exit(1); } console.log(`  ok: ${namn} = ${fick}`); };
  k("episoder", r.eps.length, 3);                       // km 10 (0–60), km 20 (0–30), km 30 (600–630); varv 600 ligger > 2 h efter ⇒ egen episod
  k("bekräftade (station km 10 + kamera km 30)", r.bekraftade.length, 2);
  k("falska (stationen vid km 20 fäller trots kamerabilden)", r.falska.length, 1);
  k("omätbara", r.omatbara.length, 0);
  k("mervärde (punktmotorn 60 min sen vid km 10, tyst vid km 30)", r.merv.length, 2);
  k("träffar (E1 + kamerorna E6, E7 flaggade före)", r.traffar.length, 3);
  k("missar utstrålning", r.missUtstr.length, 1);
  k("missar nederbörd", r.missNed.length, 1);
  k("obedömbara händelser", r.obed.length, 2);
  k("halkperioder", r.perioder, 1);                     // minut 15–615 ligger inom ett dygn: en period, inte två
  k("holdout-episoder (tyst, kall, varm)", r.heps.length, 3);
  k("holdout: falska (varm + tyst, där rutten aldrig flaggade)", r.b1Falska.length, 2);
  k("holdout: bekräftade (kall)", r.b1Bekr.length, 1);
  const ut = rapport(varv, handelser, rutter, "dom", 3.5, "SJÄLVTEST", true)!;
  k("B1 på leave-one-out = 2/3", ut.b1, 2 / 3);
  k("B2 = 1/4", ut.b2, 1 / 4);
  k("B3 = 100 %", ut.b3, 1);
  k("C1 inte uppfylld på fem händelser", ut.c1, false);
  k("C2 inte uppfylld på två episoder", ut.c2, false);
  // Blindningen: underlagsläget skriver aldrig en andel.
  const skrivet: string[] = []; const orig = console.log; console.log = (s?: unknown) => { skrivet.push(String(s)); };
  rapport(varv, handelser, rutter, "underlag", null, "SJÄLVTEST", true);
  console.log = orig;
  k("underlag nämner inga procent", skrivet.some((s) => /\d %|\d+\.\d %/.test(s)), false);
  // Blindningen i dom-läget (DECISIONS #352): C1/C2 inte uppfyllda ⇒ inga andelar och ingen dom.
  const domskrivet: string[] = []; console.log = (s?: unknown) => { domskrivet.push(String(s)); };
  const domut = rapport(varv, handelser, rutter, "dom", 3.5, "SJÄLVTEST");
  console.log = orig;
  k("dom-läget under C nämner inga procent", domskrivet.some((s) => /\d %|\d+\.\d %/.test(s)), false);
  k("dom-läget under C fäller ingen dom", domut, null);
  // Ruttparsern mot skuggmotorns riktiga källa.
  const rutterSkarpt = skuggmotornsRutter();
  k("skuggmotorns rutter lästa (20)", Object.keys(rutterSkarpt).length, 20);
  console.log("SJÄLVTEST OK: episoder, stationsdom, mervärde, händelsedom, orsaksklassning, blindning, ruttparsern");
  process.exit(0);
}

// ── Skarpt.
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const DAYS = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? Math.ceil((Date.now() - Date.parse(`${PROGNOS_START}T00:00:00Z`)) / 86_400_000));
const LAGE: "underlag" | "dom" = process.argv.includes("--dom") ? "dom" : "underlag";
const gaIdx = process.argv.indexOf("--grindA2");
const GRIND_A2 = gaIdx > 0 ? Number(process.argv[gaIdx + 1]) : GRIND_A2_DOMD;
const pg = (await import("pg")).default;
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
const rutter = skuggmotornsRutter();
const rader = await pool.query(`
  SELECT run_at, route, prognos, alerts FROM shadow_log
  WHERE land = 'SE' AND run_at > now() - $1 * interval '1 day' AND prognos ? 'p'
  ORDER BY run_at`, [DAYS]);
const varv: Varv[] = rader.rows.map((r) => ({ t: new Date(r.run_at), rutt: r.route, p: r.prognos.p ?? [], h: r.prognos.h ?? [], alerts: Array.isArray(r.alerts) ? r.alerts : [] }));
// Facithändelserna (§2) ur den delade listan — samma som tystnadsfelet läser (publish/skuggfacit.ts).
const handelser = await hamtaHandelser((s, p) => pool.query(s, p as any[]).then((r) => r.rows), rutter, DAYS);
await pool.end();
const okandNed = handelser.filter((e) => e.nederbord === null).length;
if (okandNed) console.log(`(${okandNed} händelser utan station inom räckhåll för orsaksklassning — räknas som utstrålning)`);
rapport(varv, handelser, rutter, LAGE, GRIND_A2, `från ${PROGNOS_START}, ${DAYS} dygn`);
