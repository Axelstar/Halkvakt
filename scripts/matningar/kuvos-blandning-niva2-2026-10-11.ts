// NIVÅ 2 MED GRANNARNA OCH BLANDNINGEN I KUVÖSEN (DECISIONS #517, kort #308; Bengts ja 11/10). INGEN DOM, inga trösklar.
// Samma läsning som kuvos-blandning-2026-10-08.ts, men Axels frysta fysik/kuvos_replica.py körs på nivå 2:s skattning (fysikkedjan
// omkalibrerad på MET Nordic, #509) i stället för kontrollens FYSIK. Kandidaterna: NIVÅ 2 i replikans halvtimmar (kontrollen mot
// #509:s 6,10 %), NIVÅ 2+GRANNAR och NIVÅ 2+BLANDNING, med RÅ och OFFSET bredvid. Filerna skrivs i jobbet av
// fysik/blandning/grannar_blandning.py och lämnar det aldrig (#506, #516). Måtten och självtestet bor i kuvos-blandning-2026-10-08.ts.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-niva2-2026-10-11.ts [--sjalvtest]
import { korBlandning } from "./kuvos-blandning-2026-10-08.ts";

if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: läsningen startar och når korBlandning i kuvos-blandning-2026-10-08.ts, där måtten prövas");
  process.exit(0);
}
await korBlandning("NIVÅ 2 MED GRANNARNA OCH BLANDNINGEN I KUVÖSEN (DECISIONS #517) — fysikspåret på MET Nordic med grannarnas fel och blandningen, hela vintern 2024/25. Ingen dom.");
