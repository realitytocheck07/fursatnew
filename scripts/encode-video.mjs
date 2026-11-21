// Encode a page video the cheap way:  node scripts/encode-video.mjs <input.mp4> <out-name> [--no-webm]
// Writes public/assets/video/<out-name>.mp4 (720p H.264, no audio, faststart), <out-name>-sm.mp4 (480p for phones),
// <out-name>.webm (VP9) and <out-name>.webp (poster from 1 s in). Needs ffmpeg on PATH, or `npm i --no-save ffmpeg-static`.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [input, name, ...flags] = process.argv.slice(2);
if (!input || !name) { console.error('usage: node scripts/encode-video.mjs <input> <out-name> [--no-webm]'); process.exit(1); }
let ffmpeg = 'ffmpeg';
try { ffmpeg = (await import('ffmpeg-static')).default || ffmpeg; } catch { /* use PATH */ }
const out = path.resolve('public/assets/video'); fs.mkdirSync(out, { recursive: true });
const run = (args) => { const r = spawnSync(ffmpeg, ['-y', '-v', 'error', ...args], { stdio: 'inherit' }); if (r.status) process.exit(r.status); };

run(['-i', input, '-an', '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/${name}.mp4`]);
run(['-i', input, '-an', '-vf', 'scale=-2:480', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/${name}-sm.mp4`]);
if (!flags.includes('--no-webm')) run(['-i', input, '-an', '-vf', 'scale=-2:720', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', `${out}/${name}.webm`]);
run(['-ss', '1', '-i', input, '-frames:v', '1', '-vf', 'scale=-2:720', '-c:v', 'libwebp', '-quality', '78', `${out}/${name}.webp`]);
for (const f of fs.readdirSync(out).filter((x) => x.startsWith(name))) console.log(f, (fs.statSync(path.join(out, f)).size / 1024).toFixed(0) + ' KB');
console.log('Keep each clip under about 1.5 MB (720p) / 0.8 MB (-sm). Re-encode with a higher -crf if it is larger.');
