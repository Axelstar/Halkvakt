// LEVERANSTIDEN (DECISIONS #741, tillägg 28/10): hur gammal varje ny väderobservation är när livemotorn får den. Ingen import och
// inget I/O, så att den prövas i test/leverans.test.ts. Talen går med i livemotorns svar, som pg_net sparar i sex timmar, och läses
// därifrån med DB-knappen; ingenting nytt lagras i databasen.
//
// `alder` = hämtningen minus mättiden (`Observation.Sample`): Trafikverkets leverans plus vår väntan till nästa hämtning, som är högst
// en minut eftersom livemotorn går varje minut. `trv` = Trafikverkets ändringstid (`ModifiedTime`) minus mättiden, när fältet finns:
// Trafikverkets egen del. Raderade objekt och objekt utan mättid räknas inte.

export type Leverans = { n: number; alder_median_s: number | null; alder_p95_s: number | null; alder_max_s: number | null;
  trv_n: number; trv_median_s: number | null };

const percentil = (s: number[], p: number) => s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null;

export function leveranstid(items: any[], nu: number): Leverans {
  const alder: number[] = [], trv: number[] = [];
  for (const w of items) {
    const sample = Date.parse(w?.Observation?.Sample ?? "");
    if (w?.Deleted || !Number.isFinite(sample)) continue;
    alder.push(Math.round((nu - sample) / 1000));
    const andrad = Date.parse(w?.ModifiedTime ?? "");
    if (Number.isFinite(andrad)) trv.push(Math.round((andrad - sample) / 1000));
  }
  alder.sort((a, b) => a - b);
  trv.sort((a, b) => a - b);
  return { n: alder.length, alder_median_s: percentil(alder, 0.5), alder_p95_s: percentil(alder, 0.95), alder_max_s: alder.at(-1) ?? null,
    trv_n: trv.length, trv_median_s: percentil(trv, 0.5) };
}
