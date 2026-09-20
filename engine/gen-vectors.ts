// Generates engine/vectors/*.json — one scenario per discipline rule (PLAN §1).
// Workflow (documented so future-me does not bless outputs blindly):
//   1. Scenarios are constructed from first principles (positions, speeds, geometry).
//   2. The engine computes the alert log; this script prints an audit table.
//   3. A human (Claude) checks the numbers against hand calculation, THEN freezes.
//   DESIGN RULE (learned from the Swift port): never place an eligibility boundary
//   within ~1 m of an integer-second fix position — sub-cm margins are decided by
//   platform libm rounding, not by engine semantics. Keep margins ≥ 5 m.
//   4. test/engine.test.ts locks the frozen logs + independent invariants forever.
// Regenerate only on a deliberate spec change: node --experimental-strip-types engine/gen-vectors.ts

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { AlertEngine } from "./src/engine.ts";
import type { Fix, Hazard } from "./src/types.ts";

const M_PER_DEG_LAT = 111_320;
const LON0 = 15.0;
const LAT0 = 58.0;

/** Straight due-north drive: 1 Hz fixes, constant speed. Position = metres north of LAT0. */
function northTrace(seconds: number, kmh: number, startNorthM = 0): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const out: Fix[] = [];
  for (let t = 0; t <= seconds; t++) {
    out.push({ t, lon: LON0, lat: LAT0 + (startNorthM + t * mps) / M_PER_DEG_LAT });
  }
  return out;
}
const northOf = (m: number) => LAT0 + m / M_PER_DEG_LAT;
const eastOf = (m: number) => LON0 + m / (M_PER_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180));
// v05:s kamera B och hela v23 byggdes 13/9 för hand med 111 000 m per latitudgrad (v23 med nio decimaler), inte med
// northOf:s 111 320. De återskapas exakt så: en frusen vektor ändras inte för att generatorn ska se prydligare ut (#195).
const n9 = (m: number) => +(LAT0 + m / 111_000).toFixed(9);

interface Scenario {
  file: string; name: string; description: string;
  hazards: Hazard[]; trace: Fix[];
  updates?: { atT: number; hazards: Hazard[] }[];
}

const scenarios: Scenario[] = [
  {
    file: "v01_camera_simple", name: "Kamera rakt fram",
    description:
      "80 km/h norrut, kamera 3 km fram (bearing 0 = fotar vår riktning). Exakt EN varning ~500 m före. " +
      "RIKTNING 2/9: bearing 180 = kameran tittar söderut ⇒ fotar norrgående = vår riktning.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 180 }],
    trace: northTrace(180, 80),
  },
  {
    file: "v02_camera_behind", name: "Kamera bakom oss",
    description:
      "Kameran passerades innan start. Tystnad. Kamerornas bearing vänd 180° 2/9: Trafikverkets värde är " +
      "riktningen kameran TITTAR, färdriktningen den fotar är motsatt.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(-300), bearing: 180 }],
    trace: northTrace(60, 80),
  },
  {
    file: "v03_camera_side", name: "Kamera på annan väg",
    description:
      "Kamera 2 km öster om vår väg — utanför korridoren. Tystnad. Kamerornas bearing vänd 180° 2/9: " +
      "Trafikverkets värde är riktningen kameran TITTAR, färdriktningen den fotar är motsatt.",
    hazards: [{ id: "cam1", kind: "camera", lon: eastOf(2000), lat: northOf(1500), bearing: 180 }],
    trace: northTrace(120, 80),
  },
  {
    file: "v04_priority_drop", name: "Prioritet: olycka vinner, kamera SLÄPPS",
    description:
      "Olycka 5 km fram + kamera 450 m fram blir kvalificerade samtidigt. Olyckan talar; kameran släpps (köas " +
      "ej) och hinner passeras under 45 s-fönstret. Halksegment vid 2 km talar när fönstret öppnat. Kamerornas " +
      "bearing vänd 180° 2/9: Trafikverkets värde är riktningen kameran TITTAR, färdriktningen den fotar är " +
      "motsatt. UPPDATERAD 13/9 (#127): spärren är nu prioritetsmedveten med 10 s golv. Olyckan talar t=1; " +
      "kameran (lägre prioritet) tystas i 10 s och talar sedan t=11 — den är sann och aktuell. Halksegmentet " +
      "t=61 som förr.",
    hazards: [
      { id: "acc1", kind: "accident", lon: LON0, lat: northOf(5000) },
      { id: "cam1", kind: "camera", lon: LON0, lat: northOf(450), bearing: 180 },
      { id: "seg1", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(2000)], [LON0 + 0.01, northOf(2000)]], meta: { code: 2, info: ["Is"] } },
    ],
    trace: northTrace(180, 80),
  },
  {
    file: "v05_throttle_floor_10s", name: "Golvet: andra kameran väntar 10 s, kastas inte (#127)",
    description:
      "OMSKRIVEN 13/9 (#127). Två kameror 200 m isär i 80 km/h = 9 s. camA talar t=113. camB kvalificerar t=122 " +
      "(9 s senare, under golvet) och KASTAS den sekunden — men motorn omprövar varje sekund och camB är " +
      "fortfarande kandidat, så vid t=123 (10 s) är golvet passerat och camB talar. Låser TVÅ saker: att golvet " +
      "finns (t=123, inte t=122) och att en kamera aldrig tystas permanent av det — Bengts mätning: minsta " +
      "avstånd 520 m i samma riktning ⇒ 15,6 s vid 120 km/h, alltid över golvet. Bearing 180 = fotar " +
      "norrgående.",
    hazards: [
      { id: "camA", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 180 },
      { id: "camB", kind: "camera", lon: LON0, lat: LAT0 + 3200 / 111_000, bearing: 180 },
    ],
    trace: northTrace(240, 80),
  },
  {
    file: "v06_no_repeat", name: "Ingen repris inom 10 min / 5 km",
    description: "Passera kameran, vänd, passera igen efter ~3 min. Andra passagen: tystnad (kameran saknar riktning så bara repris-regeln skyddar).",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(1000), bearing: null }],
    trace: (() => {
      const up = northTrace(90, 80);            // 0 → 2000 m norr
      const mps = (80 * 1000) / 3600;
      const top = up[up.length - 1].lat;
      const down: Fix[] = [];
      for (let t = 1; t <= 90; t++) {
        down.push({ t: 90 + t, lon: LON0, lat: top - (t * mps) / M_PER_DEG_LAT });
      }
      return [...up, ...down];
    })(),
  },
  {
    file: "v07_segment_halka", name: "Halksegment (A1)",
    description: "Klassat halksegment (code 2, Is) korsar vägen 2 km fram. Varnar ~30 s före inträde med segment-frasen.",
    hazards: [{ id: "seg1", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(2000)], [LON0 + 0.01, northOf(2000)]], meta: { code: 2, info: ["Is"] } }],
    trace: northTrace(120, 80),
  },
  {
    file: "v08_icing_point", name: "Isrisk vid mätstation (A2)",
    description: "Station 1,9 km fram: yttemp 0.4 °C + fukt. Varnar med punkt-frasen 'framöver'. (1900 m, inte 2000: designregeln — gränsen får inte tangera en fixposition.)",
    hazards: [{ id: "wx1", kind: "icing_point", lon: LON0, lat: northOf(1900), meta: { surfaceTempC: 0.4, moisture: true } }],
    trace: northTrace(120, 80),
  },
  {
    file: "v09_icing_warm", name: "Varm station = tystnad",
    description: "Samma station men yttemp 4 °C. Ingen isrisk, inget ljud.",
    hazards: [{ id: "wx1", kind: "icing_point", lon: LON0, lat: northOf(2000), meta: { surfaceTempC: 4.0, moisture: true } }],
    trace: northTrace(120, 80),
  },
  {
    file: "v10_accident_distance", name: "Olycka med avstånd i klartext",
    description: "Olycka 8 km fram. Talar direkt: 'Olycka rapporterad 8 kilometer framför dig.'",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(8000) }],
    trace: northTrace(60, 80),
  },
  {
    file: "v11_silent_drive", name: "TYSTNADEN — viktigaste vektorn",
    description:
      "Faror finns i världen men inte i vår korridor (20 km bort, bakom, avsides, varm station). En hel körning " +
      "utan ett enda ljud. Kamerornas bearing vänd 180° 2/9: Trafikverkets värde är riktningen kameran TITTAR, " +
      "färdriktningen den fotar är motsatt.",
    hazards: [
      { id: "cam_far", kind: "camera", lon: LON0, lat: northOf(20_000), bearing: 180 },
      { id: "acc_far", kind: "accident", lon: LON0, lat: northOf(15_000) },
      { id: "cam_side", kind: "camera", lon: eastOf(3000), lat: northOf(1000), bearing: 180 },
      { id: "wx_warm", kind: "icing_point", lon: LON0, lat: northOf(800), meta: { surfaceTempC: 12, moisture: false } },
      { id: "seg_normal", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(600)], [LON0 + 0.01, northOf(600)]], meta: { code: 1, info: ["Våt"] } },
      { id: "seg_flackvis", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(900)], [LON0 + 0.01, northOf(900)]], meta: { code: 1, info: ["fläckvis Våt", "fläckvis Torrt"] } },
    ],
    trace: northTrace(120, 80),
  },
  {
    file: "v12_stationary_jitter", name: "Parkerad med GPS-brus",
    description:
      "Stillastående; positionen hoppar ±3 m men telefonens dopplerfart är ~0 (KONTRAKT: appen skickar alltid " +
      "med speedKmh när den finns — härledd fart ur jitter kan se ut som 20 km/h). Kamera 100 m bort. " +
      "Fartspärren håller tyst. Kamerornas bearing vänd 180° 2/9: Trafikverkets värde är riktningen kameran " +
      "TITTAR, färdriktningen den fotar är motsatt.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(100), bearing: 180 }],
    trace: Array.from({ length: 61 }, (_, t) => ({
      t, lon: LON0 + ((t % 3) - 1) * 0.00003, lat: LAT0 + ((t % 2) - 0.5) * 0.00005,
      speedKmh: t % 3, // 0–2 km/h — vad en parkerad telefon faktiskt rapporterar
    })),
  },
  {
    file: "v13_wildlife_beats_camera", name: "Vilt slår kamera i prioritet",
    description:
      "Aktiv viltzon 600 m fram + kamera 480 m fram, kvalificerade samtidigt. Viltet talar; kameran släpps och " +
      "passeras. EN varning. Kamerans bearing 180 = tittar söderut ⇒ fotar vår norrgående riktning " +
      "(riktningsvändningen 2/9). UPPDATERAD 13/9 (#127): viltet talar t=1; kameran tystas 10 s (lägre " +
      "prioritet) och talar t=11. Två varningar nu, båda sanna — en andra, annan, aktuell varning får plats.",
    hazards: [
      { id: "wild1", kind: "wildlife", lon: LON0, lat: northOf(600), meta: { active: true } },
      { id: "cam1", kind: "camera", lon: LON0, lat: northOf(480), bearing: 180 },
    ],
    trace: northTrace(120, 80),
  },
  {
    file: "v14_snapshot_swap", name: "Databyte mitt i körning — minnet överlever (#9)",
    description:
      "cam1 500 m fram fyrar t=1. Vid t=20 byts snapshoten (samma cam1 + ny cam2 2511 m fram). Minnet MÅSTE " +
      "överleva bytet: cam1 får inte upprepas (repris-reglerna gäller via fired-kartan), cam2 fyrar först inom " +
      "500 m vid t=91. En motor som byggs om vid bytet fyrar cam1 igen vid t=20 — exakt det felet den här " +
      "vektorn dödar. (2511, inte 2500: designregeln om gränsmarginal.). Kamerornas bearing vänd 180° 2/9: " +
      "Trafikverkets värde är riktningen kameran TITTAR, färdriktningen den fotar är motsatt.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(500), bearing: 180 }],
    updates: [{
      atT: 20,
      hazards: [
        { id: "cam1", kind: "camera", lon: LON0, lat: northOf(500), bearing: 180 },
        { id: "cam2", kind: "camera", lon: LON0, lat: northOf(2511), bearing: 180 },
      ],
    }],
    trace: northTrace(120, 80),
  },
  // ---- Olyckslyftet (#28, DECISIONS #28). Boundary placement follows the design rule
  // above: the accident sits at 11 019 m so that neither the 10 km horizon nor the 2 km
  // reminder line falls within ~1 m of an integer-second fix (margins here are ~13 m).
  {
    file: "v15_accident_serious_twostep", name: "Allvarlig olycka: tidigt rop + påminnelse",
    description:
      "90 km/h norrut, allvarlig olycka (severity 5, Mycket stor påverkan) 11 019 m fram med röjningstid 14:20. " +
      "Två repliker: det tidiga ropet när 10 km-horisonten passeras (bär omvägsbeslutet) och påminnelsen " +
      "innanför 2 km (bär bara farten). Samma hazardId, två varningsplatser. Vägnummer E4 i rösten (2/9).",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(11_019), meta: { severityCode: 5, endTimeLocal: "14:20", road: "E4" } }],
    trace: northTrace(380, 90),
  },
  {
    file: "v16_accident_serious_late_join", name: "Allvarlig olycka: påhoppad innanför 2 km",
    description:
      "Föraren svänger ut 1 900 m före en allvarlig olycka och hörde aldrig det tidiga ropet. Påminnelsetexten " +
      "vore ofullständig här, så nära-platsen talar late-repliken i stället: samma fakta, utan " +
      "överväg-annan-väg — det finns ingen avfart kvar att ta. Vägnummer E4 i rösten (2/9).",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(1900), meta: { severityCode: 5, road: "E4" } }],
    trace: northTrace(60, 90),
  },
  {
    file: "v17_accident_mild_unchanged", name: "Olycka under tröskeln: oförändrad, talar EN gång",
    description:
      "Samma geometri som v15 men severity 4 (Stor påverkan) — precis UNDER tröskeln 5. Tröskeln är ett " +
      "ägarbeslut (DECISIONS #30a): vid 4 blev tvåsteget normalfallet för två tredjedelar av alla olyckor. Den " +
      "här vektorn låser att 4 ger gamla repliken, en gång. Vägnummer 25 i rösten (2/9).",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(11_019), meta: { severityCode: 4, road: "25" } }],
    trace: northTrace(380, 90),
  },
  {
    file: "v18_bridge_near_freezing", name: "Bro nära frysande station (#38, A2-bro)",
    description:
      "Bro 1,9 km fram. Närmaste station: yttemp +2,5 °C + fukt. Vägen själv skulle tiga (tröskel +1), men " +
      "brobanan fryser först — tröskel +3 ⇒ varnar med bro-frasen. Samma trace som v08.",
    hazards: [{ id: "bro1", kind: "icing_point", lon: LON0, lat: northOf(1900), meta: { surfaceTempC: 2.5, moisture: true, bridge: true } }],
    trace: northTrace(120, 80),
  },
  {
    file: "v19_bridge_warm_silent", name: "Bro vid varm station — tyst (#38)",
    description:
      "Samma bro, station +4,0 °C + fukt. Över brotröskeln +3 ⇒ tystnad. Låser att broregeln inte är 'alltid " +
      "varna vid bro'.",
    hazards: [{ id: "bro1", kind: "icing_point", lon: LON0, lat: northOf(1900), meta: { surfaceTempC: 4, moisture: true, bridge: true } }],
    trace: northTrace(120, 80),
  },
  {
    file: "v20_camera_opposite_silent", name: "Kamera i motsatt riktning — tyst (Bengt, E4 1/9)",
    description:
      "80 km/h norrut (kurs 0°), kamera 3 km fram men bearing 175° — den bevakar MÖTANDE trafik. Ska vara HELT " +
      "tyst. Låser toleransen: med det gamla värdet 100° (fönster 200°) släpptes mötande kameror igenom så fort " +
      "vägen svängde; 60° stänger dem ute. Mätt på publicerad data: 382 av 388 kamerapar inom 300 m pekar isär " +
      ">135°. RIKTNING 2/9: bearing 0 = kameran tittar norrut ⇒ fotar SÖDERgående = mötande.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 0 }],
    trace: northTrace(180, 80),
  },
  {
    file: "v21_camera_curve_still_speaks", name: "Kamera i egen riktning trots kurva — varnar (Bengt 1/9)",
    description:
      "Samma resa, kamera bearing 40° medan vi kör kurs 0°. Vägen svänger — kameran bevakar VÅR riktning och " +
      "ska varna. Låser att 60° inte blev för snävt: en kamera 40° från vår kurs måste fortfarande höras. " +
      "RIKTNING 2/9: bearing 220 ⇒ fotar färdriktning 40°, inom 60° från vår kurs 0°.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 220 }],
    trace: northTrace(180, 80),
  },
  {
    file: "v22_accident_no_road", name: "Olycka utan vägnummer — frasen oförändrad (2/9)",
    description:
      "Samma olycka men Trafikverket saknar vägnummer. Låser att rösten inte säger 'på null' eller tappar " +
      "meningen: utan väg är frasen exakt som före 2/9.",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(8000) }],
    trace: northTrace(60, 80),
  },
  {
    file: "v23_sequence_ice_after_camera", name: "Sekvensfallet: is efter kamera, spärren får inte tysta isen (#127)",
    description:
      "Bengts fynd 13/9. 50 km/h norrut. Fartkamera 3 000 m fram, ishalka 200 m bakom kameran. Kameran " +
      "kvalificerar först (cameraTriggerM 500 fast), isen 283 m senare (leadM 417). Med den gamla " +
      "prioritetsblinda 45-sekundersspärren talade kameran, isen kastades (20 s < 45) och när spärren öppnade " +
      "var föraren 75 m från isen: 30 s framförhållning blev 5. Rätt: isen har HÖGRE prioritet än det som " +
      "senast sades, så spärren får inte kasta den. Kameran först, isen strax efter, båda sanna. Låser att " +
      "spärren är prioritetsmedveten och att golvet (10 s) inte hindrar en högre fara.",
    hazards: [
      { id: "cam1", kind: "camera", lon: LON0, lat: n9(3000), bearing: 180 },
      { id: "is1", kind: "icing_point", lon: LON0, lat: n9(3200), meta: { surfaceTempC: -1, moisture: true } },
    ],
    trace: Array.from({ length: 300 }, (_, t) => ({ t, lon: LON0, lat: n9(t * ((50 * 1000) / 3600)) })),
  },
  {
    file: "v24_vinterord_kod1", name: "Vinterord på kod 1 — sammansättningarna talar, motåtgärderna tiger",
    description:
      "Sju kod 1-segment (Trafikverket: Normalt), var och ett med ett ConditionInfo-ord, 1 km isär så varken " +
      "spärren eller reprisregeln griper in. S8 (#52 före #45): 'Packad snö' på kod 1 MÅSTE larma. Kort #97 " +
      "(Bengt 16/9): 'Rimfrost', 'Nysnö', 'Halkrisk' och 'Halt' tystnade av ordbörjansregeln och ska tala. " +
      "'Halkbekämpning' är en motåtgärd och 'fläckvis Våt' augustis falsklarm — båda tiger. Avstånden är " +
      "förskjutna 11 m: på jämna kilometer låg gränsen 0,65 m från en fix (5-metersregeln), nu 10,3 m.",
    hazards: ([
      ["w1_packad_sno", "Packad snö", 2011], ["w2_rimfrost", "Rimfrost", 3011], ["w3_halkbekampning", "Halkbekämpning", 4011],
      ["w4_nysno", "Nysnö", 5011], ["w5_flackvis", "fläckvis Våt", 6011], ["w6_halkrisk", "Halkrisk", 7011], ["w7_halt", "Halt", 8011],
    ] as [string, string, number][]).map(([id, info, m]): Hazard => ({
      id, kind: "slippery_segment", line: [[LON0 - 0.01, northOf(m)], [LON0 + 0.01, northOf(m)]], meta: { code: 1, info: [info] },
    })),
    trace: northTrace(380, 80),
  },
  {
    file: "v25_accident_serious_slow_approach", name: "Allvarlig olycka i låg fart — exakt två repliker (#211)",
    description:
      "Genomlysningen 20/9: under ~48 km/h tar de 8 km mellan horisonterna mer än 600 s, så reprisregeln (600 s OCH " +
      "5 km) hann återarma det tidiga ropet medan mer än 2 km återstod — 'Överväg annan väg' sades TVÅ gånger före " +
      "påminnelsen, tre repliker mot DECISIONS #28:s två. Nu är det tidiga ropet engångs per fara. 44,5 km/h " +
      "(12,36 m/s) och olyckan 10 945 m fram (severity 5): de enda värdena i 30–47 km/h där BÅDA horisonterna får " +
      "≥ 5 m marginal till närmaste fix (5-metersregeln, uppmätt med motorns haversine 20/9): 10 km-horisonten " +
      "6,7 m före / 5,7 m efter fixen t=76, 2 km-horisonten 5,7 / 6,7 m kring t=724. Exakt två: t=76 tidigt, t=724 " +
      "påminnelse. Motorn före fixen gav tre — det tidiga ropet igen vid t=676 med ~2 590 m kvar.",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(10_945), meta: { severityCode: 5, road: "E6" } }],
    trace: northTrace(760, 44.5),
  },
  {
    file: "v26_accident_road_null", name: "Olycka med road: null — rösten säger ingen väg (#210)",
    description:
      "Publiceraren skriver `road: null` när Trafikverket saknar vägnummer (38 av 732 olyckor på 30 dygn, 20/9). v22 " +
      "låser bara FRÅNVARANDE road; den här låser JSON-null i alla tre vektorläsarna och motorerna: severity 5 så " +
      "det är det tidiga ropet som prövas — exakt den replik som sade 'på väg <null>' i iOS-appen.",
    hazards: [{ id: "acc1", kind: "accident", lon: LON0, lat: northOf(8000), meta: { severityCode: 5, road: null } }],
    trace: northTrace(60, 80),
  },
  {
    file: "v27_priority_breakthrough", name: "Prioritetsgenombrottet: is 6 s efter kamera talar ändå (#127)",
    description:
      "Genomlysningen 20/9: minsta avstånd mellan två varningar i sviten var exakt 10 s, så grenen 'viktigare släpps " +
      "igenom spärren' kördes aldrig (v23:s is kom 20 s efter kameran). 80 km/h norrut = 22,2 m/s. Kamera 3 000 m " +
      "(bearing 180 = fotar vår riktning) kvalificerar vid 500 m: t=113. Isstation 3 300 m, leadM 667 m ⇒ " +
      "kvalificerar när 2 633 m passerats: t=119 (marginal 11 m åt båda hållen), 6 s efter kameran. Is är viktigare " +
      "än kamera, så spärren får inte kasta den: två varningar 6 s isär. Ett motorfel som gör spärren blind igen " +
      "ger isen först t=123.",
    hazards: [
      { id: "cam1", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 180 },
      { id: "is1", kind: "icing_point", lon: LON0, lat: northOf(3300), meta: { surfaceTempC: -1, moisture: true } },
    ],
    trace: northTrace(180, 80),
  },
];

/** Canonical replay-with-updates — the reference all three test runners mirror. */
function runWithUpdates(s: (typeof scenarios)[number]): Alert[] {
  const engine = new AlertEngine(s.hazards);
  const updates = s.updates ?? [];
  let u = 0;
  const alerts: Alert[] = [];
  for (const fix of s.trace) {
    while (u < updates.length && fix.t >= updates[u].atT) {
      engine.updateHazards(updates[u].hazards);
      u++;
    }
    const a = engine.step(fix);
    if (a) alerts.push(a);
  }
  return alerts;
}

mkdirSync(new URL("./vectors/", import.meta.url), { recursive: true });
// Regenerera EN vektor: node --experimental-strip-types engine/gen-vectors.ts v24_vinterord_kod1
// Listan ovan återskapar hela vectors/ (kort #195, 18/9): en fullkörning ska lämna `git status engine/vectors/` tom.
// Ändras en vektorfil för hand ska dess scenario här ändras i samma commit — annars glider de isär igen.
const ONLY = process.argv[2];
for (const s of scenarios) {
  if (ONLY && s.file !== ONLY) continue;
  const alerts = runWithUpdates(s);
  const out = {
    name: s.name, description: s.description,
    hazards: s.hazards, ...(s.updates ? { updates: s.updates } : {}), trace: s.trace, expected: alerts,
  };
  // Skriv bara när INNEHÅLLET ändrats (kort #195): arton filer skrevs om utanför generatorn och bär andra byte för
  // samma värden — inget radslut sist, och v19:s 4.0 som JSON.stringify skriver 4. Samma tolkade JSON ⇒ filen orörd.
  const fil = new URL(`./vectors/${s.file}.json`, import.meta.url);
  const json = JSON.stringify(out, null, 1);
  const orord = existsSync(fil) && JSON.stringify(JSON.parse(readFileSync(fil, "utf8")), null, 1) === json;
  if (!orord) writeFileSync(fil, json + "\n");
  console.log(`\n=== ${s.file}: ${s.name} === ${orord ? "(oförändrad)" : "(SKRIVEN)"}`);
  if (alerts.length === 0) console.log("  (tystnad)");
  for (const a of alerts) {
    console.log(`  t=${a.t}s  ${a.kind}  ${a.distanceM} m  "${a.text}"`);
  }
}
// Kort #202: en vektorfil utan scenario här (som v18–v23 före #195) syns inte i `git status` efter en fullkörning,
// så generatorn fäller själv när den körs utan filnamn.
if (!ONLY) {
  const kanda = new Set(scenarios.map((s) => `${s.file}.json`));
  const utan = readdirSync(new URL("./vectors/", import.meta.url)).filter((f) => f.endsWith(".json") && !kanda.has(f));
  if (utan.length) {
    console.error(`Vektorfiler utan scenario i generatorn: ${utan.join(", ")} — för in dem i scenarios (kort #202).`);
    process.exit(1);
  }
}
