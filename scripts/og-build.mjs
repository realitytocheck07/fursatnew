// Builds the share images: node scripts/og-build.mjs  ->  public/og/<page>-<ogVersion>.png (1200x630).
// Real photo on the right, cream panel with the FURSAT logo and the page name on the left. Fonts are the site's own Playfair Display / Poppins.
// Bump "ogVersion" in src/data/seo.json when you change the look, so /og/ gets new file names.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const seo = JSON.parse(fs.readFileSync('src/data/seo.json', 'utf8'));
const site = JSON.parse(fs.readFileSync('src/data/site.json', 'utf8'));
const PUB = path.resolve('public');
const b64 = (f, mime) => `data:${mime};base64,${fs.readFileSync(path.join(PUB, f)).toString('base64')}`;
const fontFace = (family, file, extra = '') => `@font-face{font-family:"${family}";src:url(${b64(file, 'font/woff2')}) format("woff2");${extra}}`;
const logo = b64('/assets/c86f49db5a.webp', 'image/webp');
const only = process.argv.slice(2);

const html = (p) => `<!doctype html><meta charset="utf-8"><style>
${fontFace('Playfair Display', '/assets/8da3ca8f0a.woff2', 'font-weight:400 900;')}
${fontFace('Poppins', '/assets/2917a67f77.woff2', 'font-weight:500;')}
${fontFace('Poppins', '/assets/dd5f02640e.woff2', 'font-weight:600;')}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;display:flex;background:#f6e6d1;overflow:hidden;font-family:Poppins,sans-serif}
.l{width:560px;height:630px;padding:56px 52px 48px 60px;display:flex;flex-direction:column;position:relative;background:#f6e6d1}
.l:after{content:"";position:absolute;right:0;top:0;bottom:0;width:6px;background:#c99a43}
.logo{width:268px;height:auto;display:block}
.logo{margin-bottom:auto}
h1{font:700 ${p.label.length > 16 ? 58 : 66}px/1.05 "Playfair Display",serif;color:#10261a;letter-spacing:-.01em}
.rule{width:64px;height:3px;background:#c99a43;margin:26px 0 20px}
.meta{font:500 19px/1.4 Poppins;color:#2a5019}
.r{flex:1;height:630px;background:url(${b64(p.photo, 'image/webp')}) ${p.focus}/cover no-repeat}
</style><div class="l"><img class="logo" src="${logo}" alt="">
<h1>${p.label.replace(/&/g, '&amp;')}</h1><div class="rule"></div>
<div class="meta">Capital Park, Madhapur, Hyderabad</div></div><div class="r"></div>`;

fs.mkdirSync('public/og', { recursive: true });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [key, p] of Object.entries(seo.pages)) {
  const slug = key === '/' ? 'home' : key.replace(/\//g, '');
  if (only.length && !only.includes(slug)) continue;
  await page.setContent(html(p), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = `public/og/${slug}-${seo.ogVersion}.png`;
  // Palette PNG keeps the file well under 300 KB, which WhatsApp needs to show the preview.
  await sharp(await page.screenshot({ type: 'png' })).png({ palette: true, quality: 92, effort: 10, dither: 0.8 }).toFile(out);
  console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
}
await browser.close();
