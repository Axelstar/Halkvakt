// DATAVAKTERNA (kort #292, DECISIONS #452): vakthunden läser vad publiceringen säger om sina vakter. Givarvakten, radvakten,
// karantänen och den långsamma vakten tystar trasiga stationer i varje publicering (publish/snapshot-core.ts) och skriver det i
// svarets `notes`, som pg_net lägger i net._http_response. Kan en vakt inte läsa sin historik skriver den "… ej läsbar …" och
// publicerar ändå (fail-soft): då får en trasig givare tala igen, utan att något larmar. Ren logik utan Deno eller databas —
// prövad i test/datavakter.test.ts. En enstaka oläsbar publicering är fail-soft med flit; samma källa oläsbar i I_RAD
// publiceringar i rad är ett fel.

/** Så många publiceringar i rad (var 10:e minut, alltså en halvtimme) innan en oläsbar källa larmar. */
export const I_RAD = 3;

export type Tystade = { vakt: string; antal: number; stationer: string[] };

/** Noterna ur ett svar från publiceras huvudsnapshot; null om svaret är något annat (grannländerna, ett fel, inte JSON). */
export function noter(content: string | null): string[] | null {
  try {
    const d = JSON.parse(content ?? "");
    return d && Array.isArray(d.notes) && "segments" in d ? d.notes.map(String) : null;
  } catch {
    return null;
  }
}

/** Källan en "ej läsbar"-not gäller — texten före första kolonet ("karantän", "långsam vakt", "radar" …) — eller null. */
export function olasbar(not: string): string | null {
  return /ej läsbar/u.test(not) ? not.split(":")[0].trim() : null;
}

/** De stationer karantänen eller den långsamma vakten tystade, ur dess not — eller null. */
export function tystade(not: string): Tystade | null {
  const m = not.match(/^(karantän|långsam vakt): (\d+) station\(er\) tysta[^:]*: (.+)$/u);
  return m ? { vakt: m[1], antal: Number(m[2]), stationer: m[3].split(", ").map((s) => s.trim()) } : null;
}

/** Läget ur de senaste publiceringarnas noter, nyast först: vilka stationer den nyaste tystade, vilka källor den inte kunde läsa,
 *  och vilka källor som varit oläsbara i ALLA de I_RAD senaste (färre publiceringar än så larmar aldrig). */
export function datavakter(publiceringar: string[][]): { tystade: Tystade[]; olasbara: string[]; ihallande: string[] } {
  const nyast = publiceringar[0] ?? [];
  const kallor = (n: string[]) => new Set(n.map(olasbar).filter((x): x is string => x !== null));
  const olasbara = [...kallor(nyast)];
  const ihallande = publiceringar.length < I_RAD ? []
    : olasbara.filter((k) => publiceringar.slice(0, I_RAD).some((p) => kallor(p).has(k)));
  return { tystade: nyast.map(tystade).filter((x): x is Tystade => x !== null), olasbara, ihallande };
}

/** Vakthundens rad: de tystade stationerna per vakt, och de källor den nyaste publiceringen inte kunde läsa. */
export function rad(l: ReturnType<typeof datavakter>, publiceringar: number): string {
  if (!publiceringar) return "datavakterna: inget svar från publiceringen den senaste timmen";
  const t = l.tystade.length ? l.tystade.map((x) => `${x.vakt} ${x.antal} (${x.stationer.join(", ")})`).join(" · ") : "inga stationer tystade";
  return `datavakterna: ${t}${l.olasbara.length ? ` · oläsbart nu: ${l.olasbara.join(", ")}` : ""}`;
}
