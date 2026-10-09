// Veckokopians delar i Supabase-hinken `arkiv` (kort #312, DECISIONS #495). Ren logik, utan Deno eller nätverk, så att den
// prövas i test/arkivdump.test.ts.
//
// Kopian lämnar GitHub-releaserna, som blir publika med ett publikt repo (kort #311): de bär hela public-schemat, också
// testarnas svar och missar. I hinken delas dumpen i delar under gratisnivåns 50 MB per fil, och de fyra senaste kopiorna
// behålls (hinken delas med kamerafacit och arkivexporten inom 1 GB).

/** Dumpens filnamn, som arkivbackup.yml skriver det. Allt annat avvisas, så att funktionen aldrig skriver eller raderar utanför. */
export const NAMN = /^halkvakt-arkiv-\d{4}-\d{2}-\d{2}T\d{4}Z\.dump$/;
export const MAPP = "dump";
export const MAX_DELAR = 20;
export const BEHALL = 4;

/** Sökvägen till del i (0, 1, …) av en dump: dump/<namn>.del00, .del01 — samma ordning som `split -d -a 2`. */
export function delnamn(namn: string, i: number): string {
  if (!NAMN.test(namn)) throw new Error(`ogiltigt dumpnamn: ${namn}`);
  if (!Number.isInteger(i) || i < 0 || i >= MAX_DELAR) throw new Error(`ogiltig del: ${i}`);
  return `${MAPP}/${namn}.del${String(i).padStart(2, "0")}`;
}

/** Dumpens namn ur en dels filnamn i mappen, eller null om filen inte är en del. */
export function dumpAv(fil: string): string | null {
  const m = /^(.+\.dump)\.del\d{2}$/.exec(fil);
  return m && NAMN.test(m[1]) ? m[1] : null;
}

/** Kuvösens filer som inte får ligga i en publik release (kort #311, DECISIONS #499): Trafikverkets leverans, som #438 lade i en
 *  privat release. Namnet är `<release>/<fil>`, och filen hamnar i `kuvos/<release>/<fil>`; gallringen rör aldrig mappen. */
export const KUVOSFIL = /^kuvos-[a-z0-9-]+\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
export const KUVOSMAPP = "kuvos";

export function kuvosnamn(fil: string): string {
  if (!KUVOSFIL.test(fil) || fil.includes("..")) throw new Error(`ogiltigt kuvösnamn: ${fil}`);
  return `${KUVOSMAPP}/${fil}`;
}

/** Vilka filer i mappen som ska bort: delarna av alla kopior utom de `behall` senaste. Namnen bär UTC-tiden och sorteras
 *  därför i tidsordning. Filer som inte är delar rörs aldrig. */
export function attGallra(filer: string[], behall = BEHALL): string[] {
  if (!Number.isInteger(behall) || behall < 1) throw new Error(`behall måste vara minst 1: ${behall}`);
  const dumpar = [...new Set(filer.map(dumpAv).filter((d): d is string => d !== null))].sort();
  const kvar = new Set(dumpar.slice(-behall));
  return filer.filter((f) => { const d = dumpAv(f); return d !== null && !kvar.has(d); }).map((f) => `${MAPP}/${f}`);
}
