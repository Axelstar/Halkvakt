// Meta-annonserna per län (DECISIONS #735): bilden och texten säger aldrig mer än Trafikverkets ord.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore — .mjs utan typer
import { fara, annons, stracka, vagBild, vagText, dagdel, VISNING } from "../marknadsforing/annonsstyrning.mjs";

const l = (kort: string, halt: number, kalla: number, extra = {}) =>
  ({ kod: 1, kort, slug: kort.toLowerCase(), halt, vagavsnitt: 40, kalla, kallast: null, olyckor: 0, ...extra });
const s = (plats: string, text: string, info: string[] = [], halt = true) => ({ plats, halt, text, info });
const TID = "2026-11-10T02:00:00Z";   // 03:00 svensk vintertid

test("risk förblir risk, fläckvis is förblir fläckvis", () => {
  assert.equal(fara(s("A - B", "Besvärligt (risk för)", ["Halka"])), "Risk för halka");
  assert.equal(fara(s("A - B", "Besvärligt", ["Fläckvis is"])), "Fläckvis is");
  assert.equal(fara(s("A - B", "Mycket besvärligt", ["Is"])), "Halka");
  assert.equal(fara(s("A - B", "Besvärligt", ["Snö"])), "Risk för halka");   // okänt ord ⇒ det svagaste
  assert.equal(fara(s("A - B", "Besvärligt", ["Isande vind"])), "Risk för halka"); // "is" bara som eget ord
});

test("län utan halka och med färre än tre kalla stationer får ingen annons", () => {
  assert.equal(annons(l("Skåne", 0, 2), null, TID, "2026-11-10"), null);
});

test("starkaste ordet blir rubrik, dess vägar först, en sträcka per väg, högst tre", () => {
  const sl = { vagar: [
    { vag: "Väg 26", strackor: [s("Hestra - Gislaved", "Besvärligt (risk för)")] },
    { vag: "E 4", strackor: [s(".65 Markaryd - Örkelljunga", "Mycket besvärligt", ["Is"]), s("Ljungby - Värnamo", "Mycket besvärligt", ["Is"])] },
    { vag: "E 6", strackor: [s("Torp - Ön", "Normalt", ["Torrt"], false)] },
    { vag: "Väg 30", strackor: [s("Stigamo - Vrigstad", "Besvärligt (risk för)")] },
    { vag: "Väg 25", strackor: [s("Växjö - Alvesta", "Besvärligt (risk för)")] },
  ] };
  const a = annons(l("Skåne", 4, 1, { kallast: { namn: "Hörby", yta: -2.1 } }), sl, TID, "2026-11-10");
  assert.equal(a.data.hazard, "Halka");
  assert.deepEqual(a.data.roads, [
    { road: "E4", stretch: "Markaryd–Örkelljunga" }, { road: "VÄG 26", stretch: "Hestra–Gislaved" }, { road: "VÄG 30", stretch: "Stigamo–Vrigstad" }]);
  assert.equal(a.data.subtitle, "4 vägavsnitt i Skåne");
  assert.deepEqual(a.data.coldest, { station: "Hörby", surfaceTemp: -2.1 });
  assert.equal(a.data.dataTime, "03:00");
  assert.equal(a.text, "Halka på E4 och väg 26 i Skåne, enligt Trafikverket kl. 03:00. Halkvakt säger till med rösten innan du är där. Gratis för iPhone.");
  assert.equal(a.rubrik, "Läget i Skåne kl. 03:00");
});

test("bara kalla stationer ger Frysrisk, aldrig Halka, och inga vägar", () => {
  const a = annons(l("Jämtland", 0, 4), { vagar: [] }, TID, "2026-11-10");
  assert.equal(a.data.hazard, "Frysrisk");
  assert.deepEqual(a.data.roads, []);
  assert.match(a.text, /^Vägbanan under noll vid 4 stationer i Jämtland/);
});

test("halt enligt lan.json men inga vägnummer: risk, inga vägar, ingen tom 'på'", () => {
  const a = annons(l("Gotland", 2, 0), { vagar: [] }, TID, "2026-11-10");
  assert.equal(a.data.hazard, "Risk för halka");
  assert.match(a.text, /^Risk för halka i Gotland,/);
});

test("vägnamn och sträckor i bildens och textens form", () => {
  assert.equal(vagBild("E 4"), "E4");
  assert.equal(vagBild("Väg 26"), "VÄG 26");
  assert.equal(vagText("Väg 26"), "väg 26");
  assert.equal(stracka(".25 Trafikplats Karlberg - Trafikplats Johanneshov"), "Trafikplats Karlberg–Trafikplats Johanneshov");
});

test("inget utropstecken och inget långt tankstreck i någon text", () => {
  const a = annons(l("Dalarna", 0, 3), { vagar: [] }, TID, "2026-11-10");
  assert.doesNotMatch(a.text + a.rubrik, /[!—]/);
});

test("dagdel: before noon in Stockholm is the morning, the rest the afternoon (DECISIONS #746)", () => {
  assert.equal(dagdel(new Date("2026-11-10T02:01:00Z")), "morgon");      // 03:01 svensk tid
  assert.equal(dagdel(new Date("2026-11-10T10:59:00Z")), "morgon");      // 11:59
  assert.equal(dagdel(new Date("2026-11-10T12:01:00Z")), "eftermiddag"); // 13:01
  assert.equal(dagdel(new Date("2026-11-10T13:31:00Z")), "eftermiddag"); // 14:31
});

test("visning: 05:00–10:00 and 14:00–19:00 every day, whole hours (DECISIONS #749)", () => {
  assert.deepEqual(VISNING.map(v => [v.start_minute / 60, v.end_minute / 60]), [[5, 10], [14, 19]]);
  for (const v of VISNING) {
    assert.equal(v.start_minute % 60, 0);   // Meta takes whole hours only (#735)
    assert.deepEqual(v.days, [0, 1, 2, 3, 4, 5, 6]);
  }
});
