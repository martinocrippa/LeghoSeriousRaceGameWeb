import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation } from '../src/race.js';
import { KNOCK_RISE, KNOCK_SLIDE, KNOCK_TIME, critterPose, knockSide, livePose, normalizeCritter, resumeOffset } from '../src/critters.js';

/**
 * "Le armi non fanno nulla agli animali" — and "se spari gli animali bisogna farli cadere a lato". A shot that
 * reaches an animal bowls it over: it rolls off to the verge, lies there a moment, gets back up and carries on. The
 * shot is spent on it as on a car, and the race says so with a `critter-hit` event. Each test sets the scene by hand
 * on an empty road, like tests/kids-requests.test.js.
 */
function ready({ players = 1 } = {}) {
  const sim = new RaceSimulation({ players, opponents: 0, seed: 5 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = []; sim.obstacles = []; sim.critters = [];
  sim.racers.forEach((racer, i) => { racer.progress = 200 - i * 30; racer.lane = 0; racer.speed = 22; });
  return sim;
}
const still = (n) => Array.from({ length: n }, () => ({ steer: 0 }));
const run = (sim, seconds, inputs = still(sim.playerCount)) => {
  for (let i = 0; i < Math.round(seconds * 60); i += 1) sim.update(1 / 60, inputs);
};
/** An animal parked on the road at `lane`: so slow that it is still there when the shot arrives. */
const standing = (kind, distance, lane = 0, id = kind) => {
  const critter = normalizeCritter({ id, kind, distance, speed: 0.01 });
  return { ...critter, offset: (critter.edge + lane) / critter.speed, attack: null, calm: 0, knocked: 0, knock: null };
};
const fire = (sim, item) => {
  sim.racers[0].item = item;
  sim.update(1 / 60, [{ steer: 0, useItem: true }, ...still(sim.playerCount - 1)]);
};
const roadHalf = (sim) => sim.track.roadWidth / 2;

test('a rocket bowls the animal over to the verge, is spent on it, and the animal gets back up', () => {
  const sim = ready();
  const [shooter] = sim.racers;
  // Just right of centre: the nearer verge is the right one (positive lanes).
  sim.critters = [standing('sheep', 245, 1.5)];
  const sheep = sim.critters[0];
  fire(sim, 'rocket');
  assert.equal(sim.projectiles.filter((p) => p.type === 'rocket').length, 1, 'il razzo parte');
  let hitAt = null;
  for (let i = 0; i < 90 && hitAt === null; i += 1) { sim.update(1 / 60, still(1)); if (sheep.knocked > 0) hitAt = sim.time; }
  assert.ok(hitAt !== null, 'il razzo deve colpire la pecora');
  assert.equal(sim.projectiles.length, 0, 'il razzo si consuma sull’animale, come su un’auto');
  const hit = sim.events.find((e) => e.type === 'critter-hit');
  assert.ok(hit, 'la gara annuncia il colpo');
  assert.deepEqual({ critterId: hit.critterId, kind: hit.kind, source: hit.source, ownerId: hit.ownerId, side: hit.side },
    { critterId: 'sheep', kind: 'sheep', source: 'rocket', ownerId: shooter.id, side: 1 });
  assert.ok(sheep.knocked > KNOCK_TIME - 0.1, 'a terra con il suo timer');
  assert.equal(sheep.knock.side, 1, 'rotola verso il bordo più vicino');
  assert.equal(shooter.damage, 0);

  // Mid-tumble it is on its way out; at the end of the slide it lies on the verge, clear of every lane.
  run(sim, KNOCK_SLIDE / 2);
  const halfway = livePose(sheep, sim.time);
  assert.ok(halfway.knocked && halfway.lane > 1.5 && halfway.lane < sheep.edge, 'mentre rotola si sposta di lato');
  run(sim, KNOCK_SLIDE / 2 + 0.1);
  const down = livePose(sheep, sim.time);
  assert.ok(Math.abs(down.lane - sheep.edge) < 1e-9, 'finisce sul ciglio della strada');
  assert.ok(down.lane > roadHalf(sim), 'fuori dalla carreggiata');
  assert.ok(sheep.knocked > 0, 'e resta giù ancora un momento');

  run(sim, KNOCK_TIME);
  // Meanwhile the shooter drove through where the sheep was standing: it was no longer there to jump on the car.
  assert.ok(shooter.progress > 250, 'l’auto è passata');
  assert.ok(!sim.events.some((e) => e.type === 'attacked'), 'una pecora a terra non salta sulle auto');
  assert.equal(sheep.knocked, 0, 'si rialza');
  assert.equal(sheep.knock, null);
  const up = sim.events.find((e) => e.type === 'critter-up' && e.critterId === 'sheep');
  assert.ok(up && up.side === 1, 'la gara annuncia che si è rialzata');
  // It picks up its walk from the verge where it fell, without jumping back to the middle of the road.
  const pose = critterPose(sheep, up.time);
  assert.ok(Math.abs(pose.lane - sheep.edge) < 1e-6, 'riparte dal bordo in cui è caduta');
  assert.equal(pose.dir, -1, 'girata verso la strada');
});

test('every weapon that reaches an animal knocks it over, and only the bale keeps rolling', () => {
  for (const item of ['rocket', 'gelato', 'machinegun', 'bales', 'bomb', 'jelly', 'oil', 'fountain']) {
    const sim = ready();
    const behind = ['bomb', 'jelly', 'oil'].includes(item);
    // Things dropped behind the car are met by an animal that walks into them; the others fly ahead.
    sim.critters = [standing('boar', behind ? 196 : item === 'fountain' ? 226 : 240, -0.5)];
    const boar = sim.critters[0];
    fire(sim, item);
    let hit = null;
    for (let i = 0; i < 300 && !hit; i += 1) { sim.update(1 / 60, still(1)); hit = sim.events.find((e) => e.type === 'critter-hit'); }
    assert.ok(hit, `${item}: l’animale viene colpito`);
    assert.ok(boar.knocked > 0, `${item}: l’animale è a terra`);
    assert.equal(hit.ownerId, sim.racers[0].id, `${item}: si sa chi l’ha colpito`);
    assert.equal(boar.knock.side, -1, `${item}: rotola verso il bordo più vicino`);
    if (item === 'bales') assert.ok(sim.projectiles.some((p) => p.type === 'bale'), 'la balla continua a rotolare, come sulle auto');
    if (item === 'rocket') assert.equal(sim.projectiles.filter((p) => p.type === 'rocket').length, 0, 'il razzo si consuma');
    // Three scoops leave one after the other: the first is spent on the boar, the others are still on their way.
    if (item === 'gelato') assert.ok(sim.projectiles.filter((p) => p.type === 'gelato').length <= 2, 'la pallina di gelato si consuma');
    if (item === 'jelly') assert.equal(sim.hazards.filter((h) => h.type === 'jelly').length, 0, 'la gelatina si consuma');
  }
});

test('the verge it rolls to is the nearer one, or away from the shot when it is right in the middle', () => {
  assert.equal(knockSide(3, 3.5), 1);
  assert.equal(knockSide(-4, -6), -1, 'il bordo più vicino anche se il colpo arriva da fuori');
  assert.equal(knockSide(0.5, -1), 1, 'al centro: via dal colpo');
  assert.equal(knockSide(-0.5, 1), -1);
  assert.equal(knockSide(0, 0, -1), -1, 'colpita in pieno: continua nella direzione in cui camminava');
  assert.equal(knockSide(0, 0, 1), 1);
});

test('getting back up resumes the walk from the verge, at any time and on either side', () => {
  const critter = normalizeCritter({ id: 't', kind: 'turtle', distance: 10 }, 0, 14);
  for (const time of [0, 7.3, 123.45]) {
    for (const side of [-1, 1]) {
      const shifted = { ...critter, offset: resumeOffset(critter, side, time) };
      const pose = critterPose(shifted, time);
      assert.ok(Math.abs(pose.lane - side * critter.edge) < 1e-6, `t=${time}, lato ${side}: sul bordo`);
      assert.equal(pose.dir, -side, 'guarda verso la strada');
      assert.equal(pose.walking, false, 'prima si ferma un attimo');
      assert.ok(pose.turn < 0.01, 'e poi si gira');
    }
  }
  assert.ok(KNOCK_SLIDE + KNOCK_RISE < KNOCK_TIME, 'rotola, resta giù un momento, poi si rialza');
});

test('an animal already down is not knocked again: the rest of a salvo flies on past it', () => {
  const sim = ready();
  sim.critters = [standing('turtle', 245, 0.5)];
  const turtle = sim.critters[0];
  fire(sim, 'rockets3');
  for (let i = 0; i < 90 && !(turtle.knocked > 0); i += 1) sim.update(1 / 60, still(1));
  run(sim, 0.6);
  assert.equal(sim.events.filter((e) => e.type === 'critter-hit').length, 1, 'un solo colpo la butta giù');
  assert.ok(sim.events.filter((e) => e.type === 'use-item').length === 1 && sim.racers[0]._salvo.left === 0, 'la raffica è partita tutta');
  assert.ok(turtle.knocked > 0);
});
