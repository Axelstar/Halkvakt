import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aldersgrind, kollensIds, nyttSedanKollen, radlage, resansRapport, riktning, titel, tomtRad, vand } from "../publish/rapport-app.ts";
import { grupperade, MARGINALER, nyttSedan, tomma } from "../publish/rapport-core.ts";

// Resans rapport i appen (favoriterna steg 3a, DECISIONS #636, #637): TypeScript mot det delade facit, som Swift och Kotlin prövas
// mot, och de invarianter facit inte säger rakt ut.
const f = JSON.parse(readFileSync(new URL("../engine/fixtures/rapport.json", import.meta.url), "utf8"));
const { rutt, live, stat, snabb, lang } = f.in;

test("Dit och Hem som facit: raderna, grupperna och det tomma", () => {
  for (const [hem, del] of [[false, f.dit], [true, f.hem]] as const) {
    const rader = resansRapport(rutt, hem, live, stat, snabb, lang);
    assert.deepEqual(rader, del.rader);
    assert.deepEqual(grupperade(rader), del.grupper);
    assert.deepEqual(tomma(rader), del.tomma);
  }
  assert.deepEqual(f.marginaler, MARGINALER, "facit bär appens trösklar (#637)");
});

test("köer och restider bara åt förarens håll; meddelandena och resten åt båda", () => {
  const ids = (d: { rader: { id: string }[] }) => d.rader.map((r) => r.id);
  assert.ok(ids(f.dit).includes("tt:1") && ids(f.dit).includes("tt:3") && !ids(f.dit).includes("tt:2"));
  assert.ok(ids(f.hem).includes("tt:2") && !ids(f.hem).includes("tt:1") && !ids(f.hem).includes("tt:3"));
  const utanTt = (d: { rader: { id: string }[] }) => ids(d).filter((i) => !i.startsWith("tt:")).sort();
  assert.deepEqual(utanTt(f.dit), utanTt(f.hem), "allt annat är detsamma åt båda hållen, i annan ordning");
});

test("Hem är samma väg vänd, och ordningen längs vägen vänds med den", () => {
  assert.deepEqual(vand(vand(rutt)), rutt);
  const plats = (d: { rader: { id: string; langsM: number }[] }, id: string) => d.rader.find((r) => r.id === id)!.langsM;
  assert.ok(plats(f.dit, "dev:100") < plats(f.dit, "dev:101") && plats(f.hem, "dev:100") > plats(f.hem, "dev:101"));
});

test("riktningen: samma håll, motsatt, för långt bort och en enda provpunkt", () => {
  assert.deepEqual(f.riktning.map((r: { delar: [number, number][][]; svar: number }) => riktning(r.delar, rutt, 100)),
    f.riktning.map((r: { svar: number }) => r.svar));
  assert.deepEqual(f.riktning.map((r: { svar: number }) => r.svar), [1, -1, 0, 0]);
});

test("nytt sedan förra kollen: det som inte fanns då, och första kollen har inget nytt", () => {
  const fore = f.dit.rader.filter((r: { id: string }) => f.nytt.fore.includes(r.id));
  assert.deepEqual(nyttSedan(fore, f.dit.rader), f.nytt.ut);
  assert.deepEqual(nyttSedan(null, f.dit.rader), []);
});

test("fliken och skärmen (steg 3b): lägena, det nya, rubrikerna, åldersgränsen och det tomma som facit", () => {
  const a = f.app;
  const ur = (rader: { id: string }[], ids: string[]) => rader.filter((r) => ids.includes(r.id));
  for (const l of a.lagen) {
    const r = radlage(ur(f.dit.rader, l.dit), ur(f.hem.rader, l.hem), l.sett);
    const id = r.lage === "nytt" ? r.viktigast.id : r.lage === "ingetNytt" ? r.storst.id : undefined;
    assert.deepEqual({ lage: r.lage, ...(r.lage === "nytt" ? { antal: r.antal } : {}), ...(id ? { id } : {}) }, l.svar, l.namn);
  }
  assert.deepEqual(a.lagen.map((l: { svar: { lage: string } }) => l.svar.lage), ["ingetNytt", "nytt", "ingetNytt", "ingetNytt", "lugnt"]);
  for (const n of a.nytt) assert.deepEqual(nyttSedanKollen(f.dit.rader, n.sett).map((r) => r.id), n.svar, n.namn);
  assert.deepEqual(kollensIds(f.dit.rader, f.hem.rader), a.kollen);
  for (const t of a.titlar) assert.equal(titel(t.rubrik, t.vag), t.svar);
  for (const g of a.grind) assert.deepEqual(aldersgrind(f.dit.rader, g.vaglag, g.olyckor).map((r) => r.id), g.svar);
  for (const t of a.tomt) assert.equal(tomtRad(ur(t.hem ? f.hem.rader : f.dit.rader, t.rader), t.vaglag, t.olyckor), t.svar, t.namn);
  // Invarianterna: åldersgränsen döljer bara sina slag, och köerna står inte som tomma när de inte mäts.
  assert.ok(aldersgrind(f.dit.rader, true, true).every((r) => !["halka", "frysrisk", "olycka", "vilt"].includes(r.slag)));
  const utan = a.tomt.find((t: { namn: string }) => t.namn.startsWith("bara kameror")).svar as string;
  assert.ok(utan.endsWith("Köer mäts inte längs den här vägen.") && !utan.includes(", köer,"));
});
