# Niras exempeldata (Winter Road Insights, Stockholm 2024-01-15) mot utredningens fyra frågor.
# Kort #229, docs/NIRA-UTREDNING-2026-09-21.md §9. Engångsmätning 21/9 2026.
#
# INDATA LIGGER INTE I REPOT: Niras filer hämtas via formuläret på niradynamics.com/products/winter-road-insights
# och får enligt villkoren inte spridas vidare. Skriptet läser dem ur Hämtade filer och skriver bara aggregat.
#
#   1. Hur tät är datan — i stan och per vägklass?
#   2. Hur färsk — hur ofta mäts samma vägavsnitt, och hur gammal är bilden en tidig morgon?
#   3. Går det mätta att skilja från det modellerade?
#   4. Är friktionen händelsestyrd (Trafikverket 2021: "främst eventbaserad")? Prov: friktionens täckning mot
#      lufttemperaturens, som bilen rapporterar oavsett körsätt, per vägklass.
import io, json, math, sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
D = Path.home() / "Downloads"
FIL = {"friktion": D / "Friction_Stockholm_2024-01-15.csv",
       "torkare": D / "Wiper_speed_Stockholm_2024-01-15.csv",
       "lufttemp": D / "Air_temperature_Stockholm_2024-01-15.csv"}
VARDE = {"friktion": "friction_average", "torkare": "wiper_speed", "lufttemp": "temperature"}
NYCKEL = ["timestamp", "link_id", "sub_link_first_id", "sub_link_last_id", "functional_road_class"]
CET = pd.Timedelta(hours=1)          # januari: svensk tid = UTC+1, ingen sommartid
SERGEL = (18.0686, 59.3326)          # Sergels torg — samma mittpunkt som kort #93:s radie
UT = {}

def km(lon1, lat1, lon2, lat2):
    r = 6371.0088
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))

def linjelangd_m(wkt):
    tal = np.array([float(x) for x in wkt[wkt.index("(") + 1: wkt.rindex(")")].replace(",", " ").split()])
    lon, lat = tal[0::2], tal[1::2]
    return float(km(lon[:-1], lat[:-1], lon[1:], lat[1:]).sum() * 1000) if len(lon) > 1 else 0.0

def las(namn, med_geometri):
    kol = NYCKEL + [VARDE[namn]] + (["friction_min", "friction_max"] if namn == "friktion" else []) \
        + (["geometry_wkt"] if med_geometri else [])
    df = pd.read_csv(FIL[namn], usecols=kol, dtype={"link_id": "int64", "sub_link_first_id": "int32",
                     "sub_link_last_id": "int32", "functional_road_class": "int8"})
    df["lokal"] = pd.to_datetime(df["timestamp"], unit="ms") + CET
    return df

def rubrik(s): print(f"\n{'=' * 8} {s} {'=' * (70 - len(s))}")

# ── Läs ──────────────────────────────────────────────────────────────────────
fr = las("friktion", med_geometri=True)
to = las("torkare", med_geometri=False)
lt = las("lufttemp", med_geometri=False)

# ── Grundfakta per fil ───────────────────────────────────────────────────────
rubrik("GRUNDFAKTA")
for namn, df in (("friktion", fr), ("torkare", to), ("lufttemp", lt)):
    steg = np.diff(np.unique(df["timestamp"])) / 60000
    rad = {"rader": len(df), "tidpunkter": int(df["timestamp"].nunique()),
           "steg_min": float(pd.Series(steg).mode().iloc[0]) if len(steg) else None,
           "forsta": str(df["lokal"].min()), "sista": str(df["lokal"].max()),
           "vagavsnitt": int(df["link_id"].nunique())}
    UT[f"grund_{namn}"] = rad
    print(f"{namn:<9} {rad['rader']:>9,} rader · {rad['tidpunkter']} tidpunkter à {rad['steg_min']} min · "
          f"{rad['forsta'][:16]} → {rad['sista'][:16]} (svensk tid) · {rad['vagavsnitt']:,} vägavsnitt")

# ── Delsträckornas längd och utbredningen ────────────────────────────────────
rubrik("TÄTHET — FRIKTION")
unika = fr.drop_duplicates(["link_id", "sub_link_first_id", "sub_link_last_id"]).copy()
prov = unika.sample(min(4000, len(unika)), random_state=1)
prov["n"] = prov["sub_link_last_id"] - prov["sub_link_first_id"] + 1
prov["m_per_del"] = [linjelangd_m(w) for w in prov["geometry_wkt"]] / prov["n"]
del_m = float(prov["m_per_del"].median())
print(f"delsträckans längd, median över {len(prov):,} prov: {del_m:.1f} m (Nira: 25 m)")

def utbred(df):
    n = (df["sub_link_last_id"] - df["sub_link_first_id"] + 1).to_numpy()
    lank = np.repeat(df["link_id"].to_numpy(), n)
    start = np.repeat(df["sub_link_first_id"].to_numpy(), n)
    offs = np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)
    return pd.DataFrame({"link_id": lank, "del": start + offs, "frc": np.repeat(df["functional_road_class"].to_numpy(), n)})

xy = fr["geometry_wkt"].str.extract(r"LINESTRING \(([-\d.]+) ([-\d.]+)").astype(float)
fr["km_sergel"] = km(SERGEL[0], SERGEL[1], xy[0].to_numpy(), xy[1].to_numpy())

rader = []
for frc in sorted(fr["functional_road_class"].unique()):
    d = fr[fr["functional_road_class"] == frc]
    dl = utbred(d.drop_duplicates(["link_id", "sub_link_first_id", "sub_link_last_id"])).drop_duplicates(["link_id", "del"])
    rader.append({"vagklass": int(frc), "vagavsnitt": int(d["link_id"].nunique()), "delstrackor": len(dl),
                  "km": round(len(dl) * del_m / 1000, 1)})
alla = utbred(fr.drop_duplicates(["link_id", "sub_link_first_id", "sub_link_last_id"])).drop_duplicates(["link_id", "del"])
inom8 = fr[fr["km_sergel"] <= 8]
dl8 = utbred(inom8.drop_duplicates(["link_id", "sub_link_first_id", "sub_link_last_id"])).drop_duplicates(["link_id", "del"])
print(f"{'vägklass':<9}{'vägavsnitt':>11}{'delsträckor':>13}{'km väg':>9}")
for r in rader: print(f"{r['vagklass']:<9}{r['vagavsnitt']:>11,}{r['delstrackor']:>13,}{r['km']:>9,}")
print(f"{'alla':<9}{fr['link_id'].nunique():>11,}{len(alla):>13,}{len(alla) * del_m / 1000:>9,.1f}")
print(f"inom 8 km från Sergels torg: {inom8['link_id'].nunique():,} vägavsnitt, {len(dl8):,} delsträckor ≈ "
      f"{len(dl8) * del_m / 1000:,.1f} km väg med minst en friktionsmätning under dygnet "
      f"(Halkvakt, samma radie: 7 stationer — kort #93)")
print(f"yttersta punkt från Sergels torg: {fr['km_sergel'].max():.1f} km")
UT["tathet"] = {"del_m": del_m, "per_vagklass": rader, "alla_km": round(len(alla) * del_m / 1000, 1),
                "inom8_vagavsnitt": int(inom8["link_id"].nunique()), "inom8_km": round(len(dl8) * del_m / 1000, 1),
                "max_km": round(float(fr["km_sergel"].max()), 1)}

# ── Färskhet ─────────────────────────────────────────────────────────────────
rubrik("FÄRSKHET — FRIKTION")
per = fr.groupby(["functional_road_class", "link_id"])["timestamp"].apply(lambda s: np.sort(s.unique()))
fars = []
print(f"{'vägklass':<9}{'vägavsn.':>9}{'tidp./avsn. median':>20}{'bara en gång':>14}{'lucka median min':>18}")
for frc, grupp in per.groupby(level=0):
    antal = grupp.apply(len)
    luckor = grupp[antal >= 2].apply(lambda a: float(np.median(np.diff(a))) / 60000)
    rad = {"vagklass": int(frc), "vagavsnitt": int(len(grupp)), "tidpunkter_median": float(antal.median()),
           "andel_en_gang": round(float((antal == 1).mean()), 3),
           "lucka_median_min": round(float(luckor.median()), 1) if len(luckor) else None}
    fars.append(rad)
    print(f"{rad['vagklass']:<9}{rad['vagavsnitt']:>9,}{rad['tidpunkter_median']:>20}{rad['andel_en_gang']:>14.1%}"
          f"{str(rad['lucka_median_min']):>18}")
UT["farskhet"] = fars

print("\nhur gammal är friktionsbilden? — för vägavsnitt som mäts någon gång under dygnet:")
dygnstart = fr["lokal"].min().normalize()
senast = fr.groupby(["functional_road_class", "link_id"])["lokal"].apply(lambda s: np.sort(s.unique()))
alder = []
for klock in (3, 5, 7, 12):
    T = dygnstart + pd.Timedelta(hours=klock)
    for frc, grupp in senast.groupby(level=0):
        fore = grupp.apply(lambda a: a[a <= np.datetime64(T)])
        matt = fore.apply(len) > 0
        age = fore[matt].apply(lambda a: (np.datetime64(T) - a[-1]) / np.timedelta64(1, "m"))
        alder.append({"klockan": klock, "vagklass": int(frc),
                      "andel_matt_sedan_midnatt": round(float(matt.mean()), 3),
                      "andel_inom_60_min": round(float((age <= 60).sum() / len(grupp)), 3),
                      "alder_median_min": round(float(age.median()), 0) if len(age) else None})
print(f"{'kl':>4}{'vägklass':>10}{'mätt sedan 00':>15}{'mätt senaste 60 min':>21}{'ålder median min':>18}")
for a in alder:
    print(f"{a['klockan']:>4}{a['vagklass']:>10}{a['andel_matt_sedan_midnatt']:>15.1%}{a['andel_inom_60_min']:>21.1%}"
          f"{str(a['alder_median_min']):>18}")
UT["alder"] = alder

rubrik("DYGNET — VÄGAVSNITT MED FRIKTIONSMÄTNING PER TIMME")
tim = fr.assign(h=fr["lokal"].dt.hour).groupby("h")["link_id"].nunique()
tim_lt = lt.assign(h=lt["lokal"].dt.hour).groupby("h")["link_id"].nunique()
for h in range(24):
    f_, l_ = int(tim.get(h, 0)), int(tim_lt.get(h, 0))
    print(f"{h:02d}  friktion {f_:>6,}  lufttemp {l_:>6,}  {'#' * round(60 * f_ / max(tim.max(), 1))}")
UT["per_timme"] = {int(h): {"friktion": int(tim.get(h, 0)), "lufttemp": int(tim_lt.get(h, 0))} for h in range(24)}

# ── Mätt eller modellerat ────────────────────────────────────────────────────
rubrik("MÄTT ELLER MODELLERAT")
print("kolumner i friktionsfilen:", ", ".join(pd.read_csv(FIL["friktion"], nrows=0).columns[1:]))
utanfor = int(((fr["friction_average"] < fr["friction_min"] - 1e-6) | (fr["friction_average"] > fr["friction_max"] + 1e-6)).sum())
print(f"rader där medelvärdet ligger utanför min–max: {utanfor:,} av {len(fr):,} ({utanfor / len(fr):.1%})")
UT["matt_modell"] = {"flagga_finns": False, "medel_utanfor_minmax": utanfor}

# ── Händelsestyrd? ───────────────────────────────────────────────────────────
rubrik("HÄNDELSESTYRD? — FRIKTION MOT LUFTTEMPERATUR, SAMMA AVSNITT OCH TIDPUNKT")
par_f = fr[["functional_road_class", "link_id", "timestamp"]].drop_duplicates()
par_t = lt[["functional_road_class", "link_id", "timestamp"]].drop_duplicates()
hand = []
print(f"{'vägklass':<9}{'par lufttemp':>14}{'par friktion':>14}{'båda':>10}{'friktion/lufttemp':>19}{'friktion när lufttemp finns':>29}")
for frc in sorted(par_t["functional_road_class"].unique()):
    a = par_t[par_t["functional_road_class"] == frc]
    b = par_f[par_f["functional_road_class"] == frc]
    bada = len(a.merge(b, on=["functional_road_class", "link_id", "timestamp"]))
    rad = {"vagklass": int(frc), "lufttemp": len(a), "friktion": len(b), "bada": bada,
           "kvot": round(len(b) / len(a), 3) if len(a) else None, "tackning": round(bada / len(a), 3) if len(a) else None}
    hand.append(rad)
    print(f"{rad['vagklass']:<9}{rad['lufttemp']:>14,}{rad['friktion']:>14,}{rad['bada']:>10,}{rad['kvot']:>19.2f}{rad['tackning']:>29.1%}")
UT["handelsestyrd"] = hand

# ── Friktion där ingen bil rapporterade ─────────────────────────────────────
# Lufttemperaturen och torkarna har exakt samma rader, alltså samma bilrapporter. Ett friktionsvärde i ett
# avsnitt och en period utan någon sådan rapport är antingen från andra bilar, eller fört vidare i tid eller rum.
rubrik("FRIKTION DÄR INGEN BIL RAPPORTERADE TEMPERATUR SAMMA TIO MINUTER")
fp = par_f.merge(par_t[["link_id", "timestamp"]].assign(rapport=1), on=["link_id", "timestamp"], how="left")
utan = fp[fp["rapport"].isna()].drop(columns="rapport").sort_values("timestamp")
tidigare = par_t[["link_id", "timestamp"]].rename(columns={"timestamp": "ts_rapport"}).sort_values("ts_rapport")
m = pd.merge_asof(utan, tidigare, left_on="timestamp", right_on="ts_rapport", by="link_id", direction="backward")
m["sedan_min"] = (m["timestamp"] - m["ts_rapport"]) / 60000
lank_utan_rapport = set(par_f["link_id"]) - set(par_t["link_id"])
utanr = []
print(f"{'vägklass':<9}{'friktionspar':>13}{'utan rapport':>14}{'rapport ≤30 min före':>22}{'≤120 min före':>15}{'ingen före':>12}")
for frc in sorted(fp["functional_road_class"].unique()):
    alla_p = fp[fp["functional_road_class"] == frc]
    mm = m[m["functional_road_class"] == frc]
    rad = {"vagklass": int(frc), "friktionspar": len(alla_p), "andel_utan_rapport": round(len(mm) / len(alla_p), 3),
           "inom_30": round(float((mm["sedan_min"] <= 30).mean()), 3) if len(mm) else None,
           "inom_120": round(float((mm["sedan_min"] <= 120).mean()), 3) if len(mm) else None,
           "ingen_fore": round(float(mm["sedan_min"].isna().mean()), 3) if len(mm) else None}
    utanr.append(rad)
    print(f"{rad['vagklass']:<9}{rad['friktionspar']:>13,}{rad['andel_utan_rapport']:>14.1%}{rad['inom_30']:>22.1%}"
          f"{rad['inom_120']:>15.1%}{rad['ingen_fore']:>12.1%}")
print(f"vägavsnitt med friktion men utan en enda temperaturrapport hela dygnet: {len(lank_utan_rapport):,} av "
      f"{par_f['link_id'].nunique():,}")
UT["utan_rapport"] = {"per_vagklass": utanr, "lankar_utan_rapport_hela_dygnet": len(lank_utan_rapport)}

# Följder: sammanhängande perioder per vägavsnitt. Långa följder när trafiken är gles talar för att värdet bärs.
rubrik("FÖLJDER — SAMMANHÄNGANDE TIOMINUTERSPERIODER MED FRIKTION")
def foljder(a):
    # längden (i perioder) på varje följd av på varandra följande tiominutersperioder
    brott = np.flatnonzero(np.diff(a) != 600000) + 1
    return np.diff(np.concatenate(([0], brott, [len(a)])))
fol = []
for frc, grupp in per.groupby(level=0):
    langder = np.concatenate([foljder(a) for a in grupp]) * 10
    natt = fr[(fr["functional_road_class"] == frc) & (fr["lokal"].dt.hour.between(1, 4))]
    natt_per = natt.groupby("link_id")["timestamp"].apply(lambda s: np.sort(s.unique()))
    nl = np.concatenate([foljder(a) for a in natt_per]) * 10 if len(natt_per) else np.array([])
    rad = {"vagklass": int(frc), "foljd_median_min": float(np.median(langder)),
           "foljd_p90_min": float(np.percentile(langder, 90)),
           "natt_foljd_median_min": float(np.median(nl)) if len(nl) else None}
    fol.append(rad)
    print(f"vägklass {rad['vagklass']}: följdens längd median {rad['foljd_median_min']:.0f} min, 90:e percentil "
          f"{rad['foljd_p90_min']:.0f} min · natten 01–05: median {rad['natt_foljd_median_min']} min")
UT["foljder"] = fol

# Medelvärde utanför min–max: avrundning eller bearbetning? min/max ser ut att vara lagrade i 1/255-steg.
rubrik("MEDELVÄRDET MOT MIN–MAX")
steg255 = np.isclose(fr["friction_min"] * 255, (fr["friction_min"] * 255).round(), atol=0.01).mean()
avv = np.maximum(fr["friction_min"] - fr["friction_average"], fr["friction_average"] - fr["friction_max"]).clip(lower=0)
print(f"friction_min i 1/255-steg: {steg255:.1%}")
print(f"medel utanför min–max med mer än 1/255 (0,004): {(avv > 1 / 255).mean():.1%} · med mer än 0,05: {(avv > 0.05).mean():.1%}"
      f" · största avvikelse {avv.max():.3f}")
UT["minmax"] = {"andel_1_255": round(float(steg255), 3), "utanfor_mer_an_1_255": round(float((avv > 1 / 255).mean()), 3),
                "utanfor_mer_an_005": round(float((avv > 0.05).mean()), 3), "max": round(float(avv.max()), 3)}

# ── Värdena ──────────────────────────────────────────────────────────────────
rubrik("VÄRDENA")
q = fr["friction_average"].quantile([0.05, 0.25, 0.5, 0.75, 0.95]).round(3).to_dict()
print("friktion, kvantiler 5/25/50/75/95 %:", q)
kl = pd.cut(fr["friction_average"], [0, 0.15, 0.3, 0.45, 0.6, 1.01], right=False).value_counts(normalize=True).sort_index()
print("friktion i klasser:", {str(k): f"{v:.1%}" for k, v in kl.items()})
t = lt["temperature"]
print(f"lufttemp: {t.min()} … {t.max()} °C · median {t.median()} · heltal: {(t == t.round()).mean():.1%} · "
      f"olika värden: {t.nunique()}")
w = to["wiper_speed"]
print(f"torkare: olika värden {w.nunique()} · vanligast {w.value_counts().head(6).to_dict()} · andel > 0: {(w > 0).mean():.1%}")
UT["varden"] = {"friktion_kvantiler": {str(k): v for k, v in q.items()},
                "lufttemp": {"min": float(t.min()), "max": float(t.max()), "median": float(t.median()),
                             "andel_heltal": round(float((t == t.round()).mean()), 3), "olika": int(t.nunique())},
                "torkare": {"olika": int(w.nunique()), "andel_over_noll": round(float((w > 0).mean()), 3),
                            "vanligast": {str(k): int(v) for k, v in w.value_counts().head(6).items()}}}

ut = D / "nira-exempeldata-resultat.json" if len(sys.argv) < 2 else Path(sys.argv[1])   # aldrig i repot
ut.write_text(json.dumps(UT, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
print(f"\naggregaten skrivna till {ut}")
