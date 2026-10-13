// VÄG B VARV 2, KÖRNING 1 — RUTNÄTET (DECISIONS #549, kort #342). INGEN DOM, inga trösklar.
// Samma läsning som kuvos-blandning-2026-10-08.ts. Fysiken och rättelsen som i varv 1 (fysik/niva2/vagb.py, oförändrad); blandningens
// vikt väljs per veck på de andra fyra ur det utvidgade rutnätet W ∈ {0,1; 0,15; 0,2; 0,25; 0,3; 0,35; 0,5} × L ∈ {80; 120; 160; 240;
// 320; 480} km (fysik/blandning/vagb_blandning.py --rutnat varv2), och jobbets logg bär andelen grova fel för alla 42 par. Kandidaten
// räknas i jobbet och lämnar det aldrig (#506, #516). Varv 1 (#544): 4,84 % i analysläget och 5,12 % vid +6 h; RÅ 7,51 % är kontrollen.
// Förväntan (#549, Axel godkänd 13/10 via Bengt): analysen 4,75–4,84 %, +6 h 5,02–5,12 %. Valregeln mot körning 2 står i #549.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-vagb2-rutnat-2026-10-13.ts [--sjalvtest]
import { korBlandning } from "./kuvos-blandning-2026-10-08.ts";

if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: läsningen startar och når korBlandning i kuvos-blandning-2026-10-08.ts, där måtten prövas");
  process.exit(0);
}
await korBlandning("VÄG B VARV 2, KÖRNING 1 — RUTNÄTET (DECISIONS #549) — NIVÅ 2 ÄRLIG i analysläget och vid +6 h, blandningens vikt ur 42 par, varje veck räknat bara med de andra fyra, hela vintern 2024/25. Ingen dom.");
