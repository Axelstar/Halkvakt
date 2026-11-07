// Länssidorna (kort #281, DECISIONS #458): vad sidan säger ska vara vad källorna säger, och "halt" ska betyda det motorn menar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { arHalt, byggLanssidor, sitemapMed, sitemapDatum, medBlock, medId, lsLankar, lsStartsida, lsKartsida, lsNaraStationer, LS_NARA_KM, sidAdresser, vagNyckel, vagvarningar, LAN, VAGAR, ORTER, ortSlug, SIDBAS, PENDLING, STRAK } from "../publish/lanssidor.ts";
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
  assert.equal(Object.keys(sidor).length, 31 + ORTER.length + 4 * LAN.length + 2 * Object.keys(STRAK).length + 1,
    "översikten, 21 län, 6 vägar, orterna, varningssidan, widgetens datafil, vägrutans, Datawrapper-tabellerna (vägar och hela läget per län, pendling per stråk) och strak.json");
  assert.deepEqual(Object.keys(sidor).filter((p) => p !== "lan/index.html" && !p.startsWith("data/")).sort(),
    ["varningar/index.html", ...LAN.map((l) => `lan/${l.slug}/index.html`), ...VAGAR.map((v) => `vag/${v.slug}/index.html`),
      ...ORTER.map((o) => `ort/${ortSlug(o.namn)}/index.html`)].sort());
  // 29/10: orten Uppsala har egen sida med titeln "Halka i Uppsala idag", så länssidan säger "län" — två sidor, två titlar.
  assert.ok(sidor["lan/uppsala/index.html"].includes("<title>Halka i Uppsala län idag:"), "länet när en ort bär namnet");
  assert.ok(sidor["lan/stockholm/index.html"].includes("<title>Halka i Stockholms län idag:"), "länet när en ort bär namnet");
  assert.ok(sidor["lan/sodermanland/index.html"].includes("<title>Halka i Södermanland idag:"), "utan län när ingen ort bär namnet");
  const titlar = Object.entries(sidor).filter(([p]) => p.endsWith(".html")).map(([, h]) => h.match(/<title>(.*?)<\/title>/)![1]);
  assert.equal(new Set(titlar).size, titlar.length, "ingen titel används av två sidor");
  const skane = sidor["lan/skane/index.html"];
  assert.ok(skane.includes("<title>Halka i Skåne idag: väglag och trafikläget just nu | Halkvakt</title>"), "sökorden först, som folk skriver dem (28/10)");
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
  assert.ok(e6.includes("<title>Väglag E6 idag: halka och trafikläget just nu | Halkvakt</title>"));
  assert.ok(e6.includes(`content="Kl. 07:30: halka eller vinterväglag på 1 av 2 vägavsnitt på E6, kallast −1,5 °C vid Lund.`));
  assert.ok(e6.includes("Kl. 07:30 rapporterar Trafikverket halka eller vinterväglag på 1 av E6:s 2 vägavsnitt. 1 mätstation visar vägbana på 0 °C eller kallare, kallast −1,5 °C vid Lund."));
  assert.ok(e6.includes("Skåne: E 6 Malmö - Lund: Mycket besvärligt, Is") && !e6.includes("E 6 Kungälv - Uddevalla"), "bara det hala listas, med länet");
  // Vägen län för län (29/10): varje län med sina sträckor och länken dit, orterna längs vägen och frågorna.
  assert.ok(e6.includes(`<h2>E6 län för län</h2>`));
  assert.ok(e6.includes(`<li><b><a href="../../lan/skane/">Skåne</a></b><span class="halt">Halka eller vinterväglag på 1 av 1 sträcka</span> · vägbanan −1,5 °C vid Lund<small>Malmö–Lund</small></li>`));
  assert.ok(e6.includes(`<li><b><a href="../../lan/vastra-gotaland/">Västra Götaland</a></b>Ingen halka rapporterad på 1 sträcka<small>Kungälv–Uddevalla</small></li>`));
  assert.ok(e6.includes(`<h2>Orter längs E6</h2>`) && e6.includes(`<a href="../../ort/malmo/">Malmö</a>`) && e6.includes(`<a href="../../ort/uddevalla/">Uddevalla</a>`));
  assert.ok(e6.includes("Hur ofta uppdateras väglaget på E6?") && e6.includes(`"@type":"FAQPage"`));
  assert.ok(e6.includes("Skåne: Lund: −1,5 °C") && !e6.includes("Kall men vid en annan väg"));
  assert.ok(e6.includes("Västra Götaland: sedan 20 nov. 06:10"), "olyckan 'E6' möter väglagets 'E 6'");
  const rv40 = sidor["vag/rv40/index.html"];
  assert.ok(rv40.includes("Är det halt på riksväg 40 just nu?") && rv40.includes("1 av Riksväg 40:s 1 vägavsnitt"));
  assert.ok(rv40.includes("Trafikverket rapporterar ingen pågående olycka på riksväg 40."));
  assert.ok(sidor["lan/index.html"].includes(`<tr><td><a href="../vag/e6/">E6</a></td><td>1 av 2</td><td>1</td><td>1</td><td></td></tr>`));
  assert.ok(sidor["lan/skane/index.html"].includes(`<a href="../../vag/e4/">E4</a>`), "länssidorna länkar till vägarna");
  for (const [p, html] of Object.entries(sidor)) if (!p.startsWith("data/")) assert.ok(!/undefined|NaN|null/.test(html), `${p}: inget tomt läckte ut`);
  // Datamängden bär description och creator (29/10): Search Console fällde sidorna utan dem.
  const ld = JSON.parse(e6.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"WebPage".*?)<\/script>/)![1]);
  assert.equal(ld.isBasedOn["@type"], "Dataset");
  assert.ok(ld.isBasedOn.description.length > 50);
  assert.deepEqual(ld.isBasedOn.creator, { "@type": "Organization", name: "Trafikverket", url: "https://www.trafikverket.se/" });
});

test("sitemapen (3/11): lastmod flyttas bara när sidans läge ändras, inte vid varje omskrivning", () => {
  const data = (yta: number) => ({ vaglag: [{ code: 3, text: "Mycket besvärligt", info: ["Is"], road: "E 6", plats: "E 6 Malmö - Lund", lan: 12 }],
    stationer: [{ name: "Lund", yta, fukt: false, lan: 12, vag: "E 6" }], olyckor: [] });
  const t1 = new Date("2026-11-20T06:30:00Z"), t2 = new Date("2026-11-20T07:00:00Z"), t3 = new Date("2026-11-20T07:30:00Z");
  const axel = `<urlset>\n  <url><loc>${SIDBAS}/</loc><lastmod>2026-10-28</lastmod></url>\n  <url><loc>${SIDBAS}/lan/skane/</loc><lastmod>2026-10-28</lastmod><changefreq>hourly</changefreq></url>\n</urlset>\n`;
  const xml0 = sitemapMed(axel, sidAdresser())!;
  const a = sitemapDatum(xml0, byggLanssidor({ ...data(-1.5), now: t1 }), {}, t1);
  const urls = a.xml.match(/<url>[\s\S]*?<\/url>/g)!;
  assert.equal(urls.filter((u) => /<lastmod>/.test(u)).length, urls.length, "varje adress har ett datum");
  assert.ok(a.xml.includes(`<loc>${SIDBAS}/</loc><lastmod>2026-10-28</lastmod>`), "Axels handskrivna sidor orörda");
  assert.ok(a.xml.includes(`<loc>${SIDBAS}/lan/skane/</loc><lastmod>2026-11-20T06:30:00+00:00</lastmod><changefreq>hourly</changefreq>`), "det gamla datumet ersatt, resten av raden kvar");
  assert.equal((a.xml.match(new RegExp(`${SIDBAS}/lan/skane/</loc><lastmod>`, "g")) ?? []).length, 1, "ett datum per adress");
  // Samma läge en halvtimme senare: inget datum flyttas, fast klockslaget i sidan är nytt.
  const b = sitemapDatum(a.xml, byggLanssidor({ ...data(-1.5), now: t2 }), a.andrade, t2);
  assert.equal(b.xml, a.xml);
  // Kallaste stationen ändras: Skåne, Malmö, Lund, E6 och översikten flyttas; Norrbotten står kvar.
  const c = sitemapDatum(b.xml, byggLanssidor({ ...data(-2.1), now: t3 }), b.andrade, t3);
  const datum = (x: string, sida: string) => x.match(new RegExp(`${SIDBAS}/${sida}</loc><lastmod>([^<]*)`))![1];
  assert.equal(datum(c.xml, "lan/skane/"), "2026-11-20T07:30:00+00:00");
  assert.equal(datum(c.xml, "vag/e6/"), "2026-11-20T07:30:00+00:00");
  assert.equal(datum(c.xml, "lan/norrbotten/"), "2026-11-20T06:30:00+00:00");
  // En sida som inte byggdes den här gången behåller sitt datum och sitt läge.
  const d = sitemapDatum(c.xml, {}, c.andrade, t3);
  assert.equal(d.xml, c.xml);
  assert.deepEqual(d.andrade, c.andrade);
});

test("länkarna (3/11): /lan/ och startsidans block når varje län, ort och väg, varningarna och guiden", () => {
  const sidor = byggLanssidor({ vaglag: [], stationer: [], olyckor: [], now: NOW });
  for (const [html, rot] of [[sidor["lan/index.html"], "../"], [lsLankar(""), ""]] as const) {
    for (const o of ORTER) assert.ok(html.includes(`href="${rot}ort/${ortSlug(o.namn)}/"`), `${rot || "start"}: ${o.namn}`);
    for (const l of LAN) assert.ok(html.includes(`href="${rot}lan/${l.slug}/"`), `${rot || "start"}: ${l.kort}`);
    for (const v of VAGAR) assert.ok(html.includes(`href="${rot}vag/${v.slug}/"`), `${rot || "start"}: ${v.namn}`);
    for (const x of ["varningar/", "nar-blir-det-halt.html", "app-som-varnar-for-halka.html"]) assert.ok(html.includes(`href="${rot}${x}"`));
  }
  const start = "<main>\n<!-- hv:lankar -->\ngammalt\n<!-- /hv:lankar -->\n</main>";
  const ny = medBlock(start, "lankar", lsLankar(""))!;
  assert.ok(ny.startsWith("<main>\n<!-- hv:lankar -->\n<ul") && ny.endsWith("<!-- /hv:lankar -->\n</main>") && !ny.includes("gammalt"));
  assert.equal(medBlock(ny, "lankar", lsLankar("")), null, "oförändrat: inget att skriva");
  assert.equal(medBlock("<main></main>", "lankar", "x"), null, "utan markörer rörs sidan inte");
});

test("länssidorna: sitemapen får de adresser som saknas, en gång, och Axels rader står kvar", () => {
  // Utan namnrymdens adress: beroendekartan läser varje värd i koden, och sitemapMed bryr sig inte om den.
  const axel = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n  <url><loc>${SIDBAS}/</loc></url>\n</urlset>\n`;
  const ny = sitemapMed(axel, sidAdresser())!;
  assert.equal((ny.match(/<url>/g) ?? []).length, 30 + ORTER.length, "Axels 1 + översikten + varningssidan + 21 län + 6 vägar + orterna");
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
  // Startsidans och kartans tal följer med sidorna (6/11, DECISIONS #807); utan sidor inga tal.
  assert.equal(utan.start, null);
  assert.equal(med.start!["h-tid"], "Just nu · fredag 20 nov · 07:30");
  assert.equal(med.start!["halt-lista"], '<a class="lan-halt" href="lan/norrbotten/" title="Halka eller vinterväglag på 1 av 1 vägavsnitt">Norrbotten · 1</a><a class="lank-mono" href="lan/">Alla 21 län →</a>');
  assert.equal(med.start!["t-kallast"], "–", "inga stationer i vader.geojson i provet");
  assert.deepEqual(med.kartaText, { tid: "Uppdaterad 07:30", rader: "1 av 1 sträckor med halka eller vinterväglag." });
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

test("läns- och vägsidorna bär sajtens ram: samma meny, spårkod per knapp, appraden bara där det är halt (DECISIONS #732)", () => {
  const sidor = byggLanssidor({
    vaglag: [{ code: 3, text: "Mycket besvärligt", info: ["Is"], road: "E 6", plats: "E 6 Malmö - Lund", lan: 12 }],
    stationer: [], olyckor: [], now: NOW,
  });
  for (const [namn, ct] of [["lan/skane/index.html", "lan"], ["vag/e6/index.html", "vag"], ["lan/index.html", "lanen"]]) {
    const s = sidor[namn];
    assert.ok(!s.includes("#sa-funkar"), `${namn}: ingen länk till en rubrik som inte finns`);
    assert.match(s, /Livekartan<\/a>\s*<a [^>]*>Länen<\/a>\s*<a [^>]*>Appen<\/a>\s*<a [^>]*>Om Halkvakt<\/a>/, namn);
    assert.ok(s.includes("?ct=huvud\">Hämta appen</a>"), namn);
    assert.ok(s.includes(`?ct=${ct}">Få varningar i appen</a>`), namn);
    assert.equal((s.match(/aria-label="Halka per län"/g) ?? []).length, 1, namn);
  }
  assert.ok(sidor["lan/skane/index.html"].includes("?ct=lan-halt"), "halt i länet ⇒ appraden under svaret");
  assert.ok(!sidor["lan/uppsala/index.html"].includes("?ct=lan-halt"), "ingen halka ⇒ ingen apprad");
  assert.ok(sidor["lan/index.html"].includes('<h2 id="vagar">Stora vägar</h2>'), "sidfotens Stora vägar har ett mål");
});

test("ortssidorna (28/10): ortens egna avsnitt i dess län, ett län i Länsgräns räknas inte, titeln som sökrutan", () => {
  assert.equal(ortSlug("Örnsköldsvik"), "ornskoldsvik");
  assert.equal(ortSlug("Älvdalen"), "alvdalen");
  assert.equal(new Set(ORTER.map((o) => ortSlug(o.namn))).size, ORTER.length, "unika adresser");
  for (const o of ORTER) assert.ok(LAN.some((l) => l.kod === o.lan), `${o.namn}: länet finns`);
  const sidor = byggLanssidor({
    vaglag: [
      { code: 3, text: "Mycket besvärligt", info: ["Is"], road: "E 6", plats: "E 6 Malmö - Lund", lan: 12 },
      { code: 1, text: "Normalt", info: ["Torrt"], road: "E 65", plats: "E 65 Svedala - Malmö", lan: 12 },
      { code: 1, text: "Normalt", info: ["Torrt"], road: "Väg 108", plats: "Väg 108 Malmöhus - Staffanstorp", lan: 12 },
      { code: 3, text: "Mycket besvärligt", info: ["Is"], road: "E 18", plats: "E 18 Länsgräns Värmland/Örebro - Lekhyttan", lan: 18 },
      { code: 1, text: "Normalt", info: ["Torrt"], road: "E 20", plats: "E 20 Örebro - Laxå", lan: 18 },
    ],
    stationer: [{ name: "Lund", yta: -1.5, fukt: true, lan: 12, vag: "E 6" }],
    olyckor: [{ road: "E6", start: "2026-11-20T05:10:00Z", allvar: null, lan: 12 }, { road: "E4", start: null, allvar: null, lan: 12 }],
    now: NOW,
  });
  const malmo = sidor["ort/malmo/index.html"];
  assert.ok(malmo.includes("<title>Halka i Malmö idag: väglag och trafikläget just nu | Halkvakt</title>"));
  assert.ok(malmo.includes(`<link rel="canonical" href="${SIDBAS}/ort/malmo/">`));
  assert.ok(malmo.includes("halka eller vinterväglag på 1 av 2 vägavsnitt till och från Malmö"), "Malmöhus är inte Malmö");
  assert.ok(malmo.includes("kallast −1,5 °C vid Lund"), "länets kallaste station");
  assert.ok(malmo.includes("E6, sedan"), "olyckan på en väg genom orten");
  assert.ok(!malmo.includes("<li>E4</li>"), "olyckan på en annan väg hör inte hit");
  assert.ok(malmo.includes('href="../lund/"'), "grannorten i länet");
  assert.ok(sidor["ort/orebro/index.html"].includes("ingen halka på 1 vägavsnitt till och från Örebro"), "Länsgräns Värmland/Örebro är länet");
  assert.ok(sidor["lan/skane/index.html"].includes('href="../../ort/malmo/"'), "länssidan länkar till sina orter");
  assert.ok(sidAdresser().includes(`${SIDBAS}/ort/malmo/`), "orterna i sitemapen");
});

test("Datawrapper-tabellen per län (2/11, NWT): samma rader och samma mening som länssidan, giltig CSV, inget annat tal", () => {
  const d = {
    vaglag: [
      { code: 1, text: "Normalt", info: ["Våt"], road: "Väg 61", plats: "Väg 61 Kil - Karlstad", lan: 17 },
      { code: 1, text: "Normalt", info: ["fläckvis Is"], road: "E 18", plats: "E 18 Karlstad - Kristinehamn", lan: 17 },
      { code: 3, text: "Mycket besvärligt", info: [], road: "E 18", plats: "E 18 Grums - Karlstad", lan: 17 },
      { code: 1, text: "Normalt", info: [], road: "Väg 1234", plats: "Väg 1234 \"Byn\" - Ån", lan: 17 },
    ],
    stationer: [{ name: "Väse", yta: -2.4, fukt: true, lan: 17, vag: "E 18" }],
    olyckor: [], now: NOW,
  };
  const sidor = byggLanssidor(d);
  const csv = sidor["data/datawrapper/varmland.csv"];
  assert.equal(csv, [
    '"Väg","Halka","Vägbanan","Var"',
    '"E18","<span style=""background:#FFC94A&#59color:#080B0D&#59font-weight:600&#59padding:2px 8px&#59border-radius:10px&#59white-space:nowrap"">2 av 2 sträckor</span>","<span style=""font-weight:600&#59color:#181818"">−2,4 °C</span> <span style=""color:#8FA0A9&#59font-size:12px"">Väse</span>","Karlstad–Kristinehamn · Grums–Karlstad"',
    '"Väg 61","<span style=""color:#6F7C83&#59white-space:nowrap"">0 av 1 sträcka</span>","",""',
  ].join("\n") + "\n", "småvägen utan halka står inte med, precis som på länssidan; sträcknamn bara där det är halt; gult bara där det är halt (guiden 1.0)");
  // Inget rått semikolon: Datawrapper gissar skiljetecknet ur filen och läste en rad med fler ";" än "," som en kolumn (2/11).
  for (const lan of LAN) assert.ok(!sidor[`data/datawrapper/${lan.slug}.csv`].includes(";"), lan.slug);
  // Halkan först, oavsett vägnummer.
  const halkaSist = byggLanssidor({ ...d, vaglag: [
    { code: 1, text: "Normalt", info: [], road: "E 18", plats: "E 18 Grums - Karlstad", lan: 17 },
    { code: 3, text: "Mycket besvärligt", info: [], road: "Väg 61", plats: "Väg 61 Kil - Karlstad", lan: 17 },
  ] })["data/datawrapper/varmland.csv"];
  assert.deepEqual(halkaSist.split("\n").slice(1, 3).map((r) => r.split(",")[0]), ['"Väg 61"', '"E18"']);
  const meta = JSON.parse(sidor["data/datawrapper/varmland.json"]);
  assert.equal(meta.title, "Väglaget i Värmland just nu");
  assert.equal(meta.describe["source-url"], `${SIDBAS}/lan/varmland/`);
  const intro = "Kl. 07:30 rapporterar Trafikverket halka eller vinterväglag på 2 av länets 4 vägavsnitt.";
  assert.ok(meta.describe.intro.startsWith(intro), meta.describe.intro);
  assert.ok(sidor["lan/varmland/index.html"].includes(intro), "ingressen är länssidans mening, ord för ord");
  assert.ok(!/[—!]/.test(csv + JSON.stringify(meta)), "inga långa tankstreck eller utropstecken (guiden 1.0)");
  // Ett län utan väglag får en rad som säger det, inte en tom tabell.
  assert.match(sidor["data/datawrapper/gotland.csv"], /^"Väg","Halka","Vägbanan","Var"\n"","Trafikverket rapporterar inget väglag för länets stora vägar just nu.","",""\n$/);
  for (const lan of LAN) {
    assert.ok(sidor[`data/datawrapper/${lan.slug}.csv`] && sidor[`data/datawrapper/${lan.slug}.json`], lan.slug);
  }
});

// Varningssidan (1/11): SMHI:s vägvarningar med SMHI:s ord, Trafikverkets läge i varje varnat län, ingen egen prognos.
const SMHI = [
  { event_sv: "Snöfall och ishalka", level_sv: "Gul", level_code: "YELLOW", description_sv: "Snöfall som kan ge besvärliga vägförhållanden",
    area_name: "Värmlands län", affected_areas: [{ id: 17, sv: "Värmlands län" }], approx_start: "2026-11-20T16:00:00Z", approx_end: "2026-11-21T08:00:00Z" },
  { event_sv: "Snöfall", level_sv: "Orange", level_code: "ORANGE", description_sv: null, area_name: "Norrbottens fjäll", affected_areas: [], approx_start: null, approx_end: null },
  { event_sv: "Snöfall", level_sv: "Meddelande", level_code: "MESSAGE", area_name: "Skåne län" },
  { event_sv: "Medelvind till havs", level_sv: "Gul", level_code: "YELLOW", area_name: "Norra Östersjön" },
  { event_sv: "Risk för vattenbrist", level_sv: "Gul", level_code: "YELLOW", area_name: "Gotlands län" },
  { event_sv: "Isbeläggning till havs", level_sv: "Gul", level_code: "YELLOW", area_name: "Bottenviken" },
];

test("varningssidan: bara vägvarningar på gul, orange och röd nivå, inget till havs, länen ur områdets namn", () => {
  const v = vagvarningar(SMHI);
  assert.deepEqual(v.map((x) => x.omrade), ["Norrbottens fjäll", "Värmlands län"], "orange före gul; meddelandet, vinden till havs och vattenbristen bort");
  assert.deepEqual(v.map((x) => x.lan), [[25], [17]], "fjällen hör till Norrbotten, länet till sig självt");
  assert.equal(v[1].start, "2026-11-20T16:00:00.000Z");
  // Varje län känns igen ur sitt eget namn, och inget annat län följer med.
  for (const l of LAN) assert.deepEqual(vagvarningar([{ event_sv: "Snöfall", level_sv: "Gul", level_code: "YELLOW", area_name: l.namn }])[0].lan, [l.kod], l.namn);
});

test("varningssidan: SMHI:s ord, vägarna i det varnade länet, länkar dit från läns-, orts- och vägsidorna", () => {
  const d = {
    vaglag: [
      { code: 3, text: "Mycket besvärligt", info: ["Snö"], road: "E 18", plats: "E 18 Karlstad - Kristinehamn", lan: 17 },
      { code: 1, text: "Normalt", info: ["Torrt"], road: "E 18", plats: "E 18 Örebro - Arboga", lan: 18 },
      { code: 1, text: "Normalt", info: ["Torrt"], road: "E 4", plats: "E 4 Luleå - Piteå", lan: 25 },
    ],
    stationer: [{ name: "Torsby", yta: -4.2, fukt: true, lan: 17 }],
    olyckor: [],
    now: NOW,
  };
  const sidor = byggLanssidor({ ...d, smhi: SMHI });
  const s = sidor["varningar/index.html"];
  // 3/11: "halkvarning" först (den öppnaste sökningen), "varning för snöfall och is" kvar (Klarts största vägsökning).
  assert.ok(s.includes("<title>Halkvarning idag: SMHI:s varningar för snöfall och is och väglaget län för län | Halkvakt</title>"));
  assert.ok(s.includes("<h1>Halkvarning just nu</h1>"));
  // Varje datamängd bär licensen (Search Console 4/11: "Missing field license" på SMHI:s).
  const ld = JSON.parse(s.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"WebPage".*?)<\/script>/)![1]);
  assert.deepEqual(ld.isBasedOn.map((x: { license?: string }) => x.license),
    ["https://creativecommons.org/publicdomain/zero/1.0/", "https://creativecommons.org/licenses/by/4.0/"]);
  assert.ok(s.includes(`<link rel="canonical" href="${SIDBAS}/varningar/">`));
  assert.ok(!s.includes('name="robots"'), "sidan ska kunna indexeras");
  assert.ok(s.includes("Kl. 07:30 varnar SMHI i Norrbottens fjäll (orange varning, snöfall) och Värmlands län (gul varning, snöfall och ishalka)."), "SMHI:s händelser och områden");
  assert.ok(s.includes('content="Kl. 07:30: SMHI varnar i Norrbottens fjäll och Värmlands län. Trafikverket: halka eller vinterväglag på 1 av 2 vägavsnitt där. Uppdaterat var 30:e minut."'), "dagens läge i sökträffen");
  assert.ok(s.includes("Trafikverket rapporterar halka eller vinterväglag på 1 av 2 vägavsnitt i de 2 länen."), "Trafikverkets läge i de varnade länen");
  assert.ok(s.includes("<small>SMHI · Gul varning</small>Snöfall och ishalka · Värmlands län"), "nivån och händelsen med SMHI:s ord");
  assert.ok(s.includes("Snöfall som kan ge besvärliga vägförhållanden"), "SMHI:s egen beskrivning");
  assert.ok(s.includes("Gäller från ungefär 20 nov. 17:00 till ungefär 21 nov. 09:00, enligt SMHI."), "giltighetstiden i svensk tid");
  assert.ok(s.includes("1, kallast −4,2 °C Torsby"), "kallaste stationen i det varnade länet");
  assert.ok(s.includes('href="../lan/varmland/"') && s.includes('href="../karta.html?lan=varmland"'));
  assert.ok(s.includes('"@type":"FAQPage"') && s.includes('"name":"SMHI"'), "frågorna och SMHI som källa i den strukturerade datan");
  assert.ok(!s.includes("Norra Östersjön") && !s.includes("Meddelande"), "inget till havs, inga meddelanden");
  const text = s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!doctype html>/gi, "");
  assert.ok(!text.includes("—") && !text.includes("!"), "inga långa tankstreck och inga utropstecken (varumärkesguiden)");
  assert.ok(!/prognos visar|enligt halkvakt/i.test(text), "ingen egen prognos på sidan");
  assert.ok(sidor["lan/varmland/index.html"].includes('<p class="varnad">SMHI varnar i länet: gul varning, snöfall och ishalka. <a href="../../varningar/">'), "länssidan");
  assert.ok(!sidor["lan/skane/index.html"].includes('class="varnad"'), "ett meddelande ger ingen rad");
  assert.ok(sidor["ort/karlstad/index.html"].includes('<p class="varnad">SMHI varnar i Värmland: gul varning, snöfall och ishalka.'), "ortssidan via sitt län");
  assert.ok(sidor["vag/e18/index.html"].includes("SMHI varnar längs vägen: gul varning, snöfall och ishalka (Värmlands län)."), "vägsidan när ett län längs vägen är varnat");
  assert.ok(!sidor["vag/e6/index.html"].includes('class="varnad"'), "ingen rad där vägen inte går");
  assert.ok(sidor["lan/uppsala/index.html"].includes('href="../../varningar/">SMHI-varningar</a>'), "sidfoten länkar alltid dit");

  const tom = byggLanssidor(d)["varningar/index.html"];
  assert.ok(tom.includes("Kl. 07:30 har SMHI ingen varning för snöfall, underkylt regn eller is. Trafikverket rapporterar halka eller vinterväglag i 1 län: Värmland."));
  assert.ok(!tom.includes('class="varnade"'), "inga kort utan varning");
});

test("Datawrapper, pendling och hela läget (2/11, Axel): bara det som är halt syns, resten bakom en knapp, inga semikolon i CSV", () => {
  const seg = (road: string, plats: string, halt: boolean) => ({ code: halt ? 3 : 1, text: halt ? "Mycket besvärligt" : "Normalt", info: [], road, plats: `${road} ${plats}`, lan: 17 });
  const d = {
    vaglag: [seg("E 18", "Karlstad - Kristinehamn", false), seg("E 45", "Torsby - Sunne", true), seg("E 18", "Grums - Karlstad", false),
      seg("E 45", "Fagerås - Grums", false), seg("E 45", "Sunne - Fagerås", false), seg("Väg 63", "Molkom - Karlstad", false)],
    stationer: [{ name: "Storberget", yta: -1.8, fukt: true, lan: 17, vag: "E 45" }], olyckor: [], now: NOW,
  };
  const sidor = byggLanssidor(d);
  const pend = sidor["data/datawrapper/pendling-varmland.csv"].split("\n");
  assert.equal(pend[0], '"Stråk","Väg","Halka","Var"');
  assert.equal(pend.length - 2, 1, "bara det hala stråket i tabellen");
  assert.match(pend[1], /Sunne och Torsby.*E18\/E45.*1 av 4 sträckor.*Torsby–Sunne/);
  const meta = JSON.parse(sidor["data/datawrapper/pendling-varmland.json"]);
  assert.equal(meta.title, "Halka på pendlarvägarna från Karlstad");
  assert.match(meta.annotate.notes, /<details>.*Visa övriga stråk.*\(4\)/, "Kristinehamn, Säffle, Filipstad och Årjäng (de två sista via delen Grums–Karlstad) bakom knappen; Arvika saknar data och står inte med");
  const hela = JSON.parse(sidor["data/datawrapper/hela-varmland.json"]);
  assert.match(hela.describe.intro, /^Kl\. 07:30 enligt Trafikverket: <span[^>]*>halka på 1 av 6 vägavsnitt<\/span> · <b>1 station<\/b> på 0 °C eller kallare · kallast <b>−1,8 °C<\/b> vid Storberget · inga pågående olyckor/);
  assert.match(hela.describe.intro, /Halka på pendlarvägarna från Karlstad<\/b>$/);
  assert.match(hela.annotate.notes, /Halka på länets stora vägar.*E45.*1 av 3 sträckor.*Visa övriga vägar/);
  // Utan halka: en rad som säger det, och allt bakom "Visa alla".
  const torr = byggLanssidor({ ...d, vaglag: d.vaglag.map((x) => ({ ...x, code: 1, text: "Normalt" })) });
  assert.equal(torr["data/datawrapper/pendling-varmland.csv"].split("\n")[1], '"Ingen halka på pendlarvägarna från Karlstad just nu.","","",""');
  assert.equal(JSON.parse(torr["data/datawrapper/pendling-varmland.json"]).title, "Pendlarvägarna från Karlstad just nu");
  assert.match(JSON.parse(torr["data/datawrapper/hela-varmland.json"]).annotate.notes, /Visa alla stråk.*Ingen halka på länets stora vägar just nu.*Visa alla vägar/);
  // Ett län utan stråk: vägarna är tabellen.
  assert.equal(sidor["data/datawrapper/hela-gotland.csv"].split("\n")[0], '"Väg","Halka","Vägbanan","Var"');
  for (const [namn, fil] of Object.entries(sidor)) if (namn.startsWith("data/datawrapper/") && namn.endsWith(".csv")) assert.ok(!fil.includes(";"), namn);
  assert.ok(!/[—!]/.test(Object.entries(sidor).filter(([n]) => n.startsWith("data/datawrapper/")).map(([, v]) => v).join("")), "inga långa tankstreck eller utropstecken");
});

test("ortssidorna (6/11, DECISIONS #807): stationerna inom 30 km från orten, kallast först, i svaret, i en egen lista och i beskrivningen", () => {
  for (const o of ORTER) assert.ok(o.lat > 55 && o.lat < 70 && o.lon > 10 && o.lon < 25, `${o.namn}: koordinaten i Sverige`);
  const boras = ORTER.find((o) => o.namn === "Borås")!;
  const stationer = [
    { name: "Kila", yta: -3.4, fukt: false, lan: 14, vag: "Väg 40", lon: 13.05, lat: 57.75 },          // ~7 km
    { name: "Viared", yta: -1.3, fukt: true, lan: 14, vag: "Väg 40", lon: 12.85, lat: 57.70 },         // ~6 km
    { name: "Ulricehamn", yta: 0.8, fukt: false, lan: 14, vag: "Väg 40", lon: 13.4, lat: 57.79 },       // ~28 km
    { name: "Nysäter", yta: -3.0, fukt: false, lan: 14, vag: "E 20", lon: 13.0, lat: 58.4 },            // ~76 km: länets kallaste, inte ortens
    { name: "Utan plats", yta: -9, fukt: false, lan: 14, vag: null },                                    // ingen koordinat: räknas inte
  ];
  const nara = lsNaraStationer(boras, stationer);
  assert.deepEqual(nara.map((s) => s.name), ["Kila", "Viared", "Ulricehamn"], "inom 30 km, kallast först, utan koordinat utanför");
  assert.equal(lsNaraStationer(boras, stationer, 5).length, 0, "radien räknas");
  const vaglag = [
    { code: 1, text: "Normalt", info: ["fläckvis Våt"], road: "Väg 40", plats: "Väg 40 Borås - Bollebygd", lan: 14 },
    { code: 1, text: "Normalt", info: ["fläckvis Våt"], road: "Väg 41", plats: "Väg 41 Borås - Kinna", lan: 14 },
    { code: 1, text: "Normalt", info: [], road: "E 20", plats: "E 20 Alingsås - Vårgårda", lan: 14 },
  ];
  const sidor = byggLanssidor({ vaglag, stationer, olyckor: [], now: NOW });
  const sida = sidor["ort/boras/index.html"];
  assert.ok(sida.includes("Kl. 07:30 rapporterar Trafikverket ingen halka på 2 vägavsnitt till och från Borås. Men 2 vägväderstationer inom 30 km från Borås visar vägbana på 0 °C eller kallare, kallast −3,4 °C vid Kila."), "svaret: Trafikverkets ord, sedan stationerna runt orten");
  assert.ok(sida.includes("<h2>Vägbanan runt Borås just nu</h2>"));
  assert.match(sida, /<li>Kila: −3,4 °C<\/li>\n<li>Viared: −1,3 °C, nederbörd eller fukt rapporteras<\/li>\n<li>Ulricehamn: 0,8 °C<\/li>/, "listan kallast först, bara inom 30 km");
  assert.ok(!sida.includes("<li>Nysäter"), "länets kallaste 76 km bort står inte i ortens lista");
  assert.ok(sida.includes("4 mätstationer visar vägbana på 0 °C eller kallare, kallast −9,0 °C vid Utan plats. Mer på"), "länets mening under Hela Västra Götaland räknar som förut: alla länets stationer, även utan koordinat");
  assert.ok(sida.includes('content="Kl. 07:30: ingen halka på 2 vägavsnitt till och från Borås, vägbanan −3,4 °C vid Kila. '), "beskrivningen bär stationen");
  // Halka rapporterad: ingen "Men". Inga stationer under noll: den kallaste nämns. Ingen station inom 30 km: länets mening som förut.
  const halt = byggLanssidor({ vaglag: vaglag.map((v) => ({ ...v, code: 2, text: "Besvärligt", info: ["Is"] })), stationer, olyckor: [], now: NOW })["ort/boras/index.html"];
  assert.ok(halt.includes("till och från Borås. 2 vägväderstationer inom 30 km från Borås visar"));
  const varm = byggLanssidor({ vaglag, stationer: stationer.map((s) => ({ ...s, yta: Math.abs(s.yta) })), olyckor: [], now: NOW })["ort/boras/index.html"];
  assert.ok(varm.includes("Ingen av de 3 vägväderstationerna inom 30 km från Borås visar vägbana på 0 °C eller kallare; den kallaste, Ulricehamn, visar 0,8 °C."));
  assert.ok(varm.includes('content="Kl. 07:30: ingen halka på 2 vägavsnitt till och från Borås. '), "ingen station i beskrivningen när ingen ligger under noll");
  const ensam = byggLanssidor({ vaglag, stationer: stationer.slice(2, 3), olyckor: [], now: NOW })["ort/boras/index.html"];
  assert.ok(ensam.includes("Vägväderstationen inom 30 km från Borås, Ulricehamn, visar vägbana på 0,8 °C."));
  const utan = byggLanssidor({ vaglag, stationer: stationer.slice(3), olyckor: [], now: NOW })["ort/boras/index.html"];
  assert.ok(utan.includes("till och från Borås. I Västra Götaland visar 2 mätstationer vägbana på 0 °C eller kallare, kallast −9,0 °C vid Utan plats."), "utan stationer inom 30 km: länets mening");
  assert.ok(utan.includes(`Ingen av Trafikverkets vägväderstationer ligger inom ${LS_NARA_KM} km från Borås.`));
});

test("startsidan och kartan i HTML (6/11, DECISIONS #807): samma tal som sidornas skript, i samma element, bara det som ändras", () => {
  const vader = [
    { land: "SE", name: "1234 Kila Yta", yta: -3.4, luft: -2 }, { land: "SE", name: "Viared", yta: -1.3, luft: null },
    { land: "SE", name: "Varm", yta: 2.5, luft: 3 }, { land: "SE", name: "Trasig", yta: -49, luft: 1 },   // rimlig: skillnad ≥ 15 °C
    { land: "FI", name: "Rovaniemi", yta: -20, luft: -19 }, { land: "SE", name: "Tom", yta: null, luft: null },
  ];
  const vaglag = [{ code: 2, info: ["Is"] }, { code: 1, info: ["fläckvis Våt"] }, { code: 1, info: ["Nysnö"] }, { code: null, info: [] }];
  const lan = [{ kort: "Skåne", slug: "skane", halt: 1, vagavsnitt: 9 }, { kort: "Värmland", slug: "varmland", halt: 3, vagavsnitt: 4 }, { kort: "Gotland", slug: "gotland", halt: 0, vagavsnitt: 2 }];
  const t = lsStartsida({ vader, vaglag, lan, now: NOW });
  assert.equal(t["h-tid"], "Just nu · fredag 20 nov · 07:30");
  assert.equal(t["t-tid"], "Hela landet · 07:30");
  assert.equal(t["k-tid"], "Livekartan · uppdaterad 07:30");
  assert.equal(t["l-mening"], "Halka eller vinterväglag på 4 sträckor, i Värmland och Skåne. 2 stationer under noll. Kallast vid Kila.");
  assert.equal(t["halt-lista"], '<a class="lan-halt" href="lan/varmland/" title="Halka eller vinterväglag på 3 av 4 vägavsnitt">Värmland · 3</a>' +
    '<a class="lan-halt" href="lan/skane/" title="Halka eller vinterväglag på 1 av 9 vägavsnitt">Skåne · 1</a><a class="lank-mono" href="lan/">Alla 21 län →</a>');
  assert.equal(t["t-halka"], "2", "arHalt som startsidan: kod 2 och Nysnö, inte fläckvis Våt");
  assert.equal(t["t-kalla"], "2"); assert.equal(t["t-av"], "av 3 stationer", "SE, rimlig och med yta: Trasig, Rovaniemi och Tom räknas inte");
  assert.equal(t["k-varma"], "1"); assert.equal(t["t-kallast"], "−3,4 °C"); assert.equal(t["t-plats"], "vid Kila");
  const lugn = lsStartsida({ vader: vader.slice(2, 3), vaglag: [{ code: 1, info: [] }], lan: lan.map((l) => ({ ...l, halt: 0 })), now: NOW });
  assert.equal(lugn["l-mening"], "Trafikverket rapporterar ingen halka just nu. Ingen station under noll. Kallast vid Varm, 2,5 °C.");
  assert.ok(lugn["halt-lista"].startsWith('<span class="lugnt">Ingen halka rapporterad just nu.</span>'));
  const k = lsKartsida({ vaglag, now: NOW });
  assert.deepEqual(k, { tid: "Uppdaterad 07:30", rader: "1 av 4 sträckor med halka eller vinterväglag." }, "kartan räknar kod över 1, som sidans halkMening");
  assert.deepEqual(lsKartsida({ vaglag: [], now: NOW }), { tid: "Uppdaterad 07:30" }, "utan sträckor rörs inte meningen");
  // medId: elementet med id:t, oavsett tagg och övriga attribut; samma innehåll ger null; okänt id ger null.
  const html = '<p class="etikett"><span class="ljus"></span><span id="h-tid">Just nu</span></p>\n<dd><b id="t-halka">–</b><span>sträckor</span></dd>';
  const ny = medId(html, "h-tid", t["h-tid"])!;
  assert.ok(ny.includes('<span id="h-tid">Just nu · fredag 20 nov · 07:30</span></p>'));
  assert.ok(medId(ny, "t-halka", "2")!.includes('<b id="t-halka">2</b><span>sträckor</span>'));
  assert.equal(medId(ny, "h-tid", t["h-tid"]), null);
  assert.equal(medId(html, "finns-inte", "x"), null);
});
