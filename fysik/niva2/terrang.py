"""The terrain and the traffic in the energy balance — väg B varv 2, körning 2 (DECISIONS #549, kort #321).

fysik_lw.run_lw with three changes, as #549 registered them (the frozen files are not changed; this is a copy, as fysik/README.md
requires, and the self-test proves that neutral terrain gives run_lw's surface byte for byte):
  1. longwave in:  L_in = svf · L_sky + (1 − svf) · σ · T_air⁴ — the terrain and trees around the road radiate at the air's temperature;
  2. shortwave in: SW_in = SW · (k_d · svf + (1 − k_d) · s), written s + k_d · (svf − s) so that svf 1 and s 1 give exactly SW.
     k_d is Erbs' diffuse fraction from the clearness index k_t = SW / (S0 · E0 · cos z), with pvlib's conventions (irradiance.erbs:
     cos z at least 0.065 in the denominator, k_t clipped to [0, 1], k_d = 1 when the zenith is beyond 87°). s = 0 when the sun's
     elevation in the middle of the hour lies below horizon_south, else 1. The hour is the one ending at the time stamp: MET Nordic's
     radiation is the integral over the hour before (kuvos/metnordic-prognos.ts takes step t minus step t − 1) and Open-Meteo's
     shortwave_radiation in the spin-up is the mean of the preceding hour — tidsprov() checks that on the winter's own radiation;
  3. traffic:      q_trafik = q_traffic + q_trafik_adt · log10(ÅDT / 1 000), q_trafik_adt calibrated with the ten (start 0).
svf and horizon_south come from geofeat.csv (fysik/geofeat.py: 16 directions out to 1.5 km, Copernicus DEM), ÅDT from the road data
layer (data/vagdata/stationer.json, adt_fordon, kort #301). All three are checked against the spans in scripts/vardevakten.ts (read
from there, not copied). A missing value is neutral — svf 1, horizon 0, no traffic term — and counted.
"""
import json, os, re
import numpy as np
import pandas as pd
from physics import SIGMA, RHO_A, CP_A, DZ, Z_MID, K, RHOC, DEFAULT, road_cover, qsat, sky_emissivity
from fysik_lw import LAGER_5CM

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))    # the repo (/home/claude/fys is a link)
VAGDATA = f'{ROT}/data/vagdata/stationer.json'
VARDEVAKTEN = f'{ROT}/scripts/vardevakten.ts'
S0 = 1366.1             # W/m², pvlib's solar constant
MIN_COSZ = 0.065        # pvlib irradiance.erbs min_cos_zenith
MAX_ZENIT = 87.0        # pvlib irradiance.erbs max_zenith: beyond it everything is diffuse
ADT_GOLV = 10           # vehicles per day; log10 of fewer is not traffic (kedja.py's adt_log clips the same way)


def solhojd(tider, lat, lon):
    """The sun's elevation (degrees) and cos z at the given UTC times (DatetimeIndex) for each station: NOAA's general solar position
    (declination and equation of time as Fourier series in the fractional year). Returns (n_times, n_st) arrays."""
    t = pd.DatetimeIndex(tider)
    timme = (t.hour + t.minute / 60 + t.second / 3600).to_numpy(float)
    g = 2 * np.pi / 365 * (t.dayofyear.to_numpy(float) - 1 + (timme - 12) / 24)
    dekl = (0.006918 - 0.399912 * np.cos(g) + 0.070257 * np.sin(g) - 0.006758 * np.cos(2 * g) + 0.000907 * np.sin(2 * g)
            - 0.002697 * np.cos(3 * g) + 0.00148 * np.sin(3 * g))
    tid_ekv = 229.18 * (0.000075 + 0.001868 * np.cos(g) - 0.032077 * np.sin(g) - 0.014615 * np.cos(2 * g) - 0.040849 * np.sin(2 * g))
    sann_soltid = timme[:, None] * 60 + tid_ekv[:, None] + 4 * np.asarray(lon, float)[None, :]
    tim_vinkel = np.radians(sann_soltid / 4 - 180)
    phi = np.radians(np.asarray(lat, float))[None, :]
    cosz = np.sin(phi) * np.sin(dekl)[:, None] + np.cos(phi) * np.cos(dekl)[:, None] * np.cos(tim_vinkel)
    cosz = np.clip(cosz, -1, 1)
    return 90 - np.degrees(np.arccos(cosz)), cosz


def avstand_solen(tider):
    """E0, the squared ratio of the mean to the actual sun–earth distance (Spencer 1971, pvlib's 'spencer'), per time."""
    b = 2 * np.pi * (pd.DatetimeIndex(tider).dayofyear.to_numpy(float) - 1) / 365
    return 1.00011 + 0.034221 * np.cos(b) + 0.00128 * np.sin(b) + 0.000719 * np.cos(2 * b) + 0.000077 * np.sin(2 * b)


def erbs(kt):
    """Erbs, Klein & Duffie (1982): the diffuse fraction of global radiation from the clearness index."""
    kd = 1 - 0.09 * kt
    kd = np.where((kt > 0.22) & (kt <= 0.8), 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4, kd)
    return np.where(kt > 0.8, 0.165, kd)


def spann(namn, fil=VARDEVAKTEN):
    """The declared span of a field in scripts/vardevakten.ts' SPANN. A field without one is OBESIKTIGAT and may not carry a measurement."""
    m = re.search(rf'\b{namn}: \[(-?[\d.e]+), (-?[\d.e]+),', open(fil, encoding='utf-8').read())
    if not m:
        raise ValueError(f'{namn}: OBESIKTIGAT — inget spann i scripts/vardevakten.ts (VÄRDEVAKTEN)')
    return float(m.group(1)), float(m.group(2))


def adt_fordon(meta, vagdata=VAGDATA):
    """Vehicles per average day per station (NaN where the road data layer has none), in the chain's station order."""
    rader = json.load(open(vagdata, encoding='utf-8'))['rader']
    return pd.Series({str(r['id']): r.get('adt_fordon') for r in rader}, dtype=float).reindex(meta.sid).to_numpy()


def terrang(F, idx, meta, geofeat, vagdata=VAGDATA, vardevakten=VARDEVAKTEN):
    """F with the terrain and traffic keys run_terrang reads: svf, horisont, adt (per station) and solhojd, toa (hours × stations, the
    middle of the hour ending at each time stamp). Returns (F, counts). Raises on a value outside the declared span."""
    G1 = pd.read_csv(geofeat, dtype={'sid': str}).set_index('sid').reindex(meta.sid)
    adt = adt_fordon(meta, vagdata)
    svf, hor = G1['svf'].to_numpy(float), G1['horizon_south'].to_numpy(float)
    for namn, v in [('svf', svf), ('horizon_south', hor), ('adt_fordon', adt)]:
        lo, hi = spann(namn, vardevakten)
        utanfor = np.isfinite(v) & ((v < lo) | (v > hi))
        if utanfor.any():
            raise ValueError(f'{namn}: {int(utanfor.sum())} värden utanför spannet [{lo:g}, {hi:g}] i scripts/vardevakten.ts, t.ex. {v[utanfor][:3]}')
    n = dict(stationer=len(meta), utan_svf=int((~np.isfinite(svf)).sum()), utan_horisont=int((~np.isfinite(hor)).sum()),
             utan_adt=int((~np.isfinite(adt)).sum()), adt_under_golvet=int((np.isfinite(adt) & (adt < ADT_GOLV)).sum()))
    mitt = pd.DatetimeIndex(idx) - pd.Timedelta(minutes=30)
    hojd, cosz = solhojd(mitt, meta.lat.to_numpy(), meta.lon.to_numpy())
    G = dict(F)
    G['svf'] = np.where(np.isfinite(svf), svf, 1.0)
    G['horisont'] = np.where(np.isfinite(hor), hor, 0.0)
    G['adt'] = np.where(np.isfinite(adt), np.log10(np.maximum(np.nan_to_num(adt, nan=1000.0), ADT_GOLV) / 1000), 0.0)
    G['solhojd'] = hojd
    G['toa'] = S0 * avstand_solen(mitt)[:, None] * np.maximum(cosz, MIN_COSZ)
    return G, n


def tidsprov(F, idx, meta):
    """The radiation's time convention on the winter's own data: SW's correlation with cos z in the middle of the hour before the time
    stamp and of the hour after it. The hour before must correlate better, else the hours are shifted and s and k_d are read at the
    wrong sun."""
    lat, lon = meta.lat.to_numpy(), meta.lon.to_numpy()
    t = pd.DatetimeIndex(idx)
    fore = solhojd(t - pd.Timedelta(minutes=30), lat, lon)[1]
    efter = solhojd(t + pd.Timedelta(minutes=30), lat, lon)[1]
    ok = np.isfinite(F['sw'])
    r = lambda c: float(np.corrcoef(F['sw'][ok], np.maximum(c, 0)[ok])[0, 1])
    return r(fore), r(efter)


def run_terrang(F, p=None, dt_sub=1800.0, T_init=None, spara=None):
    """fysik_lw.run_lw with the three changes (marked); F must carry terrang()'s keys. Same returns as run_lw."""
    q = dict(DEFAULT, q_trafik_adt=0.0)
    if p: q.update(p)
    nh, ns = F['ta'].shape
    nl = len(DZ)
    ta_all = F['ta'] - q['lapse'] * F['elev_diff'][None, :]
    td_all = np.minimum(F['td'] - q['lapse'] * F['elev_diff'][None, :], ta_all)
    lw_all = F.get('lw')
    svf = F['svf']
    q_trafik = q['q_traffic'] + q['q_trafik_adt'] * F['adt']               # change 3
    T = np.empty((ns, nl))
    w = (Z_MID / Z_MID[-1])[None, :]
    if T_init is None:
        T[:] = ta_all[0][:, None] * (1 - w) + (F['tdeep'][0] + q['deep_off'])[:, None] * w
    else:
        T[:] = T_init
    med_tillstand = spara is not None
    spara = set() if spara is None else set(spara)
    tillstand = {}
    dzc = (DZ[:-1] + DZ[1:]) / 2
    kc = 2 * K[:-1] * K[1:] / (K[:-1] + K[1:])
    G = kc / dzc
    G_bot = K[-1] / (DZ[-1] / 2)
    C = RHOC * DZ
    nsub = int(round(3600 / dt_sub))
    out = np.empty((nh, ns)); out5 = np.empty((nh, ns))
    cover_all = road_cover(F, q) if q['r_snow'] > 0 else np.zeros((nh, ns))
    for h in range(nh):
        ta = ta_all[h]; td = td_all[h]
        cv = cover_all[h]
        G0 = 1.0 / (1.0 / G[0] + q['r_snow'] * cv)
        u = np.maximum(F['wind'][h], 0.3)
        eps_a = sky_emissivity(ta, td, F['cloud'][h], q)
        Lsky = eps_a * SIGMA * (ta + 273.15) ** 4
        if lw_all is not None:
            Lsky = np.where(np.isfinite(lw_all[h]), lw_all[h], Lsky)
        Lsky = svf * Lsky + (1 - svf) * SIGMA * (ta + 273.15) ** 4           # change 1
        kd = erbs(np.clip(F['sw'][h] / F['toa'][h], 0, 1))                    # change 2
        kd = np.where(F['solhojd'][h] < 90 - MAX_ZENIT, 1.0, kd)
        s = (F['solhojd'][h] >= F['horisont']).astype(float)
        sw = q['sw_fac'] * (F['sw'][h] * (s + kd * (svf - s))) * (1 - (q['albedo'] * (1 - cv) + q['alb_snow'] * cv))
        hconv = q['hmin'] + RHO_A * CP_A * q['ch'] * u
        qa = qsat(td)
        tb = F['tdeep'][h] + q['deep_off']
        for _ in range(nsub):
            Ts = T[:, 0]
            Tk = Ts + 273.15
            lw_out = q['eps_s'] * SIGMA * Tk ** 4
            dlw = 4 * q['eps_s'] * SIGMA * Tk ** 3
            qs = qsat(Ts)
            le_coef = RHO_A * q['ce_fac'] * (hconv / (RHO_A * CP_A)) * np.where(Ts < 0, 2.83e6, 2.50e6)
            le = np.maximum(le_coef * (qa - qs), 0.0)
            dqs = qsat(Ts + 0.05) - qs
            dle = np.where(le > 0, le_coef * dqs / 0.05, 0.0)
            Q0 = q['eps_s'] * Lsky - lw_out + sw + hconv * (ta - Ts) + le + q_trafik
            dQ = -dlw - hconv - dle
            a = np.zeros((ns, nl)); b = np.zeros((ns, nl)); c = np.zeros((ns, nl)); r = np.zeros((ns, nl))
            b[:] = C / dt_sub
            r[:] = T * (C / dt_sub)
            Gm = np.broadcast_to(G, (ns, nl - 1)).copy(); Gm[:, 0] = G0
            b[:, :-1] += Gm; c[:, :-1] = -Gm
            b[:, 1:] += Gm;  a[:, 1:] = -Gm
            b[:, -1] += G_bot; r[:, -1] += G_bot * tb
            b[:, 0] += -dQ
            r[:, 0] += Q0 - dQ * Ts
            cp = np.empty((ns, nl)); rp = np.empty((ns, nl))
            cp[:, 0] = c[:, 0] / b[:, 0]; rp[:, 0] = r[:, 0] / b[:, 0]
            for i in range(1, nl):
                m = b[:, i] - a[:, i] * cp[:, i - 1]
                cp[:, i] = c[:, i] / m
                rp[:, i] = (r[:, i] - a[:, i] * rp[:, i - 1]) / m
            T[:, -1] = rp[:, -1]
            for i in range(nl - 2, -1, -1):
                T[:, i] = rp[:, i] - cp[:, i] * T[:, i + 1]
        out[h] = T[:, 0]
        out5[h] = T[:, LAGER_5CM]
        if h in spara:
            tillstand[h] = T.copy()
    return (out, out5, tillstand) if med_tillstand else (out, out5)
