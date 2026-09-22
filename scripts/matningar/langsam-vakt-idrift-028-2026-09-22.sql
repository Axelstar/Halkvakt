-- DEN LÅNGSAMMA VAKTEN I DRIFT, DEL 2 (kort #236, DECISIONS #300, 22/9 2026). Bärare: sql/028_uppspelning_varianter.sql;
-- sql/018 kördes in av trendarkivet --jamfor strax före, ingest-live och publicera deployades därefter. Beviset ur driften:
-- båda funktionskropparna i pg_proc bär dygnsflaggan (inte bara filerna i repot), ingest-lives svar bär `langsam_vakt`
-- (pg_net sparar svaret), och publiceringens svar efter deployen bär noten "långsam vakt: … 1106". Bara läsande.
-- Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/028_uppspelning_varianter.sql, bevis = satserna).

SET statement_timeout = '120s'

SELECT proname, position('givarfel_dygn' in prosrc) > 0 AS dygnsflaggan, position('- 12) < 3' in prosrc) > 0 AS karantan FROM pg_proc WHERE proname IN ('berakna_trendkandidater', 'uppspelning_efterhalka', 'langsam_vakt') ORDER BY 1

SELECT to_char(created AT TIME ZONE 'UTC', 'HH24:MI:SS') AS utc, status_code, substring(content FROM '"langsam_vakt":"([^"]*)"') AS langsam_vakt, substring(content FROM '"trend":"([^"]*)"') AS trend FROM net._http_response WHERE content LIKE '%"langsam_vakt"%' ORDER BY created DESC LIMIT 3

SELECT to_char(created AT TIME ZONE 'UTC', 'HH24:MI:SS') AS utc, substring(content FROM '"generated_at":"([^"]+)"') AS generated_at, substring(content FROM '(långsam vakt:[^"]*)') AS langsam_not, substring(content FROM '(karantän:[^"]*)') AS karantan_not FROM net._http_response WHERE content LIKE '%"generated_at"%' ORDER BY created DESC LIMIT 3
