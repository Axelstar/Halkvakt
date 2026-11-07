-- 098: STORSTÄDERNAS BRYTARE AV (DECISIONS #816; kort #378).
-- Slår av alla fyra brytarna i stadsbrytare (sql/089). Från nästa körning tar kandidatens regel inte med storstädernas punkter, och deras
-- varningar försvinner ur live.json vid nästa publicering. Dagens punkter rörs inte.
-- AVBROTTET (Bengt 7/11, DECISIONS #816): Claude kör filen med DB-knappen utan att fråga, om publiceringen faller eller lägesfilen står
-- still, om en K-timme försvinner för dagens punkter, om stadssteget i del B faller två timmar i rad eller om en förare rapporterar att
-- batteriet eller värmen är fel. Varje körning ger en rad i STATUS och ett besked till Bengt.
-- TILLBAKA: sql/097. Idempotent.

UPDATE stadsbrytare SET pa = false, andrad_at = now(), skal = 'av med sql/098 (DECISIONS #816)' WHERE pa;
