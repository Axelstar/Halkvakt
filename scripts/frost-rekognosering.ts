// Frost-rekognoseringen (tavelkort "Frost-ankare (NO)", Bengts beställning 2/9):
// what does MET Norway's Frost API actually hold, before we build the Norway anchor
// measurement? Four questions, answered live (never blind — the TRV-400 lesson):
//   1. How many Norwegian SensorSystem stations exist, and who holds them
//      (does STATENS VEGVESEN appear — i.e. are road stations inside Frost)?
//   2. How many actively report air_temperature?
//   3. Do any road/surface temperature elements exist in the catalogue?
//   4. Where are the active stations relative to the E8/E10/E14 border corridors —
//      the part of the Norrland gap Norwegian anchors could actually shrink?
// Plus a live observation probe so the run proves data flows, not just metadata.
// Run (CI): frost-rekognosering.yml (workflow_dispatch). Needs FROST_CLIENT_ID.

const id = process.env.FROST_CLIENT_ID;
if (!id) { console.error("FROST_CLIENT_ID not set"); process.exit(1); }
const auth = "Basic " + Buffer.from(id + ":").toString("base64");

async function frost(path: string): Promise<any> {
  const r = await fetch("https://frost.met.no" + path, { headers: { Authorization: auth } });
  const body = await r.text();
  // Error log carries the API's response body — a bare status code costs a diagnosis lap.
  if (!r.ok) throw new Error(`${path} -> ${r.status}: ${body.slice(0, 400)}`);
  return JSON.parse(body);
}
function havKm(a: [number, number], b: [number, number]): number {
  const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// 1. Stations + holders
const src = await frost("/sources/v0.jsonld?types=SensorSystem&country=NO");
const stations = (src.data ?? []).filter((s: any) => s.geometry?.coordinates?.length === 2);
const holders = new Map<string, number>();
for (const s of src.data ?? [])
  for (const h of s.stationHolders ?? []) holders.set(h, (holders.get(h) ?? 0) + 1);
console.log(`Norska SensorSystem-stationer: ${src.data?.length ?? 0} (${stations.length} med koordinater)`);
console.log("Största stationshållarna:");
for (const [h, n] of [...holders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8))
  console.log(`  ${String(n).padStart(5)}  ${h}`);
const vegvesen = [...holders.entries()].filter(([h]) => /vegvesen/i.test(h));
console.log(vegvesen.length
  ? `➡ VEGVESEN FINNS I FROST: ${vegvesen.map(([h, n]) => `${h} (${n} st)`).join(", ")}`
  : "➡ Ingen stationshållare matchar 'vegvesen'.");

// 2. Active air_temperature series
const ts = await frost("/observations/availableTimeSeries/v0.jsonld?elements=air_temperature");
const activeIds = new Set<string>();
for (const t of ts.data ?? [])
  if (!t.validTo) activeIds.add(String(t.sourceId).split(":")[0]);
console.log(`\nAktiva air_temperature-serier: ${activeIds.size} stationer`);

// 2b. THE question run #1 raised: road_surface_temperature exists in the catalogue and
// Vegvesen holds 473 stations — how many actively report ROAD SURFACE temp via Frost?
// If many: Norway's VViS-equivalents are reachable today, without the DATEX account.
let roadIds = new Set<string>();
for (const elem of ["road_surface_temperature", encodeURIComponent("max(road_surface_temperature PT10M)")]) {
  try {
    const rts = await frost(`/observations/availableTimeSeries/v0.jsonld?elements=${elem}`);
    for (const t of rts.data ?? []) if (!t.validTo) roadIds.add(String(t.sourceId).split(":")[0]);
    if (roadIds.size) { console.log(`\nAktiva road_surface_temperature-serier (${decodeURIComponent(elem)}): ${roadIds.size} stationer`); break; }
  } catch (e) { console.log(`\n(${decodeURIComponent(elem)}: ${String((e as Error).message).slice(0, 120)})`); }
}
if (!roadIds.size) console.log("➡ Ingen aktiv road_surface_temperature-serie — yttemp kräver ändå Vegvesen/DATEX.");

// 3. Road/surface elements in the catalogue
const el = await frost("/elements/v0.jsonld");
const road = (el.data ?? []).filter((e: any) => /road|surface|ground/i.test(`${e.id} ${e.name ?? ""}`));
console.log(`\nElement som matchar road/surface/ground: ${road.length}`);
for (const e of road.slice(0, 15)) console.log(`  ${e.id}  —  ${e.name ?? ""}`);
if (road.length > 15) console.log(`  … och ${road.length - 15} till`);

// 4. Border corridors: active stations within 100 km of each crossing
const CORRIDORS: [string, [number, number]][] = [
  ["E8 Kilpisjärvi", [20.79, 69.05]], ["E10 Riksgränsen", [18.12, 68.43]], ["E14 Storlien", [12.09, 63.32]]];
const active = stations.filter((s: any) => activeIds.has(s.id));
console.log(`\nAktiva lufttemp-stationer nära gränsstråken (≤ 100 km):`);
let probe: any = null;
for (const [name, p] of CORRIDORS) {
  const near = active
    .map((s: any) => ({ s, km: havKm(p, s.geometry.coordinates) }))
    .filter((x: any) => x.km <= 100).sort((a: any, b: any) => a.km - b.km);
  console.log(`  ${name.padEnd(16)} ${String(near.length).padStart(3)} st — närmast: ${near[0] ? `${near[0].s.name} (${near[0].km.toFixed(0)} km)` : "ingen"}`);
  if (!probe && near[0]) probe = near[0].s;
}
if (roadIds.size) {
  const roadActive = stations.filter((s: any) => roadIds.has(s.id));
  console.log(`Aktiva YTTEMP-stationer nära gränsstråken (≤ 100 km):`);
  for (const [name, p] of CORRIDORS) {
    const near = roadActive
      .map((s: any) => ({ s, km: havKm(p, s.geometry.coordinates) }))
      .filter((x: any) => x.km <= 100).sort((a: any, b: any) => a.km - b.km);
    console.log(`  ${name.padEnd(16)} ${String(near.length).padStart(3)} st — närmast: ${near[0] ? `${near[0].s.name} (${near[0].km.toFixed(0)} km)` : "ingen"}`);
  }
}

// 5. Live probe: latest air temperature from the station nearest a corridor
if (probe) {
  const obs = await frost(`/observations/v0.jsonld?sources=${probe.id}&elements=air_temperature&referencetime=latest`);
  const o = obs.data?.[0];
  const v = o?.observations?.[0];
  console.log(`\nSKARPT DATAPROV — ${probe.name} (${probe.id}): ${v ? `${v.value} °C @ ${o.referenceTime}` : "INGET SVAR"}`);
  if (!v) { console.error("Dataprovet gav inget värde — rekognoseringen är inte bevisad."); process.exit(1); }
} else { console.error("Ingen aktiv station nära något stråk — inget dataprov möjligt."); process.exit(1); }
console.log("\nRekognoseringen bevisad: metadata + levande observation hämtade.");
