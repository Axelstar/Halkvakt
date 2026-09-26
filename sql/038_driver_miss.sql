-- 038: förarens missar — "appen missade" (kort #203 lager 2; Axels ja 20/9, DECISIONS #267 punkt 4–5; Bengts "gör 203" 26/9,
-- DECISIONS #379). Den andra halvan av förarfacit: appen var tyst när den borde ha varnat.
--
-- VAD SOM SPARAS, och inget annat: när föraren markerade missen (t), vad det var (vad — valt av föraren efter resan), närmaste
-- mätstation (station_id, "wx:<id>" ur snapshotens stationslista, sql-fri: räknas i telefonen), närmaste vägsträcka inom 2 km om
-- telefonen hade någon (segment_id, "seg:<id>"), plattform och appversion. Ingen identitet, ingen koordinat, ingen resa.
-- ÄRLIGT (Axels egna ord, #267): "station-id plus klockslag säger ungefär var föraren var … det är inte en position, men det är
-- en position i grova drag." Brytarens text säger det ordagrant, och bara betatestare med brytaren på kan skicka.
--
-- Skrivs enbart av edge-funktionen facit-svar (service role). Dubbellåst som driver_facit (002-läxan): RLS utan policy + REVOKE.
-- Omsändning dubblerar aldrig: nyckeln är (t, station_id, app), och ett ändrat svar på samma miss ersätter det förra.
-- prov: samma genererade märkning som 025/027 — ett id med "prov" eller "fotostudio" räknas aldrig.
CREATE TABLE IF NOT EXISTS driver_miss (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  t timestamptz NOT NULL,                                                            -- när föraren markerade (appens klocka, UTC)
  vad text NOT NULL CHECK (vad IN ('halka', 'vatten', 'vilt', 'olycka', 'annat')),
  station_id text NOT NULL,                                                           -- "wx:2135"
  segment_id text,                                                                    -- "seg:16010" eller NULL
  app text NOT NULL CHECK (app IN ('android', 'ios')),
  version text,
  received_at timestamptz NOT NULL DEFAULT now(),
  prov boolean GENERATED ALWAYS AS (strpos(lower(station_id), 'prov') > 0 OR strpos(lower(station_id), 'fotostudio') > 0) STORED,
  UNIQUE (t, station_id, app)
);
CREATE INDEX IF NOT EXISTS driver_miss_received_idx ON driver_miss (received_at);

ALTER TABLE driver_miss ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE driver_miss FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE driver_miss FROM authenticated;
  END IF;
END $$;
COMMENT ON TABLE driver_miss IS 'Kort #203 lager 2 (DECISIONS #379): förarens "appen missade". Skrivs bara av facit-svar; läses aldrig via REST.';
