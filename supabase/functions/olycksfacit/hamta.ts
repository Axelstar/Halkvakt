// Olycksfacit: olyckorna som började mellan två svenska dygn (båda med), med lagren som varnade vid starten. Delas av funktionen
// olycksfacit (ärendena) och funktionen admin (fliken på statistiksidan, DECISIONS #936), så att båda läser samma rader.
import type { Olycka } from "./arende.ts";

// deno-lint-ignore no-explicit-any
export async function hamta(sql: any, fran: string, till: string): Promise<Olycka[]> {
  return (await sql`
    SELECT f.start_time, f.road_number, ST_X(f.geom) AS lon, ST_Y(f.geom) AS lat, f.utfall, f.orsaker, f.klass, f.klass_skal, f.dubblett_av,
           coalesce((SELECT array_agg(l.lager ORDER BY array_position(ARRAY['A1', 'K', 'A2', 'smavag'], l.lager)) FROM olycksfacit_lager l
                     WHERE l.deviation_id = f.deviation_id AND l.talar), '{}') AS talade,
           f.art,
           (SELECT l.orsak FROM olycksfacit_lager l WHERE l.deviation_id = f.deviation_id AND l.lager = 'smavag') AS smavag,
           coalesce((SELECT (l.detalj->>'flackvis_vat')::boolean FROM olycksfacit_lager l
                     WHERE l.deviation_id = f.deviation_id AND l.lager = 'K'), false) AS flackvis_vat
    FROM olycksfacit f WHERE (f.start_time AT TIME ZONE 'Europe/Stockholm')::date BETWEEN ${fran}::date AND ${till}::date
    ORDER BY f.start_time, f.deviation_id`).map((r: any) => ({
      tid: new Date(r.start_time).toISOString(), vag: r.road_number, lon: Number(r.lon), lat: Number(r.lat), utfall: r.utfall,
      orsaker: r.orsaker ?? [], klass: r.klass, skal: r.klass_skal, dubblett: r.dubblett_av !== null, talade: r.talade ?? [],
      art: r.art, smavag: r.smavag, flackvisVat: r.flackvis_vat === true }));
}
