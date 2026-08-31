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

import { mkdirSync, writeFileSync } from "node:fs";
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

interface Scenario {
  file: string; name: string; description: string;
  hazards: Hazard[]; trace: Fix[];
  updates?: { atT: number; hazards: Hazard[] }[];
}

const scenarios: Scenario[] = [
  {
    file: "v01_camera_simple", name: "Kamera rakt fram",
    description: "80 km/h norrut, kamera 3 km fram (bearing 0 = fotar vår riktning). Exakt EN varning ~500 m före.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 0 }],
    trace: northTrace(180, 80),
  },
  {
    file: "v02_camera_behind", name: "Kamera bakom oss",
    description: "Kameran passerades innan start. Tystnad.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(-300), bearing: 0 }],
    trace: northTrace(60, 80),
  },
  {
    file: "v03_camera_side", name: "Kamera på annan väg",
    description: "Kamera 2 km öster om vår väg — utanför korridoren. Tystnad.",
    hazards: [{ id: "cam1", kind: "camera", lon: eastOf(2000), lat: northOf(1500), bearing: 0 }],
    trace: northTrace(120, 80),
  },
  {
    file: "v04_priority_drop", name: "Prioritet: olycka vinner, kamera SLÄPPS",
    description: "Olycka 5 km fram + kamera 450 m fram blir kvalificerade samtidigt. Olyckan talar; kameran släpps (köas ej) och hinner passeras under 45 s-fönstret. Halksegment vid 2 km talar när fönstret öppnat.",
    hazards: [
      { id: "acc1", kind: "accident", lon: LON0, lat: northOf(5000) },
      { id: "cam1", kind: "camera", lon: LON0, lat: northOf(450), bearing: 0 },
      { id: "seg1", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(2000)], [LON0 + 0.01, northOf(2000)]], meta: { code: 2, info: ["Is"] } },
    ],
    trace: northTrace(180, 80),
  },
  {
    file: "v05_throttle_45s", name: "45-sekundersregeln",
    description: "Två kameror 400 m isär i 80 km/h (18 s mellanrum). Första talar; andra faller i tystnadsfönstret, släpps, och passeras. EN varning totalt.",
    hazards: [
      { id: "camA", kind: "camera", lon: LON0, lat: northOf(3000), bearing: 0 },
      { id: "camB", kind: "camera", lon: LON0, lat: northOf(3400), bearing: 0 },
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
    description: "Faror finns i världen men inte i vår korridor (20 km bort, bakom, avsides, varm station). En hel körning utan ett enda ljud.",
    hazards: [
      { id: "cam_far", kind: "camera", lon: LON0, lat: northOf(20000), bearing: 0 },
      { id: "acc_far", kind: "accident", lon: LON0, lat: northOf(15000) },
      { id: "cam_side", kind: "camera", lon: eastOf(3000), lat: northOf(1000), bearing: 0 },
      { id: "wx_warm", kind: "icing_point", lon: LON0, lat: northOf(800), meta: { surfaceTempC: 12, moisture: false } },
      { id: "seg_normal", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(600)], [LON0 + 0.01, northOf(600)]], meta: { code: 1, info: ["Våt"] } },
      { id: "seg_flackvis", kind: "slippery_segment", line: [[LON0 - 0.01, northOf(900)], [LON0 + 0.01, northOf(900)]], meta: { code: 1, info: ["fläckvis Våt", "fläckvis Torrt"] } },
    ],
    trace: northTrace(120, 80),
  },
  {
    file: "v12_stationary_jitter", name: "Parkerad med GPS-brus",
    description: "Stillastående; positionen hoppar ±3 m men telefonens dopplerfart är ~0 (KONTRAKT: appen skickar alltid med speedKmh när den finns — härledd fart ur jitter kan se ut som 20 km/h). Kamera 100 m bort. Fartspärren håller tyst.",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(100), bearing: 0 }],
    trace: Array.from({ length: 61 }, (_, t) => ({
      t, lon: LON0 + ((t % 3) - 1) * 0.00003, lat: LAT0 + ((t % 2) - 0.5) * 0.00005,
      speedKmh: t % 3, // 0–2 km/h — vad en parkerad telefon faktiskt rapporterar
    })),
  },
  {
    file: "v13_wildlife_beats_camera", name: "Vilt slår kamera i prioritet",
    description: "Aktiv viltzon 600 m fram + kamera 480 m fram, kvalificerade samtidigt. Viltet talar; kameran släpps och passeras. EN varning.",
    hazards: [
      { id: "wild1", kind: "wildlife", lon: LON0, lat: northOf(600), meta: { active: true } },
      { id: "cam1", kind: "camera", lon: LON0, lat: northOf(480), bearing: 0 },
    ],
    trace: northTrace(120, 80),
  },
  {
    file: "v14_snapshot_swap", name: "Databyte mitt i körning — minnet överlever (#9)",
    description:
      "cam1 500 m fram fyrar t=1. Vid t=20 byts snapshoten (samma cam1 + ny cam2 2511 m fram). " +
      "Minnet MÅSTE överleva bytet: cam1 får inte upprepas (repris-reglerna gäller via fired-kartan), " +
      "cam2 fyrar först inom 500 m vid t=91. En motor som byggs om vid bytet fyrar cam1 igen vid t=20 — " +
      "exakt det felet den här vektorn dödar. (2511, inte 2500: designregeln om gränsmarginal.)",
    hazards: [{ id: "cam1", kind: "camera", lon: LON0, lat: northOf(500), bearing: 0 }],
    updates: [{
      atT: 20,
      hazards: [
        { id: "cam1", kind: "camera", lon: LON0, lat: northOf(500), bearing: 0 },
        { id: "cam2", kind: "camera", lon: LON0, lat: northOf(2511), bearing: 0 },
      ],
    }],
    trace: northTrace(120, 80),
  },
  // ---- Olyckslyftet (#28, DECISIONS #28). Boundary placement follows the design rule
  // above: the accident sits at 11 019 m so that neither the 10 km horizon nor the 2 km
  // reminder line falls within ~1 m of an integer-second fix (margins here are ~13 m).
  {
    file: "v15_accident_serious_twostep",
    name: "Allvarlig olycka: tidigt rop + påminnelse",
    description:
      "90 km/h norrut, allvarlig olycka (severity 4) 11 019 m fram med röjningstid 14:20. " +
      "Två repliker: det tidiga ropet när 10 km-horisonten passeras (bär omvägsbeslutet) " +
      "och påminnelsen innanför 2 km (bär bara farten). Samma hazardId, två varningsplatser.",
    hazards: [{
      id: "acc1", kind: "accident", lon: LON0, lat: northOf(11_019),
      meta: { severityCode: 4, endTimeLocal: "14:20" },
    }],
    trace: northTrace(380, 90),
  },
  {
    file: "v16_accident_serious_late_join",
    name: "Allvarlig olycka: påhoppad innanför 2 km",
    description:
      "Föraren svänger ut 1 900 m före en allvarlig olycka och hörde aldrig det tidiga ropet. " +
      "Påminnelsetexten vore ofullständig här, så nära-platsen talar late-repliken i stället: " +
      "samma fakta, utan överväg-annan-väg — det finns ingen avfart kvar att ta.",
    hazards: [{
      id: "acc1", kind: "accident", lon: LON0, lat: northOf(1_900),
      meta: { severityCode: 5 },
    }],
    trace: northTrace(60, 90),
  },
  {
    file: "v17_accident_mild_unchanged",
    name: "Lindrig olycka: oförändrad, talar EN gång",
    description:
      "Samma geometri som v15 men severity 2 (Liten påverkan). Graderingen får inte ändra " +
      "beteendet för lindriga olyckor: en enda replik med gamla texten, ingen påminnelse.",
    hazards: [{
      id: "acc1", kind: "accident", lon: LON0, lat: northOf(11_019),
      meta: { severityCode: 2 },
    }],
    trace: northTrace(380, 90),
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
for (const s of scenarios) {
  const alerts = runWithUpdates(s);
  const out = {
    name: s.name, description: s.description,
    hazards: s.hazards, ...(s.updates ? { updates: s.updates } : {}), trace: s.trace, expected: alerts,
  };
  writeFileSync(new URL(`./vectors/${s.file}.json`, import.meta.url), JSON.stringify(out, null, 1) + "\n");
  console.log(`\n=== ${s.file}: ${s.name} ===`);
  if (alerts.length === 0) console.log("  (tystnad)");
  for (const a of alerts) {
    console.log(`  t=${a.t}s  ${a.kind}  ${a.distanceM} m  "${a.text}"`);
  }
}
