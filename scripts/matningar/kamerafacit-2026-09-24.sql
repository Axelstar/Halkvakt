-- Kamerafacit, första klassningen (kort #242, DECISIONS #333; Bengt 24/9: "klassa som våt").
--
-- VAD SOM KLASSADES, sagt rakt: INTE den arkiverade bilden 2026-09-24/SE_STA_CAMERA_VViS_329_K1-165760.jpg (02:30Z) — den
-- ligger i hinken som bara Axel når. Klassad är Trafikverkets DIREKTBILD från samma kamera (Tierp, E4) 2026-09-24 05:11:34
-- lokal tid = 03:11:34Z, hämtad 03:18:51Z ur det publika API:et och sparad i repot som
-- docs/kamerafacit/2026-09-24T0311Z_SE_STA_CAMERA_VViS_329_K1.jpg, så att den som vill kan se vad som klassades.
-- `bild` bär därför repots sökväg, inte hinkens. Läsningen gjordes av Claude ("mörk, blöt lins, våt vägbana, ingen snö"),
-- klassen är Bengts. KÖRD 24/9 03:29:56Z via dbknapp — som BEVISRAD med sql/033 som bärare, eftersom dbknapp migrera bara tar
-- sql/NNN-filer; den här filen är källan och enradsformen står i DECISIONS #333. Idempotent genom ON CONFLICT.
INSERT INTO kamerafacit (bild, kamera_id, lon, lat, bild_tid, klass, av)
VALUES ('docs/kamerafacit/2026-09-24T0311Z_SE_STA_CAMERA_VViS_329_K1.jpg', 'SE_STA_CAMERA_VViS_329_K1',
        17.511349, 60.32439, '2026-09-24T03:11:34Z', 'våt', 'Bengt (på Claudes läsning av direktbilden)')
ON CONFLICT (bild) DO UPDATE SET klass = EXCLUDED.klass, av = EXCLUDED.av, klassad = now();
