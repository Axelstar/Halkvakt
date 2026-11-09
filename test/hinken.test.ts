// HINKEN SOM KÄLLA (DECISIONS #752, kort #365). Appen läser lägesfilen ur hinken och tar Pages bara när hinken inte svarar
// (SnapshotRepo). Funktionerna som ska spegla appen läser därför den svenska lägesfilen ur hinken, och vakthunden prövar hinken
// som appens väg med en gräns långt under appens åldersspärr. Faller provet läser en funktion något annat än appen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const kod = (fil: string) => readFileSync(new URL(`../supabase/functions/${fil}`, import.meta.url), "utf8");
const PAGES_SE = "halkvakt-karta/data/app/v1/";
const HINK = "/storage/v1/object/app/v1/";

test("skuggmotorn, favoritprovet och kamerafacit läser den svenska lägesfilen ur hinken, inte ur Pages", () => {
  for (const fil of ["skuggmotor/main.ts", "favoritprov/main.ts", "kamerafacit/index.ts"]) {
    const k = kod(fil);
    assert.ok(!k.includes(PAGES_SE), `${fil} läser fortfarande Pages`);
    assert.ok(k.includes(HINK), `${fil} läser inte hinken`);
  }
  // Grannländerna finns bara på Pages (hinken bär app/v1, Sverige).
  assert.ok(kod("skuggmotor/main.ts").includes("halkvakt-karta/data/app/fi/v1/"), "Finland ligger kvar på Pages");
});

test("vakthunden prövar hinken som appens väg och Pages som reserv, hinken med den snävare gränsen", () => {
  const k = kod("vakthund/index.ts");
  assert.ok(k.includes("/storage/v1/object/public/app/v1/"), "hinkens publika adress, som appen hämtar");
  assert.ok(k.includes(PAGES_SE), "reserven prövas också");
  const hink = Number(/const HINK_MAX_MIN = (\d+);/.exec(k)?.[1]);
  const reserv = Number(/const RESERV_MAX_MIN = (\d+);/.exec(k)?.[1]);
  assert.ok(hink > 0 && hink < 45, `hinkens gräns ${hink} min ska ligga under appens åldersspärr på 45 min`);
  assert.ok(hink < reserv, "hinken skrivs varannan minut, Pages var tionde");
  assert.ok(k.indexOf('prova("hinken"') < k.indexOf('prova("reserven (Pages)"'), "hinken prövas först, och bevisbäraren läses ur den");
});

// FAVORITERNA I DRIFTLARMET (DECISIONS #686 punkt 2, fristen favoriter-driftlarm): appen läser rapportfilen sedan (34), så ett
// stopp i hinken `favoriter` är ett driftfel och inte en mätning. Vakthunden prövar båda delarnas sha256 i driftlarmet.
test("vakthunden prövar favoriternas båda delar i driftlarmet, inte i mätvakten", () => {
  const k = kod("vakthund/index.ts");
  const drift = k.slice(k.indexOf("// 3. Når det APPEN?"), k.indexOf("// 4. HAR VINTERN KOMMIT"));
  const matvakt = k.slice(k.indexOf("// 6a. GÅR MÄTNINGSKÖRNINGARNA?"), k.indexOf("// 7. LIGGER EN KÄLLÄNDRING OLÄST?"));
  assert.ok(drift.includes("/storage/v1/object/public/favoriter/"), "driftlarmet läser hinken favoriter");
  for (const del of ["snabb", "lang"])
    assert.match(drift, new RegExp(`m\\?\\.${del}\\?\\.sha256`), `driftlarmet prövar ${del}-delens sha256 mot manifestet`);
  assert.ok(/problem\.push\([^;]*favoriter/.test(drift), "ett fel i favoriterna färgar driftlarmet");
  assert.ok(!matvakt.includes("public/favoriter/"), "mätvakten läser inte längre hinken favoriter");
  assert.ok(!/torra\.push\([^;]*\*\*favoriter\*\*/.test(matvakt), "mätvakten larmar inte längre för favoriterna");
});
