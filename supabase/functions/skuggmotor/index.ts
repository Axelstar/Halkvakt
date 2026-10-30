// ═══ GENERERAD av scripts/bundle-skuggmotor.ts — ÄNDRA INTE HÄR ═══
// Källor: engine/src/{types,geo,segment,texts,engine,forsprang,rutfilter,snapshot}.ts + supabase/functions/skuggmotor/main.ts

// ═══ engine/src/types.ts ═══
// Alert engine v0 — pure, deterministic, platform-free (PLAN §1, §2).
// This module must never import: clocks, randomness, network, DB, Node APIs.
// The Kotlin (and later Swift) port must pass the identical vectors in engine/vectors/.

export type HazardKind =
  | "accident"          // A3 — Trafikverket Situation/Deviation
  | "slippery_segment"  // A1 — Trafikverket RoadCondition (operator-classified)
  | "icing_point"       // A2 — WeatherMeasurepoint showing icing conditions
  | "wildlife"          // A4 — historical hotspot / fresh polisen event
  | "camera"            // A5 — TrafficSafetyCamera
  | "kandidat";         // K — kandidatens betavarning: modellerad halka per sträcka (NIVÅ 2+BLANDNING, DECISIONS #562, #577)

/** Spoken priority, highest first. Lower priority candidates are DROPPED, never queued. */
export const PRIORITY: readonly HazardKind[] = [
  "accident",
  "slippery_segment",
  "icing_point",
  "wildlife",
  "camera",
  // LAST on purpose (DECISIONS #577): every other kind outranks it, so the priority-aware cooldown can never drop or delay
  // another warning because the candidate spoke — the other kinds behave exactly as without it, and the shadow's
  // pre-registered measurements still describe what the app says about them.
  "kandidat",
] as const;

export interface PointHazard {
  id: string;
  kind: Exclude<HazardKind, "slippery_segment" | "kandidat">;
  lon: number;
  lat: number;
  /** Camera: monitored direction of travel (deg). Warn only when roughly co-directional. */
  bearing?: number | null;
  meta?: {
    /** accident — vägnummer ur Trafikverket ("E18", "25"). Rösten säger VAR (Bengt+Axel 2/9). */
    road?: string | null;
    /** icing_point */
    surfaceTempC?: number | null;
    moisture?: boolean; // rain/snow/wet surface at the station
    /** icing_point — S3, efterhalkan som märkt beta (DECISIONS #222, #524): hours since the station's gauge last saw
     *  rain (`regn_h`) and the surface's fall over 30 min, positive = falling (`lutning30`). null = unknown ⇒ silent. */
    rainH?: number | null;
    fall30C?: number | null;
    /** icing_point — this point is a BRIDGE (#38): surfaceTempC/moisture come from the
     *  nearest road weather station; bridges freeze first, so the threshold is +3 °C. */
    bridge?: boolean;
    /** wildlife */
    active?: boolean;   // precomputed by data layer (season × hour); default true
    /** camera */
    speedLimitKmh?: number | null;
    /** accident — Trafikverket SeverityCode. Measured range in our archive:
     *  1 Ingen påverkan, 2 Liten påverkan, 4 Stor påverkan, 5 Mycket stor påverkan.
     *  (Code 3 has never appeared.) null = unclassified ⇒ treated as mild. */
    severityCode?: number | null;
    /** accident — Trafikverket EndTime pre-formatted as "HH:MM" Europe/Stockholm by the
     *  data layer. The engine reads no clocks and knows no timezones (see header), so the
     *  string arrives ready to speak or not at all. */
    endTimeLocal?: string | null;
  };
}

export interface SegmentHazard {
  id: string;
  kind: "slippery_segment";
  /** WGS84 [lon, lat] polyline. */
  line: [number, number][];
  meta?: {
    /** Trafikverket ConditionCode: 1 Normalt, 2 Besvärligt, 3 Mycket besvärligt, 4 Extremt. */
    code?: number | null;
    /** ConditionInfo strings, e.g. ["Is", "Snöfläckar"]. */
    info?: string[];
  };
}

/** K — one road stretch where the candidate's rule says `varnar` (live.json `kandidat`, DECISIONS #576). The threshold lives
 *  in the database rule; the engine only gets the warning points. One hazard per stretch, so the repeat rule holds per stretch,
 *  not per point (the points sit about every 2 km). */
export interface KandidatHazard {
  id: string;
  kind: "kandidat";
  /** WGS84 [lon, lat] of the stretch's warning points. */
  points: [number, number][];
  /** The A1 hazard on the same stretch (`seg:<id>`). The candidate stays silent for kandidatEfterHalkaS after that one spoke
   *  (DECISIONS #581). */
  segmentHazardId?: string;
}

export type Hazard = PointHazard | SegmentHazard | KandidatHazard;

export interface Fix {
  /** Seconds. Any epoch; only deltas matter. Engine reads no clocks. */
  t: number;
  lon: number;
  lat: number;
  /** Optional; derived from consecutive fixes when absent. */
  speedKmh?: number;
  headingDeg?: number;
}

export interface Alert {
  t: number;
  hazardId: string;
  kind: HazardKind;
  /** Great-circle metres to the hazard at the moment of speaking, rounded. */
  distanceM: number;
  text: string;
  /** Serious accidents only: which of the two-step calls this is (DECISIONS #28). Absent for
   *  every other alert, so the log shape of all other vectors is unchanged. The warning card
   *  shows it as a stage chip (design handoff 2/10, DECISIONS #443). */
  step?: AccidentStep;
  /** S3: the frost-risk call came from the post-rain beta rule, not from surface + moisture (DECISIONS #524). K: always —
   *  the candidate is a beta warning (DECISIONS #562). Absent otherwise, so the log shape of every other vector is unchanged.
   *  The warning card marks it as beta. */
  beta?: true;
}

export interface EngineConfig {
  corridorHalfAngleDeg: number; // how far off-heading a hazard may sit and still count as "ahead"
  minSpeedKmh: number;          // below this we do not evaluate (parking-lot jitter guard)
  globalCooldownS: number;      // max 1 spoken alert per this window — hard, no exceptions
  repeatMinS: number;           // same hazard silent for at least this long ...
  repeatMinM: number;           // ... AND until this much further driven (both must have elapsed)
  cameraTriggerM: number;       // A5 fires at this distance
  accidentMaxAheadM: number;    // A3 eligibility horizon = the EARLY call for serious accidents
  /** A3 grading (DECISIONS #28). severityCode >= this ⇒ serious ⇒ two-step warning. */
  accidentSeriousMinSeverity: number;
  /** A3 second step: the reminder distance for serious accidents. */
  accidentNearM: number;
  warnLeadS: number;            // A1/A2/A4 lead time; distance = speed × this, clamped:
  leadMinM: number;
  leadMaxM: number;
  segmentSampleM: number;       // polyline sampling step for corridor tests
  cameraBearingToleranceDeg: number; // co-directionality gate for cameras with known bearing
  /** S3, efterhalkan som märkt beta (DECISIONS #222): surface within [min, max] °C, fallen at least fall30 °C in 30 min,
   *  and rain within regnH hours. Start values written before the frost, frozen by the calibration (#468). */
  efterhalkaYtaMinC: number;
  efterhalkaYtaMaxC: number;
  efterhalkaFall30C: number;
  efterhalkaRegnH: number;
  /** K (DECISIONS #581, Bengt 16/10 "bygg c"): seconds the candidate stays silent after the A1 warning for the same stretch spoke.
   *  Removes the back-to-back double (A1, then the candidate 10 s later); keeps the later call deep inside a long stretch. */
  kandidatEfterHalkaS: number;
  /** Taket (DECISIONS #584, #606): the candidate speaks at most once per kandidatTakS, whatever the stretch. Built ahead of the
   *  reading 2/11; merged only if more than 10 % of the follow-ups fall within 10 minutes, or the sample is too small. */
  kandidatTakS: number;
  /** Halkzonen (kort #360, DECISIONS #621, #624): two slippery stretches whose lines lie within halkZonM of each other count as one
   *  zone for the repeat rule. A new halka warning stays silent while a neighbour's warning is not yet re-armed (10 min AND 5 km),
   *  so three stretches meeting at a junction speak once, and a long zone still repeats like a long stretch (#103). */
  halkZonM: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  corridorHalfAngleDeg: 35,
  minSpeedKmh: 15,
  // 10 s (var 45 t.o.m. 13/9, #127): härlett ur kamerornas minimidistans i samma
  // riktning — 520 m ⇒ 15,6 s vid 120 km/h. Spärren är dessutom prioritetsmedveten nu.
  globalCooldownS: 10,
  repeatMinS: 600,   // 10 min ...
  repeatMinM: 5000,  // ... / 5 km (PLAN §1)
  cameraTriggerM: 500,
  accidentMaxAheadM: 10_000,
  accidentSeriousMinSeverity: 5, // "Mycket stor påverkan" only (Axel 31/8, DECISIONS #30a: 4 made two-step the norm)
  accidentNearM: 2_000,
  warnLeadS: 30,
  leadMinM: 400,
  leadMaxM: 3000,
  segmentSampleM: 100,
  // 60° (var 100° t.o.m. 1/9): 100 gav ett fönster på 200° — mer än en halvcirkel — så en
  // kamera som bevakar MÖTANDE trafik gled in så fort vägen svängde 30°. Bengt på E4:
  // "den mäter alltid mot kameran i motsatt färdriktning". Mätt på publicerad data: 382 av
  // 388 kamerapar inom 300 m pekar isär >135°, dvs. riktningen är tillförlitlig — grinden
  // var bara för vid. 60° släpper igenom egen riktning i kurvor och på ramper och stänger
  // ute mötande.
  cameraBearingToleranceDeg: 60,
  // S3 (DECISIONS #222, #524): betans startvärden — samma tal som sql/028 och uppspelningen (kontraktsgrinden).
  efterhalkaYtaMinC: 1.0,
  efterhalkaYtaMaxC: 3.0,
  efterhalkaFall30C: 0.8,
  efterhalkaRegnH: 2.0,
  // K (DECISIONS #581): 2 min — täcker spärrens 10 s med god marginal men inte de sena fallen långt in på en sträcka (22–44 min
  // i lägesfilen 04:40 16/10). Samma tal i Types.kt och Engine.swift (kontraktsgrinden).
  kandidatEfterHalkaS: 120,
  // Taket (DECISIONS #584, #606): 10 min — motorns gräns för att upprepa en och samma fara (repeatMinS). Samma tal i Types.kt och
  // Engine.swift (kontraktsgrinden).
  kandidatTakS: 600,
  // Halkzonen (DECISIONS #624): 500 m — all 17 close pairs in the shadow log lay within 451 m, and no pair at all between 500 m and
  // 2 km (#621). Samma tal i Types.kt och Engine.swift (kontraktsgrinden).
  halkZonM: 500,
};


// ═══ engine/src/geo.ts ═══
// Minimal geodesy for the alert engine. WGS84 throughout, metres out.
// Haversine is accurate to ~0.5 % — far inside our tolerances (alerts are 100s of metres).

const R = 6_371_000; // mean Earth radius, metres
const D2R = Math.PI / 180;

export interface LonLat { lon: number; lat: number; }

export function haversineM(a: LonLat, b: LonLat): number {
  const dLat = (b.lat - a.lat) * D2R;
  const dLon = (b.lon - a.lon) * D2R;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Initial great-circle bearing a→b, degrees [0, 360). */
export function bearingDeg(a: LonLat, b: LonLat): number {
  const φ1 = a.lat * D2R, φ2 = b.lat * D2R, dλ = (b.lon - a.lon) * D2R;
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  const θ = Math.atan2(y, x) / D2R;
  return (θ + 360) % 360;
}

/** Absolute angular difference, degrees [0, 180]. */
export function angDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Is point p inside the forward corridor from `pos` along `headingDeg`?
 * Very-near points (< nearM) count as ahead: bearing is numerically unstable there,
 * and something 20 m away is on top of us regardless of angle.
 */
export function isAhead(
  pos: LonLat, headingDeg_: number, p: LonLat, halfAngleDeg: number, nearM = 30,
): { ahead: boolean; distM: number } {
  const distM = haversineM(pos, p);
  if (distM < nearM) return { ahead: true, distM };
  const ahead = angDiffDeg(bearingDeg(pos, p), headingDeg_) <= halfAngleDeg;
  return { ahead, distM };
}

/** Resample a polyline to points at most stepM apart (vertices always included). */
export function samplePolyline(line: [number, number][], stepM: number): LonLat[] {
  const out: LonLat[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = { lon: line[i][0], lat: line[i][1] };
    out.push(a);
    if (i === line.length - 1) break;
    const b = { lon: line[i + 1][0], lat: line[i + 1][1] };
    const segLen = haversineM(a, b);
    const n = Math.floor(segLen / stepM);
    for (let k = 1; k <= n; k++) {
      const f = (k * stepM) / segLen;
      if (f >= 1) break;
      // Linear interpolation in lon/lat — fine at ≤100 m steps in Sweden.
      out.push({ lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f });
    }
  }
  return out;
}


// ═══ engine/src/segment.ts ═══
// Segmentprognosen — vad vägytan är MELLAN stationerna (kort #38b steg 4, DECISIONS #322/#324/#325).
//
// Rå avståndsviktning, ingen offset: vägpunktsgrinden 23/9 (DECISIONS #324) visade att grannarnas yttemperatur
// viktad 1/km, upp till fem ankare inom 50 km, klarar grind A:s mått utan målets historik (A1 0,71 °C, A2 3,8 %,
// A3 0,0 %) — lika bra som den lärda offseten. Ankarna är grind A:s population (#75, radvakten, karantänen), som
// skuggmotorn hämtar ur databasen (sql/032 vagpunkt_ankare). Rent och plattformsfritt som resten av motorn;
// skuggmotorn buntar filen (scripts/bundle-skuggmotor.ts). Telefonen kör den inte — prognosen är loggad, aldrig
// hörd, tills domen i mars 2027 (TROSKLAR-SKUGGAN §4: karta och förstärkare, aldrig röst ensam).
//
// Utdata per provpunkt var STEG_KM längs rutten, kompakt för databasens skull:
//   [km, yta, narm, n, status, frys, spr]
//   km     läge längs rutten (km)
//   yta    skattad yttemperatur (°C, en decimal) eller null när inget ankare når
//   narm   avstånd till närmaste bidragande ankare (km, en decimal) eller null
//   n      antal bidragande ankare (0–5)
//   status 2 = uppmätt (ankare inom UPPMATT_KM, facitradien i §2) · 1 = modellerat · 0 = okänt (inget ankare inom MAX_KM)
//   frys   1 när yta ≤ FRYS_C (A3:s klassgräns), annars 0 — "prognosen flaggade segmentet" i §2:s mening
//   spr    ankarnas spridning: störst minus minst bidragande ankares yta (°C, en decimal), 0 med ett ankare, null utan
//          ankare — spridningsgrindens underlag (TROSKLAR-SKUGGAN §3, DECISIONS #474). Loggas rå: status och frys bär
//          INTE grinden, domen räknar (DECISIONS #196). Rader loggade före spridningen har sex fält.
// Tidsdelen (risk vid beräknad ankomsttid, §1) är INTE med: grinden bevisade den rumsliga delen, inget har prövat
// den tidsliga. Kolumnen loggar nuläget per segment; tiden väntar på trendregeln (kort #88).

export type Ankare = { id: string; lon: number; lat: number; yta: number };
export type Provpunkt = [number, number | null, number | null, number, 0 | 1 | 2, 0 | 1, number | null];
export type Prognos = { steg_km: number; p: Provpunkt[] };

export const STEG_KM = 2;        // provpunkt var annan kilometer — facit matchas inom 2 km (§2)
const K_NEIGHBOURS = 5;          // som grind A (publish/grind-a.ts) — kontraktsgrinden vaktar
export const MAX_KM = 50;        // bortom det är en station väder, inte ankare — som grind A (rutfiltret läser den, #360)
export const UPPMATT_KM = 2;     // §2:s facitradie: ett ankare så nära är en mätning, inte en modell
export const FRYS_C = 1;         // A3:s klassgräns (TROSKLAR-SKUGGAN §3)

/** Provpunkter var stegKm längs linjen, med läget i km. Sista brytpunkten alltid med. */
export function provpunkter(line: [number, number][], stegKm = STEG_KM): { km: number; lon: number; lat: number }[] {
  const ut: { km: number; lon: number; lat: number }[] = [];
  let kum = 0, nasta = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = { lon: line[i][0], lat: line[i][1] }, b = { lon: line[i + 1][0], lat: line[i + 1][1] };
    const seg = haversineM(a, b) / 1000;
    while (seg > 0 && nasta <= kum + seg) {
      const f = (nasta - kum) / seg;
      ut.push({ km: nasta, lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f });
      nasta += stegKm;
    }
    kum += seg;
  }
  if (line.length && (!ut.length || ut[ut.length - 1].km < kum)) {
    const s = line[line.length - 1];
    ut.push({ km: Math.round(kum * 10) / 10, lon: s[0], lat: s[1] });
  }
  return ut;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** En provpunkt: de K närmaste ankarna inom MAX_KM, viktade 1/max(km, 1) — grind A:s grannvikt, ordagrant. Spridningen är
 *  störst minus minst av samma ankares yta, som grind A:s `spridning` utan offset (kuvösens L1 för RÅ, DECISIONS #471). */
export function skatta(p: { lon: number; lat: number }, ankare: Ankare[]): { yta: number | null; narm: number | null; n: number; spr: number | null } {
  const nara: { km: number; yta: number }[] = [];
  for (const a of ankare) {
    const km = haversineM(p, a) / 1000;
    if (km <= MAX_KM) nara.push({ km, yta: a.yta });
  }
  nara.sort((x, y) => x.km - y.km);
  const k = nara.slice(0, K_NEIGHBOURS);
  if (!k.length) return { yta: null, narm: null, n: 0, spr: null };
  let w = 0, s = 0, hi = -Infinity, lo = Infinity;
  for (const a of k) { const v = 1 / Math.max(a.km, 1); w += v; s += v * a.yta; if (a.yta > hi) hi = a.yta; if (a.yta < lo) lo = a.yta; }
  return { yta: s / w, narm: k[0].km, n: k.length, spr: hi - lo };
}

export type Holdout = [number, string, number, number | null, number | null, number, number | null];

/** Närmaste punkt på linjen: avstånd (km) och läge längs linjen (km), i en lokal planprojektion per delsträcka. */
export function narmastLangs(p: { lon: number; lat: number }, line: [number, number][]): { km: number; vid: number } {
  let best = Infinity, vid = 0, kum = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1];
    const c = Math.cos(((ay + by) / 2) * Math.PI / 180);
    const X = (x: number, y: number): [number, number] => [(x - ax) * c * 111.32, (y - ay) * 110.57];
    const B = X(bx, by), P = X(p.lon, p.lat);
    const l2 = B[0] ** 2 + B[1] ** 2;
    const t = l2 > 0 ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / l2)) : 0;
    const d = Math.hypot(P[0] - t * B[0], P[1] - t * B[1]);
    const seg = haversineM({ lon: ax, lat: ay }, { lon: bx, lat: by }) / 1000;
    if (d < best) { best = d; vid = kum + t * seg; }
    kum += seg;
  }
  return { km: best, vid };
}

/** HOLDOUT (kort #38b 4c, DECISIONS #326): varje ankare inom UPPMATT_KM av rutten skattas ur de ÖVRIGA ankarna — samma
 *  leave-one-out som grind A, varje varv — och loggas med sin egen mätning. Inget tas bort ur prognosen ovan: stationen
 *  bär prognosen för alla andra punkter och är facit för sin egen (TROSKLAR-SKUGGAN §2: stationen får fälla).
 *  Rad: [km längs rutten, id, mätt yta, skattad yta, avstånd till närmaste övriga ankare, antal ankare, de övrigas spridning]. */
export function holdoutRader(line: [number, number][], ankare: Ankare[]): Holdout[] {
  const ut: Holdout[] = [];
  for (const a of ankare) {
    const n = narmastLangs(a, line);
    if (n.km > UPPMATT_KM) continue;
    const s = skatta(a, ankare.filter((o) => o.id !== a.id));
    ut.push([r1(n.vid), a.id, a.yta, s.yta === null ? null : r1(s.yta), s.narm === null ? null : r1(s.narm), s.n,
             s.spr === null ? null : r1(s.spr)]);
  }
  ut.sort((x, y) => x[0] - y[0]);
  return ut;
}

/** Hela rutten: en rad per provpunkt. Flaggan sätts på den oavrundade skattningen. */
export function segmentPrognos(line: [number, number][], ankare: Ankare[], stegKm = STEG_KM): Prognos {
  const p: Provpunkt[] = provpunkter(line, stegKm).map((pp) => {
    const s = skatta(pp, ankare);
    const status: 0 | 1 | 2 = s.narm === null ? 0 : s.narm <= UPPMATT_KM ? 2 : 1;
    const frys: 0 | 1 = s.yta !== null && s.yta <= FRYS_C ? 1 : 0;
    return [pp.km, s.yta === null ? null : r1(s.yta), s.narm === null ? null : r1(s.narm), s.n, status, frys,
            s.spr === null ? null : r1(s.spr)];
  });
  return { steg_km: stegKm, p };
}

// KANDIDATENS TAKT (DECISIONS #573, NIVA2-LIVE steg 7). Skuggan loggar de sträckor där kandidatens regel (sql/056
// kandidat_regel) varnar och som rutten passerar — en gång per sträcka och körning, i körordning — så att takten kan läsas
// innan rösten byggs (DECISIONS #200: taket kommer ur mätningen). En sträcka räknas när en av dess varnande vägpunkter ligger
// inom UPPMATT_KM av rutten, samma 2 km som §2 matchar facit med; rutterna är raka linjer mellan stationer, inte vägarna, så
// takten är en uppskattning. Tiden är läget längs rutten vid traceAlong:s fart.
//   Rad: [t (s från rutens start), sträcka, km längs rutten, avstånd till rutten (km), antal varnande punkter inom 2 km]
export type KandidatPassage = [number, string, number, number, number];

export function kandidatLangsRutten(punkter: { segment_id: string; lon: number; lat: number }[], line: [number, number][],
  kmh = 80): KandidatPassage[] {
  const bast = new Map<string, { vid: number; km: number; n: number }>();
  for (const p of punkter) {
    const n = narmastLangs(p, line);
    if (n.km > UPPMATT_KM) continue;
    const b = bast.get(p.segment_id);
    if (!b) bast.set(p.segment_id, { vid: n.vid, km: n.km, n: 1 });
    else { b.n++; if (n.km < b.km) { b.km = n.km; b.vid = n.vid; } }
  }
  return [...bast].map(([seg, b]): KandidatPassage => [Math.round(b.vid / kmh * 3600), seg, r1(b.vid), r1(b.km), b.n])
    .sort((x, y) => x[0] - y[0]);
}


// ═══ engine/src/texts.ts ═══
// Spoken Swedish copy (PLAN §1 taxonomy). Phrasing rule, hard:
// segment sources may claim "på vägen framför dig"; point sources only "framöver".

/**
 * Which utterance of a serious accident this is (DECISIONS #28, "Olyckslyftet").
 *   "early"    — the first call, made far out while exits still remain. Carries the
 *                routing decision ("Överväg annan väg") because this is the only
 *                moment the driver can still act on it.
 *   "reminder" — the second call at close range, AFTER an early call was spoken.
 *                Short by design: the decision is already made, this is just speed.
 *   "late"     — close range with NO early call (driver joined the road inside the
 *                early horizon). Must still say WHAT it is — otherwise this driver
 *                gets strictly less information than one who came from further away.
 * Mild accidents and every other hazard kind ignore this.
 */
export type AccidentStep = "early" | "reminder" | "late";

/** " på E18" / " på väg 25" / "" — tomt när vägnumret saknas. */
export function roadPhrase(road?: string | null): string {
  const r = (road ?? "").trim();
  if (!r) return "";
  return /^[A-Za-zÅÄÖåäö]/.test(r) ? ` på ${r}` : ` på väg ${r}`;
}

/** S3, efterhalkan som märkt beta (DECISIONS #222, #524, TROSKLAR-KOMBINATIONEN §7). "Halkvakt tror" säger att det är en
 *  gissning ur regn och fall, inte en uppmätt frysning; punktkälla ⇒ "framöver". */
export const EFTERHALKA_TEXT = "Halkvakt tror: frysrisk framöver.";

/** K, kandidatens betavarning (DECISIONS #562, #573: texten godkänd av Bengt 15/10). Modellerad, aldrig uppmätt — därför
 *  "Halkvakt tror" och "framöver", aldrig ett avstånd. */
export const KANDIDAT_TEXT = "Halkvakt tror: halka framöver.";

export function alertText(
  kind: HazardKind,
  distanceM: number,
  hazard?: PointHazard,
  step?: AccidentStep,
): string {
  switch (kind) {
    case "accident": {
      const km = Math.max(1, Math.round(distanceM / 1000));
      // VAR, inte bara hur långt (Bengt+Axel 2/9). "E18" läses "E arton" av talsyntesen,
      // men ett blott nummer blir "olycka på 25" — därför "väg 25" när numret saknar bokstav.
      const on = roadPhrase(hazard?.meta?.road);
      switch (step) {
        case "early": {
          const clearedAt = hazard?.meta?.endTimeLocal;
          const base =
            `Allvarlig olycka${on} ${km} kilometer framför dig — stor påverkan på trafiken. ` +
            `Överväg annan väg.`;
          return clearedAt ? `${base} Beräknas röjd vid ${clearedAt}.` : base;
        }
        case "reminder":
          return "Sakta ner — olycksplats strax framför dig.";
        case "late":
          return `Allvarlig olycka${on} ${km} kilometer framför dig — stor påverkan. Sakta ner.`;
        default:
          return `Olycka rapporterad${on} ${km} kilometer framför dig.`;
      }
    }
    case "slippery_segment":
      return "Varning: halka rapporterad på vägen framför dig.";
    case "icing_point":
      if (hazard?.meta?.bridge) {
        // Bridge (#38): say WHAT and roughly WHERE — the driver looks for the bridge.
        const m = Math.max(100, Math.round(distanceM / 100) * 100);
        return `Frysrisk framöver — bro om ${m} meter.`;
      }
      return "Isrisk framöver — vägbanan nära noll grader.";
    case "wildlife":
      return "Viltrisk framöver."; // DECISIONS #266/#318 — punktkälla ⇒ "framöver"
    case "camera": {
      const limit = hazard?.meta?.speedLimitKmh;
      return limit != null
        ? `Fartkamera om 500 meter. Gränsen är ${limit}.`
        : "Fartkamera om 500 meter.";
    }
    case "kandidat":
      return KANDIDAT_TEXT;
  }
}


// ═══ engine/src/engine.ts ═══
// Halkvakt alert engine v0 — the module that decides when to speak and when to stay silent.
// Deterministic by construction: no clocks, no randomness, no I/O. Time comes from fixes.
// Discipline rules (PLAN §1) are hard requirements, encoded here and proven by engine/vectors/.
//
//   1. Within 10 s of an utterance only a MORE important hazard may speak (priority-aware
//      cooldown, globalCooldownS; kort #127, v23 — replaced the blind 45 s). Priority
//      accident > slippery > icing > wildlife > camera > kandidat (the beta candidate, last: #577).
//      Losers are DROPPED, not queued. No exceptions, not even for accidents (logged in
//      DECISIONS — revisit only on beta evidence).
//   2. Same hazard never repeats until BOTH 10 min have passed AND 5 km been driven. Slippery stretches whose lines lie
//      within halkZonM of each other are one hazard for this rule (the halka zone, kort #360, DECISIONS #621, #624).
//      SINGLE EXCEPTION (DECISIONS #28): a serious accident speaks twice by design —
//      once early (10 km, while exits remain) and once close (2 km, "slow down").
//      These are two different messages about one hazard, not a repeat of one message,
//      and they are held apart by two distinct alert keys rather than by weakening rule 2.
//   3. Point sources say "framöver"; only segment sources may say "på vägen framför dig"
//      (enforced in texts.ts).
//   4. Silence is the default. No hazard in corridor ⇒ no sound. Ever.


interface FiredState { t: number; odometerM: number; }

/**
 * `alertKey` is what the repeat rules remember — normally the hazard id, but a SERIOUS
 * accident owns two independent voice slots ("<id>#early" and "<id>#near") so the 2 km
 * reminder is not swallowed by the 10-min/5-km suppression that follows the 10 km call.
 * This is the "step-aware warning id" of DECISIONS #28. The key stays internal: the
 * emitted Alert keeps its hazardId. Since DECISIONS #443 the Alert also carries `step`
 * (serious accidents only) so the warning card can show which call it is.
 */
interface Candidate {
  hazard: Hazard; kind: HazardKind; distM: number;
  alertKey: string;
  step?: AccidentStep;
  /** S3: the frost-risk call came from the post-rain beta rule (DECISIONS #524). */
  beta?: true;
}

// Swedish word-start boundary: "Isfläckar"/"Svår halka" match; "fläckvis Våt" must NOT
// (the substring 'is' inside "fläckvis" produced 8 false halka-segments on real August
// data — see test "fläckvis is not halka").
const SLIPPERY_INFO = /(?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)/i;
// Snow and frost count INSIDE compounds too (kort #97, Bengt 16/9): the word-start rule above made
// "Nysnö", "Rimfrost", "Blötsnö" and "Nattfrost" silent on code 1 — the operator wrote the word, so
// it speaks. "halk" is NOT a stem: "Halkbekämpning" and "Halkskydd" are countermeasures, not hazards,
// so only halka/halkrisk/halkig are listed above. Vector v24 locks all of it in three ports.
const SLIPPERY_STAM = /(snö|frost)/i;

export class AlertEngine {
  private readonly cfg: EngineConfig;
  private points: PointHazard[] = [];
  private segments: { h: SegmentHazard; samples: LonLat[] }[] = [];
  private kandidater: { h: KandidatHazard; samples: LonLat[] }[] = [];

  private prevFix: Fix | null = null;
  private lastHeadingDeg: number | null = null;
  private odometerM = 0;
  private lastSpokenT: number | null = null;
  /** Vad som senast sades — spärren får bara tysta något som INTE är viktigare (#127). */
  private lastSpokenKind: HazardKind | null = null;
  /** När kandidaten senast talade — taket räknas därifrån, oavsett sträcka (DECISIONS #606). */
  private lastKandidatT: number | null = null;
  /** Skuggmotorn lyssnar här (#127 a): vad spärren kastar syns annars ingenstans. */
  onSuppressed?: (c: { kind: HazardKind; hazardId: string; distM: number; by: HazardKind; sinceS: number; zon?: string }) => void;
  /** FÖRSPRÅNGET (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md §4): valfri krok som ger förvarningsavståndet per fara. Utan
   *  krok är motorn byte för byte densamma — vektorerna rörs inte. Svaret klämms till leadMinM och MOTORNS leadMaxM (3 000 m),
   *  inte till appens reglage (kort #275 väg (a)). Bara skuggan sätter den i vinter; portarna får den först vid steg 7, efter domen. */
  leadFor?: (h: Hazard, leadM: number, speedMps: number) => number;
  private fired = new Map<string, FiredState>();
  /** Halkzonen (#360): whether two stretches are neighbours, per sorted id pair — the geometry is the same in every snapshot. */
  private zonGrannar = new Map<string, boolean>();
  /** A zone silencing is reported once per stretch and neighbour warning, not on every fix inside the lead distance. */
  private zonRapporterad = new Set<string>();

  constructor(hazards: Hazard[], cfg: Partial<EngineConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.ingest(hazards);
  }

  private ingest(hazards: Hazard[]): void {
    this.points = [];
    this.segments = [];
    this.kandidater = [];
    for (const h of hazards) {
      if (h.kind === "slippery_segment") {
        this.segments.push({ h, samples: samplePolyline(h.line, this.cfg.segmentSampleM) });
      } else if (h.kind === "kandidat") {
        this.kandidater.push({ h, samples: h.points.map(([lon, lat]) => ({ lon, lat })) });
      } else {
        this.points.push(h);
      }
    }
  }

  /**
   * Swap the hazard set mid-drive (fresh snapshot arrived) WITHOUT losing memory:
   * odometer, heading, cooldown clock and the per-hazard fired-map survive, so the
   * guard never re-announces something it just said. Hazard ids are stable across
   * snapshots (source ids), which is what makes the fired-map carry over meaningful.
   * Entries for ids no longer present are kept on purpose: a hazard that flickers
   * out of one snapshot and back into the next must still obey the repeat rules.
   */
  updateHazards(hazards: Hazard[]): void {
    this.ingest(hazards);
  }

  /** Feed one GPS fix. Returns the spoken alert, or null (the normal case: silence). */
  step(fix: Fix): Alert | null {
    const { speedKmh, headingDeg } = this.kinematics(fix);
    if (this.prevFix) this.odometerM += haversineM(this.prevFix, fix);
    this.prevFix = fix;
    if (headingDeg !== null) this.lastHeadingDeg = headingDeg;

    if (speedKmh === null || speedKmh < this.cfg.minSpeedKmh) return null;
    const heading = this.lastHeadingDeg;
    if (heading === null) return null;

    const speedMps = (speedKmh * 1000) / 3600;
    const leadM = Math.min(this.cfg.leadMaxM, Math.max(this.cfg.leadMinM, speedMps * this.cfg.warnLeadS));

    // Kort #275 väg (a) (Bengt 26/9, DECISIONS #419): försprånget kläms till MOTORNS tak, aldrig till cfg.leadMaxM — i apparna
    // är det reglaget Längsta förvarning (400–1 200 m, #259), som bara tar grundvarningen. Med reglagets tak räckte 90 s bara
    // till 48 km/h. Skuggan kör motorns standard, så där är talet detsamma.
    const lead = (h: Hazard) => this.leadFor
      ? Math.min(DEFAULT_CONFIG.leadMaxM, Math.max(this.cfg.leadMinM, this.leadFor(h, leadM, speedMps)))
      : leadM;
    const candidates: Candidate[] = [];
    for (const p of this.points) {
      const c = this.evaluatePoint(fix, heading, p, lead(p));
      if (c) candidates.push(c);
    }
    for (const s of this.segments) {
      const c = this.evaluateSegment(fix, heading, s, lead(s.h));
      if (c) candidates.push(c);
    }
    for (const k of this.kandidater) {
      const c = this.evaluateKandidat(fix, heading, k, lead(k.h));
      if (c) candidates.push(c);
    }
    if (candidates.length === 0) return null;

    // Rule 2: per-hazard repeat suppression (both time AND distance must have elapsed).
    const rearmed = (f: FiredState) =>
      fix.t - f.t >= this.cfg.repeatMinS && this.odometerM - f.odometerM >= this.cfg.repeatMinM;
    const eligible = candidates.filter((c) => {
      const f = this.fired.get(c.alertKey);
      if (f && !rearmed(f)) return false;
      // The halka zone (kort #360): a neighbour stretch within halkZonM spoke and is not re-armed ⇒ this one is the same zone.
      if (c.kind === "slippery_segment") {
        for (const s of this.segments) {
          if (s.h.id === c.hazard.id) continue;
          const g = this.fired.get(s.h.id);
          if (!g || rearmed(g) || !this.grannar(c.hazard as SegmentHazard, s.h)) continue;
          const nyckel = `${c.hazard.id}|${s.h.id}|${g.t}`;
          if (!this.zonRapporterad.has(nyckel)) {
            this.zonRapporterad.add(nyckel);
            this.onSuppressed?.({ kind: c.kind, hazardId: c.hazard.id, distM: c.distM, by: "slippery_segment", sinceS: fix.t - g.t, zon: s.h.id });
          }
          return false;
        }
      }
      return true;
    });
    if (eligible.length === 0) return null;

    // Rule 1a: priority selects the single winner; everything else is dropped.
    eligible.sort((a, b) => {
      const pa = PRIORITY.indexOf(a.kind), pb = PRIORITY.indexOf(b.kind);
      if (pa !== pb) return pa - pb;
      if (a.distM !== b.distM) return a.distM - b.distM;
      return a.alertKey < b.alertKey ? -1 : 1; // total order ⇒ determinism
    });
    const win = eligible[0];

    // Rule 1b: PRIORITETSMEDVETEN global spärr (#127, Bengt 13/9). Den gamla spärren var
    // blind: den tystade allt inom 45 s oavsett vad som just sagts. Faror som kvalificerar
    // EFTER varandra i stället för samtidigt fick då inverterad prioritet — kameran talade,
    // isen 20 s senare kastades, och när spärren öppnade var isen 61 m bort (v23).
    // Nu: spärren får bara kasta en vinnare vars prioritet inte är HÖGRE än det som senast
    // sades. En kamera kan aldrig avbryta is; is får avbryta en kamera. Golvet 10 s är
    // härlett ur kamerornas minimidistans (520 m i samma riktning ⇒ 15,6 s vid 120 km/h),
    // så en fartkamera kan aldrig tystas av det. Upprepningsregeln (regel 2) är orörd.
    if (this.lastSpokenT !== null && fix.t - this.lastSpokenT < this.cfg.globalCooldownS) {
      const winP = PRIORITY.indexOf(win.kind);
      const lastP = this.lastSpokenKind === null ? Infinity : PRIORITY.indexOf(this.lastSpokenKind);
      if (winP >= lastP) {   // inte viktigare än det senaste ⇒ kastas, som förr
        this.onSuppressed?.({ kind: win.kind, hazardId: win.hazard.id, distM: win.distM,
                              by: this.lastSpokenKind!, sinceS: fix.t - this.lastSpokenT });
        return null;
      }
      // viktigare ⇒ släpps igenom trots spärren
    }

    this.lastSpokenT = fix.t;
    this.lastSpokenKind = win.kind;
    if (win.kind === "kandidat") this.lastKandidatT = fix.t;
    this.fired.set(win.alertKey, { t: fix.t, odometerM: this.odometerM });
    const pointHazard = win.hazard.kind === "slippery_segment" || win.hazard.kind === "kandidat"
      ? undefined : (win.hazard as PointHazard);
    return {
      t: fix.t,
      hazardId: win.hazard.id,
      kind: win.kind,
      distanceM: Math.round(win.distM),
      text: win.beta && win.kind === "icing_point" ? EFTERHALKA_TEXT : alertText(win.kind, win.distM, pointHazard, win.step),
      ...(win.step ? { step: win.step } : {}),
      ...(win.beta ? { beta: true as const } : {}),
    };
  }

  /** Halkzonen (#360): the two stretches' lines lie within halkZonM — measured line to line by the route filter (break points both
   *  ways, a crossing is 0), the same function in all three languages. Cached per pair; stretch geometry does not change. */
  private grannar(a: SegmentHazard, b: SegmentHazard): boolean {
    const nyckel = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    let v = this.zonGrannar.get(nyckel);
    if (v === undefined) {
      v = farorLangsRutten([b], a.line, this.cfg.halkZonM).length > 0;
      this.zonGrannar.set(nyckel, v);
    }
    return v;
  }

  /** Run a whole trace. Convenience for replay/tests. */
  run(trace: Fix[]): Alert[] {
    const out: Alert[] = [];
    for (const f of trace) {
      const a = this.step(f);
      if (a) out.push(a);
    }
    return out;
  }

  // ---------- internals ----------

  private kinematics(fix: Fix): { speedKmh: number | null; headingDeg: number | null } {
    let speedKmh = fix.speedKmh ?? null;
    let headingDeg = fix.headingDeg ?? null;
    if (this.prevFix) {
      const dt = fix.t - this.prevFix.t;
      const dM = haversineM(this.prevFix, fix);
      if (speedKmh === null && dt > 0) speedKmh = (dM / dt) * 3.6;
      if (headingDeg === null && dM >= 5) headingDeg = bearingDeg(this.prevFix, fix);
    }
    return { speedKmh, headingDeg };
  }

  private evaluatePoint(fix: Fix, heading: number, p: PointHazard, leadM: number): Candidate | null {
    const { ahead, distM } = isAhead(fix, heading, p, this.cfg.corridorHalfAngleDeg);
    if (!ahead) return null;

    switch (p.kind) {
      case "camera": {
        if (distM > this.cfg.cameraTriggerM) return null;
        // Trafikverkets Bearing = riktningen kameran TITTAR, alltså rakt MOT trafiken den
        // fotograferar (mätplats för norrgående trafik har bäring ~158°, sydsydost). Den
        // övervakade färdriktningen är därför bearing + 180°. Bengt mätte felet på E4 2/9:
        // med rå jämförelse tystnade kameran på hans sida och den mötande varnade.
        if (p.bearing != null &&
            angDiffDeg((p.bearing + 180) % 360, heading) > this.cfg.cameraBearingToleranceDeg) {
          return null; // camera watches the opposite direction — stay silent
        }
        return { hazard: p, kind: p.kind, distM, alertKey: p.id };
      }
      case "accident":
        return this.evaluateAccident(p, distM);
      case "icing_point": {
        const t = p.meta?.surfaceTempC;
        // Bridges (#38): the deck freezes before the road — nearest station at +3 is enough.
        const threshold = p.meta?.bridge ? 3 : 1;
        const icy = t != null && t <= threshold && p.meta?.moisture === true;
        if (icy) return distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id } : null;
        // S3 — efterhalkan som märkt beta (DECISIONS #222, #524): the surface is still above the freezing rule but within
        // +1…+3 °C, has fallen fast after rain, and the gauge saw rain within 2 h. Stations only — bridges keep their +3 rule.
        const rainH = p.meta?.rainH, fall30 = p.meta?.fall30C;
        const beta = !p.meta?.bridge && t != null && rainH != null && fall30 != null &&
          t >= this.cfg.efterhalkaYtaMinC && t <= this.cfg.efterhalkaYtaMaxC &&
          fall30 >= this.cfg.efterhalkaFall30C && rainH <= this.cfg.efterhalkaRegnH;
        return beta && distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id, beta: true } : null;
      }
      case "wildlife": {
        const active = p.meta?.active !== false;
        return active && distM <= leadM ? { hazard: p, kind: p.kind, distM, alertKey: p.id } : null;
      }
    }
  }

  /**
   * A3 grading (DECISIONS #28, "Olyckslyftet"). Trafikverket's SeverityCode decides
   * whether this is one utterance or two:
   *
   *   mild / unclassified  → today's single line, unchanged behaviour.
   *   serious (>= cfg)     → EARLY call at the 10 km horizon carrying the routing
   *                          decision, then a REMINDER inside 2 km carrying only speed.
   *
   * A driver who joins the road already inside 2 km never heard the early call, so the
   * near slot speaks "late" copy instead: same facts, no "överväg annan väg" — there is
   * no exit left to take, and telling someone to reroute when they cannot is noise.
   */
  private evaluateAccident(p: PointHazard, distM: number): Candidate | null {
    if (distM > this.cfg.accidentMaxAheadM) return null;

    const sev = p.meta?.severityCode;
    const serious = sev != null && sev >= this.cfg.accidentSeriousMinSeverity;
    if (!serious) return { hazard: p, kind: "accident", distM, alertKey: p.id };

    if (distM <= this.cfg.accidentNearM) {
      const earlySpoken = this.fired.has(`${p.id}#early`);
      return {
        hazard: p, kind: "accident", distM,
        alertKey: `${p.id}#near`,
        step: earlySpoken ? "reminder" : "late",
      };
    }
    // The early call is ONE-SHOT per hazard (#211, 20/9). Rule 2 re-arms a key after 10 min AND
    // 5 km — and a slow approach (≤ 45 km/h over the 8 km between the horizons) passes both
    // before 2 km, so "Överväg annan väg" spoke twice and the reminder made three. DECISIONS
    // #28 says exactly two; the early slot therefore never re-arms. Vector v25 locks it.
    if (this.fired.has(`${p.id}#early`)) return null;
    return { hazard: p, kind: "accident", distM, alertKey: `${p.id}#early`, step: "early" };
  }

  private evaluateSegment(
    fix: Fix, heading: number, s: { h: SegmentHazard; samples: LonLat[] }, leadM: number,
  ): Candidate | null {
    const meta = s.h.meta ?? {};
    const slippery =
      (meta.code != null && meta.code >= 2) ||
      (meta.info ?? []).some((i) => SLIPPERY_INFO.test(i) || SLIPPERY_STAM.test(i));
    if (!slippery) return null; // "Normalt"/"Våt" segments make no sound — silence is default

    let best: number | null = null;
    for (const pt of s.samples) {
      const { ahead, distM } = isAhead(fix, heading, pt, this.cfg.corridorHalfAngleDeg);
      if (ahead && (best === null || distM < best)) best = distM;
    }
    if (best === null || best > leadM) return null;
    return { hazard: s.h, kind: "slippery_segment", distM: best, alertKey: s.h.id };
  }

  /**
   * K — kandidatens betavarning (DECISIONS #562, #577). The rule lives in the database (kandidat_regel, #576): every point
   * published is one where it says `varnar`, so the engine adds no threshold — only the corridor and the lead, like a
   * segment, over the stretch's points. One alert key per stretch: the repeat rule holds per stretch, not per point.
   */
  private evaluateKandidat(
    fix: Fix, heading: number, k: { h: KandidatHazard; samples: LonLat[] }, leadM: number,
  ): Candidate | null {
    let best: number | null = null;
    for (const pt of k.samples) {
      const { ahead, distM } = isAhead(fix, heading, pt, this.cfg.corridorHalfAngleDeg);
      if (ahead && (best === null || distM < best)) best = distM;
    }
    if (best === null || best > leadM) return null;
    // (c), DECISIONS #581: tyst i kandidatEfterHalkaS efter att samma sträckas halkvarning (A1) talat.
    const a1 = k.h.segmentHazardId ? this.fired.get(k.h.segmentHazardId) : undefined;
    if (a1 && fix.t - a1.t < this.cfg.kandidatEfterHalkaS) return null;
    // Taket, DECISIONS #606: högst en kandidat per kandidatTakS, vilken sträcka det än gäller.
    if (this.lastKandidatT !== null && fix.t - this.lastKandidatT < this.cfg.kandidatTakS) return null;
    return { hazard: k.h, kind: "kandidat", distM: best, alertKey: k.h.id, beta: true };
  }
}


// ═══ engine/src/forsprang.ts ═══
// Allvar som försprång (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md, DECISIONS #359). Ren logik, inget I/O.
//
// Rösten säger samma ord, tidigare — aldrig andra ord, aldrig högre prioritet (Axel, kartan §13.1; #90 roll B; E1). Försprånget
// utlöser ingenting: det ändrar bara NÄR en varning sägs som redan utlöses av sin egen mätning (tröskelregeln T3/T6).
// Bara skuggmotorn använder modulen i vinter. Portarna (Kotlin, Swift) får den först vid steg 7, efter domen i mars.

/** §3: nivå 2 prövas med tre försprång i sekunder, klämda av motorn till leadMinM–leadMaxM. Nivå 1 behåller dagens 30 s. */
export const FORSPRANG_SVEP_S = [45, 60, 90] as const;
/** §2: A1 halt väglag — Trafikverkets väglagskod 3 eller 4 (mycket besvärligt / is- och snövägbana). Uppräknade, aldrig ">= 3". */
export const A1_NIVA2_KODER: readonly number[] = [3, 4];
/** §2: A2 frysrisk — ytan ≤ 0 °C (= K1_GRANS[0] i publish/tillstand.ts)… */
export const A2_NIVA2_YTA_C = 0;
/** …och stationen blöt inom 2 h: väta ≥ 3 av 4 i N_SVEP (weather[].bevis.vata, DECISIONS #342). */
export const A2_NIVA2_VATA = 3;

export type ForsprangNiva = 1 | 2;

/** Nivån per fara (§2). null = faran ingår inte (olyckor, kameror, vilt). `vata` är weather[].bevis.vata per `wx:`-id; broarna
 *  saknar stationens id i snapshoten och står därför på nivå 1. */
export function forsprangNiva(h: Hazard, vata: Map<string, number>): ForsprangNiva | null {
  if (h.kind === "slippery_segment") {
    const kod = h.meta?.code;
    return typeof kod === "number" && A1_NIVA2_KODER.includes(kod) ? 2 : 1;
  }
  if (h.kind === "icing_point") {
    const yta = h.meta?.surfaceTempC;
    const v = vata.get(h.id);
    return typeof yta === "number" && yta <= A2_NIVA2_YTA_C && typeof v === "number" && v >= A2_NIVA2_VATA ? 2 : 1;
  }
  return null;
}

/** FS-A1:s varningsslag (§2: A1 halt väglag och A2 frysrisk): nämnarradens varningar och nämnaren i räkneregeln R4 (DECISIONS #664). */
export const FORSPRANG_A_SLAG: readonly string[] = ["slippery_segment", "icing_point"];

/** Rutter per försprångsanrop: skuggmotorns tak, som huvudvarvets (546 vid fler, kort #244). */
export const FORSPRANG_RUTTER_PER_ANROP = 3;

/** Vilka rutter ett försprångsanrop kör (§4; alla rutter varje halvtimme sedan DECISIONS #662). Rutterna sorteras och delas på
 *  ceil(n/3) platser — 7 för de 20 rutterna, 4 för de 10 C-rutterna, som huvudvarvet — och plats k tar var k:te rutt. Ett angivet
 *  `slot` väljer sin plats; utan det väljer halvtimmen, som före #662. Ett slot utanför platserna ger null. Svepvärdet följer
 *  halvtimmen, inte platsen, så varje rutt möter alla tre värden över tre halvtimmar. */
export function forsprangUrval(namn: string[], halvtimme: number, slot: number | null = null) {
  const sorterade = [...namn].sort();
  const platser = Math.max(1, Math.ceil(sorterade.length / FORSPRANG_RUTTER_PER_ANROP));
  const plats = slot ?? halvtimme % platser;
  if (!Number.isInteger(plats) || plats < 0 || plats >= platser) return null;
  return { platser, plats, batch: sorterade.filter((_, i) => i % platser === plats) };
}

/** Kroken till motorn (AlertEngine.leadFor): nivå 2 får svepvärdets försprång, allt annat dagens. Motorn klämmer svaret. */
export function forsprangKrok(nivaer: Map<string, ForsprangNiva>, svepS: number) {
  return (h: Hazard, leadM: number, speedMps: number): number => (nivaer.get(h.id) === 2 ? speedMps * svepS : leadM);
}


// ═══ engine/src/rutfilter.ts ═══
// Rutfiltret (kort #244, DECISIONS #360). Ren logik, inget I/O.
//
// Skuggmotorns huvudvarv slog i datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på :02/:32 — flytten från :00/:30 löste det inte).
// Arbetet låg i två loopar som prövade HELA Sverige för varje rutt: motorn prövar varje fara i varje fix (tusentals kameror, olyckor
// och stationer, några tusen fixar per rutt), och segmentprognosen mäter avståndet från varje provpunkt till alla ankare. En fara
// längre från rutten än motorns längsta räckvidd kan aldrig tala, och ett ankare längre bort än MAX_KM kan aldrig väga in. Filtret
// tar bort bara sådana, så utfallet är detsamma byte för byte — test/rutfilter.test.ts låser det.

/** Motorns längsta räckvidd (olyckornas tidiga rop, 10 km) plus fem km slack — härledd, aldrig skriven för hand. */
export const FARA_MARGINAL_KM =
  Math.max(DEFAULT_CONFIG.accidentMaxAheadM, DEFAULT_CONFIG.leadMaxM, DEFAULT_CONFIG.cameraTriggerM) / 1000 + 5;
/** Prognosens grannradie plus holdoutens avstånd till rutten plus tre km slack. */
export const ANKARE_MARGINAL_KM = MAX_KM + UPPMATT_KM + 3;

export type Ruta = { x0: number; x1: number; y0: number; y1: number };

/** Rutans ruta, vidgad med `marginalKm` åt alla håll. Försiktig: longitudgraden räknas vid den nordligaste punkten, där den är
 *  kortast i km, och latitudgraden som 110 km — rutan blir hellre för stor än för liten. */
export function rutaKring(line: [number, number][], marginalKm: number): Ruta {
  const lons = line.map((p) => p[0]), lats = line.map((p) => p[1]);
  const nord = Math.max(...lats.map((y) => Math.abs(y)));
  const dLat = marginalKm / 110, dLon = marginalKm / (111.32 * Math.cos((nord * Math.PI) / 180));
  return { x0: Math.min(...lons) - dLon, x1: Math.max(...lons) + dLon, y0: Math.min(...lats) - dLat, y1: Math.max(...lats) + dLat };
}

const iRutan = (x: number, y: number, r: Ruta) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Farorna som kan tala på rutten. En punkt ska ligga i rutan; ett segment räcker att dess egen ruta skär rutans — ett långt
 *  segment kan korsa rutten utan att någon av dess brytpunkter ligger nära. Skuggans förfilter till 12/10; sedan dess
 *  farorVidLinjen nedan (DECISIONS #535). */
export function farorNaraRutten(hazards: Hazard[], line: [number, number][], marginalKm = FARA_MARGINAL_KM): Hazard[] {
  const r = rutaKring(line, marginalKm);
  return hazards.filter((h) => {
    if (h.kind === "kandidat") return false;   // K (DECISIONS #577): utanför urvalet, som i farorLangsRutten nedan
    if (h.kind === "slippery_segment") {
      const xs = h.line.map((p) => p[0]), ys = h.line.map((p) => p[1]);
      return Math.max(...xs) >= r.x0 && Math.min(...xs) <= r.x1 && Math.max(...ys) >= r.y0 && Math.min(...ys) <= r.y1;
    }
    return iRutan((h as { lon: number }).lon, (h as { lat: number }).lat, r);
  });
}

/** Ankarna som kan väga in i prognosen eller holdouten längs rutten. */
export function ankareNaraRutten<T extends { lon: number; lat: number }>(ankare: T[], line: [number, number][],
  marginalKm = ANKARE_MARGINAL_KM): T[] {
  const r = rutaKring(line, marginalKm);
  return ankare.filter((a) => iRutan(a.lon, a.lat, r));
}

// LÄNGS RUTTEN (favoriterna, DECISIONS #528). Rektangeln ovan tar allt inom rutans ruta plus marginalen — för en diagonal rutt en stor
// del av landet. Urvalet nedan tar det som ligger inom `marginalM` från själva linjen, och säger var längs den, så att en rapport kan
// ordna farorna i körordning. Samma räkning i android/engine/…/RouteFilter.kt och HalkvaktEngine/RouteFilter.swift, prövad mot
// engine/fixtures/langsrutten.json i alla tre.
//
// Avståndet är plant i en lokal projektion kring punkten (x = R·Δλ·cos φ, y = R·Δφ, R som haversineM), punkt mot sträcka utan
// sampling — billigt och lika i alla tre språk. Ett segment mäts brytpunkt mot linjen, linjens brytpunkter mot segmentet, och två
// sträckor som korsar varandra ger 0. Platsen längs rutten är längden fram till närmaste sträcka (haversine per sträcka) plus andelen
// av den.

/** En fara längs rutten: kortaste avståndet till linjen och platsen längs den, båda i meter. */
export type LangsRutten = { hazard: Hazard; avstandM: number; langsM: number };

const R_M = 6_371_000;
const RAD = Math.PI / 180;

/** Kortaste plana avståndet från p till sträckan a–b, och andelen t ∈ [0, 1] längs sträckan där det nås. */
function tillStracka(p: [number, number], a: [number, number], b: [number, number]): { d: number; t: number } {
  const k = Math.cos(p[1] * RAD) * R_M * RAD, m = R_M * RAD;
  const ax = (a[0] - p[0]) * k, ay = (a[1] - p[1]) * m, bx = (b[0] - p[0]) * k, by = (b[1] - p[1]) * m;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L));
  return { d: Math.hypot(ax + t * dx, ay + t * dy), t };
}

/** Var sträckan p1–p2 korsar q1–q2, som andel t ∈ (0, 1) längs p1–p2, eller null. Plant i grader, räcker för att avgöra korsning. */
function korsning(p1: [number, number], p2: [number, number], q1: [number, number], q2: [number, number]): number | null {
  const rx = p2[0] - p1[0], ry = p2[1] - p1[1], sx = q2[0] - q1[0], sy = q2[1] - q1[1];
  const den = rx * sy - ry * sx;
  if (den === 0) return null;
  const t = ((q1[0] - p1[0]) * sy - (q1[1] - p1[1]) * sx) / den, u = ((q1[0] - p1[0]) * ry - (q1[1] - p1[1]) * rx) / den;
  return t > 0 && t < 1 && u > 0 && u < 1 ? t : null;
}

/** Farorna inom `marginalM` från linjen, i körordning (plats längs rutten, sedan id). En linje med en punkt duger inte. */
export function farorLangsRutten(hazards: Hazard[], line: [number, number][], marginalM: number): LangsRutten[] {
  if (line.length < 2) return [];
  const kum = [0];
  for (let i = 1; i < line.length; i++) kum.push(kum[i - 1] + haversineM({ lon: line[i - 1][0], lat: line[i - 1][1] }, { lon: line[i][0], lat: line[i][1] }));
  // Närmast linjen för en punkt: kortaste avståndet och platsen längs rutten där det nås.
  const narmast = (p: [number, number]) => {
    let d = Infinity, langs = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const s = tillStracka(p, line[i], line[i + 1]);
      if (s.d < d) { d = s.d; langs = kum[i] + s.t * (kum[i + 1] - kum[i]); }
    }
    return { d, langs };
  };
  const ut: LangsRutten[] = [];
  for (const h of hazards) {
    // K (DECISIONS #577): kandidaten hör inte till urvalet längs rutten (favoriterna, skuggans förfilter) — hoppas över
    // uttryckligen, så att den inte faller bort som NaN. Kandidatens egen takt räknas av kandidatLangsRutten (segment.ts).
    if (h.kind === "kandidat") continue;
    let d: number, langs: number;
    if (h.kind === "slippery_segment") {
      ({ d, langs } = narmast(h.line[0]));
      for (const p of h.line.slice(1)) { const n = narmast(p); if (n.d < d) ({ d, langs } = n); }
      // Linjens brytpunkter mot segmentet: ett segment kan gå nära linjen mellan sina egna brytpunkter.
      for (let i = 0; i < line.length; i++) for (let j = 0; j < h.line.length - 1; j++) {
        const s = tillStracka(line[i], h.line[j], h.line[j + 1]);
        if (s.d < d) { d = s.d; langs = kum[i]; }
      }
      for (let i = 0; i < line.length - 1 && d > 0; i++) for (let j = 0; j < h.line.length - 1; j++) {
        const t = korsning(line[i], line[i + 1], h.line[j], h.line[j + 1]);
        if (t !== null) { d = 0; langs = kum[i] + t * (kum[i + 1] - kum[i]); break; }
      }
    } else {
      ({ d, langs } = narmast([h.lon, h.lat]));
    }
    if (d <= marginalM) ut.push({ hazard: h, avstandM: d, langsM: langs });
  }
  return ut.sort((a, b) => a.langsM - b.langsM || (a.hazard.id < b.hazard.id ? -1 : a.hazard.id > b.hazard.id ? 1 : 0));
}

/** Skuggans förfilter sedan 12/10 (Bengt, DECISIONS #535): farorna inom motorns längsta räckvidd från själva linjen, i stället för
 *  rektangeln runt hela rutten. Motorn räknar på farorna i den ordning de kommer, så snapshotens ordning behålls och urvalets
 *  körordning kastas. Samma varningar och samma undanträngda som utan filter (test/rutfilter.test.ts); mätt 11/10 och 12/10 på
 *  skuggans 30 rutter: 54–55 % av rektangelns faror och halva motorns tid (#528). */
export function farorVidLinjen(hazards: Hazard[], line: [number, number][]): Hazard[] {
  const valda = new Set(farorLangsRutten(hazards, line, FARA_MARGINAL_KM * 1000).map((x) => x.hazard));
  return hazards.filter((h) => valda.has(h));
}


// ═══ engine/src/snapshot.ts ═══
// Snapshot → Hazard adapter. THE reference mapping from the published app files
// (data/app/v1/{static,live}.json) into the engine's hazard vocabulary. The Kotlin
// port must mirror this file 1:1 — it is deliberately boring.

export interface StaticDoc {
  schema: number;
  cameras: { id: string; lon: number; lat: number; bearing: number | null; road: string | null }[];
}

export interface LiveDoc {
  schema: number;
  generated_at: string;
  segments: { id: string; line: [number, number][]; code: number | null; info: string[]; road: string | null }[];
  weather: { id: string; lon: number; lat: number; yta: number | null; fukt: boolean;
             /** S3 (#524): timmar sedan regn och ytans fall på 30 min, positivt = faller (snapshot-core.ts). */
             regn_h?: number | null; lutning30?: number | null }[];
  deviations: {
    id: string; lon: number; lat: number; typ: string | null; road: string | null;
    /** Trafikverket SeverityCode, present only for real accidents (#28). */
    sev?: number | null;
    /** Clearance time as "HH:MM" Swedish wall clock, pre-formatted by the publisher. */
    slut?: string | null;
  }[];
  smhi: unknown[]; // not consumed by the engine v1 (map/UI layer)
  wildlife?: { id: string; lon: number; lat: number; art: string | null }[];
  /** #318 — Trafikverkets djur på vägen (AnimalPresenceObstruction). Ersätter `wildlife`, som publiceras tom. */
  djur?: { id: string; lon: number; lat: number; art: string | null; slut?: string | null }[];
  /** #38 — bridges whose nearest station is near freezing. Publisher pre-filters; engine re-checks. */
  bridges?: { id: string; lon: number; lat: number; road: string | null; yta: number | null; fukt: boolean }[];
  /** #576 — the candidate's warning stretches: the database rule's `varnar` points per stretch. Absent = switched off (#562
   *  punkt 5), empty = the rule is silent; both mean no candidate hazard. `tid` is the rule's hour; the engine does not read it. */
  kandidat?: { id: string; tid: string; punkter: [number, number][] }[];
}

export function snapshotToHazards(staticDoc: StaticDoc, liveDoc: LiveDoc): Hazard[] {
  const out: Hazard[] = [];
  for (const c of staticDoc.cameras) {
    out.push({ id: `cam:${c.id}`, kind: "camera", lon: c.lon, lat: c.lat, bearing: c.bearing });
  }
  for (const s of liveDoc.segments) {
    out.push({ id: `seg:${s.id}`, kind: "slippery_segment", line: s.line, meta: { code: s.code, info: s.info } });
  }
  for (const w of liveDoc.weather) {
    out.push({ id: `wx:${w.id}`, kind: "icing_point", lon: w.lon, lat: w.lat,
               meta: { surfaceTempC: w.yta, moisture: w.fukt, rainH: w.regn_h ?? null, fall30C: w.lutning30 ?? null } });
  }
  for (const d of liveDoc.deviations) {
    out.push({
      id: `dev:${d.id}`, kind: "accident", lon: d.lon, lat: d.lat,
      meta: { severityCode: d.sev ?? null, endTimeLocal: d.slut ?? null, road: d.road ?? null },
    });
  }
  for (const v of liveDoc.wildlife ?? []) {
    out.push({ id: `vilt:${v.id}`, kind: "wildlife", lon: v.lon, lat: v.lat });
  }
  for (const v of liveDoc.djur ?? []) {
    out.push({ id: `djur:${v.id}`, kind: "wildlife", lon: v.lon, lat: v.lat });
  }
  for (const b of liveDoc.bridges ?? []) {
    out.push({ id: `bro:${b.id}`, kind: "icing_point", lon: b.lon, lat: b.lat,
               meta: { surfaceTempC: b.yta, moisture: b.fukt, bridge: true } });
  }
  for (const k of liveDoc.kandidat ?? []) {
    out.push({ id: `kand:${k.id}`, kind: "kandidat", points: k.punkter, segmentHazardId: `seg:${k.id}` });
  }
  return out;
}


// ═══ skuggans huvudrutter på vägnätet, OSRM (20, DECISIONS #573) ═══
const RUTTER_VAG: Record<string, [number, number][]> = {"E10 Luleå→Kiruna":[[22.14956,65.58069],[22.15414,65.58119],[22.15158,65.58504],[22.15082,65.58612],[22.14625,65.59029],[22.13848,65.5989],[22.13547,65.60101],[22.1352,65.60192],[22.133,65.60232],[22.12501,65.60566],[22.10996,65.61076],[22.10208,65.61393],[22.10155,65.61459],[22.1,65.61489],[22.09734,65.61589],[22.0897,65.61784],[22.06665,65.62245],[22.06378,65.62317],[22.06253,65.62388],[22.06271,65.62525],[22.06097,65.62593],[22.06054,65.62665],[22.06266,65.63101],[22.06513,65.63516],[22.06747,65.63842],[22.06979,65.64104],[22.07338,65.64451],[22.07738,65.64789],[22.08793,65.65524],[22.09129,65.65785],[22.09441,65.66079],[22.09717,65.66403],[22.09969,65.66809],[22.11151,65.69277],[22.11362,65.6957],[22.12046,65.70209],[22.12249,65.7037],[22.12589,65.70573],[22.13255,65.70903],[22.13619,65.71167],[22.15886,65.73413],[22.16713,65.74273],[22.1704,65.74785],[22.17127,65.75074],[22.1709,65.75383],[22.16798,65.76034],[22.16745,65.76241],[22.16841,65.77249],[22.16957,65.77693],[22.18061,65.79023],[22.18356,65.79554],[22.18515,65.79766],[22.1987,65.80891],[22.20486,65.81372],[22.21183,65.81749],[22.24839,65.83632],[22.25454,65.83909],[22.26082,65.84096],[22.26483,65.8418],[22.26867,65.8424],[22.27479,65.84299],[22.28669,65.84344],[22.29426,65.84436],[22.30324,65.84636],[22.31568,65.84977],[22.32797,65.85386],[22.33282,65.85596],[22.33665,65.85825],[22.34378,65.8639],[22.34898,65.86686],[22.35252,65.86834],[22.35674,65.86981],[22.36087,65.87102],[22.36546,65.87209],[22.37006,65.87294],[22.37493,65.87361],[22.37915,65.87398],[22.38257,65.87408],[22.38637,65.87398],[22.39883,65.8731],[22.40654,65.87279],[22.43332,65.87265],[22.44966,65.872],[22.46572,65.87199],[22.47326,65.87242],[22.49039,65.87385],[22.51781,65.87654],[22.52572,65.87703],[22.54057,65.87754],[22.54981,65.87841],[22.55437,65.87908],[22.55842,65.87989],[22.56156,65.88072],[22.56544,65.88203],[22.59786,65.89689],[22.60405,65.89929],[22.61082,65.9015],[22.62176,65.90432],[22.63986,65.90817],[22.64479,65.90888],[22.64724,65.90903],[22.64881,65.90894],[22.65167,65.90836],[22.65298,65.90828],[22.65409,65.90849],[22.65502,65.90915],[22.65682,65.91253],[22.65757,65.91511],[22.65746,65.91742],[22.65657,65.92057],[22.65689,65.92266],[22.65786,65.9243],[22.66325,65.93041],[22.66471,65.93251],[22.6653,65.9345],[22.66515,65.93696],[22.6656,65.93977],[22.66758,65.94425],[22.67039,65.9479],[22.68007,65.95809],[22.68817,65.96457],[22.6901,65.96673],[22.69105,65.96834],[22.69444,65.98157],[22.69443,65.98543],[22.69284,65.99593],[22.6935,66.00063],[22.69467,66.00475],[22.69678,66.00974],[22.70032,66.01563],[22.71036,66.02787],[22.71384,66.03282],[22.71677,66.0383],[22.71871,66.04372],[22.71844,66.04709],[22.71658,66.05025],[22.71365,66.05287],[22.70456,66.05865],[22.70321,66.06014],[22.70248,66.06211],[22.70298,66.06537],[22.70639,66.06857],[22.70752,66.07178],[22.70955,66.07542],[22.7104,66.07675],[22.71331,66.07976],[22.71416,66.08219],[22.71362,66.08555],[22.71339,66.09139],[22.71183,66.09586],[22.71209,66.10322],[22.71132,66.10468],[22.70878,66.10743],[22.70752,66.11161],[22.70408,66.11639],[22.70371,66.1183],[22.70412,66.12003],[22.70586,66.12204],[22.70775,66.12336],[22.71536,66.12688],[22.71891,66.12815],[22.73133,66.13118],[22.74633,66.13326],[22.76517,66.1368],[22.77011,66.1381],[22.77397,66.13977],[22.77722,66.14148],[22.77863,66.14251],[22.78134,66.14619],[22.78262,66.14743],[22.78416,66.14848],[22.78906,66.15116],[22.79559,66.15655],[22.79962,66.16039],[22.80104,66.16395],[22.80218,66.16551],[22.80347,66.16664],[22.80797,66.16949],[22.80906,66.1706],[22.8099,66.17206],[22.81011,66.17397],[22.80867,66.17807],[22.80832,66.18129],[22.80786,66.18217],[22.80601,66.18423],[22.80548,66.18596],[22.8058,66.18704],[22.80752,66.18989],[22.80818,66.20244],[22.81039,66.20668],[22.81055,66.20861],[22.80906,66.2141],[22.80029,66.22285],[22.7991,66.22486],[22.79875,66.22695],[22.79977,66.2365],[22.80158,66.2419],[22.80335,66.24421],[22.80926,66.24833],[22.81125,66.25058],[22.81699,66.26326],[22.81909,66.27027],[22.81905,66.27151],[22.81805,66.27504],[22.81887,66.28343],[22.81703,66.28842],[22.81715,66.29403],[22.81648,66.29557],[22.81081,66.30479],[22.80995,66.30775],[22.81039,66.31088],[22.81451,66.32037],[22.8148,66.32266],[22.81405,66.32472],[22.80977,66.33063],[22.80792,66.33198],[22.79674,66.33626],[22.7935,66.33838],[22.78607,66.34236],[22.77951,66.34686],[22.77574,66.35001],[22.76837,66.35404],[22.76598,66.35484],[22.76373,66.35532],[22.75242,66.35644],[22.74832,66.35738],[22.74656,66.35808],[22.74303,66.35996],[22.73402,66.36304],[22.732,66.36389],[22.72891,66.36588],[22.72459,66.36958],[22.7169,66.37305],[22.71431,66.37443],[22.71232,66.37491],[22.70602,66.37596],[22.69657,66.37893],[22.68527,66.38144],[22.68172,66.3826],[22.67906,66.38383],[22.6768,66.38535],[22.67236,66.38945],[22.66929,66.39487],[22.66797,66.39657],[22.65978,66.40426],[22.65366,66.40942],[22.65086,66.41117],[22.63432,66.41976],[22.61972,66.42861],[22.61667,66.43014],[22.61365,66.43131],[22.60916,66.43259],[22.60597,66.43324],[22.59428,66.43515],[22.59051,66.43597],[22.58706,66.43692],[22.58122,66.43918],[22.57547,66.44246],[22.57294,66.44368],[22.56504,66.44661],[22.54705,66.45196],[22.53353,66.4543],[22.53046,66.45505],[22.52772,66.45597],[22.52186,66.45844],[22.51407,66.46071],[22.51065,66.46213],[22.50851,66.46345],[22.50318,66.46786],[22.50178,66.46937],[22.49966,66.47269],[22.49744,66.47485],[22.48295,66.48483],[22.47373,66.49033],[22.46381,66.498],[22.46123,66.50048],[22.44297,66.5214],[22.4401,66.52346],[22.43779,66.52469],[22.43333,66.52645],[22.42964,66.52749],[22.4074,66.53268],[22.40341,66.53329],[22.38538,66.53506],[22.38144,66.53569],[22.37629,66.53692],[22.3728,66.53809],[22.35832,66.54367],[22.35227,66.54575],[22.34688,66.5473],[22.32606,66.55255],[22.32291,66.55361],[22.31807,66.55591],[22.31401,66.55884],[22.31011,66.56097],[22.30549,66.5627],[22.29598,66.56554],[22.29087,66.56768],[22.28812,66.56938],[22.27429,66.57962],[22.27098,66.58248],[22.26921,66.58442],[22.26779,66.5866],[22.26674,66.58894],[22.26548,66.5933],[22.26423,66.5955],[22.26228,66.5974],[22.25794,66.60078],[22.25362,66.60501],[22.25085,66.6068],[22.24228,66.611],[22.22867,66.62141],[22.21973,66.62631],[22.20951,66.63147],[22.20672,66.63321],[22.20415,66.63519],[22.19966,66.63953],[22.19653,66.64191],[22.19412,66.64327],[22.18786,66.64606],[22.18504,66.64778],[22.18291,66.64969],[22.1757,66.65733],[22.17323,66.65905],[22.1696,66.66094],[22.16673,66.66211],[22.14891,66.66796],[22.1337,66.67223],[22.1262,66.67416],[22.11551,66.67626],[22.06737,66.68468],[22.06261,66.68594],[22.05549,66.68833],[22.05163,66.68927],[22.03138,66.6925],[22.02252,66.69427],[22.01504,66.69607],[22.01126,66.69746],[21.98941,66.7076],[21.98117,66.71201],[21.97062,66.71837],[21.96336,66.72242],[21.94168,66.7328],[21.93503,66.73571],[21.92489,66.73969],[21.91434,66.74326],[21.90314,66.74664],[21.89703,66.74915],[21.88989,66.7528],[21.88434,66.75611],[21.88173,66.75824],[21.87802,66.76245],[21.87487,66.76481],[21.86618,66.769],[21.86016,66.77302],[21.85165,66.77733],[21.84456,66.7825],[21.82472,66.79171],[21.82108,66.79385],[21.81765,66.79705],[21.81209,66.80594],[21.81067,66.80756],[21.79718,66.81655],[21.79366,66.81979],[21.79013,66.82406],[21.78769,66.82584],[21.78377,66.82778],[21.78073,66.82894],[21.77684,66.83014],[21.77111,66.83136],[21.74387,66.83518],[21.73096,66.83648],[21.72439,66.83757],[21.71945,66.83888],[21.70696,66.84312],[21.68984,66.84767],[21.686,66.84896],[21.68084,66.85145],[21.67675,66.8543],[21.67425,66.85642],[21.67097,66.85998],[21.6692,66.86134],[21.65512,66.86952],[21.64393,66.8802],[21.64034,66.88306],[21.63551,66.88587],[21.61133,66.89576],[21.5957,66.90154],[21.5647,66.91087],[21.54501,66.91722],[21.53953,66.91963],[21.53338,66.92345],[21.52907,66.92517],[21.52589,66.92603],[21.52115,66.9269],[21.511,66.92812],[21.50615,66.92846],[21.49616,66.92872],[21.49215,66.92903],[21.48899,66.92947],[21.483,66.93066],[21.46625,66.9351],[21.4625,66.93574],[21.45372,66.93688],[21.44936,66.93777],[21.44232,66.93975],[21.43254,66.94307],[21.42264,66.94542],[21.41867,66.94661],[21.40613,66.95122],[21.39828,66.95512],[21.3944,66.95647],[21.39045,66.95748],[21.38084,66.95943],[21.37111,66.96235],[21.36669,66.96429],[21.36408,66.96594],[21.34842,66.9783],[21.34587,66.97975],[21.33886,66.98301],[21.33667,66.98429],[21.33452,66.98599],[21.32856,66.99236],[21.3267,66.99377],[21.32404,66.9953],[21.31738,66.99822],[21.30832,67.0014],[21.30459,67.00238],[21.29145,67.00535],[21.2889,67.00611],[21.28679,67.00696],[21.28432,67.00831],[21.28288,67.0094],[21.28021,67.01296],[21.27761,67.01502],[21.27552,67.01614],[21.27299,67.01715],[21.26433,67.01978],[21.26158,67.02084],[21.25926,67.02201],[21.25614,67.02418],[21.24759,67.03195],[21.24391,67.03438],[21.24018,67.03625],[21.23646,67.03769],[21.23374,67.0385],[21.21919,67.0421],[21.21331,67.04372],[21.20731,67.04562],[21.20294,67.04731],[21.18905,67.05387],[21.18424,67.05561],[21.17876,67.05703],[21.1671,67.05944],[21.163,67.06053],[21.15322,67.06355],[21.14774,67.06478],[21.14069,67.06581],[21.12978,67.06673],[21.12328,67.06766],[21.09302,67.07479],[21.06293,67.07968],[21.05967,67.08035],[21.05345,67.08225],[21.04349,67.08611],[21.03899,67.08722],[21.03614,67.08756],[21.03323,67.0877],[21.02312,67.08752],[21.019,67.08778],[21.01602,67.08813],[20.99416,67.09182],[20.96566,67.09755],[20.93755,67.10223],[20.92896,67.10334],[20.90095,67.10567],[20.90309,67.11018],[20.90435,67.1166],[20.90414,67.11901],[20.90148,67.12654],[20.90138,67.12868],[20.9017,67.13046],[20.90394,67.13619],[20.90473,67.13755],[20.90719,67.14024],[20.91176,67.14359],[20.92253,67.14989],[20.92903,67.15331],[20.93499,67.15615],[20.93801,67.15797],[20.94039,67.16061],[20.94174,67.16523],[20.94243,67.16639],[20.94331,67.16737],[20.94481,67.16846],[20.97028,67.18192],[20.97449,67.18463],[20.97649,67.18646],[20.97811,67.18861],[20.97904,67.19092],[20.98009,67.19624],[20.98132,67.19821],[20.98336,67.19993],[20.98592,67.2013],[20.98882,67.20237],[21.00972,67.20821],[21.0128,67.20923],[21.01608,67.21088],[21.01727,67.21171],[21.01855,67.21312],[21.01941,67.21498],[21.01941,67.21575],[21.01907,67.2172],[21.0176,67.2201],[21.0157,67.22209],[21.00905,67.22635],[21.00735,67.22791],[21.00212,67.23769],[21.00166,67.23889],[21.00184,67.2409],[21.00354,67.24316],[21.00669,67.24516],[21.01693,67.24996],[21.02078,67.25242],[21.02339,67.25494],[21.03128,67.26425],[21.04073,67.27134],[21.04606,67.27452],[21.05161,67.27729],[21.06908,67.28453],[21.07202,67.28596],[21.07428,67.2873],[21.07665,67.28906],[21.07912,67.29172],[21.08392,67.30058],[21.08455,67.30401],[21.08388,67.30655],[21.08188,67.31044],[21.08117,67.31317],[21.08118,67.31574],[21.08285,67.32195],[21.08281,67.32318],[21.08156,67.32516],[21.07914,67.32748],[21.07849,67.32873],[21.07851,67.3302],[21.07998,67.33312],[21.08221,67.3351],[21.08471,67.33646],[21.09062,67.33871],[21.09248,67.33975],[21.09371,67.34074],[21.09492,67.34282],[21.09424,67.34652],[21.0947,67.34867],[21.09719,67.35224],[21.09765,67.35387],[21.09732,67.3555],[21.09546,67.35979],[21.0946,67.36458],[21.0936,67.3663],[21.09248,67.3674],[21.08877,67.36958],[21.08522,67.37237],[21.08031,67.37477],[21.0787,67.37589],[21.07727,67.37779],[21.07731,67.37968],[21.07837,67.38125],[21.08054,67.38279],[21.08356,67.38404],[21.09389,67.38643],[21.09771,67.38782],[21.10725,67.39347],[21.10904,67.39475],[21.11066,67.39687],[21.11086,67.39928],[21.10994,67.40105],[21.10571,67.40444],[21.10465,67.40592],[21.10464,67.40762],[21.10526,67.40866],[21.10642,67.40973],[21.11,67.41164],[21.11364,67.41463],[21.11579,67.41576],[21.1189,67.41675],[21.12103,67.4172],[21.12976,67.41809],[21.13245,67.4186],[21.13548,67.41968],[21.13742,67.42128],[21.13779,67.42223],[21.13764,67.42311],[21.13693,67.42403],[21.12655,67.43214],[21.12508,67.43301],[21.12052,67.43509],[21.11916,67.43596],[21.11737,67.43757],[21.11638,67.43951],[21.11636,67.44112],[21.1168,67.44265],[21.12041,67.44651],[21.12128,67.44798],[21.12287,67.45682],[21.12519,67.46142],[21.12427,67.46683],[21.12453,67.46827],[21.12537,67.46986],[21.12822,67.47307],[21.12867,67.47469],[21.12826,67.47643],[21.12708,67.47836],[21.12173,67.4845],[21.12079,67.48683],[21.12067,67.48878],[21.1215,67.49113],[21.12311,67.49324],[21.1377,67.50548],[21.14042,67.50822],[21.14145,67.50965],[21.14272,67.51245],[21.14424,67.5187],[21.1485,67.52426],[21.15209,67.53538],[21.1514,67.53736],[21.15039,67.5386],[21.14484,67.54317],[21.14402,67.54439],[21.14373,67.54548],[21.14403,67.54758],[21.14818,67.55815],[21.14836,67.56082],[21.14774,67.5624],[21.1384,67.57633],[21.13069,67.58287],[21.12267,67.59583],[21.1217,67.59787],[21.12123,67.60142],[21.11992,67.60371],[21.11713,67.60619],[21.11191,67.60935],[21.0997,67.61462],[21.09761,67.61585],[21.09581,67.61713],[21.08641,67.62668],[21.08458,67.62801],[21.08093,67.62982],[21.07201,67.63299],[21.06895,67.63432],[21.06662,67.6358],[21.06213,67.63937],[21.05906,67.64114],[21.05493,67.64273],[21.05068,67.64382],[21.04693,67.64448],[21.03175,67.64648],[21.02752,67.64737],[21.02425,67.64833],[21.0217,67.64932],[21.01904,67.6507],[21.00839,67.65747],[21.00569,67.65855],[20.99836,67.66075],[20.99145,67.66393],[20.98874,67.66488],[20.98576,67.66564],[20.98171,67.66629],[20.97804,67.66658],[20.97077,67.66686],[20.96605,67.66735],[20.94628,67.67117],[20.94299,67.67164],[20.93248,67.67228],[20.9202,67.67229],[20.91321,67.67294],[20.89806,67.67561],[20.89096,67.67703],[20.85782,67.68546],[20.8388,67.68964],[20.82115,67.69273],[20.78931,67.69727],[20.77556,67.69961],[20.76721,67.70153],[20.76111,67.7032],[20.75567,67.70491],[20.74955,67.70715],[20.7425,67.71023],[20.71124,67.72472],[20.70778,67.7261],[20.70257,67.72756],[20.68864,67.73032],[20.6847,67.73144],[20.68245,67.73227],[20.67424,67.7362],[20.66623,67.74065],[20.66385,67.74178],[20.65951,67.74333],[20.64917,67.74638],[20.64582,67.74764],[20.64049,67.75088],[20.63399,67.75524],[20.63217,67.757],[20.62892,67.76094],[20.62041,67.76855],[20.617,67.77233],[20.61619,67.77396],[20.61573,67.77696],[20.61413,67.77903],[20.59952,67.7885],[20.59771,67.79008],[20.59192,67.79972],[20.59099,67.80195],[20.59048,67.80519],[20.59094,67.80884],[20.59035,67.81059],[20.58903,67.81203],[20.58735,67.81317],[20.58499,67.81428],[20.58223,67.81519],[20.54637,67.82279],[20.54007,67.82482],[20.52817,67.83014],[20.52057,67.83288],[20.5154,67.83433],[20.50822,67.83596],[20.49801,67.83758],[20.49143,67.83828],[20.48661,67.83862],[20.47991,67.83892],[20.46534,67.83925],[20.45847,67.83965],[20.44345,67.84135],[20.43985,67.84163],[20.43538,67.84177],[20.42496,67.84168],[20.4209,67.8419],[20.40025,67.84421],[20.38909,67.84579],[20.38401,67.84622],[20.36507,67.84662],[20.36001,67.84642],[20.34951,67.8457],[20.34229,67.84562],[20.33705,67.84583],[20.32308,67.847],[20.3193,67.84758],[20.31862,67.84807],[20.31617,67.84846],[20.31361,67.85086],[20.31166,67.85193],[20.30791,67.85338],[20.30175,67.85503],[20.27955,67.85872],[20.27896,67.85911],[20.2773,67.8592],[20.27497,67.85965],[20.26489,67.86221],[20.26129,67.86295],[20.25682,67.8634],[20.24897,67.86347],[20.2463,67.86368],[20.24397,67.8642],[20.23858,67.86606],[20.2344,67.86728],[20.23094,67.86791],[20.22473,67.86842],[20.2237,67.86866],[20.22326,67.86841],[20.22407,67.86748],[20.22551,67.86676],[20.22846,67.86464],[20.22661,67.86135],[20.22857,67.86077],[20.22981,67.85996]],"E14 Sundsvall→Åre":[[17.31004,62.39007],[17.31117,62.38994],[17.31045,62.38848],[17.30048,62.38957],[17.29929,62.38726],[17.29869,62.38694],[17.27742,62.3892],[17.27354,62.38986],[17.25576,62.3956],[17.24598,62.39789],[17.24284,62.39876],[17.24145,62.39949],[17.23947,62.39964],[17.23784,62.39929],[17.23666,62.39922],[17.23277,62.39978],[17.22911,62.40011],[17.22353,62.40007],[17.21956,62.39961],[17.20325,62.39687],[17.20145,62.39645],[17.19839,62.39539],[17.19199,62.39241],[17.18715,62.39055],[17.17965,62.3881],[17.1684,62.38392],[17.16214,62.38194],[17.15659,62.38043],[17.14914,62.3787],[17.14648,62.37824],[17.12811,62.37627],[17.12438,62.37567],[17.11991,62.37474],[17.11311,62.37308],[17.10507,62.37044],[17.09063,62.36602],[17.08804,62.36538],[17.08481,62.36484],[17.05938,62.36296],[17.03204,62.36238],[17.01361,62.36122],[17.00924,62.36112],[17.00441,62.36146],[16.99551,62.36273],[16.9879,62.36401],[16.97601,62.36633],[16.97227,62.36681],[16.96755,62.367],[16.95383,62.3669],[16.94424,62.36745],[16.93601,62.36727],[16.93148,62.36751],[16.92058,62.36954],[16.90873,62.37046],[16.90487,62.37096],[16.89985,62.37196],[16.88954,62.37459],[16.87484,62.37659],[16.86983,62.37785],[16.85731,62.38169],[16.85219,62.38287],[16.8479,62.38355],[16.84017,62.38416],[16.83515,62.38413],[16.81364,62.38283],[16.80786,62.38271],[16.80093,62.38295],[16.79656,62.38331],[16.7879,62.38449],[16.7794,62.38603],[16.77577,62.38722],[16.77036,62.38944],[16.76184,62.39151],[16.75871,62.3927],[16.75323,62.39557],[16.7503,62.39664],[16.74673,62.39754],[16.7424,62.39806],[16.72486,62.39928],[16.71957,62.3999],[16.70664,62.40251],[16.6894,62.40527],[16.68242,62.40691],[16.67296,62.4094],[16.66889,62.4101],[16.66252,62.41058],[16.65023,62.41077],[16.64848,62.41095],[16.6463,62.41142],[16.6374,62.41566],[16.63537,62.4162],[16.63386,62.41645],[16.62332,62.41735],[16.61803,62.41763],[16.61358,62.41856],[16.60895,62.42008],[16.6062,62.42062],[16.60319,62.42074],[16.59692,62.4203],[16.59462,62.41987],[16.58985,62.41836],[16.58698,62.41792],[16.58425,62.41785],[16.57804,62.4184],[16.57468,62.41826],[16.57275,62.41804],[16.5684,62.41709],[16.56181,62.41794],[16.54662,62.41802],[16.54267,62.41826],[16.53405,62.41921],[16.52639,62.41964],[16.52247,62.42023],[16.51844,62.42124],[16.50468,62.42587],[16.50174,62.42671],[16.49686,62.42777],[16.48923,62.42903],[16.48594,62.42991],[16.48293,62.4311],[16.48053,62.43229],[16.47591,62.43567],[16.47367,62.43682],[16.4704,62.43797],[16.46534,62.43932],[16.46078,62.44102],[16.44954,62.44726],[16.44645,62.44877],[16.42492,62.45609],[16.41922,62.45759],[16.40372,62.46086],[16.39897,62.46213],[16.394,62.464],[16.3846,62.46865],[16.37995,62.47033],[16.37485,62.47167],[16.34265,62.47812],[16.3319,62.48124],[16.31795,62.48585],[16.3138,62.48688],[16.30868,62.48786],[16.30059,62.48878],[16.28635,62.48922],[16.27011,62.49043],[16.26371,62.49048],[16.25489,62.49015],[16.25016,62.49027],[16.24622,62.49058],[16.21374,62.49423],[16.2105,62.49496],[16.2056,62.49662],[16.20315,62.49727],[16.19477,62.49902],[16.18945,62.49985],[16.18188,62.50062],[16.16594,62.50145],[16.15432,62.50274],[16.15235,62.50275],[16.14383,62.50215],[16.13892,62.5014],[16.13104,62.49973],[16.12634,62.49925],[16.12288,62.49925],[16.11649,62.49981],[16.11399,62.49985],[16.10643,62.49912],[16.09319,62.49884],[16.08269,62.49794],[16.07498,62.49771],[16.0676,62.49709],[16.06322,62.49707],[16.05893,62.49748],[16.05042,62.49939],[16.04307,62.50192],[16.0351,62.50364],[16.0324,62.50462],[16.0288,62.50646],[16.02637,62.50748],[16.01466,62.51105],[15.99654,62.51877],[15.97997,62.52836],[15.97632,62.52964],[15.9648,62.53239],[15.95985,62.53328],[15.93636,62.53687],[15.93064,62.53729],[15.9127,62.53777],[15.90839,62.53825],[15.90507,62.53884],[15.89979,62.54031],[15.88871,62.54458],[15.88609,62.54596],[15.88001,62.54983],[15.87679,62.55127],[15.87343,62.55227],[15.86102,62.55477],[15.85786,62.55513],[15.85458,62.55525],[15.83151,62.55402],[15.8127,62.55402],[15.80562,62.55431],[15.79875,62.55506],[15.79231,62.55625],[15.78636,62.55782],[15.77312,62.56174],[15.76652,62.56423],[15.74951,62.57205],[15.74607,62.57379],[15.73366,62.58065],[15.70446,62.59611],[15.70032,62.59857],[15.6921,62.60424],[15.68989,62.6052],[15.68469,62.60698],[15.68178,62.60826],[15.67396,62.61304],[15.67172,62.61415],[15.65878,62.6186],[15.65516,62.62018],[15.65043,62.6228],[15.64689,62.62539],[15.64443,62.62773],[15.63597,62.63922],[15.63384,62.64128],[15.62931,62.64503],[15.62799,62.64647],[15.62481,62.65124],[15.62266,62.65385],[15.61992,62.65625],[15.61674,62.65996],[15.61528,62.66126],[15.60859,62.66477],[15.60747,62.66575],[15.60498,62.67013],[15.60241,62.67292],[15.58378,62.68443],[15.58146,62.68549],[15.57724,62.68666],[15.57383,62.68718],[15.55227,62.68945],[15.5467,62.69037],[15.54318,62.69144],[15.53769,62.69384],[15.52095,62.69927],[15.50988,62.70167],[15.50241,62.70423],[15.46156,62.71505],[15.45856,62.71616],[15.45654,62.71726],[15.43889,62.72797],[15.43729,62.72929],[15.43621,62.7306],[15.43322,62.73639],[15.43204,62.73735],[15.42916,62.7388],[15.42776,62.73989],[15.42724,62.7407],[15.42676,62.74243],[15.42577,62.74388],[15.42031,62.74752],[15.41467,62.75575],[15.41363,62.75694],[15.41328,62.75701],[15.41092,62.759],[15.40963,62.76037],[15.40823,62.76455],[15.40603,62.76671],[15.405,62.7692],[15.40408,62.77037],[15.40145,62.77223],[15.38996,62.77743],[15.38868,62.77818],[15.38696,62.77958],[15.38454,62.78343],[15.38266,62.78578],[15.37556,62.79309],[15.37169,62.79917],[15.36946,62.80522],[15.36517,62.81],[15.36304,62.81192],[15.36097,62.813],[15.35869,62.81383],[15.35601,62.81433],[15.34879,62.81518],[15.34283,62.81667],[15.33644,62.81854],[15.32039,62.82637],[15.31803,62.82789],[15.31716,62.82916],[15.31715,62.83025],[15.32275,62.84505],[15.32335,62.84989],[15.32296,62.85178],[15.30462,62.87115],[15.30099,62.87449],[15.28039,62.88747],[15.2773,62.88839],[15.27426,62.88891],[15.26785,62.8896],[15.2667,62.88985],[15.26458,62.89063],[15.26317,62.89169],[15.26271,62.89268],[15.26273,62.8936],[15.2654,62.90121],[15.26557,62.90308],[15.26189,62.91204],[15.26098,62.91325],[15.25957,62.91431],[15.25454,62.91645],[15.25129,62.91739],[15.24863,62.91776],[15.24094,62.91824],[15.23728,62.91908],[15.235,62.92025],[15.22761,62.92505],[15.21823,62.93222],[15.21689,62.93297],[15.21339,62.93411],[15.1995,62.93696],[15.16903,62.94622],[15.16637,62.94753],[15.15961,62.95251],[15.15864,62.95295],[15.15711,62.95335],[15.15461,62.95353],[15.14921,62.95309],[15.14234,62.95364],[15.13931,62.95404],[15.13291,62.95549],[15.13025,62.95572],[15.10401,62.95506],[15.10047,62.95487],[15.0976,62.95425],[15.09234,62.9523],[15.08672,62.95086],[15.08496,62.95017],[15.0838,62.94887],[15.08359,62.94565],[15.08325,62.94475],[15.08266,62.94419],[15.08145,62.94356],[15.08014,62.94319],[15.07845,62.94295],[15.07626,62.94302],[15.07464,62.94333],[15.05592,62.94789],[15.05258,62.94908],[15.05162,62.94962],[15.04492,62.95486],[15.04304,62.95573],[15.03571,62.95823],[15.02336,62.96543],[15.02202,62.96653],[15.021,62.96777],[15.01869,62.97153],[15.01735,62.97287],[15.01558,62.97398],[15.00578,62.97839],[14.98393,62.98936],[14.97391,62.99388],[14.97205,62.99488],[14.96217,63.00146],[14.95902,63.00591],[14.95679,63.0086],[14.95073,63.01345],[14.94885,63.01606],[14.94756,63.01708],[14.94623,63.01761],[14.94432,63.01803],[14.93851,63.01823],[14.93639,63.01848],[14.9257,63.02163],[14.90529,63.03138],[14.87309,63.04231],[14.87073,63.04341],[14.86667,63.04597],[14.84346,63.06924],[14.8435,63.06948],[14.83821,63.07369],[14.83542,63.07515],[14.82822,63.07831],[14.82612,63.08012],[14.82269,63.0813],[14.82077,63.08303],[14.81482,63.0857],[14.81219,63.0871],[14.8033,63.09258],[14.79827,63.09764],[14.79721,63.09909],[14.79472,63.10549],[14.79507,63.10725],[14.79682,63.11062],[14.79815,63.1166],[14.79771,63.1186],[14.79435,63.12378],[14.79229,63.12901],[14.79119,63.131],[14.78341,63.1423],[14.78073,63.1451],[14.77597,63.1494],[14.77364,63.15125],[14.7705,63.15333],[14.76506,63.15621],[14.76079,63.15811],[14.75557,63.16006],[14.75183,63.16122],[14.74674,63.16239],[14.72726,63.16558],[14.71724,63.16755],[14.70737,63.16999],[14.70428,63.17109],[14.70209,63.17216],[14.69264,63.17832],[14.69099,63.17959],[14.68983,63.18085],[14.68888,63.18256],[14.68855,63.18405],[14.68882,63.18586],[14.69027,63.18974],[14.68994,63.19243],[14.68835,63.19479],[14.68538,63.19769],[14.68268,63.19982],[14.67898,63.20214],[14.66261,63.21079],[14.65833,63.21253],[14.65532,63.21332],[14.65228,63.21389],[14.6494,63.21424],[14.64235,63.21477],[14.63987,63.21515],[14.63551,63.21623],[14.63257,63.21742],[14.63007,63.21895],[14.62415,63.22373],[14.6148,63.22985],[14.61053,63.23291],[14.60554,63.23716],[14.60033,63.24234],[14.59746,63.24469],[14.59373,63.24699],[14.59088,63.24841],[14.5851,63.25068],[14.58127,63.25186],[14.5651,63.25537],[14.56029,63.25665],[14.55619,63.25801],[14.55199,63.25964],[14.54606,63.26258],[14.54401,63.26384],[14.5403,63.26658],[14.53808,63.26869],[14.53392,63.27343],[14.53138,63.27552],[14.50907,63.28908],[14.50485,63.2919],[14.49869,63.29691],[14.49051,63.30502],[14.48894,63.3062],[14.48611,63.30784],[14.4829,63.30923],[14.47911,63.31042],[14.46389,63.3138],[14.44895,63.31756],[14.44517,63.31875],[14.44191,63.32009],[14.4392,63.32152],[14.43696,63.3231],[14.43406,63.32574],[14.43202,63.32692],[14.43001,63.3277],[14.42948,63.32815],[14.42367,63.32904],[14.41941,63.32925],[14.41543,63.32899],[14.40475,63.32758],[14.38397,63.32594],[14.38058,63.32589],[14.35915,63.32664],[14.30799,63.32554],[14.30375,63.32514],[14.29536,63.32403],[14.29198,63.32387],[14.28202,63.32381],[14.25535,63.32174],[14.25031,63.32151],[14.22302,63.32121],[14.21797,63.32149],[14.20088,63.32316],[14.19561,63.32314],[14.1906,63.32264],[14.18765,63.3221],[14.185,63.32141],[14.18061,63.31982],[14.17844,63.31921],[14.15906,63.31525],[14.15461,63.31452],[14.14753,63.31377],[14.13815,63.31323],[14.13319,63.31303],[14.12727,63.31304],[14.10513,63.31401],[14.10188,63.31432],[14.09837,63.31485],[14.08455,63.31805],[14.0682,63.32037],[14.06418,63.3212],[14.05552,63.32339],[14.04964,63.32503],[14.04283,63.3272],[14.03095,63.33179],[14.026,63.33319],[14.02198,63.33412],[14.01053,63.33618],[14.00662,63.33674],[14.00127,63.33716],[13.99015,63.33769],[13.98556,63.3373],[13.98124,63.33625],[13.97775,63.33466],[13.97612,63.33363],[13.97359,63.33146],[13.97061,63.33005],[13.9676,63.32908],[13.95611,63.32627],[13.9497,63.32422],[13.94511,63.32246],[13.9378,63.31896],[13.93419,63.31678],[13.92775,63.3124],[13.92479,63.31084],[13.92139,63.30942],[13.90951,63.30538],[13.90534,63.30448],[13.90099,63.30397],[13.89703,63.30384],[13.88685,63.30415],[13.87051,63.30614],[13.86662,63.30654],[13.86272,63.30672],[13.85888,63.30677],[13.8401,63.30584],[13.83638,63.30595],[13.81846,63.3075],[13.80305,63.30937],[13.77581,63.31153],[13.75358,63.31177],[13.73307,63.3126],[13.72256,63.31347],[13.71903,63.31355],[13.71613,63.3135],[13.71289,63.31324],[13.69899,63.31152],[13.6807,63.31068],[13.67473,63.31055],[13.66482,63.31068],[13.65215,63.31115],[13.64995,63.31095],[13.6411,63.30963],[13.62334,63.30853],[13.61989,63.30878],[13.60622,63.31106],[13.59552,63.31417],[13.59053,63.31535],[13.57013,63.31844],[13.5613,63.31938],[13.54493,63.3226],[13.54119,63.32383],[13.53614,63.32653],[13.52603,63.33068],[13.51729,63.33487],[13.51478,63.33574],[13.51143,63.33629],[13.50579,63.33646],[13.50245,63.33684],[13.48983,63.34049],[13.48581,63.34114],[13.47855,63.34157],[13.47613,63.34189],[13.47404,63.34238],[13.46627,63.3448],[13.463,63.3455],[13.46077,63.34568],[13.45893,63.34561],[13.45602,63.34503],[13.44354,63.34005],[13.44095,63.33924],[13.43347,63.33787],[13.42487,63.33553],[13.41713,63.33409],[13.40486,63.33031],[13.39535,63.32816],[13.38889,63.32741],[13.37131,63.32418],[13.36305,63.32151],[13.35628,63.31996],[13.35128,63.3178],[13.34021,63.31406],[13.3387,63.31369],[13.33516,63.31322],[13.32693,63.31287],[13.29882,63.31334],[13.28664,63.3141],[13.26674,63.3157],[13.26236,63.31635],[13.24899,63.31908],[13.24585,63.31978],[13.24091,63.32131],[13.22233,63.33008],[13.21657,63.3334],[13.20967,63.33801],[13.20493,63.3407],[13.20231,63.34174],[13.19865,63.34275],[13.19595,63.34369],[13.19324,63.34505],[13.19063,63.34728],[13.18479,63.35524],[13.182,63.35771],[13.17894,63.36],[13.17184,63.36453],[13.16823,63.36713],[13.15797,63.37628],[13.15487,63.37802],[13.1507,63.37941],[13.13114,63.38448],[13.12252,63.38579],[13.11491,63.38652],[13.10661,63.38769],[13.10064,63.38912],[13.09729,63.39058],[13.09543,63.39175],[13.09171,63.39511],[13.08811,63.39752],[13.08532,63.39883],[13.08285,63.39974],[13.08331,63.4],[13.08383,63.39956],[13.0835,63.39933],[13.08293,63.3993],[13.0809,63.40013],[13.07988,63.40015]],"E18 Karlstad→Örebro":[[13.49958,59.37995],[13.49932,59.37995],[13.49947,59.38117],[13.4984,59.38194],[13.49629,59.38551],[13.49526,59.38937],[13.49524,59.39033],[13.49679,59.39295],[13.498,59.39391],[13.49974,59.39486],[13.49867,59.39554],[13.49887,59.39623],[13.4992,59.39657],[13.50033,59.3971],[13.50249,59.39772],[13.50493,59.39799],[13.50749,59.3979],[13.50982,59.39743],[13.51303,59.39623],[13.5148,59.39578],[13.51718,59.3955],[13.51979,59.39558],[13.52192,59.39596],[13.52801,59.39769],[13.54291,59.40081],[13.54646,59.40136],[13.54929,59.40152],[13.55188,59.40147],[13.55539,59.40107],[13.56571,59.39883],[13.57044,59.39811],[13.57639,59.3978],[13.58255,59.39816],[13.63038,59.40421],[13.63895,59.40547],[13.64304,59.40628],[13.64713,59.40755],[13.65217,59.40965],[13.6702,59.41919],[13.67223,59.41996],[13.67533,59.42074],[13.67895,59.42123],[13.68219,59.42133],[13.69832,59.42057],[13.70385,59.42011],[13.71593,59.41844],[13.73208,59.41721],[13.74016,59.41597],[13.74552,59.41477],[13.75228,59.41288],[13.75782,59.41098],[13.76864,59.40683],[13.77765,59.40396],[13.7852,59.40203],[13.79972,59.39889],[13.81432,59.39502],[13.81972,59.39391],[13.82689,59.39284],[13.83265,59.39218],[13.84685,59.39101],[13.85641,59.38961],[13.86146,59.38855],[13.86781,59.38694],[13.88242,59.38246],[13.88943,59.38103],[13.89334,59.38054],[13.91259,59.37875],[13.91559,59.37832],[13.92833,59.37596],[13.94671,59.3741],[13.95042,59.37392],[13.95436,59.37395],[13.96917,59.37508],[13.97106,59.3751],[13.99576,59.37369],[13.99934,59.37328],[14.00339,59.37257],[14.00821,59.37131],[14.01378,59.36939],[14.01678,59.36805],[14.02484,59.36361],[14.02786,59.36237],[14.03279,59.36084],[14.03893,59.35965],[14.05462,59.35745],[14.05802,59.35684],[14.07029,59.35429],[14.07321,59.35338],[14.07566,59.35238],[14.07784,59.3512],[14.08036,59.3494],[14.087,59.34339],[14.09339,59.33548],[14.09942,59.32972],[14.10218,59.32774],[14.1047,59.32661],[14.10739,59.3258],[14.11099,59.32514],[14.1264,59.32385],[14.12983,59.32325],[14.13192,59.32267],[14.13795,59.32024],[14.14178,59.31902],[14.15051,59.31694],[14.16272,59.31356],[14.16545,59.31303],[14.16861,59.31264],[14.19448,59.31089],[14.19959,59.31072],[14.20711,59.31092],[14.22004,59.31194],[14.22453,59.31202],[14.23404,59.3119],[14.25688,59.31251],[14.26532,59.31208],[14.27811,59.31031],[14.28089,59.31004],[14.29885,59.30963],[14.30142,59.30984],[14.30989,59.31109],[14.31672,59.31177],[14.32066,59.31241],[14.32441,59.31335],[14.35126,59.32132],[14.35769,59.32283],[14.3636,59.32365],[14.37192,59.32408],[14.37908,59.32412],[14.38304,59.32369],[14.39302,59.32171],[14.39538,59.32137],[14.39793,59.32124],[14.4081,59.32136],[14.41061,59.32161],[14.41268,59.32201],[14.42361,59.32524],[14.42625,59.32588],[14.43047,59.32649],[14.43443,59.32666],[14.438,59.32649],[14.44147,59.32606],[14.45193,59.32346],[14.45444,59.32303],[14.45701,59.3228],[14.48978,59.32355],[14.49785,59.32392],[14.49859,59.32376],[14.49943,59.32396],[14.50414,59.32418],[14.50516,59.32414],[14.50628,59.32367],[14.50697,59.3236],[14.50928,59.32404],[14.51579,59.32412],[14.52679,59.32467],[14.52758,59.32456],[14.52845,59.32472],[14.53344,59.32497],[14.53577,59.32545],[14.53798,59.32635],[14.53928,59.32725],[14.54164,59.32965],[14.54265,59.33016],[14.54394,59.33054],[14.5458,59.33077],[14.54811,59.33083],[14.55458,59.33047],[14.563,59.32902],[14.57198,59.32812],[14.5758,59.3273],[14.5851,59.32431],[14.59007,59.32245],[14.59255,59.32084],[14.59505,59.3182],[14.59644,59.31708],[14.59851,59.31588],[14.60031,59.31514],[14.60235,59.31456],[14.62627,59.3092],[14.62891,59.30839],[14.63161,59.30715],[14.6332,59.3061],[14.64037,59.29956],[14.64219,59.29856],[14.64435,59.29776],[14.64636,59.29726],[14.64885,59.2969],[14.67128,59.29501],[14.67294,59.29475],[14.675,59.29419],[14.67709,59.29323],[14.6787,59.29189],[14.68284,59.28551],[14.68391,59.28435],[14.68594,59.28298],[14.68904,59.28174],[14.69192,59.28108],[14.6976,59.28036],[14.70794,59.27851],[14.71572,59.27838],[14.73935,59.27635],[14.75311,59.27567],[14.75747,59.2752],[14.7618,59.27443],[14.77833,59.27031],[14.7892,59.26778],[14.80073,59.26468],[14.80652,59.26235],[14.8086,59.2613],[14.81026,59.25999],[14.81247,59.25744],[14.81505,59.25574],[14.82061,59.25361],[14.82339,59.25288],[14.82723,59.25233],[14.83243,59.25185],[14.83762,59.25162],[14.84284,59.25161],[14.84952,59.25193],[14.86917,59.25368],[14.87598,59.25412],[14.88516,59.25433],[14.89526,59.25407],[14.90451,59.2534],[14.91296,59.25238],[14.91846,59.25128],[14.92747,59.24876],[14.93111,59.24789],[14.93645,59.24694],[14.94117,59.24637],[14.94535,59.24608],[14.96013,59.24548],[14.97991,59.24569],[14.99008,59.24553],[14.99696,59.24504],[15.0102,59.2434],[15.01629,59.24295],[15.02306,59.24288],[15.02948,59.24323],[15.03565,59.24395],[15.04743,59.24605],[15.05491,59.24705],[15.06322,59.24764],[15.07119,59.24769],[15.07927,59.2471],[15.08738,59.24582],[15.09316,59.24441],[15.1073,59.2402],[15.11012,59.23966],[15.11381,59.23944],[15.12958,59.23943],[15.13385,59.23972],[15.13644,59.24018],[15.13891,59.24085],[15.14737,59.24399],[15.14845,59.24499],[15.14832,59.24721],[15.14902,59.24821],[15.15066,59.24964],[15.154,59.25173],[15.16224,59.25602],[15.16728,59.25942],[15.17051,59.26105],[15.17382,59.26211],[15.18046,59.26341],[15.19158,59.26463],[15.19678,59.26495],[15.19791,59.26543],[15.20117,59.26816],[15.20469,59.26987],[15.20542,59.2705],[15.20974,59.26953],[15.21007,59.26998]],"E18 Örebro→Stockholm":[[15.21007,59.26998],[15.20984,59.26969],[15.20568,59.27066],[15.20618,59.27254],[15.20976,59.27562],[15.21176,59.27814],[15.21497,59.2795],[15.21526,59.28],[15.21544,59.28209],[15.21715,59.2844],[15.21882,59.28574],[15.22176,59.28691],[15.22271,59.28746],[15.22382,59.28943],[15.22526,59.29097],[15.22625,59.29284],[15.2275,59.2942],[15.22927,59.29499],[15.23914,59.29634],[15.24489,59.29768],[15.24941,59.29941],[15.25765,59.30355],[15.26162,59.30501],[15.26562,59.3061],[15.27223,59.30724],[15.27586,59.30756],[15.27949,59.30768],[15.31733,59.30648],[15.3212,59.3065],[15.3324,59.30702],[15.33975,59.30716],[15.35203,59.30703],[15.36849,59.30646],[15.37588,59.30663],[15.40691,59.30852],[15.41142,59.30894],[15.41711,59.3099],[15.43486,59.31423],[15.44043,59.31529],[15.44657,59.31598],[15.46122,59.31688],[15.46633,59.31759],[15.47077,59.31871],[15.47875,59.32165],[15.48421,59.32325],[15.50967,59.32887],[15.52192,59.33107],[15.52625,59.33227],[15.53025,59.33378],[15.53416,59.33573],[15.54203,59.34034],[15.55294,59.34742],[15.56326,59.35493],[15.57492,59.36455],[15.57838,59.36703],[15.58123,59.36868],[15.58555,59.37071],[15.58951,59.37219],[15.59437,59.37363],[15.5998,59.37484],[15.60721,59.37588],[15.61153,59.3762],[15.62516,59.3766],[15.63204,59.37702],[15.63982,59.37783],[15.64643,59.37891],[15.65084,59.37983],[15.65743,59.38148],[15.67597,59.38659],[15.68718,59.39008],[15.70818,59.39724],[15.7132,59.39862],[15.71716,59.39948],[15.72226,59.4003],[15.7414,59.40228],[15.74709,59.40317],[15.75261,59.40433],[15.75874,59.40626],[15.76281,59.40806],[15.76487,59.40927],[15.76813,59.41169],[15.77301,59.41679],[15.77604,59.41878],[15.78003,59.42045],[15.78227,59.42114],[15.78542,59.42184],[15.78916,59.42237],[15.79235,59.42258],[15.80314,59.42252],[15.80901,59.42282],[15.8273,59.42482],[15.83694,59.42543],[15.84349,59.42558],[15.86048,59.42537],[15.86389,59.42541],[15.86953,59.42573],[15.87425,59.42624],[15.8791,59.42702],[15.8831,59.42789],[15.88636,59.42885],[15.89102,59.43077],[15.8951,59.43325],[15.89809,59.43608],[15.90002,59.43931],[15.90052,59.44127],[15.90052,59.44342],[15.8981,59.45242],[15.89775,59.45793],[15.89822,59.46127],[15.89929,59.46479],[15.9005,59.46743],[15.90233,59.47049],[15.91125,59.48282],[15.91409,59.48622],[15.91728,59.48952],[15.92249,59.49369],[15.93338,59.50064],[15.93541,59.50218],[15.93736,59.50406],[15.94155,59.50928],[15.944,59.51128],[15.94617,59.5125],[15.94922,59.51378],[15.96209,59.51749],[15.96627,59.5192],[15.96823,59.52035],[15.98216,59.53029],[15.98485,59.53201],[15.98833,59.5338],[16.0041,59.54109],[16.00832,59.54345],[16.01491,59.54762],[16.01882,59.54949],[16.02208,59.55057],[16.02486,59.55124],[16.0419,59.554],[16.04712,59.55523],[16.05138,59.55665],[16.06614,59.5623],[16.07347,59.56482],[16.0857,59.56868],[16.09511,59.57137],[16.1,59.57253],[16.10651,59.57362],[16.12452,59.5757],[16.13034,59.57654],[16.13661,59.5777],[16.15343,59.58121],[16.16014,59.58234],[16.16713,59.58318],[16.18784,59.58478],[16.19332,59.58539],[16.23548,59.59221],[16.23907,59.59267],[16.24242,59.59285],[16.24841,59.59263],[16.25365,59.59182],[16.29097,59.5816],[16.2976,59.58021],[16.30417,59.57931],[16.31217,59.57881],[16.31844,59.57885],[16.34772,59.58003],[16.35423,59.58057],[16.3606,59.5816],[16.37581,59.58516],[16.38361,59.58668],[16.41608,59.59116],[16.4207,59.59204],[16.42453,59.59318],[16.42742,59.59437],[16.43962,59.60111],[16.44265,59.60249],[16.44564,59.60358],[16.44885,59.60449],[16.46441,59.60811],[16.47893,59.61229],[16.48957,59.61377],[16.50098,59.61617],[16.5084,59.61674],[16.51084,59.61716],[16.51373,59.61801],[16.52587,59.62297],[16.52818,59.62358],[16.53056,59.62388],[16.54229,59.62462],[16.54526,59.62459],[16.54715,59.62434],[16.54912,59.62378],[16.55044,59.62314],[16.5515,59.62227],[16.55289,59.62047],[16.55469,59.61943],[16.55736,59.61882],[16.56484,59.6179],[16.56677,59.61748],[16.56881,59.6166],[16.57242,59.61406],[16.57463,59.6132],[16.57868,59.61203],[16.58633,59.61059],[16.59949,59.60916],[16.60706,59.60747],[16.61,59.60697],[16.61321,59.60674],[16.61799,59.60683],[16.62385,59.60754],[16.63053,59.60909],[16.6343,59.61039],[16.6408,59.61316],[16.64643,59.61534],[16.65522,59.61834],[16.66183,59.62031],[16.66705,59.62167],[16.67263,59.62293],[16.677,59.62362],[16.68155,59.62395],[16.68755,59.62415],[16.70367,59.62396],[16.71644,59.62456],[16.73851,59.62449],[16.76207,59.62474],[16.76998,59.62435],[16.78208,59.62298],[16.79031,59.62231],[16.80076,59.62202],[16.80555,59.62206],[16.80996,59.62228],[16.81885,59.62325],[16.82493,59.62434],[16.82968,59.62568],[16.84526,59.63126],[16.85068,59.63281],[16.88087,59.63902],[16.88888,59.64028],[16.89507,59.64079],[16.90234,59.64092],[16.93642,59.63891],[16.94083,59.63887],[16.94507,59.6391],[16.95099,59.63987],[16.95606,59.641],[16.97445,59.64704],[16.97768,59.64796],[16.98197,59.64871],[16.9863,59.64901],[16.99057,59.6489],[17.01962,59.64626],[17.03968,59.64378],[17.04298,59.64359],[17.04549,59.64364],[17.05045,59.64432],[17.05417,59.64541],[17.05937,59.6476],[17.06639,59.6517],[17.07039,59.65326],[17.07326,59.65402],[17.07608,59.65454],[17.07897,59.65487],[17.08222,59.65503],[17.08563,59.65495],[17.08924,59.65458],[17.09809,59.65297],[17.10617,59.65189],[17.11192,59.65132],[17.1263,59.65037],[17.13309,59.64974],[17.13723,59.64912],[17.14631,59.64732],[17.15335,59.64642],[17.16102,59.64594],[17.18267,59.64523],[17.19118,59.64465],[17.20006,59.64366],[17.21506,59.64109],[17.22431,59.6401],[17.23238,59.63975],[17.2446,59.63971],[17.25091,59.63939],[17.25586,59.63895],[17.26433,59.63781],[17.27798,59.63518],[17.2898,59.63347],[17.30057,59.63254],[17.31633,59.63169],[17.32358,59.63114],[17.3628,59.62686],[17.3697,59.62584],[17.37637,59.62453],[17.38203,59.62312],[17.3869,59.62168],[17.39168,59.62003],[17.41161,59.61186],[17.42954,59.60545],[17.43847,59.60131],[17.44241,59.59968],[17.4495,59.5973],[17.45751,59.59529],[17.46501,59.59395],[17.47271,59.59306],[17.48523,59.59227],[17.48931,59.59174],[17.49213,59.59121],[17.49724,59.58987],[17.50504,59.58704],[17.51029,59.58539],[17.52423,59.58194],[17.53192,59.57969],[17.53671,59.578],[17.54017,59.57651],[17.54839,59.5717],[17.55305,59.5693],[17.56791,59.56283],[17.5812,59.55617],[17.58921,59.55272],[17.59145,59.55151],[17.59712,59.54786],[17.60145,59.54548],[17.60635,59.5432],[17.61482,59.53987],[17.61861,59.53818],[17.62599,59.53427],[17.63287,59.53001],[17.63658,59.52832],[17.6425,59.52648],[17.65505,59.52358],[17.65784,59.52279],[17.66373,59.52047],[17.67057,59.5172],[17.67472,59.51546],[17.68115,59.51328],[17.68801,59.51132],[17.69289,59.51032],[17.69931,59.50951],[17.70356,59.50928],[17.71403,59.50907],[17.71752,59.50884],[17.72097,59.50831],[17.72466,59.50735],[17.72734,59.50635],[17.73237,59.50413],[17.73863,59.50064],[17.74166,59.49847],[17.74611,59.49431],[17.74918,59.49191],[17.75662,59.48699],[17.75979,59.48533],[17.76247,59.48438],[17.76467,59.48381],[17.76739,59.48335],[17.77583,59.48229],[17.78147,59.48098],[17.80436,59.47428],[17.80881,59.47268],[17.813,59.47077],[17.8171,59.46838],[17.82019,59.46609],[17.82245,59.46396],[17.82834,59.45731],[17.83647,59.451],[17.83926,59.44808],[17.84139,59.44445],[17.84457,59.43523],[17.84873,59.4293],[17.84996,59.42716],[17.8548,59.41278],[17.8562,59.41087],[17.85831,59.40897],[17.86003,59.40781],[17.86373,59.40597],[17.86593,59.40517],[17.87308,59.40301],[17.87759,59.40136],[17.88087,59.40056],[17.88443,59.40011],[17.89369,59.39965],[17.89846,59.39927],[17.90598,59.39834],[17.91001,59.39767],[17.91216,59.39713],[17.91913,59.39488],[17.92315,59.39392],[17.93262,59.39203],[17.93551,59.39108],[17.93926,59.38926],[17.94059,59.38892],[17.94201,59.38878],[17.94461,59.38904],[17.94585,59.38944],[17.9469,59.39001],[17.94794,59.39108],[17.94948,59.39373],[17.95082,59.39544],[17.95258,59.39701],[17.95428,59.39797],[17.95712,59.39891],[17.96598,59.40112],[17.96875,59.40153],[17.97117,59.40147],[17.9729,59.40107],[17.97451,59.40036],[17.98013,59.39728],[17.9904,59.3922],[17.99683,59.39],[17.99924,59.38896],[18.00255,59.38686],[18.00788,59.38253],[18.01828,59.37329],[18.01912,59.3723],[18.01973,59.37107],[18.02034,59.36735],[18.02085,59.36615],[18.02207,59.36491],[18.02539,59.36267],[18.02852,59.3591],[18.03441,59.35538],[18.03918,59.35279],[18.04133,59.35195],[18.04321,59.35058],[18.04456,59.35025],[18.04909,59.35048],[18.05015,59.35033],[18.05022,59.34957],[18.06396,59.33507],[18.06516,59.33308],[18.06476,59.33245],[18.0651,59.33234],[18.06952,59.33263],[18.06999,59.33099],[18.06991,59.33001]],"E22 Malmö→Kristianstad":[[13.04986,55.60001],[13.04981,55.59975],[13.04892,55.59985],[13.04688,55.60059],[13.04515,55.59929],[13.04804,55.59797],[13.04973,55.59739],[13.05245,55.59684],[13.05452,55.59664],[13.05506,55.59778],[13.05595,55.59887],[13.05709,55.59968],[13.05893,55.6005],[13.0607,55.60101],[13.06641,55.60201],[13.06987,55.60319],[13.0756,55.60443],[13.08319,55.60728],[13.08511,55.60784],[13.08935,55.60859],[13.09531,55.60892],[13.0982,55.60924],[13.10232,55.61012],[13.10862,55.612],[13.11057,55.61225],[13.11411,55.61226],[13.1152,55.61252],[13.1159,55.61286],[13.11661,55.61356],[13.11671,55.61454],[13.11608,55.61543],[13.11404,55.61707],[13.11338,55.61808],[13.1104,55.62807],[13.10661,55.63772],[13.1066,55.63885],[13.107,55.63982],[13.10951,55.64282],[13.11269,55.64482],[13.12257,55.64944],[13.14158,55.65796],[13.1504,55.66134],[13.1564,55.66398],[13.1609,55.66634],[13.18653,55.68065],[13.19374,55.68432],[13.1992,55.68638],[13.19981,55.68643],[13.20093,55.68758],[13.20321,55.68904],[13.21317,55.69409],[13.21515,55.69556],[13.21638,55.69682],[13.21871,55.70052],[13.21951,55.70266],[13.2226,55.71508],[13.22413,55.71829],[13.225,55.719],[13.22472,55.71997],[13.22578,55.72331],[13.22739,55.72546],[13.22987,55.72779],[13.23995,55.73437],[13.25324,55.742],[13.26205,55.74637],[13.27393,55.75165],[13.28044,55.75477],[13.2862,55.75775],[13.30149,55.76624],[13.30326,55.76701],[13.30857,55.7688],[13.31497,55.77012],[13.32024,55.77071],[13.33131,55.77156],[13.34056,55.77261],[13.34684,55.7736],[13.36061,55.77612],[13.36778,55.77717],[13.37071,55.77748],[13.37972,55.77792],[13.38282,55.77828],[13.38634,55.77899],[13.3937,55.78135],[13.39791,55.78237],[13.40161,55.78293],[13.40772,55.78341],[13.41081,55.78382],[13.42513,55.78646],[13.42875,55.78727],[13.43839,55.78999],[13.44039,55.79075],[13.44228,55.79171],[13.44368,55.7926],[13.44525,55.79397],[13.45088,55.8003],[13.45345,55.80203],[13.45665,55.80341],[13.46989,55.80718],[13.47455,55.80826],[13.49029,55.81247],[13.50765,55.82021],[13.51178,55.82165],[13.51562,55.82248],[13.53166,55.82484],[13.53508,55.82553],[13.53787,55.82629],[13.54232,55.82794],[13.55108,55.83224],[13.55459,55.83366],[13.57245,55.8391],[13.59222,55.84577],[13.59981,55.84806],[13.60585,55.85062],[13.60781,55.85129],[13.61044,55.85198],[13.61329,55.85249],[13.62029,55.8531],[13.62397,55.85357],[13.62768,55.85429],[13.63155,55.85534],[13.63651,55.85724],[13.64782,55.86299],[13.65183,55.86463],[13.65528,55.86546],[13.65866,55.86588],[13.66263,55.86552],[13.66482,55.8656],[13.6668,55.86548],[13.67407,55.86412],[13.67719,55.86385],[13.68026,55.86379],[13.68329,55.86394],[13.68651,55.86433],[13.69172,55.86551],[13.69466,55.86655],[13.69771,55.86802],[13.70763,55.87407],[13.70994,55.87587],[13.71177,55.87816],[13.72431,55.89752],[13.727,55.90011],[13.72848,55.90112],[13.73064,55.90225],[13.73302,55.9031],[13.73894,55.90436],[13.74126,55.90502],[13.74837,55.90817],[13.75401,55.90986],[13.75875,55.91099],[13.76715,55.91208],[13.77013,55.91288],[13.77197,55.91365],[13.79006,55.92251],[13.7926,55.92353],[13.79595,55.92451],[13.80187,55.92551],[13.80874,55.92607],[13.81481,55.92609],[13.82324,55.92567],[13.82746,55.92579],[13.83189,55.92636],[13.83604,55.92734],[13.84033,55.92895],[13.84369,55.93082],[13.84678,55.93332],[13.85059,55.93741],[13.85356,55.93939],[13.85836,55.94133],[13.86637,55.94379],[13.87074,55.94478],[13.87395,55.94524],[13.87784,55.94554],[13.88441,55.9457],[13.88883,55.94628],[13.89115,55.94687],[13.89743,55.94888],[13.90076,55.94973],[13.9034,55.95025],[13.91164,55.95147],[13.91423,55.95201],[13.9165,55.95268],[13.92576,55.95619],[13.93155,55.95785],[13.9351,55.95863],[13.94195,55.95966],[13.95054,55.96054],[13.95782,55.96093],[13.98366,55.96095],[13.99107,55.96123],[13.99818,55.96174],[14.00561,55.96266],[14.01345,55.9641],[14.01979,55.96565],[14.03097,55.96899],[14.03495,55.96986],[14.03783,55.97032],[14.0422,55.97078],[14.04639,55.97096],[14.05045,55.9709],[14.05841,55.97043],[14.06267,55.9705],[14.0683,55.97115],[14.07336,55.97238],[14.076,55.9733],[14.07923,55.97481],[14.08241,55.97682],[14.08404,55.97825],[14.08577,55.98016],[14.08875,55.98409],[14.09654,55.99575],[14.0982,55.99789],[14.10101,56.00085],[14.11362,56.01253],[14.1149,56.01401],[14.11629,56.01644],[14.11685,56.01698],[14.11809,56.01745],[14.11968,56.01755],[14.12829,56.01664],[14.1355,56.01641],[14.14106,56.01665],[14.1448,56.01701],[14.14904,56.01711],[14.14847,56.01794],[14.14575,56.02012],[14.14455,56.02166],[14.14839,56.02195],[14.15008,56.02227],[14.15587,56.02442],[14.15715,56.02552],[14.1614,56.02662],[14.1597,56.02866],[14.16176,56.02928],[14.16075,56.03021],[14.16012,56.03003]],"E4 Gävle→Sundsvall":[[17.1401,60.67],[17.14025,60.66933],[17.14002,60.66922],[17.13468,60.66788],[17.1342,60.66872],[17.13466,60.6729],[17.13422,60.6736],[17.12948,60.67524],[17.12726,60.67554],[17.1233,60.67572],[17.12063,60.67571],[17.11139,60.6752],[17.10763,60.67432],[17.1069,60.67434],[17.10583,60.67388],[17.09949,60.67228],[17.09583,60.67182],[17.09411,60.67191],[17.09268,60.67235],[17.09129,60.67335],[17.08986,60.67508],[17.0884,60.67787],[17.08741,60.6808],[17.08677,60.6839],[17.0851,60.68853],[17.08447,60.69256],[17.08459,60.69577],[17.08593,60.70291],[17.08593,60.70614],[17.08537,60.70883],[17.08444,60.71114],[17.08256,60.71413],[17.07602,60.72161],[17.07481,60.7238],[17.07419,60.72593],[17.07426,60.72922],[17.07513,60.73158],[17.07653,60.7338],[17.07948,60.73744],[17.0808,60.74017],[17.0814,60.7428],[17.08144,60.7453],[17.08021,60.75291],[17.08004,60.75778],[17.07965,60.76018],[17.07783,60.7642],[17.07329,60.76982],[17.07215,60.7723],[17.07158,60.77497],[17.07157,60.77657],[17.07206,60.779],[17.07321,60.78158],[17.07477,60.78385],[17.081,60.78986],[17.08246,60.79243],[17.083,60.79455],[17.08304,60.79691],[17.08198,60.80372],[17.08198,60.80684],[17.08262,60.81117],[17.08435,60.81754],[17.08475,60.82143],[17.08429,60.8254],[17.08277,60.83001],[17.07801,60.83786],[17.0767,60.84071],[17.07539,60.84456],[17.07332,60.84816],[17.06887,60.85303],[17.06511,60.85666],[17.06204,60.86024],[17.05993,60.86333],[17.05685,60.86663],[17.05214,60.87081],[17.04822,60.87606],[17.04586,60.88081],[17.04394,60.88394],[17.03993,60.88799],[17.03468,60.8922],[17.02904,60.89578],[17.02233,60.89887],[17.02002,60.90018],[17.01754,60.90216],[17.01611,60.90391],[17.01532,60.90559],[17.01466,60.90824],[17.01405,60.91564],[17.01352,60.91802],[17.01243,60.9209],[17.01032,60.92468],[17.00987,60.92618],[17.00982,60.92838],[17.01026,60.92999],[17.0127,60.93387],[17.01689,60.93875],[17.02219,60.9435],[17.02955,60.94874],[17.03135,60.95056],[17.03285,60.95292],[17.03439,60.95714],[17.03461,60.95905],[17.03438,60.96005],[17.03307,60.96207],[17.02498,60.97026],[17.01777,60.98021],[17.01624,60.98187],[17.00921,60.98794],[16.99593,60.99638],[16.98469,61.00729],[16.97704,61.01969],[16.97506,61.02909],[16.97441,61.03044],[16.96403,61.0417],[16.95918,61.04895],[16.95827,61.05103],[16.95852,61.05326],[16.9644,61.06459],[16.96479,61.06718],[16.96418,61.07177],[16.965,61.0739],[16.96599,61.07514],[16.97127,61.08011],[16.97204,61.08132],[16.9735,61.0852],[16.97474,61.08682],[16.98663,61.09747],[16.98967,61.09944],[17.00803,61.11005],[17.01136,61.11286],[17.01321,61.11591],[17.01532,61.12686],[17.01642,61.12916],[17.01825,61.13135],[17.02873,61.14048],[17.03099,61.14313],[17.03251,61.14565],[17.03389,61.14962],[17.03409,61.15813],[17.03436,61.15955],[17.03505,61.1611],[17.03692,61.16344],[17.04544,61.1702],[17.04666,61.17171],[17.04751,61.17327],[17.04799,61.17548],[17.0478,61.17746],[17.04646,61.18226],[17.04592,61.18552],[17.04602,61.18741],[17.04844,61.19956],[17.04827,61.20392],[17.04652,61.21028],[17.04506,61.21346],[17.03377,61.22631],[17.03214,61.22932],[17.03182,61.23239],[17.03358,61.24032],[17.03344,61.2479],[17.03509,61.25577],[17.03505,61.2577],[17.03426,61.25962],[17.02694,61.27065],[17.02645,61.27353],[17.0272,61.2776],[17.02725,61.28076],[17.02648,61.28306],[17.02316,61.28881],[17.02252,61.29127],[17.02303,61.29519],[17.0239,61.29684],[17.02551,61.29848],[17.0306,61.30232],[17.03184,61.30381],[17.03507,61.31342],[17.03537,61.3153],[17.03526,61.31663],[17.03461,61.31862],[17.033,61.32087],[17.02043,61.33168],[17.01862,61.33376],[17.01715,61.33632],[17.01662,61.33801],[17.01668,61.33943],[17.01713,61.34069],[17.01918,61.34422],[17.0195,61.34689],[17.01898,61.3486],[17.01595,61.35446],[17.01411,61.36051],[17.0126,61.36357],[17.01068,61.36618],[17.00834,61.36847],[17.00577,61.37042],[16.99998,61.37411],[16.9971,61.37645],[16.99433,61.37989],[16.99285,61.38351],[16.99236,61.38657],[16.99293,61.39263],[16.99197,61.39784],[16.99233,61.39998],[16.994,61.40454],[16.99401,61.4076],[16.99273,61.41079],[16.98832,61.41624],[16.98654,61.41904],[16.98445,61.4241],[16.98406,61.42618],[16.98426,61.42799],[16.98502,61.42993],[16.98931,61.43579],[16.99126,61.43924],[16.99257,61.4432],[16.99297,61.44676],[16.99245,61.45081],[16.99158,61.45302],[16.98936,61.4572],[16.98858,61.46072],[16.98879,61.46421],[16.99026,61.46963],[16.99004,61.47346],[16.98886,61.47702],[16.9856,61.48379],[16.98428,61.48889],[16.98433,61.49408],[16.98629,61.50234],[16.98616,61.50691],[16.98525,61.5103],[16.98381,61.51314],[16.98198,61.51559],[16.97656,61.52135],[16.97439,61.52413],[16.97133,61.52913],[16.97076,61.53064],[16.97068,61.53191],[16.97118,61.53361],[16.97202,61.53486],[16.9733,61.5361],[16.97652,61.53852],[16.9781,61.54026],[16.97902,61.542],[16.97978,61.54465],[16.97977,61.54617],[16.97926,61.54771],[16.97527,61.5532],[16.97445,61.55511],[16.97416,61.55678],[16.97418,61.56011],[16.97589,61.56965],[16.97608,61.57808],[16.97649,61.5796],[16.97817,61.58179],[16.98113,61.58399],[16.98551,61.58659],[16.99341,61.59063],[16.99631,61.59267],[16.99834,61.59516],[16.99959,61.5987],[17.00079,61.60053],[17.00281,61.60228],[17.00779,61.60508],[17.01014,61.60678],[17.01209,61.60892],[17.01315,61.61098],[17.01407,61.61475],[17.01403,61.61812],[17.01342,61.62069],[17.01107,61.627],[17.01084,61.62895],[17.01135,61.63059],[17.0147,61.63605],[17.01559,61.63853],[17.016,61.6418],[17.0153,61.64722],[17.01536,61.64905],[17.01598,61.65116],[17.01841,61.65568],[17.01891,61.6592],[17.01943,61.66077],[17.02169,61.66338],[17.02779,61.66824],[17.03064,61.67095],[17.0365,61.67881],[17.0394,61.68182],[17.04084,61.68293],[17.04299,61.68416],[17.0493,61.68648],[17.05266,61.68818],[17.05528,61.69026],[17.05672,61.69225],[17.0573,61.69506],[17.05655,61.69791],[17.05512,61.7005],[17.04941,61.70846],[17.04864,61.71024],[17.04861,61.71314],[17.04989,61.71572],[17.05128,61.71719],[17.05354,61.71884],[17.0557,61.72],[17.06114,61.7223],[17.06356,61.72408],[17.06463,61.72571],[17.0655,61.73011],[17.067,61.73337],[17.06995,61.73722],[17.07596,61.74259],[17.07728,61.74405],[17.07826,61.74588],[17.07901,61.74887],[17.08041,61.75114],[17.08315,61.75365],[17.08848,61.75691],[17.09092,61.75883],[17.09317,61.76136],[17.09633,61.76651],[17.09779,61.76801],[17.09992,61.76972],[17.10348,61.77187],[17.10864,61.77408],[17.11368,61.7756],[17.12264,61.77755],[17.12489,61.77821],[17.12834,61.77957],[17.13034,61.78059],[17.13273,61.78216],[17.13744,61.78667],[17.13903,61.78766],[17.14133,61.78871],[17.14418,61.78961],[17.1629,61.79404],[17.16653,61.79527],[17.1682,61.79618],[17.16963,61.79728],[17.17346,61.80181],[17.18574,61.80956],[17.18724,61.81075],[17.18846,61.81223],[17.18914,61.81386],[17.19281,61.8281],[17.19229,61.8321],[17.19246,61.83369],[17.2054,61.85631],[17.20609,61.85828],[17.20627,61.86011],[17.20562,61.86314],[17.20022,61.8753],[17.19909,61.88018],[17.18466,61.89737],[17.18449,61.89877],[17.18605,61.90232],[17.18458,61.90562],[17.18518,61.9081],[17.18586,61.9092],[17.18692,61.91021],[17.18979,61.91174],[17.19673,61.91394],[17.2038,61.91492],[17.20658,61.91551],[17.20867,61.91627],[17.21089,61.91764],[17.21225,61.9195],[17.21357,61.92552],[17.21587,61.92909],[17.2172,61.93465],[17.21842,61.93709],[17.22004,61.93932],[17.2257,61.94586],[17.22696,61.94698],[17.22998,61.94874],[17.23583,61.95105],[17.23769,61.95198],[17.23933,61.95322],[17.24031,61.95445],[17.24076,61.95557],[17.24237,61.96391],[17.24088,61.97068],[17.24091,61.97249],[17.24185,61.97732],[17.24012,61.98938],[17.24164,61.99582],[17.24171,61.99724],[17.24085,61.99971],[17.23674,62.00464],[17.23631,62.00652],[17.2369,62.00788],[17.23826,62.00915],[17.23951,62.00987],[17.24379,62.01156],[17.24648,62.01291],[17.24874,62.01456],[17.25025,62.01622],[17.25103,62.0177],[17.25654,62.03213],[17.26253,62.03903],[17.26786,62.04813],[17.26847,62.04989],[17.2684,62.05139],[17.26571,62.06252],[17.26592,62.06459],[17.26659,62.06629],[17.26954,62.0705],[17.27115,62.07223],[17.28201,62.08092],[17.2853,62.08282],[17.29909,62.08898],[17.301,62.0901],[17.30299,62.09161],[17.3056,62.09454],[17.31763,62.10986],[17.31931,62.11134],[17.32574,62.11601],[17.3278,62.11808],[17.33134,62.12326],[17.33614,62.12938],[17.33951,62.13824],[17.34779,62.15228],[17.35011,62.15552],[17.35429,62.15953],[17.35543,62.16116],[17.35574,62.16253],[17.35555,62.16818],[17.35672,62.17358],[17.35705,62.17662],[17.35697,62.17932],[17.35629,62.18374],[17.35687,62.18573],[17.35781,62.18699],[17.35913,62.18815],[17.36631,62.19258],[17.36787,62.19373],[17.36947,62.19546],[17.3704,62.19715],[17.37348,62.2076],[17.37382,62.2098],[17.37348,62.21357],[17.37186,62.22195],[17.37192,62.22629],[17.37262,62.22895],[17.3745,62.23327],[17.37501,62.23565],[17.37482,62.2381],[17.37238,62.24836],[17.37094,62.25358],[17.36996,62.25526],[17.36758,62.25786],[17.36509,62.25978],[17.36148,62.26182],[17.35109,62.26635],[17.34901,62.26744],[17.34702,62.26887],[17.34564,62.27072],[17.34493,62.27562],[17.3436,62.27889],[17.34351,62.28072],[17.34428,62.28247],[17.34771,62.28613],[17.34928,62.28855],[17.3501,62.29081],[17.35017,62.29349],[17.34966,62.29538],[17.34882,62.29705],[17.34335,62.30364],[17.34238,62.30548],[17.34214,62.30703],[17.34258,62.3102],[17.34243,62.31206],[17.34187,62.31367],[17.33977,62.317],[17.33938,62.31882],[17.33962,62.32007],[17.34025,62.32122],[17.34442,62.32552],[17.34575,62.32755],[17.34597,62.32936],[17.34531,62.33176],[17.34527,62.33305],[17.34561,62.33425],[17.34637,62.33551],[17.34801,62.33711],[17.35362,62.3409],[17.35649,62.34311],[17.35971,62.3464],[17.36286,62.35064],[17.36483,62.35479],[17.36695,62.36102],[17.36748,62.36391],[17.36712,62.3661],[17.36483,62.37018],[17.3634,62.37416],[17.36153,62.37692],[17.35842,62.37943],[17.35616,62.38065],[17.35437,62.38134],[17.35382,62.38176],[17.35297,62.38187],[17.35239,62.3815],[17.35181,62.38144],[17.34956,62.38229],[17.3438,62.38271],[17.33994,62.38314],[17.33175,62.38489],[17.32828,62.38542],[17.32522,62.38561],[17.32197,62.3861],[17.31837,62.38701],[17.318,62.38724],[17.31713,62.38733],[17.31428,62.38805],[17.30716,62.38883],[17.30795,62.3903],[17.31004,62.39007]],"E4 Helsingborg→Jönköping":[[12.69996,56.05015],[12.70043,56.05019],[12.70041,56.05029],[12.69951,56.05134],[12.6999,56.05155],[12.70084,56.05296],[12.70234,56.05449],[12.70241,56.05518],[12.7027,56.05536],[12.70099,56.05641],[12.70226,56.05709],[12.7089,56.06184],[12.71052,56.06257],[12.71533,56.06414],[12.71837,56.06573],[12.73439,56.07673],[12.73832,56.07977],[12.74367,56.08475],[12.74499,56.08556],[12.74655,56.08622],[12.74914,56.08691],[12.75184,56.08719],[12.7547,56.08709],[12.76014,56.08644],[12.76529,56.08634],[12.78391,56.08718],[12.79409,56.08785],[12.79833,56.08831],[12.80357,56.08926],[12.80819,56.09049],[12.81252,56.09206],[12.81964,56.09517],[12.82469,56.09667],[12.83048,56.09767],[12.83743,56.09823],[12.84071,56.09865],[12.84518,56.09956],[12.84877,56.10063],[12.85359,56.10267],[12.86386,56.10877],[12.86686,56.11017],[12.88785,56.11663],[12.89201,56.11811],[12.90667,56.1239],[12.91051,56.12616],[12.9383,56.14731],[12.94371,56.15087],[12.94939,56.1541],[12.95871,56.15851],[13.00538,56.178],[13.00982,56.17942],[13.01383,56.18028],[13.01789,56.18082],[13.02697,56.1815],[13.02966,56.18195],[13.03256,56.18267],[13.03553,56.1837],[13.04158,56.18637],[13.04518,56.18777],[13.06037,56.19278],[13.07836,56.19992],[13.08456,56.20209],[13.09416,56.20489],[13.1007,56.20644],[13.11438,56.20926],[13.11996,56.21098],[13.12372,56.21264],[13.13083,56.21656],[13.13597,56.21998],[13.14177,56.22432],[13.1444,56.22595],[13.14799,56.22781],[13.15362,56.2303],[13.15821,56.23188],[13.16262,56.23306],[13.17116,56.23481],[13.17564,56.23613],[13.18136,56.23863],[13.18816,56.2413],[13.19327,56.24376],[13.1974,56.24607],[13.20389,56.25007],[13.212,56.25569],[13.21458,56.25689],[13.21675,56.25761],[13.22072,56.25846],[13.22546,56.25882],[13.2694,56.25882],[13.2765,56.25906],[13.28194,56.25945],[13.28998,56.26034],[13.30059,56.26214],[13.31064,56.26457],[13.31832,56.26697],[13.324,56.26952],[13.32763,56.27185],[13.33014,56.27397],[13.33596,56.27994],[13.3383,56.28193],[13.34273,56.28499],[13.34709,56.28737],[13.35253,56.28972],[13.3583,56.29165],[13.36532,56.29335],[13.37359,56.29475],[13.37854,56.29578],[13.38375,56.29738],[13.38616,56.29834],[13.39057,56.30062],[13.398,56.30576],[13.42243,56.32009],[13.42748,56.32225],[13.43821,56.32541],[13.44073,56.32635],[13.44482,56.32828],[13.44833,56.33027],[13.45107,56.33212],[13.45534,56.33571],[13.46017,56.34108],[13.46859,56.3523],[13.47176,56.35571],[13.47437,56.35807],[13.47789,56.36061],[13.48051,56.36207],[13.48312,56.36323],[13.49212,56.36657],[13.49649,56.36883],[13.49856,56.37017],[13.50081,56.37194],[13.50261,56.37392],[13.50375,56.37588],[13.50499,56.37948],[13.50599,56.38157],[13.50799,56.38422],[13.51025,56.3863],[13.51456,56.38906],[13.52451,56.39339],[13.52833,56.39538],[13.53153,56.39736],[13.53541,56.40033],[13.53874,56.40361],[13.54564,56.41166],[13.54797,56.41484],[13.55017,56.41838],[13.55208,56.42076],[13.55418,56.42281],[13.55668,56.4248],[13.56192,56.42796],[13.5714,56.43211],[13.575,56.43387],[13.58732,56.44118],[13.593,56.44414],[13.60123,56.44761],[13.61608,56.45262],[13.61945,56.45425],[13.62291,56.45665],[13.62471,56.45845],[13.62983,56.46455],[13.63185,56.46655],[13.6355,56.4695],[13.64331,56.47506],[13.64464,56.47634],[13.64642,56.4786],[13.64785,56.48158],[13.64902,56.48672],[13.6516,56.4918],[13.65245,56.49443],[13.65258,56.49701],[13.65217,56.50167],[13.65264,56.50438],[13.65392,56.50712],[13.6558,56.50954],[13.65821,56.51172],[13.66097,56.51358],[13.66412,56.51519],[13.67199,56.51835],[13.67442,56.5195],[13.6767,56.52073],[13.6806,56.52333],[13.68872,56.53075],[13.70079,56.53914],[13.70602,56.54324],[13.71129,56.5481],[13.71571,56.55312],[13.71996,56.559],[13.72143,56.56248],[13.72183,56.56477],[13.72179,56.56771],[13.72026,56.57364],[13.72002,56.57637],[13.72019,56.57779],[13.72102,56.58032],[13.72181,56.58177],[13.72371,56.58418],[13.73576,56.59455],[13.74654,56.60713],[13.75043,56.61061],[13.75466,56.61311],[13.75988,56.6152],[13.76326,56.61614],[13.77589,56.61887],[13.77791,56.61953],[13.78071,56.62081],[13.78305,56.62233],[13.78417,56.62334],[13.78675,56.62692],[13.78828,56.62866],[13.79619,56.63566],[13.79845,56.63806],[13.80304,56.64446],[13.80354,56.64574],[13.8048,56.65146],[13.80544,56.65286],[13.80651,56.65434],[13.81597,56.66364],[13.82773,56.67574],[13.83145,56.67979],[13.83312,56.68232],[13.83426,56.68588],[13.83488,56.69895],[13.83578,56.70156],[13.83825,56.70547],[13.83926,56.7078],[13.83967,56.70983],[13.8403,56.71665],[13.84096,56.71929],[13.84241,56.72199],[13.84743,56.72752],[13.84882,56.72954],[13.85322,56.73933],[13.85433,56.74124],[13.85699,56.74422],[13.86062,56.74703],[13.86498,56.74962],[13.87167,56.75295],[13.87467,56.75484],[13.87747,56.75726],[13.87977,56.76029],[13.88079,56.76256],[13.88118,56.76425],[13.88198,56.77713],[13.88257,56.78003],[13.88391,56.78435],[13.88566,56.78813],[13.88861,56.79283],[13.8919,56.79714],[13.89857,56.80437],[13.90165,56.80944],[13.90311,56.81367],[13.90535,56.82656],[13.90593,56.8283],[13.90703,56.83044],[13.9102,56.83441],[13.91221,56.8363],[13.91486,56.8383],[13.91831,56.84034],[13.93069,56.84638],[13.93557,56.84952],[13.93834,56.85201],[13.94362,56.85792],[13.94824,56.86221],[13.95063,56.86504],[13.95244,56.86854],[13.95354,56.87262],[13.95405,56.87698],[13.95404,56.88407],[13.95514,56.88801],[13.95667,56.89098],[13.95846,56.89358],[13.96634,56.90209],[13.96931,56.90621],[13.97142,56.91075],[13.97348,56.9191],[13.97514,56.92282],[13.97765,56.9261],[13.98121,56.92943],[13.99254,56.93704],[13.99604,56.94015],[13.99785,56.94254],[13.99929,56.94516],[14.00005,56.9475],[14.00164,56.9544],[14.0025,56.95666],[14.00388,56.95915],[14.00548,56.96108],[14.0073,56.96274],[14.01502,56.96835],[14.0163,56.96959],[14.01753,56.97121],[14.01821,56.97247],[14.01876,56.97429],[14.01859,56.98218],[14.0195,56.98513],[14.02508,56.99301],[14.02747,56.99547],[14.03318,57.00053],[14.03506,57.00264],[14.03652,57.00468],[14.03828,57.00832],[14.03969,57.01494],[14.04087,57.01809],[14.04974,57.03274],[14.05139,57.03602],[14.05386,57.04227],[14.05607,57.04683],[14.06188,57.05521],[14.06376,57.05914],[14.06451,57.06204],[14.06472,57.06503],[14.06442,57.06745],[14.06307,57.07291],[14.06265,57.07828],[14.063,57.08103],[14.0655,57.08941],[14.06585,57.09209],[14.06588,57.0952],[14.06556,57.0981],[14.06491,57.10091],[14.06103,57.11065],[14.05998,57.11461],[14.0595,57.11946],[14.05983,57.12397],[14.06216,57.13502],[14.0632,57.13864],[14.06458,57.14159],[14.06996,57.15012],[14.07093,57.1523],[14.07121,57.15372],[14.07144,57.16243],[14.07222,57.16633],[14.07373,57.16982],[14.07922,57.17893],[14.08041,57.18176],[14.08112,57.18431],[14.08159,57.18769],[14.08179,57.20139],[14.08259,57.2066],[14.08416,57.21298],[14.08422,57.21516],[14.08355,57.21763],[14.07819,57.22947],[14.07748,57.2322],[14.07727,57.23499],[14.07789,57.2388],[14.08153,57.24916],[14.08289,57.25496],[14.08326,57.25994],[14.08251,57.27429],[14.08282,57.27987],[14.08357,57.28369],[14.08493,57.28796],[14.09127,57.30133],[14.10018,57.32269],[14.10072,57.32519],[14.10279,57.34231],[14.10342,57.34527],[14.10548,57.3522],[14.10606,57.35616],[14.10598,57.35945],[14.10557,57.3615],[14.10107,57.37607],[14.10006,57.38478],[14.09991,57.39538],[14.10028,57.40078],[14.10169,57.41184],[14.10146,57.41756],[14.10207,57.41973],[14.10391,57.42329],[14.1044,57.42583],[14.10419,57.42919],[14.10372,57.43171],[14.09985,57.44381],[14.09831,57.45235],[14.09798,57.45834],[14.09809,57.46356],[14.09921,57.47257],[14.1004,57.4773],[14.10523,57.4917],[14.10917,57.50913],[14.11033,57.5125],[14.11246,57.51715],[14.11567,57.52248],[14.12145,57.53048],[14.12298,57.53333],[14.12627,57.54062],[14.13006,57.54667],[14.13388,57.55132],[14.14182,57.55904],[14.14404,57.56163],[14.14562,57.5639],[14.14736,57.56713],[14.14826,57.56954],[14.14892,57.57233],[14.14953,57.57796],[14.15008,57.58047],[14.15122,57.58358],[14.1526,57.58641],[14.15454,57.58956],[14.1575,57.59336],[14.16001,57.59603],[14.16734,57.60305],[14.172,57.60855],[14.17725,57.61653],[14.18349,57.62518],[14.1851,57.62783],[14.18735,57.63276],[14.1888,57.63858],[14.18907,57.64206],[14.18893,57.64528],[14.18841,57.64805],[14.18748,57.65035],[14.18167,57.65881],[14.1772,57.66632],[14.17453,57.67029],[14.16302,57.6845],[14.16128,57.687],[14.15893,57.69149],[14.15775,57.6948],[14.15726,57.69696],[14.15686,57.70139],[14.15723,57.70557],[14.15836,57.70986],[14.1609,57.71664],[14.1612,57.71938],[14.1607,57.7222],[14.15841,57.72705],[14.15784,57.72978],[14.15914,57.74567],[14.15856,57.75006],[14.15707,57.75522],[14.15697,57.7595],[14.15722,57.75994],[14.15523,57.76153],[14.15323,57.76261],[14.1534,57.76304],[14.15314,57.76361],[14.15356,57.76545],[14.15341,57.76693],[14.15415,57.76894],[14.15547,57.77091],[14.15621,57.77139],[14.15618,57.77218],[14.15976,57.77747],[14.16049,57.77792],[14.16032,57.77808],[14.15643,57.77877],[14.15745,57.78026],[14.15979,57.77981],[14.15992,57.78002]],"E4 Jönköping→Linköping":[[14.15992,57.78002],[14.16032,57.78064],[14.1631,57.78011],[14.16264,57.77932],[14.16585,57.77857],[14.16648,57.77867],[14.17264,57.77839],[14.17379,57.77814],[14.17411,57.77833],[14.17375,57.77875],[14.17367,57.77936],[14.17387,57.77964],[14.17461,57.77978],[14.18641,57.7793],[14.18689,57.77916],[14.19285,57.77911],[14.19456,57.77866],[14.19734,57.77715],[14.19889,57.77666],[14.20577,57.77561],[14.20622,57.77535],[14.20692,57.77539],[14.20796,57.77487],[14.20935,57.77483],[14.21071,57.77512],[14.21386,57.77637],[14.22582,57.77966],[14.22757,57.78026],[14.23038,57.78185],[14.23459,57.78539],[14.23615,57.78624],[14.23851,57.78706],[14.24077,57.78749],[14.24347,57.78769],[14.25383,57.78731],[14.25669,57.78744],[14.25836,57.78772],[14.26034,57.78829],[14.26209,57.7891],[14.26307,57.78978],[14.2646,57.79141],[14.27068,57.79962],[14.27172,57.80198],[14.27213,57.80441],[14.27154,57.80942],[14.2718,57.81799],[14.26993,57.82495],[14.27032,57.83041],[14.26858,57.83965],[14.26793,57.84526],[14.26645,57.85072],[14.26646,57.8521],[14.26753,57.85758],[14.26817,57.8633],[14.26867,57.86435],[14.27092,57.86751],[14.27193,57.86971],[14.27468,57.87336],[14.27734,57.87849],[14.27848,57.8801],[14.28229,57.88433],[14.28467,57.88763],[14.28949,57.89196],[14.29115,57.8938],[14.29313,57.89724],[14.2968,57.9016],[14.29953,57.90427],[14.30247,57.9089],[14.30534,57.91169],[14.30889,57.9143],[14.31034,57.91576],[14.31226,57.91979],[14.31366,57.92166],[14.31641,57.92397],[14.32587,57.92968],[14.32994,57.93279],[14.33242,57.9356],[14.33325,57.93745],[14.33401,57.94009],[14.33523,57.94188],[14.33681,57.94334],[14.34135,57.94633],[14.34266,57.94748],[14.34472,57.94996],[14.34779,57.95296],[14.35042,57.95671],[14.35298,57.95935],[14.35595,57.96168],[14.36034,57.9644],[14.36615,57.96737],[14.37184,57.96978],[14.39055,57.97639],[14.39238,57.97735],[14.39689,57.98032],[14.40448,57.98353],[14.40769,57.9851],[14.41378,57.98845],[14.41711,57.98986],[14.41933,57.99047],[14.4227,57.99104],[14.43556,57.99221],[14.43757,57.99265],[14.43981,57.99342],[14.44157,57.99429],[14.44593,57.99718],[14.4495,57.99925],[14.4585,58.00374],[14.4606,58.00503],[14.46297,58.00688],[14.46798,58.01223],[14.47516,58.01789],[14.47909,58.02215],[14.48115,58.02385],[14.48572,58.0269],[14.4883,58.02916],[14.49708,58.03926],[14.50762,58.05386],[14.50968,58.05617],[14.51181,58.05798],[14.5153,58.06028],[14.52391,58.06469],[14.52647,58.06641],[14.52948,58.06897],[14.53693,58.07806],[14.54513,58.08676],[14.54984,58.09237],[14.55439,58.09911],[14.55821,58.10668],[14.56384,58.12368],[14.56975,58.13691],[14.57169,58.14428],[14.5725,58.14639],[14.57467,58.14996],[14.57902,58.15493],[14.58064,58.15735],[14.58138,58.15919],[14.58376,58.16744],[14.58517,58.17006],[14.58662,58.17195],[14.58852,58.17389],[14.59084,58.17577],[14.59887,58.18083],[14.60244,58.18366],[14.6059,58.18747],[14.61034,58.19398],[14.613,58.19674],[14.61564,58.19885],[14.62104,58.20205],[14.62537,58.20407],[14.63074,58.20601],[14.63841,58.2083],[14.64228,58.21015],[14.64522,58.21248],[14.64831,58.21715],[14.64987,58.2189],[14.65184,58.2206],[14.65527,58.22281],[14.66226,58.22618],[14.66603,58.22756],[14.66891,58.22837],[14.67204,58.22905],[14.67636,58.22968],[14.6927,58.23145],[14.70005,58.23273],[14.70543,58.23412],[14.71457,58.23723],[14.71945,58.2384],[14.75182,58.24397],[14.77785,58.24745],[14.79875,58.25106],[14.81205,58.25274],[14.81659,58.25362],[14.82073,58.25467],[14.82701,58.25675],[14.83501,58.26024],[14.83929,58.26185],[14.84289,58.2629],[14.85153,58.26487],[14.85423,58.26576],[14.85706,58.267],[14.85962,58.26849],[14.86204,58.27049],[14.86368,58.27254],[14.86741,58.27855],[14.87005,58.28126],[14.87278,58.28329],[14.877,58.28561],[14.88079,58.28716],[14.88761,58.28932],[14.89232,58.29051],[14.90102,58.29212],[14.91603,58.29375],[14.92189,58.29465],[14.92926,58.29636],[14.93937,58.2994],[14.94618,58.30085],[14.95003,58.30138],[14.96205,58.30261],[14.9786,58.30496],[14.98349,58.30537],[14.99269,58.30566],[14.99762,58.30611],[15.0021,58.3069],[15.01973,58.31059],[15.02991,58.31223],[15.04074,58.31458],[15.05262,58.31793],[15.05955,58.31961],[15.06814,58.32124],[15.08204,58.32321],[15.08695,58.3243],[15.09191,58.32579],[15.09932,58.32876],[15.10317,58.33013],[15.10834,58.33157],[15.11954,58.33405],[15.12393,58.33548],[15.129,58.3375],[15.13239,58.33839],[15.1378,58.33902],[15.1511,58.3394],[15.15541,58.33971],[15.16229,58.3406],[15.17043,58.34196],[15.17601,58.34316],[15.18017,58.34429],[15.19349,58.34885],[15.2016,58.3513],[15.21007,58.35349],[15.2171,58.35505],[15.23022,58.35736],[15.23784,58.35838],[15.25159,58.35995],[15.26264,58.36163],[15.27125,58.36333],[15.27858,58.36506],[15.28643,58.36722],[15.29919,58.37106],[15.30889,58.37337],[15.31453,58.37437],[15.32933,58.37646],[15.33665,58.37769],[15.36029,58.38274],[15.36737,58.38406],[15.37586,58.38533],[15.39706,58.38779],[15.40372,58.3889],[15.40876,58.39002],[15.41599,58.39209],[15.42122,58.39398],[15.43773,58.40137],[15.44402,58.40386],[15.45895,58.40926],[15.46722,58.41248],[15.47633,58.41634],[15.4886,58.4219],[15.49677,58.42519],[15.5093,58.42951],[15.52258,58.43325],[15.52518,58.43358],[15.52771,58.43342],[15.52938,58.43303],[15.53262,58.4315],[15.53362,58.43041],[15.54011,58.4207],[15.54955,58.40939],[15.55113,58.40796],[15.55273,58.4069],[15.55553,58.40556],[15.55762,58.40491],[15.56074,58.40439],[15.56365,58.40429],[15.58024,58.40593],[15.58183,58.40558],[15.58282,58.40553],[15.58378,58.40573],[15.58521,58.40658],[15.59228,58.40728],[15.59856,58.40753],[15.60292,58.40798],[15.60958,58.40891],[15.61478,58.40878],[15.61496,58.40899],[15.61766,58.41013],[15.61966,58.41039],[15.61986,58.40998]],"E4 Linköping→Södertälje":[[15.61986,58.40998],[15.61966,58.41039],[15.61775,58.41015],[15.61472,58.40883],[15.61159,58.40894],[15.61157,58.40911],[15.61013,58.40999],[15.61181,58.41137],[15.61437,58.41449],[15.61492,58.41614],[15.61472,58.41641],[15.61536,58.41921],[15.61596,58.41954],[15.61593,58.41992],[15.61638,58.42044],[15.6175,58.42139],[15.61825,58.42175],[15.62162,58.42212],[15.62738,58.42239],[15.63616,58.42325],[15.63705,58.42295],[15.6391,58.42316],[15.64411,58.42295],[15.64608,58.42269],[15.64949,58.42191],[15.64983,58.42143],[15.65186,58.4209],[15.65354,58.41998],[15.65521,58.41882],[15.6551,58.41819],[15.65586,58.41805],[15.65755,58.41901],[15.66439,58.42148],[15.6658,58.42224],[15.66739,58.42347],[15.66861,58.42391],[15.66871,58.42424],[15.66818,58.42502],[15.66976,58.43037],[15.67089,58.4316],[15.67295,58.43257],[15.6759,58.43312],[15.68122,58.43371],[15.68752,58.43465],[15.69422,58.43591],[15.70004,58.43725],[15.70856,58.43971],[15.72373,58.44504],[15.73278,58.44746],[15.74177,58.4492],[15.75501,58.45105],[15.76222,58.45227],[15.76691,58.45324],[15.77397,58.45497],[15.78046,58.45687],[15.78698,58.45913],[15.80243,58.46564],[15.81001,58.46848],[15.81843,58.47118],[15.82898,58.47399],[15.84201,58.47671],[15.8479,58.47772],[15.85636,58.47893],[15.86502,58.47989],[15.8819,58.48125],[15.88888,58.48204],[15.89578,58.48312],[15.90689,58.48526],[15.91307,58.48616],[15.92099,58.48694],[15.93939,58.48836],[15.95153,58.48977],[15.9576,58.4908],[15.96288,58.49199],[15.96882,58.4937],[15.97414,58.49567],[15.97793,58.49742],[15.98085,58.49904],[15.98464,58.50158],[15.98739,58.50381],[15.99018,58.50674],[15.99395,58.51288],[15.99516,58.51441],[15.99953,58.51836],[16.00359,58.52148],[16.00587,58.52273],[16.00971,58.52433],[16.01943,58.52897],[16.0234,58.53027],[16.02989,58.53152],[16.03203,58.53209],[16.03476,58.53319],[16.03728,58.53479],[16.03853,58.53594],[16.04009,58.53794],[16.04526,58.54536],[16.04698,58.54684],[16.053,58.55108],[16.05585,58.55334],[16.05842,58.55602],[16.06186,58.56037],[16.06386,58.56212],[16.06607,58.56363],[16.07291,58.5672],[16.08076,58.57042],[16.08629,58.57227],[16.10084,58.57644],[16.11651,58.58175],[16.1218,58.58378],[16.12426,58.58497],[16.12562,58.58584],[16.12677,58.58683],[16.12789,58.58822],[16.12893,58.59096],[16.12878,58.59318],[16.12689,58.59745],[16.12648,58.59926],[16.12661,58.60141],[16.12773,58.60397],[16.13018,58.60683],[16.13413,58.61015],[16.13804,58.61263],[16.14616,58.61706],[16.14879,58.61914],[16.15068,58.62185],[16.15115,58.62339],[16.15161,58.62681],[16.1525,58.62864],[16.15431,58.63051],[16.15863,58.63348],[16.16048,58.63506],[16.16455,58.64106],[16.16693,58.6439],[16.1694,58.64597],[16.17233,58.64769],[16.17505,58.64886],[16.18359,58.65182],[16.18673,58.65325],[16.18943,58.65474],[16.19323,58.65722],[16.20184,58.66348],[16.20821,58.6674],[16.21225,58.6694],[16.21502,58.67046],[16.21831,58.6713],[16.22109,58.6717],[16.22396,58.67187],[16.22726,58.67175],[16.2353,58.67078],[16.23876,58.67049],[16.24251,58.67058],[16.24498,58.67088],[16.24732,58.67134],[16.25106,58.67245],[16.26116,58.67609],[16.26399,58.67678],[16.26793,58.67739],[16.27263,58.67768],[16.28267,58.67753],[16.29232,58.67812],[16.29991,58.67804],[16.30425,58.67819],[16.31026,58.67888],[16.31381,58.67958],[16.31761,58.6806],[16.32162,58.68205],[16.32634,58.68411],[16.33015,58.68604],[16.3324,58.68754],[16.33395,58.68904],[16.33501,58.69047],[16.33741,58.69699],[16.33848,58.69901],[16.34076,58.7016],[16.34306,58.70316],[16.34591,58.70446],[16.35483,58.70705],[16.3602,58.70917],[16.3639,58.71122],[16.37386,58.71763],[16.37619,58.7188],[16.37874,58.71972],[16.39373,58.72388],[16.39966,58.72583],[16.40362,58.72748],[16.40653,58.7289],[16.41178,58.73194],[16.41604,58.73407],[16.42018,58.73582],[16.42408,58.73707],[16.42784,58.73793],[16.43062,58.73837],[16.44474,58.73971],[16.45634,58.74131],[16.46154,58.74188],[16.47123,58.74253],[16.4827,58.74269],[16.48773,58.74289],[16.49265,58.74327],[16.49782,58.74388],[16.5061,58.74524],[16.51412,58.74684],[16.5332,58.75161],[16.53818,58.75231],[16.54631,58.75297],[16.55373,58.75427],[16.55736,58.75473],[16.56207,58.75502],[16.56756,58.75511],[16.57289,58.75498],[16.58359,58.75439],[16.59201,58.75434],[16.60104,58.75475],[16.61334,58.756],[16.62081,58.75632],[16.62873,58.75595],[16.64029,58.75475],[16.6467,58.75458],[16.6521,58.755],[16.65829,58.75607],[16.66172,58.7565],[16.6737,58.75745],[16.68268,58.75865],[16.68695,58.75892],[16.69137,58.75881],[16.69799,58.75823],[16.70076,58.75818],[16.70686,58.75839],[16.71196,58.75812],[16.71545,58.75762],[16.72499,58.75576],[16.73896,58.7538],[16.74537,58.75258],[16.7483,58.75221],[16.75252,58.75199],[16.7566,58.75212],[16.76161,58.75276],[16.77309,58.7556],[16.78141,58.75708],[16.78702,58.75775],[16.79356,58.75822],[16.79903,58.75837],[16.80469,58.75826],[16.81008,58.75794],[16.81974,58.75703],[16.82375,58.75687],[16.82878,58.75694],[16.83983,58.75766],[16.84907,58.75744],[16.85871,58.7566],[16.86205,58.75616],[16.86475,58.75562],[16.86883,58.75443],[16.87472,58.75205],[16.87706,58.75137],[16.88012,58.75079],[16.88381,58.75042],[16.88712,58.75038],[16.89087,58.75068],[16.8957,58.75143],[16.89816,58.75164],[16.9032,58.75159],[16.91003,58.75071],[16.91699,58.74953],[16.92327,58.74823],[16.93169,58.74605],[16.93473,58.74544],[16.93886,58.74512],[16.94276,58.74527],[16.94957,58.746],[16.9673,58.74841],[16.97195,58.74952],[16.9759,58.75096],[16.97916,58.75263],[16.98211,58.75479],[16.99323,58.76617],[16.99513,58.76741],[16.99784,58.76852],[17.00189,58.76936],[17.02022,58.77088],[17.02298,58.77132],[17.02795,58.77246],[17.03985,58.77596],[17.06065,58.78336],[17.06454,58.78448],[17.06974,58.78569],[17.07258,58.78658],[17.07562,58.78787],[17.08058,58.79043],[17.08981,58.79459],[17.09157,58.79531],[17.09683,58.79693],[17.09854,58.79766],[17.10239,58.80014],[17.10481,58.80139],[17.10639,58.80199],[17.11576,58.80471],[17.11905,58.80592],[17.122,58.80762],[17.12381,58.80931],[17.12599,58.8119],[17.12745,58.81311],[17.12884,58.81395],[17.13117,58.81499],[17.14181,58.81824],[17.14585,58.81986],[17.14746,58.82071],[17.15473,58.82537],[17.16346,58.82934],[17.16562,58.83079],[17.16884,58.83334],[17.17419,58.83621],[17.17885,58.83912],[17.18812,58.8432],[17.19145,58.84496],[17.19684,58.84833],[17.20174,58.8505],[17.20375,58.85161],[17.20552,58.853],[17.20854,58.8563],[17.21035,58.85789],[17.21305,58.85952],[17.21968,58.86292],[17.2223,58.86481],[17.22473,58.86753],[17.22789,58.87278],[17.23016,58.87467],[17.23241,58.87581],[17.23744,58.87751],[17.24031,58.87869],[17.24674,58.88233],[17.24974,58.88376],[17.25763,58.8866],[17.2606,58.88818],[17.26466,58.89096],[17.26707,58.89222],[17.2708,58.89362],[17.27593,58.89489],[17.28048,58.89569],[17.29234,58.89714],[17.29634,58.89798],[17.30545,58.90085],[17.31021,58.90288],[17.31313,58.90394],[17.32564,58.90725],[17.33124,58.9084],[17.34114,58.90935],[17.34754,58.91048],[17.35286,58.91203],[17.36045,58.91486],[17.3664,58.91675],[17.371,58.91801],[17.3776,58.91946],[17.38231,58.92078],[17.38696,58.92244],[17.391,58.92426],[17.39745,58.92804],[17.40137,58.92984],[17.40756,58.93179],[17.41982,58.93459],[17.42321,58.93577],[17.42583,58.93702],[17.42905,58.93915],[17.43155,58.94182],[17.43503,58.94895],[17.4369,58.95152],[17.4396,58.95372],[17.44157,58.95486],[17.44379,58.95586],[17.44618,58.9567],[17.44936,58.95752],[17.45547,58.95853],[17.46465,58.95963],[17.48525,58.96159],[17.49121,58.96249],[17.49549,58.96343],[17.49934,58.96453],[17.50193,58.96547],[17.51225,58.97019],[17.52102,58.97306],[17.52484,58.97475],[17.52716,58.97621],[17.52918,58.97797],[17.53017,58.97915],[17.53108,58.98077],[17.53267,58.98697],[17.53593,58.99314],[17.53706,58.9988],[17.54066,59.00408],[17.54226,59.0087],[17.54378,59.01086],[17.54987,59.01677],[17.55329,59.02083],[17.55444,59.02294],[17.55564,59.02688],[17.55642,59.02862],[17.55784,59.03095],[17.56158,59.03598],[17.56319,59.03867],[17.56437,59.04131],[17.56589,59.04666],[17.5671,59.04888],[17.57002,59.05214],[17.57899,59.05916],[17.58082,59.06134],[17.58325,59.065],[17.58443,59.06638],[17.59047,59.07114],[17.59211,59.07306],[17.59295,59.07465],[17.59519,59.08098],[17.59764,59.086],[17.60124,59.09168],[17.60657,59.09869],[17.60911,59.10333],[17.60991,59.10592],[17.61002,59.11058],[17.61053,59.11197],[17.6112,59.11297],[17.61353,59.11507],[17.61598,59.11639],[17.61824,59.11724],[17.62518,59.11936],[17.62849,59.12096],[17.63042,59.12245],[17.63272,59.12487],[17.63413,59.12604],[17.63966,59.12899],[17.64236,59.13083],[17.64474,59.13316],[17.64609,59.1353],[17.64777,59.13965],[17.64991,59.14377],[17.65018,59.14573],[17.64992,59.14688],[17.64912,59.14845],[17.64602,59.1517],[17.64524,59.1529],[17.64488,59.15389],[17.64481,59.15535],[17.64556,59.15735],[17.6481,59.16029],[17.64915,59.16194],[17.64965,59.16332],[17.64988,59.16533],[17.64912,59.16825],[17.64741,59.17187],[17.64539,59.175],[17.64304,59.17755],[17.64231,59.17866],[17.6419,59.18011],[17.64227,59.18269],[17.64359,59.18617],[17.64473,59.18747],[17.64659,59.18848],[17.65342,59.19056],[17.65638,59.19193],[17.65841,59.19347],[17.6611,59.19715],[17.66304,59.19853],[17.66324,59.19885],[17.65925,59.19916],[17.65863,59.19945],[17.65788,59.19953],[17.65741,59.19985],[17.65683,59.20122],[17.6561,59.2018],[17.65096,59.20334],[17.64895,59.20365],[17.6466,59.20343],[17.64234,59.2021],[17.63284,59.20102],[17.63375,59.20016],[17.63107,59.1991],[17.63019,59.20004]],"E4 Sundsvall→Umeå":[[17.31004,62.39007],[17.31245,62.38979],[17.31298,62.39124],[17.31413,62.39157],[17.31325,62.39215],[17.31298,62.39271],[17.31308,62.39435],[17.31355,62.39474],[17.31535,62.39497],[17.32313,62.39515],[17.32676,62.39514],[17.32805,62.39496],[17.33226,62.3954],[17.33589,62.39651],[17.33668,62.39652],[17.33735,62.39634],[17.3382,62.39654],[17.33833,62.3968],[17.33779,62.39733],[17.33712,62.4005],[17.33723,62.40662],[17.33771,62.40828],[17.33926,62.41063],[17.34871,62.42183],[17.34947,62.42339],[17.34965,62.42448],[17.3493,62.4263],[17.34824,62.42797],[17.33844,62.4371],[17.3373,62.43864],[17.33674,62.44043],[17.33682,62.44171],[17.3376,62.4435],[17.34535,62.45333],[17.34569,62.45528],[17.34498,62.45685],[17.3438,62.45804],[17.34043,62.46058],[17.33771,62.46318],[17.33509,62.46474],[17.33154,62.46587],[17.32482,62.46705],[17.32082,62.46807],[17.3179,62.46911],[17.3149,62.47056],[17.3132,62.47184],[17.31194,62.47354],[17.3116,62.47525],[17.31194,62.47663],[17.31417,62.47965],[17.31647,62.48163],[17.32117,62.485],[17.32251,62.48644],[17.32442,62.48926],[17.3266,62.49114],[17.3411,62.49891],[17.35519,62.50555],[17.36306,62.50992],[17.36596,62.51124],[17.37004,62.51263],[17.3804,62.51517],[17.38336,62.51577],[17.38731,62.51621],[17.39776,62.51647],[17.41099,62.51722],[17.43426,62.51819],[17.44058,62.51788],[17.45134,62.51658],[17.45439,62.51656],[17.45807,62.51692],[17.46104,62.51754],[17.46325,62.51823],[17.46742,62.51985],[17.47123,62.52218],[17.47657,62.52659],[17.47977,62.52806],[17.48244,62.52874],[17.5063,62.53325],[17.51104,62.53392],[17.51545,62.53427],[17.53615,62.5346],[17.54041,62.53491],[17.57906,62.54409],[17.60203,62.54724],[17.60487,62.54781],[17.61377,62.55006],[17.63487,62.55331],[17.63768,62.55406],[17.64547,62.55703],[17.64772,62.55763],[17.65056,62.55811],[17.65304,62.5583],[17.65554,62.55831],[17.66487,62.55756],[17.66913,62.55756],[17.67225,62.55793],[17.67721,62.55898],[17.68028,62.55938],[17.68334,62.55947],[17.69263,62.55934],[17.69664,62.55957],[17.70833,62.56152],[17.72627,62.56328],[17.72922,62.56397],[17.732,62.56505],[17.74798,62.57408],[17.75267,62.57622],[17.76963,62.58276],[17.7815,62.58577],[17.78474,62.58689],[17.78825,62.58841],[17.78701,62.58997],[17.78564,62.59346],[17.78352,62.59506],[17.78255,62.59688],[17.78384,62.59943],[17.78855,62.60456],[17.78854,62.60576],[17.78792,62.60636],[17.78665,62.60694],[17.77335,62.61005],[17.77228,62.6104],[17.77156,62.6109],[17.77127,62.61137],[17.77142,62.61202],[17.77359,62.61363],[17.77419,62.61482],[17.77397,62.61565],[17.77193,62.6192],[17.77204,62.62029],[17.78087,62.62633],[17.78469,62.62798],[17.78588,62.62993],[17.78682,62.6299],[17.78731,62.63055],[17.79159,62.63077],[17.79748,62.63196],[17.80184,62.63224],[17.80418,62.63255],[17.80883,62.63377],[17.81256,62.63571],[17.81461,62.63641],[17.82356,62.63786],[17.82679,62.63812],[17.82979,62.63814],[17.84062,62.63714],[17.84675,62.6372],[17.84741,62.63864],[17.85085,62.64192],[17.85025,62.64375],[17.85053,62.64474],[17.84826,62.6473],[17.84831,62.64779],[17.84925,62.64877],[17.84852,62.65049],[17.84717,62.65236],[17.84521,62.65339],[17.84304,62.65412],[17.84246,62.65534],[17.84095,62.65655],[17.8409,62.65854],[17.84281,62.66126],[17.84165,62.66219],[17.84158,62.66257],[17.84211,62.66327],[17.84424,62.6649],[17.84435,62.66629],[17.84468,62.66652],[17.84266,62.66738],[17.84128,62.66848],[17.84021,62.67055],[17.83976,62.67224],[17.84024,62.67341],[17.84196,62.67555],[17.84634,62.67924],[17.84735,62.68043],[17.84769,62.68168],[17.84663,62.68511],[17.84701,62.68652],[17.85158,62.69087],[17.85207,62.69212],[17.85219,62.69417],[17.85257,62.69522],[17.85652,62.70067],[17.85834,62.70236],[17.86145,62.70423],[17.86591,62.70596],[17.87449,62.70839],[17.89713,62.71197],[17.90298,62.71338],[17.90747,62.7151],[17.91795,62.72045],[17.92011,62.72181],[17.92174,62.7234],[17.92264,62.72499],[17.92288,62.72686],[17.92239,62.72848],[17.92127,62.73004],[17.91954,62.73148],[17.91764,62.73258],[17.91236,62.73462],[17.90978,62.73591],[17.90791,62.73731],[17.90662,62.73884],[17.9059,62.74092],[17.90616,62.74361],[17.90587,62.7456],[17.90503,62.74744],[17.90297,62.75031],[17.90218,62.75237],[17.9021,62.75445],[17.90261,62.75629],[17.90561,62.76167],[17.9074,62.76409],[17.91017,62.76684],[17.91643,62.77191],[17.91823,62.77407],[17.91898,62.77564],[17.91934,62.7773],[17.91865,62.78222],[17.91873,62.78353],[17.91948,62.78524],[17.9211,62.78706],[17.92296,62.78844],[17.94943,62.80471],[17.95412,62.80842],[17.95687,62.8098],[17.96135,62.81136],[17.96355,62.81233],[17.96565,62.81363],[17.96718,62.81506],[17.96911,62.81796],[17.97006,62.82117],[17.96993,62.82383],[17.96837,62.82841],[17.96754,62.83291],[17.96799,62.83509],[17.96958,62.83715],[17.97256,62.83916],[17.9762,62.8406],[17.97949,62.84141],[17.98576,62.84239],[17.9888,62.84301],[17.99268,62.84412],[17.99633,62.84556],[18.01486,62.85498],[18.02977,62.8614],[18.03256,62.86276],[18.03566,62.86487],[18.03973,62.8687],[18.04139,62.86996],[18.04427,62.87162],[18.04689,62.87276],[18.0503,62.87388],[18.05436,62.87484],[18.07571,62.87843],[18.07988,62.87977],[18.08159,62.88056],[18.08346,62.88177],[18.08478,62.88297],[18.08578,62.8844],[18.0928,62.89932],[18.09331,62.90247],[18.09289,62.90916],[18.09349,62.91297],[18.09444,62.91452],[18.09818,62.91842],[18.09939,62.92137],[18.09944,62.92299],[18.09893,62.92496],[18.09334,62.93703],[18.09333,62.93864],[18.09431,62.94232],[18.09321,62.94555],[18.09304,62.94692],[18.09331,62.94815],[18.09418,62.94968],[18.09637,62.95185],[18.09897,62.95372],[18.10082,62.95467],[18.10352,62.9556],[18.11991,62.9596],[18.12248,62.96011],[18.12659,62.96054],[18.13962,62.96122],[18.14562,62.96207],[18.14873,62.96285],[18.15101,62.96364],[18.15374,62.96482],[18.1562,62.96616],[18.15793,62.96744],[18.15936,62.9689],[18.16065,62.9711],[18.1608,62.9727],[18.16004,62.97782],[18.1604,62.98268],[18.16115,62.98523],[18.16305,62.98891],[18.16391,62.9933],[18.16463,62.99475],[18.16603,62.99623],[18.16755,62.9973],[18.18598,63.00691],[18.1873,63.00805],[18.18906,63.01024],[18.19132,63.01189],[18.19301,63.0127],[18.19536,63.01353],[18.19996,63.01455],[18.20481,63.01497],[18.20739,63.01491],[18.2101,63.01463],[18.21375,63.01384],[18.2203,63.01153],[18.22237,63.01051],[18.22742,63.00732],[18.23032,63.0061],[18.23373,63.00531],[18.24205,63.00427],[18.25483,63.00441],[18.25761,63.00458],[18.26212,63.00527],[18.26936,63.00742],[18.27251,63.00793],[18.27585,63.00792],[18.28273,63.00716],[18.28592,63.00733],[18.28864,63.00811],[18.28987,63.00883],[18.29051,63.00951],[18.29082,63.01059],[18.2904,63.01265],[18.29076,63.01378],[18.29442,63.01746],[18.29798,63.02448],[18.29967,63.02616],[18.30121,63.02706],[18.3033,63.02787],[18.3116,63.02989],[18.3225,63.033],[18.32413,63.03363],[18.32547,63.03442],[18.32646,63.03544],[18.32688,63.03651],[18.32599,63.04917],[18.32611,63.05064],[18.32697,63.05233],[18.32854,63.05389],[18.3307,63.055],[18.35089,63.06063],[18.35362,63.06181],[18.3552,63.0631],[18.35594,63.06449],[18.35716,63.06965],[18.35785,63.07114],[18.36443,63.07792],[18.36589,63.07987],[18.36702,63.08202],[18.36787,63.08571],[18.36768,63.0924],[18.36799,63.09467],[18.37379,63.10847],[18.37535,63.11018],[18.37762,63.11167],[18.38008,63.11276],[18.38779,63.11533],[18.39054,63.11641],[18.3939,63.11822],[18.39704,63.12081],[18.39821,63.12232],[18.39908,63.12428],[18.40053,63.13386],[18.40113,63.13549],[18.404,63.13911],[18.40568,63.14042],[18.40774,63.14148],[18.4121,63.14301],[18.41413,63.14444],[18.4145,63.14572],[18.41391,63.14815],[18.41394,63.14969],[18.41622,63.15618],[18.42459,63.16705],[18.42633,63.16822],[18.43305,63.1707],[18.43429,63.17167],[18.4363,63.17413],[18.43886,63.17602],[18.45464,63.18378],[18.46134,63.18758],[18.46926,63.19313],[18.4828,63.20454],[18.48527,63.20639],[18.4879,63.20811],[18.49157,63.21014],[18.50141,63.21475],[18.50396,63.21657],[18.50547,63.21814],[18.50657,63.22008],[18.50786,63.22625],[18.51216,63.2368],[18.51381,63.24682],[18.5149,63.24889],[18.51726,63.25114],[18.52257,63.25416],[18.52476,63.25601],[18.52579,63.25766],[18.52743,63.26285],[18.52849,63.26476],[18.53005,63.26673],[18.53592,63.27278],[18.53826,63.27406],[18.54773,63.27693],[18.5504,63.2781],[18.55223,63.27947],[18.55456,63.28271],[18.55587,63.28374],[18.55781,63.28447],[18.55962,63.28482],[18.56955,63.28517],[18.58712,63.28694],[18.59287,63.28712],[18.60847,63.28712],[18.61217,63.28746],[18.61676,63.28855],[18.63647,63.29643],[18.64064,63.29747],[18.64479,63.2979],[18.65219,63.2978],[18.65856,63.29746],[18.66182,63.297],[18.66737,63.29595],[18.67358,63.29536],[18.67767,63.29536],[18.68427,63.29562],[18.68892,63.29542],[18.69285,63.29477],[18.70257,63.29198],[18.70558,63.29095],[18.70644,63.29027],[18.70723,63.29047],[18.71939,63.29184],[18.7205,63.29204],[18.72131,63.2924],[18.72184,63.29326],[18.72135,63.29412],[18.71867,63.2971],[18.71839,63.29917],[18.71876,63.30035],[18.7214,63.30155],[18.72677,63.30279],[18.73155,63.30356],[18.73399,63.30376],[18.73493,63.30347],[18.73653,63.30379],[18.741,63.30384],[18.75297,63.30434],[18.76673,63.3059],[18.77072,63.30649],[18.77567,63.30756],[18.78123,63.3093],[18.78819,63.31194],[18.79568,63.3155],[18.79784,63.31601],[18.80049,63.31627],[18.80378,63.31612],[18.81004,63.31508],[18.82612,63.31158],[18.83483,63.31047],[18.83973,63.30954],[18.84429,63.30819],[18.85822,63.30283],[18.86873,63.29795],[18.87142,63.29695],[18.87445,63.29624],[18.8778,63.29585],[18.88131,63.2958],[18.8842,63.29603],[18.8933,63.29765],[18.89605,63.29829],[18.90492,63.30156],[18.91052,63.3045],[18.91319,63.30554],[18.91616,63.30624],[18.92259,63.30716],[18.92621,63.30791],[18.92855,63.30866],[18.93823,63.3124],[18.9414,63.3132],[18.94383,63.31349],[18.94598,63.31355],[18.95311,63.31289],[18.95642,63.31283],[18.95981,63.31308],[18.96718,63.31401],[18.97088,63.31425],[18.9947,63.31449],[18.99918,63.31466],[19.00306,63.31518],[19.04475,63.32326],[19.04869,63.32441],[19.0514,63.32564],[19.06468,63.3345],[19.06647,63.33539],[19.06937,63.33636],[19.07865,63.33899],[19.08195,63.33961],[19.08499,63.33977],[19.10058,63.33889],[19.10351,63.33894],[19.10627,63.3393],[19.10893,63.34002],[19.11379,63.34221],[19.11655,63.34316],[19.1198,63.34383],[19.14069,63.34725],[19.15967,63.35313],[19.16479,63.35494],[19.16997,63.3575],[19.18512,63.36666],[19.18695,63.36816],[19.18863,63.37011],[19.18974,63.37239],[19.19114,63.37956],[19.19439,63.38651],[19.1944,63.39123],[19.19481,63.39311],[19.19625,63.39556],[19.20277,63.40336],[19.20513,63.40814],[19.20597,63.41291],[19.20487,63.42147],[19.20498,63.42353],[19.20545,63.42513],[19.20653,63.42717],[19.20975,63.43156],[19.21235,63.43915],[19.2141,63.4415],[19.21649,63.44371],[19.22283,63.44785],[19.22731,63.45021],[19.23258,63.4526],[19.23744,63.45448],[19.24238,63.45613],[19.25299,63.45881],[19.25962,63.46098],[19.26474,63.46326],[19.27286,63.4677],[19.2828,63.47187],[19.28642,63.47384],[19.29328,63.47862],[19.29692,63.48091],[19.30901,63.48748],[19.32419,63.49705],[19.32614,63.49785],[19.33862,63.50182],[19.34371,63.50386],[19.34739,63.50569],[19.36236,63.51421],[19.37992,63.52192],[19.38802,63.52614],[19.39402,63.52992],[19.39988,63.53445],[19.40397,63.53835],[19.41076,63.546],[19.42357,63.55734],[19.42695,63.56068],[19.43153,63.56587],[19.43691,63.56999],[19.441,63.57223],[19.44492,63.57376],[19.45181,63.57577],[19.45742,63.57701],[19.4631,63.57783],[19.48862,63.57979],[19.50568,63.5801],[19.51148,63.58039],[19.52015,63.58115],[19.54772,63.58402],[19.55775,63.58456],[19.56458,63.58464],[19.56999,63.58457],[19.58426,63.58403],[19.59192,63.58405],[19.61006,63.58499],[19.61678,63.58515],[19.62422,63.58503],[19.63296,63.58455],[19.6423,63.5846],[19.64729,63.58489],[19.65228,63.58537],[19.66982,63.58781],[19.68173,63.58891],[19.68725,63.58958],[19.69776,63.59139],[19.71242,63.59489],[19.71947,63.59627],[19.72959,63.59768],[19.74455,63.59903],[19.75208,63.60031],[19.75984,63.60236],[19.7789,63.60883],[19.78512,63.61044],[19.78986,63.61141],[19.80209,63.61336],[19.8081,63.61403],[19.81997,63.6149],[19.82713,63.61612],[19.83131,63.61716],[19.83421,63.6181],[19.84615,63.62297],[19.85206,63.62498],[19.85584,63.62607],[19.86385,63.62789],[19.87512,63.62973],[19.88134,63.63092],[19.88824,63.63259],[19.90303,63.63681],[19.90955,63.63822],[19.92141,63.64042],[19.92274,63.64079],[19.94591,63.64948],[19.95523,63.65568],[19.96739,63.6652],[19.96952,63.66656],[19.98252,63.67306],[19.99891,63.6807],[20.03749,63.70065],[20.0577,63.71151],[20.0621,63.71359],[20.07232,63.7179],[20.07571,63.71987],[20.0804,63.7238],[20.08258,63.72511],[20.11151,63.7378],[20.11755,63.73978],[20.12527,63.7415],[20.12883,63.74253],[20.14602,63.74923],[20.153,63.75244],[20.16389,63.75833],[20.16772,63.76074],[20.17502,63.76621],[20.18211,63.77103],[20.19355,63.78107],[20.20206,63.78613],[20.21001,63.79024],[20.22223,63.79566],[20.23709,63.80158],[20.2403,63.80231],[20.24343,63.80267],[20.24644,63.80273],[20.25163,63.80251],[20.25459,63.80335],[20.25448,63.80375],[20.25314,63.80387],[20.25248,63.8041],[20.25115,63.80525],[20.24995,63.80667],[20.2487,63.80885],[20.24767,63.80996],[20.24896,63.81076],[20.24918,63.81143],[20.24961,63.81171],[20.24945,63.81232],[20.25018,63.81771],[20.25115,63.81998],[20.25533,63.82557],[20.25878,63.82937],[20.26158,63.82889],[20.26224,63.82962],[20.25999,63.82999]],"E4 Södertälje→Uppsala":[[17.63019,59.20004],[17.63107,59.1991],[17.63375,59.20016],[17.63296,59.20089],[17.63479,59.20121],[17.6425,59.20203],[17.64659,59.20329],[17.64874,59.20354],[17.65011,59.20341],[17.65177,59.20295],[17.65997,59.19968],[17.66182,59.19928],[17.66391,59.19926],[17.66575,59.19971],[17.66886,59.20136],[17.6705,59.20194],[17.67856,59.20398],[17.68445,59.20583],[17.68657,59.20622],[17.69065,59.20649],[17.69771,59.20627],[17.70113,59.20655],[17.71998,59.21041],[17.72286,59.21083],[17.72509,59.21097],[17.7329,59.21081],[17.73657,59.2109],[17.74737,59.21189],[17.76638,59.21272],[17.76998,59.21311],[17.77265,59.21366],[17.77621,59.2148],[17.77825,59.21576],[17.78011,59.21694],[17.78225,59.21902],[17.78494,59.22348],[17.78617,59.22499],[17.78814,59.22649],[17.79097,59.22789],[17.79312,59.22862],[17.80079,59.23048],[17.80257,59.23104],[17.805,59.23209],[17.81238,59.23585],[17.81513,59.23687],[17.81906,59.23773],[17.83094,59.23927],[17.83396,59.23999],[17.83598,59.24091],[17.83693,59.24158],[17.83932,59.24475],[17.84179,59.24655],[17.8454,59.24804],[17.86184,59.25406],[17.86426,59.25458],[17.86632,59.25475],[17.86858,59.25469],[17.87439,59.25414],[17.87741,59.25418],[17.88123,59.25479],[17.88442,59.25584],[17.88757,59.25758],[17.8913,59.26095],[17.89286,59.26201],[17.89553,59.26318],[17.89646,59.26349],[17.89714,59.26352],[17.89799,59.26405],[17.90776,59.2677],[17.91008,59.26888],[17.91139,59.26982],[17.91254,59.27103],[17.91429,59.27479],[17.91579,59.2765],[17.92144,59.28042],[17.92495,59.28198],[17.95074,59.28804],[17.95373,59.2886],[17.95746,59.28901],[17.96076,59.28914],[17.9857,59.28883],[17.98871,59.28921],[17.99398,59.29038],[17.99579,59.29092],[17.99763,59.29187],[18.00647,59.29771],[18.00855,59.2985],[18.01082,59.29909],[18.0186,59.30041],[18.02015,59.30112],[18.02081,59.30205],[18.02047,59.3033],[18.01914,59.30427],[18.01173,59.30716],[18.00888,59.30885],[18.00283,59.31532],[17.99764,59.31932],[17.99679,59.32054],[17.99689,59.32157],[17.99785,59.32267],[18.00117,59.32459],[18.00631,59.32636],[18.0076,59.32699],[18.00832,59.32761],[18.00964,59.32956],[18.01019,59.33116],[18.00996,59.33449],[18.01094,59.33703],[18.01137,59.33987],[18.01119,59.34072],[18.00974,59.34283],[18.00963,59.34343],[18.00995,59.34415],[18.01144,59.34508],[18.01339,59.34537],[18.01485,59.34522],[18.01781,59.34454],[18.02156,59.34391],[18.02401,59.34385],[18.0258,59.34413],[18.0277,59.34484],[18.03148,59.34725],[18.03833,59.35009],[18.03932,59.35081],[18.03978,59.35179],[18.03956,59.3527],[18.03868,59.35352],[18.03427,59.35576],[18.02874,59.35915],[18.02561,59.36272],[18.02183,59.36534],[18.0207,59.36697],[18.01997,59.37123],[18.01888,59.37297],[18.01087,59.38024],[18.00136,59.38797],[17.99795,59.38972],[17.99053,59.39232],[17.9803,59.39737],[17.9771,59.39924],[17.97281,59.4022],[17.97038,59.40344],[17.95329,59.41053],[17.94337,59.4138],[17.92841,59.41986],[17.92616,59.4213],[17.92478,59.42266],[17.9216,59.42816],[17.92126,59.42933],[17.9213,59.43077],[17.92203,59.43232],[17.92322,59.4337],[17.92425,59.43545],[17.92458,59.43679],[17.92448,59.43893],[17.92384,59.44066],[17.92101,59.44536],[17.91963,59.44943],[17.91878,59.45116],[17.91727,59.45316],[17.91338,59.45684],[17.91191,59.45885],[17.91112,59.46113],[17.91108,59.4647],[17.91177,59.46749],[17.91273,59.46951],[17.91452,59.47199],[17.91835,59.47619],[17.91986,59.47933],[17.92005,59.48198],[17.91917,59.48657],[17.91943,59.48958],[17.92054,59.49222],[17.9238,59.49709],[17.92515,59.50095],[17.92512,59.50479],[17.92418,59.50904],[17.92403,59.51248],[17.9246,59.51577],[17.92655,59.5207],[17.92676,59.52231],[17.92644,59.52459],[17.92533,59.52703],[17.9242,59.52848],[17.92182,59.53062],[17.92021,59.5317],[17.91166,59.53645],[17.90831,59.5389],[17.90615,59.54076],[17.90296,59.54424],[17.90181,59.54588],[17.90096,59.54725],[17.89959,59.55046],[17.89813,59.55822],[17.8975,59.56649],[17.89814,59.5705],[17.90072,59.57719],[17.90096,59.58102],[17.90079,59.58272],[17.89997,59.58537],[17.89697,59.59113],[17.89629,59.5952],[17.89689,59.59892],[17.89907,59.60347],[17.89983,59.60631],[17.89933,59.61282],[17.90087,59.61902],[17.90128,59.62236],[17.9012,59.62566],[17.90072,59.62865],[17.89995,59.63128],[17.89867,59.63435],[17.89326,59.64301],[17.89048,59.6503],[17.88791,59.65532],[17.88514,59.65945],[17.88292,59.66224],[17.88041,59.665],[17.87474,59.6702],[17.87304,59.67214],[17.87123,59.67486],[17.8699,59.67809],[17.86939,59.68021],[17.86926,59.68202],[17.86956,59.6868],[17.86916,59.68936],[17.86835,59.69167],[17.86636,59.69498],[17.86522,59.69642],[17.86187,59.69949],[17.85538,59.70386],[17.85181,59.7072],[17.8496,59.71065],[17.84861,59.71376],[17.84761,59.71593],[17.84515,59.71875],[17.83947,59.723],[17.83625,59.72641],[17.83436,59.72802],[17.82714,59.73304],[17.82162,59.73784],[17.81929,59.74078],[17.81706,59.74566],[17.81465,59.74856],[17.8092,59.75303],[17.80407,59.75764],[17.80158,59.75928],[17.79574,59.76244],[17.79314,59.76425],[17.79136,59.76587],[17.7896,59.76794],[17.78639,59.7727],[17.78288,59.77646],[17.78072,59.77938],[17.77766,59.78681],[17.77518,59.79048],[17.77312,59.7954],[17.77186,59.79752],[17.7689,59.80056],[17.76255,59.80509],[17.75883,59.80866],[17.75665,59.81168],[17.75391,59.81765],[17.75177,59.82031],[17.7483,59.82312],[17.74644,59.82428],[17.74111,59.82705],[17.73743,59.82969],[17.73573,59.83179],[17.7348,59.83495],[17.73353,59.83631],[17.73143,59.83738],[17.72629,59.83865],[17.72157,59.84052],[17.71873,59.84145],[17.71604,59.84209],[17.71151,59.84286],[17.71074,59.84321],[17.70928,59.84325],[17.7032,59.84443],[17.7022,59.8447],[17.70121,59.84519],[17.70062,59.84515],[17.69938,59.84458],[17.69615,59.84397],[17.69174,59.84363],[17.68838,59.84385],[17.67605,59.84566],[17.67293,59.84566],[17.6675,59.8453],[17.66556,59.84663],[17.66518,59.84721],[17.66331,59.84779],[17.64178,59.85985],[17.64009,59.86064],[17.63955,59.86038],[17.64002,59.86015]],"E4 Umeå→Luleå":[[20.25999,63.82999],[20.26088,63.82985],[20.26026,63.82911],[20.25878,63.82937],[20.26045,63.83117],[20.27021,63.83646],[20.27119,63.83671],[20.27402,63.83929],[20.27836,63.84403],[20.2799,63.8452],[20.28263,63.84665],[20.28692,63.84805],[20.29253,63.84896],[20.29512,63.84909],[20.2962,63.84884],[20.29829,63.84909],[20.31363,63.84842],[20.31435,63.8482],[20.31612,63.84829],[20.3406,63.84724],[20.34134,63.84685],[20.34193,63.84676],[20.34427,63.84732],[20.35176,63.84826],[20.38797,63.85569],[20.44487,63.86886],[20.49107,63.88245],[20.50667,63.88653],[20.51822,63.88999],[20.52781,63.89322],[20.5314,63.89419],[20.53733,63.8952],[20.55365,63.89689],[20.5579,63.89751],[20.56306,63.89866],[20.56954,63.90062],[20.57473,63.90249],[20.58096,63.9054],[20.59629,63.91525],[20.60012,63.91735],[20.60532,63.91941],[20.63313,63.92875],[20.63777,63.93078],[20.64241,63.93368],[20.66394,63.95062],[20.66806,63.95326],[20.67238,63.95544],[20.67656,63.95717],[20.70175,63.96563],[20.70558,63.96723],[20.72872,63.98179],[20.73444,63.98474],[20.74028,63.98701],[20.74691,63.98897],[20.77625,63.99556],[20.78137,63.99685],[20.78585,63.99817],[20.7899,63.99962],[20.79429,64.0015],[20.80886,64.00884],[20.81362,64.01099],[20.81926,64.01311],[20.83137,64.01706],[20.83416,64.01824],[20.83769,64.0204],[20.83923,64.0219],[20.84035,64.02345],[20.84131,64.0261],[20.84183,64.03288],[20.84227,64.03489],[20.8436,64.03712],[20.8472,64.04133],[20.8484,64.04389],[20.84872,64.04571],[20.84764,64.06012],[20.84858,64.0634],[20.84982,64.06539],[20.85168,64.06743],[20.86337,64.07728],[20.86592,64.07998],[20.8671,64.08171],[20.86848,64.08538],[20.86966,64.09796],[20.87078,64.10164],[20.8727,64.1045],[20.87781,64.10936],[20.87952,64.11152],[20.88051,64.11361],[20.88211,64.12002],[20.8832,64.12254],[20.88492,64.12496],[20.89181,64.1329],[20.8951,64.14038],[20.8966,64.14256],[20.89977,64.14539],[20.91283,64.15476],[20.91477,64.15696],[20.91752,64.16153],[20.92028,64.16433],[20.92288,64.16619],[20.92794,64.16901],[20.93235,64.1709],[20.93844,64.17279],[20.98227,64.18221],[20.98673,64.18344],[20.98997,64.18462],[20.99352,64.18628],[20.9968,64.1884],[21.0155,64.20326],[21.0169,64.20505],[21.01723,64.2066],[21.01732,64.2136],[21.01529,64.21805],[21.015,64.21948],[21.01645,64.23003],[21.01698,64.23175],[21.01876,64.23395],[21.02824,64.24044],[21.04311,64.25333],[21.04491,64.25523],[21.04583,64.25732],[21.04669,64.26202],[21.04649,64.26891],[21.04745,64.27099],[21.04921,64.27277],[21.0517,64.27428],[21.05983,64.27799],[21.06468,64.2807],[21.06727,64.28255],[21.07651,64.29025],[21.07894,64.29159],[21.08142,64.29261],[21.08509,64.29369],[21.09056,64.29467],[21.09515,64.29502],[21.10458,64.29515],[21.10754,64.29534],[21.11162,64.29596],[21.11556,64.297],[21.12526,64.30116],[21.14303,64.30729],[21.1484,64.30931],[21.16528,64.31648],[21.16857,64.31755],[21.17774,64.32002],[21.18093,64.32111],[21.18384,64.32232],[21.20237,64.33099],[21.20511,64.33204],[21.20805,64.33291],[21.21151,64.33365],[21.21462,64.3341],[21.2195,64.33446],[21.2232,64.33446],[21.23598,64.33385],[21.25003,64.33428],[21.26133,64.33381],[21.26388,64.33394],[21.2662,64.3343],[21.26819,64.33486],[21.26968,64.33556],[21.28778,64.34636],[21.29104,64.34848],[21.29267,64.35021],[21.29737,64.36236],[21.30275,64.37227],[21.30434,64.37911],[21.30433,64.38042],[21.30364,64.38222],[21.29862,64.38865],[21.29769,64.39071],[21.29793,64.39304],[21.30026,64.39677],[21.30102,64.3989],[21.30115,64.40148],[21.30048,64.40385],[21.29899,64.40632],[21.28976,64.41649],[21.28712,64.42011],[21.28086,64.43188],[21.28002,64.43401],[21.27994,64.4354],[21.28064,64.43799],[21.28294,64.44186],[21.2831,64.44534],[21.2844,64.45188],[21.2855,64.45391],[21.29015,64.45967],[21.29238,64.46454],[21.29297,64.46738],[21.29256,64.47012],[21.28966,64.47726],[21.28827,64.47938],[21.28603,64.48111],[21.27374,64.48904],[21.27226,64.49019],[21.26532,64.49887],[21.26153,64.50201],[21.26026,64.50348],[21.25717,64.50848],[21.25673,64.51014],[21.25837,64.51737],[21.25881,64.52105],[21.25881,64.52291],[21.25796,64.52855],[21.25872,64.53442],[21.25825,64.53656],[21.24492,64.55223],[21.22764,64.56779],[21.21814,64.58621],[21.20458,64.60031],[21.2022,64.60245],[21.1989,64.60462],[21.18438,64.61199],[21.18206,64.61356],[21.18049,64.61499],[21.17932,64.6166],[21.17864,64.61844],[21.17829,64.6262],[21.17751,64.62873],[21.17584,64.63141],[21.17394,64.63365],[21.17182,64.63565],[21.16949,64.6373],[21.16534,64.63948],[21.16052,64.6413],[21.15501,64.64296],[21.14265,64.64634],[21.13549,64.64895],[21.11272,64.65933],[21.10193,64.66395],[21.09073,64.67106],[21.07973,64.67631],[21.07142,64.68099],[21.06448,64.684],[21.06034,64.68541],[21.05607,64.68662],[21.01501,64.69647],[21.00953,64.6983],[21.00557,64.7001],[21.00144,64.70273],[20.99896,64.70492],[20.99716,64.70749],[20.99556,64.71156],[20.99374,64.71422],[20.99145,64.7163],[20.98753,64.71905],[20.985,64.72124],[20.98016,64.72765],[20.97638,64.73012],[20.97628,64.73065],[20.97428,64.73127],[20.97018,64.73364],[20.96686,64.73624],[20.96133,64.74279],[20.96163,64.74334],[20.96007,64.74416],[20.95977,64.74602],[20.96024,64.7485],[20.96254,64.75523],[20.96425,64.75754],[20.96513,64.75779],[20.9654,64.75818],[20.9664,64.75869],[20.97003,64.75958],[20.97916,64.76026],[20.98575,64.76111],[21.00061,64.76165],[21.00416,64.76203],[21.00719,64.76262],[21.01165,64.76406],[21.01468,64.76569],[21.01749,64.76827],[21.0207,64.77213],[21.02163,64.77403],[21.02179,64.77605],[21.02124,64.77772],[21.01906,64.78146],[21.01881,64.78266],[21.0191,64.78455],[21.02225,64.79275],[21.02351,64.79508],[21.0258,64.7978],[21.03025,64.80177],[21.03211,64.80423],[21.03308,64.80722],[21.0326,64.81042],[21.03165,64.81224],[21.02832,64.81658],[21.02775,64.81824],[21.02733,64.82125],[21.02648,64.82276],[21.02521,64.82403],[21.02183,64.82606],[21.01377,64.82915],[20.99247,64.83902],[20.99025,64.84056],[20.9889,64.84217],[20.98833,64.84385],[20.98858,64.84547],[20.99007,64.8477],[20.99388,64.85061],[20.99711,64.85254],[21.00629,64.85706],[21.01005,64.85928],[21.02029,64.86767],[21.0275,64.87229],[21.044,64.88409],[21.04816,64.88682],[21.05383,64.89151],[21.06131,64.8969],[21.1084,64.9237],[21.15596,64.94149],[21.16005,64.94279],[21.1972,64.95318],[21.21011,64.95748],[21.21847,64.95939],[21.25095,64.96609],[21.2595,64.96819],[21.26749,64.97075],[21.27534,64.97393],[21.27977,64.97615],[21.28361,64.97843],[21.28755,64.98125],[21.28997,64.98335],[21.29369,64.98751],[21.30194,64.9996],[21.30728,65.00614],[21.31319,65.01194],[21.32631,65.02305],[21.33078,65.02721],[21.33525,65.03039],[21.35452,65.04116],[21.35803,65.04282],[21.36043,65.04371],[21.38679,65.05263],[21.42428,65.0628],[21.43027,65.0649],[21.4556,65.07662],[21.46096,65.07932],[21.47876,65.08737],[21.48962,65.09384],[21.49314,65.09568],[21.49721,65.09732],[21.51103,65.10233],[21.51482,65.10396],[21.51977,65.10697],[21.52309,65.11022],[21.52572,65.11508],[21.5264,65.11765],[21.52627,65.12102],[21.52487,65.12433],[21.52361,65.12618],[21.52153,65.12836],[21.49459,65.15299],[21.49303,65.156],[21.49255,65.16104],[21.493,65.16383],[21.49405,65.16597],[21.50088,65.17394],[21.50212,65.17571],[21.51169,65.19701],[21.51375,65.2],[21.51849,65.20549],[21.51997,65.2079],[21.52083,65.21031],[21.52103,65.21327],[21.5205,65.2158],[21.5194,65.21816],[21.51769,65.22049],[21.51557,65.22261],[21.49477,65.24027],[21.49122,65.24285],[21.47618,65.25256],[21.47049,65.25685],[21.45939,65.26732],[21.45143,65.27559],[21.4454,65.28089],[21.44096,65.2843],[21.43584,65.28783],[21.42153,65.29639],[21.41679,65.29953],[21.41037,65.30477],[21.40898,65.30628],[21.40811,65.30784],[21.40772,65.30947],[21.4079,65.31099],[21.4084,65.31199],[21.41007,65.314],[21.41242,65.31577],[21.41601,65.31767],[21.43623,65.32477],[21.43886,65.32646],[21.44068,65.32898],[21.44145,65.33249],[21.44144,65.3349],[21.44051,65.3382],[21.43899,65.34104],[21.43824,65.34318],[21.43787,65.34611],[21.43801,65.34998],[21.4376,65.35203],[21.43653,65.35438],[21.43268,65.35933],[21.43128,65.36176],[21.42968,65.36732],[21.42947,65.37194],[21.42984,65.37529],[21.43103,65.37796],[21.43335,65.38046],[21.43954,65.38524],[21.45247,65.3932],[21.45548,65.39483],[21.45978,65.39663],[21.47625,65.40218],[21.4929,65.40673],[21.51354,65.41096],[21.5196,65.41251],[21.52312,65.41372],[21.53563,65.41868],[21.54634,65.42191],[21.55721,65.42448],[21.56663,65.42645],[21.57773,65.42864],[21.58585,65.42992],[21.59488,65.43079],[21.60864,65.43107],[21.61629,65.43147],[21.62379,65.4322],[21.63069,65.43318],[21.63865,65.43457],[21.64542,65.43599],[21.65182,65.4377],[21.65658,65.43933],[21.6613,65.44134],[21.66605,65.44394],[21.66912,65.44614],[21.67352,65.45006],[21.6781,65.45294],[21.68336,65.45519],[21.69938,65.46044],[21.70583,65.46309],[21.70949,65.465],[21.72026,65.47139],[21.7576,65.48993],[21.76143,65.49218],[21.76372,65.49403],[21.7652,65.49565],[21.77322,65.50729],[21.77415,65.50932],[21.77478,65.51278],[21.77557,65.515],[21.78098,65.52371],[21.78273,65.52564],[21.78555,65.52799],[21.79003,65.53058],[21.7942,65.53245],[21.7982,65.53387],[21.84565,65.54806],[21.85195,65.55024],[21.86493,65.5553],[21.86841,65.55645],[21.87224,65.55741],[21.88099,65.55911],[21.89002,65.56145],[21.90985,65.56536],[21.91656,65.56718],[21.92196,65.56892],[21.92552,65.57027],[21.92869,65.57178],[21.93776,65.57663],[21.94152,65.57812],[21.94511,65.57925],[21.94927,65.5803],[21.95434,65.58124],[21.95964,65.58193],[21.96479,65.58229],[21.96881,65.58238],[21.98548,65.58231],[21.99462,65.58262],[21.99941,65.58225],[22.01138,65.58223],[22.01373,65.58235],[22.01741,65.58281],[22.01983,65.58333],[22.02324,65.5845],[22.02782,65.58659],[22.0284,65.58661],[22.02998,65.58532],[22.03241,65.58445],[22.03747,65.5831],[22.04304,65.58204],[22.04658,65.58169],[22.05335,65.58155],[22.06217,65.5808],[22.07298,65.58032],[22.0741,65.57981],[22.07621,65.57977],[22.07823,65.5795],[22.08453,65.57793],[22.08821,65.57748],[22.10128,65.5771],[22.10744,65.57724],[22.14341,65.581],[22.1444,65.58096],[22.14653,65.58044],[22.14956,65.58069]],"E4 Uppsala→Gävle":[[17.64002,59.86015],[17.63955,59.86038],[17.64009,59.86064],[17.63313,59.8645],[17.63302,59.86512],[17.63092,59.86504],[17.6304,59.86522],[17.62403,59.87642],[17.6225,59.87938],[17.62265,59.87997],[17.6231,59.88023],[17.62401,59.88038],[17.62738,59.88056],[17.63209,59.88015],[17.63516,59.88036],[17.6452,59.88275],[17.65661,59.8842],[17.66005,59.8848],[17.66338,59.88559],[17.66454,59.88559],[17.66554,59.88625],[17.66871,59.8876],[17.67017,59.88768],[17.67068,59.88807],[17.67031,59.8885],[17.66874,59.88895],[17.66177,59.89213],[17.65937,59.89375],[17.65701,59.89568],[17.65476,59.89801],[17.65281,59.90074],[17.65152,59.90335],[17.65061,59.90634],[17.65035,59.91099],[17.65144,59.91564],[17.65317,59.91905],[17.65879,59.92736],[17.66041,59.93118],[17.66091,59.93595],[17.66009,59.94091],[17.65891,59.9439],[17.65742,59.94656],[17.65007,59.95543],[17.64858,59.9579],[17.64775,59.96108],[17.6479,59.96746],[17.64728,59.97059],[17.64573,59.9739],[17.64086,59.98038],[17.63903,59.98353],[17.63783,59.98694],[17.63692,59.99438],[17.63593,59.99686],[17.6344,59.99911],[17.62889,60.00461],[17.62701,60.00688],[17.62585,60.0088],[17.62481,60.01164],[17.62393,60.01583],[17.62383,60.01801],[17.62422,60.02106],[17.62543,60.02426],[17.62897,60.0309],[17.62985,60.03433],[17.6299,60.03746],[17.62955,60.03952],[17.62871,60.04201],[17.62735,60.04456],[17.6246,60.0481],[17.62238,60.0502],[17.61739,60.05419],[17.6152,60.05655],[17.6139,60.05862],[17.60765,60.07167],[17.60488,60.07556],[17.60069,60.07998],[17.59815,60.082],[17.59449,60.08419],[17.57892,60.09111],[17.57425,60.09353],[17.56973,60.09632],[17.56614,60.09938],[17.56012,60.10613],[17.55026,60.11587],[17.548,60.1191],[17.54689,60.12248],[17.54678,60.12439],[17.54732,60.12997],[17.54734,60.13364],[17.54689,60.13757],[17.54587,60.14168],[17.54318,60.14812],[17.53755,60.15748],[17.53422,60.16161],[17.52987,60.16528],[17.52583,60.1678],[17.51429,60.17384],[17.51075,60.17614],[17.5076,60.17857],[17.50462,60.18136],[17.50233,60.18402],[17.50048,60.18677],[17.49891,60.18996],[17.49749,60.19516],[17.49702,60.20206],[17.49583,60.209],[17.49565,60.21265],[17.49653,60.21819],[17.50063,60.2298],[17.50181,60.23656],[17.50189,60.24188],[17.50085,60.25204],[17.5005,60.26022],[17.50071,60.26413],[17.50159,60.27025],[17.50195,60.2773],[17.50355,60.28223],[17.50636,60.28679],[17.50977,60.29057],[17.51715,60.29706],[17.51982,60.30034],[17.52095,60.30252],[17.52169,60.30495],[17.52203,60.30737],[17.52199,60.30955],[17.52122,60.31287],[17.51949,60.3163],[17.51709,60.31932],[17.51223,60.32403],[17.50815,60.32734],[17.5041,60.33007],[17.50044,60.33209],[17.49118,60.33656],[17.48739,60.33876],[17.48418,60.34091],[17.4808,60.34356],[17.4783,60.34586],[17.4754,60.34911],[17.47415,60.35109],[17.47313,60.35441],[17.47342,60.35792],[17.47451,60.36041],[17.47871,60.36672],[17.48025,60.36958],[17.48155,60.37348],[17.48197,60.37751],[17.4815,60.381],[17.47767,60.3888],[17.47532,60.39828],[17.47378,60.40171],[17.47078,60.40549],[17.4688,60.40727],[17.46629,60.40911],[17.46202,60.4116],[17.44814,60.4181],[17.44061,60.42223],[17.43642,60.42493],[17.43256,60.42775],[17.42641,60.43313],[17.42135,60.43898],[17.41907,60.44251],[17.41763,60.44536],[17.41593,60.45043],[17.41496,60.45871],[17.41398,60.46145],[17.41177,60.46432],[17.40845,60.46673],[17.4051,60.4684],[17.40195,60.4695],[17.38609,60.47336],[17.38011,60.47512],[17.37599,60.47653],[17.3698,60.47904],[17.35839,60.48473],[17.34925,60.48858],[17.33937,60.49213],[17.32865,60.49543],[17.32428,60.49701],[17.31823,60.49969],[17.30339,60.50706],[17.29152,60.51247],[17.28607,60.51563],[17.28064,60.51945],[17.27792,60.52171],[17.27474,60.52492],[17.272,60.52884],[17.26676,60.54096],[17.26401,60.54535],[17.25998,60.55096],[17.25783,60.55286],[17.25363,60.55598],[17.24624,60.56029],[17.24307,60.56252],[17.23595,60.56919],[17.23071,60.57286],[17.22547,60.57585],[17.21947,60.57884],[17.2132,60.5815],[17.2041,60.58475],[17.19921,60.58707],[17.19535,60.58921],[17.19295,60.59086],[17.19037,60.59297],[17.18762,60.59604],[17.18265,60.60274],[17.17861,60.60717],[17.1726,60.61188],[17.16411,60.61782],[17.15964,60.62144],[17.15561,60.62536],[17.14811,60.63338],[17.14557,60.6355],[17.14294,60.6373],[17.14133,60.63903],[17.14037,60.6397],[17.1403,60.64005],[17.14059,60.64032],[17.14044,60.64109],[17.14254,60.64447],[17.14329,60.64491],[17.14392,60.64603],[17.14672,60.64802],[17.1473,60.64812],[17.14793,60.64871],[17.15395,60.65184],[17.15553,60.65328],[17.15661,60.65557],[17.15698,60.65581],[17.15429,60.66147],[17.14732,60.66159],[17.14521,60.66184],[17.1393,60.66386],[17.13792,60.66488],[17.13468,60.66788],[17.14002,60.66922],[17.14025,60.66933],[17.1401,60.67]],"E6 Göteborg→Strömstad":[[11.96861,57.71116],[11.97386,57.71298],[11.97824,57.71495],[11.98425,57.7171],[11.9869,57.71788],[11.99134,57.71888],[11.99272,57.71935],[11.99434,57.72035],[11.99734,57.72269],[11.99838,57.72426],[11.99886,57.72639],[11.99926,57.72661],[11.99975,57.72661],[12.00016,57.72617],[11.99975,57.72578],[11.99931,57.7257],[11.99663,57.72584],[11.9948,57.72632],[11.99132,57.7279],[11.98986,57.72838],[11.9878,57.7287],[11.98423,57.72834],[11.98326,57.72869],[11.9829,57.72931],[11.98595,57.73539],[11.99092,57.74944],[11.99148,57.7517],[11.99172,57.75696],[11.99227,57.7599],[11.99825,57.77688],[12.00051,57.78747],[12.0022,57.79125],[12.00675,57.79798],[12.00773,57.80085],[12.00779,57.80388],[12.00425,57.82232],[12.00437,57.82716],[12.00607,57.83815],[12.00555,57.84171],[12.00434,57.84486],[12.00244,57.84824],[12.00106,57.84999],[11.99924,57.85172],[11.9956,57.85438],[11.9932,57.85586],[11.98889,57.8581],[11.98495,57.85968],[11.97825,57.86188],[11.97588,57.86303],[11.97385,57.86435],[11.96989,57.86795],[11.96584,57.87354],[11.9626,57.8761],[11.95907,57.87793],[11.95163,57.88103],[11.94818,57.8828],[11.94516,57.88473],[11.93663,57.89111],[11.93139,57.8944],[11.92664,57.89705],[11.92216,57.8993],[11.91585,57.90213],[11.91074,57.90417],[11.90301,57.90691],[11.8999,57.90822],[11.88956,57.91412],[11.88497,57.91727],[11.88248,57.91941],[11.88047,57.92149],[11.87374,57.93053],[11.87026,57.9343],[11.86552,57.93835],[11.85825,57.94363],[11.85444,57.9473],[11.85235,57.95017],[11.84844,57.95725],[11.84375,57.9635],[11.84178,57.96656],[11.84052,57.96906],[11.8399,57.97142],[11.83988,57.97438],[11.84219,57.98585],[11.84253,57.99497],[11.84451,58.00189],[11.84443,58.00465],[11.84354,58.00915],[11.84343,58.01314],[11.84427,58.01948],[11.84629,58.02593],[11.8467,58.02818],[11.84666,58.03162],[11.84568,58.03627],[11.84581,58.03792],[11.84647,58.0398],[11.84758,58.04149],[11.84895,58.04293],[11.85044,58.04411],[11.85253,58.04539],[11.85548,58.04672],[11.86489,58.0503],[11.87016,58.05263],[11.87608,58.05564],[11.88194,58.0592],[11.88584,58.06196],[11.88816,58.06412],[11.88987,58.06655],[11.89075,58.0691],[11.89084,58.07158],[11.8902,58.07394],[11.88574,58.08145],[11.88424,58.08467],[11.88293,58.08843],[11.88224,58.09266],[11.88244,58.09939],[11.88184,58.10157],[11.87988,58.10558],[11.87921,58.10857],[11.87939,58.11284],[11.88056,58.1189],[11.88184,58.12215],[11.88468,58.12733],[11.88586,58.13113],[11.88594,58.13522],[11.88428,58.14388],[11.88437,58.14691],[11.8849,58.14872],[11.88701,58.15334],[11.88736,58.15522],[11.88754,58.16008],[11.88821,58.16209],[11.88931,58.16405],[11.89114,58.16628],[11.89307,58.16811],[11.89923,58.17252],[11.90293,58.17586],[11.90586,58.17928],[11.90781,58.18267],[11.90877,58.18547],[11.9092,58.18855],[11.90901,58.19122],[11.9078,58.19645],[11.90784,58.19859],[11.90819,58.20047],[11.90927,58.20318],[11.9166,58.21712],[11.91738,58.21958],[11.91756,58.22176],[11.91726,58.22458],[11.91645,58.22728],[11.91513,58.2299],[11.91288,58.23318],[11.91147,58.23575],[11.91066,58.23799],[11.9098,58.24192],[11.90884,58.24427],[11.90328,58.25312],[11.9003,58.25729],[11.89568,58.26493],[11.89286,58.26887],[11.88921,58.27322],[11.87453,58.28769],[11.87213,58.28955],[11.86732,58.29247],[11.86535,58.29388],[11.8624,58.29688],[11.86085,58.29971],[11.85955,58.30413],[11.85913,58.3074],[11.85911,58.31214],[11.85884,58.31372],[11.85794,58.31594],[11.85631,58.31821],[11.8541,58.32027],[11.85139,58.32211],[11.83806,58.32856],[11.83451,58.33073],[11.83159,58.33304],[11.82826,58.33642],[11.826,58.33924],[11.82331,58.3436],[11.82004,58.35048],[11.81829,58.35294],[11.81584,58.35544],[11.81272,58.35791],[11.80905,58.3603],[11.80552,58.3622],[11.80005,58.36462],[11.79768,58.36596],[11.7927,58.36978],[11.79038,58.37131],[11.78793,58.37256],[11.78244,58.37476],[11.77882,58.37672],[11.77328,58.38132],[11.76831,58.38446],[11.76495,58.38775],[11.76326,58.3891],[11.75771,58.39246],[11.75274,58.39629],[11.74965,58.3984],[11.74068,58.40365],[11.73867,58.4054],[11.73626,58.40832],[11.73318,58.41131],[11.73033,58.41607],[11.72825,58.41847],[11.72089,58.42473],[11.71536,58.43084],[11.71209,58.434],[11.7071,58.43759],[11.70159,58.44205],[11.69876,58.44356],[11.69547,58.44458],[11.6921,58.44513],[11.67915,58.4465],[11.67515,58.4475],[11.67186,58.44897],[11.66973,58.4506],[11.66755,58.45361],[11.66616,58.45492],[11.66405,58.45626],[11.65918,58.45856],[11.65644,58.46047],[11.65483,58.46236],[11.65109,58.46904],[11.64926,58.47104],[11.64602,58.47317],[11.63941,58.47574],[11.63663,58.47722],[11.63422,58.47932],[11.63178,58.48311],[11.63014,58.48498],[11.62743,58.48695],[11.6246,58.48829],[11.62235,58.48904],[11.61865,58.4898],[11.61582,58.49009],[11.61253,58.49015],[11.60916,58.48995],[11.60571,58.48953],[11.59567,58.48759],[11.59291,58.4874],[11.59032,58.48743],[11.58761,58.48768],[11.58448,58.4883],[11.58151,58.48924],[11.57856,58.49057],[11.57665,58.49171],[11.57485,58.49308],[11.57021,58.49819],[11.5551,58.51218],[11.55221,58.51561],[11.54565,58.52514],[11.54407,58.5269],[11.52953,58.53743],[11.52504,58.54104],[11.52309,58.54216],[11.51765,58.54473],[11.51092,58.54865],[11.50632,58.55108],[11.50055,58.5538],[11.49297,58.55703],[11.48175,58.56261],[11.47583,58.56479],[11.46737,58.56688],[11.46367,58.56826],[11.45955,58.57079],[11.45609,58.57361],[11.45383,58.57603],[11.45223,58.57824],[11.45155,58.57962],[11.45117,58.58144],[11.45151,58.58385],[11.45331,58.58732],[11.45427,58.59083],[11.45582,58.59396],[11.45635,58.59606],[11.45509,58.61312],[11.45446,58.61568],[11.45287,58.618],[11.44962,58.62082],[11.44846,58.6222],[11.44784,58.62361],[11.44729,58.6266],[11.44582,58.62894],[11.4442,58.63035],[11.43813,58.63476],[11.43638,58.63683],[11.43528,58.63956],[11.43469,58.64852],[11.4341,58.65018],[11.43305,58.65176],[11.43131,58.65348],[11.42881,58.65541],[11.41581,58.66401],[11.41467,58.66501],[11.41364,58.6663],[11.41298,58.66774],[11.41222,58.67151],[11.40996,58.67495],[11.40934,58.67632],[11.40915,58.6779],[11.40997,58.68132],[11.40995,58.68328],[11.40925,58.68532],[11.40778,58.68736],[11.40649,58.68856],[11.40437,58.69001],[11.39835,58.69277],[11.39573,58.69436],[11.39343,58.69625],[11.38821,58.7017],[11.38558,58.70359],[11.38223,58.70542],[11.3789,58.70687],[11.3762,58.70768],[11.37199,58.70845],[11.36631,58.70888],[11.36374,58.70928],[11.36043,58.71023],[11.35785,58.71146],[11.35591,58.71295],[11.35465,58.71461],[11.35403,58.71641],[11.35343,58.71995],[11.35196,58.72241],[11.3496,58.72443],[11.34532,58.72677],[11.34059,58.72891],[11.33663,58.73044],[11.3326,58.73171],[11.32732,58.73313],[11.32338,58.73378],[11.31591,58.73409],[11.31334,58.73439],[11.30932,58.73536],[11.30658,58.73656],[11.30478,58.7379],[11.30106,58.74244],[11.29777,58.74551],[11.29266,58.74914],[11.28633,58.75262],[11.28402,58.75411],[11.28111,58.75672],[11.2794,58.75915],[11.27791,58.76262],[11.27686,58.7677],[11.27604,58.76939],[11.27395,58.7726],[11.27341,58.77421],[11.27331,58.77567],[11.27364,58.77784],[11.2743,58.77982],[11.27522,58.78162],[11.27769,58.78532],[11.2788,58.78818],[11.27898,58.79075],[11.27788,58.79506],[11.27812,58.7972],[11.27913,58.7994],[11.28223,58.80368],[11.28323,58.80684],[11.2832,58.80917],[11.28246,58.81214],[11.28223,58.8144],[11.28311,58.81964],[11.28285,58.82256],[11.2815,58.82572],[11.27821,58.83003],[11.27675,58.83232],[11.27623,58.83368],[11.27608,58.83497],[11.27639,58.83668],[11.27716,58.83819],[11.27831,58.83956],[11.28118,58.84219],[11.28244,58.84391],[11.28325,58.84614],[11.28326,58.84819],[11.28238,58.85075],[11.28073,58.85396],[11.27843,58.85746],[11.27524,58.86155],[11.27422,58.86352],[11.27379,58.86567],[11.27387,58.86757],[11.27525,58.87185],[11.27566,58.87431],[11.27528,58.87821],[11.27387,58.88144],[11.27246,58.88319],[11.2696,58.886],[11.26862,58.88754],[11.26814,58.8889],[11.26827,58.89164],[11.27016,58.89548],[11.27112,58.89914],[11.27132,58.9029],[11.27083,58.90597],[11.26987,58.90816],[11.26846,58.91018],[11.26717,58.91156],[11.26121,58.91691],[11.25918,58.91939],[11.25762,58.92191],[11.25622,58.92543],[11.25535,58.93041],[11.2553,58.93164],[11.25552,58.93194],[11.25609,58.93215],[11.25743,58.93212],[11.25767,58.93222],[11.25683,58.93378],[11.25571,58.93468],[11.25425,58.93536],[11.25228,58.9359],[11.25047,58.93615],[11.2489,58.93618],[11.24727,58.93599],[11.24238,58.93431],[11.24095,58.93405],[11.23942,58.93399],[11.2377,58.93419],[11.23494,58.93498],[11.23311,58.93534],[11.23056,58.93554],[11.22579,58.93556],[11.22387,58.93584],[11.21967,58.93685],[11.21627,58.93699],[11.19182,58.93315],[11.19002,58.93266],[11.18745,58.93155],[11.18404,58.93152],[11.17781,58.93037],[11.17463,58.93021],[11.17324,58.93041],[11.17066,58.93106],[11.16997,58.93153],[11.16975,58.93208],[11.17026,58.93349],[11.17104,58.93469],[11.17394,58.93728],[11.17383,58.93815],[11.17447,58.93833],[11.17417,58.9394],[11.17225,58.93954],[11.17124,58.93946],[11.17121,58.93979],[11.16996,58.9397],[11.16973,58.93979],[11.1698,58.93999]],"E6 Halmstad→Göteborg":[[12.86007,56.66999],[12.86095,56.67236],[12.8646,56.67198],[12.86735,56.67068],[12.86783,56.67095],[12.86892,56.67111],[12.87332,56.67244],[12.87854,56.67333],[12.88087,56.67341],[12.88198,56.67323],[12.88264,56.67333],[12.88831,56.67307],[12.89608,56.67358],[12.90039,56.67411],[12.90132,56.67396],[12.90163,56.67352],[12.90128,56.67308],[12.90051,56.673],[12.89981,56.67327],[12.89888,56.674],[12.89716,56.67625],[12.89591,56.67884],[12.89537,56.6813],[12.89494,56.6897],[12.89417,56.69451],[12.88733,56.71558],[12.88618,56.71843],[12.88418,56.72231],[12.88212,56.72567],[12.87916,56.72983],[12.87304,56.73692],[12.86957,56.74033],[12.86533,56.74408],[12.85748,56.75011],[12.85272,56.75323],[12.84884,56.75545],[12.84364,56.75805],[12.8394,56.75989],[12.83512,56.76148],[12.83267,56.76222],[12.82435,56.76396],[12.82134,56.76477],[12.81836,56.76587],[12.81538,56.7674],[12.81223,56.76979],[12.80515,56.77859],[12.80277,56.78098],[12.79905,56.78416],[12.7947,56.7874],[12.78897,56.7911],[12.78393,56.79392],[12.77794,56.79685],[12.76975,56.80025],[12.76498,56.80188],[12.7611,56.80295],[12.75409,56.80435],[12.74033,56.80612],[12.73662,56.80684],[12.7326,56.80784],[12.72854,56.80912],[12.7255,56.81027],[12.71942,56.81324],[12.71656,56.81504],[12.71474,56.81646],[12.71298,56.81825],[12.71176,56.81995],[12.71099,56.82152],[12.71044,56.82345],[12.71026,56.8287],[12.70928,56.83256],[12.70724,56.83608],[12.70408,56.83947],[12.70065,56.84205],[12.69586,56.84469],[12.69164,56.84642],[12.68169,56.84959],[12.67944,56.85051],[12.67665,56.85193],[12.67082,56.85591],[12.66288,56.86233],[12.66006,56.86401],[12.65587,56.86574],[12.64397,56.86934],[12.63528,56.87247],[12.62346,56.87717],[12.60971,56.88317],[12.60532,56.88549],[12.60125,56.88808],[12.59259,56.89516],[12.58926,56.89745],[12.58471,56.90017],[12.57552,56.90537],[12.56615,56.91033],[12.55022,56.91809],[12.54129,56.92205],[12.52796,56.92732],[12.51929,56.93036],[12.50154,56.93625],[12.49127,56.94019],[12.48083,56.94492],[12.46981,56.95074],[12.46042,56.95612],[12.44668,56.96451],[12.44125,56.96821],[12.43561,56.97242],[12.42723,56.97936],[12.42117,56.98487],[12.41452,56.99145],[12.40767,56.99903],[12.40073,57.00776],[12.3886,57.02516],[12.38596,57.02804],[12.37737,57.03594],[12.37354,57.03999],[12.36632,57.0483],[12.3609,57.05561],[12.35696,57.06207],[12.35356,57.06901],[12.3515,57.07439],[12.34946,57.08145],[12.34833,57.08428],[12.34031,57.0967],[12.33341,57.10922],[12.3317,57.11172],[12.3279,57.11559],[12.31915,57.12188],[12.31646,57.12425],[12.31462,57.1262],[12.31285,57.12844],[12.30855,57.13502],[12.30548,57.13904],[12.29767,57.14823],[12.28644,57.16025],[12.28305,57.16462],[12.27809,57.17182],[12.27466,57.17616],[12.27168,57.17877],[12.26619,57.18238],[12.26229,57.18522],[12.25901,57.18791],[12.25662,57.19026],[12.25486,57.19246],[12.25097,57.19847],[12.24566,57.20463],[12.24379,57.20711],[12.23675,57.21942],[12.23525,57.22166],[12.23285,57.22468],[12.22608,57.23207],[12.22421,57.23458],[12.22243,57.23752],[12.22053,57.24184],[12.21866,57.24825],[12.21709,57.25536],[12.21614,57.26175],[12.21564,57.26765],[12.2155,57.27441],[12.21626,57.28636],[12.21626,57.29087],[12.21471,57.30397],[12.21318,57.30947],[12.21014,57.31597],[12.20824,57.32119],[12.20698,57.32629],[12.20645,57.33019],[12.20615,57.33423],[12.20634,57.33837],[12.2071,57.34201],[12.20981,57.3502],[12.21001,57.35308],[12.20953,57.35638],[12.20777,57.36173],[12.20476,57.36724],[12.2,57.3743],[12.19415,57.38169],[12.18981,57.38872],[12.18906,57.39077],[12.18905,57.39522],[12.18865,57.39639],[12.18767,57.39802],[12.18522,57.40045],[12.17952,57.40456],[12.17514,57.40843],[12.1729,57.41097],[12.17128,57.4132],[12.16688,57.42052],[12.16324,57.42555],[12.16004,57.42857],[12.15694,57.43059],[12.15215,57.43284],[12.14757,57.43432],[12.14295,57.43536],[12.13008,57.4378],[12.12368,57.43942],[12.11897,57.44103],[12.10781,57.44553],[12.10154,57.44829],[12.09611,57.4511],[12.08169,57.46005],[12.06869,57.46747],[12.06581,57.46887],[12.06218,57.47035],[12.05146,57.47376],[12.04946,57.47456],[12.04757,57.47558],[12.04605,57.47668],[12.04431,57.47864],[12.04343,57.48095],[12.04371,57.48354],[12.04616,57.48896],[12.05121,57.49789],[12.05221,57.50048],[12.05279,57.50345],[12.05278,57.50645],[12.05214,57.51106],[12.04974,57.52187],[12.04914,57.52682],[12.04949,57.52992],[12.0518,57.53899],[12.05298,57.54654],[12.05328,57.55189],[12.05275,57.56017],[12.05292,57.56203],[12.05386,57.56483],[12.05796,57.57115],[12.06149,57.57867],[12.06393,57.58528],[12.06414,57.58706],[12.06387,57.58885],[12.06307,57.59062],[12.05852,57.59698],[12.05664,57.60023],[12.05492,57.60181],[12.05031,57.60496],[12.04785,57.60729],[12.04611,57.6097],[12.04399,57.61414],[12.04301,57.61565],[12.04178,57.61711],[12.03838,57.62014],[12.03701,57.62173],[12.03615,57.62381],[12.0352,57.63069],[12.03396,57.6336],[12.03035,57.63821],[12.02423,57.6446],[12.02061,57.65084],[12.01824,57.65603],[12.0146,57.6677],[12.01221,57.67284],[12.00898,57.67776],[12.00706,57.68126],[11.99872,57.69133],[11.99571,57.69767],[11.99493,57.70269],[11.99722,57.71092],[11.99674,57.7118],[11.99491,57.71306],[11.99465,57.71364],[11.99465,57.71508],[11.99142,57.71924],[11.99153,57.71979],[11.99202,57.71993],[11.99241,57.71983],[11.99244,57.71955],[11.99198,57.7193],[11.99098,57.71901],[11.98889,57.71875],[11.98399,57.71731],[11.97804,57.71508],[11.97301,57.71351],[11.96686,57.71104],[11.96755,57.71085],[11.96861,57.71116]],"E6 Malmö→Halmstad":[[12.98977,55.6108],[12.98783,55.61062],[12.98762,55.61162],[12.988,55.61197],[12.98957,55.6124],[12.99302,55.6127],[12.99544,55.61226],[13.00025,55.61256],[13.00279,55.61187],[13.01183,55.61254],[13.01261,55.61313],[13.01753,55.61339],[13.01832,55.61339],[13.01877,55.61323],[13.02069,55.61469],[13.02141,55.61496],[13.02288,55.61505],[13.02496,55.61451],[13.02613,55.61444],[13.03578,55.61517],[13.0378,55.61561],[13.03983,55.61664],[13.04091,55.6174],[13.04283,55.62014],[13.04394,55.62121],[13.04982,55.62455],[13.05246,55.62673],[13.05434,55.62937],[13.05671,55.63501],[13.05837,55.63825],[13.05847,55.63887],[13.05966,55.63953],[13.05981,55.64032],[13.06032,55.64097],[13.06274,55.64306],[13.0659,55.64455],[13.06926,55.64552],[13.09456,55.65077],[13.09705,55.65165],[13.0988,55.65282],[13.09907,55.65353],[13.09847,55.65596],[13.09965,55.66451],[13.09984,55.66841],[13.09792,55.6852],[13.09771,55.70278],[13.09652,55.70782],[13.09074,55.72126],[13.08931,55.72356],[13.08799,55.72515],[13.08447,55.72829],[13.08054,55.73079],[13.07529,55.73317],[13.07065,55.73467],[13.02775,55.74565],[13.00566,55.75263],[13.00075,55.75448],[12.99861,55.75557],[12.99569,55.75758],[12.99344,55.75975],[12.9901,55.76356],[12.9877,55.76582],[12.98489,55.76779],[12.97624,55.77326],[12.97279,55.77589],[12.97093,55.77793],[12.96927,55.78061],[12.96321,55.79678],[12.96132,55.79981],[12.95854,55.80259],[12.94221,55.81463],[12.93915,55.81723],[12.93589,55.821],[12.92732,55.83363],[12.92547,55.83567],[12.92311,55.8376],[12.92024,55.83939],[12.90963,55.84433],[12.90414,55.84736],[12.88669,55.85879],[12.88484,55.86027],[12.88284,55.86228],[12.8807,55.86542],[12.87938,55.86888],[12.87906,55.87051],[12.87919,55.87299],[12.87849,55.87842],[12.87723,55.88316],[12.8756,55.88587],[12.87077,55.89129],[12.86959,55.89296],[12.86589,55.90043],[12.863,55.90475],[12.85838,55.90977],[12.85314,55.9141],[12.84965,55.91648],[12.8273,55.93019],[12.82481,55.93198],[12.82197,55.93463],[12.82018,55.93687],[12.81775,55.94069],[12.81561,55.94336],[12.80914,55.94909],[12.80697,55.95132],[12.80509,55.9538],[12.80139,55.95947],[12.79516,55.96632],[12.7903,55.97252],[12.7866,55.97787],[12.78268,55.98415],[12.78105,55.98815],[12.78021,55.9924],[12.7799,56.00606],[12.78029,56.01164],[12.78176,56.01817],[12.78397,56.02428],[12.78519,56.02848],[12.78613,56.03351],[12.78636,56.03718],[12.78585,56.0442],[12.78427,56.05355],[12.78241,56.06112],[12.7789,56.07217],[12.77834,56.07516],[12.77824,56.07833],[12.77855,56.08098],[12.77923,56.08372],[12.7806,56.08705],[12.78322,56.09122],[12.78493,56.09309],[12.78662,56.09452],[12.78911,56.0962],[12.80395,56.10461],[12.80742,56.10707],[12.80988,56.10959],[12.81401,56.11578],[12.81716,56.1193],[12.82854,56.12828],[12.84151,56.1402],[12.8436,56.14337],[12.84457,56.14651],[12.84462,56.14884],[12.8438,56.15844],[12.84668,56.17331],[12.84826,56.17806],[12.85288,56.18787],[12.86089,56.19715],[12.86361,56.19958],[12.86704,56.20178],[12.88211,56.20981],[12.88387,56.2109],[12.89534,56.21986],[12.89667,56.22139],[12.8974,56.22287],[12.89895,56.23722],[12.89854,56.25181],[12.89779,56.25608],[12.89496,56.26229],[12.89419,56.2648],[12.89385,56.26847],[12.89418,56.27117],[12.89517,56.27427],[12.90169,56.28912],[12.90684,56.30157],[12.91414,56.32036],[12.91482,56.32309],[12.9151,56.32544],[12.91486,56.3366],[12.91527,56.33888],[12.91587,56.3404],[12.91752,56.34308],[12.92175,56.3478],[12.9245,56.34949],[12.92962,56.35145],[12.93211,56.3528],[12.93431,56.35474],[12.93562,56.35713],[12.9358,56.359],[12.93404,56.37175],[12.93424,56.37543],[12.93484,56.37858],[12.93668,56.3842],[12.93989,56.39096],[12.94114,56.39418],[12.94362,56.40247],[12.94466,56.40754],[12.94749,56.41449],[12.95126,56.42657],[12.95323,56.43447],[12.95443,56.44089],[12.95406,56.44423],[12.95288,56.44701],[12.9516,56.44886],[12.9449,56.45699],[12.94276,56.46075],[12.94197,56.46306],[12.94157,56.46521],[12.94149,56.46761],[12.94179,56.46993],[12.94297,56.47351],[12.946,56.47927],[12.94851,56.48341],[12.95381,56.49111],[12.95631,56.49559],[12.96028,56.50558],[12.9637,56.5128],[12.96498,56.51663],[12.96551,56.51941],[12.96618,56.5282],[12.96907,56.53549],[12.97016,56.53915],[12.97015,56.54088],[12.96983,56.54237],[12.96853,56.54493],[12.9607,56.55516],[12.95277,56.56418],[12.95048,56.56769],[12.94957,56.56978],[12.94892,56.57216],[12.94841,56.5798],[12.94772,56.58181],[12.94644,56.58402],[12.94476,56.58604],[12.93895,56.59176],[12.9342,56.59585],[12.92456,56.60319],[12.92072,56.6071],[12.91854,56.61038],[12.91729,56.61336],[12.91675,56.61565],[12.91552,56.62431],[12.91434,56.62725],[12.91288,56.62937],[12.91161,56.63074],[12.90631,56.63547],[12.90414,56.63865],[12.90315,56.64161],[12.90313,56.64496],[12.90408,56.65007],[12.90652,56.65811],[12.90679,56.66145],[12.90638,56.66352],[12.90551,56.66562],[12.90431,56.66749],[12.90151,56.67087],[12.90136,56.67165],[12.90186,56.67307],[12.90165,56.67395],[12.90188,56.67438],[12.9014,56.67452],[12.89927,56.6741],[12.89663,56.67383],[12.89597,56.67391],[12.89472,56.67365],[12.88973,56.6733],[12.88289,56.67342],[12.88203,56.6736],[12.8791,56.6735],[12.87637,56.6732],[12.87473,56.67274],[12.87458,56.67306],[12.87333,56.67302],[12.86699,56.67247],[12.86616,56.67293],[12.8652,56.67306],[12.86499,56.67245],[12.86537,56.67195],[12.86515,56.67166],[12.8644,56.67135],[12.86424,56.67103],[12.86066,56.67149],[12.86007,56.66999]],"Rv40 Göteborg→Jönköping":[[11.96861,57.71116],[11.97417,57.7131],[11.97824,57.71495],[11.98523,57.71743],[11.98783,57.7179],[11.99006,57.71783],[11.99138,57.71797],[11.99204,57.71783],[11.99297,57.71653],[11.99435,57.7132],[11.99475,57.71277],[11.9963,57.71188],[11.99689,57.71106],[11.99689,57.71035],[11.9956,57.70628],[11.99474,57.70235],[11.99543,57.69787],[11.99643,57.69596],[11.99827,57.69133],[11.99896,57.69032],[11.99978,57.68959],[12.00091,57.68906],[12.00558,57.68834],[12.00904,57.68711],[12.01651,57.68276],[12.02318,57.67776],[12.02609,57.67625],[12.0275,57.67588],[12.02914,57.67566],[12.03299,57.67565],[12.03854,57.67632],[12.04176,57.67635],[12.05114,57.67558],[12.06029,57.67502],[12.07263,57.67344],[12.08505,57.67297],[12.09904,57.67115],[12.10369,57.67082],[12.10914,57.67084],[12.11422,57.67128],[12.12032,57.67224],[12.12718,57.67354],[12.14076,57.67647],[12.15694,57.67902],[12.16423,57.6806],[12.17535,57.68379],[12.1798,57.68486],[12.18556,57.68588],[12.19184,57.68671],[12.19486,57.68683],[12.19801,57.68668],[12.20605,57.68565],[12.21135,57.68517],[12.23509,57.68428],[12.23839,57.68398],[12.24514,57.68308],[12.25011,57.6828],[12.2543,57.6829],[12.25862,57.68334],[12.26701,57.68504],[12.27158,57.68564],[12.27695,57.68583],[12.28365,57.68571],[12.2936,57.6852],[12.29895,57.6845],[12.30481,57.68319],[12.31292,57.68069],[12.31811,57.67956],[12.32264,57.67892],[12.33095,57.67832],[12.33692,57.6776],[12.34674,57.67585],[12.36278,57.67246],[12.37459,57.67021],[12.38565,57.66833],[12.39374,57.66734],[12.39849,57.667],[12.40393,57.6668],[12.40902,57.667],[12.41334,57.66754],[12.42109,57.66922],[12.42474,57.66981],[12.42909,57.67021],[12.43862,57.67044],[12.44352,57.67082],[12.44996,57.67172],[12.45854,57.67359],[12.46216,57.67421],[12.46744,57.67469],[12.47249,57.67473],[12.47748,57.67436],[12.48625,57.6729],[12.49085,57.67241],[12.49537,57.67224],[12.5022,57.67241],[12.50582,57.67235],[12.50948,57.67209],[12.51289,57.67166],[12.51791,57.67069],[12.52418,57.66898],[12.53676,57.66524],[12.54652,57.66286],[12.55596,57.66127],[12.56012,57.66096],[12.56384,57.66095],[12.56759,57.66119],[12.57184,57.66178],[12.58488,57.66454],[12.58838,57.66514],[12.59217,57.66562],[12.59991,57.6663],[12.60457,57.66698],[12.60898,57.6679],[12.61633,57.66977],[12.62153,57.6706],[12.62539,57.67091],[12.62841,57.67098],[12.63119,57.67092],[12.63856,57.67032],[12.64394,57.67006],[12.64975,57.67005],[12.65635,57.67038],[12.66156,57.67091],[12.66741,57.67181],[12.67168,57.67273],[12.68051,57.67495],[12.68431,57.67556],[12.69123,57.67628],[12.69418,57.67674],[12.69854,57.67762],[12.70537,57.6793],[12.71151,57.68029],[12.71758,57.68077],[12.7302,57.681],[12.73584,57.68146],[12.74765,57.68287],[12.75306,57.68314],[12.7606,57.68318],[12.76571,57.68336],[12.77027,57.68374],[12.77379,57.6842],[12.78084,57.68543],[12.78717,57.68694],[12.79251,57.68859],[12.80393,57.69255],[12.81603,57.69587],[12.82138,57.69752],[12.82833,57.70008],[12.83293,57.70206],[12.83787,57.70451],[12.84372,57.70774],[12.8458,57.70867],[12.84802,57.70944],[12.85143,57.71024],[12.85569,57.71073],[12.88187,57.7118],[12.89085,57.71311],[12.90091,57.71381],[12.90399,57.71437],[12.90954,57.71567],[12.92629,57.71799],[12.92825,57.71799],[12.9297,57.71783],[12.93449,57.71673],[12.94052,57.71574],[12.94279,57.71554],[12.94487,57.71564],[12.95359,57.71662],[12.96052,57.71701],[12.96324,57.71756],[12.96723,57.71914],[12.97328,57.72114],[12.97544,57.72206],[12.97847,57.72371],[12.98087,57.72451],[12.98368,57.72471],[12.98967,57.72393],[12.99279,57.72399],[12.9948,57.72438],[13.00167,57.72625],[13.00392,57.72666],[13.01907,57.72826],[13.02504,57.72925],[13.02924,57.73041],[13.03314,57.73187],[13.03646,57.73351],[13.04228,57.73675],[13.04508,57.73807],[13.04871,57.73929],[13.05735,57.74157],[13.06226,57.74349],[13.06573,57.74531],[13.07306,57.7501],[13.07781,57.75232],[13.08311,57.7539],[13.09816,57.75699],[13.1016,57.75805],[13.10461,57.75934],[13.108,57.76143],[13.11053,57.76384],[13.11176,57.76575],[13.1154,57.77417],[13.11855,57.77957],[13.1213,57.78265],[13.1252,57.78567],[13.13262,57.79007],[13.13912,57.79317],[13.14533,57.79538],[13.15447,57.7981],[13.15962,57.7998],[13.17611,57.80652],[13.1794,57.80752],[13.18334,57.80838],[13.18675,57.80886],[13.19082,57.80914],[13.1955,57.80911],[13.20786,57.80796],[13.21556,57.80758],[13.22352,57.80763],[13.23111,57.80825],[13.24302,57.81021],[13.25302,57.81147],[13.25696,57.81216],[13.25986,57.81289],[13.26323,57.81401],[13.269,57.81668],[13.27181,57.81778],[13.27548,57.81872],[13.27904,57.8192],[13.28384,57.81931],[13.29039,57.81868],[13.29485,57.81863],[13.29819,57.81894],[13.30774,57.82059],[13.31177,57.82099],[13.31608,57.82122],[13.3218,57.82113],[13.32904,57.82041],[13.33925,57.81871],[13.34868,57.81663],[13.36349,57.81271],[13.36955,57.81158],[13.37395,57.81104],[13.38001,57.81066],[13.38629,57.81069],[13.39106,57.81105],[13.39967,57.81215],[13.40394,57.81222],[13.40666,57.81203],[13.41014,57.81155],[13.41709,57.80986],[13.41948,57.80942],[13.42418,57.80907],[13.42903,57.80935],[13.43486,57.8104],[13.43773,57.81073],[13.44089,57.81082],[13.44367,57.81067],[13.44616,57.81035],[13.44878,57.80979],[13.45663,57.80724],[13.4617,57.80586],[13.46737,57.80466],[13.47203,57.80392],[13.48037,57.80311],[13.49532,57.80243],[13.50807,57.80087],[13.52058,57.79999],[13.52392,57.79955],[13.5422,57.7962],[13.54735,57.79561],[13.55379,57.79548],[13.58035,57.79688],[13.59938,57.79693],[13.60322,57.79681],[13.60861,57.79638],[13.61401,57.79564],[13.61782,57.7949],[13.6209,57.79418],[13.62527,57.79286],[13.62893,57.79152],[13.6492,57.7832],[13.65476,57.7812],[13.66103,57.77933],[13.66894,57.77747],[13.67684,57.7761],[13.70525,57.77283],[13.71069,57.77188],[13.71417,57.77093],[13.71729,57.76978],[13.72497,57.76588],[13.72778,57.76497],[13.73024,57.76442],[13.73396,57.764],[13.73759,57.76399],[13.74053,57.76426],[13.74598,57.76516],[13.74974,57.76556],[13.77765,57.76634],[13.7831,57.76688],[13.79518,57.76895],[13.79911,57.76924],[13.80325,57.76918],[13.80877,57.7685],[13.8247,57.76513],[13.82922,57.76361],[13.83936,57.75917],[13.84355,57.75807],[13.86083,57.75543],[13.87787,57.75426],[13.88338,57.7542],[13.89336,57.75461],[13.9049,57.75423],[13.91183,57.75454],[13.93295,57.75466],[13.93722,57.75444],[13.94643,57.75348],[13.94926,57.75309],[13.95689,57.75161],[13.95967,57.75126],[13.97014,57.75104],[13.97461,57.75119],[13.98216,57.75216],[13.98596,57.753],[13.99499,57.75638],[14.00351,57.75931],[14.00901,57.76165],[14.0131,57.76306],[14.02206,57.76537],[14.04759,57.7727],[14.05509,57.77439],[14.06028,57.77488],[14.06301,57.77486],[14.07249,57.77408],[14.07562,57.77361],[14.07866,57.77292],[14.08171,57.77195],[14.08371,57.77113],[14.08995,57.768],[14.09565,57.76611],[14.09858,57.76491],[14.10006,57.76411],[14.10096,57.76333],[14.10091,57.76288],[14.10017,57.76266],[14.09954,57.76288],[14.10003,57.76384],[14.10072,57.76454],[14.10144,57.76477],[14.10165,57.76543],[14.10354,57.76742],[14.10424,57.76849],[14.10475,57.76999],[14.1063,57.77077],[14.10665,57.77137],[14.11029,57.77142],[14.11821,57.77212],[14.11948,57.77253],[14.11984,57.77228],[14.1202,57.77226],[14.12248,57.77306],[14.12498,57.77351],[14.12594,57.77402],[14.12657,57.7749],[14.12701,57.77499],[14.12789,57.77482],[14.12895,57.77426],[14.1303,57.77262],[14.13094,57.77272],[14.13211,57.7721],[14.13482,57.77146],[14.13752,57.77121],[14.13837,57.77162],[14.14051,57.77395],[14.14137,57.77566],[14.14281,57.77677],[14.14719,57.77762],[14.15053,57.77858],[14.1516,57.77957],[14.1552,57.77892],[14.15628,57.78048],[14.15979,57.77981],[14.15992,57.78002]],"Rv70 Enköping→Mora":[[17.06988,59.63986],[17.07136,59.63949],[17.07468,59.63758],[17.0749,59.63728],[17.07521,59.63729],[17.07756,59.63886],[17.0797,59.64069],[17.08227,59.6443],[17.08277,59.64465],[17.08272,59.64505],[17.08472,59.64803],[17.08457,59.65045],[17.08329,59.6529],[17.08241,59.65337],[17.08027,59.65526],[17.07834,59.65809],[17.07843,59.65848],[17.07789,59.65878],[17.07279,59.66405],[17.06912,59.66649],[17.04599,59.6792],[17.04202,59.68202],[17.02358,59.69681],[17.02075,59.69866],[17.01719,59.70015],[17.01269,59.70128],[17.00976,59.7017],[16.99626,59.70268],[16.99259,59.70348],[16.99043,59.70418],[16.98725,59.70572],[16.97493,59.71435],[16.96203,59.72184],[16.96007,59.72336],[16.95857,59.72561],[16.95762,59.73278],[16.95431,59.73691],[16.94811,59.74656],[16.94631,59.74872],[16.94335,59.75115],[16.94034,59.753],[16.92689,59.75873],[16.91784,59.76369],[16.91588,59.76518],[16.91185,59.7696],[16.90947,59.77119],[16.90646,59.77226],[16.89872,59.77409],[16.88501,59.77494],[16.86114,59.77721],[16.85807,59.77769],[16.85446,59.77868],[16.84222,59.7826],[16.83422,59.78704],[16.83178,59.78885],[16.83019,59.79058],[16.82888,59.79145],[16.82319,59.79388],[16.81889,59.79623],[16.81436,59.79808],[16.81019,59.80035],[16.80853,59.80081],[16.80288,59.80178],[16.79915,59.8027],[16.79323,59.80531],[16.78527,59.81218],[16.77959,59.81655],[16.77807,59.81754],[16.77505,59.8189],[16.76765,59.82077],[16.72976,59.8267],[16.72676,59.82782],[16.71688,59.8334],[16.71383,59.83434],[16.71071,59.83455],[16.69729,59.83395],[16.69547,59.83408],[16.69388,59.83439],[16.6843,59.83728],[16.66709,59.84607],[16.65799,59.84929],[16.63824,59.85536],[16.63716,59.85615],[16.63125,59.8626],[16.63003,59.86466],[16.62687,59.87339],[16.62413,59.88686],[16.62327,59.888],[16.62278,59.88802],[16.62214,59.88761],[16.62141,59.88748],[16.61823,59.88785],[16.61435,59.88767],[16.6067,59.88769],[16.60296,59.88756],[16.59948,59.88725],[16.59186,59.88625],[16.58687,59.88588],[16.58183,59.88581],[16.5768,59.88606],[16.56987,59.88691],[16.56238,59.88838],[16.5619,59.88883],[16.55964,59.88916],[16.55333,59.89126],[16.54966,59.89282],[16.54629,59.89454],[16.5434,59.89628],[16.54085,59.89811],[16.53887,59.89988],[16.53703,59.90211],[16.52468,59.92697],[16.52348,59.9288],[16.52202,59.93042],[16.51649,59.93559],[16.51176,59.93965],[16.50583,59.94435],[16.50149,59.94739],[16.49905,59.9487],[16.49613,59.94998],[16.47637,59.95703],[16.47351,59.95844],[16.47087,59.96024],[16.46912,59.96192],[16.46781,59.96383],[16.4647,59.97258],[16.46257,59.97699],[16.46036,59.9807],[16.45744,59.98418],[16.45356,59.98727],[16.44969,59.98952],[16.44509,59.99155],[16.40902,60.00441],[16.40262,60.00724],[16.37968,60.01306],[16.37598,60.01427],[16.37391,60.01523],[16.34646,60.02984],[16.3446,60.03107],[16.34315,60.03275],[16.3424,60.03527],[16.34172,60.0402],[16.3421,60.04416],[16.34177,60.04631],[16.33736,60.05556],[16.33359,60.06229],[16.33214,60.06563],[16.32966,60.06901],[16.32589,60.07177],[16.32452,60.07324],[16.31797,60.08176],[16.3176,60.08295],[16.31774,60.08488],[16.31996,60.08859],[16.32052,60.09057],[16.32023,60.09223],[16.31938,60.09374],[16.31777,60.09566],[16.31547,60.09754],[16.30219,60.10469],[16.29983,60.10639],[16.29813,60.10831],[16.29489,60.11394],[16.29206,60.1176],[16.289,60.12063],[16.28366,60.12464],[16.27054,60.13219],[16.26806,60.13345],[16.26308,60.13558],[16.25576,60.13804],[16.23097,60.145],[16.22779,60.14611],[16.22019,60.14924],[16.21725,60.15027],[16.21234,60.15138],[16.2052,60.15212],[16.20356,60.15242],[16.20197,60.15284],[16.19805,60.15435],[16.19499,60.15501],[16.18934,60.15558],[16.1813,60.15568],[16.17695,60.156],[16.17211,60.15687],[16.16771,60.15828],[16.16422,60.15999],[16.14972,60.16818],[16.14482,60.17159],[16.14118,60.17467],[16.13523,60.17824],[16.12775,60.18316],[16.12309,60.18583],[16.11394,60.19174],[16.1029,60.19637],[16.09835,60.19883],[16.09645,60.19967],[16.08901,60.20204],[16.07603,60.20706],[16.06766,60.20949],[16.05594,60.21422],[16.05319,60.21579],[16.05125,60.21763],[16.04892,60.22123],[16.04667,60.22345],[16.04384,60.22536],[16.03873,60.22819],[16.03715,60.22932],[16.0352,60.23109],[16.02713,60.24216],[16.0182,60.25025],[16.01664,60.2524],[16.01581,60.2542],[16.01463,60.26024],[16.01383,60.26181],[16.01285,60.26278],[16.00539,60.26862],[16.00348,60.27041],[15.99632,60.28109],[15.99414,60.28358],[15.99409,60.28411],[15.99295,60.28451],[15.99146,60.28536],[15.9882,60.2874],[15.98673,60.28855],[15.97954,60.29636],[15.97964,60.29805],[15.97792,60.30183],[15.97257,60.30814],[15.97033,60.31006],[15.96395,60.31412],[15.95237,60.32403],[15.95096,60.32598],[15.94929,60.33012],[15.94586,60.33376],[15.94502,60.33514],[15.94469,60.33738],[15.94582,60.3409],[15.9458,60.34283],[15.94502,60.3456],[15.94361,60.34788],[15.93732,60.35492],[15.93187,60.35913],[15.93011,60.36078],[15.9262,60.36515],[15.9223,60.36836],[15.91345,60.37735],[15.90693,60.38355],[15.90294,60.38836],[15.90166,60.38942],[15.89995,60.39044],[15.88841,60.3959],[15.88037,60.39816],[15.87857,60.39894],[15.87582,60.40061],[15.87244,60.40415],[15.87009,60.40567],[15.8626,60.40835],[15.8583,60.41061],[15.85093,60.41365],[15.84934,60.41458],[15.84828,60.41586],[15.84699,60.41947],[15.84596,60.42108],[15.84145,60.42347],[15.83371,60.42855],[15.83291,60.42928],[15.8304,60.43256],[15.82923,60.43349],[15.82423,60.43586],[15.81973,60.43886],[15.81431,60.44127],[15.81275,60.44219],[15.81077,60.44398],[15.80808,60.44775],[15.80584,60.45523],[15.79937,60.46417],[15.79785,60.46832],[15.79614,60.47044],[15.79409,60.47189],[15.79175,60.47316],[15.78985,60.47392],[15.78535,60.47529],[15.78322,60.47623],[15.77328,60.48231],[15.7702,60.48468],[15.76591,60.48892],[15.75848,60.49516],[15.75511,60.49704],[15.74875,60.4995],[15.74518,60.50129],[15.74195,60.50347],[15.73881,60.5066],[15.73756,60.50886],[15.7346,60.51805],[15.7344,60.5219],[15.73496,60.5232],[15.73668,60.52453],[15.74433,60.52796],[15.74524,60.52851],[15.74644,60.52971],[15.75079,60.5358],[15.75616,60.54001],[15.76279,60.54334],[15.76952,60.54785],[15.77386,60.55001],[15.77525,60.55103],[15.77608,60.55223],[15.77721,60.55732],[15.77784,60.56292],[15.77781,60.56478],[15.77743,60.56584],[15.77266,60.57322],[15.77229,60.57467],[15.77241,60.57632],[15.77405,60.57995],[15.77415,60.58124],[15.77333,60.58301],[15.77091,60.58522],[15.77069,60.5864],[15.7703,60.58676],[15.76941,60.58691],[15.76806,60.5867],[15.76394,60.58774],[15.75994,60.58932],[15.75472,60.59209],[15.75338,60.59257],[15.75102,60.59296],[15.74894,60.59296],[15.73394,60.5919],[15.71942,60.5895],[15.7172,60.58939],[15.7161,60.5892],[15.70964,60.58951],[15.70522,60.59018],[15.70269,60.59099],[15.69826,60.59298],[15.69675,60.5941],[15.69425,60.59676],[15.69204,60.59801],[15.69012,60.59863],[15.67844,60.60153],[15.67686,60.60217],[15.67369,60.604],[15.67239,60.60454],[15.6658,60.606],[15.66136,60.60755],[15.65884,60.60825],[15.65538,60.6096],[15.65339,60.61102],[15.65264,60.61186],[15.65268,60.61214],[15.6518,60.61283],[15.64799,60.61875],[15.64799,60.61931],[15.64505,60.62194],[15.64357,60.62283],[15.64082,60.62402],[15.62775,60.62754],[15.62258,60.62879],[15.62125,60.62893],[15.61885,60.62882],[15.61593,60.6281],[15.6145,60.62755],[15.61256,60.62613],[15.61196,60.62598],[15.60773,60.62679],[15.6028,60.62865],[15.59907,60.62969],[15.5966,60.6306],[15.5937,60.63227],[15.59022,60.63511],[15.58806,60.63652],[15.57619,60.64204],[15.56881,60.6468],[15.55833,60.65248],[15.55606,60.65435],[15.55277,60.65803],[15.54809,60.6621],[15.54344,60.66693],[15.54075,60.66878],[15.53814,60.66976],[15.53411,60.67083],[15.53178,60.67107],[15.5251,60.67108],[15.518,60.67186],[15.51499,60.6725],[15.51275,60.67353],[15.51165,60.67446],[15.50647,60.68039],[15.50249,60.68298],[15.49776,60.68574],[15.49392,60.68833],[15.48965,60.69014],[15.48876,60.69067],[15.48459,60.6945],[15.48188,60.69644],[15.48039,60.6985],[15.47941,60.69935],[15.47804,60.70012],[15.4696,60.70348],[15.46667,60.70526],[15.46496,60.70703],[15.45926,60.71622],[15.45762,60.71829],[15.45575,60.71958],[15.4519,60.72119],[15.44927,60.72286],[15.44831,60.72377],[15.446,60.72724],[15.44131,60.73071],[15.4374,60.73471],[15.43578,60.73574],[15.43073,60.73826],[15.42776,60.7395],[15.42487,60.7401],[15.40658,60.74135],[15.38391,60.74464],[15.37351,60.74542],[15.36772,60.7463],[15.35635,60.74894],[15.35338,60.74984],[15.35039,60.75102],[15.3391,60.75629],[15.33614,60.75751],[15.33161,60.75899],[15.32499,60.76073],[15.32168,60.76213],[15.32019,60.76325],[15.31905,60.76472],[15.31707,60.77127],[15.31614,60.77643],[15.31428,60.77968],[15.3123,60.78162],[15.30971,60.78309],[15.30604,60.78415],[15.29443,60.78548],[15.29041,60.78617],[15.28764,60.78683],[15.28501,60.78757],[15.28277,60.78849],[15.28093,60.78956],[15.27453,60.79457],[15.26999,60.79881],[15.26627,60.80123],[15.26434,60.803],[15.26303,60.8057],[15.25844,60.81757],[15.25776,60.81898],[15.25649,60.8206],[15.25428,60.82235],[15.2378,60.8319],[15.23364,60.83374],[15.22291,60.83696],[15.21557,60.83891],[15.18851,60.84345],[15.18187,60.84431],[15.16504,60.84544],[15.15535,60.84582],[15.14966,60.84568],[15.14686,60.84547],[15.12936,60.84345],[15.12691,60.84329],[15.12346,60.84329],[15.12231,60.84347],[15.1208,60.84399],[15.11931,60.84508],[15.11429,60.85014],[15.1067,60.85866],[15.10492,60.85972],[15.10334,60.86016],[15.10207,60.86026],[15.10036,60.86625],[15.10047,60.86807],[15.101,60.86964],[15.10207,60.87132],[15.1035,60.87281],[15.10465,60.87366],[15.10666,60.87469],[15.11601,60.87856],[15.11818,60.87999],[15.11839,60.88216],[15.11659,60.88569],[15.11562,60.88617],[15.11376,60.88763],[15.11308,60.88786],[15.11095,60.88935],[15.11065,60.88985],[15.10806,60.89172],[15.10646,60.89256],[15.09938,60.89516],[15.08725,60.89818],[15.07589,60.90208],[15.07395,60.90283],[15.06741,60.90609],[15.06517,60.90681],[15.061,60.90783],[15.05869,60.90866],[15.05644,60.90987],[15.05377,60.91175],[15.05108,60.91293],[15.04866,60.91361],[15.047,60.9139],[15.04391,60.9142],[15.04196,60.91421],[15.02162,60.91244],[15.01057,60.9103],[15.00582,60.9088],[14.99334,60.90591],[14.99048,60.90538],[14.98737,60.90505],[14.98199,60.9051],[14.97136,60.90662],[14.96737,60.90686],[14.96361,60.90658],[14.95254,60.90475],[14.94752,60.90469],[14.94276,60.90532],[14.8992,60.91202],[14.88607,60.91519],[14.87483,60.91677],[14.86251,60.91982],[14.86007,60.92016],[14.84631,60.92144],[14.82874,60.9218],[14.82629,60.922],[14.7911,60.93043],[14.7596,60.93646],[14.75715,60.937],[14.75455,60.93785],[14.75234,60.93883],[14.75033,60.94015],[14.73094,60.95454],[14.70896,60.9633],[14.69822,60.9725],[14.69226,60.97906],[14.68879,60.98239],[14.68653,60.98506],[14.68468,60.98635],[14.68234,60.98743],[14.68058,60.98801],[14.65668,60.99403],[14.65352,60.99524],[14.64806,60.99805],[14.63034,61.00514],[14.62774,61.006],[14.62263,61.00703],[14.61983,61.0073],[14.60769,61.00743],[14.6066,61.00767],[14.60519,61.00753],[14.60306,61.00769],[14.59079,61.00933],[14.58947,61.0097],[14.58783,61.00945],[14.57528,61.00967],[14.56461,61.00924],[14.55723,61.00961],[14.55669,61.00975],[14.55355,61.00982],[14.55142,61.00965],[14.55066,61.00981],[14.55029,61.00969],[14.54978,61.00895],[14.54547,61.00672],[14.54433,61.00648],[14.54026,61.00363],[14.53901,61.00333],[14.53954,61.0028],[14.53928,61.00147],[14.53967,61.00128],[14.54035,61.00009]],"Väg 19 Ystad→Kristianstad":[[13.82005,55.43001],[13.81906,55.43059],[13.81881,55.43167],[13.81813,55.43251],[13.81819,55.43274],[13.82109,55.4343],[13.82398,55.43659],[13.82932,55.44029],[13.83333,55.44236],[13.83503,55.44285],[13.83545,55.44357],[13.83627,55.44414],[13.84145,55.44701],[13.8482,55.45238],[13.85107,55.45593],[13.8564,55.45984],[13.87938,55.47233],[13.88092,55.4735],[13.88218,55.4749],[13.88306,55.47658],[13.88553,55.4836],[13.88697,55.48686],[13.88785,55.48836],[13.88994,55.48992],[13.89352,55.4934],[13.89398,55.49425],[13.89418,55.49676],[13.89528,55.4993],[13.89617,55.50094],[13.90249,55.51028],[13.90303,55.51187],[13.90297,55.51504],[13.90466,55.51736],[13.90592,55.52016],[13.90546,55.52271],[13.90647,55.52589],[13.90718,55.52709],[13.91015,55.52952],[13.91373,55.53566],[13.91402,55.53727],[13.9137,55.54117],[13.9124,55.54616],[13.91301,55.55146],[13.91291,55.556],[13.91416,55.55955],[13.91498,55.55989],[13.91474,55.5611],[13.91497,55.5617],[13.91631,55.56357],[13.92469,55.57072],[13.92752,55.57238],[13.9462,55.5803],[13.94934,55.58109],[13.95757,55.58207],[13.96102,55.583],[13.96249,55.5836],[13.97604,55.59069],[13.98345,55.5933],[13.98558,55.59453],[13.98689,55.59567],[13.99005,55.60006],[13.99213,55.60523],[13.99589,55.61321],[14.00171,55.62284],[14.00194,55.62413],[14.00143,55.62695],[14.0015,55.62962],[14.00396,55.63674],[14.00446,55.63981],[14.00557,55.64168],[14.00912,55.64466],[14.0132,55.64706],[14.0288,55.65312],[14.03147,55.65484],[14.03287,55.65667],[14.0333,55.65867],[14.03181,55.66958],[14.03145,55.68068],[14.03203,55.68244],[14.03886,55.69373],[14.04013,55.69827],[14.04185,55.7004],[14.04452,55.70232],[14.05941,55.70836],[14.06515,55.70991],[14.07567,55.7116],[14.07807,55.71211],[14.08238,55.71358],[14.08439,55.71452],[14.08983,55.71783],[14.09166,55.71952],[14.09279,55.72142],[14.0935,55.72399],[14.09429,55.72562],[14.09519,55.72681],[14.09726,55.72839],[14.09882,55.72926],[14.10095,55.73015],[14.11166,55.73345],[14.11566,55.73489],[14.1235,55.73787],[14.12599,55.73915],[14.12864,55.74112],[14.13582,55.74729],[14.13781,55.74952],[14.13888,55.75118],[14.13981,55.75301],[14.1404,55.75482],[14.14217,55.76217],[14.14248,55.76439],[14.14205,55.76837],[14.13909,55.778],[14.13899,55.78077],[14.13921,55.78245],[14.13983,55.78444],[14.14097,55.78685],[14.14581,55.79372],[14.14736,55.79631],[14.14855,55.7997],[14.14834,55.80263],[14.14729,55.80438],[14.14594,55.80573],[14.1364,55.81264],[14.12842,55.81747],[14.11317,55.82317],[14.11097,55.82371],[14.107,55.82432],[14.10276,55.82544],[14.09735,55.82651],[14.0927,55.82847],[14.09097,55.82955],[14.08948,55.83077],[14.08931,55.83155],[14.09055,55.83414],[14.09011,55.83678],[14.09043,55.84137],[14.09107,55.84179],[14.0942,55.84274],[14.09582,55.84389],[14.09628,55.84523],[14.09594,55.84921],[14.09173,55.85795],[14.09112,55.86199],[14.08909,55.86725],[14.0889,55.86916],[14.0892,55.87419],[14.08679,55.87929],[14.0874,55.8864],[14.08609,55.8897],[14.08486,55.89205],[14.08354,55.89331],[14.07943,55.89542],[14.07473,55.89678],[14.07329,55.89736],[14.07207,55.89812],[14.07143,55.89877],[14.07078,55.89993],[14.07071,55.90132],[14.07228,55.90461],[14.07299,55.90688],[14.07278,55.91654],[14.07528,55.93291],[14.07479,55.93435],[14.06775,55.94554],[14.06442,55.9496],[14.06267,55.95119],[14.07155,55.96464],[14.0843,55.97832],[14.08875,55.98409],[14.09654,55.99575],[14.0982,55.99789],[14.10101,56.00085],[14.11362,56.01253],[14.1149,56.01401],[14.11673,56.0169],[14.11809,56.01745],[14.11968,56.01755],[14.12944,56.01656],[14.13667,56.01643],[14.14305,56.01682],[14.15122,56.01768],[14.16253,56.01813],[14.16812,56.01878],[14.16982,56.01874],[14.17181,56.01834],[14.17248,56.01834],[14.17316,56.0186],[14.17342,56.01905],[14.1719,56.02347],[14.17223,56.02393],[14.17208,56.02425],[14.17136,56.02434],[14.17086,56.02357],[14.16792,56.02308],[14.16398,56.02156],[14.16498,56.02078],[14.1636,56.02023],[14.15999,56.02007]],"Väg 23 Höör→Osby":[[13.54047,55.94015],[13.5409,55.93974],[13.54389,55.94038],[13.54475,55.9393],[13.54656,55.94017],[13.54956,55.93882],[13.55287,55.94039],[13.55628,55.94244],[13.5583,55.94309],[13.5603,55.94337],[13.56039,55.94595],[13.55941,55.94823],[13.55946,55.94956],[13.56008,55.95049],[13.56149,55.95159],[13.56202,55.95174],[13.56368,55.95326],[13.56778,55.95803],[13.57142,55.96053],[13.5733,55.9623],[13.58002,55.96727],[13.58602,55.97077],[13.59136,55.97432],[13.59342,55.97599],[13.59575,55.97838],[13.59819,55.98015],[13.6037,55.98349],[13.60553,55.9843],[13.60829,55.98512],[13.61429,55.98658],[13.62536,55.99067],[13.62766,55.99165],[13.62906,55.99245],[13.63662,55.99735],[13.64501,56.00199],[13.6487,56.00467],[13.66008,56.0117],[13.66247,56.01305],[13.66791,56.01567],[13.66938,56.01663],[13.67048,56.01756],[13.67159,56.01889],[13.67593,56.02618],[13.67747,56.02773],[13.67931,56.02911],[13.69121,56.03599],[13.70651,56.0438],[13.71609,56.04994],[13.73088,56.05841],[13.73294,56.05986],[13.73505,56.06209],[13.73789,56.06704],[13.74235,56.07123],[13.74672,56.0762],[13.75309,56.08145],[13.75486,56.08258],[13.75695,56.08348],[13.76257,56.08519],[13.76465,56.08628],[13.77063,56.0932],[13.7753,56.09776],[13.7781,56.10087],[13.77933,56.10244],[13.78066,56.10519],[13.78132,56.10608],[13.78251,56.10712],[13.78606,56.10945],[13.78688,56.11032],[13.78904,56.11554],[13.79075,56.11728],[13.79596,56.12162],[13.79771,56.12365],[13.79889,56.12633],[13.79929,56.13184],[13.79971,56.13337],[13.80271,56.13795],[13.80392,56.14514],[13.80495,56.14691],[13.80774,56.15026],[13.80883,56.15127],[13.82164,56.1605],[13.82937,56.16721],[13.83093,56.16801],[13.83333,56.16876],[13.83458,56.16933],[13.83519,56.17012],[13.83783,56.17116],[13.83931,56.17216],[13.84015,56.1732],[13.84129,56.17551],[13.84609,56.18782],[13.84806,56.19106],[13.85001,56.19354],[13.85235,56.196],[13.85505,56.19841],[13.86579,56.20645],[13.87386,56.213],[13.87915,56.21837],[13.88525,56.22609],[13.88686,56.22753],[13.89719,56.23459],[13.91005,56.24453],[13.91283,56.24585],[13.92524,56.24988],[13.928,56.25092],[13.93143,56.25252],[13.93441,56.25423],[13.93655,56.25574],[13.93897,56.25781],[13.94918,56.2685],[13.95158,56.27025],[13.95353,56.27134],[13.96126,56.2748],[13.96834,56.27735],[13.97295,56.27841],[13.98185,56.27969],[13.98694,56.28112],[13.99031,56.28255],[13.99657,56.28603],[14.00187,56.28819],[14.005,56.28968],[14.00644,56.29045],[14.00731,56.29114],[14.00784,56.29209],[14.00761,56.29291],[14.0071,56.29343],[14.00463,56.29496],[14.0041,56.29624],[14.00444,56.29785],[14.00606,56.3009],[14.00665,56.30281],[14.00766,56.31734],[14.00866,56.322],[14.01069,56.32896],[14.01093,56.33509],[14.01178,56.34151],[14.01157,56.34345],[14.01023,56.34889],[14.01016,56.35049],[14.01062,56.35176],[14.01411,56.35837],[14.01609,56.36088],[14.01881,56.36304],[14.02563,56.36703],[14.02628,56.36711],[14.02648,56.36733],[14.02505,56.36779],[14.02025,56.36996],[14.01116,56.37468],[14.00742,56.37682],[14.0047,56.37776],[13.99903,56.37923],[13.9982,56.37978],[13.99458,56.37868],[13.9939,56.3787],[13.98187,56.38194],[13.98002,56.38003]]};

// ═══ supabase/functions/skuggmotor/main.ts ═══
// ═══ Skuggmotorn (#20, Bengts design): kör motorn mot färska snapshoten på fasta
// referensrutter var 30:e min och loggar vad den SKULLE ha sagt — varningslogg
// med indata oavsett användarantal. Vid varning: arkivera närmaste väglags-
// kamerabild (facit-hinken, dedupe per station & 3 h). Rör aldrig användare.
// Land (#34): ?land=fi kör de finska rutterna mot den finska snapshoten. Samma motor,
// samma logg (kolumnen land), samma rapport. Sverige är standard.
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;
// Sverige ur hinken, som appen läser först (DECISIONS #752): med servicenyckeln inifrån Supabase och utan CDN:ens cache, som
// funktionen favoriter (#741 tillägget 30/10). Grannländerna finns bara på Pages.
const CDN_BY_LAND: Record<string, string> = {
  se: `${SB}/storage/v1/object/app/v1/`,
  fi: "https://axelstar.github.io/halkvakt-karta/data/app/fi/v1/",
  no: "https://axelstar.github.io/halkvakt-karta/data/app/no/v1/",   // #35, publiceras när Vegvesen-kontot finns
  dk: "https://axelstar.github.io/halkvakt-karta/data/app/dk/v1/",   // #36
};
/** Ett lands static.json och live.json. Ett fel bär svarets status och kropp. */
function snapshot(land: string): Promise<[any, any]> {
  const hamta = (namn: string) => fetch(CDN_BY_LAND[land] + namn + (land === "se" ? "" : `?t=${Date.now()}`),
    land === "se" ? { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } } : undefined).then(async (r) => {
      if (!r.ok) throw new Error(`${land} ${namn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.json();
    });
  return Promise.all([hamta("static.json"), hamta("live.json")]);
}

// Grova men FASTA referenslinjer (jämförbarhet över tid slår metern):
// Finland (#34): tre referenslinjer, samma grovhet som de svenska. Fejkresorna.
const ROUTES_FI: Record<string, [number, number][]> = {
  // Söder: E18-stråket och kusten
  "E18 Åbo→Helsingfors":        [[22.27,60.45],[22.60,60.43],[23.13,60.40],[23.60,60.38],[24.05,60.32],[24.50,60.24],[24.94,60.17]],
  "E18 Helsingfors→Kotka":      [[24.94,60.17],[25.30,60.27],[25.66,60.39],[26.23,60.46],[26.95,60.47]],
  "E18 Kotka→Vaalimaa":         [[26.95,60.47],[27.20,60.57],[27.55,60.58],[27.85,60.58]],
  "Rv2 Helsingfors→Björneborg": [[24.94,60.17],[24.32,60.33],[23.62,60.81],[23.10,61.02],[22.70,61.18],[21.80,61.49]],
  "Rv8 Åbo→Björneborg":         [[22.27,60.45],[21.98,60.68],[21.69,60.88],[21.51,61.13],[21.80,61.49]],
  // Mitten: vt3, vt4, vt9, vt5
  "Rv3 Helsingfors→Tammerfors": [[24.94,60.17],[24.86,60.63],[24.46,61.00],[23.95,61.27],[23.76,61.50]],
  "Rv3 Tammerfors→Vasa":        [[23.76,61.50],[23.30,61.75],[23.02,62.01],[22.75,62.49],[22.01,62.98],[21.62,63.10]],
  "E75 Helsingfors→Lahtis":     [[24.94,60.17],[25.03,60.36],[25.12,60.52],[25.30,60.70],[25.50,60.85],[25.66,60.98]],
  "E75 Lahtis→Jyväskylä":       [[25.66,60.98],[26.03,61.21],[25.95,61.60],[25.85,61.95],[25.75,62.24]],
  "Rv9 Tammerfors→Jyväskylä":   [[23.76,61.50],[24.36,61.68],[25.19,61.86],[25.75,62.24]],
  "Rv9 Jyväskylä→Kuopio":       [[25.75,62.24],[26.43,62.39],[27.12,62.62],[27.68,62.89]],
  "Rv5 Lahtis→Kuopio":          [[25.66,60.98],[26.03,61.21],[26.70,61.45],[27.27,61.69],[27.87,62.31],[27.68,62.89]],
  "Rv6 Kouvola→Joensuu":        [[26.70,60.87],[27.60,61.00],[28.19,61.06],[28.77,61.17],[29.50,61.55],[29.76,62.60]],
  // Norr: vt4-stråket, kusten, fjällvägarna
  "E75 Jyväskylä→Uleåborg":     [[25.75,62.24],[25.73,62.60],[25.86,63.07],[25.57,63.37],[25.85,63.68],[25.75,63.98],[25.87,64.27],[25.47,65.01]],
  "Rv8 Björneborg→Vasa":        [[21.80,61.49],[21.51,61.86],[21.37,62.27],[21.34,62.47],[21.62,63.10]],
  "Rv8 Vasa→Uleåborg":          [[21.62,63.10],[22.20,63.35],[22.70,63.55],[23.15,63.80],[23.80,64.05],[24.45,64.40],[25.05,64.75],[25.47,65.01]],
  "Rv5 Kuopio→Kajaani":         [[27.68,62.89],[27.66,63.08],[27.19,63.56],[27.50,63.90],[27.73,64.22]],
  "E75 Uleåborg→Rovaniemi":     [[25.47,65.01],[25.37,65.32],[25.05,65.66],[24.56,65.74],[25.00,66.10],[25.73,66.50]],
  "Rv20 Uleåborg→Kuusamo":      [[25.47,65.01],[26.20,65.20],[26.99,65.36],[28.24,65.57],[29.19,65.96]],
  "E8 Torneå→Kilpisjärvi":      [[24.15,65.85],[23.97,66.78],[23.79,67.33],[23.68,67.96],[22.50,68.50],[20.79,69.05]],
};

// Norge (#35): tjugo referenslinjer. Väntar på Vegvesens DATEX-konto; rutterna är klara.
const ROUTES_NO: Record<string, [number, number][]> = {
  "E6 Oslo→Lillehammer":        [[10.75,59.91],[11.03,60.20],[11.17,60.60],[10.93,60.80],[10.69,61.11]],
  "E6 Lillehammer→Dombås":      [[10.69,61.11],[10.48,61.50],[9.70,61.87],[9.13,62.08]],
  "E6 Dombås→Trondheim":        [[9.13,62.08],[9.55,62.35],[9.96,62.58],[10.15,63.00],[10.40,63.43]],
  "E6 Trondheim→Mo i Rana":     [[10.40,63.43],[11.30,63.85],[11.99,64.33],[12.65,64.90],[13.20,65.50],[14.14,66.31]],
  "E6 Mo i Rana→Narvik":        [[14.14,66.31],[15.40,66.95],[15.35,67.25],[16.03,67.70],[16.55,68.10],[17.43,68.44]],
  "E6 Narvik→Alta":             [[17.43,68.44],[18.96,68.85],[19.85,69.30],[20.90,69.60],[22.20,69.70],[23.27,69.97]],
  "E6 Alta→Kirkenes":           [[23.27,69.97],[24.90,70.20],[26.00,70.05],[27.60,70.05],[29.00,69.90],[30.05,69.73]],
  "E18 Oslo→Kristiansand":      [[10.75,59.91],[10.40,59.60],[10.03,59.27],[9.60,59.15],[9.10,58.98],[8.60,58.70],[8.00,58.15]],
  "E39 Kristiansand→Stavanger": [[8.00,58.15],[7.45,58.15],[7.10,58.35],[6.55,58.70],[5.75,58.97]],
  "E39 Stavanger→Bergen":       [[5.75,58.97],[5.75,59.30],[5.65,59.60],[5.55,59.90],[5.35,60.25],[5.33,60.39]],
  "E39 Bergen→Ålesund":         [[5.33,60.39],[5.60,60.85],[5.80,61.20],[6.10,61.50],[6.40,61.80],[6.20,62.20],[6.15,62.47]],
  "E39 Ålesund→Trondheim":      [[6.15,62.47],[6.80,62.55],[7.50,62.90],[8.05,63.05],[9.10,63.10],[10.40,63.43]],
  "E16 Oslo→Bergen":            [[10.75,59.91],[10.30,60.10],[9.80,60.55],[9.10,60.90],[8.20,61.15],[7.40,61.05],[6.70,60.90],[5.90,60.55],[5.33,60.39]],
  "Rv7 Hønefoss→Bergen":        [[10.25,60.17],[9.60,60.50],[8.80,60.55],[8.00,60.42],[7.50,60.45],[7.00,60.50],[6.40,60.45],[5.33,60.39]],
  "E134 Drammen→Haugesund":     [[10.20,59.74],[9.60,59.60],[8.90,59.60],[8.10,59.80],[7.35,59.85],[6.60,59.75],[5.85,59.55],[5.27,59.41]],
  "Rv3 Elverum→Ulsberg":        [[11.56,60.88],[11.20,61.50],[10.80,61.90],[10.45,62.30],[10.05,62.75]],
  "E14 Trondheim→Storlien":     [[10.40,63.43],[11.10,63.32],[11.60,63.30],[12.08,63.30]],
  "E10 Narvik→Å i Lofoten":     [[17.43,68.44],[16.70,68.50],[15.90,68.60],[15.00,68.55],[14.20,68.30],[13.60,68.15],[13.00,67.95]],
  "E8 Skibotn→Kilpisjärvi":     [[20.28,69.39],[20.50,69.20],[20.60,69.10],[20.79,69.05]],
  "Rv15 Otta→Stryn":            [[9.53,61.77],[8.90,61.90],[8.20,62.00],[7.60,62.00],[6.72,61.91]],
};

// Danmark (#36): tjugo referenslinjer — motorvägsnätet + Limfjorden, Bornholm, öarna.
const ROUTES_DK: Record<string, [number, number][]> = {
  "E45 Padborg→Kolding":          [[9.36,54.82],[9.42,55.04],[9.50,55.25],[9.47,55.49]],
  "E45 Kolding→Aarhus":           [[9.47,55.49],[9.75,55.57],[9.54,55.71],[9.85,55.86],[10.05,56.00],[10.20,56.16]],
  "E45 Aarhus→Aalborg":           [[10.20,56.16],[10.04,56.46],[9.85,56.65],[9.73,56.90],[9.92,57.05]],
  "E45 Aalborg→Frederikshavn":    [[9.92,57.05],[10.10,57.20],[10.30,57.35],[10.54,57.44]],
  "E39 Aalborg→Hirtshals":        [[9.92,57.05],[9.90,57.30],[9.96,57.59]],
  "E20 Esbjerg→Kolding":          [[8.45,55.47],[8.90,55.50],[9.20,55.50],[9.47,55.49]],
  "E20 Kolding→Odense":           [[9.47,55.49],[9.75,55.57],[10.05,55.48],[10.39,55.40]],
  "E20 Odense→Storebælt→Slagelse":[[10.39,55.40],[10.79,55.31],[11.00,55.33],[11.14,55.33],[11.35,55.40]],
  "E20 Slagelse→København":       [[11.35,55.40],[11.75,55.45],[12.08,55.55],[12.45,55.63],[12.57,55.68]],
  "E47 København→Rødby":          [[12.57,55.68],[12.18,55.46],[11.98,55.25],[11.87,54.77],[11.39,54.66]],
  "E47 København→Helsingør":      [[12.57,55.68],[12.50,55.80],[12.55,55.92],[12.61,56.03]],
  "Rv21 København→Kalundborg":    [[12.57,55.68],[12.08,55.64],[11.70,55.65],[11.40,55.68],[11.09,55.68]],
  "Rv16 København→Hillerød":      [[12.57,55.68],[12.45,55.78],[12.31,55.93]],
  "Rv15 Aarhus→Grenaa":           [[10.20,56.16],[10.45,56.25],[10.70,56.35],[10.88,56.41]],
  "Rv15 Aarhus→Herning":          [[10.20,56.16],[9.85,56.15],[9.55,56.17],[8.98,56.14]],
  "Rv13 Vejle→Viborg":            [[9.54,55.71],[9.50,56.00],[9.40,56.25],[9.40,56.45]],
  "Rv26 Aarhus→Viborg→Skive":     [[10.20,56.16],[9.80,56.30],[9.40,56.45],[9.03,56.57]],
  "Rv11 Holstebro→Thisted":       [[8.62,56.36],[8.55,56.65],[8.62,56.85],[8.69,56.95]],
  "E20 Esbjerg→Ribe→Padborg":     [[8.45,55.47],[8.77,55.33],[9.10,55.10],[9.36,54.82]],
  "Rv38 Rønne→Nexø (Bornholm)":   [[14.70,55.10],[14.85,55.10],[15.00,55.08],[15.13,55.06]],
};

const ROUTES: Record<string, [number, number][]> = {
  "E22 Malmö→Kristianstad": [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
  "Väg 23 Höör→Osby":       [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
  "Väg 19 Ystad→Kristianstad": [[13.82,55.43],[13.87,55.50],[13.95,55.55],[14.02,55.63],[14.10,55.72],[14.13,55.82],[14.15,55.92],[14.16,56.02]],
  "E6 Malmö→Halmstad": [[12.99,55.61],[12.83,55.87],[12.70,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],
  "E6 Halmstad→Göteborg": [[12.86,56.67],[12.49,56.90],[12.25,57.11],[12.08,57.49],[11.97,57.71]],
  "E6 Göteborg→Strömstad": [[11.97,57.71],[11.98,57.87],[11.82,58.07],[11.94,58.35],[11.68,58.47],[11.32,58.72],[11.17,58.94]],
  "Rv40 Göteborg→Jönköping": [[11.97,57.71],[12.22,57.68],[12.94,57.72],[13.42,57.79],[14.16,57.78]],
  "E4 Helsingborg→Jönköping": [[12.70,56.05],[13.28,56.28],[13.60,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],
  "E4 Jönköping→Linköping": [[14.16,57.78],[14.47,58.02],[14.65,58.23],[15.13,58.32],[15.62,58.41]],
  "E4 Linköping→Södertälje": [[15.62,58.41],[16.19,58.59],[17.01,58.75],[17.63,59.20]],
  "E4 Södertälje→Uppsala": [[17.63,59.20],[18.07,59.33],[17.92,59.65],[17.64,59.86]],
  "E4 Uppsala→Gävle": [[17.64,59.86],[17.51,60.34],[17.14,60.67]],
  "E4 Gävle→Sundsvall": [[17.14,60.67],[17.06,61.30],[17.11,61.73],[17.31,62.39]],
  "E4 Sundsvall→Umeå": [[17.31,62.39],[17.94,62.63],[18.72,63.29],[19.50,63.57],[20.26,63.83]],
  "E4 Umeå→Luleå": [[20.26,63.83],[21.06,64.75],[21.48,65.32],[22.15,65.58]],
  "E10 Luleå→Kiruna": [[22.15,65.58],[21.69,65.83],[20.66,67.13],[20.23,67.86]],
  "E14 Sundsvall→Åre": [[17.31,62.39],[15.66,62.53],[15.42,62.75],[14.64,63.18],[13.08,63.40]],
  "E18 Karlstad→Örebro": [[13.50,59.38],[14.11,59.31],[14.52,59.33],[15.21,59.27]],
  "E18 Örebro→Stockholm": [[15.21,59.27],[15.84,59.39],[16.55,59.61],[17.07,59.64],[18.07,59.33]],
  "Rv70 Enköping→Mora": [[17.07,59.64],[16.60,59.92],[16.17,60.15],[15.98,60.28],[15.43,60.48],[15.13,60.55],[14.99,60.73],[15.12,60.89],[14.54,61.00]],
};

// VÄG C (DECISIONS #527, Bengts "gör denna" 11/10): rutter genom stationerna där efterhalkans fall och de frysnära halvtimmarna
// låg (läsningen 38128801752: av 236 fall låg 7 % inom 2 km från en rutt i ROUTES, av de kalla halvtimmarna 2 %). Varje rutt är
// en KEDJA AV STATIONER i körordning, raka sträckor emellan som i ROUTES — inte vägens geometri, och namnen är stationernas.
// Eget anrop (`?grupp=c`, :22/:52) och egen tabell (shadow_log_c): ROUTES, dess takt och mätningarna som läser den rörs inte
// (lasRutter i publish/skuggfacit.ts läser bara ROUTES). Bara larmen loggas: ingen prognos, ingen efterhalka, inga facitbilder.
const ROUTES_C: Record<string, [number, number][]> = {
  "C Värmland: Eda→Mångsbodarna": [[12.275,59.911],[12.623,60.020],[12.609,60.209],[12.615,60.385],[12.704,60.654],[13.114,61.158],[13.620,61.079]],
  "C Klarälvdalen: S Berga→Ruskåsen": [[13.134,59.726],[13.403,59.867],[13.253,60.207],[13.172,60.354]],
  "C Bergslagen: Gumhöjden→Gruvorna": [[13.909,60.022],[14.176,60.113],[14.200,60.327],[13.956,60.501],[14.334,60.860]],
  "C Ludvika: Basttjärn→Mårtanberg": [[14.979,60.025],[14.523,60.160],[14.674,60.467],[15.253,60.823]],
  "C Orsa finnmark: Lillhärdal→Gruvberget": [[14.040,61.843],[14.798,61.388],[15.135,61.167],[15.796,61.071],[16.177,61.132]],
  "C Norrlandskusten: Hammarbacken→Bönhamn": [[17.185,61.900],[17.277,62.078],[17.370,62.195],[17.453,62.517],[17.847,62.686],[18.446,62.876]],
  "C Fjällen: Blåsjöfjället→Kåtaviken": [[14.040,64.772],[15.379,64.968],[14.815,65.422],[15.095,66.010],[14.805,66.118]],
  "C Kiruna: Nikkaluokta→Riksgränsen": [[19.027,67.860],[20.294,67.856],[19.782,68.148],[18.575,68.434],[18.269,68.430],[18.116,68.433]],
  "C Lule lappmark: Porjus→Stora Sjöfallet": [[19.821,66.960],[18.367,67.474]],
  "C Tornedalen: Limingojärvi→Kätkesuando": [[22.899,66.689],[23.482,67.442],[23.311,68.120]],
};

function traceAlong(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

async function trvCameras(): Promise<{ id: string; lon: number; lat: number; url: string }[]> {
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="Camera" schemaversion="1" limit="1500"><FILTER><EQ name="Type" value="Väglagskamera"/></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
    method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const j = await r.json();
  const rows = j?.RESPONSE?.RESULT?.[0]?.Camera ?? [];
  return rows.flatMap((c: any) => {
    const m = /POINT \(([\d.]+) ([\d.]+)\)/.exec(c?.Geometry?.WGS84 ?? "");
    return m && c.PhotoUrl ? [{ id: String(c.Id), lon: +m[1], lat: +m[2], url: c.PhotoUrl }] : [];
  });
}

// FACITARKIVERINGEN — rättad 14/9 (kort #157, DECISIONS #172/#173, Bengts order).
//
// VAD SOM VAR FEL: bucketen `facit` innehöll NOLL objekt efter 5 657 skuggkörningar, varav 756
// med larm. Sex av sju led i kedjan mättes och höll — bucketen fanns sedan 29/8, TRV-frågan gav
// 749 kameror, bildens URL svarade 200 med en giltig jpeg. Det sjunde ledet, uppladdningen, var
// det enda som inte gick att prova utifrån, och det enda Supabase-anropet i hela repot som
// saknade `apikey`. Varje annat anrop i den här filen skickar både Authorization och apikey.
//
// TRE RÄTTELSER, för en ensam hade dolt de andra två:
//  1. `apikey` läggs till i uppladdningen.
//  2. Budgeten återställs PER ANROP. Den stod på modulnivå och minskades bara vid LYCKAD
//     sparning, så ett isolat som fått sina fem bilder tystnade för gott. Med enbart rättelse 1
//     hade det gett fem bilder och sedan tystnad — och sett ut som att felet var löst.
//  3. VARJE GREN SÄGER VARFÖR. Funktionen returnerade bara en siffra, och noll gick inte att
//     skilja från "inga larm". Nu går skälet med i svaret, och uppladdningens fel bär API:ets
//     SVARSKROPP — kameror-vaglag-läxan i CLAUDE.md, som fanns nedskriven men inte tillämpad här.
//
// VARFÖR DET HASTAR: en kamerabild är ett ögonblick. Trafikverket serverar bara den senaste, så
// det finns inget arkiv att hämta en passerad natt ur. Kamerafacit är därmed den enda källan i
// hela projektet som INTE går att räkna om i efterhand — och den bärande facitkällan för T-B
// (#88), tystnadsfelet (#98) och mars-domen (DECISIONS #94).
//
// RÄTTELSE 4 (15/9, bedömning v3 N1, DECISIONS #189): DEN ÅTTONDE LÄNKEN. Form A (#179) gav
// skuggloggens rader en position — men den här funktionen fick fortfarande motorns Alert, som inte
// bär någon (engine/src/types.ts), och räknade haversine på NaN precis som förut. Facitradien 15/9
// mätte 174 positionerade larm, ALLA inom 13,4 km från en kamera, och bucketen stod ändå på noll.
// Nu tar funktionen PUNKTER, uppslagna ur faran på samma sätt som loggen: punktfaror bär lon/lat,
// segment får ingen punkt (form A:s regel — en centroid kan ligga milsvitt från larmet).
const FACIT_PER_KORNING = 5;
let facitBudget = FACIT_PER_KORNING;

async function archiveFacit(punkter: { lon: number; lat: number }[], route: string): Promise<{ saved: number; skal: string[] }> {
  const skal: string[] = [];
  if (facitBudget <= 0) return { saved: 0, skal: ["budget slut"] };
  if (!punkter.length) return { saved: 0, skal: [] };
  const cams = await trvCameras();
  if (!cams.length) return { saved: 0, skal: ["TRV gav noll väglagskameror"] };
  const bucket3h = Math.floor(Date.now() / 10_800_000);
  const day = new Date().toISOString().slice(0, 10);
  let saved = 0;
  const seen = new Set<string>();
  for (const a of punkter) {
    let best = null as null | typeof cams[0]; let bd = 15_000;
    for (const c of cams) {
      const d = haversineM({ lon: a.lon, lat: a.lat }, { lon: c.lon, lat: c.lat });
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) { skal.push("ingen kamera inom 15 km"); continue; }
    if (seen.has(best.id)) continue;
    seen.add(best.id);
    const path = `${day}/${best.id}-${bucket3h}.jpg`;
    const bild = await fetch(best.url).catch(() => null);
    if (!bild?.ok) { skal.push(`bildhämtning ${bild ? bild.status : "kastade"}`); continue; }
    const img = await bild.arrayBuffer();
    const up = await fetch(`${SB}/storage/v1/object/facit/${path}`, {
      method: "POST",
      // apikey SAKNADES här, och bara här. Det var kort #157:s troliga rotorsak.
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "image/jpeg" },
      body: img });
    if (up.ok) { saved++; continue; }
    if (up.status === 409) { skal.push("409 fanns redan"); continue; }   // dedupe — helt ok
    skal.push(`uppladdning ${up.status}: ${(await up.text().catch(() => "")).slice(0, 120)}`);
  }
  return { saved, skal };
}

// STEG E — VATTENPLANINGENS SKUGGA (kort #154/#81, grind V-B, DECISIONS #191, Bengts ja 15/9).
// `rain_segments` (#187) når ingen port; här får de tala för mätningens skull. Samma motor, EGEN
// instans: korridor, försprång, 45 s och 10 min/5 km är motorns egna regler, inte en andra
// implementation av dem. `code: 2` i den syntetiska faran betyder BARA "får tala" i den här
// mätningen — evaluateSegment tiger på kod 1 — och den riktiga koden går med i loggraden.
// Bara segment i ruttens ruta (+0,05° ≈ 5 km, mer än leadMaxM 3 km): CPU-taket (läxa 29/8).
// Positionen är BILENS när rösten skulle talat (geo "bil") — det är där facitbilden ska tas.
// Rör aldrig `alerts`: den listan är motorns ord. Loggas i egen kolumn `vb` (sql/019).
type RainSeg = { id: string; line: [number, number][]; code: number | null; road: string | null; regn: number | null };
function vbAlerts(lv: any, route: [number, number][], trace: Fix[]) {
  const segs: RainSeg[] = Array.isArray(lv?.rain_segments) ? lv.rain_segments : [];
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const nara = segs.filter((s) => Array.isArray(s.line) && s.line.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));
  if (!nara.length) return [];
  const byId = new Map(nara.map((s) => [`vb:${s.id}`, s]));
  const syntetiska: Hazard[] = nara.map((s) => ({ id: `vb:${s.id}`, kind: "slippery_segment", line: s.line, meta: { code: 2, info: [] } }));
  const byT = new Map(trace.map((f) => [f.t, f]));
  return new AlertEngine(syntetiska).run(trace).map((a) => {
    const s = byId.get(a.hazardId)!, f = byT.get(a.t);
    return { t: a.t, id: s.id, regn: s.regn, code: s.code, road: s.road, distanceM: a.distanceM,
             geo: "bil", lon: f?.lon ?? null, lat: f?.lat ?? null };
  });
}

// OLJA PÅ VÄGEN (kort #276 väg (a), Bengt 1/10, DECISIONS #421): var rösten SKULLE ha talat om Trafikverkets
// NonWeatherRelatedRoadConditions — mest olja, diesel och hydraulolja med "risk för halka". Egen motorinstans och egen
// kolumn `olja` (sql/040), aldrig i `alerts`: den listan är motorns ord, och oljan får varken tränga undan eller tystas av
// de riktiga varningarna. Farorna matas som punktfaror med viltets regel (talar inom grundvarningens försprång) bara för att
// få motorns riktnings-, avstånds- och upprepningsregler — ingen text och ingen prioritet prövas; de är Axels efter skuggan.
// Hela klassen loggas med sin text, så mätningen kan skilja olja från potthål i efterhand.
type Olja = { id: string; lon: number; lat: number; text: string | null; sev: number | null };
async function oljaAktiva(): Promise<{ lista: Olja[]; skal: string | null }> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/olja_aktiva`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) return { lista: [], skal: `olja_aktiva ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}` };
    const rows: any[] = await r.json();
    const lista = rows.flatMap((x) => (typeof x.lon === "number" && typeof x.lat === "number"
      ? [{ id: String(x.id), lon: x.lon, lat: x.lat, text: x.meddelande ?? null, sev: x.sev ?? null }] : []));
    return { lista, skal: lista.length ? null : "inga aktiva händelser i arkivet" };
  } catch (e) { return { lista: [], skal: `olja_aktiva kastade: ${String(e).slice(0, 120)}` }; }
}
function oljaAlerts(olja: Olja[], route: [number, number][], trace: Fix[]) {
  const M = 0.05;
  const lons = route.map((p) => p[0]), lats = route.map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const nara = olja.filter((o) => o.lon >= x0 && o.lon <= x1 && o.lat >= y0 && o.lat <= y1);
  if (!nara.length) return [];
  const byId = new Map(nara.map((o) => [`olja:${o.id}`, o]));
  const syntetiska: Hazard[] = nara.map((o) => ({ id: `olja:${o.id}`, kind: "wildlife", lon: o.lon, lat: o.lat }));
  return new AlertEngine(syntetiska).run(trace).map((a) => {
    const o = byId.get(a.hazardId)!;
    return { t: a.t, id: o.id, text: o.text, sev: o.sev, distanceM: a.distanceM, geo: "punkt", lon: o.lon, lat: o.lat };
  });
}

/** S1: väderpunkter i ruttens ruta (+5 km, samma ruta som vbAlerts) med N4:s råa fält och motorns utfall. Utan rutt (null): alla
 *  väderpunkter i lägesfilen (DECISIONS #523) — larm gäller fortfarande bara den rutt raden hör till. */
function efterhalkaRader(lv: any, route: [number, number][] | null, alerts: Alert[]) {
  const wx: any[] = Array.isArray(lv?.weather) ? lv.weather : [];
  if (!wx.length) return [];
  const M = 0.05;
  const lons = (route ?? []).map((p) => p[0]), lats = (route ?? []).map((p) => p[1]);
  const x0 = Math.min(...lons) - M, x1 = Math.max(...lons) + M, y0 = Math.min(...lats) - M, y1 = Math.max(...lats) + M;
  const larmade = new Set(alerts.map((a) => a.hazardId));
  return wx.filter((w) => !route || (w.lon >= x0 && w.lon <= x1 && w.lat >= y0 && w.lat <= y1)).map((w) => ({
    id: String(w.id), yta: w.yta ?? null, fukt: w.fukt ?? null,
    regn_h: w.regn_h ?? null, lutning15: w.lutning15 ?? null, lutning30: w.lutning30 ?? null, lutning60: w.lutning60 ?? null,
    larm: larmade.has(`wx:${w.id}`),
  }));
}

/** SEGMENTPROGNOSENS ANKARE (sql/032 vagpunkt_ankare, DECISIONS #324/#325): vaktade, färska svenska stationer med
 *  yttemperatur — samma population som det appen hör och som grind A dömdes på. Fail-soft med skäl: en tom prognos
 *  utan orsak är omöjlig att skilja från "inga ankare", samma läxa som facit-hinken (#173). */
async function vagpunktAnkare(): Promise<{ lista: Ankare[]; skal: string | null }> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/vagpunkt_ankare`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) return { lista: [], skal: `vagpunkt_ankare ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}` };
    const rows: any[] = await r.json();
    const lista = rows.flatMap((x) => (typeof x.lon === "number" && typeof x.lat === "number" && x.yta != null
      ? [{ id: String(x.id), lon: x.lon, lat: x.lat, yta: Number(x.yta) }] : []));
    return { lista, skal: lista.length ? null : "vagpunkt_ankare gav noll ankare" };
  } catch (e) { return { lista: [], skal: `vagpunkt_ankare kastade: ${String(e).slice(0, 120)}` }; }
}

/** KANDIDATENS VARNANDE VÄGPUNKTER (sql/057 kandidat_regel, DECISIONS #573 del 2): regeln räknas i databasen, på ett ställe;
 *  skuggan hämtar bara de punkter som varnar, en gång per anrop, för takten längs rutterna. Fail-soft med skäl, som ankarna.
 *  Tom lista med skälet "regeln tiger" när kandidatens timme är gammal eller ofullständig, eller ingen punkt varnar. */
type KandidatPunkt = { segment_id: string; lon: number; lat: number };
async function kandidatVarnar(): Promise<{ lista: KandidatPunkt[]; tid: string | null; skal: string | null }> {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/kandidat_regel?utfall=eq.varnar&select=segment_id,lon,lat,tid`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" }, body: "{}" });
    if (!r.ok) return { lista: [], tid: null, skal: `kandidat_regel ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}` };
    const rows: any[] = await r.json();
    const lista = rows.flatMap((x) => (typeof x.lon === "number" && typeof x.lat === "number" && x.segment_id != null
      ? [{ segment_id: String(x.segment_id), lon: x.lon, lat: x.lat }] : []));
    return { lista, tid: rows[0]?.tid ?? null, skal: lista.length ? null : "regeln tiger: ingen varnande punkt, eller kandidatens timme gammal eller ofullständig" };
  } catch (e) { return { lista: [], tid: null, skal: `kandidat_regel kastade: ${String(e).slice(0, 120)}` }; }
}

// FÖRSPRÅNGET (kort #153 beslut 1, docs/TROSKLAR-FORSPRANG.md §4, DECISIONS #359). Eget anrop på :12/:42 — huvudvarvet slår redan i
// datorkraftens tak (546 kl 04:32 och 05:02Z 25/9, på :02/:32). Samma halvtimmes rutter som huvudvarvet; bara rutter med en nivå 2-fara
// i rutan körs, och där körs motorn två gånger på samma spår: baskörningen (dagens motor) och varianten (nivå 2 med halvtimmens
// svepvärde). Båda körningarnas varningar och undanträngda loggas i forsprang_log. Aldrig hört. `prov` skriver inget.
// ALLA RUTTER VARJE HALVTIMME (DECISIONS #662, åtgärdslistan B4-94): `?slot=k` kör plats k av de 20 rutterna (0–6) och `&grupp=c`
// de 10 C-rutterna (0–3), högst tre rutter per anrop; ett jobb per plats (sql/066). Utan slot väljer halvtimmen, som förut.
async function forsprangVarv(prov: boolean, c = false, slot: number | null = null): Promise<Response> {
  const svar = (x: unknown) => new Response(JSON.stringify(x), { headers: { "Content-Type": "application/json" } });
  const halvtimme = Math.floor(Date.now() / 1800e3);
  const svepS = prov ? FORSPRANG_SVEP_S[1] : FORSPRANG_SVEP_S[halvtimme % FORSPRANG_SVEP_S.length];
  const kor = (hazards: Hazard[], trace: Fix[], nivaer: Map<string, ForsprangNiva>, krok: boolean) => {
    const motor = new AlertEngine(hazards);
    if (krok) motor.leadFor = forsprangKrok(nivaer, svepS);
    const suppressed: { kind: string; id: string; distM: number; by: string }[] = [];
    motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by });
    // `beta` märker efterhalkans betavarning (S3), som är frysrisk men aldrig nivå 2 (DECISIONS #664, räkneregeln R4).
    const alerts = motor.run(trace).map((a) => ({ t: a.t, id: a.hazardId, kind: a.kind, distanceM: Math.round(a.distanceM),
      niva: nivaer.get(a.hazardId) ?? null, ...(a.beta ? { beta: true } : {}) }));
    return { alerts, suppressed };
  };
  if (prov) {
    // Ett rakt spår österut i 80 km/h: ett nivå 1-segment (kod 2) vid ~2 km och ett nivå 2-segment (kod 4) vid ~4 km. Nivå 1 ska tala
    // på samma avstånd i båda körningarna; nivå 2 ska tala tidigare i varianten (60 s mot 30 s ⇒ ungefär dubbla avståndet).
    const hazards: Hazard[] = [
      { id: "prov:niva1", kind: "slippery_segment", line: [[15.035, 59.0], [15.040, 59.0]], meta: { code: 2, info: [] } },
      { id: "prov:niva2", kind: "slippery_segment", line: [[15.070, 59.0], [15.078, 59.0]], meta: { code: 4, info: [] } },
    ];
    const nivaer = new Map<string, ForsprangNiva>(hazards.map((h) => [h.id, forsprangNiva(h, new Map())!]));
    const trace = traceAlong([[15.0, 59.0], [15.1, 59.0]]);
    return svar({ ok: true, prov: "forsprang", svep_s: svepS, bas: kor(hazards, trace, nivaer, false), variant: kor(hazards, trace, nivaer, true) });
  }
  const [st, lv] = await snapshot("se");
  // Kandidaten (K, DECISIONS #577) hålls utanför skuggans motorkörningar: deras domar är förregistrerade utan den, och sist i
  // prioriteten ändrar den ingen annan varning i appen. Kandidatens egen takt loggas för sig (kandidatVarnar, #573).
  const hazards = snapshotToHazards(st, lv).filter((h) => h.kind !== "kandidat");
  const vata = new Map<string, number>();
  for (const w of (Array.isArray(lv?.weather) ? lv.weather : [])) if (typeof w?.bevis?.vata === "number") vata.set(`wx:${w.id}`, w.bevis.vata);
  const nivaer = new Map<string, ForsprangNiva>();
  for (const h of hazards) { const n = forsprangNiva(h, vata); if (n !== null) nivaer.set(h.id, n); }
  const routes = c ? ROUTES_C : ROUTES;
  const urval = forsprangUrval(Object.keys(routes), halvtimme, slot);
  if (!urval) return new Response("okänt slot", { status: 400 });
  const { batch } = urval;
  const rader: Record<string, unknown>[] = [];
  for (const name of batch) {
    const line = routes[name];
    const trace = traceAlong(line);
    // Urvalet vid vägen (DECISIONS #664, TROSKLAR-FORSPRANG §4): nivå 2 bland motorns faror vid linjen (rutfiltret, kort #244, #535).
    // Rektangeln runt rutten, som gällde till #664, prövade bara sträckornas brytpunkter och tog med faror långt från vägen.
    const naraFaror = farorVidLinjen(hazards, line);
    const niva2 = naraFaror.filter((h) => nivaer.get(h.id) === 2).length;
    const bas = kor(naraFaror, trace, nivaer, false);
    if (!niva2) {
      // Nämnarraden (FS-A1, DECISIONS #664, räkneregeln R4): baskörningens A1- och A2-varningar med nivå; ingen variant — den vore
      // byte för byte densamma. Samma nycklar som de andra raderna, eftersom PostgREST kräver det i en gemensam skrivning.
      rader.push({ route: name, svep_s: svepS, niva2: 0, bas: bas.alerts.filter((a) => FORSPRANG_A_SLAG.includes(a.kind)),
        variant: [], bas_suppressed: bas.suppressed, variant_suppressed: [], nytt: [] });
      continue;
    }
    const variant = kor(naraFaror, trace, nivaer, true);
    // FS-B4: en varning i varianten om en fara baskörningen aldrig talade om. Avståndet kvar till rutans slut följer med, så att
    // faror där baskörningens spår tog slut före faran kan redovisas för sig.
    const basIds = new Set(bas.alerts.map((a) => a.id));
    const langdKm = narmastLangs({ lon: line[line.length - 1][0], lat: line[line.length - 1][1] }, line).vid;
    const byId = new Map(hazards.map((h) => [h.id, h]));
    const nytt = variant.alerts.filter((a) => !basIds.has(a.id)).map((a) => {
      const h = byId.get(a.id) as any;
      const pt = h?.kind === "slippery_segment" ? { lon: h.line[0][0], lat: h.line[0][1] } : { lon: h?.lon, lat: h?.lat };
      const vid = typeof pt.lon === "number" ? narmastLangs(pt, line).vid : null;
      return { id: a.id, kind: a.kind, niva: a.niva, kvarKm: vid === null ? null : Math.round((langdKm - vid) * 10) / 10 };
    });
    rader.push({ route: name, svep_s: svepS, niva2, bas: bas.alerts, variant: variant.alerts,
      bas_suppressed: bas.suppressed, variant_suppressed: variant.suppressed, nytt });
  }
  let skrivet = "inget att skriva";
  if (rader.length) {
    const r = await fetch(`${SB}/rest/v1/forsprang_log`, { method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(rader) });
    skrivet = r.ok ? `${rader.length} rader` : `forsprang_log ${r.status}: ${(await r.text().catch(() => "")).slice(0, 120)}`;
  }
  return svar({ ok: true, lage: "forsprang", grupp: c ? "c" : null, slot: urval.plats, svep_s: svepS, rutter: batch.length,
    med_niva2: rader.filter((r) => (r.niva2 as number) > 0).length, namnarrader: rader.filter((r) => r.niva2 === 0).length,
    niva2_i_snapshoten: [...nivaer.values()].filter((n) => n === 2).length, skrivet });
}

import { nyckelGiltig } from "../_shared/nyckel.ts";
Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  try {
    // SPÄRRPROVET (kort #191 → bevis för #188, DECISIONS #197, Bengts ja 16/9). Två kameror på ett rakt spår
    // österut i 80 km/h: den första talar vid t=5 s, den andra når sin utlösning fem sekunder senare och
    // tystas av regel 1b (samma prioritet inom spärren) — kroken ska då ge EN rad. Septembers farubild ger
    // aldrig två larm så tätt, så beviset kan inte inväntas; det framkallas.
    // FÖRSTA PROVET 02:38Z 16/9 FÖLL: kamerorna stod 300 m isär (~14 s) och BÅDA talade — spärren är 10 s
    // sedan #127 (13/9), inte 45 s som CLAUDE.md:s invariant fortfarande säger. Kamerornas verkliga
    // minimidistans (520 m) ligger utanför spärren med flit; provet sätter dem 100 m isär just för att hamna
    // innanför de 10 sekunderna. Skriver INGET i shadow_log — en provrad hade förorenat tystnadsfelet och
    // upprepningen — svaret läses av dbknapp ur net._http_response.
    // Försprångets eget läge (kort #153 beslut 1) — före allt annat, så att huvudvarvets arbete aldrig körs i samma anrop.
    if (new URL(req.url).searchParams.get("lage") === "forsprang") {
      // Alla rutter varje halvtimme (DECISIONS #662): `slot` väljer platsen och `grupp=c` C-rutterna; ett felaktigt värde ger 400.
      const q = new URL(req.url).searchParams, g = q.get("grupp"), s = q.get("slot");
      if (g !== null && g !== "c") return new Response("okänd grupp", { status: 400 });
      if (s !== null && !/^\d+$/.test(s)) return new Response("okänt slot", { status: 400 });
      return await forsprangVarv(q.get("prov") === "1", g === "c", s === null ? null : Number(s));
    }
    // OLJEPROVET (kort #276): en påhittad oljefläck 1,1 km in på ett rakt spår ⇒ EN rad i `olja`, plus hur många aktiva händelser
    // arkivet ger just nu (RPC:n prövad i drift). Skriver INGET i shadow_log, samma skäl som spärrprovet nedan.
    if (new URL(req.url).searchParams.get("oljaprov") === "1") {
      const linje: [number, number][] = [[15.0, 59.0], [15.03, 59.0]];
      const aktiva = await oljaAktiva();
      const olja = oljaAlerts([{ id: "prov:olja", lon: 15.02, lat: 59.0, text: "Prov: olja på vägbanan", sev: null }], linje, traceAlong(linje));
      return new Response(JSON.stringify({ ok: true, prov: "olja", olja, aktiva: aktiva.lista.length, oljaSkal: aktiva.skal }),
        { headers: { "Content-Type": "application/json" } });
    }
    if (new URL(req.url).searchParams.get("sparrprov") === "1") {
      const prov: Hazard[] = [
        { id: "prov:kam1", kind: "camera", lon: 15.0105, lat: 59.0, bearing: null },   // ~600 m från start: talar t=5
        { id: "prov:kam2", kind: "camera", lon: 15.0122, lat: 59.0, bearing: null },   // ~700 m: kandidat t=10, 5 s < 10 ⇒ tystas
      ];
      const motor = new AlertEngine(prov);
      const suppressed: unknown[] = [];
      motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by, sinceS: c.sinceS });
      const alerts = motor.run(traceAlong([[15.0, 59.0], [15.03, 59.0]]));
      return new Response(JSON.stringify({ ok: true, prov: "sparr", alerts: alerts.map((a) => ({ t: a.t, id: a.hazardId, distanceM: a.distanceM })), suppressed }),
        { headers: { "Content-Type": "application/json" } });
    }
    const land = (new URL(req.url).searchParams.get("land") ?? "se").toLowerCase();
    if (!CDN_BY_LAND[land]) return new Response("okänt land", { status: 400 });
    // VÄG C (DECISIONS #527): `?grupp=c` kör ROUTES_C i ett eget anrop på :22/:52 och skriver till shadow_log_c — bara larmen.
    const grupp = new URL(req.url).searchParams.get("grupp");
    if (grupp !== null && (grupp !== "c" || land !== "se")) return new Response("okänd grupp", { status: 400 });
    const c = grupp === "c";
    const routes = c ? ROUTES_C : land === "fi" ? ROUTES_FI : land === "no" ? ROUTES_NO : land === "dk" ? ROUTES_DK : ROUTES;
    const [st, lv] = await snapshot(land);
    // Utan kandidaten, som ovan (DECISIONS #577).
    const hazards = snapshotToHazards(st, lv).filter((h) => h.kind !== "kandidat");
    // Ankarna hämtas en gång per anrop, inte per rutt. Bara Sverige: funktionen läser det svenska arkivet.
    const ankare = land === "se" && !c ? await vagpunktAnkare() : { lista: [] as Ankare[], skal: c ? "grupp C loggar ingen prognos" : "bara Sverige" };
    // Kandidatens takt (DECISIONS #573): bara huvudvarvet i Sverige, som prognosen.
    const kandidatV = land === "se" && !c ? await kandidatVarnar()
      : { lista: [] as KandidatPunkt[], tid: null, skal: c ? "grupp C loggar ingen kandidat" : "bara Sverige" };
    const oljaLista = land === "se" ? await oljaAktiva() : { lista: [] as Olja[], skal: "bara Sverige" };
    const results: Record<string, unknown> = {};
    let facitTotal = 0;
    const facitSkal: string[] = [];
    facitBudget = FACIT_PER_KORNING;   // per ANROP, inte per isolat — se rättelse 2 ovan
    // Rotation: 3 rutter per varv (CPU-taket, läxa 29/8) — alla 20 täcks varje 3,5 h,
    // i båda länderna.
    const allNames = Object.keys(routes).sort();
    const slots = c ? Math.ceil(allNames.length / 3) : 7;   // grupp C: samma tak, högst 3 rutter per anrop
    const slot = Math.floor(Date.now() / 1800e3) % slots;
    // TIDMÄTNING PER STEG (kort #244, DECISIONS #360): funktionsloggen är Axels panel, så svaret bär själv var tiden går.
    const ms = { motor: 0, prognos: 0, facit: 0, t0: performance.now() };
    const batch = allNames.filter((_, i) => i % slots === slot);
    for (const name of batch) {
      const line = routes[name];
      {
      const trace = traceAlong(line);
      // SPÄRREN SYNLIG (#127 a, kort #188, DECISIONS #193, Bengts ja 15/9). Kroken fanns i motorn och
      // kolumnen i sql/016 sedan 13/9 — men ingen lyssnade, så kolumnen stod tom. Nu: det regel 1b
      // kastar loggas per körning, med vad som tystade det och med vilken marginal.
      // RUTFILTRET (kort #244, DECISIONS #360): motorn prövar bara faror inom sin längsta räckvidd från rutten — utfallet är
      // detsamma byte för byte (test/rutfilter.test.ts), arbetet en bråkdel. n_hazards nedan är fortsatt hela snapshotens antal.
      // Sedan 12/10 räknas räckvidden från själva linjen, inte från rektangeln runt rutten (Bengt, DECISIONS #535).
      const t1 = performance.now();
      const motor = new AlertEngine(farorVidLinjen(hazards, line));
      // Halkzonen (kort #360, DECISIONS #624): en halkvarning som tystas för att en grannsträcka inom 500 m nyss talade bär `zon`.
      const suppressed: { kind: string; id: string; distM: number; by: string; sinceS: number; zon?: string }[] = [];
      motor.onSuppressed = (c) => suppressed.push({ kind: c.kind, id: c.hazardId, distM: Math.round(c.distM), by: c.by, sinceS: c.sinceS,
        ...(c.zon ? { zon: c.zon } : {}) });
      const alerts = motor.run(trace);
      ms.motor += performance.now() - t1;
      const vb = land === "se" ? vbAlerts(lv, line, trace) : [];
      const olja = oljaAlerts(oljaLista.lista, line, trace);
      // S1 — EFTERHALKANS INDATA (bedömning v3 S1, DECISIONS #198, Bengts "bygg S1 nu" 16/9). N4:s råa fält
      // per station i korridoren + om motorn larmade på stationen. Inget villkor: S2 sätter det, och raden
      // ska kunna spelas upp mot vilket villkor som helst. Axels grind (#196): regn_h döms här innan något
      // mer byggs på det. Tom i september (weather[] saknar stationer ≤ 3 °C) — det är rätt, inte fel.
      // ALLA STATIONER (DECISIONS #523, Bengts ja 11/10): varvets första rutt bär varje väderpunkt i lägesfilen, inte bara sin
      // korridor. Rutterna kör var 3,5:e timme och gick förbi 95 % av efterhalkans fall 4–11/10 (#521); S1 handlar om stationer,
      // inte vägar. Inga nya rader: jämförelsen mot arkivet tar bort dubbletterna.
      // Grupp C loggar ingen efterhalka: huvudvarvets första rutt bär redan varje station varje halvtimme (#523).
      const efterhalka = land === "se" && !c ? efterhalkaRader(lv, name === batch[0] ? null : line, alerts) : [];
      // SEGMENTPROGNOSEN (kort #38b steg 4, DECISIONS #324/#325, Bengts "bygg nu" 23/9): rå avståndsviktning av de
      // vaktade stationerna per provpunkt längs rutten (engine/src/segment.ts). Loggad, aldrig hörd — grind B och C
      // dömer i mars. Tom utan ankare, och skälet står i svaret (ankareSkal), så en tom kolumn aldrig är tvetydig.
      // h = HOLDOUT (4c, DECISIONS #326): varje station inom 2 km av rutten skattad ur de övriga, med sin egen mätning.
      // Samma filter för ankarna: bara de inom prognosens grannradie plus holdoutens 2 km kan väga in (#360).
      const t2 = performance.now();
      const ankRutt = ankareNaraRutten(ankare.lista, line);
      const prognos = ankare.lista.length ? { ...segmentPrognos(line, ankRutt), h: holdoutRader(line, ankRutt) } : {};
      // KANDIDATEN (DECISIONS #573 del 2): de varnande sträckorna längs rutten, för takten. Loggad, aldrig hörd. Längs vägnätet
      // (RUTTER_VAG, OSRM, inbäddad av bundle-skuggmotor.ts): de raka linjerna gick 6,9 km från de varnande punkterna på E10 15/10.
      // geo säger vilken linje som räknades; den raka bara om vägnätet saknas för rutten.
      const vag = (RUTTER_VAG as Record<string, [number, number][]>)[name];
      const kandidatLinje = vag ?? line;
      const kandidat = land === "se" && !c
        ? { tid: kandidatV.tid, n: kandidatV.lista.length, geo: vag ? "osrm" : "linje",
            h: kandidatLangsRutten(ankareNaraRutten(kandidatV.lista, kandidatLinje, UPPMATT_KM), kandidatLinje), ...(kandidatV.skal ? { skal: kandidatV.skal } : {}) }
        : {};
      ms.prognos += performance.now() - t2;
      // Facit-bilder finns bara i Sverige (Trafikverkets väglagskameror). Punkterna slås upp ur
      // faran, inte ur larmet — motorns Alert bär ingen position (rättelse 4 ovan, DECISIONS #189).
      const farorById = new Map(hazards.map((h) => [h.id, h]));
      // V1 (Bengts ja 26/9, DECISIONS #380): ingen facitbild vid en fartkameravarning. 94 % av hinkens bilder togs där — torra
      // vägar som ingen dom behöver, ≈ 2 MB/dygn av lagringen och en femtedel av körningens tid.
      const punkter = alerts.flatMap((a) => {
        const h = farorById.get(a.hazardId) as any;
        return h && h.kind !== "slippery_segment" && h.kind !== "camera" && typeof h.lon === "number"
          ? [{ lon: h.lon as number, lat: h.lat as number }] : [];
      });
      // Steg E: också bilens position vid en vattenplaningsvarning — en torr vägbana i bild fäller
      // falsklarm enligt TROSKLAR-VATTENPLANING §2. Motorns punkter först; budgeten är gemensam.
      const vbPunkter = vb.flatMap((v) => (v.lon != null && v.lat != null ? [{ lon: v.lon, lat: v.lat }] : []));
      const t3 = performance.now();
      const f = land === "se" && !c ? await archiveFacit([...punkter, ...vbPunkter], name)
        : { saved: 0, skal: c ? ["grupp C arkiverar inga facitbilder (DECISIONS #527)"] : [] };
      ms.facit += performance.now() - t3;
      // En nolla utan skäl är omöjlig att skilja från "inga larm" (#173) — även den här grenen säger varför.
      if (land === "se" && alerts.length && !punkter.length) f.skal.push("bara segment- eller fartkameralarm — inget som behöver väglagsfacit");
      facitBudget -= f.saved; facitTotal += f.saved; facitSkal.push(...f.skal);
      results[name] = { fixes: trace.length, alerts: alerts.length, vb: vb.length, olja: olja.length, suppressed: suppressed.length, efterhalka: efterhalka.length,
        prognos: (prognos as Prognos).p?.length ?? 0, kandidat: (kandidat as { h?: unknown[] }).h?.length ?? 0 };
      // LARMETS POSITION (kort #158, DECISIONS #177/#179, Axels ja via Bengt 14/9).
      //
      // FÖRUT SKREVS `lon: a.lon` — OCH DET FÄLTET FINNS INTE. Motorns Alert bär `t`, `hazardId`,
      // `kind`, `distanceM` och `text`, ingen koordinat. Edge-funktioner deployas utan typkontroll,
      // så det blev `undefined` och JSON.stringify tappade nyckeln TYST. Mätt 14/9: 2 103 larm på
      // fjorton dygn, NOLL med lon. Följden var att archiveFacit räknade haversine på NaN, aldrig
      // hittade en kamera och rapporterade "ingen kamera inom 15 km" — kamerafacit har därför
      // aldrig kunnat fyllas, och en kamerabild går inte att hämta i efterhand.
      //
      // POSITIONEN TAS UR FARAN, inte ur motorn. Punktfaror bär lon/lat själva; att slå upp dem på
      // hazardId kräver ingen motorlogik i den här filen (CLAUDE.md: klistra aldrig motorkod i en
      // edge function). `distanceM` skrivs också — Alert har alltid burit det, skuggmotorn kastade
      // bara bort det.
      //
      // SEGMENT FÅR INGEN KOORDINAT, OCH DET SÄGS RAKT UT. En slippery_segment är en polyline; dess
      // centroid kan ligga milsvitt från larmpunkten (Jämtlands segment är 59 km). Att skriva en
      // ungefärlig punkt vore att göra om samma fel en gång till, fast tystare. Fältet `geo` säger
      // därför VARFÖR en koordinat saknas: "punkt" = den finns, "segment" = den finns inte och ska
      // inte finnas, "okänd" = faran hittades inte alls, vilket i sig är ett larm värt att se.
      // Exakt punkt för segment kräver att motorns Alert bär den — det är form B och rör vektorerna.
      const body = JSON.stringify({
        route: name, land: land.toUpperCase(), snapshot_generated_at: lv.generated_at,
        n_hazards: hazards.length, n_alerts: alerts.length, vb, olja, suppressed, efterhalka, prognos,
        ...(c ? {} : { kandidat }),   // shadow_log_c har ingen kandidatkolumn (sql/057 lägger den bara i shadow_log)
        alerts: alerts.map((a) => {
          const h = farorById.get(a.hazardId) as any;
          const punkt = h && h.kind !== "slippery_segment" && typeof h.lon === "number";
          return {
            t: a.t, kind: a.kind, id: a.hazardId, text: a.text, distanceM: a.distanceM,
            geo: !h ? "okänd" : punkt ? "punkt" : "segment",
            ...(punkt ? { lon: h.lon, lat: h.lat } : {}),
          };
        }),
      });
      await fetch(`${SB}/rest/v1/${c ? "shadow_log_c" : "shadow_log"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SRK}`, apikey: SRK, "Content-Type": "application/json" },
        body });
      }
    }
    // Skälen går med i svaret. En nolla utan skäl är omöjlig att skilja från "inga larm",
    // och det var precis det som lät bucketen stå tom i sexton dygn utan att någon såg det.
    const tid = { motor: Math.round(ms.motor), prognos: Math.round(ms.prognos), facit: Math.round(ms.facit), totalt: Math.round(performance.now() - ms.t0) };
    return new Response(JSON.stringify({ ok: true, results, ankare: ankare.lista.length, ankareSkal: ankare.skal, olja: oljaLista.lista.length, oljaSkal: oljaLista.skal, facit: facitTotal,
      facitSkal: [...new Set(facitSkal)].slice(0, 8), ms: tid }), {
      headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
