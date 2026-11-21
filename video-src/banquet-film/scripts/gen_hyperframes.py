#!/usr/bin/env python3
"""Generate hyperframes/index.html from CONFIG/SHOTS in build_hero.py (same timings as the ffmpeg render).

    python3 scripts/prep_hf_assets.py     # cut H.264 assets into hyperframes/assets
    python3 scripts/gen_hyperframes.py    # write hyperframes/index.html
Brand text/colors/fonts/easing live in the CFG block at the top of the generated <script>.
"""
import os, json, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("bh", os.path.join(here, "build_hero.py"))
bh = importlib.util.module_from_spec(spec); spec.loader.exec_module(bh)
C, T = bh.CONFIG, bh.CONFIG["T"]
col = C["colors"]

singles = [s for s in bh.SHOTS if not s.get("split")]
# --- HyperFrames cut: faster rhythm (edit here) ---
HF = dict(intro=1.5, clip=3.0, split=4.5, outro=3.5)
durs = [HF["intro"]] + [HF["clip"]] * 4 + [HF["split"]] + [HF["clip"]] * 3 + [HF["outro"]]
# NOTE: the grade (contrast/colour balance/vignette/grain) is baked into assets/*.mp4 by ffmpeg (see scripts/bake_grade.sh);
# a realtime media-treatment grade was too slow to render on a CPU-only machine.
GRADE = {"adjust": {"exposure": 0.04, "contrast": 0.14, "saturation": 0.08, "vibrance": 0.10, "temperature": 0.05, "highlights": -0.08, "blacks": -0.04},
         "wheels": {"shadows": {"hue": 205, "amount": 0.10, "level": 0}, "highlights": {"hue": 35, "amount": 0.08, "level": 0}},
         "details": {"grain": 0.06, "grainSize": 0.3},
         "effects": {}}
GRADE_BG = json.loads(json.dumps(GRADE)); GRADE_BG["details"]["vignette"] = 0.30; GRADE_BG["effects"] = {}
GFG = json.dumps(GRADE, separators=(",", ":")); GBG = json.dumps(GRADE_BG, separators=(",", ":"))
VAR0 = "--hf-color-grading-exposure:0.04"
# speed ramps: segment -> rate points (t in clip seconds)
RAMPS = {}  # speed ramps disabled: the rate lane misbehaved in the render (jumped ahead in the source)
def ramp_attr(k):
    if k not in RAMPS: return ""
    pts = ",".join('{"t":%s,"v":%s}' % (t, v) for t, v in RAMPS[k])
    return " data-automation='{\"version\":1,\"lanes\":[{\"target\":\"rate\",\"points\":[%s]}]}'" % pts
starts = [round(sum(durs[:k]) - k * T, 3) for k in range(len(durs))]
total = round(sum(durs) - (len(durs) - 1) * T, 3)
# transition INTO segment k (1..9): whipL, whipR, zoom, iris, flash
tin = {1: "whipL", 2: "whipR", 3: "zoom", 4: "whipR", 5: "whipL", 6: "zoom", 7: "whipL", 8: "iris", 9: "flash"}
caps = {1: singles[0]["caption"], 2: singles[1]["caption"], 3: singles[2]["caption"], 4: singles[3]["caption"],
        5: bh.SPLIT_CAPTION, 6: singles[4]["caption"], 7: singles[5]["caption"], 8: singles[6]["caption"]}
shot_file = {1: "shot01", 2: "shot02", 3: "shot03", 4: "shot04", 6: "shot05", 7: "shot06", 8: "shot07"}

h = []
def add(s): h.append(s)

# ---- segments -------------------------------------------------------------
for k in range(1, 9):
    s0, d = starts[k], durs[k]
    z = 10 + k
    lane = (1, 2) if k % 2 else (3, 4)
    if k == 5:
        add(f'<div id="s5" class="seg" style="z-index:{z}">')
        for p in range(3):
            fl = f"assets/split{p+1}.mp4"
            audio = 'data-has-audio="true" data-fade-in="0.45" data-fade-out="0.45"' if p == 1 else "muted"
            add(f'  <div id="s5-p{p}" class="pan" style="left:{p*640}px"><div id="s5-k{p}" class="fill">'
                f'<video id="s5-v{p}" class="clip vid cover" src="{fl}" playsinline {audio} '
                f'data-start="{s0}" data-duration="{d}" data-track-index="{5+p}"></video></div></div>')
        add('  <div id="s5-l1" class="sep" style="left:638px"></div><div id="s5-l2" class="sep" style="left:1278px"></div>')
        add('</div>')
        continue
    f = f"assets/{shot_file[k]}.mp4"
    silent = (k == 3)
    fg_audio = "muted" if silent else 'data-has-audio="true" data-fade-in="0.45" data-fade-out="0.45"'
    add(f'<div id="s{k}" class="seg" style="z-index:{z}">'
        f'<div id="s{k}-bgk" class="fill"><video id="s{k}-bg" class="clip vid cover" src="{f.replace(".mp4", "_bg.mp4")}" muted playsinline {ramp_attr(k)} '
        f'data-start="{s0}" data-duration="{d}" data-track-index="{lane[0]}"></video></div>'
        f'<div id="s{k}-fgk" class="fill"><video id="s{k}-fg" class="clip vid contain" src="{f}" playsinline {fg_audio}{ramp_attr(k)} '
        f'data-start="{s0}" data-duration="{d}" data-track-index="{lane[1]}"></video></div></div>')
segs_html = "\n".join(h)

caps_html = []
capdur = {}
for k, text in caps.items():
    t0 = round(starts[k] + 0.5, 3); cd = round(min(2.55, durs[k] - 0.95), 3); capdur[k] = cd
    caps_html.append(
        f'<div id="cap{k}" class="clip cap" data-start="{t0}" data-duration="{cd}" data-track-index="10">'
        f'<div id="cap{k}-bar" class="cap-bar"></div><div class="cap-col"><div id="cap{k}-n" class="cap-n">{k:02d}</div>'
        f'<div id="cap{k}-t" class="cap-t" data-text="{text}"></div></div></div>')

audio_html = (
    f'<audio id="bed3" class="clip" src="assets/bed03.m4a" data-start="{starts[3]}" data-duration="{durs[3]}" '
    f'data-volume="1" data-fade-in="0.45" data-fade-out="0.45" data-track-index="8"></audio>\n'
    f'<audio id="outro-a" class="clip" src="assets/outro.m4a" data-start="{starts[9]}" data-duration="{durs[9]}" '
    f'data-volume="1" data-fade-in="0.45" data-fade-out="1.4" data-track-index="8"></audio>')

sfx = []
for k in range(1, 10):
    sfx.append(f'<audio id="sfx-w{k}" class="clip" src="assets/sfx_whoosh.m4a" data-start="{round(max(0, starts[k]-0.1),3)}" '
               f'data-duration="0.9" data-volume="0.42" data-track-index="11"></audio>')
sfx.append(f'<audio id="sfx-hit0" class="clip" src="assets/sfx_hit.m4a" data-start="0.05" data-duration="0.7" data-volume="0.55" data-track-index="12"></audio>')
sfx.append(f'<audio id="sfx-hit1" class="clip" src="assets/sfx_hit.m4a" data-start="{round(starts[9]+0.15,3)}" data-duration="0.7" data-volume="0.5" data-track-index="12"></audio>')
audio_html += "\n" + "\n".join(sfx)
plan = dict(starts=starts, durs=durs, total=total, T=T, tin=tin, caps=list(caps.keys()), capdur=capdur)

TEMPLATE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>FURSAT BANQUETS hero</title>
<style>
  /* ===== CONFIG: colors + fonts (text and easing are in CFG in the script below) ===== */
  :root {
    --red: #__RED__; --cream: #__CREAM__; --dark: #__DARK__; --gold: #__GOLD__; --leak: #__LEAK__;
    --font-display: "Playfair Display", Georgia, serif;
    --font-body: "Inter", Helvetica, Arial, sans-serif;
  }
  html, body { margin: 0; background: #000; }
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: var(--dark); }
  .fill { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
  #stage { position: absolute; inset: 0; }
  .seg { position: absolute; inset: 0; }
  .vid { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
  .cover { object-fit: cover; } .contain { object-fit: contain; }
  .blur { filter: blur(38px) saturate(1.25) brightness(0.9); }
  .pan { position: absolute; top: 0; width: 640px; height: 1080px; overflow: hidden; }
  .pan .fill { width: 640px; } .pan .vid { width: 640px; }
  .sep { position: absolute; top: 0; width: 4px; height: 1080px; background: var(--red); opacity: 0; }
  /* cards */
  .card { position: absolute; inset: 0; }
  .card-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 55%, #2a1214 0%, var(--dark) 62%); }
  .card-in { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ch { display: inline-block; }
  #in-title { font: 700 200px/1 var(--font-display); color: var(--cream); letter-spacing: 0.02em; }
  #in-sub { margin-top: 26px; font: 600 54px/1 var(--font-body); color: #d0443f; letter-spacing: 0.55em; padding-left: 0.55em; }
  #in-bar, #out-bar { height: 4px; background: var(--gold); }
  #in-bar { width: 560px; margin-top: 46px; } #out-bar { width: 120px; margin: 34px 0 30px; }
  #out-title { font: 700 128px/1.05 var(--font-display); color: var(--cream); }
  #out-tag { margin-top: 24px; font: 400 46px/1.2 var(--font-body); color: var(--cream); opacity: 0.92; }
  #out-cta { margin-top: 26px; font: 600 40px/1 var(--font-body); color: var(--gold); letter-spacing: 0.06em; }
  /* lower thirds */
  .cap { position: absolute; left: 96px; top: 872px; min-height: 96px; padding: 12px 64px 12px 0; display: flex; align-items: stretch; gap: 24px; background: linear-gradient(90deg, rgba(8,5,6,0.82), rgba(8,5,6,0.5) 70%, rgba(8,5,6,0)); }
  .cap-bar { width: 6px; align-self: stretch; background: var(--red); transform-origin: 50% 100%; }
  .cap-col { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
  .cap-n { font: 600 28px/1 var(--font-body); color: var(--gold); letter-spacing: 0.2em; }
  .cap-t { font: 600 46px/1.1 var(--font-body); color: var(--cream); text-shadow: 0 2px 10px rgba(0,0,0,0.6); white-space: nowrap; }
  /* finishing layers */
  #leak { position: absolute; inset: 0; z-index: 190; opacity: 0; mix-blend-mode: screen; pointer-events: none;
          background: radial-gradient(ellipse at 82% 38%, rgba(255,154,74,0.95) 0%, rgba(255,120,60,0.45) 34%, rgba(255,120,60,0) 70%); }
  #vig { position: absolute; inset: 0; z-index: 200; pointer-events: none;
         background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%); }
  #grain-wrap { position: absolute; inset: 0; z-index: 210; overflow: hidden; pointer-events: none; }
  #grain { position: absolute; left: -200px; top: -200px; width: 2320px; height: 1480px; opacity: 0.09; mix-blend-mode: overlay;
           background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="__TOTAL__" data-width="1920" data-height="1080">
  <div id="stage">
__SEGS__
  </div>

  <!-- intro card -->
  <div id="intro" class="clip card" style="z-index:100" data-start="0" data-duration="__INTRO__" data-track-index="9">
    <div id="in-bg" class="card-bg"></div>
    <div id="in-wrap" class="card-in"><div id="in-title"></div><div id="in-sub"></div><div id="in-bar"></div></div>
  </div>

  <!-- lower-third captions -->
__CAPS__

  <!-- outro card -->
  <div id="outro" class="clip card" style="z-index:120" data-start="__OUTRO_S__" data-duration="__OUTRO_D__" data-track-index="9">
    <div id="out-bg" class="card-bg"></div>
    <div id="out-wrap" class="card-in"><div id="out-title"></div><div id="out-bar"></div><div id="out-tag"></div><div id="out-cta"></div></div>
  </div>

__AUDIO__

  <div id="leak"></div>
  </div>

<script src="assets/gsap.min.js"></script>
<script>
  // ===== CONFIG: text, easing, motion (colors and fonts are CSS variables above) =====
  const CFG = {
    brand: "FURSAT", brandSub: "BANQUETS",
    outroTitle: "FURSAT BANQUETS", outroTag: "Where every celebration finds its home", outroCta: "Reserve your date",
    kb: [1.10, 1.17], kbBg: [1.30, 1.22],
    ease: { in: "expo.out", out: "power3.in", move: "power3.out", kb: "power2.inOut", flash: "power2.out" },
    whip: { x: 14 }, sh: { exp: 0.55 }, leakPeak: 0.75, punch: 1.035,
  };
  const PLAN = __PLAN__;

  // split a string into per-letter or per-word spans (built synchronously, before tweens)
  function spans(sel, text, by) {
    const el = document.querySelector(sel); el.textContent = "";
    const parts = by === "letter" ? [...text] : text.split(" ");
    parts.forEach((p, i) => {
      const s = document.createElement("span"); s.className = "ch"; s.textContent = p === " " ? "\u00a0" : p;
      if (by === "word" && i < parts.length - 1) s.style.marginRight = "0.28em";
      el.appendChild(s);
    });
    return el.querySelectorAll(".ch");
  }
  spans("#in-title", CFG.brand, "letter"); spans("#in-sub", CFG.brandSub, "letter");
  spans("#out-title", CFG.outroTitle, "word"); spans("#out-tag", CFG.outroTag, "word"); spans("#out-cta", CFG.outroCta, "word");
  PLAN.caps.forEach((k) => {
    const t = document.getElementById("cap" + k + "-t"); spans("#cap" + k + "-t", t.dataset.text, "word");
  });

  const tl = gsap.timeline({ paused: true });
  const { starts, durs, T, tin, total } = PLAN;
  const blurIn = (d) => ({ opacity: 1, filter: "blur(0px)", duration: d });

  // ---- intro (per-letter, staggered) ----
  tl.fromTo("#in-title .ch", { opacity: 0.3, filter: "blur(10px)", yPercent: 18 },
    { opacity: 1, filter: "blur(0px)", yPercent: 0, duration: 0.55, ease: CFG.ease.in, stagger: 0.05 }, 0);
  tl.fromTo("#in-sub .ch", { opacity: 0, filter: "blur(8px)" },
    { opacity: 1, filter: "blur(0px)", duration: 0.4, ease: CFG.ease.in, stagger: 0.04 }, 0.42);
  tl.fromTo("#in-bar", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: CFG.ease.in }, 0.55);
  tl.to("#in-wrap", { opacity: 0, filter: "blur(10px)", duration: 0.3, ease: CFG.ease.out }, starts[1]);
  tl.to("#in-bg", { opacity: 0, duration: 0.45, ease: "power2.inOut" }, starts[1]);

  // ---- reels: transition in, push-in, transition out ----
  for (let k = 1; k <= 8; k++) {
    const s = starts[k], d = durs[k], w = CFG.whip, kind = tin[k];
    const id = "#s" + k;
    let from = { opacity: 0 }, to = { opacity: 1, xPercent: 0, scale: 1 };
    if (kind === "whipL") from = { opacity: 0, xPercent: w.x };
    if (kind === "whipR") from = { opacity: 0, xPercent: -w.x };
    if (kind === "zoom") from = { opacity: 0, scale: 1.35 };
    if (kind === "iris") { from = { opacity: 1, clipPath: "circle(0% at 50% 50%)" }; to = { clipPath: "circle(150% at 50% 50%)" }; }
    tl.fromTo(id, from, Object.assign({}, to, { duration: T, ease: CFG.ease.move }), s);
    // slow push-in on the reel, opposite pull on the blurred copy (parallax)
    if (k === 5) {
      for (let p = 0; p < 3; p++) {
        tl.fromTo("#s5-p" + p, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: CFG.ease.move }, s + 0.15 * p);
        tl.fromTo("#s5-k" + p, { scale: 1.06 }, { scale: 1.11, duration: d, ease: CFG.ease.kb }, s);
      }
      tl.to("#s5-l1, #s5-l2", { opacity: 0.95, duration: 0.5, ease: CFG.ease.in }, s + 0.5);
    } else {
      tl.fromTo(id + "-fgk", { scale: CFG.kb[0] }, { scale: CFG.kb[1], duration: d, ease: CFG.ease.kb }, s);
      tl.fromTo(id + "-bgk", { scale: CFG.kbBg[0] }, { scale: CFG.kbBg[1], duration: d, ease: CFG.ease.kb }, s);
    }
    // outgoing whip as the next segment arrives
    const n = starts[k + 1], nk = tin[k + 1];
    const out = nk === "whipL" ? { xPercent: -w.x } : nk === "whipR" ? { xPercent: w.x } : nk === "zoom" ? { scale: 1.2 } : {};
    tl.to(id, Object.assign({ opacity: nk === "iris" ? 1 : 0, duration: T, ease: CFG.ease.out }, out), n);
  }

  // ---- lower-thirds: bar, number, words (staggered), clean exit ----
  PLAN.caps.forEach((k) => {
    const t0 = starts[k] + 0.5, t1 = t0 + PLAN.capdur[k], p = "#cap" + k;
    tl.fromTo(p + "-bar", { scaleY: 0 }, { scaleY: 1, duration: 0.6, ease: CFG.ease.in }, t0);
    tl.fromTo(p + "-n", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: CFG.ease.in }, t0 + 0.3);
    tl.fromTo(p + "-t .ch", { opacity: 0, filter: "blur(6px)", yPercent: 25 },
      { opacity: 1, filter: "blur(0px)", yPercent: 0, duration: 0.55, ease: CFG.ease.in, stagger: 0.08 }, t0 + 0.15);
    tl.to(p + " .cap-col, " + p + "-bar", { opacity: 0, duration: 0.25, ease: CFG.ease.out }, t1 - 0.3);
  });

  // ---- outro ----
  const o = starts[9];
  tl.fromTo("#out-bg", { opacity: 0 }, { opacity: 1, duration: T, ease: "power2.inOut" }, o);
  tl.fromTo("#out-title .ch", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.5, ease: CFG.ease.in, stagger: 0.12 }, o + 0.2);
  tl.fromTo("#out-tag .ch", { opacity: 0, filter: "blur(6px)" }, { opacity: 0.92, filter: "blur(0px)", duration: 0.45, ease: CFG.ease.in, stagger: 0.07 }, o + 0.55);
  tl.fromTo("#out-bar", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: CFG.ease.in }, o + 0.85);
  tl.fromTo("#out-cta .ch", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.45, ease: CFG.ease.in, stagger: 0.09 }, o + 1.2);

  // ---- light-leak flash on every transition ----
  for (let k = 1; k <= 9; k++) {
    const c = starts[k] + T / 2;
    tl.to("#leak", { opacity: CFG.leakPeak, duration: 0.14, ease: CFG.ease.in }, c - 0.14);
    tl.to("#leak", { opacity: 0, duration: 0.4, ease: CFG.ease.flash }, c);
    if (k < 9) {
      tl.fromTo("#stage", { scale: 1 }, { scale: CFG.punch, duration: 0.12, ease: "expo.out" }, c - 0.06);
      tl.to("#stage", { scale: 1, duration: 0.5, ease: "power3.out" }, c + 0.06);
    }
  }


  window.__timelines["main"] = tl;
</script>
</body>
</html>
'''
html = (TEMPLATE.replace("__RED__", col["red"]).replace("__CREAM__", col["cream"]).replace("__DARK__", col["dark"])
        .replace("__GOLD__", col["gold"]).replace("__LEAK__", col["leak"]).replace("__TOTAL__", str(total))
        .replace("__SEGS__", segs_html).replace("__CAPS__", "\n".join(caps_html)).replace("__AUDIO__", audio_html)
        .replace("__INTRO__", str(durs[0])).replace("__OUTRO_S__", str(starts[9])).replace("__OUTRO_D__", str(durs[9]))
        .replace("__PLAN__", json.dumps(plan)))
out = os.path.join(os.path.dirname(here), "hyperframes", "index.html")
open(out, "w").write(html)
print("wrote", out, f"{len(html)/1024:.0f} KB, total {total}s")
