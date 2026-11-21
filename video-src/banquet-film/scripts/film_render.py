#!/usr/bin/env python3
"""Film renderer (Python/OpenCV/PIL; replaces the HyperFrames render that can't run offline).
   python3 film_render.py --test 0.5 3 12 25      -> PNGs in /tmp/ft
   python3 film_render.py --out render/film_master.mp4   -> silent master (audio is muxed by encode_film.py)"""
import cv2, numpy as np, os, sys, subprocess, math
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film_lib import *
W, H, FPS = 1920, 1080, 30
RED, GREEN, CREAM, GOLD = (0xc0, 0x29, 0x1f), (0x2a, 0x50, 0x19), (0xf6, 0xe6, 0xd1), (0xc9, 0x9a, 0x43)   # RGB
bgr = lambda c: (c[2], c[1], c[0])
GF = "/usr/share/fonts/truetype/google-fonts/"
def lora(sz):
    f = ImageFont.truetype(GF + "Lora-Variable.ttf", sz); f.set_variation_by_name("Bold"); return f   # Playfair Display not installed
pop = lambda sz, w="Medium": ImageFont.truetype(GF + f"Poppins-{w}.ttf", sz)
clamp = lambda x: max(0.0, min(1.0, x))
e_out3 = lambda p: 1 - (1 - clamp(p)) ** 3
e_in3 = lambda p: clamp(p) ** 3
e_expo = lambda p: 1 - 2 ** (-10 * clamp(p)) if p < 1 else 1.0
e_io2 = lambda p: (2 * p * p if p < .5 else 1 - (-2 * p + 2) ** 2 / 2) if 0 < p < 1 else clamp(p)
TIN = {1: "whipL", 2: "whipR", 3: "zoom", 4: "whipR", 5: "whipL", 6: "zoom", 7: "whipL", 8: "iris", 9: "flash"}
CLIP = {1: "shot01", 2: "shot02", 3: "shot03", 4: "shot04", 6: "shot05", 7: "shot06", 8: "shot07"}
CAPS = {1: "Arrivals & first impressions", 2: "Dance floors that never stop", 3: "Colour, light & celebration", 4: "Buffets worth the trip",
        5: "Every kind of celebration", 6: "Halls built for big nights", 7: "Ambience in every corner", 8: "Birthdays, weddings, reunions"}
# ---------- text sprites ----------
def text_sprite(txt, font, fill, track=0.0):
    """RGBA PIL image of txt with letter tracking (px)."""
    d = ImageDraw.Draw(Image.new("RGBA", (4, 4))); adv = [d.textlength(c, font=font) + track for c in txt]
    asc, desc = font.getmetrics(); w = int(sum(adv)) + 8; im = Image.new("RGBA", (w, asc + desc + 8), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); x = 4
    for c, a in zip(txt, adv): dr.text((x, 2), c, font=font, fill=fill + (255,)); x += a
    return im
def words_sprites(txt, font, fill, gap):
    out, x = [], 0
    for w in txt.split(" "):
        s = text_sprite(w, font, fill); out.append((x, s)); x += s.width - 8 + gap
    return out, x
def paste(canvas, spr, x, y, alpha=1.0, dy=0):
    """alpha-composite a PIL RGBA sprite (or ndarray BGRA) onto BGR canvas at (x,y)."""
    a = np.asarray(spr) if not isinstance(spr, np.ndarray) else spr
    h, w = a.shape[:2]; x, y = int(x), int(y + dy); x0, y0, x1, y1 = max(0, x), max(0, y), min(canvas.shape[1], x + w), min(canvas.shape[0], y + h)
    if x1 <= x0 or y1 <= y0 or alpha <= 0: return
    s = a[y0 - y:y1 - y, x0 - x:x1 - x]; al = (s[..., 3:4].astype(np.float32) / 255.0) * alpha
    rgb = s[..., :3][..., ::-1] if not isinstance(spr, np.ndarray) else s[..., :3]
    roi = canvas[y0:y1, x0:x1].astype(np.float32); canvas[y0:y1, x0:x1] = np.clip(roi * (1 - al) + rgb.astype(np.float32) * al, 0, 255).astype(np.uint8)
# ---------- background plates ----------
def radial(c0, c1, cx=0.5, cy=0.5, r=0.75):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); d = np.sqrt(((xx / W - cx) * 1.0) ** 2 + ((yy / H - cy) * 0.56) ** 2) / (r * 0.6)
    d = np.clip(d, 0, 1)[..., None]; return (np.array(c0, np.float32) * (1 - d) + np.array(c1, np.float32) * d)
CREAM_BG = radial(bgr((0xfb, 0xef, 0xdd)), bgr((0xe4, 0xcc, 0xad))).astype(np.uint8)
GREEN_BG = radial(bgr((0x3a, 0x6a, 0x25)), bgr((0x1d, 0x3a, 0x10))).astype(np.uint8)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - 0.30 * np.clip((np.sqrt(((xx / W - .5)) ** 2 + ((yy / H - .5) * .56) ** 2) - 0.32) / 0.42, 0, 1) ** 1.6)[..., None].astype(np.float32)
VIG3 = np.repeat((VIG * 255).astype(np.uint8), 3, 2)
LEAK = (np.clip(1 - np.sqrt(((xx / W - .82) * 1.0) ** 2 + ((yy / H - .38) * .56) ** 2) / 0.6, 0, 1) ** 1.5)[..., None]
LEAKC = np.array([60, 140, 245], np.float32)   # BGR warm orange
# ---------- intro / outro ----------
LOGO = cv2.imread(os.path.join(ROOT, "brand", "logo_mark.png"), cv2.IMREAD_UNCHANGED)
_lh = 400; LOGO_S = cv2.resize(LOGO, (int(LOGO.shape[1] * _lh / LOGO.shape[0]), _lh), interpolation=cv2.INTER_CUBIC)
LOGO_S[..., :3] = cv2.addWeighted(LOGO_S[..., :3], 1.25, cv2.GaussianBlur(LOGO_S[..., :3], (0, 0), 1.2), -0.25, 0)   # light sharpen
BANQ = [text_sprite(c, pop(52), RED, 0) for c in "BANQUETS"]
def tracked_letters(txt, font, fill, track):
    out, x = [], 0
    for c in txt:
        s = text_sprite(c, font, fill); out.append((x, s)); x += s.width - 8 + track
    return out, x - track
BQ, BQ_W = tracked_letters("BANQUETS", pop(54, "Medium"), RED, 26)
def intro_img(u):
    im = CREAM_BG.copy(); cx = W // 2
    p = e_expo(u / 0.8); sc = 0.94 + 0.06 * p; lw, lh = int(LOGO_S.shape[1] * sc), int(LOGO_S.shape[0] * sc)
    lg = cv2.resize(LOGO_S, (lw, lh), interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    top = 190; paste(im, lg, cx - lw // 2, top + (LOGO_S.shape[0] - lh) // 2, alpha=clamp(u / 0.5))
    rw = int(560 * e_expo((u - 0.35) / 0.8)); ry = top + 400 + 46
    if rw > 2: cv2.rectangle(im, (cx - rw // 2, ry), (cx + rw // 2, ry + 4), bgr(GOLD), -1)
    for i, (x, s) in enumerate(BQ):
        a = clamp((u - 0.5 - 0.05 * i) / 0.35); paste(im, s, cx - BQ_W // 2 + x, ry + 34, alpha=a, dy=(1 - a) * 10)
    return im
OT, _ = words_sprites("FURSAT BANQUETS", lora(128), CREAM, 34); OT_W = _
TAG, TAG_W = words_sprites("Where every celebration finds its home", pop(46, "Regular"), CREAM, 14)
CTA_T = text_sprite("Reserve your date", pop(40, "Medium"), CREAM, 1.5)
def pill(w, h):
    s = 3; img = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w * s - 1, h * s - 1], radius=h * s // 2, fill=RED + (255,), outline=GOLD + (255,), width=3 * s)
    return np.asarray(img.resize((w, h), Image.LANCZOS))[..., [2, 1, 0, 3]].copy()
PILL_W, PILL_H = CTA_T.width + 150, 96; PILL = pill(PILL_W, PILL_H)
def outro_img(u):
    im = GREEN_BG.copy(); cx = W // 2
    ins = int(54 * e_out3(u / 0.7)); a = 0.55 * clamp(u / 0.6)
    ov = im.copy(); cv2.rectangle(ov, (ins, ins), (W - ins, H - ins), bgr(GOLD), 2); im = cv2.addWeighted(ov, a, im, 1 - a, 0)
    for i, (x, s) in enumerate(OT):
        a = clamp((u - 0.2 - 0.12 * i) / 0.5); paste(im, s, cx - OT_W // 2 + x, 300, alpha=a, dy=(1 - a) * 14)
    rw = int(180 * e_expo((u - 0.85) / 0.7))
    if rw > 2: cv2.rectangle(im, (cx - rw // 2, 492), (cx + rw // 2, 495), bgr(GOLD), -1)
    for i, (x, s) in enumerate(TAG):
        a = clamp((u - 0.6 - 0.07 * i) / 0.45); paste(im, s, cx - TAG_W // 2 + x, 545, alpha=0.95 * a, dy=(1 - a) * 8)
    a = clamp((u - 1.2) / 0.5); sc = 0.92 + 0.08 * e_out3((u - 1.2) / 0.6)
    pw, ph = int(PILL_W * sc), int(PILL_H * sc); pl = cv2.resize(PILL, (pw, ph), interpolation=cv2.INTER_AREA)
    paste(im, pl, cx - pw // 2, 730 + (PILL_H - ph) // 2, alpha=a); paste(im, CTA_T, cx - CTA_T.width // 2 + 2, 730 + (PILL_H - CTA_T.height) // 2 + 4, alpha=a)
    return im
# ---------- reels ----------
def bg_plate(fr):
    h, w = fr.shape[:2]; sm = cv2.resize(fr, (192, max(108, int(192 * h / w))), interpolation=cv2.INTER_AREA)
    t = (sm.shape[0] - 108) // 2; sm = cv2.GaussianBlur(sm[t:t + 108], (0, 0), 3.5)
    hsv = cv2.cvtColor(sm, cv2.COLOR_BGR2HSV).astype(np.float32); hsv[..., 1] *= 1.25; hsv[..., 2] *= 0.72
    sm = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    return cv2.resize(sm, (W, H), interpolation=cv2.INTER_CUBIC)
def single_img(fr, u, d):
    k = 1.04 + 0.06 * (u / d); h, w = fr.shape[:2]; s = H / h * k; fw, fh = int(round(w * s)), int(round(h * s))
    f = cv2.resize(fr, (fw, fh), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR); im = bg_plate(fr)
    x0 = (W - fw) // 2; ty = (fh - H) // 2
    sh = np.zeros((H, W), np.float32); cv2.rectangle(sh, (x0, 0), (x0 + fw, H), 1, -1); sh = cv2.GaussianBlur(sh, (0, 0), 28)[..., None]
    im = (im.astype(np.float32) * (1 - 0.35 * sh)).astype(np.uint8)
    im[:, max(0, x0):min(W, x0 + fw)] = f[ty:ty + H, max(0, -x0):max(0, -x0) + min(W, x0 + fw) - max(0, x0)]
    return im
def split_img(frs, u, d):
    im = np.zeros((H, W, 3), np.uint8)
    for p, fr in enumerate(frs):
        pu = u - 0.15 * p; slide = 1 - e_out3(pu / 0.75) if pu < 0.75 else 0
        k = 1.06 + 0.05 * (u / d); h, w = fr.shape[:2]; s = max(640 / w, H / h) * k; fw, fh = int(round(w * s)), int(round(h * s))
        f = cv2.resize(fr, (fw, fh), interpolation=cv2.INTER_AREA); x0, y0 = (fw - 640) // 2, (fh - H) // 2
        panel = f[y0:y0 + H, x0:x0 + 640]; oy = int(slide * H)
        if pu <= 0: continue
        im[oy:, p * 640:(p + 1) * 640] = panel[:H - oy]
    a = clamp((u - 0.5) / 0.5) * 0.95
    for x in (638, 1278):
        ov = im[:, x:x + 4].astype(np.float32); im[:, x:x + 4] = (ov * (1 - a) + np.array(bgr(RED), np.float32) * a).astype(np.uint8)
    return im
# ---------- captions ----------
CAPF = pop(46, "Medium"); NUMF = pop(28, "Medium")
CAPS_S = {}
for k, tx in CAPS.items():
    ws, tw = words_sprites(tx, CAPF, CREAM, 14); num = text_sprite(" ".join(f"{k:02d}"), NUMF, GOLD, 3)
    CAPS_S[k] = (ws, tw, text_sprite(f"{k:02d}", NUMF, GOLD, 6))
def caption(im, k, t):
    t0 = STARTS[k] + 0.5; dur = min(2.55, DURS[k] - 0.95); u = t - t0
    if u < 0 or u > dur: return
    ws, tw, num = CAPS_S[k]; out = clamp((dur - u) / 0.3)                        # clean exit
    first = clamp((u - 0.15) / 0.45) * out                                         # box opacity follows the first word -> never an empty box
    if first <= 0: return
    x0, y0 = 96, 872; bw, bh = 6 + 24 + tw + 64, 112
    grad = np.linspace(0.82, 0.0, bw, dtype=np.float32)[None, :, None] * np.ones((bh, 1, 1), np.float32)
    box = np.zeros((bh, bw, 4), np.uint8); box[..., :3] = (6, 5, 8); box[..., 3] = (np.clip(grad[..., 0], 0, 1) * 255).astype(np.uint8)
    paste(im, box, x0, y0, alpha=first)
    bar_h = int(bh * e_expo((u) / 0.6)) * (1 if out > 0 else 0)
    if bar_h > 0:
        ov = im[y0 + bh - bar_h:y0 + bh, x0:x0 + 6].astype(np.float32); im[y0 + bh - bar_h:y0 + bh, x0:x0 + 6] = (ov * (1 - out) + np.array(bgr(RED), np.float32) * out).astype(np.uint8)
    paste(im, num, x0 + 30 - 4, y0 + 12, alpha=clamp((u - 0.3) / 0.35) * out)
    for i, (x, s) in enumerate(ws):
        a = clamp((u - 0.15 - 0.08 * i) / 0.5); paste(im, s, x0 + 30 - 4 + x, y0 + 46, alpha=a * out, dy=(1 - e_out3(a)) * 14)
# ---------- compositor ----------
class Film:
    def __init__(self): self.rd = {}
    def reader(self, n):
        if n not in self.rd: self.rd[n] = Reader(n)
        return self.rd[n]
    def seg(self, k, t):
        u = max(0.0, t - STARTS[k]); d = DURS[k]
        if k == 0: return intro_img(u)
        if k == 9: return outro_img(u)
        i = min(int(u * FPS), 10 ** 6)
        if k == 5:
            return split_img([self.reader(n).get(i) for n in ("split1", "split2", "split3")], u, d)
        return single_img(self.reader(CLIP[k]).get(i), u, d)
    def warp(self, img, s=1.0, tx=0.0, blur=0):
        if s == 1.0 and tx == 0.0: return img
        M = np.float32([[s, 0, W / 2 - s * W / 2 + tx], [0, s, H / 2 - s * H / 2]])
        o = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        return cv2.blur(o, (blur, 1)) if blur > 2 else o
    def frame(self, t):
        ks = [k for k in range(10) if STARTS[k] - 1e-6 <= t < STARTS[k] + DURS[k] - 1e-6] or [9]
        if len(ks) == 1: img = self.seg(ks[0], t)
        else:
            o, n = ks[0], ks[1]; q = clamp((t - STARTS[n]) / T); kind = TIN[n]; base = self.seg(o, t); top = self.seg(n, t)
            w = 0.14 * W
            if kind in ("whipL", "whipR"):
                sgn = 1 if kind == "whipL" else -1
                base = self.warp(base, tx=-sgn * w * e_in3(q), blur=int(1 + 2 * int(28 * e_in3(q))))
                top = self.warp(top, tx=sgn * w * (1 - e_out3(q)), blur=int(1 + 2 * int(28 * (1 - e_out3(q)))))
                a = e_out3(q); img = cv2.addWeighted(top, a, base, 1 - a, 0)
            elif kind == "zoom":
                base = self.warp(base, s=1 + 0.2 * e_in3(q)); top = self.warp(top, s=1 + 0.35 * (1 - e_out3(q)))
                a = e_out3(q); img = cv2.addWeighted(top, a, base, 1 - a, 0)
            elif kind == "iris":
                r = int(1250 * e_out3(q)); m = np.zeros((H, W), np.uint8); cv2.circle(m, (W // 2, H // 2), r, 255, -1)
                m = cv2.GaussianBlur(m, (0, 0), 6)[..., None].astype(np.float32) / 255; img = (top * m + base * (1 - m)).astype(np.uint8)
            else:
                a = e_io2(q); img = cv2.addWeighted(top, a, base, 1 - a, 0)
        # light leak (warm, soft) + punch-in on each cut
        pk, pt = 0.0, 0.0
        for k in range(1, 10):
            c = STARTS[k] + T / 2
            if c - 0.14 <= t <= c + 0.4: pk = max(pk, 0.42 * (clamp((t - (c - 0.14)) / 0.14) if t < c else clamp(1 - (t - c) / 0.4) ** 1.5))
            if k < 9 and c - 0.06 <= t <= c + 0.5: pt = max(pt, 0.035 * (e_out3((t - (c - 0.06)) / 0.12) if t < c + 0.06 else 1 - e_out3((t - c - 0.06) / 0.44)))
        if pk > 0.01:
            f = img.astype(np.float32); lk = LEAK * LEAKC * pk; img = np.clip(255 - (255 - f) * (255 - lk) / 255, 0, 255).astype(np.uint8)
        if pt > 0.002: img = self.warp(img, s=1 + pt)
        img = cv2.multiply(img, VIG3, scale=1 / 255.0)
        if not os.environ.get("NOCAPS"):
            for k in CAPS: caption(img, k, t)
        return img
def main():
    f = Film()
    if "--test" in sys.argv:
        os.makedirs("/tmp/ft", exist_ok=True)
        for s in sys.argv[sys.argv.index("--test") + 1:]: cv2.imwrite(f"/tmp/ft/t{float(s):05.2f}.png", f.frame(float(s)))
        return
    out = sys.argv[sys.argv.index("--out") + 1]; os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    n = int(round(TOTAL * FPS)); p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(f.frame(i / FPS).tobytes())
        if i % 30 == 0: print("frame", i, "/", n, flush=True)
    p.stdin.close(); p.wait(); print("done", n)
if __name__ == "__main__": main()
