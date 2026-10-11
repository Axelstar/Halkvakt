// SYNKPROVET (favoriterna, DECISIONS #533, kort #340; Bengt 11/10: "jag simulerar en pendlingsresa och den info man får 10 minuter
// innan o sen kör en skuggflottebil 10 minuter efter … för att stämma av om infon du får innan överensstämmer med vad testbilen
// upplever vid resan"). Ren kärna, prövad i test/synk-core.test.ts och buntad in i favoritprov (scripts/bundle-favoritprov.ts).
//
// Föraren läser rapporten (favoriter.json, skriven av favoritprovet på :08/:38) och kör tio minuter senare (:18/:48). Bilen är motorn
// själv på färsk lägesfil, längs SAMMA rutt som rapporten räknades på (vägnätet, OSRM, #531) — inte skuggans raka linjer. Varje larm
// bilen får jämförs med rapporten:
//   förvarnad   rapporten bar faran (samma id, eller för avvikelser och vilt samma slag inom LANGS_TOL_M längs rutten)
//   saknades    larmet kom utan att rapporten nämnt något — det är felet provet letar efter
// Och varje rad i rapporten av ett slag som motorn larmar för, utan larm under färden:
//   borta       faran finns inte i lägesfilen längre (försvann på tio minuter)
//   kvar        faran finns kvar men motorn larmade inte (riktning, avstånd, spärr)
// Slag som motorn aldrig larmar för (vägarbete, kö, restid, färja, hastighet, omledning, SMHI) räknas bara, de kan inte jämföras.
import { AlertEngine } from "../engine/src/engine.ts";
import { farorNaraRutten } from "../engine/src/rutfilter.ts";
import { haversineM } from "../engine/src/geo.ts";
import type { Fix, Hazard, HazardKind } from "../engine/src/types.ts";
import type { Rad, Slag } from "./rapport-core.ts";

export const SYNK_EFTER_MIN = 10;                  // bilen kör tio minuter efter rapporten
export const ALDER_MIN = 5, ALDER_MAX = 20;        // rapporten räknas bara om den är så gammal när bilen kör
export const LANGS_TOL_M = 1000;                   // avvikelser och vilt: samma slag inom så här långt längs rutten
export const HASTIGHET_KMH = 80, STEG_S = 5;       // som skuggmotorns traceAlong
/** Motorns slag → rapportens slag som räknas som samma sak. */
export const SLAG_FOR: Record<string, Slag[]> = {
  slippery_segment: ["halka"], icing_point: ["frysrisk"], camera: ["kamera"], wildlife: ["vilt"],
  accident: ["olycka", "hinder", "vilt", "vagarbete", "ko", "omledning", "hastighet"],
};
/** Rapportens slag som motorn kan larma för; bara de kan bli "borta" eller "kvar". */
export const LARMANDE: Slag[] = ["halka", "frysrisk", "kamera", "olycka", "hinder", "vilt"];

export type Larm = { id: string; kind: HazardKind; t: number; langsM: number; text: string };
export type Utfall = {
  larm: number; forvarnade: number; saknade: { id: string; kind: string; langsM: number; text: string }[];
  utanLarm: { id: string; slag: Slag; rubrik: string; langsM: number; orsak: "borta" | "kvar" }[];
  ejJamforbara: Partial<Record<Slag, number>>;
};

/** Bilen längs linjen i 80 km/h, en punkt var 5:e sekund (skuggmotorns traceAlong), och hur långt den kommit vid varje punkt. */
export function korLangs(line: [number, number][], kmh = HASTIGHET_KMH, stegS = STEG_S): { fixar: Fix[]; langs: number[] } {
  const mps = (kmh * 1000) / 3600; const fixar: Fix[] = [], langs: number[] = []; let t = 0, bas = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const n = Math.max(1, Math.round(d / (mps * stegS)));
    for (let s = 0; s < n; s++) {
      const f = s / n;
      fixar.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh }); langs.push(bas + d * f);
      t += stegS;
    }
    bas += d;
  }
  return { fixar, langs };
}

/** Vad bilen får höra: motorns larm längs linjen, med platsen för faran längs rutten (bilens plats vid larmet plus avståndet fram). */
export function bilensLarm(faror: Hazard[], line: [number, number][]): Larm[] {
  const { fixar, langs } = korLangs(line);
  const vid = new Map(fixar.map((f, i) => [f.t, langs[i]]));
  return new AlertEngine(farorNaraRutten(faror, line)).run(fixar).map((a) => ({ id: a.hazardId, kind: a.kind, t: a.t,
    langsM: Math.round((vid.get(a.t) ?? 0) + (a.distanceM ?? 0)), text: a.text }));
}

/** Jämförelsen för en rutt: rapportens rader (från favoriter.json) mot bilens larm; nuIds = farorna i lägesfilen när bilen kör. */
export function jamfor(rader: Rad[], larm: Larm[], nuIds: Set<string>): Utfall {
  const anvanda = new Set<string>(); let forvarnade = 0; const saknade: Utfall["saknade"] = [];
  for (const a of larm) {
    let r = rader.find((x) => x.id === a.id);
    if (!r && (a.kind === "accident" || a.kind === "wildlife"))
      r = rader.filter((x) => !anvanda.has(x.id) && (SLAG_FOR[a.kind] ?? []).includes(x.slag) && Math.abs(x.langsM - a.langsM) <= LANGS_TOL_M)
        .sort((x, y) => Math.abs(x.langsM - a.langsM) - Math.abs(y.langsM - a.langsM))[0];
    if (r) { forvarnade++; anvanda.add(r.id); } else saknade.push({ id: a.id, kind: a.kind, langsM: a.langsM, text: a.text });
  }
  const utanLarm: Utfall["utanLarm"] = [], ejJamforbara: Utfall["ejJamforbara"] = {};
  for (const r of rader) {
    if (anvanda.has(r.id)) continue;
    if (!LARMANDE.includes(r.slag)) { ejJamforbara[r.slag] = (ejJamforbara[r.slag] ?? 0) + 1; continue; }
    utanLarm.push({ id: r.id, slag: r.slag, rubrik: r.rubrik, langsM: r.langsM, orsak: nuIds.has(r.id) ? "kvar" : "borta" });
  }
  return { larm: larm.length, forvarnade, saknade, utanLarm, ejJamforbara };
}

/** Summan över rutterna, per motorslag: hur stor del av larmen rapporten bar tio minuter innan. */
export function summa(utfall: Record<string, Utfall>, larmPerRutt: Record<string, Larm[]>) {
  const perSlag: Record<string, { larm: number; forvarnade: number }> = {};
  for (const [namn, u] of Object.entries(utfall)) {
    const saknadeIds = new Set(u.saknade.map((s) => s.id));
    for (const a of larmPerRutt[namn] ?? []) {
      const p = (perSlag[a.kind] ??= { larm: 0, forvarnade: 0 }); p.larm++; if (!saknadeIds.has(a.id)) p.forvarnade++;
    }
  }
  const v = Object.values(utfall);
  const larm = v.reduce((s, u) => s + u.larm, 0), forvarnade = v.reduce((s, u) => s + u.forvarnade, 0);
  return { rutter: v.length, larm, forvarnade, saknade: larm - forvarnade, andel: larm ? forvarnade / larm : null,
    utanLarm: { borta: v.reduce((s, u) => s + u.utanLarm.filter((x) => x.orsak === "borta").length, 0),
      kvar: v.reduce((s, u) => s + u.utanLarm.filter((x) => x.orsak === "kvar").length, 0) }, perSlag };
}

/** Om rapporten går att jämföra: den ska vara skriven ALDER_MIN–ALDER_MAX minuter innan bilen kör. */
export function rapportensAlder(genererad: string | undefined, nu: number): { min: number | null; ok: boolean } {
  const t = genererad ? Date.parse(genererad) : NaN;
  if (!Number.isFinite(t)) return { min: null, ok: false };
  const min = Math.round((nu - t) / 6e4 * 10) / 10;
  return { min, ok: min >= ALDER_MIN && min <= ALDER_MAX };
}
