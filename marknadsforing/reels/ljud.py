# Reels (DECISIONS #780): the sound bed for one reel, synthesized, so no music licence is ever involved.
#   python3 marknadsforing/reels/ljud.py <typ> <ut.wav>
# The cues follow reel.html's timeline per type: a soft swell as stations light, rising notes as list rows come in, a sweep while the camera moves, a chime on the
# headline, and the closing chord as the end card comes in.
import sys, wave
import numpy as np

SR = 48000
LANGD = {'halt': 14, 'frost': 14, 'kallast': 14, 'e4': 14, 'natt': 16, 'du': 14, 'nu': 14, 'plus': 14, 'gissa': 14, 'pendling': 14, 'stad': 14}


def drone(n):
    t = np.arange(n) / SR
    d = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in ((55, .5, 0), (82.4, .3, 1), (110, .2, 2), (164.8, .08, .5)))
    d *= .6 + .4 * np.sin(2 * np.pi * .07 * t)
    fade = np.minimum(1, np.minimum(t / 1.5, (n / SR - t) / 1.2))
    return .10 * d * fade


def ton(f, langd, a=.2, decay=6.0):
    t = np.arange(int(langd * SR)) / SR
    return a * np.exp(-decay * t) * (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.minimum(1, t / .004)


def mjuk(f, a=.09):
    """A soft mallet note: pure sine, a gentle attack and a slow fade, so a run of them never clicks."""
    t = np.arange(int(1.6 * SR)) / SR
    return a * np.exp(-3.5 * t) * np.sin(2 * np.pi * f * t) * np.minimum(1, t / .015)


def blom(langd, a=.035):
    """Stations lighting up: a low, filtered swell instead of a run of ticks (Axel 3/11: the ticks sounded odd)."""
    n = int(langd * SR); t = np.arange(n) / SR
    brus = np.convolve(np.random.default_rng(3).standard_normal(n), np.ones(240) / 240, 'same') * 6
    ton_ = .5 * np.sin(2 * np.pi * 330 * t) + .3 * np.sin(2 * np.pi * 495 * t)
    return a * np.sin(np.pi * np.minimum(1, t / langd)) ** 2 * (brus + ton_)


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


def rader(buf, start, steg=.25, toner=(523.3, 659.3, 784.0)):
    """The list rows sliding in: one soft note per step, rising."""
    for k, f in enumerate(toner): lagg(buf, mjuk(f), start + k * steg)


def bygg(typ):
    buf = drone(LANGD[typ] * SR)
    if typ == 'halt':
        lagg(buf, blom(2.4), .6); lagg(buf, sweep(3.4), 1.8); lagg(buf, chime(), 4.9); rader(buf, 6.4); lagg(buf, slut(), 11.7)
    elif typ == 'frost':
        lagg(buf, blom(2.4), .6); lagg(buf, sweep(2.4), 2.6); lagg(buf, ton(1046.5, 1.4), 5.4); lagg(buf, ton(880, 1.4), 7.0)
        lagg(buf, slut(), 11.7)
    elif typ == 'kallast':
        lagg(buf, blom(2.2), .6)
        for k, f in enumerate((784, 698.5, 659.3, 587.3)): lagg(buf, ton(f, 1.2), 2.6 + k * 1.1)
        lagg(buf, chime(), 7.0); lagg(buf, slut(), 11.7)
    elif typ == 'e4':
        lagg(buf, sweep(6.6, 140, 700, .045), 1.4); lagg(buf, ton(1046.5, 1.4), 8.2); lagg(buf, slut(), 11.7)
    elif typ == 'natt':
        lagg(buf, blom(3.0), .3); lagg(buf, blom(1.6, .025), 3.5); lagg(buf, whoosh(1.8), 6.4); rader(buf, 8.0)
        lagg(buf, chime(), 9.6); lagg(buf, slut(), 13.7)
    elif typ in ('du', 'nu'):
        lagg(buf, blom(2.0, .03), .3); lagg(buf, chime(659.3), 2.4)
        for k, t0 in enumerate((2.4, 5.0, 7.6)):
            lagg(buf, sweep(1.0, 200, 600, .025), t0 - 0.3); rader(buf, t0 + 0.3, .3, ((392, 523.3, 659.3), (440, 587.3, 698.5), (523.3, 659.3, 784))[k])
        lagg(buf, chime(784), 10.2); lagg(buf, slut(), 11.7)
    elif typ == 'plus':
        lagg(buf, blom(1.6, .03), .2); lagg(buf, mjuk(523.3, .12), .4); lagg(buf, whoosh(.8), 2.8); lagg(buf, mjuk(392, .14), 3.3)
        lagg(buf, blom(2.4, .03), 6.4); lagg(buf, chime(659.3), 10.0); lagg(buf, slut(), 11.7)
    elif typ == 'gissa':
        rader(buf, 1.0, .2)
        for t0 in (3.3, 4.3, 5.3): lagg(buf, mjuk(880, .07), t0)
        lagg(buf, chime(784), 6.3); lagg(buf, chime(659.3), 10.0); lagg(buf, slut(), 11.7)
    elif typ == 'pendling':
        lagg(buf, blom(2.0, .03), .3); lagg(buf, sweep(1.2, 200, 600, .03), 1.3); rader(buf, 2.8, .3, (392, 440, 523.3, 587.3, 659.3, 784))
        lagg(buf, chime(), 5.9); lagg(buf, mjuk(523.3), 10.0); lagg(buf, slut(), 11.7)
    elif typ == 'stad':
        lagg(buf, blom(2.0, .03), .3); rader(buf, 2.4, .56, (392, 440, 523.3, 587.3, 659.3, 784)); lagg(buf, chime(), 6.4)
        lagg(buf, mjuk(523.3), 10.0); lagg(buf, slut(), 11.7)
    return np.clip(buf / max(1, np.abs(buf).max() / .7), -1, 1)


if __name__ == '__main__':
    typ, ut = sys.argv[1], sys.argv[2]
    if typ not in LANGD: sys.exit(f'Okänd typ {typ}: {", ".join(LANGD)}')
    s = (bygg(typ) * 32767).astype('<i2')
    with wave.open(ut, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.repeat(s, 2).tobytes())
    print(f'Ljud {typ}: {LANGD[typ]} s -> {ut}')
