// KUVÖSENS KÖRFLÖDE (kort #232, PLAN-KUVOSEN steg 5, DECISIONS #424, #426): hela vintern i halvtimmessteg. Klockan ställs på varje
// steg, produktionens snapshotbyggare körs oförändrad (buildSnapshot med kuvösens klocka), och motorn kör rösten i två serier som
// redovisas var för sig och aldrig slås ihop:
//   A — de 20 svenska skuggrutterna, alla i varje steg (driften hinner tre per halvtimme);
//   B — hela väglagsnätet, varje sträcka som en egen resa i geometrins riktning, var tredje timme från 00:00 UTC.
// Samma fart och punkttäthet som skuggan (80 km/h, en punkt var femte sekund); kontraktsgrinden vaktar att kopiorna inte driver.
//
// --tid   Bara körtiden och stegen — inga varningar skrivs ut eller sparas. #426: "visar körtiden på vinterns första sju dygn att
//         serien inte ryms i ett Actions-jobb glesas den till var sjätte timme — avgjort på körtiden, innan något utfall är läst."
// --ut    Varje varning som en rad (NDJSON) för facitsteget. Körningen själv läser inget utfall.
//
// Kör: DATABASE_URL=... node --experimental-strip-types kuvos/korning.ts <vaglag.geojson> [--tid] [--dygn N] [--b-timmar 3]
//        [--ut varningar.ndjson] [--fore-min N]
import { readFileSync, createWriteStream } from "node:fs";
import { AlertEngine } from "../engine/src/engine.ts";
import { haversineM } from "../engine/src/geo.ts";
import { farorNaraRutten } from "../engine/src/rutfilter.ts";
import { snapshotToHazards } from "../engine/src/snapshot.ts";
import type { Fix } from "../engine/src/types.ts";
import { buildSnapshot, bridgesFromGeoJSON } from "../publish/snapshot-core.ts";
import { skuggmotornsRutter } from "../publish/skuggfacit.ts";
import { segmentFil } from "./radar-vinter.ts";
import { kuvosKlient } from "./klocka.ts";

const HALVTIMME_MS = 1_800_000;
/** Ett Actions-jobb får köra sex timmar. */
export const JOBB_MAX_MIN = 360;
/** Körtiden på sju dygn är ett stickprov; serien "ryms" om den beräknade tiden för hela vintern är högst 90 % av jobbets gräns.
 *  Satt före första tidskörningen (3/10), så att domen inte väljs efter talet. */
export const RYMS_ANDEL = 0.9;

/** Halvtimmarna från den första hela halvtimmen vid eller efter `fran` till den sista vid eller före `till`. */
export function halvtimmar(fran: Date, till: Date): Date[] {
  const ut: Date[] = [];
  for (let t = Math.ceil(fran.getTime() / HALVTIMME_MS) * HALVTIMME_MS; t <= till.getTime(); t += HALVTIMME_MS) ut.push(new Date(t));
  return ut;
}

/** Serie B kör i de steg som ligger på en hel timme delbar med `timmar`, räknat från 00:00 UTC (#426). */
export function serieBSteg(t: Date, timmar: number): boolean {
  return t.getUTCMinutes() === 0 && t.getUTCHours() % timmar === 0;
}

/** Linjen som fixar i jämn fart — samma som skuggmotorns traceAlong (supabase/functions/skuggmotor/main.ts). */
export function spar(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = (kmh * 1000) / 3600;
  const fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const d = haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 });
    const steps = Math.max(1, Math.round(d / (mps * stepS)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh });
      t += stepS;
    }
  }
  return fixes;
}

/** Tidsdomen enligt #426: räknar upp den uppmätta tiden till hela vintern och säger om serie B ryms var tredje timme, var sjätte
 *  eller inte alls. Tiderna är millisekunder per steg; `foreMin` är jobbets tid före körflödet (hämtning och inläsning). */
export function tidsdom(m: { stegHelaVintern: number; snapshotMs: number; aMs: number; bMsPerBSteg: number; foreMin: number }) {
  const min = (ms: number) => ms / 60_000;
  const bas = m.foreMin + min(m.stegHelaVintern * (m.snapshotMs + m.aMs));
  const medB = (timmar: number) => bas + min((m.stegHelaVintern / (2 * timmar)) * m.bMsPerBSteg);
  const grans = JOBB_MAX_MIN * RYMS_ANDEL;
  const b3 = medB(3), b6 = medB(6);
  const dom = b3 <= grans ? "B var tredje timme ryms" : b6 <= grans ? "B glesas till var sjätte timme (#426)" : "ryms inte ens med B var sjätte timme";
  return { utanB: bas, b3, b6, grans, dom };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
  const args = process.argv.slice(2);
  const flagga = (namn: string) => { const i = args.indexOf(namn); return i >= 0 ? args[i + 1] : undefined; };
  const vaglag = args[0];
  if (!vaglag || vaglag.startsWith("--")) { console.error("ange vaglag.geojson först"); process.exit(1); }
  const tid = args.includes("--tid");
  const dygn = flagga("--dygn") ? Number(flagga("--dygn")) : null;
  const bTimmar = Number(flagga("--b-timmar") ?? 3);
  const utFil = flagga("--ut");
  if (!tid && !utFil) { console.error("utan --tid krävs --ut <fil>: varningarna ska sparas för facitsteget"); process.exit(1); }

  const broar = bridgesFromGeoJSON(JSON.parse(readFileSync(new URL("../data/bridges.geojson", import.meta.url), "utf8")));
  const rutter = Object.entries(skuggmotornsRutter()).map(([namn, line]) => ({ namn, line, fixar: spar(line) }));
  const strackor = segmentFil(vaglag).map((s) => ({ namn: s.id, line: s.line, fixar: spar(s.line) }));
  const k = await kuvosKlient(url);
  await k.q("SET statement_timeout = 0");
  const [{ fran, till }] = await k.q("SELECT min(sample_time) AS fran, max(sample_time) AS till FROM public.weather_observations");
  const alla = halvtimmar(new Date(fran), new Date(till));
  const steg = dygn === null ? alla : alla.filter((t) => t.getTime() < alla[0].getTime() + dygn * 86_400_000);
  console.log(`KUVÖSENS KÖRFLÖDE (steg 5, DECISIONS #424, #426)${tid ? " — BARA KÖRTIDEN, inga varningar läses" : ""}`);
  console.log(`vintern: ${new Date(fran).toISOString()} – ${new Date(till).toISOString()} · ${alla.length} halvtimmar`);
  console.log(`körs nu: ${steg.length} steg (${steg[0]?.toISOString()} – ${steg.at(-1)?.toISOString()}) · serie A ${rutter.length} rutter, ` +
    `serie B ${strackor.length} sträckor var ${bTimmar}:e timme · ${broar.length} broar`);

  const ut = utFil ? createWriteStream(utFil) : null;
  const ms = { snapshot: 0, a: 0, b: 0 };
  let bSteg = 0, varningar = 0;
  const tomma: string[] = [];
  const noter = new Map<string, number>();
  for (const t of steg) {
    await k.stall(t);
    const t0 = performance.now();
    const { staticDoc, liveDoc, notes } = await buildSnapshot(k.q, broar, t);
    const faror = snapshotToHazards(staticDoc as any, liveDoc as any);
    ms.snapshot += performance.now() - t0;
    if (!staticDoc.stations.length) tomma.push(t.toISOString());
    for (const n of notes) { const typ = n.split(":")[0]; noter.set(typ, (noter.get(typ) ?? 0) + 1); }
    const kor = (serie: "A" | "B", vagar: typeof rutter) => {
      for (const v of vagar) {
        const larm = new AlertEngine(farorNaraRutten(faror, v.line)).run(v.fixar);
        varningar += larm.length;
        if (ut) for (const a of larm)
          ut.write(JSON.stringify({ serie, vag: v.namn, steg: t.toISOString(), t: a.t, kind: a.kind, id: a.hazardId, d: a.distanceM }) + "\n");
      }
    };
    const t1 = performance.now();
    kor("A", rutter);
    ms.a += performance.now() - t1;
    if (serieBSteg(t, bTimmar)) {
      const t2 = performance.now();
      kor("B", strackor);
      ms.b += performance.now() - t2;
      bSteg++;
    }
  }
  await new Promise<void>((klar) => (ut ? ut.end(klar) : klar()));
  await k.slut();

  const per = (x: number, n: number) => (n ? x / n : 0);
  const s = { snapshotMs: per(ms.snapshot, steg.length), aMs: per(ms.a, steg.length), bMsPerBSteg: per(ms.b, bSteg) };
  console.log(`\nper steg: snapshoten ${s.snapshotMs.toFixed(0)} ms · serie A ${s.aMs.toFixed(0)} ms · serie B ${s.bMsPerBSteg.toFixed(0)} ms per B-steg (${bSteg} B-steg)`);
  console.log(`tomma steg (ingen station i snapshoten): ${tomma.length}${tomma.length ? " — " + tomma.slice(0, 10).join(", ") + (tomma.length > 10 ? " …" : "") : ""}`);
  console.log(`snapshotens noter per slag (steg): ${[...noter].map(([n, x]) => `${n} ${x}`).join(" · ") || "inga"}`);
  if (tid) {
    const d = tidsdom({ stegHelaVintern: alla.length, ...s, foreMin: Number(flagga("--fore-min") ?? 0) });
    const f = (x: number) => `${Math.round(x)} min`;
    console.log(`\nTIDSDOMEN (#426) för hela vintern, ${alla.length} steg, jobbets tid före körflödet inräknad (${flagga("--fore-min") ?? 0} min):`);
    console.log(`  utan serie B: ${f(d.utanB)} · med B var tredje timme: ${f(d.b3)} · med B var sjätte timme: ${f(d.b6)}`);
    console.log(`  gräns: ${f(d.grans)} (${RYMS_ANDEL * 100} % av jobbets ${JOBB_MAX_MIN} min, satt före körningen) ⇒ ${d.dom}`);
  } else console.log(`\nvarningar sparade: ${varningar} rader i ${utFil} — läses av facitsteget, inte här`);
}
