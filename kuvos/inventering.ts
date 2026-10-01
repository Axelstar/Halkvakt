// Inventeringen av en okänd CSV (kort #232, DECISIONS #424; docs/PLAN-KUVOSEN-2026-10-01.md steg 2). Trafikverkets historik
// kommer i ett format som "är annorlunda jämfört med API" — det första vi gör med filen är att LÄSA den, inte tolka den:
// rader, kolumner, och för varje kolumn hur mycket som är tomt, vad som är tal, tid eller text, spannet och de vanligaste värdena.
// Ingenting skrivs någonstans. Kolumnöversättningen till arkivets schema byggs först när den här utskriften är läst —
// ett fält får inte bära en tröskel förrän det besiktigats (VÄRDEVAKTEN, CLAUDE.md).
//
// Kör: node --experimental-strip-types kuvos/inventering.ts <fil.csv>
import { createReadStream, openSync, readSync, closeSync } from "node:fs";
import { createInterface } from "node:readline";

export type Kolumn = {
  namn: string; tomma: number; tal: number; tider: number; texter: number;
  min: number | null; max: number | null;          // talens spann
  tidMin: string | null; tidMax: string | null;    // tidernas spann, som de står i filen
  varden: Map<string, number>; flerVarden: boolean; // textvärden med antal, högst VARDETAK olika
};
export type Inventering = { avgransare: string; rader: number; snedaRader: number; kolumner: Kolumn[] };

const VARDETAK = 40;
const TAL = /^[+-]?\d+(?:[.,]\d+)?$/;
const TID = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/** Avgränsaren är det tecken av ; , tab | som förekommer flest gånger i rubrikraden (utanför citat). */
export function gissaAvgransare(rubrik: string): string {
  const utanCitat = rubrik.replace(/"[^"]*"/g, "");
  let bast = ";", n = -1;
  for (const c of [";", ",", "\t", "|"]) { const k = utanCitat.split(c).length - 1; if (k > n) { n = k; bast = c; } }
  return bast;
}

/** En rad i fält. Citattecken får omsluta ett fält som innehåller avgränsaren; "" inuti är ett citattecken. */
export function delaRad(rad: string, avgr: string): string[] {
  const ut: string[] = []; let f = "", citat = false;
  for (let i = 0; i < rad.length; i++) {
    const c = rad[i];
    if (citat) { if (c === '"') { if (rad[i + 1] === '"') { f += '"'; i++; } else citat = false; } else f += c; }
    else if (c === '"') citat = true;
    else if (c === avgr) { ut.push(f); f = ""; }
    else f += c;
  }
  ut.push(f);
  return ut.map((s) => s.trim());
}

export async function inventera(rader: AsyncIterable<string> | Iterable<string>): Promise<Inventering> {
  let inv: Inventering | null = null;
  for await (const ra of rader) {
    const rad = ra.replace(/^﻿/, "").replace(/\r$/, "");
    if (!inv) {
      if (!rad.trim()) continue;
      const avgr = gissaAvgransare(rad);
      inv = { avgransare: avgr, rader: 0, snedaRader: 0, kolumner: delaRad(rad, avgr).map((namn) => ({
        namn, tomma: 0, tal: 0, tider: 0, texter: 0, min: null, max: null, tidMin: null, tidMax: null, varden: new Map(), flerVarden: false })) };
      continue;
    }
    if (!rad.trim()) continue;
    const falt = delaRad(rad, inv.avgransare);
    inv.rader++;
    if (falt.length !== inv.kolumner.length) inv.snedaRader++;
    for (let i = 0; i < inv.kolumner.length; i++) {
      const k = inv.kolumner[i], v = falt[i] ?? "";
      if (v === "") { k.tomma++; continue; }
      if (TAL.test(v)) {
        const x = Number(v.replace(",", "."));
        k.tal++; k.min = k.min === null || x < k.min ? x : k.min; k.max = k.max === null || x > k.max ? x : k.max;
      } else if (TID.test(v)) {
        k.tider++; k.tidMin = k.tidMin === null || v < k.tidMin ? v : k.tidMin; k.tidMax = k.tidMax === null || v > k.tidMax ? v : k.tidMax;
      } else {
        k.texter++;
        if (k.varden.has(v) || k.varden.size < VARDETAK) k.varden.set(v, (k.varden.get(v) ?? 0) + 1); else k.flerVarden = true;
      }
    }
  }
  if (!inv) throw new Error("filen har ingen rubrikrad");
  return inv;
}

export function skrivUt(inv: Inventering): string[] {
  const namn = { ";": "semikolon", ",": "komma", "\t": "tab", "|": "lodstreck" }[inv.avgransare] ?? inv.avgransare;
  const ut = [`rader: ${inv.rader} · kolumner: ${inv.kolumner.length} · avgränsare: ${namn}` +
    (inv.snedaRader ? ` · RADER MED FEL ANTAL FÄLT: ${inv.snedaRader}` : "")];
  for (const k of inv.kolumner) {
    const delar = [`tomma ${k.tomma} (${inv.rader ? Math.round((k.tomma / inv.rader) * 1000) / 10 : 0} %)`];
    if (k.tal) delar.push(`tal ${k.tal}: ${k.min} … ${k.max}`);
    if (k.tider) delar.push(`tid ${k.tider}: ${k.tidMin} … ${k.tidMax}`);
    if (k.texter) {
      const topp = [...k.varden].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, n]) => `${JSON.stringify(v)}×${n}`).join(" ");
      delar.push(`text ${k.texter}, ${k.varden.size}${k.flerVarden ? "+" : ""} olika: ${topp}`);
    }
    ut.push(`  ${k.namn || "(namnlös)"} — ${delar.join(" · ")}`);
  }
  return ut;
}

/** UTF-8 om filens början går att avkoda strikt, annars latin1 (svenska myndighetsfiler är ofta det). */
export function gissaKodning(fil: string): "utf8" | "latin1" {
  const fd = openSync(fil, "r"), buf = Buffer.alloc(1 << 18);
  const n = readSync(fd, buf, 0, buf.length, 0); closeSync(fd);
  let slut = n;
  while (slut > 0 && (buf[slut - 1] & 0xc0) === 0x80) slut--;   // klipp inte mitt i ett flerbytestecken
  if (slut > 0 && buf[slut - 1] >= 0xc0) slut--;
  try { new TextDecoder("utf-8", { fatal: true }).decode(buf.subarray(0, slut)); return "utf8"; } catch { return "latin1"; }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  const fil = process.argv[2];
  if (!fil) { console.error("användning: inventering.ts <fil.csv>"); process.exit(1); }
  const kodning = gissaKodning(fil);
  console.log(`fil: ${fil} · kodning: ${kodning}`);
  const inv = await inventera(createInterface({ input: createReadStream(fil, { encoding: kodning }), crlfDelay: Infinity }));
  for (const rad of skrivUt(inv)) console.log(rad);
}
