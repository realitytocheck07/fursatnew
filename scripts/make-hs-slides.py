#!/usr/bin/env python3
"""Hero slideshow images (kit HS): window-sized copies, laptop (d) + phone (p), webp q78, new names -> public/assets/heroes/slides/.
Run from repo root: python3 scripts/make-hs-slides.py (Pillow). Focal points picked by eye."""
import os, shutil
import numpy as np
from PIL import Image
A = 'public/assets/'; OUT = A + 'heroes/slides/'; os.makedirs(OUT, exist_ok=True)
C = lambda n: A + 'celebrations/' + n + '-640.webp'
SIZES = {'bq': {'d': (720, 716), 'p': (760, 398)}, 'pa': {'d': (760, 478), 'p': (780, 360)}}   # HS3: Party phone window is ~2.17:1 now (was 3.1:1)
# page, name, source, laptop focal, phone focal
S = [
 ('bq', 'felicitation',  C('felicitation-group-stage'), (.5, .52), (.5, .5)),
 ('bq', 'corporate',     C('corporate-audience-stage'), (.5, .62), (.5, .6)),
 ('bq', 'private-party', C('private-party-entrance-sign'), (.6, .85), (.62, .84)),
 ('bq', 'hall-red-wall', A + 'venue/banquet/banquet-hall-02.webp', (.5, .42), (.5, .42)),
 ('bq', 'hall-dinner',   A + 'venue/banquet/banquet-hall-06.webp', (.5, .55), (.5, .55)),
 ('bq', 'table-layout',  A + 'venue/banquet/banquet-tables-06.webp', (.5, .55), (.5, .55)),
 ('pa', 'birthday-cake', C('birthday-cake-dad'), (.5, .5), (.5, .45)),
 # HS3: pa-kitty-ladies dropped: still heavily blue/teal and dark after grading (see NOTES-HS3)
 ('pa', 'kitty-games',   C('kitty-high-table-games'),   (.5, .5), (.5, .4)),
 ('pa', 'corporate',     C('corporate-audience-stage'), (.5, .6), (.5, .62)),
 ('pa', 'felicitation',  C('felicitation-group-stage'), (.5, .5), (.5, .5)),
 ('pa', 'cake-rose',     A + 'bites/bw-03-720.webp',    (.5, .6), (.5, .73)),
 ('pa', 'cake-two',      A + 'bites/bw-21-720.webp',    (.5, .62), (.5, .72)),
]

# ---- HS3 warm grade (baked into the webp, no CSS filters). Per-image white balance: if the photo leans blue (B/R > 1 in the mid-tones, the stage-LED look)
# the channel gains pull it back to neutral (clamped), then a small warm touch lifts reds/yellows and warms the midtones. Already-warm photos are left alone. ----
def _lin(a): return np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4)
def _srgb(a): return np.where(a <= .0031308, a * 12.92, 1.055 * np.clip(a, 0, 1) ** (1 / 2.4) - .055)
def cast(im, mask=None):
    a = np.asarray(im.convert('RGB'), dtype=np.float64)
    a = a[mask] if mask is not None else a.reshape(-1, 3); l = a.mean(1); m = (l > 40) & (l < 215)
    r, g, b = (a[m] if m.sum() > 500 else a).mean(0); return r, g, b
def grade_array(a, mask=None):
    """a: float array 0..1 sRGB HxWx3 -> graded. Returns graded array."""
    r, g, b = cast(Image.fromarray((a * 255 + .5).astype('uint8')), mask)
    br = b / max(r, 1)
    x = _lin(a)
    if br > 1.0:                                   # blue / purple cast: white-balance toward neutral (strength .9, clamped)
        gray = (r + g + b) / 3; gains = np.array([gray * 1.04 / r, gray / g, gray * .88 / b])   # aim slightly warm of neutral
        gains = 1 + (gains - 1) * .8; gains = np.clip(gains, [.9, .85, .6], [1.9, 1.5, 1.1]); x = x * gains / (gains * [.2126, .7152, .0722]).sum()
    if br > .9:                                    # selective: blue-dominant and purple pixels (LED light on floors, walls, screens) lose their blue; skin, reds and golds are untouched
        R, G, B = x[..., 0], x[..., 1], x[..., 2]; hi = np.maximum(R, G)
        ex = np.clip(B - hi, 0, None); x[..., 2] = B - .75 * ex                      # blue above red/green -> pulled down
        mg = np.clip(np.minimum(R, B) - G, 0, None); x[..., 1] = G + .55 * mg        # magenta/purple -> green lifted toward neutral
    w = 1.0 if br > .9 else .3                     # warm touch only where it is not already warm
    x = x * np.array([1 + .05 * w, 1 + .015 * w, 1 - .06 * w])
    y = _srgb(np.clip(x, 0, 1))
    lum = y.mean(2, keepdims=True); mid = 4 * lum * (1 - lum)    # midtone-weighted: lift red, trim blue a touch more
    y = y + mid * w * np.array([.018, .006, -.02])
    return np.clip(y, 0, 1)
def grade(im): return Image.fromarray((grade_array(np.asarray(im.convert('RGB'), dtype=np.float64) / 255) * 255 + .5).astype('uint8'))
NOGRADE = {'cake-two'}   # a genuinely blue cake: leave its colour alone
def cover(im, w, h, f):
    pw, ph = im.size; s = max(w / pw, h / ph)
    im = im.resize((max(w, round(pw * s)), max(h, round(ph * s))), Image.LANCZOS); pw, ph = im.size
    x = min(max(0, round(f[0] * pw - w / 2)), pw - w); y = min(max(0, round(f[1] * ph - h / 2)), ph - h)
    return im.crop((x, y, x + w, y + h))
for pg, name, src, fd, fp in (S if __name__ == '__main__' else []):
    im = Image.open(src).convert('RGB'); im = im if name in NOGRADE else grade(im)   # HS3: warm grade the full photo once, then crop
    for k, f in (('d', fd), ('p', fp)):
        w, h = SIZES[pg][k]; o = f'{OUT}{pg}-{name}-{k}.webp'
        cover(im, w, h, f).save(o, 'WEBP', quality=78, method=6); print(o, os.path.getsize(o) // 1024, 'KB')
