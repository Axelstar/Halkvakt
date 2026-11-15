// VÄGBETECKNINGARNA (DECISIONS #882, kort #660): en E-väg skrivs "E4", varje annat nummer "väg 40" ("Väg 40" först i en mening, en
// rubrik, en listrad eller en cell), ett gatunamn som Trafikverket skriver det, och utan väg skrivs texten utan väg. En källa för all
// TypeScript: publiceringen (snapshot-core.ts, lanssidor.ts, buntad av scripts/bundle-publicera.ts), MCP och olycksfacit.
// Inga importer, så att bunten kan klistra in filen som den är.

/** Vägens kod: "E4" för en E-väg, bara siffrorna för varje annat nummer, gatunamnet som det står, och null utan väg. Trafikverket
 *  skriver "E 4", "E4", "Väg 40", "40" och "Götaälvbron väg 570" om vartannat, och OpenStreetMap "E 4" och "50"; Trafikverkets
 *  löpnummer (".25") tas bort. Appens röst och skylt gör "på E4", "på väg 40", "E4" och "VÄG 40" av koden (roadPhrase, roadSign),
 *  så en kod i live.json når appen utan ett nytt bygge. */
export function vagKod(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const e = /^E\s*(\d+)/i.exec(s);
  if (e) return `E${Number(e[1])}`;
  const n = /^(?:(?:väg|rv|riksväg|länsväg|lv)\.?\s*)?(\d+)(?:\.\d+)?$/i.exec(s);
  if (n) return String(Number(n[1]));
  const namn = /(?:^|\s)väg\s+(\d+)(?:\s|$)/i.exec(s);
  return namn ? String(Number(namn[1])) : s;
}

/** Vägen i löpande text: "E4", "väg 40" eller gatunamnet, null utan väg. */
export function vagText(v: unknown): string | null {
  const k = vagKod(v);
  return k === null ? null : /^\d+$/.test(k) ? `väg ${k}` : k;
}

/** Vägen först i en mening, en rubrik, en listrad eller en cell: "E4", "Väg 40" eller gatunamnet, null utan väg. */
export function vagForst(v: unknown): string | null {
  const t = vagText(v);
  return t === null ? null : t.charAt(0).toUpperCase() + t.slice(1);
}
