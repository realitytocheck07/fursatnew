#!/usr/bin/env python3
"""hero-master-v3: v2 loop + a ~6.3s real-cocktail segment between the drinks and the coffee parts.
Usage: python3 build-hero.py <raw_dir> <hero-master-v2.mp4> <out_dir>
Timeline (s): v2[0:19.4] --0.6 dissolve--> S (6.3s) --0.6 dissolve--> v2[20.4:33.8]  => 37.9s. Shift for v2 times >= 20.4 is +4.1s."""
import subprocess, sys, os
RAW, V2, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1152, 768, 60
DX = 0.4                                   # dissolve inside the segment
A_END, C_START, C_END, DM = 19.4, 20.4, 33.8, 0.6   # dissolve with the master
# (src, ss, t, crop w:h:x:y, delogo)
SHOTS = [
 ('cocktail-layered.mp4', 1.0, 2.6, '405:540:85:330', None),             # ice + pour
 ('cocktails-named.mp4',  3.7, 2.2, '405:540:50:395', None),             # Life Fursat Bhai
 ('cocktails-named.mp4', 12.0, 2.3, '405:540:40:395', 'delogo=x=62:y=668:w=140:h=92'),  # Cosmopolitan
]
GRADE = 'eq=saturation=1.06:contrast=1.04:gamma=0.97,colorbalance=rs=.03:rm=.03:bs=-.04:bm=-.03'
inputs = ['-ss','0','-t',str(A_END),'-i',V2]
for s in SHOTS: inputs += ['-ss',str(s[1]),'-t',str(s[2]),'-i',f'{RAW}/{s[0]}']
inputs += ['-ss',str(C_START),'-t',str(C_END-C_START),'-i',V2]
f = [f'[0:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[A]']
for i, s in enumerate(SHOTS, 1):
    dl = (s[4] + ',') if s[4] else ''
    f.append(f'[{i}:v]{dl}fps={FPS},split[s{i}a][s{i}b]')
    f.append(f'[s{i}a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=26:3,eq=brightness=-0.16:saturation=0.9,{GRADE}[bg{i}]')
    f.append(f'[s{i}b]crop={s[3]},scale=576:768:flags=lanczos,{GRADE}[fg{i}]')
    f.append(f'[bg{i}][fg{i}]overlay=(W-w)/2:0,setsar=1,format=yuv420p[S{i}]')
n = len(SHOTS)
f.append(f'[{n+1}:v]fps={FPS},scale={W}:{H},setsar=1,format=yuv420p[C]')
cur, curlen = 'S1', SHOTS[0][2]
for i in range(2, n + 1):
    f.append(f'[{cur}][S{i}]xfade=transition=fade:duration={DX}:offset={curlen-DX}[x{i}]')
    cur, curlen = f'x{i}', curlen + SHOTS[i-1][2] - DX
LS = curlen
f.append(f'[A][{cur}]xfade=transition=fade:duration={DM}:offset={A_END-DM}[m1]')
l1 = A_END + LS - DM
f.append(f'[m1][C]xfade=transition=fade:duration={DM}:offset={l1-DM}[v]')
print('segment', round(LS, 2), 's, total', round(l1 + (C_END - C_START) - DM, 2), 's')
tmp = f'{OUT}/_v3-raw.mp4'
subprocess.run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(f),'-map','[v]','-an','-c:v','libx264','-preset','slow','-profile:v','high','-pix_fmt','yuv420p','-b:v','2150k','-maxrate','3400k','-bufsize','6800k','-r',str(FPS),'-movflags','+faststart',f'{OUT}/hero-master-v3.mp4'], check=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',f'{OUT}/hero-master-v3.mp4','-an','-vf','scale=864:576:flags=lanczos','-c:v','libx264','-preset','slow','-profile:v','high','-pix_fmt','yuv420p','-b:v','840k','-maxrate','1500k','-bufsize','3000k','-r',str(FPS),'-movflags','+faststart',f'{OUT}/hero-master-v3-sm.mp4'], check=True)
print('done')
