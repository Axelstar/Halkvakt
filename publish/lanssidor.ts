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

/** Pendlarstråken (2/11: flyttade hit ur rutan, ruta.html i halkvakt-karta, så att Datawrapper-tabellerna kan räknas här; rutan
 *  har kvar sin kopia tills den läser data/strak.json). Nyckeln är länets slug (länets standard) eller ortens; `lan` när den inte är
 *  länets egen. Delarna är Trafikverkets sträckor med namnen som de står i strackor.json. */
export type Strak = { lan?: string; fran?: string; rubrik?: string; strak: { fran?: string; till: string; delar: [string, string][] }[] };
export const STRAK: Record<string, Strak> = {
  "varmland": {"fran":"Karlstad","strak":[{"till":"Kristinehamn","delar":[["E 18","Karlstad - Kristinehamn"]]},{"till":"Arvika","delar":[["Väg 61","Kil - Karlstad"],["Väg 61","Högboda - Kil"],["Väg 61","Arvika - Högboda"]]},{"till":"Säffle","delar":[["E 18","Grums - Karlstad"],["E 18","Segmon - Grums"],["E 45","Segmon - Säffle"]]},{"till":"Sunne och Torsby","delar":[["E 18","Grums - Karlstad"],["E 45","Fagerås - Grums"],["E 45","Sunne - Fagerås"],["E 45","Torsby - Sunne"]]},{"till":"Filipstad","delar":[["Väg 63","Molkom - Karlstad"],["Väg 63","Filipstad - Molkom"]]},{"till":"Årjäng","delar":[["E 18","Grums - Karlstad"],["E 18","Segmon - Grums"],["E 18","Långserud - Segmon"],["E 18","Årjäng - Långserud"]]}]},
  "halsingland": {"lan":"gavleborg","rubrik":"Stråken i Hälsingland just nu","strak":[{"fran":"Hudiksvall","till":"Söderhamn","delar":[["E 4","Hudiksvall - Enånger"],["E 4","Enånger - Söderhamn"]]},{"fran":"Söderhamn","till":"Gävle","delar":[["E 4","Söderhamn - Axmartavlan"],["E 4","Axmartavlan - Gävle"]]},{"fran":"Söderhamn","till":"Bollnäs","delar":[["Väg 50","Söderhamn - Bollnäs"]]},{"fran":"Bollnäs","till":"Ljusdal","delar":[["Väg 83","Undersvik - Bollnäs"],["Väg 83","Ljusdal - Undersvik"]]},{"fran":"Hudiksvall","till":"Ljusdal","delar":[["Väg 84","Delsbo - Hudiksvall"],["Väg 84","Ljusdal - Delsbo"]]},{"fran":"Bollnäs","till":"Alfta","delar":[["Väg 50","Bollnäs - Alfta"]]}]},
  "ljusnan": {"lan":"gavleborg","fran":"Bollnäs","strak":[{"till":"Söderhamn","delar":[["Väg 50","Söderhamn - Bollnäs"]]},{"till":"Alfta och Edsbyn","delar":[["Väg 50","Bollnäs - Alfta"],["Väg 50","Alfta - Lamborn"]]},{"till":"Ljusdal","delar":[["Väg 83","Undersvik - Bollnäs"],["Väg 83","Ljusdal - Undersvik"]]},{"till":"Tönnebro och E4","delar":[["Väg 83","Bollnäs - Tönnebro"]]}]},
  "soderhamn": {"lan":"gavleborg","fran":"Söderhamn","strak":[{"till":"Hudiksvall","delar":[["E 4","Enånger - Söderhamn"],["E 4","Hudiksvall - Enånger"]]},{"till":"Gävle","delar":[["E 4","Söderhamn - Axmartavlan"],["E 4","Axmartavlan - Gävle"]]},{"till":"Bollnäs","delar":[["Väg 50","Söderhamn - Bollnäs"]]}]},
  "ljusdal": {"lan":"gavleborg","fran":"Ljusdal","strak":[{"till":"Bollnäs","delar":[["Väg 83","Ljusdal - Undersvik"],["Väg 83","Undersvik - Bollnäs"]]},{"till":"Hudiksvall","delar":[["Väg 84","Ljusdal - Delsbo"],["Väg 84","Delsbo - Hudiksvall"]]},{"till":"Kårböle","delar":[["Väg 84","Korskrogen - Ljusdal"],["Väg 84","Kårböle - Korskrogen"]]},{"till":"Ramsjö","delar":[["Väg 83","Tallåsen - Ljusdal"],["Väg 83","Ramsjö - Tallåsen"]]}]},
  "vasteras": {"lan":"vastmanland","fran":"Västerås","strak":[{"till":"Köping","delar":[["E 18","Köping - Västerås"]]},{"till":"Arboga","delar":[["E 18","Köping - Västerås"],["E 18","Arboga - Köping"]]},{"till":"Sala","delar":[["Väg 56","Sala - Västerås"]]},{"till":"Fagersta","delar":[["Väg 66","Ramnäs - Västerås"],["Väg 66","Fagersta - Ramnäs"]]},{"till":"Enköping","delar":[["E 18","Västerås - Enköping"]]}]},
  "sala": {"lan":"vastmanland","fran":"Sala","strak":[{"till":"Västerås","delar":[["Väg 56","Sala - Västerås"]]},{"till":"Avesta","delar":[["Väg 70","Avesta - Sala"]]},{"till":"Fjärdhundra","delar":[["Väg 70","Sala - Fjärdhundra"]]},{"till":"Norberg","delar":[["Väg 256","Salbohed - Sala (Kolbäcksbro)"],["Väg 256","Norberg - Salbohed"]]}]},
  "orebro": {"lan":"orebro","fran":"Örebro","strak":[{"till":"Lindesberg","delar":[["Väg 50","Lindesberg - Örebro"]]},{"till":"Laxå","delar":[["E 20","Örebro - Laxå"]]},{"till":"Karlskoga","delar":[["E 18","Lekhyttan - Trafikplats Adolfsberg"]]},{"till":"Arboga","delar":[["E 18","Trafikplats Adolfsberg - Länsgräns Västmanland/Örebro län"]]},{"till":"Odensbacken","delar":[["Väg 207","Odensbacken - Örebro"]]}]},
  "falun": {"lan":"dalarna","fran":"Falun","strak":[{"till":"Borlänge","delar":[["E 16","Falun - Borlänge"]]},{"till":"Rättvik","delar":[["Väg 69","Rättvik - Falun"]]},{"till":"Hedemora","delar":[["Väg 69","Falun - Hedemora"]]},{"till":"Hofors","delar":[["E 16","Hofors - Falun"]]},{"till":"Enviken","delar":[["Väg 50","Enviken - Falun"]]}]},
  "gavle": {"lan":"gavleborg","fran":"Gävle","strak":[{"till":"Söderhamn","delar":[["E 4","Axmartavlan - Gävle"],["E 4","Söderhamn - Axmartavlan"]]},{"till":"Sandviken och Hofors","delar":[["E 16","Gävle - Hofors"]]},{"till":"Skutskär","delar":[["Väg 76","Gävle - Skutskär"]]},{"till":"Gysinge","delar":[["Väg 56","Valbo - Gysinge"]]},{"till":"Hyttön","delar":[["E 4","Gävle - Hyttön"]]}]},
  "eskilstuna": {"lan":"sodermanland","fran":"Eskilstuna","strak":[{"till":"Strängnäs","delar":[["E 20","Strängnäs - Eskilstuna"]]},{"till":"Kungsör","delar":[["E 20","Eskilstuna - Kungsör"]]},{"till":"Malmköping","delar":[["Väg 53","Eskilstuna - Malmköping"]]},{"till":"Kvicksund","delar":[["Väg 56","Kvicksund - Eskilstuna"]]},{"till":"Katrineholm","delar":[["Väg 230","Eskilstuna - Stora Sundby"],["Väg 56","Stora Sundby - Katrineholm"]]}]},
  "nykoping": {"lan":"sodermanland","fran":"Nyköping","strak":[{"till":"Kolmården","delar":[["E 4","Nyköping - Kolmården"]]},{"till":"Vagnhärad","delar":[["E 4","Vagnhärad - Nyköping"]]},{"till":"Oxelösund","delar":[["Väg 53","Nyköping - Oxelösund"]]},{"till":"Katrineholm","delar":[["Väg 52","Nyköping - Bettna"],["Väg 52","Bettna - Katrineholm"]]},{"till":"Malmköping","delar":[["Väg 53","Malmköping - Nyköping"]]}]},
  "uppsala": {"lan":"uppsala","fran":"Uppsala","strak":[{"till":"Enköping","delar":[["Väg 55","Uppsala - Enköping"]]},{"till":"Knivsta","delar":[["E 4","Uppsala - Knivsta"]]},{"till":"Björklinge","delar":[["E 4","Björklinge - Uppsala"]]},{"till":"Östhammar","delar":[["Väg 288","Gimo - Uppsala"],["Väg 288","Östhammar - Gimo"]]},{"till":"Sala","delar":[["Väg 72","Uppsala - Vittinge"],["Väg 72","Vittinge - Sala"]]}]},
  "enkoping": {"lan":"uppsala","fran":"Enköping","strak":[{"till":"Uppsala","delar":[["Väg 55","Uppsala - Enköping"]]},{"till":"Bålsta","delar":[["E 18","Enköping - Bålsta"]]},{"till":"Fjärdhundra","delar":[["Väg 70","Fjärdhundra - Enköping"]]},{"till":"Hjulstabron","delar":[["Väg 55","Enköping - Hjulstabron"]]}]},
  "lulea": {"lan":"norrbotten","fran":"Luleå","strak":[{"till":"Boden","delar":[["Väg 97","Boden - Luleå"]]},{"till":"Piteå","delar":[["E 4","Luleå - Rosvik"],["E 4","Rosvik - Piteå"]]},{"till":"Kalix","delar":[["E 4","Töre - Luleå"],["E 4","Kalix - Töre"]]}]},
  "pitea": {"lan":"norrbotten","fran":"Piteå","strak":[{"till":"Luleå","delar":[["E 4","Rosvik - Piteå"],["E 4","Luleå - Rosvik"]]},{"till":"Jävre","delar":[["E 4","Piteå - Jävre"]]},{"till":"Älvsbyn","delar":[["Väg 374","Älvsbyn - Piteå"]]}]},
  "haparanda": {"lan":"norrbotten","fran":"Haparanda","strak":[{"till":"Kalix","delar":[["E 4","Haparanda - Kalix"]]},{"till":"Övertorneå","delar":[["Väg 99","Hedenäset - Haparanda"],["Väg 99","Övertorneå - Hedenäset"]]},{"till":"Pajala","delar":[["Väg 99","Hedenäset - Haparanda"],["Väg 99","Övertorneå - Hedenäset"],["Väg 99","Pello - Övertorneå"],["Väg 99","Pajala - Pello"]]},{"till":"Luleå","delar":[["E 4","Haparanda - Kalix"],["E 4","Kalix - Töre"],["E 4","Töre - Luleå"]]}]},
  "umea": {"lan":"vasterbotten","fran":"Umeå","strak":[{"till":"Vännäs","delar":[["E 12","Vännäs - Umeå"]]},{"till":"Holmsund","delar":[["E 12","Umeå - Holmsund"]]},{"till":"Skellefteå","delar":[["E 4","Lövånger - Umeå"],["E 4","Skellefteå - Lövånger"]]},{"till":"Husum","delar":[["E 4","Umeå - Husum"]]},{"till":"Vindeln","delar":[["Väg 363","Långviksvallen - Umeå"],["Väg 363","Vindeln - Långviksvallen"]]}]},
  "skelleftea": {"lan":"vasterbotten","fran":"Skellefteå","strak":[{"till":"Umeå","delar":[["E 4","Skellefteå - Lövånger"],["E 4","Lövånger - Umeå"]]},{"till":"Jävre","delar":[["E 4","Jävre - Skellefteå"]]},{"till":"Boliden","delar":[["Väg 95","Boliden - Skellefteå"]]},{"till":"Burträsk","delar":[["Väg 364","Skellefteå - Burträsk"]]},{"till":"Skelleftehamn","delar":[["Väg 372","Skelleftehamn - Skellefteå"]]}]},
  "ostersund": {"lan":"jamtland","fran":"Östersund","strak":[{"till":"Krokom","delar":[["E 14","Krokom - Brunflo"]]},{"till":"Järpen","delar":[["E 14","Krokom - Brunflo"],["E 14","Järpen - Krokom"]]},{"till":"Bräcke","delar":[["E 14","Brunflo - Bräcke"]]},{"till":"Hallviken","delar":[["E 45","Hallviken - Östersund"]]},{"till":"Åsarna","delar":[["E 45","Brunflo - Åsarna"]]},{"till":"Stugun","delar":[["Väg 87","Östersund - Stugun"]]}]},
  "sveg": {"lan":"jamtland","fran":"Sveg","strak":[{"till":"Hede","delar":[["Väg 84","Hede - Sveg"]]},{"till":"Ytterhogdal","delar":[["E 45","Ytterhogdal - Sveg"]]},{"till":"Kårböle","delar":[["Väg 84","Sveg - Kårböle"]]},{"till":"Åsarna","delar":[["E 45","Ytterhogdal - Sveg"],["E 45","Åsarna - Ytterhogdal"]]}]},
  "sundsvall": {"lan":"vasternorrland","fran":"Sundsvall","strak":[{"till":"Härnösand","delar":[["E 4","Härnösand - Sundsvall"]]},{"till":"Gnarp","delar":[["E 4","Sundsvall Trafikplats Skönsmon - Gnarp"]]},{"till":"Ånge","delar":[["E 14","Matfors - Sundsvall"],["E 14","Stöde - Matfors"],["E 14","Ånge - Stöde"]]},{"till":"Indal","delar":[["Väg 86","Indal - Sundsvall"]]}]},
  "ornskoldsvik": {"lan":"vasternorrland","fran":"Örnsköldsvik","strak":[{"till":"Husum","delar":[["E 4","Husum - Örnsköldsvik"]]},{"till":"Härnösand","delar":[["E 4","Örnsköldsvik - Docksta"],["E 4","Docksta - Gallsäter"],["E 4","Gallsäter - Härnösand"]]},{"till":"Sollefteå","delar":[["Väg 335","Örnsköldsvik - Grillom"],["Väg 335","Grillom - Sollefteå"]]}]},
  "harnosand": {"lan":"vasternorrland","fran":"Härnösand","strak":[{"till":"Sundsvall","delar":[["E 4","Härnösand - Sundsvall"]]},{"till":"Gallsäter","delar":[["E 4","Gallsäter - Härnösand"]]},{"till":"Örnsköldsvik","delar":[["E 4","Gallsäter - Härnösand"],["E 4","Docksta - Gallsäter"],["E 4","Örnsköldsvik - Docksta"]]}]},
  "kalmar": {"lan":"kalmar","fran":"Kalmar","strak":[{"till":"Oskarshamn","delar":[["E 22","Ålem - Kalmar"],["E 22","Oskarshamn - Ålem"]]},{"till":"Nybro","delar":[["Väg 25","Kalmar - Nybro"]]},{"till":"Brömsebro","delar":[["E 22","Kalmar - Brömsebro"]]},{"till":"Färjestaden","delar":[["Väg 137","Färjestaden - Kalmar / Ölandsbron"]]},{"till":"Högsby","delar":[["E 22","Ålem - Kalmar"],["Väg 34","Högsby - Ålem"]]}]},
  "borgholm": {"lan":"kalmar","fran":"Borgholm","strak":[{"till":"Kalmar","delar":[["Väg 136","Borgholm - Färjestaden"],["Väg 137","Färjestaden - Kalmar / Ölandsbron"]]},{"till":"Mörbylånga","delar":[["Väg 136","Borgholm - Färjestaden"],["Väg 136","Färjestaden - Mörbylånga"]]},{"till":"Löttorp","delar":[["Väg 136","Löttorp - Borgholm"]]}]},
  "vaxjo": {"lan":"kronoberg","fran":"Växjö","strak":[{"till":"Alvesta","delar":[["Väg 25","Växjö - Alvesta"]]},{"till":"Ljungby","delar":[["Väg 25","Växjö - Alvesta"],["Väg 25","Alvesta - Ljungby"]]},{"till":"Lammhult","delar":[["Väg 30","Lammhult - Växjö"]]},{"till":"Eriksmåla","delar":[["Väg 25","Eriksmåla - Växjö"]]},{"till":"Eneryda","delar":[["Väg 23","Växjö Trafikplats Helgevärma - Eneryda"]]},{"till":"Djuramåla","delar":[["Väg 27","Växjö Fagrabäcksrondellen - Ingelstad"],["Väg 27","Ingelstad - Djuramåla"]]}]},
  "karlskrona": {"lan":"blekinge","fran":"Karlskrona","strak":[{"till":"Ronneby","delar":[["E 22","Karlskrona - Ronneby"]]},{"till":"Karlshamn","delar":[["E 22","Karlskrona - Ronneby"],["E 22","Ronneby - Karlshamn"]]},{"till":"Brömsebro","delar":[["E 22","Brömsebro - Karlskrona"]]},{"till":"Vissefjärda","delar":[["Väg 28","Vissefjärda - Karlskrona"]]}]},
  "karlshamn": {"lan":"blekinge","fran":"Karlshamn","strak":[{"till":"Ronneby","delar":[["E 22","Ronneby - Karlshamn"]]},{"till":"Karlskrona","delar":[["E 22","Ronneby - Karlshamn"],["E 22","Karlskrona - Ronneby"]]},{"till":"Bromölla","delar":[["E 22","Karlshamn - Bromölla"]]},{"till":"Tingsryd","delar":[["Väg 29","Tingsryd - Karlshamn"]]},{"till":"Olofström","delar":[["Väg 126","Fridafors - Karlshamn"],["Väg 116","Fridafors - Olofström"]]}]},
  "kristianstad": {"lan":"skane","fran":"Kristianstad","strak":[{"till":"Hässleholm","delar":[["Väg 21","Kristianstad - Hässleholm"]]},{"till":"Bromölla","delar":[["E 22","Bromölla - Kristianstad"]]},{"till":"Hörby","delar":[["E 22","Kristianstad - Tollarp"],["E 22","Tollarp - Hörby"]]},{"till":"Broby","delar":[["Väg 19","Broby - Kristianstad"]]}]},
  "ystad": {"lan":"skane","fran":"Ystad","strak":[{"till":"Malmö","delar":[["E 65","Ystad Ringvägen - Svedala"],["E 65","Svedala - Malmö"]]},{"till":"Simrishamn","delar":[["Väg 9","Simrishamn - Ystad"]]},{"till":"Tomelilla","delar":[["Väg 19","Tomelilla - Ystad"]]},{"till":"Sjöbo","delar":[["Väg 13","Sjöbo - Ystad"]]},{"till":"Trelleborg","delar":[["Väg 9","Ystad - Trelleborg"]]}]},
  "trelleborg": {"lan":"skane","fran":"Trelleborg","strak":[{"till":"Malmö","delar":[["E 6","Malmö Trafikplats Petersborg - Trelleborg"]]},{"till":"Svedala","delar":[["Väg 108","Svedala - Trelleborg"]]},{"till":"Ystad","delar":[["Väg 9","Ystad - Trelleborg"]]}]},
  "hassleholm": {"lan":"skane","fran":"Hässleholm","strak":[{"till":"Kristianstad","delar":[["Väg 21","Kristianstad - Hässleholm"]]},{"till":"Osby","delar":[["Väg 23","Osby - Hässleholm"]]},{"till":"Höör","delar":[["Väg 23","Hässleholm - Höör"]]},{"till":"Perstorp","delar":[["Väg 21","Hässleholm - Perstorp"]]},{"till":"Örkelljunga","delar":[["Väg 24","Hässleholm - Örkelljunga"]]},{"till":"Markaryd","delar":[["Väg 117","Markaryd - Hässleholm"]]}]},
  "boras": {"lan":"vastra-gotaland","fran":"Borås","strak":[{"till":"Göteborg","delar":[["Väg 40","Borås - Bollebygd"],["Väg 40","Bollebygd - Landvetter"],["Väg 40","Landvetter - Kallebäcksmotet Göteborg"]]},{"till":"Ulricehamn","delar":[["Väg 40","Getared - Borås"],["Väg 40","Ulricehamn - Getared"]]},{"till":"Kinna","delar":[["Väg 41","Borås - Kinna"]]},{"till":"Vårgårda","delar":[["Väg 42","Tämta - Borås"],["Väg 42","Vårgårda - Tämta"]]},{"till":"Kila","delar":[["Väg 27","Borås - Kila"]]}]},
  "ulricehamn": {"lan":"vastra-gotaland","fran":"Ulricehamn","strak":[{"till":"Borås","delar":[["Väg 40","Ulricehamn - Getared"],["Väg 40","Getared - Borås"]]},{"till":"Bottnaryd","delar":[["Väg 40","Bottnaryd - Ulricehamn"]]},{"till":"Falköping","delar":[["Väg 46","Åsarp - Ulricehamn"],["Väg 46","Falköping - Åsarp"]]},{"till":"Limmared","delar":[["Väg 157","Ulricehamn - Gällstad"],["Väg 157","Gällstad - Limmared"]]}]},
};

/** Vägnumret utan form: väglaget skriver "E 4" och "Väg 40", olyckorna "E4" och "Väg 274". */
export const vagNyckel = (s: string | null) => (s ?? "").toLowerCase().replace(/\s+/g, "").replace(/^väg/, "");

export type LanSegment = { code: number | null; text: string | null; info: string[]; road: string | null; plats: string | null; lan: number | null };
export type LanStation = { name: string; yta: number; fukt: boolean; lan: number; vag?: string | null; lon?: number; lat?: number };
export type LanOlycka = { road: string | null; start: string | null; allvar: string | null; lan: number | null };

/** SMHI:s varning för ett område, som raden ligger i smhi_warnings (sql/001). */
export type SmhiRad = { event_sv: string; level_sv: string; level_code: string; description_sv?: string | null; area_name: string | null;
  affected_areas?: { id?: number; sv?: string }[] | null; approx_start?: string | Date | null; approx_end?: string | Date | null };
export type Vagvarning = { event: string; niva: string; nivaKod: string; text: string | null; omrade: string; lan: number[]; start: string | null; slut: string | null };

/** Vägvarningarna (1/11): samma ord som kvällsförvarningen, Halkvakt live och MCP-tjänsten (snö, underkylt regn, isbeläggning,
 *  ishalka, halka), bara gul, orange och röd nivå (ett meddelande är ingen varning), inget till havs. Länen ur områdets namn och
 *  SMHI:s berörda områden: "Värmlands län" och "Norrbottens fjäll" hör till sina län; ett område utan län visas för sig. */
export const SMHI_VAG = /snö|underkyl|isbel|ishalk|halk/i;
const LS_NIVAER = ["RED", "ORANGE", "YELLOW"];
const lsLanStam = (namn: string) => namn.replace(/ län$/, "").replace(/s$/, "").toLowerCase();
const lsIso = (x: string | Date | null | undefined) => (x ? new Date(x).toISOString() : null);
export function vagvarningar(rader: SmhiRad[]): Vagvarning[] {
  return rader
    .filter((r) => SMHI_VAG.test(r.event_sv ?? "") && LS_NIVAER.includes(r.level_code) && !/havs?\b/i.test(`${r.event_sv} ${r.area_name ?? ""}`))
    .map((r) => {
      const namn = [r.area_name ?? "", ...(r.affected_areas ?? []).map((a) => a?.sv ?? "")].filter(Boolean);
      const lan = LAN.filter((l) => namn.some((n) => n.toLowerCase().includes(lsLanStam(l.namn)))).map((l) => l.kod);
      return { event: r.event_sv, niva: r.level_sv, nivaKod: r.level_code, text: r.description_sv ?? null,
        omrade: r.area_name ?? namn.join(", "), lan, start: lsIso(r.approx_start), slut: lsIso(r.approx_end) };
    })
    .sort((a, b) => LS_NIVAER.indexOf(a.nivaKod) - LS_NIVAER.indexOf(b.nivaKod) || a.omrade.localeCompare(b.omrade, "sv"));
}

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
.fragor h3{font-size:17px;margin:20px 0 4px}.fragor p{margin:0}
.varnad{background:var(--panel);border:1px solid var(--kant);border-radius:14px;padding:12px 16px;margin:10px 0}`;
// App Store med kampanjkod per knapp (27/10, DECISIONS #732), samma som sajtens övriga sidor.
const lsApp = (ct: string) => `https://apps.apple.com/se/app/halkvakt/id6806939784?ct=${ct}`;
const LS_MARKE = `<svg viewBox="3 3 94 83" aria-hidden="true"><path fill-rule="evenodd" fill="#FFC94A" d="M55.196 6 L96.196 77 A6 6 0 0 1 91 86 L9 86 A6 6 0 0 1 3.804 77 L44.804 6 A6 6 0 0 1 55.196 6 Z M46.4 32 L53.6 32 L52 58 L48 58 Z M45.6 68 A4.4 4.4 0 1 0 54.4 68 A4.4 4.4 0 1 0 45.6 68 Z"/></svg>`;

const LS_TRV_DATA = { "@type": "Dataset", name: "Trafikverkets öppna data: väglag, vägväderstationer och olyckor",
  description: "Trafikverkets öppna API: rapporterat väglag per vägavsnitt, vägbanans temperatur vid vägväderstationerna och pågående olyckor.",
  creator: { "@type": "Organization", name: "Trafikverket", url: "https://www.trafikverket.se/" },
  license: "https://creativecommons.org/publicdomain/zero/1.0/" };
const LS_SMHI_DATA = { "@type": "Dataset", name: "SMHI:s vädervarningar",
  description: "SMHI:s öppna data om gällande vädervarningar: händelse, nivå, område och ungefärlig giltighetstid.",
  creator: { "@type": "Organization", name: "SMHI", url: "https://www.smhi.se/" },
  // Search Console 4/11: "Missing field license". SMHI:s öppna data är CC BY 4.0 (smhi.se, Villkor för användning).
  license: "https://creativecommons.org/licenses/by/4.0/" };

// Strukturerad data (17/10, DECISIONS #629): vad sidan är, när den skrevs och vilken data den bygger på, så att sökmotorer och
// AI-tjänster kan läsa tiden och källan utan att tolka texten.
function lsJsonLd(o: { titel: string; beskrivning: string; adress: string; now?: Date; smhi?: boolean }): string {
  const d = { "@context": "https://schema.org", "@type": "WebPage", name: o.titel, description: o.beskrivning, url: o.adress, inLanguage: "sv-SE",
    ...(o.now ? { dateModified: o.now.toISOString() } : {}),
    // description och creator (29/10, Search Console): Google läser isBasedOn som en datamängd och kräver description, vill ha creator. Organization, inte GovernmentOrganization: Datasets godtar bara Person eller Organization (1/11).
    isBasedOn: o.smhi ? [LS_TRV_DATA, LS_SMHI_DATA] : LS_TRV_DATA,
    publisher: { "@type": "Organization", name: "Halkvakt", url: `${SIDBAS}/` } };
  return `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`;
}

const LS_KALLOR = "Källa: Trafikverkets öppna data (CC0): väglag, vägväderstationer och olyckor. Sidan skrivs om var 30:e minut. Fristående från myndigheterna.";
function lsSkal(o: { titel: string; beskrivning: string; adress: string; rot: string; innehall: string; ct: string; aktiv?: "lanen"; now?: Date; extra?: string;
  smhi?: boolean; kallor?: string; ladda?: { rubrik: string; text: string } }) {
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
<div class="ladda"><b>${lsEsc(o.ladda?.rubrik ?? "Kör du här ofta?")}</b><p>${lsEsc(o.ladda?.text ?? "Appen säger till med rösten innan du är framme vid halkan. Samma data som på den här sidan. Gratis för iPhone.")}</p><a class="knapp" href="${lsApp(o.ct)}">Få varningar i appen</a></div>
</div>
</main>
<footer class="fot">
  <div class="wrap">
    <a class="logo" href="${o.rot}">${LS_MARKE}<b>HALKVAKT</b></a>
    <p class="kallor">${lsEsc(o.kallor ?? LS_KALLOR)}</p>
    <nav aria-label="Sidfot"><a href="${o.rot}lan/">Länen</a><a href="${o.rot}om-halkvakt.html">Om Halkvakt</a><a href="${o.rot}karta.html">Livekartan</a><a href="${o.rot}om.html">Vanliga frågor</a><a href="${o.rot}lan/#vagar">Stora vägar</a><a href="${o.rot}varningar/">SMHI-varningar</a><a href="${o.rot}support.html">Hjälp och kontakt</a><a href="${o.rot}press.html">Press</a><a href="${o.rot}integritet.html">Integritet</a></nav>
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

/** Vägen län för län (29/10, Search Console: vägsidorna var tunnast, ~175 ord): varje län vägen går genom, med dess sträckor
 *  i Trafikverkets ord, halkan och kallaste stationen vid vägen, och orterna längs vägen. Bara rapporterat läge, inga påståenden. */
function lsVagLanForLan(vag: (typeof VAGAR)[number], d: { vaglag: LanSegment[]; stationer: LanStation[] }): string {
  const segs = d.vaglag.filter((s) => vagNyckel(s.road) === vag.nyckel);
  const rader = LAN.filter((lan) => segs.some((s) => s.lan === lan.kod)).map((lan) => {
    const sv = segs.filter((s) => s.lan === lan.kod);
    const halt = sv.filter((s) => arHalt(s.code, s.info));
    const st = d.stationer.filter((x) => x.lan === lan.kod && vagNyckel(x.vag ?? null) === vag.nyckel).sort((a, b) => a.yta - b.yta)[0];
    const lage = halt.length
      ? `<span class="halt">Halka eller vinterväglag på ${halt.length} av ${lsPlural(sv.length, "sträcka", "sträckor")}</span>`
      : `Ingen halka rapporterad på ${lsPlural(sv.length, "sträcka", "sträckor")}`;
    const temp = st ? ` · vägbanan ${lsGrad(st.yta)} vid ${lsEsc(st.name)}` : "";
    const namn = [...new Set((halt.length ? halt : sv).map(lsStracka).filter(Boolean))].slice(0, 6);
    return `<li><b><a href="../../lan/${lan.slug}/">${lsEsc(lan.kort)}</a></b>${lage}${temp}${namn.length ? `<small>${lsEsc(namn.join(" · "))}</small>` : ""}</li>`;
  });
  const orter = ORTER.filter((o) => lsOrtAvsnitt(o, segs).length).map((o) => `<a href="../../ort/${ortSlug(o.namn)}/">${lsEsc(o.namn)}</a>`);
  return (rader.length ? `<h2>${lsEsc(vag.namn)} län för län</h2>\n<ul class="vaglista">\n${rader.join("\n")}\n</ul>` : "") +
    (orter.length ? `\n<h2>Orter längs ${lsEsc(vag.rubrik)}</h2>\n<p>${orter.join(" · ")}</p>` : "");
}

function lsVagsida(vag: (typeof VAGAR)[number], l: LanLage, now: Date, d: { vaglag: LanSegment[]; stationer: LanStation[] }, varn: Vagvarning[] = []): string {
  const langs = new Set(d.vaglag.filter((s) => vagNyckel(s.road) === vag.nyckel && s.lan !== null).map((s) => s.lan as number));
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
${lsVarnadRad(varn.filter((v) => v.lan.some((k) => langs.has(k))), "längs vägen", "../../", true)}<h2>Väglaget enligt Trafikverket</h2>
${l.halt.length ? `<ul>\n${halt}\n</ul>${l.halt.length > 20 ? `\n<p class="dim">och ${l.halt.length - 20} till.</p>` : ""}`
    : `<p>Inget av vägens ${l.vagavsnitt} vägavsnitt har halka eller vinterväglag i Trafikverkets rapport.</p>`}
<h2>Vägbanans temperatur</h2>
${l.kalla.length ? `<p>Kallast just nu, vid de vägväderstationer som ligger närmast ${lsEsc(vag.namn)}:</p>\n<ul>\n${kalla}\n</ul>`
    : "<p>Ingen av vägväderstationerna vid vägen visar vägbana på 0 °C eller kallare.</p>"}
<h2>Pågående olyckor</h2>
${l.olyckor.length ? `<ul>\n${olyckor}\n</ul>` : `<p>Trafikverket rapporterar ingen pågående olycka på ${lsEsc(vag.rubrik)}.</p>`}
${lsVagLanForLan(vag, d)}
<h2>Om vägen</h2>
<p>${lsEsc(vag.stycke)}</p>
<p>Se hela landet på <a href="../../karta.html">livekartan</a>, eller <a href="../../lan/">läget i alla län</a>. Undrar du när vägen blir hal? Läs <a href="../../nar-blir-det-halt.html">när det blir halt på vägarna</a>.</p>
<h2>Vanliga frågor</h2>
${lsFragorHtml(lsFragor(vag.namn, `på ${vag.rubrik}`))}
<nav><h2>Andra vägar</h2><p>${andra}</p></nav>`;
  return lsSkal({
    titel: `Väglag ${vag.rubrik} idag: halka och trafikläget just nu | Halkvakt`,
    beskrivning: lsBeskrivning(l, `på ${vag.rubrik}`, now),
    adress: `${SIDBAS}/vag/${vag.slug}/`, rot: "../../", innehall, now, ct: "vag", extra: lsFragorLd(lsFragor(vag.namn, `på ${vag.rubrik}`)),
  });
}


/** Vägen som folk skriver den: "E 4" → "E4", "Väg 55" → "väg 55". */
const lsVagNamn = (r: string) => r.replace(/^E\s*(\d+)/, "E$1").replace(/^Väg\s*/, "väg ");
/** Sträckans namn utan vägnumret och Trafikverkets löpnummer: "E 4 .25 Knivsta - Arlanda" → "Knivsta–Arlanda". */
const lsStracka = (s: LanSegment) => (s.plats ?? "").replace(new RegExp("^" + (s.road ?? "").replace(/\s+/g, "\\s*") + "\\s*"), "")
  .replace(/^\.?\d+\s+/, "").replace(/\s+-\s+/g, "–").trim();
const lsVagOrdning = (r: string) => { const m = /^(E|Väg)\s*(\d+)/.exec(r); return m ? (m[1] === "E" ? 0 : 1000) + Number(m[2]) : 9999; };

/** Länets stora vägar just nu (25/10, DECISIONS #722): E-vägarna och riksvägarna, och varje annan väg med halka. Raderna räknas
 *  här en gång och visas både som lista på länssidan och som Datawrapper-tabell (2/11, NWT), så att de aldrig säger olika saker. */
type VagRad = { vag: string; halt: number; strackor: number; namn: string[]; st: LanStation | undefined };
function lsVagRader(kod: number, d: { vaglag: LanSegment[]; stationer: LanStation[] }): VagRad[] {
  const segs = d.vaglag.filter((x) => x.lan === kod && x.road);
  const vagar = [...new Set(segs.map((x) => x.road as string))].sort((a, b) => lsVagOrdning(a) - lsVagOrdning(b));
  return vagar.flatMap((vag) => {
    const sv = segs.filter((x) => x.road === vag);
    const halt = sv.filter((x) => arHalt(x.code, x.info));
    const stor = /^E\s*\d/.test(vag) || lsVagOrdning(vag) < 1100;
    if (!stor && !halt.length) return [];
    const namn = [...new Set((halt.length ? halt : sv).map(lsStracka).filter(Boolean))].slice(0, 5);
    const st = d.stationer.filter((x) => x.lan === kod && vagNyckel(x.vag ?? null) === vagNyckel(vag)).sort((a, b) => a.yta - b.yta)[0];
    return [{ vag, halt: halt.length, strackor: sv.length, namn, st }];
  }).slice(0, 14);
}
const lsVagLageText = (r: VagRad) => r.halt
  ? `Halka eller vinterväglag på ${r.halt} av ${lsPlural(r.strackor, "sträcka", "sträckor")}`
  : `Ingen halka rapporterad på ${lsPlural(r.strackor, "sträcka", "sträckor")}`;

/** Text, så att orterna i sträckornas namn går att söka på. */
function lsVagarILanet(kod: number, d: { vaglag: LanSegment[]; stationer: LanStation[] }): string {
  const rader = lsVagRader(kod, d).map((r) => {
    const lage = r.halt ? `<span class="halt">${lsVagLageText(r)}</span>` : lsVagLageText(r);
    const temp = r.st ? ` · vägbanan ${lsGrad(r.st.yta)} vid ${lsEsc(r.st.name)}` : "";
    return `<li><b>${lsEsc(lsVagNamn(r.vag))}</b>${lage}${temp}${r.namn.length ? `<small>${lsEsc(r.namn.join(" · "))}</small>` : ""}</li>`;
  });
  return rader.length ? `<ul class="vaglista">\n${rader.join("\n")}\n</ul>` : "<p>Trafikverket rapporterar inget väglag för länets stora vägar just nu.</p>";
}

/** Datawrapper-tabellen per län (2/11, NWT): Bonnier News Locals sajter bäddar bara in godkända tjänster, och Datawrapper är en av
 *  dem. Tabellen läser CSV:n som extern data och rubrik, ingress och källa ur JSON:en som extern metadata, så klockslaget följer med
 *  siffrorna. Samma rader och samma mening som länssidan; inget tal som inte står där. */
// Declarations are joined with "&#59" (a numeric reference to ";" that the browser decodes inside the attribute), never a raw
// semicolon: Datawrapper guesses the CSV delimiter from the file, and a row with more ";" than "," was read as one column
// (prov 2/11 kväll, the pendling table). The reference has no trailing ";" for the same reason.
const lsDwStil = (...d: string[]) => d.join("&#59");
const LS_DW_GUL = lsDwStil("background:#FFC94A", "color:#080B0D", "font-weight:600", "padding:2px 8px", "border-radius:10px", "white-space:nowrap");
const LS_DW_DAMPAD = lsDwStil("color:#6F7C83", "white-space:nowrap");
const lsCsvFalt = (s: string) => `"${s.replace(/"/g, '""')}"`;
const LS_DW_GRA = "color:#6F7C83";
const LS_DW_LITEN = lsDwStil("color:#8FA0A9", "font-size:12px");
const LS_DW_FET = lsDwStil("font-weight:600", "color:#181818");
const LS_DW_KNAPP = lsDwStil("display:flex", "justify-content:space-between", "align-items:center", "border:1px solid #C9CDD0",
  "border-radius:8px", "padding:8px 12px", "margin-top:10px", "cursor:pointer", "font-style:normal", "font-weight:600", "font-size:14px", "color:#181818");
const LS_DW_RAD = lsDwStil("display:flex", "flex-wrap:wrap", "gap:4px 10px", "align-items:center", "padding:8px 0",
  "border-bottom:1px solid #E5E7E8", "font-style:normal", "font-size:14px", "color:#181818");
const LS_DW_SEKTION = lsDwStil("display:block", "margin:16px 0 4px", "font-style:normal", "font-size:15px", "font-weight:600", "color:#181818");
const LS_DW_NORMAL = lsDwStil("display:block", "font-style:normal");
const lsDwEtikett = (h: number, n: number) => {
  const t = `${h} av ${lsPlural(n, "sträcka", "sträckor")}`;
  return `<span style="${h ? LS_DW_GUL : LS_DW_DAMPAD}">${t}</span>`;
};
const lsDwVag = (v: string) => lsVagNamn(v).replace(/^väg /, "Väg ");
// Bold when the road surface is at or below 0 °C (Axel 2/11: "mycket bättre"); the station name small and grey after the number.
const lsDwTemp = (st?: LanStation) => st
  ? `<span style="${st.yta <= 0 ? LS_DW_FET : LS_DW_GRA}">${lsGrad(st.yta)}</span> <span style="${LS_DW_LITEN}">${lsEsc(st.name)}</span>` : "";
const lsDwKnapp = (text: string, n: number, inne: string) => n
  ? `<details><summary style="${LS_DW_KNAPP}"><span>${text} <span style="${LS_DW_GRA}">(${n})</span></span><span style="${LS_DW_GRA}">▾</span></summary>${inne}</details>` : "";
const lsDwCsv = (rader: string[][]) => rader.map((f) => f.map(lsCsvFalt).join(",")).join("\n") + "\n";
const LS_DW_FOT_HALKA = "Halka eller vinterväglag enligt Trafikverkets rapport.";
const LS_DW_FOT_VAG = "Vägbanan: kallaste vägväderstationen längs vägen.";

/** Vägtabellen per län (data/datawrapper/<län>.csv): alla länets stora vägar, halkan först. */
function lsDatawrapperCsv(kod: number, d: { vaglag: LanSegment[]; stationer: LanStation[] }): string {
  // A table to read at a glance (Axel 2/11: "lite snyggare"): roads with ice first, the count as a yellow label (Datawrapper
  // renders inline-styled <span> in cells; the brand guide: yellow only where a hazard is live), the others muted, and stretch
  // names only where it is slippery. Same rows and counts as the county page.
  const vr = lsVagRader(kod, d);
  const rader = [...vr.filter((r) => r.halt), ...vr.filter((r) => !r.halt)]
    .map((r) => [lsDwVag(r.vag), lsDwEtikett(r.halt, r.strackor), lsDwTemp(r.st), r.halt ? lsEsc(r.namn.join(" · ")) : ""]);
  if (!rader.length) rader.push(["", "Trafikverket rapporterar inget väglag för länets stora vägar just nu.", "", ""]);
  return lsDwCsv([["Väg", "Halka", "Vägbanan", "Var"], ...rader]);
}
function lsDatawrapperMeta(lan: (typeof LAN)[number], l: LanLage, now: Date): string {
  return JSON.stringify({
    title: `Väglaget i ${lan.kort} just nu`,
    describe: { intro: lsSvar(l, "länets", "i länet", now), "source-name": "Trafikverket via Halkvakt", "source-url": `${SIDBAS}/lan/${lan.slug}/` },
    annotate: { notes: `${LS_DW_FOT_HALKA} ${LS_DW_FOT_VAG}` },
  });
}

/** Ett pendlarstråk just nu: samma regel som rutan (ruta.html), sträcka för sträcka, och bara de delar Trafikverket rapporterar. */
type StrakRad = { fran: string; till: string; vagar: string; halt: number; delar: number; var_: string[] };
const lsSegPlats = (x: LanSegment) => (x.plats ?? x.road ?? "").replace(new RegExp("^" + (x.road ?? "").replace(/\s+/g, "\\s*") + "\\s*"), "");
function lsStrakRader(p: Strak, kod: number, d: { vaglag: LanSegment[] }): StrakRad[] {
  const segs = d.vaglag.filter((x) => x.lan === kod && x.road);
  return p.strak.flatMap((s) => {
    const delar = s.delar.map(([vag, plats]) => segs.find((x) => x.road === vag && lsSegPlats(x) === plats)).filter((x): x is LanSegment => !!x);
    if (!delar.length) return [];
    const halt = delar.filter((x) => arHalt(x.code, x.info));
    return [{ fran: s.fran ?? p.fran ?? "", till: s.till, vagar: [...new Set(s.delar.map(([v]) => lsDwVag(v)))].join("/"),
      halt: halt.length, delar: delar.length, var_: halt.map((x) => lsSegPlats(x).replace(/ - /g, "–")) }];
  });
}
const lsStrakBas = (p: Strak) => p.rubrik ? p.rubrik.replace(/ just nu$/, "").replace(/^Stråken/, "stråken") : `pendlarvägarna från ${p.fran}`;
const lsStor = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const lsStrakNamn = (r: StrakRad) => `<span style="${LS_DW_GRA}">${lsEsc(r.fran)}–</span><b>${lsEsc(r.till)}</b>`;
function lsStrakCsv(rader: StrakRad[], bas: string): string {
  const hala = rader.filter((r) => r.halt);
  const ut = hala.map((r) => [lsStrakNamn(r), lsEsc(r.vagar), lsDwEtikett(r.halt, r.delar), lsEsc(r.var_.join(" · "))]);
  if (!ut.length) ut.push([`Ingen halka på ${bas} just nu.`, "", "", ""]);
  return lsDwCsv([["Stråk", "Väg", "Halka", "Var"], ...ut]);
}
const lsStrakRad = (r: StrakRad) => `<span style="${LS_DW_RAD}"><span style="flex:1 1 46%">${lsStrakNamn(r)}</span>`
  + `<span style="${lsDwStil("flex:0 0 18%", "color:#6F7C83")}">${lsEsc(r.vagar)}</span><span style="flex:1 1 26%">${lsDwEtikett(r.halt, r.delar)}</span></span>`;
const lsStrakKnapp = (rader: StrakRad[]) => {
  const ovr = rader.filter((r) => !r.halt);
  return lsDwKnapp(ovr.length < rader.length ? "Visa övriga stråk" : "Visa alla stråk", ovr.length, ovr.map(lsStrakRad).join(""));
};
const lsVagRadDw = (r: VagRad) => `<span style="${LS_DW_RAD}"><span style="flex:0 0 16%"><b>${lsEsc(lsDwVag(r.vag))}</b></span>`
  + `<span style="flex:0 0 30%">${lsDwEtikett(r.halt, r.strackor)}</span><span style="flex:1">${lsDwTemp(r.st)}</span>`
  + (r.halt && r.namn.length ? `<span style="${lsDwStil("flex:0 0 100%", "font-size:12px", "color:#6F7C83")}">${lsEsc(r.namn.join(" · "))}</span>` : "") + "</span>";
const lsVagKnapp = (vr: VagRad[]) => {
  const ovr = vr.filter((r) => !r.halt);
  return lsDwKnapp(ovr.length < vr.length ? "Visa övriga vägar" : "Visa alla vägar", ovr.length, ovr.map(lsVagRadDw).join(""));
};
/** Länets fyra tal på en rad (rutans flik Länet): halka, stationer på 0 °C eller kallare, kallast och pågående olyckor. */
function lsDwFakta(l: LanLage, now: Date): string {
  const halka = l.halt.length ? `<span style="${LS_DW_GUL}">halka på ${l.halt.length} av ${l.vagavsnitt} vägavsnitt</span>` : `ingen halka på länets ${l.vagavsnitt} vägavsnitt`;
  const kalla = l.kalla.length ? `<b>${lsPlural(l.kalla.length, "station", "stationer")}</b> på 0 °C eller kallare · kallast <b>${lsGrad(l.kalla[0].yta)}</b> vid ${lsEsc(l.kalla[0].name)}`
    : "ingen station på 0 °C eller kallare";
  const olyckor = l.olyckor.length ? lsPlural(l.olyckor.length, "olycka eller hinder pågår", "olyckor eller hinder pågår") : "inga pågående olyckor";
  return `Kl. ${lsTid(now, false)} enligt Trafikverket: ${halka} · ${kalla} · ${olyckor}`;
}
const lsDwMeta = (title: string, intro: string, notes: string, slug: string) => JSON.stringify({
  title, describe: { intro, "source-name": "Trafikverket via Halkvakt", "source-url": `${SIDBAS}/lan/${slug}/` }, annotate: { notes },
});
const lsDwFot = (vag: boolean) => `<br>${LS_DW_FOT_HALKA}${vag ? " " + LS_DW_FOT_VAG : ""}`;

/** Pendlingstabellen (data/datawrapper/pendling-<nyckel>.*, Axel 2/11): bara stråken med halka, de andra bakom en knapp. */
function lsPendlingDw(nyckel: string, d: { vaglag: LanSegment[]; now: Date }): Record<string, string> {
  const p = STRAK[nyckel], lan = LAN.find((l) => l.slug === (p.lan ?? nyckel))!, bas = lsStrakBas(p);
  const rader = lsStrakRader(p, lan.kod, d), halt = rader.some((r) => r.halt);
  return {
    [`data/datawrapper/pendling-${nyckel}.csv`]: lsStrakCsv(rader, bas),
    [`data/datawrapper/pendling-${nyckel}.json`]: lsDwMeta(halt ? `Halka på ${bas}` : `${lsStor(bas)} just nu`,
      `Kl. ${lsTid(d.now, false)} enligt Trafikverket.`, `<span style="${LS_DW_NORMAL}">${lsStrakKnapp(rader)}</span>${lsDwFot(false)}`, lan.slug),
  };
}
/** Hela läget (data/datawrapper/hela-<län>.*, Axel 2/11): länets tal i ingressen, pendlingen som tabell när länet har stråk, och
 *  vägarna som egen sektion; varje sektion visar bara det som är halt och fäller in resten. Utan stråk är vägarna tabellen. */
function lsHelaDw(lan: (typeof LAN)[number], l: LanLage, d: { vaglag: LanSegment[]; stationer: LanStation[]; now: Date }): Record<string, string> {
  const vr = lsVagRader(lan.kod, d), haltV = vr.filter((r) => r.halt);
  const vagRubrik = haltV.length ? "Halka på länets stora vägar" : "Länets stora vägar";
  const p = STRAK[lan.slug] && (STRAK[lan.slug].lan ?? lan.slug) === lan.slug ? STRAK[lan.slug] : null;
  const fakta = lsDwFakta(l, d.now), titel = `Väglaget i ${lan.kort} just nu`;
  let csv: string, intro: string, notes: string;
  if (p) {
    const bas = lsStrakBas(p), rader = lsStrakRader(p, lan.kod, d), halt = rader.some((r) => r.halt);
    csv = lsStrakCsv(rader, bas);
    intro = `${fakta}<br><b style="${LS_DW_SEKTION}">${halt ? `Halka på ${bas}` : lsStor(bas)}</b>`;
    notes = `<span style="${LS_DW_NORMAL}">${lsStrakKnapp(rader)}<b style="${LS_DW_SEKTION}">${vagRubrik}</b>`
      + (haltV.length ? haltV.map(lsVagRadDw).join("") : `<span style="${LS_DW_RAD}">Ingen halka på länets stora vägar just nu.</span>`)
      + `${lsVagKnapp(vr)}</span>${lsDwFot(true)}`;
  } else {
    const ut = haltV.map((r) => [lsDwVag(r.vag), lsDwEtikett(r.halt, r.strackor), lsDwTemp(r.st), lsEsc(r.namn.join(" · "))]);
    if (!ut.length) ut.push(["", "Ingen halka på länets stora vägar just nu.", "", ""]);
    csv = lsDwCsv([["Väg", "Halka", "Vägbanan", "Var"], ...ut]);
    intro = `${fakta}<br><b style="${LS_DW_SEKTION}">${vagRubrik}</b>`;
    notes = `<span style="${LS_DW_NORMAL}">${lsVagKnapp(vr)}</span>${lsDwFot(true)}`;
  }
  return { [`data/datawrapper/hela-${lan.slug}.csv`]: csv, [`data/datawrapper/hela-${lan.slug}.json`]: lsDwMeta(titel, intro, notes, lan.slug) };
}

/** Vanliga frågor (25/10, DECISIONS #722): synliga på sidan och som FAQPage. Svaren säger bara vad sidan och appen gör. */
function lsFragor(namn: string, var_ = `i ${namn}`): { fraga: string; svar: string }[] {
  return [
    { fraga: `Hur ofta uppdateras väglaget ${var_}?`, svar: "Sidan skrivs om var 30:e minut med Trafikverkets senaste väglagsrapport, vägbanans temperatur vid vägväderstationerna och pågående olyckor." },
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

/** Länets namn i titeln (29/10, Search Console): sökordet utan "län", utom när en ortssida bär samma namn ("Halka i Uppsala idag")
 *  — då heter länssidan "Uppsala län", så att de två sidorna inte tävlar om samma sökning med samma titel. */
const lsLanTitelnamn = (lan: (typeof LAN)[number]) =>
  ORTER.some((o) => o.namn === lsSoknamn(lan.kort)) ? lan.kort : lsSoknamn(lan.kort);

/** ORTSSIDORNA (28/10): de orter folk skriver i sökrutan ("halka karlstad", "väglag umeå"). En ort är med när minst två av
 *  Trafikverkets vägavsnitt i dess eget län bär ortens namn ("E 18 Karlstad - Kristinehamn"); sidan visar just de avsnitten, med
 *  Trafikverkets ord, och länets läge. Inget påstås om vägen mellan avsnitten. Uppmätt 28/10: 2–14 avsnitt per ort.
 *  Koordinaten (6/11, DECISIONS #806) är tätortens punkt i Wikidata (P625, CC0, läst 6/11 2026), avrundad till tre decimaler, och
 *  används bara till att välja vägväderstationerna inom LS_NARA_KM från orten — Borås 6/11: Trafikverkets sex sträckor sa normalt
 *  hela dagen medan alla 13 stationer inom 30 km låg under noll, och det var stationerna de som googlade Borås kom för. */
export const ORTER: { namn: string; lan: number; lon: number; lat: number }[] = [
  { namn: "Stockholm", lan: 1, lon: 18.046, lat: 59.31 }, { namn: "Södertälje", lan: 1, lon: 17.599, lat: 59.194 },
  { namn: "Uppsala", lan: 3, lon: 17.639, lat: 59.85 }, { namn: "Eskilstuna", lan: 4, lon: 16.513, lat: 59.377 },
  { namn: "Nyköping", lan: 4, lon: 17.018, lat: 58.758 }, { namn: "Linköping", lan: 5, lon: 15.626, lat: 58.409 },
  { namn: "Norrköping", lan: 5, lon: 16.149, lat: 58.579 }, { namn: "Motala", lan: 5, lon: 15.037, lat: 58.544 },
  { namn: "Jönköping", lan: 6, lon: 14.167, lat: 57.783 }, { namn: "Växjö", lan: 7, lon: 14.803, lat: 56.889 },
  { namn: "Kalmar", lan: 8, lon: 16.366, lat: 56.664 }, { namn: "Visby", lan: 9, lon: 18.307, lat: 57.629 },
  { namn: "Karlskrona", lan: 10, lon: 15.631, lat: 56.192 }, { namn: "Malmö", lan: 12, lon: 13.0, lat: 55.583 },
  { namn: "Helsingborg", lan: 12, lon: 12.721, lat: 56.042 }, { namn: "Lund", lan: 12, lon: 13.199, lat: 55.708 },
  { namn: "Kristianstad", lan: 12, lon: 14.126, lat: 56.021 }, { namn: "Halmstad", lan: 13, lon: 12.857, lat: 56.674 },
  { namn: "Varberg", lan: 13, lon: 12.273, lat: 57.097 }, { namn: "Göteborg", lan: 14, lon: 11.967, lat: 57.708 },
  { namn: "Borås", lan: 14, lon: 12.946, lat: 57.717 }, { namn: "Trollhättan", lan: 14, lon: 12.289, lat: 58.283 },
  { namn: "Skövde", lan: 14, lon: 13.854, lat: 58.399 }, { namn: "Uddevalla", lan: 14, lon: 11.938, lat: 58.349 },
  { namn: "Karlstad", lan: 17, lon: 13.51, lat: 59.387 }, { namn: "Arvika", lan: 17, lon: 12.593, lat: 59.658 },
  { namn: "Örebro", lan: 18, lon: 15.197, lat: 59.267 }, { namn: "Västerås", lan: 19, lon: 16.542, lat: 59.617 },
  { namn: "Falun", lan: 20, lon: 15.656, lat: 60.603 }, { namn: "Borlänge", lan: 20, lon: 15.427, lat: 60.488 },
  { namn: "Mora", lan: 20, lon: 14.564, lat: 61.01 }, { namn: "Sälen", lan: 20, lon: 13.268, lat: 61.156 },
  { namn: "Älvdalen", lan: 20, lon: 14.044, lat: 61.225 }, { namn: "Gävle", lan: 21, lon: 17.144, lat: 60.675 },
  { namn: "Hudiksvall", lan: 21, lon: 17.112, lat: 61.729 }, { namn: "Sundsvall", lan: 22, lon: 17.286, lat: 62.396 },
  { namn: "Örnsköldsvik", lan: 22, lon: 18.676, lat: 63.265 }, { namn: "Härnösand", lan: 22, lon: 17.938, lat: 62.632 },
  { namn: "Sollefteå", lan: 22, lon: 17.267, lat: 63.16 }, { namn: "Östersund", lan: 23, lon: 14.636, lat: 63.179 },
  { namn: "Umeå", lan: 24, lon: 20.271, lat: 63.828 }, { namn: "Skellefteå", lan: 24, lon: 20.953, lat: 64.751 },
  { namn: "Lycksele", lan: 24, lon: 18.675, lat: 64.596 }, { namn: "Vilhelmina", lan: 24, lon: 16.659, lat: 64.626 },
  { namn: "Luleå", lan: 25, lon: 22.191, lat: 65.584 }, { namn: "Piteå", lan: 25, lon: 21.451, lat: 65.32 },
  { namn: "Kiruna", lan: 25, lon: 20.303, lat: 67.849 },
];
export const ortSlug = (namn: string) => namn.toLowerCase().replace(/[åä]/g, "a").replace(/ö/g, "o");

/** Vägväderstationerna inom LS_NARA_KM från ortens punkt (6/11, DECISIONS #806), kallast först. Storcirkelavstånd; stationer utan
 *  koordinat (Node-vägen utan appVader) räknas inte. 30 km är avståndet Axel mätte Borås med 6/11. */
export const LS_NARA_KM = 30;
export function lsNaraStationer(ort: { lon: number; lat: number }, stationer: LanStation[], km = LS_NARA_KM): LanStation[] {
  const r = (g: number) => (g * Math.PI) / 180;
  const nara = stationer.filter((s) => {
    if (s.lon === undefined || s.lat === undefined) return false;
    const a = Math.sin(r(s.lat - ort.lat) / 2) ** 2 + Math.cos(r(ort.lat)) * Math.cos(r(s.lat)) * Math.sin(r(s.lon - ort.lon) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a)) <= km;
  });
  return nara.sort((a, b) => a.yta - b.yta || a.name.localeCompare(b.name, "sv"));
}

/** Avsnitten som bär ortens namn, i ortens län. "Länsgräns Värmland/Örebro" är ett län, inte orten, och räknas inte. */
function lsOrtAvsnitt(ort: { namn: string; lan: number }, vaglag: LanSegment[]): LanSegment[] {
  const rx = new RegExp(`(^|[^\\p{L}])${ort.namn}($|[^\\p{L}])`, "u");
  return vaglag.filter((s) => s.lan === ort.lan && rx.test((s.plats ?? "").replace(/Länsgräns[^-]*/g, "")));
}

/** Raden under svaret på läns-, orts- och vägsidorna när SMHI har en vägvarning där (1/11): SMHI:s nivå och händelse, och länken. */
function lsVarnadRad(v: Vagvarning[], var_: string, rot: string, medOmrade = false): string {
  if (!v.length) return "";
  const vad = [...new Set(v.map((x) => `${x.niva.toLowerCase()} varning, ${x.event.toLowerCase()}${medOmrade ? ` (${x.omrade})` : ""}`))].join("; ");
  return `<p class="varnad">SMHI varnar ${lsEsc(var_)}: ${lsEsc(vad)}. <a href="${rot}varningar/">Varningen och vägarna i de varnade länen</a></p>\n`;
}

const lsOch = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} och ${xs[xs.length - 1]}`);
const lsGaller = (v: Vagvarning) => v.start && v.slut ? `Gäller från ungefär ${lsTid(new Date(v.start))} till ungefär ${lsTid(new Date(v.slut))}, enligt SMHI.`
  : v.start ? `Gäller från ungefär ${lsTid(new Date(v.start))}, enligt SMHI.` : "";

const LS_VARN_STIL = `<style>.varnade{display:grid;gap:14px;margin:22px 0 0}.varn{background:var(--panel);border:1px solid var(--kant);border-radius:18px;padding:6px 20px}
.varn .smhi{font:600 19px/1.3 var(--sans);letter-spacing:-.01em;padding:16px 0 6px}.varn .smhi small{display:block;font:500 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--dampad);margin-bottom:6px}
.varn .smhitext{margin:0 0 10px;color:var(--text2)}.varn .rad{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:baseline;padding:13px 0;border-top:1px dashed var(--skilje)}
.varn .k{font:500 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--dampad);min-width:0}.varn .v{font:500 15px var(--mono);text-align:right;font-variant-numeric:tabular-nums}.varn .v.halt{color:var(--gul)}
.varn .lankar{padding:12px 0 14px;border-top:1px dashed var(--skilje);font-size:15px}.varn .lankar a{margin-right:18px}
.nivaer{list-style:none;padding:0;margin:0}.nivaer li{padding:12px 0;border-top:1px dashed var(--skilje)}.nivaer li:first-child{border-top:0}
.nivaer b{font:600 13px var(--mono);letter-spacing:.08em;margin-right:10px;text-transform:uppercase}</style>`;
const LS_VARN_FRAGOR = [
  { fraga: "Betyder en varning för snöfall att vägen är hal?", svar: "Inte alltid. SMHI varnar för vad vädret kan ställa till med i ett område under en period. Trafikverket rapporterar hur varje vägavsnitt är just nu. Därför visar sidan båda bredvid varandra." },
  { fraga: "Var ser jag om det är halt där SMHI varnar?", svar: "Här på sidan, län för län: halka eller vinterväglag enligt Trafikverket och vägbanans temperatur vid mätstationerna. Varje län har också en egen sida med vägarna en och en." },
  { fraga: "Gör Halkvakt en egen prognos på den här sidan?", svar: "Nej. Varningen är SMHI:s, med SMHI:s ord, och vägläget är Trafikverkets. Sidan skrivs om var 30:e minut." },
];

/** SMHI:s vägvarningar med Trafikverkets läge i varje varnat län (1/11, Klart-genomlysningen och marknad/vagsokningar.md i
 *  projektet): varningen med SMHI:s ord, vägarna med Trafikverkets. Ingen egen prognos på sidan. */
function lsVarningssida(varn: Vagvarning[], lagen: Map<number, LanLage>, now: Date): string {
  const nar = `Kl. ${lsTid(now, false)}`;
  const lanen = [...new Set(varn.flatMap((v) => v.lan))].map((kod) => LAN.find((l) => l.kod === kod)!);
  const halt = lanen.reduce((n, l) => n + lagen.get(l.kod)!.halt.length, 0), avsnitt = lanen.reduce((n, l) => n + lagen.get(l.kod)!.vagavsnitt, 0);
  // Varje område med sin nivå och händelse, med SMHI:s ord; fler än tre områden sägs som ett antal (korten visar dem).
  const omraden = [...new Set(varn.map((v) => v.omrade))];
  const var_ = omraden.length > 3 ? `${omraden.length} områden` : lsOch(omraden);
  const vad = varn.length > 3 ? var_ : lsOch(varn.map((v) => `${v.omrade} (${v.niva.toLowerCase()} varning, ${v.event.toLowerCase()})`));
  const ilan = lanen.length === 1 ? lsSoknamn(lanen[0].kort) : `de ${lanen.length} länen`;
  const trv = !lanen.length ? "" : halt
    ? `Trafikverket rapporterar halka eller vinterväglag på ${halt} av ${avsnitt} vägavsnitt i ${ilan}.`
    : `Trafikverket rapporterar ingen halka på ${avsnitt} vägavsnitt i ${ilan} just nu.`;
  const hala = LAN.filter((l) => lagen.get(l.kod)!.halt.length);
  const svar = varn.length ? `${nar} varnar SMHI i ${vad}. ${trv}`.trim()
    : `${nar} har SMHI ingen varning för snöfall, underkylt regn eller is. ${hala.length
      ? `Trafikverket rapporterar halka eller vinterväglag i ${lsPlural(hala.length, "län", "län")}: ${hala.map((l) => l.kort).join(", ")}.`
      : "Trafikverket rapporterar ingen halka i något län just nu."}`;
  const beskrivning = varn.length
    ? `${nar}: SMHI varnar i ${var_}.${lanen.length ? ` Trafikverket: ${halt ? `halka eller vinterväglag på ${halt} av ${avsnitt}` : `ingen halka på ${avsnitt}`} vägavsnitt där.` : ""} Uppdaterat var 30:e minut.`
    : `${nar} har SMHI ingen varning för snöfall, underkylt regn eller is. Trafikverkets väglag län för län, uppdaterat var 30:e minut.`;
  const kort = varn.map((v) => {
    const huvud = `<div class="smhi"><small>SMHI · ${lsEsc(v.niva)} varning</small>${lsEsc(v.event)} · ${lsEsc(v.omrade)}</div>` +
      (v.text && v.text !== v.event ? `<p class="smhitext">${lsEsc(v.text)}</p>` : "") + (lsGaller(v) ? `<p class="smhitext">${lsEsc(lsGaller(v))}</p>` : "");
    const lan = v.lan.map((kod) => {
      const l = LAN.find((x) => x.kod === kod)!, g = lagen.get(kod)!, namn = lsEsc(lsSoknamn(l.kort));
      return `<div class="rad"><span class="k">${namn} · halka eller vinterväglag</span><span class="v${g.halt.length ? " halt" : ""}">${g.halt.length} av ${g.vagavsnitt} vägavsnitt</span></div>` +
        `<div class="rad"><span class="k">${namn} · mätstationer under noll</span><span class="v">${g.kalla.length ? `${g.kalla.length}, kallast ${lsGrad(g.kalla[0].yta)} ${lsEsc(g.kalla[0].name)}` : "0"}</span></div>` +
        `<div class="rad"><span class="k">${namn} · olyckor och hinder</span><span class="v">${g.olyckor.length}</span></div>` +
        `<div class="lankar"><a href="../lan/${l.slug}/">Vägarna i ${namn}</a><a href="../karta.html?lan=${l.slug}">På kartan</a></div>`;
    }).join("");
    return `<article class="varn">${huvud}${lan || '<div class="lankar"><a href="../lan/">Läget i alla län</a></div>'}</article>`;
  }).join("\n");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)} · SMHI och Trafikverket</p>
<h1>Halkvarning just nu</h1>
<p class="svar">${lsEsc(svar)}</p>
<p class="dim">Varningen är SMHI:s, med SMHI:s ord. Vägläget och vägbanans temperatur är Trafikverkets. Halkvakt lägger inte till någon egen prognos här. Vägarna gäller hela länet.</p>
${kort ? `<div class="varnade">\n${kort}\n</div>\n` : ""}<h2>Varningen och vägen är två olika saker</h2>
<p>SMHI varnar för vad vädret kan ställa till med i ett område under en period, till exempel snöfall eller regn som fryser när det träffar marken. Trafikverket rapporterar något annat: hur varje vägavsnitt är just nu, och vägbanans egen temperatur vid vägväderstationerna.</p>
<p>En varning betyder alltså inte att varje väg i länet är hal, och en väg kan vara hal utan att någon varning gäller. Därför står de bredvid varandra här, län för län.</p>
<h2>Vad SMHI:s nivåer betyder</h2>
<ul class="nivaer">
<li><b>Gul</b>Vädret kan påverka samhället och innebära viss fara. Var uppmärksam och ta det försiktigt.</li>
<li><b>Orange</b>Vädret kan få allvarliga följder och större fara. Överväg att skjuta upp sådant som är riskfyllt.</li>
<li><b>Röd</b>Den allvarligaste nivån. Vädret kan få mycket allvarliga följder och stora störningar. Undvik det som är riskfyllt.</li>
</ul>
<p class="dim">Fritt efter SMHI:s beskrivning av varningsnivåerna. SMHI:s egen text står i varje varning på smhi.se.</p>
<h2>Innan du kör</h2>
<p>Titta på ditt län kvällen innan och samma morgon. Länssidan visar vägarna en och en, med Trafikverkets ord, och de kallaste mätstationerna. På <a href="../karta.html">livekartan</a> syns hela landet på en gång. Vill du veta när vägen brukar bli hal, läs <a href="../nar-blir-det-halt.html">när det blir halt på vägarna</a>.</p>
<h2>Vanliga frågor</h2>
${lsFragorHtml(LS_VARN_FRAGOR)}
<nav><h2>Länen</h2><p>${LAN.map((l) => `<a href="../lan/${l.slug}/">${lsEsc(l.kort)}</a>`).join(" · ")}</p></nav>`;
  return lsSkal({
    titel: "Halkvarning idag: SMHI:s varningar för snöfall och is och väglaget län för län | Halkvakt",
    beskrivning, adress: `${SIDBAS}/varningar/`, rot: "../", innehall, now, ct: "varningar", smhi: true,
    extra: LS_VARN_STIL + lsFragorLd(LS_VARN_FRAGOR),
    kallor: "Källor: SMHI:s öppna data om vädervarningar och Trafikverkets öppna data (CC0) om väglag, vägväderstationer och olyckor. Sidan skrivs om var 30:e minut. Fristående från myndigheterna.",
    ladda: { rubrik: "Ska du ut på vägarna?", text: "Appen säger till med rösten innan du är framme vid halkan. Samma data från Trafikverket. Gratis för iPhone, och din position lämnar inte telefonen av sig själv." },
  });
}

function lsOrtsida(ort: (typeof ORTER)[number], lan: (typeof LAN)[number], lanLage: LanLage, now: Date,
  d: { vaglag: LanSegment[]; olyckor: LanOlycka[]; stationer: LanStation[] }, varn: Vagvarning[] = []): string {
  const avsnitt = lsOrtAvsnitt(ort, d.vaglag);
  const halt = avsnitt.filter((s) => arHalt(s.code, s.info));
  const vagar = new Set(avsnitt.map((s) => vagNyckel(s.road)));
  const olyckor = d.olyckor.filter((o) => o.lan === ort.lan && vagar.has(vagNyckel(o.road)));
  const n = lsEsc(ort.namn), lk = lsEsc(lsSoknamn(lan.kort));
  // Stationerna runt orten (6/11, DECISIONS #806): inom LS_NARA_KM, kallast först. Meningen säger vad stationerna visar, aldrig
  // vad vägen mellan dem är (punktkällor säger "vid", inte "på vägen").
  const nara = lsNaraStationer(ort, d.stationer);
  const naraKalla = nara.filter((s) => s.yta <= 0);
  const trv = `Kl. ${lsTid(now, false)} rapporterar Trafikverket ${halt.length
    ? `halka eller vinterväglag på ${halt.length} av ${avsnitt.length} vägavsnitt till och från ${ort.namn}`
    : `ingen halka på ${avsnitt.length} vägavsnitt till och från ${ort.namn}`}.`;
  const lanTemp = lanLage.kalla.length
    ? `I ${lsSoknamn(lan.kort)} ${lanLage.kalla.length === 1 ? "visar 1 mätstation" : `visar ${lanLage.kalla.length} mätstationer`} vägbana på 0 °C eller kallare, kallast ${lsGrad(lanLage.kalla[0].yta)} vid ${lanLage.kalla[0].name}.`
    : `Ingen mätstation i ${lsSoknamn(lan.kort)} visar vägbana under noll.`;
  const svar = nara.length
    ? `${trv} ${naraKalla.length
      ? `${halt.length ? "" : "Men "}${lsPlural(naraKalla.length, "vägväderstation", "vägväderstationer")} inom ${LS_NARA_KM} km från ${ort.namn} visar vägbana på 0 °C eller kallare, kallast ${lsGrad(naraKalla[0].yta)} vid ${naraKalla[0].name}.`
      : nara.length === 1
        ? `Vägväderstationen inom ${LS_NARA_KM} km från ${ort.namn}, ${nara[0].name}, visar vägbana på ${lsGrad(nara[0].yta)}.`
        : `Ingen av de ${nara.length} vägväderstationerna inom ${LS_NARA_KM} km från ${ort.namn} visar vägbana på 0 °C eller kallare; den kallaste, ${nara[0].name}, visar ${lsGrad(nara[0].yta)}.`}`
    : `${trv} ${lanTemp}`;
  const naraRader = nara.slice(0, 10).map((s) =>
    `<li>${lsEsc(s.name)}: ${lsGrad(s.yta)}${s.fukt ? ", nederbörd eller fukt rapporteras" : ""}</li>`).join("\n");
  const rader = [...avsnitt].sort((a, b) => Number(arHalt(b.code, b.info)) - Number(arHalt(a.code, a.info))).map((s) => {
    const h = arHalt(s.code, s.info);
    const vad = [s.text, ...s.info].filter(Boolean).join(", ");
    return `<li><b>${lsEsc(lsVagNamn(s.road ?? ""))}</b>${h ? '<span class="halt">Halka eller vinterväglag</span>' : "Ingen halka rapporterad"}` +
      `<small>${lsEsc(lsStracka(s))}${vad ? ` · ${lsEsc(vad)}` : ""}</small></li>`;
  }).join("\n");
  const grannar = ORTER.filter((o) => o.lan === ort.lan && o.namn !== ort.namn).map((o) => `<a href="../${ortSlug(o.namn)}/">${lsEsc(o.namn)}</a>`).join(" · ");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Är det halt i ${n} just nu?</h1>
<p class="svar">${lsEsc(svar)}</p>
${lsVarnadRad(varn.filter((v) => v.lan.includes(ort.lan)), `i ${lsSoknamn(lan.kort)}`, "../../")}<p class="dim">Väglaget och trafikläget i ${n} idag: vägarna till och från orten enligt Trafikverket, uppdaterat var 30:e minut.</p>
${halt.length ? `<div class="svar-app"><p>Kör du i ${n} idag? Appen säger till med rösten innan du är framme vid halkan.</p><a class="knapp" href="${lsApp("ort-halt")}">Få varningar i appen</a></div>\n` : ""}<h2>Vägarna till och från ${n}</h2>
<ul class="vaglista">\n${rader}\n</ul>
<h2>Vägbanan runt ${n} just nu</h2>
${nara.length ? `<p>Vägbanans temperatur kl. ${lsTid(now, false)} vid Trafikverkets vägväderstationer inom ${LS_NARA_KM} km från ${n}, kallast först:</p>
<ul>\n${naraRader}\n</ul>${nara.length > 10 ? `\n<p class="dim">och ${nara.length - 10} stationer till.</p>` : ""}`
    : `<p>Ingen av Trafikverkets vägväderstationer ligger inom ${LS_NARA_KM} km från ${n}. Länets stationer står under Hela ${lk}.</p>`}
<h2>Pågående olyckor</h2>
${olyckor.length ? `<ul>\n${olyckor.slice(0, 10).map((o) => `<li>${lsEsc(lsVagNamn(o.road ?? "Väg"))}${o.start ? `, sedan ${lsTid(new Date(o.start))}` : ""}${o.allvar ? ` (${lsEsc(o.allvar)})` : ""}</li>`).join("\n")}\n</ul>`
    : `<p>Trafikverket rapporterar ingen pågående olycka på vägarna genom ${n} i ${lk}.</p>`}
<h2>Hela ${lk}</h2>
<p>${lsEsc(lsSvar(lanLage, "länets", "i länet", now))} Mer på <a href="../../lan/${lan.slug}/">halka och väglag i ${lk}</a>.</p>
<p>Undrar du när vägen blir hal? Läs <a href="../../nar-blir-det-halt.html">när det blir halt på vägarna</a>.</p>
<h2>Vanliga frågor</h2>
${lsFragorHtml(lsFragor(ort.namn))}
<nav>${grannar ? `<h2>Fler orter i ${lk}</h2><p>${grannar}</p>` : ""}<h2>Stora vägar</h2><p>${lsVagLankar("../../")}</p></nav>`;
  // Sökträffens beskrivning: halkan, och vägbanan vid den kallaste stationen inom LS_NARA_KM när någon ligger under noll (6/11).
  const beskrivning = `Kl. ${lsTid(now, false)}: ${halt.length ? `halka eller vinterväglag på ${halt.length} av ${avsnitt.length}` : `ingen halka på ${avsnitt.length}`} vägavsnitt till och från ${ort.namn}${naraKalla.length ? `, vägbanan ${lsGrad(naraKalla[0].yta)} vid ${naraKalla[0].name}` : ""}. ${LS_SLUT}`;
  return lsSkal({
    titel: `Halka i ${ort.namn} idag: väglag och trafikläget just nu | Halkvakt`,
    beskrivning, adress: `${SIDBAS}/ort/${ortSlug(ort.namn)}/`, rot: "../../", innehall, now, ct: "ort", extra: lsFragorLd(lsFragor(ort.namn)),
  });
}

function lsLanssida(lan: (typeof LAN)[number], l: LanLage, now: Date, d: { vaglag: LanSegment[]; stationer: LanStation[] }, varn: Vagvarning[] = []): string {
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
${lsVarnadRad(varn.filter((v) => v.lan.includes(lan.kod)), "i länet", "../../")}<p class="dim">Väglaget och trafikläget i ${lsEsc(lsSoknamn(lan.kort))} idag: halka, vägbanans temperatur och pågående olyckor enligt Trafikverket, uppdaterat var 30:e minut.</p>
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
<p>Undrar du när vägen blir hal? Läs <a href="../../nar-blir-det-halt.html">när det blir halt på vägarna</a>.</p>
<nav>${ORTER.some((o) => o.lan === lan.kod) ? `<h2>Orter i ${lsEsc(lsSoknamn(lan.kort))}</h2><p>${ORTER.filter((o) => o.lan === lan.kod).map((o) => `<a href="../../ort/${ortSlug(o.namn)}/">${lsEsc(o.namn)}</a>`).join(" · ")}</p>` : ""}<h2>Andra län</h2><p>${andra}</p><h2>Stora vägar</h2><p>${lsVagLankar("../../")}</p></nav>`;
  return lsSkal({
    titel: `Halka i ${lsLanTitelnamn(lan)} idag: väglag och trafikläget just nu | Halkvakt`,
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
<p>Se hela landet på <a href="../karta.html">livekartan</a>.</p>
<h2 id="orter">Län, orter och vägar</h2>
${lsLankar("../")}`;
  return lsSkal({
    titel: "Halka och väglag i Sverige just nu, län för län | Halkvakt",
    beskrivning: lsOversiktBeskrivning(lagen, now),
    adress: `${SIDBAS}/lan/`, rot: "../", innehall, now, ct: "lanen", aktiv: "lanen",
  });
}

/** Länkarna till varje län, ort och väg (3/11, treg-rapporten): en ortssida nåddes bara från sitt län. Står på /lan/ och, via
 *  publicera, mellan markörerna <!-- hv:lankar --> på startsidan. `rot` är vägen till sajtens rot från sidan. */
export function lsLankar(rot: string): string {
  const lan = LAN.map((l) => {
    const orter = ORTER.filter((o) => o.lan === l.kod).map((o) => `<a href="${rot}ort/${ortSlug(o.namn)}/">${lsEsc(o.namn)}</a>`);
    return `<li><a href="${rot}lan/${l.slug}/"><b>${lsEsc(l.kort)}</b></a>${orter.length ? ` · ${orter.join(" · ")}` : ""}</li>`;
  }).join("\n");
  return `<ul class="hv-lankar">\n${lan}\n</ul>
<p class="hv-lankar-vagar"><b>Stora vägar:</b> ${lsVagLankar(rot)}</p>
<p class="hv-lankar-vagar"><a href="${rot}varningar/">Halkvarning idag: SMHI:s varningar</a> · <a href="${rot}nar-blir-det-halt.html">När blir det halt?</a> · <a href="${rot}app-som-varnar-for-halka.html">App som varnar för halka</a></p>`;
}

/** Byter innehållet mellan <!-- hv:namn --> och <!-- /hv:namn --> i en handskriven sida; null när markörerna saknas eller inget ändras. */
export function medBlock(html: string, namn: string, innehall: string): string | null {
  const start = `<!-- hv:${namn} -->`, slut = `<!-- /hv:${namn} -->`;
  const a = html.indexOf(start), b = html.indexOf(slut);
  if (a < 0 || b < a) return null;
  const ny = html.slice(0, a + start.length) + "\n" + innehall + "\n" + html.slice(b);
  return ny === html ? null : ny;
}

/** Byter innehållet i elementet med ett visst id i en handskriven sida (6/11, DECISIONS #806): samma element som sidans eget skript
 *  fyller med textContent, så att talen står i HTML:en redan när sidan hämtas. Elementet får inte rymma ett element av samma slag.
 *  null när id:t saknas eller inget ändras. */
export function medId(html: string, id: string, innehall: string): string | null {
  const m = new RegExp(`<([a-z]+)(?:\\s[^>]*?)?\\sid="${id}"[^>]*>`).exec(html);
  if (!m) return null;
  const a = m.index + m[0].length, b = html.indexOf(`</${m[1]}>`, a);
  if (b < 0) return null;
  const ny = html.slice(0, a) + innehall + html.slice(b);
  return ny === html ? null : ny;
}

/** STARTSIDANS OCH KARTANS TEXT I HTML (6/11, DECISIONS #806). Startsidan och karta.html räknar sina tal i webbläsaren ur
 *  data/vader.geojson, data/vaglag.geojson och data/lan.json, och HTML:en bär "–" tills skriptet gått: det är vad Google, ChatGPT och
 *  Perplexity läser, och de kör inte skriptet. Samma tal räknas här, med samma regler som skriptet (index.html: rimlig, yta < 0,
 *  arHalt; karta.html: kod över 1), och skrivs in i samma element, så att skriptet sedan bara skriver samma sak en gång till.
 *  Ändras en regel i sidan ändras den här, och provet i test/lanssidor.test.ts läser sidans skript. */
export type StartTal = { vader: { land: string; name: string; yta: number | null; luft: number | null }[];
  vaglag: { code: number | null; info: string[] }[]; lan: { kort: string; slug: string; halt: number; vagavsnitt: number }[]; now: Date };
export function lsStartsida(d: StartTal): Record<string, string> {
  const rimlig = (p: { yta: number | null; luft: number | null }) => p.yta != null && p.yta > -40 && p.yta < 60 && (p.luft == null || Math.abs(p.yta - p.luft) < 15);
  const ren = (n: string) => n.replace(/^\d+\s*/, "").replace(/\s+(Fjärryta|Yta|Vägyta)$/i, "").trim();
  const stat = d.vader.filter((p) => p.land === "SE" && rimlig(p)) as { name: string; yta: number }[];
  const kalla = stat.filter((p) => p.yta < 0);
  const kallast = stat.reduce<{ name: string; yta: number } | null>((a, p) => (!a || p.yta < a.yta ? p : a), null);
  const halt = d.vaglag.filter((s) => arHalt(s.code, s.info)).length;
  const plats = kallast ? ren(kallast.name) : "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric",
    month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d.now).map((x) => [x.type, x.value]));
  const MAN = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const tid = `${p.hour}:${p.minute}`;
  const hala = d.lan.filter((l) => l.halt > 0).sort((a, b) => b.halt - a.halt);
  const namn = hala.map((l) => l.kort);
  const lanText = hala.length
    ? `Halka eller vinterväglag på ${lsPlural(hala.reduce((s, l) => s + l.halt, 0), "sträcka", "sträckor")}, i ${namn.length > 1 ? `${namn.slice(0, -1).join(", ")} och ${namn[namn.length - 1]}` : namn[0]}.`
    : "Trafikverket rapporterar ingen halka just nu.";
  const stationer = !kallast ? "" : kalla.length
    ? `${lsPlural(kalla.length, "station", "stationer")} under noll. Kallast vid ${plats}.`
    : `Ingen station under noll. Kallast vid ${plats}, ${lsGrad(kallast.yta)}.`;
  const lista = (hala.length
    ? hala.map((l) => `<a class="lan-halt" href="lan/${l.slug}/" title="Halka eller vinterväglag på ${l.halt} av ${l.vagavsnitt} vägavsnitt">${lsEsc(l.kort)} · ${l.halt}</a>`)
    : ['<span class="lugnt">Ingen halka rapporterad just nu.</span>']).concat('<a class="lank-mono" href="lan/">Alla 21 län →</a>').join("");
  return {
    "h-tid": `Just nu · ${p.weekday} ${p.day} ${MAN[Number(p.month) - 1]} · ${tid}`,
    "k-tid": `Livekartan · uppdaterad ${tid}`,
    "t-tid": `Hela landet · ${tid}`,
    "l-mening": lsEsc([lanText, stationer].filter(Boolean).join(" ")),
    "halt-lista": lista,
    "t-halka": String(halt), "k-halka": String(halt),
    "t-kalla": String(kalla.length), "k-kalla": String(kalla.length),
    "t-av": `av ${stat.length} stationer`, "k-varma": String(stat.length - kalla.length),
    "t-kallast": kallast ? lsGrad(kallast.yta) : "–", "t-plats": kallast ? `vid ${lsEsc(plats)}` : "",
  };
}
/** karta.html: klockslaget och landets mening, som sidans eget skript skriver dem (halkMening med 'landets', kod över 1). */
export function lsKartsida(d: Pick<StartTal, "vaglag" | "now">): Record<string, string> {
  const alla = d.vaglag.length, hala = d.vaglag.filter((s) => (s.code ?? 0) > 1).length;
  return {
    tid: `Uppdaterad ${lsTid(d.now, false)}`,
    ...(alla ? { rader: hala ? `${hala} av ${alla} sträckor med halka eller vinterväglag.` : `Ingen av landets ${alla} sträckor har halka eller vinterväglag i Trafikverkets rapport.` } : {}),
  };
}

/** Alla sidor, nyckel = sökvägen i kartsajten. */
export function byggLanssidor(d: { vaglag: LanSegment[]; stationer: LanStation[]; olyckor: LanOlycka[]; now: Date; smhi?: SmhiRad[] }): Record<string, string> {
  const lagen = new Map(LAN.map((lan) => [lan.kod, lsLage(lan.kod, d)] as const));
  const varn = vagvarningar(d.smhi ?? []);
  const vagar = new Map(VAGAR.map((v) => [v.slug, lsVagLage(v.nyckel, d)] as const));
  const ut: Record<string, string> = { "lan/index.html": lsOversikt(lagen, vagar, d.now), "data/lan.json": lsLanJson(lagen, vagar, d.now),
    "data/strackor.json": lsStrackorJson(d) };
  for (const lan of LAN) {
    ut[`lan/${lan.slug}/index.html`] = lsLanssida(lan, lagen.get(lan.kod)!, d.now, d, varn);
    ut[`data/datawrapper/${lan.slug}.csv`] = lsDatawrapperCsv(lan.kod, d);
    ut[`data/datawrapper/${lan.slug}.json`] = lsDatawrapperMeta(lan, lagen.get(lan.kod)!, d.now);
    Object.assign(ut, lsHelaDw(lan, lagen.get(lan.kod)!, d));
  }
  for (const nyckel of Object.keys(STRAK)) Object.assign(ut, lsPendlingDw(nyckel, d));
  ut["data/strak.json"] = JSON.stringify(STRAK);
  for (const v of VAGAR) ut[`vag/${v.slug}/index.html`] = lsVagsida(v, vagar.get(v.slug)!, d.now, d, varn);
  for (const o of ORTER) ut[`ort/${ortSlug(o.namn)}/index.html`] = lsOrtsida(o, LAN.find((l) => l.kod === o.lan)!, lagen.get(o.lan)!, d.now, d, varn);
  ut["varningar/index.html"] = lsVarningssida(varn, lagen, d.now);
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

export const sidAdresser = () => [`${SIDBAS}/lan/`, `${SIDBAS}/varningar/`, ...LAN.map((l) => `${SIDBAS}/lan/${l.slug}/`),
  ...VAGAR.map((v) => `${SIDBAS}/vag/${v.slug}/`), ...ORTER.map((o) => `${SIDBAS}/ort/${ortSlug(o.namn)}/`)];

export type SidAndring = { lage: string; andrad: string };

/** Sant lastmod (3/11, treg-rapporten): en genererad sidas datum flyttas bara när dess läge ändras, inte vid varje omskrivning var
 *  30:e minut. Läget är sökbeskrivningen utan klockslaget, alltså svarsmeningen: antalet hala avsnitt, kallaste stationen, varningen.
 *  `forra` är förra körningens läge per adress (data/sidor-andrade.json i kartrepot). Adresser utan byggd sida behåller sitt datum. */
export function sitemapDatum(xml: string, sidor: Record<string, string>, forra: Record<string, SidAndring>, now: Date):
  { xml: string; andrade: Record<string, SidAndring> } {
  const nu = now.toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const andrade: Record<string, SidAndring> = { ...forra };
  for (const url of sidAdresser()) {
    const html = sidor[`${url.slice(SIDBAS.length + 1)}index.html`];
    const besk = html?.match(/<meta name="description" content="([^"]*)"/)?.[1];
    if (!besk) continue;
    const lage = besk.replace(/^Kl\. \d{1,2}:\d{2}:? ?/, "");
    const andrad = forra[url]?.lage === lage ? forra[url].andrad : nu;
    andrade[url] = { lage, andrad };
    const loc = `<loc>${url}</loc>`;
    xml = xml.replace(new RegExp(`<url>\\s*${loc.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}[\\s\\S]*?</url>`),
      (rad) => rad.replace(/<lastmod>[^<]*<\/lastmod>/, "").replace(loc, `${loc}<lastmod>${andrad}</lastmod>`));
  }
  return { xml, andrade };
}

/** Axels sitemap med de adresser som saknas infogade före </urlset>; null när inget saknas eller filen inte går att läsa. */
export function sitemapMed(xml: string, adresser: string[]): string | null {
  const slut = xml.lastIndexOf("</urlset>");
  if (slut < 0) return null;
  const nya = adresser.filter((a) => !xml.includes(`<loc>${a}</loc>`));
  if (!nya.length) return null;
  const rader = nya.map((a) => `  <url><loc>${a}</loc><changefreq>hourly</changefreq><priority>0.6</priority></url>\n`).join("");
  return xml.slice(0, slut) + rader + xml.slice(slut);
}
