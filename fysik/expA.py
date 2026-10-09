"""Experiment A: state features and full data vs the v3 configuration. Choose on DEV, report CONF."""
from v4 import *
feat = base_features()
names_v3 = list(feat)
feat = state_features(feat)
names_v4 = list(feat)
pB = fit_oof(feat, names_v4, max_rows=700_000, iters=500, lr=0.07, leaves=63, msl=300)
report('A1 + state features, same config', pB); np.save('/home/claude/fys/oof_A1.npy', pB)
pC = fit_oof(feat, names_v4, max_rows=1_400_000, iters=900, lr=0.05, leaves=95, msl=200)
report('A2 + state, 2x data, 900 it, 95 leaves', pC); np.save('/home/claude/fys/oof_A2.npy', pC)
json.dump(names_v4, open('/home/claude/fys/names_v4.json', 'w'))
