import { test } from "node:test";
import assert from "node:assert/strict";
import { vatbulb, klassa, givarklass, smhiKlass, SVEP, BAND_C } from "../engine/src/nederbord.ts";

// Kort #45, docs/TROSKLAR-NEDERBORDSTYPEN.md §3–§4, DECISIONS #361.

test("våtbulben följer psykrometertabellen och är exakt T i mättad luft", () => {
  assert.equal(vatbulb(20, 50), 13.842);            // tabellvärdet vid 1 013 hPa är 13,8 °C
  assert.equal(vatbulb(1, 100), 1);
  assert.equal(vatbulb(5, 100), 5);
  assert.equal(vatbulb(2, 80), 0.769);               // Stull gav +0,25 här — skälet till bytet (§3)
  assert.equal(vatbulb(0, 90), -0.557);
});

test("våtbulben ligger aldrig över luften och sjunker när luften torkar", () => {
  for (const t of [-15, -3, 0, 0.5, 1, 2, 4, 10]) {
    let forra = Infinity;
    for (const rh of [100, 99, 95, 90, 80, 60, 40]) {
      const tw = vatbulb(t, rh)!;
      assert.ok(tw <= t + 1e-9, `Tw ${tw} > T ${t} vid RH ${rh}`);
      assert.ok(tw <= forra + 1e-9, `Tw steg när RH föll: T ${t}, RH ${rh}`);
      forra = tw;
    }
  }
});

test("ingen våtbulb utanför spannen eller utan värde", () => {
  for (const [t, rh] of [[null, 90], [2, null], [-41, 90], [51, 50], [2, 0], [2, 101], [NaN, 90]] as const)
    assert.equal(vatbulb(t as number | null, rh as number | null), null, `${t} / ${rh}`);
});

test("klassen: Tw ≤ L snö, mellan slask, Tw ≥ U regn — gränserna exakt", () => {
  const { L, U } = SVEP[0];
  assert.deepEqual([L, U], [0, 1.5], "kortets par är det primära");
  assert.equal(klassa(0, L, U), "sno");
  assert.equal(klassa(0.001, L, U), "slask");
  assert.equal(klassa(1.499, L, U), "slask");
  assert.equal(klassa(1.5, L, U), "regn");
  assert.equal(klassa(1.5 - 1e-12, L, U), "regn", "flyttalsbruset avrundas bort innan gränsen");
  assert.equal(SVEP.length, 4);
  assert.deepEqual(BAND_C, [-3, 5]);
});

test("givarens ordlista: rain, sleet, snow är klasser; no och dry uppehåll; allt annat okänt", () => {
  assert.equal(givarklass("rain"), "regn");
  assert.equal(givarklass("sleet"), "slask");
  assert.equal(givarklass("snow"), "sno");
  assert.equal(givarklass("no"), "ingen");
  assert.equal(givarklass("Dry"), "ingen");
  assert.equal(givarklass(null), "okand");
  assert.equal(givarklass(""), "okand");
  assert.equal(givarklass("freezingRain"), "okand", "en ny sträng är ett larm, aldrig en klass (§7 punkt 5)");
});

test("SMHI:s koder: regn, slask, snö och underkylt för sig; 156 är underkylt; manuella koder utesluts", () => {
  for (const k of [150, 161, 163, 181, 184]) assert.equal(smhiKlass(k), "regn", String(k));
  for (const k of [167, 168]) assert.equal(smhiKlass(k), "slask", String(k));
  for (const k of [145, 171, 173, 177, 185, 187]) assert.equal(smhiKlass(k), "sno", String(k));
  for (const k of [147, 154, 155, 156, 164, 166]) assert.equal(smhiKlass(k), "underkylt", String(k));
  for (const k of [100, 110, 120, 123, 139]) assert.equal(smhiKlass(k), "ingen", String(k));
  for (const k of [140, 174, 178, 189, 196, 61, 71, null, "", "x"]) assert.equal(smhiKlass(k as number), "utesluten", String(k));
  assert.equal(smhiKlass("161"), "regn", "API:t levererar koden som sträng");
});
