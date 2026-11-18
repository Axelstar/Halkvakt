// Kort #667, 18/11: var tiden går i skuggans huvudvarv efter bytet till vägrutterna. Varven 17.32 och 18.02 skrev bara en
// respektive två av tre rutter. Mäter rutfiltret och motorn per rutt mot dagens lägesfil, längs vägen och längs strecket.
// Engångsmätning, bara läsning.
import { readFileSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import { farorVidLinjen } from "../../engine/src/rutfilter.ts";
import { snapshotToHazards } from "../../engine/src/snapshot.ts";
import { korLangs } from "../../publish/synk-core.ts";
import { lasRutter } from "../../publish/skuggfacit.ts";

const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const hamta = async (u: string) => (await fetch(u)).json();
const [lv, st] = await Promise.all([hamta(CDN + "live.json?t=" + Date.now()), hamta(CDN + "static.json?t=" + Date.now())]);
const raka = lasRutter(readFileSync(new URL("../../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8"));
const vagar = JSON.parse(readFileSync(new URL("../../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter;
const faror = snapshotToHazards(st, lv).filter((h) => h.kind !== "kandidat");
const matt = (linje: [number, number][]) => {
  const t0 = performance.now(); const f = farorVidLinjen(faror, linje); const t1 = performance.now();
  const a = new AlertEngine(f).run(korLangs(linje).fixar); const t2 = performance.now();
  return `filter ${Math.round(t1 - t0)} ms (${f.length} faror), motor ${Math.round(t2 - t1)} ms (${a.length} larm)`;
};
console.log(`lägesfilen ${lv.generated_at}, ${faror.length} faror`);
for (const namn of process.argv.slice(2)) {
  console.log(`${namn}: vägen ${vagar[namn].punkter.length} p: ${matt(vagar[namn].punkter)} · strecket ${raka[namn].length} p: ${matt(raka[namn])}`);
}
