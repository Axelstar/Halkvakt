# GRANSKNING (second opinion, Bengts order 21/9) av efterhandstestet på Niras exempeldag — DECISIONS #287/#289.
#
# EXPLORATIVT OCH I EFTERHAND: inget här var låst före körningen, och inget tal får ändra en tröskel eller ett startvärde.
# Syftet är bara att pröva om #287:s läsning "motorn träffade sämre än slumpen" tål fem frågor:
#   1. Gjorde temperaturvillkoret något arbete alls — eller prövades i praktiken bara torkarna?
#   2. Försvinner underskottet mot basnivån när man jämför inom samma vägklass och timme (blandningseffekt)?
#   3. Är torkare > 0 ett nederbördsvittne — eller ett trafik- och saltstänksvittne? (tröskelkänslighet, trafikproxy)
#   4. Hur hal var vägen i SAMMA ögonblick där torkarna gick, mot där de inte gick?
#   5. Gick halkans BÖRJAN alls att se — eller var vägen redan hal första gången en bil mätte?
# Samma rutnät, ersättare, facit (friktion < 0,30 inom (t, t+90 min]) och värdevakt som det låsta testet.
# Niras filer läses ur Hämtade filer och hamnar aldrig i repot; bara aggregat skrivs ut.
import io, json, sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
D = Path.home() / "Downloads"
STEG, FONSTER, GRANS = 600_000, 9, 0.30
UT = {"obs": "explorativt, i efterhand — DECISIONS #290"}

lt = pd.read_csv(D / "Air_temperature_Stockholm_2024-01-15.csv",
                 usecols=["timestamp", "link_id", "functional_road_class", "temperature"])
to = pd.read_csv(D / "Wiper_speed_Stockholm_2024-01-15.csv", usecols=["timestamp", "link_id", "wiper_speed"])
fr = pd.read_csv(D / "Friction_Stockholm_2024-01-15.csv", usecols=["timestamp", "link_id", "friction_average"])
T0 = int(min(lt["timestamp"].min(), to["timestamp"].min(), fr["timestamp"].min()))
NB = int((max(lt["timestamp"].max(), to["timestamp"].max(), fr["timestamp"].max()) - T0) // STEG) + 1
lankar = np.union1d(np.union1d(lt["link_id"].unique(), to["link_id"].unique()), fr["link_id"].unique())
idx = {l: i for i, l in enumerate(lankar)}
L = len(lankar)
klass_per_lank = lt.groupby("link_id")["functional_road_class"].first()
lt = lt[(lt["temperature"] >= -35) & (lt["temperature"] <= 15)]

def rutnat(df, kol, hur):
    g = df.assign(b=((df["timestamp"] - T0) // STEG).astype(int)).groupby(["link_id", "b"])[kol].agg(hur).reset_index()
    m = np.full((L, NB), np.nan)
    m[g["link_id"].map(idx).to_numpy(), g["b"].to_numpy()] = g[kol].to_numpy()
    return m

temp = rutnat(lt, "temperature", "median")
tork_max = rutnat(to, "wiper_speed", "max")           # det låsta testets mått: NÅGON delsträcka med torkare > 0
tork_medel = rutnat(to, "wiper_speed", "mean")
rader = rutnat(to, "wiper_speed", "count")            # antal delsträcksrader i perioden — en grov trafikproxy
fric = rutnat(fr, "friction_average", "min")
rapport = ~np.isnan(temp)
fukt = np.nan_to_num(tork_max, nan=0.0) > 0

klass = np.zeros(L, dtype=int)
klass[[idx[l] for l in klass_per_lank.index]] = klass_per_lank.to_numpy()
timme = np.array([(b // 6 + 1) % 24 for b in range(NB)])          # svensk tid: första perioden är 01:00
S = klass[:, None] * 24 + timme[None, :]                            # stratum = vägklass × timme

fram = np.full((L, NB), np.nan)                                     # lägsta friktion i (t, t + 90 min]
for k in range(1, FONSTER + 1):
    sk = np.full((L, NB), np.nan); sk[:, : NB - k] = fric[:, k:]
    fram = np.fmin(fram, sk)
har = ~np.isnan(fram)
traff = fram < GRANS

def andel(mask):
    m = mask & har
    return int(m.sum()), (float((traff & m).sum() / m.sum()) if m.sum() else float("nan"))

def forvantad(mask, ref):
    """Träffandelen masken HADE fått om den inom varje vägklass × timme träffat som referensen — dess blandning, utan egen information."""
    m, r = mask & har, ref & har
    nm, nr = np.bincount(S[m], minlength=120), np.bincount(S[r], minlength=120)
    hr = np.bincount(S[r & traff], minlength=120)
    ok = (nr > 0) & (nm > 0)
    return float((nm[ok] * hr[ok] / nr[ok]).sum() / nm[ok].sum())

def rubrik(s): print(f"\n{'=' * 6} {s} {'=' * max(3, 84 - len(s))}")

# ── 1. Gjorde temperaturvillkoret något arbete? ──────────────────────────────
rubrik("1. TEMPERATURVILLKORET")
kall = rapport & (temp <= 1.0)
print(f"perioder med bilrapport: {int(rapport.sum()):,} · varav yta-ersättaren ≤ +1 °C: {int(kall.sum()):,} = {kall.sum() / rapport.sum():.2%}")
print(f"bland perioder med torkare: {int((rapport & fukt).sum()):,} · varav ≤ +1 °C: {int((kall & fukt).sum()):,} "
      f"= {(kall & fukt).sum() / (rapport & fukt).sum():.2%}")
UT["temperaturvillkoret"] = {"andel_kall": round(float(kall.sum() / rapport.sum()), 4)}

# ── 2. Blandningseffekten: samma vägklass och timme ──────────────────────────
rubrik("2. MOTORNS FRYSRISKREGEL MOT REFERENSEN — RÅTT OCH INOM VÄGKLASS × TIMME")
motor, torrt = kall & fukt, rapport & ~fukt
nM, aM = andel(motor); nT, aT = andel(torrt); nB, aB = andel(rapport)
fM = forvantad(motor, torrt)
print(f"basnivå (alla perioder med rapport): {aB:.1%} · utan torkare: {aT:.1%} · med torkare (= regeln): {aM:.1%}")
print(f"regelns FÖRVÄNTADE träffandel om torkarna inte bar någon information, givet när och var de gick: {fM:.1%}")
print(f"  ⇒ av underskottet {aB - aM:+.1%} mot basnivån förklarar blandningen (timme, vägklass) {aB - fM:+.1%}; kvar inom stratum: {fM - aM:+.1%}")
UT["blandning"] = {"bas": round(aB, 3), "utan_torkare": round(aT, 3), "regeln": round(aM, 3), "forvantad": round(fM, 3)}
print(f"\n{'vägklass':<9}{'andel perioder med torkare':>28}{'träff utan torkare':>20}{'träff med torkare':>19}{'dagtid 09–19: utan':>20}{'med':>8}")
dag = np.isin(timme, range(9, 20))[None, :]
per_klass = []
for c in (1, 2, 3, 4):
    k = (klass == c)[:, None]
    pf = (rapport & fukt & k).sum() / max((rapport & k).sum(), 1)
    _, a0 = andel(torrt & k); _, a1 = andel(motor & k); _, d0 = andel(torrt & k & dag); _, d1 = andel(motor & k & dag)
    per_klass.append({"klass": c, "andel_torkare": round(float(pf), 3), "utan": round(a0, 3), "med": round(a1, 3),
                      "dag_utan": round(d0, 3), "dag_med": round(d1, 3)})
    print(f"{c:<9}{pf:>28.1%}{a0:>20.1%}{a1:>19.1%}{d0:>20.1%}{d1:>8.1%}")
UT["per_klass"] = per_klass

# ── 3. Torkarna som nederbördsvittne ─────────────────────────────────────────
rubrik("3. TORKARNA — SKALA, TRÖSKELKÄNSLIGHET OCH TRAFIKPROXY")
v = to.loc[to["wiper_speed"] > 0, "wiper_speed"]
print(f"torkarvärden > 0: {len(v):,} rader · kvantiler 10/50/90/99 %: "
      f"{v.quantile(.1):.2f} / {v.quantile(.5):.2f} / {v.quantile(.9):.2f} / {v.quantile(.99):.2f} · max {v.max():.2f}")
print(f"{'villkor':<34}{'ögonblick':>11}{'träffandel':>12}{'förväntad av blandningen':>27}")
kans = []
for namn, m in [("max > 0 (det låsta testet)", tork_max > 0), ("max ≥ 0,25", tork_max >= 0.25), ("max ≥ 0,5", tork_max >= 0.5),
                ("max ≥ 1,0", tork_max >= 1.0), ("medel ≥ 0,25", tork_medel >= 0.25), ("medel ≥ 0,5", tork_medel >= 0.5),
                ("medel ≥ 1,0", tork_medel >= 1.0)]:
    mm = kall & np.nan_to_num(m, nan=False).astype(bool)
    n, a = andel(mm)
    f = forvantad(mm, torrt) if n else float("nan")
    kans.append({"villkor": namn, "n": n, "traff": None if np.isnan(a) else round(a, 3), "forvantad": None if np.isnan(f) else round(f, 3)})
    print(f"{namn:<34}{n:>11,}{a:>12.1%}{f:>27.1%}")
UT["torkartroskel"] = kans
print(f"\n{'delsträcksrader i perioden':<28}{'perioder':>10}{'andel med torkare > 0':>24}{'basträff':>10}")
trafik = []
for namn, lo, hi in [("1", 1, 1), ("2", 2, 2), ("3–4", 3, 4), ("5–9", 5, 9), ("10+", 10, 10**6)]:
    m = rapport & (rader >= lo) & (rader <= hi)
    pf = (m & fukt).sum() / max(m.sum(), 1); _, a = andel(m)
    trafik.append({"rader": namn, "perioder": int(m.sum()), "andel_torkare": round(float(pf), 3), "bas": round(a, 3)})
    print(f"{namn:<28}{int(m.sum()):>10,}{pf:>24.1%}{a:>10.1%}")
UT["trafikproxy"] = trafik

# ── 4. Samma ögonblick: var vägen halare där torkarna gick? ──────────────────
rubrik("4. FRIKTION I SAMMA TIOMINUTERSPERIOD — MED OCH UTAN TORKARE")
nu = ~np.isnan(fric) & rapport
print(f"{'':<22}{'med torkare: median':>21}{'andel < 0,30':>14}{'utan torkare: median':>23}{'andel < 0,30':>14}")
samtidigt = []
for namn, tm in [("natt/morgon 01–08", np.isin(timme, range(1, 9))), ("dagtid 09–19", np.isin(timme, range(9, 20)))]:
    a, b = fric[nu & fukt & tm[None, :]], fric[nu & ~fukt & tm[None, :]]
    samtidigt.append({"tid": namn, "med_median": round(float(np.median(a)), 3), "med_lag": round(float((a < GRANS).mean()), 3),
                      "utan_median": round(float(np.median(b)), 3), "utan_lag": round(float((b < GRANS).mean()), 3)})
    print(f"{namn:<22}{np.median(a):>21.2f}{(a < GRANS).mean():>14.1%}{np.median(b):>23.2f}{(b < GRANS).mean():>14.1%}")
UT["samtidigt"] = samtidigt

# ── 5. Gick halkans början att se? ───────────────────────────────────────────
rubrik("5. HALKANS BÖRJAN")
lag = ~np.isnan(fric) & (fric < GRANS)
hog = ~np.isnan(fric) & (fric >= GRANS)
ep = redan = 0
per_timme = np.zeros(24, dtype=int)
for l in np.nonzero(lag.any(axis=1))[0]:
    for natt, (b0, b1) in enumerate(((0, 72), (72, NB))):
        bs = np.nonzero(lag[l, b0:b1])[0]
        if not len(bs): continue
        b = b0 + bs[0]; ep += 1; per_timme[timme[b]] += 1
        if not hog[l, b0:b].any(): redan += 1          # ingen mätning med grepp före — vägen var hal första gången någon mätte
print(f"halkaepisoder (första friktion < 0,30 per avsnitt och natt): {ep:,} · varav vägen redan var hal vid avsnittets FÖRSTA "
      f"friktionsmätning den natten: {redan:,} = {redan / ep:.1%}")
print("episodernas 'början' per timme (svensk tid):", {h: int(per_timme[h]) for h in range(24) if per_timme[h]})
f01 = fric[:, 0:6][~np.isnan(fric[:, 0:6])]
print(f"friktionen under datans FÖRSTA timme (01:00–01:50): median {np.median(f01):.2f}, andel < 0,30: {(f01 < GRANS).mean():.1%} "
      f"({len(f01):,} värden)")
UT["borjan"] = {"episoder": ep, "redan_hal_vid_forsta_matning": redan, "andel": round(redan / ep, 3),
                "forsta_timmen_median": round(float(np.median(f01)), 3), "forsta_timmen_lag": round(float((f01 < GRANS).mean()), 3)}

ut = D / "nira-efterhandstest-granskning.json" if len(sys.argv) < 2 else Path(sys.argv[1])   # aldrig i repot
ut.write_text(json.dumps(UT, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
print(f"\naggregaten skrivna till {ut}")
