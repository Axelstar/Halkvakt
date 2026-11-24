// Olycksfacit: driftlarmets ärenden (DECISIONS #959, kort #641), de rena delarna. Ärendet ligger i det publika repot: det får bära
// väg, tid, läge, koderna och klockslagen, aldrig kandidatens tal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRIFT_FELTYPER, arArende, driftKommentar, driftKropp, driftMark, driftTitel } from "../supabase/functions/olycksfacit/drift.ts";

const r = { feltyp: "appen stilla", halka: "yta", sedan: "2026-11-19T10:02:00.000Z", tid: "2026-11-19T10:31:00.000Z", vag: "E4",
  lon: 17.1234, lat: 60.6543 };

test("feltyperna: bara Bengts val 24/11, våra egna fel", () => {
  assert.deepEqual([...DRIFT_FELTYPER].sort(), ["K gallrad", "K ingen timme", "appen stilla"]);
  for (const f of ["appen stilla", "K ingen timme", "K gallrad"]) assert.equal(arArende(f), true, f);
  for (const f of ["A2 tyst", "appen okänd", ""]) assert.equal(arArende(f), false, f);
  // Listan måste vara samma värden som tabellens CHECK i sql/108, annars väljer funktionen en feltyp som aldrig skrivs.
  const check = readFileSync(new URL("../sql/108_olycksfacit_driftlarm.sql", import.meta.url), "utf8").match(/feltyp IN \(([^)]*)\)/)![1];
  for (const f of DRIFT_FELTYPER) assert.ok(check.includes(`'${f}'`), `${f} finns i sql/108`);
});

test("driftKropp: feltypen, förklaringen, olyckan i svensk tid, stängningsregeln och märket", () => {
  const k = driftKropp("2026-11-19", r);
  assert.match(k, /^\*\*appen stilla\*\* vid en olycka som kan gälla halka, 2026-11-19/);
  assert.match(k, /Lägesfilen till appen publicerades inte/);
  assert.match(k, /- 11:31 E4 \(17\.123, 60\.654\) — halka: yta — senaste lyckade publicering: 2026-11-19 11:02/);
  assert.match(k, /Stängs\*\* när felet är förklarat/);
  assert.ok(k.endsWith(driftMark("2026-11-19", "appen stilla")));
  assert.equal(driftTitel("2026-11-19", "K gallrad"), "Driftlarm 2026-11-19: K gallrad");
  assert.notEqual(driftMark("2026-11-19", "K gallrad"), driftMark("2026-11-19", "K ingen timme"), "ett märke per feltyp");
});

test("driftKommentar: samma rad, utan okänt klockslag som tal", () => {
  assert.match(driftKommentar({ ...r, sedan: null, vag: null }), /- 11:31 okänd väg \(17\.123, 60\.654\) — halka: yta — senaste lyckade publicering: okänt$/);
});
