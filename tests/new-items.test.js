import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, pickItem, ITEM_KINDS } from '../src/race.js';

function ready() {
  const sim = new RaceSimulation({ players: 2 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  sim.racers.forEach((r, i) => { r.progress = 100 + i * 20; r.lane = 0; r.speed = 21.5; });
  return sim;
}

test('the crate table covers exactly the seventeen kinds and every number between 0 and 1', () => {
  assert.deepEqual([...ITEM_KINDS], ['boost', 'rocket', 'shield', 'bomb', 'machinegun', 'jelly', 'oil', 'rockets3', 'fountain', 'spin', 'gelato', 'bales', 'propeller', 'rainbow', 'parachute', 'glider', 'storm']);
  // The first five keep their numbers: a seed that opened a turbo, a rocket… before still opens the same crate.
  assert.equal(pickItem(0.17), 'boost');
  assert.equal(pickItem(0.55), 'machinegun');
  const seen = new Set();
  for (let i = 0; i < 1000; i += 1) {
    const item = pickItem(i / 1000);
    assert.ok(ITEM_KINDS.includes(item), `${i / 1000} ha dato ${item}`);
    seen.add(item);
  }
  assert.equal(seen.size, ITEM_KINDS.length, 'ogni bonus deve poter uscire');
  assert.ok(ITEM_KINDS.includes(pickItem(0.999999)));
});

test('three rockets leave one after the other, not in a heap', () => {
  const sim = ready();
  const [shooter, target] = sim.racers;
  shooter.item = 'rockets3';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  assert.equal(sim.projectiles.filter((p) => p.type === 'rocket').length, 1, 'il primo parte subito');
  // Keep the target well out of range so the rockets fly instead of exploding on it.
  target.progress = shooter.progress - 300;
  for (let i = 0; i < 60; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.equal(sim.racers[0]._salvo.left, 0, 'tutti e tre sono partiti');
  assert.equal(shooter.item, null);
});

test('the catherine wheel sweeps the whole road instead of chasing anybody', () => {
  const sim = ready();
  const shooter = sim.racers[0];
  shooter.item = 'spin';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  const wheel = sim.projectiles.find((p) => p.type === 'spin');
  assert.ok(wheel, 'la girandola deve partire');
  // Clear the road ahead: otherwise it hits the other car within half a second and never shows its sweep.
  sim.racers[1].progress = shooter.progress - 400;
  assert.equal(wheel.targetId, null, 'non insegue nessuno');
  let lowest = Infinity, highest = -Infinity;
  for (let i = 0; i < 90 && wheel.ttl > 0; i += 1) {
    sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
    lowest = Math.min(lowest, wheel.lane); highest = Math.max(highest, wheel.lane);
  }
  assert.ok(highest - lowest > 6, `deve attraversare la strada: da ${lowest.toFixed(1)} a ${highest.toFixed(1)}`);
});

test('the fountain slows whoever drives through it, and a shield walks through untouched', () => {
  for (const shielded of [false, true]) {
    const sim = ready();
    const [shooter, victim] = sim.racers;
    shooter.item = 'fountain';
    sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
    const fountain = sim.hazards.find((h) => h.type === 'fountain');
    assert.ok(fountain, 'la fontana resta sulla strada');
    // Approaching from behind, so the car drives into the sparks after they have had time to catch.
    victim.lane = fountain.lane;
    victim.progress = fountain.distance - 20;
    if (shielded) victim.shield = 6;
    for (let i = 0; i < 90 && victim.slowed <= 0; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
    assert.equal(victim.slowed > 0, !shielded, shielded ? 'lo scudo protegge' : 'senza scudo si rallenta');
    if (!shielded) assert.equal(victim.stun, 0, 'ma non è un colpo: non fa danni');
    if (shielded) assert.equal(victim.shield > 0, true, 'e lo scudo non si consuma per due scintille');
  }
});

test('the new bonuses do not break determinism', () => {
  const runs = [0, 1].map(() => {
    const sim = new RaceSimulation({ players: 1, difficulty: 'normal', seed: 4242 });
    for (let i = 0; i < 60 * 40 && sim.state !== 'finished'; i += 1) sim.update(1 / 60, [{ steer: i % 30 < 15 ? 1 : -1, useItem: i % 97 === 0 }]);
    return sim.racers.map((r) => [r.progress, r.lane, r.damage]);
  });
  assert.deepEqual(runs[0], runs[1]);
});
