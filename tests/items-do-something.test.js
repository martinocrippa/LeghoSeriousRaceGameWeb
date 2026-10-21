import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, ITEM_KINDS } from '../src/race.js';

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
    const before = { projectiles: sim.projectiles.length, hazards: sim.hazards.length, boost: player.boost, shield: player.shield, gun: player.machinegun, propeller: player.propeller, rainbow: player.rainbow };
    sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
    assert.equal(player.item, null, `${item}: la cassa si svuota`);
    const changed = sim.projectiles.length > before.projectiles
      || sim.hazards.length > before.hazards
      || player.boost > before.boost
      || player.shield > before.shield
      || player.propeller > before.propeller
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
