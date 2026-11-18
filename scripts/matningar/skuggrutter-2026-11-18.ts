// Kort #667 (DECISIONS #897, tillägget 18/11): skuggans första varv längs vägen mot motorn körd längs vägen på samma lägesfil.
// Engångsmätning 18/11, sparad som fil. Hämtar lägesfilen och den fasta filen från Pages (öppna data, samma som appen läser),
// kör motorn längs vägrutterna och längs de raka strecken för de rutter man anger, och skriver ut lägesfilens tid och antalen.
// Jämför sedan raderna med shadow_log för samma lägesfil (snapshot_generated_at). Bara läsning; skriver ingenting.
//   node --experimental-strip-types scripts/matningar/skuggrutter-2026-11-18.ts "E4 Umeå→Luleå" "E6 Malmö→Halmstad"
import { readFileSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import { farorVidLinjen } from "../../engine/src/rutfilter.ts";
import { snapshotToHazards } from "../../engine/src/snapshot.ts";
import { bilensLarm, korLangs } from "../../publish/synk-core.ts";
import { lasRutter } from "../../publish/skuggfacit.ts";

const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const nu = Date.now();
const hamta = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); };
const [lv, st] = await Promise.all([hamta(CDN + "live.json?t=" + nu), hamta(CDN + "static.json?t=" + nu)]);
const raka = lasRutter(readFileSync(new URL("../../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8"));
const vagar = JSON.parse(readFileSync(new URL("../../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter as
  Record<string, { punkter: [number, number][] }>;
const faror = snapshotToHazards(st, lv).filter((h) => h.kind !== "kandidat");
const kor = (linje: [number, number][]) => {
  const a = new AlertEngine(farorVidLinjen(faror, linje)).run(korLangs(linje).fixar);
  return { alla: a.length, halka: a.filter((x) => x.kind === "slippery_segment").length };
};
console.log(`lägesfilen ${lv.generated_at}, ${faror.length} faror`);
for (const namn of process.argv.slice(2)) {
  const vag = kor(vagar[namn].punkter), rak = kor(raka[namn]);
  const bilen = bilensLarm(faror, vagar[namn].punkter);
  console.log(`${namn}: längs vägen ${vag.alla} larm (${vag.halka} halka) · favoritprovets bil ${bilen.length} · längs strecket ${rak.alla} (${rak.halka} halka)`);
}
