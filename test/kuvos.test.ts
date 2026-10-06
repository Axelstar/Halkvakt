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
  for (const f of ["../publish/snapshot-core.ts", "../publish/rekonstruktion.ts", "../kuvos/korning.ts"]) {
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

// Körflödet (steg 5, DECISIONS #426). Stegen, serie B:s schema och tidsdomen är rena; spåret ska vara skuggmotorns, inte likt det.
test("körflödet: halvtimmarna, serie B var tredje timme från 00:00 UTC, och tidsdomen satt före körningen", async () => {
  const { halvtimmar, serieBSteg, tidsdom } = await import("../kuvos/korning.ts");
  assert.deepEqual(halvtimmar(new Date("2024-10-31T23:10:00Z"), new Date("2024-11-01T01:00:00Z")).map((t) => t.toISOString().slice(11, 16)),
    ["23:30", "00:00", "00:30", "01:00"], "första hela halvtimmen efter starten, sista vid slutet");
  assert.equal(halvtimmar(new Date("2024-11-01T00:00:00Z"), new Date("2025-03-31T23:59:59Z")).length, 151 * 48, "november–mars");
  const b = (iso: string, h: number) => serieBSteg(new Date(iso), h);
  assert.deepEqual([b("2024-11-01T00:00Z", 3), b("2024-11-01T03:00Z", 3), b("2024-11-01T01:00Z", 3), b("2024-11-01T03:30Z", 3)],
    [true, true, false, false]);
  assert.deepEqual([b("2024-11-01T06:00Z", 6), b("2024-11-01T03:00Z", 6)], [true, false], "glesad till var sjätte timme");
  const d = tidsdom({ stegHelaVintern: 7248, snapshotMs: 500, aMs: 100, bMsPerBSteg: 20_000, foreMin: 10 });
  assert.deepEqual([Math.round(d.utanB), Math.round(d.b3), Math.round(d.b6), d.grans], [82, 485, 284, 324]);
  assert.equal(d.dom, "B glesas till var sjätte timme (#426)");
  assert.equal(tidsdom({ stegHelaVintern: 7248, snapshotMs: 500, aMs: 100, bMsPerBSteg: 1_000, foreMin: 10 }).dom, "B var tredje timme ryms");
});

test("körflödet: spåret är skuggmotorns traceAlong, fix för fix", async () => {
  const { spar } = await import("../kuvos/korning.ts");
  const { haversineM } = await import("../engine/src/geo.ts");
  const { stripTypeScriptTypes } = await import("node:module");
  const kod = readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
  const start = kod.indexOf("function traceAlong(");
  const js = stripTypeScriptTypes(kod.slice(start, kod.indexOf("\n}\n", start) + 2));
  const traceAlong = new Function("haversineM", `${js}; return traceAlong;`)(haversineM);
  const linje: [number, number][] = [[17.95, 59.3], [18.05, 59.33], [18.06, 59.33], [18.4, 59.6]];
  assert.deepEqual(spar(linje), traceAlong(linje));
  assert.ok(spar(linje).length > 100, "en riktig sträcka, inte en tom jämförelse");
});

// Väg A (DECISIONS #455): kuvösens trendfunktion härleds ur driftens källa, aldrig en kopia. Ändras driftens form ska detta falla.
test("väg A: halvtimmesvarianten är driftens funktion med ett nytt namn och två rader i 30-minutersramen — inget annat", async () => {
  const { halvtimmesvariant, FUNKTION } = await import("../kuvos/trend.ts");
  const sql = readFileSync(new URL("../sql/018_trend_berakna.sql", import.meta.url), "utf8");
  const v = halvtimmesvariant(sql);
  assert.ok(v.startsWith(`CREATE OR REPLACE FUNCTION ${FUNKTION}(`) && v.endsWith("$$ LANGUAGE plpgsql;"));
  assert.match(v, /CASE WHEN n15 >= 3 AND/, "15-minutersramen orörd");
  assert.match(v, /CASE WHEN n30 >= 2 AND/, "30-minutersramen: två rader");
  assert.match(v, /CASE WHEN n60 >= 3 AND/, "60-minutersramen orörd");
  const original = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION berakna_trendkandidater("), sql.indexOf("$$ LANGUAGE plpgsql;") + 20);
  assert.equal(v.replace(FUNKTION, "berakna_trendkandidater").replace("n30 >= 2", "n30 >= 3"), original, "allt annat ordagrant driftens");
  assert.throws(() => halvtimmesvariant(sql.replace("CASE WHEN n30 >= 3 AND", "CASE WHEN n30 >= 4 AND")), /DECISIONS #455/,
    "en ändrad form i driften fäller härledningen i stället för att tyst ge en annan regel");
});

// Efterhalkan (DECISIONS #456): ögonblicken ur uppspelningens egen funktion, härledda vid körning. Ändras driftens form ska detta falla.
test("efterhalkan: ögonblicksvarianten är uppspelningen med nytt namn, ny returtyp och ögonblicken i stället för summorna — inget annat", async () => {
  const { ogonblicksvariant, FUNKTION } = await import("../kuvos/efterhalkan.ts");
  const sql = readFileSync(new URL("../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8");
  const v = ogonblicksvariant(sql);
  assert.ok(v.startsWith(`CREATE OR REPLACE FUNCTION ${FUNKTION}(`) && v.endsWith("END $$;"));
  assert.match(v, /RETURNS TABLE \(sid text, t timestamptz, min_efter numeric, rader int\)/);
  assert.ok(!/\bep AS|\bfa AS/.test(v) && v.includes("SELECT f.sid, f.t, f.min_efter, f.rader FROM f ORDER BY f.sid, f.t;"));
  const start = sql.indexOf("CREATE OR REPLACE FUNCTION uppspelning_efterhalka(");
  const fram = (s: string) => s.slice(s.indexOf("LANGUAGE plpgsql"), s.indexOf("OR m.blot)") + "OR m.blot)".length);
  assert.equal(fram(v), fram(sql.slice(start)), "vakterna, basen, blöt-villkoret och nattens etikett ordagrant driftens");
  assert.throws(() => ogonblicksvariant(sql.replace("ep AS (SELECT DISTINCT ON", "ep AS (SELECT")), /DECISIONS #456/,
    "en ändrad form i driften fäller härledningen i stället för att tyst ge en annan regel");
});

// Ovanpå (DECISIONS #456), räknat för hand. Natten 14/1 (svensk tid, middag till middag). S1: baslinjen fångar, delen 60 min före.
// S2: fukten kom efter facit, så bara delen fångar — nettonytt — men baslinjen talade samma natt, så episoden är inte tillkommen.
// S3: delen 120 min före facit (utanför fönstret) och i facitögonblicket (inget försprång), nära (1,2). S4: ingen facit, uteblev (2,0);
// andra natten utan utfall. S5: delen efter facit fångar inget. S6: facit strax efter middag, delen 40 min före men natten innan.
test("ovanpå: nettonytt, pris på de tillkomna, nära är inte falsklarm, tidsvinsten bredvid — och en annan del tar sin del", async () => {
  const { ovanpa, skrivOvanpa } = await import("../kuvos/ovanpa.ts");
  const t = (iso: string) => Date.parse(iso);
  const facit = [
    { sid: "S1", tFacit: t("2025-01-15T03:00:00Z"), tBas: t("2025-01-15T03:00:00Z") },
    { sid: "S2", tFacit: t("2025-01-15T04:00:00Z"), tBas: t("2025-01-15T05:00:00Z") },
    { sid: "S3", tFacit: t("2025-01-15T04:00:00Z"), tBas: null },
    { sid: "S5", tFacit: t("2025-01-15T06:00:00Z"), tBas: t("2025-01-15T06:00:00Z") },
    { sid: "S6", tFacit: t("2025-01-15T11:10:00Z"), tBas: null },
  ];
  const f = (sid: string, iso: string, minEfter: number | null, rader: number | null) => ({ sid, t: t(iso), minEfter, rader });
  const efterhalkan = [f("S1", "2025-01-15T02:00:00Z", 0.4, 3), f("S2", "2025-01-15T03:00:00Z", 0.6, 3), f("S3", "2025-01-15T02:00:00Z", 1.2, 3),
    f("S3", "2025-01-15T04:00:00Z", 0.9, 3), f("S4", "2025-01-14T23:00:00Z", 2.2, 3), f("S4", "2025-01-14T22:00:00Z", 2.0, 3),
    f("S4", "2025-01-15T20:00:00Z", null, 0), f("S5", "2025-01-15T06:30:00Z", 0.2, 3), f("S6", "2025-01-15T10:30:00Z", null, 0)];
  const r = ovanpa(facit, { efterhalkan });
  assert.deepEqual([r.facit, r.baslinjen], [5, 2]);
  const e = r.delar[0];
  assert.deepEqual([e.fyrningar, e.episoder, e.fangade, e.nettonytt, e.medBaslinjen, e.tidsvinstMedianMin], [9, 7, 2, 1, 1, 60],
    "S3 i facitögonblicket och S6 natten innan fångar inget");
  assert.deepEqual([e.tillkomna, e.medUtfall, e.follUt, e.nara, e.uteblev], [4, 2, 0, 1, 1], "S3 nära, S4:s första ögonblick uteblev, S4:s andra natt och S6 utan utfall");
  const ut = skrivOvanpa(r).join("\n");
  assert.ok(ut.includes("NETTONYTT 1 (20,0 % av facit)") && ut.includes("PRIS 50,0 %") && ut.includes("60 min (median, 1 tillfällen)"), ut);

  // En annan del som fångar S2 och S3: S2 är inte längre bara efterhalkans, och S3:s natt är inte längre tillkommen för den.
  const r2 = ovanpa(facit, { efterhalkan, annan: [f("S2", "2025-01-15T03:30:00Z", 0.6, 3), f("S3", "2025-01-15T03:30:00Z", 0.9, 3)] });
  const [e2, a2] = r2.delar;
  assert.deepEqual([e2.nettonytt, e2.tillkomna, e2.medUtfall, e2.uteblev], [0, 3, 1, 1]);
  assert.deepEqual([a2.fangade, a2.nettonytt, a2.tillkomna, a2.medUtfall], [2, 1, 0, 0], "S3 är bara den andras; inga tillkomna, så inget pris");
  assert.ok(skrivOvanpa(r2).some((x) => x.includes("annan:") ) && skrivOvanpa(r2).some((x) => x.includes("PRIS –")));
});

// Baslinjen (DECISIONS #455 punkt 2): frysriskens fyrningar och episoder; natten går från middag till middag i svensk tid.
test("baslinjen: en episod per fara och natt, natten byter vid middag svensk tid, broarna för sig, bara frysrisken", async () => {
  const { baslinjen, natt } = await import("../kuvos/baslinjen.ts");
  assert.deepEqual([natt(Date.UTC(2025, 0, 14, 22) / 1000), natt(Date.UTC(2025, 0, 15, 5) / 1000), natt(Date.UTC(2025, 0, 15, 12, 30) / 1000)],
    ["2025-01-14", "2025-01-14", "2025-01-15"], "23 och 06 svensk tid är samma natt; 13:30 är nästa");
  const v = (serie: string, steg: string, t: number, kind: string, id: string) => ({ serie, vag: "x", steg, t, kind, id, d: 500 });
  const b = baslinjen([
    v("A", "2025-01-14T22:00:00Z", 0, "icing_point", "wx:1"), v("A", "2025-01-15T04:30:00Z", 600, "icing_point", "wx:1"),
    v("A", "2025-01-15T12:30:00Z", 0, "icing_point", "wx:1"), v("A", "2025-01-14T22:00:00Z", 30, "icing_point", "bro:9"),
    v("A", "2025-01-14T22:00:00Z", 60, "camera", "cam:3"), v("B", "2025-01-14T21:00:00Z", 0, "icing_point", "wx:1"),
  ]);
  const a = b.get("A")!;
  assert.deepEqual([a.varningar, a.faror.size, a.episoder.size, a.stationsepisoder, a.broepisoder], [4, 2, 3, 2, 1]);
  assert.deepEqual([...a.perManad].map(([m, x]) => [m, x.varningar, x.episoder.size]), [["2025-01", 4, 3]]);
  assert.equal(b.get("B")!.episoder.size, 1, "serierna räknas var för sig");
});

// Molnen i kuvösen (DECISIONS #441, #455): driftens klassning och radie, men källan är arkivet. Taket gäller per källa.
test("molnen: samma klassning ur en annan källa, taket är källans, och arkivkällan räknar i minuter", async () => {
  const { molnForPunkter } = await import("../publish/moln.ts");
  const { arkivetsMoln } = await import("../kuvos/moln.ts");
  const t0 = Date.UTC(2025, 0, 14, 3) / 60_000;
  const kalla = (tak: number) => ({
    namn: "prov", tak,
    stationer: async () => [{ id: "A", lon: 16, lat: 62 }, { id: "B", lon: 17, lat: 62 }],
    serie: async (id: string) => new Map([[t0, id === "A" ? 113 : 0]]),
  });
  const p = [{ lon: 16.01, lat: 62, tMin: t0 + 30 }, { lon: 17.01, lat: 62, tMin: t0 }, { lon: 16.02, lat: 62, tMin: t0 }, { lon: 25, lat: 62, tMin: t0 }];
  assert.deepEqual(await molnForPunkter(p, () => {}, kalla(Infinity)), ["skymd", "klar", "skymd", "okänd"], "113 = skymd, långt bort = okänd");
  assert.deepEqual(await molnForPunkter(p, () => {}, kalla(1)), ["skymd", "okänd", "skymd", "okänd"], "taket 1: bara den mest efterfrågade stationen hämtas");

  const fragor: unknown[][] = [];
  const a = arkivetsMoln(async (sql, par) => {
    fragor.push(par ?? []);
    return sql.includes("DISTINCT ON") ? [{ id: "52350", lon: "13.0", lat: "55.5" }] : [{ t: String(t0), varde: "113" }];
  });
  assert.deepEqual(await a.stationer(), [{ id: "52350", lon: 13, lat: 55.5 }]);
  assert.deepEqual([...(await a.serie("52350"))!], [[t0, 113]]);
  assert.deepEqual(fragor, [[16], [16, "52350"]], "parameter 16, total molnmängd");
  assert.equal(a.tak, Infinity);
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

// Kalibreringen (regel D, DECISIONS #468): rutnätet och startvärdena härleds ur sql/028, aldrig kopierade.
test("kalibreringen: 48 punkter ur sql/028:s svep, startvärdena står i nätet, en ändrad D1-vakt fäller härledningen", async () => {
  const { rutnat, svepen, startvarden, samma } = await import("../kuvos/kalibrering.ts");
  const sql = readFileSync(new URL("../sql/028_uppspelning_varianter.sql", import.meta.url), "utf8");
  assert.deepEqual(svepen(sql), { n: [1, 2, 3, 4], fonster: [15, 30, 60], fall: [0.4, 0.6, 0.8, 1.2] });
  const natet = rutnat(sql);
  assert.equal(natet.length, 48);
  assert.equal(natet.filter((p) => p.fonster === 15).length, 16, "de 16 punkterna med 15-minutersfönstret finns i nätet");
  const start = startvarden(sql);
  assert.deepEqual(start, { n: 2, fonster: 30, fall: 0.8 }, "betans startvärden (DECISIONS #222)");
  assert.ok(natet.some((p) => samma(p, start)));
  assert.throws(() => svepen(sql.replace("p_fall NOT IN (0.4, 0.6, 0.8, 1.2)", "p_fall IS NULL")), /DECISIONS #468/, "en borttagen D1-vakt fäller härledningen");
  assert.equal(rutnat(sql.replace("p_fall NOT IN (0.4, 0.6, 0.8, 1.2)", "p_fall NOT IN (0.4)")).length, 12, "ett ändrat svep följs — det kopieras aldrig");
});

// Regel D4, räknat för hand: kandidat = pris ≤ 25 % på ≥ 20 episoder och nettonytt > 0; vinnaren håller bara i båda halvorna.
test("kalibreringen: D4 — störst nettonytt under taket, tunt pris räknas inte, vinnaren måste hålla i båda halvorna, annars startvärdena", async () => {
  const { valj, kandidat, TAK_PRIS, GOLV_EPISODER } = await import("../kuvos/kalibrering.ts");
  const t = (nettonytt: number, medUtfall: number, uteblev: number) => ({ fyrningar: 0, episoder: 0, fangade: 0, nettonytt, tillkomna: medUtfall, medUtfall, uteblev });
  const u = (n: number, fonster: number, fall: number, hel: ReturnType<typeof t>, a = hel, b = hel, raknebar = true) => ({ punkt: { n, fonster, fall }, raknebar, hel, a, b });
  const start = { n: 2, fonster: 30, fall: 0.8 };
  assert.deepEqual([TAK_PRIS, GOLV_EPISODER], [0.25, 20]);
  assert.ok(kandidat(t(1, 20, 5)) && !kandidat(t(1, 20, 6)) && !kandidat(t(1, 19, 0)) && !kandidat(t(0, 40, 0)), "gränserna: 25 % inklusive, 20 episoder, nettonytt > 0");

  // Startvärdena över taket (45 %), som i riktningsprovet; två punkter under taket, den med störst nettonytt vinner och håller.
  const s = u(2, 30, 0.8, t(175, 406, 183));
  const v1 = valj([s, u(1, 30, 0.8, t(60, 100, 20)), u(1, 60, 1.2, t(90, 120, 30))], start);
  assert.deepEqual(v1.vinnare?.punkt, { n: 1, fonster: 60, fall: 1.2 });
  assert.match(v1.skal, /2 kandidater av 3 räknebara/);
  // Samma vinnare, men halva B över taket ⇒ startvärdena står.
  const v2 = valj([s, u(1, 30, 0.8, t(60, 100, 20)), u(1, 60, 1.2, t(90, 120, 30), t(50, 60, 10), t(40, 60, 20))], start);
  assert.equal(v2.vinnare, null); assert.match(v2.skal, /håller inte i halva B/);
  // Ingen under taket ⇒ startvärdena, med skälet.
  const v3 = valj([s, u(1, 30, 0.8, t(60, 100, 30))], start);
  assert.equal(v3.vinnare, null); assert.match(v3.skal, /ingen punkt är kandidat/);
  // Lika nettonytt ⇒ lägst pris; lika pris ⇒ närmast startvärdena. Ej räknebar punkt deltar aldrig.
  const v4 = valj([s, u(1, 30, 0.8, t(60, 100, 20)), u(3, 30, 0.8, t(60, 100, 10)), u(1, 60, 0.4, t(60, 100, 10)), u(4, 15, 0.4, t(999, 100, 0), undefined, undefined, false)], start);
  assert.deepEqual(v4.vinnare?.punkt, { n: 3, fonster: 30, fall: 0.8 }, "10 % slår 20 %; en ändrad dimension slår två");
});
