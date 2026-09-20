// Beslutsnumren (kort #220, 20/9): ett beslut = ett unikt nummer. Genomlysningen fann elva
// DECISIONS-rubriker med samma nummer — sju av dem var OLIKA beslut (#60 tre gånger), och "slå
// upp #126" gav två svar. Repot är enda synken mellan sessioner, så en dubblett kan tyst
// förfalska ett beslutsunderlag. Vakten läser rubrikerna `## #<id>` och fäller på dubbletter;
// id får bära bokstav (#60c) eller efterled (#77-bevis). Skriver alltid ut nästa lediga nummer.
// Kör i ci.yml — som hoppar över rena md-commits, så en dubblett skriven i en md-commit fångas
// först av nästa kodcommit. Självtest: --sjalvtest.
import { readFileSync } from "node:fs";

export function granskaBeslut(text: string): { ids: string[]; dubbla: string[]; hogsta: number } {
  const ids = [...text.matchAll(/^## #(\d+[a-z]?(?:-[a-zåäö]+)?)(?![\w-])/gmu)].map((m) => m[1]);
  const antal = new Map<string, number>();
  for (const id of ids) antal.set(id, (antal.get(id) ?? 0) + 1);
  const dubbla = [...antal].filter(([, n]) => n > 1).map(([id, n]) => `#${id} (${n} gånger)`);
  const hogsta = Math.max(0, ...ids.map((id) => parseInt(id, 10)));
  return { ids, dubbla, hogsta };
}

if (process.argv[2] === "--sjalvtest") {
  const ok = granskaBeslut("## #1 (x)\nprosa #1\n## #2a — tillägg\n## #2 (y)\n## #3-bevis\n");
  if (ok.dubbla.length || ok.ids.length !== 4 || ok.hogsta !== 3) { console.error("✗ självtest 1", ok); process.exit(1); }
  const fel = granskaBeslut("## #60 (a)\n## #60 (b)\n## #61 (c)\n");
  if (fel.dubbla.join() !== "#60 (2 gånger)" || fel.hogsta !== 61) { console.error("✗ självtest 2", fel); process.exit(1); }
  console.log("✓ självtest: unika godkänns, dubblett fälls, bokstav och efterled räknas som egna id");
  process.exit(0);
}

const { ids, dubbla, hogsta } = granskaBeslut(readFileSync(new URL("../DECISIONS.md", import.meta.url), "utf8"));
if (dubbla.length) {
  console.error(`✗ DUBBLA BESLUTSNUMMER: ${dubbla.join(", ")} — ge den senare posten en bokstav (#60c) och nästa nya beslut #${hogsta + 1}.`);
  process.exit(1);
}
console.log(`✓ ${ids.length} beslutsrubriker, alla unika. Högsta #${hogsta} — nästa beslut är #${hogsta + 1}.`);
