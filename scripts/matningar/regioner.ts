// Norr och söder om 62°, per band och vägt med trafiken — den gemensamma redovisningen för prognoslagrets läsningar (DECISIONS #502,
// #507, kort #317). Varje läsning skriver ut den bredvid helhetstalet, så att en liten del av trafiken inte styr helheten.
//   Grova fel = grind A:s A2 (|skattning − uppmätt| > 2 °C) på de punkter där alla kandidater har ett värde.
//   Bandet = punktens ankKm (grind A: närmaste bidragande granne).
//   Vägt med trafiken = varje stations andel grova fel, vägd med trafiken på väglagspunkterna närmast stationen (ÅDT × 2 km, #490).
// Importeras utan sidoeffekter; självtest: node --experimental-strip-types scripts/matningar/regioner.ts --sjalvtest
import { readFileSync } from "node:fs";
import { BANDS } from "../../publish/grind-a.ts";
import { km } from "./kuvos-trafik-per-band-2026-10-08.ts";

export const NORR_LAT = 62;
const GROVT_C = 2, KM_PER_PUNKT = 2;
export type Rad = { station: string; lat: number; ankKm: number; measured: number };

/** Trafiken närmast varje station: väglagspunkternas ÅDT × 2 km (fordonskm per dygn), varje punkt till närmaste station. */
export function trafikvikter(stationer: { id: string; lat: number; lon: number }[], punkter: { lat: number; lon: number; adt_fordon: number | null }[]): Map<string, number> {
  const v = new Map<string, number>();
  for (const p of punkter) {
    if (p.adt_fordon == null) continue;
    let b = Infinity, id = "";
    for (const s of stationer) { const d = km(p, s); if (d < b) { b = d; id = s.id; } }
    v.set(id, (v.get(id) ?? 0) + p.adt_fordon * KM_PER_PUNKT);
  }
  return v;
}

/** Trafikvikterna ur vägdatalagret i repot (data/vagdata, #473). */
export function lasTrafikvikter(): Map<string, number> {
  const las = (f: string) => JSON.parse(readFileSync(new URL(`../../data/vagdata/${f}`, import.meta.url), "utf8")).rader;
  return trafikvikter(las("stationer.json").map((s: any) => ({ id: String(s.id), lat: s.lat, lon: s.lon })), las("vaglagspunkter.json"));
}

/** Raderna att skriva ut: norr, söder och alla, per band och vägt med trafiken, en kolumn per kandidat. */
export function regionsrapport(rader: Rad[], kandidater: { namn: string; v: (number | null)[] }[], vikt: Map<string, number>): string[] {
  const med = rader.map((_, i) => kandidater.every((k) => k.v[i] !== null));
  const reg = (r: Rad) => (r.lat >= NORR_LAT ? "norr" : "söder");
  const pct = (a: number, b: number) => (b ? `${(100 * a / b).toFixed(1).replace(".", ",")} %` : "—");
  const ut = [`\n═══ NORR OCH SÖDER OM ${NORR_LAT}° (DECISIONS #502) — grova fel > ${GROVT_C} °C på ${med.filter(Boolean).length} gemensamma punkter ═══`,
    `  ${"".padEnd(22)}${kandidater.map((k) => k.namn.padStart(16)).join("")}`];
  for (const region of ["alla", "norr", "söder"]) {
    for (const [band, lo, hi] of [["alla band", 0, Infinity] as [string, number, number], ...BANDS]) {
      const idx = rader.map((r, i) => i).filter((i) => med[i] && (region === "alla" || reg(rader[i]) === region) && rader[i].ankKm >= lo && rader[i].ankKm < hi);
      const celler = kandidater.map((k) => pct(idx.filter((i) => Math.abs(k.v[i]! - rader[i].measured) > GROVT_C).length, idx.length).padStart(16));
      ut.push(`  ${`${region} · ${band}`.padEnd(22)}${celler.join("")}   (n ${idx.length})`);
    }
    // Vägt med trafiken: per station andelen grova fel, vägd med stationens trafik.
    const per = new Map<string, { n: number; g: number[] }>();
    rader.forEach((r, i) => {
      if (!med[i] || (region !== "alla" && reg(r) !== region)) return;
      let s = per.get(r.station);
      if (!s) { s = { n: 0, g: kandidater.map(() => 0) }; per.set(r.station, s); }
      s.n++; kandidater.forEach((k, j) => { if (Math.abs(k.v[i]! - r.measured) > GROVT_C) s!.g[j]++; });
    });
    let w = 0; const x = kandidater.map(() => 0);
    for (const [id, s] of per) { const vv = vikt.get(id) ?? 0; if (!vv) continue; w += vv; s.g.forEach((g, j) => { x[j] += vv * g / s.n; }); }
    ut.push(`  ${`${region} · vägt m. trafik`.padEnd(22)}${x.map((y) => (w ? `${(100 * y / w).toFixed(1).replace(".", ",")} %` : "—").padStart(16)).join("")}   (${per.size} stationer)`);
  }
  return ut;
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  const k = (v: boolean, t: string) => { if (!v) { console.error(`✗ ${t}`); process.exit(1); } };
  const vikt = trafikvikter([{ id: "n", lat: 66, lon: 20 }, { id: "s", lat: 56, lon: 13 }],
    [{ lat: 66.01, lon: 20, adt_fordon: 100 }, { lat: 56.01, lon: 13, adt_fordon: 900 }, { lat: 56, lon: 13.01, adt_fordon: null }]);
  k(vikt.get("n") === 200 && vikt.get("s") === 1800, "trafiken: ÅDT × 2 km till närmaste station, punkter utan ÅDT räknas inte");
  // Norr: station n, 10 punkter i bandet > 20 km, A har 5 grova; söder: station s, 10 punkter 0–7 km, A har 1 grovt. B felfri.
  const rader: Rad[] = [], A: (number | null)[] = [], B: (number | null)[] = [];
  for (let i = 0; i < 10; i++) { rader.push({ station: "n", lat: 66, ankKm: 30, measured: 0 }); A.push(i < 5 ? 3 : 0); B.push(0); }
  for (let i = 0; i < 10; i++) { rader.push({ station: "s", lat: 56, ankKm: 3, measured: 0 }); A.push(i < 1 ? -3 : 0); B.push(0); }
  rader.push({ station: "s", lat: 56, ankKm: 3, measured: 0 }); A.push(null); B.push(5);   // saknas hos A: räknas inte för någon
  const t = regionsrapport(rader, [{ namn: "A", v: A }, { namn: "B", v: B }], vikt).join("\n");
  k(t.includes("20 gemensamma punkter"), "bara gemensamma punkter");
  k(/alla · alla band\s+30,0 %\s+0,0 %/.test(t), "helheten: A 6 av 20");
  k(/norr · >20 km\s+50,0 %/.test(t) && /söder · 0–7 km\s+10,0 %/.test(t), "norr och söder per band");
  k(/norr · alla band\s+50,0 %/.test(t) && /söder · alla band\s+10,0 %/.test(t), "norr och söder var för sig över alla band");
  k(/alla · vägt m. trafik\s+14,0 %/.test(t), "vägt med trafiken: (200 · 0,5 + 1 800 · 0,1) / 2 000 = 14 %");
  k(!t.includes("NaN"), "utskriften utan NaN");
  console.log("✓ självtest: trafikvikterna, gemensamma punkter, norr och söder per band, vägt med trafiken");
  process.exit(0);
}
