/**
 * Per-circuit scenery modules, keyed by `theme.local`. A module may export:
 *  - build(kit, scene, track, layout): places every landmark of the circuit (layout.landmarks, via kit.placeLandmark)
 *    plus extras (water, mountains, crowds…) and registers animations with kit.animate(fn).
 *  - RESERVED: { kind: radius } kept free of trees and bricks around a landmark (default 23 m).
 *  - isReserved(track, layout, x, z): extra zones kept free of trees, bricks and street houses.
 *  - groundHoles(track, layout): [{ x, z, radius }] cut out of the ground plane (a pit lake).
 *  - streetHouses: how many generic street houses line the outer side of the road.
 * Modules without `build` fall back to the legacy builders in local-scenery.js.
 */
import * as como from './como.js';
import * as stadio from './stadio.js';
import * as increa from './increa.js';
import * as villasanta from './villasanta.js';
import * as crete from './crete.js';
import * as brugherio from './brugherio.js';
import * as brianza from './brianza.js';
import * as adda from './adda.js';
import * as bernina from './bernina.js';
import * as arca from './arca.js';
import * as regnano from './regnano.js';
import * as aprica from './aprica.js';
import * as magra from './magra.js';
import * as milano from './milano.js';
import * as alba from './alba.js';
import * as intervallo from './intervallo.js';
import * as varese from './varese.js';

export const SCENERY = { como, stadio, increa, villasanta, crete, brugherio, brianza, adda, bernina, arca, regnano, aprica, magra, milano, alba, intervallo, varese };
