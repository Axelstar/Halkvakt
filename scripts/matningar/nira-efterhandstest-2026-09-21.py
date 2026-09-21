# Efterhandstestet på Niras exempeldag (Stockholm 2024-01-15) — kort #230, upplägget låst i DECISIONS #286 FÖRE körningen.
#
# Frågan (Bengt 21/9): hade vårt system larmat på det inlämnade materialet — med BÅDE motorns regel och skuggmotorns
# kommande regel? Niras material är indata; Niras friktion är facit.
#
# ERSÄTTARE, och det är testets viktigaste reservation: Halkvakts regler läser vägytans temperatur och stationens nederbörd.
# Här: yta ≈ bilarnas LUFTtemperatur · fukt ≈ torkarna igång samma tio minuter · regn inom 2 h ≈ torkarna igång någon gång
# de två senaste timmarna · fall ≈ lufttemperaturens fall över 30 min (räknat som publish/trenden.ts). Varje vägavsnitt är
# en station. Givarvakten (daggpunkten) går inte att tillämpa; värdevakt: lufttemperatur utanför −35…+15 °C bort.
#
# REGLERNA, LÅSTA:
#   1. Motorn (engine.ts:213–218): yta ≤ +1 °C och fukt.
#   2. Efterhalkan, startvärdena (DECISIONS #222/#225, sql/028): yta +1…+3 °C · fall ≥ 0,8 °C på 30 min · regn > 0 inom 2 h;
#      en episod per avsnitt och natt (middag till middag UTC).
# FACIT: friktion under gränsen på samma avsnitt inom (t, t + 90 min]. Gränsen 0,30; känslighet 0,25 och 0,35.
#
# INDATA LIGGER INTE I REPOT (Niras villkor). Skriptet skriver bara aggregat, och resultatfilen hamnar i Hämtade filer.
import io, json, sys
from pathlib import Path
import numpy as np
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
D = Path.home() / "Downloads"
STEG = 600_000                      # tio minuter i ms
GRANSER = (0.25, 0.30, 0.35)
HUVUDGRANS = 0.30
FONSTER = 9                         # (t, t + 90 min] = nio perioder framåt
UT = {"upplagg": "DECISIONS #286"}

# ── Läs och lägg allt på samma rutnät: vägavsnitt × 144 tiominutersperioder ──
lt = pd.read_csv(D / "Air_temperature_Stockholm_2024-01-15.csv", usecols=["timestamp", "link_id", "temperature"])
to = pd.read_csv(D / "Wiper_speed_Stockholm_2024-01-15.csv", usecols=["timestamp", "link_id", "wiper_speed"])
fr = pd.read_csv(D / "Friction_Stockholm_2024-01-15.csv", usecols=["timestamp", "link_id", "friction_average"])
T0 = int(min(lt["timestamp"].min(), to["timestamp"].min(), fr["timestamp"].min()))
NB = int((max(lt["timestamp"].max(), to["timestamp"].max(), fr["timestamp"].max()) - T0) // STEG) + 1
lankar = np.union1d(np.union1d(lt["link_id"].unique(), to["link_id"].unique()), fr["link_id"].unique())
idx = {l: i for i, l in enumerate(lankar)}
L = len(lankar)
bortvakt = int(((lt["temperature"] < -35) | (lt["temperature"] > 15)).sum())
lt = lt[(lt["temperature"] >= -35) & (lt["temperature"] <= 15)]

def rutnat(df, kol, hur):
    g = df.assign(b=((df["timestamp"] - T0) // STEG).astype(int)).groupby(["link_id", "b"])[kol].agg(hur).reset_index()
    m = np.full((L, NB), np.nan)
    m[g["link_id"].map(idx).to_numpy(), g["b"].to_numpy()] = g[kol].to_numpy()
    return m

temp = rutnat(lt, "temperature", "median")                  # yta-ersättaren
tork = rutnat(to, "wiper_speed", "max")                     # > 0 = torkarna igång
fric = rutnat(fr, "friction_average", "min")                # lägsta på avsnittet i perioden
rapport = ~np.isnan(temp)
fukt = np.nan_to_num(tork, nan=0.0) > 0
print(f"rutnät: {L:,} vägavsnitt × {NB} perioder från {pd.to_datetime(T0, unit='ms')} UTC · "
      f"lufttemp bort ur värdevakten: {bortvakt:,} rader")
UT["rutnat"] = {"vagavsnitt": L, "perioder": NB, "bort_vardevakt": bortvakt}

def facit(varn, grans):
    """Per varningsögonblick: träff / falsklarm / inget facit inom (t, t+90]; och om halkan redan fanns [t-90, t]."""
    l_, b_ = np.nonzero(varn)
    fram = np.full((len(l_), FONSTER), np.nan)
    bak = np.full((len(l_), FONSTER + 1), np.nan)
    for k in range(1, FONSTER + 1):
        ok = b_ + k < NB
        fram[ok, k - 1] = fric[l_[ok], b_[ok] + k]
    for k in range(0, FONSTER + 1):
        ok = b_ - k >= 0
        bak[ok, k] = fric[l_[ok], b_[ok] - k]
    finns = ~np.all(np.isnan(fram), axis=1)
    traff = np.nanmin(np.where(np.isnan(fram), np.inf, fram), axis=1) < grans
    redan = np.nanmin(np.where(np.isnan(bak), np.inf, bak), axis=1) < grans
    return {"ogonblick": int(len(l_)), "med_facit": int(finns.sum()), "traff": int((traff & finns).sum()),
            "falsklarm": int((~traff & finns).sum()), "inget_facit": int((~finns).sum()),
            "traffandel": round(float((traff & finns).sum() / max(finns.sum(), 1)), 3),
            "traff_dar_halkan_inte_redan_fanns": int((traff & finns & ~redan).sum()),
            "_l": l_, "_b": b_, "_traff": traff & finns}

def rubrik(s): print(f"\n{'=' * 8} {s} {'=' * max(3, 72 - len(s))}")

# ── Regel 1: motorn ──────────────────────────────────────────────────────────
motor = rapport & (temp <= 1.0) & fukt
kall = rapport & (temp <= 1.0)                          # "snöflingan": kallt, utan krav på fukt — jämförelse
rubrik("REGEL 1 — MOTORN: yta ≤ +1 °C och fukt (lufttemp och torkare som ersättare)")
print(f"perioder med bilrapport: {int(rapport.sum()):,} · med kallt (≤ +1 °C): {int(kall.sum()):,} · "
      f"med kallt OCH torkare: {int(motor.sum()):,} = motorns varningsögonblick")
print(f"avsnitt där motorn hade varnat minst en gång: {int(motor.any(axis=1).sum()):,} av {int(rapport.any(axis=1).sum()):,}")
res = {}
for g in GRANSER:
    bas, m, k = facit(rapport, g), facit(motor, g), facit(kall, g)
    res[g] = {"bas": bas, "motor": m, "kall": k}
    print(f"gräns {g:.2f}: basnivå (larma på allt) {bas['traffandel']:.1%} · motorn {m['traffandel']:.1%} "
          f"({m['traff']:,} träffar, {m['falsklarm']:,} falsklarm, {m['inget_facit']:,} utan facit) · "
          f"bara kallt {k['traffandel']:.1%}")
m30 = res[HUVUDGRANS]["motor"]
print(f"träffar där halkan INTE redan fanns på avsnittet de 90 min före (gräns 0,30): "
      f"{m30['traff_dar_halkan_inte_redan_fanns']:,} av {m30['traff']:,}")
UT["motor"] = {str(g): {k: {kk: vv for kk, vv in v.items() if not kk.startswith('_')} for k, v in r.items()} for g, r in res.items()}

# ── Halkaepisoder: föregicks de av en varning? ───────────────────────────────
rubrik("HALKAEPISODER — FÖREGICKS DE AV EN MOTORVARNING PÅ AVSNITTET (INOM 90 MIN FÖRE)?")
natt = lambda b: 0 if b < 72 else 1           # middag till middag UTC: 00:00–11:50 hör till natten mot 15/1
epi = []
for g in GRANSER:
    lag = ~np.isnan(fric) & (fric < g)
    n = foregangen = rapport_fore = kant = 0; forsprang = []
    for l in np.nonzero(lag.any(axis=1))[0]:
        sedda = set()
        for b in np.nonzero(lag[l])[0]:
            if natt(b) in sedda: continue
            sedda.add(natt(b)); n += 1
            if b < FONSTER: kant += 1
            fore = slice(max(0, b - FONSTER), b)
            if rapport[l, fore].any(): rapport_fore += 1
            v = np.nonzero(motor[l, fore])[0]
            if len(v): foregangen += 1; forsprang.append((b - (max(0, b - FONSTER) + v[0])) * 10)
    rad = {"grans": g, "episoder": n, "foregangna": foregangen, "andel": round(foregangen / max(n, 1), 3),
           "med_bilrapport_fore": rapport_fore, "i_forsta_90_min": kant,
           "forsprang_median_min": float(np.median(forsprang)) if forsprang else None}
    epi.append(rad)
    print(f"gräns {g:.2f}: {n:,} halkaepisoder · {foregangen:,} föregicks av en motorvarning ({rad['andel']:.1%}) · "
          f"{rapport_fore:,} hade alls en bilrapport före · försprång median {rad['forsprang_median_min']} min · "
          f"{kant:,} började under datans första 90 min")
UT["halkaepisoder"] = epi

# ── Regel 2: skuggmotorns kommande regel, efterhalkan ────────────────────────
rubrik("REGEL 2 — SKUGGMOTORN: EFTERHALKAN (yta +1…+3 · fall ≥ 0,8 °C/30 min · regn inom 2 h)")
band = rapport & (temp >= 1.0) & (temp <= 3.0)
lut = np.full((L, NB), np.nan)
for l, b in zip(*np.nonzero(band)):              # publish/trenden.ts: ≥ 3 värden i [t−30, t], inget hopp > 3 °C
    f = [temp[l, j] for j in range(max(0, b - 3), b + 1) if not np.isnan(temp[l, j])]
    if len(f) < 3 or any(abs(f[j] - f[j - 1]) > 3 for j in range(1, len(f))): continue
    lut[l, b] = round((f[0] - f[-1]) * 1000) / 1000
faller = band & (np.nan_to_num(lut, nan=-99) >= 0.8)
blot = np.zeros((L, NB), dtype=bool)
for b in range(NB):                              # regn > 0 i (t − 2 h, t] = de elva föregående perioderna och t
    blot[:, b] = fukt[:, max(0, b - 11): b + 1].any(axis=1)
eft = faller & blot
ep_eft = sum(len({natt(b) for b in np.nonzero(eft[l])[0]}) for l in np.nonzero(eft.any(axis=1))[0])
print(f"i startbandet +1…+3 °C: {int(band.sum()):,} ögonblick på {int(band.any(axis=1).sum()):,} avsnitt · "
      f"lutning räkningsbar: {int((~np.isnan(lut)).sum()):,} · fall ≥ 0,8: {int(faller.sum()):,} · "
      f"och blöt: {int(eft.sum()):,} ögonblick = {ep_eft:,} episoder")
e30 = facit(eft, HUVUDGRANS) if eft.any() else None
if e30: print(f"efterhalkans facit (gräns 0,30): {e30['traff']} träffar, {e30['falsklarm']} falsklarm, {e30['inget_facit']} utan facit")
UT["efterhalka"] = {"band": int(band.sum()), "band_avsnitt": int(band.any(axis=1).sum()), "lutning_raknad": int((~np.isnan(lut)).sum()),
                    "faller": int(faller.sum()), "fyrar": int(eft.sum()), "episoder": ep_eft,
                    "facit_030": {k: v for k, v in e30.items() if not k.startswith('_')} if e30 else None}

# ── Per timme ────────────────────────────────────────────────────────────────
rubrik("PER TIMME (svensk tid) — MOTORN MOT BASNIVÅN, GRÄNS 0,30")
b30 = res[HUVUDGRANS]["bas"]
timme = []
print(f"{'kl':>3}{'varningsögonbl.':>17}{'motorns träff':>15}{'basnivå':>10}{'torkare på':>12}")
for h in range(24):
    bins = [b for b in range(NB) if (b // 6 + 1) % 24 == h]
    vm = np.isin(m30["_b"], bins); vb_ = np.isin(b30["_b"], bins); mn = vm.sum()
    def andel(r, sel):                           # träffandel bland ögonblick som HAR facit
        l_, b_ = r["_l"][sel], r["_b"][sel]
        fram = np.stack([np.where(b_ + k < NB, fric[l_, np.minimum(b_ + k, NB - 1)], np.nan) for k in range(1, FONSTER + 1)], axis=1) if len(l_) else np.empty((0, FONSTER))
        finns = ~np.all(np.isnan(fram), axis=1)
        return (r["_traff"][sel].sum() / finns.sum()) if finns.sum() else float("nan")
    am, ab = andel(m30, vm), andel(b30, vb_)
    tp = float(fukt[:, bins][rapport[:, bins]].mean()) if rapport[:, bins].any() else float("nan")
    timme.append({"kl": h, "varningar": int(mn), "motor": None if np.isnan(am) else round(float(am), 3),
                  "bas": None if np.isnan(ab) else round(float(ab), 3), "torkare": round(tp, 3)})
    print(f"{h:>3}{int(mn):>17,}{am:>15.1%}{ab:>10.1%}{tp:>12.1%}")
UT["per_timme"] = timme

ut = D / "nira-efterhandstest-resultat.json" if len(sys.argv) < 2 else Path(sys.argv[1])   # aldrig i repot
ut.write_text(json.dumps(UT, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
print(f"\naggregaten skrivna till {ut}")
