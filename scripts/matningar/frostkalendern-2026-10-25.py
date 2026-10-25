#!/usr/bin/env python3
"""Frostkalendern (DECISIONS #722): första frostnatten per län, hösten 2018–2022, ur VViS-leveransen (#666).

Per station: första dag (svensk lokaltid, som measuretime) från 1 augusti med tyta < 0,0 °C i minst två halvtimmar i följd.
−99,9 och värden utanför ±45 räknas inte. En station räknas en höst om den har mätningar i september, oktober och november.
Per län och höst: frostdagen = dagen då en fjärdedel av länets stationer haft sin första frostnatt; dessutom första och median.

Leveransen lämnar aldrig arbetsytan (PUBLIKT REPO). Utfallet är bara aggregat per län och höst.

  python3 -I frostkalendern-2026-10-25.py <mapp med Halkvakt_ÅÅÅÅ-2.csv.gz> <station_lan.json> <ut.json>
station_lan.json: [[station_id, länskod], …] ur STATION_LAN_SQL (supabase/functions/publicera, #458).
"""
import csv, datetime as dt, gzip, io, json, os, sys

HOSTAR = [2018, 2019, 2020, 2021, 2022]
LAN = {1: "Stockholms län", 3: "Uppsala län", 4: "Södermanland", 5: "Östergötland", 6: "Jönköpings län", 7: "Kronoberg",
       8: "Kalmar län", 9: "Gotland", 10: "Blekinge", 12: "Skåne", 13: "Halland", 14: "Västra Götaland", 17: "Värmland",
       18: "Örebro län", 19: "Västmanland", 20: "Dalarna", 21: "Gävleborg", 22: "Västernorrland", 23: "Jämtland",
       24: "Västerbotten", 25: "Norrbotten"}


def host(fil):
    forsta, foregaende, manader = {}, {}, {}
    with gzip.open(fil, "rt", encoding="utf-8-sig", newline="") as f:
        for r in csv.reader(f, delimiter=";"):
            if len(r) != 12 or r[0] == "measurepoint":
                continue   # rubriken och sidfotens fem rader (KUVOS-LEVERANSEN §1)
            st, tid, yta = r[0], r[1], r[2].replace(",", ".")
            try:
                t, y = dt.datetime.fromisoformat(tid[:19]), float(yta)
            except ValueError:
                continue
            manader.setdefault(st, set()).add(t.month)
            if st in forsta or t.month < 8 or y <= -99.8 or abs(y) > 45:
                foregaende[st] = None if (y <= -99.8 or abs(y) > 45) else (t, y)
                continue
            p = foregaende.get(st)
            # två halvtimmar i följd under noll: förra raden högst 40 min tidigare och också under noll
            if y < 0 and p and p[1] < 0 and dt.timedelta(0) < t - p[0] <= dt.timedelta(minutes=40):
                forsta[st] = p[0].date()
            foregaende[st] = (t, y)
    aktiva = {st for st, m in manader.items() if {9, 10, 11} <= m}
    return {st: d for st, d in forsta.items() if st in aktiva}, aktiva


def main():
    mapp, karta, ut = sys.argv[1:4]
    stl = {str(s): int(l) for s, l in json.load(open(karta, encoding="utf-8"))}
    res = {"beslut": "DECISIONS #722", "definition": "frostdag = dagen då en fjärdedel av länets stationer haft tyta < 0 °C två halvtimmar i följd",
           "hostar": {}}
    for ar in HOSTAR:
        forsta, aktiva = host(os.path.join(mapp, f"Halkvakt_{ar}-2.csv.gz"))
        per = {}
        for st in aktiva:
            if st in stl:
                per.setdefault(stl[st], {"aktiva": 0, "datum": []})
                per[stl[st]]["aktiva"] += 1
                if st in forsta:
                    per[stl[st]]["datum"].append(forsta[st])
        rad = {}
        for kod, v in sorted(per.items()):
            d, n = v["datum"], v["aktiva"]
            # en fjärdedel av ALLA aktiva stationer, också de som aldrig frös före årsskiftet
            q = sorted(d)[-(-n // 4) - 1] if len(d) >= -(-n // 4) else None
            rad[LAN.get(kod, str(kod))] = {"stationer": n, "fros_fore_nyar": len(d), "forsta": min(d).isoformat() if d else None,
                                           "frostdag": q.isoformat() if q else None,
                                           "median": sorted(d)[n // 2].isoformat() if len(d) > n // 2 else None}
        utan = len([s for s in aktiva if s not in stl])
        res["hostar"][str(ar)] = {"lan": rad, "stationer_utan_lan": utan, "aktiva": len(aktiva)}
        print(ar, "aktiva", len(aktiva), "utan län", utan, file=sys.stderr)
    json.dump(res, open(ut, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
