# Reels (DECISIONS #780): the sound bed for one reel, synthesized, so no music licence is ever involved.
#   python3 marknadsforing/reels/ljud.py <typ> <ut.wav>
# The cues follow reel.html's timeline per type: ticks as stations light, a sweep while the camera moves, a chime on the
# headline, and the closing chord as the end card comes in.
import sys, wave
import numpy as np

SR = 48000
LANGD = {'halt': 14, 'frost': 14, 'kallast': 14, 'e4': 14, 'natt': 16}


def drone(n):
    t = np.arange(n) / SR
    d = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in ((55, .5, 0), (82.4, .3, 1), (110, .2, 2), (164.8, .08, .5)))
    d *= .6 + .4 * np.sin(2 * np.pi * .07 * t)
    fade = np.minimum(1, np.minimum(t / 1.5, (n / SR - t) / 1.2))
    return .10 * d * fade


def ton(f, langd, a=.2, decay=6.0):
    t = np.arange(int(langd * SR)) / SR
    return a * np.exp(-decay * t) * (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.minimum(1, t / .004)


def tick(f=2200):
    return ton(f, .06, .12, 60)


def sweep(langd, f0=180, f1=900, a=.05):
    n = int(langd * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / langd)
    brus = np.convolve(np.random.default_rng(7).standard_normal(n), np.ones(40) / 40, 'same')
    env = np.sin(np.pi * t / langd) ** 2
    return a * env * (np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + brus * .8)


def whoosh(langd):
    return sweep(langd, 400, 120, .07)


def chime(f=880):
    return ton(f, 2.0, .16, 2.2) + ton(f * 1.5, 2.0, .07, 2.6)


def slut():
    return sum(ton(f, 2.4, .1, 1.6) for f in (440, 554.4, 659.3))


def lagg(buf, ljud, vid):
    i = int(vid * SR); j = min(len(buf), i + len(ljud)); buf[i:j] += ljud[:j - i]


def ticks(buf, start, antal, steg=.12, f=2200):
    for k in range(antal): lagg(buf, tick(f + 40 * (k % 3)), start + k * steg)


def bygg(typ):
    buf = drone(LANGD[typ] * SR)
    if typ == 'halt':
        ticks(buf, .8, 10); lagg(buf, sweep(3.4), 1.8); lagg(buf, chime(), 4.9); ticks(buf, 6.4, 5, .18); lagg(buf, slut(), 11.7)
    elif typ == 'frost':
        ticks(buf, .8, 14, .1); lagg(buf, sweep(2.4), 2.6); lagg(buf, ton(1046.5, 1.4), 5.4); lagg(buf, ton(880, 1.4), 7.0)
        lagg(buf, slut(), 11.7)
    elif typ == 'kallast':
        ticks(buf, .8, 10)
        for k, f in enumerate((784, 698.5, 659.3, 587.3)): lagg(buf, ton(f, 1.2), 2.6 + k * 1.1)
        lagg(buf, chime(), 7.0); lagg(buf, slut(), 11.7)
    elif typ == 'e4':
        lagg(buf, sweep(6.6, 140, 700, .045), 1.4); lagg(buf, ton(1046.5, 1.4), 8.2); lagg(buf, slut(), 11.7)
    elif typ == 'natt':
        ticks(buf, .4, 24, .1); ticks(buf, 3.6, 9, .14); lagg(buf, whoosh(1.8), 6.4); ticks(buf, 8.0, 8, .12)
        lagg(buf, chime(), 9.6); lagg(buf, slut(), 13.7)
    return np.clip(buf / max(1, np.abs(buf).max() / .7), -1, 1)


if __name__ == '__main__':
    typ, ut = sys.argv[1], sys.argv[2]
    if typ not in LANGD: sys.exit(f'Okänd typ {typ}: {", ".join(LANGD)}')
    s = (bygg(typ) * 32767).astype('<i2')
    with wave.open(ut, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.repeat(s, 2).tobytes())
    print(f'Ljud {typ}: {LANGD[typ]} s -> {ut}')
