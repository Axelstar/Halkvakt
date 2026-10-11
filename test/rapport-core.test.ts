import { test } from "node:test";
import assert from "node:assert/strict";
import { byggRapport, favoritRapport, glesa, grupperade, langsVagen, linjerUr, notis, nyttSedan, punktUr, slagFor, tomma, vagNamn, visning, ORDNING, GRUPP_FRAN,
  MARGINALER, MARGINALER_RAKA, type Rad } from "../publish/rapport-core.ts";
import type { Hazard } from "../engine/src/types.ts";
import type { LiveDoc, StaticDoc } from "../engine/src/snapshot.ts";

// Rapportfilen och favoritprovet (DECISIONS #529). Syntetiska svar i Trafikverkets form; rutten går rakt österut vid 59°.

const NU = Date.parse("2026-10-12T06:00:00Z");
const RUTT: [number, number][] = [[15.0, 59.0], [15.5, 59.0]];   // ~29 km
const dev = (o: Record<string, unknown>) => ({ Deleted: false, Suspended: false, StartTime: "2026-10-12T05:00:00Z", EndTime: "2026-10-20T00:00:00Z", ...o });

test("klassningen: slagen ur koderna, och Körfält blockerade är ingen kö (#528:s rättelse)", () => {
  assert.equal(slagFor({ MessageTypeValue: "Accident" }), "olycka");
  assert.equal(slagFor({ MessageTypeValue: "AnimalPresenceObstruction" }), "vilt");
  assert.equal(slagFor({ MessageTypeValue: "AbnormalTraffic" }), "ko");
  assert.equal(slagFor({ MessageTypeValue: "VehicleObstruction", MessageCodeValue: "brokenDownVehicle" }), "hinder");
  assert.equal(slagFor({ MessageTypeValue: "MaintenanceWorks", MessageCodeValue: "followDiversionSigns" }), "omledning");
  assert.equal(slagFor({ MessageTypeValue: "MaintenanceWorks", MessageCodeValue: "speedRestrictionInOperation", TemporaryLimit: "Rekommenderad hastighet: 30km/h" }), "hastighet");
  assert.equal(slagFor({ MessageTypeValue: "MaintenanceWorks", MessageCodeValue: "laneClosures", TrafficRestrictionType: "Körfält blockerade" }), "vagarbete");
  assert.equal(slagFor({ MessageTypeValue: "MaintenanceWorks", MessageCodeValue: "weightRestrictionInOperation", TemporaryLimit: "bruttovikt 12 ton" }), "vagarbete");
  assert.equal(slagFor({ MessageTypeValue: "Ferry", MessageCodeValue: "ferry" }), null);
});

test("geometrin: punkt, linje, multilinje och Z, fyra decimaler (#530)", () => {
  assert.deepEqual(punktUr("POINT (15.123456 59.5)"), [15.1235, 59.5]);
  assert.deepEqual(punktUr("POINT Z (15.1 59.2 30)"), [15.1, 59.2]);
  assert.deepEqual(linjerUr("LINESTRING (15 59, 15.1 59.1)"), [[[15, 59], [15.1, 59.1]]]);
  assert.deepEqual(linjerUr("MULTILINESTRING Z ((15 59 1, 15.1 59.1 2), (16 60 0, 16.1 60.1 0))"), [[[15, 59], [15.1, 59.1]], [[16, 60], [16.1, 60.1]]]);
  assert.deepEqual(linjerUr("POINT (1 2)"), []);
});

test("utglesningen: brytpunkter närmare än 20 m den förra stryks, start och slut står kvar", () => {
  // Från starten: ~6 m och ~11 m (strykas), ~57 m (behålls), ~6 m från den men sist (behålls alltid).
  const l: [number, number][] = [[15, 59], [15.0001, 59], [15.0002, 59], [15.001, 59], [15.0011, 59]];
  assert.deepEqual(glesa(l), [[15, 59], [15.001, 59], [15.0011, 59]]);
  assert.deepEqual(glesa([[15, 59], [15.00001, 59]]), [[15, 59], [15.00001, 59]], "två punkter rörs aldrig");
});

const IN = {
  nu: NU,
  situationer: [{ Deviation: [
    dev({ Id: "o1", MessageTypeValue: "Accident", MessageCode: "Olycka", Header: "Olycka, ett körfält avstängt", RoadNumber: "E18", Geometry: { Point: { WGS84: "POINT (15.2 59.0)" } } }),
    dev({ Id: "v1", MessageTypeValue: "MaintenanceWorks", MessageCode: "Vägarbete", MessageCodeValue: "roadworks", NumberOfLanesRestricted: 1,
      SeverityText: "Liten påverkan", Geometry: { Line: { WGS84: "LINESTRING (15.3 58.99, 15.3 59.01)" } } }),
    dev({ Id: "h1", MessageTypeValue: "MaintenanceWorks", MessageCodeValue: "speedRestrictionInOperation", TemporaryLimit: "Hastighet: 50km/h", Geometry: { Point: { WGS84: "POINT (15.31 59.0)" } } }),
    // Samma arbete som Körfältsavstängningar i samma situation (visningen 11/10): slås ihop med v1, med flest körfält.
    dev({ Id: "v1b", MessageTypeValue: "MaintenanceWorks", MessageCode: "Körfältsavstängningar", MessageCodeValue: "laneClosures", NumberOfLanesRestricted: 2,
      Geometry: { Line: { WGS84: "LINESTRING (15.3 58.995, 15.3 59.005)" } } }),
    dev({ Id: "vilande", MessageTypeValue: "MaintenanceWorks", Suspended: true, Geometry: { Point: { WGS84: "POINT (15.1 59.0)" } } }),
    dev({ Id: "slut", MessageTypeValue: "Accident", EndTime: "2026-10-12T05:30:00Z", Geometry: { Point: { WGS84: "POINT (15.1 59.0)" } } }),
    dev({ Id: "fjarran", MessageTypeValue: "Accident", Geometry: { Point: { WGS84: "POINT (18.0 59.3)" } } }),
  ] },
  // En hastighet utan vägarbete i sin situation står kvar för sig.
  { Deviation: [dev({ Id: "h2", MessageTypeValue: "RoadOrCarriagewayOrLaneManagement", MessageCodeValue: "speedRestrictionInOperation",
    TemporaryLimit: "Rekommenderad hastighet: 70km/h", Geometry: { Point: { WGS84: "POINT (15.32 59.0)" } } })] }],
  restider: [
    { Id: "tt1", Name: "Längs rutten", TravelTime: 840, FreeFlowTravelTime: 540, TrafficStatus: "heavy", Geometry: { WGS84: "LINESTRING (15.05 59.001, 15.15 59.001)" } },
    { Id: "tt2", Name: "Långt bort", TravelTime: 300, FreeFlowTravelTime: 300, Geometry: { WGS84: "LINESTRING (18 59.3, 18.1 59.3)" } },
  ],
  farjor: [
    { Route: { Id: 7, Name: "Provleden" }, FromHarbor: { Name: "Väst" }, DepartureTime: "2026-10-12T06:20:00Z" },
    { Route: { Id: 7, Name: "Provleden" }, FromHarbor: { Name: "Öst" }, DepartureTime: "2026-10-12T06:10:00Z" },
    { Route: { Id: 8, Name: "Utan geometri" }, FromHarbor: { Name: "X" }, DepartureTime: "2026-10-12T06:15:00Z" },
    { Route: { Id: 9, Name: "Punktleden" }, FromHarbor: { Name: "Y" }, DepartureTime: "2026-10-12T06:30:00Z" },
  ],
  // FerryRoute bär i verkligheten en PUNKT (torrkörningen 38135721921); led 7 har en linje för att pröva båda.
  farjeleder: [{ Id: 7, Geometry: { WGS84: "LINESTRING (15.45 59.005, 15.45 59.05)" } }, { Id: 9, Geometry: { WGS84: "POINT (15.48 59.003)" } }, { Id: 8 }],
  stationer: [{ id: "s1", namn: "Provby", luft: 1.2 }],
};

test("rapportfilen: bara det aktiva, linjerna i den långsamma delen, restider och färjor", () => {
  const { snabb, lang } = byggRapport(IN);
  const ids = snabb.poster.map((p) => p.id);
  assert.deepEqual(ids.filter((i) => i.startsWith("dev:")).sort(), ["dev:fjarran", "dev:h2", "dev:o1", "dev:v1"], "vilande och slutade borta, h1 lagd på v1");
  const v1 = snabb.poster.find((p) => p.id === "dev:v1")!;
  assert.equal(v1.grans, 50, "hastigheten i samma situation ligger på vägarbetet");
  assert.equal(visning(v1), "2 körfält avstängda · 50 km/h förbi vägarbetet · till 20 oktober", "v1b:s två körfält på v1");
  assert.ok(!ids.includes("dev:v1b") && !lang.linjer["dev:v1b"], "körfältsavstängningen är samma vägarbete");
  assert.ok(snabb.noter.includes("1 avvikelser sammanslagna med sitt vägarbete i samma situation"));
  assert.equal(snabb.poster.find((p) => p.id === "dev:h2")!.rubrik, "70 km/h");
  assert.ok(snabb.noter.includes("1 hastigheter lagda på sitt vägarbete"));
  assert.equal(visning(snabb.poster.find((p) => p.id === "dev:o1")!), "Olycka, ett körfält avstängt · rapporterad 07:00");
  assert.ok(lang.linjer["dev:v1"] && lang.linjer["tt:tt1"] && lang.linjer["led:7"], "linjerna ligger i den långsamma delen");
  const tt1 = snabb.poster.find((p) => p.id === "tt:tt1")!;
  assert.equal(tt1.slag, "ko", "fem minuter över normal är kö");
  assert.equal(visning(tt1), "14 minuter, normalt 9");
  assert.equal(snabb.poster.find((p) => p.id === "tt:tt2")!.slag, "restid");
  const f = snabb.poster.find((p) => p.id === "farja:7")!;
  assert.match(f.text, /^nästa 08:10 från Öst, 08:20 från Väst$/, "i tidsordning, svensk tid");
  assert.ok(!ids.includes("farja:8"), "en led utan geometri kan inte jämföras med en rutt");
  assert.deepEqual(snabb.poster.find((p) => p.id === "farja:9")!.p, [15.48, 59.003], "en led som är en punkt blir en punkt");
  assert.deepEqual(snabb.stationer.s1, { namn: "Provby", luft: 1.2 });
});

const LIVE: LiveDoc = {
  schema: 1, generated_at: "2026-10-12T06:00:00Z",
  segments: [{ id: "r1", line: [[15.1, 58.99], [15.1, 59.01]], code: 2, info: ["Halt"], road: "E18" }],
  weather: [
    { id: "s1", lon: 15.25, lat: 59.005, yta: -0.8, fukt: true },
    { id: "s2", lon: 15.4, lat: 59.002, yta: 2.0, fukt: false, regn_h: 0.5, lutning30: 1.0 },   // S3-betan
    { id: "s3", lon: 15.2, lat: 59.2, yta: -2.0, fukt: true },                                   // ~22 km bort
  ],
  deviations: [], smhi: [{ id: 5, event: "Halka", niva: 2, geom: { type: "Polygon", coordinates: [[[15.4, 58.9], [15.6, 58.9], [15.6, 59.1], [15.4, 59.1], [15.4, 58.9]]] } }],
};
const STAT: StaticDoc = { schema: 1, cameras: [{ id: "k1", lon: 15.35, lat: 59.003, bearing: null, road: "E18" }, { id: "k2", lon: 16.5, lat: 59.0, bearing: null, road: null }] };

test("favoritprovet: rutten får sina rader i viktordning, de fjärran inte", () => {
  const { snabb, lang } = byggRapport(IN);
  const r = favoritRapport(RUTT, LIVE, STAT, snabb, lang, MARGINALER_RAKA);
  const ids = r.map((x) => x.id);
  assert.deepEqual(ids, ["seg:r1", "wx:s1", "wx:s2", "dev:o1", "tt:tt1", "dev:v1", "dev:h2", "farja:7", "farja:9", "cam:k1", "smhi:5:Halka"]);
  assert.ok(!ids.some((i) => /fjarran|tt2|k2|s3/.test(i)), "inget utanför marginalerna");
  assert.match(r.find((x) => x.id === "wx:s1")!.rubrik, /^Frysrisk vid stationen i Provby$/);
  assert.match(r.find((x) => x.id === "wx:s1")!.text, /^Vägytan −0,8 °C, luften \+1,2 °C, fukt på vägbanan$/);
  assert.match(r.find((x) => x.id === "wx:s2")!.rubrik, /\(beta\)$/, "S3 märkt beta");
  assert.equal(r.find((x) => x.id === "dev:v1")!.avstandM, 0, "vägarbetet korsar rutten");
  for (let i = 1; i < r.length; i++) assert.ok(ORDNING.indexOf(r[i - 1].slag) <= ORDNING.indexOf(r[i].slag), "viktordningen");
});

test("nytt sedan förra kollen och det tomma på en rad", () => {
  const { snabb, lang } = byggRapport(IN);
  const nu = favoritRapport(RUTT, LIVE, STAT, snabb, lang, MARGINALER_RAKA);
  assert.deepEqual(nyttSedan(null, nu), [], "första kollen har inget nytt");
  assert.deepEqual(nyttSedan(nu.filter((x) => x.id !== "dev:o1"), nu), ["dev:o1"]);
  const t = tomma(nu.filter((x) => x.slag !== "vilt"));
  assert.ok(t.inget.includes("vilt") && t.inget.includes("hinder") && !t.inget.includes("restid"));
  assert.equal(t.koerMatsInte, false, "en restidssträcka går längs rutten");
  assert.equal(tomma(nu.filter((x) => !x.id.startsWith("tt:"))).koerMatsInte, true);
});

// Sammanslagningen och notisen (DECISIONS #530).
const rad = (id: string, slag: Rad["slag"], langsM: number, o: Partial<Rad> = {}): Rad =>
  ({ id, slag, rubrik: id, text: `text ${id}`, avstandM: 10, langsM, vag: null, start: null, ...o });

test("sammanslagningen: kameror och restider alltid, vägarbeten per väg från tre, det viktiga för sig", () => {
  const r = [rad("seg:1", "halka", 500), rad("dev:o", "olycka", 900),
    rad("cam:1", "kamera", 100, { vag: "E4" }), rad("cam:2", "kamera", 3000, { vag: "E4" }), rad("cam:3", "kamera", 2000, { vag: "E18" }),
    rad("dev:v1", "vagarbete", 1000, { vag: "E4" }), rad("dev:v2", "vagarbete", 4000, { vag: "E4" }), rad("dev:v3", "vagarbete", 2500, { vag: "E4" }),
    rad("dev:v4", "vagarbete", 6000, { vag: "Väg 276" }), rad("tt:1", "restid", 700), rad("tt:2", "restid", 800), rad("tt:3", "ko", 750)];
  const g = grupperade(r);
  assert.deepEqual(g.map((x) => x.id), ["seg:1", "dev:o", "tt:3", "grupp:restid", "grupp:vagarbete|E4", "dev:v4", "grupp:kamera|E4", "grupp:kamera|E18"]);
  const va = g.find((x) => x.id === "grupp:vagarbete|E4")!;
  assert.equal(va.rubrik, "Tre vägarbeten på E4");
  assert.equal(va.antal, 3); assert.deepEqual(va.ids.sort(), ["dev:v1", "dev:v2", "dev:v3"]);
  assert.match(va.text, /^Mellan 1 km och 4 km in på rutten\. Närmast: text dev:v1$/);
  assert.equal(g.find((x) => x.id === "grupp:kamera|E4")!.rubrik, "Två fartkameror på E4");
  assert.equal(g.find((x) => x.id === "grupp:kamera|E18")!.rubrik, "En fartkamera på E18", "en kamera är också en grupp");
  assert.equal(g.find((x) => x.id === "grupp:restid")!.rubrik, "Två restidssträckor", "restider utan väg i rubriken");
  assert.equal(GRUPP_FRAN, 3);
  assert.equal(g.reduce((s, x) => s + x.antal, 0), r.length, "varje rad står i exakt en grupp");
});

test("notisen: det nya av rätt slag, och ett vägarbete bara om det är nytt på riktigt", () => {
  const nu = Date.parse("2026-10-12T06:00:00Z");
  const r = [rad("seg:1", "halka", 1), rad("dev:gammalt", "vagarbete", 2, { start: "2026-09-01T00:00:00Z" }),
    rad("dev:nytt", "vagarbete", 3, { start: "2026-10-12T04:00:00Z" }), rad("smhi:1", "smhi", 4), rad("tt:1", "ko", 5), rad("cam:1", "kamera", 6)];
  assert.deepEqual(notis(r, [], nu), { ja: false, ids: [] }, "inget nytt, ingen notis");
  assert.deepEqual(notis(r, ["dev:gammalt", "smhi:1", "tt:1", "cam:1"], nu), { ja: false, ids: [] }, "ett gammalt vägarbete, SMHI (T6), köer och kameror ger aldrig notis");
  assert.deepEqual(notis(r, ["seg:1", "dev:nytt"], nu), { ja: true, ids: ["seg:1", "dev:nytt"] });
});

test("vägnamnen skrivs lika", () => {
  assert.equal(vagNamn("17"), "väg 17"); assert.equal(vagNamn("Väg 17"), "väg 17"); assert.equal(vagNamn("väg 882"), "väg 882");
  assert.equal(vagNamn("E22"), "E22"); assert.equal(vagNamn("e 4"), "E4"); assert.equal(vagNamn("E 4"), "E4", "broarnas väg i körningen 12:38"); assert.equal(vagNamn(""), null); assert.equal(vagNamn(null), null);
});

test("längs vägen: en tvärväg är inte längs rutten, en väg längs den är det (#531)", () => {
  const seg = (id: string, line: [number, number][]) => ({ id, kind: "slippery_segment", line } as Hazard);
  const tvars = seg("tvars", [[15.2, 58.98], [15.2, 59.02]]);            // korsar rutten, ~4,4 km lång: bara ~100 m inom 100 m
  const langs = seg("langs", [[15.1, 59.0003], [15.15, 59.0003]]);       // ~33 m från rutten, ~2,9 km lång
  const kort = seg("kort", [[15.3, 59.0], [15.3, 59.004]]);              // ~450 m lång, mest inom marginalen
  assert.equal(langsVagen([tvars], RUTT, MARGINALER.vagarbete), false, "en tvärväg");
  assert.equal(langsVagen([langs], RUTT, MARGINALER.vagarbete), true);
  assert.equal(langsVagen([kort], RUTT, MARGINALER.vagarbete), false, "~450 m med en fjärdedel inom 100 m är för lite");
  assert.equal(MARGINALER.kamera, 100); assert.equal(MARGINALER_RAKA.kamera, 1500);
});
