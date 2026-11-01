// Records the seeded races of tests/race-replay.test.js from the source tree given as argv[2] (default: this one),
// so the test can check that drawing-only work never moves a racer. Usage: node scripts/record-race-replay.mjs > tests/fixtures/race-replay.json
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const root = resolve(process.argv[2] || '.');
const { RaceSimulation } = await import(pathToFileURL(`${root}/src/race.js`));
const { CAR_PRESETS, SAMPLE_CARS } = await import(pathToFileURL(`${root}/src/cars.js`));
const { getTrack } = await import(pathToFileURL(`${root}/src/track.js`));
const CASES = [
  { track: 'arca', seed: 11, players: 1, car: 'squalo' },
  { track: 'crete', seed: 42, players: 2, car: 'moto' },
  { track: 'varese', seed: 7, players: 1, car: 'acrobata' },
  { track: 'aprica', seed: 2026, players: 2, car: 'maggiolino' },
];
const round = (v) => Math.round(v * 1e6) / 1e6;
const out = CASES.map((c) => {
  const cars = [...CAR_PRESETS, ...SAMPLE_CARS];
  const me = cars.find((x) => x.id === c.car);
  const race = new RaceSimulation({ players: c.players, cars: Array.from({ length: c.players }, () => me), aiCars: [...CAR_PRESETS, ...SAMPLE_CARS], seed: c.seed, track: getTrack(c.track), opponents: 4, difficulty: 'normal' });
  for (let i = 0; i < 6000 && race.state !== 'finished'; i++) {
    const input = (p) => ({ steer: Math.sin(i / (17 + p * 5)), useItem: i % (40 + p) === 0, brake: i % 97 < 4 });
    race.update(1 / 30, Array.from({ length: c.players }, (_, p) => input(p)));
  }
  return { ...c, time: round(race.time), racers: race.racers.map((r) => ({ id: r.id, rank: r.rank, finished: r.finished, finishTime: r.finishTime === null ? null : round(r.finishTime), progress: round(r.progress), lane: round(r.lane) })) };
});
console.log(JSON.stringify(out, null, 2));
