// SMÅVÄGSRÖSTEN — laddaren (DECISIONS #828, kort #647; sql/103). Läser kuvösens punktfil genom överlägget och håller tabellen
// smavagspunkt lika med den: nya och ändrade punkter skrivs, punkter som inte längre står i filen tas bort, allt i en transaktion.
// Laddaren rör aldrig vagpunkt, stadspunkt eller brytarna (smavagsbrytare). Loggen säger bara klart eller fel (DECISIONS #768:
// punkterna är kuvösens; inga antal eller lägen här).
// PUNKTFILEN (byggsteg 5b, sql/106): i samma transaktion skrivs appens punktfil, punkternas lägen i ordningen punkt COLLATE "C", till
// smavag_punktfil när den ändrats. Publiceringen laddar upp den, och bitarna i live.json följer samma ordning.
//   node --experimental-strip-types ingest/smavagspunkter-db.ts ladda [data/vagdata/smavagsrosten-punkter.json]
//   node --experimental-strip-types ingest/smavagspunkter-db.ts --sjalvtest
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";
import { delar } from "./kandidat-db.ts";

export const LISTA = fileURLToPath(new URL("../data/vagdata/smavagsrosten-punkter.json", import.meta.url));

export type Smavagspunkt = { punkt: string; grupp: "P1" | "N"; vag: string; ordning: number; lon: number; lat: number };

/** Filens rader, prövade: id:t är kuvösens r-id (aldrig ett v-id, som driftens vägpunkter bär, eller ett B/C-id, som stadspunkterna),
 *  gruppen är P1 eller N, väg och ordning finns och står bara en gång, läget ligger i Sverige, och inget id står två gånger.
 *  Kastar vid första felet. */
export function rader(lista: { rader?: unknown }): Smavagspunkt[] {
  if (!Array.isArray(lista.rader) || !lista.rader.length) throw new Error("listan saknar rader");
  const sedda = new Set<string>(), platser = new Set<string>();
  return lista.rader.map((x: any, i) => {
    const p = { punkt: String(x?.id), grupp: x?.population, vag: String(x?.vag), ordning: x?.ordning, lon: Number(x?.lon), lat: Number(x?.lat) };
    const fel = (v: string) => { throw new Error(`rad ${i + 1}: ${v}`); };
    if (!/^r\d{5,}$/.test(p.punkt)) fel("id:t är inget r-id");
    if (p.grupp !== "P1" && p.grupp !== "N") fel("okänd grupp");
    if (!/^v\d{5,}$/.test(p.vag)) fel("vägen är inget v-id");
    if (!Number.isInteger(p.ordning) || p.ordning < 0) fel("ordningen är inget heltal från 0");
    if (!(p.lon > 10 && p.lon < 25 && p.lat > 55 && p.lat < 70)) fel("läget ligger inte i Sverige");
    if (sedda.has(p.punkt)) fel("id:t står två gånger");
    if (platser.has(`${p.vag}/${p.ordning}`)) fel("vägen och ordningen står två gånger");
    sedda.add(p.punkt); platser.add(`${p.vag}/${p.ordning}`);
    return p as Smavagspunkt;
  });
}

/** Vägarnas ändar (DECISIONS #847): kuvösens "andar", två hjälppunkter per väg 200 m in från korsningarna, som ger vägtestet en linje
 *  också på en väg med en enda punkt. Prövade som raderna: ett v-id, två lägen om två tal i Sverige. Saknas nyckeln blir det inga ändar
 *  (en äldre punktfil); ett fel kastar. */
export function andar(lista: { andar?: unknown }): Map<string, [[number, number], [number, number]]> {
  const ut = new Map<string, [[number, number], [number, number]]>();
  if (lista.andar === undefined) return ut;
  if (!lista.andar || typeof lista.andar !== "object" || Array.isArray(lista.andar)) throw new Error("andar är inget objekt");
  for (const [vag, x] of Object.entries(lista.andar as Record<string, unknown>)) {
    const fel = (v: string) => { throw new Error(`ändarna för ${vag}: ${v}`); };
    if (!/^v\d{5,}$/.test(vag)) fel("vägen är inget v-id");
    if (!Array.isArray(x) || x.length !== 2) fel("inte två ändar");
    const par = (x as unknown[]).map((q) => (Array.isArray(q) && q.length === 2 ? [Number(q[0]), Number(q[1])] : [NaN, NaN]));
    for (const [lon, lat] of par) if (!(lon > 10 && lon < 25 && lat > 55 && lat < 70)) fel("läget ligger inte i Sverige");
    ut.set(vag, par as [[number, number], [number, number]]);
  }
  return ut;
}

export const SATS = {
  skriv: `INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat)
    SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::int[], $5::float8[], $6::float8[])
    ON CONFLICT (punkt) DO UPDATE SET grupp = EXCLUDED.grupp, vag = EXCLUDED.vag, ordning = EXCLUDED.ordning, lon = EXCLUDED.lon, lat = EXCLUDED.lat
    WHERE (smavagspunkt.grupp, smavagspunkt.vag, smavagspunkt.ordning, smavagspunkt.lon, smavagspunkt.lat)
      IS DISTINCT FROM (EXCLUDED.grupp, EXCLUDED.vag, EXCLUDED.ordning, EXCLUDED.lon, EXCLUDED.lat)`,
  // En anti-join, inte NOT (punkt = ANY($1)): med omkring 90 000 punkter hade den jämfört varje rad med hela listan.
  ta_bort: `DELETE FROM smavagspunkt s WHERE NOT EXISTS (SELECT 1 FROM unnest($1::text[]) AS l(punkt) WHERE l.punkt = s.punkt)`,
  // Punktfilen (sql/106): ordningen är bitarnas i live.json (publish/snapshot-core.ts). En ny fil nollar vad hinken och kartrepot bär.
  finnsPunktfil: `SELECT to_regclass('public.smavag_punktfil') IS NOT NULL AS ja`,
  punktfilRader: `SELECT punkt, vag, ordning, lon, lat FROM smavagspunkt ORDER BY punkt COLLATE "C"`,
  punktfil: `INSERT INTO smavag_punktfil (id, sha256, punkter, bytes, gz_bytes, json, skriven_at) VALUES (1, $1, $2, $3, $4, $5, now())
    ON CONFLICT (id) DO UPDATE SET sha256 = EXCLUDED.sha256, punkter = EXCLUDED.punkter, bytes = EXCLUDED.bytes, gz_bytes = EXCLUDED.gz_bytes,
      json = EXCLUDED.json, skriven_at = now(), i_hinken = NULL, i_github = NULL
    WHERE smavag_punktfil.sha256 IS DISTINCT FROM EXCLUDED.sha256`,
};

/** Appens punktfil: lägena med fem decimaler i den givna ordningen, och filens sha256, storlek och packade storlek. Schema 2 (byggsteg 7,
 *  DECISIONS #844, #846): för varje punkt också vägens nummer (v00001 → 1) och platsen längs vägen, i två listor bredvid lägena, så att
 *  appen kan lägga vägens punkter i ordning (engine/src/smavagfil.ts). Bitarnas ordning är densamma som i schema 1. Med ändarna (#847):
 *  "andar" per vägnummer, [lon, lat, lon, lat] för vägens början och slut, bara för vägar som har punkter i filen. */
export function punktfil(rader: { lon: number; lat: number; vag: string; ordning: number }[],
                         andarna: Map<string, [[number, number], [number, number]]> = new Map()) {
  const r5 = (x: number) => Math.round(Number(x) * 1e5) / 1e5;
  const vag = rader.map((p) => {
    const m = /^v(\d+)$/.exec(p.vag);
    if (!m) throw new Error(`punktfilen: vägen ${p.vag} har inte formen v + siffror`);
    return Number(m[1]);
  });
  const mina = [...new Set(rader.map((p) => p.vag))].filter((v) => andarna.has(v)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const ande = Object.fromEntries(mina.map((v) => { const [a, b] = andarna.get(v)!; return [String(Number(v.slice(1))), [r5(a[0]), r5(a[1]), r5(b[0]), r5(b[1])]]; }));
  const json = JSON.stringify({ schema: 2, punkter: rader.map((p) => [r5(p.lon), r5(p.lat)]), vag, ordning: rader.map((p) => Number(p.ordning)),
    ...(mina.length ? { andar: ande } : {}) });
  const b = Buffer.from(json, "utf8");
  return { json, sha256: createHash("sha256").update(b).digest("hex"), punkter: rader.length, bytes: b.byteLength, gz_bytes: gzipSync(b).byteLength };
}

export const kolumner = (d: Smavagspunkt[]) =>
  [d.map((x) => x.punkt), d.map((x) => x.grupp), d.map((x) => x.vag), d.map((x) => x.ordning), d.map((x) => x.lon), d.map((x) => x.lat)];

async function ladda(fil: string) {
  const lista = JSON.parse(readFileSync(fil, "utf8"));
  const r = rader(lista), a = andar(lista);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const d of delar(r)) await c.query(SATS.skriv, kolumner(d));
    await c.query(SATS.ta_bort, [r.map((x) => x.punkt)]);
    // Före sql/106 finns ingen punktfil att skriva; punkterna laddas ändå.
    if ((await c.query(SATS.finnsPunktfil)).rows[0]?.ja) {
      const f = punktfil((await c.query(SATS.punktfilRader)).rows, a);
      await c.query(SATS.punktfil, [f.sha256, f.punkter, f.bytes, f.gz_bytes, f.json]);
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
  console.log("småvägspunkterna: klart");
}

function sjalvtest(): number {
  const fel: string[] = [];
  const bra = { id: "r00001", population: "P1", lon: 15.0, lat: 60.0, kommun: "Prov", vag: "v00001", ordning: 0 };
  try {
    const r = rader({ rader: [bra, { ...bra, id: "r00002", population: "N", ordning: 1 }] });
    if (r.length !== 2 || r[1].grupp !== "N" || r[1].ordning !== 1 || r[0].punkt !== "r00001") fel.push("två riktiga punkter");
  } catch (e) { fel.push(`två riktiga punkter föll: ${(e as Error).message}`); }
  for (const [namn, x] of [["v-id", { ...bra, id: "v00001" }], ["B-id", { ...bra, id: "B00001" }], ["okänd grupp", { ...bra, population: "P3" }],
    ["vägen utan v-id", { ...bra, vag: "00001" }], ["ordningen negativ", { ...bra, ordning: -1 }], ["ordningen ett bråktal", { ...bra, ordning: 0.5 }],
    ["ordningen saknas", { ...bra, ordning: undefined }], ["läget i havet", { ...bra, lat: 0 }]] as const) {
    try { rader({ rader: [x] }); fel.push(`släppte igenom: ${namn}`); } catch { /* väntat */ }
  }
  try { rader({ rader: [bra, bra] }); fel.push("släppte igenom: dubblett"); } catch { /* väntat */ }
  try { rader({ rader: [bra, { ...bra, id: "r00002" }] }); fel.push("släppte igenom: samma väg och ordning två gånger"); } catch { /* väntat */ }
  try { rader({ rader: [] }); fel.push("släppte igenom: tom lista"); } catch { /* väntat */ }
  const satser = SATS.skriv + SATS.ta_bort;
  if (!SATS.skriv.includes("ON CONFLICT (punkt)") || !SATS.ta_bort.startsWith("DELETE FROM smavagspunkt") || /vagpunkt\b|stadspunkt|brytare/.test(satser.replace(/smavagspunkt/g, "")))
    fel.push("satserna rör annat än smavagspunkt");
  if (/= ANY\(/.test(SATS.ta_bort)) fel.push("ta_bort jämför varje rad med hela listan");
  const f = punktfil([{ lon: 15.123456, lat: 60.000004, vag: "v00012", ordning: 3 }, { lon: 16, lat: 61.5, vag: "v00001", ordning: 0 }]);
  if (f.json !== '{"schema":2,"punkter":[[15.12346,60],[16,61.5]],"vag":[12,1],"ordning":[3,0]}' || f.punkter !== 2 || !/^[0-9a-f]{64}$/.test(f.sha256)
    || f.bytes !== f.json.length) fel.push(`punktfilen: ${f.json}`);
  if (punktfil([{ lon: 16, lat: 61.5, vag: "v00001", ordning: 0 }, { lon: 15.123456, lat: 60.000004, vag: "v00012", ordning: 3 }]).sha256 === f.sha256)
    fel.push("punktfilens sha bär inte ordningen");
  try { punktfil([{ lon: 16, lat: 61.5, vag: "00001", ordning: 0 }]); fel.push("punktfilen släppte igenom en väg utan v"); } catch { /* väntat */ }
  if (!SATS.punktfilRader.includes("vag, ordning")) fel.push("punktfilens rader saknar väg och ordning");
  // Ändarna (#847): bara för vägar med punkter i filen, i vägnummerordning; trasiga ändar kastar; utan nyckeln inga ändar.
  const a = andar({ andar: { v00012: [[15.1, 60.0], [15.2, 60.1]], v00001: [[16.0, 61.4], [16.1, 61.6]], v00099: [[17, 62], [17.1, 62.1]] } });
  const fa = punktfil([{ lon: 15.123456, lat: 60.000004, vag: "v00012", ordning: 3 }, { lon: 16, lat: 61.5, vag: "v00001", ordning: 0 }], a);
  if (fa.json !== '{"schema":2,"punkter":[[15.12346,60],[16,61.5]],"vag":[12,1],"ordning":[3,0],"andar":{"1":[16,61.4,16.1,61.6],"12":[15.1,60,15.2,60.1]}}')
    fel.push(`punktfilen med ändarna: ${fa.json}`);
  if (andar({}).size !== 0) fel.push("utan nyckeln ska det inte bli några ändar");
  for (const [namn, x] of [["en ände", { v00001: [[16, 61]] }], ["läget i havet", { v00001: [[16, 61], [0, 0]] }], ["fel id", { r00001: [[16, 61], [16, 61.1]] }],
    ["en lista", [[16, 61]]]] as const) {
    try { andar({ andar: x }); fel.push(`ändarna släppte igenom: ${namn}`); } catch { /* väntat */ }
  }
  if (!SATS.punktfilRader.includes('ORDER BY punkt COLLATE "C"') || !SATS.punktfil.includes("i_hinken = NULL")) fel.push("punktfilens ordning eller nollningen");
  console.log(`självtest smavagspunkter-db: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

// Bara när filen körs, inte när integrationsprovet importerar satserna.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, fil] = process.argv.slice(2);
  if (kmd === "--sjalvtest") process.exit(sjalvtest());
  else if (kmd === "ladda") ladda(fil ?? LISTA).catch((e) => { console.error(`smavagspunkter-db: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); });
  else { console.error("ladda [fil] eller --sjalvtest"); process.exit(2); }
}
