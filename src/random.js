/**
 * The one random number generator of the game. Every random choice — the race, the opponents, a car's quirks,
 * the trees and the mountains of a circuit — comes from this same linear congruential generator, so a seed
 * always rebuilds the same world and the same race.
 *
 * Do not change the constants. They are baked into recorded test fixtures (the car catalogue geometry, the
 * deterministic race seeds): a different multiplier reshuffles every field of opponents and every scenery.
 * No three.js, no DOM, so this runs in the Node tests too.
 */

/** Advances a 32-bit state. */
export const nextSeed = (state) => (Math.imul(state, 1664525) + 1013904223) >>> 0;

/** A generator of numbers in [0, 1) from a numeric seed. */
export function seeded(seed) {
  let state = seed >>> 0;
  return () => { state = nextSeed(state); return state / 4294967296; };
}

/** The same generator seeded from a string (FNV-1a), for anything keyed by an id or a name. */
export function seededFromText(text) {
  let state = 2166136261;
  for (const char of String(text)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return seeded(state);
}

/** Fisher-Yates on its own stream, so shuffling never disturbs the gameplay generator. */
export function shuffled(list, seed) {
  const copy = [...list];
  let state = ((Number(seed) >>> 0) ^ 0x9e3779b9) >>> 0 || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    state = nextSeed(state);
    const j = Math.floor((state / 4294967296) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
