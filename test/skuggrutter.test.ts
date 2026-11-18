import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AlertEngine } from "../engine/src/engine.ts";
import { farorNaraRutten, farorVidLinjen } from "../engine/src/rutfilter.ts";
import { haversineM } from "../engine/src/geo.ts";
import type { Hazard } from "../engine/src/types.ts";
import { bilensLarm, korLangs } from "../publish/synk-core.ts";
import { lasRutter } from "../publish/skuggfacit.ts";

// Kort #667 (DECISIONS #897, Bengt 18/11): skuggans huvudvarv kör längs vägens linje, inte längs raka streck mellan några punkter.
// Verify: ett varv ger samma antal halkvarningar som motorn körd längs vägen mot samma lägesfil (favoritprovets synk, synk-core).

const KOD = readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
const RAKA = lasRutter(KOD);
const VAGAR = JSON.parse(readFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter as
  Record<string, { punkter: [number, number][] }>;

/** Halkavsnitt längs vägen, ett var 15:e km, vart och ett 300 m långt på vägens egen linje. */
function halkaLangsVagen(vag: [number, number][]): Hazard[] {
  const ut: Hazard[] = [];
  let sedan = 0;
  for (let i = 1; i < vag.length; i++) {
    sedan += haversineM({ lon: vag[i - 1][0], lat: vag[i - 1][1] }, { lon: vag[i][0], lat: vag[i][1] });
    if (sedan < 15_000) continue;
    sedan = 0;
    let j = i, m = 0;
    while (j + 1 < vag.length && m < 300) { m += haversineM({ lon: vag[j][0], lat: vag[j][1] }, { lon: vag[j + 1][0], lat: vag[j + 1][1] }); j++; }
    ut.push({ id: `seg:${i}`, kind: "slippery_segment", line: vag.slice(i, j + 1), meta: { code: 2, info: ["Is"] } } as Hazard);
  }
  return ut;
}

/** Huvudvarvets motor längs en linje: rutfiltret och spåret i 80 km/h, en fix var 5:e sekund (korLangs har traceAlongs form). */
const halkvarningar = (faror: Hazard[], linje: [number, number][]) =>
  new AlertEngine(farorVidLinjen(faror, linje)).run(korLangs(linje).fixar).filter((a) => a.kind === "slippery_segment").length;

test("#667: varje svensk huvudrutt har sin väg i vägnätet, så att huvudvarvet aldrig faller tillbaka på strecket", () => {
  assert.equal(Object.keys(RAKA).length, 20);
  for (const namn of Object.keys(RAKA)) assert.ok((VAGAR[namn]?.punkter.length ?? 0) > 10, `${namn} saknar vägen`);
});

test("#667: huvudvarvet längs vägen ger lika många halkvarningar som motorn körd längs vägen; strecket ger färre", () => {
  const namn = "E4 Umeå→Luleå";
  const vag = VAGAR[namn].punkter, faror = halkaLangsVagen(vag);
  assert.ok(faror.length >= 14, `halkavsnitt längs hela vägen (${faror.length})`);
  const langsVagen = halkvarningar(faror, vag);
  const bilen = bilensLarm(faror, vag).filter((l) => l.kind === "slippery_segment").length;
  assert.equal(langsVagen, bilen, "samma antal som favoritprovets bil längs vägen");
  assert.ok(langsVagen >= faror.length - 1, `nästan varje avsnitt talar längs vägen (${langsVagen} av ${faror.length})`);
  const langsStrecket = halkvarningar(faror, RAKA[namn]);
  assert.ok(langsStrecket < langsVagen, `strecket missar avsnitt långt från vägen (${langsStrecket} mot ${langsVagen})`);
});

test("#667: i skuggmotorn går spåret, rutfiltret, vägbanan och oljan längs vägen; prognosen, efterhalkan och försprånget på strecket", () => {
  const varv = KOD.slice(KOD.indexOf("const batch = allNames.filter"), KOD.indexOf("results[name] = {"));
  assert.match(varv, /const rak = routes\[name\];\s*const vag = land === "se" && !c \? \(RUTTER_VAG as [^)]*\)\[name\] : undefined;\s*const line = vag \?\? rak;/);
  for (const anrop of ["traceAlong(line)", "farorVidLinjen(farorNaraRutten(hazards, line), line)", "vbAlerts(lv, line, trace)", "oljaAlerts(oljaLista.lista, line, trace)",
    "efterhalkaRader(lv, name === batch[0] ? null : rak, alerts)", "ankareNaraRutten(ankare.lista, rak)", "segmentPrognos(rak, ankRutt)",
    "holdoutRader(rak, ankRutt)", "const kandidatLinje = vag ?? rak;"]) assert.ok(varv.includes(anrop), anrop);
  // Försprånget är förregistrerat (#664) och kör kvar på strecket.
  const fors = KOD.slice(KOD.indexOf("const urval = forsprangUrval("), KOD.indexOf("const batch = allNames.filter"));
  assert.match(fors, /const line = routes\[name\];\s*const trace = traceAlong\(line\);/);
});

test("#667: rektangeln före linjefiltret ger samma faror i samma ordning på alla 20 vägrutter", () => {
  // Faror längs alla rutterna, så att varje rutt har många faror långt bort och några nära.
  const alla = Object.keys(RAKA).flatMap((n) => halkaLangsVagen(VAGAR[n].punkter).map((h) => ({ ...h, id: `${n}:${h.id}` }) as Hazard));
  assert.ok(alla.length > 200, `faror i hela landet (${alla.length})`);
  for (const namn of Object.keys(RAKA)) {
    const vag = VAGAR[namn].punkter;
    const utan = farorVidLinjen(alla, vag), med = farorVidLinjen(farorNaraRutten(alla, vag), vag);
    assert.deepEqual(med.map((h) => h.id), utan.map((h) => h.id), namn);
    assert.ok(utan.length > 0 && utan.length < alla.length, `${namn}: urvalet är en del av landet (${utan.length})`);
  }
});
