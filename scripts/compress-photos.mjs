// Shrinks the photos in sample/ to a size that is sensible to publish: at most MAX_SIDE pixels on the long
// side, re-encoded as JPEG at QUALITY. The game analyses a photo at 160 px anyway, so this changes nothing for
// the recognition; it only cuts what the browser has to download when the photos are shown in the garage.
// Run: node scripts/compress-photos.mjs [--apply] [--max 1024] [--quality 78] [--only <testo>]
// --only limits the run to the photos whose name contains that text: re-encoding a photo that is already at size
// only makes it slightly bigger and slightly worse, so a new arrival should be normalised on its own.
// Without --apply it only reports what it would do.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const APPLY = args.includes('--apply');
const MAX_SIDE = flag('max', 1024);
const QUALITY = flag('quality', 78);

const dir = new URL('../sample/', import.meta.url);
const onlyIndex = args.indexOf('--only');
const ONLY = onlyIndex >= 0 && args[onlyIndex + 1] && !args[onlyIndex + 1].startsWith('--') ? args[onlyIndex + 1] : null;
const files = readdirSync(dir).filter((name) => /\.jpe?g$/i.test(name) && (!ONLY || name.includes(ONLY))).sort();

/** Box filter, the same averaging the game's downscale uses, so colours survive the resize. */
function downscale(image, width, height) {
  const out = new Uint8Array(width * height * 4);
  const sx = image.width / width, sy = image.height / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * image.width + xx) * 4;
          r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2]; n++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
  }
  return { data: out, width, height };
}

let before = 0, after = 0;
for (const name of files) {
  const path = fileURLToPath(new URL(name, dir));
  const raw = readFileSync(path);
  const image = jpeg.decode(raw, { useTArray: true });
  const ratio = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const resized = ratio < 1 ? downscale(image, width, height) : { data: image.data, width, height };
  const encoded = jpeg.encode(resized, QUALITY).data;
  before += raw.length; after += encoded.length;
  console.log(`${name}  ${image.width}x${image.height} ${(raw.length / 1024).toFixed(0)} kB  →  ${width}x${height} ${(encoded.length / 1024).toFixed(0)} kB`);
  if (APPLY) writeFileSync(path, encoded);
}
console.log(`\n${files.length} foto: ${(before / 1024).toFixed(0)} kB → ${(after / 1024).toFixed(0)} kB (${Math.round((1 - after / before) * 100)}% in meno)`);
if (!APPLY) console.log('Prova a vuoto. Rilancia con --apply per scrivere i file.');
