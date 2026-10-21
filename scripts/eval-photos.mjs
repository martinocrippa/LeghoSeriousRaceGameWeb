// Runs the local photo analysis on every sample photo in Node (no browser): decode JPEG, downscale like the game does,
// then print confidence, method, wheels and suggested parts. Use it to tune THRESHOLDS or the segmentation strategies.
import { readdirSync, readFileSync } from 'node:fs';
import jpeg from 'jpeg-js';
import { analyzePixels } from '../src/photo-analysis.js';

const dir = new URL('../sample/', import.meta.url);
const files = readdirSync(dir).filter((name) => /\.jpe?g$/i.test(name)).sort();
function downscale(image, maxSide = 160) {
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio)), height = Math.max(1, Math.round(image.height * ratio));
  const out = new Uint8ClampedArray(width * height * 4);
  const sx = image.width / width, sy = image.height / height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    // Box filter over the source pixels covered by this output pixel (bilinear-ish, like a browser's drawImage).
    const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * image.width + xx) * 4; r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2]; n++; }
    const o = (y * width + x) * 4;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return { data: out, width, height };
}
let reliable = 0, wheelsSeen = 0;
for (const name of files) {
  const image = jpeg.decode(readFileSync(new URL(name, dir)), { useTArray: true, formatAsRGBA: true });
  const small = downscale(image);
  const result = analyzePixels(small.data, small.width, small.height);
  if (result.confidence === 'object') reliable++;
  if (result.hints.wheels >= 2) wheelsSeen++;
  console.log(`${name.slice(-8, -4)}  ${result.confidence.padEnd(7)} ${String(result.hints.method || result.hints.reason || '').padEnd(10)} area=${result.hints.maskArea.toFixed(2)} wheels=${result.hints.wheels} ratio=${result.hints.ratio.toFixed(2)} shape=${result.shape.padEnd(6)} parts=${result.parts.join('+') || '-'} color=${result.color}`);
}
console.log(`reliable ${reliable}/${files.length}, wheels>=2 in ${wheelsSeen}`);
if (process.argv.includes('--wheels')) {
  const { segmentObject, segmentOnTable, detectWheels } = await import('../src/photo-analysis.js');
  for (const name of files) {
    const image = jpeg.decode(readFileSync(new URL(name, dir)), { useTArray: true, formatAsRGBA: true });
    const small = downscale(image);
    let seg = segmentObject(small.data, small.width, small.height);
    if (!seg.reliable) seg = segmentOnTable(small.data, small.width, small.height);
    if (!seg.reliable) continue;
    const debug = [];
    const wheels = detectWheels(small.data, seg, debug);
    console.log(name.slice(-8, -4), 'count', wheels.count, JSON.stringify(debug));
  }
}
