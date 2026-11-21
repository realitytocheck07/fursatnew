"""Inside Fursat v3 montage: cuts the two reels (clean crops only), dissolves on a silent 1.6 s beat grid, title + end card with a gold shimmer.
usage: RAW=<dir with vlog-a.mp4 vlog-b.mp4> python3 build.py <cards_dir> <out_master.mp4>
Cards come from render_cards.py (title/ + end/ PNG sequences). Master = 720x1280 25 fps H.264 (high quality, no audio); final encodes are in encode.sh.
GRID: every cut lands on a multiple of 1.6 s (shots last 1.6 or 3.2 s cut to cut). Dissolve = 0.32 s (8 frames) centred on the cut.
Ken Burns: slow push-in 3-5 % over each shot (zoompan on a 2x upscale, no jitter). Slow-mo = plain (setpts + fps), no motion interpolation.
Colour: light warm grade for all + a per-shot lift (curves gamma) for the dark bartender/pour shots and a warm match for the vlog-b shot.
Crops keep clear of every overlay (see NOTES: a y>=300; b y>=370)."""
import os,subprocess,sys,math
RAW=os.environ.get('RAW','raw');cards,out=sys.argv[1],sys.argv[2]
FPS=25;XF=0.32;END=1.6
A='720:980:0:300';B='576:670:0:370'
def lift(g,black=0.0):  # curves = gamma g on all channels (+ optional black lift); g>1 brightens
    pts=[0,.1,.25,.5,.75,1];ys=[black+(1-black)*(p**(1/g)) for p in pts]
    return "curves=all='"+' '.join(f'{p}/{round(y,4)}' for p,y in zip(pts,ys))+"'"
WARM_B="colorbalance=rm=0.12:gm=0.02:bm=-0.12:rh=0.07:bh=-0.07"
# (name, reel, src_in_s, src_len_s, slow, crop, L cut-to-cut s, zoom, extra grade)
SHOTS=[
 ('logo wall + title','a',13.75,3.06,1.10,A,3.2,0.040,'',0.60),
 ('cafe counter','a',0.30,3.52,1.00,A,3.2,0.045,'',0.50),
 ('dessert pour','a',25.08,1.92,1.00,A,1.6,0.035,lift(1.6,.01)+',eq=saturation=1.08',0.50),
 ('red mural booths','a',10.15,3.52,1.00,A,3.2,0.040,'',0.55),
 ('bartender','a',17.40,3.52,1.00,A,3.2,0.045,lift(1.5,.02)+',eq=saturation=1.10',0.50),
 ('food plates','a',7.60,1.92,1.00,A,1.6,0.035,'',0.50),
 ('sofa + statue','a',32.00,1.92,1.00,A,1.6,0.040,'',0.15),
 ('elephant art','b',18.17,1.12,1.71,B,1.6,0.030,WARM_B+',eq=gamma=0.72:saturation=1.06',0.50),
]
GRADE="colorbalance=rm=0.03:bm=-0.03:rh=0.02:bh=-0.02,eq=contrast=1.02:saturation=1.04"
ins=[];fc=[];cuts=[];t=0.0
for L in [s[6] for s in SHOTS]: t=round(t+L,3);cuts.append(t)       # absolute cut times (end of each shot)
assert all(abs(c/1.6-round(c/1.6))<1e-6 for c in cuts),cuts
n=len(SHOTS);lens=[]
for i,s in enumerate(SHOTS):
    name,r,ss,sl_len,slow,crop,L,Z,extra,cx=s
    d=round(L+XF/2+(XF/2 if i else 0),3);lens.append(d)               # first shot has no dissolve in; the rest overlap by XF
    ins+=['-ss',str(ss),'-t',str(sl_len+0.1),'-i',f'{RAW}/vlog-{r}.mp4']
    N=int(round(d*FPS))
    slowf=f"setpts={slow}*(PTS-STARTPTS),fps={FPS}," if slow!=1 else f"fps={FPS},setpts=PTS-STARTPTS,"
    # v3: fill the whole 9:16 frame. Window = full clean height at 9:16 (a: 551x980, b: 377x670), slid sideways by cx inside the clean crop, then scaled up (no bands, no backdrop).
    cw,ch,cx0,cy0=[int(v) for v in crop.split(':')];w9=int(ch*9/16);xx=round((cw-w9)*cx)+cx0
    zoom=f"scale=1440:2560:flags=lanczos,zoompan=z='1+{Z}*on/{N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=720x1280:fps={FPS}"
    fc.append(f"[{i}:v]crop={w9}:{ch}:{xx}:{cy0},{slowf}trim=duration={d},setpts=PTS-STARTPTS,{GRADE},{extra+',' if extra else ''}{zoom},trim=duration={d},setpts=PTS-STARTPTS,vignette=PI/5,format=yuv420p,setsar=1[s{i}]")
ins+=['-framerate',str(FPS),'-i',f'{cards}/title/%03d.png'];ti=n
ins+=['-framerate',str(FPS),'-i',f'{cards}/end/%03d.png'];ei=n+1
fc.append(f"[s0][{ti}:v]overlay=0:0:enable='between(t,0.3,2.4)':eof_action=pass:shortest=0,format=yuv420p[t0]")
fc.append(f"[{ei}:v]format=yuv420p,setsar=1,fps={FPS}[end]")
cur='t0'
for i in range(1,n):
    fc.append(f"[{cur}][s{i}]xfade=transition=fade:duration={XF}:offset={round(cuts[i-1]-XF/2,3)},format=yuv420p[x{i}]");cur=f'x{i}'
total=round(cuts[-1]+END,3)
fc.append(f"[{cur}][end]xfade=transition=fade:duration={XF}:offset={round(cuts[-1]-XF/2,3)},trim=duration={total},format=yuv420p[v]")
print('cuts',cuts,'total',total,'s')
cmd=['ffmpeg','-v','error','-y']+ins+['-filter_complex',';'.join(fc),'-map','[v]','-r',str(FPS),'-an','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p',out]
subprocess.run(cmd,check=True)
