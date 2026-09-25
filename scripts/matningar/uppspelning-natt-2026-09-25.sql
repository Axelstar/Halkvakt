-- Kort #256 (DECISIONS #366): uppspelningens natt i UTC mot svensk tid. Körs FÖRE och EFTER att sql/028 lagts om. Bara de
-- oblindade kolumnerna — episoder och ögonblick räknar fyrningar, inga utfall. Ögonblicken ska vara lika (samma population, bara
-- nattindelningen ändras); episoderna får skilja sig där två ögonblick ligger på var sin sida om middag i den ena zonen men inte den andra.
SELECT 'kombinationen' AS variant, sum(episoder)::int AS episoder, sum(ogonblick)::int AS ogonblick, count(*)::int AS dygn FROM uppspelning_efterhalka()
SELECT 'utan blöt' AS variant, sum(episoder)::int AS episoder, sum(ogonblick)::int AS ogonblick, count(*)::int AS dygn FROM uppspelning_efterhalka(p_krav_blot := false)
SELECT 'utan faller, utan blöt' AS variant, sum(episoder)::int AS episoder, sum(ogonblick)::int AS ogonblick, count(*)::int AS dygn FROM uppspelning_efterhalka(p_krav_faller := false, p_krav_blot := false)
