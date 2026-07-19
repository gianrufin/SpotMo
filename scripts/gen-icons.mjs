import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';

const EXEC = fs
  .readdirSync('/opt/pw-browsers')
  .filter((d) => d.startsWith('chromium-'))
  .map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)
  .find((p) => fs.existsSync(p));

const OUT = new URL('../public/', import.meta.url).pathname;

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();

// "Tokyo neon" mark — pin outline breaking into a navigation arrow, with a
// small accent dot (see src/components/common/Logo.tsx AppIconGlyph).
function markSvg(dim) {
  return `<svg width="${dim}" height="${dim}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M35 16.5C31.5 13 26.5 13 23 16.5C19.5 20 19.5 25.5 23 29.5C25.5 32.3 29 36.5 32 40.5C35 36.5 38.5 32.3 41 29.5C41.7 28.7 42.3 27.9 42.8 27.1"
      stroke="#2EF6F6" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M35 15L47 13.5L45.5 25.5" stroke="#2EF6F6" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M47 13.5L32 40.5L26.5 34.5" stroke="#2EF6F6" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="29" cy="24" r="5.2" fill="#E63462"/>
  </svg>`;
}

async function render(size, bg, ratio, radius, out) {
  const markDim = Math.round(size * ratio);
  const html = `<!doctype html><html><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:${bg};border-radius:${radius}px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      ${markSvg(markDim)}
    </div></body></html>`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html);
  await page.screenshot({
    path: out,
    clip: { x: 0, y: 0, width: size, height: size },
    omitBackground: true,
  });
  console.log('wrote', out);
}

const BG = '#14101E'; // dark navy-purple, matches the app's dark background

// Standard icons — dark navy square, neon mark
await render(192, BG, 0.62, 0, `${OUT}pwa-192.png`);
await render(512, BG, 0.62, 0, `${OUT}pwa-512.png`);
// Maskable — full-bleed dark navy, mark kept inside the safe zone
await render(512, BG, 0.46, 0, `${OUT}pwa-maskable-512.png`);
// Apple touch icon — dark navy square (iOS rounds the corners itself)
await render(180, BG, 0.62, 0, `${OUT}apple-touch-icon.png`);

await browser.close();
