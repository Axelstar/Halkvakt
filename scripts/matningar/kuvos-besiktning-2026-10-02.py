# Kuvösens besiktning av Trafikverkets leverans (kort #232, DECISIONS #424; PLAN-KUVOSEN steg 3). LÄS-ONLY: ingenting skrivs
# någonstans utom till stdout. Fem filer, november 2024–mars 2025, levererade 2/10 av VViS Förvaltning (Micke Wallin).
#
# Inventeringen (kuvos/inventering.ts) gav kolumnerna och spannen. Det här går ett steg längre, utan att tolka koderna:
#   1. rader, stationer, och vilka id som inte finns i dagens stationslista (static.json på CDN, 854 stationer) — inget gissas
#   2. tidsupplösningen: minut och sekund i varje stämpel, dubbletter per station och halvtimme
#   3. SOMMARTIDEN: finns stämplar mellan 02:00 och 03:00 den 30/3 2025? I svensk lokaltid finns den timmen inte.
#   4. platshållarna per fält (−99,9 · −9 · −100 · 20 000) och spannet utan dem, med percentiler
#   5. nederbördstypens koder: antal per kod, och per kod fördelningen av lufttemperatur och mängd — beskrivning, ingen översättning
#   6. de tre vindfälten mot varandra: hur ofta vimax ≥ vind30 ≥ vimed
# Formatet (läst 2/10): semikolon, DECIMALKOMMA, BOM, riktningen med efterställt mellanslag ("N "), och SSMS-sidfoten
# "(N rows affected)" + "Completion time" efter två tomma rader — de raderna räknas som fel antal fält och hoppas över.
# Kör: python scripts/matningar/kuvos-besiktning-2026-10-02.py <mapp med Halkvakt_YYMM.csv> <static.json>
import collections, io, json, math, os, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
MAPP, STATIC = sys.argv[1], sys.argv[2]
MANADER = ["2411", "2412", "2501", "2502", "2503"]
FALT = ["tyta", "tluft", "daggp", "lu_fu", "ned_typ", "ned_maengd", "vimax", "vimed", "vind30", "siktdjup"]
# Platshållarna per fält: −9 är en riktig temperatur, så den räknas bara som platshållare i kodfälten (andra körningen 2/10).
PLATSHALLARE = {k: {-99.9} for k in FALT}
PLATSHALLARE["ned_typ"] = {-9.0}
PLATSHALLARE["siktdjup"] = {-100.0, 20000.0}
# Utanför fysiken men inte en känd platshållare: skrivs ut med de vanligaste värdena, så att en okänd kod syns (VÄRDEVAKTEN).
MISSTANKT = {"tyta": (-45, 45), "tluft": (-45, 35), "daggp": (-50, 30), "lu_fu": (0, 100), "ned_maengd": (0, 100),
             "vimax": (0, 60), "vimed": (0, 40), "vind30": (0, 60)}
misstankt = {k: collections.Counter() for k in FALT}

dagens = {s["id"] for s in json.load(io.open(STATIC, encoding="utf-8"))["stations"]}

def pct(xs, p):
    if not xs: return None
    k = (len(xs) - 1) * p / 100; f = math.floor(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)

stationer_tot = collections.Counter()
platshallare = {f: collections.Counter() for f in FALT}
varden = {f: [] for f in FALT}
typ_antal = collections.Counter()
typ_luft = collections.defaultdict(lambda: collections.Counter())
typ_mangd = collections.defaultdict(list)
minut = collections.Counter(); sekund = collections.Counter()
dubbletter = 0; rader_tot = 0; fel_rader = 0
sommartid = collections.Counter()
vind = collections.Counter()
per_manad = []

for m in MANADER:
    fil = os.path.join(MAPP, f"Halkvakt_{m}.csv")
    rader = 0; st = collections.Counter(); sett = set(); forsta = sista = None
    with io.open(fil, encoding="utf-8", newline="") as fh:
        rubrik = fh.readline().strip().lstrip("﻿").split(";")
        idx = {k: i for i, k in enumerate(rubrik)}
        for rad in fh:
            f = rad.rstrip("\r\n").split(";")
            if len(f) != len(rubrik): fel_rader += 1; continue
            rader += 1
            sid = f[idx["measurepoint"]]; t = f[idx["measuretime"]]
            st[sid] += 1
            forsta = t if forsta is None or t < forsta else forsta
            sista = t if sista is None or t > sista else sista
            mm, ss = t[14:16], t[17:19]
            minut[mm] += 1; sekund[ss] += 1
            halv = t[:13] + (":00" if int(mm) < 30 else ":30")
            nyckel = (sid, halv)
            if nyckel in sett: dubbletter += 1
            else: sett.add(nyckel)
            if t.startswith("2025-03-30 0"): sommartid[t[11:13]] += 1
            v = {}
            for k in FALT:
                s = f[idx[k]]
                try: x = float(s.replace(",", "."))   # decimalkomma i leveransen (SSMS-export, svensk lokal)
                except ValueError: continue
                v[k] = x
                if x in PLATSHALLARE[k]: platshallare[k][x] += 1; continue
                lo_hi = MISSTANKT.get(k)
                if lo_hi and not (lo_hi[0] <= x <= lo_hi[1]): misstankt[k][x] += 1; continue
                varden[k].append(x)
            if "ned_typ" in v:
                typ = int(v["ned_typ"]); typ_antal[typ] += 1
                lu = v.get("tluft")
                if lu is not None and lu not in PLATSHALLARE["tluft"]:
                    typ_luft[typ]["≤ −2" if lu <= -2 else ("−2…+2" if lu < 2 else "≥ +2")] += 1
                nm = v.get("ned_maengd")
                if nm is not None and nm not in PLATSHALLARE["ned_maengd"] and len(typ_mangd[typ]) < 200000: typ_mangd[typ].append(nm)
            a, b, c = v.get("vimax"), v.get("vind30"), v.get("vimed")
            if None not in (a, b, c) and -99.9 not in (a, b, c):
                vind["vimax ≥ vind30"] += a >= b; vind["vind30 ≥ vimed"] += b >= c; vind["vimax ≥ vimed"] += a >= c; vind["n"] += 1
    rader_tot += rader; stationer_tot.update(st)
    per_manad.append((m, rader, len(st), forsta, sista, sorted(st.values())[len(st) // 2]))

print("KUVÖSENS BESIKTNING — läs-only, inga tolkningar av koder\n")
print("Per månad: fil · rader · stationer · första · sista · rader per station (median)")
for r in per_manad: print("  ", *r)
print(f"\nTotalt {rader_tot} rader, {len(stationer_tot)} stationer, {fel_rader} rader med fel antal fält (SSMS-sidfoten väntas ge 2 per fil)")
utan = sorted(set(stationer_tot) - dagens, key=lambda s: int(s) if s.isdigit() else 0)
saknas = sorted(dagens - set(stationer_tot), key=lambda s: int(s) if s.isdigit() else 0)
print(f"Stationer i leveransen som INTE finns i dagens lista ({len(dagens)}): {len(utan)} — {utan[:40]}{' …' if len(utan) > 40 else ''}")
print(f"Stationer i dagens lista som INTE finns i leveransen: {len(saknas)} — {saknas[:40]}{' …' if len(saknas) > 40 else ''}")
print(f"\nMinut i stämpeln (topp 6): {minut.most_common(6)}")
print(f"Sekund i stämpeln (topp 6): {sekund.most_common(6)}")
print(f"Dubbletter per station och halvtimme: {dubbletter}")
print(f"\nSOMMARTIDEN 30/3 2025, rader per timme 00–09: {[(h, sommartid.get(h, 0)) for h in ['00','01','02','03','04','05','06','07','08','09']]}")
print("  Svensk lokaltid hoppar 02:00 → 03:00 den natten. Saknas timmen 02 är stämplarna lokaltid; finns den är de UTC (eller annan fast zon).")
print("\nPlatshållare och spann utan dem (p0,1 · p1 · median · p99 · p99,9 · max)")
for k in FALT:
    xs = sorted(varden[k]); n = len(xs) + sum(platshallare[k].values())
    ph = ", ".join(f"{int(x) if x == int(x) else x}: {c} ({100 * c / n:.1f} %)" for x, c in sorted(platshallare[k].items()))
    if xs:
        print(f"  {k:10} n {n} · platshållare [{ph or 'inga'}] · min {xs[0]} · "
              + " · ".join(f"{pct(xs, p):.1f}" for p in (0.1, 1, 50, 99, 99.9)) + f" · max {xs[-1]}")
    if misstankt[k]:
        tot = sum(misstankt[k].values())
        print(f"  {'':10} UTANFÖR {MISSTANKT[k]}: {tot} rader ({100 * tot / n:.2f} %), vanligast " + ", ".join(f"{x}: {c}" for x, c in misstankt[k].most_common(6)))
print("\nNederbördstypens koder (beskrivning, ingen översättning): kod · antal · lufttemperatur ≤ −2 / −2…+2 / ≥ +2 · mängd: andel > 0, median > 0")
for typ in sorted(typ_antal):
    lu = typ_luft[typ]; s = sum(lu.values()) or 1
    mg = typ_mangd[typ]; pos = sorted(x for x in mg if x > 0)
    print(f"  {typ:>3} · {typ_antal[typ]:>8} · " + " / ".join(f"{100 * lu[b] / s:4.1f} %" for b in ("≤ −2", "−2…+2", "≥ +2"))
          + f" · {100 * len(pos) / (len(mg) or 1):5.1f} % · {pct(pos, 50) if pos else '–'}")
n = vind.pop("n", 0)
print(f"\nVindfälten, {n} rader utan platshållare: " + " · ".join(f"{k} {100 * v / (n or 1):.1f} %" for k, v in vind.items()))
