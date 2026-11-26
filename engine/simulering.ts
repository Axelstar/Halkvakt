// Simuleringen — tåg, flyg och annat som inte är en bil, körda genom varningsmotorn mot en riktig lägesfil, så att ingen
// behöver göra resorna för att få veta vad rösten hade sagt.
//
//   mkdir -p /tmp/sim-data && for f in manifest.json live.json static.json smavag.json; do
//     curl -sS -o /tmp/sim-data/$f https://halkvakt.se/data/app/v1/$f; done
//   node --experimental-strip-types engine/simulering.ts --motor engine --data /tmp/sim-data [--json ut.json]
//
// --motor är en motorkatalog (den som har src/engine.ts): den här grenens, eller en annan grens eller releaselinjes, t.ex.
//   git archive claude/falsklarm-steg1 engine | tar -x -C /tmp/steg1   →   --motor /tmp/steg1/engine
// --data är en katalog med appens filer, lästa som apparna läser dem: manifestets sha256 prövas, och en fil som inte stämmer
// avvisas. Lägesfilen är räknad ur Trafikverkets data och checkas aldrig in.
//
// Spåren (engine/simulering-spar.ts) är syntetiska. Provet säger vad MOTORN beslutar längs ett spår — inte hur telefonens GPS
// beter sig i en kabin, om vakten startar av sig själv eller om ljudet når högtalaren.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { distToSegmentM, haversineM } from "./src/geo.ts";
import {
  Bana, FLYGPLATS, flygspar, markspar, sidoflytta, stoppVar, variant, VARIANTER, type P, type SimFix, type Variant,
} from "./simulering-spar.ts";

interface Alert { t: number; hazardId: string; kind: string; distanceM: number; text: string }

const arg = (namn: string) => { const i = process.argv.indexOf(namn); return i < 0 ? undefined : process.argv[i + 1]; };
const motorDir = arg("--motor"), dataDir = arg("--data"), jsonUt = arg("--json");
if (!motorDir || !dataDir) {
  console.error("användning: node --experimental-strip-types engine/simulering.ts --motor <motorkatalog> --data <lägesfilens katalog> [--json ut.json]");
  process.exit(1);
}
const motor = (fil: string) => import(pathToFileURL(resolve(motorDir, "src", fil)).href);
const { AlertEngine } = await motor("engine.ts");
const { snapshotToHazards } = await motor("snapshot.ts");
const { smavagHazards } = await motor("smavagfil.ts");

// ---------- the snapshot, read as the apps read it ----------
const las = (fil: string) => readFileSync(resolve(dataDir, fil));
const manifest = JSON.parse(las("manifest.json").toString());
for (const namn of ["static", "live"]) {
  const sha = createHash("sha256").update(las(`${namn}.json`)).digest("hex");
  if (sha !== manifest.files[namn].sha256) { console.error(`${namn}.json stämmer inte med manifestets sha256 — avvisad, som i appen`); process.exit(1); }
}
const statisk = JSON.parse(las("static.json").toString()), live = JSON.parse(las("live.json").toString());
const hazards: { id: string; kind: string }[] = snapshotToHazards(statisk, live);
if (live.smavag && existsSync(resolve(dataDir, "smavag.json"))) {
  const buf = las("smavag.json");
  hazards.push(...smavagHazards(JSON.parse(buf.toString()), live.smavag, createHash("sha256").update(buf).digest("hex")));
}
const antal: Record<string, number> = {};
for (const h of hazards) antal[h.kind] = (antal[h.kind] ?? 0) + 1;
const isiga = live.weather.filter((w: { yta: number | null; fukt: boolean }) => w.yta != null && w.yta <= 1 && w.fukt).length;

// ---------- the scenarios ----------
interface Scenario { namn: string; variant: string; spar: SimFix[]; /** Planes: the altitude that counts as the ground. */ markM?: (t: number) => number }
const scenarier: Scenario[] = [];
const ll = (p: P) => ({ lon: p[0], lat: p[1] });

for (const [a, b] of [["ARN", "MMX"], ["ARN", "GOT"], ["ARN", "LLA"]]) {
  const bas = flygspar(FLYGPLATS[a], FLYGPLATS[b]);
  const hojd = new Map(bas.map((f) => [f.t, f.altitudeM!]));
  const mark = Math.max(FLYGPLATS[a].hojdM, FLYGPLATS[b].hojdM);
  for (const v of Object.keys(VARIANTER) as Variant[]) {
    scenarier.push({ namn: `Flyg ${a}–${b}`, variant: v, spar: variant(bas, v, `${a}-${b}`), markM: (t) => hojd.get(t)! - mark });
  }
}

const jarnvag = JSON.parse(readFileSync(new URL("../data/simulering/jarnvag.json", import.meta.url), "utf8")).linjer as
  Record<string, { stopp: { index: number }[]; punkter: P[] }>;
const tag = (namn: string, linje: string, f: { maxKmh: number; accMs2: number; bromsMs2: number; uppehallS: number }, stoppVarM?: number) => {
  const l = jarnvag[linje], bana = new Bana(l.punkter);
  const stoppM = stoppVarM ? stoppVar(bana.langdM, stoppVarM) : l.stopp.map((s) => bana.kum[s.index]);
  const bas = markspar(l.punkter, { ...f, stoppM });
  scenarier.push({ namn, variant: "fart finns", spar: bas }, { namn, variant: "bara lägen", spar: variant(bas, "bara lägen", namn) });
};
tag("Snabbtåg 200 km/h Stockholm–Göteborg", "Stockholm C–Göteborg C", { maxKmh: 200, accMs2: 0.5, bromsMs2: 0.6, uppehallS: 120 });
tag("Regionaltåg 160 km/h Stockholm–Uppsala–Gävle", "Stockholm C–Gävle C", { maxKmh: 160, accMs2: 0.6, bromsMs2: 0.7, uppehallS: 90 });
tag("Regionaltåg 140 km/h Stockholm–Uppsala–Gävle", "Stockholm C–Gävle C", { maxKmh: 140, accMs2: 0.6, bromsMs2: 0.7, uppehallS: 90 });
tag("Pendeltåg 90 km/h Stockholm–Södertälje, stopp var 3:e km", "Stockholm C–Södertälje", { maxKmh: 90, accMs2: 0.8, bromsMs2: 0.8, uppehallS: 40 }, 3000);

// The longest slippery stretch of the snapshot: the car control drives it, and the others ride it or run beside it.
const langd = (l: P[]) => new Bana(l).langdM;
const stracka = [...live.segments as { id: string; line: P[]; road: string | null; code: number | null; info: string[] }[]]
  .sort((x, y) => langd(y.line) - langd(x.line) || (x.id < y.id ? -1 : 1))[0];
const bredvid = (sidaM: number) => {
  const linje = sidoflytta(stracka.line, sidaM);
  const d = linje.map((p) => {
    let b = Infinity;
    for (let i = 1; i < stracka.line.length; i++) b = Math.min(b, distToSegmentM(ll(p), ll(stracka.line[i - 1]), ll(stracka.line[i])));
    return b;
  }).sort((x, y) => x - y);
  return { linje, medianM: Math.round(d[d.length >> 1]), minM: Math.round(d[0]) };
};
if (stracka) {
  const s = `hal sträcka ${stracka.id}`;
  scenarier.push({ namn: `KONTROLL: bil 80 km/h längs ${s}`, variant: "fart finns", spar: markspar(stracka.line, { maxKmh: 80, accMs2: 1.5, bromsMs2: 2 }) });
  scenarier.push({ namn: `Buss 50 km/h, hållplats var 500:e m, längs ${s}`, variant: "fart finns",
                   spar: markspar(stracka.line, { maxKmh: 50, accMs2: 1, bromsMs2: 1.2, stoppM: stoppVar(langd(stracka.line), 500), uppehallS: 20 }) });
  scenarier.push({ namn: `Cykel 20 km/h längs ${s} (första 5 km)`, variant: "fart finns",
                   spar: markspar(stracka.line, { maxKmh: 20, accMs2: 0.5, bromsMs2: 1 }).filter((f) => f.t <= 900) });
  for (const [sida, kmh] of [[40, 140], [150, 140], [400, 140], [40, 200]]) {
    const b = bredvid(sida);
    scenarier.push({ namn: `Tåg ${kmh} km/h på spår ${sida} m vid sidan av ${s} (median ${b.medianM} m, minst ${b.minM} m)`, variant: "fart finns",
                     spar: markspar(b.linje, { maxKmh: kmh, accMs2: 0.6, bromsMs2: 0.7 }) });
  }
}
// A car and a bus on a real road (OSRM on OpenStreetMap, already in the repo): what a driver hears there tonight.
const rv40 = JSON.parse(readFileSync(new URL("../data/favoritprov/rutter-osrm.json", import.meta.url), "utf8")).rutter["Rv40 Göteborg→Jönköping"].punkter as P[];
scenarier.push({ namn: "Bil 100 km/h Rv40 Göteborg–Jönköping (vägens egen linje)", variant: "fart finns", spar: markspar(rv40, { maxKmh: 100, accMs2: 1.5, bromsMs2: 2 }) });
scenarier.push({ namn: "Buss 80 km/h Rv40 Göteborg–Jönköping, hållplats var 5:e km", variant: "fart finns",
                 spar: markspar(rv40, { maxKmh: 80, accMs2: 1, bromsMs2: 1.2, stoppM: stoppVar(langd(rv40), 5000), uppehallS: 30 }) });

// ---------- run ----------
const KORT: Record<string, string> = { accident: "olycka", slippery_segment: "halka", icing_point: "frysrisk", wildlife: "vilt", camera: "kamera", kandidat: "kandidat", smavag: "småväg" };
const rader = scenarier.map((s) => {
  const alerts: Alert[] = new AlertEngine(hazards).run(s.spar);
  const per: Record<string, number> = {};
  for (const a of alerts) per[KORT[a.kind] ?? a.kind] = (per[KORT[a.kind] ?? a.kind] ?? 0) + 1;
  const iLuften = s.markM ? alerts.filter((a) => s.markM!(a.t) > 10).length : null;
  return { scenario: s.namn, variant: s.variant, fixar: s.spar.length, minuter: Math.round(s.spar[s.spar.length - 1].t / 60),
           varningar: alerts.length, per, ...(iLuften === null ? {} : { paMarken: alerts.length - iLuften, iLuften }),
           forsta: alerts[0] ? { t: alerts[0].t, text: alerts[0].text } : null, alerts };
});

const kontroll = rader.find((r) => r.scenario.startsWith("KONTROLL"));
console.log(`# Simulering: tåg, flyg och annat som inte är en bil`);
console.log(`\nMotor: \`${resolve(motorDir)}\``);
console.log(`Lägesfil: generated_at ${live.generated_at} (manifestets sha256 stämmer). Faror: ${Object.entries(antal).map(([k, n]) => `${n} ${KORT[k] ?? k}`).join(", ")}; ` +
  `olyckor ${antal.accident ?? 0}, vilt ${antal.wildlife ?? 0}, småvägar ${antal.smavag ?? 0}. ` +
  `Alla ${live.segments.length} sträckor i filen är hala enligt motorns regel om klassen är 2 eller högre (klass ${[2, 3, 4].map((k) => `${k}: ${live.segments.filter((x: { code: number }) => x.code === k).length}`).join(", ")}); ` +
  `${isiga} av ${live.weather.length} stationer uppfyller frysregeln (yta högst +1 °C och fukt).`);
if (stracka) console.log(`Den hala sträckan i kontrollen: ${stracka.id}${stracka.road ? ` (väg ${stracka.road})` : ""}, ${(langd(stracka.line) / 1000).toFixed(1)} km, klass ${stracka.code}, ${stracka.info.join(" + ")}.`);
console.log(`\n| Scenario | Variant | Min | Fixar | Varningar | Per sort | På marken / i luften | Första varningen |`);
console.log(`|---|---|---:|---:|---:|---|---|---|`);
for (const r of rader) {
  console.log(`| ${r.scenario} | ${r.variant} | ${r.minuter} | ${r.fixar} | ${r.varningar} | ${Object.entries(r.per).map(([k, n]) => `${k} ${n}`).join(", ") || "–"} | ` +
    `${"iLuften" in r ? `${r.paMarken} / ${r.iLuften}` : ""} | ${r.forsta ? `t=${r.forsta.t} s: ${r.forsta.text}` : "tyst"} |`);
}
console.log(`\nVarianter: ${Object.entries(VARIANTER).map(([k, v]) => `*${k}* = ${v}`).join("; ")}.`);
const halkaIKontrollen = kontroll?.per.halka ?? 0;
console.log(`\nKONTROLLEN: bilen på den hala sträckan fick ${halkaIKontrollen} halkvarning(ar) — ${halkaIKontrollen > 0 ? "motorn talar där den ska" : "MOTORN TIGER DÄR DEN SKA TALA: tystnaden ovan bevisar ingenting"}.`);
if (jsonUt) writeFileSync(jsonUt, JSON.stringify({ motor: resolve(motorDir), generated_at: live.generated_at, faror: antal, rader }, null, 1) + "\n");
if (kontroll && halkaIKontrollen === 0) process.exit(1);
