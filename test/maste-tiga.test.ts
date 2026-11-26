// MÅSTE TIGA — det som inte är en bil får inte höra en varning. Fallen kommer ur simuleringen (engine/simulering.ts), här mot en
// liten påhittad faruppsättning så att provet inte behöver nätet eller en lägesfil: en hal sträcka, en kandidatsträcka, en isig
// station och en kamera på en rak linje under flygets marschsträcka Arlanda–Malmö.
//
// Varje fall FALLER på en motor utan ej bil-grinden (över 160 km/h, över 1 500 m) och halkans vägtest (inom 80 m och 30° från
// sträckans linje), och går igenom med dem. Sist en bil på samma väg, som MÅSTE få sin halkvarning: provet går inte att klara
// genom att tiga överallt. Här står bara fall som tiger med grindarna; det som fortfarande talar (tåg i bilfart nära en väg,
// flyget som taxar, punktkällorna utan vägtest) står som kända luckor i simuleringens rapport, inte som prov.
//
// En annan motor: HALKVAKT_MOTOR=/sökväg/till/engine node --experimental-strip-types --test test/maste-tiga.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { bearingDeg } from "../engine/src/geo.ts";
import {
  FLYGPLATS, flygspar, flytta, markspar, sidoflytta, storcirkel, variant, VARIANTER, type P, type SimFix, type Variant,
} from "../engine/simulering-spar.ts";

const motorDir = process.env.HALKVAKT_MOTOR ?? new URL("../engine", import.meta.url).pathname;
const { AlertEngine } = await import(pathToFileURL(resolve(motorDir, "src/engine.ts")).href);

// The route, one point per km, and the hazards 300–306 km along it — far from both airports, under the cruise.
const rutt = storcirkel(FLYGPLATS.ARN.pos, FLYGPLATS.MMX.pos);
const linje = rutt.slice(300, 307);
const kurs = bearingDeg({ lon: linje[0][0], lat: linje[0][1] }, { lon: linje[1][0], lat: linje[1][1] });
const halka = { id: "seg:prov", kind: "slippery_segment", line: linje, meta: { code: 2, info: ["Is"] } };
const alla = [
  halka,
  { id: "kand:prov", kind: "kandidat", points: linje.slice(1, 6), segmentHazardId: "seg:prov" },
  { id: "wx:prov", kind: "icing_point", lon: rutt[304][0], lat: rutt[304][1], meta: { surfaceTempC: -1, moisture: true } },
  // Bearing = the way the camera looks; it watches traffic going the route's way.
  { id: "cam:prov", kind: "camera", lon: rutt[303][0], lat: rutt[303][1], bearing: (kurs + 180) % 360 },
];
// A stretch of the route around the hazards for the ground vehicles: 10 km before them, 10 km after.
const mark = rutt.slice(290, 317);
const sager = (hazards: unknown[], spar: SimFix[]): string[] =>
  new AlertEngine(hazards).run(spar).map((a: { t: number; kind: string; text: string }) => `t=${a.t} ${a.kind}: ${a.text}`);

for (const v of Object.keys(VARIANTER) as Variant[]) {
  test(`måste tiga: flyget Arlanda–Malmö över hal väg, isig station, kandidat och kamera — ${v}`, () => {
    assert.deepEqual(sager(alla, variant(flygspar(FLYGPLATS.ARN, FLYGPLATS.MMX), v, "prov")), []);
  });
}

test("måste tiga: småflyg i 150 km/h på 2 500 m — höjden ensam", () => {
  const spar = markspar(mark, { maxKmh: 150, accMs2: 1.5, bromsMs2: 2 }).map((f) => ({ ...f, altitudeM: 2500 }));
  assert.deepEqual(sager(alla, spar), []);
});

test("måste tiga: snabbtåg i 200 km/h rakt över farorna — farten ensam", () => {
  assert.deepEqual(sager(alla, markspar(mark, { maxKmh: 200, accMs2: 0.6, bromsMs2: 0.7 })), []);
});

test("måste tiga: tåg i 140 km/h på ett spår 150 m vid sidan av den hala vägen", () => {
  assert.deepEqual(sager([halka], markspar(sidoflytta(mark, 150), { maxKmh: 140, accMs2: 0.6, bromsMs2: 0.7 })), []);
});

test("måste tiga: tåg i 100 km/h som korsar den hala vägen i rät vinkel", () => {
  const korsning: P[] = [flytta(rutt[303], kurs + 90, 5000), flytta(rutt[303], kurs - 90, 5000)];
  assert.deepEqual(sager([halka], markspar(korsning, { maxKmh: 100, accMs2: 0.6, bromsMs2: 0.7 })), []);
});

test("måste tala: bilen i 80 km/h på den hala vägen får sin halkvarning", () => {
  const spar = markspar(mark, { maxKmh: 80, accMs2: 1.5, bromsMs2: 2 }).map((f) => ({ ...f, altitudeM: 60 }));
  const sagt = sager(alla, spar);
  assert.ok(sagt.some((s) => s.includes("slippery_segment")), `bilen fick ingen halkvarning: ${JSON.stringify(sagt)}`);
});
