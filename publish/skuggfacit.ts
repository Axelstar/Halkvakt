// Skuggfacit — händelselistan som grind S-B (publish/grind-s-b.ts, DECISIONS #327) och tystnadsfelet
// (publish/tystnadsfelet.ts, kort #98, DECISIONS #330) delar. Två mått som räknar på OLIKA listor över samma vinter
// vore två sanningar; därför bor listan här, en gång.
//
// VAD EN FACITHÄNDELSE ÄR (TROSKLAR-SKUGGAN §2, TROSKLAR-TYSTNADSFEL §8): halka bekräftad av någon av källorna,
// inom facitradien av skuggrutterna — SMHI:s isvarningar, halka i situation_archive, operatörens väglag kod ≥ 2,
// förarens "stämde" (driver_facit), Bengts kamerafacit (is/snö/slask). Varje händelse orsaksklassas mot nederbörd
// vid närmaste station inom ±1 h och NEDERBORD_KM (nollpolitik: ingen station ⇒ null).
//
// Rutterna läses ur skuggmotorns källa, aldrig ur en kopia — ändras flottan följer båda måtten med.
import { readFileSync } from "node:fs";
import { UPPMATT_KM, MAX_KM } from "../engine/src/segment.ts";

export type Rutter = Record<string, [number, number][]>;
export type Handelse = { id: string; t: Date; lon: number; lat: number; kalla: string; nederbord: boolean | null };
export type Fraga = (sql: string, params: unknown[]) => Promise<any[]>;

export const FACIT_KM = UPPMATT_KM;      // §2: händelse matchas till segment inom 2 km — samma tal som "uppmätt"
export const NEDERBORD_FONSTER_H = 1;    // §2 orsaksklassning: nederbörd inom ±1 h
/** Längst bort en station får ursäkta en miss med nederbörd — prognosens grannradie: bortom den är en station väder, inte
 *  underlag (kort #254 g, DECISIONS #365). Skärpning: utan station inom radien är orsaken okänd, och en okänd orsak bokförs
 *  som förut på utstrålningen (B2), aldrig som en ursäkt. */
export const NEDERBORD_KM = MAX_KM;

/** §2: "närmaste stations regn/snö-flagga inom ±1 h" — den NÄRMASTE STATIONEN, inte de åtta närmaste raderna. Förut valdes åtta
 *  rader utan avståndsgräns, så en station med glesa rader kunde överröstas av en längre bort (kort #254 g). null när ingen
 *  station inom NEDERBORD_KM har en rad i fönstret. */
export async function nederbordVid(fraga: Fraga, t: Date | string, lon: number, lat: number): Promise<boolean | null> {
  const n = await fraga(`
    SELECT bool_or(rain OR snow) AS ned FROM (
      SELECT rain, snow FROM weather_observations
      WHERE sample_time BETWEEN $1::timestamptz - interval '${NEDERBORD_FONSTER_H} hours' AND $1::timestamptz + interval '${NEDERBORD_FONSTER_H} hours'
        AND geom IS NOT NULL AND $4::float8 > 0 ORDER BY geom <-> ST_SetSRID(ST_MakePoint($2, $3), 4326) LIMIT 8) s`,
    [t, lon, lat, NEDERBORD_KM * 1000]);
  return n[0]?.ned ?? null;
}

/** Läser ROUTES ur skuggmotorns källa (kommentarrader strippade). Kastar hellre än gissar. */
export function lasRutter(kod: string): Rutter {
  const start = kod.indexOf("const ROUTES: Record<string, [number, number][]> = {");
  if (start < 0) throw new Error("hittar inte ROUTES i skuggmotorn");
  const slut = kod.indexOf("\n};", start);
  const kropp = kod.slice(kod.indexOf("{", start), slut + 2).replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*})/g, "$1");
  const o = JSON.parse(kropp) as Rutter;
  if (!Object.keys(o).length) throw new Error("ROUTES tolkades som tom");
  return o;
}
export function skuggmotornsRutter(): Rutter {
  return lasRutter(readFileSync(new URL("../supabase/functions/skuggmotor/main.ts", import.meta.url), "utf8"));
}
export function ruttWkt(rutter: Rutter): string {
  return "MULTILINESTRING(" + Object.values(rutter).map((l) => "(" + l.map(([x, y]) => `${x} ${y}`).join(",") + ")").join(",") + ")";
}

/** $1 = dygn bakåt, $2 = rutternas WKT, $3 = facitradien i meter, $4/$5 = halkord och halkstam (text eller null). */
export const HANDELSE_SQL = `
  WITH r AS (SELECT ST_GeomFromText($2, 4326) AS g)
  SELECT 'smhi:' || warning_id AS id, archived_at AS t, ST_X(ST_Centroid(geom::geometry)) lon, ST_Y(ST_Centroid(geom::geometry)) lat, 'smhi' AS kalla
  FROM smhi_warnings_history, r WHERE geom IS NOT NULL AND archived_at > now() - $1 * interval '1 day'
    AND event_code ~* 'ice|icing|snow|glaze|frost|slip' AND ST_DWithin(geom::geography, r.g::geography, $3)
  UNION ALL
  SELECT 'dev:' || deviation_id, COALESCE(start_time, first_seen), ST_X(geom::geometry), ST_Y(geom::geometry), 'situation'
  FROM situation_archive, r WHERE geom IS NOT NULL AND COALESCE(start_time, first_seen) > now() - $1 * interval '1 day'
    AND (message ~* 'halk|ishalka|\\mis\\M|\\misig\\M|\\msnö|snöfall|glatt|\\mhalt\\M' OR icon_id ~* 'ice|slip')
    AND ST_DWithin(geom::geography, r.g::geography, $3)
  UNION ALL
  SELECT 'seg:' || h.segment_id || '@' || to_char(h.modified_time, 'YYYYMMDDHH24MI'), h.modified_time,
         ST_X(ST_ClosestPoint(c.geom::geometry, r.g)), ST_Y(ST_ClosestPoint(c.geom::geometry, r.g)), 'väglag'
  FROM road_condition_history h JOIN road_conditions c USING (segment_id), r
  WHERE h.modified_time > now() - $1 * interval '1 day' AND NOT h.deleted
    AND (h.condition_code >= 2 OR ($4::text IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(h.condition_info) i
         WHERE i ~* ('(^|[^a-zåäö])(' || $4 || ')') OR i ~* $5)))
    AND c.geom IS NOT NULL AND ST_DWithin(c.geom::geography, r.g::geography, $3)
  UNION ALL
  SELECT 'forare:' || f.id, f.alert_t, ST_X(w.geom::geometry), ST_Y(w.geom::geometry), 'förare'
  FROM driver_facit f JOIN weather_latest w ON f.alert_id = 'wx:' || w.station_id, r
  WHERE f.svar = 'ja' AND f.alert_t > now() - $1 * interval '1 day' AND ST_DWithin(w.geom::geography, r.g::geography, $3)
  UNION ALL
  SELECT 'kamera:' || k.id, k.bild_tid, k.lon, k.lat, 'kamera'
  FROM kamerafacit k, r
  WHERE k.klass IN ('is', 'snö', 'slask') AND k.bild_tid > now() - $1 * interval '1 day'
    AND ST_DWithin(ST_SetSRID(ST_MakePoint(k.lon, k.lat), 4326)::geography, r.g::geography, $3)`;

/** Händelserna i fönstret, orsaksklassade. `fraga` är en tunn pg-adapter så att självtester kan köra utan databas.
 *  `halkord` vidgar väglagskällan till motorns halkord på kod 1 (tystnadsfelet, som dömer mot det motorn kallar halt);
 *  utan det räknas bara operatörens kod ≥ 2 (grind S-B). $4/$5 är null när de inte ges. */
export async function hamtaHandelser(fraga: Fraga, rutter: Rutter, dagar: number, halkord?: { ord: string; stam: string }): Promise<Handelse[]> {
  const rows = await fraga(HANDELSE_SQL, [dagar, ruttWkt(rutter), FACIT_KM * 1000, halkord?.ord ?? null, halkord?.stam ?? null]);
  const ut: Handelse[] = [];
  for (const e of rows)
    ut.push({ id: e.id, t: new Date(e.t), lon: +e.lon, lat: +e.lat, kalla: e.kalla, nederbord: await nederbordVid(fraga, e.t, +e.lon, +e.lat) });
  return ut;
}
