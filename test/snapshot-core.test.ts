// Snapshotkärnan (#74/#75): EN källa till appens filer, körtidsneutral. Testas mot en
// låtsasdatabas som svarar per fråga, så formatet, olycksgaten, brokopplingen, givarvakten
// och manifestet bevisas utan Postgres. Givarvaktens SQL bevisas mot riktig PostGIS i
// integration.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildSnapshot, manifestFor, bridgesFromGeoJSON, WX_SANE, type Q } from "../publish/snapshot-core.ts";
import { snapshotToHazards } from "../engine/src/snapshot.ts";

/** Låtsasdatabas: svarar på frågorna efter vilken tabell de läser, och loggar frågetexten. */
function fakeDb(rows: Partial<Record<string, any[]>>) {
  const asked: string[] = [];
  const q: Q = async (text, params) => {
    asked.push(text);
    if (text.includes("FROM cameras")) return rows.cameras ?? [];
    if (text.includes("weather_latest f")) {
      if (rows.borderThrows) throw new Error(`schema "${text.includes("fi.") ? "fi" : "no"}" does not exist`);
      assert.deepEqual(params, [40_000]);
      return text.includes("fi.") ? rows.fi ?? [] : rows.no ?? [];
    }
    if (text.includes("FROM road_conditions")) return rows.segments ?? [];
    if (text.includes("FROM weather_latest") && text.includes("surface_temp_c <= 3")) return rows.wx ?? [];
    if (text.includes("FROM weather_latest")) return rows.allWx ?? [];
    if (text.includes("FROM deviations")) return rows.deviations ?? [];
    if (text.includes("FROM polisen_events")) return rows.vilt ?? [];
    if (text.includes("FROM smhi_warnings")) return rows.smhi ?? [];
    throw new Error("okänd fråga: " + text.slice(0, 60));
  };
  return { q, asked };
}

const NOW = new Date("2026-11-20T06:30:00Z");

test("#74 format: olyckans gradering är gated på Accident, SMHI/vilt/kamera i motorns vokabulär", async () => {
  const { q } = fakeDb({
    cameras: [{ camera_id: "TV1", road_number: "E4", bearing: "180", lon: 15, lat: 58.02 }],
    segments: [{ segment_id: "S1", condition_code: 2, condition_info: ["Is"], road_number: "E4", g: { coordinates: [[14.99, 58.08], [15.01, 58.08]] } }],
    // pg levererar numeric som STRÄNG — kärnan ska ge tal ut.
    wx: [{ station_id: "W1", surface_temp_c: "-1.2", rain: false, snow: true, precipitation: "snow", lon: 15, lat: 58.05 }],
    deviations: [
      { deviation_id: "D1", message_type: "Olycka", message_type_value: "Accident", road_number: "E4",
        severity_code: "4", end_time: "2026-11-20T08:15:00Z", lon: 15, lat: 58.1 },
      // Vägarbete med severity 4: får ALDRIG graderas — texten säger "olycka" högt (#28).
      { deviation_id: "D2", message_type: "Vägarbete", message_type_value: "Roadworks", road_number: "E4",
        severity_code: "4", end_time: "2026-11-20T08:15:00Z", lon: 15, lat: 58.2 },
    ],
    vilt: [{ event_id: 999001, lon: 14.9, lat: 63.1, species: "älg", datetime: NOW }],
    smhi: [{ area_id: "25", event_sv: "Snöfall", level_code: "YELLOW", g: { type: "Polygon", coordinates: [] } }],
  });
  const { staticDoc, liveDoc } = await buildSnapshot(q, [], NOW);

  assert.equal(liveDoc.generated_at, "2026-11-20T06:30:00.000Z");
  assert.deepEqual(staticDoc.cameras, [{ id: "TV1", lon: 15, lat: 58.02, bearing: 180, road: "E4" }]);
  assert.deepEqual(liveDoc.weather, [{ id: "W1", lon: 15, lat: 58.05, yta: -1.2, fukt: true }]);
  assert.deepEqual(liveDoc.deviations[0], { id: "D1", lon: 15, lat: 58.1, typ: "Olycka", road: "E4", sev: 4, slut: "09:15" }); // 08:15Z = 09:15 CET
  assert.deepEqual(liveDoc.deviations[1], { id: "D2", lon: 15, lat: 58.2, typ: "Vägarbete", road: "E4", sev: null, slut: null });
  assert.deepEqual(liveDoc.smhi, [{ id: 25, event: "Snöfall", niva: "YELLOW", geom: { type: "Polygon", coordinates: [] } }]);
  assert.deepEqual(liveDoc.wildlife, [{ id: "999001", lon: 14.9, lat: 63.1, art: "älg" }]);
  assert.deepEqual(liveDoc.segments[0].code, 2);

  // Och motorn läser det rakt av: exakt de hazards vi förväntar oss.
  const kinds = snapshotToHazards(staticDoc, liveDoc).map((h) => h.kind).sort();
  assert.deepEqual(kinds, ["accident", "accident", "camera", "icing_point", "slippery_segment", "wildlife"]);
});

test("#38 broarna: bara broar med en kall+våt station inom 15 km, med stationens yta", async () => {
  const { q } = fakeDb({
    allWx: [
      { surface_temp_c: "0.5", rain: true, snow: false, precipitation: "rain", lon: 15.0, lat: 58.05 }, // kall + våt
      { surface_temp_c: "-4",  rain: false, snow: false, precipitation: "no", lon: 15.0, lat: 58.30 }, // kall men TORR ⇒ räknas inte
    ],
  });
  const bridges = bridgesFromGeoJSON({ features: [
    { geometry: { coordinates: [15.0, 58.06] }, properties: { id: "B1", road: "E4" } },   // ~1,1 km från den våta
    { geometry: { coordinates: [15.0, 58.31] }, properties: { id: "B2", road: "E45" } },  // ~1 km från den torra, 29 km från den våta
  ] });
  const { liveDoc } = await buildSnapshot(q, bridges, NOW);
  assert.deepEqual(liveDoc.bridges, [{ id: "B1", lon: 15, lat: 58.06, road: "E4", yta: 0.5, fukt: true }]);
  // Motorn ser bron som icing_point med bridge-flaggan.
  const bro = snapshotToHazards({ schema: 1, cameras: [] }, liveDoc).find((h) => h.id === "bro:B1");
  assert.equal(bro?.kind, "icing_point");
  assert.equal((bro as any).meta.bridge, true);
});

test("#75 givarvakten sitter i VARJE väderfråga: svensk, gräns (fi/no) och bro", async () => {
  const { q, asked } = fakeDb({ fi: [{ station_id: "FI1", surface_temp_c: "-2", rain: false, snow: false, precipitation: null, lon: 24.1, lat: 65.9 }] });
  const { liveDoc, border } = await buildSnapshot(q, [{ id: "B", lon: 15, lat: 58, road: null }], NOW);
  const wxQueries = asked.filter((t) => t.includes("weather_latest"));
  assert.equal(wxQueries.length, 4, "svensk + fi + no + bro");
  for (const t of wxQueries) assert.ok(t.includes(WX_SANE), "givarvakten saknas i: " + t.slice(0, 80));
  assert.ok(WX_SANE.includes("interval '3 hours'"), "färskhetskravet");
  assert.ok(WX_SANE.includes("surface_temp_c >= air_temp_c - 12"), "rimlighetskravet");
  // Gränsstationen hamnar bland väderpunkterna, källmärkt i border-räkningen.
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["FI1"]);
  assert.deepEqual(border, { fi: { reach: 1, cold: 1 }, no: { reach: 0, cold: 0 } });
});

test("#75 fukt: \"no\" och \"Dry\" är torrt — bara regn, snö eller en våt klass ger fukt", async () => {
  const { q } = fakeDb({ wx: [
    { station_id: "TORR",   surface_temp_c: "-3", rain: false, snow: false, precipitation: "no",   lon: 15, lat: 58 },
    { station_id: "DRY",    surface_temp_c: "-3", rain: false, snow: false, precipitation: "Dry",  lon: 15, lat: 58 },
    { station_id: "TOM",    surface_temp_c: "-3", rain: false, snow: false, precipitation: null,   lon: 15, lat: 58 },
    { station_id: "REGN",   surface_temp_c: "-3", rain: false, snow: false, precipitation: "rain", lon: 15, lat: 58 },
    { station_id: "FLAGGA", surface_temp_c: "-3", rain: true,  snow: false, precipitation: "no",   lon: 15, lat: 58 },
    { station_id: "OKAND",  surface_temp_c: "-3", rain: false, snow: false, precipitation: "sleet", lon: 15, lat: 58 },
  ] });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(Object.fromEntries(liveDoc.weather.map((w) => [w.id, w.fukt])),
    { TORR: false, DRY: false, TOM: false, REGN: true, FLAGGA: true, OKAND: true });
});

test("#49 saknat grannschema fäller inte snapshoten — noteras och hoppas", async () => {
  const { q } = fakeDb({ borderThrows: [true], wx: [{ station_id: "W1", surface_temp_c: "-1", rain: true, snow: false, precipitation: "rain", lon: 15, lat: 58 }] });
  const { liveDoc, notes, border } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["W1"]);
  assert.deepEqual(border, {});
  assert.equal(notes.length, 2);
  assert.match(notes[0], /^gräns-wx: fi-schemat ej läsbart/);
});

test("manifest.json: sha256 och bytes stämmer med filerna apparna verifierar", async () => {
  const files = { static: JSON.stringify({ schema: 1, cameras: Array.from({ length: 50 }, (_, i) => ({ id: `TV${i}`, lon: 15 + i / 100, lat: 58, bearing: 180, road: "E4" })) }), live: JSON.stringify({ schema: 1, generated_at: "x", segments: [], weather: [], deviations: [], smhi: [], wildlife: [], bridges: [], pad: "å".repeat(2000) }) };
  const m = await manifestFor("2026-11-20T06:30:00.000Z", files);
  assert.equal(m.schema, 1);
  assert.equal(m.generated_at, "2026-11-20T06:30:00.000Z");
  for (const name of ["static", "live"] as const) {
    const f = m.files[name];
    assert.equal(f.path, `app/v1/${name}.json`);
    assert.equal(f.sha256, createHash("sha256").update(files[name]).digest("hex"));
    assert.equal(f.bytes, Buffer.byteLength(files[name]));
    assert.ok(f.gz_bytes > 0 && f.gz_bytes < f.bytes, `gzip krymper ${name}`);
  }
});
