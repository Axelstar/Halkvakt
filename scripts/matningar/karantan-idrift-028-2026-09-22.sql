-- SQL-TVILLINGARNA I DRIFT (kort #234, DECISIONS #299, 22/9 2026). Bärare: sql/028_uppspelning_varianter.sql; sql/018 kördes
-- in av trendarkivet --jamfor strax före. Beviset läses ur pg_proc: funktionskropparna i DRIFTEN bär radvakten och
-- karantänen (inte bara filerna i repot). Sista satsen kör uppspelningens variant utan faller — den som läser
-- väderarkivet direkt genom de nya vakterna — och visar bara stationsantalet (utfallet är blindat, KB-D3). Sista satsen:
-- publicera-buntens egna svar EFTER deployen 04:48:22Z (bunten bär nu fragmenten; beteendet ska vara oförändrat, noten kvar).
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/028_uppspelning_varianter.sql, bevis = satserna).

SET statement_timeout = '300s'

SELECT proname, length(prosrc) AS tecken, position('k.sample_time > r.sample_time - interval ''7 days''' in prosrc) > 0 OR position('k.sample_time > w.sample_time - interval ''7 days''' in prosrc) > 0 AS karantan_per_rad, position('air_temp_c < 10 OR' in prosrc) > 0 AS radvakt, position('- 12) < 3' in prosrc) > 0 AS tre_brott FROM pg_proc WHERE proname IN ('berakna_trendkandidater', 'uppspelning_efterhalka') ORDER BY 1

SELECT dag, stationer FROM uppspelning_efterhalka(p_krav_faller := false) ORDER BY dag DESC LIMIT 3

SELECT to_char(created AT TIME ZONE 'UTC', 'HH24:MI:SS') AS utc, status_code, substring(content FROM '"generated_at":"([^"]+)"') AS generated_at, substring(content FROM '(karantän:[^"]*)') AS karantan_not FROM net._http_response WHERE content LIKE '%"generated_at"%' AND created > '2026-09-22T04:48:22Z' ORDER BY created DESC LIMIT 3
