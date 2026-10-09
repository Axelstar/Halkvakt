"""physics.run with two changes for nivå 2 (fysik/README.md, Axel's recommendation; DECISIONS #509):
  1. where F['lw'] (incoming longwave, W/m²) is finite it replaces the Brutsaert + cloud estimate of the sky radiation —
     the measured longwave is what the low-cloud field was a proxy for;
  2. the layer at Z_MID[LAGER_5CM] (5.5 cm) is returned beside the surface, for the soil feature.
Everything else is physics.run line for line (the frozen file is not changed; this is a copy, as fysik/README.md requires).
The self-test proves the copy: without lw the two give the same surface to 1e-9.
"""
import numpy as np
from physics import SIGMA, RHO_A, CP_A, DZ, Z_MID, K, RHOC, DEFAULT, road_cover, qsat, sky_emissivity

LAGER_5CM = 3          # Z_MID[3] = 0.055 m; ECMWF's soil_temperature_0_to_7cm was the 0–7 cm mean


def run_lw(F, p=None, dt_sub=1800.0):
    """Returns (Ts, T5): surface and 5.5 cm layer at the end of each hour, shape (n_hours, n_st)."""
    q = dict(DEFAULT)
    if p: q.update(p)
    nh, ns = F['ta'].shape
    nl = len(DZ)
    ta_all = F['ta'] - q['lapse'] * F['elev_diff'][None, :]
    td_all = np.minimum(F['td'] - q['lapse'] * F['elev_diff'][None, :], ta_all)
    lw_all = F.get('lw')
    T = np.empty((ns, nl))
    w = (Z_MID / Z_MID[-1])[None, :]
    T[:] = ta_all[0][:, None] * (1 - w) + (F['tdeep'][0] + q['deep_off'])[:, None] * w
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
        if lw_all is not None:                                       # change 1: measured longwave where it exists
            Lsky = np.where(np.isfinite(lw_all[h]), lw_all[h], Lsky)
        sw = q['sw_fac'] * F['sw'][h] * (1 - (q['albedo'] * (1 - cv) + q['alb_snow'] * cv))
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
            Q0 = q['eps_s'] * Lsky - lw_out + sw + hconv * (ta - Ts) + le + q['q_traffic']
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
        out5[h] = T[:, LAGER_5CM]                                    # change 2
    return out, out5
