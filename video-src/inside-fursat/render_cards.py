"""Render the title card (transparent PNG sequence) and the end card (44-frame sequence with the gold shimmer) from index.html.
usage: python3 render_cards.py <out_dir>   (needs Playwright + Chromium; fps 25)"""
import sys,pathlib
from playwright.sync_api import sync_playwright
out=pathlib.Path(sys.argv[1]);(out/'title').mkdir(parents=True,exist_ok=True)
here=pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':720,'height':1280});pg.goto((here/'index.html').as_uri());pg.wait_for_timeout(400)
    pg.evaluate('document.fonts.ready')
    for i in range(int(2.1*25)):
        pg.evaluate(f"seek('title',{i/25})");pg.screenshot(path=str(out/'title'/f'{i:03d}.png'),omit_background=True)
    (out/'end').mkdir(exist_ok=True)
    for i in range(44): # end clip 1.76 s (0.16 s under the dissolve + the 1.6 s card)
        pg.evaluate(f"seek('end',{i/25})");pg.screenshot(path=str(out/'end'/f'{i:03d}.png'))
    b.close()
