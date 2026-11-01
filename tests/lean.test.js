import test from 'node:test';
import assert from 'node:assert/strict';
import { CAR_ROLL, BIKE_LEAN, STEER_MAX, SLIDE, bendAcceleration, leanLimit, leanTarget, stepLean, rest, wheelSteer, slideTarget, slideOffset } from '../src/lean.js';
import { leansIntoTurns } from '../src/wheels.js';
import { createTrack, TRACK_DEFINITIONS } from '../src/track.js';
import { CAR_PRESETS, SAMPLE_CARS } from '../src/cars.js';

const car = (id) => [...CAR_PRESETS, ...SAMPLE_CARS].find((c) => c.id === id);
// A circle drawn anticlockwise seen from above, i.e. with the heading growing: a left-hand bend all the way round.
const circle = { frame: (d) => ({ dx: Math.sin(d / 25), dz: Math.cos(d / 25) }) };

test('a left-hand bend is positive g, and speed counts squared', () => {
  const slow = bendAcceleration(circle, 100, 10), fast = bendAcceleration(circle, 100, 20);
  assert.ok(Math.abs(slow - 100 / 25 / 9.81) < 0.01);
  assert.ok(Math.abs(fast / slow - 4) < 1e-6);
  assert.equal(bendAcceleration({ frame: () => ({ dx: 0, dz: 1 }) }, 50, 30), 0);
});

test('cars roll out of the bend, motorbikes, trikes and nose-wheel aeroplanes lean into it', () => {
  assert.equal(leansIntoTurns(car('squalo')), false);
  for (const id of ['moto', 'duke', 'chopper', 'apetta', 'acrobata', 'sample-trike', 'sample-aereo']) assert.equal(leansIntoTurns(car(id)), true, id);
  // Left bend: a car's top goes right (positive), a motorbike's goes left (negative).
  assert.ok(leanTarget(1.5, 0, false) > 0);
  assert.ok(leanTarget(1.5, 0, true) < 0);
});

test('the lean approaches its limit smoothly and never passes it, even at four g', () => {
  assert.ok(leanTarget(4, 0.17, false) < CAR_ROLL);
  assert.ok(leanTarget(4, 0.17, false) > CAR_ROLL * 0.95);
  assert.ok(-leanTarget(-4, -0.17, true, BIKE_LEAN) < BIKE_LEAN);
  assert.ok(leanTarget(0.5, 0, false) < leanTarget(1, 0, false));
});

test('a wide trike leans in only a few degrees, a narrow motorbike all the way', () => {
  assert.equal(leanLimit(true, 0.12), BIKE_LEAN);
  assert.ok(leanLimit(true, 0.85) < 0.16);
  assert.equal(leanLimit(false, 0.96), CAR_ROLL);
});

test('the spring settles on the target, and letting go rocks back without a snap', () => {
  const state = { angle: 0, speed: 0 };
  for (let i = 0; i < 60; i++) stepLean(state, 0.1, 1 / 60);
  assert.ok(Math.abs(state.angle - 0.1) < 0.005);
  let previous = state.angle, biggestStep = 0, lowest = Infinity;
  for (let i = 0; i < 90; i++) {
    stepLean(state, 0, 1 / 60);
    biggestStep = Math.max(biggestStep, Math.abs(state.angle - previous));
    lowest = Math.min(lowest, state.angle);
    previous = state.angle;
  }
  // From 0.1 rad back to rest over many frames, never more than a fifth of the way in one, with one small rebound.
  assert.ok(biggestStep < 0.02, `step ${biggestStep}`);
  assert.ok(lowest < 0 && lowest > -0.03, `rebound ${lowest}`);
  assert.ok(Math.abs(state.angle) < 0.003);
});

test('a slow frame and many fast ones lean the car the same way', () => {
  const one = { angle: 0, speed: 0 }, many = { angle: 0, speed: 0 };
  stepLean(one, 0.1, 8 / 120);
  for (let i = 0; i < 8; i++) stepLean(many, 0.1, 1 / 120);
  assert.ok(Math.abs(one.angle - many.angle) < 1e-6);
});

test('leaning keeps the tyres on the road: the lowest tyre edge stays at road level', () => {
  const lowest = (angle, roll, inward) => {
    const at = rest(angle, roll, inward), c = Math.cos(angle), s = Math.sin(angle);
    // Tyre bottoms, relative to the pivot: (±halfTrack, -pivotY), rotated by `angle` about z, then placed at `at`.
    return Math.min(...[-1, 1].map((side) => at.y + side * roll.halfTrack * s - roll.pivotY * c));
  };
  const carRoll = { pivotY: 0.42, halfTrack: 0.96 }, bike = { pivotY: 0.38, halfTrack: 0.12 };
  for (const angle of [-0.12, -0.05, 0, 0.07, 0.12]) assert.ok(Math.abs(lowest(angle, carRoll, false)) < 1e-9, `car ${angle}`);
  for (const angle of [-0.42, -0.2, 0, 0.3]) assert.ok(Math.abs(lowest(angle, bike, true)) < 1e-9, `bike ${angle}`);
  // The motorbike pivots on its contact patch: the tyre stays under it instead of sliding out sideways.
  assert.ok(Math.abs(rest(0.42, bike, true).x + 0.38 * Math.sin(0.42)) < 1e-9);
});

test('every circuit gives a finite lean everywhere along it', () => {
  for (const definition of TRACK_DEFINITIONS) {
    const track = createTrack(definition);
    for (let d = 0; d < track.length; d += 7) assert.ok(Number.isFinite(leanTarget(bendAcceleration(track, d, 40), 0, false)), `${definition.id} ${d}`);
  }
});

test('the steering wheels turn: the front pair, or the axles marked steer (the harvester steers at the back)', async () => {
  const { createCarModel } = await import('../src/cars.js');
  const steering = (id) => createCarModel(car(id)).userData.wheels.filter((wheel) => wheel.userData.steerSign).map((wheel) => wheel.userData.steerSign);
  assert.deepEqual(steering('squalo'), [1, 1]);
  assert.deepEqual(steering('moto'), [1]);
  assert.deepEqual(steering('sample-trike'), [1]);
  assert.deepEqual(steering('sample-mietitrebbia'), [-1, -1]);
  // The rotation order only matters once a wheel turns: at rest the recorded geometry is the same.
  const wheel = createCarModel(car('squalo')).userData.wheels.find((w) => w.userData.steerSign);
  assert.equal(wheel.rotation.order, 'YXZ');
  assert.equal(wheel.rotation.y, 0);
});

test('the wheels turn into the bend, more than the geometry says but never past their stop', () => {
  assert.ok(wheelSteer(0.04, 2, 0) > Math.atan(0.08));
  assert.ok(wheelSteer(-0.04, 2, 0) < 0);
  assert.equal(wheelSteer(1, 2, 0.17), STEER_MAX);
  assert.equal(wheelSteer(0, 2, 0), 0);
});

test('the tail swings out only in the tight bends, outward, pivoting on the front axle', () => {
  assert.equal(slideTarget(1), 0);
  assert.ok(slideTarget(1.8) > 0 && slideTarget(1.8) < SLIDE);
  assert.ok(Math.abs(slideTarget(5) - SLIDE) < 1e-12);
  assert.ok(slideTarget(-3) < 0);
  // Rotating the car by the swing and placing it at the offset leaves the front axle where it was.
  const angle = 0.12, frontZ = 1.1, at = slideOffset(angle, frontZ);
  assert.ok(Math.abs(at.x + frontZ * Math.sin(angle)) < 1e-12);
  assert.ok(Math.abs(at.z + frontZ * Math.cos(angle) - frontZ) < 1e-12);
});

test('tyre marks: only while sliding and on the ground, coloured by the surface', async () => {
  const { leavesMarks, skidColour, SKID_COLOURS } = await import('../src/lean.js');
  const { SURFACE_KINDS } = await import('../src/track.js');
  assert.equal(leavesMarks({ grounded: true, slide: 0 }), false);
  assert.equal(leavesMarks({ grounded: true, slide: 0.08 }), true);
  assert.equal(leavesMarks({ grounded: true, slide: -0.08 }), true);
  assert.equal(leavesMarks({ grounded: false, slide: 0.08 }), false);
  for (const cause of [{ drifting: true }, { spinning: 0.5 }, { slipping: 1 }]) assert.equal(leavesMarks({ grounded: true, slide: 0, ...cause }), true);
  for (const kind of SURFACE_KINDS) assert.match(skidColour(kind), /^#[0-9a-f]{6}$/);
  assert.notEqual(skidColour('dirt'), skidColour('asphalt'));
  assert.equal(skidColour('default'), SKID_COLOURS.asphalt);
});
