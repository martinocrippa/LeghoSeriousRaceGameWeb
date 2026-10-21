import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, MAX_DAMAGE } from '../src/race.js';

function ready() {
  const sim = new RaceSimulation({ players: 2 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  sim.racers.forEach((r, i) => { r.progress = 100 + i * 20; r.lane = i % 2 ? 4 : -4; r.speed = 21.5; });
  return sim;
}
/** Hits the racer directly, ignoring the immunity that normally follows a hit. */
const strike = (sim, racer, source = 'rocket') => { racer.immunity = 0; sim._hit(racer, source, 'other'); };

test('each hit knocks pieces off, and the third sets the car alight', () => {
  const sim = ready();
  const victim = sim.racers[1];
  for (let i = 1; i <= MAX_DAMAGE; i += 1) {
    strike(sim, victim);
    assert.equal(victim.damage, i, `dopo ${i} colpi il danno deve essere ${i}`);
  }
  const events = sim.drainEvents();
  assert.deepEqual(events.filter((e) => e.type === 'hit' && e.racerId === victim.id).map((e) => e.damage), [1, 2, 3]);
  assert.equal(events.filter((e) => e.type === 'wreck' && e.racerId === victim.id).length, 1);
  assert.ok(victim.wrecked > 0, 'e la macchina resta ferma a bruciare');
  assert.equal(victim.speed, 0);
});

test('a wrecked car stops for about a second, then comes back whole and briefly untouchable', () => {
  const sim = ready();
  const victim = sim.racers[1];
  for (let i = 0; i < MAX_DAMAGE; i += 1) strike(sim, victim);
  sim.drainEvents();
  const stopped = victim.progress;

  for (let i = 0; i < 40; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 1 }]);
  assert.ok(victim.wrecked > 0, 'a mezzo secondo sta ancora bruciando');
  assert.ok(victim.progress - stopped < 1, 'e non si muove');
  assert.equal(victim.lane, sim.racers[1].lane, 'nemmeno sterzando');

  for (let i = 0; i < 60; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.equal(victim.wrecked, 0);
  assert.equal(victim.damage, 0, 'torna un’auto nuova');
  assert.ok(victim.immunity > 0, 'con un attimo di immunità, per non essere ricolpita subito');
  assert.ok(sim.drainEvents().some((e) => e.type === 'respawn' && e.racerId === victim.id));
  assert.ok(victim.speed > 0, 'e riparte');
});

test('driving clean puts the bricks back, so three hits across a whole race are not a countdown to fire', () => {
  const sim = ready();
  const victim = sim.racers[1];
  strike(sim, victim);
  strike(sim, victim);
  assert.equal(victim.damage, 2);
  for (let i = 0; i < 13 * 60; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.equal(victim.damage, 1, 'dopo un tratto pulito un pezzo torna al suo posto');
  assert.ok(sim.drainEvents().some((e) => e.type === 'repair' && e.racerId === victim.id));
});

test('a shield takes the hit without costing a piece', () => {
  const sim = ready();
  const victim = sim.racers[1];
  victim.shield = 6;
  strike(sim, victim);
  assert.equal(victim.damage, 0);
  assert.equal(victim.wrecked, 0);
});

test('nobody loses a lap or a place for burning: only the second of standing still', () => {
  const sim = ready();
  const victim = sim.racers[1];
  const lap = victim.lap;
  for (let i = 0; i < MAX_DAMAGE; i += 1) strike(sim, victim);
  for (let i = 0; i < 120; i += 1) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.equal(victim.lap, lap);
  assert.equal(victim.finished, false);
});

test('damage does not break determinism', () => {
  const runs = [0, 1].map(() => {
    const sim = ready();
    for (let i = 0; i < MAX_DAMAGE; i += 1) strike(sim, sim.racers[1]);
    for (let i = 0; i < 200; i += 1) sim.update(1 / 60, [{ steer: i % 20 < 10 ? 1 : -1 }, { steer: 0 }]);
    return sim.racers.map((r) => [r.progress, r.lane, r.damage, r.wrecked]);
  });
  assert.deepEqual(runs[0], runs[1]);
});
