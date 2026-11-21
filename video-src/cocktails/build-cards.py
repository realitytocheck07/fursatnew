#!/usr/bin/env python3
"""Card clips for SignatureCocktails: 540x720, silent, seamless loop, mp4+webm+webp poster.
Usage: python3 build-cards.py <raw_dir> <out_dir>"""
import subprocess, sys, os
RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True); TMP = '/tmp/cards'; os.makedirs(TMP, exist_ok=True)
def run(*a): subprocess.run(['ffmpeg','-v','error','-y',*a], check=True)
FINISH = 'scale=540:720:flags=lanczos,eq=saturation=1.05:contrast=1.03,fps=30,format=yuv420p'
def pingpong(name, src, ss, t, crop, delogo=None):
    pre = (delogo + ',' if delogo else '') + f'crop={crop},{FINISH}'
    run('-ss', str(ss), '-t', str(t), '-i', f'{RAW}/{src}', '-vf', pre, '-an', f'{TMP}/{name}-f.mp4')
    run('-i', f'{TMP}/{name}-f.mp4', '-vf', 'reverse', '-an', f'{TMP}/{name}-r.mp4')
    run('-i', f'{TMP}/{name}-f.mp4', '-i', f'{TMP}/{name}-r.mp4', '-filter_complex', '[0][1]concat=n=2:v=1[v]', '-map', '[v]', f'{TMP}/{name}.mp4')
def loopcut(name, a, b, d=0.3):
    """a,b = (src, ss, t); build A->B dissolve then wrap-around dissolve so the loop is seamless."""
    for k, (src, ss, t, crop, dl) in (('a', a), ('b', b)):
        pre = (dl + ',' if dl else '') + f'crop={crop},{FINISH}'
        run('-ss', str(ss), '-t', str(t), '-i', f'{RAW}/{src}', '-vf', pre, '-an', f'{TMP}/{name}-{k}.mp4')
    ta, tb = a[2], b[2]
    run('-i', f'{TMP}/{name}-a.mp4', '-i', f'{TMP}/{name}-b.mp4', '-filter_complex',
        f'[0][1]xfade=transition=fade:duration={d}:offset={ta-d}[v]', '-map', '[v]', f'{TMP}/{name}-x.mp4')
    tot = ta + tb - d
    # wrap: last d seconds dissolve into the first d seconds
    run('-i', f'{TMP}/{name}-x.mp4', '-filter_complex',
        f'[0]trim=0:{d},setpts=PTS-STARTPTS[h];[0]trim={d}:{tot-d},setpts=PTS-STARTPTS[m];[0]trim={tot-d}:{tot},setpts=PTS-STARTPTS[t];'
        f'[t][h]xfade=transition=fade:duration={d-0.04}:offset=0[w];[w][m]concat=n=2:v=1[v]', '-map', '[v]', f'{TMP}/{name}.mp4')
def encode(name, out, crf_mp4=24, crf_webm=32):
    run('-i', f'{TMP}/{name}.mp4', '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', str(crf_mp4), '-maxrate', '800k', '-bufsize', '1600k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', f'{OUT}/{out}.mp4')
    run('-i', f'{TMP}/{name}.mp4', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', str(crf_webm), '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-an', f'{OUT}/{out}.webm')
    run('-ss', '1.2', '-i', f'{TMP}/{name}.mp4', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '78', f'{OUT}/{out}.webp')
# Life Fursat Bhai (name typed at bottom is cropped out; clean 3.6-6.0s)
pingpong('lfb', 'cocktails-named.mp4', 3.7, 1.9, '405:540:50:395')
encode('lfb', 'cocktail-lfb-v1')
# Cosmopolitan (clean 12.0-14.4s; @handle at lower left removed with delogo)
pingpong('cos', 'cocktails-named.mp4', 12.2, 1.9, '405:540:40:395', 'delogo=x=62:y=668:w=140:h=92')
encode('cos', 'cocktail-cos-v1')
# Crafted at our bar: ice pour, then orange-peel garnish, dissolve loop
crop = '405:540:85:330'
loopcut('bar', ('cocktail-layered.mp4', 1.2, 1.8, crop, None), ('cocktail-layered.mp4', 22.6, 2.0, crop, None))
encode('bar', 'cocktail-bar-v1')
