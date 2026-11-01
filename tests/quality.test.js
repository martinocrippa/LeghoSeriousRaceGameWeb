import test from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_LEVELS, QUALITY_ORDER, QUALITY_STORAGE_KEY, detectQuality, loadQuality, saveQuality, lowerQuality, createFrameMonitor } from '../src/quality.js';

const memoryStorage = (initial = {}) => { const data = { ...initial }; return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data }; };

test('quality levels get lighter in order: pixel ratio, shadow map and dust never grow', () => {
  for (let i = 1; i < QUALITY_ORDER.length; i += 1) {
    const heavier = QUALITY_LEVELS[QUALITY_ORDER[i - 1]], lighter = QUALITY_LEVELS[QUALITY_ORDER[i]];
    assert.ok(lighter.pixelRatio <= heavier.pixelRatio);
    assert.ok(lighter.shadowMap <= heavier.shadowMap);
    assert.ok(lighter.dust <= heavier.dust);
    assert.ok(lighter.skids <= heavier.skids && lighter.skids > 0);
    assert.ok(lighter.mirrorEvery === 0 || heavier.mirrorEvery === 0 || lighter.mirrorEvery >= heavier.mirrorEvery);
  }
  assert.equal(lowerQuality('high'), 'medium');
  assert.equal(lowerQuality('medium'), 'low');
  assert.equal(lowerQuality('low'), null);
  assert.equal(lowerQuality('nope'), null);
});

test('touch devices start light, everything else on medium; saved levels win over detection', () => {
  assert.equal(detectQuality({ coarsePointer: true }), 'low');
  assert.equal(detectQuality({}), 'medium');
  assert.equal(loadQuality(memoryStorage(), { coarsePointer: true }), 'low');
  assert.equal(loadQuality(memoryStorage({ [QUALITY_STORAGE_KEY]: 'high' }), { coarsePointer: true }), 'high');
  assert.equal(loadQuality(memoryStorage({ [QUALITY_STORAGE_KEY]: 'ultra' })), 'medium');
  assert.equal(loadQuality(null), 'medium');
  const storage = memoryStorage();
  assert.equal(saveQuality(storage, 'low'), true);
  assert.equal(storage.data[QUALITY_STORAGE_KEY], 'low');
  assert.equal(saveQuality(storage, 'ultra'), false);
  assert.equal(saveQuality({ setItem() { throw new Error('quota'); } }, 'low'), false);
});

test('the frame monitor fires once after the warm-up when a whole window averages above the threshold', () => {
  const monitor = createFrameMonitor({ windowSeconds: 1, thresholdMs: 20, warmupSeconds: 1 });
  // Warm-up: slow frames do not count.
  for (let i = 0; i < 30; i += 1) assert.equal(monitor.sample(1 / 30), false);
  // A smooth window (60 fps) does not fire.
  let fired = false;
  for (let i = 0; i < 61; i += 1) fired = monitor.sample(1 / 60) || fired;
  assert.equal(fired, false);
  // A slow window (40 fps = 25 ms) fires exactly once, then never again until reset.
  let count = 0;
  for (let i = 0; i < 45; i += 1) if (monitor.sample(1 / 40)) count += 1;
  assert.equal(count, 1);
  for (let i = 0; i < 100; i += 1) if (monitor.sample(1 / 20)) count += 1;
  assert.equal(count, 1);
  monitor.reset();
  for (let i = 0; i < 30; i += 1) monitor.sample(1 / 30);
  count = 0;
  for (let i = 0; i < 45; i += 1) if (monitor.sample(1 / 40)) count += 1;
  assert.equal(count, 1);
  // Bad samples are ignored.
  assert.equal(monitor.sample(NaN), false);
  assert.equal(monitor.sample(0), false);
});
