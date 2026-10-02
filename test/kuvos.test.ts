// Kuvösen (kort #232, DECISIONS #424): tidskällorna och inventeringen. Klockans prov mot riktig PostGIS står i
// test/integration.test.ts — en fil per databas, annars körs två filer samtidigt mot samma tabeller.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inventera, skrivUt, gissaAvgransare, delaRad, gissaKodning } from "../kuvos/inventering.ts";
import { ONADDA_TIDSKALLOR } from "../kuvos/klocka.ts";


// Klockan når `now()` genom sökvägen. Nyckelord som CURRENT_TIMESTAMP och kvalificerade anrop läser alltid väggklockan,
// och JavaScript-sidans klocka når den inte alls. Kod som kuvösen kör får därför bara ta tiden på två sätt: `now()` i SQL
// och ett tidsargument i funktionen.
test("kuvösens klocka: snapshotbyggaren har inga tidskällor som klockan inte når", () => {
  assert.ok(ONADDA_TIDSKALLOR.test("SELECT CURRENT_TIMESTAMP") && ONADDA_TIDSKALLOR.test("x > clock_timestamp()")
    && ONADDA_TIDSKALLOR.test("pg_catalog.now()") && !ONADDA_TIDSKALLOR.test("sample_time > now() - interval '3 hours'"),
    "mönstret fångar de onådda källorna och släpper now()");
  for (const f of ["../publish/snapshot-core.ts", "../publish/rekonstruktion.ts"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    const traff = src.split("\n").map((r, i) => [i + 1, r] as const).filter(([, r]) => ONADDA_TIDSKALLOR.test(r));
    assert.deepEqual(traff, [], `${f}: tidskälla som kuvösens klocka inte når`);
    assert.equal((src.match(/Date\.now\(\)/g) ?? []).length, 0, `${f}: Date.now() läser väggklockan`);
    const nyaDatum = src.split("\n").filter((r) => /new Date\(\)/.test(r));
    assert.ok(nyaDatum.every((r) => /now: Date = new Date\(\)/.test(r)), `${f}: new Date() utanför tidsargumentets standardvärde: ${nyaDatum.join(" | ")}`);
  }
});

test("inventeringen: semikolon, decimalkomma, citat, tomma fält, tid och text — räknat, inte tolkat", async () => {
  assert.equal(gissaAvgransare("Station;Tid;Yta"), ";");
  assert.equal(gissaAvgransare('id,"namn, med komma",tid'), ",");
  assert.deepEqual(delaRad('1447;"Ö Ljungby; E4";"sa ""nej""";', ";"), ["1447", "Ö Ljungby; E4", 'sa "nej"', ""]);
  const inv = await inventera([
    "﻿StationsId;Tid;Yttemp;Nederbörd;Sikt\r",
    "1447;2024-11-01 00:00;-0,5;Regn;20000\r",
    "1447;2024-11-01 00:10;;Ingen;20000\r",
    "",
    "1448;2025-03-31 23:50;12,25;Regn;350\r",
    "1448;2025-03-31 23:50;x\r",
  ]);
  assert.deepEqual([inv.avgransare, inv.rader, inv.snedaRader, inv.kolumner.length], [";", 4, 1, 5]);
  const [id, tid, yta, ned, sikt] = inv.kolumner;
  assert.deepEqual([id.namn, id.tal, id.min, id.max], ["StationsId", 4, 1447, 1448], "BOM:en hör inte till kolumnnamnet");
  assert.deepEqual([tid.tider, tid.tidMin, tid.tidMax], [4, "2024-11-01 00:00", "2025-03-31 23:50"]);
  assert.deepEqual([yta.tal, yta.min, yta.max, yta.tomma, yta.texter], [2, -0.5, 12.25, 1, 1], "decimalkomma läses som tal; ett x är text, inte noll");
  assert.deepEqual([...ned.varden], [["Regn", 2], ["Ingen", 1]]);
  assert.equal(ned.tomma, 1, "den korta raden saknar fältet");
  assert.deepEqual([sikt.min, sikt.max], [350, 20000]);
  const ut = skrivUt(inv);
  assert.ok(ut[0].includes("rader: 4") && ut[0].includes("semikolon") && ut[0].includes("RADER MED FEL ANTAL FÄLT: 1"));
  assert.ok(ut.some((r) => r.includes("Yttemp") && r.includes("-0.5 … 12.25")));
});

test("inventeringen: kodningen gissas ur filens början — latin1 när UTF-8 inte går", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuvos-"));
  writeFileSync(join(dir, "u.csv"), "Nederbörd;Ö\n1;2\n", "utf8");
  writeFileSync(join(dir, "l.csv"), Buffer.from("Nederbörd;Ö\n1;2\n", "latin1"));
  assert.equal(gissaKodning(join(dir, "u.csv")), "utf8");
  assert.equal(gissaKodning(join(dir, "l.csv")), "latin1");
});

// Inläsningen (kort #232, DECISIONS #439): raden läses som den står — decimalkomma, tid utan zon, koder som tal — och sidfoten
// hoppas över. Ett värde av fel sort i en rad med rätt antal fält ska LARMA (formatet är då ett annat än det besiktigade).
test("inläsningen: en rad i leveransens form läses rå, sidfoten hoppas över, fel sort larmar", async () => {
  const { tolkaRad, lasFil, KOLUMNER } = await import("../kuvos/inlasning.ts");
  const r = tolkaRad("1203;2025-03-30 03:00:03.000;-0,4;1,2;-0,3;97,1;6;0,4;5,1;2,3;SV ;2,0;20000\r")!;
  assert.deepEqual([r.measurepoint, r.measuretime, r.tyta, r.lu_fu, r.ned_typ, r.ned_maengd, r.virik, r.siktdjup],
    ["1203", "2025-03-30 03:00:03", -0.4, 97.1, 6, 0.4, "SV", 20000]);
  const p = tolkaRad("201;2025-02-13 10:10:03.000;0,7;-0,1;-1,7;87,9;-9;-99,9;-99,9;-99,9;-9;-99,9;-100")!;
  assert.deepEqual([p.ned_typ, p.vimax, p.virik, p.siktdjup], [-9, -99.9, "-9", -100], "platshållarna står kvar råa — översättningen tar dem");
  assert.equal(tolkaRad("(1091419 rows affected)"), null);
  assert.equal(tolkaRad("Completion time: 2026-10-02T15:58:11.1234567+02:00"), null);
  assert.equal(tolkaRad(""), null);
  assert.throws(() => tolkaRad("1203;2025-03-30 03:00:03.000;x;1,2;-0,3;97,1;6;0,4;5,1;2,3;SV;2,0;20000"), /tyta/);
  assert.throws(() => tolkaRad("1203;30/3 2025 03:00;1;1,2;-0,3;97,1;6;0,4;5,1;2,3;SV;2,0;20000"), /measuretime/);

  const dir = mkdtempSync(join(tmpdir(), "kuvos-"));
  writeFileSync(join(dir, "Halkvakt_2503.csv"), `﻿${KOLUMNER.join(";")}\r\n1203;2025-03-01 00:00:03.000;1;1;1;90;1;0;1;1;N ;1;20000\r\n\r\n(1 rows affected)\r\n`);
  const rader: string[] = [];
  for await (const x of lasFil(join(dir, "Halkvakt_2503.csv"))) rader.push(x);
  assert.equal(rader.filter((x) => tolkaRad(x)).length, 1);
  writeFileSync(join(dir, "Halkvakt_2504.csv"), "station;tid;yta\n1;2;3\n");
  await assert.rejects(async () => { for await (const _ of lasFil(join(dir, "Halkvakt_2504.csv"))); }, /rubriken/);
});

// Steg 4 (DECISIONS #441): SMHI:s radararkiv för 2024/25 finns bara som tif. Läsaren är egen, så den prövas mot en riktig arkivfil
// (radar_2411150000.tif, 15/11 2024 00:00 UTC): summan och pixelräkningen är Pillows avkodning av samma fil, uppmätt 2/10.
test("tif-läsaren: SMHI:s arkivkomposit avkodas pixel för pixel som Pillow, och vakterna avvisar fel sort", async () => {
  const { lasTif, pixel } = await import("../kuvos/tif.ts");
  const buf = new Uint8Array(readFileSync(new URL("./fixtures/radar_2411150000.tif", import.meta.url)));
  const t = lasTif(buf);
  assert.deepEqual([t.bredd, t.hojd, t.x0, t.y0, Math.round(t.pixel * 1000)], [471, 887, 126648.404, 7771252.876, 2014958]);
  let s = 0, n0 = 0, n255 = 0;
  for (const v of t.data) { s = (s * 31 + v) >>> 0; if (v === 0) n0++; if (v === 255) n255++; }
  assert.deepEqual([s, n0, n255], [2082547733, 254361, 156539]);
  assert.equal(pixel(t, t.x0 - 1, t.y0 - 1), null, "utanför rutnätet");
  assert.equal(pixel(t, t.x0 + 1, t.y0 - 1), t.data[0], "övre vänstra hörnet är rad 0");
  const fel = buf.slice(); fel[0] = 0x4d;
  assert.throws(() => lasTif(fel), /TIF-VAKT/);
});

test("radarns kärna: Z–R och händelsegränsen som driften, delad mellan h5 och tif", async () => {
  const { rateFromRaw, segmentRader, MIN_RATE_MMH } = await import("../ingest/radar-karna.ts");
  const k = { gain: 0.4, offset: -30, nodata: 255, undetect: 0 };
  assert.equal(rateFromRaw(255, k), null);
  assert.equal(rateFromRaw(0, k), 0);
  assert.equal(Math.round(rateFromRaw(125, k)! * 1000) / 1000, Math.round(Math.pow(Math.pow(10, 20 / 10) / 200, 1 / 1.6) * 1000) / 1000, "20 dBZ ≈ 0,65 mm/h");
  const r = segmentRader([{ id: "a", line: [[13, 55.6], [13.1, 55.6]] }, { id: "b", line: [[14, 56], [14.1, 56]] }],
    (lon) => (lon < 13.5 ? 1.234 : MIN_RATE_MMH / 2));
  assert.deepEqual([r.ids, r.maxes, r.means], [["a"], [1.23], [1.23]], "bara segment över händelsegränsen blir rader");
});

test("SMHI-arkivet: bara vinterns rader, läget ur perioden som täcker raden, värdet som det står", async () => {
  const { tolkaArkiv } = await import("../kuvos/smhi-vinter.ts");
  const fil = ["﻿Stationsnamn;Stationsnummer;Stationsnät;Mäthöjd (meter över marken)", "Malmö A;52350;SMHIs stationsnät;2.0", "",
    "Tidsperiod (fr.o.m);Tidsperiod (t.o.m);Höjd (meter över havet);Latitud (decimalgrader);Longitud (decimalgrader)",
    "2000-01-01 00:00:00;2024-12-31 23:59:59;10.0;55.5;13.0", "2025-01-01 00:00:00;2026-10-01 00:00:00;12.0;55.6;13.1", "",
    "Datum;Tid (UTC);Total molnmängd;Kvalitet;;Tidsutsnitt:", "2024-10-30;23:00:00;100;G;;Kvalitetskontrollerade historiska data",
    "2024-12-01;06:00:00;113;G", "2025-02-01;06:00:00;0;Y", "2025-04-01;00:00:00;50;G"].join("\r\n");
  const { namn, rader } = tolkaArkiv(fil);
  assert.equal(namn, "Malmö A");
  assert.deepEqual(rader.map((r) => [new Date(r.t).toISOString().slice(0, 13), r.varde, r.kvalitet, r.lat]),
    [["2024-12-01T06", "113", "G", 55.5], ["2025-02-01T06", "0", "Y", 55.6]], "113 (himlen skymd) står kvar — moln.ts klassar den");
});
