// Mätvaktens kadensläsning (check 6a, kort #101/#222). Flyttad hit ur index.ts 14/10 (kort #343) för att den ska gå
// att prova: index.ts anropar Deno.serve vid inläsning och kan därför inte importeras av ett prov i Node.
//
// Vad kadensen ÄR: det längsta mellanrummet mellan två avfyrningar. Vakten larmar på `ålder > kadens + frist`, så ett
// för kort tal larmar i onödan varje natt och ett för långt gör vakten blind.
//
// En LISTA i timfältet ("13 0,6,12,18 * * *", kandidatens del A sedan 14/10) gav förut null, och mätvakten skrev då
// "kadensen okänd, vakten blind" — upptäckt samma dag av matvaktprovet direkt efter deployen, på ett schema som var
// tjugo minuter gammalt. Här stod tidigare kommentaren "listor och intervall finns inte i repot i dag"; den var sann
// ända till den timmen. Lärdomen: ett nytt schemauttryck prövas mot den här funktionen i samma commit som det skrivs.

/** Timmar mellan två avfyrningar, det LÄNGSTA mellanrummet. null = uttrycket går inte att tolka, och då är vakten blind. */
export function kadensTimmar(cron: string): number | null {
  const f = cron.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const [, tim, dom, , dow] = f;
  const varje = tim.match(/^\*\/(\d+)$/);
  if (varje) return Number(varje[1]);        // "23 */2 * * *" ⇒ varannan timme
  if (tim === "*") return 1;
  if (!/^\d+(,\d+)*$/.test(tim)) return null;   // intervall (a-b) och steg i en lista finns inte i repot i dag
  const h = [...new Set(tim.split(",").map(Number))].sort((a, b) => a - b);
  if (h.some((x) => x > 23)) return null;
  // Dag- och veckovillkoren går FÖRE timluckan: ett jobb som bara går på måndagar har sitt längsta mellanrum i veckan,
  // inte mellan dagens avfyrningar. Talen är desamma som före flytten.
  if (dow !== "*") return 24 * 7;            // veckovis
  if (dom !== "*") return 24 * 28;           // månadsvis
  if (h.length === 1) return 24;             // dagligen
  let max = 0;
  for (let i = 0; i < h.length; i++) max = Math.max(max, (h[(i + 1) % h.length] - h[i] + 24) % 24 || 24);
  return max;
}
