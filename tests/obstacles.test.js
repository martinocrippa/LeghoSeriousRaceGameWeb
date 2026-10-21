import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, createTrack } from '../src/track.js';
import { RaceSimulation } from '../src/race.js';
import { CAR_HALF_WIDTH, MIN_GAP, checkObstacles, widestGap } from '../src/obstacles.js';

/**
 * "Put the collision in — but watch out, on some bridges the columns are close together and the crates are in
 * front of the columns." That warning is the whole point of these tests: a solid prop is only worth having if
 * the circuit is still driveable and the bonus is still reachable.
 */

const base = {
  id: 'test', name: 'Test', length: 400, roadWidth: 14, laps: 1,
  controlPoints: [[-60, -60], [60, -60], [60, 60], [-60, 60]],
};
const build = (obstacles, extra = {}) => createTrack({ ...base, ...extra, obstacles });

test('a wall of obstacles across the road is refused, a row with a gap is not', () => {
  // Two bollards near the edges of the 14 m road: the middle of the lap stays open.
  assert.doesNotThrow(() => build([
    { id: 'a', kind: 'cone', distance: 100, lane: -4.4 },
    { id: 'b', kind: 'cone', distance: 100, lane: 4.4 },
  ]));
  // A third one in the middle closes it: 11.8 m of lane centres cannot carry three cones abreast, and the rule
  // says so out loud rather than leaving a child to discover a wall at speed.
  assert.throws(() => build([
    { id: 'a', kind: 'cone', distance: 100, lane: -4.2 },
    { id: 'b', kind: 'cone', distance: 100, lane: 0 },
    { id: 'c', kind: 'cone', distance: 100, lane: 4.2 },
  ]), /drive through/);
  // The same three widened into planters: now they touch and nobody gets past.
  assert.throws(() => build([
    { id: 'a', kind: 'planter', distance: 100, lane: -3.4 },
    { id: 'b', kind: 'planter', distance: 100, lane: 0 },
    { id: 'c', kind: 'planter', distance: 100, lane: 3.4 },
  ]), /drive through/);
  // Two columns a metre apart — the bridge case — leave the middle blocked but the sides open.
  assert.doesNotThrow(() => build([
    { id: 'left', kind: 'column', distance: 100, lane: -1 },
    { id: 'right', kind: 'column', distance: 100, lane: 1 },
  ]));
});

test('a cluster is judged over a car length, not at one exact metre', () => {
  // Staggered by four metres each: still one wall as far as a car arriving at speed is concerned.
  assert.throws(() => build([
    { id: 'a', kind: 'planter', distance: 100, lane: -3.4 },
    { id: 'b', kind: 'planter', distance: 104, lane: 0 },
    { id: 'c', kind: 'planter', distance: 108, lane: 3.4 },
  ]), /drive through/);
});

test('nothing may be parked in front of a crate, a boost pad or a ramp landing', () => {
  const boxes = [{ id: 'box-a', distance: 200, lane: 0 }];
  assert.throws(() => build([{ id: 'x', kind: 'bin', distance: 190, lane: 0 }], { boxes }), /blocks the way to "box-a"/);
  // Ten metres before it but on the other side of the road: you can still line the crate up.
  assert.doesNotThrow(() => build([{ id: 'x', kind: 'bin', distance: 190, lane: 4.5 }], { boxes }));
  const ramps = [{ id: 'ramp-1', distance: 300, length: 12, lane: null, height: 2.1 }];
  assert.throws(() => build([{ id: 'x', kind: 'bin', distance: 318, lane: 3 }], { ramps }), /ramp-1/);
});

test('an obstacle off the road, or inside a loop, is a mistake worth an error', () => {
  assert.throws(() => build([{ id: 'x', kind: 'bin', distance: 100, lane: 22 }]), /not on the road/);
  assert.throws(() => build([{ id: 'x', kind: 'bin', distance: 900, lane: 0 }]), /off the circuit/);
  assert.throws(() => build([{ id: 'x', kind: 'bin', distance: 1, lane: 0 }, { id: 'x', kind: 'bin', distance: 40, lane: 3 }]), /declared twice/);
});

test('widestGap measures the free window in lane centres, car width included', () => {
  assert.equal(widestGap([], 5.9), 5.9 * 2);
  // One cone in the middle of a 14 m road: 5.9 - (0.5 + 1.1) = 4.3 m of centres either side.
  assert.ok(Math.abs(widestGap([{ lane: 0, radius: 0.5 }], 5.9) - 4.3) < 1e-9);
  assert.equal(widestGap([{ lane: 0, radius: 9 }], 5.9), 0);
  assert.equal(CAR_HALF_WIDTH, 1.1);
});

test('every circuit in the game is driveable with its obstacles in place', () => {
  for (const track of TRACKS) {
    const problems = [];
    checkObstacles(track.obstacles, track, (message) => problems.push(message));
    assert.deepEqual(problems, [], `${track.id}: ${problems.join(' / ')}`);
    for (const obstacle of track.obstacles) {
      const cluster = track.obstacles.filter((other) => Math.abs(track.wrap(other.distance - obstacle.distance + track.length / 2) - track.length / 2) <= 6);
      assert.ok(widestGap(cluster, track.roadWidth / 2 - CAR_HALF_WIDTH) >= MIN_GAP, `${track.id} a ${obstacle.distance} m`);
    }
  }
});

test('a car that drives into a column is shoved aside and slowed instead of passing through it', () => {
  const track = build([{ id: 'x', kind: 'column', distance: 200, lane: 0 }]);
  const sim = new RaceSimulation({ players: 1, opponents: 0, track, seed: 5 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  const [car] = sim.racers;
  car.progress = 180; car.lane = 0; car.speed = 24;
  let bumped = false;
  for (let i = 0; i < 180 && !bumped; i += 1) {
    sim.update(1 / 60, [{ steer: 0 }]);
    bumped = sim.events.some((event) => event.type === 'bump');
  }
  assert.ok(bumped, 'la colonna deve fermarti');
  assert.ok(Math.abs(car.lane) > 1.5, `spinta di lato, non attraverso: ${car.lane.toFixed(2)}`);
  assert.equal(car.damage, 0, 'ma non è un colpo: la macchina non si rompe');
});

test('an obstacle you fly over does not touch you', () => {
  const track = build([{ id: 'x', kind: 'cone', distance: 200, lane: 0 }]);
  const sim = new RaceSimulation({ players: 1, opponents: 0, track, seed: 5 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  const [car] = sim.racers;
  car.progress = 196; car.lane = 0; car.speed = 24; car.y = 3; car._airborne = true; car._verticalVelocity = 6;
  for (let i = 0; i < 30; i += 1) sim.update(1 / 60, [{ steer: 0 }]);
  assert.ok(!sim.events.some((event) => event.type === 'bump'), 'sopra il birillo non lo tocchi');
});
