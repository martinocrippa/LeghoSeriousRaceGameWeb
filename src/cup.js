/** Pure helpers for the "Coppa": a short series of races with cumulative points. No DOM, no three.js. */
import { addTimes } from './gaps.js';
import { seeded } from './random.js';

export const CUP_POINTS = [10, 7, 5, 3, 2, 1];
export const CUP_RACES = 5;

export const pointsForRank = (rank) => CUP_POINTS[rank - 1] ?? 0;

/**
 * Draws `count` different circuits at random, in the order they will be raced. The children asked for it: a cup is
 * five circuits as a surprise, nobody picks them. The same seed always draws the same ones.
 */
export function cupTrackIds(allIds, seed, count = CUP_RACES) {
  const random = seeded(seed), pool = [...allIds], drawn = [];
  // The first numbers of the generator barely move between neighbouring seeds (two clicks a second apart): skipped.
  random(); random();
  while (drawn.length < count && pool.length) drawn.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return drawn;
}

export function createCup({ trackIds, seed = 1 } = {}) {
  return { trackIds: [...trackIds], index: 0, seed: (Number(seed) >>> 0) || 1, standings: [], results: [] };
}

/** One reproducible race seed per stage; the cup seed itself keeps the field of opponents stable. */
export const raceSeed = (cup, index) => ((cup.seed + index * 1000003) >>> 0) || 1;

/**
 * Returns a new cup with the stage recorded; racers are merged by their stable ids (p1, p2, ai1…). `times` (from
 * `raceTimes` in gaps.js) adds each racer's time to its total, which the standings show as a gap.
 */
export function recordRaceResult(cup, racers, times = null) {
  const standings = cup.standings.map((entry) => ({ ...entry, placements: [...entry.placements], total: entry.total ? { ...entry.total } : null }));
  for (const racer of racers) {
    let entry = standings.find((candidate) => candidate.id === racer.id);
    if (!entry) {
      entry = { id: racer.id, name: racer.name, spec: racer.spec, isPlayer: !!racer.isPlayer, playerIndex: racer.playerIndex ?? -1, points: 0, placements: [], total: null };
      standings.push(entry);
    }
    entry.points += pointsForRank(racer.rank);
    entry.placements.push(racer.rank);
    entry.total = addTimes(entry.total, times?.get(racer.id));
  }
  const results = [...cup.results, racers.map((racer) => ({ id: racer.id, rank: racer.rank }))];
  return { ...cup, index: cup.index + 1, standings, results };
}

/** Points first, then more first places, second places… and finally the id, so ties are stable. */
export function sortStandings(standings) {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    for (let place = 1; place <= CUP_POINTS.length; place++) {
      const diff = b.placements.filter((rank) => rank === place).length - a.placements.filter((rank) => rank === place).length;
      if (diff) return diff;
    }
    return a.id.localeCompare(b.id);
  });
}

export const isCupFinished = (cup) => cup.index >= cup.trackIds.length;
