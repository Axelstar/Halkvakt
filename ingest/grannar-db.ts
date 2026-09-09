// Grannländernas skrivare, BATCHADE (kort #85, DECISIONS #88). fi.ts/no.ts/dk.ts skrev en
// INSERT per station och tabell: FI 526 × 2 och NO 468 × 2 nätverksvarv mot poolern ⇒ 2 min 51 s
// + 2 min 25 s per körning (ingest-grannar #10, 9/9). Samma mönster som ingest/db.ts: ett
// UNNEST-satsblock per ~500 rader. SQL:en är ordagrant den gamla, bara formen är ny —
// samma kolumner, samma ON CONFLICT, samma transaktion (anroparen äger BEGIN/COMMIT).
import type pg from "pg";

const CHUNK = 500;
function* chunks<T>(arr: T[]): Generator<T[]> {
  for (let i = 0; i < arr.length; i += CHUNK) yield arr.slice(i, i + CHUNK);
}
const col = <T, K>(rows: T[], f: (r: T) => K): K[] => rows.map(f);
type Client = Pick<pg.PoolClient, "query">;

// ---------- Finland ----------
export type FiRow = {
  id: string; name: string; lon: number; lat: number; t: string;
  surface: number | null; air: number | null; dewpoint: number | null; keli: string | null;
  rain: boolean; snow: boolean;
  frost: number | null; fryspkt: number | null; salt: number | null; vind: number | null; byvind: number | null;
  vindr: number | null; sikt: number | null; form: number | null; ytstatus: number | null;
};
const FI_COLS = `station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, precipitation, rain, snow,
  frost_point_c, freeze_point_c, salt_gm2, wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m, precip_form, surface_state`;
const FI_SELECT = `SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time, u.surface_temp_c, u.air_temp_c,
    u.dewpoint_c, u.precipitation, u.rain, u.snow, u.frost_point_c, u.freeze_point_c, u.salt_gm2, u.wind_speed_ms, u.wind_gust_ms,
    u.wind_dir_deg, u.visibility_m, u.precip_form, u.surface_state
  FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],$7::numeric[],$8::numeric[],$9::text[],
              $10::bool[],$11::bool[],$12::numeric[],$13::numeric[],$14::numeric[],$15::numeric[],$16::numeric[],$17::numeric[],
              $18::numeric[],$19::numeric[],$20::numeric[])
    AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, dewpoint_c, precipitation, rain, snow,
         frost_point_c, freeze_point_c, salt_gm2, wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m, precip_form, surface_state)`;
const fiArgs = (c: FiRow[]) => [col(c, x => x.id), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.t),
  col(c, x => x.surface), col(c, x => x.air), col(c, x => x.dewpoint), col(c, x => x.keli), col(c, x => x.rain), col(c, x => x.snow),
  col(c, x => x.frost), col(c, x => x.fryspkt), col(c, x => x.salt), col(c, x => x.vind), col(c, x => x.byvind), col(c, x => x.vindr),
  col(c, x => x.sikt), col(c, x => x.form), col(c, x => x.ytstatus)];

export async function writeFi(client: Client, latest: FiRow[], archive: FiRow[]): Promise<void> {
  for (const c of chunks(latest)) {
    await client.query(`INSERT INTO fi.weather_latest (${FI_COLS}) ${FI_SELECT}
      ON CONFLICT (station_id) DO UPDATE SET sample_time=EXCLUDED.sample_time, surface_temp_c=EXCLUDED.surface_temp_c,
        air_temp_c=EXCLUDED.air_temp_c, dewpoint_c=EXCLUDED.dewpoint_c, precipitation=EXCLUDED.precipitation, rain=EXCLUDED.rain, snow=EXCLUDED.snow,
        frost_point_c=EXCLUDED.frost_point_c, freeze_point_c=EXCLUDED.freeze_point_c, salt_gm2=EXCLUDED.salt_gm2,
        wind_speed_ms=EXCLUDED.wind_speed_ms, wind_gust_ms=EXCLUDED.wind_gust_ms, wind_dir_deg=EXCLUDED.wind_dir_deg,
        visibility_m=EXCLUDED.visibility_m, precip_form=EXCLUDED.precip_form, surface_state=EXCLUDED.surface_state`, fiArgs(c));
  }
  for (const c of chunks(archive)) {
    await client.query(`INSERT INTO fi.weather_observations (${FI_COLS}) ${FI_SELECT} ON CONFLICT DO NOTHING`, fiArgs(c));
  }
}

// ---------- Norge ----------
export type NoRow = {
  id: string; name: string; lon: number; lat: number; t: string;
  surface: number | null; air: number | null; dewpoint: number | null; humidity: number | null;
  precipitation: string | null; rain: boolean; snow: boolean;
};
const NO_COLS = `station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow`;
const NO_SELECT = `SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time, u.surface_temp_c, u.air_temp_c,
    u.dewpoint_c, u.humidity_pct, u.precipitation, u.rain, u.snow
  FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],$7::numeric[],$8::numeric[],$9::numeric[],
              $10::text[],$11::bool[],$12::bool[])
    AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct, precipitation, rain, snow)`;
const noArgs = (c: NoRow[]) => [col(c, x => x.id), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.t),
  col(c, x => x.surface), col(c, x => x.air), col(c, x => x.dewpoint), col(c, x => x.humidity), col(c, x => x.precipitation),
  col(c, x => x.rain), col(c, x => x.snow)];

export async function writeNo(client: Client, latest: NoRow[], archive: NoRow[]): Promise<void> {
  for (const c of chunks(latest)) {
    await client.query(`INSERT INTO no.weather_latest (${NO_COLS}) ${NO_SELECT}
      ON CONFLICT (station_id) DO UPDATE SET name=EXCLUDED.name, geom=EXCLUDED.geom, sample_time=EXCLUDED.sample_time,
        surface_temp_c=EXCLUDED.surface_temp_c, air_temp_c=EXCLUDED.air_temp_c, dewpoint_c=EXCLUDED.dewpoint_c,
        humidity_pct=EXCLUDED.humidity_pct, precipitation=EXCLUDED.precipitation, rain=EXCLUDED.rain, snow=EXCLUDED.snow`, noArgs(c));
  }
  for (const c of chunks(archive)) {
    await client.query(`INSERT INTO no.weather_observations (${NO_COLS}) ${NO_SELECT} ON CONFLICT DO NOTHING`, noArgs(c));
  }
}

// ---------- Danmark ----------
// precipitation = 'grass': frysrisken är DMI:s grästemperatur, inte vägyta (DECISIONS #45).
export type DkRow = {
  id: string; name: string; lon: number; lat: number; t: string;
  surface: number; air: number | null; dewpoint: number | null; rain: boolean; snow: boolean;
};
const DK_UNNEST = `FROM UNNEST($1::text[],$2::text[],$3::float8[],$4::float8[],$5::timestamptz[],$6::numeric[],$7::numeric[],$8::numeric[],
              $9::bool[],$10::bool[])
    AS u(station_id, name, lon, lat, sample_time, surface_temp_c, air_temp_c, dewpoint_c, rain, snow)`;
const dkArgs = (c: DkRow[]) => [col(c, x => x.id), col(c, x => x.name), col(c, x => x.lon), col(c, x => x.lat), col(c, x => x.t),
  col(c, x => x.surface), col(c, x => x.air), col(c, x => x.dewpoint), col(c, x => x.rain), col(c, x => x.snow)];

export async function writeDk(client: Client, latest: DkRow[], archive: DkRow[]): Promise<void> {
  for (const c of chunks(latest)) {
    await client.query(`INSERT INTO dk.weather_latest (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, precipitation, rain, snow)
      SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time, u.surface_temp_c, u.air_temp_c, 'grass', u.rain, u.snow
      ${DK_UNNEST}
      ON CONFLICT (station_id) DO UPDATE SET sample_time=EXCLUDED.sample_time, surface_temp_c=EXCLUDED.surface_temp_c,
        air_temp_c=EXCLUDED.air_temp_c, rain=EXCLUDED.rain, snow=EXCLUDED.snow`, dkArgs(c));
  }
  for (const c of chunks(archive)) {
    await client.query(`INSERT INTO dk.weather_observations (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, precipitation, rain, snow)
      SELECT u.station_id, u.name, ST_SetSRID(ST_MakePoint(u.lon, u.lat), 4326), u.sample_time, u.surface_temp_c, u.air_temp_c, u.dewpoint_c, 'grass', u.rain, u.snow
      ${DK_UNNEST} ON CONFLICT DO NOTHING`, dkArgs(c));
  }
}
