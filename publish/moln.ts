// MOLNET — delad hämtning och klassning (DECISIONS #143).
//
// VARFÖR DEN FINNS. Fysikkontrollen "träffarna ska vara vanligast klara nätter" behövs i BÅDE
// grind T-A (trenden, #88) och grind R-A (rimfrosten, #46) — utstrålningskylning är samma fysik
// i båda. Den byggdes först i T-A 12/9 (DECISIONS #115). Att kopiera den till R-A vore precis den
// drift vi vaktat mot hela dygnet, så den bor här i stället.
//
// KÄLLAN: SMHI metobs parameter 16 (total molnmängd, timvärde), hämtad VID KÖRNING. Perioden
// `latest-months` räcker 130 dygn bakåt, så ingenting behöver arkiveras — ingen tabell, noll
// lagring. Täckningen är mätt (DECISIONS #114): 91 % av VViS-stationerna har en molnobservation
// inom 50 km, median 29 km. Molnet är en STORSKALIG storhet — ett molntäcke sträcker sig tiotals
// mil — så den radien är en helt annan sak än att sträcka en yttemperatur lika långt.
//
// SENTINELEN SOM MÅSTE HANTERAS: enheten heter procent men värdena är OCTAS omräknade
// (0 · 13 · 25 · 38 · 50 · 63 · 75 · 88 · 100 = 0/8 … 8/8). Och **113 % förekommer** — det är 9/8,
// SMHI:s kod för HIMLEN SKYMD (dimma, tätt snöfall). Som procenttal är det omöjligt, och
// fysikaliskt är en skymd himmel MOTSATSEN till en klar natt: ingen utstrålning mot rymden.
// Den klassas som "skymd" och räknas med de mulna, aldrig med de klara.

const UA = { "User-Agent": "Halkvakt/1.0 (oppna data, CC BY 4.0)" };
const API = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/16";
export const MAX_MOLN_KM = 50;     // täckningsmätningen 12/9
export const MAX_MOLN_MIN = 90;    // molnet rapporteras varje timme
export const MAX_STATIONER = 40;   // tak på antalet SMHI-hämtningar per körning

export type Molnklass = "klar" | "mellan" | "mulen" | "skymd" | "okänd";

export function klassaMoln(v: number | null): Molnklass {
  if (v === null || !Number.isFinite(v)) return "okänd";
  if (v > 100) return "skymd";      // 113 = himlen skymd
  if (v <= 25) return "klar";       // 0–2 åttondelar
  if (v >= 75) return "mulen";      // 6–8 åttondelar
  return "mellan";
}

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (lat2 - lat1) * d2r, dLo = (lon2 - lon1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Närmaste observation i tid, eller null om ingen ligger inom maxMin minuter. */
export function narmastITid(serie: Map<number, number>, tMin: number, maxMin: number): number | null {
  let b: number | null = null, bd = Infinity;
  for (const [t, v] of serie) {
    const d = Math.abs(t - tMin);
    if (d < bd && d <= maxMin) { bd = d; b = v; }
  }
  return b;
}

export type Punkt = { lon: number; lat: number; tMin: number };

/** Var molnet kommer ifrån: stationerna, en stations serie (minuter sedan epok → värde) och taket på antalet stationer per körning. */
export type Molnkalla = {
  namn: string;
  stationer: () => Promise<{ id: string; lon: number; lat: number }[]>;
  serie: (id: string) => Promise<Map<number, number> | null>;
  tak: number;
};

/** Driftens källa: SMHI:s API vid körning, `latest-months`. Taket finns för att begränsa anropen mot SMHI. */
export const SMHI_API: Molnkalla = {
  namn: "SMHI:s API",
  stationer: async () => {
    const rs = await fetch(`${API}.json`, { headers: UA });
    if (!rs.ok) throw new Error(`SMHI stationslista svarade ${rs.status}`);
    return (((await rs.json()) as any).station ?? [])
      .filter((x: any) => x.active && x.longitude != null)
      .map((x: any) => ({ id: String(x.id), lon: Number(x.longitude), lat: Number(x.latitude) }));
  },
  serie: async (id) => {
    const d = await fetch(`${API}/station/${id}/period/latest-months/data.json`, { headers: UA });
    if (!d.ok) return null;
    const m = new Map<number, number>();
    for (const v of (((await d.json()) as any).value ?? [])) {
      if (v.value === null) continue;
      m.set(Number(v.date) / 60000, Number(v.value));
    }
    return m;
  },
  tak: MAX_STATIONER,
};

/** Molnklass per punkt. En station som inte svarar är tystnad ("okänd"), inte ett fel — och
 *  SMHI:s molnstationer är SVENSKA: för punkter utanför Sverige blir svaret "okänd", vilket är
 *  rätt svar och inte ett hål att fylla med en sträckt observation. Kuvösen skickar sin egen källa (kuvos/moln.ts). */
export async function molnForPunkter(
  punkter: Punkt[], logg: (s: string) => void = console.log, kalla: Molnkalla = SMHI_API,
): Promise<Molnklass[]> {
  const st = await kalla.stationer();

  const narmast: (string | null)[] = [];
  const behov = new Map<string, number>();
  for (const p of punkter) {
    let bi = -1, bd = Infinity;
    st.forEach((m: any, i: number) => {
      const d = haversineKm(p.lon, p.lat, m.lon, m.lat); if (d < bd) { bd = d; bi = i; }
    });
    if (bi >= 0 && bd <= MAX_MOLN_KM) {
      narmast.push(st[bi].id); behov.set(st[bi].id, (behov.get(st[bi].id) ?? 0) + 1);
    } else narmast.push(null);
  }
  const hamta = [...behov].sort((a, b) => b[1] - a[1]).slice(0, kalla.tak).map(([id]) => id);
  logg(`  ${narmast.filter(Boolean).length} av ${punkter.length} punkter har en molnstation inom ${MAX_MOLN_KM} km · hämtar ${hamta.length} stationer ur ${kalla.namn}`);

  const serier = new Map<string, Map<number, number>>();
  for (const id of hamta) {
    try {
      const m = await kalla.serie(id);
      if (m) serier.set(id, m);
    } catch { /* en station som inte svarar är tystnad, inte ett fel */ }
  }
  return punkter.map((p, i) => {
    const id = narmast[i], serie = id ? serier.get(id) : undefined;
    return klassaMoln(serie ? narmastITid(serie, p.tMin, MAX_MOLN_MIN) : null);
  });
}
