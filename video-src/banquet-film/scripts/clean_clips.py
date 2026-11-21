#!/usr/bin/env python3
"""Step 1: remove the round FURSAT corner badge (+ 'House of Reels' tag) per clip, strip reel audio,
and rebuild shot07 without its in-source white flashes / dip-to-black.  Output: video-src/clean/*.mp4 (1080x1920, silent)."""
import cv2, numpy as np, subprocess, sys, os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "hyperframes", "assets"); OUT = os.path.join(ROOT, "clean")
# badge boxes (x, y, size) in 1080x1920 source px, from template matching (see NOTES.md)
BADGE = {"shot01": (814,134,176), "shot02": (852,17,183), "shot03": (766,216,192), "shot04": (908,46,148),
         "shot05": (892,29,157), "shot06": (72,72,184), "shot07": (72,72,184),
         "split1": (782,144,192), "split2": (826,212,148), "split3": (836,74,176)}
EXTRA = {"shot04": 26, "shot05": 26, "split3": 26, "shot06": 16}   # wider mask where a faint ring of the disc edge survived
RECTS = {"shot07": [(836, 76, 976, 170)]}          # 'HOUSE OF REELS' tag
def make_mask(f, h, w):
    m = np.zeros((h, w), np.uint8)
    x, y, n = BADGE[f]; cv2.circle(m, (x + n // 2, y + n // 2), n // 2 + 16 + EXTRA.get(f, 0), 255, -1)
    for (a, b, c, d) in RECTS.get(f, []): cv2.rectangle(m, (a, b), (c, d), 255, -1)
    return m
def fill(img, m, rng):
    ys, xs = np.where(m > 0); pad = 70
    y0, y1, x0, x1 = max(0, ys.min() - pad), min(img.shape[0], ys.max() + pad), max(0, xs.min() - pad), min(img.shape[1], xs.max() + pad)
    roi = img[y0:y1, x0:x1]; mm = (m[y0:y1, x0:x1] > 0).astype(np.uint8) * 255
    k = 3; sm = cv2.resize(roi, None, fx=1 / k, fy=1 / k, interpolation=cv2.INTER_AREA)
    msm = cv2.resize(mm, (sm.shape[1], sm.shape[0]), interpolation=cv2.INTER_NEAREST)
    ip = cv2.inpaint(sm, msm, 6, cv2.INPAINT_TELEA)
    ip = cv2.GaussianBlur(ip, (0, 0), 2.0)
    est = cv2.resize(ip, (roi.shape[1], roi.shape[0]), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    est += rng.normal(0, 3.0, est.shape).astype(np.float32)            # match baked grain
    soft = cv2.GaussianBlur((mm > 0).astype(np.float32), (0, 0), 4)[..., None]; soft = np.clip(soft * 1.3, 0, 1)
    out = img.copy(); out[y0:y1, x0:x1] = np.clip(roi.astype(np.float32) * (1 - soft) + est * soft, 0, 255).astype(np.uint8)
    return out
def read_all(path):
    c = cv2.VideoCapture(path); fr = []
    while True:
        r, im = c.read()
        if not r: break
        fr.append(im)
    return fr
def clean(f):
    path = os.path.join(SRC, f + ".mp4"); rng = np.random.default_rng(7)
    if f != "shot07":                                    # stream frames (low memory)
        c = cv2.VideoCapture(path); h = int(c.get(4)); w = int(c.get(3)); m = make_mask(f, h, w); n = 0
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", "30", "-i", "-",
                              "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                              os.path.join(OUT, f + ".mp4")], stdin=subprocess.PIPE)
        while True:
            r, im = c.read()
            if not r: break
            p.stdin.write(fill(im, m, rng).tobytes()); n += 1
        p.stdin.close(); p.wait(); print("clean", f, n, "frames", flush=True); return
    fr = read_all(path)
    if f == "shot07":                                    # drop flash / black-dip frames (+3 frame buffer), keep first 90 clean
        mean = np.array([x.mean() for x in fr]); bad = (mean > 125) | (mean < 50)
        bad = np.convolve(bad.astype(int), np.ones(7, int), "same") > 0
        keep = [i for i in range(len(fr)) if not bad[i]]
        print("shot07 keep", len(keep), "of", len(fr), "->", keep[0], keep[-1]); fr = [fr[i] for i in keep][:90]
    h, w = fr[0].shape[:2]; m = make_mask(f, h, w)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", "30", "-i", "-",
                          "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                          os.path.join(OUT, f + ".mp4")], stdin=subprocess.PIPE)
    for im in fr: p.stdin.write(fill(im, m, rng).tobytes())
    p.stdin.close(); p.wait(); print("clean", f, len(fr), "frames", flush=True)
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in (sys.argv[1:] or BADGE): clean(f)
