import { test } from "node:test";
import assert from "node:assert/strict";
import { attGallra, delnamn, dumpAv, kuvosnamn, BEHALL } from "../supabase/functions/arkivdump/delar.ts";

// Kort #312, DECISIONS #495: veckokopian i hinken arkiv, delad under 50 MB, de fyra senaste behålls.
const namn = (d: string) => `halkvakt-arkiv-${d}T0317Z.dump`;

test("delarnas namn följer split -d -a 2", () => {
  assert.equal(delnamn(namn("2026-10-11"), 0), "dump/halkvakt-arkiv-2026-10-11T0317Z.dump.del00");
  assert.equal(delnamn(namn("2026-10-11"), 12), "dump/halkvakt-arkiv-2026-10-11T0317Z.dump.del12");
});

test("ett namn utanför mönstret avvisas, så att funktionen aldrig skriver någon annanstans", () => {
  assert.throws(() => delnamn("../facit/bild.jpg", 0));
  assert.throws(() => delnamn("halkvakt-arkiv-2026-10-11T0317Z.dump/../../x", 0));
  assert.throws(() => delnamn(namn("2026-10-11"), 20));
  assert.equal(dumpAv("halkvakt-arkiv-2026-10-11T0317Z.dump.del03"), namn("2026-10-11"));
  assert.equal(dumpAv("annat.del01"), null);
});

test("gallringen behåller de fyra senaste kopiorna med alla deras delar och rör inget annat", () => {
  const dagar = ["2026-09-20", "2026-09-27", "2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"];
  const filer = dagar.flatMap((d) => [`${namn(d)}.del00`, `${namn(d)}.del01`]).concat(["readme.txt"]);
  const bort = attGallra(filer);
  assert.equal(BEHALL, 4);
  assert.deepEqual(bort, [`dump/${namn("2026-09-20")}.del00`, `dump/${namn("2026-09-20")}.del01`,
    `dump/${namn("2026-09-27")}.del00`, `dump/${namn("2026-09-27")}.del01`]);
  assert.ok(!bort.some((b) => b.includes("readme")));
});

test("färre kopior än fyra gallrar ingenting, och behall under 1 avvisas", () => {
  assert.deepEqual(attGallra([`${namn("2026-10-11")}.del00`]), []);
  assert.throws(() => attGallra([], 0));
});

// Kort #311, DECISIONS #499: Trafikverkets leverans lämnar den publika releasen för hinken, under kuvos/.
test("kuvösens filer hamnar under kuvos/<release>/, och inget annat namn släpps igenom", () => {
  assert.equal(kuvosnamn("kuvos-trv-2024-25/Halkvakt_2411.csv.gz"), "kuvos/kuvos-trv-2024-25/Halkvakt_2411.csv.gz");
  for (const fel of ["kuvos-trv-2024-25/../dump/x", "kuvos-trv-2024-25/..", "kuvos-trv-2024-25/.dold", "dump/halkvakt-arkiv-2026-10-11T0317Z.dump",
    "../kuvos-trv-2024-25/a.csv", "kuvos-trv-2024-25/a/b.csv", "kuvos-trv-2024-25/", "facit/bild.jpg", "KUVOS-trv/a.csv"])
    assert.throws(() => kuvosnamn(fel), fel);
});
