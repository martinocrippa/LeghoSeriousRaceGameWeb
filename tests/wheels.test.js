import test from 'node:test';
import assert from 'node:assert/strict';
import { WHEEL_PRESETS, presetAxles, wheelLayout, wheelPlan, expectedWheelCount } from '../src/wheels.js';
import { CAR_PRESETS, SAMPLE_CARS } from '../src/cars.js';

/**
 * The four special layouts as they were written before they became presets: literal wheel positions, left before
 * right, front before back. Kept here as the reference the expanded presets must reproduce exactly.
 */
function legacyLayout(kind, { w, l, wheelRadius, wheelWidth, axleZ }) {
  const sized = (spots) => spots.map(([x, z, sizeFactor = 1]) => ({ x, z, r: wheelRadius * sizeFactor, tread: wheelWidth * (sizeFactor < 1 ? 0.8 : 1), group: 'car' }));
  switch (kind) {
    case 'trike': return sized([[0, axleZ + 0.45], [-w / 2, -axleZ], [w / 2, -axleZ]]);
    case 'f1': return sized([[-w * 0.52, axleZ + 0.2, 0.7], [w * 0.52, axleZ + 0.2, 0.7], [-w * 0.55, -axleZ, 1.3], [w * 0.55, -axleZ, 1.3]]);
    case 'dragster': return sized([[-w * 0.4, l * 0.45, 0.58], [w * 0.4, l * 0.45, 0.58], [-w * 0.58, -l * 0.28, 1.45], [w * 0.58, -l * 0.28, 1.45]]);
    case 'convoy': return sized([[-w / 2, l * 0.42], [w / 2, l * 0.42], [-w / 2, l * 0.12], [w / 2, l * 0.12], [-w * 0.46, -l * 0.38, 0.55], [w * 0.46, -l * 0.38, 0.55]]);
    default: return sized([-w / 2, w / 2].flatMap((x) => [[x, -axleZ], [x, axleZ]]));
  }
}

const close = (a, b) => Math.abs(a - b) < 1e-12;
const bodies = [];
for (const w of [1.3, 1.7, 2.3]) for (const l of [2.3, 3.2, 4.2]) for (const [wheelRadius, wheelWidth] of [[0.25, 0.27], [0.34, 0.27], [0.48, 0.34], [0.64, 0.46]]) {
  for (const axleZ of [l * 0.29, l * 0.32]) bodies.push({ w, l, wheelRadius, wheelWidth, axleZ });
}

test('each preset puts every wheel exactly where the old hard-coded layout did, in the same order', () => {
  for (const kind of [...WHEEL_PRESETS, 'default']) {
    for (const geom of bodies) {
      const before = legacyLayout(kind, geom);
      const after = wheelLayout(kind === 'default' ? {} : { detail: kind }, geom);
      assert.equal(after.length, before.length, kind);
      before.forEach((wheel, i) => {
        for (const key of ['x', 'z', 'r', 'tread']) assert.ok(close(after[i][key], wheel[key]), `${kind} wheel ${i} ${key}: ${after[i][key]} vs ${wheel[key]}`);
        assert.equal(after[i].group, 'car');
      });
    }
  }
});

test('a preset is a plain axles list, so a car may also spell it out and get the same wheels', () => {
  for (const kind of WHEEL_PRESETS) {
    const geom = bodies[7];
    const axles = presetAxles(kind, geom);
    assert.ok(axles.every((axle) => Number.isFinite(axle.z) && Number.isFinite(axle.radius) && Number.isFinite(axle.width)));
    assert.equal(axles.filter((axle) => axle.steer).length, 1, `${kind} has one steering axle`);
    assert.deepEqual(wheelLayout({ axles }, geom), wheelLayout({ detail: kind }, geom));
  }
});

test('a garage car picks a preset with `wheels`; `detail` and `axles` win over it, unknown names are ignored', () => {
  assert.equal(wheelPlan({ wheels: 'f1' }).kind, 'f1');
  assert.equal(expectedWheelCount({ wheels: 'trike' }), 3);
  assert.equal(expectedWheelCount({ wheels: 'convoy' }), 6);
  assert.equal(wheelPlan({ wheels: 'f1', detail: 'dragster' }).kind, 'dragster');
  assert.equal(wheelPlan({ wheels: 'f1', axles: [{ z: 0, spread: 0 }] }).kind, 'axles');
  assert.equal(wheelPlan({ wheels: 'constructor' }).kind, 'default');
  assert.equal(wheelPlan({ wheels: '__proto__' }).kind, 'default');
});

test('the catalogue cars on the four special layouts still count their wheels the same', () => {
  const special = [...CAR_PRESETS, ...SAMPLE_CARS].filter((car) => WHEEL_PRESETS.includes(wheelPlan(car).kind));
  assert.ok(special.length >= 4);
  for (const car of special) assert.equal(expectedWheelCount(car), { trike: 3, f1: 4, dragster: 4, convoy: 6 }[wheelPlan(car).kind], car.id);
});
