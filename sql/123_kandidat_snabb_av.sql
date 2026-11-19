-- 123: KANDIDATEN PÅ EN KVART — AV (DECISIONS #782, kort #373). Påslaget 19/11 07.41 UTC (sql/122) tystade storstädernas punkter:
-- den snabba räkningen bär inga stadspunkter (kandidat_punkter har dem inte, sql/080), så talande_regel() gav noll rader vid
-- stadspunkterna medan den snabba talade (läst 19/11 kl. 08.0x UTC: 0 rader mot 1 832 i timvärdets regel, varav 29 varnande).
-- En rad 'av' i kandidat_snabb_talar (sql/121): från nästa publicering talar timvärdet igen, med storstäderna, som före påslaget.
-- Körs med DB-knappen (atgard=migrera) på Bengts ord. Raderna tas aldrig bort; den senaste avgör.

INSERT INTO kandidat_snabb_talar (talar, beslut, korning)
VALUES ('av', 'DECISIONS #782', 'storstädernas punkter tystades: den snabba saknar stadspunkterna (läst 19/11)');
