/** Pure helpers for the "Coppa": a short series of races with cumulative points. No DOM, no three.js. */
import { addTimes } from './gaps.js';

export const CUP_POINTS = [10, 7, 5, 3, 2, 1];
export const CUP_RACES = 3;

export const pointsForRank = (rank) => CUP_POINTS[rank - 1] ?? 0;

/** Rotates the circuit list so the chosen one opens the cup, then takes `count` circuits. */
export function cupTrackIds(allIds, firstId, count = CUP_RACES) {
  const start = Math.max(0, allIds.indexOf(firstId));
  const total = Math.min(count, allIds.length);
  return Array.from({ length: total }, (_, i) => allIds[(start + i) % allIds.length]);
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
