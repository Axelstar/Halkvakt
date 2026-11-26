import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { AlertEngine } from "../engine/src/engine.ts";
import { vagtestRader } from "../engine/src/rutfilter.ts";

// Halkans vägtest i skuggan (DECISIONS #967): motorns krok onVagtestStopp och skuggans rader. Kroken får aldrig ändra ett utfall.
const dir = new URL("../engine/vectors/", import.meta.url);
const vektor = (prefix: string) => {
  const f = readdirSync(dir).find((x) => x.startsWith(prefix))!;
  return JSON.parse(readFileSync(new URL(f, dir), "utf8"));
};
type Stopp = { hazardId: string; t: number; distM: number; linjeM: number; vinkel: number };
const korMedKrok = (v: { hazards: any[]; trace: any[] }) => {
  const stopp: Stopp[] = [];
  const motor = new AlertEngine(v.hazards);
  motor.onVagtestStopp = (s) => stopp.push(s);
  return { alerts: motor.run(v.trace), stopp };
};

test("kroken ändrar inget utfall: alla vektorer ger samma varningar med och utan den", () => {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const v = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    const utan = new AlertEngine(v.hazards, v.config ?? {}).run(v.trace);
    const motor = new AlertEngine(v.hazards, v.config ?? {});
    motor.onVagtestStopp = () => {};
    assert.equal(JSON.stringify(motor.run(v.trace)), JSON.stringify(utan), f);
  }
});

test("v64, en annan väg som börjar framför bilen: stoppad hela vägen, 80° från linjen, och en rad med talade null", () => {
  const v = vektor("v64");
  const { alerts, stopp } = korMedKrok(v);
  assert.equal(alerts.length, 0);
  assert.ok(stopp.length > 0, "vägtestet stoppade sträckan");
  const rader = vagtestRader(stopp, alerts, () => "222");
  assert.equal(rader.length, 1);
  const r = rader[0];
  assert.equal(r.id, "seg:annan");
  assert.equal(r.vag, "222");
  assert.equal(r.talade, null);
  assert.equal(r.n, stopp.length);
  assert.ok(r.vinkel > 30, `vinkeln ${r.vinkel}° ska vara över gränsen 30°`);
  assert.ok(r.forstaM <= 666, "första stoppet ligger inom förvarningen");
});

test("v71, en krok före sträckan: stoppad först, talar sedan, och bara stoppen före varningen räknas", () => {
  const v = vektor("v71");
  const { alerts, stopp } = korMedKrok(v);
  assert.equal(alerts.length, 1);
  const rader = vagtestRader(stopp, alerts, () => null);
  assert.equal(rader.length, 1);
  const r = rader[0];
  assert.deepEqual(r.talade, { t: 39, distanceM: 216 });
  assert.ok(r.forstaT < 39 && r.forstaT >= 16, `första stoppet t=${r.forstaT}, där korridoren ensam talade vid t=16`);
  assert.equal(r.n, stopp.filter((s) => s.t < 39).length);
  assert.ok(r.linjeM > 80, `närmast ${r.linjeM} m, utanför 80 m`);
  assert.ok(r.forstaM > r.talade!.distanceM, "förvarning gick förlorad");
});

test("v65, samma väg: vägtestet stoppar inget före varningen, och ingen rad skrivs", () => {
  const v = vektor("v65");
  const { alerts, stopp } = korMedKrok(v);
  assert.equal(alerts.length, 1);
  assert.deepEqual(vagtestRader(stopp, alerts, () => null), []);
});

test("raden: stopp efter sträckans första varning räknas inte, och närmaste linje bär sin vinkel", () => {
  const stopp: Stopp[] = [
    { hazardId: "seg:a", t: 10, distM: 900.4, linjeM: 300.2, vinkel: 45.1 },
    { hazardId: "seg:a", t: 15, distM: 600, linjeM: 120.6, vinkel: 50 },
    { hazardId: "seg:a", t: 20, distM: 300, linjeM: 200, vinkel: 10 },
    { hazardId: "seg:a", t: 40, distM: 100, linjeM: 5, vinkel: 5 },
    { hazardId: "seg:b", t: 12, distM: 700, linjeM: 90, vinkel: 2 },
  ];
  const rader = vagtestRader(stopp, [{ t: 30, hazardId: "seg:a", distanceM: 250 }], (id) => (id === "seg:a" ? "E4" : null));
  assert.deepEqual(rader, [
    { id: "seg:a", vag: "E4", n: 3, forstaT: 10, forstaM: 900, linjeM: 121, vinkel: 50, talade: { t: 30, distanceM: 250 } },
    { id: "seg:b", vag: null, n: 1, forstaT: 12, forstaM: 700, linjeM: 90, vinkel: 2, talade: null },
  ]);
});
