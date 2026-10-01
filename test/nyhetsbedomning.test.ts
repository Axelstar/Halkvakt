// Nyhetsbedömningen (DECISIONS #149): prövas mot VERKLIGA poster ur SMHI:s öppna data-RSS,
// lästa 12/9 2026, plus påhittade poster som är vad de verkliga ännu inte varit.
//
// Den viktigaste regeln som bevisas här: "RÖR OSS INTE" kräver positivt bevis. Inga träffar
// på våra nyckelord räcker inte — då blir svaret VET INTE. Annars hade bedömningen tystat
// precis den post ingen förutsett.
import { test } from "node:test";
import assert from "node:assert/strict";
import { avkoda, bedom, norm, nyText } from "../publish/nyhetsbedomning.ts";
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

// ── KALIBRERING MOT VERKLIGHETEN ──────────────────────────────────────────────────────────
// En torrkörning 12/9 mot flödets 24 verkliga poster gav TVÅ röda, och båda var falska:
// nyckelordet "öppna data" matchade kanalens NAMN i stället för dess innehåll. Testerna
// nedan låser fast rättningen — ett nyckelord som matchar rubriken på varje post i en feed
// är en falsklarmsmaskin, och falska röda äter upp förtroendet för de äkta.
test("verklig post: 'webbinarie för användare av öppna data' får INTE bli röd", () => {
  const b = bedom("trv-rss", "Välkommen på Trafikverkets webbinarie för användare av öppna data", KARTAN);
  assert.notEqual(b.grad, "RÖR OSS");
});

test("verklig post: 'lättare att söka efter Trafikverkets Öppna data' får INTE bli röd", () => {
  const b = bedom("trv-rss", "Nu är det lättare för våra kunder att söka efter Trafikverkets Öppna data", KARTAN);
  assert.notEqual(b.grad, "RÖR OSS");
});

test("verklig post: 'Förändringar i NetInfo-tjänster' är en annan produkt", () => {
  assert.equal(bedom("trv-rss", "Förändringar i NetInfo-tjänster", KARTAN).grad, "RÖR OSS INTE");
});

test("NVDB tystas INTE — data på väg in i Öppet API vore vår sak", () => {
  // Medvetet gul, inte vit. Regel 2: tveksamma fall läses, de tystas inte.
  const b = bedom("trv-rss", "NVDB vägdata tillgängliga i Trafikverkets Datautbytesportal för användning i Öppet API", KARTAN);
  assert.equal(b.grad, "VET INTE");
});

// Issue #639 och #638 (28/9): polisens sidor fick ny kakbanner och ny sidfot. Texten kommer som den
// bevakningen ser den — å, ä och ö är mellanslag, eftersom entiteterna byts mot blanksteg. "api" i
// rubriken gjorde #639 röd; efter rättningen (DECISIONS #391) får ingen av dem bli röd.
test("verklig post: polisens kakbanner och sidfot får INTE bli röda (#638, #639)", () => {
  const banner = "API ver polisens h ndelser | Polisen Kakor p polisen.se P polisen.se anv nder vi n dv ndiga kakor f r att webbplatsen ska fungera ska s bra som m jligt.";
  const sidfot = "Granskad # september # Dela sidan Facebook X LinkedIn E-post Kontakt Kontakta polisen Polisstationer Pressrum Jobb Bli polis Lediga jobb";
  const regler = "Regler f r ppna data | Polisen Kakor p polisen.se P polisen.se anv nder vi n dv ndiga kakor f r att webbplatsen ska fungera ska s bra som m jligt.";
  assert.notEqual(bedom("polisen-api", banner, KARTAN).grad, "RÖR OSS");
  assert.notEqual(bedom("polisen-api", sidfot, KARTAN).grad, "RÖR OSS");
  assert.notEqual(bedom("polisen-regler", regler, KARTAN).grad, "RÖR OSS");
});

test("en äkta ändring i polisens fält blir fortfarande röd", () => {
  // Kontrollen att rättningen inte gjorde vakten blind: fälten vi läser ska fyra.
  assert.equal(bedom("polisen-api", "Fältet location.gps byter format", KARTAN).grad, "RÖR OSS");
  assert.equal(bedom("polisen-api", "Nytt format för datetime i svaret", KARTAN).grad, "RÖR OSS");
});

test("en äkta ändring drunknar inte i rättningen", () => {
  // Kontrollen att fixen inte gjorde vakten blind: de riktiga orden ska fortfarande fyra.
  assert.equal(bedom("trv-rss", "Ny schemaversion för WeatherMeasurepoint", KARTAN).grad, "RÖR OSS");
  assert.equal(bedom("trv-rss", "Ändrat väglag i RoadCondition", KARTAN).grad, "RÖR OSS");
});

// ── ORDGRÄNSEN ────────────────────────────────────────────────────────────────────────────
// Rak delsträngsmatchning gjorde korta nyckelord till falsklarmsmaskiner. Samma fälla som
// motorns "fläckvis Våt" en gång var, och samma lösning: lookbehind på ordbörjan.
test("korta nyckelord får inte träffa inuti andra ord", () => {
  // "location" finns i "relocation", "cap" i "kapacitet", "station" i "poliststation" — inget av dem
  // är en API-ändring. (Polisens exempel var "api" i "rapid" till 28/9, då "api" togs bort ur
  // nyckelorden, DECISIONS #391 — provet bytte ord men inte syfte.)
  assert.equal(bedom("polisen-regler", "Relocation of our servers", KARTAN).traffar.length, 0);
  assert.equal(bedom("smhi-uppdateringar", "Ökad kapacitet i våra system", KARTAN).traffar.length, 0);
});

test("men ordbörjan räcker — prefix ska fortfarande träffa", () => {
  // Utan det här hade "pmp" inte matchat PMP3, som är precis vad SMHI kallade API:et.
  assert.ok(bedom("smhi-uppdateringar", "API för PMP3 avvecklas", KARTAN).frammande.includes("pmp"));
  assert.ok(bedom("smhi-uppdateringar", "Radarprodukten byter namn", KARTAN).traffar.length, "radar- ska träffa");
});

test("hela ord träffar som förut", () => {
  assert.equal(bedom("polisen-regler", "Nytt krav på user-agent i vårt API", KARTAN).grad, "RÖR OSS");
});

// ── STYCKEGRÄNSEN (kort #261, 28/9) ───────────────────────────────────────────────────────
// Normaliserad HTML har få meningsslut: rubrik, meny och cookiebanner blev EN körning, och ett
// ändrat ord var som helst i den gjorde HELA körningen ny — rubriken inräknad. Uppmätt skarpt:
// "myndighet" försvann ur polisens cookietext, rubriken "API över polisens händelser" följde med,
// och posten dömdes RÖR OSS på ett ord som står permanent på sidan.
test("ett ändrat ord i cookietexten får inte republicera rubriken", () => {
  const gammal = "API över polisens händelser | Polisen Kakor på polisen.se På polisen.se använder"
    + " vi nödvändiga kakor från vår myndighet för att webbplatsen ska fungera så bra som möjligt.";
  const ny = gammal.replace(" från vår myndighet", "");
  const nya = nyText(gammal, ny);
  assert.ok(!nya.some((m) => /(?<![a-zåäöé0-9])api/i.test(m)),
    `rubriken följde med in i det nya: ${JSON.stringify(nya)}`);
  assert.ok(nya.length, "ändringen ska fortfarande synas — larmet får inte tystna");
});

test("motprov: en äkta ny mening räknas fortfarande som ny", () => {
  // Utan det här kunde delningen ha gjorts så fin att ingenting någonsin blev nytt.
  const gammal = "Vi publicerar öppna data om trafik. Sidan uppdateras löpande.";
  const ny = gammal + " API:et för väglag byter schemaversion i november.";
  assert.ok(nyText(gammal, ny).some((m) => /schemaversion/.test(m)));
});

// ── ORDET SOM VAR FÖR BRETT (kort #261) ───────────────────────────────────────────────────
test("hydrologiska observationer är inte våra observationer", () => {
  // 28/9 dömdes "Arkivdata-API för hydrologiska observationer fungerar igen" RÖR OSS på ordet
  // "observation". Vi läser metobs — meteorologiska.
  // POÄNGEN: ordet *hydrolog* stod REDAN som främmande ord på signalraden — kunskapen fanns. Men
  // en träff rankar över ett främmande ord i graderingen, så det för breda "observation" tystade
  // det som var rätt. När det breda ordet ströks fick den befintliga kunskapen göra sitt jobb, och
  // domen blev ⚪ i stället för 🔴. Larmet går ut som förut; bara graden och skälet ändras.
  const d = bedom("smhi-uppdateringar", "Arkivdata-API för hydrologiska observationer fungerar igen", KARTAN);
  assert.equal(d.grad, "RÖR OSS INTE");
  assert.equal(d.traffar.length, 0);
  assert.ok(d.frammande.includes("hydrolog"), "skälet ska namnges, inte bara graden");
});

test("motprov: en äkta metobs-post träffar fortfarande", () => {
  assert.equal(bedom("smhi-uppdateringar", "Ändrat format i metobs latest-months", KARTAN).grad, "RÖR OSS");
  assert.equal(bedom("smhi-uppdateringar", "Meteorologiska observationer får ny parameter", KARTAN).grad, "RÖR OSS");
});

// ── Entiteterna (kort #264, DECISIONS #413) ─────────────────────────────────────────────────
// Polisen.se kodar å, ä och ö som entiteter. Vakten strök dem förut och läste "API ver polisens
// h ndelser" — ett nyckelord med å/ä/ö kunde aldrig träffa på en sådan sida.
test("en polissida med entiteter läses med å, ä och ö intakta", () => {
  const html = "<html><head><title>API &ouml;ver polisens h&auml;ndelser | Polisen</title><style>p{}</style></head>"
    + "<body><script>var x=1;</script><h1>API &#246;ver polisens h&#xE4;ndelser</h1><p>Regler f&ouml;r &ouml;ppna data &amp; villkor&nbsp;h&auml;r.</p></body></html>";
  const text = norm(html);
  assert.ok(text.includes("API över polisens händelser"), text);
  assert.ok(text.includes("Regler för öppna data & villkor här."), text);
  assert.ok(!/[<>]/.test(text), "inga taggar kvar");
});

test("ett svenskt nyckelord med ö träffar en entitetskodad sida", () => {
  const kartan = [{ vard: "x.se", roll: "produktion", matar: "", brister: "fältet", bevakad: "x-sida", signal: "", nyckelord: ["förändring"] }] as any;
  const text = norm("<p>En f&ouml;r&auml;ndring av f&auml;lten fr&aring;n 1 november.</p>");
  const b = bedom("x-sida", text, kartan);
  assert.equal(b.grad, "RÖR OSS");
  assert.deepEqual(b.traffar[0]?.ord, ["förändring"]);
});

test("motprov: samma sida med v1-normaliseringen (entiteter strukna) hade aldrig träffat", () => {
  const kartan = [{ vard: "x.se", roll: "produktion", matar: "", brister: "fältet", bevakad: "x-sida", signal: "", nyckelord: ["förändring"] }] as any;
  const v1 = "<p>En f&ouml;r&auml;ndring av f&auml;lten.</p>".replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  assert.equal(v1, "En f r ndring av f lten.");
  assert.equal(bedom("x-sida", v1, kartan).grad, "VET INTE");
});

test("avkodningen: numeriskt, hexadecimalt, okänd entitet blir blanksteg som förut, danska och norska tecken", () => {
  assert.equal(avkoda("&#229;&#xE5;&Aring;"), "ååÅ");
  assert.equal(avkoda("a&okandentitet;b"), "a b");
  assert.equal(avkoda("&#0;&#99999999;"), "  ", "ogiltiga kodpunkter blir blanksteg, inte krasch");
  assert.equal(avkoda("fr&oslash;&aelig;"), "frøæ");
  assert.equal(avkoda("&amp;lt;"), "&lt;", "avkodas en gång, inte två");
});
