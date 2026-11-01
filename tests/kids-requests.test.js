import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, MAX_DAMAGE } from '../src/race.js';
import { getTrack, weatherIndex } from '../src/track.js';
import { OBSTACLE_KINDS, OBSTACLE_REGROW, normalizeObstacle } from '../src/obstacles.js';
import { ATTACK_TIME, checkCritters, critterPose, normalizeCritter } from '../src/critters.js';

/**
 * The children's second list: bales that squash, animals that bite back, a rainbow crate and props that blow up.
 * Each test sets the scene by hand on an empty road, so it measures exactly the one rule it is about.
 */
function ready({ players = 2 } = {}) {
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
const solid = (kind, distance, lane = 0, id = kind) => ({ ...normalizeObstacle({ id, kind, distance, lane }), down: 0, squashed: false });
/** An animal parked in the middle of the road: so slow that it is still there when the car arrives. */
const standing = (kind, distance, id = kind) => {
  const critter = normalizeCritter({ id, kind, distance, speed: 0.01 });
  return { ...critter, offset: critter.edge / critter.speed, attack: null, calm: 0 };
};

test('a rolling bale flattens the car for a second, does no damage, and rolls on', () => {
  const sim = ready();
  const [thrower, victim] = sim.racers;
  // The bale rolls at 30 m/s against the victim's 22: start it close enough to be caught within the bale's life.
  victim.progress = 214; victim.lane = 0;
  thrower.item = 'bales';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  let flattened = false;
  for (let i = 0; i < 120 && !flattened; i += 1) { sim.update(1 / 60, still(2)); flattened = victim.squashed > 0; }
  assert.ok(flattened, 'la balla deve schiacciare l’auto che trova');
  assert.equal(victim.damage, 0, 'una balla non rompe pezzi');
  assert.ok(victim.speed < 1, 'schiacciata, l’auto si ferma');
  assert.ok(sim.projectiles.some((p) => p.type === 'bale'), 'la balla continua a rotolare');
  assert.ok(sim.events.some((e) => e.type === 'squashed' && e.racerId === victim.id));
  run(sim, 0.9);
  assert.ok(victim.squashed > 0 || victim.speed < 3, 'per circa un secondo resta a terra');
  run(sim, 0.6);
  assert.equal(victim.squashed, 0, 'dopo un secondo si rialza');
  assert.ok(victim.speed > 3, 'e riparte');
});

test('a shield stops the bale instead of letting it flatten the car', () => {
  const sim = ready();
  const [thrower, victim] = sim.racers;
  victim.progress = 214; victim.shield = 6;
  thrower.item = 'bales';
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  run(sim, 2);
  assert.equal(victim.squashed, 0);
  assert.equal(victim.shield, 0, 'lo scudo se ne va');
});

test('an animal you run into climbs on the car and keeps it there for a second and a half', () => {
  const sim = ready({ players: 1 });
  const [car] = sim.racers;
  car.progress = 240; car.lane = 0;
  sim.critters = [standing('turtle', 250)];
  let attackedAt = null;
  for (let i = 0; i < 120 && attackedAt === null; i += 1) { sim.update(1 / 60, still(1)); if (car.attacked > 0) attackedAt = sim.time; }
  assert.ok(attackedAt !== null, 'la tartaruga deve saltare addosso');
  assert.equal(car.damage, 0, 'un animale non rompe l’auto');
  assert.equal(sim.critters[0].attack.racerId, car.id);
  const stoppedAt = car.progress;
  run(sim, ATTACK_TIME - 0.1);
  assert.ok(car.progress - stoppedAt < 0.5, 'per 1,5 secondi l’auto non va avanti');
  run(sim, 0.4);
  assert.equal(car.attacked, 0);
  assert.equal(sim.critters[0].attack, null, 'poi l’animale scende');
  run(sim, 1);
  assert.ok(car.speed > 5, 'e si riparte');
});

test('a shield keeps the animal off, and a rainbow car scares it away', () => {
  for (const guard of ['shield', 'rainbow']) {
    const sim = ready({ players: 1 });
    const [car] = sim.racers;
    car.progress = 240; car[guard] = 6;
    sim.critters = [standing('boar', 250)];
    run(sim, 1);
    assert.equal(car.attacked, 0, `${guard}: niente attacco`);
    assert.ok(sim.critters[0].calm > 0, `${guard}: il cinghiale si calma`);
  }
});

test('critters walk verge to verge and back, and their pose depends only on the clock', () => {
  const critter = normalizeCritter({ id: 't', kind: 'turtle', distance: 10 }, 0, 14);
  assert.equal(critterPose(critter, 0).lane, -critter.edge);
  const walk = (2 * critter.edge) / critter.speed;
  assert.ok(Math.abs(critterPose(critter, walk / 2).lane) < 1e-9, 'a metà strada è al centro');
  assert.equal(critterPose(critter, walk + 0.1).walking, false, 'sull’altro bordo si ferma');
  assert.deepEqual(critterPose(critter, 3.3), critterPose(critter, 3.3 + 2 * (walk + critter.pause)), 'è periodica');
  for (const id of ['increa', 'crete']) assert.ok(getTrack(id).critters.length >= 4, `${id}: gli animali sono sulla pista`);
  assert.deepEqual(getTrack('regnano').critters.map((c) => c.kind), ['donkey'], 'a Regnano c’è l’asino');
  assert.ok(getTrack('villasanta').critters.length >= 3 && getTrack('villasanta').critters.every((c) => c.kind === 'squirrel'), 'a Villasanta gli scoiattoli');
  const problems = [];
  checkCritters([normalizeCritter({ id: 'x', kind: 'sheep', distance: 110 })], { length: 500, ramps: [{ id: 'r', distance: 100 }] }, (m) => problems.push(m));
  assert.equal(problems.length, 1, 'un animale nell’atterraggio di una rampa viene rifiutato');
});

test('Rome: cobbles all round, two crossings over and under, rats, boars and seagulls, and the night on the last lap', () => {
  const roma = getTrack('roma');
  assert.ok(roma.surfaces.length === 1 && roma.surfaces[0].kind === 'cobbles' && roma.surfaces[0].to === roma.length, 'tutta sui sanpietrini');
  assert.equal(roma.elevationBumps.filter((bump) => bump.bridge).length, 2, 'un otto con un altro cerchio: due incroci, due ponti');
  assert.ok(roma.elevationBumps.filter((bump) => !bump.bridge).length >= 3, 'i saliscendi dei colli');
  assert.deepEqual([...new Set(roma.critters.map((c) => c.kind))].sort(), ['boar', 'gull', 'rat'], 'topi, cinghiali e gabbiani');
  for (const kind of ['colosseo', 'sanpietro', 'mose', 'concerto']) assert.ok(roma.landmarks.some((l) => l.kind === kind), kind);
  // Sunset on the first lap, night on the last, however many laps the race has.
  const names = (laps) => Array.from({ length: laps }, (_, i) => roma.theme.weather[weatherIndex(roma.theme, i + 1, laps)].name);
  assert.deepEqual(names(3), ['TRAMONTO', 'SERA', 'NOTTE']);
  assert.deepEqual(names(2), ['TRAMONTO', 'NOTTE']);
  assert.equal(names(5).at(-1), 'NOTTE');
  assert.equal(roma.theme.weather[0].stars, 0, 'al tramonto niente stelle');
  // The other weather circuits keep cycling once per lap.
  assert.deepEqual([1, 2, 3].map((lap) => weatherIndex(getTrack('arca').theme, lap, 4)), [0, 1, 0]);
});

test('the rainbow: faster, untouchable, and whoever it touches blows up', () => {
  const sim = ready();
  const [star, other] = sim.racers;
  star.item = 'rainbow';
  star.stuck = 1;
  sim.update(1 / 60, [{ steer: 0, useItem: true }, { steer: 0 }]);
  assert.ok(star.rainbow > 0);
  assert.equal(star.stuck, 0, 'l’arcobaleno scioglie la gelatina');
  run(sim, 2);
  assert.ok(star.speed > sim.baseSpeed * 1.2, 'va più veloce del normale');
  assert.equal(sim._hit(star, 'rocket', other.id), true);
  assert.equal(star.damage, 0, 'un razzo non gli fa niente');
  other.progress = star.progress + 1; other.lane = star.lane; other.immunity = 0;
  sim.update(1 / 60, still(2));
  assert.ok(other.wrecked > 0, 'l’auto toccata esplode');
  assert.ok(sim.events.some((e) => e.type === 'hit' && e.source === 'rainbow' && e.damage === MAX_DAMAGE));
});

test('a rainbow car drives through a desk and blows it up instead of bouncing off', () => {
  const sim = ready({ players: 1 });
  const [car] = sim.racers;
  car.progress = 240; car.rainbow = 6; car.speed = 25;
  sim.obstacles = [solid('desk', 250)];
  run(sim, 1);
  assert.ok(sim.obstacles[0].down > 0, 'il banco salta per aria');
  assert.ok(car.progress > 255, 'e l’auto passa');
  assert.ok(!sim.events.some((e) => e.type === 'bump'));
});

test('a rocket blows up a breakable prop and is spent', () => {
  const sim = ready({ players: 1 });
  const [car] = sim.racers;
  car.progress = 200;
  sim.obstacles = [solid('cone', 225, 0, 'birillo')];
  car.item = 'rocket';
  sim.update(1 / 60, [{ steer: 0, useItem: true }]);
  run(sim, 0.6);
  assert.ok(sim.obstacles[0].down > 0 && !sim.obstacles[0].squashed, 'il birillo esplode');
  assert.equal(sim.projectiles.filter((p) => p.type === 'rocket').length, 0, 'il razzo si consuma');
  assert.ok(sim.events.some((e) => e.type === 'obstacle-break' && e.obstacleId === 'birillo' && e.source === 'rocket'));
});

test('against a bridge column or a roundabout every shot bursts, and the column stays up', () => {
  for (const item of ['rocket', 'bales']) {
    const sim = ready({ players: 1 });
    const [car] = sim.racers;
    car.progress = 200;
    // The column stands in the way of every bale (they spread across the road), the cone hides behind it.
    sim.obstacles = [solid('column', 215, 0, 'colonna'), solid('cone', 235, 0, 'birillo')];
    if (item === 'bales') sim.obstacles.push(solid('island', 215, 3.6, 'isola'), solid('island', 215, -3.6, 'isola-2'));
    car.item = item;
    sim.update(1 / 60, [{ steer: 0, useItem: true }]);
    run(sim, 1);
    assert.ok(sim.obstacles.every((o) => o.down === 0), `${item}: la colonna non si rompe e il birillo dietro resta`);
    assert.equal(sim.projectiles.length, 0, `${item}: il colpo scoppia contro`);
    assert.ok(sim.events.some((e) => e.type === 'pop'), `${item}: e lo si vede scoppiare`);
  }
  assert.equal(OBSTACLE_KINDS.island.breakable, false, 'la rotonda resta dov’è');
});

test('a bale flattens the props it rolls over and keeps going', () => {
  const sim = ready({ players: 1 });
  const [car] = sim.racers;
  car.progress = 200;
  sim.obstacles = [solid('bin', 230, 0, 'bidone')];
  car.item = 'bales';
  sim.update(1 / 60, [{ steer: 0, useItem: true }]);
  run(sim, 1.5);
  assert.ok(sim.obstacles[0].down > 0 && sim.obstacles[0].squashed, 'il bidone è schiacciato, non esploso');
  assert.ok(sim.projectiles.some((p) => p.type === 'bale'), 'la balla prosegue');
});

test('a broken prop is not solid, and grows back later — but never on top of a car', () => {
  const sim = ready({ players: 1 });
  const [car] = sim.racers;
  car.progress = 100;
  sim.obstacles = [solid('barrier', 300, 0, 'transenna')];
  sim._breakObstacle(sim.obstacles[0], { source: 'bomb' });
  car.progress = 290; car.speed = 22;
  run(sim, 1);
  assert.ok(!sim.events.some((e) => e.type === 'bump'), 'mentre è rotta si passa');
  car.progress = 299; car.speed = 0; car.wrecked = 0;
  sim.racers[0].stuck = OBSTACLE_REGROW + 2;
  run(sim, OBSTACLE_REGROW);
  assert.ok(sim.obstacles[0].down > 0, 'non ricresce sotto un’auto ferma');
  sim.racers[0].stuck = 0; car.progress = 100;
  run(sim, 1);
  assert.equal(sim.obstacles[0].down, 0, 'liberato il posto, torna');
  assert.ok(sim.events.some((e) => e.type === 'obstacle-back'));
});

test('a bomb blows up the props around it', () => {
  const sim = ready({ players: 1 });
  const [car] = sim.racers;
  car.progress = 200;
  sim.obstacles = [solid('planter', 197, 1.5, 'fioriera')];
  car.item = 'bomb';
  sim.update(1 / 60, [{ steer: 0, useItem: true }]);
  run(sim, 4);
  assert.ok(sim.obstacles[0].down > 0);
});
