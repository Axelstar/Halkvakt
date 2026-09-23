// Segmentprognosen — vad vägytan är MELLAN stationerna (kort #38b steg 4, DECISIONS #322/#324/#325).
//
// Rå avståndsviktning, ingen offset: vägpunktsgrinden 23/9 (DECISIONS #324) visade att grannarnas yttemperatur
// viktad 1/km, upp till fem ankare inom 50 km, klarar grind A:s mått utan målets historik (A1 0,71 °C, A2 3,8 %,
// A3 0,0 %) — lika bra som den lärda offseten. Ankarna är grind A:s population (#75, radvakten, karantänen), som
// skuggmotorn hämtar ur databasen (sql/032 vagpunkt_ankare). Rent och plattformsfritt som resten av motorn;
// skuggmotorn buntar filen (scripts/bundle-skuggmotor.ts). Telefonen kör den inte — prognosen är loggad, aldrig
// hörd, tills domen i mars 2027 (TROSKLAR-SKUGGAN §4: karta och förstärkare, aldrig röst ensam).
//
// Utdata per provpunkt var STEG_KM längs rutten, kompakt för databasens skull:
//   [km, yta, narm, n, status, frys]
//   km     läge längs rutten (km)
//   yta    skattad yttemperatur (°C, en decimal) eller null när inget ankare når
//   narm   avstånd till närmaste bidragande ankare (km, en decimal) eller null
//   n      antal bidragande ankare (0–5)
//   status 2 = uppmätt (ankare inom UPPMATT_KM, facitradien i §2) · 1 = modellerat · 0 = okänt (inget ankare inom MAX_KM)
//   frys   1 när yta ≤ FRYS_C (A3:s klassgräns), annars 0 — "prognosen flaggade segmentet" i §2:s mening
// Tidsdelen (risk vid beräknad ankomsttid, §1) är INTE med: grinden bevisade den rumsliga delen, inget har prövat
// den tidsliga. Kolumnen loggar nuläget per segment; tiden väntar på trendregeln (kort #88).
import { haversineM } from "./geo.ts";

export type Ankare = { id: string; lon: number; lat: number; yta: number };
export type Provpunkt = [number, number | null, number | null, number, 0 | 1 | 2, 0 | 1];
export type Prognos = { steg_km: number; p: Provpunkt[] };

export const STEG_KM = 2;        // provpunkt var annan kilometer — facit matchas inom 2 km (§2)
const K_NEIGHBOURS = 5;          // som grind A (publish/grind-a.ts) — kontraktsgrinden vaktar
const MAX_KM = 50;               // bortom det är en station väder, inte ankare — som grind A
export const UPPMATT_KM = 2;     // §2:s facitradie: ett ankare så nära är en mätning, inte en modell
export const FRYS_C = 1;         // A3:s klassgräns (TROSKLAR-SKUGGAN §3)

/** Provpunkter var stegKm längs linjen, med läget i km. Sista brytpunkten alltid med. */
export function provpunkter(line: [number, number][], stegKm = STEG_KM): { km: number; lon: number; lat: number }[] {
  const ut: { km: number; lon: number; lat: number }[] = [];
  let kum = 0, nasta = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = { lon: line[i][0], lat: line[i][1] }, b = { lon: line[i + 1][0], lat: line[i + 1][1] };
    const seg = haversineM(a, b) / 1000;
    while (seg > 0 && nasta <= kum + seg) {
      const f = (nasta - kum) / seg;
      ut.push({ km: nasta, lon: a.lon + (b.lon - a.lon) * f, lat: a.lat + (b.lat - a.lat) * f });
      nasta += stegKm;
    }
    kum += seg;
  }
  if (line.length && (!ut.length || ut[ut.length - 1].km < kum)) {
    const s = line[line.length - 1];
    ut.push({ km: Math.round(kum * 10) / 10, lon: s[0], lat: s[1] });
  }
  return ut;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** En provpunkt: de K närmaste ankarna inom MAX_KM, viktade 1/max(km, 1) — grind A:s grannvikt, ordagrant. */
export function skatta(p: { lon: number; lat: number }, ankare: Ankare[]): { yta: number | null; narm: number | null; n: number } {
  const nara: { km: number; yta: number }[] = [];
  for (const a of ankare) {
    const km = haversineM(p, a) / 1000;
    if (km <= MAX_KM) nara.push({ km, yta: a.yta });
  }
  nara.sort((x, y) => x.km - y.km);
  const k = nara.slice(0, K_NEIGHBOURS);
  if (!k.length) return { yta: null, narm: null, n: 0 };
  let w = 0, s = 0;
  for (const a of k) { const v = 1 / Math.max(a.km, 1); w += v; s += v * a.yta; }
  return { yta: s / w, narm: k[0].km, n: k.length };
}

/** Hela rutten: en rad per provpunkt. Flaggan sätts på den oavrundade skattningen. */
export function segmentPrognos(line: [number, number][], ankare: Ankare[], stegKm = STEG_KM): Prognos {
  const p: Provpunkt[] = provpunkter(line, stegKm).map((pp) => {
    const s = skatta(pp, ankare);
    const status: 0 | 1 | 2 = s.narm === null ? 0 : s.narm <= UPPMATT_KM ? 2 : 1;
    const frys: 0 | 1 = s.yta !== null && s.yta <= FRYS_C ? 1 : 0;
    return [pp.km, s.yta === null ? null : r1(s.yta), s.narm === null ? null : r1(s.narm), s.n, status, frys];
  });
  return { steg_km: stegKm, p };
}
