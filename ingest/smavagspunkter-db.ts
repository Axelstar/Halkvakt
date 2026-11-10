// SMÅVÄGSRÖSTEN — laddaren (DECISIONS #828, kort #647; sql/103). Läser kuvösens punktfil genom överlägget och håller tabellen
// smavagspunkt lika med den: nya och ändrade punkter skrivs, punkter som inte längre står i filen tas bort, allt i en transaktion.
// Laddaren rör aldrig vagpunkt, stadspunkt eller brytarna (smavagsbrytare). Loggen säger bara klart eller fel (DECISIONS #768:
// punkterna är kuvösens; inga antal eller lägen här).
//   node --experimental-strip-types ingest/smavagspunkter-db.ts ladda [data/vagdata/smavagsrosten-punkter.json]
//   node --experimental-strip-types ingest/smavagspunkter-db.ts --sjalvtest
import { readFileSync } from "node:fs";
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

export const SATS = {
  skriv: `INSERT INTO smavagspunkt (punkt, grupp, vag, ordning, lon, lat)
    SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::int[], $5::float8[], $6::float8[])
    ON CONFLICT (punkt) DO UPDATE SET grupp = EXCLUDED.grupp, vag = EXCLUDED.vag, ordning = EXCLUDED.ordning, lon = EXCLUDED.lon, lat = EXCLUDED.lat
    WHERE (smavagspunkt.grupp, smavagspunkt.vag, smavagspunkt.ordning, smavagspunkt.lon, smavagspunkt.lat)
      IS DISTINCT FROM (EXCLUDED.grupp, EXCLUDED.vag, EXCLUDED.ordning, EXCLUDED.lon, EXCLUDED.lat)`,
  // En anti-join, inte NOT (punkt = ANY($1)): med omkring 90 000 punkter hade den jämfört varje rad med hela listan.
  ta_bort: `DELETE FROM smavagspunkt s WHERE NOT EXISTS (SELECT 1 FROM unnest($1::text[]) AS l(punkt) WHERE l.punkt = s.punkt)`,
};

export const kolumner = (d: Smavagspunkt[]) =>
  [d.map((x) => x.punkt), d.map((x) => x.grupp), d.map((x) => x.vag), d.map((x) => x.ordning), d.map((x) => x.lon), d.map((x) => x.lat)];

async function ladda(fil: string) {
  const r = rader(JSON.parse(readFileSync(fil, "utf8")));
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const d of delar(r)) await c.query(SATS.skriv, kolumner(d));
    await c.query(SATS.ta_bort, [r.map((x) => x.punkt)]);
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
