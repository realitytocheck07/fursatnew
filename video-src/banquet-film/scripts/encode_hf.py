#!/usr/bin/env python3
"""Encode the HyperFrames render (render/hf_master.mp4) into hero.mp4 (<5 MB, faststart), hero.webm, poster.jpg."""
import os, sys, argparse, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("bh", os.path.join(here, "build_hero.py"))
bh = importlib.util.module_from_spec(spec); spec.loader.exec_module(bh)
C = bh.CONFIG
ap = argparse.ArgumentParser(); ap.add_argument("--out", default=os.path.join(bh.ROOT, "..", "public", "video"))
ap.add_argument("--master", default=os.path.join(bh.ROOT, "render", "hf_master.mp4")); a = ap.parse_args()
out = os.path.abspath(a.out); os.makedirs(out, exist_ok=True); m = a.master
import subprocess
_dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", m]).decode().strip())
_total = 4.65e6 * 8 / 1000 / _dur  # keep hero.mp4 under 5 MB for any cut length
C["video_kbps"] = int((_total - C["audio_kbps"]) * 0.97); C["webm_kbps"] = int(C["video_kbps"] * 0.86)
print(f"master {_dur:.2f}s -> mp4 {C['video_kbps']} kbps, webm {C['webm_kbps']} kbps")
log = os.path.join(bh.ROOT, "render", "work", "hfpass"); os.makedirs(os.path.dirname(log), exist_ok=True)
v = ["-b:v", f"{C['video_kbps']}k", "-maxrate", f"{int(C['video_kbps']*1.5)}k", "-bufsize", f"{C['video_kbps']*2}k"]
x = ["-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-profile:v", "high", "-passlogfile", log]
bh.run(["ffmpeg", "-v", "error", "-y", "-i", m] + x + v + ["-pass", "1", "-an", "-f", "mp4", os.devnull])
bh.run(["ffmpeg", "-v", "error", "-y", "-i", m] + x + v + ["-pass", "2", "-c:a", "aac", "-b:a", f"{C['audio_kbps']}k", "-ac", "2", "-movflags", "+faststart", f"{out}/hero.mp4"])
w = ["-c:v", "libvpx-vp9", "-b:v", f"{C['webm_kbps']}k", "-pix_fmt", "yuv420p", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-passlogfile", log + "v"]
bh.run(["ffmpeg", "-v", "error", "-y", "-i", m] + w + ["-pass", "1", "-an", "-f", "webm", os.devnull])
bh.run(["ffmpeg", "-v", "error", "-y", "-i", m] + w + ["-pass", "2", "-c:a", "libopus", "-b:a", f"{C['audio_kbps']}k", f"{out}/hero.webm"])
bh.run(["ffmpeg", "-v", "error", "-y", "-ss", "6.4", "-i", m, "-frames:v", "1", "-vf", "scale=1920:1080", "-q:v", "5", f"{out}/poster.jpg"])
for f in ("hero.mp4", "hero.webm", "poster.jpg"): print(f, f"{os.path.getsize(os.path.join(out, f))/1e6:.2f} MB")
