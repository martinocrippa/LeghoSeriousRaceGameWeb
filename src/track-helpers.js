/** Small builders shared by every circuit definition (no three.js, no DOM). */
export const boxRow = (prefix, distance, lanes = [-4.2, 0, 4.2]) => lanes.map((lane, i) => ({ id: `box-${prefix}-${i}`, distance, lane }));
export const ramp = (id, distance) => ({ id, distance, length: 12, lane: null, height: 2.1 });
export const pad = (id, distance, lane) => ({ id, distance, lane, length: 8, width: 3.2 });
/**
 * A solid prop standing on the road (see obstacles.js for the kinds and for the rules a circuit has to obey).
 * `createTrack` refuses obstacles that wall the road off, that sit in front of a crate or that land where a ramp
 * throws you, so a bad one is an error at start-up and never a surprise at speed.
 */
export const solid = (id, kind, distance, lane, extra = {}) => ({ id, kind, distance, lane, ...extra });
