// SOFFPROVET (DECISIONS #596, kort #343 steg 13): en GPX-rutt genom en sträcka där kandidaten varnar JUST NU, för Android-emulatorns
// ruttuppspelning (android/SOFFPROVET.md). Läser den publika lägesfilen som appen läser den och väglagsnätet som Körflödet hämtar det,
// väljer sträckan med flest varnande punkter (eller --stracka <id>) och den del av dess linje som bär flest av dem, och skriver rutten
// längs linjen i 80 km/h, en punkt var tredje sekund, med 3 km inkörning rakt bakåt från linjens början. Motorn varnar när en punkt
// ligger framför i färdriktningen inom förvarningen (engine.ts, evaluateKandidat), så inkörningen ger den tid att tala.
// Vägrar om kandidaten inte varnar någonstans. Positionen är påhittad och lämnar aldrig datorn.
// --xcode skriver rutten som punkter med tid (<wpt>), som Xcodes platssimulering läser (ios/MAC-GUIDE.md); utan den spårpunkter
// (<trkpt>) för Android-emulatorn (DECISIONS #605).
// Kör: node --experimental-strip-types scripts/kandidat-gpx.ts [--stracka <id>] [--ut soffprovet.gpx] [--xcode] | --sjalvtest
import { writeFileSync } from "node:fs";
import { haversineM } from "../engine/src/geo.ts";
import { linjerUr, parning } from "../kuvos/facit-trv.ts";

const LIVE = "https://axelstar.github.io/halkvakt-karta/data/app/v1/live.json";
const VAGLAG = "https://axelstar.github.io/halkvakt-karta/data/vaglag.geojson";
const FART_MS = 80 / 3.6, STEG_S = 3, INKORNING_M = 3000, NARA_M = 500;
type P = [number, number];
type Kandidat = { id: string; punkter: P[] };

/** Kandidatens sträckor utan Trafikverkets halkvarning (live.segments). På en sådan sträcka vinner den vanliga varningen och
 *  kandidaten tiger (prioriteten, DECISIONS #577 och #581) — soffprovet 17/10 18:26 hörde bara "halka" på sträcka 45130. */
export function utanVanliga(kandidat: Kandidat[], segments: { id: unknown }[]): Kandidat[] {
  const vanliga = new Set(segments.map((s) => String(s.id)));
  return kandidat.filter((k) => !vanliga.has(k.id));
}

/** Sträckan med flest varnande punkter, eller den önskade; null om kandidaten inte varnar någonstans. */
export function valj(kandidat: Kandidat[], onskad?: string): Kandidat | null {
  if (onskad) return kandidat.find((k) => k.id === onskad) ?? null;
  return kandidat.length ? [...kandidat].sort((a, b) => b.punkter.length - a.punkter.length)[0] : null;
}

/** Hur många av punkterna som ligger inom NARA_M från linjedelen. */
export function nara(del: P[], punkter: P[]): number {
  const par = parning(punkter.map((p, i) => ({ id: String(i), lon: p[0], lat: p[1] })), [{ id: "del", delar: [del] }], NARA_M);
  return [...par.values()].filter((x) => x.length).length;
}

/** Rutten: inkörningen rakt bakåt från linjens början, sedan längs linjen, en punkt per steg. */
export function rutt(linje: P[], stegM = FART_MS * STEG_S, inkorningM = INKORNING_M): P[] {
  const [a, b] = linje;
  const d0 = haversineM({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] });
  const bakat: P = [a[0] - (b[0] - a[0]) * inkorningM / d0, a[1] - (b[1] - a[1]) * inkorningM / d0];
  const hel = [bakat, ...linje], ut: P[] = [bakat];
  let kvar = stegM;
  for (let i = 0; i < hel.length - 1; i++) {
    const [p, q] = [hel[i], hel[i + 1]], d = haversineM({ lon: p[0], lat: p[1] }, { lon: q[0], lat: q[1] });
    let s = kvar;
    while (s <= d) { const f = s / d; ut.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]); s += stegM; }
    kvar = s - d;
  }
  return ut;
}

export function gpx(punkter: P[], namn: string, start: number, xcode = false): string {
  const tid = (i: number) => new Date(Math.floor(start / 1000) * 1000 + i * STEG_S * 1000).toISOString().replace(".000Z", "Z");   // hela sekunder
  const huvud = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Halkvakt soffprovet (DECISIONS #596)">\n`;
  if (xcode) return huvud + punkter.map((p, i) => `  <wpt lon="${p[0].toFixed(6)}" lat="${p[1].toFixed(6)}"><time>${tid(i)}</time></wpt>`).join("\n") + "\n</gpx>\n";
  const rad = (p: P, i: number) => `      <trkpt lat="${p[1].toFixed(6)}" lon="${p[0].toFixed(6)}"><time>${tid(i)}</time></trkpt>`;
  return huvud + `  <trk><name>${namn}</name><trkseg>\n` + punkter.map(rad).join("\n") + "\n  </trkseg></trk>\n</gpx>\n";
}

function sjalvtest() {
  let fel = 0; const k = (ok: boolean, m: string) => { if (!ok) { fel++; console.error("✗ " + m); } else console.log("  ok: " + m); };
  const km = (n: number) => n / 111.2;                                   // en latitudgrad ≈ 111,2 km
  const linje: P[] = [[16, 65], [16, 65 + km(5)], [16, 65 + km(10)]];   // 10 km norrut
  const r = rutt(linje);
  const fran = (p: P, q: P) => haversineM({ lon: p[0], lat: p[1] }, { lon: q[0], lat: q[1] });
  k(Math.abs(fran(r[0], linje[0]) - 3000) < 5 && r[0][1] < 65, `inkörningen: 3 km söder om linjens början (${fran(r[0], linje[0]).toFixed(0)} m)`);
  const steg = r.slice(1).map((p, i) => fran(r[i], p));
  k(steg.every((s) => Math.abs(s - 80 / 3.6 * 3) < 1), `stegen: 66,7 m (80 km/h på 3 s) hela vägen, också över brytpunkten (${Math.min(...steg).toFixed(1)}–${Math.max(...steg).toFixed(1)})`);
  const langd = 3000 + fran(linje[0], linje[1]) + fran(linje[1], linje[2]);
  k(fran(r[r.length - 1], linje[2]) < 67 && r.length === Math.floor(langd / (80 / 3.6 * 3)) + 1, `rutten slutar vid linjens slut (${r.length} punkter på ${langd.toFixed(0)} m)`);
  const kand: Kandidat[] = [{ id: "a", punkter: [[16, 65 + km(5)]] }, { id: "b", punkter: [[16, 65 + km(2)], [16, 65 + km(8)]] }];
  k(utanVanliga(kand, [{ id: "b" }]).map((x) => x.id).join() === kand.filter((x) => x.id !== "b").map((x) => x.id).join(),
    "sträckor med Trafikverkets halkvarning väljs aldrig");
  k(valj(kand)?.id === "b" && valj(kand, "a")?.id === "a" && valj([]) === null && valj(kand, "x") === null, "valet: flest punkter, eller den önskade; ingen kandidat ⇒ inget");
  k(nara(linje, [[16, 65 + km(5)], [16 + 0.6 / 47, 65 + km(5)]]) === 1, "nära linjen: 0 m med, 600 m utanför");
  const g = gpx(r.slice(0, 2), "prov", Date.parse("2026-10-17T05:00:00Z"));
  k(g.includes(`<trkpt lat="${r[0][1].toFixed(6)}" lon="16.000000"><time>2026-10-17T05:00:00Z</time></trkpt>`) && g.includes("<time>2026-10-17T05:00:03Z</time>")
    && (g.match(/<trkpt /g) ?? []).length === 2,
    "GPX: spårpunkter med lat, lon och tid, tre sekunder isär");
  const x = gpx(r.slice(0, 3), "prov", Date.parse("2026-10-17T05:00:00Z"), true);
  k(x.includes(`<wpt lon="16.000000" lat="${r[0][1].toFixed(6)}"><time>2026-10-17T05:00:00Z</time></wpt>`) && x.includes("<time>2026-10-17T05:00:06Z</time></wpt>")
    && (x.match(/<wpt /g) ?? []).length === 3 && !x.includes("<trk") && x.endsWith("</gpx>\n"),
    "GPX för Xcode: punkter med tid (<wpt>) som TestkorningE22.gpx, inga spår");
  k(gpx(r.slice(0, 1), "prov", Date.parse("2026-10-17T05:00:00.197Z"), true).includes("<time>2026-10-17T05:00:00Z</time>"), "tiden i hela sekunder också när starten har millisekunder");
  if (fel) process.exit(1);
  console.log("SJÄLVTEST OK: kandidat-gpx");
}

const direkt = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("scripts/kandidat-gpx.ts");
if (direkt && process.argv.includes("--sjalvtest")) sjalvtest();
else if (direkt) {
  const arg = (n: string) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const hamta = async (u: string) => { const s = await fetch(u); if (!s.ok) { console.error(`${u}: HTTP ${s.status}`); process.exit(1); } return s.json(); };
  const live = await hamta(LIVE);
  const kand: Kandidat[] = (live.kandidat ?? []).map((x: any) => ({ id: String(x.id), punkter: x.punkter }));
  console.log(`lägesfilen: ${live.generated_at ?? live.tid ?? "?"} · kandidaten varnar på ${kand.length} sträckor`);
  const fria = utanVanliga(kand, live.segments ?? []);
  console.log(`${kand.length - fria.length} av dem har också Trafikverkets halkvarning och väljs inte (kandidaten tiger där)`);
  const k = valj(fria, arg("--stracka"));
  if (!k) { console.error("vägrar: kandidaten varnar inte på någon sträcka utan Trafikverkets halkvarning just nu (eller inte på den önskade) — prova en kall morgon"); process.exit(2); }
  const linje = linjerUr(await hamta(VAGLAG)).find((l) => l.id === k.id);
  if (!linje) { console.error(`vägrar: sträckan ${k.id} finns inte i väglagsnätet`); process.exit(1); }
  const del = [...linje.delar].sort((a, b) => nara(b, k.punkter) - nara(a, k.punkter))[0];
  const xcode = process.argv.includes("--xcode"), r = rutt(del), ut = arg("--ut") ?? (xcode ? "soffprovet-xcode.gpx" : "soffprovet.gpx");
  writeFileSync(ut, gpx(r, `Kandidaten på sträcka ${k.id}`, Date.now(), xcode));
  console.log(`sträcka ${k.id}: ${k.punkter.length} varnande punkter, ${nara(del, k.punkter)} inom ${NARA_M} m från rutten; ` +
    `${r.length} punkter, ${(r.length * STEG_S / 60).toFixed(0)} min i 80 km/h → ${ut}`);
}
