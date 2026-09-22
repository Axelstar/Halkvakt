"""KORT #235 (22/9 2026): generatorn bakom driftrakningen-ramar-2026-09-22.sql.

Bygger mätfilen ur de TVÅ riktiga texterna av sql/018_trend_berakna.sql — den gamla ur ett git-ref (lateralen) och den nya ur
arbetsträdet (ramarna) — så att mätningen prövar exakt den text som checkas in, inte en avskrift. CTE:erna fram till `skriv`
lyfts ur varje text, får prefix (g_/n_) och jämförs kolumn för kolumn åt båda hållen; ingen INSERT, ingen funktion ändras.

Kör:  python scripts/matningar/driftrakningen-ramar-generator-2026-09-22.py <utfil> [gammalt-ref, standard origin/main]
Mätfilen 22/9 byggdes med gammalt-ref = origin/main (då 8a9eca9) och grenens 018 i arbetsträdet; kördes via dbknapp
(atgard migrera, bärare sql/029_brott_index.sql, bevis = satserna), körning 35729035969.
Vid nästa ändring av 018: kör igen från grenen INNAN merge, med samma bärare.
"""
import io, re, subprocess, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

UT = sys.argv[1]
GAMMALT_REF = sys.argv[2] if len(sys.argv) > 2 else "origin/main"
gammal = subprocess.run(["git", "show", f"{GAMMALT_REF}:sql/018_trend_berakna.sql"], capture_output=True, check=True).stdout.decode("utf-8")
ny = io.open("sql/018_trend_berakna.sql", encoding="utf-8").read()

def ctes(text, prefix, sedan):
    """CTE:erna från `bas` till strax före `skriv`, kommentarer bort, CTE-namnen prefixade, `sedan` utbytt mot ett intervall."""
    a = text.index("  WITH bas AS (") + len("  WITH ")
    b = text.index("  skriv AS (")
    s = text[a:b]
    s = "\n".join(re.sub(r"--.*$", "", r) for r in s.splitlines())
    s = s.strip().rstrip(",")
    for namn in ["med_lutning", "kandidat", "ramar", "bas"]:
        s = re.sub(r"\b" + namn + r"\b", prefix + namn, s)
    s = re.sub(r"\bsedan\b", sedan, s)
    return re.sub(r"\s+", " ", s)

KOL = "station_id, sample_time, n15, n30, n60, f15, f30, f60, h15, h30, h60, lut15, lut30, lut60"

# 1. Samma rader och samma tal: varje kolumn som lutningen byggs av, för VARJE rad som passerat vakterna (inte bara de som
#    når 0,4), åt båda hållen (EXCEPT ALL räknar NULL som lika med NULL).
def jamfor(sedan):
    return (f"WITH {ctes(gammal, 'g_', sedan)}, {ctes(ny, 'n_', sedan)}, "
            f"g AS (SELECT {KOL} FROM g_med_lutning), n AS (SELECT {KOL} FROM n_med_lutning) "
            f"SELECT {sedan} AS fonster, (SELECT count(*) FROM g) AS lateralen, (SELECT count(*) FROM n) AS ramarna, "
            f"(SELECT count(*) FROM (SELECT * FROM g EXCEPT ALL SELECT * FROM n) x) AS bara_lateralen, "
            f"(SELECT count(*) FROM (SELECT * FROM n EXCEPT ALL SELECT * FROM g) x) AS bara_ramarna, "
            f"(SELECT count(*) FROM g WHERE greatest(coalesce(lut15, -99), coalesce(lut30, -99), coalesce(lut60, -99)) >= 0.4) AS kandidater_lateralen, "
            f"(SELECT count(*) FROM n WHERE greatest(coalesce(lut15, -99), coalesce(lut30, -99), coalesce(lut60, -99)) >= 0.4) AS kandidater_ramarna, "
            f"(SELECT count(*) FROM g WHERE h15 > 3 OR h30 > 3 OR h60 > 3) AS med_hopp, "
            f"round(extract(epoch FROM clock_timestamp() - statement_timestamp())::numeric, 1) AS sekunder")

# 2. Tiden för en form ensam. clock_timestamp() i aggregatets projektion läses när alla rader är räknade.
def tid(text, prefix, sedan, namn):
    return (f"WITH {ctes(text, prefix, sedan)} SELECT '{namn}' AS form, {sedan} AS fonster, count(*) AS efter_vakterna, "
            f"count(*) FILTER (WHERE greatest(coalesce(lut15, -99), coalesce(lut30, -99), coalesce(lut60, -99)) >= 0.4) AS kandidater, "
            f"round(extract(epoch FROM clock_timestamp() - statement_timestamp())::numeric, 2) AS sekunder FROM {prefix}med_lutning")

huvud = f"""-- KORT #235 (22/9 2026): drifträkningens lateral mot ramarna. Genererad av driftrakningen-ramar-generator-2026-09-22.py ur
-- {GAMMALT_REF}:sql/018 (lateralen) och arbetsträdets sql/018 (ramarna), så att mätningen prövar exakt den text som checkas in.
-- Bara läsande: satserna är SELECT över CTE:erna, ingen INSERT, ingen funktion ändras. Bärare: sql/029_brott_index.sql
-- (CREATE INDEX IF NOT EXISTS). Sats 2: två timmar (livets fönster), båda formerna, varje kolumn åt båda hållen. Sats 3: ett
-- dygn, samma sak. Sats 4–5: tiden i livets fönster, lateralen och ramarna var för sig. Sats 6: ramarna över sju dygn —
-- lateralen föll där. Kör: varje sats på en rad i dbknapp (atgard migrera, fil sql/029_brott_index.sql, bevis = satserna).
"""
satser = [
    "SET statement_timeout = '600s'",
    jamfor("interval '2 hours'"),
    jamfor("interval '1 day'"),
    tid(gammal, "g_", "interval '2 hours'", "lateralen"),
    tid(ny, "n_", "interval '2 hours'", "ramarna"),
    tid(ny, "n_", "interval '7 days'", "ramarna"),
]
io.open(UT, "w", encoding="utf-8", newline="\n").write(huvud + "\n" + "\n\n".join(satser) + "\n")
print(UT, "ur", GAMMALT_REF, [len(s) for s in satser])
