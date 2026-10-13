"""The winter maintenance class at the road points, estimated from the road data layer (DECISIONS #553, Bengt 13/10: "3 b").

The frozen candidate's correction reads uh_klass (Vägunderhållsklass 1-5, Axel's road_all.csv from Lastkajen's VIS layer). It is not
in Trafikverket's open API, and Lastkajen needs a login. Trafikverket sets the class mainly by the road's traffic and type, so here it
is estimated from what the road data layer (data/vagdata/, the open API) has for every place: functional road class, ÅDT, speed limit,
width and road owner. The test is at the stations, where Axel's class is known.

THE RULE, written and pushed before the run:
  - predictors from data/vagdata/stationer.json (the same source as at the road points), target Axel's
    Vagunderhallsklass_Vagunderhallsklass in road_all.csv, joined on station id; stations without a class are left out;
  - a decision tree (scikit-learn DecisionTreeClassifier, max_depth 4, min_samples_leaf 10, random_state 0), scored by five-fold
    cross-validation over the stations (KFold, shuffle, random_state 0): every station's class predicted by a tree that never saw it;
  - ENOUGH (no Lastkajen) if the exact class is right at >= 90 % of the stations AND at most one class off at >= 99 %;
    otherwise Lastkajen (alternative (a) in the assessment §4.2).
The output is aggregates only: the shares, the confusion matrix and the share the most common class alone would get.
  python3 fysik/vagpunkter/uh_klass.py --road-all <road_all.csv> [--stationer data/vagdata/stationer.json]
  python3 fysik/vagpunkter/uh_klass.py --sjalvtest
"""
import argparse, json, os, sys
import numpy as np
import pandas as pd

ROT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
EXAKT, EN_KLASS = 0.90, 0.99


def sardrag(rader):
    """The predictors from the road data layer's rows: functional class, log10 ÅDT, speed, width, state road owner (1/0)."""
    df = pd.DataFrame(rader)
    return pd.DataFrame({'id': df['id'].astype(str), 'klass': pd.to_numeric(df['klass'], errors='coerce'),
                         'adt_log': np.log10(pd.to_numeric(df['adt_fordon'], errors='coerce').clip(lower=10)),
                         'hastighet': pd.to_numeric(df['hastighet_kmh'], errors='coerce'),
                         'bredd': pd.to_numeric(df['bredd_m'], errors='coerce'),
                         'statlig': (df['vaghallare'] == 'statlig').astype(float)})


def prov(X, y, seed=0):
    """Five-fold cross-validated predictions; returns (predicted, exact share, at most one off share, majority share)."""
    from sklearn.model_selection import KFold
    from sklearn.tree import DecisionTreeClassifier
    pred = np.zeros(len(y))
    for tr, te in KFold(5, shuffle=True, random_state=seed).split(X):
        m = DecisionTreeClassifier(max_depth=4, min_samples_leaf=10, random_state=0).fit(X[tr], y[tr])
        pred[te] = m.predict(X[te])
    vanligast = np.mean(y == pd.Series(y).mode().iloc[0])
    return pred, float(np.mean(pred == y)), float(np.mean(np.abs(pred - y) <= 1)), float(vanligast)


def sjalvtest():
    fel = []
    rng = np.random.default_rng(0)
    n = 400
    adt = 10 ** rng.uniform(2, 4.5, n)
    y = (5 - np.digitize(np.log10(adt), [2.7, 3.3, 3.9, 4.2])).astype(float)        # a class 1-5 that follows ÅDT exactly
    rader = [{'id': str(i), 'klass': int(rng.integers(0, 6)), 'adt_fordon': a, 'hastighet_kmh': 70, 'bredd_m': 7, 'vaghallare': 'statlig'}
             for i, a in enumerate(adt)]
    X = sardrag(rader).drop(columns='id').to_numpy(float)
    _, exakt, en, vanl = prov(X, y)
    if not (exakt > 0.95 and en > 0.99 and vanl < 0.5): fel.append(f'en klass som följer ÅDT skattas nästan rätt: {exakt:.3f}, {en:.3f}, {vanl:.3f}')
    _, exakt2, _, _ = prov(X, rng.permutation(y))
    if exakt2 > 0.5: fel.append(f'en klass utan samband skattas inte: {exakt2:.3f}')
    for f in fel: print('✗', f)
    if fel: sys.exit(1)
    print('✓ självtest: en klass som följer ÅDT skattas nästan rätt ur vägdatan, och en klass utan samband skattas inte')


if __name__ == '__main__':
    if '--sjalvtest' in sys.argv:
        sjalvtest(); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--road-all', required=True)
    ap.add_argument('--stationer', default=f'{ROT}/data/vagdata/stationer.json')
    a = ap.parse_args()
    st = sardrag(json.load(open(a.stationer, encoding='utf-8'))['rader'])
    ra = pd.read_csv(a.road_all, dtype={'sid': str})[['sid', 'Vagunderhallsklass_Vagunderhallsklass']].dropna()
    d = st.merge(ra, left_on='id', right_on='sid')
    X = d[['klass', 'adt_log', 'hastighet', 'bredd', 'statlig']].to_numpy(float)
    y = d['Vagunderhallsklass_Vagunderhallsklass'].to_numpy(float)
    pred, exakt, en, vanl = prov(X, y)
    print(f'VINTERVÄGHÅLLNINGSKLASSEN SKATTAD UR VÄGDATAN (DECISIONS #553, val (b)): {len(d)} stationer med Axels klass')
    print(f'  exakt rätt {100 * exakt:.1f} % (kravet {100 * EXAKT:.0f} %), högst en klass fel {100 * en:.1f} % (kravet {100 * EN_KLASS:.0f} %); '
          f'den vanligaste klassen ensam {100 * vanl:.1f} %')
    tab = pd.crosstab(pd.Series(y, name='Axel'), pd.Series(pred, name='skattad'))
    print('  rader Axels klass, kolumner den skattade:'); print('  ' + tab.to_string().replace('\n', '\n  '))
    print('RÄCKER: ingen Lastkajen' if exakt >= EXAKT and en >= EN_KLASS else 'RÄCKER INTE: Lastkajen (alternativ (a) i §4.2)')
