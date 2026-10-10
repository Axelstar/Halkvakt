"""MET Nordic as the weather for the physics chain — nivå 2 of the weather source (kort #319, DECISIONS #509).

Builds the forcing dict F with the same keys, shapes, station order and hourly index as common.load() builds from
ECMWF, but from the kuvös release kuvos-metnordic-2024-25 (station_id,tid_utc,t2m_c,rh2m,vind10_ms,moln,nederbord_mm,
langvag_jm2,kortvag_jm2; hourly 31/10 2024 – 31/3 2025 UTC). The replacements follow fysik/README.md (Axel's recommendation):
  td        dew point from t2m and rh with Magnus over water, as nivå 1b (b 17.62, c 243.12); rh clipped to [0.01, 1]
  cloud     moln, already a fraction 0..1
  sw, lw    J/m² per hour / 3600 → W/m²; sw clipped at 0 (the release holds calculation noise down to −1 000 J/m²)
  snowfall  MET Nordic has no snowfall column: precipitation at air ≤ +1 °C counts as snow, 7 cm per mm of water —
            the unit common.load() gets from Open-Meteo, so the degree-day snowpack (swe) is computed as before
  spin-up   the release starts 31/10; the hours before it (10/10–30/10) come from the ECMWF cache (ifs/), so idx, the
            45-day and 72-hour windows and the row sampling are identical to the control. lw is NaN there and the
            physics falls back to Brutsaert (fysik_lw.run_lw)
  elev_diff 0: the 1 km grid stands at the station's own height, so no lapse correction
Nothing from the road stations enters F; obs and aux are the control's.
"""
import numpy as np
import pandas as pd
from common import load as load_ec

FALT = ["t2m_c", "rh2m", "vind10_ms", "moln", "nederbord_mm", "langvag_jm2", "kortvag_jm2"]
SNO_T_C = 1.0        # precipitation is snow at or below this air temperature
CM_PER_MM = 7.0      # Open-Meteo's snowfall unit: cm of snow per mm of water equivalent


def magnus_td(t, rh):
    """Dew point (°C) from air (°C) and relative humidity (fraction), Magnus over water as in nivå 1b."""
    g = np.log(np.clip(rh, 0.01, 1.0)) + 17.62 * t / (243.12 + t)
    return 243.12 * g / (17.62 - g)


def las_metnordic(fil, sids):
    d = pd.read_csv(fil, dtype={"station_id": str}, parse_dates=["tid_utc"])
    if list(d.columns) != ["station_id", "tid_utc"] + FALT:
        raise ValueError(f"MET Nordic-filen: oväntade kolumner {list(d.columns)}")
    d = d[d.station_id.isin(sids)].copy()
    if getattr(d.tid_utc.dt, "tz", None) is not None:
        d["tid_utc"] = d.tid_utc.dt.tz_convert(None)
    return d


def load_mn(fil):
    """meta, idx, F, obs, aux as common.load(), plus t0 = the first MET Nordic hour."""
    meta, idx, F, obs, aux = load_ec()
    d = las_metnordic(fil, set(meta.sid))
    saknas = sorted(set(meta.sid) - set(d.station_id))
    if saknas:
        raise ValueError(f"MET Nordic saknar {len(saknas)} av kedjans stationer: {saknas[:5]} …")
    t0 = d.tid_utc.min()
    mn_idx = idx[idx >= t0]
    if len(mn_idx) == 0:
        raise ValueError(f"MET Nordic börjar {t0}, efter kedjans sista timme {idx[-1]}")

    def M(f):
        m = d.pivot(index="tid_utc", columns="station_id", values=f).reindex(index=mn_idx, columns=meta.sid)
        return m.ffill().bfill().reindex(idx).to_numpy(float)          # NaN before t0

    ta, rh, wind, cloud, precip, lw, sw = (M(f) for f in FALT)
    sw = np.maximum(sw / 3600.0, 0.0)
    lw = lw / 3600.0
    td = np.minimum(magnus_td(ta, rh), ta)
    snowfall = CM_PER_MM * precip * (ta <= SNO_T_C)
    G = dict(F)
    for k, v in dict(ta=ta, td=td, wind=wind, cloud=cloud, sw=sw, precip=precip, snowfall=snowfall).items():
        G[k] = np.where(np.isfinite(v), v, F[k])
    G["lw"] = lw
    taf = pd.DataFrame(G["ta"])
    G["tdeep"] = taf.rolling(24 * 45, min_periods=1).mean().to_numpy()
    G["ta72"] = taf.rolling(72, min_periods=1).mean().to_numpy()
    swe = np.zeros_like(G["ta"]); s = np.zeros(G["ta"].shape[1])
    for h in range(G["ta"].shape[0]):
        s = np.maximum(s + G["snowfall"][h] * 1.0 - 0.125 * np.maximum(G["ta"][h], 0.0), 0.0)
        swe[h] = s
    G["swe"] = swe
    G["elev_diff"] = np.zeros(len(meta))
    return meta, idx, G, obs, aux, t0
