// Kartlagerkärnan (#77): kartsajtens sex filer ur en låtsasdatabas, utan Postgres och utan
// Trafikverket. Fail-soft-grenen för väglagskamerorna bevisas i båda riktningarna.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMapData, KANDIDAT_BITAR_SQL, STAD_BITAR_SQL, STAD_HALV_M } from "../publish/map-core.ts";
import type { Q } from "../publish/snapshot-core.ts";

const NOW = new Date("2026-11-20T06:30:00Z");
const pt = (lon: number, lat: number) => ({ type: "Point", coordinates: [lon, lat] });

function fakeDb(o: { bitar?: Record<string, unknown>[]; bitarKastar?: boolean; fragor?: { text: string; params?: unknown[] }[]; grannar?: boolean;
                     stadBitar?: Record<string, unknown>[]; stadKastar?: boolean; stadFragor?: { text: string; params?: unknown[] }[] } = {}) {
  const q: Q = async (text, params) => {
    if (text === KANDIDAT_BITAR_SQL) {   // #579
      o.fragor?.push({ text, params });
      if (o.bitarKastar) throw new Error("function st_transform does not exist");
      return o.bitar ?? [];
    }
    if (text === STAD_BITAR_SQL) {   // #935
      o.stadFragor?.push({ text, params });
      if (o.stadKastar) throw new Error('relation "stadsgata" does not exist');
      return o.stadBitar ?? [];
    }
    if (text.includes("FROM road_conditions")) return [
      { segment_id: "S1", condition_code: "2", condition_text: "Besvärligt", condition_info: ["Is"], road_number: "E10",
        location_text: "Kiruna", modified_time: "2026-11-20T06:00:00Z", lan: "25", g: { type: "LineString", coordinates: [[20.2, 67.8], [20.3, 67.9]] } },
      { segment_id: "S2", condition_code: "1", condition_text: "Normalt", condition_info: [], road_number: "E4",
        location_text: null, modified_time: "2026-11-20T06:00:00Z", lan: "1", g: { type: "LineString", coordinates: [[18, 59], [18.1, 59.1]] } },
    ];
    if (text.includes("FROM weather_latest")) return [
      { land: "SE", station_id: "W1", name: "Kall", sample_time: "2026-11-20T06:20:00Z", surface_temp_c: "-1.5", air_temp_c: "0.5", precipitation: "no", rain: false, snow: false, g: pt(17, 62.4) },
      { land: "FI", station_id: "F1", name: "Varm", sample_time: "2026-11-20T06:20:00Z", surface_temp_c: "4", air_temp_c: null, precipitation: "rain", rain: true, snow: false, g: pt(24, 65.9) },
      ...(o.grannar ? [   // #865: kalla grannar, som skulle räknas om rikstalen tog med dem
        { land: "FI", station_id: "F2", name: "Kall FI", sample_time: "2026-11-20T06:20:00Z", surface_temp_c: "-3", air_temp_c: "-4", precipitation: "no", rain: false, snow: false, g: pt(25, 66) },
        { land: "DK", station_id: "K1", name: "Kall DK", sample_time: "2026-11-20T06:20:00Z", surface_temp_c: "-0.5", air_temp_c: "1", precipitation: "no", rain: false, snow: false, g: pt(10, 56) },
      ] : []),
    ];
    if (text.includes("FROM deviations")) return [
      { land: "SE", deviation_id: "D1", message_type: "Olycka", message: "Testolycka", severity_text: "Stor påverkan", road_number: "E4", start_time: "2026-11-20T05:00:00Z", g: pt(18.1, 59.4) },
      ...(o.grannar ? [{ land: "FI", deviation_id: "FD1", message_type: "Onnettomuus", message: "Testi", severity_text: null, road_number: "4", start_time: "2026-11-20T05:00:00Z", g: pt(25.5, 65) }] : []),
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

test("#77 alla sju kartfiler ur kärnan, i kartsajtens format (kandidaten sedan #579)", async () => {
  const { files, stats, notes } = await buildMapData(fakeDb(), { trvKey: "k", fetchFn: trvOk as any, now: NOW });
  assert.deepEqual(Object.keys(files).sort(), ["kameror-vaglag.geojson", "kameror.geojson", "kandidat.geojson", "meta.json", "olyckor.geojson", "vader.geojson", "vaglag.geojson"]);
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
    generated_at: "2026-11-20T06:30:00.000Z", vaglag_total: 2, vaglag_ej_normalt: 1, stationer: 1, kalla_stationer: 1,   // #865: F1 är finsk
    olyckor: 1, kameror: 1, kameror_vaglag: 600, vilt_dygn: 1, vilt_vecka: 3, vilt_vanligast: "älg",
    smhi_vinter: [{ event: "Snöfall", niva: "Gul", niva_kod: "YELLOW", omrade: "Norrbotten" }], waitlist_count: 31,
    kandidat: { pa: false, strackor: 0, punkter: 0, ritade: 0, km: 0, stad: 0, stad_bitar: 0, stad_prickar: 0, tid: null },   // #579: ingen nyckel ⇒ av
  });
});

test("#865 rikstalen räknar bara Sverige: grannländerna ritas men räknas inte", async () => {
  const { files, stats } = await buildMapData(fakeDb({ grannar: true }), { now: NOW });
  assert.deepEqual(JSON.parse(files["vader.geojson"]).features.map((f: any) => f.properties.land), ["SE", "FI", "FI", "DK"]);
  assert.deepEqual(JSON.parse(files["olyckor.geojson"]).features.map((f: any) => f.properties.land), ["SE", "FI"]);
  assert.equal(stats.stationer, 1, "bara den svenska stationen");
  assert.equal(stats.kalla_stationer, 1, "den finska och den danska kalla stationen räknas inte");
  assert.equal(stats.olyckor, 1, "den finska olyckan räknas inte");
});

test("#77 fail-soft för väglagskamerorna: TRV-fel eller tunt svar ⇒ filen utelämnas, resten skrivs, noten bär kroppen", async () => {
  const trv400 = async () => new Response("Invalid query attribute", { status: 400 });
  let r = await buildMapData(fakeDb(), { trvKey: "k", fetchFn: trv400 as any, now: NOW });
  assert.equal("kameror-vaglag.geojson" in r.files, false);
  assert.equal(Object.keys(r.files).length, 6, "fem lager och meta — kameror-vaglag utelämnad (kandidaten sedan #579)");
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

// ── KANDIDATENS BITAR AV VÄGEN (NIVA2-LIVE steg 9, DECISIONS #579) ─────────────────────────────────────────────────────
test("#579 brytaren av (ingen nyckel): tom kandidatfil, frågan ställs inte, och meta säger av", async () => {
  const fragor: { text: string; params?: unknown[] }[] = [];
  const { files, notes } = await buildMapData(fakeDb({ fragor }), { now: NOW });
  assert.deepEqual(JSON.parse(files["kandidat.geojson"]).features, []);
  assert.equal(fragor.length, 0);
  assert.deepEqual(JSON.parse(files["meta.json"]).kandidat, { pa: false, strackor: 0, punkter: 0, ritade: 0, km: 0, stad: 0, stad_bitar: 0, stad_prickar: 0, tid: null });
  assert.ok(!notes.some((n) => n.startsWith("kandidat:")));
});

test("#579 brytaren på: en rad per punkt till frågan, en bit per sträcka tillbaka, och meta räknar det som inte ritades", async () => {
  const fragor: { text: string; params?: unknown[] }[] = [];
  const bitar = [{ seg: "S1", punkter: 2, km: "3.0", g: { type: "LineString", coordinates: [[17, 60.009], [17, 60.036]] } }];
  const appKandidat = [
    { id: "S1", tid: "2026-11-20T05:00:00.000Z", punkter: [[17, 60.018], [17, 60.027]] as [number, number][] },
    { id: "S2", tid: "2026-11-20T05:00:00.000Z", punkter: [[18, 59.5]] as [number, number][] },
  ];
  const { files, notes } = await buildMapData(fakeDb({ fragor, bitar }), { now: NOW, appKandidat });
  assert.deepEqual(fragor[0].params, [["S1", "S1", "S2"], [17, 17, 18], [60.018, 60.027, 59.5]]);
  assert.deepEqual(JSON.parse(files["kandidat.geojson"]).features, [{ type: "Feature", geometry: bitar[0].g,
    properties: { segment_id: "S1", punkter: 2, km: 3, tid: "2026-11-20T05:00:00.000Z" } }]);
  assert.deepEqual(JSON.parse(files["meta.json"]).kandidat, { pa: true, strackor: 2, punkter: 3, ritade: 2, km: 3, stad: 0, stad_bitar: 0, stad_prickar: 0, tid: "2026-11-20T05:00:00.000Z" });
  assert.ok(notes.some((n) => n.startsWith("kandidat: 1 av 3 punkter ritas inte")), "det som inte ritas ska synas");
});

test("#935 storstädernas punkter får bitar längs sin gata i en egen fråga, och en punkt utan bit ritas som prick", async () => {
  const fragor: { text: string; params?: unknown[] }[] = [], stadFragor: { text: string; params?: unknown[] }[] = [];
  const bitar = [{ seg: "S1", punkter: 1, km: "2.0", g: { type: "LineString", coordinates: [[17, 60.009], [17, 60.027]] } }];
  // B-gruppens två punkter fick en bit (ordningsnummer 1 och 2 i frågan); C-punkten (3) fick ingen och blir en prick.
  const stadBitar = [{ seg: "B-503-3290", punkter: 2, km: "1.25", ritade: ["1", "2"], g: { type: "LineString", coordinates: [[17.66, 59.185], [17.67, 59.178]] } }];
  const tid = "2026-11-20T18:00:00.000Z";
  const appKandidat = [
    { id: "S1", tid, punkter: [[17, 60.018]] as [number, number][] },
    { id: "B-503-3290", tid, punkter: [[17.664, 59.182], [17.665, 59.181]] as [number, number][] },
    { id: "C-12-34", tid, punkter: [[18.07, 59.33]] as [number, number][] },
  ];
  const { files, notes } = await buildMapData(fakeDb({ fragor, bitar, stadFragor, stadBitar }), { now: NOW, appKandidat });
  assert.deepEqual(fragor[0].params, [["S1"], [17], [60.018]], "bara vägens punkter går till vägens fråga");
  assert.deepEqual(stadFragor[0].params, [["B-503-3290", "B-503-3290", "C-12-34"], [17.664, 17.665, 18.07], [59.182, 59.181, 59.33]],
    "stadspunkterna går till stadens fråga, i lägesfilens ordning");
  const f = JSON.parse(files["kandidat.geojson"]).features;
  assert.deepEqual(f.map((x: any) => [x.geometry.type, x.properties.segment_id, x.properties.stad ?? false]),
    [["LineString", "S1", false], ["LineString", "B-503-3290", true], ["Point", "C-12-34", true]], "vägens bit, stadens bit och en prick");
  assert.deepEqual(f[1], { type: "Feature", geometry: stadBitar[0].g, properties: { segment_id: "B-503-3290", stad: true, punkter: 2, km: 1.25, tid } });
  assert.deepEqual(f[2].geometry.coordinates, [18.07, 59.33], "pricken står där punkten står");
  assert.deepEqual(JSON.parse(files["meta.json"]).kandidat,
    { pa: true, strackor: 3, punkter: 4, ritade: 4, km: 3.3, stad: 3, stad_bitar: 2, stad_prickar: 1, tid }, "meta räknar bitar och prickar");
  assert.ok(notes.includes("kandidat: 1 av 3 stadspunkter ritas som prickar (utan linje, eller mer än 300 m från den)"), "pricken syns i noterna");
  assert.ok(!notes.some((n) => n.includes("ritas inte")), "vägens punkt ritades");
});

test("#935 utan stadens linjer (tom tabell, eller frågan faller) ritas varje stadspunkt som prick, som före linjerna (#928)", async () => {
  const tid = "2026-11-20T18:00:00.000Z";
  const appKandidat = [
    { id: "B-503-3290", tid, punkter: [[17.664, 59.182], [17.665, 59.181]] as [number, number][] },
    { id: "C-12-34", tid, punkter: [[18.07, 59.33]] as [number, number][] },
  ];
  for (const [namn, o] of [["tom", { stadBitar: [] }], ["fallen", { stadKastar: true }]] as const) {
    const fragor: { text: string; params?: unknown[] }[] = [];
    const { files, notes } = await buildMapData(fakeDb({ ...o, fragor }), { now: NOW, appKandidat });
    const f = JSON.parse(files["kandidat.geojson"]).features;
    assert.deepEqual(f.map((x: any) => [x.geometry.type, x.geometry.coordinates, x.properties.segment_id, x.properties.stad]),
      [["Point", [17.664, 59.182], "B-503-3290", true], ["Point", [17.665, 59.181], "B-503-3290", true], ["Point", [18.07, 59.33], "C-12-34", true]], namn);
    assert.deepEqual(JSON.parse(files["meta.json"]).kandidat,
      { pa: true, strackor: 2, punkter: 3, ritade: 3, km: 0, stad: 3, stad_bitar: 0, stad_prickar: 3, tid }, namn);
    assert.equal(fragor.length, 0, `${namn}: med bara stadspunkter ställs ingen fråga om vägens bitar`);
    assert.ok(notes.some((n) => (namn === "tom" ? n.startsWith("kandidat: 3 av 3 stadspunkter ritas som prickar") : n.startsWith("kandidat: stadens bitar ej läsbara"))), namn);
  }
  // Vägens fråga faller: stadens bitar ritas ändå.
  const stadBitar = [{ seg: "C-12-34", punkter: 1, km: "0.08", ritade: ["3"], g: { type: "LineString", coordinates: [[18.069, 59.33], [18.071, 59.33]] } }];
  const r = await buildMapData(fakeDb({ bitarKastar: true, stadBitar }), { now: NOW, appKandidat: [{ id: "S1", tid, punkter: [[17, 60.018]] }, ...appKandidat] });
  assert.deepEqual(JSON.parse(r.files["kandidat.geojson"]).features.map((x: any) => x.geometry.type), ["LineString", "Point", "Point"]);
});

test("#935 stadsbitens längd åt vardera hållet står i frågan, per lager", () => {
  assert.ok(STAD_BITAR_SQL.includes(`CASE left(seg, 1) WHEN 'B' THEN ${STAD_HALV_M.B} ELSE ${STAD_HALV_M.C} END`));
  assert.ok(STAD_HALV_M.B > 0 && STAD_HALV_M.C > 0 && STAD_HALV_M.B <= 1000 && STAD_HALV_M.C <= 1000, "aldrig längre än vägens bit");
  assert.ok(STAD_BITAR_SQL.includes("ST_DWithin(ST_Transform(g.geom, 3006), sp.pt, 300)"), "300 m som vägens bitar");
});

test("#579 en fallen fråga fäller inte kartan — kandidatlagret tomt och noterat", async () => {
  const appKandidat = [{ id: "S1", tid: "2026-11-20T05:00:00.000Z", punkter: [[17, 60.018]] as [number, number][] }];
  const { files, notes } = await buildMapData(fakeDb({ bitarKastar: true }), { now: NOW, appKandidat });
  assert.deepEqual(JSON.parse(files["kandidat.geojson"]).features, []);
  assert.ok(notes.some((n) => n.startsWith("kandidat: bitarna ej läsbara")));
  assert.ok(files["vaglag.geojson"] && files["meta.json"], "resten av kartan står kvar");
});
test("#587 kartan läser inte Vejdirektoratets avvikelser (licensen okänd), men Sveriges och Finlands står kvar", async () => {
  const fragor: string[] = []; const db = fakeDb();
  await buildMapData(async (text, params) => { fragor.push(text); return db(text, params); }, { now: NOW });
  assert.deepEqual(fragor.filter((f) => f.includes("dk.deviations")), []);
  const olyckor = fragor.find((f) => f.includes("FROM deviations"));
  assert.ok(olyckor && olyckor.includes("FROM fi.deviations"));
});
