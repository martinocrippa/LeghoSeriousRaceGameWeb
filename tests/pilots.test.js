import test from 'node:test';
import assert from 'node:assert/strict';
import { PILOT_COLORS, racingColors, RACING_COLOR_DISTANCE } from '../src/pilots.js';
import { CAR_PRESETS, SAMPLE_CARS } from '../src/cars.js';

const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const luma = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

test('each pilot races in the colour of their car', () => {
  assert.deepEqual(racingColors([{ color: '#ff6445' }, { color: '#28c2b4' }]), ['#ff6445', '#28c2b4']);
  assert.deepEqual(racingColors([{ color: '#FF6445' }]), ['#ff6445']);
});

test('a dark paint is lifted until it shows on the road', () => {
  const [black] = racingColors([{ color: '#000000' }]);
  assert.ok(luma(rgb(black)) >= 0.4, black);
  for (const car of [...CAR_PRESETS, ...SAMPLE_CARS]) assert.ok(luma(rgb(racingColors([car])[0])) >= 0.38, `${car.id} ${car.color}`);
});

test('two cars that look alike keep the pilots’ own colours', () => {
  assert.deepEqual(racingColors([{ color: '#ff0000' }, { color: '#ee1010' }]), PILOT_COLORS);
  const same = CAR_PRESETS[0];
  assert.deepEqual(racingColors([same, same]), PILOT_COLORS);
  const [a, b] = racingColors([{ color: '#ff0000' }, { color: '#0000ff' }]).map(rgb);
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) >= RACING_COLOR_DISTANCE);
});

test('a car without a usable colour gets the pilot’s colour, and another fallback can be given', () => {
  assert.deepEqual(racingColors([{ color: 'rosso' }, {}]), PILOT_COLORS);
  assert.deepEqual(racingColors([{}, { color: '#00ff00' }], ['#f48637', '#55c2c9']).length, 2);
  assert.deepEqual(racingColors(null), []);
});
