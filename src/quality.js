/**
 * Graphics quality profiles. Pure data and helpers (no three.js, no DOM) so the choice can be tested in Node and
 * applied by the renderer: pixel ratio cap, shadow map size, how often the rear mirror re-renders (never zero: the
 * automatic step down happens in mid-race, and a mirror that vanishes there looks broken),
 * how many dust puffs follow each car, how many wind streaks fly past during a turbo, how many tyre marks stay on
 * the road (one draw call whatever the number: only the memory and the upload grow).
 * "medium" is the default; touch devices start on "low".
 */
export const QUALITY_LEVELS = {
  high: { id: 'high', label: 'SUPER', pixelRatio: 1.5, shadowMap: 2048, mirrorEvery: 1, mirrorSamples: 2, dust: 12, wind: 44, skids: 900 },
  medium: { id: 'medium', label: 'NORMALE', pixelRatio: 1.25, shadowMap: 1024, mirrorEvery: 2, mirrorSamples: 0, dust: 8, wind: 26, skids: 600 },
  low: { id: 'low', label: 'LEGGERA', pixelRatio: 1, shadowMap: 512, mirrorEvery: 4, mirrorSamples: 0, dust: 0, wind: 0, skids: 300 },
};
export const QUALITY_ORDER = ['high', 'medium', 'low'];
export const QUALITY_STORAGE_KEY = 'brick-racers:quality';

export function isQualityLevel(value) {
  return typeof value === 'string' && Object.hasOwn(QUALITY_LEVELS, value);
}

/** Default level for a device: phones and tablets (coarse pointer) start light, everything else on medium. */
export function detectQuality({ coarsePointer = false } = {}) {
  return coarsePointer ? 'low' : 'medium';
}

/** The saved level if valid, otherwise the detected default. `storage` is anything with getItem (localStorage). */
export function loadQuality(storage, hints = {}) {
  try {
    const saved = storage?.getItem?.(QUALITY_STORAGE_KEY);
    if (isQualityLevel(saved)) return saved;
  } catch { /* storage may be disabled */ }
  return detectQuality(hints);
}

export function saveQuality(storage, level) {
  if (!isQualityLevel(level)) return false;
  try { storage?.setItem?.(QUALITY_STORAGE_KEY, level); return true; } catch { return false; }
}

/** The next lighter level, or null when already on the lightest. */
export function lowerQuality(level) {
  const index = QUALITY_ORDER.indexOf(level);
  return index >= 0 && index < QUALITY_ORDER.length - 1 ? QUALITY_ORDER[index + 1] : null;
}

/**
 * Watches frame times during a race and asks for one downgrade when the average over `windowSeconds`
 * stays above `thresholdMs` (20 ms = under 50 fps). `sample(dtSeconds)` returns true once when that happens;
 * `reset()` starts a new window (call it when the race or the level changes).
 */
export function createFrameMonitor({ windowSeconds = 2, thresholdMs = 20, warmupSeconds = 3 } = {}) {
  let elapsed = 0, windowTime = 0, frames = 0, fired = false;
  return {
    sample(dt) {
      if (fired || !(dt > 0)) return false;
      elapsed += dt;
      if (elapsed < warmupSeconds) return false;
      windowTime += dt;
      frames += 1;
      if (windowTime < windowSeconds) return false;
      const averageMs = (windowTime / frames) * 1000;
      windowTime = 0;
      frames = 0;
      if (averageMs > thresholdMs) { fired = true; return true; }
      return false;
    },
    reset() { elapsed = 0; windowTime = 0; frames = 0; fired = false; },
  };
}
