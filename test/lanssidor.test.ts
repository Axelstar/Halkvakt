// Länssidorna (kort #281, DECISIONS #458): vad sidan säger ska vara vad källorna säger, och "halt" ska betyda det motorn menar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arHalt, byggLanssidor, sitemapMed, sidAdresser, vagNyckel, LAN, VAGAR, SIDBAS, PENDLING } from "../publish/lanssidor.ts";
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
      { name: "Lund", yta: -1.5, fukt: true, lan: 12, vag: "E 6" }, { name: "Malmö", yta: 0.4, fukt: false, lan: 12 },
      { name: "Sthlm", yta: 2.1, fukt: false, lan: 1 },
    ],
    olyckor: [{ road: "E22", start: "2026-11-20T05:10:00Z", allvar: "Stor påverkan", lan: 12 }],   // olyckornas form: utan mellanslag
    now: NOW,
  });
  assert.equal(Object.keys(sidor).length, 30, "översikten, 21 län, 6 vägar, widgetens datafil och vägrutans");
  assert.deepEqual(Object.keys(sidor).filter((p) => p !== "lan/index.html" && !p.startsWith("data/")).sort(),
    [...LAN.map((l) => `lan/${l.slug}/index.html`), ...VAGAR.map((v) => `vag/${v.slug}/index.html`)].sort());
  const skane = sidor["lan/skane/index.html"];
  assert.ok(skane.includes("<title>Halka och väglag i Skåne län just nu | Halkvakt</title>"), "sökorden först (25/10)");
  assert.ok(skane.includes(`<meta name="description" content="Kl. 07:30: halka eller vinterväglag på 1 av 2 vägavsnitt i Skåne län, kallast −1,5 °C vid Lund. Trafikverkets väglag, vägtemperatur och olyckor, uppdaterat var 30:e minut.">`), "dagens siffror i sökträffen");
  assert.ok(skane.includes(`<link rel="canonical" href="${SIDBAS}/lan/skane/">`));
  assert.ok(skane.includes("Kl. 07:30 rapporterar Trafikverket halka eller vinterväglag på 1 av länets 2 vägavsnitt."), "fläckvis Våt räknas inte");
  assert.ok(skane.includes("1 mätstation visar vägbana på 0 °C eller kallare, kallast −1,5 °C vid Lund."));
  assert.ok(skane.includes("E 6 Malmö - Lund: Mycket besvärligt, Is, &lt;b&gt;"), "Trafikverkets ord, escapade");
  assert.ok(skane.includes("Lund: −1,5 °C, nederbörd eller fukt rapporteras") && !skane.includes("Malmö: 0,4"));
  assert.ok(!skane.includes("—"), "inga långa tankstreck (varumärkesguiden)");
  assert.ok(skane.includes("E22, sedan 20 nov. 06:10 (Stor påverkan)"), "svensk tid, vinter +1");
  assert.ok(skane.includes("Uppdaterad 20 nov. 07:30"));
  assert.ok(skane.includes(`<li><b>E6</b><span class="halt">Halka eller vinterväglag på 1 av 1 sträcka</span> · vägbanan −1,5 °C vid Lund<small>Malmö–Lund</small></li>`),
    "stora vägar: vägens namn som folk skriver det, läget och sträckans orter (DECISIONS #722)");
  assert.ok(!skane.includes("<li><b>väg 108</b>"), "en länsväg utan halka står inte i listan, bara E-vägar, riksvägar och vägar med halka");
  assert.ok(skane.includes("<h2>Pendla i Skåne</h2>") && skane.includes("E6 går mellan Malmö, Lund och Helsingborg"));
  assert.ok(skane.includes(`"@type":"FAQPage"`) && skane.includes("<h3>Hur ofta uppdateras väglaget i Skåne län?</h3>"), "frågorna syns och står som FAQPage");
  assert.ok(skane.includes(`HALT=new Set(["E 6 Malmö - Lund"])`), "kartan får de hala sträckorna härifrån, samma regel som texten");
  assert.ok(LAN.every((l) => PENDLING[l.slug]), "pendlingen är skriven för alla 21 län");
  const sthlm = sidor["lan/stockholm/index.html"];
  assert.ok(sthlm.includes(`content="Kl. 07:30: ingen halka på 1 vägavsnitt i Stockholms län, ingen mätstation under noll.`));
  assert.ok(sthlm.includes("Kl. 07:30 rapporterar Trafikverket ingen halka på länets 1 vägavsnitt just nu. Ingen mätstation i länet visar vägbana under noll."));
  assert.ok(sthlm.includes("Trafikverket rapporterar ingen pågående olycka i länet."));
  const oversikt = sidor["lan/index.html"];
  assert.ok(oversikt.includes("<title>Halka och väglag i Sverige just nu, län för län | Halkvakt</title>"));
  assert.ok(oversikt.includes(`content="Kl. 07:30: halka eller vinterväglag i 1 av 21 län, kallast −1,5 °C vid Lund.`));
  assert.ok(oversikt.includes(`<tr><td><a href="skane/">Skåne län</a></td><td>1 av 2</td><td>1</td><td>1</td><td><a class="lank-mono" href="../karta.html?lan=skane">Karta →</a></td></tr>`));
  const json = JSON.parse(sidor["data/lan.json"]);
  assert.equal(json.generated_at, NOW.toISOString());
  assert.deepEqual(json.lan.find((l: any) => l.slug === "skane"), { kod: 12, namn: "Skåne län", kort: "Skåne", slug: "skane", halt: 1, vagavsnitt: 2, kalla: 1, kallast: { namn: "Lund", yta: -1.5 }, olyckor: 1 });
  assert.equal(json.lan.find((l: any) => l.slug === "stockholm").kallast, null);
  assert.equal(json.lan.length, 21); assert.equal(json.vag.length, 6);
  for (const [p, html] of Object.entries(sidor)) if (!p.startsWith("data/")) assert.ok(!/undefined|NaN|null/.test(html), `${p}: inget tomt läckte ut`);
});

// Vägsidorna (#458, "vägsidorna sedan"): väglaget skriver "E 6" och "Väg 40", olyckorna "E22" — samma väg ska mötas.
test("vägsidorna: vägnumret utan form, vägens sträckor i alla län, stationen vid vägen och olyckan på den", () => {
  assert.deepEqual(["E 4", "E4", "Väg 40", "väg 274", null].map(vagNyckel), ["e4", "e4", "40", "274", ""]);
  const sidor = byggLanssidor({
    vaglag: [
      { code: 3, text: "Mycket besvärligt", info: ["Is"], road: "E 6", plats: "E 6 Malmö - Lund", lan: 12 },
      { code: 1, text: "Normalt", info: [], road: "E 6", plats: "E 6 Kungälv - Uddevalla", lan: 14 },
      { code: 2, text: "Besvärligt", info: [], road: "Väg 40", plats: "Väg 40 Borås - Ulricehamn", lan: 14 },
    ],
    stationer: [{ name: "Lund", yta: -1.5, fukt: false, lan: 12, vag: "E 6" }, { name: "Borås", yta: -0.5, fukt: false, lan: 14, vag: "Väg 40" },
      { name: "Kall men vid en annan väg", yta: -4, fukt: false, lan: 12, vag: "Väg 108" }],
    olyckor: [{ road: "E6", start: "2026-11-20T05:10:00Z", allvar: null, lan: 14 }],
    now: NOW,
  });
  const e6 = sidor["vag/e6/index.html"];
  assert.ok(e6.includes("<title>Halka och väglag på E6 just nu | Halkvakt</title>"));
  assert.ok(e6.includes(`content="Kl. 07:30: halka eller vinterväglag på 1 av 2 vägavsnitt på E6, kallast −1,5 °C vid Lund.`));
  assert.ok(e6.includes("Kl. 07:30 rapporterar Trafikverket halka eller vinterväglag på 1 av E6:s 2 vägavsnitt. 1 mätstation visar vägbana på 0 °C eller kallare, kallast −1,5 °C vid Lund."));
  assert.ok(e6.includes("Skåne: E 6 Malmö - Lund: Mycket besvärligt, Is") && !e6.includes("Kungälv"), "bara det hala listas, med länet");
  assert.ok(e6.includes("Skåne: Lund: −1,5 °C") && !e6.includes("Kall men vid en annan väg"));
  assert.ok(e6.includes("Västra Götaland: sedan 20 nov. 06:10"), "olyckan 'E6' möter väglagets 'E 6'");
  const rv40 = sidor["vag/rv40/index.html"];
  assert.ok(rv40.includes("Är det halt på riksväg 40 just nu?") && rv40.includes("1 av Riksväg 40:s 1 vägavsnitt"));
  assert.ok(rv40.includes("Trafikverket rapporterar ingen pågående olycka på riksväg 40."));
  assert.ok(sidor["lan/index.html"].includes(`<tr><td><a href="../vag/e6/">E6</a></td><td>1 av 2</td><td>1</td><td>1</td><td></td></tr>`));
  assert.ok(sidor["lan/skane/index.html"].includes(`<a href="../../vag/e4/">E4</a>`), "länssidorna länkar till vägarna");
  for (const [p, html] of Object.entries(sidor)) if (!p.startsWith("data/")) assert.ok(!/undefined|NaN|null/.test(html), `${p}: inget tomt läckte ut`);
});

test("länssidorna: sitemapen får de adresser som saknas, en gång, och Axels rader står kvar", () => {
  // Utan namnrymdens adress: beroendekartan läser varje värd i koden, och sitemapMed bryr sig inte om den.
  const axel = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n  <url><loc>${SIDBAS}/</loc></url>\n</urlset>\n`;
  const ny = sitemapMed(axel, sidAdresser())!;
  assert.equal((ny.match(/<url>/g) ?? []).length, 29, "Axels 1 + översikten + 21 län + 6 vägar");
  assert.ok(ny.startsWith(axel.slice(0, axel.lastIndexOf("</urlset>"))) && ny.endsWith("</urlset>\n"), "Axels del orörd, slutet kvar");
  assert.equal(sitemapMed(ny, sidAdresser()), null, "andra varvet: inget att skriva");
  assert.equal(sitemapMed("<html>inte en sitemap</html>", sidAdresser()), null, "en fil utan </urlset> rörs inte");
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
  assert.ok(nb.includes("rapporterar Trafikverket halka eller vinterväglag på 1 av länets 1 vägavsnitt."));
  assert.ok(nb.includes("Kiruna: −3,2 °C"), "W1 hör till Norrbotten via närmaste sträcka");
  assert.ok(!Object.values(med.sidor!).some((h) => h.includes("−9,0")), "W2 saknar län (ingen sträcka inom 20 km) och står inte på någon sida");
  assert.ok(nb.includes("E10, sedan 20 nov. 06:00"), "olyckan ur Date, i svensk tid");
  assert.equal((med.sidor!["lan/index.html"].match(/<td>1<\/td><td>1<\/td><td>[^<]*(<a[^>]*>[^<]*<\/a>)?<\/td><\/tr>/g) ?? []).length, 1, "bara Norrbottens rad bär olyckan; den finska räknas inte");
});

test("vägrutans fil: länets vägar i ordning E före väg, sträckan utan vägnamnet, halt som sidorna, kallast vid vägen", () => {
  const sidor = byggLanssidor({
    vaglag: [
      { code: 1, text: "Normalt", info: ["Våt"], road: "Väg 61", plats: "Väg 61 Kil - Karlstad", lan: 17 },
      { code: 1, text: "Normalt", info: ["fläckvis Is"], road: "E 18", plats: "E 18 Karlstad - Kristinehamn", lan: 17 },
      { code: 3, text: "Mycket besvärligt", info: [], road: "E 18", plats: "E 18 Grums - Karlstad", lan: 17 },
      { code: 1, text: "Normalt", info: [], road: "E 4", plats: "E 4 Malmö - Lund", lan: 12 },
    ],
    stationer: [
      { name: "Väse", yta: -2.4, fukt: true, lan: 17, vag: "E 18" }, { name: "Kil", yta: 0.6, fukt: false, lan: 17, vag: "Väg 61" },
      { name: "Molkom", yta: -0.5, fukt: false, lan: 17, vag: "E 18" },
    ],
    olyckor: [], now: NOW,
  });
  const d = JSON.parse(sidor["data/strackor.json"]);
  const v = d.lan.find((l: any) => l.slug === "varmland");
  assert.deepEqual(v.vagar.map((x: any) => x.vag), ["E 18", "Väg 61"]);
  assert.deepEqual(v.vagar[0].strackor.map((x: any) => [x.plats, x.halt]), [["Karlstad - Kristinehamn", true], ["Grums - Karlstad", true]]);
  assert.deepEqual(v.vagar[0].kallast, { namn: "Väse", yta: -2.4 });
  assert.equal(v.vagar[0].kalla, 2);
  assert.equal(v.vagar[1].strackor[0].halt, false);
  assert.equal(d.lan.find((l: any) => l.slug === "skane").vagar[0].strackor[0].plats, "Malmö - Lund");
});

test("läns- och vägsidorna hämtar typsnitten från halkvakt.se, aldrig från Google (DECISIONS #623)", () => {
  const sidor = byggLanssidor({ vaglag: [], stationer: [], olyckor: [], now: NOW });
  const html = Object.entries(sidor).filter(([namn]) => namn.endsWith(".html"));
  assert.ok(html.length > 0);
  for (const [namn, sida] of html) {
    assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(String(sida)), namn);
    assert.match(String(sida), /assets\/fonts\/fonts\.css/, namn);
  }
});

test("läns- och vägsidorna bär tiden och källan som strukturerad data (DECISIONS #629)", () => {
  const sidor = byggLanssidor({ vaglag: [], stationer: [], olyckor: [], now: NOW });
  for (const namn of ["lan/skane/index.html", "vag/e6/index.html", "lan/index.html"]) {
    const m = sidor[namn].match(/<script type="application\/ld\+json">(.*?)<\/script>/);
    assert.ok(m, namn);
    const d = JSON.parse(m![1]);
    assert.equal(d["@type"], "WebPage");
    assert.equal(d.dateModified, NOW.toISOString());
    assert.match(d.isBasedOn.name, /Trafikverkets öppna data/);
  }
  assert.ok(sidor["lan/skane/index.html"].includes("rapporterar Trafikverket ingen halka"), "noll halka sägs som noll, aldrig som halka");
});
