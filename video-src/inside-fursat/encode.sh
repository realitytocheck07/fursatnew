#!/bin/bash
# usage: encode.sh master.mp4 outdir   -> inside-fursat-720.mp4/.webm, -16x9.mp4/.webm, -poster.webp (all silent)
M=$1; O=$2; mkdir -p $O
# 16:9: the vertical video centred over a blurred, darkened copy of itself
V169="[0:v]split[a][b];[a]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=40:4,eq=brightness=-0.22[bg];[b]scale=-2:720:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p"
ffmpeg -v error -y -i $M -an -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf ${C1:-27} -maxrate ${R1:-900k} -bufsize 1800k -profile:v high -movflags +faststart $O/inside-fursat-720.mp4
ffmpeg -v error -y -i $M -an -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libvpx-vp9 -b:v 0 -crf ${C2:-38} -row-mt 1 -deadline good -cpu-used 2 $O/inside-fursat-720.webm
ffmpeg -v error -y -i $M -an -filter_complex "$V169" -c:v libx264 -preset slow -crf ${C3:-27} -maxrate ${R3:-900k} -bufsize 1800k -profile:v high -movflags +faststart $O/inside-fursat-16x9.mp4
ffmpeg -v error -y -i $M -an -filter_complex "$V169" -c:v libvpx-vp9 -b:v 0 -crf ${C4:-38} -row-mt 1 -deadline good -cpu-used 2 $O/inside-fursat-16x9.webm
ffmpeg -v error -y -i $M -frames:v 1 -vf "scale=720:1280:flags=lanczos" -c:v libwebp -quality ${Q:-72} $O/inside-fursat-poster.webp
ls -l $O | awk '{print $5,$9}'
