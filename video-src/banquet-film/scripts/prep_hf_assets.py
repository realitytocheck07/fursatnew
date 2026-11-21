#!/usr/bin/env python3
"""Cut H.264 per-shot assets for the HyperFrames composition (browsers can't decode the HEVC reels)."""
import os, sys, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("bh", os.path.join(here, "build_hero.py"))
bh = importlib.util.module_from_spec(spec); spec.loader.exec_module(bh)
OUT = os.path.join(os.path.dirname(here), "hyperframes", "assets")
os.makedirs(OUT, exist_ok=True)
C = bh.CONFIG
# beat-snapped in-points found by build_hero.py (re-run snap_to_beat to refresh)
SNAP = {"064235_110": 2.68, "064242_788": 38.81, "064249_108": 28.0, "064253_669": 48.83,
        "064259_949": 36.77, "064307_961": 12.58, "064311_112": 23.27,
        "064317_796": 3.87, "064321_012": 23.08, "064335_497": 20.32}

def cut(name, id_, start, dur, audio=True, fade_out=0.0):
    g = bh.measure_gain(id_, start, dur) if audio else 0
    af = f"volume={g:.2f}dB,alimiter=limit=0.84:level=disabled" + (f",afade=t=out:st={dur-fade_out}:d={fade_out}" if fade_out else "")
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(dur), "-i", bh.src(id_),
           "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-g", "30"]
    cmd += ["-af", af, "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2"] if audio else ["-an"]
    cmd += ["-movflags", "+faststart", os.path.join(OUT, name)]
    bh.run(cmd); print("cut", name, f"{os.path.getsize(os.path.join(OUT, name))/1e6:.1f}MB")

D, S = C["clip_dur"], C["split_dur"]
for i, id_ in enumerate(["064235_110", "064242_788", "064249_108", "064253_669"], 1):
    cut(f"shot{i:02d}.mp4", id_, SNAP[id_], D, audio=(id_ != "064249_108"))
for k, id_ in enumerate(["064259_949", "064307_961", "064311_112"]):
    cut(f"split{k+1}.mp4", id_, SNAP[id_], S, audio=(k == 1))
for i, id_ in zip((5, 6, 7), ["064317_796", "064321_012", "064335_497"]):
    cut(f"shot{i:02d}.mp4", id_, SNAP[id_], D)
# reel 3 has no sound: let reel 2's track carry on under it
g = bh.measure_gain("064242_788", 42.8, D)
bh.run(["ffmpeg", "-v", "error", "-y", "-ss", "42.8", "-t", str(D), "-i", bh.src("064242_788"), "-vn",
        "-af", f"volume={g:.2f}dB,alimiter=limit=0.84:level=disabled", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        os.path.join(OUT, "bed03.m4a")])
g = bh.measure_gain("064335_497", 24.9, C["outro_dur"])
bh.run(["ffmpeg", "-v", "error", "-y", "-ss", "24.9", "-t", str(C["outro_dur"]), "-i", bh.src("064335_497"), "-vn",
        "-af", f"volume={g:.2f}dB,alimiter=limit=0.84:level=disabled", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        os.path.join(OUT, "outro.m4a")])
print("done")
