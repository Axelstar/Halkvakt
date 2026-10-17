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
.ladda b{font-size:19px}.ladda p{margin:0}.ladda .knapp{justify-self:start}`;
const LS_APP = "https://apps.apple.com/se/app/id6806939784";
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

function lsSkal(o: { titel: string; beskrivning: string; adress: string; rot: string; innehall: string; now?: Date }) {
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
<link rel="stylesheet" href="${o.rot}assets/hv.css">
<style>${LS_STIL}</style>
${lsJsonLd(o)}
</head>
<body>
<header class="topp">
  <div class="wrap">
    <a class="logo" href="${o.rot}" aria-label="Halkvakt, till startsidan">${LS_MARKE}<b>HALKVAKT</b></a>
    <nav class="meny" aria-label="Huvudmeny">
      <a href="${o.rot}#appen">Appen</a>
      <a href="${o.rot}#sa-funkar">Så funkar det</a>
      <a href="${o.rot}karta.html">Livekartan</a>
      <a href="${o.rot}lan/" aria-current="page">Länen</a>
    </nav>
    <a class="knapp" href="${LS_APP}">Ladda ner för iPhone</a>
  </div>
</header>
<main class="wrap">
<div class="dok">
${o.innehall}
<div class="ladda"><b>Hör det här medan du kör.</b><p>Halkvakt säger till med rösten när det är halt på vägen framför dig. Samma data som på den här sidan. Gratis för iPhone.</p><a class="knapp" href="${LS_APP}">Ladda ner i App Store</a></div>
</div>
</main>
<footer class="fot">
  <div class="wrap">
    <a class="logo" href="${o.rot}">${LS_MARKE}<b>HALKVAKT</b></a>
    <p class="kallor">Källa: Trafikverkets öppna data (CC0): väglag, vägväderstationer och olyckor. Sidan skrivs om var 30:e minut. Fristående från myndigheterna.</p>
    <nav aria-label="Sidfot"><a href="${o.rot}karta.html">Livekartan</a><a href="${o.rot}lan/">Länen</a><a href="${o.rot}om.html">Om appen</a><a href="${o.rot}press.html">Press</a><a href="${o.rot}integritet.html">Integritet</a></nav>
  </div>
</footer>
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
    titel: `Är det halt på ${vag.rubrik} just nu? Väglag och vägtemperatur längs vägen | Halkvakt`,
    beskrivning: `Väglaget på ${vag.rubrik} just nu: Trafikverkets rapporter om halka, vägbanans temperatur vid mätstationerna längs vägen och pågående olyckor. Uppdateras var 30:e minut.`,
    adress: `${SIDBAS}/vag/${vag.slug}/`, rot: "../../", innehall, now,
  });
}

function lsLanssida(lan: (typeof LAN)[number], l: LanLage, now: Date): string {
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
<p><a class="lank-mono" href="../../karta.html?lan=${lan.slug}">Se ${lsEsc(lan.kort)} på livekartan →</a></p>
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
<nav><h2>Andra län</h2><p>${andra}</p><h2>Stora vägar</h2><p>${lsVagLankar("../../")}</p></nav>`;
  return lsSkal({
    titel: `Är det halt i ${lan.kort} just nu? Väglag och vägtemperatur | Halkvakt`,
    beskrivning: `Väglaget i ${lan.namn} just nu: Trafikverkets rapporter om halka, vägbanans temperatur vid mätstationerna och pågående olyckor. Uppdateras var 30:e minut.`,
    adress: `${SIDBAS}/lan/${lan.slug}/`, rot: "../../", innehall, now,
  });
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
<h2>Stora vägar</h2>
<div class="tabell"><table>
<thead><tr><th>Väg</th><th>Halka¹</th><th>≤ 0 °C²</th><th>Olyckor</th><th></th></tr></thead>
<tbody>
${vagrader}
</tbody>
</table></div>
<p>Se hela landet på <a href="../karta.html">livekartan</a>.</p>`;
  return lsSkal({
    titel: "Är det halt i Sverige just nu? Läget per län | Halkvakt",
    beskrivning: "Väglaget i alla 21 län just nu: Trafikverkets rapporter om halka, vägbanans temperatur och pågående olyckor. Uppdateras var 30:e minut.",
    adress: `${SIDBAS}/lan/`, rot: "../", innehall, now,
  });
}

/** Alla sidor, nyckel = sökvägen i kartsajten. */
export function byggLanssidor(d: { vaglag: LanSegment[]; stationer: LanStation[]; olyckor: LanOlycka[]; now: Date }): Record<string, string> {
  const lagen = new Map(LAN.map((lan) => [lan.kod, lsLage(lan.kod, d)] as const));
  const vagar = new Map(VAGAR.map((v) => [v.slug, lsVagLage(v.nyckel, d)] as const));
  const ut: Record<string, string> = { "lan/index.html": lsOversikt(lagen, vagar, d.now), "data/lan.json": lsLanJson(lagen, vagar, d.now),
    "data/strackor.json": lsStrackorJson(d) };
  for (const lan of LAN) ut[`lan/${lan.slug}/index.html`] = lsLanssida(lan, lagen.get(lan.kod)!, d.now);
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
