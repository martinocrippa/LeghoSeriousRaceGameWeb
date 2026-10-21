/**
 * Who sails on the lake, and how tall they stand. The children noticed the boats climbing over the iron bridges instead of
 * passing under them: the bridges arched only 2.4 m over the water while a "battello" carries its funnel 5.4 m up.
 * The routes and the air draughts live here, free of three.js, so a Node test can check every crossing for real.
 */

/** Straight out-and-back crossings. `air` is how far the tallest part of the boat stands above the waterline. */
export const BOAT_ROUTES = Object.freeze([
  { kind: 'battello', air: 5.4, from: [-10.9, 14.3], to: [-90, 118.5], speed: 6.5, phase: 0.1 },
  { kind: 'battello', air: 5.4, from: [8, 16], to: [56.5, 113], speed: 6, phase: 0.6 },
  { kind: 'battello', air: 5.4, from: [2.7, -17.8], to: [20.3, -132.5], speed: 6.5, phase: 0.35 },
  { kind: 'traghetto', air: 3.4, from: [-16, -8], to: [18, -6], speed: 3.6, phase: 0.2 },
  { kind: 'traghetto', air: 3.4, from: [-8, 40], to: [-45.5, 40.5], speed: 3.4, phase: 0.75 },
]);

/** A moored sailboat's mast tops out here; anchoring one under a low part of a bridge would spear the deck. */
export const SAIL_AIR = 5.2;

const SAMPLES = 160;

/**
 * The smallest gap between a bridge deck and a boat of height `air` anywhere along the segment from→to, considering
 * only the stretches that actually pass beneath a bridge. Infinity when the route never goes under one, so a route
 * clear of the water crossings is trivially fine. `halfWidth` covers the beam of the boat.
 */
export function bridgeClearance(track, from, to, air, halfWidth = 2.5) {
  let worst = Infinity;
  for (const section of track.sections || []) {
    if (section.kind !== 'bridge') continue;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const u = i / SAMPLES;
      const deck = section.pose(u, 0);
      // Distance from the deck point to the boat's straight route, in plan.
      const dx = to[0] - from[0], dz = to[1] - from[1];
      const lengthSquared = dx * dx + dz * dz;
      const t = lengthSquared > 0
        ? Math.max(0, Math.min(1, ((deck.x - from[0]) * dx + (deck.z - from[1]) * dz) / lengthSquared))
        : 0;
      const nearestX = from[0] + dx * t, nearestZ = from[1] + dz * t;
      const away = Math.hypot(deck.x - nearestX, deck.z - nearestZ);
      if (away > halfWidth + section.width / 2) continue;
      worst = Math.min(worst, deck.y - air);
    }
  }
  return worst;
}
