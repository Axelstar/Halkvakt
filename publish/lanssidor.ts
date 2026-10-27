// LÄNSSIDORNA (kort #281, DECISIONS #458) — "Halt väglag i Skåne just nu?" för de 21 länen, och "Halt väglag på E4 just nu?" för
// de stora vägarna, skrivna av publicera i kartlagrens varv (var 30:e minut) till kartsajten. Allt här blir PUBLIKT och läses av Google, så sidan säger bara vad källorna säger:
// Trafikverkets väglagsrapport med deras egna ord, vägbanans temperatur vid de stationer som klarar appens vakter, och pågående
// olyckor. Sidan påstår aldrig själv att det är halt.
//
// Ren och körtidsneutral som kartkärnan: inga importer, för scripts/bundle-publicera.ts klistrar in filen i publicera. Namnen får
// därför inte krocka med snapshot-core.ts eller map-core.ts.

/** Kartsajtens adress: halkvakt.se sedan 13/10 (Pages skickar github.io vidare). Kanoniska adresser och sitemapen följer härifrån. */
export const SIDBAS = "https://halkvakt.se";

// Det som får MOTORN att tala om en sträcka (engine.ts, evaluateSegment): kod ≥ 2 eller ett halkord. En kopia, vaktad av
// kontraktsgrinden ("Halkorden i MOTORN", "Halkstammarna i MOTORN") — sidan och rösten ska mena samma sak med halt.
const SLIPPERY_INFO = /(?<![a-zåäö])(is|halka|halkrisk|halkig|halt|mycket besvärligt)/i;
const SLIPPERY_STAM = /(snö|frost)/i;

export function arHalt(code: number | null, info: string[]): boolean {
  return (code != null && code >= 2) || info.some((i) => SLIPPERY_INFO.test(i) || SLIPPERY_STAM.test(i));
}

/** SCB:s länskoder, som Trafikverkets CountyNo. `kort` står i rubriken — så som folk söker. Stycket är skrivet för hand. */
export const LAN: { kod: number; namn: string; kort: string; slug: string; stycke: string }[] = [
  { kod: 1, namn: "Stockholms län", kort: "Stockholms län", slug: "stockholm",
    stycke: "I Stockholms län växlar vintern ofta kring noll grader. En klar natt kan vägbanan frysa före luften, och broar och påfarter på E4, E18 och E20 fryser först." },
  { kod: 3, namn: "Uppsala län", kort: "Uppsala län", slug: "uppsala",
    stycke: "Uppsala län har öppna slättvägar där blåst och snödrev kan göra väglaget sämre än temperaturen antyder. E4 och väg 55 går genom länet." },
  { kod: 4, namn: "Södermanlands län", kort: "Södermanland", slug: "sodermanland",
    stycke: "I Södermanland går E4 och E20 genom ett landskap med många sjöar, och fukten kan ge frost på vägbanan en kall morgon." },
  { kod: 5, namn: "Östergötlands län", kort: "Östergötland", slug: "ostergotland",
    stycke: "Östergötland har både slätten kring E4 och skogsbygden längre ut. Vägbanan kan frysa i sänkor och på broar före resten av vägen." },
  { kod: 6, namn: "Jönköpings län", kort: "Jönköpings län", slug: "jonkoping",
    stycke: "Jönköpings län ligger på det småländska höglandet, där vintern ofta kommer tidigare än vid kusten. E4 längs Vättern och väg 26, 27 och 40 korsar länet." },
  { kod: 7, namn: "Kronobergs län", kort: "Kronoberg", slug: "kronoberg",
    stycke: "Kronobergs län är skogsbygd med många mindre vägar, där isfläckar kan ligga kvar i skuggan länge efter att resten av vägen tinat." },
  { kod: 8, namn: "Kalmar län", kort: "Kalmar län", slug: "kalmar",
    stycke: "I Kalmar län går E22 längs kusten. Vintern är ofta mild där, men den växlar mellan regn och minusgrader, och då kan en blöt väg frysa." },
  { kod: 9, namn: "Gotlands län", kort: "Gotland", slug: "gotland",
    stycke: "Gotlands vintrar är milda, men öppna vägar och vind från havet kan ge snabba omslag mellan blött och fruset." },
  { kod: 10, namn: "Blekinge län", kort: "Blekinge", slug: "blekinge",
    stycke: "Blekinge har en mild kustvinter längs E22, där temperaturen ofta pendlar kring noll. En blöt väg kan frysa när det klarnar på kvällen." },
  { kod: 12, namn: "Skåne län", kort: "Skåne", slug: "skane",
    stycke: "Skånes vintrar är milda, och just därför pendlar temperaturen ofta kring noll grader. En blöt väg på E6, E22 eller väg 108 kan frysa på kort tid när det klarnar upp." },
  { kod: 13, namn: "Hallands län", kort: "Halland", slug: "halland",
    stycke: "Halland har milt kustklimat längs E6, men inåt landet stiger terrängen, och där kan vägen vara frusen medan kusten har plusgrader." },
  { kod: 14, namn: "Västra Götalands län", kort: "Västra Götaland", slug: "vastra-gotaland",
    stycke: "Västra Götaland är stort, och väglaget kan skilja sig mycket mellan kusten längs E6 och inlandet kring E20 och E45." },
  { kod: 17, namn: "Värmlands län", kort: "Värmland", slug: "varmland",
    stycke: "I Värmland kommer vintern tidigt i norr och i skogsbygden. E18, E45 och E16 går genom länet." },
  { kod: 18, namn: "Örebro län", kort: "Örebro län", slug: "orebro",
    stycke: "Örebro län har både slätten kring Örebro och skogsbygd i norr och väster, och väg 50, E18 och E20 kan ha olika väglag samma morgon." },
  { kod: 19, namn: "Västmanlands län", kort: "Västmanland", slug: "vastmanland",
    stycke: "Västmanland har slättbygd vid Mälaren och skogsbygd i norr. E18 och väg 56 och 70 går genom länet." },
  { kod: 20, namn: "Dalarnas län", kort: "Dalarna", slug: "dalarna",
    stycke: "Dalarna har lång vinter i fjällen och skogsbygden, och väg 70, E16 och E45 korsar länet. På höjderna och i dalgångarna kan vägbanan frysa tidigt på hösten." },
  { kod: 21, namn: "Gävleborgs län", kort: "Gävleborg", slug: "gavleborg",
    stycke: "I Gävleborg går E4 längs kusten och väg 83 och 84 inåt landet, där vintern ofta är kallare och kommer tidigare än vid kusten." },
  { kod: 22, namn: "Västernorrlands län", kort: "Västernorrland", slug: "vasternorrland",
    stycke: "Västernorrland har kuperad terräng längs E4 och Höga kusten, där backar och broar kan bli hala före resten av vägen." },
  { kod: 23, namn: "Jämtlands län", kort: "Jämtland", slug: "jamtland",
    stycke: "Jämtland har lång vinter och fjällvägar längs E14 och E45, där väglaget kan ändras snabbt med höjden." },
  { kod: 24, namn: "Västerbottens län", kort: "Västerbotten", slug: "vasterbotten",
    stycke: "Västerbotten sträcker sig från kusten vid E4 till fjällen längs E12. Vintern är lång, och omslagen kring noll grader på hösten och våren ger ofta halkan." },
  { kod: 25, namn: "Norrbottens län", kort: "Norrbotten", slug: "norrbotten",
    stycke: "Norrbotten har landets längsta vinter, med E4, E10 och E45 genom länet. Kylan är vanlig här, och halkan kommer ofta när det blir mildare och snön eller isen blir blöt." },
];

/** De stora vägarna (planens §6). Stycket är skrivet för hand och säger bara var vägen går. */
export const VAGAR: { nyckel: string; namn: string; rubrik: string; slug: string; stycke: string }[] = [
  { nyckel: "e4", namn: "E4", rubrik: "E4", slug: "e4",
    stycke: "E4 går från Helsingborg via Jönköping, Linköping, Stockholm, Gävle, Sundsvall, Umeå och Luleå till Haparanda, från mild kustvinter i söder till lång vinter i norr." },
  { nyckel: "e6", namn: "E6", rubrik: "E6", slug: "e6",
    stycke: "E6 går längs västkusten från Trelleborg via Malmö, Helsingborg, Halmstad och Göteborg till norska gränsen vid Svinesund." },
  { nyckel: "e18", namn: "E18", rubrik: "E18", slug: "e18",
    stycke: "E18 går från norska gränsen i Värmland via Karlstad, Örebro och Västerås till Stockholm och Kapellskär." },
  { nyckel: "e20", namn: "E20", rubrik: "E20", slug: "e20",
    stycke: "E20 går från Malmö via Göteborg, Skövde, Örebro och Eskilstuna till Stockholm." },
  { nyckel: "e22", namn: "E22", rubrik: "E22", slug: "e22",
    stycke: "E22 går längs sydostkusten från Trelleborg via Kristianstad, Karlskrona och Kalmar till Norrköping." },
  { nyckel: "40", namn: "Riksväg 40", rubrik: "riksväg 40", slug: "rv40",
    stycke: "Riksväg 40 går från Göteborg via Borås och Jönköping till Västervik." },
];

/** Pendlarstråken per län (25/10, DECISIONS #722). Skrivet för hand och säger bara var vägarna går och vilka orter de binder ihop;
 *  läget på vägarna står i listan ovanför, ur Trafikverkets rapport. */
export const PENDLING: Record<string, string> = {
  stockholm: "De stora pendlarstråken in mot Stockholm är E4 från Södertälje i söder och från Arlanda och Märsta i norr, E18 från Norrtälje och från Bålsta, E20 från Södertälje och Strängnäs, väg 73 från Nynäshamn och Haninge och väg 222 från Värmdö.",
  uppsala: "Från Uppsala pendlar många söderut på E4 mot Knivsta, Arlanda och Stockholm. Väg 55 går mot Enköping, riksväg 72 mot Sala och väg 288 mot Gimo och Östhammar. I söder går E18 förbi Bålsta mot Stockholm.",
  sodermanland: "E4 binder ihop Nyköping med Stockholm och Norrköping, och E20 går från Eskilstuna via Strängnäs mot Stockholm. Väg 53 går mellan Nyköping och Eskilstuna, och väg 55 och väg 52 går genom Katrineholm.",
  ostergotland: "E4 binder ihop Norrköping, Linköping och Mjölby. Riksväg 34 går från Linköping mot Motala, riksväg 50 från Mjölby mot Motala och Askersund, och riksväg 51 från Norrköping mot Finspång.",
  jonkoping: "E4 går genom Jönköping och Huskvarna, norrut mot Gränna och söderut mot Värnamo. Riksväg 40 går mot Borås i väster och mot Nässjö och Eksjö i öster, riksväg 26 mot Värnamo och Halmstad, och riksväg 47 mot Falköping.",
  kronoberg: "Från Växjö går riksväg 25 västerut mot Ljungby och österut mot Kalmar, riksväg 23 söderut mot Älmhult och Hässleholm, riksväg 27 mot Värnamo och Karlskrona, och riksväg 30 mot Jönköping. E4 går genom Ljungby.",
  kalmar: "E22 går längs kusten mellan Kalmar, Oskarshamn och Västervik. Riksväg 25 går från Kalmar via Nybro mot Växjö, och Ölandsbron förbinder Kalmar med Öland.",
  gotland: "På Gotland går de stora vägarna ut från Visby mot Slite, Hemse och Fårösund. Långa sträckor går över öppet land där blåsten kan göra väglaget sämre.",
  blekinge: "E22 binder ihop Karlskrona, Ronneby, Karlshamn och Sölvesborg. Riksväg 27 går från Karlskrona mot Växjö och riksväg 29 från Karlshamn mot Växjö.",
  skane: "E6 går mellan Malmö, Lund och Helsingborg, och E22 från Malmö och Lund via Hörby mot Kristianstad. E65 går mot Ystad, riksväg 11 mot Sjöbo och Tomelilla, riksväg 23 mot Höör och Hässleholm, och riksväg 21 mellan Helsingborg och Kristianstad.",
  halland: "E6 binder ihop Kungsbacka, Varberg, Falkenberg och Halmstad. Riksväg 41 går från Varberg mot Borås, riksväg 26 från Halmstad mot Jönköping och riksväg 25 från Halmstad mot Ljungby.",
  "vastra-gotaland": "Kring Göteborg går E6 norrut mot Kungälv och Uddevalla och söderut mot Kungsbacka. E20 går mot Alingsås och Skövde, riksväg 40 mot Borås och E45 mot Trollhättan och Vänersborg. Riksväg 44 går mellan Uddevalla, Trollhättan och Lidköping.",
  varmland: "E18 går genom Karlstad, österut mot Kristinehamn och västerut mot Grums och Årjäng. Riksväg 61 går mot Kil och Arvika, riksväg 62 norrut längs Klarälven och riksväg 63 mot Filipstad. E45 går genom Torsby.",
  orebro: "E18 och E20 går tillsammans från Örebro österut mot Arboga. E20 går söderut mot Hallsberg och E18 västerut mot Karlskoga. Riksväg 50 går norrut mot Lindesberg och riksväg 51 söderut mot Finspång.",
  vastmanland: "E18 går genom Västerås, österut mot Enköping och Stockholm och västerut mot Köping och Arboga. Riksväg 56 går mot Sala och riksväg 66 norrut.",
  dalarna: "E16 går mellan Falun och Borlänge och vidare mot Gävle och Malung. Riksväg 70 går från Borlänge mot Mora och söderut mot Avesta, och riksväg 50 går från Borlänge mot Ludvika.",
  gavleborg: "E4 binder ihop Gävle, Söderhamn och Hudiksvall. Riksväg 80 går från Gävle mot Sandviken och Falun, riksväg 83 från Bollnäs mot Ljusdal och riksväg 84 från Hudiksvall mot Ljusdal.",
  vasternorrland: "E4 binder ihop Sundsvall, Härnösand och Örnsköldsvik och går över Högakustenbron. E14 går från Sundsvall mot Östersund, och riksväg 90 går från Härnösand mot Kramfors och Sollefteå.",
  jamtland: "Från Östersund går E14 västerut mot Åre och österut mot Sundsvall, och E45 går söderut mot Svenstavik. Fjällvägarna kan ha vinterväglag långt in på våren.",
  vasterbotten: "E4 binder ihop Umeå och Skellefteå, och E12 går från Umeå inåt landet mot Lycksele.",
  norrbotten: "E4 binder ihop Luleå, Piteå och Kalix. E10 går från Luleå via Boden mot Gällivare och Kiruna, och riksväg 97 går från Boden mot Jokkmokk.",
};

/** Vägnumret utan form: väglaget skriver "E 4" och "Väg 40", olyckorna "E4" och "Väg 274". */
export const vagNyckel = (s: string | null) => (s ?? "").toLowerCase().replace(/\s+/g, "").replace(/^väg/, "");

export type LanSegment = { code: number | null; text: string | null; info: string[]; road: string | null; plats: string | null; lan: number | null };
export type LanStation = { name: string; yta: number; fukt: boolean; lan: number; vag?: string | null };
export type LanOlycka = { road: string | null; start: string | null; allvar: string | null; lan: number | null };

const lsEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lsGrad = (c: number) => `${c.toFixed(1).replace(".", ",").replace("-", "−")} °C`;
const lsTid = (d: Date, datum = true) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit", ...(datum ? { day: "numeric", month: "short" } : {}),
}).format(d);
const lsPlural = (n: number, en: string, flera: string) => `${n} ${n === 1 ? en : flera}`;

// Samma ram som resten av halkvakt.se (16/10): sajtens delade stil `assets/hv.css` i kartrepot plus det sidorna själva behöver.
const LS_STIL = `.dok{max-width:760px}.svar{font:500 19px/1.5 var(--sans);color:var(--text);background:var(--panel);border:1px solid var(--kant);border-radius:18px;padding:18px 22px;margin:18px 0 8px}
.dok nav p{line-height:2.1}.dok nav a{white-space:nowrap}.tabell{overflow-x:auto}.dok td+td,.dok th+th{white-space:nowrap;text-align:right}
.ladda{display:grid;gap:12px;background:var(--panel);border:1px solid var(--kant);border-radius:18px;padding:22px 24px;margin-top:44px}
.ladda b{font-size:19px}.ladda p{margin:0}.ladda .knapp{justify-self:start}
.dok a.knapp{color:var(--mark);text-decoration:none}
.svar-app{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;margin:0 0 8px}.svar-app p{margin:0;color:var(--text2);flex:1 1 280px}
.lankarta{position:relative;display:block;height:min(62vw,440px);margin:22px 0 6px;background:var(--panel);border:1px solid var(--kant);border-radius:18px;overflow:hidden}
.lankarta canvas{position:absolute;inset:0;width:100%;height:100%}.lankarta span{position:absolute;left:16px;bottom:12px;font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dampad)}
.vaglista{list-style:none;padding:0;margin:0}.vaglista li{padding:12px 0;border-top:1px dashed #253036}.vaglista li:first-child{border-top:0}
.vaglista b{font:600 13px var(--mono);letter-spacing:.08em;margin-right:10px}.vaglista .halt{color:var(--gul)}.vaglista small{display:block;color:var(--dampad);font-size:14px;margin-top:2px}
.fragor h3{font-size:17px;margin:20px 0 4px}.fragor p{margin:0}`;
// App Store med kampanjkod per knapp (27/10, DECISIONS #732), samma som sajtens övriga sidor.
const lsApp = (ct: string) => `https://apps.apple.com/se/app/halkvakt/id6806939784?ct=${ct}`;
const LS_MARKE = `<svg viewBox="3 3 94 83" aria-hidden="true"><path fill-rule="evenodd" fill="#FFC94A" d="M55.196 6 L96.196 77 A6 6 0 0 1 91 86 L9 86 A6 6 0 0 1 3.804 77 L44.804 6 A6 6 0 0 1 55.196 6 Z M46.4 32 L53.6 32 L52 58 L48 58 Z M45.6 68 A4.4 4.4 0 1 0 54.4 68 A4.4 4.4 0 1 0 45.6 68 Z"/></svg>`;

// Strukturerad data (17/10, DECISIONS #629): vad sidan är, när den skrevs och vilken data den bygger på, så att sökmotorer och
// AI-tjänster kan läsa tiden och källan utan att tolka texten.
function lsJsonLd(o: { titel: string; beskrivning: string; adress: string; now?: Date }): string {
  const d = { "@context": "https://schema.org", "@type": "WebPage", name: o.titel, description: o.beskrivning, url: o.adress, inLanguage: "sv-SE",
    ...(o.now ? { dateModified: o.now.toISOString() } : {}),
    isBasedOn: { "@type": "Dataset", name: "Trafikverkets öppna data: väglag, vägväderstationer och olyckor", license: "https://creativecommons.org/publicdomain/zero/1.0/" },
    publisher: { "@type": "Organization", name: "Halkvakt", url: `${SIDBAS}/` } };
  return `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`;
}

function lsSkal(o: { titel: string; beskrivning: string; adress: string; rot: string; innehall: string; ct: string; aktiv?: "lanen"; now?: Date; extra?: string }) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${lsEsc(o.titel)}</title>
<meta name="description" content="${lsEsc(o.beskrivning)}">
<link rel="canonical" href="${o.adress}">
<meta property="og:title" content="${lsEsc(o.titel)}">
<meta property="og:description" content="${lsEsc(o.beskrivning)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${o.adress}">
<meta property="og:locale" content="sv_SE">
<meta property="og:image" content="${SIDBAS}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="apple-itunes-app" content="app-id=6806939784">
<link rel="icon" type="image/png" href="${o.rot}favicon.png">
<link rel="stylesheet" href="${o.rot}assets/fonts/fonts.css">
<link rel="stylesheet" href="${o.rot}assets/hv.css?v=20261027">
<style>${LS_STIL}</style>
${lsJsonLd(o)}${o.extra ?? ""}
</head>
<body>
<header class="topp">
  <div class="wrap">
    <a class="logo" href="${o.rot}" aria-label="Halkvakt, till startsidan">${LS_MARKE}<b>HALKVAKT</b></a>
    <nav class="meny" aria-label="Huvudmeny">
      <a href="${o.rot}karta.html">Livekartan</a>
      <a href="${o.rot}lan/"${o.aktiv === "lanen" ? ' aria-current="page"' : ""}>Länen</a>
      <a href="${o.rot}#appen">Appen</a>
      <a href="${o.rot}om-halkvakt.html">Om Halkvakt</a>
    </nav>
    <a class="knapp" href="${lsApp("huvud")}">Hämta appen</a>
  </div>
</header>
<main class="wrap">
<div class="dok">
${o.innehall}
<div class="ladda"><b>Kör du här ofta?</b><p>Appen säger till med rösten innan du är framme vid halkan. Samma data som på den här sidan. Gratis för iPhone.</p><a class="knapp" href="${lsApp(o.ct)}">Få varningar i appen</a></div>
</div>
</main>
<footer class="fot">
  <div class="wrap">
    <a class="logo" href="${o.rot}">${LS_MARKE}<b>HALKVAKT</b></a>
    <p class="kallor">Källa: Trafikverkets öppna data (CC0): väglag, vägväderstationer och olyckor. Sidan skrivs om var 30:e minut. Fristående från myndigheterna.</p>
    <nav aria-label="Sidfot"><a href="${o.rot}lan/">Länen</a><a href="${o.rot}om-halkvakt.html">Om Halkvakt</a><a href="${o.rot}karta.html">Livekartan</a><a href="${o.rot}om.html">Vanliga frågor</a><a href="${o.rot}lan/#vagar">Stora vägar</a><a href="${o.rot}support.html">Hjälp och kontakt</a><a href="${o.rot}press.html">Press</a><a href="${o.rot}integritet.html">Integritet</a></nav>
  </div>
  <nav class="wrap lanrad" aria-label="Halka per län"><span>Halka i</span>${LAN.map((x) => `<a href="${o.rot}lan/${x.slug}/">${lsEsc(x.kort)}</a>`).join("")}</nav>
</footer>
<script src="/assets/besok.js" defer></script>
</body>
</html>
`;
}

type LanLage = { halt: LanSegment[]; vagavsnitt: number; kalla: LanStation[]; olyckor: LanOlycka[] };

function lsLage(kod: number, d: { vaglag: LanSegment[]; stationer: LanStation[]; olyckor: LanOlycka[] }): LanLage {
  const segs = d.vaglag.filter((s) => s.lan === kod);
  return {
    halt: segs.filter((s) => arHalt(s.code, s.info)),
    vagavsnitt: segs.length,
    kalla: d.stationer.filter((s) => s.lan === kod && s.yta <= 0).sort((a, b) => a.yta - b.yta),
    olyckor: d.olyckor.filter((o) => o.lan === kod),
  };
}

/** Svaret överst: vad källorna säger, med deras ord. `vems` = "länets" eller "E4:s", `var` = "i länet" eller "vid vägen". */
function lsSvar(l: LanLage, vems = "länets", var_ = "i länet", now?: Date): string {
  const vad = l.halt.length
    ? `halka eller vinterväglag på ${l.halt.length} av ${vems} ${l.vagavsnitt} vägavsnitt`
    : `ingen halka på ${vems} ${l.vagavsnitt} vägavsnitt just nu`;
  // Med klockslaget först (17/10, DECISIONS #629): en mening som en AI-tjänst eller en reporter kan citera som den står.
  const vag = now ? `Kl. ${lsTid(now, false)} rapporterar Trafikverket ${vad}.` : `Trafikverket rapporterar ${vad}.`;
  const temp = l.kalla.length
    ? `${lsPlural(l.kalla.length, "mätstation visar", "mätstationer visar")} vägbana på 0 °C eller kallare, kallast ${lsGrad(l.kalla[0].yta)} vid ${l.kalla[0].name}.`
    : `Ingen mätstation ${var_} visar vägbana under noll.`;
  return `${vag} ${temp}`;
}

/** Vägens läge: dess sträckor i alla län, stationerna vars närmaste sträcka är vägen, och olyckorna på den. */
function lsVagLage(nyckel: string, d: { vaglag: LanSegment[]; stationer: LanStation[]; olyckor: LanOlycka[] }): LanLage {
  const segs = d.vaglag.filter((s) => vagNyckel(s.road) === nyckel);
  return {
    halt: segs.filter((s) => arHalt(s.code, s.info)),
    vagavsnitt: segs.length,
    kalla: d.stationer.filter((s) => vagNyckel(s.vag ?? null) === nyckel && s.yta <= 0).sort((a, b) => a.yta - b.yta),
    olyckor: d.olyckor.filter((o) => vagNyckel(o.road) === nyckel),
  };
}

/** Sökträffens beskrivning med dagens siffror (25/10): klockslaget, halkan och kallaste stationen, sedan vad sidan visar. */
const LS_SLUT = "Trafikverkets väglag, vägtemperatur och olyckor, uppdaterat var 30:e minut.";
function lsBeskrivning(l: LanLage, plats: string, now: Date): string {
  const halt = l.halt.length
    ? `halka eller vinterväglag på ${l.halt.length} av ${l.vagavsnitt} vägavsnitt ${plats}`
    : `ingen halka på ${l.vagavsnitt} vägavsnitt ${plats}`;
  const kall = l.kalla.length ? `kallast ${lsGrad(l.kalla[0].yta)} vid ${l.kalla[0].name}` : "ingen mätstation under noll";
  return `Kl. ${lsTid(now, false)}: ${halt}, ${kall}. ${LS_SLUT}`;
}

const lsLanKort = (kod: number | null) => LAN.find((l) => l.kod === kod)?.kort ?? null;
const lsVagLankar = (rot: string) => VAGAR.map((v) => `<a href="${rot}vag/${v.slug}/">${lsEsc(v.namn)}</a>`).join(" · ");

function lsVagsida(vag: (typeof VAGAR)[number], l: LanLage, now: Date): string {
  const med = (lan: number | null, text: string) => { const k = lsLanKort(lan); return k ? `${lsEsc(k)}: ${text}` : text; };
  const halt = l.halt.slice(0, 20).map((s) =>
    `<li>${med(s.lan, `${lsEsc(s.plats ?? s.road ?? "Vägavsnitt")}: ${lsEsc([s.text, ...s.info].filter(Boolean).join(", "))}`)}</li>`).join("\n");
  const kalla = l.kalla.slice(0, 8).map((s) =>
    `<li>${med(s.lan, `${lsEsc(s.name)}: ${lsGrad(s.yta)}${s.fukt ? ", nederbörd eller fukt rapporteras" : ""}`)}</li>`).join("\n");
  const olyckor = l.olyckor.slice(0, 10).map((o) =>
    `<li>${med(o.lan, `${o.start ? `sedan ${lsTid(new Date(o.start))}` : "pågår"}${o.allvar ? ` (${lsEsc(o.allvar)})` : ""}`)}</li>`).join("\n");
  const andra = VAGAR.filter((x) => x.slug !== vag.slug).map((x) => `<a href="../${x.slug}/">${lsEsc(x.namn)}</a>`).join(" · ");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Är det halt på ${lsEsc(vag.rubrik)} just nu?</h1>
<p class="svar">${lsEsc(lsSvar(l, `${vag.namn}:s`, "vid vägen", now))}</p>
<h2>Väglaget enligt Trafikverket</h2>
${l.halt.length ? `<ul>\n${halt}\n</ul>${l.halt.length > 20 ? `\n<p class="dim">och ${l.halt.length - 20} till.</p>` : ""}`
    : `<p>Inget av vägens ${l.vagavsnitt} vägavsnitt har halka eller vinterväglag i Trafikverkets rapport.</p>`}
<h2>Vägbanans temperatur</h2>
${l.kalla.length ? `<p>Kallast just nu, vid de vägväderstationer som ligger närmast ${lsEsc(vag.namn)}:</p>\n<ul>\n${kalla}\n</ul>`
    : "<p>Ingen av vägväderstationerna vid vägen visar vägbana på 0 °C eller kallare.</p>"}
<h2>Pågående olyckor</h2>
${l.olyckor.length ? `<ul>\n${olyckor}\n</ul>` : `<p>Trafikverket rapporterar ingen pågående olycka på ${lsEsc(vag.rubrik)}.</p>`}
<h2>Om vägen</h2>
<p>${lsEsc(vag.stycke)}</p>
<p>Se hela landet på <a href="../../karta.html">livekartan</a>, eller <a href="../../lan/">läget i alla län</a>.</p>
<nav><h2>Andra vägar</h2><p>${andra}</p></nav>`;
  return lsSkal({
    titel: `Väglag ${vag.rubrik} idag: halka och trafikläget just nu | Halkvakt`,
    beskrivning: lsBeskrivning(l, `på ${vag.rubrik}`, now),
    adress: `${SIDBAS}/vag/${vag.slug}/`, rot: "../../", innehall, now, ct: "vag",
  });
}


/** Vägen som folk skriver den: "E 4" → "E4", "Väg 55" → "väg 55". */
const lsVagNamn = (r: string) => r.replace(/^E\s*(\d+)/, "E$1").replace(/^Väg\s*/, "väg ");
/** Sträckans namn utan vägnumret och Trafikverkets löpnummer: "E 4 .25 Knivsta - Arlanda" → "Knivsta–Arlanda". */
const lsStracka = (s: LanSegment) => (s.plats ?? "").replace(new RegExp("^" + (s.road ?? "").replace(/\s+/g, "\\s*") + "\\s*"), "")
  .replace(/^\.?\d+\s+/, "").replace(/\s+-\s+/g, "–").trim();
const lsVagOrdning = (r: string) => { const m = /^(E|Väg)\s*(\d+)/.exec(r); return m ? (m[1] === "E" ? 0 : 1000) + Number(m[2]) : 9999; };

/** Länets stora vägar just nu (25/10, DECISIONS #722): E-vägarna och riksvägarna, och varje annan väg med halka. Text, så att
 *  orterna i sträckornas namn går att söka på. */
function lsVagarILanet(kod: number, d: { vaglag: LanSegment[]; stationer: LanStation[] }): string {
  const segs = d.vaglag.filter((x) => x.lan === kod && x.road);
  const vagar = [...new Set(segs.map((x) => x.road as string))].sort((a, b) => lsVagOrdning(a) - lsVagOrdning(b));
  const rader = vagar.map((vag) => {
    const sv = segs.filter((x) => x.road === vag);
    const halt = sv.filter((x) => arHalt(x.code, x.info));
    const stor = /^E\s*\d/.test(vag) || lsVagOrdning(vag) < 1100;
    if (!stor && !halt.length) return "";
    const namn = [...new Set((halt.length ? halt : sv).map(lsStracka).filter(Boolean))].slice(0, 5);
    const st = d.stationer.filter((x) => x.lan === kod && vagNyckel(x.vag ?? null) === vagNyckel(vag)).sort((a, b) => a.yta - b.yta)[0];
    const lage = halt.length
      ? `<span class="halt">Halka eller vinterväglag på ${halt.length} av ${lsPlural(sv.length, "sträcka", "sträckor")}</span>`
      : `Ingen halka rapporterad på ${lsPlural(sv.length, "sträcka", "sträckor")}`;
    const temp = st ? ` · vägbanan ${lsGrad(st.yta)} vid ${lsEsc(st.name)}` : "";
    return `<li><b>${lsEsc(lsVagNamn(vag))}</b>${lage}${temp}${namn.length ? `<small>${lsEsc(namn.join(" · "))}</small>` : ""}</li>`;
  }).filter(Boolean).slice(0, 14);
  return rader.length ? `<ul class="vaglista">\n${rader.join("\n")}\n</ul>` : "<p>Trafikverket rapporterar inget väglag för länets stora vägar just nu.</p>";
}

/** Vanliga frågor (25/10, DECISIONS #722): synliga på sidan och som FAQPage. Svaren säger bara vad sidan och appen gör. */
function lsFragor(namn: string): { fraga: string; svar: string }[] {
  return [
    { fraga: `Hur ofta uppdateras väglaget i ${namn}?`, svar: "Sidan skrivs om var 30:e minut med Trafikverkets senaste väglagsrapport, vägbanans temperatur vid vägväderstationerna och pågående olyckor." },
    { fraga: "Vad räknas som halka på sidan?", svar: "En sträcka räknas som hal när Trafikverkets väglagsrapport anger besvärligt väglag eller nämner is, snö, frost eller halka. Det är samma regel som får appen att varna." },
    { fraga: "Var mäts vägbanans temperatur?", svar: "Vid Trafikverkets vägväderstationer längs de större vägarna. Mellan stationerna mäts ingenting, så vägen kan vara kallare eller varmare där." },
    { fraga: "Kan jag få en varning medan jag kör?", svar: "Ja. Halkvakt för iPhone säger till med rösten när halka är rapporterad på vägen framför dig. Appen är gratis, och din position lämnar inte telefonen av sig själv." },
  ];
}
const lsFragorHtml = (f: { fraga: string; svar: string }[]) =>
  `<div class="fragor">\n${f.map((x) => `<h3>${lsEsc(x.fraga)}</h3><p>${lsEsc(x.svar)}</p>`).join("\n")}\n</div>`;
const lsFragorLd = (f: { fraga: string; svar: string }[]) => `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: f.map((x) => ({ "@type": "Question", name: x.fraga, acceptedAnswer: { "@type": "Answer", text: x.svar } })),
}).replace(/</g, "\\u003c")}</script>`;

/** Kartan över länet (25/10, DECISIONS #722): länets gräns, alla dess sträckor och de hala gula, ritad i webbläsaren ur sajtens egna
 *  filer. Vilka sträckor som är hala bestäms här (arHalt) och skickas med, så att kartan och texten aldrig är oense. */
function lsLanKarta(lan: { slug: string; kod: number; kort: string }, l: LanLage): string {
  const halt = JSON.stringify([...new Set(l.halt.map((s) => s.plats ?? s.road ?? ""))]).replace(/</g, "\\u003c");
  return `<a class="lankarta" href="../../karta.html?lan=${lan.slug}" aria-label="Öppna ${lsEsc(lan.kort)} på livekartan"><canvas id="lankarta" aria-hidden="true"></canvas><span>Öppna livekartan →</span></a>
<script>(function(){var SLUG=${JSON.stringify(lan.slug)},KOD=${lan.kod},HALT=new Set(${halt});
Promise.all([fetch('/assets/lan.geojson').then(function(r){return r.json()}),fetch('/data/vaglag.geojson').then(function(r){return r.json()}),fetch('/data/vader.geojson').then(function(r){return r.json()})]).then(function(d){
var lan=d[0].features,mitt=lan.filter(function(f){return f.properties.slug===SLUG})[0];if(!mitt)return;
var segs=d[1].features.filter(function(f){return f.properties.lan===KOD});
var ringar=function(g){return g.type==='MultiPolygon'?[].concat.apply([],g.coordinates):g.coordinates};
var b=[180,90,-180,-90];ringar(mitt.geometry).forEach(function(r){r.forEach(function(p){b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1])})});
function rita(){var cv=document.getElementById('lankarta'),bx=cv.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);cv.width=bx.width*dpr;cv.height=bx.height*dpr;
var c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);var k=Math.cos((b[1]+b[3])/2*Math.PI/180),pad=28,w=(b[2]-b[0])*k,h=b[3]-b[1],s=Math.min((bx.width-pad*2)/w,(bx.height-pad*2)/h),
ox=(bx.width-w*s)/2,oy=(bx.height-h*s)/2,xy=function(p){return[ox+(p[0]-b[0])*k*s,oy+(b[3]-p[1])*s]};
var yta=function(g,fyll,kant,lw){c.fillStyle=fyll;c.strokeStyle=kant;c.lineWidth=lw;ringar(g).forEach(function(r){c.beginPath();r.forEach(function(p,i){var q=xy(p);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])});c.closePath();c.fill();c.stroke()})};
lan.forEach(function(f){if(f!==mitt)yta(f.geometry,'#0B1013','#1E282D',1)});yta(mitt.geometry,'#162024','#FFC94A',1.5);
var linje=function(f){var g=f.geometry,L=g.type==='MultiLineString'?g.coordinates:[g.coordinates];L.forEach(function(l){c.beginPath();l.forEach(function(p,i){var q=xy(p);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])});c.stroke()})};
c.lineCap='round';c.lineJoin='round';c.strokeStyle='#4A5A63';c.lineWidth=1.6;segs.forEach(function(f){if(!HALT.has(f.properties.plats||f.properties.road||''))linje(f)});
c.strokeStyle='#FFC94A';c.lineWidth=3;c.shadowColor='rgba(255,201,74,.6)';c.shadowBlur=8;segs.forEach(function(f){if(HALT.has(f.properties.plats||f.properties.road||''))linje(f)});c.shadowBlur=0;
d[2].features.forEach(function(f){var p=f.geometry.coordinates,y=f.properties.yta;if(f.properties.land!=='SE'||p[0]<b[0]||p[0]>b[2]||p[1]<b[1]||p[1]>b[3]||typeof y!=='number')return;var q=xy(p);c.fillStyle=y<0?'#E9EFF2':'#34424A';c.beginPath();c.arc(q[0],q[1],y<0?2.6:1.6,0,7);c.fill()})}
rita();addEventListener('resize',rita)}).catch(function(){var a=document.querySelector('.lankarta');if(a)a.style.display='none'})})();</script>`;
}

/** Länet som folk skriver det i sökrutan (28/10, Search Console: "halka uppsala", "trafikläget örebro"): utan "län" och utan
 *  genitiv-s. "Uppsala län" -> "Uppsala", "Stockholms län" -> "Stockholm"; kortnamn utan "län" (Skåne, Värmland) lämnas orörda. */
function lsSoknamn(kort: string): string {
  return / län$/.test(kort) ? kort.replace(/ län$/, "").replace(/s$/, "") : kort;
}

function lsLanssida(lan: (typeof LAN)[number], l: LanLage, now: Date, d: { vaglag: LanSegment[]; stationer: LanStation[] }): string {
  const halt = l.halt.slice(0, 15).map((s) => {
    const vad = [s.text, ...s.info].filter(Boolean).join(", ");
    return `<li>${lsEsc(s.plats ?? s.road ?? "Vägavsnitt")}: ${lsEsc(vad)}</li>`;
  }).join("\n");
  const kalla = l.kalla.slice(0, 5).map((s) =>
    `<li>${lsEsc(s.name)}: ${lsGrad(s.yta)}${s.fukt ? ", nederbörd eller fukt rapporteras" : ""}</li>`).join("\n");
  const olyckor = l.olyckor.slice(0, 10).map((o) => `<li>${lsEsc(o.road ?? "Väg")}${o.start ? `, sedan ${lsTid(new Date(o.start))}` : ""}` +
    `${o.allvar ? ` (${lsEsc(o.allvar)})` : ""}</li>`).join("\n");
  const andra = LAN.filter((x) => x.kod !== lan.kod).map((x) => `<a href="../${x.slug}/">${lsEsc(x.kort)}</a>`).join(" · ");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Är det halt i ${lsEsc(lan.kort)} just nu?</h1>
<p class="svar">${lsEsc(lsSvar(l, "länets", "i länet", now))}</p>
<p class="dim">Väglaget och trafikläget i ${lsEsc(lsSoknamn(lan.kort))} idag: halka, vägbanans temperatur och pågående olyckor enligt Trafikverket, uppdaterat var 30:e minut.</p>
${l.halt.length ? `<div class="svar-app"><p>Kör du i ${lsEsc(lan.kort)} idag? Appen säger till med rösten innan du är framme vid halkan.</p><a class="knapp" href="${lsApp("lan-halt")}">Få varningar i appen</a></div>
` : ""}${lsLanKarta(lan, l)}
<h2>Stora vägar i ${lsEsc(lan.kort)} just nu</h2>
${lsVagarILanet(lan.kod, d)}
<h2>Pendla i ${lsEsc(lan.kort)}</h2>
<p>${lsEsc(PENDLING[lan.slug] ?? "")}</p>
<h2>Väglaget enligt Trafikverket</h2>
${l.halt.length ? `<ul>\n${halt}\n</ul>${l.halt.length > 15 ? `\n<p class="dim">och ${l.halt.length - 15} till.</p>` : ""}`
    : `<p>Inget av länets ${l.vagavsnitt} vägavsnitt har halka eller vinterväglag i Trafikverkets rapport.</p>`}
<h2>Vägbanans temperatur</h2>
${l.kalla.length ? `<p>Kallast just nu, vid Trafikverkets vägväderstationer:</p>\n<ul>\n${kalla}\n</ul>`
    : "<p>Ingen av länets vägväderstationer visar vägbana på 0 °C eller kallare.</p>"}
<h2>Pågående olyckor</h2>
${l.olyckor.length ? `<ul>\n${olyckor}\n</ul>` : "<p>Trafikverket rapporterar ingen pågående olycka i länet.</p>"}
<h2>Vintern i ${lsEsc(lan.kort)}</h2>
<p>${lsEsc(lan.stycke)}</p>
<p>Hela landet på <a href="../../karta.html">livekartan</a>, eller <a href="../">läget i alla län</a>. Redaktioner kan <a href="../../press.html#redaktioner">bädda in läget i ${lsEsc(lan.kort)}</a> på sin egen sajt.</p>
<h2>Vanliga frågor</h2>
${lsFragorHtml(lsFragor(lan.namn))}
<nav><h2>Andra län</h2><p>${andra}</p><h2>Stora vägar</h2><p>${lsVagLankar("../../")}</p></nav>`;
  return lsSkal({
    titel: `Halka i ${lsSoknamn(lan.kort)} idag: väglag och trafikläget just nu | Halkvakt`,
    beskrivning: lsBeskrivning(l, `i ${lan.namn}`, now),
    adress: `${SIDBAS}/lan/${lan.slug}/`, rot: "../../", innehall, now, ct: "lan", aktiv: "lanen", extra: lsFragorLd(lsFragor(lan.namn)),
  });
}

function lsOversiktBeskrivning(lagen: Map<number, LanLage>, now: Date): string {
  const alla = [...lagen.values()];
  const halt = alla.filter((l) => l.halt.length).length;
  const kallast = alla.flatMap((l) => l.kalla.slice(0, 1)).sort((a, b) => a.yta - b.yta)[0];
  const kall = kallast ? `kallast ${lsGrad(kallast.yta)} vid ${kallast.name}` : "ingen mätstation under noll";
  return `Kl. ${lsTid(now, false)}: halka eller vinterväglag i ${halt} av ${alla.length} län, ${kall}. ${LS_SLUT}`;
}

function lsOversikt(lagen: Map<number, LanLage>, vagar: Map<string, LanLage>, now: Date): string {
  const rad = (href: string, namn: string, l: LanLage, karta?: string) =>
    `<tr><td><a href="${href}">${lsEsc(namn)}</a></td><td>${l.halt.length} av ${l.vagavsnitt}</td><td>${l.kalla.length}</td><td>${l.olyckor.length}</td>` +
    `${karta ? `<td><a class="lank-mono" href="${karta}">Karta →</a></td>` : "<td></td>"}</tr>`;
  const rader = LAN.map((lan) => rad(`${lan.slug}/`, lan.namn, lagen.get(lan.kod)!, `../karta.html?lan=${lan.slug}`)).join("\n");
  const vagrader = VAGAR.map((v) => rad(`../vag/${v.slug}/`, v.namn, vagar.get(v.slug)!)).join("\n");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Är det halt i Sverige just nu? Läget per län</h1>
<p>Trafikverkets väglagsrapport, vägbanans temperatur vid vägväderstationerna och pågående olyckor, län för län.</p>
<div class="tabell"><table>
<thead><tr><th>Län</th><th>Halka¹</th><th>≤ 0 °C²</th><th>Olyckor</th><th>Just nu</th></tr></thead>
<tbody>
${rader}
</tbody>
</table></div>
<p class="dim">¹ Vägavsnitt med halka eller vinterväglag i Trafikverkets rapport, av länets alla. ² Vägväderstationer som visar vägbana på
0 °C eller kallare. Olyckor: pågående, enligt Trafikverket.</p>
<h2 id="vagar">Stora vägar</h2>
<div class="tabell"><table>
<thead><tr><th>Väg</th><th>Halka¹</th><th>≤ 0 °C²</th><th>Olyckor</th><th></th></tr></thead>
<tbody>
${vagrader}
</tbody>
</table></div>
<p>Se hela landet på <a href="../karta.html">livekartan</a>.</p>`;
  return lsSkal({
    titel: "Halka och väglag i Sverige just nu, län för län | Halkvakt",
    beskrivning: lsOversiktBeskrivning(lagen, now),
    adress: `${SIDBAS}/lan/`, rot: "../", innehall, now, ct: "lanen", aktiv: "lanen",
  });
}

/** Alla sidor, nyckel = sökvägen i kartsajten. */
export function byggLanssidor(d: { vaglag: LanSegment[]; stationer: LanStation[]; olyckor: LanOlycka[]; now: Date }): Record<string, string> {
  const lagen = new Map(LAN.map((lan) => [lan.kod, lsLage(lan.kod, d)] as const));
  const vagar = new Map(VAGAR.map((v) => [v.slug, lsVagLage(v.nyckel, d)] as const));
  const ut: Record<string, string> = { "lan/index.html": lsOversikt(lagen, vagar, d.now), "data/lan.json": lsLanJson(lagen, vagar, d.now),
    "data/strackor.json": lsStrackorJson(d) };
  for (const lan of LAN) ut[`lan/${lan.slug}/index.html`] = lsLanssida(lan, lagen.get(lan.kod)!, d.now, d);
  for (const v of VAGAR) ut[`vag/${v.slug}/index.html`] = lsVagsida(v, vagar.get(v.slug)!, d.now);
  return ut;
}

/** Widgetens och startsidans datafil (kort #281, widgeten): samma tal som sidorna, utan text. Kallast = kallaste stationen under noll. */
function lsLanJson(lagen: Map<number, LanLage>, vagar: Map<string, LanLage>, now: Date): string {
  const tal = (l: LanLage) => ({ halt: l.halt.length, vagavsnitt: l.vagavsnitt, kalla: l.kalla.length,
    kallast: l.kalla.length ? { namn: l.kalla[0].name, yta: l.kalla[0].yta } : null, olyckor: l.olyckor.length });
  return JSON.stringify({
    generated_at: now.toISOString(),
    lan: LAN.map((lan) => ({ kod: lan.kod, namn: lan.namn, kort: lan.kort, slug: lan.slug, ...tal(lagen.get(lan.kod)!) })),
    vag: VAGAR.map((v) => ({ namn: v.namn, slug: v.slug, ...tal(vagar.get(v.slug)!) })),
  });
}

/** Vägrutans datafil (DECISIONS #611, NWT 17/10): varje läns vägar, sträcka för sträcka med Trafikverkets ord, och vägbanans
 *  temperatur vid de stationer vars närmaste sträcka är vägen. Halt = samma regel som sidorna och motorn (arHalt). Litet nog för en
 *  inbäddad ruta: rutan läser bara sitt läns del. */
function lsStrackorJson(d: { vaglag: LanSegment[]; stationer: LanStation[]; now: Date }): string {
  const ordning = (r: string) => { const m = /^(E|Väg)\s*(\d+)/.exec(r); return m ? (m[1] === "E" ? 0 : 1000) + Number(m[2]) : 9999; };
  const lan = LAN.map((l) => {
    const segs = d.vaglag.filter((x) => x.lan === l.kod && x.road);
    const vagar = [...new Set(segs.map((x) => x.road as string))].sort((a, b) => ordning(a) - ordning(b));
    return {
      slug: l.slug, kort: l.kort,
      vagar: vagar.map((vag) => {
        const st = d.stationer.filter((x) => x.lan === l.kod && vagNyckel(x.vag ?? null) === vagNyckel(vag)).sort((a, b) => a.yta - b.yta);
        return {
          vag,
          strackor: segs.filter((x) => x.road === vag).map((x) => ({
            plats: (x.plats ?? vag).replace(new RegExp("^" + vag.replace(/\s+/g, "\\s*") + "\\s*"), ""),
            halt: arHalt(x.code, x.info), text: x.text, info: x.info,
          })),
          kallast: st.length ? { namn: st[0].name, yta: st[0].yta } : null,
          kalla: st.filter((x) => x.yta <= 0).length,
        };
      }),
    };
  });
  return JSON.stringify({ generated_at: d.now.toISOString(), lan });
}

export const sidAdresser = () => [`${SIDBAS}/lan/`, ...LAN.map((l) => `${SIDBAS}/lan/${l.slug}/`),
  ...VAGAR.map((v) => `${SIDBAS}/vag/${v.slug}/`)];

/** Axels sitemap med de adresser som saknas infogade före </urlset>; null när inget saknas eller filen inte går att läsa. */
export function sitemapMed(xml: string, adresser: string[]): string | null {
  const slut = xml.lastIndexOf("</urlset>");
  if (slut < 0) return null;
  const nya = adresser.filter((a) => !xml.includes(`<loc>${a}</loc>`));
  if (!nya.length) return null;
  const rader = nya.map((a) => `  <url><loc>${a}</loc><changefreq>hourly</changefreq><priority>0.6</priority></url>\n`).join("");
  return xml.slice(0, slut) + rader + xml.slice(slut);
}
