// Reels (DECISIONS #780, kort #281): vilken film kvällen får, och att texten aldrig säger mer än datan.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore — .mjs utan typer
import { TYPER, behorig, valjTyp, bildtext } from "../marknadsforing/reels.mjs";

const sam = (extra = {}) => ({
  gen: "2026-11-02T18:30:00Z", stationer: 791, under: 235, iso: 4, vagar: 146,
  ord: { "Halka": 0, "Fläckvis is": 10, "Risk för halka": 136 },
  lan: [{ kort: "Norrbottens län", halt: 46 }, { kort: "Västerbottens län", halt: 42 }, { kort: "Västernorrlands län", halt: 19 }],
  top: [{ n: "Nattavaara", yta: -4.3 }, { n: "Kiruna", yta: -4.1 }, { n: "Gällivare", yta: -3.9 }],
  front: { n: "Nysäter", yta: -0.5 }, e4: { stationer: 102, risk: 16, forstaKall: "Tierp" }, ...extra,
});
const h = (typ: string, torr = true) => ({ dag: "x", typ, torr });

test("en kväll utan halka och utan kyla får ingen reel", () => {
  const lugn = sam({ under: 0, iso: 0, vagar: 0, ord: {}, lan: [], top: [], front: null, e4: { stationer: 102, risk: 0, forstaKall: null } });
  assert.equal(valjTyp(lugn, [], false), null);
});

test("filmerna om halka kräver vägavsnitt, frosten kräver en nollgradslinje", () => {
  const ok = behorig(sam({ vagar: 0, iso: 0 }));
  assert.equal(ok.halt, false); assert.equal(ok.natt, false); assert.equal(ok.frost, false);
  assert.equal(ok.kallast, true); assert.equal(ok.e4, true);
});

test("lika många av varje först, i ordningen halt natt frost kallast e4", () => {
  const sett: string[] = [], hist: any[] = [];
  for (let i = 0; i < 10; i++) { const t = valjTyp(sam(), hist, false); sett.push(t); hist.push(h(t)); }
  assert.deepEqual(sett, [...Object.keys(TYPER), ...Object.keys(TYPER)]);
});

test("torrkörningar räknas inte när det blir skarpt", () => {
  assert.equal(valjTyp(sam(), [h("halt"), h("natt")], true), "halt");
  assert.equal(valjTyp(sam(), [h("halt", false)], true), "natt");
});

test("aldrig samma film två kvällar i rad när en annan går", () => {
  const bara = sam({ under: 0, iso: 0, top: [], front: null, e4: { stationer: 102, risk: 0, forstaKall: null } });
  assert.equal(valjTyp(bara, [h("natt"), h("halt")], false), "natt");
  assert.equal(valjTyp(sam({ vagar: 0, under: 0, iso: 0, top: [], front: null }), [h("e4")], false), "e4");
});

test("texterna: Trafikverkets ord, inga utropstecken, inga långa streck, klockslag och källa", () => {
  for (const t of Object.keys(TYPER)) for (const k of ["instagram", "facebook"]) {
    const s = bildtext(t, sam(), k);
    assert.doesNotMatch(s, /[!—–]/, `${t}/${k}`);
    assert.match(s, /19:30/, `${t}/${k}`);
    assert.match(s, /Trafikverkets öppna data/);
    assert.match(s, /#halkvakt$/);
  }
  const halt = bildtext("halt", sam());
  assert.match(halt, /10 med fläckvis is och 136 med risk för halka/);
  assert.doesNotMatch(halt, /\d+ med halka/);
  assert.match(halt, /Flest i Norrbotten, Västerbotten och Västernorrland\./);
});

test("Instagram pekar på profilen, Facebook har länken", () => {
  assert.doesNotMatch(bildtext("natt", sam(), "instagram"), /https:/);
  assert.match(bildtext("natt", sam(), "facebook"), /https:\/\/halkvakt\.se\/lan/);
});

test("kallast visar tre stationer med minustecken och decimalkomma", () => {
  assert.match(bildtext("kallast", sam()), /1\. Nattavaara, −4,3 °C\n2\. Kiruna, −4,1 °C\n3\. Gällivare, −3,9 °C/);
});
