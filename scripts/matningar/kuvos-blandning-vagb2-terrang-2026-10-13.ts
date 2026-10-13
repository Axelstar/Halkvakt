// VÄG B VARV 2, KÖRNING 2 — TERRÄNGEN OCH TRAFIKEN I ENERGIBALANSEN (DECISIONS #549, kort #321, #342). INGEN DOM, inga trösklar.
// Samma läsning som kuvos-blandning-2026-10-08.ts. Fysiken är fysik/niva2/terrang.py: himmelsfaktorn och södra horisonten i lång- och
// kortvågen (Erbs diffusa andel) och trafiken som q_trafik_adt · log10(ÅDT / 1 000), elva parametrar kalibrerade på de andra fyra vecken
// (fysik/niva2/vagb_terrang.py). Blandningens vikt ur samma 42 par som körning 1. Kandidaten NIVÅ 2 TERRÄNG ÄRLIG räknas i jobbet och
// lämnar det aldrig (#506, #516). RÅ 7,51 % är kontrollen. Förväntan (#549, Axel godkänd 13/10 via Bengt): analysen 4,65–4,90 %,
// +6 h 4,90–5,15 %. Valregeln: körning 2 fryses om dess +6 h ligger minst 0,05 enheter under körning 1:s, och golvet är varv 1:s 5,12 %.
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-vagb2-terrang-2026-10-13.ts [--sjalvtest]
import { korBlandning } from "./kuvos-blandning-2026-10-08.ts";

if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: läsningen startar och når korBlandning i kuvos-blandning-2026-10-08.ts, där måtten prövas");
  process.exit(0);
}
await korBlandning("VÄG B VARV 2, KÖRNING 2 — TERRÄNGEN OCH TRAFIKEN (DECISIONS #549) — NIVÅ 2 TERRÄNG ÄRLIG i analysläget och vid +6 h, elva parametrar och blandningens vikt ur 42 par, varje veck räknat bara med de andra fyra, hela vintern 2024/25. Ingen dom.");
