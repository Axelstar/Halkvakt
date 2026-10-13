// VÄG B — ÄRLIGA TAL FÖRE FRYSNINGEN (DECISIONS #544, kort #342). INGEN DOM, inga trösklar.
// Samma läsning som kuvos-blandning-2026-10-08.ts. Kandidaten NIVÅ 2 ÄRLIG (+GRANNAR, +BLANDNING) räknas i jobbet av
// fysik/niva2/vagb.py och fysik/blandning/vagb_blandning.py och lämnar det aldrig (#506, #516). Varje stations värden kommer från en
// kedja som aldrig sett stationens veck: fysiken kalibrerad från litteraturvärdena, rättelsen och blandningens vikt valda på de andra
// fyra vecken. Analysläget och +6 h. Den frysta kandidatens tal på samma population står i DECISIONS #490 (läsning 2, körning
// 38351107743); RÅ (7,51 %) är kontrollen att populationen är densamma. Förväntan (Axels, #544): analysen 5,05–5,45 %, +6 h 5,25–5,70 %.
// Måtten, ytbanden och frysflaggan bor med självtestet i kuvos-blandning-2026-10-08.ts.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-vagb-2026-10-13.ts [--sjalvtest]
import { korBlandning } from "./kuvos-blandning-2026-10-08.ts";

if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: läsningen startar och når korBlandning i kuvos-blandning-2026-10-08.ts, där måtten prövas");
  process.exit(0);
}
await korBlandning("VÄG B — ÄRLIGA TAL (DECISIONS #544) — NIVÅ 2 ÄRLIG i analysläget och vid +6 h, varje veck räknat bara med de andra fyra, hela vintern 2024/25. Ingen dom.");
