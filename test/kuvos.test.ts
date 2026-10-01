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
