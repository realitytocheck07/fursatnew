# Banquet film v1 (21 Nov 2026), rendered in the main session
Source: banquet-checkpoint-4 (cleaned clips + synthesized audio + Python/ffmpeg renderer). Rendered with scripts/film_render.py (crops for shot02/shot05/split3 built in; NOCAPS=1 env renders without captions, used for the loops).

## Files (public/video/)
| File | Size | Notes |
|---|---|---|
| banquet-film-v1.mp4 | 4.8 MB | 1920x1080, 30 fps, 26.4 s, H.264 2-pass + AAC 128k, faststart |
| banquet-film-v1.webm | 3.8 MB | VP9 + Opus |
| banquet-film-poster-v1.jpg | 0.07 MB | the banquet hall frame (17.6 s) |
| banquet-loop-v1.mp4 / .webm | 1.9 / 1.4 MB | 1280x720, 13 s seamless (0.5 s crossfade), no audio, no captions |
| banquet-loop-poster-v1.jpg | 0.03 MB | the first frame of the loop |
| banquet-loop-phone-v1.mp4 | 1.3 MB | 540x960 (centre column), 13 s seamless, no audio |

## Checks
- Final mp4 checked every 1 s: no FURSAT corner badge, no Instagram icon/handle, no promo/subtitle text, no white flash.
- Audio: all synthesized (scripts/synth_audio.py), none from the reels.
- Titles use Lora Bold (Playfair Display was not installed in the render sandbox); small text Poppins.
- Brand: cream intro with the logo; green #2a5019 outro with a red #c0291f "Reserve your date" pill and gold #c99a43 lines.
- Known: a faint inpaint arc may remain at the lower edge of shot06 (hard to see at film size).
