/**
 * Things on the road you cannot drive through.
 *
 * Until now every prop was scenery: it was drawn, and the car went straight in one side and out the other — which
 * is exactly what the children reported ("si passa attraverso gli ostacoli"). An obstacle is therefore declared as
 * DATA on the circuit, like a ramp or a crate, so the simulation and the renderer read the same list and what you
 * see is what you hit. Nothing the renderer invents on its own is solid.
 *
 * Pure: no three.js, no DOM (src/track.js compiles it, src/race.js bumps against it, the renderer draws it).
 *
 * The danger with solid props is making a circuit unplayable, and it is a real one: on a bridge the columns stand
 * close together and a row of crates can sit right in front of them, so a careless obstacle turns a lap into a wall
 * with the bonus behind it. `checkObstacles` is what stops that happening — it refuses a circuit whose obstacles do
 * not leave a driveable window, or that park something in front of a crate, a boost pad or a ramp landing.
 */

/** Half the width of a car, in metres: the lane is the centre line of the car, not its edge. */
export const CAR_HALF_WIDTH = 1.1;
/** How wide a window of lane centres must stay free at every point. Less than this and a child cannot thread it. */
export const MIN_GAP = 2.6;
/** A car is about this long, so obstacles this close to each other form one wall as far as passability goes. */
export const CLUSTER = 6;
/** No obstacle may sit in this stretch of road before a crate or a boost pad, or after a ramp. */
export const PICKUP_CLEARANCE = 15;
export const RAMP_CLEARANCE = 30;

/**
 * What an obstacle is made of. `radius` is its half-width on the road, `height` how high you have to fly to clear
 * it, `soft` whether it scatters (a cone, a bale) or stops you dead (a column, a planter). `breakable` is what the
 * children asked for next: a rocket, a burst of the machine gun or a rainbow car blows it to bits, and a rolling
 * hay bale flattens it. Columns too, since the children asked again ("the columns don't break"): a toy column goes
 * up and grows back like the rest. Only the island of a roundabout stays where it is — it is the road.
 */
export const OBSTACLE_KINDS = Object.freeze({
  cone: { radius: 0.5, height: 0.9, soft: true, breakable: true },
  bale: { radius: 1, height: 1.7, soft: true, breakable: true },
  bin: { radius: 0.7, height: 1.5, soft: true, breakable: true },
  barrier: { radius: 1.5, height: 1.1, soft: true, breakable: true },
  desk: { radius: 1.4, height: 1.5, soft: true, breakable: true },
  column: { radius: 0.8, height: 9, soft: false, breakable: true },
  island: { radius: 1.9, height: 1.2, soft: false, breakable: false },
  planter: { radius: 1.2, height: 1.4, soft: false, breakable: true },
  rock: { radius: 1.1, height: 1.6, soft: false, breakable: true },
});
/**
 * A broken obstacle grows back after this long. Without it the second lap would be an empty road and the circuit
 * would lose what makes it that circuit; with it, blowing up the desks is a trick you can play again next time round.
 */
export const OBSTACLE_REGROW = 12;

/** Fills in the defaults of a kind. Returns a new object; the caller freezes or copies it. */
export function normalizeObstacle(item, index = 0) {
  const kind = OBSTACLE_KINDS[item?.kind] ? item.kind : 'cone';
  const preset = OBSTACLE_KINDS[kind];
  return {
    id: typeof item?.id === 'string' && item.id ? item.id : `obstacle-${index}`,
    kind,
    distance: item.distance,
    lane: item.lane,
    radius: Number.isFinite(item.radius) ? item.radius : preset.radius,
    height: Number.isFinite(item.height) ? item.height : preset.height,
    soft: item.soft === undefined ? preset.soft : !!item.soft,
    breakable: item.breakable === undefined ? preset.breakable : !!item.breakable,
    turn: Number.isFinite(item.turn) ? item.turn : 0,
  };
}

/** Lane centres a car cannot occupy because this obstacle is there. */
const blockedSpan = (obstacle) => [obstacle.lane - obstacle.radius - CAR_HALF_WIDTH, obstacle.lane + obstacle.radius + CAR_HALF_WIDTH];

/** The widest run of free lane centres left between `-maxLane` and `maxLane` by a group of obstacles. */
export function widestGap(obstacles, maxLane) {
  const spans = obstacles.map(blockedSpan).sort((a, b) => a[0] - b[0]);
  let widest = 0;
  let edge = -maxLane;
  for (const [from, to] of spans) {
    if (from > edge) widest = Math.max(widest, from - edge);
    edge = Math.max(edge, to);
  }
  return Math.max(widest, maxLane - edge);
}

/**
 * Everything that must hold for a circuit's obstacles, as one pass. `report` is called with a message for each
 * problem; createTrack turns them into an error, the tests read them directly.
 */
export function checkObstacles(obstacles, { length, roadWidth, boxes = [], boosts = [], ramps = [], sections = [] }, report) {
  const maxLane = roadWidth / 2 - CAR_HALF_WIDTH;
  const seen = new Set();
  for (const obstacle of obstacles) {
    if (seen.has(obstacle.id)) report(`obstacle "${obstacle.id}" is declared twice`);
    seen.add(obstacle.id);
    if (!Number.isFinite(obstacle.distance) || obstacle.distance < 0 || obstacle.distance >= length) report(`obstacle "${obstacle.id}" is off the circuit`);
    if (!Number.isFinite(obstacle.lane)) report(`obstacle "${obstacle.id}" needs a lane`);
    if (!(obstacle.radius > 0) || !(obstacle.height > 0)) report(`obstacle "${obstacle.id}" needs a positive radius and height`);
    // An obstacle wholly outside the lanes is scenery pretending to be an obstacle: say so rather than draw it twice.
    if (Math.abs(obstacle.lane) - obstacle.radius > roadWidth / 2) report(`obstacle "${obstacle.id}" is not on the road`);
    for (const section of sections) {
      // Inside a loop or on a shortcut bridge the car leaves the road surface entirely: an obstacle there is never met.
      const from = section.from, to = section.from + (section.span ?? 0);
      if (obstacle.distance > from - 10 && obstacle.distance < to + 10) report(`obstacle "${obstacle.id}" sits in section "${section.id}"`);
    }
  }
  const gap = (a, b) => Math.abs(((a - b + length / 2) % length + length) % length - length / 2);
  // Passability: every cluster of obstacles within a car's length of each other must leave a window to drive through.
  for (const obstacle of obstacles) {
    const cluster = obstacles.filter((other) => gap(other.distance, obstacle.distance) <= CLUSTER);
    const free = widestGap(cluster, maxLane);
    if (free < MIN_GAP) report(`obstacles around ${Math.round(obstacle.distance)} m leave only ${free.toFixed(2)} m to drive through (${MIN_GAP} m needed)`);
  }
  // A crate or a boost pad with something parked in front of it cannot be collected: the bonus is there to be taken.
  const ahead = (from, to) => ((to - from) % length + length) % length;
  for (const pickup of [...boxes, ...boosts]) {
    for (const obstacle of obstacles) {
      const run = ahead(obstacle.distance, pickup.distance);
      const close = run <= PICKUP_CLEARANCE || ahead(pickup.distance, obstacle.distance) <= 3;
      if (close && Math.abs(obstacle.lane - pickup.lane) < obstacle.radius + CAR_HALF_WIDTH + 0.4) {
        report(`obstacle "${obstacle.id}" blocks the way to "${pickup.id}"`);
      }
    }
  }
  // Nothing in the landing zone of a ramp: you come down there with no steering left.
  for (const ramp of ramps) {
    for (const obstacle of obstacles) {
      if (ahead(ramp.distance, obstacle.distance) <= RAMP_CLEARANCE) report(`obstacle "${obstacle.id}" lands in the run of ramp "${ramp.id}"`);
    }
  }
}
