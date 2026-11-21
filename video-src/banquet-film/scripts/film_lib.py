"""Shared config for the film/loop renderers."""
import cv2, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLEAN = os.path.join(ROOT, "clean")
# source rows kept (1080x1920 source): hides burnt-in text / residue
CROPS = {"shot02": (0, 1500), "shot05": (500, 1920), "split3": (520, 1920)}
# source frame ranges used, in order (end exclusive): skips the reels' own white wipes / flares
SEL = {"shot01": [(11, 125)], "shot03": [(9, 125)], "split1": [(0, 70), (78, 181)], "split2": [(0, 72), (83, 181)]}
def frame_ids(name, n):
    ids = []
    for a, b in SEL.get(name, [(0, n)]): ids += list(range(a, min(b, n)))
    return ids
class Reader:
    """Sequential reader returning the i-th *selected* frame (forward access, cached last)."""
    def __init__(self, name):
        self.cap = cv2.VideoCapture(os.path.join(CLEAN, name + ".mp4")); self.n = int(self.cap.get(7))
        self.ids = frame_ids(name, self.n); self.pos = 0; self.last = None; self.name = name
        y0, y1 = CROPS.get(name, (0, 1920)); self.y0, self.y1 = y0, y1
    def get(self, i):
        i = max(0, min(i, len(self.ids) - 1)); want = self.ids[i]
        if want < self.pos:
            self.cap.set(1, want); self.pos = want
        while self.pos < want: self.cap.grab(); self.pos += 1
        if self.pos == want:
            r, im = self.cap.read(); self.pos += 1
            if r: self.last = im[self.y0:self.y1]
        return self.last

# ---- timeline (seconds) ----
T = 0.45
DURS = [1.8, 3.0, 3.0, 3.0, 3.0, 4.5, 3.0, 3.0, 2.65, 3.5]   # intro, shot01-04, split, shot05-07, outro
STARTS = [round(sum(DURS[:k]) - k * T, 3) for k in range(len(DURS))]
TOTAL = round(sum(DURS) - (len(DURS) - 1) * T, 3)
