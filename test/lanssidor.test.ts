// Länssidorna (kort #281, DECISIONS #458): vad sidan säger ska vara vad källorna säger, och "halt" ska betyda det motorn menar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arHalt, byggLanssidor, sitemapMed, lanAdresser, LAN, SIDBAS } from "../publish/lanssidor.ts";
import { buildMapData } from "../publish/map-core.ts";
import type { Q } from "../publish/snapshot-core.ts";

const NOW = new Date("2026-11-20T06:30:00Z");

test("länssidorna: halt är motorns halt — kod ≥ 2 eller halkord, och 'fläckvis Våt' är inte is", () => {
  assert.equal(arHalt(2, []), true);
  assert.equal(arHalt(1, ["Is"]), true);
  assert.equal(arHalt(1, ["Nysnö"]), true, "stammen räknas inuti ord, som i motorn");
  assert.equal(arHalt(1, ["fläckvis Våt"]), false, "'is' inuti ett ord är ingen is");
  assert.equal(arHalt(1, ["Torrt"]), false);
  assert.equal(arHalt(null, []), false);
  // Samma tecken som motorn — kontraktsgrinden vaktar också, men provet säger det där felet syns.
  const motor = readFileSync(new URL("../engine/src/engine.ts", import.meta.url), "utf8");
  const sida = readFileSync(new URL("../publish/lanssidor.ts", import.meta.url), "utf8");
  for (const namn of ["SLIPPERY_INFO", "SLIPPERY_STAM"]) {
    const rad = (s: string) => s.match(new RegExp(`const ${namn} = (.*);`))?.[1];
    assert.ok(rad(motor) && rad(motor) === rad(sida), `${namn} som i motorn`);
  }
});

test("länssidorna: 21 län och en översikt, svaret ur källorna, Trafikverkets text escapad, minus och komma på svenska", () => {
  const sidor = byggLanssidor({
    vaglag: [
      { code: 3, text: "Mycket besvärligt", info: ["Is", "<b>"], road: "E 6", plats: "E 6 Malmö - Lund", lan: 12 },
      { code: 1, text: "Normalt", info: ["fläckvis Våt"], road: "Väg 108", plats: "Väg 108 Lund - Staffanstorp", lan: 12 },
      { code: 1, text: "Normalt", info: ["Torrt"], road: "E 4", plats: null, lan: 1 },
    ],
    stationer: [
      { name: "Lund", yta: -1.5, fukt: true, lan: 12 }, { name: "Malmö", yta: 0.4, fukt: false, lan: 12 },
      { name: "Sthlm", yta: 2.1, fukt: false, lan: 1 },
    ],
    olyckor: [{ road: "E 22", start: "2026-11-20T05:10:00Z", allvar: "Stor påverkan", lan: 12 }],
    now: NOW,
  });
  assert.equal(Object.keys(sidor).length, 22);
  assert.deepEqual(Object.keys(sidor).filter((p) => p !== "lan/index.html").sort(), LAN.map((l) => `lan/${l.slug}/index.html`).sort());
  const skane = sidor["lan/skane/index.html"];
  assert.ok(skane.includes("<title>Halt väglag i Skåne just nu? Väglag och vägtemperatur | Halkvakt</title>"));
  assert.ok(skane.includes(`<link rel="canonical" href="${SIDBAS}/lan/skane/">`));
  assert.ok(skane.includes("Trafikverket rapporterar halka eller vinterväglag på 1 av länets 2 vägavsnitt."), "fläckvis Våt räknas inte");
  assert.ok(skane.includes("1 mätstation visar vägbana på 0 °C eller kallare."));
  assert.ok(skane.includes("E 6 Malmö - Lund: Mycket besvärligt, Is, &lt;b&gt;"), "Trafikverkets ord, escapade");
  assert.ok(skane.includes("Lund: −1,5 °C — nederbörd eller fukt rapporteras") && !skane.includes("Malmö: 0,4"));
  assert.ok(skane.includes("E 22, sedan 20 nov. 06:10 (Stor påverkan)"), "svensk tid, vinter +1");
  assert.ok(skane.includes("Uppdaterad 20 nov. 07:30"));
  const sthlm = sidor["lan/stockholm/index.html"];
  assert.ok(sthlm.includes("Trafikverket rapporterar ingen halka på länets 1 vägavsnitt just nu. Ingen mätstation i länet visar vägbana under noll."));
  assert.ok(sthlm.includes("Trafikverket rapporterar ingen pågående olycka i länet."));
  const oversikt = sidor["lan/index.html"];
  assert.ok(oversikt.includes(`<tr><td><a href="skane/">Skåne län</a></td><td>1 av 2</td><td>1</td><td>1</td></tr>`));
  for (const [p, html] of Object.entries(sidor)) assert.ok(!/undefined|NaN|null/.test(html), `${p}: inget tomt läckte ut`);
});

test("länssidorna: sitemapen får de adresser som saknas, en gång, och Axels rader står kvar", () => {
  // Utan namnrymdens adress: beroendekartan läser varje värd i koden, och sitemapMed bryr sig inte om den.
  const axel = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n  <url><loc>${SIDBAS}/</loc></url>\n</urlset>\n`;
  const ny = sitemapMed(axel, lanAdresser())!;
  assert.equal((ny.match(/<url>/g) ?? []).length, 23);
  assert.ok(ny.startsWith(axel.slice(0, axel.lastIndexOf("</urlset>"))) && ny.endsWith("</urlset>\n"), "Axels del orörd, slutet kvar");
  assert.equal(sitemapMed(ny, lanAdresser()), null, "andra varvet: inget att skriva");
  assert.equal(sitemapMed("<html>inte en sitemap</html>", lanAdresser()), null, "en fil utan </urlset> rörs inte");
});

test("kartkärnan: med appens väderpunkter skrivs länssidorna; stationen får närmaste sträckans län, utan dem inga sidor", async () => {
  const q: Q = async (text) => {
    if (text.includes("CROSS JOIN LATERAL")) return [{ station_id: "W1", name: "Kiruna", lan: "25" }, { station_id: "W9", name: "Varm", lan: "1" }];
    if (text.includes("FROM road_conditions")) return [
      { segment_id: "S1", condition_code: "2", condition_text: "Besvärligt", condition_info: ["Is"], road_number: "E10",
        location_text: "Kiruna", modified_time: "2026-11-20T06:00:00Z", lan: "25", g: { type: "LineString", coordinates: [[20.2, 67.8], [20.3, 67.9]] } },
    ];
    if (text.includes("FROM weather_latest")) return [];
    if (text.includes("FROM deviations")) return [
      { land: "SE", deviation_id: "D1", message_type: "Olycka", message: "x", severity_text: null, road_number: "E10", start_time: new Date("2026-11-20T05:00:00Z"), g: null, lan: "25" },
      { land: "FI", deviation_id: "F1", message_type: "Onnettomuus", message: "x", severity_text: null, road_number: "4", start_time: "2026-11-20T05:00:00Z", g: null, lan: null },
    ];
    if (text.includes("FROM cameras")) return [];
    if (text.includes("FROM polisen_events")) return [{ dygn: "0", vecka: "0", vanligast: null }];
    if (text.includes("FROM smhi_warnings")) return [];
    if (text.includes("FROM waitlist")) return [{ n: 0 }];
    throw new Error("okänd fråga: " + text.slice(0, 60));
  };
  const utan = await buildMapData(q, { now: NOW });
  assert.equal(utan.sidor, null, "utan appens väderpunkter skrivs inga sidor (Node-vägen)");
  const med = await buildMapData(q, { now: NOW, appVader: [{ id: "W1", yta: -3.2, fukt: false }, { id: "W2", yta: -9, fukt: false }] });
  const nb = med.sidor!["lan/norrbotten/index.html"];
  assert.ok(nb.includes("Trafikverket rapporterar halka eller vinterväglag på 1 av länets 1 vägavsnitt."));
  assert.ok(nb.includes("Kiruna: −3,2 °C"), "W1 hör till Norrbotten via närmaste sträcka");
  assert.ok(!Object.values(med.sidor!).some((h) => h.includes("−9,0")), "W2 saknar län (ingen sträcka inom 20 km) och står inte på någon sida");
  assert.ok(nb.includes("E10, sedan 20 nov. 06:00"), "olyckan ur Date, i svensk tid");
  assert.equal((med.sidor!["lan/index.html"].match(/<td>1<\/td><td>1<\/td><\/tr>/g) ?? []).length, 1, "bara Norrbottens rad bär olyckan; den finska räknas inte");
});
