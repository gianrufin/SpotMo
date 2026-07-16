import { chromium } from 'playwright-core';
import fs from 'fs';

const EXEC = fs
  .readdirSync('/opt/pw-browsers')
  .filter((d) => d.startsWith('chromium-'))
  .map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)
  .find((p) => fs.existsSync(p));

const OUT = new URL('../public/', import.meta.url).pathname;

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();

function pinSvg(dim, pinColor, holeColor) {
  return `<svg width="${dim}" height="${dim}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 10c-8.284 0-15 6.45-15 14.4C17 34.4 32 54 32 54s15-19.6 15-29.6C47 16.45 40.284 10 32 10Z" fill="${pinColor}"/>
    <circle cx="32" cy="24.5" r="5.6" fill="${holeColor}"/>
  </svg>`;
}

async function render(size, bg, pinColor, holeColor, ratio, radius, out) {
  const pinDim = Math.round(size * ratio);
  const html = `<!doctype html><html><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:${bg};border-radius:${radius}px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      ${pinSvg(pinDim, pinColor, holeColor)}
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

// Standard icons — white square, emerald pin (matches brand app icon)
await render(192, '#ffffff', '#2F7D5A', '#ffffff', 0.62, 0, `${OUT}pwa-192.png`);
await render(512, '#ffffff', '#2F7D5A', '#ffffff', 0.62, 0, `${OUT}pwa-512.png`);
// Maskable — full-bleed emerald, white pin, kept inside the safe zone
await render(512, '#2F7D5A', '#ffffff', '#2F7D5A', 0.5, 0, `${OUT}pwa-maskable-512.png`);
// Apple touch icon — white square, emerald pin (iOS rounds the corners itself)
await render(180, '#ffffff', '#2F7D5A', '#ffffff', 0.62, 0, `${OUT}apple-touch-icon.png`);

await browser.close();
