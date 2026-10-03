// LÄSARKONTRAKTET (kort #210, 20/9 2026).
//
// VARFÖR FILEN FINNS. Vektorerna i engine/vectors/ börjar där faran redan är TOLKAD. De är ett
// kontrakt för MOTORN — tre språk, byte för byte — och kan per konstruktion inte se ett fel i
// JSON-läsningen. #210 satt precis där: iOS gjorde JSON-null till strängen "<null>", och rösten
// sa "Allvarlig olycka på väg <null> 8 kilometer framför dig" vid 5,2 % av olyckorna. Sviten var
// grön hela tiden, för felet låg utanför det den vaktar.
//
// Det här är samma sorts kontrakt ett lager ned: `engine/fixtures/lasarprov.json` bär en static +
// live som apparna hämtar, med de fall som är lätta att läsa fel, och det parsade utfall varje
// läsare ska ge. Den här filen prövar TS-läsaren; Swift och Kotlin prövas mot samma fil sedan
// kort #289 (DECISIONS #448). Ett saknat fält (undefined) och null är samma utfall i jämförelsen.
//
// NOLLPOLITIKEN ÄR HELA POÄNGEN. Tre fält där null aldrig får bli ett tal eller ett ord:
//   bearing null → null, inte 0   (0 är norrut; en kamera som tros titta norrut filtreras på fel kurs)
//   yta null     → null, inte 0   (0 ligger under fryströskeln och hade fyrat)
//   road null    → null, inte ord (#210 själv)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { snapshotToHazards, type StaticDoc, type LiveDoc } from "../engine/src/snapshot.ts";

const prov = JSON.parse(readFileSync(new URL("../engine/fixtures/lasarprov.json", import.meta.url), "utf8"));

test("läsarkontraktet: TS-läsaren ger provfilens väntade utfall, och null blir aldrig ett tal eller ett ord", () => {
  const faror = snapshotToHazards(prov.static as StaticDoc, prov.live as LiveDoc);
  const vantat = prov.vantat as Record<string, unknown>[];

  assert.equal(faror.length, vantat.length, "lika många faror som provfilen väntar");
  assert.deepEqual(faror.map((h) => h.id), vantat.map((v) => v.id), "samma id i samma ordning");

  for (const v of vantat) {
    const h = faror.find((x) => x.id === v.id);
    assert.ok(h, `${v.id} saknas`);
    assert.equal(h!.kind, v.kind, `${v.id}: kind`);
    const meta = (h as { meta?: Record<string, unknown> }).meta ?? {};
    for (const [nyckel, forvantat] of Object.entries(v)) {
      if (nyckel === "id" || nyckel === "kind" || nyckel.startsWith("_")) continue;
      const fick = nyckel === "bearing" ? (h as { bearing?: unknown }).bearing : meta[nyckel];
      assert.strictEqual(fick === undefined ? null : fick, forvantat, `${v.id}: ${nyckel} — ${v._varfor ?? ""}`);
    }
  }

  // Det som #210 handlade om, sagt rakt ut: ingen läsare får någonsin lämna ett ord där datan
  // säger null. En strikt likhet mot null räcker inte som skydd om någon senare byter till "".
  const d2 = faror.find((h) => h.id === "dev:d2") as { meta?: { road?: unknown } };
  assert.strictEqual(d2.meta?.road, null, "road måste vara null");
  assert.notEqual(typeof d2.meta?.road, "string", "road får ALDRIG vara en sträng när datan säger null");
});
