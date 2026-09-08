// Kartlagerkärnan (#77): kartsajtens sex filer ur en låtsasdatabas, utan Postgres och utan
// Trafikverket. Fail-soft-grenen för väglagskamerorna bevisas i båda riktningarna.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMapData } from "../publish/map-core.ts";
import type { Q } from "../publish/snapshot-core.ts";

const NOW = new Date("2026-11-20T06:30:00Z");
const pt = (lon: number, lat: number) => ({ type: "Point", coordinates: [lon, lat] });

function fakeDb() {
  const q: Q = async (text) => {
    if (text.includes("FROM road_conditions")) return [
      { segment_id: "S1", condition_code: "2", condition_text: "Besvärligt", condition_info: ["Is"], road_number: "E10",
        location_text: "Kiruna", modified_time: "2026-11-20T06:00:00Z", lan: "25", g: { type: "LineString", coordinates: [[20.2, 67.8], [20.3, 67.9]] } },
      { segment_id: "S2", condition_code: "1", condition_text: "Normalt", condition_info: [], road_number: "E4",
        location_text: null, modified_time: "2026-11-20T06:00:00Z", lan: "1", g: { type: "LineString", coordinates: [[18, 59], [18.1, 59.1]] } },
    ];
    if (text.includes("FROM weather_latest")) return [
      { land: "SE", station_id: "W1", name: "Kall", sample_time: "2026-11-20T06:20:00Z", surface_temp_c: "-1.5", air_temp_c: "0.5", precipitation: "no", rain: false, snow: false, g: pt(17, 62.4) },
      { land: "FI", station_id: "F1", name: "Varm", sample_time: "2026-11-20T06:20:00Z", surface_temp_c: "4", air_temp_c: null, precipitation: "rain", rain: true, snow: false, g: pt(24, 65.9) },
    ];
    if (text.includes("FROM deviations")) return [
      { land: "SE", deviation_id: "D1", message_type: "Olycka", message: "Testolycka", severity_text: "Stor påverkan", road_number: "E4", start_time: "2026-11-20T05:00:00Z", g: pt(18.1, 59.4) },
    ];
    if (text.includes("FROM cameras")) return [{ camera_id: "TV1", name: "Kamera", road_number: "E4", bearing: "180", g: pt(18, 59.3) }];
    if (text.includes("FROM polisen_events")) return [{ dygn: "1", vecka: "3", vanligast: "älg" }];
    if (text.includes("FROM smhi_warnings")) return [{ event_sv: "Snöfall", level_sv: "Gul", level_code: "YELLOW", area_name: "Norrbotten" }];
    if (text.includes("FROM waitlist")) return [{ n: 31 }];
    throw new Error("okänd fråga: " + text.slice(0, 60));
  };
  return q;
}

const trvOk = async () => new Response(JSON.stringify({ RESPONSE: { RESULT: [{ Camera: Array.from({ length: 600 }, (_, i) => (
  { Id: `K${i}`, Name: `Kamera ${i}`, PhotoUrl: `https://x/${i}.jpg`, Direction: 90, Geometry: { WGS84: `POINT (15.${i} 58.${i})` } })) }] } }), { status: 200 });

test("#77 alla sex kartfiler ur kärnan, i kartsajtens format", async () => {
  const { files, stats, notes } = await buildMapData(fakeDb(), { trvKey: "k", fetchFn: trvOk as any, now: NOW });
  assert.deepEqual(Object.keys(files).sort(), ["kameror-vaglag.geojson", "kameror.geojson", "meta.json", "olyckor.geojson", "vader.geojson", "vaglag.geojson"]);
  assert.deepEqual(notes, []);
  const vaglag = JSON.parse(files["vaglag.geojson"]);
  assert.equal(vaglag.type, "FeatureCollection");
  assert.deepEqual(vaglag.features[0].properties, { segment_id: "S1", code: 2, text: "Besvärligt", info: ["Is"], road: "E10", plats: "Kiruna", updated: "2026-11-20T06:00:00Z", lan: 25 });
  const vader = JSON.parse(files["vader.geojson"]);
  assert.deepEqual(vader.features[0].properties, { land: "SE", name: "Kall", t: "2026-11-20T06:20:00Z", yta: -1.5, luft: 0.5, nbd: "no", sno: false });
  assert.equal(vader.features[1].properties.luft, null);
  const kv = JSON.parse(files["kameror-vaglag.geojson"]);
  assert.equal(kv.features.length, 600);
  assert.equal(kv.generated_at, "2026-11-20T06:30:00.000Z");
  assert.deepEqual(kv.features[0], { type: "Feature", geometry: { type: "Point", coordinates: [15.0, 58.0] }, properties: { id: "K0", name: "Kamera 0", photo: "https://x/0.jpg", dir: 90 } });
  assert.deepEqual(JSON.parse(files["meta.json"]), stats);
  assert.deepEqual(stats, {
    generated_at: "2026-11-20T06:30:00.000Z", vaglag_total: 2, vaglag_ej_normalt: 1, stationer: 2, kalla_stationer: 1,
    olyckor: 1, kameror: 1, kameror_vaglag: 600, vilt_dygn: 1, vilt_vecka: 3, vilt_vanligast: "älg",
    smhi_vinter: [{ event: "Snöfall", niva: "Gul", niva_kod: "YELLOW", omrade: "Norrbotten" }], waitlist_count: 31,
  });
});

test("#77 fail-soft för väglagskamerorna: TRV-fel eller tunt svar ⇒ filen utelämnas, resten skrivs, noten bär kroppen", async () => {
  const trv400 = async () => new Response("Invalid query attribute", { status: 400 });
  let r = await buildMapData(fakeDb(), { trvKey: "k", fetchFn: trv400 as any, now: NOW });
  assert.equal("kameror-vaglag.geojson" in r.files, false);
  assert.equal(Object.keys(r.files).length, 5);
  assert.match(r.notes[0], /TRV 400: Invalid query attribute/);
  assert.equal(r.stats.kameror_vaglag, null);

  const tunt = async () => new Response(JSON.stringify({ RESPONSE: { RESULT: [{ Camera: [{ Id: "K1", Geometry: { WGS84: "POINT (15 58)" } }] }] } }), { status: 200 });
  r = await buildMapData(fakeDb(), { trvKey: "k", fetchFn: tunt as any, now: NOW });
  assert.equal("kameror-vaglag.geojson" in r.files, false);
  assert.match(r.notes[0], /bara 1 väglagskameror/);

  r = await buildMapData(fakeDb(), { now: NOW });
  assert.equal("kameror-vaglag.geojson" in r.files, false);
  assert.match(r.notes[0], /TRAFIKVERKET_API_KEY saknas/);
});
