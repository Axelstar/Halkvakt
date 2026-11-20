// Radarns kärna för storstädernas grupper (ingest/radar-karna.ts gruppRader; sql/090, DECISIONS #804, kort #378).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MIN_RATE_MMH, STATION_RADIE_M, gruppRader, stationRader, stationsytor } from "../ingest/radar-karna.ts";

test("gruppRader: radarn i varje punkt, max och medel per grupp, och händelsegränsen", () => {
  const regn: Record<string, number | null> = { "18,59": 0.5, "18.1,59": 0.0, "17,58": 0.05, "16,57": null, "16.1,57": 0.3 };
  const rateAt = (lon: number, lat: number) => { const k = `${lon},${lat}`; return k in regn ? regn[k] : 0; };   // null = utanför
  const r = gruppRader([
    { id: "B-1-1", punkter: [[18, 59], [18.1, 59]] },          // regn i en punkt: max 0,5, medel 0,25
    { id: "C-2-2", punkter: [[17, 58]] },                      // under gränsen: ingen rad
    { id: "B-3-3", punkter: [[16, 57], [16.1, 57]] },          // en punkt utanför kompositen räknas inte i medlet
    { id: "B-4-4", punkter: [[16, 57]] },                      // bara utanför: ingen rad
  ], rateAt);
  assert.deepEqual(r.ids, ["B-1-1", "B-3-3"]);
  assert.deepEqual(r.maxes, [0.5, 0.3]);
  assert.deepEqual(r.means, [0.25, 0.3]);
  assert.equal(r.events, 2);
  assert.equal(r.sampled, 6);
  assert.equal(r.outside, 2);
  assert.equal(MIN_RATE_MMH, 0.1);
});

test("gruppRader: exakt på gränsen räknas, tomma grupper ger inget", () => {
  const r = gruppRader([{ id: "B-1-1", punkter: [[18, 59]] }, { id: "B-2-2", punkter: [] }], () => 0.1);
  assert.deepEqual(r.ids, ["B-1-1"]);
});

// Radarn kring stationerna (ingest/radar-karna.ts stationsytor och stationRader; sql/130, DECISIONS #917; halkvakt-kuvos F61 §12).
// Projektionen är identiteten här: läget är meter i rutnätet, så att avstånden går att lägga exakt.
test("stationsytor: pixlarna vars mitt ligger högst 2 250 m från stationen, och kanten", () => {
  const g = { cols: 10, rows: 10, x0: 0, y0: 20000, xscale: 2000, yscale: 2000 };
  const id = (p: [number, number]) => p;
  const [cx, cy] = [0 + 4.5 * 2000, 20000 - 5.5 * 2000];                    // mitten av pixeln kolumn 4, rad 5
  const y = stationsytor([{ id: "1", lon: cx + 2249, lat: cy }, { id: "2", lon: cx + 2251, lat: cy }], g, id);
  assert.ok(y.get("1")!.includes(5 * 10 + 4), "en pixel 2 249 m bort hör till ytan");
  assert.ok(!y.get("2")!.includes(5 * 10 + 4), "en pixel 2 251 m bort hör inte till ytan");
  const mitt = stationsytor([{ id: "3", lon: cx, lat: cy }], g, id).get("3")!.sort((a, b) => a - b);
  assert.deepEqual(mitt, [44, 53, 54, 55, 64], "en station mitt i en pixel: pixeln och de fyra grannarna 2 000 m bort, inte hörnen 2 828 m bort");
  assert.equal(STATION_RADIE_M, 2250);
  assert.equal(stationsytor([{ id: "4", lon: -9000, lat: cy }], g, id).has("4"), false, "en station långt utanför rutnätet får ingen yta");
  const kant = stationsytor([{ id: "5", lon: 1000, lat: 19000 }], g, id).get("5")!.sort((a, b) => a - b);
  assert.deepEqual(kant, [0, 1, 10], "vid rutnätets hörn bara pixlarna som finns");
});

test("stationRader: medlet över ytans täckta pixlar, händelsegränsen och avrundningen", () => {
  const regn: Record<number, number | null> = { 1: 0.5, 2: 0.0, 3: null, 4: 0.05, 5: 0.15, 6: null, 7: 0.1, 8: 0.08 };
  const r = stationRader(new Map([
    ["1001", [1, 2, 3]],        // en pixel utanför täckningen räknas inte: max 0,5, medel 0,25
    ["1002", [4]],              // under gränsen: ingen rad
    ["1003", [6]],              // bara utanför täckningen: ingen rad, alltså torr i radarn
    ["1004", [5, 4, 2]],        // max 0,15 över gränsen, medlet 0,0667 avrundas till 0,07 och står med som 0,07
    ["1005", [7, 8]],           // exakt 0,1 i en pixel räknas; medlet 0,09
  ]), (i) => (i in regn ? regn[i] : 0));
  assert.deepEqual(r.ids, ["1001", "1004", "1005"]);
  assert.deepEqual(r.maxes, [0.5, 0.15, 0.1]);
  assert.deepEqual(r.means, [0.25, 0.07, 0.09]);
});

test("sql/130: värdevakten känner båda tabellerna, och varje numeriskt fält har ett deklarerat spann (DECISIONS #917)", async () => {
  const { SPANN } = await import("../scripts/vardevakten.ts");
  const las = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const vakt = las("scripts/vardevakten.ts"), mig = las("sql/130_radar_station.sql").replace(/--[^\n]*/g, "");
  for (const t of ["radar_station", "radar_station_komposit"]) {
    assert.match(vakt, new RegExp(`\\b${t}: "observed_at"`), `${t} står i TID`);
    const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${t} \\(([\\s\\S]*?)\\n\\);`).exec(mig);
    assert.ok(m, `sql/130 skapar ${t}`);
    for (const rad of m![1].split("\n").map((r) => r.trim()).filter((r) => r && !r.startsWith("PRIMARY KEY"))) {
      const [namn, typ] = rad.split(/\s+/);
      if (/^(numeric|double|integer|int|real|bigint|smallint)/.test(typ)) assert.ok(SPANN[namn], `${t}.${namn}: ett deklarerat spann`);
      else assert.ok(typ.startsWith("timestamptz") || namn === "station_id", `${t}.${namn}: en tid eller ett id`);
    }
  }
  assert.match(mig, /station_id ~ '\^\[0-9\]\{3,\}\$'/, "bara stationers id, aldrig en småvägsbit eller en stadsgrupp");
});
