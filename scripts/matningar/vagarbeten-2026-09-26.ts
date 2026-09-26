// Vägarbeten i appen? (Bengts ja 26/9 till läsmätningen, bedömningen §4.2, DECISIONS #382). LÄS-ONLY: Trafikverkets aktiva
// situationer just nu, räknade — ingenting sparas. DECISIONS #5 stängde ute vägarbeten som "kroniskt brus"; frågan är hur mycket
// som är brus och om en SMAL variant (stor påverkan, kort varaktighet, friktion) finns.
//
// (1) Flödet: aktiva avvikelser per MessageTypeValue. (2) Vägarbetena (MaintenanceWorks, RoadOrCarriagewayOrLaneManagement): per
// påverkansgrad, varaktighet, MessageCode, TrafficRestrictionType och friktionsord i texten — fälten räknas som de FINNS, inte som
// vi tror (ett fält som saknas syns som "(saknas)"). (3) Hur ofta rösten skulle tala: motorn i engine/src körd längs de 20 svenska
// skuggrutterna (samma grova linjer och samma spår som skuggmotorns traceAlong, 80 km/h, en punkt var 5:e s), med vägarbetena som
// punktfaror — antal rop per varv, för alla och för de smala urvalen. Punktfarorna matas som `wildlife` bara för att få motorns
// avstånds- och upprepningsregler; ingen text eller prioritet mäts.
//
// Kör: vagarbeten-matning.yml (workflow_dispatch). TRAFIKVERKET_API_KEY krävs.
import { readFileSync } from "node:fs";
import { AlertEngine } from "../../engine/src/engine.ts";
import { haversineM } from "../../engine/src/geo.ts";
import type { Fix, PointHazard } from "../../engine/src/types.ts";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const VAGARBETE = new Set(["MaintenanceWorks", "RoadOrCarriagewayOrLaneManagement"]);
const FRIKTION = /beläggning|asfalt|grus|fräs|flis|ytbehandl|halk|slirig|spårig|olja/i;
const LIMIT = 20000;

const tally = (m: Map<string, number>, k: unknown) => { const s = k === undefined || k === null || k === "" ? "(saknas)" : String(k); m.set(s, (m.get(s) ?? 0) + 1); };
const skriv = (rubrik: string, m: Map<string, number>, topp = 20) => {
  console.log(`mätt: ${rubrik}`);
  for (const [k, n] of [...m].sort((a, b) => b[1] - a[1]).slice(0, topp)) console.log(`mätt:   ${n.toString().padStart(6)}  ${k.slice(0, 90)}`);
};

function rutter(): Record<string, [number, number][]> {
  const src = readFileSync("supabase/functions/skuggmotor/main.ts", "utf8");
  const start = src.indexOf("const ROUTES: Record<string, [number, number][]> = {");
  const slut = src.indexOf("\n};", start);
  if (start < 0 || slut < 0) throw new Error("ROUTES hittades inte i skuggmotor/main.ts");
  return new Function(`return ${src.slice(src.indexOf("{", start), slut + 2)}`)();
}

function spar(line: [number, number][], kmh = 80, stepS = 5): Fix[] {
  const mps = kmh / 3.6, fixes: Fix[] = []; let t = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [lon1, lat1] = line[i], [lon2, lat2] = line[i + 1];
    const steps = Math.max(1, Math.round(haversineM({ lon: lon1, lat: lat1 }, { lon: lon2, lat: lat2 }) / (mps * stepS)));
    for (let s = 0; s < steps; s++) { const f = s / steps; fixes.push({ t, lon: lon1 + (lon2 - lon1) * f, lat: lat1 + (lat2 - lat1) * f, speedKmh: kmh }); t += stepS; }
  }
  return fixes;
}

async function main(): Promise<number> {
  if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); return 1; }
  const q = `<REQUEST><LOGIN authenticationkey="${KEY}"/><QUERY objecttype="Situation" schemaversion="1.6" namespace="road.trafficinfo" limit="${LIMIT}"></QUERY></REQUEST>`;
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const body = await r.text();
  if (!r.ok) { console.error(`Situation ${r.status}: ${body.slice(0, 400)}`); return 1; }
  const sits: any[] = JSON.parse(body)?.RESPONSE?.RESULT?.[0]?.Situation ?? [];
  console.log(`mätt: ${sits.length} situationer hämtade${sits.length >= LIMIT ? ` — TAKET ${LIMIT} NÅTT, talen är för låga` : ""} (${new Date().toISOString()})`);

  const nu = Date.now(), typer = new Map<string, number>();
  const va: any[] = [];
  for (const s of sits) for (const d of s.Deviation ?? []) {
    if (s.Deleted || d.Deleted) continue;
    const start = d.StartTime ? Date.parse(d.StartTime) : -Infinity, slut = d.EndTime ? Date.parse(d.EndTime) : Infinity;
    if (!(start <= nu && nu < slut)) continue;
    tally(typer, d.MessageTypeValue);
    if (VAGARBETE.has(d.MessageTypeValue)) va.push(d);
  }
  skriv("aktiva avvikelser per MessageTypeValue", typer, 30);
  console.log(`mätt: aktiva vägarbeten: ${va.length}`);

  const falt = new Map<string, number>();
  for (const d of va) for (const k of Object.keys(d)) tally(falt, k);
  skriv("fält som finns i vägarbetena (antal som bär fältet)", falt, 60);
  const pav = new Map<string, number>(), kod = new Map<string, number>(), restr = new Map<string, number>(), tid = new Map<string, number>(), sak = new Map<string, number>();
  const varaktighet = (d: any) => {
    if (!d.EndTime) return "saknar sluttid";
    const dygn = (Date.parse(d.EndTime) - Date.parse(d.StartTime)) / 86_400_000;
    return dygn <= 1 ? "≤ 1 dygn" : dygn <= 7 ? "1–7 dygn" : dygn <= 30 ? "7–30 dygn" : dygn <= 180 ? "30–180 dygn" : "> 180 dygn";
  };
  for (const d of va) {
    tally(pav, `${d.SeverityCode ?? "(saknas)"} ${d.SeverityText ?? ""}`.trim());
    tally(kod, `${d.MessageCode ?? "(saknas)"} / ${d.MessageCodeValue ?? "(saknas)"}`);
    tally(restr, Array.isArray(d.TrafficRestrictionType) ? d.TrafficRestrictionType.join(", ") : d.TrafficRestrictionType);
    tally(tid, varaktighet(d));
    tally(sak, d.SafetyRelatedMessage);
  }
  skriv("påverkan (SeverityCode SeverityText)", pav);
  skriv("varaktighet (StartTime → EndTime)", tid);
  skriv("MessageCode / MessageCodeValue", kod, 30);
  skriv("TrafficRestrictionType", restr);
  skriv("SafetyRelatedMessage", sak);
  const friktion = va.filter((d) => FRIKTION.test(`${d.MessageCode ?? ""} ${d.Message ?? ""} ${d.Header ?? ""}`));
  console.log(`mätt: friktionsord i koden eller texten (${FRIKTION.source}): ${friktion.length}`);
  for (const d of friktion.slice(0, 12)) console.log(`mätt:   ${String(d.MessageCode ?? "")} · ${String(d.Message ?? "").replace(/\s+/g, " ").slice(0, 110)}`);

  // (3) Motorn längs de svenska skuggrutterna.
  const pt = (d: any) => { const m = /POINT \(([-\d.]+) ([-\d.]+)\)/.exec(d?.Geometry?.Point?.WGS84 ?? ""); return m ? { lon: +m[1], lat: +m[2] } : null; };
  const urval: Record<string, (d: any) => boolean> = {
    "alla vägarbeten": () => true,
    "stor eller mycket stor påverkan (kod 4, 5)": (d) => d.SeverityCode === 4 || d.SeverityCode === 5,
    "högst 7 dygn långa": (d) => varaktighet(d) === "≤ 1 dygn" || varaktighet(d) === "1–7 dygn",
    "friktionsord": (d) => friktion.includes(d),
  };
  const R = rutter(), namn = Object.keys(R);
  const km = namn.reduce((s, n) => s + R[n].slice(1).reduce((a, p, i) => a + haversineM({ lon: R[n][i][0], lat: R[n][i][1] }, { lon: p[0], lat: p[1] }), 0), 0) / 1000;
  console.log(`mätt: rösten längs ${namn.length} svenska skuggrutter (${Math.round(km)} km, ett varv var), 80 km/h`);
  for (const [etikett, f] of Object.entries(urval)) {
    const faror: PointHazard[] = va.filter(f).flatMap((d, i) => { const p = pt(d); return p ? [{ id: `va:${d.Id ?? i}`, kind: "wildlife", ...p, meta: { active: true } } as PointHazard] : []; });
    let rop = 0; const perRutt: string[] = [];
    for (const n of namn) { const a = new AlertEngine(faror).run(spar(R[n])).length; rop += a; if (a) perRutt.push(`${n} ${a}`); }
    console.log(`mätt:   ${etikett}: ${faror.length} faror med punkt · ${rop} rop på ett varv (${(rop / km * 100).toFixed(1)} per 100 km) · ${perRutt.slice(0, 8).join(" · ")}`);
  }
  return 0;
}
main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
