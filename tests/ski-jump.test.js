import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrack } from '../src/track.js';
import { RaceSimulation, BASE_SPEED } from '../src/race.js';

const bernina = getTrack('bernina');
const JUMP = bernina.ramps.find((r) => r.launch);

test('the Bernina ski jump is a real take-off, and every level lands back on the road', () => {
  assert.ok(JUMP, 'il trampolino deve essere una rampa con launch');
  const flights = {};
  for (const difficulty of Object.keys(BASE_SPEED)) {
    const sim = new RaceSimulation({ players: 1, difficulty, track: bernina, opponents: 0 });
    sim.state = 'racing'; sim.countdown = 0;
    const me = sim.racers[0];
    me.progress = JUMP.distance - 30; me.lane = 0; me.speed = BASE_SPEED[difficulty];

    let peak = 0, airborne = 0;
    const takeOff = JUMP.distance + JUMP.length;
    for (let i = 0; i < 60 * 8 && (me.progress < takeOff || me.y > 0); i += 1) {
      sim.update(1 / 60, [{ steer: 0 }]);
      peak = Math.max(peak, me.y);
      if (me.y > 0.05) airborne += 1 / 60;
    }
    flights[difficulty] = { peak, airborne, landedAt: me.progress };

    assert.equal(me.y, 0, `${difficulty}: deve riatterrare`);
    assert.ok(peak > JUMP.height * 2, `${difficulty}: il volo deve superare l'altezza del dente, arrivato a ${peak.toFixed(1)} m`);
    assert.ok(airborne > 1, `${difficulty}: deve restare in aria più di un secondo, è stato ${airborne.toFixed(2)} s`);
    // The car follows the road while it flies, so landing "on the road" means its lane never leaves it.
    assert.ok(Math.abs(me.lane) <= bernina.roadWidth / 2, `${difficulty}: atterra in pista`);
  }
  // Faster levels fly further; that is the point of scaling the launch with speed.
  assert.ok(flights.crazy.landedAt > flights.easy.landedAt, 'ai livelli veloci il salto è più lungo');
});

test('an ordinary ramp is unchanged by the ski jump', () => {
  const plain = bernina.ramps.find((r) => !r.launch);
  const sim = new RaceSimulation({ players: 1, difficulty: 'normal', track: bernina, opponents: 0 });
  sim.state = 'racing'; sim.countdown = 0;
  const me = sim.racers[0];
  me.progress = plain.distance - 20; me.lane = 0; me.speed = BASE_SPEED.normal;
  let peak = 0;
  for (let i = 0; i < 60 * 5; i += 1) { sim.update(1 / 60, [{ steer: 0 }]); peak = Math.max(peak, me.y); }
  // 8.8 m/s at 22 m/s² gives a hop of about 1.8 m over the lip: the classic ramp, untouched.
  assert.ok(peak > plain.height && peak < plain.height + 3, `salto normale: ${peak.toFixed(2)} m`);
});

/**
 * Touching down. "A slight bounce when you land from the jumps, and from the super jumps a slightly bigger one."
 * The bounce is a real hop — the car leaves the road again — so it is measured as a second time in the air, and
 * the ski jump's has to be higher than an ordinary ramp's for the same reason it looks better: you fell further.
 */
function touchdown(track, ramp, difficulty = 'normal') {
  const sim = new RaceSimulation({ players: 1, difficulty, track, opponents: 0, seed: 3 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.boosts = [];
  const me = sim.racers[0];
  me.progress = ramp.distance - 30; me.lane = 0; me.speed = BASE_SPEED[difficulty];
  const hops = [];
  let flying = false, peak = 0;
  for (let i = 0; i < 60 * 12; i += 1) {
    sim.update(1 / 60, [{ steer: 0 }]);
    if (me.y > 0) { flying = true; peak = Math.max(peak, me.y); }
    for (const event of sim.drainEvents()) {
      if (event.type !== 'land') continue;
      if (event.bounce > 0) hops.push({ bounce: event.bounce, peak });
      peak = 0;
      if (event.bounce === 0 && hops.length) return { hops, flew: flying };
    }
  }
  return { hops, flew: flying };
}

test('landing bounces: a small hop off an ordinary ramp, a wider one off the ski jump', () => {
  const plain = bernina.ramps.find((r) => !r.launch);
  assert.ok(plain, 'serve una rampa normale per il confronto');
  const ordinary = touchdown(bernina, plain);
  const launched = touchdown(bernina, JUMP);
  assert.ok(ordinary.hops.length >= 1, 'anche da una rampa normale la macchina rimbalza');
  assert.ok(launched.hops.length >= 1, 'e dal trampolino pure');
  // Never a pogo stick: the car settles after a couple of hops instead of jittering along the road.
  for (const landing of [ordinary, launched]) assert.ok(landing.hops.length <= 2, `al massimo due rimbalzi, non ${landing.hops.length}`);
  assert.ok(launched.hops[0].peak > ordinary.hops[0].peak, `il rimbalzo del trampolino è più ampio: ${launched.hops[0].peak.toFixed(2)} contro ${ordinary.hops[0].peak.toFixed(2)}`);
});
