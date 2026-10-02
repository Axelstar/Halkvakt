// KUVÖSENS SMHI-STATIONER (kort #232, PLAN-KUVOSEN steg 4, DECISIONS #441): metobs för vintern 2024/25, hämtat EN gång ur SMHI:s
// kvalitetskontrollerade arkiv (`corrected-archive`) och skrivet till en fil per parameter. Driftens kod hämtar molnet vid körning ur
// `latest-months` (publish/moln.ts), som bara räcker 130 dygn bakåt — vintern 2024/25 finns bara i arkivet, en hel stationshistorik per
// fil, så raderna utanför vintern kastas här.
//
//   1  lufttemperatur, momentanvärde 1 gång/tim       (smhi-prov, SMHI-jämförelserna)
//   7  nederbördsmängd, summa 1 timme                  (mot VViS-mängden när Trafikverket förklarat den)
//   13 rådande väder, WMO-kod                          (grind NT: nederbördstyp och underkylt)
//   16 total molnmängd, timvärde                       (T-A:s och R-A:s molnkontroll, publish/moln.ts)
//
// Bara stationer vars mätperiod täcker någon del av vintern. Inget tolkas: värdet och SMHI:s kvalitetskod skrivs som de står
// (G = kontrollerat, Y = misstänkt); värdevakten och regeln som läser fältet bestämmer.
//
// Kör: node --experimental-strip-types kuvos/smhi-vinter.ts <utmapp> [parameter …]
// Källa: SMHI öppna data (CC BY 4.0).
import { createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";
import { join } from "node:path";

const UA = "Halkvakt-kuvosen/0.1 (+https://github.com/Axelstar/Halkvakt)";
const API = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter";
export const FRAN = Date.parse("2024-10-31T00:00:00Z"), TILL = Date.parse("2025-04-01T00:00:00Z");
export const PARAMETRAR = [1, 7, 13, 16];

/** En stations arkivfil → vinterns rader. Läget tas ur den positionsperiod som täcker raden (stationer flyttar). */
export function tolkaArkiv(text: string) {
  const rader = text.replace(/^﻿/, "").split(/\r?\n/);
  const pos: { fran: number; till: number; lat: number; lon: number }[] = [];
  let i = 0, namn = "";
  for (; i < rader.length; i++) {
    const r = rader[i];
    if (i === 1) namn = r.split(";")[0];
    if (r.startsWith("Tidsperiod (fr.o.m)")) {
      for (let k = i + 1; k < rader.length && rader[k].trim(); k++) {
        const f = rader[k].split(";");
        pos.push({ fran: Date.parse(f[0].replace(" ", "T") + "Z"), till: Date.parse(f[1].replace(" ", "T") + "Z"), lat: Number(f[3]), lon: Number(f[4]) });
      }
    }
    if (r.startsWith("Datum;Tid (UTC);")) break;
  }
  if (i >= rader.length) throw new Error("arkivfilen har ingen rubrik 'Datum;Tid (UTC);'");
  const ut: { t: number; varde: string; kvalitet: string; lat: number; lon: number }[] = [];
  for (let k = i + 1; k < rader.length; k++) {
    const f = rader[k].split(";");
    if (f.length < 4 || !/^\d{4}-\d{2}-\d{2}$/.test(f[0])) continue;
    const t = Date.parse(`${f[0]}T${f[1]}Z`);
    if (!(t >= FRAN && t < TILL)) continue;
    const p = pos.find((x) => t >= x.fran && t <= x.till) ?? pos[pos.length - 1];
    ut.push({ t, varde: f[2], kvalitet: f[3], lat: p?.lat ?? NaN, lon: p?.lon ?? NaN });
  }
  return { namn, rader: ut };
}

async function hamta(url: string): Promise<string | null> {
  for (let forsok = 0; forsok < 8; forsok++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 404) return null;
      if (r.status === 429) { await new Promise((ok) => setTimeout(ok, (Number(r.headers.get("retry-after")) || 10 * (forsok + 1)) * 1000)); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (forsok === 7) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise((ok) => setTimeout(ok, 2000 * (forsok + 1)));
    }
  }
  throw new Error(`${url}: fortfarande 429 efter åtta försök`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const [mapp, ...valda] = process.argv.slice(2);
  if (!mapp) { console.error("användning: smhi-vinter.ts <utmapp> [parameter …]"); process.exit(1); }
  for (const p of valda.length ? valda.map(Number) : PARAMETRAR) {
    const meta: any = JSON.parse((await hamta(`${API}/${p}.json`))!);
    const stationer = (meta.station as any[]).filter((s) => s.from <= TILL && s.to >= FRAN);
    const gz = createGzip(); const fil = join(mapp, `smhi_p${p}_2024-25.csv.gz`); const ut = gz.pipe(createWriteStream(fil));
    gz.write("parameter,station_id,lat,lon,tid_utc,varde,kvalitet\n");
    const perManad = new Map<string, { stationer: Set<string>; rader: number }>();
    let utan = 0;
    for (const s of stationer) {
      const text = await hamta(`${API}/${p}/station/${s.key}/period/corrected-archive/data.csv`);
      if (!text) { utan++; continue; }
      const { rader } = tolkaArkiv(text);
      if (!rader.length) { utan++; continue; }
      for (const r of rader) {
        gz.write(`${p},${s.key},${r.lat},${r.lon},${new Date(r.t).toISOString()},${r.varde},${r.kvalitet}\n`);
        const m = new Date(r.t).toISOString().slice(0, 7);
        const x = perManad.get(m) ?? { stationer: new Set(), rader: 0 }; perManad.set(m, x);
        x.stationer.add(String(s.key)); x.rader++;
      }
    }
    await new Promise<void>((ok) => { ut.on("finish", () => ok()); gz.end(); });
    console.log(`parameter ${p} (${meta.title.split(":")[0]}): ${stationer.length} stationer med period över vintern, ${utan} utan rader i arkivet → ${fil}`);
    for (const [m, x] of [...perManad].sort()) console.log(`  ${m}: ${String(x.stationer.size).padStart(4)} stationer, ${String(x.rader).padStart(7)} rader`);
  }
}
