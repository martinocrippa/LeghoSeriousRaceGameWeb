/**
 * Aprica: the village, the Percorso Vita between the ski runs, and Campo Vecchio at the far end of the lap,
 * where a cluster of old baite stands among the trees and the river runs past in pools between the rocks.
 * The rest of the circuit keeps the shared builders (village, ski slope, chairlift).
 * Everything is a brick-toy caricature; placements are fictional.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 8;
export const RESERVED = { chalet: 34, skislope: 40, village: 28, river: 30, chairlift: 24 };

const WOOD = 0x6b4a2f, WOOD_DARK = 0x4e3521, STONE = 0x8d8578, SNOW = 0xf4f7fb, WATER = 0x5f93b0;

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, snow } = kit;

  /** A baita: stone base, dark timber upper floor, wide snow-covered roof and a woodpile. */
  function baita(parent, x, z, size = 1, turn = 0) {
    const hut = new T.Group();
    hut.position.set(x, 0, z);
    hut.rotation.y = turn;
    hut.scale.setScalar(size);
    parent.add(hut);
    box(hut, 6.4, 2.6, 5.4, STONE, 0, 1.3, 0);
    box(hut, 6, 2.8, 5, WOOD, 0, 4, 0);
    for (let i = 0; i < 5; i++) box(hut, 6.2, 0.34, 5.2, i % 2 ? WOOD_DARK : WOOD, 0, 2.9 + i * 0.55, 0, false);
    box(hut, 7.4, 0.5, 6.4, WOOD_DARK, 0, 5.6, 0);
    kit.roofTop(hut, 7.4, 6.4, 5.85, WOOD_DARK);
    const cap = cone(hut, 1, 2.2, snow, 0, 6.9, 0, 4);
    cap.rotation.y = Math.PI / 4; cap.scale.set(5.6, 1, 4.8); cap.castShadow = false;
    box(hut, 1.3, 1.9, 0.3, 0x3b2f24, 0, 2.3, 2.75);
    for (const wx of [-1.8, 1.8]) box(hut, 0.9, 0.9, 0.2, glass, wx, 4.2, 2.6);
    // Balcony on the sunny side and the woodpile underneath.
    box(hut, 6.4, 0.24, 1.2, WOOD_DARK, 0, 2.9, 3.2);
    for (let wx = -2.8; wx <= 2.8; wx += 0.8) cyl(hut, 0.07, 0.9, WOOD_DARK, wx, 3.4, 3.7, 5);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
      const log = cyl(hut, 0.22, 2.4, 0xa9784c, -3.6 + i * 0.5 + row * 0.25, 0.3 + row * 0.45, -3.4, 7);
      log.rotation.z = Math.PI / 2;
    }
    cyl(hut, 0.34, 1.6, STONE, 2, 7.2, -1, 7);
    return hut;
  }

  function chalet(p, item) {
    // Campo Vecchio: a cluster of baite among the trees instead of the single hut of the shared builder.
    if (!item.name) { baita(p, 0, 0, 0.9); kit.tree(p, -9, -4, true); kit.tree(p, 8, -6, true); return; }
    const random = seeded(3131);
    box(p, 34, 0.3, 24, 0xe9eef4, 0, 0.12, -2, false);
    baita(p, -9, -3, 1.05, 0.12);
    baita(p, 2, -9, 0.9, -0.5);
    baita(p, 10, 1, 1, 0.3);
    baita(p, -3, 6, 0.85, -0.15);
    // The path between them, a drinking fountain and the stacked hay.
    for (let i = 0; i < 9; i++) box(p, 1.6, 0.16, 1.2, STONE, -12 + i * 3, 0.2, 9 - i * 0.6, false);
    box(p, 1.2, 1.6, 0.9, STONE, 15, 0.8, 7); cyl(p, 0.09, 0.7, 0x8f98a3, 15, 1.9, 7.4, 5);
    for (const [x, z] of [[-16, -8], [16, -10], [-15, 8], [18, 2], [6, 12], [-8, 13]]) kit.tree(p, x, z, true);
    for (let i = 0; i < 7; i++) {
      const a = random() * Math.PI * 2, r = 12 + random() * 8;
      mesh(p, new T.IcosahedronGeometry(0.5 + random() * 0.5, 0), STONE, Math.cos(a) * r, 0.4, -2 + Math.sin(a) * r);
    }
  }

  function river(p) {
    // The river at Campo Vecchio: it runs between snowy banks and widens into still pools among the boulders.
    // Aprica is a figure of eight, so this stays compact: the other arm of the loop passes close by.
    box(p, 26, 0.3, 17, snow, 0, 0.1, -1, false);
    const bed = new T.Shape();
    bed.moveTo(-12, -3); bed.quadraticCurveTo(-4, -7, 1, -2);
    bed.quadraticCurveTo(6, 2, 12, 0); bed.lineTo(12, 3.4);
    bed.quadraticCurveTo(6, 6, 0.6, 1.4); bed.quadraticCurveTo(-4, -2.6, -12, 0.6);
    const water = mesh(p, new T.ShapeGeometry(bed), WATER, 0, 0.22, -1);
    water.rotation.x = -Math.PI / 2; water.castShadow = false;
    // Three pools where the current slows, each ringed with stones.
    const random = seeded(8181);
    for (const [cx, cz, r] of [[-8, -3, 2.2], [1, -1, 2.8], [8.5, 1, 2]]) {
      const pool = mesh(p, new T.CircleGeometry(r, 18), 0x4a7f9c, cx, 0.24, cz);
      pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2;
        mesh(p, new T.IcosahedronGeometry(0.4 + random() * 0.3, 0), STONE, cx + Math.cos(a) * (r + 0.6), 0.3, cz + Math.sin(a) * (r + 0.6));
      }
    }
    for (const [x, z] of [[-6, -1], [-2, -4], [3, 1], [7, -2], [0, -2]]) mesh(p, new T.IcosahedronGeometry(0.5, 0), 0x9aa3ad, x, 0.35, z);
    // The plank bridge and the trees crowding both banks.
    box(p, 5, 0.3, 1.2, WOOD, 2, 1.05, -2, false);
    for (const x of [0.2, 3.8]) cyl(p, 0.16, 1, WOOD_DARK, x, 0.5, -2.5, 6);
    for (const [x, z] of [[-10, -6], [-4, 6], [6, -6], [11, 5], [-9, 5], [9, -5]]) kit.tree(p, x, z, true);
  }

  /**
   * The Percorso Vita ski area: two pistes running down the mountain side by side, separated by a line of firs,
   * with people skiing down them and a snowcat working its way up and down one of them.
   *
   * Local frame: +z is the road, so the mountain rises toward -z. The pistes run from the top at z = -58, 26 m up,
   * down to the bottom station at z = +12, which is still sixteen metres clear of the racing lanes.
   */
  function skislope(p) {
    const TOP = -58, BOTTOM = 12, RISE = 26, WIDE = 11;
    const random = seeded(5151);
    const skiers = [], moving = [];
    const height = (u) => RISE * (1 - u) * (1 - u * 0.25);
    const along = (u) => TOP + u * (BOTTOM - TOP);
    // The mountain itself. Each slab is TILTED to the local gradient and overlaps the next, so the run reads as one
    // smooth piste: laid flat they looked like a flight of stairs, which is not what anybody skis down.
    for (let i = 0; i < 16; i += 1) {
      const u = i / 16, next = (i + 1) / 16;
      const dz = along(next) - along(u), dy = height(next) - height(u);
      const span = Math.hypot(dz, dy);
      const slab = box(p, 46, 2.4, span + 1.2, i % 2 ? SNOW : 0xeef3f8, 0, (height(u) + height(next)) / 2 - 1.2, (along(u) + along(next)) / 2, false);
      slab.rotation.x = Math.atan2(-dy, dz);
      slab.castShadow = false;
    }
    box(p, 52, 1.4, 16, SNOW, 0, 0.7, BOTTOM + 4, false);
    // Two pistes, marked out with orange and blue poles, and the netting on the outside of the fast one.
    for (const [lane, colour] of [[-13, 0xe0503c], [13, 0x1e5bd8]]) {
      for (let i = 0; i <= 12; i += 1) {
        const u = i / 12;
        for (const side of [-1, 1]) cyl(p, 0.1, 2.2, colour, lane + side * WIDE / 2, height(u) + 1.1, along(u), 5);
      }
    }
    for (let i = 0; i <= 12; i += 1) {
      const u = i / 12;
      cyl(p, 0.12, 2.6, 0xff7a12, -22, height(u) + 1.3, along(u), 5);
      if (i < 12) box(p, 0.08, 1.8, (BOTTOM - TOP) / 12, 0xf0a81e, -22, height(u) + 0.9, along(u) + (BOTTOM - TOP) / 24, false);
    }
    // The line of firs down the middle, and the trees along the top of the run.
    for (let i = 1; i < 11; i += 1) {
      const u = i / 12;
      const tree = cone(p, 1.5, 6, 0x2f5a3a, 0, height(u) + 3.6, along(u), 7);
      tree.castShadow = false;
      cyl(p, 0.22, 2, WOOD_DARK, 0, height(u) + 1, along(u), 5);
      const cap = cone(p, 1.1, 2.2, SNOW, 0, height(u) + 5.4, along(u), 7);
      cap.castShadow = false;
    }
    // The bottom station: a hut, the piste board and a rack of skis.
    box(p, 7, 3.4, 5, WOOD, 20, 1.7, BOTTOM + 3);
    kit.roofTop(p, 8, 6, 3.4, WOOD_DARK);
    p.children[p.children.length - 1].position.set(20, 3.4, BOTTOM + 3);
    box(p, 1.4, 2, 0.2, 0x3b2f24, 20, 1, BOTTOM + 5.6);
    box(p, 4, 2.6, 0.2, 0xf4f7fb, 13, 2.6, BOTTOM + 6);
    for (const x of [11.4, 14.6]) box(p, 0.16, 2.6, 0.16, WOOD_DARK, x, 1.3, BOTTOM + 6);
    for (let i = 0; i < 6; i += 1) box(p, 0.12, 2.4, 0.5, i % 2 ? 0xe0503c : 0xffd766, 24.5 + i * 0.4, 1.2, BOTTOM + 6.5);

    /** One skier: helmet, jacket, salopettes, two skis and two poles. Built facing down the hill (+z). */
    function skier(colour) {
      const person = new T.Group();
      for (const side of [-1, 1]) {
        box(person, 0.34, 0.1, 3.1, 0xf4f0e2, side * 0.32, 0.05, 0.2, false);
        box(person, 0.3, 0.75, 0.32, 0x2b3038, side * 0.3, 0.5, 0);
      }
      box(person, 0.86, 1.05, 0.62, colour, 0, 1.4, 0);
      mesh(person, new T.SphereGeometry(0.34, 9, 7), 0xf0c9a0, 0, 2.1, 0.05);
      const helmet = mesh(person, new T.SphereGeometry(0.38, 9, 7), colour === 0xe0503c ? 0x1e5bd8 : 0xe0503c, 0, 2.2, 0);
      helmet.scale.y = 0.85;
      box(person, 0.6, 0.2, 0.1, 0x2b3038, 0, 2.16, 0.3, false);
      const arms = [];
      for (const side of [-1, 1]) {
        const arm = box(person, 0.24, 0.7, 0.24, colour, side * 0.56, 1.5, 0.1);
        const pole = cyl(person, 0.05, 1.5, 0x8d9299, side * 0.7, 0.75, -0.3, 5);
        pole.rotation.x = 0.35;
        arms.push(arm);
      }
      return { person, arms };
    }
    for (let i = 0; i < 7; i += 1) {
      const colour = [0xe0503c, 0xffd766, 0x1e5bd8, 0x7a4ad9, 0xff7a12][i % 5];
      const { person, arms } = skier(colour);
      p.add(person);
      kit.dynamic(person);
      skiers.push({ object: person, arms, lane: i % 2 ? 13 : -13, u: random(), speed: 0.055 + random() * 0.045, swing: 3 + random() * 2.5, phase: random() * 6.3 });
    }

    // The snowcat: orange cab, yellow blade in front, the tiller behind and a beacon on the roof. It works the
    // fast piste — down the middle, then back up along the edge, the way a groomer really does it.
    const cat = new T.Group();
    p.add(cat);
    kit.dynamic(cat);
    box(cat, 3.4, 1.5, 5.4, 0xff7a12, 0, 1.5, 0);
    box(cat, 2.9, 1.5, 2.6, 0x2b3038, 0, 2.9, 0.5);
    box(cat, 2.7, 1.1, 0.14, kit.glass, 0, 3, 1.82);
    for (const side of [-1, 1]) {
      box(cat, 1.15, 1.05, 5.8, 0x23262c, side * 1.6, 0.6, 0);
      for (let i = 0; i < 6; i += 1) box(cat, 1.25, 0.16, 0.3, 0x3d4149, side * 1.6, 0.6, -2.5 + i, false);
    }
    box(cat, 5, 1.3, 0.5, 0xffd766, 0, 1.1, 3.4);
    for (const side of [-1, 1]) box(cat, 0.22, 0.22, 1.6, 0x8d9299, side * 1.2, 1.2, 2.7, false);
    box(cat, 4.4, 1, 1.4, 0x3d4149, 0, 0.9, -3.4);
    const beacon = mesh(cat, new T.SphereGeometry(0.28, 8, 6), 0xffb02e, 0, 3.8, 0);
    beacon.castShadow = false;
    moving.push({ object: cat, beacon, u: 0.15, dir: 1 });

    kit.animate((clock, dt) => {
      for (const s of skiers) {
        s.u += s.speed * dt;
        if (s.u > 1) s.u -= 1;
        const swing = Math.sin(s.u * 9 + s.phase) * s.swing;
        s.object.position.set(s.lane + swing, height(s.u) + 1.1, along(s.u));
        // Facing down the hill, leaning into each turn: the angle follows the swing, the lean opposes it.
        const turn = Math.cos(s.u * 9 + s.phase) * 0.5;
        s.object.rotation.set(-0.3, turn, -turn * 0.6);
        for (const [i, arm] of s.arms.entries()) arm.rotation.x = Math.sin(clock * 3.4 + s.phase + i * 3) * 0.3;
      }
      for (const m of moving) {
        // Down the piste at working pace, then back up its edge. It is always doing one or the other, so there
        // is never a moment when it blinks from the bottom back to the top.
        m.u += m.dir * (m.dir > 0 ? 0.035 : 0.055) * dt;
        if (m.u > 1) { m.u = 1; m.dir = -1; }
        if (m.u < 0) { m.u = 0; m.dir = 1; }
        m.object.position.set(13 + (m.dir > 0 ? 0 : -7.5), height(m.u) + 0.35, along(m.u));
        m.object.rotation.set(m.dir > 0 ? -0.3 : 0.3, m.dir > 0 ? 0 : Math.PI, 0);
        m.beacon.material = kit.mat(Math.sin(clock * 6) > 0 ? 0xffd766 : 0xc06a12);
      }
    });
  }

  const builders = { chalet, river, skislope };
  const SIGN = { skislope: 20, river: 14, chalet: 16 };
  for (const item of layout.landmarks) {
    kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11);
  }
}
