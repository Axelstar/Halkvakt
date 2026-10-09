"""Physics-first road surface temperature model.

1-D implicit heat-conduction column per station, top boundary = surface energy balance
driven ONLY by gridded weather (ECMWF IFS 9 km via Open-Meteo) and site data (lat, lon,
elevation). No road-weather-station observation enters the prediction at the target.

Vectorised over stations: state T has shape (n_stations, n_layers).
"""
import numpy as np

SIGMA = 5.670e-8
RHO_A = 1.27        # kg/m3
CP_A = 1005.0
L_S = 2.83e6        # sublimation/deposition J/kg
L_V = 2.50e6

# layer thicknesses (m), geometric, ~2 m total
DZ = np.array([0.01, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.20, 0.30, 0.50, 0.70])
Z_MID = np.cumsum(DZ) - DZ / 2
# materials: asphalt to 0.10 m, unbound base to 0.6 m, subgrade below
K = np.where(Z_MID < 0.10, 1.2, np.where(Z_MID < 0.60, 1.6, 1.3))
RHOC = np.where(Z_MID < 0.10, 2.0e6, np.where(Z_MID < 0.60, 1.9e6, 2.4e6))

DEFAULT = dict(
    albedo=0.10,      # aged asphalt
    eps_s=0.94,       # surface emissivity
    eps_ov=0.97,      # sky emissivity under full overcast (low cloud)
    cloud_p=2.0,      # exponent on cloud fraction in emissivity blend
    ch=0.0030,        # bulk transfer coefficient * (wind) term
    hmin=4.0,         # W/m2K floor of turbulent exchange in calm conditions
    q_traffic=8.0,    # W/m2 traffic + anthropogenic heat
    deep_off=2.5,     # K, deep boundary = 45-day mean air temp + offset
    lapse=0.0045,     # K/m applied to IFS t2m/td2m from grid to station elevation
    sw_fac=1.0,       # scaling of IFS shortwave (shading, sky view)
    ce_fac=1.0,       # latent transfer relative to sensible
    r_snow=0.0,       # m2K/W thermal resistance of a compacted snow/ice cover on the road (0 = bare road)
    alb_snow=0.5,     # albedo of covered road
    cover_swe=10.0,   # mm of ground snow (degree-day model) for full road cover
    cover_t=-1.0,     # deg C: 3-day mean air temperature below which roads stay covered
)


def road_cover(F, q):
    """Fraction of a compacted snow/ice cover on the road surface. Physics regime switch: where the
    surrounding ground holds snow and it has been cold for days, the road is snow-covered (not salted),
    which insulates the surface from the ground heat store and raises the albedo."""
    swe = F['swe']
    t72 = F['ta72']
    c = np.clip(swe / max(q['cover_swe'], 0.1), 0, 1) / (1 + np.exp((t72 - q['cover_t']) / 1.0))
    return c


def qsat(T):
    """Saturation specific humidity over ice/water (kg/kg) at T (°C), p ~ 1000 hPa."""
    es = np.where(T < 0, 6.112 * np.exp(22.46 * T / (272.62 + T)), 6.112 * np.exp(17.62 * T / (243.12 + T)))
    return 0.622 * es / 1000.0


def sky_emissivity(Ta, Td, N, p):
    e = 6.112 * np.exp(17.62 * Td / (243.12 + Td))           # hPa
    Tk = Ta + 273.15
    eps_clr = 1.24 * (e / Tk) ** (1 / 7)                      # Brutsaert
    Nn = np.clip(N, 0, 1) ** p['cloud_p']
    return eps_clr * (1 - Nn) + p['eps_ov'] * Nn


def run(F, p=None, dt_sub=1800.0, return_flux=False):
    """F: dict of arrays (n_hours, n_st): ta, td, wind, cloud(0..1), sw, tdeep; and elev_diff (n_st,).
    Returns Ts (n_hours, n_st) = surface temperature at the END of each hour step."""
    q = dict(DEFAULT)
    if p: q.update(p)
    nh, ns = F['ta'].shape
    nl = len(DZ)
    ta_all = F['ta'] - q['lapse'] * F['elev_diff'][None, :]
    td_all = np.minimum(F['td'] - q['lapse'] * F['elev_diff'][None, :], ta_all)
    # initial profile: linear from air to deep
    T = np.empty((ns, nl))
    w = (Z_MID / Z_MID[-1])[None, :]
    T[:] = ta_all[0][:, None] * (1 - w) + (F['tdeep'][0] + q['deep_off'])[:, None] * w
    # conductances between layer centres
    dzc = (DZ[:-1] + DZ[1:]) / 2
    kc = 2 * K[:-1] * K[1:] / (K[:-1] + K[1:])
    G = kc / dzc                                   # W/m2K between i and i+1
    G_bot = K[-1] / (DZ[-1] / 2)                   # to deep boundary
    C = RHOC * DZ                                  # J/m2K per layer
    nsub = int(round(3600 / dt_sub))
    out = np.empty((nh, ns))
    cover_all = road_cover(F, q) if q['r_snow'] > 0 else np.zeros((nh, ns))
    for h in range(nh):
        ta = ta_all[h]; td = td_all[h]
        cv = cover_all[h]
        G0 = 1.0 / (1.0 / G[0] + q['r_snow'] * cv)
        u = np.maximum(F['wind'][h], 0.3)
        eps_a = sky_emissivity(ta, td, F['cloud'][h], q)
        Lsky = eps_a * SIGMA * (ta + 273.15) ** 4
        sw = q['sw_fac'] * F['sw'][h] * (1 - (q['albedo'] * (1 - cv) + q['alb_snow'] * cv))
        hconv = q['hmin'] + RHO_A * CP_A * q['ch'] * u          # W/m2K
        qa = qsat(td)
        tb = F['tdeep'][h] + q['deep_off']
        for _ in range(nsub):
            Ts = T[:, 0]
            # longwave linearised around Ts
            Tk = Ts + 273.15
            lw_out = q['eps_s'] * SIGMA * Tk ** 4
            dlw = 4 * q['eps_s'] * SIGMA * Tk ** 3
            # latent: deposition/condensation only when air moister than surface saturation
            qs = qsat(Ts)
            le_coef = RHO_A * q['ce_fac'] * (hconv / (RHO_A * CP_A)) * np.where(Ts < 0, L_S, L_V)
            le = np.maximum(le_coef * (qa - qs), 0.0)
            dqs = qsat(Ts + 0.05) - qs
            dle = np.where(le > 0, le_coef * dqs / 0.05, 0.0)          # d(le)/dTs is negative of this
            # explicit flux at old Ts, implicit linear correction
            Q0 = q['eps_s'] * Lsky - lw_out + sw + hconv * (ta - Ts) + le + q['q_traffic']
            dQ = -dlw - hconv - dle                                     # dQ/dTs
            # backward-Euler tridiagonal system  A T_new = rhs
            a = np.zeros((ns, nl)); b = np.zeros((ns, nl)); c = np.zeros((ns, nl)); r = np.zeros((ns, nl))
            b[:] = C / dt_sub
            r[:] = T * (C / dt_sub)
            Gm = np.broadcast_to(G, (ns, nl - 1)).copy(); Gm[:, 0] = G0
            b[:, :-1] += Gm; c[:, :-1] = -Gm
            b[:, 1:] += Gm;  a[:, 1:] = -Gm
            b[:, -1] += G_bot; r[:, -1] += G_bot * tb
            # surface node flux Q(Ts_new) = Q0 + dQ (Ts_new - Ts_old)
            b[:, 0] += -dQ
            r[:, 0] += Q0 - dQ * Ts
            # Thomas
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
    return out
