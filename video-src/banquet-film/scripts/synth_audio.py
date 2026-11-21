#!/usr/bin/env python3
"""Synthesise ALL film audio from scratch with numpy (no samples, no reel audio): music bed + whooshes + impact hits."""
import numpy as np, subprocess, os, sys
from scipy.signal import butter, sosfilt, sosfilt_zi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film_lib import STARTS, DURS, TOTAL, T, ROOT
SR = 48000; rng = np.random.default_rng(11)
N = int((TOTAL + 0.3) * SR); L = np.zeros(N); R = np.zeros(N)
BPM = 100; beat = 60 / BPM; bar = 4 * beat
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
CH = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]   # Am F C G (root, triad)
def add(sig, t0, pan=0.0, g=1.0):
    i = int(t0 * SR); n = min(len(sig), N - i)
    if n <= 0 or i < 0: return
    L[i:i + n] += sig[:n] * g * (1 - max(pan, 0)); R[i:i + n] += sig[:n] * g * (1 + min(pan, 0))
def env(n, a, r):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2; e[-nr:] = np.minimum(e[-nr:], np.linspace(1, 0, nr) ** 2); return e
def lp(x, fc):
    return sosfilt(butter(2, fc, "low", fs=SR, output="sos"), x)
# --- pad: detuned triangle-ish stack, one chord per bar ---
tt = lambda n: np.arange(n) / SR
nb = int(np.ceil((TOTAL + 0.3) / bar))
for b in range(nb):
    root, tri = CH[b % 4]; n = int((bar + 0.9) * SR); t = tt(n); pl = np.zeros(n); pr = np.zeros(n)
    for m in tri + [tri[0] + 12]:
        for d, ch in ((-0.07, "l"), (0.0, "c"), (0.07, "r")):
            f = hz(m) * 2 ** (d / 12); w = sum(np.sin(2 * np.pi * f * k * t) / k ** 2 for k in (1, 2, 3, 4)) * 0.18
            if ch != "r": pl += w
            if ch != "l": pr += w
    e = env(n, 0.5, 0.9) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.15 * t + b))
    pl, pr = lp(pl * e, 1800), lp(pr * e, 1800); i = int(b * bar * SR); k = min(n, N - i)
    L[i:i + k] += pl[:k] * 0.55; R[i:i + k] += pr[:k] * 0.55
    # bass on beat 1 and beat 3
    for bt in (0, 2):
        nn = int(1.1 * beat * SR); tb = tt(nn); s = np.sin(2 * np.pi * hz(root - 24) * tb) * np.exp(-tb * 2.6) * 0.5
        add(s, b * bar + bt * beat, 0, 0.9)
# --- pluck arpeggio (from the first clip), 8th notes ---
t_on = STARTS[1] - 0.05; step = beat / 2; k = 0
while t_on < TOTAL - 1.6:
    bi = int(t_on // bar); tri = CH[bi % 4][1]; m = (tri + [tri[0] + 12, tri[2] + 12])[[0, 1, 2, 3, 2, 1, 4, 2][k % 8]] + 12
    nn = int(0.6 * SR); tp = tt(nn); f = hz(m)
    s = (np.sin(2 * np.pi * f * tp) + 0.4 * np.sin(2 * np.pi * 2 * f * tp) + 0.15 * np.sin(2 * np.pi * 3 * f * tp)) * np.exp(-tp * 7) * 0.22
    s[:60] *= np.linspace(0, 1, 60); add(s, t_on, pan=(-0.4 if k % 2 else 0.4)); t_on += step; k += 1
# --- shaker on offbeats ---
t_on = STARTS[1] + beat / 2
while t_on < TOTAL - 2.0:
    nn = int(0.07 * SR); s = sosfilt(butter(2, 6500, "high", fs=SR, output="sos"), rng.normal(0, 1, nn)) * np.exp(-tt(nn) * 55) * 0.07
    add(s, t_on, 0.2); t_on += beat
# --- outro swell: soft rising pad layer ---
o0 = STARTS[9]; n = int((DURS[9]) * SR); t = tt(n)
sw = sum(np.sin(2 * np.pi * hz(m) * t) for m in (45, 57, 60, 64)) * 0.05 * np.linspace(0.2, 1, n) ** 2 * env(n, 0.3, 1.5)
add(lp(sw, 1500), o0, 0, 1.0)
# --- sfx: whoosh on every cut, impact hit on intro and outro ---
def whoosh(dur=0.7):
    n = int(dur * SR); x = rng.normal(0, 1, n); out = np.zeros(n); blk = 480; zi = None
    for j in range(0, n, blk):
        p = j / n; fc = 400 + 5200 * np.sin(np.pi * p) ** 1.5; sos = butter(2, [fc * 0.6, fc * 1.5], "band", fs=SR, output="sos")
        seg = x[j:j + blk]; z = sosfilt_zi(sos) * seg[0] if zi is None else zi; y, zi = sosfilt(sos, seg, zi=z); out[j:j + blk] = y
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * 0.5
def hit(dur=0.9):
    n = int(dur * SR); t = tt(n); f = 48 + 90 * np.exp(-t * 18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5) * 0.9
    s += lp(rng.normal(0, 1, n), 2500) * np.exp(-t * 14) * 0.25; return s
W = whoosh()
for k in range(1, 10): add(W, max(0, STARTS[k] - 0.15), pan=(0.3 if k % 2 else -0.3), g=0.55)
add(hit(), 0.05, 0, 0.8); add(hit(), STARTS[9] + 0.1, 0, 0.7)
# --- master: fades, trim, loudness ---
n0 = int(TOTAL * SR); L, R = L[:n0], R[:n0]
f = np.ones(n0); fi, fo = int(0.5 * SR), int(1.6 * SR); f[:fi] = np.linspace(0, 1, fi); f[-fo:] = np.linspace(1, 0, fo) ** 1.5
st = np.stack([L * f, R * f], 1); st /= np.abs(st).max() * 1.05
out = os.path.join(ROOT, "audio"); os.makedirs(out, exist_ok=True)
raw = os.path.join(out, "_raw.f32"); st.astype("<f4").tofile(raw)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", raw,
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=7,alimiter=limit=0.84:level=disabled", "-c:a", "aac", "-b:a", "128k", os.path.join(out, "film_audio.m4a")], check=True)
os.remove(raw); print("ok", TOTAL)
