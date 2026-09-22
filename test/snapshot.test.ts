// Snapshot adapter: published file format → engine hazards → correct alerts.
// This is the exact chain the Android app will run; locked here first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { snapshotToHazards, type LiveDoc, type StaticDoc } from "../engine/src/snapshot.ts";
import { AlertEngine } from "../engine/src/engine.ts";
import type { Fix, PointHazard } from "../engine/src/types.ts";

const staticDoc: StaticDoc = {
  schema: 1,
  // bearing 180 = kameran TITTAR söderut ⇒ fotograferar norrgående trafik, dvs. vår
  // riktning (Trafikverkets konvention, vänd 180° 2/9 — DECISIONS #57).
  cameras: [{ id: "TV1", lon: 15.0, lat: 58.026948, bearing: 180, road: "E4" }], // 3 km norr
};
const liveDoc: LiveDoc = {
  schema: 1, generated_at: "2026-08-25T00:00:00Z",
  segments: [{ id: "S1", line: [[14.99, 58.0808], [15.01, 58.0808]], code: 2, info: ["Is"], road: "E4" }], // 9 km norr
  weather: [{ id: "W1", lon: 15.0, lat: 58.05, yta: 0.2, fukt: true }],   // 5.6 km norr
  deviations: [{ id: "D1", lon: 15.0, lat: 58.135, typ: "Olycka", road: "E4" }], // 15 km norr → utom räckhåll (>10 km)
  smhi: [],
};

function northTrace(seconds: number, kmh: number): Fix[] {
  const mps = (kmh * 1000) / 3600;
  return Array.from({ length: seconds + 1 }, (_, t) => ({
    t, lon: 15.0, lat: 58.0 + (t * mps) / 111320, speedKmh: kmh,
  }));
}

test("snapshot chain: files → hazards → disciplined alerts", () => {
  const hazards = snapshotToHazards(staticDoc, liveDoc);
  assert.equal(hazards.length, 4);
  const alerts = new AlertEngine(hazards).run(northTrace(420, 80));
  // Väntat: kamera ~500 m (t≈113) → isrisk-station (när D1 kommit inom 10 km tävlar
  // accident, men D1 på 15 km är utom horisont vid start; vid t≈225 är D1 <10 km och
  // vinner prioritet över wx/seg om samtidiga)... verifiera disciplinen strukturellt:
  assert.ok(alerts.length >= 3, `expected a busy but disciplined drive, got ${alerts.length}`);
  for (let i = 1; i < alerts.length; i++) {
    // #127 (13/9): golvet är 10 s och prioritetsmedvetet — en HÖGRE fara får bryta det.
    // Två larm av samma eller lägre prioritet måste fortfarande ha ≥ 10 s emellan.
    const P = ["accident", "slippery_segment", "icing_point", "wildlife", "camera"];
    if (P.indexOf(alerts[i].kind) >= P.indexOf(alerts[i - 1].kind))
      assert.ok(alerts[i].t - alerts[i - 1].t >= 10, "10 s-golvet brutet via snapshot-vägen");
  }
  assert.ok(alerts.some((a) => a.hazardId === "cam:TV1"), "camera missing");
  assert.ok(alerts.some((a) => a.kind === "accident"), "deviation→accident mapping missing");
  assert.ok(alerts.some((a) => a.kind === "slippery_segment" || a.kind === "icing_point"),
    "winter alert missing");
  // Determinism genom adapterkedjan:
  const rerun = new AlertEngine(snapshotToHazards(staticDoc, liveDoc)).run(northTrace(420, 80));
  assert.equal(JSON.stringify(rerun), JSON.stringify(alerts));
});


test("wildlife-array mappas till vilt-punkter (och tål att saknas)", () => {
  const withVilt: LiveDoc = { ...liveDoc, wildlife: [{ id: "e1", lon: 13.5, lat: 55.9, art: "Rådjur" }] };
  const hz = snapshotToHazards(staticDoc, withVilt);
  const v = hz.find((h) => h.id === "vilt:e1");
  assert.ok(v && v.kind === "wildlife");
  // Bakåtkompatibilitet: gammal snapshot utan fältet
  assert.ok(!snapshotToHazards(staticDoc, liveDoc).some((h) => h.kind === "wildlife"));
});

test("#318 djur-arrayen blir viltfaror med egna id, bredvid en tom wildlife", () => {
  const med: LiveDoc = { ...liveDoc, wildlife: [], djur: [{ id: "SE_STA_1", lon: 14.9, lat: 56.5, art: "älg", slut: "09:15" }] };
  const hz = snapshotToHazards(staticDoc, med).filter((h) => h.kind === "wildlife");
  assert.deepEqual(hz.map((h) => h.id), ["djur:SE_STA_1"]);
});

test("olyckslyftet: sev/slut når motorn, och gammal snapshot utan fälten är ofarlig (#28)", () => {
  const serious: LiveDoc = {
    ...liveDoc,
    deviations: [{ id: "D9", lon: 13.5, lat: 55.9, typ: "Olycka", road: "E22", sev: 5, slut: "14:20" }],
  };
  const h = snapshotToHazards(staticDoc, serious).find((x) => x.id === "dev:D9");
  assert.ok(h && h.kind === "accident");
  assert.equal((h as PointHazard).meta?.severityCode, 5);
  assert.equal((h as PointHazard).meta?.endTimeLocal, "14:20");

  // Bakåtkompatibilitet: en snapshot publicerad före #28 saknar sev/slut helt.
  // Den MÅSTE landa som lindrig — aldrig som allvarlig av misstag.
  const old: LiveDoc = {
    ...liveDoc,
    deviations: [{ id: "D8", lon: 13.5, lat: 55.9, typ: "Olycka", road: "E22" }],
  };
  const o = snapshotToHazards(staticDoc, old).find((x) => x.id === "dev:D8") as PointHazard;
  assert.equal(o.meta?.severityCode, null);
  assert.equal(o.meta?.endTimeLocal, null);
});
