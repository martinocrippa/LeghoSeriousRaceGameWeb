/**
 * Varese Town. The lap runs from the motorway exit at Gazzada up the hill to Varese and back down to the lake, and
 * this module builds what you see from the car, in the order you meet it:
 *
 *  - the motorway viaduct and the slip road, with the orange fighter jet up on its pylon on the Gazzada roundabout;
 *  - via del Diamante, where one grey unfinished house stands among the little ones like a fort;
 *  - the village church, the Varese villas with their palm trees, and Mont Blanc white on the horizon;
 *  - the lake itself, west of the road: the big villa standing in the water, the reed beds, the fishermen's huts
 *    on stilts with their boats, the jetties going out into the water, canoes being paddled, and shrimps in the
 *    shallows along the shore.
 *
 * Positive lanes are the OUTSIDE of the loop, so the lake is on the positive side and the hill on the negative one.
 * Everything is a brick-toy caricature and the placements are invented; no map data is used anywhere.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';
import { insidePolygon } from '../geometry.js';

export const streetHouses = 14;
export const RESERVED = { autostrada: 40, diamante: 30, chiesetta: 24, villavarese: 32, montebianco: 90, villalago: 44, canneto: 34, ciclabile: 26, village: 26 };

const STONE = 0xd8cdb8, TILE = 0xb2543a, GREY = 0x9aa0a4, CONCRETE = 0xb8b4ad, WOOD = 0x8a6238, WOOD_DARK = 0x5a3f28;
const WATER = 0x3f8fae, REED = 0x8a9a46, IRON = 0x3f4750;
/** The lakeside stretch of the lap, and how far out the water reaches at its widest. */
const LAKE_FROM = 690, LAKE_TO = 1090, LAKE_SHORE = 24, LAKE_REACH = 170;

/** The shore polygon: it hugs the road along the lakeside, then bulges west into open water. */
function lakeShape(track) {
  const points = [];
  const at = (distance, lane) => {
    const f = track.frame(distance);
    return { x: f.x + f.dz * lane, z: f.z - f.dx * lane };
  };
  const steps = 40;
  for (let i = 0; i <= steps; i += 1) points.push(at(LAKE_FROM + (i / steps) * (LAKE_TO - LAKE_FROM), LAKE_SHORE));
  for (let i = steps; i >= 0; i -= 1) {
    const u = i / steps;
    points.push(at(LAKE_FROM + u * (LAKE_TO - LAKE_FROM), LAKE_SHORE + Math.sin(u * Math.PI) * LAKE_REACH));
  }
  return points;
}

/** Nothing generic (trees, bricks, street houses) belongs in the water. */
export function isReserved(track, layout, x, z) {
  return insidePolygon(x, z, lakeShape(track));
}

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, green } = kit;
  const random = seeded(4521);
  const paddlers = [], shrimps = [], flags = [];

  // --- Landmarks (local frame: +z faces the road) ----------------------------------------------------------
  function autostrada(p) {
    // The A8 on its viaduct, the slip road peeling off it and the green signs over the carriageway.
    for (const x of [-26, -9, 9, 26]) for (const z of [-4, 4]) cyl(p, 1, 8, CONCRETE, x, 4, z, 10);
    box(p, 64, 1.2, 12, CONCRETE, 0, 8.6, 0);
    box(p, 64, 0.14, 10.6, 0x3d4149, 0, 9.26, 0);
    for (let x = -30; x <= 30; x += 6) box(p, 3, 0.04, 0.2, 0xe8e4d8, x, 9.35, 0);
    for (const z of [-5.6, 5.6]) {
      box(p, 64, 0.34, 0.22, GREY, 0, 10, z);
      for (let x = -31; x <= 31; x += 4) box(p, 0.16, 1, 0.16, GREY, x, 9.8, z);
    }
    // Two lorries and a car up on the deck.
    box(p, 8, 3, 2.6, 0x2f6b8a, -14, 11, -2.6); box(p, 2.6, 2.6, 2.6, cream, -19, 10.8, -2.6);
    box(p, 8, 3, 2.6, 0xd94141, 9, 11, -2.6); box(p, 2.6, 2.6, 2.6, cream, 4, 10.8, -2.6);
    box(p, 4, 1.2, 2, 0xf4c95a, 22, 10.2, 2.6); box(p, 2.2, 0.9, 1.8, glass, 22, 11.2, 2.6);
    // The gantry sign: VARESE one way, MILANO the other.
    for (const x of [-9, 9]) cyl(p, 0.28, 12, GREY, x, 6, 13, 8);
    box(p, 19, 0.4, 0.4, GREY, 0, 12, 13);
    box(p, 8, 2.8, 0.3, 0x2f7d4f, -5, 10.4, 13); box(p, 7.4, 0.4, 0.06, 0xf4f0e2, -5, 10.4, 13.2);
    box(p, 8, 2.8, 0.3, 0x2f5f8a, 5, 10.4, 13); box(p, 7.4, 0.4, 0.06, 0xf4f0e2, 5, 10.4, 13.2);
    // The toll booth at the bottom of the slip road.
    box(p, 12, 0.3, 7, 0x53565c, 18, 0.15, 20, false);
    for (const x of [14, 22]) { box(p, 2.4, 2.6, 2.4, cream, x, 1.3, 20); box(p, 1.8, 1, 0.14, glass, x, 1.9, 21.25); }
    box(p, 13, 0.5, 8, 0xd94141, 18, 3.4, 20);
    for (const [x, z] of [[-24, 20], [28, 24]]) kit.tree(p, x, z, true);
  }

  function diamante(p) {
    // Via del Diamante: five small houses in a row, and among them the grey one that was never finished — bare
    // concrete, no windows in half of it, scaffolding up one side and a crane over the top. It reads like a fort,
    // which is exactly why everybody notices it.
    box(p, 52, 0.25, 26, 0x9a9484, 0, 0.1, 2, false);
    const colours = [0xf2d9a8, 0xe8bfa0, 0xd8e0c0, 0xf0cfc0];
    for (const [i, x] of [-21, -12, 10, 19].entries()) {
      const home = new T.Group();
      home.position.set(x, 0, -2 + (i % 2) * 3);
      p.add(home);
      const h = 5.5 + (i % 3) * 1.1;
      box(home, 7, h, 7, colours[i % colours.length]);
      kit.roofTop(home, 7.8, 7.8, h, TILE);
      kit.windows(home, 7, 1.8, 3.6, Math.max(1, Math.floor(h / 2.4)));
      box(home, 1.2, 2.2, 0.16, WOOD_DARK, 0, 1.1, 3.62);
      box(home, 8, 0.7, 0.4, 0x6f9a52, 0, 0.35, 5.2, false);
      kit.tree(home, -4.5, 5.5, false);
    }
    // The unfinished house: a grey concrete block, slit windows, a stair tower, scaffolding and a crane.
    const fort = new T.Group();
    fort.position.set(-1, 0, -4);
    p.add(fort);
    box(fort, 13, 9, 11, CONCRETE, 0, 4.5, 0);
    box(fort, 14, 0.6, 12, 0xa8a49c, 0, 9.2, 0);
    box(fort, 4.4, 13, 4.4, 0xa8a49c, -5.4, 6.5, -3);
    for (let i = 0; i < 6; i += 1) box(fort, 0.9, 1.6, 0.3, 0x2f3338, -5 + i * 2, 5.5, 5.6);
    for (let i = 0; i < 4; i += 1) box(fort, 0.7, 1.2, 0.3, 0x2f3338, -4.5 + i * 3, 2.2, 5.6);
    box(fort, 3, 3.4, 0.4, 0x3b3f44, 3.5, 1.7, 5.6);
    // The scaffolding: two lifts of tube and boards up the near face.
    for (const y of [3.2, 6.6]) {
      box(fort, 14, 0.14, 1.2, 0xe0a848, 0, y, 6.6, false);
      for (let x = -6.5; x <= 6.5; x += 3.25) box(fort, 0.12, 3.4, 0.12, 0x8d9299, x, y + 1.7, 6.2);
      for (let x = -6.5; x <= 6.5; x += 3.25) box(fort, 0.12, 3.4, 0.12, 0x8d9299, x, y + 1.7, 7);
    }
    box(fort, 0.12, 0.12, 14, 0x8d9299, -6.5, 8.2, 6.6, false);
    // The crane, and the sand and blocks in the yard.
    cyl(fort, 0.5, 20, 0xf0a81e, 9, 10, -6, 8);
    box(fort, 24, 0.7, 0.7, 0xf0a81e, 3, 20.2, -6);
    box(fort, 1.4, 1.4, 1.4, 0x3b3f44, -6, 19.6, -6);
    for (const y of [17.6, 15.6]) box(fort, 0.14, 2, 0.14, 0x8d9299, 12.5, y, -6, false);
    box(fort, 2, 1.6, 1.6, 0xf0a81e, 12.5, 14.3, -6);
    const sand = cone(fort, 3, 2.4, 0xd8c08a, 14, 1.2, 4, 10);
    sand.castShadow = false;
    for (let i = 0; i < 9; i += 1) box(fort, 1.4, 0.7, 0.9, 0xb8b4ad, 9 + (i % 3) * 1.6, 0.35 + Math.floor(i / 3) * 0.75, 8);
  }

  function chiesetta(p) {
    // The village church: nave, apse, campanile with a clock and the bell under an open arch.
    box(p, 24, 0.3, 20, 0xcfc8b4, 0, 0.12, 0, false);
    box(p, 9, 8, 13, STONE, 0, 4, -1);
    kit.roofTop(p, 10, 14, 8, TILE);
    p.children[p.children.length - 1].position.set(0, 8, -1);
    const apse = cyl(p, 4, 7, STONE, 0, 3.5, -8, 12);
    apse.castShadow = true;
    box(p, 2.4, 4, 0.3, WOOD_DARK, 0, 2, 5.6);
    const rose = mesh(p, new T.CylinderGeometry(1.2, 1.2, 0.2, 14), 0xbfd8e0, 0, 6.2, 5.6);
    rose.rotation.x = Math.PI / 2;
    box(p, 4.4, 12, 4.4, STONE, 7.6, 6, 1);
    box(p, 5.2, 0.6, 5.2, cream, 7.6, 12.3, 1);
    for (const [dx, dz] of [[0, 2.25], [0, -2.25], [2.25, 0], [-2.25, 0]]) box(p, dz ? 2 : 0.3, 3, dz ? 0.3 : 2, 0x2f3338, 7.6 + dx, 10, 1 + dz);
    const spire = cone(p, 3.4, 5, TILE, 7.6, 15, 1, 4);
    spire.rotation.y = Math.PI / 4;
    cyl(p, 0.08, 1.6, 0xf0c040, 7.6, 18.3, 1, 5);
    const clock = mesh(p, new T.CircleGeometry(0.9, 16), cream, 7.6, 7.4, 3.23);
    clock.castShadow = false;
    for (const [x, z] of [[-9, 6], [11, 8], [-10, -6]]) kit.cypress(p, x, z, 8);
    for (let i = 0; i < 5; i += 1) box(p, 2.6, 0.18, 1.2, 0xbdb5a2, 0, 0.22, 7 + i * 1.3, false);
  }

  function villavarese(p) {
    // Two Varese villas on the ridge: liberty houses with a terrace toward the view, an iron gate, and the palms
    // that turn up in half the gardens here.
    box(p, 50, 0.3, 26, 0x8fae66, 0, 0.12, 0, false);
    for (const [x, tint] of [[-13, 0xf2e2c0], [14, 0xe8d0b0]]) {
      const villa = new T.Group();
      villa.position.set(x, 0, -3);
      p.add(villa);
      box(villa, 15, 9, 11, tint, 0, 4.5, 0);
      box(villa, 16, 0.8, 12, cream, 0, 9.4, 0);
      kit.roofTop(villa, 16, 12, 9.8, TILE);
      kit.windows(villa, 15, 2.2, 5.6, 2);
      box(villa, 2.2, 3.4, 0.2, WOOD_DARK, 0, 1.7, 5.6);
      // The terrace looking north-west, with its balustrade.
      box(villa, 15, 0.4, 4, cream, 0, 4.9, 7.4);
      for (let bx = -7; bx <= 7; bx += 1.3) cyl(villa, 0.16, 1.1, cream, bx, 5.6, 9.2, 6);
      box(villa, 15, 0.2, 0.4, cream, 0, 6.2, 9.2);
      for (const px of [-8.6, 8.6]) cyl(villa, 0.3, 4.6, cream, px, 2.3, 7.6, 7);
    }
    // The palms: a rough trunk of stacked rings and a crown of long fronds.
    for (const [x, z] of [[-24, 7], [-2, 9], [25, 6]]) {
      const palm = new T.Group();
      palm.position.set(x, 0, z);
      p.add(palm);
      for (let i = 0; i < 9; i += 1) cyl(palm, 0.42 - i * 0.02, 0.9, 0xa08a5e, 0, 0.45 + i * 0.85, 0, 8);
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        const frond = box(palm, 0.5, 0.12, 4.6, 0x3f8f4a, Math.cos(a) * 1.9, 8.1, Math.sin(a) * 1.9);
        frond.rotation.set(0.3, -a, 0);
        frond.castShadow = false;
      }
      mesh(palm, new T.SphereGeometry(0.5, 8, 6), 0x6b8a3a, 0, 8.1, 0);
    }
    // The iron gate and the wall along the road.
    box(p, 50, 1.6, 0.6, STONE, 0, 0.8, 11.4, false);
    for (const x of [-3.2, 3.2]) box(p, 0.8, 3.4, 0.8, STONE, x, 1.7, 11.4);
    for (let x = -2.6; x <= 2.6; x += 0.65) box(p, 0.1, 2.4, 0.1, IRON, x, 1.2, 11.4, false);
  }

  function montebianco(p) {
    // Mont Blanc on the horizon: a white massif far beyond the lake, big and simple, with no shadow cost.
    const shapes = [[0, 74, 150, 0x8fa8c0], [-56, 52, 96, 0xa2b8cc], [58, 58, 104, 0x93abc4]];
    for (const [x, height, width, colour] of shapes) {
      const peak = cone(p, width / 2, height, colour, x, height / 2 - 6, -20, 5);
      peak.castShadow = false;
      const cap = cone(p, width / 4.4, height / 2.6, 0xf6fbff, x, height * 0.74 - 6, -20, 5);
      cap.castShadow = false;
    }
    for (const [x, w] of [[-120, 70], [120, 76]]) {
      const ridge = cone(p, w / 2, 42, 0xa8bccf, x, 15, -30, 5);
      ridge.castShadow = false;
    }
  }

  function villalago(p) {
    // The big villa standing out in the lake on its own spit of land, with the boathouse under it.
    box(p, 26, 0.6, 22, 0xcfc8b4, 0, 0.3, -6, false);
    box(p, 18, 11, 13, 0xf2e2c0, 0, 5.5, -6);
    box(p, 19, 0.9, 14, cream, 0, 11.4, -6);
    kit.roofTop(p, 19, 14, 11.9, TILE);
    kit.windows(p, 18, 2.4, 0.6, 3);
    box(p, 3, 4, 0.3, WOOD_DARK, 0, 2, 0.62);
    for (const x of [-6, 6]) cyl(p, 0.36, 5.6, cream, x, 2.8, 1.4, 8);
    box(p, 14, 0.4, 3, cream, 0, 5.8, 2);
    for (let bx = -6.5; bx <= 6.5; bx += 1.2) cyl(p, 0.14, 1, cream, bx, 6.4, 3.3, 6);
    // The boathouse and the stone steps down to the water.
    box(p, 7, 3.4, 5, 0xe0d2b4, -12, 1.7, 3);
    kit.roofTop(p, 7.6, 5.6, 3.4, TILE);
    p.children[p.children.length - 1].position.set(-12, 3.4, 3);
    const mouth = mesh(p, new T.CylinderGeometry(2.2, 2.2, 0.6, 12, 1, false, 0, Math.PI), 0x2b3a3f, -12, 1.4, 5.5);
    mouth.rotation.x = Math.PI / 2;
    mouth.rotation.z = Math.PI;
    for (let i = 0; i < 4; i += 1) box(p, 6, 0.3, 1, STONE, 8, 1.2 - i * 0.3, 2 + i, false);
    for (const [x, z] of [[-16, -12], [15, -13], [-17, 6]]) kit.cypress(p, x, z, 9);
    for (const x of [-8, 8]) kit.lamp(p, x, 6, 4);
  }

  function canneto(p) {
    // The reed beds, the fishermen's huts up on stilts and the jetties going out into the water.
    box(p, 40, 0.3, 14, 0x7f9a50, 0, 0.12, -3, false);
    for (let i = 0; i < 90; i += 1) {
      const x = -20 + random() * 40, z = 4 + random() * 9, tall = 2.2 + random() * 1.6;
      const reed = cyl(p, 0.07, tall, REED, x, tall / 2, z, 5);
      reed.castShadow = false;
      // Every third one carries a bulrush head, which is what makes a clump of sticks read as a reed bed.
      if (random() > 0.66) {
        const head = cyl(p, 0.16, 0.7, 0x8a6238, x, tall + 0.25, z, 6);
        head.castShadow = false;
      }
    }
    for (const [x, turn] of [[-11, 0.2], [6, -0.3]]) {
      const hut = new T.Group();
      hut.position.set(x, 0, 6);
      hut.rotation.y = turn;
      p.add(hut);
      for (const dx of [-3, 3]) for (const dz of [-2.4, 2.4]) cyl(hut, 0.2, 2.6, WOOD_DARK, dx, 1.3, dz, 6);
      box(hut, 8, 0.3, 6, WOOD, 0, 2.7, 0);
      box(hut, 7, 3, 5, WOOD, 0, 4.4, 0);
      for (let i = 0; i < 5; i += 1) box(hut, 7.1, 0.16, 5.1, i % 2 ? WOOD_DARK : WOOD, 0, 3.2 + i * 0.6, 0, false);
      kit.roofTop(hut, 8, 6, 5.9, 0x6b5a3a);
      box(hut, 1.2, 2, 0.16, WOOD_DARK, 0, 3.9, 2.55);
      // The nets hung out to dry and the boat pulled up under the hut.
      for (const dx of [-2, 2]) box(hut, 0.1, 2.2, 3.4, 0xcfc0a0, dx, 1.6, 3.4, false);
      const boat = mesh(hut, new T.SphereGeometry(1, 10, 6), 0x2f6b8a, 0, 0.4, 5.6);
      boat.scale.set(0.9, 0.4, 2.6);
      box(hut, 1.6, 0.14, 0.4, WOOD, 0, 0.7, 5.6, false);
    }
    for (const [x, z] of [[-18, -6], [17, -7]]) kit.tree(p, x, z, false);
  }

  function ciclabile(p) {
    // The cycle path along the lake: two small wayside chapels, benches, a bike rack and two cyclists on the path.
    box(p, 46, 0.25, 8, 0xd8c8a8, 0, 0.12, 2, false);
    for (let x = -22; x <= 22; x += 4) box(p, 2.4, 0.06, 0.2, 0xf4f0e2, x, 0.26, 2, false);
    for (const [x, tint] of [[-15, 0xf2e2c0], [13, 0xe8d8bc]]) {
      // A mini church: one room, a bell-cote and a cross. They are small on purpose — they are wayside chapels.
      const chapel = new T.Group();
      chapel.position.set(x, 0, -6);
      p.add(chapel);
      box(chapel, 4.6, 4, 5.4, tint, 0, 2, 0);
      kit.roofTop(chapel, 5.2, 6, 4, TILE);
      box(chapel, 1, 2.4, 0.2, WOOD_DARK, 0, 1.2, 2.72);
      box(chapel, 1.6, 1.8, 0.5, tint, 0, 5.4, -1);
      box(chapel, 1.2, 0.3, 0.5, tint, 0, 6.4, -1);
      box(chapel, 0.14, 1.2, 0.14, IRON, 0, 7, -1, false);
      box(chapel, 0.6, 0.14, 0.14, IRON, 0, 7.2, -1, false);
      kit.cypress(chapel, -4, 2, 6);
    }
    for (const x of [-6, 5]) {
      box(p, 2.4, 0.18, 0.7, WOOD, x, 0.85, 5.4);
      box(p, 2.4, 0.8, 0.14, WOOD, x, 1.3, 5.05);
      for (const dx of [-1, 1]) box(p, 0.16, 0.8, 0.7, IRON, x + dx, 0.4, 5.4, false);
    }
    for (let i = 0; i < 4; i += 1) {
      const hoop = mesh(p, new T.TorusGeometry(0.4, 0.06, 5, 12, Math.PI), IRON, 20 + i * 1.2, 0.35, 4);
      hoop.castShadow = false;
    }
    // Two cyclists, stopped where the path meets the road.
    for (const [x, colour] of [[-2, 0xd94141], [2.6, 0xf4c95a]]) {
      const rider = new T.Group();
      rider.position.set(x, 0, 2);
      rider.rotation.y = 0.3;
      p.add(rider);
      for (const dz of [-0.8, 0.8]) {
        const wheel = mesh(rider, new T.TorusGeometry(0.5, 0.07, 5, 14), 0x23262c, 0, 0.5, dz);
        wheel.rotation.y = Math.PI / 2;
      }
      box(rider, 0.1, 0.5, 1.8, IRON, 0, 0.8, 0, false);
      box(rider, 0.5, 0.9, 0.4, colour, 0, 1.4, -0.1);
      mesh(rider, new T.SphereGeometry(0.22, 8, 6), 0xf0c9a0, 0, 2, -0.05);
      const helmet = mesh(rider, new T.SphereGeometry(0.26, 8, 6), 0xf4f0e2, 0, 2.08, -0.05);
      helmet.scale.y = 0.7;
    }
  }

  const builders = { autostrada, diamante, chiesetta, villavarese, montebianco, villalago, canneto, ciclabile };
  const SIGN = { autostrada: 24, montebianco: 90, villalago: 18, canneto: 16, villavarese: 16, diamante: 16 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11);

  // --- The lake itself -------------------------------------------------------------------------------------
  const shore = lakeShape(track);
  const shape = new T.Shape(shore.map((p) => new T.Vector2(p.x, -p.z)));
  const water = mesh(scene, new T.ShapeGeometry(shape), WATER, 0, 0.06, 0);
  water.rotation.x = -Math.PI / 2;
  water.castShadow = false;
  water.name = 'lake-water';
  // A band of pale gravel all round the waterline, so the lake has a beach and not a cut edge.
  const rim = new T.CatmullRomCurve3(shore.map((p) => new T.Vector3(p.x, 0.1, p.z)), true);
  mesh(scene, new T.TubeGeometry(rim, 320, 0.45, 5, true), 0xcdb894).castShadow = false;

  const centreAt = (distance, lane) => {
    const f = track.frame(distance);
    return { x: f.x + f.dz * lane, z: f.z - f.dx * lane };
  };

  // Jetties: wooden walkways running out from the shore into the water, as they do all along this bank.
  for (const [distance, length] of [[760, 16], [900, 22], [1010, 14]]) {
    const head = centreAt(distance, LAKE_SHORE - 2), tip = centreAt(distance, LAKE_SHORE + length);
    const jetty = new T.Group();
    jetty.position.set(head.x, 0, head.z);
    jetty.rotation.y = Math.atan2(tip.x - head.x, tip.z - head.z);
    scene.add(jetty);
    box(jetty, 2.6, 0.24, length, WOOD, 0, 1, length / 2);
    for (let z = 1; z < length; z += 3.4) for (const dx of [-1.1, 1.1]) cyl(jetty, 0.18, 1.6, WOOD_DARK, dx, 0.5, z, 6);
    for (const dx of [-1.3, 1.3]) {
      box(jetty, 0.12, 0.12, length, WOOD_DARK, dx, 1.7, length / 2, false);
      for (let z = 1; z < length; z += 3.4) box(jetty, 0.12, 0.7, 0.12, WOOD_DARK, dx, 1.45, z, false);
    }
  }

  // Canoes: three of them out on the water, each with a paddler swinging the blade from side to side.
  for (let i = 0; i < 3; i += 1) {
    const canoe = new T.Group();
    scene.add(canoe);
    kit.dynamic(canoe);
    const hull = mesh(canoe, new T.SphereGeometry(1, 10, 6), [0xf0a81e, 0xd94141, 0x2f9a8a][i], 0, 0.3, 0);
    hull.scale.set(0.55, 0.32, 3);
    hull.castShadow = false;
    box(canoe, 1, 0.12, 4.4, 0x3b2f24, 0, 0.5, 0, false);
    box(canoe, 0.7, 0.9, 0.7, [0x2f3338, 0xf4f0e2, 0x2f6b8a][i], 0, 0.9, -0.2);
    mesh(canoe, new T.SphereGeometry(0.26, 8, 6), 0xf0c9a0, 0, 1.5, -0.2);
    const paddle = box(canoe, 2.8, 0.1, 0.24, 0xe8d8bc, 0, 1.2, 0.1, false);
    paddlers.push({ object: canoe, paddle, along: 0.2 + i * 0.28, out: 26 + i * 14, phase: random() * 6.3, speed: 0.012 + random() * 0.008 });
  }

  // Shrimps in the shallows: little pink darts just under the surface along the shore, exactly where you would
  // find them. They are tiny, so there are a lot of them and they move in short bursts.
  for (let i = 0; i < 26; i += 1) {
    const at = centreAt(LAKE_FROM + random() * (LAKE_TO - LAKE_FROM), LAKE_SHORE + 3 + random() * 16);
    const shrimp = new T.Group();
    shrimp.position.set(at.x, 0.12, at.z);
    scene.add(shrimp);
    const body = mesh(shrimp, new T.SphereGeometry(0.3, 7, 5), 0xf08a72, 0, 0, 0);
    body.scale.set(0.5, 0.42, 1.5);
    body.castShadow = false;
    const tail = mesh(shrimp, new T.ConeGeometry(0.17, 0.4, 4), 0xe0705a, 0, 0, -0.55);
    tail.rotation.x = -Math.PI / 2;
    tail.castShadow = false;
    for (const side of [-1, 1]) {
      const feeler = cyl(shrimp, 0.025, 0.7, 0xf8b8a0, side * 0.08, 0.02, 0.6, 4);
      feeler.rotation.set(1.3, 0, side * 0.35);
      feeler.castShadow = false;
    }
    shrimps.push({ object: shrimp, home: shrimp.position.clone(), phase: random() * 6.3, turn: random() * 6.3, dart: random() });
  }

  // --- The orange fighter on the Gazzada roundabout ---------------------------------------------------------
  // It sits on a pylon on the island the simulation already knows about, so the aeroplane and the thing the car
  // bumps into are in the same place by construction. It flies well above the cars, the way the real one does.
  const island = (track.obstacles || []).find((obstacle) => obstacle.id === 'rotonda-gazzada');
  if (island) {
    const at = centreAt(island.distance, island.lane);
    const base = (track.elevation ? track.elevation(island.distance) : 0) + 0.2;
    const jet = new T.Group();
    jet.position.set(at.x, base, at.z);
    jet.rotation.y = 0.7;
    scene.add(jet);
    cyl(jet, 0.55, 5.4, GREY, 0, 2.7, 0, 10);
    box(jet, 2.6, 0.5, 2.6, 0x8d8578, 0, 0.25, 0);
    const plane = new T.Group();
    plane.position.set(0, 5.6, 0);
    plane.rotation.set(-0.18, 0, 0.12);
    jet.add(plane);
    const ORANGE = 0xf26a1b, TRIM = 0xf4f0e2;
    const body = mesh(plane, new T.SphereGeometry(1, 12, 9), ORANGE, 0, 0, 0);
    body.scale.set(0.8, 0.8, 5.2);
    const nose = mesh(plane, new T.ConeGeometry(0.78, 2.6, 12), ORANGE, 0, 0, 6.2);
    nose.rotation.x = Math.PI / 2;
    mesh(plane, new T.SphereGeometry(0.28, 8, 6), 0x2f3338, 0, 0, 7.6);
    // Swept wings, tailplane and fin.
    for (const side of [-1, 1]) {
      const wing = box(plane, 5, 0.22, 2.4, ORANGE, side * 2.8, -0.1, -0.6);
      wing.rotation.y = side * 0.42;
      const tip = box(plane, 1.2, 0.2, 0.8, TRIM, side * 5, -0.1, -1.6);
      tip.rotation.y = side * 0.42;
      const tailplane = box(plane, 2.6, 0.18, 1.2, ORANGE, side * 1.5, 0.3, -4.2);
      tailplane.rotation.y = side * 0.4;
      // The air intake at the wing root.
      const intake = cyl(plane, 0.36, 1.6, 0x2f3338, side * 0.95, -0.15, 2.2, 8);
      intake.rotation.x = Math.PI / 2;
    }
    const fin = box(plane, 0.22, 2.6, 2.6, ORANGE, 0, 1.5, -4.2);
    box(plane, 0.24, 0.8, 1.6, TRIM, 0, 2.6, -4.4);
    // Canopy, roundel stripes and the jet pipe.
    const canopy = mesh(plane, new T.SphereGeometry(0.62, 10, 8), 0x8fd0e0, 0, 0.62, 3);
    canopy.scale.set(0.9, 0.8, 2.1);
    for (const z of [1.2, -1.6]) box(plane, 1.7, 0.1, 0.5, TRIM, 0, 0.8, z, false);
    const pipe = cyl(plane, 0.62, 0.7, 0x3b3f44, 0, 0, -5.2, 12);
    pipe.rotation.x = Math.PI / 2;
    kit.dynamic(plane);
    flags.push({ object: plane, base: plane.rotation.z });
  }

  kit.animate((clock, dt) => {
    for (const canoe of paddlers) {
      canoe.along += canoe.speed * dt;
      if (canoe.along > 0.95) canoe.along -= 0.9;
      const distance = LAKE_FROM + canoe.along * (LAKE_TO - LAKE_FROM);
      const here = centreAt(distance, canoe.out), soon = centreAt(distance + 6, canoe.out);
      canoe.object.position.set(here.x, 0.18 + Math.sin(clock * 1.6 + canoe.phase) * 0.06, here.z);
      canoe.object.rotation.y = Math.atan2(soon.x - here.x, soon.z - here.z);
      canoe.object.rotation.z = Math.sin(clock * 2.2 + canoe.phase) * 0.06;
      // The paddle swings from one side to the other, the way a canoeist really does it.
      canoe.paddle.rotation.z = Math.sin(clock * 2.6 + canoe.phase) * 0.9;
      canoe.paddle.rotation.y = Math.cos(clock * 2.6 + canoe.phase) * 0.5;
    }
    for (const shrimp of shrimps) {
      // Still for a moment, then a short dart forward: that is all a shrimp ever does.
      const beat = (clock * 0.7 + shrimp.dart * 6) % 3;
      const push = beat < 0.5 ? Math.sin(beat * Math.PI * 2) * 0.9 : 0;
      shrimp.turn += push * dt * 2;
      const object = shrimp.object;
      object.position.x += Math.sin(shrimp.turn) * push * dt * 9;
      object.position.z += Math.cos(shrimp.turn) * push * dt * 9;
      object.position.y = 0.12 + Math.sin(clock * 3 + shrimp.phase) * 0.04;
      object.rotation.y = shrimp.turn;
      // It never strays more than a few metres from where it lives.
      const away = Math.hypot(object.position.x - shrimp.home.x, object.position.z - shrimp.home.z);
      if (away > 5) { shrimp.turn += Math.PI; object.position.lerp(shrimp.home, 0.12); }
    }
    // The aeroplane sways a little on its pylon in the wind, which is the only way you know it is not a picture.
    for (const flag of flags) flag.object.rotation.z = flag.base + Math.sin(clock * 0.8) * 0.02;
  });
}
