import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePixels, segmentObject, validatePhotoFile } from '../src/photo-analysis.js';

function seeded(seed) {
  let state = seed >>> 0 || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

/** Synthetic scene: a background (optionally split wall/table), boxes, discs and an optional noisy border. */
function scene({ width = 80, height = 60, background = [246, 244, 239, 255], backgroundBottom = null, split = 0.5, boxes = [], discs = [], noisyBorder = 0 } = {}) {
  const data = new Uint8ClampedArray(width * height * 4);
  const random = seeded(7);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let pixel = backgroundBottom && y >= height * split ? backgroundBottom : background;
    for (const box of boxes) if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) pixel = box[4];
    for (const disc of discs) if ((x - disc[0]) ** 2 + (y - disc[1]) ** 2 <= disc[2] ** 2) pixel = disc[3];
    if (noisyBorder && (x < noisyBorder || y < noisyBorder || x >= width - noisyBorder || y >= height - noisyBorder)) {
      pixel = [Math.floor(random() * 256), Math.floor(random() * 256), Math.floor(random() * 256), 255];
    }
    data.set(pixel, (y * width + x) * 4);
  }
  return { data, width, height };
}
const RED = [225, 35, 35, 255];
const DARK = [40, 40, 45, 255];
const picture = ({ width = 80, height = 60, background = [246, 244, 239, 255], foreground = RED, area = [15, 22, 64, 42] } = {}) => scene({ width, height, background, boxes: [[...area, foreground]] });
const analyze = p => analyzePixels(p.data, p.width, p.height);
const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

test('isolates a central red toy on a neutral background: exact color, long form, no parts', () => {
  const p = picture();
  const result = analyze(p);
  assert.equal(result.color, '#e12323');
  assert.equal(result.shape, 'racer');
  assert.equal(result.confidence, 'object');
  assert.equal(result.hints.reliable, true);
  assert.deepEqual(result.parts, []);
  assert.match(result.qualityNote, /ritagliato/);
  assert.deepEqual(result, analyze(p));
});

test('ignores fully transparent pixels even if their RGB values are saturated', () => {
  const p = picture({ background: [0, 255, 0, 0], foreground: [30, 90, 230, 255] });
  assert.equal(analyze(p).color, '#1e5ae6');
});

test('a low saturation image returns an honest low-confidence approximation', () => {
  const p = picture({ foreground: [85, 89, 93, 255] });
  const result = analyze(p);
  assert.equal(result.confidence, 'low');
  assert.match(result.color, /^#[\da-f]{6}$/);
  assert.match(result.qualityNote, /poco distinguibili/);
  assert.deepEqual(result.parts, []);
});

test('a tightly cropped uniform color preserves its palette with low confidence', () => {
  const p = picture({ background: [235, 42, 56, 255], foreground: [235, 42, 56, 255] });
  const result = analyze(p);
  assert.equal(result.color, '#eb2a38');
  assert.equal(result.confidence, 'low');
  assert.equal(segmentObject(p.data, p.width, p.height).reason, 'empty');
});

test('a green border does not overwhelm a centrally framed blue car', () => {
  const p = picture({ background: [43, 150, 62, 255], foreground: [24, 112, 222, 255], area: [20, 18, 59, 44] });
  assert.equal(analyze(p).color, '#1870de');
});

test('a toy against the room behind the table is still isolated by the table strategy', () => {
  // Wall (top half) and table (bottom half) in different colours; the toy rises from the table into the wall area.
  const p = scene({ width: 120, height: 80, background: [200, 190, 175, 255], backgroundBottom: [246, 244, 239, 255], split: 0.45,
    boxes: [[40, 20, 80, 62, [24, 90, 220, 255]]], discs: [[46, 64, 6, DARK], [74, 64, 6, DARK]] });
  const border = segmentObject(p.data, p.width, p.height);
  const result = analyze(p);
  assert.equal(result.confidence, 'object');
  assert.equal(result.hints.method, border.reliable ? 'border' : 'table');
  assert.equal(result.hints.wheels, 2);
  assert.equal(result.color, '#185adc');
  assert.deepEqual(result, analyze(p));
});

test('three dark tires under a long blue body suggest the trike part', () => {
  const p = scene({ width: 120, height: 70, boxes: [[14, 30, 106, 44, [24, 90, 220, 255]]], discs: [[22, 47, 6, DARK], [82, 47, 7, DARK], [102, 47, 7, DARK]] });
  const result = analyze(p);
  assert.equal(result.confidence, 'object');
  assert.equal(result.hints.wheels, 3);
  assert.ok(result.parts.includes('threeWheels'));
  assert.match(result.qualityNote, /triciclo/);
  const four = analyze(scene({ width: 120, height: 70, boxes: [[14, 30, 106, 44, [24, 90, 220, 255]]], discs: [[22, 47, 6, DARK], [42, 47, 6, DARK], [82, 47, 7, DARK], [102, 47, 7, DARK]] }));
  assert.equal(four.hints.wheels, 4);
  assert.ok(!four.parts.includes('threeWheels'));
});

test('a toy touching the bottom edge is still isolated', () => {
  const p = scene({ boxes: [[20, 30, 60, 59, RED]] });
  const result = analyze(p);
  assert.equal(result.confidence, 'object');
  assert.equal(result.hints.sidesTouched, 1);
  assert.equal(result.color, '#e12323');
});

test('a toy filling most of the frame falls back to the palette heuristic', () => {
  const p = scene({ boxes: [[6, 5, 73, 54, RED]] });
  assert.equal(segmentObject(p.data, p.width, p.height).reason, 'area');
  const result = analyze(p);
  assert.equal(result.confidence, 'palette');
  assert.equal(result.color, '#e12323');
  assert.match(result.qualityNote, /sfondo/);
});

test('a cluttered border disables segmentation but keeps the dominant color', () => {
  const p = scene({ boxes: [[15, 15, 64, 44, RED]], noisyBorder: 5 });
  const segmentation = segmentObject(p.data, p.width, p.height);
  assert.equal(segmentation.reliable, false);
  assert.equal(segmentation.reason, 'border');
  const result = analyze(p);
  assert.equal(result.confidence, 'palette');
  const [r, g, b] = rgbOf(result.color);
  assert.ok(r > 170 && g < 100 && b < 100, `red should dominate, got ${result.color}`);
});

test('a two-tone background (wall above a table) is still separated from the toy', () => {
  const p = scene({ background: [240, 238, 232, 255], backgroundBottom: [150, 150, 148, 255], boxes: [[20, 18, 59, 44, [24, 112, 222, 255]]] });
  const result = analyze(p);
  assert.equal(result.confidence, 'object');
  assert.equal(result.color, '#1870de');
});

test('big dark wheels under the body suggest the bigWheels part, small ones do not', () => {
  const big = analyze(scene({ boxes: [[15, 20, 64, 39, RED]], discs: [[24, 40, 12, DARK], [55, 40, 12, DARK]] }));
  assert.equal(big.confidence, 'object');
  assert.equal(big.hints.wheels, 2);
  assert.ok(big.hints.wheelRatio >= 0.5, `wheel ratio ${big.hints.wheelRatio}`);
  assert.deepEqual(big.parts, ['bigWheels']);
  const small = analyze(scene({ boxes: [[15, 20, 64, 39, RED]], discs: [[24, 40, 4, DARK], [55, 40, 4, DARK]] }));
  assert.equal(small.hints.wheels, 2);
  assert.deepEqual(small.parts, []);
});

test('protrusions above the roof line become antenna, high wing or tall cab suggestions', () => {
  const body = [15, 25, 64, 44, RED];
  const antenna = analyze(scene({ boxes: [body, [39, 15, 40, 24, RED]] }));
  assert.deepEqual(antenna.parts, ['antenna']);
  const wing = analyze(scene({ boxes: [body, [50, 17, 63, 24, RED]] }));
  assert.deepEqual(wing.parts, ['highWing']);
  const cab = analyze(scene({ boxes: [body, [33, 17, 46, 24, RED]] }));
  assert.deepEqual(cab.parts, ['cab']);
});

test('a body made of four strong hues suggests a brick cargo and keeps the whole palette', () => {
  const p = scene({ boxes: [
    [15, 22, 27, 42, RED], [28, 22, 39, 42, [240, 200, 30, 255]], [40, 22, 52, 42, [40, 180, 60, 255]], [53, 22, 64, 42, [30, 90, 230, 255]],
  ] });
  const result = analyze(p);
  assert.equal(result.confidence, 'object');
  assert.equal(result.palette.length, 4);
  assert.deepEqual(result.parts, ['cargo']);
});

test('rejects transparent or structurally invalid images', () => {
  assert.throws(() => analyzePixels(new Uint8ClampedArray(16), 2, 2), /vuota/);
  assert.throws(() => analyzePixels(new Uint8ClampedArray(16), 3, 2), /non valida/);
});

test('photo validation accepts common formats and rejects oversized or unsupported files', () => {
  assert.doesNotThrow(() => validatePhotoFile({ name: 'auto.jpg', size: 100, type: 'image/jpeg' }));
  assert.doesNotThrow(() => validatePhotoFile({ name: 'auto.PNG', size: 100, type: '' }));
  assert.throws(() => validatePhotoFile({ name: 'auto.svg', size: 100, type: 'image/svg+xml' }), /JPG/);
  assert.throws(() => validatePhotoFile({ name: 'auto.jpg', size: 13 * 1024 * 1024, type: 'image/jpeg' }), /12 MB/);
  assert.throws(() => validatePhotoFile({ name: 'auto.jpg', size: 0, type: 'image/jpeg' }), /valida/);
});
