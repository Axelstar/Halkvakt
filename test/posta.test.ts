// Halkvakt live (kort #281): vilka län morgoninlägget tar med och hur texten låter.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore — .mjs utan typer
import { valjLan, rad, bildtext, rubrik, html } from "../marknadsforing/posta.mjs";

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

// ---------- Händelserna (DECISIONS #600) ----------
// @ts-ignore — .mjs utan typer
import { valjHandelse, nyHistorik, lagg, sparr, pass } from "../marknadsforing/posta.mjs";

const L = (kod: number, kort: string, halt: number, kalla: number, yta: number | null = null) =>
  ({ kod, kort, slug: kort.toLowerCase(), halt, vagavsnitt: 40, kalla, kallast: yta === null ? null : { namn: "Station " + kort, yta }, olyckor: 0 });
const lanVid = (nu: string, lan: any[]) => Object.assign(lan, { generatedAt: nu });
const sedda = (h: any, ...kod: number[]) => ({ ...h, forsta: Object.fromEntries(kod.map(k => [k, "2026-10-09"])) });
const MORGON = "2026-11-12T05:50:00Z", LUNCH = "2026-11-12T11:50:00Z", KVALL = "2026-11-12T16:50:00Z";
const bas = (nu: string) => lanVid(nu, [L(25, "Norrbotten", 5, 4, -2), L(1, "Stockholms län", 0, 0)]);
const hist = (nu: string) => sedda(nyHistorik(nu, null, bas(nu)), 25);
const snofall = { smhi_vinter: [{ event: "Snöfall", niva: "Gul", niva_kod: "YELLOW", omrade: "Norrbottens län" }] };

test("passen följer svensk tid", () => {
  assert.deepEqual([MORGON, LUNCH, KVALL].map(pass), ["morgon", "lunch", "kvall"]);
});

test("morgonen utan händelse ger listan; lunch och kväll är tysta", () => {
  assert.equal(valjHandelse(MORGON, bas(MORGON), null, hist(MORGON), {})?.typ, "lista");
  assert.equal(valjHandelse(LUNCH, bas(LUNCH), null, hist(LUNCH), {}), null);
  assert.equal(valjHandelse(KVALL, bas(KVALL), null, hist(KVALL), {}), null);
});

test("SMHI-varning för snö vinner över höstens första; vind till havs räknas inte", () => {
  const lan = lanVid(LUNCH, [L(23, "Jämtland", 3, 0), ...bas(LUNCH)]);
  assert.equal(valjHandelse(LUNCH, lan, snofall, hist(LUNCH), {})?.typ, "smhi");
  const hav = { smhi_vinter: [{ event: "Medelvind till havs", niva: "Gul", niva_kod: "YELLOW", omrade: "Norra Östersjön" }] };
  assert.equal(valjHandelse(LUNCH, lan, hav, hist(LUNCH), {})?.typ, "forsta");
});

test("höstens första: bara län som inte setts, och första körningen påstår ingen första gång", () => {
  const lan = lanVid(MORGON, [L(23, "Jämtland", 3, 0), ...bas(MORGON)]);
  const h = valjHandelse(MORGON, lan, null, hist(MORGON), {});
  assert.equal(h?.typ, "forsta");
  assert.match(h.text, /^I natt kom höstens första halka i Jämtland\./);
  assert.equal(valjHandelse(MORGON, lan, null, nyHistorik(MORGON, null, lan), {})?.typ, "lista");
});

test("stor förändring: fördubbling med minst +10, eller två nya län; samma tid i går krävs", () => {
  const igar = "2026-11-11T11:50:00Z";
  const h = lagg(hist(igar), igar, lanVid(igar, [L(25, "Norrbotten", 6, 4, -2), L(24, "Västerbotten", 0, 0), L(22, "Västernorrland", 0, 0)]));
  const h2 = sedda(h, 25, 24, 22);
  const vaxt = lanVid(LUNCH, [L(25, "Norrbotten", 17, 9, -2)]);
  assert.equal(valjHandelse(LUNCH, vaxt, null, h2, {})?.typ, "forandring");
  const lite = lanVid(LUNCH, [L(25, "Norrbotten", 15, 9, -2)]);   // 15 < 2 × 6 + … : fördubblat men bara +9
  assert.equal(valjHandelse(LUNCH, lite, null, h2, {}), null);
  const nya = lanVid(LUNCH, [L(25, "Norrbotten", 6, 4, -2), L(24, "Västerbotten", 1, 0), L(22, "Västernorrland", 1, 0)]);
  assert.equal(valjHandelse(LUNCH, nya, null, h2, {})?.typ, "forandring");
  assert.equal(valjHandelse(LUNCH, vaxt, null, sedda(hist(LUNCH), 25), {}), null);   // ingen bild från i går
});

test("höstens kallaste: minst 0,5 °C under förra lägsta och högst −3 °C, utan avstånd i texten", () => {
  const h = { ...hist(LUNCH), kallaste: { yta: -4, namn: "Allejaur", kort: "Norrbotten" } };
  const kall = lanVid(LUNCH, [L(25, "Norrbotten", 5, 4, -4.6)]);
  const v = valjHandelse(LUNCH, kall, null, h, {});
  assert.equal(v?.typ, "kallaste");
  assert.ok(!/\bkm\b|\bmeter\b|framför|längre fram/.test(v.text));
  assert.equal(valjHandelse(LUNCH, lanVid(LUNCH, [L(25, "Norrbotten", 5, 4, -4.4)]), null, h, {}), null);
  const mild = { ...h, kallaste: { yta: -2, namn: "X", kort: "Norrbotten" } };
  assert.equal(valjHandelse(LUNCH, lanVid(LUNCH, [L(25, "Norrbotten", 5, 4, -2.8)]), null, mild, {}), null);
});

test("veckan: söndag kväll med minst fem dagars historik", () => {
  const sondag = "2026-11-15T16:50:00Z";
  let h = hist("2026-11-09T16:50:00Z");
  for (let i = 0; i < 6; i++) {
    const t = new Date(Date.parse("2026-11-09T16:50:00Z") + i * 864e5).toISOString();
    h = lagg(h, t, lanVid(t, [L(25, "Norrbotten", i * 3, 2, -1 - i)]));
  }
  const tyst = lanVid(sondag, [L(25, "Norrbotten", 0, 0)]);
  assert.equal(valjHandelse(sondag, tyst, null, h, {})?.typ, "vecka");
  assert.equal(valjHandelse("2026-11-14T16:50:00Z", tyst, null, h, {}), null);   // lördag
});

test("spärrarna: tre per dygn, fyra timmar isär, samma nyckel inte inom 20 h", () => {
  const p = (tid: string, nyckel = "x") => ({ tid, nyckel, typ: "x" });
  assert.match(sparr({ "2026-11-12": [p("2026-11-12T00:10:00Z"), p("2026-11-12T04:20:00Z"), p("2026-11-12T08:30:00Z")] }, "2026-11-12T13:00:00Z"), /redan 3/);
  assert.match(sparr({ "2026-11-12": [p("2026-11-12T08:30:00Z")] }, LUNCH), /mindre än 4 h/);
  assert.equal(sparr({ "2026-11-12": [p("2026-11-12T05:50:00Z")] }, LUNCH), null);
  const lan = lanVid(LUNCH, [L(23, "Jämtland", 3, 0), ...bas(LUNCH)]);
  const igar = { "2026-11-11": [{ tid: "2026-11-11T20:00:00Z", nyckel: "forsta:23", typ: "forsta" }] };
  assert.equal(valjHandelse(LUNCH, lan, null, hist(LUNCH), igar), null);
  // 16/10 skrevs ett enda kvitto per dag, inte en lista; det läses fortfarande
  assert.equal(valjHandelse(MORGON, bas(MORGON), null, hist(MORGON), { "2026-11-12": { tid: "2026-11-12T00:30:00Z" } }), null);
  // 17/10: gårdagens kvällsinlägg kl. 22 tystade morgonlistan. Listan spärras bara av en lista samma dag.
  assert.equal(valjHandelse(MORGON, bas(MORGON), null, hist(MORGON), { "2026-11-11": { tid: "2026-11-11T21:14:00Z" } })?.typ, "lista");
});

test("App Store-länken står i Facebook-texten, inte i Instagram-texten", () => {
  const alla = [l("A", 1, 0)];
  assert.match(bildtext(alla, "2026-11-12T05:30:00Z"), /https:\/\/apps\.apple\.com\/se\/app\/halkvakt\/id6806939784/);
  assert.ok(!bildtext(alla, "2026-11-12T05:30:00Z", "instagram").includes("apps.apple.com"));
});

test("varje inlägg säger att Halkvakt är oberoende och var siffrorna kommer från", () => {
  const t = bildtext([l("A", 1, 0)], "2026-11-12T05:30:00Z");
  assert.match(t, /Halkvakt är en oberoende app och sajt, inte en del av Trafikverket\. Siffrorna kommer från Trafikverkets öppna data\./);
});

test("varje inlägg slutar med #halkvakt, på båda kanalerna (DECISIONS #622)", () => {
  for (const kanal of ["facebook", "instagram"]) {
    const sista = bildtext([l("A", 1, 0)], "2026-11-12T05:30:00Z", kanal).trim().split("\n").at(-1);
    assert.match(sista, /^#halka #väglag .*#halkvakt$/);
  }
});

// Bilden följer Varumärkesguide 1.0 (DECISIONS #626): gult bara som yta för en fara som är live, aldrig som text.
test("bilden: gul yta bara för SMHI-varning och höstens första, inga andra färger, ingen vikt 700", () => {
  const lan = [l("Norrbotten", 4, 6, { kallast: { namn: "Avvakko", yta: -3.4 } })];
  const morgon = html({ typ: "lista", etikett: "Halkläget kl. 06:45", rubrik: "Halt i morse", underrad: "lördag 17 oktober", lan });
  const smhi = html({ typ: "smhi", etikett: "SMHI-varning", rubrik: "Varning för väglaget", underrad: "Halkläget kl. 06:45",
    varning: { niva: "Gul varning", event: "Halka", omrade: "Norrbottens län", fler: 0 }, lan });
  const kall = html({ typ: "kallaste", etikett: "Höstens kallaste", rubrik: "Kallaste vägbanan i höst", underrad: "Avvakko",
    lyft: { stort: "−8,4°", liten: "på vägbanan" }, lan });
  assert.match(smhi, /<body class="live">/);
  for (const b of [morgon, kall]) {
    assert.match(b, /<body class="">/);
    assert.ok(!/color:\s*(#FFC94A|var\(--gul\))/i.test(b), "gult som textfärg");
  }
  for (const b of [morgon, smhi, kall]) {
    assert.ok(!/9AD8FF/i.test(b), "isblått finns inte i guiden");
    assert.ok(!/font:\s*700|font-weight:\s*700/.test(b), "rubriker är 600");
    assert.ok(!b.includes("—"), "inga långa tankstreck");
  }
});
