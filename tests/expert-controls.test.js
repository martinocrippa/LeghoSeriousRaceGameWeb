import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, hasExpertControls } from '../src/race.js';

function racing(difficulty) {
  const sim = new RaceSimulation({ players: 1, difficulty, opponents: 1 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  sim.racers.forEach((r, i) => { r.progress = 120 + i * 30; r.lane = 0; r.speed = 22; });
  return sim;
}
const run = (sim, input, frames = 30) => { for (let i = 0; i < frames; i += 1) sim.update(1 / 60, [input]); };

test('the expert controls belong to TURBO and FOLLE only', () => {
  assert.equal(hasExpertControls('easy'), false);
  assert.equal(hasExpertControls('normal'), false);
  assert.equal(hasExpertControls('fast'), true);
  assert.equal(hasExpertControls('crazy'), true);
  assert.equal(new RaceSimulation({ difficulty: 'easy' }).expertControls, false);
  assert.equal(new RaceSimulation({ difficulty: 'crazy' }).expertControls, true);
});

test('at the beginner levels the jump and drift keys do nothing at all', () => {
  for (const difficulty of ['easy', 'normal']) {
    const sim = racing(difficulty);
    const player = sim.racers[0];
    run(sim, { steer: 0, jump: true, drift: true });
    assert.equal(player.y, 0, `${difficulty}: l'auto non deve staccarsi da terra`);
    assert.equal(player._airborne, false);
    assert.equal(player.drifting, false);
    assert.ok(!sim.drainEvents().some((e) => e.type === 'jump'), `${difficulty}: nessun salto`);
  }
});

test('from TURBO up the jump lifts the car and comes back down, once per press', () => {
  const sim = racing('fast');
  const player = sim.racers[0];
  sim.update(1 / 60, [{ steer: 0, jump: true }]);
  assert.ok(player._airborne, 'il salto parte subito');
  const events = sim.drainEvents().filter((e) => e.type === 'jump' && e.racerId === player.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].hop, true);

  let peak = 0;
  for (let i = 0; i < 90; i += 1) { sim.update(1 / 60, [{ steer: 0, jump: true }]); peak = Math.max(peak, player.y); }
  assert.ok(peak > 0.5, `il salto deve sollevare l'auto, arrivato a ${peak}`);
  // Holding the key does not turn into a pogo stick: the cooldown limits how often it can fire.
  const hops = sim.drainEvents().filter((e) => e.type === 'jump' && e.hop).length;
  assert.ok(hops <= 2, `troppi salti tenendo premuto: ${hops}`);
  // Let go and give it a moment: a landing now ends in a couple of small bounces, so "back on the road" is a
  // second later than it used to be, and asserting it mid-hop only measured where the clock happened to stop.
  for (let i = 0; i < 60; i += 1) sim.update(1 / 60, [{ steer: 0, jump: false }]);
  assert.equal(player.y, 0, 'e deve tornare a terra');
  assert.equal(player._airborne, false);
});

test('drifting turns harder and costs a little speed', () => {
  const plain = racing('fast'), drifting = racing('fast');
  // Start at cruising speed: from below it, both cars accelerate at the same rate-limited pace and the drift
  // penalty would not show yet. Short enough that neither reaches the edge of the road, where both would clamp.
  for (const sim of [plain, drifting]) sim.racers[0].speed = sim.baseSpeed;
  run(plain, { steer: 1 }, 18);
  run(drifting, { steer: 1, drift: true }, 18);
  assert.ok(Math.abs(drifting.racers[0].lane) > Math.abs(plain.racers[0].lane), 'la derapata deve spostare di più');
  assert.ok(drifting.racers[0].speed < plain.racers[0].speed, 'e deve costare velocità');
  assert.equal(drifting.racers[0].drifting, true);
});

test('the race stays identical given the same seed and the same inputs', () => {
  const a = racing('crazy'), b = racing('crazy');
  for (let i = 0; i < 200; i += 1) {
    const input = { steer: i % 40 < 20 ? 1 : -1, jump: i % 37 === 0, drift: i % 11 < 5 };
    a.update(1 / 60, [input]); b.update(1 / 60, [input]);
  }
  assert.deepEqual(a.racers.map((r) => [r.progress, r.lane, r.y]), b.racers.map((r) => [r.progress, r.lane, r.y]));
});
