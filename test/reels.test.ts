// Reels (DECISIONS #780, #806, kort #281): vilken film platsen får, och att texten aldrig säger mer än datan.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore — .mjs utan typer
import { TYPER, PLATS, behorig, valjTyp, bildtext, vecka, plats } from "../marknadsforing/reels.mjs";

const sam = (extra = {}) => ({
  gen: "2026-11-06T20:00:00Z", stationer: 793, under: 585, iso: 4, vagar: 274,
  ord: { "Halka": 0, "Fläckvis is": 10, "Risk för halka": 264 },
  lan: [{ kort: "Norrbottens län", halt: 46 }, { kort: "Västerbottens län", halt: 42 }, { kort: "Västernorrlands län", halt: 19 }],
  top: [{ n: "Nattavaara", yta: -4.3 }, { n: "Kiruna", yta: -4.1 }, { n: "Gällivare", yta: -3.9 }],
  front: { n: "Nysäter", yta: -0.5 }, e4: { stationer: 102, risk: 16, forstaKall: "Tierp" },
  plusMinus: 129, plus: { n: "Svinnegarn", luft: 1.9, yta: -1.3 }, gissa: { n: "Nedre Soppero", luft: 2.6, yta: -1.4 },
  pendling: { fran: "Göteborg", till: "Borås", stationer: 9, under: 6 },
  stader: { antal: 12, minus: ["Karlstad", "Umeå", "Luleå", "Växjö"] },
  regioner: [{ namn: "Norra Sverige", halt: 96 }, { namn: "Mellersta Sverige", halt: 102 }, { namn: "Södra Sverige", halt: 0 }],
  ...extra,
});
const h = (typ: string, torr = true, p = "kvall") => ({ dag: "x", typ, torr, plats: p });
const UDDA = "2026-11-06", JAMN = "2026-11-09";   // vecka 45 och 46

test("veckonumret och platsen", () => {
  assert.equal(vecka(UDDA), 45); assert.equal(vecka(JAMN), 46); assert.equal(vecka("2026-01-01"), 1);
  assert.equal(plats(new Date("2026-11-06T05:45:00Z")), "morgon");
  assert.equal(plats(new Date("2026-11-06T19:50:00Z")), "kvall");
});

test("en kväll utan halka och utan kyla får ingen reel", () => {
  const lugn = sam({ under: 0, iso: 0, vagar: 0, ord: {}, lan: [], top: [], front: null, e4: { stationer: 102, risk: 0, forstaKall: null },
    plusMinus: 0, plus: null, gissa: null, pendling: { fran: "A", till: "B", stationer: 4, under: 0 }, stader: { antal: 12, minus: [] } });
  assert.equal(valjTyp(lugn, [], false, "kvall", UDDA), null);
  assert.equal(valjTyp(lugn, [], false, "morgon", UDDA), null);
});

test("varje film kräver sin data", () => {
  const ok = behorig(sam({ vagar: 0, plusMinus: 3, pendling: null, stader: { antal: 12, minus: [] } }));
  for (const t of ["du", "nu", "halt", "natt", "plus", "gissa", "pendling", "stad"]) assert.equal(ok[t], false, t);
  assert.equal(behorig(sam({ stader: { antal: 12, minus: Array(12).fill("x") } })).stad, false);   // alla minus: ingen kontrast
});

test("kvällen: lika många av varje, plus udda veckor och gissa jämna", () => {
  const kor = (isoDag: string) => { const sett: string[] = [], hist: any[] = [];
    for (let i = 0; i < 12; i++) { const t = valjTyp(sam(), hist, false, "kvall", isoDag); sett.push(t); hist.push(h(t)); } return sett; };
  const udda = kor(UDDA), jamn = kor(JAMN);
  assert.deepEqual(udda.slice(0, 6), ["du", "plus", "pendling", "stad", "halt", "natt"]);
  assert.ok(!udda.includes("gissa")); assert.ok(!jamn.includes("plus")); assert.ok(jamn.includes("gissa"));
  for (const t of ["du", "plus", "pendling", "stad", "halt", "natt"]) assert.equal(udda.filter(x => x === t).length, 2, t);
});

test("morgonen roterar nu och plus, och räknas för sig", () => {
  assert.equal(valjTyp(sam(), [h("du"), h("plus")], false, "morgon", UDDA), "nu");
  assert.equal(valjTyp(sam(), [h("nu", true, "morgon")], false, "morgon", UDDA), "plus");
  assert.deepEqual(PLATS.morgon, ["nu", "plus"]);
});

test("torrkörningar räknas inte när det blir skarpt, och aldrig samma två gånger i rad", () => {
  assert.equal(valjTyp(sam(), [h("du"), h("plus")], true, "kvall", UDDA), "du");
  assert.equal(valjTyp(sam(), [h("du", false)], true, "kvall", UDDA), "plus");
  const bara = sam({ plusMinus: 0, plus: null, gissa: null, pendling: null, stader: { antal: 12, minus: [] }, vagar: 0 });
  assert.equal(valjTyp(bara, [], false, "kvall", UDDA), null);
});

test("alla filmer i rotationen har längd och ljud", () => {
  for (const t of [...PLATS.kvall, ...PLATS.morgon]) assert.ok(TYPER[t] >= 14, t);
});

test("texterna: inga utropstecken, inga långa streck, klockslag och källa", () => {
  for (const t of Object.keys(TYPER)) for (const k of ["instagram", "facebook"]) {
    const s = bildtext(t, sam(), k);
    assert.doesNotMatch(s, /[!—–]/, `${t}/${k}`);
    assert.match(s, /21:00/, `${t}/${k}`);
    assert.match(s, /Trafikverkets öppna data/);
    assert.match(s, /#halkvakt$/);
  }
  const halt = bildtext("halt", sam());
  assert.match(halt, /10 med fläckvis is och 264 med risk för halka/);
  assert.doesNotMatch(halt, /\d+ med halka/);
});

test("de nya texterna säger det filmen visar", () => {
  assert.match(bildtext("du", sam()), /Södra Sverige: inga rapporter om halka\./);
  assert.match(bildtext("plus", sam()), /Svinnegarn i kväll kl\. 21:00: luften \+1,9 °C, vägbanan −1,3 °C\./);
  assert.match(bildtext("pendling", sam()), /Pendlar du mellan Göteborg och Borås\?\nI kväll kl\. 21:00 visade 6 av 9/);
  assert.match(bildtext("stad", sam()), /i Karlstad, Umeå, Luleå och Växjö\.\n8 av 12 städer hade fortfarande plus\./);
  assert.match(bildtext("nu", sam({ gen: "2026-11-07T05:30:00Z" })), /Ska du köra nu\?\nSå ser vägarna ut just nu enligt Trafikverket kl\. 06:30/);
  assert.match(bildtext("plus", sam({ gen: "2026-11-07T05:30:00Z" })), /Svinnegarn i morse kl\. 06:30/);
});

test("Instagram pekar på profilen, Facebook har länken", () => {
  assert.doesNotMatch(bildtext("natt", sam(), "instagram"), /https:/);
  assert.match(bildtext("natt", sam(), "facebook"), /https:\/\/halkvakt\.se\/lan/);
});
