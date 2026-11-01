/**
 * Animals that cross the road.
 *
 * They used to be scenery: the turtles of Parco Increa plodded across the tarmac on the renderer's own clock and
 * the cars drove straight through them. The children's rule is now that an animal you run into is not pleased
 * about it — it jumps on the car and keeps it there for a second and a half. For that to be fair the simulation
 * has to know where the animal is, so a critter is DATA on the circuit like an obstacle, and its position is a
 * pure function of the race clock: the race and the renderer both ask this module, and what you see is what you hit.
 *
 * Pure: no three.js, no DOM, no randomness (the offsets in the data stagger the animals instead).
 */
import { RAMP_CLEARANCE } from './obstacles.js';

/**
 * `radius` is half its width on the road, `height` how high a car must fly to clear it, `speed` its walking pace
 * across the road (m/s) and `pause` how long it stands on the verge before setting back off.
 */
export const CRITTER_KINDS = Object.freeze({
  turtle: { radius: 0.9, height: 1, speed: 1.1, pause: 3.5 },
  sheep: { radius: 1.1, height: 1.7, speed: 1.6, pause: 2.6 },
  boar: { radius: 1, height: 1.4, speed: 2.6, pause: 1.8 },
  // The Regnano donkey takes its time; the Villasanta squirrels dart across and are gone before you see them.
  donkey: { radius: 1.2, height: 1.9, speed: 1.1, pause: 3.2 },
  squirrel: { radius: 0.6, height: 0.9, speed: 3.6, pause: 1.1 },
  // Rome: the rats scurry across in a hurry, the seagulls waddle and stop to stare at you.
  rat: { radius: 0.6, height: 0.8, speed: 3.2, pause: 1.4 },
  gull: { radius: 0.8, height: 1.3, speed: 1.4, pause: 2.8 },
});
/** How long an angry animal sits on the car it was hit by. Exactly what the children asked for. */
export const ATTACK_TIME = 1.5;
/** An animal that has just attacked, or been dodged by a rainbow car, leaves the next car alone for this long. */
export const CRITTER_CALM = 3;
/** How far beyond the road edge the walk starts and ends, so the animal is seen arriving and not born on the kerb. */
const VERGE = 1.8;

/** Fills in the defaults of a kind. Returns a new object; the caller freezes or copies it. */
export function normalizeCritter(item, index = 0, roadWidth = 14) {
  const kind = CRITTER_KINDS[item?.kind] ? item.kind : 'turtle';
  const preset = CRITTER_KINDS[kind];
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : `critter-${index}`,
    kind,
    distance: item.distance,
    radius: preset.radius,
    height: preset.height,
    speed: Number.isFinite(item.speed) && item.speed > 0 ? item.speed : preset.speed,
    pause: Number.isFinite(item.pause) && item.pause >= 0 ? item.pause : preset.pause,
    // Seconds into its walk at the start of the race: four turtles leaving the verge together look like a drill.
    offset: Number.isFinite(item.offset) ? item.offset : 0,
    edge: roadWidth / 2 + VERGE,
  };
}

/**
 * Where a critter is at `time`: verge to verge, a pause, back again, a pause. `dir` is the way it faces (+1 towards
 * positive lanes), `walking` whether its legs move, and `turn` runs 0→1 through each pause while it swings round.
 */
export function critterPose(critter, time) {
  const walk = (2 * critter.edge) / critter.speed;
  const period = 2 * (walk + critter.pause);
  const t = (((time + critter.offset) % period) + period) % period;
  if (t < walk) return { lane: -critter.edge + critter.speed * t, dir: 1, walking: true, turn: 1 };
  if (t < walk + critter.pause) return { lane: critter.edge, dir: -1, walking: false, turn: critter.pause ? (t - walk) / critter.pause : 1 };
  if (t < 2 * walk + critter.pause) return { lane: critter.edge - critter.speed * (t - walk - critter.pause), dir: -1, walking: true, turn: 1 };
  return { lane: -critter.edge, dir: 1, walking: false, turn: critter.pause ? (t - 2 * walk - critter.pause) / critter.pause : 1 };
}

/**
 * Everything that must hold for a circuit's critters. They walk across the whole road, so they can never wall it
 * off, but they must not wander into a loop or a bridge (the car is not on the road there), nor into the landing
 * of a ramp, where a child comes down with no steering left.
 */
export function checkCritters(critters, { length, ramps = [], sections = [] }, report) {
  const seen = new Set();
  const ahead = (from, to) => ((to - from) % length + length) % length;
  for (const critter of critters) {
    if (seen.has(critter.id)) report(`critter "${critter.id}" is declared twice`);
    seen.add(critter.id);
    if (!Number.isFinite(critter.distance) || critter.distance < 0 || critter.distance >= length) report(`critter "${critter.id}" is off the circuit`);
    for (const section of sections) {
      const from = section.from, to = section.from + (section.span ?? 0);
      if (critter.distance > from - 10 && critter.distance < to + 10) report(`critter "${critter.id}" walks into section "${section.id}"`);
    }
    for (const ramp of ramps) {
      if (ahead(ramp.distance, critter.distance) <= RAMP_CLEARANCE || ahead(critter.distance, ramp.distance) <= 4) report(`critter "${critter.id}" walks into the run of ramp "${ramp.id}"`);
    }
  }
}
