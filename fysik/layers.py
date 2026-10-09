import numpy as np
from common import hav


def dist_matrix(meta):
    lo, la = meta.lon.to_numpy(), meta.lat.to_numpy()
    return hav(lo[:, None], la[:, None], lo[None, :], la[None, :])


def idw_neighbours(D, vals, rmin=0.0, rmax=50.0, k=5, wfun=None, shrink=0.0):
    """For each target j: weighted mean of vals at neighbours i with rmin < d <= rmax (i != j), at the same hour.
    Missing neighbour values are skipped per hour. Returns (pred, ank_km) with pred (n_hours, n_st)."""
    nh, ns = vals.shape
    pred = np.full((nh, ns), np.nan)
    ank = np.full((nh, ns), np.nan)
    finite = np.isfinite(vals)
    v0 = np.where(finite, vals, 0.0)
    for j in range(ns):
        d = D[j].copy(); d[j] = np.inf
        cand = np.where((d > rmin) & (d <= rmax))[0]
        if cand.size == 0:
            continue
        cand = cand[np.argsort(d[cand])][: max(k, 1) * 4]   # pool, then take k nearest available per hour
        dd = d[cand]
        w = wfun(dd) if wfun else 1.0 / np.maximum(dd, 1.0)
        f = finite[:, cand]
        # k nearest AVAILABLE per hour: rank among available
        rank = np.cumsum(f, axis=1)
        use = f & (rank <= k)
        W = use * w[None, :]
        sw = W.sum(1)
        num = (W * v0[:, cand]).sum(1)
        ok = sw > 0
        pred[ok, j] = num[ok] / (sw[ok] + shrink)
        # nearest used neighbour distance
        first = np.argmax(use, axis=1)
        ank[ok, j] = dd[first[ok]]
    return pred, ank
