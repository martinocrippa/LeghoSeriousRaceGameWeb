import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RaceSimulation } from '../src/race.js';
import { CAR_PRESETS, SAMPLE_CARS } from '../src/cars.js';
import { getTrack } from '../src/track.js';

/**
 * Four seeded races, first recorded on the code as it was before the lean in bends, the steering front wheels, the
 * rear sliding out and the tyre marks (src/lean.js): those are drawing only, and replayed every racer finished in
 * the same place at the same time. Re-recorded since, on purpose, when the parachute and the hang-glider went into
 * the crates, when the parachute became a jump-or-brake gamble, and when weapons began to bowl the animals over (only
 * the Crete race moves: at 35.7 s an opponent's rocket is spent on a sheep instead of flying on). If a change to the
 * simulation moves them on purpose again, re-record with
 * `node scripts/record-race-replay.mjs > tests/fixtures/race-replay.json` (the recorder repeats the loop below).
 */
const recorded = JSON.parse(readFileSync(new URL('./fixtures/race-replay.json', import.meta.url), 'utf8'));
const round = (v) => Math.round(v * 1e6) / 1e6;

for (const c of recorded) test(`the visual effects leave the race untouched: ${c.track}, seed ${c.seed}, ${c.players} pilot(s)`, () => {
  const me = [...CAR_PRESETS, ...SAMPLE_CARS].find((x) => x.id === c.car);
  const race = new RaceSimulation({ players: c.players, cars: Array.from({ length: c.players }, () => me), aiCars: [...CAR_PRESETS, ...SAMPLE_CARS], seed: c.seed, track: getTrack(c.track), opponents: 4, difficulty: 'normal' });
  for (let i = 0; i < 6000 && race.state !== 'finished'; i++) {
    const input = (p) => ({ steer: Math.sin(i / (17 + p * 5)), useItem: i % (40 + p) === 0, brake: i % 97 < 4 });
    race.update(1 / 30, Array.from({ length: c.players }, (_, p) => input(p)));
  }
  assert.equal(round(race.time), c.time);
  assert.deepEqual(race.racers.map((r) => ({ id: r.id, rank: r.rank, finished: r.finished, finishTime: r.finishTime === null ? null : round(r.finishTime), progress: round(r.progress), lane: round(r.lane) })), c.racers);
});
