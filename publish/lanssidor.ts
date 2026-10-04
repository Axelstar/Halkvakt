// LÄNSSIDORNA (kort #281, DECISIONS #458) — "Halt väglag i Skåne just nu?" för de 21 länen, och "Halt väglag på E4 just nu?" för
// de stora vägarna, skrivna av publicera i kartlagrens varv (var 30:e minut) till kartsajten. Allt här blir PUBLIKT och läses av Google, så sidan säger bara vad källorna säger:
// Trafikverkets väglagsrapport med deras egna ord, vägbanans temperatur vid de stationer som klarar appens vakter, och pågående
// olyckor. Sidan påstår aldrig själv att det är halt.
//
// Ren och körtidsneutral som kartkärnan: inga importer, för scripts/bundle-publicera.ts klistrar in filen i publicera. Namnen får
// därför inte krocka med snapshot-core.ts eller map-core.ts.

/** Kartsajtens adress. Byts den (egen domän) skickar GitHub Pages vidare, men kanoniska adresser och sitemapen följer härifrån. */
export const SIDBAS = "https://axelstar.github.io/halkvakt-karta";

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
    stycke: "E4 går från Helsingborg via Jönköping, Linköping, Stockholm, Gävle, Sundsvall, Umeå och Luleå till Haparanda — från mild kustvinter i söder till lång vinter i norr." },
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

const LS_STIL = `:root{--bg:#0E1B25;--panel:#14344A;--fg:#F3F6F9;--dim:#9FB3C8;--gul:#FFC400;--gron:#1E7A46}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,sans-serif}
a{color:var(--gul)}.wrap{max-width:880px;margin:0 auto;padding:0 20px}header{padding:18px 0;border-bottom:2px solid var(--panel)}
.brand{font-family:ui-monospace,monospace;font-weight:700;color:var(--gul);font-size:20px;letter-spacing:.5px;text-decoration:none}
main{padding:24px 0 8px}h1{font-size:30px;line-height:1.2;margin:6px 0 12px;text-wrap:balance}h2{font-size:19px;margin:26px 0 8px}
.dim{color:var(--dim);font-size:14px}.svar{font-size:19px;background:var(--panel);border-radius:12px;padding:14px 16px}
ul{padding-left:20px}li{margin:4px 0}table{border-collapse:collapse;width:100%;font-size:15px;font-variant-numeric:tabular-nums}
td,th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--panel)}td+td,th+th{white-space:nowrap}nav p{line-height:2}
footer{padding:20px 0 40px;color:var(--dim);font-size:13px}`;

function lsSkal(o: { titel: string; beskrivning: string; adress: string; rot: string; innehall: string }) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${lsEsc(o.titel)}</title>
<meta name="description" content="${lsEsc(o.beskrivning)}">
<link rel="canonical" href="${o.adress}">
<meta property="og:title" content="${lsEsc(o.titel)}">
<meta property="og:description" content="${lsEsc(o.beskrivning)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${o.adress}">
<meta property="og:locale" content="sv_SE">
<meta property="og:image" content="${SIDBAS}/og.png">
<link rel="icon" type="image/png" href="${o.rot}favicon.png">
<style>${LS_STIL}</style>
</head>
<body>
<header><div class="wrap"><a class="brand" href="${o.rot}">HALKVAKT</a></div></header>
<main class="wrap">
${o.innehall}
</main>
<footer><div class="wrap">Källa: Trafikverkets öppna data (väglag, vägväderstationer och olyckor). Sidan skrivs om var 30:e minut.
Halkvakt är en app som varnar med rösten för halka, olyckor, vilt och fartkameror på vägen framför dig — <a href="${o.rot}">läs mer</a>.</div></footer>
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
function lsSvar(l: LanLage, vems = "länets", var_ = "i länet"): string {
  const vag = l.halt.length
    ? `Trafikverket rapporterar halka eller vinterväglag på ${l.halt.length} av ${vems} ${l.vagavsnitt} vägavsnitt.`
    : `Trafikverket rapporterar ingen halka på ${vems} ${l.vagavsnitt} vägavsnitt just nu.`;
  const temp = l.kalla.length
    ? `${lsPlural(l.kalla.length, "mätstation visar", "mätstationer visar")} vägbana på 0 °C eller kallare.`
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
    `<li>${med(s.lan, `${lsEsc(s.name)}: ${lsGrad(s.yta)}${s.fukt ? " — nederbörd eller fukt rapporteras" : ""}`)}</li>`).join("\n");
  const olyckor = l.olyckor.slice(0, 10).map((o) =>
    `<li>${med(o.lan, `${o.start ? `sedan ${lsTid(new Date(o.start))}` : "pågår"}${o.allvar ? ` (${lsEsc(o.allvar)})` : ""}`)}</li>`).join("\n");
  const andra = VAGAR.filter((x) => x.slug !== vag.slug).map((x) => `<a href="../${x.slug}/">${lsEsc(x.namn)}</a>`).join(" · ");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Halt väglag på ${lsEsc(vag.rubrik)} just nu?</h1>
<p class="svar">${lsEsc(lsSvar(l, `${vag.namn}:s`, "vid vägen"))}</p>
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
    titel: `Halt väglag på ${vag.rubrik} just nu? Väglag och vägtemperatur längs vägen | Halkvakt`,
    beskrivning: `Väglaget på ${vag.rubrik} just nu: Trafikverkets rapporter om halka, vägbanans temperatur vid mätstationerna längs vägen och pågående olyckor. Uppdateras var 30:e minut.`,
    adress: `${SIDBAS}/vag/${vag.slug}/`, rot: "../../", innehall,
  });
}

function lsLanssida(lan: (typeof LAN)[number], l: LanLage, now: Date): string {
  const halt = l.halt.slice(0, 15).map((s) => {
    const vad = [s.text, ...s.info].filter(Boolean).join(", ");
    return `<li>${lsEsc(s.plats ?? s.road ?? "Vägavsnitt")}: ${lsEsc(vad)}</li>`;
  }).join("\n");
  const kalla = l.kalla.slice(0, 5).map((s) =>
    `<li>${lsEsc(s.name)}: ${lsGrad(s.yta)}${s.fukt ? " — nederbörd eller fukt rapporteras" : ""}</li>`).join("\n");
  const olyckor = l.olyckor.slice(0, 10).map((o) => `<li>${lsEsc(o.road ?? "Väg")}${o.start ? `, sedan ${lsTid(new Date(o.start))}` : ""}` +
    `${o.allvar ? ` (${lsEsc(o.allvar)})` : ""}</li>`).join("\n");
  const andra = LAN.filter((x) => x.kod !== lan.kod).map((x) => `<a href="../${x.slug}/">${lsEsc(x.kort)}</a>`).join(" · ");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Halt väglag i ${lsEsc(lan.kort)} just nu?</h1>
<p class="svar">${lsEsc(lsSvar(l))}</p>
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
<p>Se hela landet på <a href="../../karta.html">livekartan</a>, eller <a href="../">läget i alla län</a>.</p>
<nav><h2>Andra län</h2><p>${andra}</p><h2>Stora vägar</h2><p>${lsVagLankar("../../")}</p></nav>`;
  return lsSkal({
    titel: `Halt väglag i ${lan.kort} just nu? Väglag och vägtemperatur | Halkvakt`,
    beskrivning: `Väglaget i ${lan.namn} just nu: Trafikverkets rapporter om halka, vägbanans temperatur vid mätstationerna och pågående olyckor. Uppdateras var 30:e minut.`,
    adress: `${SIDBAS}/lan/${lan.slug}/`, rot: "../../", innehall,
  });
}

function lsOversikt(lagen: Map<number, LanLage>, vagar: Map<string, LanLage>, now: Date): string {
  const rad = (href: string, namn: string, l: LanLage) =>
    `<tr><td><a href="${href}">${lsEsc(namn)}</a></td><td>${l.halt.length} av ${l.vagavsnitt}</td><td>${l.kalla.length}</td><td>${l.olyckor.length}</td></tr>`;
  const rader = LAN.map((lan) => rad(`${lan.slug}/`, lan.namn, lagen.get(lan.kod)!)).join("\n");
  const vagrader = VAGAR.map((v) => rad(`../vag/${v.slug}/`, v.namn, vagar.get(v.slug)!)).join("\n");
  const innehall = `<p class="dim">Uppdaterad ${lsTid(now)}</p>
<h1>Halt väglag i Sverige just nu? Läget per län</h1>
<p>Trafikverkets väglagsrapport, vägbanans temperatur vid vägväderstationerna och pågående olyckor, län för län.</p>
<div style="overflow-x:auto"><table>
<thead><tr><th>Län</th><th>Halka¹</th><th>≤ 0 °C²</th><th>Olyckor</th></tr></thead>
<tbody>
${rader}
</tbody>
</table></div>
<p class="dim">¹ Vägavsnitt med halka eller vinterväglag i Trafikverkets rapport, av länets alla. ² Vägväderstationer som visar vägbana på
0 °C eller kallare. Olyckor: pågående, enligt Trafikverket.</p>
<h2>Stora vägar</h2>
<div style="overflow-x:auto"><table>
<thead><tr><th>Väg</th><th>Halka¹</th><th>≤ 0 °C²</th><th>Olyckor</th></tr></thead>
<tbody>
${vagrader}
</tbody>
</table></div>
<p>Se hela landet på <a href="../karta.html">livekartan</a>.</p>`;
  return lsSkal({
    titel: "Halt väglag i Sverige just nu? Läget per län | Halkvakt",
    beskrivning: "Väglaget i alla 21 län just nu: Trafikverkets rapporter om halka, vägbanans temperatur och pågående olyckor. Uppdateras var 30:e minut.",
    adress: `${SIDBAS}/lan/`, rot: "../", innehall,
  });
}

/** Alla sidor, nyckel = sökvägen i kartsajten. */
export function byggLanssidor(d: { vaglag: LanSegment[]; stationer: LanStation[]; olyckor: LanOlycka[]; now: Date }): Record<string, string> {
  const lagen = new Map(LAN.map((lan) => [lan.kod, lsLage(lan.kod, d)] as const));
  const vagar = new Map(VAGAR.map((v) => [v.slug, lsVagLage(v.nyckel, d)] as const));
  const ut: Record<string, string> = { "lan/index.html": lsOversikt(lagen, vagar, d.now) };
  for (const lan of LAN) ut[`lan/${lan.slug}/index.html`] = lsLanssida(lan, lagen.get(lan.kod)!, d.now);
  for (const v of VAGAR) ut[`vag/${v.slug}/index.html`] = lsVagsida(v, vagar.get(v.slug)!, d.now);
  return ut;
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
