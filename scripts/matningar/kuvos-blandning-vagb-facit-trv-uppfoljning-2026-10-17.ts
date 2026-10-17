// UPPFÖLJNINGEN AV FACITLÄSNINGEN 2024/25 (docs/FORREGISTRERING-FACIT-TRV-UPPFOLJNING.md). LÄSER UTFALL. Samma körning som läsningen
// (väg B varv 1 i jobbet, Trafikverkets filer, identitetsprovet #597, kuvösens indata: forbered() i läsningens skript), sedan de två
// delningarna i kuvos/facit-trv-uppfoljning.ts. Vägrar utan båda signaturerna i läsningens och i uppföljningens förregistrering; spärren
// står också först i kuvos.yml. Bara aggregat (PUBLIKT REPO).
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/matningar/kuvos-blandning-vagb-facit-trv-uppfoljning-2026-10-17.ts [--sjalvtest]
import { readFileSync } from "node:fs";
import { forbered } from "./kuvos-blandning-vagb-facit-trv-2026-10-16.ts";
import { uppfoljning } from "../../kuvos/facit-trv-uppfoljning.ts";
import { signerad } from "../../kuvos/facit-trv.ts";

const FORREG_U = "docs/FORREGISTRERING-FACIT-TRV-UPPFOLJNING.md";
if (process.argv.includes("--sjalvtest")) {
  console.log("✓ självtest: uppföljningen startar och når forbered() och uppfoljning(), där proven ligger");
  process.exit(0);
}
const text = readFileSync(FORREG_U, "utf8"), sig = signerad(text);
if (!sig.bengt || !sig.axel) { console.error(`vägrar: ${FORREG_U} är inte signerad av båda (Bengt ${sig.bengt}, Axel ${sig.axel})`); process.exit(2); }
uppfoljning(await forbered("UPPFÖLJNINGEN AV FACITLÄSNINGEN 2024/25 — hela regeln efter fuktvittne, alla tre efter planerad halkbekämpning. Diagnos, ingen dom."), text);
