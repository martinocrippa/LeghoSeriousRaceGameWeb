import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, ITEM_KINDS } from '../src/race.js';
import { getTrack } from '../src/track.js';

/**
 * "Can you test that the bonuses work?" — yes, and this is the test that would have caught the bomb.
 *
 * Every crate item is used by a player, and the race is then asked to show, in its own state, that something
 * happened: a projectile in the air, a hazard on the tarmac, a flag on the car. Then the clock is run on and the
 * item has to REACH someone or go off by itself: a bomb dropped on an empty road used to sit there and evaporate,
 * which is exactly what "if I drop it, it doesn't explode" meant.
 */
function ready({ gap = 12 } = {}) {
  const sim = new RaceSimulation({ players: 2, opponents: 0, seed: 7 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  // Two cars in a line, the second one `gap` metres behind: close enough to be caught by anything left behind.
  sim.racers.forEach((racer, i) => { racer.progress = 200 - i * gap; racer.lane = 0; racer.speed = 22; });
  return sim;
}

const run = (sim, seconds, inputs = [{ steer: 0 }, { steer: 0 }]) => {
  for (let i = 0; i < Math.round(seconds * 60); i += 1) sim.update(1 / 60, inputs);
};

test('using any bonus changes the race at once, and none of them is silently dropped', () => {
  for (const item of ITEM_KINDS) {
    const sim = ready();
    const [player] = sim.racers;
    player.item = item;
    const before = { projectiles: sim.projectiles.length, hazards: sim.hazards.length, boost: player.boost, shield: player.shield, gun: player.machinegun, propeller: player.propeller, rainbow: player.rainbow, parachute: player.parachute, glider: player.glider, storm: sim.racers[1].storm };
    sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
    assert.equal(player.item, null, `${item}: la cassa si svuota`);
    const changed = sim.projectiles.length > before.projectiles
      || sim.hazards.length > before.hazards
      || player.boost > before.boost
      || player.shield > before.shield
      || player.propeller > before.propeller
      || player.parachute > before.parachute
      || player.glider > before.glider
      || sim.racers[1].storm > before.storm
      || player.rainbow > before.rainbow
      || player.machinegun > before.gun;
    assert.ok(changed, `${item}: usarlo non ha prodotto niente`);
    assert.ok(sim.events.some((event) => event.type === 'use-item' && event.item === item), `${item}: nessun evento`);
  }
});

test('every weapon left on the road catches the car that drives into it', () => {
  // A bomb arms at once, so a car right behind is caught; jelly and oil are laid down for whoever comes along a
  // moment later, so the chaser is given the room to arrive after they are live. The fountain is planted well up
  // the road and its own thrower is spared for two seconds, so here too it is the second car that runs into it.
  const cases = [
    { item: 'bomb', gap: 9, mark: (racer) => racer.damage > 0 },
    { item: 'jelly', gap: 20, mark: (racer) => racer.stuck > 0 },
    { item: 'oil', gap: 20, mark: (racer) => racer.slipping > 0 },
    { item: 'fountain', gap: 12, mark: (racer) => racer.slowed > 0 },
  ];
  for (const { item, gap, mark } of cases) {
    const sim = ready({ gap });
    const [player] = sim.racers;
    player.item = item;
    sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
    assert.equal(sim.hazards.length, 1, `${item}: deve restare in pista`);
    let caught = false;
    for (let i = 0; i < 300 && !caught; i += 1) {
      sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
      caught = mark(sim.racers[1]);
    }
    assert.ok(caught, `${item}: nessuno se n'è accorto`);
  }
});

test('the propeller keeps the car in the air: the same ramp carries it much further', () => {
  // Two identical launches off the same ramp, one with the propeller running. The flight has to be longer, and
  // the car has to come down on the road both times — a bonus that shoots you off the circuit is no fun.
  const flight = (propeller) => {
    const sim = new RaceSimulation({ players: 1, opponents: 0, seed: 11, difficulty: 'normal' });
    sim.state = 'racing'; sim.countdown = 0;
    sim.boxes = []; sim.boosts = [];
    const [car] = sim.racers;
    const ramp = sim.ramps[0];
    car.progress = ramp.distance - 2; car.lane = 0; car.speed = 24;
    if (propeller) { car.item = 'propeller'; sim.update(1 / 60, [{ steer: 0, useItem: true }]); }
    let takeOff = null, landing = null;
    for (let i = 0; i < 60 * 8 && landing === null; i += 1) {
      sim.update(1 / 60, [{ steer: 0 }]);
      for (const event of sim.drainEvents()) {
        if (event.type === 'jump' && takeOff === null) takeOff = car.progress;
        if (event.type === 'land' && takeOff !== null) landing = car.progress;
      }
    }
    assert.ok(landing !== null, 'la macchina deve riatterrare');
    return landing - takeOff;
  };
  const plain = flight(false), flown = flight(true);
  assert.ok(flown > plain * 1.6, `con l'elica si vola molto più lontano: ${plain.toFixed(1)} m contro ${flown.toFixed(1)} m`);
});

test('The parachute: opened in a jump it flies the car down the road for five seconds, on the ground it brakes', () => {
  const sim = () => {
    const race = new RaceSimulation({ players: 1, opponents: 0, seed: 11, difficulty: 'normal' });
    race.state = 'racing'; race.countdown = 0;
    race.boxes = []; race.boosts = [];
    return race;
  };
  // Off the first ramp, opened (or not) a fifth of a second after take-off.
  const jump = (open) => {
    const race = sim();
    const [car] = race.racers;
    car.progress = race.ramps[0].distance - 2; car.lane = 0; car.speed = 24;
    const start = car.progress;
    let takeOff = null, landed = null, top = 0, impact = null, bounces = 0, flying = 0;
    for (let i = 0; i < 60 * 9; i += 1) {
      const use = open && takeOff !== null && i === takeOff + 12;
      if (use) car.item = 'parachute';
      race.update(1 / 60, [{ steer: 0, useItem: use }]);
      top = Math.max(top, car.y);
      if (car.chute === 'fly') flying += 1 / 60;
      for (const event of race.drainEvents()) {
        if (event.type === 'jump' && takeOff === null) takeOff = i;
        if (event.type === 'land' && landed === null && takeOff !== null) { if (event.bounce) bounces++; else { landed = (i - takeOff) / 60; impact = event.impact; } }
      }
    }
    return { gained: car.progress - start, top, landed, impact, bounces, flying, chute: car.chute };
  };
  const plain = jump(false), flown = jump(true);
  assert.ok(flown.landed > 5, `in volo per almeno 5 s: atterra dopo ${flown.landed?.toFixed(2)} s`);
  assert.ok(flown.flying >= 5, 'per tutto il volo il paracadute è aperto');
  assert.ok(flown.top > plain.top, `vola più in alto di un salto normale: ${plain.top.toFixed(1)} m contro ${flown.top.toFixed(1)} m`);
  assert.ok(flown.gained > plain.gained + 20, `e porta avanti: ${plain.gained.toFixed(1)} m contro ${flown.gained.toFixed(1)} m in 9 s`);
  assert.ok(flown.impact <= 4.2 + 1e-9 && flown.bounces === 0, 'si posa piano, senza rimbalzi');
  assert.equal(flown.chute, null, 'a terra il paracadute non c’è più');

  // On flat road, no ramp anywhere: the same four seconds with and without the parachute opened.
  const flat = (open) => {
    const race = sim();
    race.ramps = [];
    const [car] = race.racers;
    car.progress = 50; car.lane = 0; car.speed = 24;
    if (open) car.item = 'parachute';
    race.update(1 / 60, [{ steer: 0, useItem: open }]);
    const braking = car.chute;
    run(race, 2.5, [{ steer: 0 }]);
    const after = car.chute;
    run(race, 1.5, [{ steer: 0 }]);
    return { distance: car.progress - 50, braking, after, y: car.y };
  };
  const cruise = flat(false), braked = flat(true);
  assert.equal(braked.braking, 'brake', 'a terra si apre come freno');
  assert.ok(braked.distance < cruise.distance - 15, `e fa perdere strada: ${cruise.distance.toFixed(1)} m contro ${braked.distance.toFixed(1)} m`);
  assert.equal(braked.after, null, 'dopo 2 secondi si richiude');
  assert.equal(braked.y, 0, 'e non fa mai volare');
});

test('the hang-glider glides furthest, further than the propeller, and lands softly', () => {
  const flight = (item) => {
    const sim = new RaceSimulation({ players: 1, opponents: 0, seed: 11, difficulty: 'normal' });
    sim.state = 'racing'; sim.countdown = 0;
    sim.boxes = []; sim.boosts = [];
    const [car] = sim.racers;
    const ramp = sim.ramps[0];
    car.progress = ramp.distance - 2; car.lane = 0; car.speed = 24;
    if (item) { car.item = item; sim.update(1 / 60, [{ steer: 0, useItem: true }]); }
    let takeOff = null, landing = null, impact = null, bounces = 0;
    for (let i = 0; i < 60 * 10 && landing === null; i += 1) {
      sim.update(1 / 60, [{ steer: 0 }]);
      for (const event of sim.drainEvents()) {
        if (event.type === 'jump' && takeOff === null) takeOff = car.progress;
        if (event.type === 'land' && takeOff !== null) { if (event.bounce) bounces++; else { landing = car.progress; impact = event.impact; } }
      }
    }
    assert.ok(landing !== null, `${item}: la macchina deve riatterrare`);
    return { distance: landing - takeOff, impact, bounces };
  };
  const plain = flight(null), glider = flight('glider'), propeller = flight('propeller');
  assert.ok(glider.distance > plain.distance * 2, `il deltaplano plana lontano: ${plain.distance.toFixed(1)} m contro ${glider.distance.toFixed(1)} m`);
  assert.ok(glider.distance > propeller.distance, 'più lontano dell’elica');
  assert.ok(glider.impact <= 1.15 + 1e-9 && glider.bounces === 0);
});

test('a bomb dropped on an empty road still goes off, by itself, within its fuse', () => {
  const sim = ready({ gap: 400 });
  const [player] = sim.racers;
  player.item = 'bomb';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  assert.equal(sim.hazards.length, 1);
  run(sim, 2);
  assert.equal(sim.hazards.length, 1, 'la miccia dura più di due secondi');
  run(sim, 2.5);
  assert.equal(sim.hazards.length, 0, 'dopo la miccia la bomba non c’è più');
  const bang = sim.events.filter((event) => event.type === 'pop' && event.source === 'bomb');
  assert.equal(bang.length, 1, 'e si vede scoppiare una volta sola');
});

test('the catherine wheel bursts where it stops instead of vanishing', () => {
  const sim = ready({ gap: 400 });
  const [player] = sim.racers;
  player.item = 'spin';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  assert.equal(sim.projectiles.filter((p) => p.type === 'spin').length, 1);
  run(sim, 6);
  assert.equal(sim.projectiles.filter((p) => p.type === 'spin').length, 0, 'si consuma');
  assert.ok(sim.events.some((event) => event.type === 'pop' && event.source === 'spin'), 'e finisce con uno scoppio');
});

test('a shield swallows the bomb blast, and the bomb goes off all the same', () => {
  const sim = ready({ gap: 9 });
  const [player, chaser] = sim.racers;
  chaser.shield = 6;
  player.item = 'bomb';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  run(sim, 5);
  assert.equal(chaser.damage, 0, 'lo scudo para');
  assert.equal(chaser.shield, 0, 'ma si consuma');
  assert.ok(sim.events.some((event) => event.type === 'pop' && event.source === 'bomb'));
});

test('the parachute does not fly through the bridges of Rome: under a deck the car dips and climbs back after', () => {
  const track = getTrack('roma');
  const race = new RaceSimulation({ players: 1, opponents: 0, seed: 11, difficulty: 'normal', track });
  race.state = 'racing'; race.countdown = 0;
  race.boxes = []; race.boosts = []; race.ramps = [];
  const [car] = race.racers;
  // Already up under the parachute, 30 m before the first gallery (the lower road at 402 m, the deck 8.5 m above).
  car.progress = 365; car.lane = 0; car.speed = 24;
  car._airborne = true; car.y = 5; car._verticalVelocity = 0; car.chute = 'fly'; car.parachute = 5;
  let under = 0, after = 0;
  for (let i = 0; i < 60 * 3; i += 1) {
    race.update(1 / 60, [{ steer: 0 }]);
    const room = track.headroom(car.progress);
    if (room < Infinity) {
      under += 1;
      assert.ok(car.y + 4.6 + 1 <= room + 1e-9, `a ${car.progress.toFixed(0)} m la vela tocca il ponte: auto a ${car.y.toFixed(2)} m, ponte a ${room.toFixed(2)} m`);
    } else if (under) after = Math.max(after, car.y);
  }
  assert.ok(under > 10, 'passa davvero sotto il ponte');
  assert.ok(after > 4, `dopo il ponte risale: ${after.toFixed(1)} m`);
});

test('the storm cloud slows every other car at once for five seconds; a shield soaks it up', async () => {
  const { STORM_TIME, pickItem } = await import('../src/race.js');
  const sim = new RaceSimulation({ players: 1, opponents: 3, seed: 9, difficulty: 'normal' });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = []; sim.obstacles = []; sim.critters = [];
  sim.racers.forEach((racer, i) => { racer.progress = 200 + i * 15; racer.lane = (i % 3 - 1) * 3; racer.speed = 24; });
  const [player, shielded, ...others] = sim.racers;
  shielded.shield = 6;
  const before = others.map((racer) => racer.speed);
  player.item = 'storm';
  sim.update(1 / 60, [{ steer: 0, useItem: true }]);
  assert.ok(others.every((racer, i) => racer.storm > 0 && racer.speed < before[i] * 0.7), 'tutti gli altri rallentano di colpo');
  assert.equal(player.storm, 0, 'chi la usa no');
  assert.ok(shielded.storm === 0 && shielded.shield === 0, 'lo scudo la assorbe');
  run(sim, 1, [{ steer: 0 }]);
  assert.ok(others.every((racer) => racer.speed < player.speed), 'sotto il temporale si va più piano');
  run(sim, STORM_TIME, [{ steer: 0 }]);
  assert.ok(others.every((racer) => racer.storm === 0), 'dopo cinque secondi è finito');
  // Super rare: half a percent of the crates, at the very end of the table.
  assert.equal(pickItem(0.996), 'storm');
  assert.equal(pickItem(0.994), 'glider');
});
