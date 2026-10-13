// NIVÅ 2 MED GRANNARNA OCH BLANDNINGEN I PROGNOSLÄGET (DECISIONS #519, kort #308 och #329). INGEN DOM, inga trösklar.
// Samma läsning som kuvos-blandning-2026-10-08.ts. Fysikkedjan på MET Nordics analys som i #517, och för varje prognoskörning
// (00, 06, 12, 18 UTC) startar kolumnen om från analysens tillstånd och räknar framåt på MET Nordics egen prognos
// (fysik/niva2/prognos.py); rättelsen lärs på analysen. Axels frysta kuvos_replica.py körs på tre skattningar: analysen
// (kontrollen mot #517:s 5,02 %), +6 h (timstegen 6–11) och +24 h (24–29); grannarnas fel och RÅ vid giltighetstiden.
// Filerna skrivs i jobbet av fysik/blandning/grannar_blandning.py och lämnar det aldrig (#506, #516). Måtten, ytbanden (#329),
// frysflaggan och klara stilla nätter för sig (#471:s definition) bor med självtestet i kuvos-blandning-2026-10-08.ts; nattdelningen
// slås på här. Förväntningarna står i DECISIONS #519 och #536 (de tre tilläggen, Axels).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-prognos-2026-10-11.ts [--sjalvtest]
import { korBlandning } from "./kuvos-blandning-2026-10-08.ts";

if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: läsningen startar och når korBlandning i kuvos-blandning-2026-10-08.ts med nattdelningen påslagen; måtten prövas där");
  process.exit(0);
}
await korBlandning("NIVÅ 2 MED GRANNARNA OCH BLANDNINGEN I PROGNOSLÄGET (DECISIONS #519) — analysen, +6 h och +24 h på MET Nordics egna prognoser, hela vintern 2024/25. Ingen dom.", { natt: true });
