// Nyhetsbedömningen (Bengts order 12/9, DECISIONS #149): läs en källändring och svara på
// "rör det här oss, och vad i så fall?" — i stället för att fråga människan det.
//
// FRÅGAN, ordagrant: "kan man bygga det så att all ny information processas maskinellt och man
// får en bedömning av en nyhet. Det här kan komma att påverka det och det, och att en människa,
// jag eller Axel, bara säger ok."
//
// Före det här sa källvaktens larm: "Bedöm: rör det våra källor/ingest? Stäng när läst." Hela
// bedömningen låg på läsaren. Nu slår larmet upp källan i beroendekartan (#147), matchar
// nyhetens text mot radernas nyckelord och skriver ut VAD SOM BRISTER om posten är vad den ser
// ut att vara.
//
// TRE REGLER SOM INTE FÅR BRYTAS:
//
//  1. Bedömningen FÄLLER ALDRIG NÅGOT. Larmet skickas som förut, med samma issue och samma
//     mottagare. Bedömningen är en rad text ovanför posten, aldrig ett filter. En tyst
//     felbedömning vore långt värre än en läst rad för mycket — motsatsen till "silence is a
//     feature", för här är tystnaden inte vår, den är källans.
//
//  2. "RÖR OSS INTE" kräver POSITIVT BEVIS. Att inga av våra nyckelord finns i texten räcker
//     inte — då blir svaret VET INTE. Först när posten matchar ett FRÄMMANDE ord (något den
//     kanalen skriver om som vi bevisligen inte hämtar, t.ex. SMHI:s PMP3 och Mesan) får
//     bedömningen säga att den inte rör oss. Frånvaro av bevis är inte bevis om frånvaro.
//
//  3. Utan text finns ingen bedömning. En hash-källa som ändrats vet bara ATT något ändrats.
//     Då blir svaret VET INTE med radens brister listade — inte en gissning.

import { type Beroende, raderForKalla } from "./beroenden.ts";

// HTML-entiteter avkodas, inte stryks (kort #264, DECISIONS #413). Källvakten bytte förut varje
// entitet mot ett blanksteg; polisen.se kodar å, ä och ö som entiteter, så vakten läste
// "API ver polisens h ndelser" och ett nyckelord med å/ä/ö kunde aldrig träffa. Namngivna ur
// den lista våra källor använder (svenska, norska, danska, finska tecken och typografin), numeriska
// decimalt och hexadecimalt. En OKÄND namngiven entitet blir blanksteg — som förut, aldrig sämre.
const ENTITET: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  aring: "å", auml: "ä", ouml: "ö", Aring: "Å", Auml: "Ä", Ouml: "Ö", oslash: "ø", Oslash: "Ø", aelig: "æ", AElig: "Æ",
  eacute: "é", Eacute: "É", egrave: "è", uuml: "ü", Uuml: "Ü",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  copy: "©", reg: "®", deg: "°", times: "×", middot: "·", bull: "•" };
export const avkoda = (s: string): string => s.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (hel, e: string) => {
  if (e[0] === "#") {
    const kod = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(kod) && kod > 0 && kod <= 0x10ffff ? String.fromCodePoint(kod) : " ";
  }
  return ENTITET[e] ?? " ";
});

// HTML → normaliserad löptext för hash-källorna: skript, stil och taggar bort, entiteter avkodade,
// blanktecken hopslagna. Flyttad hit från scripts/trv-bevakning.ts 1/10 så att den kan prövas.
export const norm = (html: string): string => avkoda(html
  .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " "))
  .replace(/\s+/g, " ").trim();

export type Grad = "RÖR OSS" | "VET INTE" | "RÖR OSS INTE";

export type Traff = { vard: string; brister: string; ord: string[] };

export type Bedomning = {
  grad: Grad;
  traffar: Traff[];        // produktionsrader vars nyckelord fanns i texten
  tackta: Beroende[];      // alla produktionsrader källan över huvud taget täcker
  frammande: string[];     // främmande ord som hittades
  rader: string[];         // färdiga textrader till issuet
};

// Matchningen kräver ORDBÖRJAN, inte bara delsträng. Rak `includes` gör korta nyckelord till
// falsklarmsmaskiner: "api" träffar *rapid*, "cap" träffar *kapacitet*, "is" träffar *Diesel*.
// Samma lookbehind som motorn använder (engine.ts:43, satt mot augustis åtta falsklarm).
//
// PRISET är detsamma som där, och det är medvetet valt: en SAMMANSÄTTNING där ordet inte står
// först missas — "snöfallsvarning" matchar inte "varning". Men ett missat nyckelord gör larmet
// 🟡 VET INTE, aldrig tyst, och ett missat FRÄMMANDE ord gör att vi INTE säger "rör oss inte".
// Båda missarna faller alltså åt det säkra hållet: mot att posten läses.
//
// Ingen avslutande gräns: "pmp" måste träffa *PMP3*, som är precis vad SMHI kallade API:et
// de avvecklade 31 mars.
const orden = (text: string, ord: string[] | undefined): string[] => {
  if (!ord?.length) return [];
  return ord.filter((o) =>
    new RegExp(`(?<![a-zåäöé0-9])${o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text));
};

export function bedom(kallnamn: string, text: string, kartan: Beroende[]): Bedomning {
  const rader_ = raderForKalla(kartan, kallnamn);
  const tackta = rader_.filter((b) => b.roll === "produktion");
  // Främmande ord deklareras på SIGNALraden (nyhetskanalen), inte på produktionsraden.
  const frammandeOrd = rader_.flatMap((b) => b.frammande ?? []);

  const traffar: Traff[] = tackta
    .map((b) => ({ vard: b.vard, brister: b.brister, ord: orden(text, b.nyckelord) }))
    .filter((t) => t.ord.length);
  const frammande = orden(text, frammandeOrd);

  const grad: Grad = traffar.length ? "RÖR OSS"
    : (text.trim() && frammande.length) ? "RÖR OSS INTE"
    : "VET INTE";

  const rader: string[] = [];
  if (!tackta.length) {
    rader.push(`**Bedömning: RÖR INGET AV VÅRA BEROENDEN.** \`${kallnamn}\` är en omvärldskälla —`);
    rader.push(`vi hämtar inga data därifrån. Läs om du vill veta vad andra gör.`);
    return { grad: "RÖR OSS INTE", traffar: [], tackta: [], frammande: [], rader };
  }

  if (grad === "RÖR OSS") {
    rader.push(`**Bedömning: RÖR OSS.** Posten nämner ord som hör till ${traffar.length === 1 ? "ett beroende" : `${traffar.length} beroenden`} vi hämtar från:`);
    for (const t of traffar) rader.push(`- \`${t.vard}\` — träff på *${t.ord.join(", ")}*. **Brister:** ${t.brister}`);
    rader.push(`Läs posten och avgör om ändringen kräver kod. Bedömningen är gjord på ORD, inte på förståelse.`);
  } else if (grad === "RÖR OSS INTE") {
    rader.push(`**Bedömning: RÖR OSS SANNOLIKT INTE.** Posten matchar *${frammande.join(", ")}* — sådant`);
    rader.push(`\`${kallnamn}\` skriver om men vi inte hämtar. Inget av våra nyckelord fanns i texten.`);
    rader.push(`Källan täcker annars: ${tackta.map((b) => `\`${b.vard}\``).join(", ")}.`);
  } else {
    rader.push(`**Bedömning: VET INTE — måste läsas.** ${text.trim() ? "Inget av våra nyckelord och inget känt främmande ord fanns i texten." : "Källan är en hash-vakt: vi vet ATT något ändrats, inte VAD."}`);
    rader.push(`Källan täcker ${tackta.length === 1 ? "ett produktionsberoende" : `${tackta.length} produktionsberoenden`}:`);
    for (const b of tackta) rader.push(`- \`${b.vard}\` — **brister:** ${b.brister}`);
  }
  return { grad, traffar, tackta, frammande, rader };
}

// Vad som TILLKOMMIT i en hash-källas text sedan förra körningen. Utan det kan en hash-vakt
// aldrig bedömas på innehåll, bara på att något rört sig. Meningsgrov: sidorna är normaliserad
// löptext, så exakthet vore falsk precision — men de nya meningarna räcker för nyckelorden.
export function nyText(gammal: string, ny: string): string[] {
  // DELNINGEN ÄR EN BEDÖMNINGSFRÅGA, inte en formatering (kort #261, 28/9). Normaliserad HTML
  // har få meningsslut: rubrik, meny och cookiebanner blir EN körning på hundratals tecken —
  // den längsta uppmätta var 2 054. Ett enda ändrat ord någonstans i en sådan körning gjorde
  // HELA den ny, rubriken inräknad, och bedömningen matchade sedan på ord ur rubriken.
  // UPPMÄTT 28/9 på polisen-api: ordet "myndighet" försvann ur cookietexten, och eftersom
  // rubriken "API över polisens händelser" satt i samma körning dömdes posten 🔴 RÖR OSS på
  // ordet *api* — ett ord som står permanent på sidan och därför aldrig kan betyda en ändring.
  // Att dela även på | · • ger rubriken ett eget stycke: samma prov ger 0 träffar på *api*,
  // och larmet går fortfarande ut, nu som VET INTE. Bedömningen graderar, den tystar aldrig.
  const dela = (s: string) => s.split(/(?<=[.!?:])\s+|\s*[|·•]\s*/).map((x) => x.trim()).filter((x) => x.length > 20);
  const fanns = new Set(dela(gammal));
  return dela(ny).filter((m) => !fanns.has(m));
}
