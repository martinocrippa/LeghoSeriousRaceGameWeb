import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrack } from '../src/track.js';
import { RaceSimulation } from '../src/race.js';
import { boxRow, ramp } from '../src/track-helpers.js';

/** A plain ring with one ramp, so the only thing that can change a shot's height is that ramp. */
const ringWithRamp = createTrack({
  id: 'prova-rampa', name: 'Prova', length: 400, roadWidth: 14, laps: 2,
  controlPoints: [[0, -60], [60, 0], [0, 60], [-60, 0]],
  ramps: [ramp('ramp-1', 100)],
  boxes: [...boxRow('a', 300)],
});
const RAMP = ringWithRamp.ramps[0];

function ready() {
  const sim = new RaceSimulation({ players: 2, track: ringWithRamp });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.boosts = [];
  sim.racers.forEach((r) => { r.lane = 0; r.speed = 24; });
  return sim;
}

test('a rocket climbs the ramp instead of going through it', () => {
  const sim = ready();
  const [shooter, target] = sim.racers;
  // Nobody in front: the rocket must fly the whole way to the ramp instead of exploding on a car first.
  shooter.progress = RAMP.distance - 30; target.progress = RAMP.distance - 120;
  shooter.item = 'rocket';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  const rocket = sim.projectiles.at(-1);
  assert.ok(rocket, 'il razzo deve partire');

  let onTheRamp = 0, highest = 0;
  for (let i = 0; i < 60 && rocket.ttl > 0; i += 1) {
    sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
    const along = sim.track.wrap(rocket.distance - RAMP.distance);
    if (along <= RAMP.length) onTheRamp += 1;
    highest = Math.max(highest, rocket.y);
  }
  assert.ok(onTheRamp > 0, 'il razzo deve passare sopra la rampa');
  assert.ok(highest > RAMP.height, `il razzo deve salire: massimo ${highest.toFixed(2)} m contro una rampa di ${RAMP.height} m`);
});

test('a car standing on the ramp is hit; one flying high above it is missed', () => {
  for (const [carHeight, shouldHit] of [[0, true], [7, false]]) {
    const sim = ready();
    const [shooter, target] = sim.racers;
    shooter.progress = 40; target.progress = 60;
    target.y = carHeight;
    target._airborne = carHeight > 0;
    target._verticalVelocity = carHeight > 0 ? 4 : 0;
    shooter.item = 'rocket';
    sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
    for (let i = 0; i < 40 && !target.stun; i += 1) {
      // Keep the flying car up in the air for the whole flight of the rocket.
      if (carHeight > 0) { target.y = carHeight; target._verticalVelocity = 4; }
      sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
    }
    assert.equal(target.stun > 0, shouldHit, `auto a ${carHeight} m: colpita = ${target.stun > 0}`);
  }
});

test('shots still behave on a circuit without ramps, and the race stays deterministic', () => {
  const runs = [0, 1].map(() => {
    const sim = ready();
    const [shooter, target] = sim.racers;
    shooter.progress = 200; target.progress = 220; shooter.item = 'rocket';
    sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
    for (let i = 0; i < 40; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
    return [target.stun, sim.racers.map((r) => [r.progress, r.y])];
  });
  assert.ok(runs[0][0] > 0, 'su strada piana il razzo colpisce come sempre');
  assert.deepEqual(runs[0], runs[1]);
});
