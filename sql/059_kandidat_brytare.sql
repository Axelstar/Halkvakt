-- 059: KANDIDATENS BRYTARE (NIVA2-LIVE steg 13, DECISIONS #562 punkt 5, #578; Bengts ja 16/10 till förslaget).
-- #562 punkt 5: avstängningen tar bort nyckeln ur publiceringen, inte hela publiceringen; att tysta kräver en av Bengt och Axel,
-- att starta igen kräver båda. En logg, inte en flagga: varje tryck är en rad med vem och när, och läget räknas ur loggen —
--   på  om ingen tystning finns, eller om BÅDE bengt och axel har tryckt starta efter den senaste tystningen;
--   av  annars (också om bara en av dem har startat, eller samma person två gånger).
-- Vem som tryckte sätts av knappen ur GitHub-kontot (scripts/kandidatbrytaren.ts, .github/workflows/kandidatbrytaren.yml), aldrig ur
-- ett fält. Publiceringen läser kandidat_pa(); kan den inte läsas utelämnas nyckeln (tyst är det säkra hållet).

CREATE TABLE IF NOT EXISTS kandidat_brytare (
  id bigserial PRIMARY KEY,
  tid timestamptz NOT NULL DEFAULT now(),
  atgard text NOT NULL CHECK (atgard IN ('tysta', 'starta')),
  vem text NOT NULL CHECK (vem IN ('bengt', 'axel')),
  korning text
);
COMMENT ON TABLE kandidat_brytare IS 'Kandidatens brytare (DECISIONS #562 punkt 5, #578): ett tryck per rad. Av efter en tystning tills både bengt och axel startat.';

-- Ordningen räknas på id, inte på tid: två tryck i samma mikrosekund ska inte kunna byta plats.
CREATE OR REPLACE FUNCTION kandidat_pa() RETURNS boolean
LANGUAGE sql STABLE AS $$
  WITH t AS (SELECT max(id) AS id FROM kandidat_brytare WHERE atgard = 'tysta')
  SELECT (SELECT id FROM t) IS NULL
      OR (SELECT count(DISTINCT b.vem) FROM kandidat_brytare b WHERE b.atgard = 'starta' AND b.id > (SELECT id FROM t)) >= 1
$$;
COMMENT ON FUNCTION kandidat_pa() IS 'Kandidatens brytare (DECISIONS #578): på utan tystning, annars först när både bengt och axel startat efter den senaste. Bara service-rollen.';

-- Låst dubbelt (CLAUDE.md): RLS utan policy och REVOKE, så att en klickruta inte kan öppna brytaren.
ALTER TABLE kandidat_brytare ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE kandidat_brytare FROM PUBLIC;
REVOKE ALL ON FUNCTION kandidat_pa() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE kandidat_brytare FROM anon; REVOKE ALL ON SEQUENCE kandidat_brytare_id_seq FROM anon;
    REVOKE ALL ON FUNCTION kandidat_pa() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE kandidat_brytare FROM authenticated; REVOKE ALL ON SEQUENCE kandidat_brytare_id_seq FROM authenticated;
    REVOKE ALL ON FUNCTION kandidat_pa() FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN GRANT EXECUTE ON FUNCTION kandidat_pa() TO service_role; END IF;
END $$;
