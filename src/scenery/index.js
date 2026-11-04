/**
 * Per-circuit scenery modules, keyed by `theme.local`. A module may export:
 *  - build(kit, scene, track, layout): places every landmark of the circuit (layout.landmarks, via kit.placeLandmark)
 *    plus extras (water, mountains, crowds…) and registers animations with kit.animate(fn).
 *  - RESERVED: { kind: radius } kept free of trees and bricks around a landmark (default 23 m).
 *  - isReserved(track, layout, x, z): extra zones kept free of trees, bricks and street houses.
 *  - groundHoles(track, layout): [{ x, z, radius }] cut out of the ground plane (a pit lake).
 *  - streetHouses: how many generic street houses line the outer side of the road.
 * Modules without `build` fall back to the legacy builders in local-scenery.js.
 *
 * They are loaded on demand: together they are about a third of the game's code, and a race needs one. The browser
 * calls `await loadScenery(id)` before handing a track to the renderer (main.js); Node (the tests, the RetroPie
 * export) imports ./all.js, which registers every module at once. A new scenery goes in LOADERS and in all.js.
 */
const LOADERS = {
  como: () => import('./como.js'),
  stadio: () => import('./stadio.js'),
  increa: () => import('./increa.js'),
  villasanta: () => import('./villasanta.js'),
  crete: () => import('./crete.js'),
  brugherio: () => import('./brugherio.js'),
  brianza: () => import('./brianza.js'),
  adda: () => import('./adda.js'),
  bernina: () => import('./bernina.js'),
  arca: () => import('./arca.js'),
  regnano: () => import('./regnano.js'),
  aprica: () => import('./aprica.js'),
  magra: () => import('./magra.js'),
  milano: () => import('./milano.js'),
  alba: () => import('./alba.js'),
  intervallo: () => import('./intervallo.js'),
  varese: () => import('./varese.js'),
  roma: () => import('./roma.js'),
};

/** The modules loaded so far. */
export const SCENERY = {};

export function registerScenery(modules) { Object.assign(SCENERY, modules); }

/** Resolves once the scenery of `id` (a track's `theme.local`) is ready; at once for circuits without a module. */
export function loadScenery(id) {
  if (!id || SCENERY[id] || !LOADERS[id]) return Promise.resolve();
  return LOADERS[id]().then((module) => { SCENERY[id] = module; });
}

/** True when a track with this `theme.local` can be handed to the renderer right now. */
export function isSceneryLoaded(id) { return !id || !LOADERS[id] || !!SCENERY[id]; }

/** The module of `id`, or null for circuits without one. Asking before it is loaded is a bug: it would silently
 * build the legacy landmarks and cache that layout. */
export function sceneryFor(id) {
  if (!id || !LOADERS[id]) return null;
  if (!SCENERY[id]) throw new Error(`scenery "${id}" not loaded: await loadScenery("${id}") first (or import scenery/all.js in Node)`);
  return SCENERY[id];
}

export const SCENERY_IDS = Object.keys(LOADERS);
