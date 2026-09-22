// Snapshotkärnan (#74/#75): EN källa till appens filer, körtidsneutral. Testas mot en
// låtsasdatabas som svarar per fråga, så formatet, olycksgaten, brokopplingen, givarvakten
// och manifestet bevisas utan Postgres. Givarvaktens SQL bevisas mot riktig PostGIS i
// integration.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildSnapshot, manifestFor, bridgesFromGeoJSON, WX_SANE, REGN_UTLOSARE_MMH, GIVARFEL_LUFT_MIN_C, GIVARFEL_GAP_C, KARANTAN_DYGN, KARANTAN_BROTT, RADVAKT_SQL, brottSql, karantanSql, givarfelSql, LANGSAM_FRIST_H, type Q } from "../publish/snapshot-core.ts";
import { snapshotToHazards } from "../engine/src/snapshot.ts";

/** Låtsasdatabas: svarar på frågorna efter vilken tabell de läser, och loggar frågetexten. */
function fakeDb(rows: Partial<Record<string, any[]>>) {
  const asked: string[] = [];
  const anyParams: unknown[] = [];   // parametrarna till regnsegmentens geometrifråga (#154)
  const q: Q = async (text, params) => {
    asked.push(text);
    if (text.includes("FROM cameras")) return rows.cameras ?? [];
    if (text.includes("= ANY($1::text[])")) { anyParams.push(params); return rows.regnSegs ?? []; }
    if (text.includes("weather_latest f")) {
      if (rows.borderThrows) throw new Error(`schema "${text.includes("fi.") ? "fi" : "no"}" does not exist`);
      assert.deepEqual(params, [40_000]);
      return text.includes("fi.") ? rows.fi ?? [] : rows.no ?? [];
    }
    if (text.includes("FROM road_conditions")) return rows.segments ?? [];
    if (text.includes("FROM radar_precip")) return rows.radar ?? [];
    if (text.includes("FROM weather_latest") && text.includes("surface_temp_c <= 3")) return rows.wx ?? [];
    if (text.includes("FROM weather_latest")) return rows.allWx ?? [];
    if (text.includes("FROM deviations")) return rows.deviations ?? [];
    if (text.includes("FROM polisen_events")) return rows.vilt ?? [];
    if (text.includes("FROM smhi_warnings")) return rows.smhi ?? [];
    if (text.includes("FROM weather_observations") && text.includes("HAVING count(*)")) return rows.karantan ?? [];
    if (text.includes("FROM givarfel_dygn")) return rows.langsam ?? [];
    if (text.includes("FROM weather_observations")) return rows.regnH ?? [];
    if (text.includes("FROM trend_kandidater")) return rows.lutning ?? [];
    throw new Error("okänd fråga: " + text.slice(0, 60));
  };
  return { q, asked, anyParams };
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
  assert.deepEqual(liveDoc.weather, [{ id: "W1", lon: 15, lat: 58.05, yta: -1.2, fukt: true, regn_h: null, lutning15: null, lutning30: null, lutning60: null }]);
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

// ── #234 GIVARFELEN SOM SLANK FÖRBI #75 (DECISIONS #298) ────────────────────────────────────
// Ö Ljungby 1106 visade yta +1…+3 °C vid luft +13 °C och regn — ~12 ° fel, precis kring #75:s gräns — och 24 broar på
// E4 fick frysrisk. Två tillägg, och talet 12 står orört: RADVAKTEN (varm luft + stort gap = givarfel) och KARANTÄNEN
// (en station som nyligen brutit grovt mot #75 får inte tala). SQL:en bevisas mot riktig PostGIS i integration.test.ts.
test("#234 radvakten sitter i WX_SANE, bredvid #75 — och släpper rader utan lufttemperatur", () => {
  assert.equal(GIVARFEL_LUFT_MIN_C, 10, "DECISIONS #298: bara varm luft — blixthalkan (luft under +10) får tala");
  assert.equal(GIVARFEL_GAP_C, 8);
  assert.ok(WX_SANE.includes("surface_temp_c >= air_temp_c - 12"), "#75 står kvar, orörd");
  assert.ok(WX_SANE.includes("(air_temp_c IS NULL OR air_temp_c < 10 OR air_temp_c - surface_temp_c < 8)"),
    "radvakten, nollsäker: okänd luft fäller aldrig (samma nollpolitik som #75)");
});

test("#234 karantänen: en station med brott mot #75 tystas — som väderpunkt OCH som broarnas källa", async () => {
  const { q, asked } = fakeDb({
    wx: [
      { station_id: "FRISK", surface_temp_c: "0.5", rain: true, snow: false, precipitation: "rain", lon: 15.0, lat: 58.05 },
      { station_id: "TRASIG", surface_temp_c: "0.2", rain: true, snow: false, precipitation: "rain", lon: 13.0, lat: 56.18 },
    ],
    allWx: [
      { station_id: "FRISK", surface_temp_c: "0.5", rain: true, snow: false, precipitation: "rain", lon: 15.0, lat: 58.05 },
      { station_id: "TRASIG", surface_temp_c: "0.2", rain: true, snow: false, precipitation: "rain", lon: 13.0, lat: 56.18 },
    ],
    karantan: [{ station_id: "TRASIG" }],
  });
  const bridges = bridgesFromGeoJSON({ features: [
    { geometry: { coordinates: [15.0, 58.06] }, properties: { id: "B-FRISK", road: "E4" } },
    { geometry: { coordinates: [13.0, 56.19] }, properties: { id: "B-TRASIG", road: "E4" } },   // ~1 km från den trasiga
  ] });
  const { liveDoc, notes } = await buildSnapshot(q, bridges, NOW);
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["FRISK"]);
  assert.deepEqual(liveDoc.bridges.map((b) => b.id), ["B-FRISK"], "bron vid den trasiga givaren får ingen frysrisk");
  assert.ok(notes.some((n) => n.startsWith("karantän:") && n.includes("TRASIG")), "vem som tystats ska stå i noterna");
  const f = asked.find((t) => t.includes("HAVING count(*)"))!;
  assert.ok(f.includes(`interval '${KARANTAN_DYGN} days'`) && f.includes(`HAVING count(*) >= ${KARANTAN_BROTT}`));
  assert.ok(f.includes("surface_temp_c < air_temp_c - 12"), "brottet ÄR #75:s gräns — inget nytt tal");
});

test("#234 gränsstationer rörs inte av karantänen — id:n kan krocka mellan länderna", async () => {
  const { q } = fakeDb({
    fi: [{ station_id: "1106", surface_temp_c: "-2", rain: false, snow: false, precipitation: null, lon: 24.1, lat: 65.9 }],
    karantan: [{ station_id: "1106" }],
  });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["1106"], "den finska 1106 är inte Ö Ljungby");
});

test("#234 en oläsbar historik fäller inte snapshoten — ingen karantän, och det noteras", async () => {
  const q: Q = async (text) => {
    if (text.includes("HAVING count(*)")) throw new Error("saknas");
    if (text.includes("FROM weather_latest") && text.includes("surface_temp_c <= 3"))
      return [{ station_id: "W1", surface_temp_c: "-1", rain: true, snow: false, precipitation: "rain", lon: 15, lat: 58 }];
    return [];
  };
  const { liveDoc, notes } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["W1"]);
  assert.ok(notes.some((n) => n.startsWith("karantän:") && n.includes("ej läsbar")));
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

// ── RADARN I SNAPSHOTEN (kort #81 steg C, DECISIONS #153–#156) ───────────────────────────
// Tre saker prövas, och den tredje är den som betyder något: att frånvaro av radar blir NULL
// och inte noll. radar_precip skrivs bara vid eko ≥ 0,1 mm/h inom täckning, så en saknad rad
// kan betyda torrt ELLER utanför täckning — och en nolla hade påstått det första.
test("radarn skrivs om till stationens skala: divideras med 0,65, aldrig multipliceras", async () => {
  const { q } = fakeDb({
    segments: [{ segment_id: "S1", condition_code: 3, condition_info: ["Is"], road_number: "E4",
                 g: { coordinates: [[15, 60], [15.1, 60.1]] } }],
    radar: [{ segment_id: "S1", rate_mean_mmh: "2.0" }],
  });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  // 2,0 råradar ⇒ 2,0 / 0,65 ≈ 3,1 i stationens skala. Multiplikation hade gett 1,3.
  assert.equal(liveDoc.segments[0].regn, 3.1);
  assert.notEqual(liveDoc.segments[0].regn, 1.3, "faktorn får inte multipliceras — då halveras värdet");
});

test("ett segment utan radarrad får null, ALDRIG noll", async () => {
  const { q } = fakeDb({
    segments: [{ segment_id: "S1", condition_code: 3, condition_info: ["Is"], road_number: null,
                 g: { coordinates: [[15, 60], [15.1, 60.1]] } }],
    radar: [],
  });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  assert.equal(liveDoc.segments[0].regn, null);
  assert.notEqual(liveDoc.segments[0].regn, 0, "noll vore ett påstående om torrhet vi inte mätt");
});

test("bara det segment radarn sett får ett värde", async () => {
  const { q } = fakeDb({
    segments: [
      { segment_id: "S1", condition_code: 3, condition_info: ["Is"], road_number: null, g: { coordinates: [[15, 60], [15.1, 60.1]] } },
      { segment_id: "S2", condition_code: 4, condition_info: ["Snö"], road_number: null, g: { coordinates: [[16, 61], [16.1, 61.1]] } },
    ],
    radar: [{ segment_id: "S2", rate_mean_mmh: "0.65" }],
  });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  assert.equal(liveDoc.segments[0].regn, null);
  assert.equal(liveDoc.segments[1].regn, 1);   // 0,65 / 0,65 = 1,0 exakt
});

test("giltighetsfönstret står i frågan — radarn är tyst när den är för gammal", async () => {
  const { q, asked } = fakeDb({ radar: [] });
  await buildSnapshot(q, [], NOW);
  const f = asked.find((t) => t.includes("FROM radar_precip"));
  assert.ok(f, "radarfrågan ska ställas");
  assert.match(f!, /70 minutes/, "#81 regel 7: äldre än 70 min är radarn tyst");
  assert.match(f!, /rate_mean_mmh/, "faktorn är mätt på rate_mean — rate_max är spärrat (#134)");
  assert.ok(!f!.includes("rate_max"), "rate_max får inte användas här");
});

test("en otillgänglig radartabell fäller INTE snapshoten — men den noteras", async () => {
  // publicera bygger snapshoten för alla fem varningsslag. Att döda halka, is, olyckor, vilt och
  // kameror för att ett valfritt fält saknas vore oproportionerligt. Men tystnad vore värre:
  // en fail-soft-gren utan spår är ett tyst ALDRIG.
  const rows: any = {
    segments: [{ segment_id: "S1", condition_code: 3, condition_info: ["Is"], road_number: null,
                 g: { coordinates: [[15, 60], [15.1, 60.1]] } }],
  };
  const q: Q = async (text) => {
    if (text.includes("FROM radar_precip")) throw new Error('relation "radar_precip" does not exist');
    if (text.includes("FROM road_conditions")) return rows.segments;
    return [];
  };
  const { liveDoc, notes } = await buildSnapshot(q, [], NOW);
  assert.equal(liveDoc.segments.length, 1, "snapshoten byggs ändå");
  assert.equal(liveDoc.segments[0].regn, null);
  assert.ok(notes.some((n) => n.includes("radar_precip ej läsbar")), "felet ska stå i noterna, inte försvinna");
});

// ── REGNSEGMENTEN (kort #154, bedömning v3 N2, DECISIONS #187) ──────────────────────────────
// Radarns regn nådde bara halkklassade segment. Normalklassade segment med råradar ≥ utlösaren får
// nu en EGEN nyckel — aldrig `segments`, för varje rad där blir en varning i tre portar.
test("#154 regnsegmenten: normalklassat segment över utlösaren hamnar i rain_segments, inte i segments", async () => {
  const { q, anyParams } = fakeDb({
    segments: [{ segment_id: "S1", condition_code: 3, condition_info: ["Is"], road_number: "E4", g: { coordinates: [[15, 60], [15.1, 60.1]] } }],
    radar: [
      { segment_id: "S1", rate_mean_mmh: "2.0" },   // halkklassat: får regn i segments, aldrig dubbelt
      { segment_id: "S2", rate_mean_mmh: "2.5" },   // normalklassat över 2,0 ⇒ regnsegment
      { segment_id: "S3", rate_mean_mmh: "1.9" },   // under utlösaren ⇒ frågas aldrig efter
    ],
    regnSegs: [{ segment_id: "S2", condition_code: 1, condition_info: [], road_number: "E18", g: { coordinates: [[16, 59], [16.1, 59.1]] } }],
  });
  const { staticDoc, liveDoc } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(anyParams, [[["S2"]]], "bara S2 frågas efter: S1 finns redan, S3 ligger under 2,0");
  assert.deepEqual(liveDoc.rain_segments, [{ id: "S2", line: [[16, 59], [16.1, 59.1]], code: 1, info: [], road: "E18", regn: 3.8 }]);
  assert.deepEqual(liveDoc.segments.map((s) => s.id), ["S1"], "väglagsfrågan är orörd");
  assert.equal(liveDoc.segments[0].regn, 3.1);
  // Motorn ser fortfarande EN slippery_segment — nyckeln når ingen port.
  const seg = snapshotToHazards(staticDoc, liveDoc).filter((h) => h.kind === "slippery_segment");
  assert.deepEqual(seg.map((h) => h.id), ["seg:S1"]);
});

test("#154 utan råradar över utlösaren ställs ingen geometrifråga och rain_segments är tom", async () => {
  const { q, anyParams } = fakeDb({ radar: [{ segment_id: "S9", rate_mean_mmh: "1.99" }] });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(liveDoc.rain_segments, []);
  assert.equal(anyParams.length, 0);
  assert.equal(REGN_UTLOSARE_MMH, 2.0, "DECISIONS #155/#156: utlösaren är 2,0 mm/h råradar");
});

test("#154 en fallen geometrifråga fäller inte snapshoten — rain_segments tom och noterad", async () => {
  const q: Q = async (text) => {
    if (text.includes("= ANY($1::text[])")) throw new Error("boom");
    if (text.includes("FROM radar_precip")) return [{ segment_id: "S2", rate_mean_mmh: "3" }];
    return [];
  };
  const { liveDoc, notes } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(liveDoc.rain_segments, []);
  assert.ok(notes.some((n) => n.startsWith("regnsegment:")), "felet ska stå i noterna");
});

// ── F1: SKATTARENS RÅA INDATA (kort #187, bedömning v3 N4, DECISIONS #188) ─────────────────
test("#187 regn_h och lutning läggs bredvid fukt — null när fönstret är tomt, aldrig noll", async () => {
  const { q, asked } = fakeDb({
    wx: [
      { station_id: "W1", surface_temp_c: "1.0", rain: false, snow: false, precipitation: "no", lon: 15, lat: 58 },
      { station_id: "W2", surface_temp_c: "0.5", rain: false, snow: false, precipitation: "no", lon: 16, lat: 59 },
    ],
    regnH: [{ station_id: "W1", regn_h: "3.49" }],                                            // pg: numeric som sträng
    lutning: [{ station_id: "W1", lutning15_c: "0.4", lutning30_c: null, lutning60_c: "1.2" }],
  });
  const { liveDoc } = await buildSnapshot(q, [], NOW);
  const [w1, w2] = liveDoc.weather;
  assert.deepEqual(w1, { id: "W1", lon: 15, lat: 58, yta: 1, fukt: false, regn_h: 3.5, lutning15: 0.4, lutning30: null, lutning60: 1.2 });
  assert.deepEqual(w2, { id: "W2", lon: 16, lat: 59, yta: 0.5, fukt: false, regn_h: null, lutning15: null, lutning30: null, lutning60: null });
  const rh = asked.find((t) => t.includes("FROM weather_observations") && !t.includes("HAVING count(*)"))!;   // inte karantänfrågan (#234)
  assert.match(rh, /rain_sum_mm > 0/); assert.match(rh, /48 hours/);
  const tk = asked.find((t) => t.includes("FROM trend_kandidater"))!;
  assert.match(tk, /60 minutes/); assert.match(tk, /DISTINCT ON \(station_id\)/);
  // Motorn läser inget av det: samma hazard som förut.
  const wx = snapshotToHazards({ schema: 1, cameras: [] }, liveDoc).find((h) => h.id === "wx:W1") as any;
  assert.deepEqual(wx.meta, { surfaceTempC: 1, moisture: false });
});

test("#187 otillgängliga arkiv fäller inte snapshoten — regn_h/lutning blir null och noteras", async () => {
  const q: Q = async (text) => {
    if (text.includes("FROM weather_observations") || text.includes("FROM trend_kandidater")) throw new Error("saknas");
    if (text.includes("FROM weather_latest") && text.includes("surface_temp_c <= 3"))
      return [{ station_id: "W1", surface_temp_c: "-1", rain: true, snow: false, precipitation: "rain", lon: 15, lat: 58 }];
    return [];
  };
  const { liveDoc, notes } = await buildSnapshot(q, [], NOW);
  assert.equal(liveDoc.weather[0].regn_h, null);
  assert.equal(liveDoc.weather[0].lutning60, null);
  assert.ok(notes.some((n) => n.startsWith("regn_h:")) && notes.some((n) => n.startsWith("lutning:")), "båda felen ska stå i noterna");
});

test("#234 fragmenten för mätningarna (DECISIONS #299): radvakten är WX_SANE:s, karantänen räknas från radens egen tid", () => {
  assert.ok(WX_SANE.endsWith(` AND ${RADVAKT_SQL}`), "driften och mätningarna bär SAMMA radvakt — en sträng, inte två");
  assert.equal(RADVAKT_SQL, `(air_temp_c IS NULL OR air_temp_c < ${GIVARFEL_LUFT_MIN_C} OR air_temp_c - surface_temp_c < ${GIVARFEL_GAP_C})`);
  const k = karantanSql("w");
  assert.ok(k.startsWith(`${brottSql("w")} < ${KARANTAN_BROTT}`), "karantänen = brotten under gränsen");
  assert.ok(k.includes("k.station_id = w.station_id") && k.includes("k.sample_time <= w.sample_time"), "radens egen station och tid");
  assert.ok(k.includes(`w.sample_time - interval '${KARANTAN_DYGN} days'`), "fönstret räknas bakåt från raden, inte från nu");
  assert.ok(k.includes("k.surface_temp_c < k.air_temp_c - 12"), "brottet ÄR #75:s gräns — inget nytt tal");
  assert.ok(karantanSql("r", "fi.weather_observations").includes("FROM fi.weather_observations k WHERE k.station_id = r.station_id"), "det finska arkivet");
});

test("#236 den långsamma vakten: en station med ett färskt dygn i felet tystas — väderpunkt och bro — utan att regeln står här", async () => {
  const { q, asked } = fakeDb({
    wx: [
      { station_id: "FRISK", surface_temp_c: "0.5", rain: true, snow: false, precipitation: "rain", lon: 15.0, lat: 58.05 },
      { station_id: "LJUNGBY", surface_temp_c: "-1.0", rain: true, snow: false, precipitation: "rain", lon: 13.0, lat: 56.18 },
    ],
    allWx: [
      { station_id: "FRISK", surface_temp_c: "0.5", rain: true, snow: false, precipitation: "rain", lon: 15.0, lat: 58.05 },
      { station_id: "LJUNGBY", surface_temp_c: "-1.0", rain: true, snow: false, precipitation: "rain", lon: 13.0, lat: 56.18 },
    ],
    langsam: [{ station_id: "LJUNGBY" }],
  });
  const bridges = bridgesFromGeoJSON({ features: [
    { geometry: { coordinates: [15.0, 58.06] }, properties: { id: "B-FRISK", road: "E4" } },
    { geometry: { coordinates: [13.0, 56.19] }, properties: { id: "B-LJUNGBY", road: "E4" } },
  ] });
  const { liveDoc, notes } = await buildSnapshot(q, bridges, NOW);
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["FRISK"], "gap under 12 och sval luft: bara den långsamma vakten tar den");
  assert.deepEqual(liveDoc.bridges.map((b) => b.id), ["B-FRISK"], "broarna vid den trasiga givaren får ingen frysrisk");
  assert.ok(notes.some((n) => n.startsWith("långsam vakt:") && n.includes("LJUNGBY")), "vem som tystats ska stå i noterna");
  const f = asked.find((t) => t.includes("FROM givarfel_dygn"))!;
  assert.ok(f.includes(`senast > now() - interval '${LANGSAM_FRIST_H} hours'`), "snapshoten läser tabellen med fristen");
  assert.ok(!f.includes(">= 6") && !f.includes("0.9"), "regeln själv står i sql/030, inte här");
});

test("#236 en oläsbar givarfel_dygn fäller inte snapshoten — stationen talar, och det noteras", async () => {
  const q: Q = async (text) => {
    if (text.includes("FROM givarfel_dygn")) throw new Error("finns inte");
    if (text.includes("FROM weather_latest") && text.includes("surface_temp_c <= 3"))
      return [{ station_id: "W1", surface_temp_c: "-1", rain: true, snow: false, precipitation: "rain", lon: 15, lat: 58 }];
    return [];
  };
  const { liveDoc, notes } = await buildSnapshot(q, [], NOW);
  assert.deepEqual(liveDoc.weather.map((w) => w.id), ["W1"]);
  assert.ok(notes.some((n) => n.startsWith("långsam vakt:") && n.includes("ej läsbar")));
});

test("#236 fragmenten: karantanSql bär dygnsflaggan för det svenska arkivet, inte för det finska", () => {
  assert.equal(LANGSAM_FRIST_H, 3);
  const g = givarfelSql("w");
  assert.ok(g.startsWith("EXISTS (SELECT 1 FROM givarfel_dygn g WHERE g.station_id = w.station_id") && g.includes("(w.sample_time AT TIME ZONE 'UTC')::date"));
  assert.ok(karantanSql("w").endsWith(` AND NOT ${g}`), "det svenska arkivet: karantänen OCH dygnet i felet");
  assert.ok(!karantanSql("w", "fi.weather_observations").includes("givarfel_dygn"), "det finska arkivet: id:n kan krocka, tabellen gäller inte där");
});
