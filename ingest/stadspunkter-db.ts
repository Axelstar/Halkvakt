// STORSTÄDERNAS PUNKTER I DRIFTEN — laddaren (DECISIONS #804, kort #378; sql/089). Läser kuvösens punktlista genom överlägget och
// håller tabellen stadspunkt lika med den: nya och ändrade punkter skrivs, punkter som inte längre står i listan tas bort, allt i en
// transaktion. Laddaren rör aldrig vagpunkt och aldrig brytarna (stadsbrytare). Loggen säger bara klart eller fel (DECISIONS #768:
// punkterna är kuvösens; inga antal eller lägen här).
//   node --experimental-strip-types ingest/stadspunkter-db.ts ladda [kuvos/stadspunkter-drift-2026-27.json]
//   node --experimental-strip-types ingest/stadspunkter-db.ts --sjalvtest
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { delar } from "./kandidat-db.ts";

export const LISTA = fileURLToPath(new URL("../kuvos/stadspunkter-drift-2026-27.json", import.meta.url));
/** Områdena och lagren som har en brytare i sql/089. En punkt utanför dem vägras: den hade aldrig kunnat slås på. */
export const BRYTARE = new Set(["Stor-Stockholm/B", "Stor-Göteborg/B", "Stor-Malmö/B", "Stor-Stockholm/C"]);

export type Stadspunkt = { punkt: string; grupp: string; lager: "B" | "C"; omrade: string; lon: number; lat: number };

/** Listans rader, prövade: id och grupp börjar med lagret (aldrig ett v-id, som driftens vägpunkter bär), området har en brytare,
 *  läget ligger i Sverige, och inget id står två gånger. Kastar vid första felet. */
export function rader(lista: { rader?: unknown }): Stadspunkt[] {
  if (!Array.isArray(lista.rader) || !lista.rader.length) throw new Error("listan saknar rader");
  const sedda = new Set<string>();
  return lista.rader.map((x: any, i) => {
    const p = { punkt: String(x?.punkt), grupp: String(x?.grupp), lager: x?.lager, omrade: String(x?.omrade), lon: Number(x?.lon), lat: Number(x?.lat) };
    const fel = (v: string) => { throw new Error(`rad ${i + 1}: ${v}`); };
    if (p.lager !== "B" && p.lager !== "C") fel("okänt lager");
    if (!new RegExp(`^${p.lager}\\d{5}$`).test(p.punkt)) fel("id:t börjar inte med lagret");
    if (!p.grupp.startsWith(`${p.lager}-`)) fel("gruppen börjar inte med lagret");
    if (!BRYTARE.has(`${p.omrade}/${p.lager}`)) fel("området och lagret har ingen brytare");
    if (!(p.lon > 10 && p.lon < 25 && p.lat > 55 && p.lat < 70)) fel("läget ligger inte i Sverige");
    if (sedda.has(p.punkt)) fel("id:t står två gånger");
    sedda.add(p.punkt);
    return p as Stadspunkt;
  });
}

export const SATS = {
  skriv: `INSERT INTO stadspunkt (punkt, grupp, lager, omrade, lon, lat)
    SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::float8[], $6::float8[])
    ON CONFLICT (punkt) DO UPDATE SET grupp = EXCLUDED.grupp, lager = EXCLUDED.lager, omrade = EXCLUDED.omrade, lon = EXCLUDED.lon, lat = EXCLUDED.lat
    WHERE (stadspunkt.grupp, stadspunkt.lager, stadspunkt.omrade, stadspunkt.lon, stadspunkt.lat)
      IS DISTINCT FROM (EXCLUDED.grupp, EXCLUDED.lager, EXCLUDED.omrade, EXCLUDED.lon, EXCLUDED.lat)`,
  ta_bort: `DELETE FROM stadspunkt WHERE NOT (punkt = ANY($1::text[]))`,
};

async function ladda(fil: string) {
  const r = rader(JSON.parse(readFileSync(fil, "utf8")));
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL saknas");
  const pg = (await import("pg")).default;
  const pool = new pg.Pool({ connectionString: url, max: 1, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const d of delar(r, 5000))
      await c.query(SATS.skriv, [d.map((x) => x.punkt), d.map((x) => x.grupp), d.map((x) => x.lager), d.map((x) => x.omrade),
        d.map((x) => x.lon), d.map((x) => x.lat)]);
    await c.query(SATS.ta_bort, [r.map((x) => x.punkt)]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
  console.log("stadspunkterna: klart");
}

function sjalvtest(): number {
  const fel: string[] = [];
  const bra = { punkt: "B00001", grupp: "B-1-2", lager: "B", omrade: "Stor-Stockholm", lon: 18.0, lat: 59.3 };
  try {
    const r = rader({ rader: [bra, { ...bra, punkt: "C00001", grupp: "C-1-2", lager: "C" }] });
    if (r.length !== 2 || r[1].lager !== "C") fel.push("två riktiga punkter");
  } catch (e) { fel.push(`två riktiga punkter föll: ${(e as Error).message}`); }
  for (const [namn, x] of [["v-id", { ...bra, punkt: "v00001" }], ["fel lager i id:t", { ...bra, punkt: "C00001" }],
    ["gruppen utan lagret", { ...bra, grupp: "12345" }], ["C i Göteborg (ingen brytare)", { ...bra, punkt: "C00002", grupp: "C-1", lager: "C", omrade: "Stor-Göteborg" }],
    ["läget i havet", { ...bra, lat: 0 }], ["okänt lager", { ...bra, lager: "A" }]] as const) {
    try { rader({ rader: [x] }); fel.push(`släppte igenom: ${namn}`); } catch { /* väntat */ }
  }
  try { rader({ rader: [bra, bra] }); fel.push("släppte igenom: dubblett"); } catch { /* väntat */ }
  try { rader({ rader: [] }); fel.push("släppte igenom: tom lista"); } catch { /* väntat */ }
  if (!SATS.skriv.includes("ON CONFLICT (punkt)") || !SATS.ta_bort.startsWith("DELETE FROM stadspunkt") || /vagpunkt|stadsbrytare/.test(SATS.skriv + SATS.ta_bort))
    fel.push("satserna rör annat än stadspunkt");
  console.log(`självtest stadspunkter-db: ${fel.length ? "FEL" : "klart"}`);
  for (const f of fel) console.log(`  ${f}`);
  return fel.length ? 1 : 0;
}

// Bara när filen körs, inte när integrationsprovet importerar satserna.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [kmd, fil] = process.argv.slice(2);
  if (kmd === "--sjalvtest") process.exit(sjalvtest());
  else if (kmd === "ladda") ladda(fil ?? LISTA).catch((e) => { console.error(`stadspunkter-db: ${String(e?.message ?? e).slice(0, 200)}`); process.exit(1); });
  else { console.error("ladda [fil] eller --sjalvtest"); process.exit(2); }
}
