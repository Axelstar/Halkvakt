// SYNKPROVET I GITHUB ACTIONS (DECISIONS #533, #534, kort #340). Bengt 11/10: "den info man får 10 minuter innan o sen kör en
// skuggflottebil 10 minuter efter". Pulsklockan startar favoritprov-synk.yml på :18/:48, tio minuter efter favoritprovet (:08/:38).
// Bilen är motorn på färsk lägesfil längs de 30 vägrutterna (data/favoritprov/rutter-osrm.json, samma som favoritprovets rapport);
// jämförelsen är publish/synk-core.ts. Den flyttade hit från funktionen: 5–9 s motor fällde den på Supabases resurstak (546, 17:48).
// En rad per körning i favoritprov_synk (sql/050); favoritprovet speglar raderna till hinken. Rader äldre än två dygn raderas.
//
// Kör: DATABASE_URL=... node --experimental-strip-types scripts/favoritprov-synk.ts [--torr]   (--torr: räknar, skriver inget)
import { readFileSync, appendFileSync } from "node:fs";
import { snapshotToHazards } from "../engine/src/snapshot.ts";
import { bilensLarm, jamfor, summa, rapportensAlder, ALDER_MIN, ALDER_MAX, type Larm, type Utfall } from "../publish/synk-core.ts";

export const HINK = "https://xmpfztykhyvhmrzsnjrc.supabase.co/storage/v1/object/public/favoritprov/";
export const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";
const hamta = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

/** En körning: rapporten, lägesfilen och rutterna in, raden som skrivs ut. Ren — prövas i --sjalvtest. */
export function synk(fav: any, lv: any, st: any, rutter: Record<string, [number, number][]>, nu: number) {
  const alder = rapportensAlder(fav?.generated_at, nu);
  const faror = snapshotToHazards(st, lv);
  const nuIds = new Set(faror.map((h) => h.id));
  const skal: string[] = [];
  if (!alder.ok) skal.push(alder.min == null ? "favoriter.json saknas eller saknar generated_at" : `rapporten är ${alder.min} min gammal (räknas ${ALDER_MIN}–${ALDER_MAX})`);
  if (fav?.lagesfil && fav.lagesfil === lv.generated_at) skal.push("samma lägesfil som rapporten — publiceringen har inte gått sedan dess");
  const ut: Record<string, Utfall> = {}, larmPer: Record<string, Larm[]> = {};
  for (const [namn, linje] of Object.entries(rutter)) {
    larmPer[namn] = bilensLarm(faror, linje);
    ut[namn] = jamfor(fav?.rutter?.[namn]?.rader ?? [], larmPer[namn], nuIds);
  }
  const sum = summa(ut, larmPer);
  return { schema: 1, generated_at: new Date(nu).toISOString(), rapport: fav?.generated_at ?? null, alder_min: alder.min, jamforbar: alder.ok,
    lagesfil: lv.generated_at, rapportens_lagesfil: fav?.lagesfil ?? null, skal, summa: sum, rutter: ut };
}

/** Raden i synk-historik.json: bara summan och vad som saknades. */
export function historikRad(s: ReturnType<typeof synk>) {
  return { t: s.generated_at, rapport: s.rapport, alder_min: s.alder_min, jamforbar: s.jamforbar, larm: s.summa.larm, forvarnade: s.summa.forvarnade,
    saknade: Object.fromEntries(Object.entries(s.rutter).filter(([, u]) => u.saknade.length).map(([n, u]) => [n, u.saknade.map((x) => x.id)])),
    utan_larm: s.summa.utanLarm, per_slag: s.summa.perSlag };
}

export function lasRutterOsrm(): Record<string, [number, number][]> {
  const r = JSON.parse(readFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter as Record<string, { punkter: [number, number][] }>;
  return Object.fromEntries(Object.entries(r).map(([n, v]) => [n, v.punkter]));
}

const korsSjalv = !!process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!);
if (korsSjalv && process.argv.includes("--sjalvtest")) {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } };
  const nu = Date.parse("2026-10-12T06:18:30Z");
  const lv = { generated_at: "2026-10-12T06:10:00Z", segments: [], deviations: [{ id: "77", lon: 15.1, lat: 59.0002, sev: 4 }], wildlife: [], djur: [], bridges: [],
    weather: [{ id: "9", lon: 15.4, lat: 59.0005, yta: -1, fukt: true }], smhi: [] };
  const rad = (id: string, slag: string, langsM: number) => ({ id, slag, rubrik: id, text: "", avstandM: 0, langsM, vag: null, start: null });
  const fav = { generated_at: "2026-10-12T06:08:04Z", lagesfil: "2026-10-12T06:00:00Z", rutter: { R: { rader: [rad("wx:9", "frysrisk", 23_000), rad("seg:1", "halka", 4_000)] } } };
  const s = synk(fav, lv, { cameras: [] }, { R: [[15.0, 59.0], [15.5, 59.0]], Tom: [[16.0, 60.0], [16.1, 60.0]] }, nu);
  k(s.jamforbar && s.alder_min === 10.4, `rapportens ålder: ${s.alder_min}`);
  k(s.summa.larm === 2 && s.summa.forvarnade === 1, `två larm, ett förvarnat: ${JSON.stringify(s.summa)}`);
  k(s.rutter.R.saknade[0]?.id === "dev:77", "olyckan saknades i rapporten");
  k(s.rutter.R.utanLarm[0]?.id === "seg:1" && s.rutter.R.utanLarm[0].orsak === "borta", "halkan i rapporten är borta");
  k(s.rutter.Tom.larm === 0, "en rutt utan rapport och utan faror ger inga larm");
  const h = historikRad(s);
  k(h.larm === 2 && JSON.stringify(h.saknade) === '{"R":["dev:77"]}', `historikraden: ${JSON.stringify(h)}`);
  const gammal = synk({ ...fav, generated_at: "2026-10-12T05:38:04Z" }, lv, { cameras: [] }, { R: [[15.0, 59.0], [15.5, 59.0]] }, nu);
  k(!gammal.jamforbar && gammal.skal[0].includes("40.4 min"), `en gammal rapport är inte jämförbar: ${gammal.skal}`);
  k(Object.keys(lasRutterOsrm()).length === 30, "de 30 vägrutterna läses");
  if (fel) process.exit(1);
  console.log("✓ självtest: körningen räknar ålder, larm, förvarnade, saknade och borta; historikraden; en gammal rapport är inte jämförbar; 30 rutter");
  process.exit(0);
}

if (korsSjalv) {
  const torr = process.argv.includes("--torr");
  const t0 = performance.now(), nu = Date.now();
  const [fav, lv, st] = await Promise.all([hamta(HINK + "favoriter.json?t=" + nu), hamta(CDN + "live.json?t=" + nu), hamta(CDN + "static.json?t=" + nu)]);
  const rutter = lasRutterOsrm();
  const s = synk(fav, lv, st, rutter, nu);
  const ms = Math.round(performance.now() - t0);
  const a = s.summa;
  const text = [`Synkprovet ${s.generated_at}: rapporten ${s.rapport} (${s.alder_min} min), lägesfilen ${s.lagesfil} (rapportens ${s.rapportens_lagesfil})`,
    `${a.rutter} rutter, ${a.larm} larm, ${a.forvarnade} förvarnade (${a.andel == null ? "–" : (100 * a.andel).toFixed(1) + " %"}), ${a.saknade} saknades; ` +
    `utan larm ${a.utanLarm.borta} borta, ${a.utanLarm.kvar} kvar; ${ms} ms` + (s.jamforbar ? "" : ` — INTE JÄMFÖRBAR: ${s.skal.join("; ")}`),
    ...Object.entries(s.rutter).filter(([, u]) => u.saknade.length).map(([n, u]) => `  saknades på ${n}: ${u.saknade.map((x) => `${x.id} (${x.kind}, ${(x.langsM / 1000).toFixed(1)} km)`).join(", ")}`)];
  console.log(text.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + text.join("\n") + "\n```\n");
  if (!torr) {
    const url = process.env.DATABASE_URL; if (!url) { console.error("DATABASE_URL saknas"); process.exit(1); }
    const pg = (await import("pg")).default; const db = new pg.Client({ connectionString: url }); await db.connect();
    const { rows } = await db.query("INSERT INTO favoritprov_synk (t, rapport, data) VALUES ($1, $2, $3) RETURNING id",
      [s.generated_at, s.rapport, JSON.stringify({ ...s, historik: historikRad(s), ms })]);
    const { rowCount } = await db.query("DELETE FROM favoritprov_synk WHERE t < now() - interval '2 days'");
    console.log(`skriven: favoritprov_synk id ${rows[0].id}; ${rowCount} äldre rader raderade`);
    await db.end();
  }
}
