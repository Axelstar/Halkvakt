// ═══ GENERERAD av scripts/bundle-favoriter.ts — ÄNDRA INTE HÄR ═══
// Källor: engine/src/{types,geo,segment,rutfilter,snapshot}.ts + publish/rapport-core.ts + supabase/functions/favoriter/main.ts

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


// ═══ publish/rapport-core.ts ═══
// RAPPORTFILEN OCH FAVORITPROVET (favoriterna, DECISIONS #529). Ren logik, inget I/O — Deno-kopplingen bor i
// supabase/functions/favoritprov/main.ts (testmiljön) och supabase/functions/favoriter/main.ts (appens fil, DECISIONS #617), och
// index.ts där är genererade av scripts/bundle-favoritprov.ts och scripts/bundle-favoriter.ts.
//
// 1. byggRapport: det lägesfilen saknar, ur Trafikverkets öppna API när filen byggs (ingen ny tabell, docs/FAVORITER.html §7):
//    stationernas namn och lufttemperatur, olyckornas och djurens text, hinder, kömeddelanden, vägarbeten, hastigheter, omledningar,
//    restider och färjor. Delad i en SNABB del (statusar, punkter, texter) och en LÅNGSAM (linjerna), så att linjerna bara skrivs när
//    de ändras (§7: annars ~17 MB om dygnet i en historik).
// 2. favoritRapport: det fliken skulle visa för en sparad rutt, ur lägesfilen och rapportfilen, i favoritsidans viktordning (§3).
//    Urvalet längs rutten är motorns farorLangsRutten (#528). Avstånden per slag är PROVMILJÖNS parametrar (MARGINALER nedan), inte
//    appens trösklar: de hör till Axels form och skrivs som trösklar först då.
// Allt är Trafikverkets och SMHI:s öppna data. Ingen rutt för en verklig förare finns här — provets rutter är skuggans.

export type Linje = [number, number][];
export type Slag = "frysrisk" | "halka" | "olycka" | "hinder" | "vilt" | "ko" | "restid" | "vagarbete" | "hastighet" | "omledning"
  | "farja" | "kamera" | "smhi";
/** Favoritsidans viktordning (docs/FAVORITER.html §3, punkt 3): halka och frysrisk först, SMHI sist. */
export const ORDNING: Slag[] = ["halka", "frysrisk", "olycka", "hinder", "vilt", "ko", "restid", "vagarbete", "hastighet", "omledning",
  "farja", "kamera", "smhi"];
export const RUBRIK: Record<Slag, string> = { halka: "halt väglag på sträckorna", frysrisk: "frysrisk vid stationerna", olycka: "olyckor",
  hinder: "hinder", vilt: "vilt", ko: "köer", restid: "restider", vagarbete: "vägarbeten", hastighet: "hastighet",
  omledning: "omledningar", farja: "färjor", kamera: "fartkameror", smhi: "SMHI-varningar" };

/** Provmiljöns avstånd till rutten per slag, i meter, när rutten följer vägen (OSRM på OpenStreetMap, kort #338, DECISIONS #531):
 *  linjer och kameror 100 m (Trafikverkets och OpenStreetMaps vägmitt skiljer några tiotal meter, och en motorvägs körbanor ligger
 *  isär), olyckor, hinder och djur 150 m, stationer och färjor 500 m (en station står vid vägen, en färjeled är en punkt mitt i
 *  överfarten). Provets parametrar, inte appens trösklar — Axels form sätter dem. */
export const MARGINALER: Record<Slag, number> = { halka: 100, frysrisk: 500, olycka: 150, hinder: 150, vilt: 150, ko: 100,
  restid: 100, vagarbete: 100, hastighet: 100, omledning: 100, farja: 500, kamera: 100, smhi: 0 };
/** Avstånden för raka rutter, som skuggans brytpunkter (DECISIONS #529): 1,5 km, 2 km för stationer och färjor. */
export const MARGINALER_RAKA: Record<Slag, number> = { halka: 1500, frysrisk: 2000, olycka: 1500, hinder: 1500, vilt: 1500, ko: 1500,
  restid: 1500, vagarbete: 1500, hastighet: 1500, omledning: 1500, farja: 2000, kamera: 1500, smhi: 0 };
/** En LINJE ligger längs rutten först när minst LANGS_ANDEL av den, eller LANGS_MINST_M, ligger inom marginalen — en väg som bara
 *  korsar rutten är 0 m från den i korsningen, och då hade varje vägarbete och restidssträcka på en tvärväg kommit med (#531). */
export const LANGS_ANDEL = 0.5, LANGS_MINST_M = 500, LANGS_STEG_M = 100;

/** En post i rapportfilens snabba del (schema 2, #530). `t` är Trafikverkets egen rubrik; körfält, gräns, slut och restid är fält,
 *  och den läsbara texten sätts ihop av visning() — som appen skulle göra. `p` en punkt, `l` id för en linje i den långsamma delen. */
export type Post = { id: string; slag: Slag; rubrik: string; t?: string; p?: [number, number]; l?: string; vag?: string | null;
  start?: string | null; slut?: string | null; korfalt?: number; grans?: number; sev?: number | null; tid?: number; normal?: number;
  status?: string | null; text?: string; [k: string]: unknown };
export type Rapport = { schema: 2; generated_at: string; poster: Post[]; noter: string[];
  stationer: Record<string, { namn: string; luft: number | null }> };
export type Linjer = { schema: 2; generated_at: string; linjer: Record<string, Linje[]> };

// ── Trafikverkets geometri ──────────────────────────────────────────────────────────────────────────────────────────────────
// Fyra decimaler, ungefär 11 m — nog för att jämföra med en rutt, och en sjättedel av punkternas vikt (#530).
const tal = (s: string) => Math.round(Number(s) * 1e4) / 1e4;
export function punktUr(wkt: unknown): [number, number] | null {
  const m = /POINT\s*Z?\s*\(\s*([-\d.]+)\s+([-\d.]+)/.exec(String(wkt ?? ""));
  return m ? [tal(m[1]), tal(m[2])] : null;
}
/** LINESTRING och MULTILINESTRING (även med Z) till en lista av linjer. */
export function linjerUr(wkt: unknown): Linje[] {
  const s = String(wkt ?? "");
  if (!/LINESTRING/.test(s)) return [];
  return [...s.matchAll(/\(([^()]+)\)/g)].map((m) => glesa(m[1].split(",").map((par) => {
    const [x, y] = par.trim().split(/\s+/); return [tal(x), tal(y)] as [number, number];
  }))).filter((l) => l.length >= 2);
}
/** Stryker brytpunkter närmare än GLES_M den förra som behölls; den sista behålls alltid, så linjen slutar där den slutade (#530). */
export const GLES_M = 20;
export function glesa(l: Linje): Linje {
  if (l.length <= 2) return l;
  const ut: Linje = [l[0]];
  for (let i = 1; i < l.length - 1; i++) {
    const [x0, y0] = ut[ut.length - 1], [x, y] = l[i];
    if (Math.hypot((x - x0) * 111_320 * Math.cos((y0 * Math.PI) / 180), (y - y0) * 110_574) >= GLES_M) ut.push(l[i]);
  }
  ut.push(l[l.length - 1]);
  return ut;
}

const ren = (s: unknown, n = 140) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// Formaterarna skapas EN gång: toLocale…String med tidszon bygger en ny vid varje anrop, och rutterna tog 1 895 ms i stället för
// 152 när visning() anropades för varje post (torrkörningen 38138648357).
const FMT_KLOCKA = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
const FMT_DATUM = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", timeZone: "Europe/Stockholm" });
const FMT_ISO = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" });
const klocka = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return FMT_KLOCKA.format(t);
};
const datum = (iso: unknown) => {
  const t = Date.parse(String(iso ?? "")); if (!Number.isFinite(t)) return null;
  return FMT_DATUM.format(t);
};
/** Svenskt datum som ÅÅÅÅ-MM-DD (sv-SE skriver så). */
const datumIso = (iso: unknown) => {
  const v = Date.parse(String(iso ?? "")); if (!Number.isFinite(v)) return null;
  return FMT_ISO.format(v);
};
/** Den läsbara texten för en post, ur fälten — som appen skulle sätta ihop den (#530). */
export function visning(p: Post): string {
  if (p.text) return p.text;   // färjorna bär sin text färdig
  if (p.slag === "restid" || (p.slag === "ko" && p.id.startsWith("tt:")))
    return p.tid != null ? `${p.tid} minuter, normalt ${p.normal ?? "–"}` : "restid saknas";
  const slut = p.slut === "tv" ? "tills vidare" : p.slut ? `till ${datum(p.slut + "T12:00:00Z")}` : "";
  return [p.t ?? "", p.korfalt ? `${p.korfalt} körfält avstängda` : "", p.grans ? `${p.grans} km/h förbi vägarbetet` : "", slut,
    p.slag === "olycka" || p.slag === "hinder" || p.slag === "ko" ? `rapporterad ${klocka(p.start) ?? "–"}` : ""].filter(Boolean).join(" · ");
}
/** Vägnamnen skrivna lika, så att sammanslagningen per väg träffar: E-vägar som "E22", övriga som "väg 17" — Trafikverket skriver
 *  "17", "Väg 17" och "väg 17" om vartannat (kamerornas *17* i visningen). Inget namn blir null. */
export function vagNamn(v: unknown): string | null {
  const s = String(v ?? "").trim(); if (!s) return null;
  const e = /^e\s*(\d+)$/i.exec(s); if (e) return `E${e[1]}`;
  const n = /^(?:väg|rv|riksväg|länsväg)?\s*(\d+)$/i.exec(s); if (n) return `väg ${n[1]}`;
  return s.slice(0, 20);
}
const VAGARBETE = new Set(["MaintenanceWorks", "RoadOrCarriagewayOrLaneManagement"]);
const HINDER = new Set(["obstructionOnTheRoad", "objectOnTheRoad", "brokenDownVehicle"]);
const HASTIGHET = /hastighet|speedRestriction/i, OMLEDNING = /omled|divers|detour/i;   // som mätningen #528, efter rättelsen

/** Vilket slag en aktiv avvikelse är, eller null. Olyckor och djur finns redan i lägesfilen; här får de text och plats. */
export function slagFor(d: any): Slag | null {
  const kod = `${d.MessageCode ?? ""} ${d.MessageCodeValue ?? ""}`;
  if (d.MessageTypeValue === "Accident") return "olycka";
  if (d.MessageTypeValue === "AnimalPresenceObstruction" || d.MessageCodeValue === "animalsOnTheRoad") return "vilt";
  if (d.MessageTypeValue === "AbnormalTraffic") return "ko";
  if (HINDER.has(d.MessageCodeValue)) return "hinder";
  if (OMLEDNING.test(kod) || OMLEDNING.test(String(d.TemporaryLimit ?? ""))) return "omledning";
  if (HASTIGHET.test(String(d.TemporaryLimit ?? "")) || HASTIGHET.test(kod)) return "hastighet";
  if (VAGARBETE.has(d.MessageTypeValue)) return "vagarbete";
  return null;
}

export type In = {
  nu: number;
  situationer: any[];                       // Situation 1.6
  restider: any[];                          // TravelTimeRoute 1.6
  farjor: any[];                            // FerryAnnouncement 1.2, de närmaste 24 timmarna
  farjeleder: any[];                        // FerryRoute 1.2
  stationer: { id: string; namn: string; luft: number | null }[];   // weather_latest
};

/** En fråga till Trafikverkets öppna API. */
export type Fraga = { objecttype: string; version: string; ns: string; filter: string; include: string[] };
/** Frågorna bakom rapportfilen, i ordningen situationer, restider, färjor, färjeleder. Delade av favoritprovet och favoriter (appens
 *  fil, DECISIONS #617), så att testmiljön och appens fil aldrig ställer olika frågor. Bara de slag rapporten bär, bara aktiva, och
 *  bara fälten den läser — svaret för hela Situation är stort. */
export function rapportFragor(nu: number): Fraga[] {
  const fran = new Date(nu).toISOString(), till = new Date(nu + 24 * 3_600_000).toISOString();
  const TYPER = "Accident,AnimalPresenceObstruction,AbnormalTraffic,MaintenanceWorks,RoadOrCarriagewayOrLaneManagement,VehicleObstruction,GeneralObstruction";
  // Deviation.Deleted finns inte (torrkörningen 38135721921: "Invalid query attribute"); Situation.Deleted gör det.
  const DEV = ["Id", "Suspended", "StartTime", "EndTime", "CreationTime", "ValidUntilFurtherNotice", "MessageTypeValue", "MessageCode",
    "MessageCodeValue", "Header", "Message", "RoadNumber", "LocationDescriptor", "SeverityCode", "SeverityText", "NumberOfLanesRestricted",
    "TemporaryLimit", "TrafficRestrictionType", "Geometry.Point.WGS84", "Geometry.Line.WGS84"].map((f) => `Deviation.${f}`);
  return [
    // Inget tidsfilter här: avvikelser utan sluttid (vägarbeten tills vidare) skulle falla bort. byggRapport avgör vad som är aktivt.
    { objecttype: "Situation", version: "1.6", ns: "road.trafficinfo", filter: `<IN name="Deviation.MessageTypeValue" value="${TYPER}"/>`, include: ["Id", "Deleted", ...DEV] },
    { objecttype: "TravelTimeRoute", version: "1.6", ns: "road.trafficinfo", filter: "",
      include: ["Id", "Name", "TravelTime", "FreeFlowTravelTime", "TrafficStatus", "MeasureTime", "Geometry.WGS84"] },
    { objecttype: "FerryAnnouncement", version: "1.2", ns: "ferry.trafficinfo", filter: `<AND><GTE name="DepartureTime" value="${fran}"/><LT name="DepartureTime" value="${till}"/></AND>`, include: [] },
    { objecttype: "FerryRoute", version: "1.2", ns: "ferry.trafficinfo", filter: "", include: [] },
  ];
}

/** Stationerna rapporten bär: bara de i lägesfilens weather[] (ytan högst +3 °C), de enda som kan stå som frysrisk — namnen för alla
 *  855 vägde 8,8 kB (#530). `latest` är raderna ur weather_latest. */
export function kallaStationer(live: Pick<LiveDoc, "weather">, latest: { station_id: unknown; name: unknown; air_temp_c: unknown }[]): In["stationer"] {
  const kalla = new Set((live.weather as any[]).map((w) => String(w.id)));
  return latest.filter((w) => kalla.has(String(w.station_id)))
    .map((w) => ({ id: String(w.station_id), namn: String(w.name ?? ""), luft: w.air_temp_c == null ? null : Number(w.air_temp_c) }));
}

/** Rapportfilens två delar ur Trafikverkets svar. Rena data; texten är Trafikverkets egen, bara kortad. */
export function byggRapport(x: In): { snabb: Rapport; lang: Linjer } {
  const iso = new Date(x.nu).toISOString();
  const poster: Post[] = [], linjer: Record<string, Linje[]> = {}, noter: string[] = [];
  let lagda = 0, sammanslagna = 0;
  for (const s of x.situationer) {
    if (s.Deleted) continue;
    const egna: Post[] = [], granser: number[] = [];
    for (const d of s.Deviation ?? []) {
      if (d.Suspended) continue;
      const start = d.StartTime ? Date.parse(d.StartTime) : -Infinity, slut = d.EndTime ? Date.parse(d.EndTime) : Infinity;
      if (!(start <= x.nu && x.nu < slut)) continue;
      const slag = slagFor(d); if (!slag) continue;
      const p = punktUr(d.Geometry?.Point?.WGS84), l = linjerUr(d.Geometry?.Line?.WGS84);
      if (!p && !l.length) continue;
      const id = `dev:${d.Id}`;
      const kmh = Number(/(\d+)\s*km\/h/i.exec(String(d.TemporaryLimit ?? ""))?.[1]);
      const post: Post = { id, slag, rubrik: slag === "hastighet" ? (Number.isFinite(kmh) ? `${kmh} km/h` : "Tillfälligt nedsatt hastighet")
        : slag === "omledning" ? "Omledning" : ren(d.MessageCode, 60) || RUBRIK[slag],
        t: ren(d.Header ?? d.Message, 100) || ren(d.LocationDescriptor, 100) || undefined,
        ...(p ? { p } : {}), ...(l.length ? { l: id } : {}), vag: vagNamn(d.RoadNumber),
        ...(slag === "vagarbete" || slag === "olycka" || slag === "hinder" || slag === "ko" ? { start: d.StartTime ?? d.CreationTime ?? null } : {}),
        ...(slag !== "olycka" ? { slut: d.ValidUntilFurtherNotice ? "tv" : d.EndTime ? datumIso(d.EndTime) : null } : {}),
        ...(d.NumberOfLanesRestricted ? { korfalt: Number(d.NumberOfLanesRestricted) } : {}), sev: d.SeverityCode ?? null };
      if (l.length) linjer[id] = l;
      if (slag === "hastighet" && Number.isFinite(kmh)) granser.push(kmh);
      egna.push(post);
    }
    // Hastigheten vid ett vägarbete är vägarbetets (795 av 841 låg inom 100 m av ett, #530): den lägsta gränsen läggs på situationens
    // vägarbete, och hastighetsposterna stryks. En hastighet utan vägarbete i samma situation står kvar för sig.
    // Och en situation är ETT vägarbete: Trafikverket skriver ofta samma arbete som både *Vägarbete* och *Körfältsavstängningar*
    // (visningen mot första körningen, "Vägarbete söder om Vä" två gånger). De slås ihop i den första: flest avstängda körfält,
    // högsta påverkan, första texten och geometrin; de andras linjer stryks.
    const va = egna.filter((q) => q.slag === "vagarbete");
    const forsta = va[0];
    for (const q of egna) {
      if (q.slag === "hastighet" && va.length && granser.length) { lagda++; delete linjer[q.id]; continue; }
      if (q.slag === "vagarbete" && q !== forsta) {
        if (q.korfalt && (!forsta.korfalt || q.korfalt > forsta.korfalt)) forsta.korfalt = q.korfalt;
        if (q.sev != null && (forsta.sev == null || q.sev > forsta.sev)) forsta.sev = q.sev;
        if (!forsta.t && q.t) forsta.t = q.t;
        if (!forsta.p && !forsta.l) { forsta.p = q.p; forsta.l = q.l; } else if (q.l && q.l !== forsta.l) delete linjer[q.l];
        sammanslagna++; continue;
      }
      if (q === forsta && granser.length) q.grans = Math.min(...granser);
      poster.push(q);
    }
  }
  if (lagda) noter.push(`${lagda} hastigheter lagda på sitt vägarbete`);
  if (sammanslagna) noter.push(`${sammanslagna} avvikelser sammanslagna med sitt vägarbete i samma situation`);
  for (const r of x.restider) {
    const l = linjerUr(r.Geometry?.WGS84); if (!l.length) continue;
    const id = `tt:${r.Id}`; linjer[id] = l;
    const tid = Number(r.TravelTime), normal = Number(r.FreeFlowTravelTime);
    const min = (s: number) => Math.round(s / 60);
    const extra = Number.isFinite(tid) && Number.isFinite(normal) ? min(tid) - min(normal) : null;
    poster.push({ id, slag: extra !== null && extra >= 2 ? "ko" : "restid", rubrik: ren(r.Name, 80) || "Restidssträcka", l: id,
      ...(Number.isFinite(tid) ? { tid: min(tid) } : {}), ...(Number.isFinite(normal) ? { normal: min(normal) } : {}), status: r.TrafficStatus ?? null });
  }
  const ledLinje = new Map<string, string>();
  // FerryRoute bär en PUNKT för leden, inte en linje (torrkörningen 38135721921). Överfarterna är korta, så punkten mäts mot rutten
  // med färjans marginal; en led med linje mäts som linje.
  const ledPunkt = new Map<string, [number, number]>();
  for (const f of x.farjeleder) {
    const l = linjerUr(f.Geometry?.WGS84), p = punktUr(f.Geometry?.WGS84);
    if (l.length) { const id = `led:${f.Id}`; linjer[id] = l; ledLinje.set(String(f.Id), id); } else if (p) ledPunkt.set(String(f.Id), p);
  }
  if (x.farjeleder.length && !ledLinje.size && !ledPunkt.size) noter.push(`färjelederna saknar geometri (${Object.keys(x.farjeleder[0] ?? {}).join(", ")})`);
  const perLed = new Map<string, any[]>();
  for (const a of x.farjor) {
    if (a.Deleted) continue;
    const led = String(a.Route?.Id ?? ""); const l = perLed.get(led) ?? []; l.push(a); perLed.set(led, l);
  }
  for (const [led, avg] of perLed) {
    const lid = ledLinje.get(led), lp = ledPunkt.get(led); if (!lid && !lp) continue;
    avg.sort((a, b) => Date.parse(a.DepartureTime) - Date.parse(b.DepartureTime));
    const nasta = avg.slice(0, 3).map((a) => `${klocka(a.DepartureTime)} från ${ren(a.FromHarbor?.Name, 40)}`);
    poster.push({ id: `farja:${led}`, slag: "farja", rubrik: ren(avg[0].Route?.Name, 60) || "Färja", text: `nästa ${nasta.join(", ")}`,
      ...(lid ? { l: lid } : { p: lp }), avgangar24h: avg.length });
  }
  const stationer = Object.fromEntries(x.stationer.map((s) => [s.id, { namn: s.namn, luft: s.luft }]));
  return { snabb: { schema: 2, generated_at: iso, poster, noter, stationer }, lang: { schema: 2, generated_at: iso, linjer } };
}

// ── Favoritprovet: det fliken skulle visa för en rutt ───────────────────────────────────────────────────────────────────────
export type Rad = { id: string; slag: Slag; rubrik: string; text: string; avstandM: number; langsM: number;
  /** Vägnumret när källan säger det, och starttiden för avvikelser — sammanslagningen och notisregeln läser dem (#530). */
  vag: string | null; start: string | null };

const grader = (v: number | null | undefined) => v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1).replace(".", ",")} °C`;
/** Punkt i polygon (GeoJSON-ringar, jämn–udda), för SMHI:s områden. */
function iRing(x: number, y: number, ring: number[][]): boolean {
  let inne = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inne = !inne;
  }
  return inne;
}
function polygonTraffar(geom: any, rutt: Linje): boolean {
  const polys: number[][][][] = geom?.type === "Polygon" ? [geom.coordinates] : geom?.type === "MultiPolygon" ? geom.coordinates : [];
  // Rutten provas var 0,02:e grad (~1–2 km): räcker för ett länsstort område.
  for (let i = 0; i < rutt.length - 1; i++) {
    const [ax, ay] = rutt[i], [bx, by] = rutt[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.02));
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
      if (polys.some((poly) => iRing(x, y, poly[0]) && !poly.slice(1).some((hal) => iRing(x, y, hal)))) return true;
    }
  }
  return false;
}

/** Rutnätet längs rutten: rutor om RUTA_GRAD grader, och i varje ruta indexen för ruttens sträckor som — vidgade med marginM — når in
 *  i den. Svaret för en kandidat (punkt eller linjens rektangel) är det första och sista sträckindexet i dess rutor, eller null om
 *  ingen sträcka ligger nära. Kandidaten behöver då bara mätas mot den biten av rutten: en sträcka utanför rutorna ligger längre bort
 *  än marginalen (#531; rutterna längs vägen har 200–1 460 punkter, och varje linje mot hela rutten tog sekunder). Försiktigt: hellre
 *  en ruta för mycket än en för lite. */
export const RUTA_GRAD = 0.05;
export function rutnat(rutt: Linje, marginM: number): (geo: Hazard[]) => [number, number] | null {
  const rutor = new Map<string, number[]>();
  const nord = Math.max(...rutt.map((p) => Math.abs(p[1])));
  const dy = marginM / 110_000, dx = marginM / (111_320 * Math.cos((nord * Math.PI) / 180));
  const cell = (v: number) => Math.floor(v / RUTA_GRAD);
  for (let i = 0; i < rutt.length - 1; i++) {
    const [ax, ay] = rutt[i], [bx, by] = rutt[i + 1];
    for (let cx = cell(Math.min(ax, bx) - dx); cx <= cell(Math.max(ax, bx) + dx); cx++)
      for (let cy = cell(Math.min(ay, by) - dy); cy <= cell(Math.max(ay, by) + dy); cy++) {
        const k = `${cx},${cy}`; const l = rutor.get(k); if (l) l.push(i); else rutor.set(k, [i]);
      }
  }
  return (geo) => {
    let i0 = Infinity, i1 = -Infinity;
    for (const h of geo) {
      const ps: number[][] = h.kind === "slippery_segment" ? h.line : [[(h as any).lon, (h as any).lat]];
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of ps) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (let cx = cell(x0); cx <= cell(x1); cx++) for (let cy = cell(y0); cy <= cell(y1); cy++) {
        const l = rutor.get(`${cx},${cy}`);
        if (l) for (const s of l) { if (s < i0) i0 = s; if (s > i1) i1 = s; }
      }
    }
    return i0 === Infinity ? null : [i0, i1];
  };
}

/** Ligger linjen längs rutten och inte bara tvärs över den? Linjen provas var LANGS_STEG_M:e meter. */
export function langsVagen(geo: Hazard[], rutt: Linje, marginalM: number): boolean {
  const prov = geo.flatMap((h) => h.kind === "slippery_segment" ? samplePolyline(h.line, LANGS_STEG_M) : [])
    .map((q, i) => ({ id: `s${i}`, kind: "accident", lon: q.lon, lat: q.lat } as Hazard));
  if (!prov.length) return true;
  const inom = farorLangsRutten(prov, rutt, marginalM).length;
  return inom / prov.length >= LANGS_ANDEL || inom * LANGS_STEG_M >= LANGS_MINST_M;
}

/** Det fliken skulle visa för rutten: rader i viktordning, inom slagets ordning i körordning. */
export function favoritRapport(rutt: Linje, live: LiveDoc, stat: StaticDoc, snabb: Rapport, lang: Linjer,
  marginal: Record<Slag, number> = MARGINALER): Rad[] {
  // Varje kandidat har en eller flera geometrier: en punkt, eller linjens delar var för sig (en multilinje sammanfogad till en linje
  // skulle få en falsk sträcka mellan delarna, som kan korsa rutten). Den närmaste delen räknas.
  const kand: { id: string; slag: Slag; rubrik: string; text: string; geo: Hazard[]; vag?: string | null; start?: string | null; post?: Post }[] = [];
  const pkt = (id: string, lon: number, lat: number) => [{ id, kind: "accident", lon, lat } as Hazard];
  const lin = (id: string, delar: Linje[]) => delar.filter((l) => l.length >= 2).map((line, i) => ({ id: `${id}#${i}`, kind: "slippery_segment", line } as Hazard));
  const st = snabb.stationer;
  const cfg = DEFAULT_CONFIG;
  for (const s of live.segments) kand.push({ id: `seg:${s.id}`, slag: "halka", rubrik: `Halt väglag${vagNamn(s.road) ? ` på ${vagNamn(s.road)}` : ""}`,
    text: s.info.join(", ") || "halka rapporterad på sträckan", geo: lin(`seg:${s.id}`, [s.line]), vag: vagNamn(s.road) });
  for (const w of live.weather) {
    const t = w.yta, frys = t != null && t <= 1 && w.fukt;
    // S3 (#524): samma villkor som motorn, med motorns startvärden.
    const beta = !frys && t != null && w.regn_h != null && w.lutning30 != null && t >= cfg.efterhalkaYtaMinC && t <= cfg.efterhalkaYtaMaxC
      && w.lutning30 >= cfg.efterhalkaFall30C && w.regn_h <= cfg.efterhalkaRegnH;
    if (!frys && !beta) continue;
    const namn = st[w.id]?.namn;
    kand.push({ id: `wx:${w.id}`, slag: "frysrisk", rubrik: `Frysrisk vid stationen${namn ? ` i ${namn}` : ""}${beta ? " (beta)" : ""}`,
      text: `Vägytan ${grader(t)}, luften ${grader(st[w.id]?.luft)}${w.fukt ? ", fukt på vägbanan" : ""}${beta ? ", efter regnet" : ""}`,
      geo: pkt(`wx:${w.id}`, w.lon, w.lat) });
  }
  for (const b of live.bridges ?? []) if (b.yta != null && b.yta <= 3 && b.fukt) kand.push({ id: `bro:${b.id}`, slag: "frysrisk",
    rubrik: `Frysrisk på bron${vagNamn(b.road) ? ` på ${vagNamn(b.road)}` : ""}`, text: `närmaste station ${grader(b.yta)}`, geo: pkt(`bro:${b.id}`, b.lon, b.lat), vag: b.road });
  for (const c of stat.cameras) kand.push({ id: `cam:${c.id}`, slag: "kamera", rubrik: "Fartkamera", text: vagNamn(c.road) ?? "",
    geo: pkt(`cam:${c.id}`, c.lon, c.lat), vag: vagNamn(c.road) });
  for (const p of snabb.poster) {
    const geo = p.l ? lin(p.id, lang.linjer[p.l] ?? []) : p.p ? pkt(p.id, p.p[0], p.p[1]) : [];
    // Texten sätts ihop först för det som träffar rutten (nedan): visning() för varje post på varje rutt kostade mest av tiden.
    if (geo.length) kand.push({ id: p.id, slag: p.slag, rubrik: p.rubrik, text: "", post: p, geo, vag: (p.vag as string | null) ?? null,
      start: (p.start as string | null) ?? null });
  }
  // Grovt förfilter per rutt: ett RUTNÄT längs vägen (#531). Varje ruta som en av ruttens sträckor — vidgad med den största marginalen
  // och lite till — når in i markeras; en kandidat mäts mot linjen bara om dess egen ruta når in i en markerad ruta. Rektangeln runt
  // hela rutten (rutaKring) släppte igenom en stor del av landet för en diagonal rutt på 300 km. Utfallet är detsamma —
  // farorLangsRutten tar ändå bara det inom marginalen — men arbetet en bråkdel.
  const skar = rutnat(rutt, Math.max(...Object.values(marginal)) + 200);
  const rader: Rad[] = [];
  // Platsen längs rutten räknas som i farorLangsRutten (haversine per sträcka), så att biten plus avståndet fram till den ger samma tal.
  const kum = [0];
  for (let i = 1; i < rutt.length; i++) kum.push(kum[i - 1] + haversineM({ lon: rutt[i - 1][0], lat: rutt[i - 1][1] }, { lon: rutt[i][0], lat: rutt[i][1] }));
  for (const k of kand) {
    const nara = skar(k.geo); if (!nara) continue;
    const bit = rutt.slice(nara[0], nara[1] + 2), fore = kum[nara[0]];
    const traff = farorLangsRutten(k.geo, bit, marginal[k.slag]).sort((a, b) => a.avstandM - b.avstandM)[0];
    if (traff && k.geo[0].kind === "slippery_segment" && !langsVagen(k.geo, bit, marginal[k.slag])) continue;
    if (traff) rader.push({ id: k.id, slag: k.slag, rubrik: k.rubrik, text: k.post ? visning(k.post) : k.text, avstandM: Math.round(traff.avstandM), langsM: Math.round(fore + traff.langsM),
      vag: k.vag ?? null, start: k.start ?? null });
  }
  for (const w of live.smhi as any[]) if (polygonTraffar(w.geom, rutt)) rader.push({ id: `smhi:${w.id}:${w.event}`, slag: "smhi",
    rubrik: `SMHI: ${w.event ?? "varning"}`, text: `nivå ${w.niva ?? "–"}`, avstandM: 0, langsM: 0, vag: null, start: null });
  return rader.sort((a, b) => ORDNING.indexOf(a.slag) - ORDNING.indexOf(b.slag) || a.langsM - b.langsM || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Det som är nytt sedan förra kollen: id som inte fanns då. Första kollen har inget nytt. */
export function nyttSedan(fore: Rad[] | null, nu: Rad[]): string[] {
  if (!fore) return [];
  const fanns = new Set(fore.map((r) => r.id));
  return nu.filter((r) => !fanns.has(r.id)).map((r) => r.id);
}

/** Det tomma på en rad (§3, punkt 4): slagen utan något, i viktordning. Köerna mäts bara där en restidssträcka går längs rutten. */
export function tomma(rader: Rad[]): { inget: Slag[]; koerMatsInte: boolean } {
  const finns = new Set(rader.map((r) => r.slag));
  return { inget: ORDNING.filter((s) => !finns.has(s) && s !== "restid"), koerMatsInte: !rader.some((r) => r.id.startsWith("tt:")) };
}

// ── Sammanslagningen och notisen (DECISIONS #530) ────────────────────────────────────────────────────────────────────────────
/** En rad på skärmen: en enskild sak, eller flera av samma slag på samma väg. `ids` är raderna den står för. */
export type Grupp = { id: string; slag: Slag; rubrik: string; text: string; antal: number; ids: string[]; langsM: number };

/** Det som alltid står för sig: det viktiga och det sällsynta. Resten slås samman per väg från GRUPP_FRAN av samma slag. */
const ENSKILD = new Set<Slag>(["halka", "frysrisk", "olycka", "hinder", "vilt", "ko", "farja", "smhi"]);
export const GRUPP_FRAN = 3;
const ORD: Partial<Record<Slag, [string, string]>> = { kamera: ["fartkamera", "fartkameror"], vagarbete: ["vägarbete", "vägarbeten"],
  hastighet: ["hastighetsbegränsning", "hastighetsbegränsningar"], omledning: ["omledning", "omledningar"], restid: ["restidssträcka", "restidssträckor"] };
const TAL = ["noll", "en", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio", "elva", "tolv"];
const kmText = (m: number) => `${(m / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} km`;

/** Raderna sammanslagna för skärmen (favoritsidan §3: "Tre fartkameror"; en rapport som går att läsa på några sekunder). Kameror och
 *  restider i normal trafik slås alltid samman, vägarbeten, hastigheter och omledningar per väg från GRUPP_FRAN. Ordningen är rapportens. */
export function grupperade(rader: Rad[]): Grupp[] {
  const ut: Grupp[] = [], hinkar = new Map<string, Rad[]>();
  for (const r of rader) {
    if (ENSKILD.has(r.slag)) { ut.push({ id: r.id, slag: r.slag, rubrik: r.rubrik, text: r.text, antal: 1, ids: [r.id], langsM: r.langsM }); continue; }
    const nyckel = r.slag === "restid" ? "restid" : `${r.slag}|${r.vag ?? ""}`;
    const l = hinkar.get(nyckel) ?? []; l.push(r); hinkar.set(nyckel, l);
  }
  for (const [nyckel, l] of hinkar) {
    const slag = l[0].slag, vag = l[0].vag;
    const samman = slag === "kamera" || slag === "restid" || l.length >= GRUPP_FRAN;
    if (!samman) { for (const r of l) ut.push({ id: r.id, slag, rubrik: r.rubrik, text: r.text, antal: 1, ids: [r.id], langsM: r.langsM }); continue; }
    const [en, flera] = ORD[slag]!;
    const n = l.length, tal = n < TAL.length ? TAL[n] : String(n);
    const rubrik = `${tal[0].toUpperCase()}${tal.slice(1)} ${n === 1 ? en : flera}${slag !== "restid" && vag ? ` på ${vag}` : ""}`;
    const fran = Math.min(...l.map((r) => r.langsM)), till = Math.max(...l.map((r) => r.langsM));
    const text = slag === "kamera" ? "Rösten säger till före varje kamera."
      : slag === "restid" ? "Normal trafik på sträckorna längs rutten."
      : `${n === 1 ? "" : `Mellan ${kmText(fran)} och ${kmText(till)} in på rutten. `}Närmast: ${l.sort((a, b) => a.langsM - b.langsM)[0].text || l[0].rubrik}`;
    ut.push({ id: `grupp:${nyckel}`, slag, rubrik, text, antal: n, ids: l.map((r) => r.id), langsM: fran });
  }
  return ut.sort((a, b) => ORDNING.indexOf(a.slag) - ORDNING.indexOf(b.slag) || a.langsM - b.langsM || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Vad som ger en notis (favoritsidan §5): ny halka eller frysrisk, en olycka, ett hinder eller djur på vägen, och ett NYTT vägarbete
 *  — ett som började inom NYTT_VAGARBETE_H timmar. Aldrig: vägarbeten som pågått länge, det som stod i förra kollen, prognosen och
 *  SMHI:s varningar (T6). En inställd färja står också i §5, men Trafikverkets fält säger inte inställd (DeviationId bär ett värde på
 *  varje avgång, #528) — den regeln väntar. */
export const NYTT_VAGARBETE_H = 24;
const NOTIS = new Set<Slag>(["halka", "frysrisk", "olycka", "hinder", "vilt"]);
export function notis(rader: Rad[], nytt: string[], nu: number): { ja: boolean; ids: string[] } {
  const ny = new Set(nytt);
  const ids = rader.filter((r) => ny.has(r.id) && (NOTIS.has(r.slag) ||
    (r.slag === "vagarbete" && r.start != null && nu - Date.parse(r.start) <= NYTT_VAGARBETE_H * 3_600_000))).map((r) => r.id);
  return { ja: ids.length > 0, ids };
}


// ═══ supabase/functions/favoriter/main.ts ═══
// FAVORITER — appens rapportfil (favoriterna version 1, kort #357; DECISIONS #541, #616, #617). Bygger rapportfilen var tionde minut
// (:x6, sql/061) med samma frågor och samma kärna som favoritprovet (publish/rapport-core.ts: rapportFragor, kallaStationer,
// byggRapport) och skriver den till den publika hinken `favoriter` i Supabase Storage, där appen hämtar den (Bengts val a 17/10, #617):
// rapport-snabb.json, rapport-lang.json (bara när linjerna ändrats) och sist manifest.json med sha256 för båda, så att manifestet aldrig
// pekar på en fil som inte är skriven. Appen hämtar manifestet, och filerna bara när kontrollsumman ändrats; en fil vars sha256 inte
// stämmer förkastas och den förra behålls (CLAUDE.md). Filerna skrivs över, så ingen historik växer. Inga rutter och inga förare här:
// matchningen mot förarens rutt sker i telefonen. Favoritprovet (testmiljön, #529) står kvar och rörs inte av den här funktionen.
//
// index.ts är GENERERAD av scripts/bundle-favoriter.ts ur engine/src, publish/rapport-core.ts och den här filen — ändra aldrig i
// index.ts. Svaret bär tiden per steg, minnet och storlekarna, så att marginalen mot resursfelen (546, #344, #360) går att läsa ur
// net._http_response.
const SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRV = Deno.env.get("TRAFIKVERKET_API_KEY")!;
const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const HINK = "favoriter";
const HISTORIK = 144;   // ett dygn med sex körningar i timmen
const mb = (b: number) => Math.round(b / 1e5) / 10;
function minnesmatare() {
  let rss = 0, heap = 0, ok = false;
  const mat = () => { try { const m = Deno.memoryUsage(); rss = Math.max(rss, m.rss); heap = Math.max(heap, m.heapUsed); ok = true; } catch { /* API:t saknas */ } };
  return { mat, varde: () => (ok ? { heap: mb(heap), rss: mb(rss) } : null) };
}

async function trv({ objecttype: objekt, version, ns, filter, include }: Fraga, limit = 20000): Promise<{ rader: any[]; byte: number }> {
  const inc = include.map((f) => `<INCLUDE>${f}</INCLUDE>`).join("");
  const q = `<REQUEST><LOGIN authenticationkey="${TRV}"/><QUERY objecttype="${objekt}" schemaversion="${version}" namespace="${ns}" limit="${limit}">` +
    `${filter ? `<FILTER>${filter}</FILTER>` : ""}${inc}</QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const text = await r.text();
  // Felet bär svarskroppen (CLAUDE.md: "TRV 400" utan kropp kostade ett diagnosvarv).
  if (!r.ok) throw new Error(`${objekt} ${r.status}: ${text.slice(0, 300)}`);
  const rader = JSON.parse(text)?.RESPONSE?.RESULT?.[0]?.[objekt] ?? [];
  if (rader.length >= limit) throw new Error(`${objekt}: taket ${limit} nått — svaret är ofullständigt`);
  return { rader, byte: text.length };
}

const hinkUrl = (namn: string) => `${SB}/storage/v1/object/${HINK}/${namn}`;
async function lasHink(namn: string): Promise<any | null> {
  const r = await fetch(hinkUrl(namn), { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } });
  return r.ok ? r.json() : null;
}
async function skrivHink(namn: string, json: string) {
  const r = await fetch(hinkUrl(namn), { method: "POST", body: json, headers: { Authorization: `Bearer ${SRK}`, apikey: SRK,
    "Content-Type": "application/json", "x-upsert": "true", "cache-control": "max-age=60" } });
  if (!r.ok) throw new Error(`hinken ${namn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
async function sha256(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Storleken i byte som filen ligger i hinken (UTF-8), inte i tecken: å, ä och ö är två byte (17/10: 386 171 byte mot 380 188 tecken).
const utf8Byte = (s: string) => new TextEncoder().encode(s).length;
async function gzBytes(s: string): Promise<number> {
  const cs = new CompressionStream("gzip"); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(s)); w.close();
  return (await new Response(cs.readable).arrayBuffer()).byteLength;
}

import { nyckelGiltig } from "../_shared/nyckel.ts";
Deno.serve(async (req) => {
  if (!(await nyckelGiltig(req))) return new Response("forbidden", { status: 403 });  // nyckeln i databasen, DECISIONS #571
  const minne = minnesmatare(); minne.mat();
  const t0 = performance.now(); const ms: Record<string, number> = {}; const steg = (n: string, t: number) => { ms[n] = Math.round(performance.now() - t); minne.mat(); };
  try {
    const nu = Date.now();
    let t = performance.now();
    const [qSit, qTt, qFa, qFr] = rapportFragor(nu);
    const [sit, tt, fa, fr, lv, wl] = await Promise.all([
      trv(qSit), trv(qTt), trv(qFa), trv(qFr),
      fetch(CDN + "live.json?t=" + nu).then((r) => r.json()),
      fetch(`${SB}/rest/v1/weather_latest?select=station_id,name,air_temp_c`, { headers: { Authorization: `Bearer ${SRK}`, apikey: SRK } }).then((r) => r.json()),
    ]);
    steg("hamtning", t);
    t = performance.now();
    const { snabb, lang } = byggRapport({ nu, situationer: sit.rader, restider: tt.rader, farjor: fa.rader, farjeleder: fr.rader,
      stationer: kallaStationer(lv, wl) });
    steg("rapport", t);
    t = performance.now();
    const sSnabb = JSON.stringify(snabb), sLang = JSON.stringify(lang);
    const fore = await lasHink("manifest.json");
    // Den långsamma delen skrivs bara när linjerna ändrats (docs/FAVORITER.html §7) — generated_at räknas inte.
    const innehall = await sha256(JSON.stringify(lang.linjer));
    const nyLang = !fore?.lang || fore.lang.innehall !== innehall;
    const manifest = { schema: 1, generated_at: snabb.generated_at, lagesfil: lv.generated_at,
      snabb: { fil: "rapport-snabb.json", sha256: await sha256(sSnabb), byte: utf8Byte(sSnabb), gz_byte: await gzBytes(sSnabb) },
      lang: nyLang ? { fil: "rapport-lang.json", sha256: await sha256(sLang), innehall, byte: utf8Byte(sLang), gz_byte: await gzBytes(sLang), skriven: snabb.generated_at }
        : fore.lang };
    await skrivHink("rapport-snabb.json", sSnabb);
    if (nyLang) await skrivHink("rapport-lang.json", sLang);
    await skrivHink("manifest.json", JSON.stringify(manifest));   // sist: manifestet pekar bara på skrivna filer
    steg("skrivning", t);
    const hist = (await lasHink("historik.json"))?.korningar ?? [];
    hist.push({ t: snabb.generated_at, ms: Math.round(performance.now() - t0), minne_mb: minne.varde(), poster: snabb.poster.length,
      snabb_gz: manifest.snabb.gz_byte, lang_gz: manifest.lang.gz_byte, ny_lang: nyLang });
    await skrivHink("historik.json", JSON.stringify({ schema: 1, korningar: hist.slice(-HISTORIK) }));
    return new Response(JSON.stringify({ ok: true, generated_at: snabb.generated_at, poster: snabb.poster.length, noter: snabb.noter,
      svar_byte: { situation: sit.byte, restider: tt.byte, farjor: fa.byte, farjeleder: fr.byte }, manifest, ny_lang: nyLang,
      ms: { ...ms, totalt: Math.round(performance.now() - t0) }, minne_mb: minne.varde() }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    minne.mat();
    return new Response(JSON.stringify({ ok: false, error: String(e), ms, minne_mb: minne.varde() }), { status: 500 });
  }
});
