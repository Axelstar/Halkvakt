// Fältrekognoseringen (kort #47, Bengts order 4/9): vad ligger mer på golvet?
// Hämtar FULLA objekt (inget INCLUDE = allt) för varje TRV-objekttyp vi använder och
// skriver det rekursiva fältträdet med exempelvärden — jämförs sedan mot arkivschemat
// i docs/GOLVET.md. Motiv: tre golvfynd på fyra dygn (svensk daggpunkt, svensk vind,
// finsk KASTEPISTE). Run (CI): faltrekognosering.yml. TRAFIKVERKET_API_KEY krävs.

const KEY = process.env.TRAFIKVERKET_API_KEY;
async function main(): Promise<number> {
  if (!KEY) { console.error("TRAFIKVERKET_API_KEY not set"); return 1; }
  const TYPES: [string, string, string][] = [
    ["WeatherMeasurepoint", "2.1", ""],
    ["RoadCondition", "1.2", ""],
    ["Situation", "1.6", `<GT name="Deviation.CreationTime" value="$dateadd(-1.00:00:00)"/>`],
    ["Camera", "1", `<EQ name="Type" value="Väglagskamera"/>`],
    ["TrafficSafetyCamera", "1", ""],
  ];
  const tree = (o: any, prefix: string, out: string[], depth: number) => {
    if (depth > 6 || o === null || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        out.push(`${p}[]  (${v.length} st)`);
        if (v.length && typeof v[0] === "object") tree(v[0], p + "[]", out, depth + 1);
        else if (v.length) out.push(`${p}[] ex: ${JSON.stringify(v[0]).slice(0, 60)}`);
      } else if (v !== null && typeof v === "object") tree(v, p, out, depth + 1);
      else out.push(`${p} = ${JSON.stringify(v).slice(0, 70)}`);
    }
  };
  for (const [obj, schema, filter] of TYPES) {
    const q = `<REQUEST><LOGIN authenticationkey="${KEY}"/><QUERY objecttype="${obj}" schemaversion="${schema}" limit="2">${filter ? `<FILTER>${filter}</FILTER>` : ""}</QUERY></REQUEST>`;
    const r = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
      method: "POST", headers: { "Content-Type": "text/xml" }, body: q });
    const body = await r.text();
    if (!r.ok) { console.error(`${obj}: ${r.status}: ${body.slice(0, 300)}`); continue; }
    const rows = JSON.parse(body)?.RESPONSE?.RESULT?.[0]?.[obj] ?? [];
    console.log(`\n══════ ${obj} (schema ${schema}) — ${rows.length} exempelobjekt ══════`);
    if (!rows.length) { console.log("(inga objekt — filter/tomt)"); continue; }
    const out: string[] = [];
    tree(rows[0], "", out, 0);
    for (const line of out) console.log("  " + line);
  }
  return 0;
}
process.exitCode = await main();
