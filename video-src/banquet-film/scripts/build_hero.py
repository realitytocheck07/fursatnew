#!/usr/bin/env python3
"""FURSAT BANQUETS hero video, config-driven ffmpeg pipeline.

Edit CONFIG below (colors, text, durations, trims) and re-run:
    python3 scripts/build_hero.py            # full build -> ../public/video (or --out)
    python3 scripts/build_hero.py --draft    # fast 960x540 preview, no 2-pass encode

Needs: python3, numpy, scipy, ffmpeg (libx264, libvpx-vp9, drawtext, xfade).
"""
import argparse, json, os, re, shutil, subprocess, sys
import numpy as np
from scipy.signal import find_peaks

# ───────────────────────── CONFIG (edit me) ─────────────────────────
CONFIG = dict(
    W=1920, H=1080, FPS=30,
    brand="FURSAT", brand_sub="B A N Q U E T S",
    outro_title="FURSAT BANQUETS", outro_tag="Where every celebration finds its home",
    outro_cta="Reserve your date",
    colors=dict(red="B52A2E", cream="F6EFE3", dark="120C0D", gold="D9A441", leak="FF9A4A"),
    font_bold="/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf",
    font_reg="/usr/share/fonts/opentype/inter/Inter-Regular.otf",
    font_semi="/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    T=0.45,                 # transition length (s)
    intro_dur=1.5, outro_dur=3.5, clip_dur=4.2, split_dur=6.0,
    target_lufs=-16.0,
    kb_start=1.10, kb_end=1.17,     # Ken Burns push-in on the reel (1.10 also hides the IG watermark)
    grain=3, vignette_angle=0.62,   # film grain strength, vignette (radians; lower = stronger)
    video_kbps=900, webm_kbps=780, audio_kbps=96,
)

# Shots in filename order. start = source in-point (s). Reels 5-7 form the split-screen.
# caption = lower-third text (edit freely). audio_from = borrow audio from another file (reel 3 is silent).
SHOTS = [
    dict(id="064235_110", start=3.08,  caption="Arrivals & first impressions",  trans="slideleft"),
    dict(id="064242_788", start=39.0,  caption="Dance floors that never stop",  trans="smoothright"),
    dict(id="064249_108", start=28.0,  caption="Colour, light & celebration",   trans="zoomin",
         audio_from=dict(id="064242_788", start=42.8)),
    dict(id="064253_669", start=49.0,  caption="Buffets worth the trip",        trans="slideright"),
    # --- split-screen group (3 reels at once) ---
    dict(id="064259_949", start=37.0,  split=True),
    dict(id="064307_961", start=13.1,  split=True, audio=True),
    dict(id="064311_112", start=22.93, split=True),
    dict(id="064317_796", start=3.87,  caption="Halls built for big nights",    trans="radial"),
    dict(id="064321_012", start=23.07, caption="Ambience in every corner",      trans="smoothleft"),
    dict(id="064335_497", start=20.86, caption="Birthdays, weddings, reunions", trans="distance"),
]
SPLIT_CAPTION = "Every kind of celebration"
SPLIT_TRANS_IN, SPLIT_TRANS_OUT = "slideleft", "zoomin"
SPLIT_AUDIO_FALLBACK = None
OUTRO_AUDIO_FROM = dict(id="064335_497", start=24.9)
# ────────────────────────────────────────────────────────────────────

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIPS = os.path.join(ROOT, "clips")
WORK = os.path.join(ROOT, "render", "work")
os.makedirs(WORK, exist_ok=True)
C = CONFIG
W, H, FPS, T = C["W"], C["H"], C["FPS"], C["T"]


def run(cmd, quiet=True):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(" ".join(cmd)[:600]); print(r.stderr[-2500:]); sys.exit(1)
    return r


def src(id_):
    return os.path.join(CLIPS, f"VID_20261120_{id_}.mp4")


def hexc(h):
    return "0x" + h


def snap_to_beat(id_, start, win=0.6):
    """Move the in-point to the strongest audio onset within +-win seconds (beat-synced cut)."""
    a0 = max(0.0, start - win)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a0), "-t", str(2 * win), "-i", src(id_),
                          "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32)
    if len(a) < 3200:
        return start
    hop = 160
    e = np.sqrt((a[: len(a) // hop * hop].reshape(-1, hop) ** 2).mean(1))
    flux = np.r_[0, np.maximum(np.diff(np.log(e + 1e-4)), 0)]
    flux = np.convolve(flux, np.ones(3) / 3, "same")
    pk, _ = find_peaks(flux, height=flux.max() * 0.5, distance=15)
    if not len(pk):
        return start
    best = pk[np.argmax(flux[pk])]
    return round(a0 + best / 100.0, 2)


def measure_gain(id_, start, dur):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(start), "-t", str(dur), "-i", src(id_),
                        "-vn", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    if not m:
        return 0.0
    g = C["target_lufs"] - float(m[-1])
    return max(-12.0, min(12.0, g))


def audio_chain(id_, start, dur, in_idx):
    g = measure_gain(id_, start, dur)
    return (f"[{in_idx}:a]atrim=0:{dur},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
            f"volume={g:.2f}dB,alimiter=limit=0.84:level=disabled,afade=t=in:d=0.02[aout]")


def ease_out3(p):  # power3.out
    return f"(1-pow(1-({p}),3))"


def ease_expo(p):  # expo.out
    return f"(1-pow(2,-10*({p})))"


def prog(t0, d):
    return f"min(max((t-{t0})/{d},0),1)"


def seg_path(i):
    return os.path.join(WORK, f"seg{i:02d}.mp4")


def build_clip(i, shot, start, dur):
    """One reel: blurred+zoomed copy as background (parallax pull), sharp reel on top with a push-in."""
    kb0, kb1 = C["kb_start"], C["kb_end"]
    afrom = shot.get("audio_from")
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", str(dur), "-i", src(shot["id"])]
    if afrom:
        cmd += ["-ss", str(afrom["start"]), "-t", str(dur), "-i", src(afrom["id"])]
        a_in, a_id, a_start = 1, afrom["id"], afrom["start"]
    else:
        a_in, a_id, a_start = 0, shot["id"], start
    fg_h = f"{H}*({kb0}+({kb1}-{kb0})*t/{dur})"
    bg_s = f"{W}*(1.30-0.08*t/{dur})"
    v = (f"[0:v]setpts=PTS-STARTPTS,fps={FPS},split=2[a][b];"
         f"[a]scale=w='{bg_s}':h=-2:eval=frame,crop={W}:{H},gblur=sigma=34,eq=brightness=-0.10:saturation=1.25[bg];"
         f"[b]scale=w=-2:h='{fg_h}':eval=frame:flags=bicubic[fg];"
         f"[bg][fg]overlay=x='(W-w)/2':y='(H-h)/2':eval=frame,format=yuv420p[vout];")
    a = audio_chain(a_id, a_start, dur, a_in)
    cmd += ["-filter_complex", v + a, "-map", "[vout]", "-map", "[aout]", "-t", str(dur),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", seg_path(i)]
    run(cmd)


def build_split(i, shots, starts, dur):
    """Three reels side by side, staggered power3 slide-up, middle reel carries the audio."""
    pw = W // 3
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for s, st in zip(shots, starts):
        cmd += ["-ss", str(st), "-t", str(dur), "-i", src(s["id"])]
    mid = [k for k, s in enumerate(shots) if s.get("audio")][0]
    parts = [f"color=c={hexc(C['colors']['dark'])}:s={W}x{H}:r={FPS}:d={dur},format=yuv420p[base]"]
    last = "base"
    for k in range(3):
        d0 = 0.15 * k
        e = ease_out3(prog(d0, 0.75))
        parts.append(
            f"[{k}:v]setpts=PTS-STARTPTS,fps={FPS},scale=w='{pw}*(1.06+0.05*t/{dur})':h=-2:eval=frame,"
            f"crop={pw}:{H}[p{k}]")
        parts.append(f"[{last}][p{k}]overlay=x={k*pw}:y='{H}*(1-{e})':eval=frame[o{k}]")
        last = f"o{k}"
    for k in (1, 2):
        parts.append(f"[{last}]drawbox=x={k*pw-2}:y=0:w=4:h={H}:color={hexc(C['colors']['red'])}@0.95:t=fill[l{k}]")
        last = f"l{k}"
    parts.append(f"[{last}]format=yuv420p[vout]")
    a = audio_chain(shots[mid]["id"], starts[mid], dur, mid)
    cmd += ["-filter_complex", ";".join(parts) + ";" + a, "-map", "[vout]", "-map", "[aout]", "-t", str(dur),
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", seg_path(i)]
    run(cmd)


def dt(text, font, size, color, x, y, alpha, extra=""):
    return (f"drawtext=fontfile={font}:text='{text}':fontsize={size}:fontcolor={color}:"
            f"x='{x}':y='{y}':alpha='{alpha}'{extra}")


def grow_bar(label, w_expr, h_expr, color, dur):
    """A colour bar whose size is animated with time (drawbox cannot do that, scale+overlay can)."""
    return (f"color=c={color}:s=640x16:r={FPS}:d={dur},format=rgba,"
            f"scale=w='max(2,{w_expr})':h='max(2,{h_expr})':eval=frame[{label}]")


def build_card(i, kind, dur):
    c = C["colors"]
    cream, red, dark, gold = hexc(c["cream"]), hexc(c["red"]), hexc(c["dark"]), hexc(c["gold"])
    fade_out = f"min(1,max(0,({dur}-t)/0.25))"
    fc = [f"color=c={dark}:s={W}x{H}:r={FPS}:d={dur},format=yuv420p[bg]"]
    cur = "bg"
    if kind == "intro":
        e1, e2 = ease_expo(prog(0.10, 0.7)), ease_expo(prog(0.35, 0.7))
        fc.append(f"[{cur}]" + dt(C["brand"], C["font_bold"], 190, cream, "(w-text_w)/2", f"(h/2-170)+40*(1-{e1})", f"{e1}*{fade_out}") + "[t1]")
        fc.append("[t1]" + dt(C["brand_sub"], C["font_semi"], 58, red, "(w-text_w)/2", f"(h/2+60)+30*(1-{e2})", f"{e2}*{fade_out}") + "[t2]")
        fc.append(grow_bar("bar", f"{ease_expo(prog(0.5, 0.8))}*560", "4", gold, dur))
        fc.append(f"[t2][bar]overlay=x='(W-w)/2':y={H//2+170}:eval=frame,format=yuv420p[vout]")
    else:
        e1, e2, e3 = ease_expo(prog(0.15, 0.7)), ease_expo(prog(0.45, 0.7)), ease_expo(prog(0.85, 0.6))
        fc.append(f"[{cur}]" + dt(C["outro_title"], C["font_bold"], 120, cream, "(w-text_w)/2", f"(h/2-150)+40*(1-{e1})", f"{e1}") + "[t1]")
        fc.append("[t1]" + dt(C["outro_tag"], C["font_reg"], 46, cream, "(w-text_w)/2", f"(h/2+10)+30*(1-{e2})", f"{e2}*0.9") + "[t2]")
        fc.append(grow_bar("bar", f"{ease_expo(prog(0.7, 0.8))}*120", "4", gold, dur))
        fc.append(f"[t2][bar]overlay=x='(W-w)/2':y={H//2+100}:eval=frame[t3]")
        fc.append("[t3]" + dt(C["outro_cta"], C["font_semi"], 40, gold, "(w-text_w)/2", f"(h/2+150)+30*(1-{e3})", f"{e3}") + ",format=yuv420p[vout]")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
           "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "0:a", "-t", str(dur),
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", "-r", str(FPS),
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", seg_path(i)]
    run(cmd)


def build_outro_audio(i, dur):
    """Outro: let the last reel's music ring out under the end card."""
    a_id, a_start = OUTRO_AUDIO_FROM["id"], OUTRO_AUDIO_FROM["start"]
    g = measure_gain(a_id, a_start, dur)
    tmp = os.path.join(WORK, f"seg{i:02d}_a.m4a")
    run(["ffmpeg", "-v", "error", "-y", "-ss", str(a_start), "-t", str(dur), "-i", src(a_id), "-vn",
         "-af", f"aresample=48000,aformat=channel_layouts=stereo,volume={g:.2f}dB,alimiter=limit=0.84:level=disabled,"
                f"afade=t=out:st={dur-1.4}:d=1.4:curve=qsin", "-c:a", "aac", "-b:a", "192k", tmp])
    out = seg_path(i) + ".tmp.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", seg_path(i), "-i", tmp, "-map", "0:v", "-map", "1:a",
         "-c", "copy", "-shortest", out])
    os.replace(out, seg_path(i))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "public", "video"))
    ap.add_argument("--draft", action="store_true")
    ap.add_argument("--keep", action="store_true")
    ap.add_argument("--reuse-master", action="store_true", help="skip the stitch if render/work/master.mp4 exists")
    ap.add_argument("--reuse", action="store_true", help="skip segments already built in render/work")
    args = ap.parse_args()
    out_dir = os.path.abspath(args.out)
    os.makedirs(out_dir, exist_ok=True)

    # ---- segment plan --------------------------------------------------
    singles_before = [s for s in SHOTS if not s.get("split")][:4]
    split = [s for s in SHOTS if s.get("split")]
    singles_after = [s for s in SHOTS if not s.get("split")][4:]
    plan = [("intro", None)] + [("clip", s) for s in singles_before] + [("split", split)] + \
           [("clip", s) for s in singles_after] + [("outro", None)]
    durs = []
    for kind, _ in plan:
        durs.append({"intro": C["intro_dur"], "outro": C["outro_dur"], "clip": C["clip_dur"],
                     "split": C["split_dur"]}[kind])
    n = len(plan)
    starts = [sum(durs[:k]) - k * T for k in range(n)]
    total = sum(durs) - (n - 1) * T
    print(f"{n} segments, total {total:.2f}s")

    # ---- build segments --------------------------------------------------
    cap_info = []
    for i, (kind, s) in enumerate(plan):
        d = durs[i]
        have = args.reuse and os.path.exists(seg_path(i)) and os.path.getsize(seg_path(i)) > 0
        if have:
            if kind == "clip": cap_info.append((starts[i], d, s["caption"]))
            if kind == "split": cap_info.append((starts[i], d, SPLIT_CAPTION))
            print(f"seg{i:02d} reused")
            continue
        if kind == "intro":
            build_card(i, "intro", d)
        elif kind == "outro":
            build_card(i, "outro", d); build_outro_audio(i, d)
        elif kind == "clip":
            st = snap_to_beat(s["id"], s["start"]) if not s.get("audio_from") else s["start"]
            print(f"seg{i:02d} {s['id']} in={s['start']} -> beat-snapped {st}")
            build_clip(i, s, st, d)
            cap_info.append((starts[i], d, s["caption"]))
        else:
            sts = [snap_to_beat(x["id"], x["start"]) for x in s]
            print(f"seg{i:02d} split {[x['id'] for x in s]} in={sts}")
            build_split(i, s, sts, d)
            cap_info.append((starts[i], d, SPLIT_CAPTION))

    # ---- stitch: xfade video + acrossfade audio ---------------------------
    trans_names = []
    for k in range(n - 1):
        kind, s = plan[k + 1]
        if kind == "clip": trans_names.append(s["trans"])
        elif kind == "split": trans_names.append(SPLIT_TRANS_IN)
        elif kind == "outro": trans_names.append("fadewhite")
        else: trans_names.append("fade")
    # the transition INTO the next clip is named on that clip; the exit from the split uses SPLIT_TRANS_OUT
    split_idx = [k for k, p in enumerate(plan) if p[0] == "split"][0]
    trans_names[split_idx] = SPLIT_TRANS_OUT   # split -> next clip

    inputs = []
    for i in range(n):
        inputs += ["-i", seg_path(i)]
    fc = []
    vlast, alast = "0:v", "0:a"
    acc = durs[0]
    for k in range(n - 1):
        off = acc - T
        fc.append(f"[{vlast}][{k+1}:v]xfade=transition={trans_names[k]}:duration={T}:offset={off:.3f}[v{k+1}]")
        fc.append(f"[{alast}][{k+1}:a]acrossfade=d={T}:c1=qsin:c2=qsin[a{k+1}]")
        vlast, alast = f"v{k+1}", f"a{k+1}"
        acc = acc + durs[k + 1] - T

    # ---- finishing: grade, light leaks, captions, vignette, grain ------------
    c = C["colors"]
    cream, red, gold = hexc(c["cream"]), hexc(c["red"]), hexc(c["gold"])
    grade = ("eq=contrast=1.07:saturation=1.14:gamma=0.98,"
             "colorbalance=rs=0.03:gs=0.0:bs=-0.04:rm=0.03:bm=-0.03:rh=0.02:bh=-0.02,"
             "curves=m='0/0.02 0.5/0.5 1/0.97'")
    fc.append(f"[{vlast}]{grade}[g]")
    # light-leak flash on every transition (small warm layer, scaled up and blurred)
    centers = [starts[k + 1] + T / 2 for k in range(n - 1)]
    pulse = "+".join(f"exp(-pow((T-{cc:.3f})/0.14,2))" for cc in centers)
    leak = c["leak"]
    lr, lg, lb = int(leak[0:2], 16), int(leak[2:4], 16), int(leak[4:6], 16)
    fc.append(f"color=c=black:s=480x270:r={FPS}:d={total:.2f},format=rgba,"
              f"geq=r={lr}:g={lg}:b={lb}:a='min(255,215*({pulse})*(0.35+0.65*X/W))',"
              f"scale={W}:{H},gblur=sigma=40[leak]")
    fc.append("[g][leak]overlay=format=auto[f1]")
    cur = "f1"
    # lower-third captions: accent bar -> label -> text, staggered, expo out in / power3 out
    for j, (cs, cd, text) in enumerate(cap_info):
        t0 = cs + 0.55
        t1 = t0 + 2.55
        fade = f"min(1,max(0,({t1}-t)/0.3))"
        e_bar = ease_expo(prog(t0, 0.6))
        e_txt = ease_expo(prog(t0 + 0.18, 0.7))
        e_num = ease_expo(prog(t0 + 0.34, 0.6))
        en = f"between(t,{t0},{t1})"
        fc.append(grow_bar(f"bar{j}", "6", f"{e_bar}*74", red, f"{total:.2f}"))
        fc.append(f"[{cur}][bar{j}]overlay=x=96:y='{H-190}+74-h':eval=frame:enable='{en}'[cb{j}]")
        fc.append(f"[cb{j}]" + dt(text, C["font_semi"], 46, cream, f"126+50*(1-{e_txt})", f"{H-190}+22",
                                  f"{e_txt}*{fade}", f":enable='{en}':shadowcolor=black@0.55:shadowx=2:shadowy=2") + f"[ct{j}]")
        fc.append(f"[ct{j}]" + dt(f"{j+1:02d}", C["font_reg"], 22, gold, f"126+50*(1-{e_num})", f"{H-190}-14",
                                  f"{e_num}*{fade}", f":enable='{en}'") + f"[cn{j}]")
        cur = f"cn{j}"
    fc.append(f"[{cur}]vignette=angle={C['vignette_angle']}:mode=forward,noise=alls={C['grain']}:allf=t,format=yuv420p[vfinal]")

    master = os.path.join(WORK, "master.mp4")
    scale = "" if not args.draft else ""
    cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", ";".join(fc),
           "-map", "[vfinal]", "-map", f"[{alast}]", "-t", f"{total:.2f}",
           "-c:v", "libx264", "-preset", "veryfast" if args.draft else "medium", "-crf", "17", "-r", str(FPS),
           "-c:a", "aac", "-b:a", "256k", master]
    if args.reuse_master and os.path.exists(master) and os.path.getsize(master) > 0:
        print("reusing master")
    else:
        print("stitching master ...")
        run(cmd)

    # ---- deliverables ----------------------------------------------------------
    mp4 = os.path.join(out_dir, "hero.mp4")
    webm = os.path.join(out_dir, "hero.webm")
    poster = os.path.join(out_dir, "poster.jpg")
    if args.draft:
        shutil.copy(master, os.path.join(out_dir, "hero_draft.mp4")); print("draft ->", out_dir); return
    passlog = os.path.join(WORK, "pass")
    base = ["ffmpeg", "-v", "error", "-y", "-i", master]
    print("encoding hero.mp4 (2-pass) ...")
    run(base + ["-c:v", "libx264", "-preset", "slow", "-b:v", f"{C['video_kbps']}k", "-maxrate", f"{int(C['video_kbps']*1.5)}k",
                "-bufsize", f"{C['video_kbps']*2}k", "-pix_fmt", "yuv420p", "-profile:v", "high", "-pass", "1",
                "-passlogfile", passlog, "-an", "-f", "mp4", os.devnull])
    run(base + ["-c:v", "libx264", "-preset", "slow", "-b:v", f"{C['video_kbps']}k", "-maxrate", f"{int(C['video_kbps']*1.5)}k",
                "-bufsize", f"{C['video_kbps']*2}k", "-pix_fmt", "yuv420p", "-profile:v", "high", "-pass", "2",
                "-passlogfile", passlog, "-c:a", "aac", "-b:a", f"{C['audio_kbps']}k", "-ac", "2",
                "-movflags", "+faststart", mp4])
    print("encoding hero.webm (VP9 2-pass) ...")
    plog = os.path.join(WORK, "vp9")
    run(base + ["-c:v", "libvpx-vp9", "-b:v", f"{C['webm_kbps']}k", "-pix_fmt", "yuv420p", "-row-mt", "1",
                "-deadline", "good", "-cpu-used", "4", "-pass", "1", "-passlogfile", plog, "-an", "-f", "webm", os.devnull])
    run(base + ["-c:v", "libvpx-vp9", "-b:v", f"{C['webm_kbps']}k", "-pix_fmt", "yuv420p", "-row-mt", "1",
                "-deadline", "good", "-cpu-used", "4", "-pass", "2", "-passlogfile", plog,
                "-c:a", "libopus", "-b:a", f"{C['audio_kbps']}k", webm])
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{starts[1] + 1.6:.2f}", "-i", master, "-frames:v", "1",
         "-vf", f"scale={W}:{H}", "-q:v", "5", poster])
    for f in (mp4, webm, poster):
        print(f"{os.path.basename(f)}: {os.path.getsize(f)/1e6:.2f} MB")
    print(f"total length {total:.2f}s")
    if not args.keep:
        pass


if __name__ == "__main__":
    main()
