-- 105: SMÅVÄGSRÖSTENS REGEL (DECISIONS #828, kort #647; halkvakt-kuvos F51 och F52). Bengt 11/11: "Ja, bygg regeln".
--
-- Rösten säger bara halka. En småvägspunkt varnar när regel D säger fryser och det finns fukt: MET Nordics nederbörd (den
-- strängare N3) eller radarn i punktens bit. Kuvösens kedja (byggsteg 4) räknar D:s klass och N3 per punkt och timme. Gränserna
-- och talen bor kvar där (#768); här står bara vad kedjan kom fram till:
--   * smavag_live: en rad per punkt och timme där D säger fryser, med ned = den strängare N3. Där D säger fryser inte eller vet inte
--     (marsfönstret i söder ingår i D) står ingen rad. Kedjan skriver timmen och gallrar rader äldre än sex timmar.
--   * smavag_korning: en rad per timme, som kedjan skriver sist, när hela timmen står i smavag_live, med antalet punkter som fick
--     ett besked av D (fryser, fryser inte eller vet inte). Utan raden är timmen inte skriven.
-- smavag_timme(): den senaste skrivna timmen om den är högst två timmar gammal och bär minst 95 % av punkterna, annars null. Det är
--   samma färskhet och fullständighet som kandidatens (sql/068). Kandidatens timme rörs inte: småvägspunkterna står varken i vagpunkt
--   eller i ny_kandidat_live, och kandidatens regel ser dem inte.
-- smavag_regel(): varje punkt med rad i timmen, med fukten, radarn, brytaren och utfallet varnar eller torr, oberoende av brytaren.
--   Skuggan läser den (takten, byggsteg 6), eftersom takten räknas medan brytarna är av.
-- smavag_talar(): de punkter som får tala, alltså där brytaren för gruppen är på och utfallet är varnar. Lägesfilen (byggsteg 5b)
--   läser den och inget annat. Med båda brytarna av är den tom.
-- RADARN. radar_smavag (sql/104) per bit, <väg>-<ordning div 5> som i radar-karna.ts SMAVAG_BIT. Fönstret 60 minuter, gränsen
--   0,1 mm/h och medelvärdet per bit är kandidatens. Radarn väcker rösten också när N3 är torr: #828 säger att rösten väcks av
--   nederbörd, "MET Nordic, och radarn per punkt när den finns". En bit utan rad har inget regn i radarn.
-- Inget veto och ingen spridningsspärr: rösten är D med den strängare N3, mätt utan dem (F51).
-- Tidsåtgången prövas i full skala i integrationsprovet (#828 SG5), och timmen räknas en gång per körning som en underfråga (#813).
-- Funktionerna anropas en gång per publicering eller skuggvarv, inte per rad i en stor sats. De är därför LANGUAGE sql utan SET
-- (CLAUDE.md, #783 och #784).
-- Ingen förardata. Ingenting raderas. Idempotent. service_role får sina rättigheter i samma fil (DECISIONS #653).
-- ORDNINGEN: efter sql/103 och sql/104 (migrerade 10/11). TILLBAKA: DROP FUNCTION smavag_talar(), smavag_regel(), smavag_timme();
-- tabellerna kan stå.

-- Ingen främmande nyckel mot smavagspunkt: laddaren tar bort punkter som försvunnit ur kuvösens lista, och kedjans rader för dem får
-- inte stå i vägen. Regeln läser bara rader vars punkt står i smavagspunkt.
CREATE TABLE IF NOT EXISTS smavag_live (
  tid    timestamptz NOT NULL,                            -- timmen, som ny_kandidat_live
  punkt  text NOT NULL CHECK (punkt ~ '^r[0-9]{5,}$'),     -- smavagspunkt (sql/103)
  ned    boolean NOT NULL,                                -- den strängare N3, ur kuvösens kedja
  PRIMARY KEY (tid, punkt)
);
CREATE TABLE IF NOT EXISTS smavag_korning (
  tid         timestamptz PRIMARY KEY,
  punkter     integer NOT NULL CHECK (punkter >= 0),     -- punkter med ett besked av D i timmen
  skriven_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION smavag_timme() RETURNS timestamptz
LANGUAGE sql STABLE AS $$
  SELECT k.tid FROM smavag_korning k
  WHERE k.tid = (SELECT max(x.tid) FROM smavag_korning x WHERE x.tid <= now())
    AND k.tid > now() - interval '2 hours'                                                          -- FARSK_TIMMAR
    AND k.punkter >= 0.95 * (SELECT count(*) FROM smavagspunkt)                                      -- FULLSTANDIG_ANDEL
$$;
COMMENT ON FUNCTION smavag_timme() IS 'Småvägsröstens timme (sql/105, #828): den senaste skrivna timmen om den är högst två timmar gammal och bär minst 95 % av småvägspunkterna, annars null. Bara service-rollen.';

CREATE OR REPLACE FUNCTION smavag_regel()
RETURNS TABLE (punkt text, grupp text, vag text, ordning integer, lon double precision, lat double precision, tid timestamptz,
               ned boolean, radar_mmh numeric, pa boolean, utfall text)
LANGUAGE sql STABLE AS $$
  WITH radar AS (
    SELECT r.bit, max(r.rate_mean_mmh) AS mmh FROM radar_smavag r
    WHERE r.observed_at > now() - interval '60 minutes' GROUP BY r.bit                              -- RADAR_FONSTER_MIN
  )
  SELECT p.punkt, p.grupp, p.vag, p.ordning, p.lon, p.lat, l.tid, l.ned, r.mmh, b.pa,
         CASE WHEN NOT (l.ned OR coalesce(r.mmh, 0) >= 0.1) THEN 'torr'                                 -- RADAR_MMH
              ELSE 'varnar' END
  FROM smavag_live l
  JOIN smavagspunkt p ON p.punkt = l.punkt
  JOIN smavagsbrytare b ON b.grupp = p.grupp
  LEFT JOIN radar r ON r.bit = p.vag || '-' || (p.ordning / 5)                                         -- SMAVAG_BIT
  WHERE l.tid = (SELECT smavag_timme())                                               -- en gång per körning (#813)
$$;
COMMENT ON FUNCTION smavag_regel() IS 'Småvägsröstens regel (sql/105, #828, kuvösen F51): varje punkt där D säger fryser i timmen, varnar med den strängare N3 eller radarn ≥ 0,1 mm/h i punktens bit på 60 min, annars torr, oberoende av brytaren (skuggans underlag). Bara service-rollen.';

CREATE OR REPLACE FUNCTION smavag_talar()
RETURNS TABLE (punkt text, grupp text, tid timestamptz)
LANGUAGE sql STABLE AS $$
  SELECT r.punkt, r.grupp, r.tid FROM smavag_regel() r WHERE r.pa AND r.utfall = 'varnar'
$$;
COMMENT ON FUNCTION smavag_talar() IS 'Småvägsröstens besked (sql/105, #828): de varnande punkterna vars brytare är på. Lägesfilen läser bara den. Tom med brytarna av. Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE, vaktat på rollerna (CI:s PostGIS har dem inte).
ALTER TABLE smavag_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE smavag_korning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE smavag_live, smavag_korning FROM PUBLIC;
REVOKE ALL ON FUNCTION smavag_timme(), smavag_regel(), smavag_talar() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE smavag_live, smavag_korning FROM anon;
    REVOKE ALL ON FUNCTION smavag_timme(), smavag_regel(), smavag_talar() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE smavag_live, smavag_korning FROM authenticated;
    REVOKE ALL ON FUNCTION smavag_timme(), smavag_regel(), smavag_talar() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE smavag_live TO service_role;
    GRANT ALL ON TABLE smavag_korning TO service_role;
    GRANT EXECUTE ON FUNCTION smavag_timme(), smavag_regel(), smavag_talar() TO service_role;
  END IF;
END $$;
