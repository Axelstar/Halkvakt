-- 131: RADARN KRING STATIONERNA, FÖR DRIFTKONTROLLEN AV SMÅVÄGSRÖSTEN (DECISIONS #924, kort #662; halkvakt-kuvos F61 §12, F63, F68).
-- Bengt 20/11: "ja lägg till radarn". Rösten väcks av den strängare N3 eller radarn (sql/105), men driftkontrollen räknar bara N3-delen,
-- eftersom P-II:s dygnsfiler inte bär någon radar vid stationerna. Här läses radarn kring varje station i data/vagdata/stationer.json, i
-- samma komposit och samma körning som radar_smavag (sql/104), så att kontrollen kan pröva röstens hela fukt.
--
-- ingest/radar.ts skriver radar_station med radar-karna.ts stationsytor och stationRader: ytan är kompositens pixlar vars mitt ligger
-- högst STATION_RADIE_M från stationen i kompositens projektion, och värdet är max och medel över ytans täckta pixlar med driftens kärna,
-- händelsefiltrerat och avrundat som radar_smavag (bara stationer med regn ≥ 0,1 mm/h i någon pixel). radar_station_komposit bär en rad
-- per läst komposit, också när ingen station hade regn, så att kontrollen ser vilka kvartar radarn fanns. En station utan rad i en läst
-- komposit är torr i radarn.
-- Gallring: fyra dygn (radar.ts STATION.gallra). Dygnsrapporten (kuvos-smavag-uppfoljning.yml) lägger varje UTC-dygn i den privata hinken
-- morgonen efter och räknar ikapp två dygn bakåt. Stationerna är Trafikverkets öppna (CC0); vilka av dem kontrollen läser är kuvösens och
-- står inte här (#768). Ingen förardata. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
CREATE TABLE IF NOT EXISTS radar_station (
  station_id     text NOT NULL CHECK (station_id ~ '^[0-9]{3,}$'),
  observed_at    timestamptz NOT NULL,       -- kompositens giltighetstid
  rate_max_mmh   numeric NOT NULL,           -- max regnintensitet över ytans täckta pixlar
  rate_mean_mmh  numeric NOT NULL,           -- medlet över ytans täckta pixlar
  ingested_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (station_id, observed_at)
);
CREATE INDEX IF NOT EXISTS radar_station_time_idx ON radar_station (observed_at);

CREATE TABLE IF NOT EXISTS radar_station_komposit (
  observed_at    timestamptz PRIMARY KEY,    -- en läst komposit
  ingested_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE radar_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_station_komposit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE radar_station FROM PUBLIC;
REVOKE ALL ON TABLE radar_station_komposit FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE radar_station FROM anon; REVOKE ALL ON TABLE radar_station_komposit FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE radar_station FROM authenticated; REVOKE ALL ON TABLE radar_station_komposit FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE radar_station TO service_role; GRANT ALL ON TABLE radar_station_komposit TO service_role;
  END IF;
END $$;
