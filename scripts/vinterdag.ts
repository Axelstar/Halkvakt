// VINTERDAGEN — spelar en PÅHITTAD vinterdag genom den riktiga motorn (#99, 11/9 2026).
//
// VARFÖR: Bengt har kört hela hösten och hört fartkameror. Ingen av oss har hört vad
// Halkvakt låter som en morgon i november när halka, frysrisk och vilt kvalificerar på
// samma sträcka. Husregeln "tystnad är en funktion" prövas av RYTM och MÄNGD, inte av om
// varje regel är rätt var för sig — och det går inte att höra förrän det är vinter.
//
// VAD DEN INTE ÄR, och detta är hela poängen:
//   Den här filen får ALDRIG döma en regel. Grind A, tystnadsfelet och efterhalkans
//   B3-par kräver verklig frost mot verkligt facit. Syntetiskt väder som får svara på
//   "håller regeln" är en maskin som bekräftar våra egna antaganden.
//   Därför: inget härifrån skrivs till weather_observations, inget till skuggloggen,
//   ingenting når CDN. Utdata är TEXT i terminalen, till människor.
//
// VAD DEN ÄR: samma AlertEngine som i appen, matad med ett påhittat men märkt väderläge.
// Svarar på tre frågor som inte kräver att vädret är sant:
//   1. Hur många gånger talar rösten på en resa — 3 eller 30?
//   2. I vilken ordning, och känns 45-sekundersspärren rätt när allt kvalificerar?
//   3. Blir snapshoten för stor när hela landet är kallt? (volymen, #80)
import { AlertEngine } from "../engine/src/engine.ts";
import type { Hazard } from "../engine/src/types.ts";

// ── De fem resorna. Riktiga rutter ur skuggflottan, påhittade väderlägen. ──────────
// Varje resa är ett scenario vi TROR är vanligt i vinter och vill höra rytmen på.
type Resa = {
  namn: string; beskrivning: string; rutt: [number, number][];
  kmh: number; laege: Laege;
};
type Laege = {
  ytaC: number;            // vägytans temperatur längs rutten
  fukt: boolean;           // faller nederbörd (dagens fuktvillkor, §1 i #89)
  halkaSegment: number;    // hur många sträckor operatören klassat som halka
  olyckor: number;         // aktiva olyckor på rutten
  vilt: number;            // viltrapporter senaste dygnet
  kameror: number;         // fartkameror (finns alltid, oberoende av väder)
};

const RESOR: Resa[] = [
  {
    namn: "1. Novembermorgonen — allt samtidigt",
    beskrivning: "E4 Södertälje→Uppsala, 06:30. Yta −2 °C, snöblandat regn, operatören har " +
      "klassat halka på tre sträckor, en olycka har hunnit hända. Det värsta rimliga fallet: " +
      "här hörs om rösten blir en radio.",
    rutt: [[17.63,59.20],[18.07,59.33],[17.92,59.65],[17.64,59.86]],
    kmh: 90, laege: { ytaC: -2, fukt: true, halkaSegment: 3, olyckor: 1, vilt: 2, kameror: 4 },
  },
  {
    namn: "2. Klarnatten efter regnet — efterhalkan (#89a)",
    beskrivning: "Väg 23 Höör→Osby, 03:00. Regnet slutade vid midnatt, ytan har fallit till " +
      "−1 °C, himlen är klar. DAGENS regel är tyst (fukt=false). Kör med --efterhalka för " +
      "att höra vad utvidgningen skulle säga. Detta är hålet i #89, hörbart.",
    rutt: [[13.54,55.94],[13.62,56.02],[13.70,56.09],[13.77,56.16],[13.85,56.25],[13.93,56.32],[13.98,56.38]],
    kmh: 80, laege: { ytaC: -1, fukt: false, halkaSegment: 0, olyckor: 0, vilt: 1, kameror: 2 },
  },
  {
    namn: "3. Nollgradersdimman — gränsfallet",
    beskrivning: "E22 Malmö→Kristianstad, 07:00. Yta exakt +1 °C, fuktigt. Precis på tröskeln: " +
      "en tiondel åt fel håll och rösten tystnar helt. Hör hur bräcklig gränsen är.",
    rutt: [[13.05,55.60],[13.19,55.70],[13.35,55.76],[13.54,55.83],[13.74,55.85],[13.95,55.90],[14.05,55.95],[14.16,56.03]],
    kmh: 90, laege: { ytaC: 1, fukt: true, halkaSegment: 1, olyckor: 0, vilt: 0, kameror: 3 },
  },
  {
    namn: "4. Torr vinterdag — bevis på tystnad",
    beskrivning: "E6 Malmö→Halmstad, 14:00. Yta −6 °C men knastertorrt. Ingen fukt ⇒ ingen " +
      "frysrisk, och det är RÄTT. Bara fartkameror ska höras. Om något annat låter här är " +
      "det ett falsklarm — den här resan är en tystnadskontroll.",
    rutt: [[12.99,55.61],[12.83,55.87],[12.70,56.05],[12.86,56.24],[12.85,56.42],[13.04,56.51],[12.86,56.67]],
    kmh: 110, laege: { ytaC: -6, fukt: false, halkaSegment: 0, olyckor: 0, vilt: 0, kameror: 5 },
  },
  {
    namn: "5. Långresan — 45-sekundersspärren under press",
    beskrivning: "E4 Helsingborg→Jönköping, 16:00, skymning. Yta 0 °C, fukt, halka på fem " +
      "sträckor, vilt i skymningen. Lång resa med mycket som kvalificerar: här syns om " +
      "spärren släpper igenom en jämn ström eller klumpar ihop allt.",
    rutt: [[12.70,56.05],[13.28,56.28],[13.60,56.46],[13.94,56.83],[14.04,57.19],[14.16,57.78]],
    kmh: 100, laege: { ytaC: 0, fukt: true, halkaSegment: 5, olyckor: 1, vilt: 4, kameror: 6 },
  },
];

// ── Bygg faror ur ett läge. Utplacerade jämnt längs rutten så rytmen blir läsbar. ──
function faror(r: Resa, efterhalka: boolean): Hazard[] {
  const h: Hazard[] = [];
  const pkt = (i: number, n: number): [number, number] => {
    const f = (i + 0.5) / n, seg = f * (r.rutt.length - 1);
    const a = r.rutt[Math.floor(seg)], b = r.rutt[Math.min(Math.ceil(seg), r.rutt.length - 1)];
    const t = seg - Math.floor(seg);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const L = r.laege;
  // Frysrisk: en punkt per 25 km. --efterhalka simulerar #89a:s utvidgade fuktvillkor.
  const fuktNu = L.fukt || (efterhalka && L.ytaC <= 1);
  if (fuktNu) {
    const n = Math.max(2, Math.round(r.rutt.length * 0.8));
    for (let i = 0; i < n; i++) {
      const [lon, lat] = pkt(i, n);
      h.push({ id: `wx:sim${i}`, kind: "icing_point", lon, lat,
               meta: { surfaceTempC: L.ytaC, moisture: true } } as Hazard);
    }
  }
  for (let i = 0; i < L.halkaSegment; i++) {
    const n = L.halkaSegment, [lon, lat] = pkt(i, n);
    const [lon2, lat2] = pkt(i + 0.6, n);
    h.push({ id: `seg:sim${i}`, kind: "slippery_segment",
             line: [[lon, lat], [lon2, lat2]], code: 3, info: ["Is och snö"] } as unknown as Hazard);
  }
  for (let i = 0; i < L.olyckor; i++) {
    const [lon, lat] = pkt(i, Math.max(1, L.olyckor));
    h.push({ id: `dev:sim${i}`, kind: "accident", lon, lat,
             meta: { severityCode: 5, endTimeLocal: "08:30", road: "E4" } } as Hazard);
  }
  for (let i = 0; i < L.vilt; i++) {
    const [lon, lat] = pkt(i, Math.max(1, L.vilt));
    h.push({ id: `vilt:sim${i}`, kind: "wildlife", lon, lat } as Hazard);
  }
  for (let i = 0; i < L.kameror; i++) {
    const [lon, lat] = pkt(i, Math.max(1, L.kameror));
    // bearing+180 = övervakad färdriktning (#57); riktning längs rutten
    const a = r.rutt[0], b = r.rutt[r.rutt.length - 1];
    const kurs = (Math.atan2((b[0]-a[0]) * Math.cos(a[1]*Math.PI/180), b[1]-a[1]) * 180/Math.PI + 360) % 360;
    h.push({ id: `cam:sim${i}`, kind: "camera", lon, lat, bearing: (kurs + 180) % 360 } as Hazard);
  }
  return h;
}

function trace(r: Resa) {
  const pts: { t: number; lon: number; lat: number }[] = [];
  let t = 0;
  for (let i = 0; i < r.rutt.length - 1; i++) {
    const [x1, y1] = r.rutt[i], [x2, y2] = r.rutt[i + 1];
    const km = Math.hypot((x2-x1) * 111.32 * Math.cos(y1*Math.PI/180), (y2-y1) * 111.0);
    const steg = Math.max(2, Math.round(km / (r.kmh / 3600)));   // en punkt/sekund
    for (let s = 0; s < steg; s++) {
      const f = s / steg;
      pts.push({ t: t++, lon: x1 + (x2-x1) * f, lat: y1 + (y2-y1) * f });
    }
  }
  return pts;
}

// ── Kör ──────────────────────────────────────────────────────────────────────────
const efterhalka = process.argv.includes("--efterhalka");
console.log(`\n${"═".repeat(78)}`);
console.log("  VINTERDAGEN — påhittat väder, riktig motor. Dömer INGENTING (#99).");
console.log(`  ${efterhalka ? "MED #89a:s utvidgade fuktvillkor (efterhalka)" : "Dagens regler"}`);
console.log(`${"═".repeat(78)}`);

let totalt = 0;
for (const r of RESOR) {
  const h = faror(r, efterhalka);
  const tr = trace(r);
  const alerts = new AlertEngine(h).run(tr);
  const min = Math.round(tr.length / 60);
  console.log(`\n${r.namn}`);
  console.log(`  ${r.beskrivning}`);
  console.log(`  ${min} min · ${r.kmh} km/h · yta ${r.laege.ytaC} °C · ${r.laege.fukt ? "nederbörd" : "torrt"}`);
  console.log(`  ${h.length} faror på rutten → ${alerts.length} röstlarm` +
              (alerts.length ? ` (ett var ${Math.round(min / alerts.length)}:e minut)` : ""));
  if (!alerts.length) console.log(`     (tyst)`);
  for (const a of alerts) {
    const mm = String(Math.floor(a.t / 60)).padStart(2, "0"), ss = String(a.t % 60).padStart(2, "0");
    console.log(`     ${mm}:${ss}  ${a.text}`);
  }
  totalt += alerts.length;
}
console.log(`\n${"─".repeat(78)}`);
console.log(`  ${totalt} röstlarm över fem resor.`);
console.log(`  Läs det som text: skulle du vilja höra detta i en bil?`);
console.log(`  Kör med --efterhalka för att höra vad #89a skulle lägga till.\n`);
