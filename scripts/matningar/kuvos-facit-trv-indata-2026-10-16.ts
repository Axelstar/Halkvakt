// FACITLÄSNINGENS INDATA I KUVÖSEN, UTAN FACIT (DECISIONS #592, del B). Läser INGET utfall: Trafikverkets filer öppnas inte, och
// kandidaten räknas inte (det gör läsningen, kuvos-blandning-vagb-facit-trv-2026-10-16.ts, efter signaturerna). Provar att frågorna
// mot kuvösens databas går och vad de ger: stationernas egna kalla timmar, nederbörden per timme, efterhalkans fyrningar (kontrollen
// är riktningsprovets 1 109, #467), sträckorna och parningen inom 2 km. Bara antal.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-facit-trv-indata-2026-10-16.ts [--sjalvtest]
import { kuvosIndata } from "./kuvos-blandning-vagb-facit-trv-2026-10-16.ts";
import { parning } from "../../kuvos/facit-trv.ts";

if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: indata-läsningen startar och når kuvosIndata, där frågorna och klasserna prövas");
  process.exit(0);
}
console.log("FACITLÄSNINGENS INDATA I KUVÖSEN (DECISIONS #592) — utan facit och utan kandidaten. Bara antal.");
const ind = await kuvosIndata();
const par = parning(ind.stationer, ind.linjer);
console.log(`  parningen: ${[...par.values()].filter((x) => x.length).length} av ${par.size} stationer har en sträcka inom 2 km, ` +
  `${new Set([...par.values()].flat()).size} av ${ind.linjer.length} sträckor har en station`);
