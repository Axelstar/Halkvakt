// FAVORITPROVET, TORRKÖRNING (DECISIONS #529): samma frågor mot Trafikverket som supabase/functions/favoritprov/main.ts, och samma
// byggRapport och favoritRapport för skuggans 30 rutter mot dagens lägesfil — men i Node, utan databas (inga stationsnamn) och utan att
// skriva något. Läs-only. Skälet: frågornas form (IN, INCLUDE, FerryRoute) går inte att pröva utan nyckeln, och funktionen ska inte
// driftsättas med en fråga som faller.
// Kör: vagarbeten-matning.yml med inmatningen skript = den här filen. TRAFIKVERKET_API_KEY krävs.
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { byggRapport, favoritRapport, ORDNING } from "../../publish/rapport-core.ts";
import { lasRutter } from "../../publish/skuggfacit.ts";

const KEY = process.env.TRAFIKVERKET_API_KEY;
const CDN = "https://axelstar.github.io/halkvakt-karta/data/app/v1/";

async function trv(objekt: string, version: string, ns: string, filter: string, include: string[] = [], limit = 20000) {
  const inc = include.map((f) => `<INCLUDE>${f}</INCLUDE>`).join("");
  const q = `<REQUEST><LOGIN authenticationkey="${KEY}"/><QUERY objecttype="${objekt}" schemaversion="${version}" namespace="${ns}" limit="${limit}">` +
    `${filter ? `<FILTER>${filter}</FILTER>` : ""}${inc}</QUERY></REQUEST>`;
  const t0 = performance.now();
  const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", { method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
  const text = await r.text();
  if (!r.ok) throw new Error(`${objekt} ${r.status}: ${text.slice(0, 400)}`);
  const rader = JSON.parse(text)?.RESPONSE?.RESULT?.[0]?.[objekt] ?? [];
  console.log(`mätt: ${objekt}: ${rader.length} poster, ${(text.length / 1000).toFixed(0)} kB svar, ${(performance.now() - t0).toFixed(0)} ms${rader.length >= limit ? " — TAKET NÅTT" : ""}`);
  return rader;
}
const kb = (s: string) => `${(s.length / 1000).toFixed(1)} kB rå · ${(gzipSync(Buffer.from(s), { level: 9 }).length / 1000).toFixed(1)} kB packad`;

async function main(): Promise<number> {
  if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); return 1; }
  const nu = Date.now(); const fran = new Date(nu).toISOString(), till = new Date(nu + 24 * 3_600_000).toISOString();
  console.log(`mätt: FAVORITPROVET, TORRKÖRNING (${fran}), läs-only, DECISIONS #529`);
  const TYPER = "Accident,AnimalPresenceObstruction,AbnormalTraffic,MaintenanceWorks,RoadOrCarriagewayOrLaneManagement,VehicleObstruction,GeneralObstruction";
  const DEV = ["Id", "Deleted", "Suspended", "StartTime", "EndTime", "CreationTime", "ValidUntilFurtherNotice", "MessageTypeValue", "MessageCode",
    "MessageCodeValue", "Header", "Message", "RoadNumber", "LocationDescriptor", "SeverityCode", "SeverityText", "NumberOfLanesRestricted",
    "TemporaryLimit", "TrafficRestrictionType", "Geometry.Point.WGS84", "Geometry.Line.WGS84"].map((f) => `Deviation.${f}`);
  const sit = await trv("Situation", "1.6", "road.trafficinfo", `<IN name="Deviation.MessageTypeValue" value="${TYPER}"/>`, ["Deleted", ...DEV]);
  const tt = await trv("TravelTimeRoute", "1.6", "road.trafficinfo", "", ["Id", "Name", "TravelTime", "FreeFlowTravelTime", "TrafficStatus", "MeasureTime", "Geometry.WGS84"]);
  const fa = await trv("FerryAnnouncement", "1.2", "ferry.trafficinfo", `<AND><GTE name="DepartureTime" value="${fran}"/><LT name="DepartureTime" value="${till}"/></AND>`);
  const fr = await trv("FerryRoute", "1.2", "ferry.trafficinfo", "");
  console.log(`mätt: fälten i en färjeled: ${JSON.stringify(fr[0] ?? {}).slice(0, 400)}`);
  console.log(`mätt: fälten i en avvikelse: ${Object.keys(sit[0]?.Deviation?.[0] ?? {}).join(", ")}`);
  const [lv, st] = await Promise.all([fetch(CDN + "live.json").then((r) => r.json()), fetch(CDN + "static.json").then((r) => r.json())]);
  const t0 = performance.now();
  const { snabb, lang } = byggRapport({ nu, situationer: sit, restider: tt, farjor: fa, farjeleder: fr, stationer: [] });
  console.log(`mätt: byggRapport ${(performance.now() - t0).toFixed(0)} ms: ${snabb.poster.length} poster, ${Object.keys(lang.linjer).length} linjer; noter: ${snabb.noter.join(" | ") || "inga"}`);
  const perSlag = new Map<string, number>(); for (const p of snabb.poster) perSlag.set(p.slag, (perSlag.get(p.slag) ?? 0) + 1);
  console.log(`mätt: poster per slag: ${[...perSlag].map(([s, n]) => `${s} ${n}`).join(", ")}`);
  console.log(`mätt: den snabba delen ${kb(JSON.stringify(snabb))} · den långsamma ${kb(JSON.stringify(lang))}`);
  const kod = readFileSync(new URL("../../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8");
  const rutter = { ...lasRutter(kod), ...lasRutter(kod.replace("const ROUTES: Record", "const ROUTES_X: Record").replace("const ROUTES_C: Record", "const ROUTES: Record")) };
  const t1 = performance.now(); let sum = 0;
  for (const [namn, linje] of Object.entries(rutter)) {
    const r = favoritRapport(linje, lv, st, snabb, lang); sum += r.length;
    const per = ORDNING.map((s) => [s, r.filter((x) => x.slag === s).length] as const).filter(([, n]) => n).map(([s, n]) => `${s} ${n}`);
    console.log(`mätt:   ${namn.slice(0, 42).padEnd(42)} ${String(r.length).padStart(3)} rader: ${per.join(", ") || "inget"}`);
  }
  console.log(`mätt: favoritRapport för ${Object.keys(rutter).length} rutter ${(performance.now() - t1).toFixed(0)} ms, ${sum} rader`);
  return 0;
}
main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
