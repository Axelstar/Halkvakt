// LIVEMOTORNS PROV (kort #290, DECISIONS #449): skriv.ts mot en tillfällig PostGIS, med samma SQL som driften kör mot Supabase.
// Körs av .github/workflows/livemotorn.yml när livemotorn, dess tabeller eller situationspolicyn ändras:
//   TEST_DATABASE_URL=postgresql://… deno test --allow-env --allow-net --allow-read supabase/functions/ingest-live/
// Fallen är de som har gått fel eller nästan gått fel: en radering av en typ vi aldrig lagrat får inte skapa en rad (de 4 584
// gravstenarna 31/8), en omkörning får inte dubblera, en äldre mätning får inte skriva över nuläget.
import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
import { skrivSituationer, skrivVader, skrivVaglag } from "./skriv.ts";

const url = Deno.env.get("TEST_DATABASE_URL");

function lika(fick: unknown, vantat: unknown, vad: string) {
  if (JSON.stringify(fick) !== JSON.stringify(vantat)) throw new Error(`${vad}: väntade ${JSON.stringify(vantat)}, fick ${JSON.stringify(fick)}`);
}

Deno.test({ name: "livemotorns skrivningar mot PostGIS", ignore: !url, sanitizeOps: false, sanitizeResources: false, fn: async (t) => {
  const sql = postgres(url!, { max: 1, onnotice: () => {} });
  try {
    // Tabellerna som livemotorn skriver till, i den ordning den gamla ingesten migrerar dem (ingest/db.ts).
    for (const f of ["001_init.sql", "003_situation_archive.sql", "008_rain_sum.sql", "011_vind_sikt.sql"]) {
      await sql.unsafe(await Deno.readTextFile(new URL(`../../../sql/${f}`, import.meta.url)));
    }
    await sql`TRUNCATE deviations, situation_archive, road_conditions, weather_observations, weather_latest`;
    const antal = async (tabell: string) => Number((await sql.unsafe(`SELECT count(*)::int AS n FROM ${tabell}`))[0].n);

    await t.step("situationerna: olyckan lagras och arkiveras, omkörningen dubblerar inte, raderingen flaggar", async () => {
      const olycka = (meddelande: string) => ({ Id: "S1", ModifiedTime: "2026-10-03T10:00:00Z", Deviation: [{
        Id: "D1", MessageTypeValue: "Accident", MessageType: "Olycka", Message: meddelande, SeverityCode: 5, RoadNumber: "E4",
        CountyNo: [12], Geometry: { Point: { WGS84: "POINT (13.0 55.6)" } }, StartTime: "2026-10-03T09:55:00Z" }] });
      lika(await skrivSituationer(sql, [olycka("Olycka")]), 1, "första skrivningen");
      lika(await skrivSituationer(sql, [olycka("Olycka, två fordon")]), 1, "omkörningen");
      lika(await antal("deviations"), 1, "en olycka, en rad");
      lika(await antal("situation_archive"), 1, "en arkivrad");
      const [d] = await sql`SELECT message, road_number, ST_X(geom) AS lon, deleted FROM deviations WHERE deviation_id = 'D1'`;
      lika([d.message, d.road_number, Number(d.lon), d.deleted], ["Olycka, två fordon", "E4", 13, false], "raden efter omkörningen");
      await skrivSituationer(sql, [{ Id: "S1", Deleted: true, ModifiedTime: "2026-10-03T10:30:00Z", Deviation: [{ Id: "D1" }] }]);
      const [r] = await sql`SELECT deleted FROM deviations WHERE deviation_id = 'D1'`;
      lika(r.deleted, true, "raderingen flaggar raden");
    });

    await t.step("situationerna: en radering av en typ vi aldrig lagrat skapar ingen rad", async () => {
      const fore = await antal("deviations");
      await skrivSituationer(sql, [{ Id: "S9", Deleted: true, Deviation: [{ Id: "D9", MessageTypeValue: "MaintenanceWorks" }] }]);
      lika(await antal("deviations"), fore, "ingen gravsten");
    });

    await t.step("situationerna: vägarbete varken lagras eller arkiveras, ett stillastående fordon bara arkiveras, djuret lagras", async () => {
      const fore = [await antal("deviations"), await antal("situation_archive")];
      const en = (id: string, typ: string) => ({ Id: `S-${id}`, Deviation: [{ Id: id, MessageTypeValue: typ, Message: typ,
        Geometry: { Point: { WGS84: "POINT (14.0 56.0)" } } }] });
      await skrivSituationer(sql, [en("V1", "MaintenanceWorks"), en("V2", "VehicleObstruction"), en("V3", "AnimalPresenceObstruction")]);
      lika([await antal("deviations"), await antal("situation_archive")], [fore[0] + 1, fore[1] + 2], "en levande rad (djuret), två arkivrader");
      const [v] = await sql`SELECT count(*)::int AS n FROM deviations WHERE deviation_id IN ('V1', 'V2')`;
      lika(v.n, 0, "vägarbetet och fordonet ligger inte i den levande tabellen");
    });

    await t.step("väglaget: sträckan skrivs, uppdateras på plats och flaggas vid radering", async () => {
      const halt = (kod: number, raderad = false) => ({ Id: "R1", ConditionCode: kod, ConditionText: "Halt", ConditionInfo: ["Halka"],
        CountyNo: [12], RoadNumber: " 108 ", Geometry: { Line: { WGS84: "LINESTRING (13.0 55.6, 13.1 55.7)" } },
        ModifiedTime: "2026-10-03T10:00:00Z", Deleted: raderad });
      await skrivVaglag(sql, [halt(3)]);
      await skrivVaglag(sql, [halt(4)]);
      lika(await antal("road_conditions"), 1, "en sträcka, en rad");
      const [r] = await sql`SELECT condition_code, road_number, ST_NPoints(geom) AS punkter FROM road_conditions WHERE segment_id = 'R1'`;
      lika([r.condition_code, r.road_number, Number(r.punkter)], [4, "108", 2], "raden efter uppdateringen (vägnumret trimmat)");
      await skrivVaglag(sql, [halt(4, true)]);
      const [d] = await sql`SELECT deleted FROM road_conditions WHERE segment_id = 'R1'`;
      lika(d.deleted, true, "raderingen flaggar sträckan");
    });

    await t.step("vädret: kalla mätningar arkiveras, varma en gång per halvtimme, nuläget skrivs aldrig över av en äldre", async () => {
      const halvtimmen = Math.floor(Date.now() / 1_800_000) * 1_800_000;
      const tid = (min: number) => new Date(halvtimmen + min * 60_000 - 3_600_000).toISOString();   // en timme bak, inom 3 h
      const station = (id: string, t: string, yta: number) => ({ Id: id, Name: id, Geometry: { WGS84: "POINT (13.0 55.6)" },
        Observation: { Sample: t, Surface: { Temperature: { Value: yta } }, Air: { Temperature: { Value: yta + 1 } } } });
      // En mätning per station och anrop, som i driften (Trafikverket ger stationens senaste; nulägets upsert tål inte två).
      // Kall station: två mätningar i samma halvtimme ger två rader; samma mätning igen ger ingen ny.
      await skrivVader(sql, [station("K1", tid(1), 1.5)]);
      await skrivVader(sql, [station("K1", tid(11), 1.2)]);
      await skrivVader(sql, [station("K1", tid(11), 1.2)]);
      // Varm och torr station: två mätningar i samma halvtimme ger EN rad (arkivpolicyn, DECISIONS #353).
      const r1 = await skrivVader(sql, [station("V1", tid(2), 12.0)]);
      const r2 = await skrivVader(sql, [station("V1", tid(12), 12.4)]);
      lika([r1.arkivpolicy, r2.arkivpolicy], ["1 varma halvtimmesrader", "0 varma halvtimmesrader"], "svarets rad om arkivpolicyn");
      const rader = await sql`SELECT station_id, count(*)::int AS n FROM weather_observations GROUP BY station_id ORDER BY station_id`;
      lika(rader.map((x) => [x.station_id, Number(x.n)]), [["K1", 2], ["V1", 1]], "arkivraderna per station");
      // Nuläget följer den senaste mätningen; en äldre som kommer sent skriver inte över.
      await skrivVader(sql, [station("K1", tid(5), -3.0)]);
      const [l] = await sql`SELECT surface_temp_c FROM weather_latest WHERE station_id = 'K1'`;
      lika(Number(l.surface_temp_c), 1.2, "nuläget är den senaste mätningen, inte den sena äldre");
    });
  } finally {
    await sql.end();
  }
} });
