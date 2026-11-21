#!/bin/sh
cd /home/claude/work/video-src/hyperframes/assets
G="eq=contrast=1.10:saturation=1.12:gamma=0.97,colorbalance=rs=-0.04:gs=0.0:bs=0.07:rm=0.01:bm=0.02:rh=0.06:gh=0.02:bh=-0.05,vignette=angle=PI/7"
for f in shot01 shot02 shot03 shot04 shot05 shot06 shot07 split1 split2 split3; do
  ffmpeg -v error -y -i /tmp/assets_masked/$f.mp4 -vf "$G,noise=alls=3:allf=t" -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart $f.tmp.mp4 && mv $f.tmp.mp4 $f.mp4 && echo "fg $f" >> /tmp/bake.log
done
for f in shot01 shot02 shot03 shot04 shot05 shot06 shot07; do
  ffmpeg -v error -y -i $f.mp4 -an -vf "scale=480:270:force_original_aspect_ratio=increase,crop=480:270,gblur=sigma=7,eq=saturation=1.25:brightness=-0.04" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -movflags +faststart ${f}_bg.tmp.mp4 && mv ${f}_bg.tmp.mp4 ${f}_bg.mp4 && echo "bg $f" >> /tmp/bake.log
done
echo DONE >> /tmp/bake.log
