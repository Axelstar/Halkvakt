-- KUVÖSENS ÖVERSÄTTNING (kort #232, PLAN-KUVOSEN steg 3, DECISIONS #439). Trafikverkets råa leverans (kuvos_ra.trv_obs, läst av
-- kuvos/inlasning.ts) blir arkivets rader (public.weather_observations) — samma tabell, samma kolumner och samma ord som driften
-- skriver, så att produktionens kod läser vintern oförändrad genom klockan (kuvos/klocka.sql).
--
-- REGLERNA BOR HÄR, PÅ ETT STÄLLE. Kör om filen när en regel ändras (Mickes svar): den skriver om varje rad (ON CONFLICT DO UPDATE)
-- och den råa tabellen är orörd. Ingen regel här har valts efter att ett utfall lästs — inget utfall är läst (#424).
--
-- VAD SOM ÖVERSÄTTS NU, och källan:
--   measuretime   svensk lokaltid → UTC (mätt två sätt, DECISIONS #438).
--   tyta, tluft, daggp, lu_fu   −99,9 är platshållare → NULL. Övriga värden orörda: de 36 ytorna utanför ±45 °C tas av vakterna
--                 (#75, radvakten, karantänen, den långsamma vakten), som i driften — de tvättas inte bort här.
--   ned_typ       VädErs 2019 s. 6–7 (Trafikverket, ersättningsmodellen): "Ingen nederbörd (kod 1), regn (kod 2), snö (kod 4)
--                 samt både snö och regn (kod 6)" → driftens ord 'no', 'rain', 'snow', 'sleet'. Dokumentet beskriver MESAN:s koder;
--                 att VViS-filen delar numreringen är troligt (datan stämmer: luften, kod för kod) men obekräftat — fråga 1 till
--                 Micke. 3 och 9 (DECISIONS #464, läst 6/10, KUVOS-LEVERANSEN §5c): API:t dokumenterar exakt sex typer — no, rain,
--                 freezing_rain, snow, sleet, yes (nederbörd av okänd typ) — och filen har sex koder; 1/2/4/6 är kända, så
--                 3 = 'freezing_rain' (rain, som i driften) och 9 = 'yes' (varken rain eller snow; motorn räknar 'yes' som nederbörd).
--                 −9 är platshållare ⇒ NULL. Trafikverkets svar går före om det säger annat: ändra tabellen nedan och kör om.
--                 rain/snow (driftens tiominutersbooleaner) sätts ur samma kod: rain = 2 eller 6, snow = 4 eller 6. Närmaste motsvarighet
--                 som finns; snapshoten läser `snow` för att ta med varma stationer där det snöar.
--   virik         åtta väderstreck → sektorns mitt i grader (N 0 … NV 315); −9 → NULL.
--   siktdjup      −100 → NULL; 20 000 behålls som i driften (taket — värdevakten vet det).
--
-- ÖVERSATT 6/10 UR DOKUMENTATIONEN (DECISIONS #464, KUVOS-LEVERANSEN §5c), i stället för att vänta på svaret:
--   vimed → wind_speed_ms   API:t: "Medelvärde över tiominutersperiod t.o.m. tidpunkten" (Wind.Speed). −99,9 ⇒ NULL.
--   vimax → wind_gust_ms    API:t: "Högst uppmätt 3-sekundersmedelvärde under perioden" (Aggregated30minutes.Wind.SpeedMax).
--   ned_maengd              mm per 30 minuter (PWD22 ackumulerar i mm; API:t aggregerar per 30 min; raderna är halvtimmar). Om
--                           kolumnen är regn eller allt som vatten är oläst, så mängden läggs där typen säger: rain_sum_mm = mängden
--                           när typen är regn, frusen regn eller snöblandat (2, 3, 6) och 0 vid ingen nederbörd eller snö (1, 4);
--                           snow_wateq_mm = mängden vid snö (4) och 0 vid 1, 2, 3; snöblandat (6) läggs helt på regn, inte på båda.
--                           Okänd typ (9, −9) ⇒ NULL i båda. −99,9 och −99,8 är platshållare ⇒ NULL (skillnaden är inte läst).
--                           Fem rader över 100 mm på 30 min tvättas inte här; värdevakten ser dem.
--
-- STATIONERNA. Läget ur dagens stationslista (kuvos_ra.stationer, ur static.json). En station utan läge läses inte in — inget gissas
-- (23 st, fråga 4). `name` är stationens id: leveransen har inga namn, och kolumnen är NOT NULL.

CREATE TEMP TABLE kuvos_nederbord (kod int PRIMARY KEY, ord text NOT NULL, rain boolean NOT NULL, snow boolean NOT NULL);
INSERT INTO kuvos_nederbord VALUES
  (1, 'no',    false, false),
  (2, 'rain',  true,  false),
  (3, 'freezing_rain', true, false),
  (4, 'snow',  false, true),
  (6, 'sleet', true,  true),
  (9, 'yes',   false, false);

CREATE TEMP TABLE kuvos_riktning (streck text PRIMARY KEY, grader numeric NOT NULL);
INSERT INTO kuvos_riktning VALUES
  ('N', 0), ('NO', 45), ('O', 90), ('SO', 135), ('S', 180), ('SV', 225), ('V', 270), ('NV', 315);

INSERT INTO public.weather_observations
  (station_id, name, geom, sample_time, surface_temp_c, air_temp_c, dewpoint_c, humidity_pct,
   precipitation, rain, snow, rain_sum_mm, snow_wateq_mm, wind_speed_ms, wind_gust_ms, wind_dir_deg, visibility_m)
SELECT
  r.measurepoint,
  r.measurepoint,
  ST_SetSRID(ST_MakePoint(s.lon, s.lat), 4326),
  r.measuretime AT TIME ZONE 'Europe/Stockholm',
  nullif(r.tyta, -99.9),
  nullif(r.tluft, -99.9),
  nullif(r.daggp, -99.9),
  nullif(r.lu_fu, -99.9),
  n.ord,
  coalesce(n.rain, false),
  coalesce(n.snow, false),
  CASE WHEN n.rain THEN nullif(nullif(r.ned_maengd, -99.9), -99.8) WHEN n.kod IN (1, 4) THEN 0 END,   -- regn (#464)
  CASE WHEN n.kod = 4 THEN nullif(nullif(r.ned_maengd, -99.9), -99.8) WHEN n.kod IN (1, 2, 3) THEN 0 END, -- snö som vatten (#464)
  nullif(r.vimed, -99.9),    -- tiominutersmedel (#464)
  nullif(r.vimax, -99.9),    -- högsta 3-sekundersmedel på 30 min (#464)
  k.grader,
  nullif(r.siktdjup, -100)
FROM kuvos_ra.trv_obs r
JOIN kuvos_ra.stationer s ON s.station_id = r.measurepoint
LEFT JOIN kuvos_nederbord n ON n.kod = r.ned_typ
LEFT JOIN kuvos_riktning k ON k.streck = trim(r.virik)
ON CONFLICT (station_id, sample_time) DO UPDATE SET
  name = EXCLUDED.name, geom = EXCLUDED.geom,
  surface_temp_c = EXCLUDED.surface_temp_c, air_temp_c = EXCLUDED.air_temp_c,
  dewpoint_c = EXCLUDED.dewpoint_c, humidity_pct = EXCLUDED.humidity_pct,
  precipitation = EXCLUDED.precipitation, rain = EXCLUDED.rain, snow = EXCLUDED.snow,
  rain_sum_mm = EXCLUDED.rain_sum_mm, snow_wateq_mm = EXCLUDED.snow_wateq_mm,
  wind_speed_ms = EXCLUDED.wind_speed_ms, wind_gust_ms = EXCLUDED.wind_gust_ms,
  wind_dir_deg = EXCLUDED.wind_dir_deg, visibility_m = EXCLUDED.visibility_m;

DROP TABLE kuvos_nederbord;
DROP TABLE kuvos_riktning;
