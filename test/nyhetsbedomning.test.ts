// Nyhetsbedömningen (DECISIONS #149): prövas mot VERKLIGA poster ur SMHI:s öppna data-RSS,
// lästa 12/9 2026, plus påhittade poster som är vad de verkliga ännu inte varit.
//
// Den viktigaste regeln som bevisas här: "RÖR OSS INTE" kräver positivt bevis. Inga träffar
// på våra nyckelord räcker inte — då blir svaret VET INTE. Annars hade bedömningen tystat
// precis den post ingen förutsett.
import { test } from "node:test";
import assert from "node:assert/strict";
import { bedom, nyText } from "../publish/nyhetsbedomning.ts";
import { KARTAN, raderForKalla } from "../publish/beroenden.ts";

// ── VERKLIGA POSTER, ordagrant ur feeden 12/9 2026 ────────────────────────────────────────
test("SMHI 16/3 2026 'API för PMP3 avvecklas 31 mars' — rör oss INTE, och det ska bevisas", () => {
  const b = bedom("smhi-uppdateringar", "API för PMP3 avvecklas 31 mars", KARTAN);
  assert.equal(b.grad, "RÖR OSS INTE");
  assert.ok(b.frammande.includes("pmp"), "PMP3 ska kännas igen som främmande");
  assert.equal(b.traffar.length, 0);
  // Den ska ändå säga VAD källan täcker — läsaren får aldrig lämnas utan sammanhang.
  assert.equal(b.tackta.length, 3, "smhi-uppdateringar täcker varningar, radar och metobs");
});

test("SMHI 28/5 2026 'Nytt API för meteorologiska analyser' — analyser är inte vårt", () => {
  const b = bedom("smhi-uppdateringar", "Nytt API för meteorologiska analyser", KARTAN);
  assert.equal(b.grad, "RÖR OSS INTE");
  assert.ok(b.frammande.includes("analys"));
});

test("SMHI 12/9 2025 'Nya API:er för meteorologiska prognoser och analyser' — inte heller", () => {
  const b = bedom("smhi-uppdateringar", "Nya API:er för meteorologiska prognoser och analyser", KARTAN);
  assert.equal(b.grad, "RÖR OSS INTE");
});

test("SMHI 11/2 2025 'Uppdaterad portal för API-dokumentation' — VET INTE, inte 'rör oss inte'", () => {
  // Ingen träff på våra ord OCH inget känt främmande ord. Då är det enda ärliga svaret
  // att den måste läsas. Det här är regel 2 i modulens huvud.
  const b = bedom("smhi-uppdateringar", "Uppdaterad portal för API-dokumentation", KARTAN);
  assert.equal(b.grad, "VET INTE");
  assert.equal(b.frammande.length, 0);
});

// ── PÅHITTADE POSTER: det som skulle drabba oss ───────────────────────────────────────────
test("en SMHI-post om metobs träffar molnraden och namnger vad som brister", () => {
  const b = bedom("smhi-uppdateringar", "Ny version av metobs — parameter 16 byter enhet", KARTAN);
  assert.equal(b.grad, "RÖR OSS");
  const t = b.traffar.find((x) => x.vard.includes("metobs"));
  assert.ok(t, "metobs-raden ska träffa");
  assert.match(t!.brister, /R-A4/);
  assert.ok(b.rader.join(" ").includes("R-A4"), "issuet ska bära vad som brister");
});

test("en SMHI-post om vädervarningar träffar varningsraden — och grind F-A namnges", () => {
  const b = bedom("smhi-uppdateringar", "Ändrat format på vädervarningar i IBWW", KARTAN);
  assert.equal(b.grad, "RÖR OSS");
  assert.ok(b.traffar.some((t) => /F-A/.test(t.brister)));
});

test("en post kan träffa flera beroenden samtidigt", () => {
  const b = bedom("smhi-uppdateringar", "Radar och metobs får nya adresser", KARTAN);
  assert.equal(b.grad, "RÖR OSS");
  assert.equal(b.traffar.length, 2);
});

test("Trafikverket: en post om RoadCondition träffar huvudkällan", () => {
  const b = bedom("trv-rss", "Ny schemaversion för RoadCondition", KARTAN);
  assert.equal(b.grad, "RÖR OSS");
  assert.match(b.traffar[0].brister, /snapshoten/);
});

test("Trafikverket: en post om BanInfo är järnväg — främmande, inte vårt", () => {
  // Verklig post i TRV:s feed 19/5 2026: "Ny version av BanInfo".
  const b = bedom("trv-rss", "Ny version av BanInfo", KARTAN);
  assert.equal(b.grad, "RÖR OSS INTE");
  assert.ok(b.frammande.includes("baninfo"));
});

test("Digitraffic: en post om tågtrafik är främmande, en om väderstationer är vår", () => {
  assert.equal(bedom("fi-digitraffic", "New train API version released", KARTAN).grad, "RÖR OSS INTE");
  const v = bedom("fi-digitraffic", "Road weather station data format changes", KARTAN);
  assert.equal(v.grad, "RÖR OSS");
  assert.match(v.traffar[0].brister, /Finland/);
});

// ── HASH-KÄLLOR OCH TOMHET ────────────────────────────────────────────────────────────────
test("utan text finns ingen bedömning — men bristerna listas ändå", () => {
  const b = bedom("dk-dmi", "", KARTAN);
  assert.equal(b.grad, "VET INTE");
  assert.ok(b.rader.join(" ").includes("hash-vakt"), "skälet ska stå i klartext");
  assert.ok(b.rader.join(" ").includes("dk-arkivet"), "vad som brister ska stå där ändå");
});

test("en omvärldskälla rör per definition inget beroende", () => {
  const b = bedom("klimator", "Klimator lanserar ny tjänst", KARTAN);
  assert.equal(b.grad, "RÖR OSS INTE");
  assert.equal(b.tackta.length, 0);
  assert.ok(b.rader.join(" ").includes("omvärldskälla"));
});

test("en okänd källa ska inte krascha och inte påstå något", () => {
  const b = bedom("finns-inte", "vad som helst", KARTAN);
  assert.equal(b.tackta.length, 0);
  assert.equal(b.traffar.length, 0);
});

// ── KARTANS EGEN INTEGRITET ───────────────────────────────────────────────────────────────
test("varje källvaktskälla som täcker produktion kan slås upp i kartan", () => {
  for (const namn of ["trv-rss", "smhi-uppdateringar", "fi-digitraffic", "no-vegvesen", "dk-dmi", "polisen-regler", "polisen-api"]) {
    const rader = raderForKalla(KARTAN, namn);
    assert.ok(rader.length, `${namn} ska finnas i kartan`);
    assert.ok(rader.some((r) => r.roll === "produktion"), `${namn} ska täcka minst ett produktionsberoende`);
  }
});

test("sammansatt bevakning delas på plustecken, inte på hela strängen", () => {
  // "polisen-regler + polisen-api" är TVÅ källor på samma rad. En naiv jämförelse hade
  // gjort båda osynliga.
  assert.equal(raderForKalla(KARTAN, "polisen-regler").length, 1);
  assert.equal(raderForKalla(KARTAN, "polisen-api").length, 1);
  assert.equal(raderForKalla(KARTAN, "polisen-regler + polisen-api").length, 0);
});

// ── TEXTDIFFEN FÖR HASH-KÄLLOR ────────────────────────────────────────────────────────────
test("nyText returnerar bara det som tillkommit", () => {
  const gammal = "Detta är en gammal mening om ingenting alls. Och en till som står kvar.";
  const ny = "Detta är en gammal mening om ingenting alls. Och en till som står kvar. Radar-API:et byter adress den första januari.";
  const nya = nyText(gammal, ny);
  assert.equal(nya.length, 1);
  assert.match(nya[0], /Radar-API/);
});

test("nyText ger tom lista när ingenting tillkommit", () => {
  const t = "En mening som är tillräckligt lång för att räknas alls.";
  assert.deepEqual(nyText(t, t), []);
});

test("hash-källa MED textdiff kan bedömas på innehåll", () => {
  // Det här är poängen med att spara texten: annars vore varje hash-larm ett VET INTE.
  const nya = nyText(
    "Gammal text om ingenting som är tillräckligt lång för att räknas.",
    "Gammal text om ingenting som är tillräckligt lång för att räknas. Road weather station endpoints will change in November.");
  const b = bedom("fi-digitraffic", nya.join(" "), KARTAN);
  assert.equal(b.grad, "RÖR OSS");
  assert.match(b.traffar[0].vard, /digitraffic/);
});
