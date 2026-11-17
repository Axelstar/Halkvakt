// Publiceringens byggtid (körlistan B6, DECISIONS #896; avbrottsvillkoret i #833). Ren text: raden och larmet ur det
// publicera_bygge_lage() (sql/115) säger. Räkningen sker i databasen; här står bara orden, så att de går att pröva utan databas.

/** En rad ur publicera_bygge_lage(). Postgres ger heltal som tal, numeric som text och tider som Date eller text. */
export interface ByggeLage {
  pa_sedan: Date | string | null;
  referens_ms: number | null;
  referens_n: number | null;
  referens_dygn: string | number | null;
  senaste_ms: number | null;
  senaste_t: Date | string | null;
  rader: number | null;
  par_i_rad: number | null;
  over: boolean | null;
}

const s = (ms: number): string => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
const dygn = (d: string | number | null): string => `${String(Number(d ?? 0).toFixed(1)).replace(".", ",")} dygn`;

/** Vakthundens rad. Säger alltid om brytarna är på, eftersom villkoret bara gäller från påslaget. */
export function byggeRad(l: ByggeLage, nya: number): string {
  if (!l.rader) return "publiceringens bygge: inga körningar sparade än";
  const senaste = l.senaste_ms === null ? "" : `, senaste ${s(l.senaste_ms)}`;
  if (l.pa_sedan === null) {
    const ref = l.referens_ms === null ? "ingen median än" : `median ${s(l.referens_ms)} de senaste ${dygn(l.referens_dygn)}`;
    return `publiceringens bygge: ${l.rader} körningar sparade (${nya} nya), ${ref}${senaste} — brytarna är av, villkoret i #833 gäller från påslaget`;
  }
  if (l.referens_ms === null) {
    return `publiceringens bygge: ${l.rader} körningar sparade (${nya} nya)${senaste} — ingen referens före påslaget, villkoret i #833 går inte att pröva`;
  }
  return `publiceringens bygge: median ${s(l.referens_ms)} veckan före påslaget (${l.referens_n} körningar på ${dygn(l.referens_dygn)})${senaste}, gräns ${s(2 * l.referens_ms)}`;
}

/** Larmet, eller null. Sant bara med brytarna på och två körningar i rad över det dubbla av referensen (#833). */
export function byggeLarm(l: ByggeLage): string | null {
  if (!l.over || l.referens_ms === null) return null;
  return `**Publiceringens bygge tar mer än dubbelt så lång tid som medianen veckan före påslaget, två körningar i rad** ` +
    `(${l.par_i_rad} par den senaste timmen, senaste ${l.senaste_ms === null ? "–" : s(l.senaste_ms)} mot medianen ${s(l.referens_ms)}): ` +
    `avbrottsvillkoret för småvägsrösten (#833) — slå av med sql/107 och skriv en rad i STATUS`;
}
