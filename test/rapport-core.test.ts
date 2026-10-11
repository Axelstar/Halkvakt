import { test } from "node:test";
import assert from "node:assert/strict";
import { byggRapport, favoritRapport, linjerUr, nyttSedan, punktUr, slagFor, tomma, ORDNING } from "../publish/rapport-core.ts";
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

test("geometrin: punkt, linje, multilinje och Z", () => {
  assert.deepEqual(punktUr("POINT (15.123456 59.5)"), [15.12346, 59.5]);
  assert.deepEqual(punktUr("POINT Z (15.1 59.2 30)"), [15.1, 59.2]);
  assert.deepEqual(linjerUr("LINESTRING (15 59, 15.1 59.1)"), [[[15, 59], [15.1, 59.1]]]);
  assert.deepEqual(linjerUr("MULTILINESTRING Z ((15 59 1, 15.1 59.1 2), (16 60 0, 16.1 60.1 0))"), [[[15, 59], [15.1, 59.1]], [[16, 60], [16.1, 60.1]]]);
  assert.deepEqual(linjerUr("POINT (1 2)"), []);
});

const IN = {
  nu: NU,
  situationer: [{ Deviation: [
    dev({ Id: "o1", MessageTypeValue: "Accident", MessageCode: "Olycka", Header: "Olycka, ett körfält avstängt", RoadNumber: "E18", Geometry: { Point: { WGS84: "POINT (15.2 59.0)" } } }),
    dev({ Id: "v1", MessageTypeValue: "MaintenanceWorks", MessageCode: "Vägarbete", MessageCodeValue: "roadworks", NumberOfLanesRestricted: 1,
      SeverityText: "Liten påverkan", Geometry: { Line: { WGS84: "LINESTRING (15.3 58.99, 15.3 59.01)" } } }),
    dev({ Id: "h1", MessageTypeValue: "MaintenanceWorks", MessageCodeValue: "speedRestrictionInOperation", TemporaryLimit: "Hastighet: 50km/h", Geometry: { Point: { WGS84: "POINT (15.31 59.0)" } } }),
    dev({ Id: "vilande", MessageTypeValue: "MaintenanceWorks", Suspended: true, Geometry: { Point: { WGS84: "POINT (15.1 59.0)" } } }),
    dev({ Id: "slut", MessageTypeValue: "Accident", EndTime: "2026-10-12T05:30:00Z", Geometry: { Point: { WGS84: "POINT (15.1 59.0)" } } }),
    dev({ Id: "fjarran", MessageTypeValue: "Accident", Geometry: { Point: { WGS84: "POINT (18.0 59.3)" } } }),
  ] }],
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
  assert.deepEqual(ids.filter((i) => i.startsWith("dev:")).sort(), ["dev:fjarran", "dev:h1", "dev:o1", "dev:v1"], "vilande och slutade borta");
  assert.ok(lang.linjer["dev:v1"] && lang.linjer["tt:tt1"] && lang.linjer["led:7"], "linjerna ligger i den långsamma delen");
  const tt1 = snabb.poster.find((p) => p.id === "tt:tt1")!;
  assert.equal(tt1.slag, "ko", "fem minuter över normal är kö");
  assert.equal(tt1.text, "14 minuter, normalt 9");
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
  const r = favoritRapport(RUTT, LIVE, STAT, snabb, lang);
  const ids = r.map((x) => x.id);
  assert.deepEqual(ids, ["seg:r1", "wx:s1", "wx:s2", "dev:o1", "tt:tt1", "dev:v1", "dev:h1", "farja:7", "farja:9", "cam:k1", "smhi:5:Halka"]);
  assert.ok(!ids.some((i) => /fjarran|tt2|k2|s3/.test(i)), "inget utanför marginalerna");
  assert.match(r.find((x) => x.id === "wx:s1")!.rubrik, /^Frysrisk vid stationen i Provby$/);
  assert.match(r.find((x) => x.id === "wx:s1")!.text, /^Vägytan −0,8 °C, luften \+1,2 °C, fukt på vägbanan$/);
  assert.match(r.find((x) => x.id === "wx:s2")!.rubrik, /\(beta\)$/, "S3 märkt beta");
  assert.equal(r.find((x) => x.id === "dev:v1")!.avstandM, 0, "vägarbetet korsar rutten");
  for (let i = 1; i < r.length; i++) assert.ok(ORDNING.indexOf(r[i - 1].slag) <= ORDNING.indexOf(r[i].slag), "viktordningen");
});

test("nytt sedan förra kollen och det tomma på en rad", () => {
  const { snabb, lang } = byggRapport(IN);
  const nu = favoritRapport(RUTT, LIVE, STAT, snabb, lang);
  assert.deepEqual(nyttSedan(null, nu), [], "första kollen har inget nytt");
  assert.deepEqual(nyttSedan(nu.filter((x) => x.id !== "dev:o1"), nu), ["dev:o1"]);
  const t = tomma(nu.filter((x) => x.slag !== "vilt"));
  assert.ok(t.inget.includes("vilt") && t.inget.includes("hinder") && !t.inget.includes("restid"));
  assert.equal(t.koerMatsInte, false, "en restidssträcka går längs rutten");
  assert.equal(tomma(nu.filter((x) => !x.id.startsWith("tt:"))).koerMatsInte, true);
});
