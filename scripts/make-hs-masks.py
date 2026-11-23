#!/usr/bin/env python3
"""Hero slideshow window masks (kit HS). The gold-frame art originals are not in the repo, so each window is traced by hand
(percent coordinates of the baked hero image) and checked on an overlay. A few px inside the gold rim so the rim stays crisp.
Banquet laptop already has bq-hero-window-mask.webp. Run from repo root: python3 scripts/make-hs-masks.py (Pillow)."""
import math
from PIL import Image, ImageDraw, ImageFilter
H = 'public/assets/heroes/'
S = 3  # supersample
import os, shutil, sys, importlib.util
import numpy as np
SRC = 'scripts/hs-src/'   # HS3: untouched copies of the baked hero art, so the stretch + grade below can be re-run without stacking
os.makedirs(SRC, exist_ok=True)
for _n in ['party-phone-780','party-phone-1080','party-768','party-1024','party-1536','banquet-768','banquet-1024','banquet-1536','banquet-phone-780','banquet-phone-1080']:
    if not os.path.exists(SRC + _n + '.webp'): shutil.copy(H + _n + '.webp', SRC + _n + '.webp')
_sp = importlib.util.spec_from_file_location('hsl', 'scripts/make-hs-slides.py'); hsl = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(hsl)
# HS3: Party phone art is stretched taller (614 -> 785 px high, same as the Banquet phone art) so the window grows from ~54 % to ~60 % of the art and
# ~1.4x taller in pixels. The top 250 px (cream + leaf) hardly change; everything below is stretched 1.46x. The mask is traced in percent of the OLD art, so
# its y values go through the same map. Window box for party.astro is printed at the end.
PH_OLD, PH_NEW, PH_CUT, PH_TOP = 614, 785, 250, 255
def pmap(y):  # old px -> new px
    return y * PH_TOP / PH_CUT if y <= PH_CUT else PH_TOP + (y - PH_CUT) * (PH_NEW - PH_TOP) / (PH_OLD - PH_CUT)
def pmap_pct(y): return pmap(y / 100 * PH_OLD) / PH_NEW * 100
def stretch(im):
    W0 = im.width; cut = round(PH_CUT * im.height / PH_OLD)
    return im.crop((0, 0, W0, cut)).resize((W0, PH_TOP), Image.LANCZOS), im.crop((0, cut, W0, im.height)).resize((W0, PH_NEW - PH_TOP), Image.LANCZOS)
def ell(d, W, Hh, cx, cy, rx, ry, rot, fill):
    pts = []
    for i in range(120):
        t = i / 120 * 2 * math.pi; x = rx * math.cos(t); y = ry * math.sin(t); r = math.radians(rot)
        pts.append(((cx + (x * math.cos(r) - y * math.sin(r)) * 1) / 100 * W * S, (cy + (x * math.sin(r) + y * math.cos(r))) / 100 * Hh * S))
    d.polygon(pts, fill=fill)
def poly(d, W, Hh, pts, fill):
    d.polygon([(x / 100 * W * S, y / 100 * Hh * S) for x, y in pts], fill=fill)
def save(m, W, Hh, out, ref):
    m = m.resize((W, Hh), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.0))
    rgba = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); rgba.putalpha(m); rgba.save(H + out, 'WEBP', quality=80, method=6)
    im = Image.open(H + ref).convert('RGB'); red = Image.new('RGB', im.size, (255, 0, 0))
    Image.composite(red, im, m.point(lambda v: v // 2)).save('/tmp/ov-' + out.replace('.webp', '.png'))
    print(out, (W, Hh), m.getbbox())
def canvas(W, Hh): m = Image.new('L', (W * S, Hh * S), 0); return m, ImageDraw.Draw(m)

# party laptop (1536x864): back oval (polygon, runs off the right edge) minus the front oval's rim, plus the front oval's photo
W, Hh = 1536, 864
m, d = canvas(W, Hh)
poly(d, W, Hh, [(69.2,36),(70.4,31),(72.8,27.2),(76,24),(80,21.6),(84,20.6),(88.5,20.8),(93,21.8),(97,24.2),(100,27),(100,52.5),(96.5,56),(92.8,58.8),(88,61.2),(83.8,62.6),(78,58),(72,50),(69,42)], 255)
ell(d, W, Hh, 69.6, 54.2, 14.9, 16.4, 4, 0)      # front oval incl. its gold rim: cut out
ell(d, W, Hh, 69.6, 54.2, 13.3, 14.6, 4, 255)    # front oval photo
save(m, W, Hh, 'pa-hero-window-mask.webp', 'party-1536.webp')
# party phone: one wide blob window (the tiny second oval top right stays as baked). HS3: art + mask are 1080x785 now.
W, Hh = 1080, PH_NEW
m, d = canvas(W, Hh)
_pts = [(10.5,41.4),(18.5,38.8),(27,37.9),(35,39.3),(42.6,42.8),(50,46),(59,48.5),(68,50.2),(77,54.2),(85,58.4),(92.5,61),(97.5,65),(98.5,72),(98,80),(92.6,86),(83.3,89),(74,90.4),(64.8,91.2),(55.6,91.8),(46,91.4),(37,90.4),(28,89.8),(14,89),(7.5,86),(3.5,80),(2.4,70),(2.6,60),(4.6,48.5)]
poly(d, W, Hh, [(x, pmap_pct(y)) for x, y in _pts], 255)
print('party phone win box p:', [2.4, round(pmap_pct(37.9), 1), 98.5, round(pmap_pct(91.7), 1)], 'art', (W, Hh))
for _k, _w in (('1080', 1080), ('780', 780)):
    _o = Image.open(SRC + 'party-phone-1080.webp').convert('RGB'); _top, _bot = stretch(_o)
    _n = Image.new('RGB', _o.size[:1] + (PH_NEW,)); _n.paste(_top, (0, 0)); _n.paste(_bot, (0, _top.height)); _n = _n.resize((1080, PH_NEW), Image.LANCZOS) if _n.size != (1080, PH_NEW) else _n
    _n.save(H + 'party-phone-1080.webp', 'WEBP', quality=82, method=6); _n.resize((780, round(PH_NEW * 780 / 1080)), Image.LANCZOS).save(H + 'party-phone-780.webp', 'WEBP', quality=82, method=6)
    break
save(m, W, Hh, 'pa-hero-window-mask-phone.webp', 'party-phone-1080.webp')
# banquet phone (1080x785)
W, Hh = 1080, 785
m, d = canvas(W, Hh)
poly(d, W, Hh, [(28.5,40.4),(37,39.9),(48,39.6),(55.5,38.2),(64.8,34.4),(74,31),(83.3,29.8),(90.4,31.6),(95,35.2),(96.8,42),(97.6,51),(96.8,61),(95.8,73.7),(94.8,86.5),(92,91.5),(85,94),(70,95.6),(50,96),(30,95.6),(19,92),(14.5,88.5),(10,83.5),(6.2,76.2),(5.2,67.3),(6.2,61),(9.8,55),(15.2,48.6),(20.8,43.6),(24.5,41.6)], 255)
save(m, W, Hh, 'bq-hero-window-mask-phone.webp', 'banquet-phone-1080.webp')

# ---- HS3: warm grade of the baked first slide (the photo inside the art window), same grade as the other slides; only inside the window mask, so the gold frame keeps its colour ----
def bake(name, mask_file):
    im = Image.open(SRC + name + '.webp').convert('RGB'); mk = Image.open(H + mask_file).split()[-1].resize(im.size, Image.LANCZOS)
    a = np.asarray(im, dtype=np.float64) / 255; mm = np.asarray(mk, dtype=np.float64)[..., None] / 255
    g = hsl.grade_array(a, (mm[..., 0] > .5))
    out = a * (1 - mm) + g * mm
    Image.fromarray((out * 255 + .5).astype('uint8')).save(H + name + '.webp', 'WEBP', quality=82, method=6); print('graded', name)
for _n in ['party-768', 'party-1024', 'party-1536']: bake(_n, 'pa-hero-window-mask.webp')
for _n in ['banquet-768', 'banquet-1024', 'banquet-1536']: bake(_n, 'bq-hero-window-mask.webp')
# the stretched party phone art must be graded from its own (stretched) pixels, so grade the files just written
import io
for _n in ['party-phone-780', 'party-phone-1080']:
    im = Image.open(H + _n + '.webp').convert('RGB'); mk = Image.open(H + 'pa-hero-window-mask-phone.webp').split()[-1].resize(im.size, Image.LANCZOS)
    a = np.asarray(im, dtype=np.float64) / 255; mm = np.asarray(mk, dtype=np.float64)[..., None] / 255
    g = hsl.grade_array(a, (mm[..., 0] > .5)); out = a * (1 - mm) + g * mm
    Image.fromarray((out * 255 + .5).astype('uint8')).save(H + _n + '.webp', 'WEBP', quality=82, method=6); print('graded', _n)
for _n in ['banquet-phone-780', 'banquet-phone-1080']: bake(_n, 'bq-hero-window-mask-phone.webp')
