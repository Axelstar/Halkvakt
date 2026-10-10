// FACITSTACKEN FÖR B-UPPSPELNINGARNA — K-B (kort #309) och R-B (kort #46), DECISIONS #363 och #510.
//
// B-grindarna döms ur arkivet, inte i skuggkolumner (#363). Det här är den gemensamma facitsidan, läst så som efterhalkans
// uppspelning läser den (sql/028, DECISIONS #245, #247):
//   BEKRÄFTAT HALKTILLFÄLLE  en omklassning till halka i road_condition_history på ett vägavsnitt inom FACIT_KM från stationen,
//                            med MOTORNS egna halkord (engine.ts SLIPPERY_INFO/STAM — kontraktsgrinden vaktar kopiorna). En rad per
//                            station och halvtimmeshink; natten räknas i svensk tid, middag till middag, som T-A och R-A.
//   OLYCKA                   situation_archive Accident inom samma radie — räknas SEPARAT och går aldrig in i grundtalet.
//   PUNKTMOTORN I DAG        engine.ts icing_point: yta ≤ 1 °C och fukt (FUKT_SQL, samma ord som snapshoten) — spelas upp ur
//                            stationens egen rad per hink. Det är den "punktmotorn var tyst eller > 30 min senare" mäts mot.
// MÅTTET ÄR B3:S (TROSKLAR-SKUGGAN, -TRENDEN, -FRYSKLASSNINGEN K-B1, -RIMFROST R-B1): per tillfälle T frågas om kandidaten fyrade inom
// UTFALLSFONSTER_MIN före T, och om punktmotorn då var TYST (nettonytt) eller kom mer än SENARE_MIN efter kandidaten (tidsvinst).
// De två redovisas delat och slås aldrig ihop (TRENDEN T-B). Falsklarm: kandidatens fyrningar utan tillfälle inom fönstret efter.
// SPÄRREN ÄR GRIND NT:S: utan --dom skriver uppspelningarna bara räkningar på facitsidan. Den här modulen är ren och läser inget.
// Självtest: node --experimental-strip-types scripts/uppspelning-facit.ts --sjalvtest
export const BUCKET_S = 1800;
export const FACIT_KM = 5;                   // Bengt 20/9, DECISIONS #245 — samma koppling station↔väg som sql/028
export const UTFALLSFONSTER_MIN = 90;        // T-A:s fönster (TROSKLAR-TRENDEN §2), samma som sql/028
export const SENARE_MIN = 30;                // B3: punktmotorn "tyst eller > 30 min senare"
export const FUKT_SQL = "(rain OR snow OR (precipitation IS NOT NULL AND precipitation <> '' AND lower(precipitation) NOT IN ('no', 'dry')))";
export const PUNKT_YTA_C = 1;                // icing_point: yta ≤ 1 °C (bro +3; stationer står inte på broar)
export const BAND_GRANSER = [57.5, 60, 63];  // regionerna i K-C1/R-C2, som NT-D:s breddgradsband
export const bandFor = (lat: number) => BAND_GRANSER.filter((g) => lat >= g).length;

const ZONDAG = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" });
/** Natten i svensk tid, middag till middag (DECISIONS #246, #366): tiden skiftas 12 h. */
export function natt(epochS: number): string {
  const d = Object.fromEntries(ZONDAG.formatToParts(new Date((epochS - 12 * 3600) * 1000)).map((x) => [x.type, x.value]));
  return `${d.year}-${d.month}-${d.day}`;
}

export type Tillfalle = { station: string; b: number; lan: number | null };
/** Fyrningar per station: hinkarna där kandidaten (eller punktmotorn) sa halka. */
export type Fyrningar = Map<string, Set<number>>;

/** Facitfrågan ($1 från, $2 till, ISO): en rad per station och hink med en omklassning till halka inom FACIT_KM. */
export const FACIT_SQL = `
  SELECT DISTINCT wl.station_id, floor(extract(epoch FROM h.modified_time) / ${BUCKET_S})::bigint AS b,
    CASE WHEN array_length(c.county_nos, 1) IS NULL THEN NULL ELSE c.county_nos[1] END AS lan
  FROM road_condition_history h
  JOIN road_conditions c ON c.segment_id = h.segment_id
  JOIN weather_latest wl ON wl.geom IS NOT NULL AND ST_DWithin(c.geom::geography, wl.geom::geography, ${FACIT_KM} * 1000)
  WHERE NOT h.deleted AND c.geom IS NOT NULL AND h.modified_time >= $1 AND h.modified_time < $2
    AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i
                WHERE i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)'
                   OR i ~* '(snö|frost)')`;
/** Olyckorna ($1 från, $2 till): antal Accident inom FACIT_KM från någon station — separat, aldrig i grundtalet. */
export const OLYCKOR_SQL = `
  SELECT count(*)::int AS n FROM situation_archive sa
  WHERE sa.message_type_value = 'Accident' AND sa.geom IS NOT NULL AND sa.start_time >= $1 AND sa.start_time < $2
    AND EXISTS (SELECT 1 FROM weather_latest wl WHERE wl.geom IS NOT NULL AND ST_DWithin(sa.geom::geography, wl.geom::geography, ${FACIT_KM} * 1000))`;

export const FONSTER_HINKAR = (UTFALLSFONSTER_MIN * 60) / BUCKET_S;   // 3

/** Första hinken i [från, till] där stationen fyrade, eller null. */
function forst(f: Fyrningar, station: string, fran: number, till: number): number | null {
  const s = f.get(station);
  if (!s) return null;
  for (let b = fran; b <= till; b++) if (s.has(b)) return b;
  return null;
}

export type B3 = { tillfallen: number; fangade: number; nettonytt: number; tidsvinst: number; punktEnsam: number };
/** B3 per tillfälle T: kandidaten inom [T − fönstret, T]; punktmotorn söks i [T − fönstret, T + fönstret]. */
export function b3(tillf: Tillfalle[], kandidat: Fyrningar, punkt: Fyrningar): B3 {
  const ut: B3 = { tillfallen: tillf.length, fangade: 0, nettonytt: 0, tidsvinst: 0, punktEnsam: 0 };
  for (const t of tillf) {
    const kb = forst(kandidat, t.station, t.b - FONSTER_HINKAR, t.b);
    const pb = forst(punkt, t.station, t.b - FONSTER_HINKAR, t.b + FONSTER_HINKAR);
    if (kb === null) { if (pb !== null) ut.punktEnsam++; continue; }
    ut.fangade++;
    if (pb === null) ut.nettonytt++;
    else if (((pb - kb) * BUCKET_S) / 60 > SENARE_MIN) ut.tidsvinst++;
  }
  return ut;
}

/** Falsklarm: kandidatens fyrningar (station, hink) utan tillfälle vid stationen i (b, b + fönstret]. */
export function falsklarm(fyrningar: { station: string; b: number }[], tillf: Tillfalle[]): { fyrningar: number; utan: number } {
  const per = new Map<string, number[]>();
  for (const t of tillf) { if (!per.has(t.station)) per.set(t.station, []); per.get(t.station)!.push(t.b); }
  let utan = 0;
  for (const f of fyrningar) {
    const bs = per.get(f.station) ?? [];
    if (!bs.some((b) => b > f.b && b <= f.b + FONSTER_HINKAR)) utan++;
  }
  return { fyrningar: fyrningar.length, utan };
}

/** Spärrens utskrift: bara facitsidan. lat ger regionen per station. */
export function sparrRader(tillf: Tillfalle[], olyckor: number, lat: Map<string, number>, frostdygn: Map<number, Set<string>>): string[] {
  const stationer = new Set(tillf.map((t) => t.station));
  const natter = new Set(tillf.map((t) => natt(t.b * BUCKET_S)));
  const regioner = new Set([...stationer].map((s) => bandFor(lat.get(s) ?? NaN)).filter((b) => Number.isFinite(b)));
  const lan = new Set(tillf.map((t) => t.lan).filter((x) => x !== null));
  const dygn = new Set<string>(); for (const s of frostdygn.values()) for (const d of s) dygn.add(d);
  return [
    `FACITSIDAN (räkningar): ${tillf.length} bekräftade halktillfällen (omklassning till halka inom ${FACIT_KM} km) vid ${stationer.size} stationer, ` +
      `${natter.size} nätter, ${regioner.size} regioner, ${lan.size} län · olyckor inom ${FACIT_KM} km: ${olyckor} (separat, aldrig i grundtalet)`,
    `  frostdygn (yta ≤ 0 °C någonstans i regionen): ${dygn.size} dygn i ${[...frostdygn.keys()].filter((k) => (frostdygn.get(k)?.size ?? 0) > 0).length} regioner`,
  ];
}

/** Giltigheten (K-C1 / R-C1–C2): minst `minDygn` frostdygn och minst `minRegioner` regioner med frost. */
export function giltighet(frostdygn: Map<number, Set<string>>, minDygn: number, minRegioner: number): { dygn: number; regioner: number; ok: boolean } {
  const dygn = new Set<string>(); let regioner = 0;
  for (const s of frostdygn.values()) { if (s.size) regioner++; for (const d of s) dygn.add(d); }
  return { dygn: dygn.size, regioner, ok: dygn.size >= minDygn && regioner >= minRegioner };
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const T = 1_000_000;                                                     // hinken för tillfället
  const tillf: Tillfalle[] = [{ station: "A", b: T, lan: 1 }, { station: "B", b: T, lan: 2 }, { station: "C", b: T, lan: 2 }, { station: "D", b: T, lan: null }];
  const f = (x: [string, number[]][]): Fyrningar => new Map(x.map(([s, bs]) => [s, new Set(bs)]));
  // A: kandidaten 2 hinkar före, punkten tyst ⇒ nettonytt. B: kandidaten 3 före, punkten 1 före (60 min senare) ⇒ tidsvinst.
  // C: kandidaten och punkten samma hink ⇒ fångad men varken netto eller tidsvinst. D: bara punkten ⇒ punktEnsam.
  const r = b3(tillf, f([["A", [T - 2]], ["B", [T - 3]], ["C", [T - 1]]]), f([["B", [T - 1]], ["C", [T - 1]], ["D", [T]]]));
  k(r.tillfallen === 4 && r.fangade === 3 && r.nettonytt === 1 && r.tidsvinst === 1 && r.punktEnsam === 1, `b3: ${JSON.stringify(r)}`);
  k(b3(tillf, f([["A", [T - 4]]]), f([])).fangade === 0, "kandidat 4 hinkar (120 min) före tillfället räknas inte: utanför fönstret");
  k(b3(tillf, f([["A", [T + 1]]]), f([])).fangade === 0, "kandidat efter tillfället räknas inte");
  k(b3([tillf[0]], f([["A", [T - 2]]]), f([["A", [T - 1]]])).tidsvinst === 0, "punkten 30 min efter kandidaten är inte > 30 min senare");
  k(b3([tillf[0]], f([["A", [T - 2]]]), f([["A", [T + 2]]])).tidsvinst === 1, "punkten efter tillfället, 120 min efter kandidaten, är tidsvinst");
  const fl = falsklarm([{ station: "A", b: T - 2 }, { station: "A", b: T + 5 }, { station: "Z", b: T }], tillf);
  k(fl.fyrningar === 3 && fl.utan === 2, `falsklarm: fyrningen utan tillfälle inom fönstret räknas (${JSON.stringify(fl)})`);
  k(natt(Date.UTC(2026, 0, 10, 1, 0) / 1000) === "2026-01-09" && natt(Date.UTC(2026, 0, 10, 12, 0) / 1000) === "2026-01-10", "natten går middag till middag i svensk tid");
  const frost = new Map<number, Set<string>>([[0, new Set(["d1", "d2"])], [1, new Set()], [2, new Set(["d1"])], [3, new Set(["d3"])]]);
  const g = giltighet(frost, 3, 3);
  k(g.dygn === 3 && g.regioner === 3 && g.ok, `giltigheten räknar dygn över regioner (${JSON.stringify(g)})`);
  k(!giltighet(frost, 4, 3).ok && !giltighet(frost, 3, 4).ok, "för få dygn eller regioner ⇒ inte giltig");
  const rader = sparrRader(tillf, 7, new Map([["A", 66], ["B", 59], ["C", 58], ["D", 56]]), frost);
  k(rader[0].includes("4 bekräftade") && rader[0].includes("4 stationer") && rader[0].includes("3 regioner") && rader[0].includes("2 län") && rader[0].includes("olyckor inom 5 km: 7"), `spärrens rad: ${rader[0]}`);
  k(!rader.join("\n").match(/träff|andel|%/), "spärren skriver ingen andel");
  k(FACIT_SQL.includes("i ~* '(^|[^a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)'") && FACIT_SQL.includes("OR i ~* '(snö|frost)'"), "facitfrågan bär motorns halkord i kontraktets form");
  k(FACIT_SQL.includes(`${FACIT_KM} * 1000`) && FACIT_SQL.includes("NOT h.deleted"), "facitfrågan: radien och raderingarna");
  console.log("✓ självtest: B3 per tillfälle (netto, tidsvinst, fönstret), falsklarm, natten, giltigheten, spärrens rad och facitfrågans form");
  process.exit(0);
}
