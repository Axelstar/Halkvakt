// Halkvakt live (kort #281): vilka län morgoninlägget tar med och hur texten låter.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore — .mjs utan typer
import { valjLan, rad, bildtext, rubrik } from "../marknadsforing/posta.mjs";

const l = (kort: string, halt: number, kalla: number, extra = {}) =>
  ({ kort, slug: kort.toLowerCase(), halt, vagavsnitt: 40, kalla, kallast: null, olyckor: 0, ...extra });

test("bara län med halka eller minst tre stationer under noll, flest halka först", () => {
  const ut = valjLan([l("A", 0, 2), l("B", 0, 3), l("C", 5, 0), l("D", 1, 9)]);
  assert.deepEqual(ut.map((x: any) => x.kort), ["C", "D", "B"]);
});

test("ingen halka ger inget inlägg", () => {
  assert.equal(valjLan([l("A", 0, 0), l("B", 0, 2)]).length, 0);
});

test("raden har minustecken, decimalkomma och rätt singular", () => {
  assert.equal(rad(l("Dalarna", 1, 1, { kallast: { namn: "Mora", yta: -6.3 }, olyckor: 1 })),
    "Dalarna: halka på 1 av 40 vägavsnitt, 1 station under noll, kallast −6,3 °C vid Mora, 1 olycka.");
});

test("texten visar högst fem län och räknar resten", () => {
  const alla = ["A", "B", "C", "D", "E", "F", "G"].map(k => l(k, 1, 0));
  const t = bildtext(alla, "2026-11-12T05:30:00Z");
  assert.match(t, /Halka eller minusgrader även i 2 län till\./);
  assert.ok(!t.includes("F: halka"));
});

test("rubriken följer svensk tid", () => {
  assert.equal(rubrik("2026-11-12T05:30:00Z"), "Halt i morse");
  assert.equal(rubrik("2026-11-12T20:30:00Z"), "Halt i kväll");
});

test("Facebook får klickbar adress, Instagram hänvisar till profilen", () => {
  const alla = [l("A", 1, 0)];
  assert.match(bildtext(alla, "2026-11-12T05:30:00Z"), /https:\/\/halkvakt\.se\/lan/);
  const ig = bildtext(alla, "2026-11-12T05:30:00Z", "instagram");
  assert.ok(!ig.includes("halkvakt.se/lan"));
  assert.match(ig, /Länken finns i vår profil\./);
});
