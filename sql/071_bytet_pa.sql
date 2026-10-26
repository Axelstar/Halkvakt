-- 071: BYTET PÅ (FORREGISTRERING-2026-27 §12 b, DECISIONS #729). Bengt och Axel har beslutat att den nya kandidaten (sex vintrar,
-- rättad enligt tillägget T4, i drift sedan 26/10, #728) talar i appen i stället för den frysta. En rad i kandidat_talar (sql/070):
-- från nästa publicering ger talande_timme() och talande_regel() den nyas timme och regel, så länge den nyas timme är färsk och
-- fullständig; annars talar den frysta den timmen (§12 f). Den frystas kedja, logg och dom rörs inte (§12 c).
-- TILLBAKA: en ny rad med talar = 'fryst' och beslutets nummer, i samma form. Raderna tas aldrig bort; den senaste avgör.
-- Körs en gång med DB-knappen (atgard=migrera). En andra körning lägger en likadan rad, och den senaste avgör ändå.

INSERT INTO kandidat_talar (talar, beslut, korning)
VALUES ('ny', 'DECISIONS #729',
        'kuvos-ny-kandidat 40350714069 (provning och samman, T4), 40375155386 (paritet); ny-kandidat-fysik 40398888429 (T4 i drift)');
