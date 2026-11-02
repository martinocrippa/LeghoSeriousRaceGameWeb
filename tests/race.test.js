import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, OFFROAD } from '../src/race.js';
import { getTrackFrame, getTrackPoints, getTrack, TRACK_LENGTH, ROAD_WIDTH, TOTAL_LAPS } from '../src/track.js';

function advance(sim, seconds, inputs = []) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) sim.update(1 / 60, inputs);
}

test('closed circuit has normalized tangents and uniform distance sampling', () => {
  assert.deepEqual(getTrackFrame(0), getTrackFrame(TRACK_LENGTH));
  assert.deepEqual(getTrackFrame(-25), getTrackFrame(TRACK_LENGTH - 25));
  const points = getTrackPoints(256);
  let length = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    assert.ok(Math.abs(Math.hypot(a.dx, a.dz) - 1) < 1e-10);
    length += Math.hypot(a.x - b.x, a.z - b.z);
  }
  assert.ok(Math.abs(length - TRACK_LENGTH) < 1);
});

test('countdown holds cars, starts once, and ignores invalid/huge frame durations safely', () => {
  const sim = new RaceSimulation();
  advance(sim, 3);
  assert.equal(sim.state, 'countdown');
  assert.equal(sim.racers[0].progress, 0);
  sim.update(NaN);
  sim.update(-100);
  assert.equal(sim.time, 0);
  advance(sim, 0.6);
  assert.equal(sim.state, 'racing');
  assert.ok(sim.racers[0].progress > 0);
  const time = sim.time;
  sim.update(1000);
  assert.ok(sim.time - time <= 0.251);
  assert.equal(sim.drainEvents().filter((event) => event.type === 'start').length, 1);
  assert.deepEqual(sim.drainEvents(), []);
});

test('two humans steer independently, brake independently, and stay on the road or its verge', () => {
  const sim = new RaceSimulation({ players: 2 });
  advance(sim, 4);
  const initialOne = sim.racers[0].lane;
  const initialTwo = sim.racers[1].lane;
  advance(sim, 0.2, [{ steer: -1, brake: true }, { steer: 1 }]);
  assert.ok(sim.racers[0].lane < initialOne);
  assert.ok(sim.racers[1].lane > initialTwo);
  advance(sim, 4, [{ steer: -1, brake: true }, { steer: 1 }]);
  assert.ok(sim.racers[0].speed < sim.racers[1].speed);
  for (const racer of sim.racers) assert.ok(Math.abs(racer.lane) <= ROAD_WIDTH / 2 - 1.1 + OFFROAD + 1e-9);
});

test('auto throttle completes three laps and restart starts a fresh race', () => {
  const sim = new RaceSimulation({ seed: 9 });
  advance(sim, 110);
  assert.equal(sim.state, 'finished');
  assert.equal(sim.racers[0].progress, TRACK_LENGTH * TOTAL_LAPS);
  assert.equal(sim.racers[0].lap, TOTAL_LAPS);
  assert.ok(sim.racers[0].finishTime > 50 && sim.racers[0].finishTime < 110);
  assert.deepEqual([...sim.racers.map((racer) => racer.rank)].sort(), [1, 2, 3, 4, 5, 6]);
  const reset = new RaceSimulation({ seed: 9 });
  assert.equal(reset.state, 'countdown');
  assert.equal(reset.time, 0);
  assert.equal(reset.racers[0].item, null);
  assert.equal(reset.racers[0].progress, 0);
  assert.ok(reset.boxes.every((box) => box.available));
});

test('easy mode lets a new driver contend while using only two bonuses', () => {
  const sim = new RaceSimulation({ difficulty: 'easy' });
  let uses = 0;
  let previousUse = false;
  let jumps = 0;
  let pickups = 0;
  for (let tick = 0; tick < 120 * 60 && sim.state !== 'finished'; tick++) {
    const useItem = uses < 2 && !!sim.racers[0].item && !previousUse;
    if (useItem) uses++;
    sim.update(1 / 60, [{ steer: 0, useItem }]);
    previousUse = useItem;
    for (const event of sim.drainEvents()) {
      if (event.racerId !== 'p1') continue;
      if (event.type === 'jump') jumps++;
      if (event.type === 'pickup') pickups++;
    }
  }
  assert.equal(sim.state, 'finished');
  assert.equal(uses, 2);
  assert.equal(jumps, 6);
  assert.equal(pickups, 3);
  // Contending is a matter of odds, not of one race: one seed can always draw the wrong crates (adding the parachute
  // and the hang-glider sent this one to fifth). Over twenty races, a new driver is on the podium in most of them.
  let podiums = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const race = new RaceSimulation({ difficulty: 'easy', seed });
    let used = 0, previous = false;
    for (let tick = 0; tick < 120 * 60 && race.state !== 'finished'; tick++) {
      const use = used < 2 && !!race.racers[0].item && !previous;
      if (use) used++;
      race.update(1 / 60, [{ steer: 0, useItem: use }]);
      previous = use;
    }
    if (race.racers[0].rank <= 3) podiums++;
  }
  assert.ok(podiums >= 16, `a new driver should contend for the podium: ${podiums}/20`);
});

test('two-player race continues until both humans finish; finish order stays stable', () => {
  const sim = new RaceSimulation({ players: 2 });
  advance(sim, 4);
  sim.racers[0].progress = TRACK_LENGTH * TOTAL_LAPS - 0.1;
  sim.racers[0].speed = 22;
  sim.update(0.02);
  assert.equal(sim.racers[0].finished, true);
  assert.equal(sim.state, 'racing');
  const finishTime = sim.racers[0].finishTime;
  sim.racers[1].progress = TRACK_LENGTH * TOTAL_LAPS - 0.1;
  sim.racers[1].speed = 22;
  sim.update(0.02);
  assert.equal(sim.state, 'finished');
  assert.equal(sim.racers[0].finishTime, finishTime);
  assert.equal(sim.racers[0].rank, 1);
  assert.equal(sim.racers[1].rank, 2);
});

test('boxes award usable powerups, consume once on press, and respawn', () => {
  const sim = new RaceSimulation();
  advance(sim, 4);
  const player = sim.racers[0];
  const box = sim.boxes[0];
  player.progress = box.distance - 0.1;
  player.lane = box.lane;
  player.speed = 22;
  sim.update(0.02);
  assert.ok(['boost', 'shield', 'rocket', 'bomb', 'machinegun', 'jelly'].includes(player.item));
  assert.equal(box.available, false);
  player.item = 'boost';
  sim.update(0.02, [{ useItem: true }]);
  assert.equal(player.item, null);
  assert.ok(player.boost > 2.9);
  player.item = 'shield';
  sim.update(0.02, [{ useItem: true }]);
  assert.equal(player.item, 'shield');
  sim.update(0.02, [{ useItem: false }]);
  sim.update(0.02, [{ useItem: true }]);
  assert.ok(player.shield > 5.9);
  assert.equal(player.item, null);
  advance(sim, 4.1);
  assert.equal(box.available, true);
});

test('homing rocket hits a car ahead and a shield absorbs the hit', () => {
  const sim = new RaceSimulation({ players: 2 });
  advance(sim, 4);
  const [shooter, target] = sim.racers;
  shooter.progress = 140;
  target.progress = 154;
  shooter.lane = target.lane = 0;
  target.shield = 5;
  shooter.item = 'rocket';
  sim.update(0.02, [{ useItem: true }, {}]);
  assert.equal(sim.projectiles[0]?.targetId, target.id);
  advance(sim, 0.8);
  assert.equal(target.shield, 0);
  assert.equal(target.stun, 0);
  assert.ok(sim.drainEvents().some((event) => event.type === 'shield-hit' && event.racerId === target.id));
});

test('bomb hits a following car; ramps lift the car then land without leaving the road', () => {
  const sim = new RaceSimulation({ players: 2 });
  advance(sim, 4);
  const [first, following] = sim.racers;
  first.progress = 160;
  following.progress = 139;
  first.speed = following.speed = 22;
  first.lane = following.lane = 0;
  first.item = 'bomb';
  sim.update(0.02, [{ useItem: true }, {}]);
  advance(sim, 0.9);
  assert.ok(sim.drainEvents().some((event) => event.type === 'hit' && event.racerId === following.id));
  first.progress = sim.ramps[0].distance + sim.ramps[0].length - 0.1;
  first.speed = 22;
  first.y = 0;
  sim.update(0.02);
  assert.ok(first.y >= 2);
  advance(sim, 0.2);
  assert.ok(first.y > 3);
  advance(sim, 1.4);
  assert.equal(first.y, 0);
  assert.ok(Math.abs(first.lane) < ROAD_WIDTH / 2);
});

test('opponents never drive a chosen car, humans keep their car name, and the field is reproducible per seed', () => {
  const garage = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, name: id.toUpperCase(), color: '#ff0000', accent: '#00ff00', shape: 'classic' }));
  const sim = new RaceSimulation({ cars: [garage[3]], aiCars: garage, seed: 5 });
  assert.equal(sim.racers[0].name, 'D');
  assert.ok(sim.racers.slice(1).every((racer) => racer.spec.id !== 'd'));
  assert.equal(new Set(sim.racers.map((racer) => racer.spec.id)).size, 6);
  const again = new RaceSimulation({ cars: [garage[3]], aiCars: garage, seed: 5 });
  assert.deepEqual(again.racers.map((racer) => racer.spec.id), sim.racers.map((racer) => racer.spec.id));
  const other = new RaceSimulation({ cars: [garage[3]], aiCars: garage, seed: 6 });
  assert.notDeepEqual(other.racers.map((racer) => racer.spec.id), sim.racers.map((racer) => racer.spec.id));
  const duo = new RaceSimulation({ players: 2, cars: [garage[0], garage[1]], aiCars: garage, seed: 5 });
  assert.deepEqual(duo.racers.slice(0, 2).map((racer) => racer.name), ['A', 'B']);
  assert.equal(new Set(duo.racers.map((racer) => racer.spec.id)).size, 6);
  // Without a garage the fallback cars fill the field, still without colliding with the human car.
  const bare = new RaceSimulation();
  assert.ok(bare.racers.slice(1).every((racer) => racer.spec.id !== bare.racers[0].spec.id));
  // A cup passes its own field seed so the opponents stay the same while each race seed differs.
  const stageOne = new RaceSimulation({ cars: [garage[3]], aiCars: garage, seed: 11, fieldSeed: 99 });
  const stageTwo = new RaceSimulation({ cars: [garage[3]], aiCars: garage, seed: 12, fieldSeed: 99 });
  assert.deepEqual(stageTwo.racers.map((racer) => racer.spec.id), stageOne.racers.map((racer) => racer.spec.id));
});

test('the field shrinks with the opponents option, down to a solo time trial that still finishes', () => {
  const solo = new RaceSimulation({ opponents: 0, seed: 4 });
  assert.equal(solo.racers.length, 1);
  assert.equal(solo.racers[0].isPlayer, true);
  for (let tick = 0; tick < 200 * 60 && solo.state !== 'finished'; tick++) solo.update(1 / 60, [{ steer: 0 }]);
  assert.equal(solo.state, 'finished');
  assert.equal(solo.racers[0].rank, 1);
  const duo = new RaceSimulation({ players: 2, opponents: 2, seed: 4 });
  assert.equal(duo.racers.length, 4);
  assert.deepEqual(duo.racers.map((racer) => racer.isPlayer), [true, true, false, false]);
  assert.equal(new RaceSimulation({ opponents: 9 }).racers.length, 6, 'capped at five opponents');
  assert.equal(new RaceSimulation({ opponents: 2.5 }).racers.length, 6, 'non-integers keep the default field');
});

test('other circuits drive the simulation: pitch laps and jumps, snow lanes inside the narrower road', () => {
  const pitch = new RaceSimulation({ track: getTrack('arca'), seed: 9 });
  assert.equal(pitch.totalLaps, 4);
  assert.equal(pitch.trackLength, 560);
  let jumps = 0;
  for (let tick = 0; tick < 240 * 60 && pitch.state !== 'finished'; tick++) {
    pitch.update(1 / 60, [{ steer: 0 }]);
    for (const event of pitch.drainEvents()) if (event.type === 'jump' && event.racerId === 'p1') jumps++;
  }
  assert.equal(pitch.state, 'finished');
  assert.equal(pitch.racers[0].progress, 560 * 4);
  assert.equal(pitch.racers[0].lap, 4);
  assert.equal(jumps, 12, 'three ramps on each of four laps');
  // Both cars are held hard against the two sides for the whole race: out on the verge where there is one, against
  // the edge of the road where there is not (the bridge, the arch). They must still get round.
  const snow = new RaceSimulation({ track: getTrack('aprica'), players: 2, seed: 3 });
  for (let tick = 0; tick < 200 * 60 && snow.state !== 'finished'; tick++) {
    snow.update(1 / 60, [{ steer: 1 }, { steer: -1 }]);
    if (tick % 30 === 0) for (const racer of snow.racers) assert.ok(Math.abs(racer.lane) <= 4.9 + OFFROAD + 1e-9, `lane ${racer.lane} inside a 12 m road and its verge`);
  }
  assert.equal(snow.state, 'finished');
  assert.equal(snow.racers[0].progress, 700 * 3);
});

test('off the road: a car steered out goes onto the verge and slows down, and comes back', () => {
  const sim = new RaceSimulation({ players: 1, opponents: 0, seed: 4 });
  sim.state = 'racing'; sim.countdown = 0; sim.boxes = []; sim.ramps = []; sim.boosts = []; sim.obstacles = []; sim.critters = [];
  const [car] = sim.racers;
  car.progress = 100; car.speed = 20;
  advance(sim, 3, [{ steer: -1 }]);
  assert.ok(car.offroad, 'fuori strada');
  assert.ok(Math.abs(car.lane) > ROAD_WIDTH / 2 - 0.5 && Math.abs(car.lane) <= ROAD_WIDTH / 2 - 1.1 + OFFROAD + 1e-9, `sul bordo erboso: corsia ${car.lane}`);
  const grass = car.speed;
  advance(sim, 1, [{ steer: 1 }]);
  assert.ok(!car.offroad && car.speed > grass * 1.3, `tornata in strada riprende velocità: ${grass.toFixed(1)} → ${car.speed.toFixed(1)}`);
});

test('no verge where there is none: under the bridge of Rome the gallery walls keep the car on the road', () => {
  const sim = new RaceSimulation({ players: 1, opponents: 0, seed: 4, track: getTrack('roma') });
  sim.state = 'racing'; sim.countdown = 0; sim.boxes = []; sim.ramps = []; sim.boosts = []; sim.obstacles = []; sim.critters = [];
  const [car] = sim.racers;
  car.progress = 395; car.speed = 10;
  for (let i = 0; i < 60; i++) {
    sim.update(1 / 60, [{ steer: 1 }]);
    if (car.progress > 397 && car.progress < 408) assert.ok(Math.abs(car.lane) <= 14 / 2 - 1.1 + 1e-6, `nella galleria resta in strada: ${car.lane}`);
  }
});

test('two cars that touch knock into each other: thrown apart, the one behind slower, one knock per contact', () => {
  const sim = new RaceSimulation({ players: 2, opponents: 0, seed: 4 });
  sim.state = 'racing'; sim.countdown = 0; sim.boxes = []; sim.ramps = []; sim.boosts = []; sim.obstacles = []; sim.critters = [];
  const [front, back] = sim.racers;
  front.progress = 101; front.lane = 0.3; front.speed = 18;
  back.progress = 100; back.lane = -0.3; back.speed = 24;
  sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  const bumps = sim.drainEvents().filter((e) => e.type === 'car-bump');
  assert.equal(bumps.length, 1, 'uno scontro');
  assert.ok(front.drift > 0 && back.drift < 0, 'si allontanano di lato');
  assert.ok(back.speed < 22, `chi tampona rallenta: ${back.speed.toFixed(1)}`);
  advance(sim, 0.4, [{ steer: 0 }, { steer: 0 }]);
  assert.ok(front.lane - back.lane > 1.8, `separate: ${(front.lane - back.lane).toFixed(2)} m`);
  assert.equal(sim.drainEvents().filter((e) => e.type === 'car-bump').length, 0, 'un colpo solo, non una raffica');
});
