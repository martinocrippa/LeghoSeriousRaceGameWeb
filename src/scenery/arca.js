/**
 * The ARCA Brugherio training fields. Two marked-out pitches fill the inside of the loop, the road runs right
 * round them on the mown grass and passes under two goals; outside stand the changing rooms, the church of
 * San Paolo on Piazza Don Camagni, the auditorium, the nursery and the blocks of flats.
 * Puddles and mud everywhere: it is a winter training day. Club colours black and orange.
 * Everything is a brick-toy caricature; placements are fictional and do not follow the real ground.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 0;
export const RESERVED = { chiesa: 40, auditorium: 34, palazzi: 34, spogliatoi: 30, nido: 30, campo: 34 };

/** The two pitches, in world metres. They hold for the circuit as defined (length 560) — see src/tracks/arca.js. */
const PITCHES = [{ x0: -82, x1: -8, z0: -24, z1: 24 }, { x0: 8, x1: 82, z0: -24, z1: 24 }];
/** Where the road ducks under a goal. */
const GOALS = [56, 364];
const LINE = 0xf4f4ee, ORANGE = 0xff7a12, BLACK = 0x14161a, MUD = 0x6b4f34, WATER = 0x5c6b70;

/** Trees, bricks and houses keep off the pitches. */
export function isReserved(track, layout, x, z) {
  return PITCHES.some((p) => x > p.x0 - 4 && x < p.x1 + 4 && z > p.z0 - 4 && z < p.z1 + 4);
}

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, wood, darkWood, stone } = kit;
  const roofRed = 0xa8503c, wall = 0xe4dccb, concrete = 0xb4b1a8, pitchGreen = 0x4f7a37;

  /** A flat plate lying on the grass: lines, puddles and mud are all drawn this way. */
  function plate(parent, x, z, w, d, colour, y = 0.03, rot = 0) {
    const m = mesh(parent, new T.BoxGeometry(w, 0.05, d), colour, x, y, z);
    m.rotation.y = rot; m.castShadow = false; m.receiveShadow = false;
    return m;
  }

  // --- Landmarks ---------------------------------------------------------------------------------------
  function campo(p) {
    // The club sign in black and orange, the two dugouts and a crate of balls. It faces the road (local +z).
    for (const x of [-4.4, 4.4]) cyl(p, 0.26, 5.4, BLACK, x, 2.7, 6, 8);
    box(p, 10.4, 3, 0.4, BLACK, 0, 4.4, 6);
    box(p, 9.4, 2.2, 0.2, ORANGE, 0, 4.4, 6.25);
    box(p, 8, 1, 0.14, LINE, 0, 4.4, 6.4);
    // Dugouts, roofs toward the pitch (local -z).
    for (const x of [-9, 9]) {
      const dug = new T.Group(); dug.position.set(x, 0, -4); p.add(dug);
      box(dug, 7.4, 0.3, 3, concrete, 0, 0.15, 0);
      for (const dx of [-3.4, 3.4]) cyl(dug, 0.16, 2.2, BLACK, dx, 1.1, 0, 6);
      box(dug, 7.8, 0.25, 3.6, ORANGE, 0, 2.3, 0);
      box(dug, 7.4, 0.9, 0.3, BLACK, 0, 0.75, -1.4);
      for (let i = 0; i < 3; i++) box(dug, 1.6, 0.6, 1.4, 0x3a4450, -2.2 + i * 2.2, 0.6, 0.2);
    }
    cyl(p, 1.3, 1, wood, 13, 0.5, 2, 10);
    const random = seeded(4242);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      mesh(p, new T.IcosahedronGeometry(0.34, 1), i % 2 ? LINE : BLACK, 13 + Math.cos(a) * 0.65, 1.3, 2 + Math.sin(a) * 0.65);
    }
    for (const [x, z] of [[-15, 3], [16, -6]]) kit.tree(p, x, z);
  }
  function spogliatoi(p) {
    // A long low changing-room block with its canopy, a floodlight and a bike rack.
    box(p, 24, 0.3, 12, concrete, 0, 0.14, 0);
    box(p, 19, 3.6, 8, wall, -1, 1.8, -1);
    box(p, 20, 0.5, 9, roofRed, -1, 3.85, -1);
    kit.windows(p, 18, 1.5, 3.1, 1); for (const w of p.children.slice(-12)) w.position.x += -1;
    for (const x of [-6, 2]) box(p, 1.6, 2.4, 0.3, 0x5a4230, x, 1.2, 3.1);
    box(p, 20, 0.3, 4, ORANGE, -1, 3.2, 5.2);
    for (const x of [-9, -1, 7]) cyl(p, 0.14, 3, BLACK, x, 1.5, 6.9, 6);
    // Floodlight pylon.
    cyl(p, 0.34, 13, 0xa8adb4, 12, 6.5, -3, 8);
    box(p, 3.4, 1.2, 0.8, 0x6b727a, 12, 13.2, -3);
    for (const dx of [-1, 0, 1]) { const lamp = mesh(p, new T.BoxGeometry(0.9, 0.9, 0.2), 0xfff6d2, 12 + dx * 1.1, 13.2, -3.4); lamp.castShadow = false; }
    for (let i = 0; i < 4; i++) cyl(p, 0.07, 0.9, 0x8f98a3, -12 + i * 0.8, 0.45, 4.4, 5);
  }
  function chiesa(p) {
    // San Paolo: a plain gabled front with strong cornices, one long nave, the little bell-sail with its metal
    // cross on the ridge and the slender bell tower on the left. The square in front is Piazza Don Camagni.
    box(p, 34, 0.3, 22, concrete, 0, 0.14, 8);
    for (let x = -14; x <= 14; x += 7) plate(p, x, 8, 0.3, 20, 0xa4a199, 0.3);
    box(p, 16, 9, 26, wall, 0, 4.5, -6);
    box(p, 17, 0.7, 27, 0xd6cdb9, 0, 9.3, -6);                       // cornice
    box(p, 16.6, 11.5, 1.6, wall, 0, 5.75, 6.6);                      // gabled front
    kit.roofTop(p, 17, 2.4, 11.5, 0xbdb4a2);
    p.children[p.children.length - 1].position.set(0, 12.7, 6.6);
    box(p, 17.4, 0.6, 2.2, 0xd6cdb9, 0, 11.6, 6.6);
    box(p, 3.6, 5.4, 0.5, 0x5a4230, 0, 2.7, 7.5);                     // door
    const window = mesh(p, new T.BoxGeometry(5.4, 2.4, 0.3), 0x9fc6d9, 0, 8.4, 7.5); window.castShadow = false;
    for (const x of [-6.4, 6.4]) box(p, 1.2, 1.8, 0.3, 0x9fc6d9, x, 7.4, 7.5);
    // Bell-sail on the ridge with a thin metal cross.
    box(p, 3.2, 2.6, 0.7, wall, 0, 12.6, -1);
    const bell = mesh(p, new T.BoxGeometry(1.4, 1.4, 0.4), 0x3d444c, 0, 12.8, -0.6); bell.castShadow = false;
    cyl(p, 0.09, 2.2, 0x8f98a3, 0, 15, -1, 6);
    box(p, 1.1, 0.12, 0.12, 0x8f98a3, 0, 15.5, -1);
    // Bell tower on the left side.
    box(p, 3.6, 22, 3.6, wall, -11, 11, 0);
    box(p, 4.2, 0.6, 4.2, 0xd6cdb9, -11, 22.3, 0);
    for (const z of [-1.85, 1.85]) box(p, 1.4, 2.6, 0.2, 0x3d444c, -11, 18, z);
    box(p, 1.4, 2.6, 0.2, 0x3d444c, -12.85, 18, 0);
    cone(p, 2.6, 3.4, 0xbdb4a2, -11, 24.2, 0, 8);
    cyl(p, 0.08, 1.6, 0x8f98a3, -11, 26.6, 0, 6);
    for (const [x, z] of [[-17, 12], [17, 12], [20, 0]]) kit.tree(p, x, z);
  }
  function auditorium(p) {
    // The low white hall with the big square pyramid roof you see from above.
    box(p, 26, 0.3, 22, concrete, 0, 0.14, 2);
    box(p, 22, 4.6, 18, 0xeceae2, 0, 2.3, 0);
    box(p, 23, 0.5, 19, 0xb9b6ad, 0, 4.85, 0);
    for (let x = -8; x <= 8; x += 4) { const pane = mesh(p, new T.BoxGeometry(2.6, 2.4, 0.2), 0x7fa4bd, x, 2.6, 9.1); pane.castShadow = false; }
    const roof = cone(p, 1, 6.4, 0xdcdad2, 0, 8.2, 0, 4);
    roof.rotation.y = Math.PI / 4; roof.scale.set(16, 1, 13); roof.castShadow = false;
    box(p, 3.2, 0.9, 3.2, 0x8f98a3, 0, 11.6, 0);
    box(p, 7, 2.8, 0.4, 0xeceae2, 0, 1.4, 9.4);
    box(p, 8, 0.3, 2.6, ORANGE, 0, 3.1, 10.4);
    for (const x of [-3.6, 3.6]) cyl(p, 0.16, 3, 0x8f98a3, x, 1.5, 11.4, 6);
    for (const [x, z] of [[-15, 8], [15, 9]]) kit.tree(p, x, z);
  }
  function nido(p) {
    // The nursery: a small bright building with a fenced garden and a slide.
    box(p, 16, 0.3, 12, 0xc9d3a8, 0, 0.14, 0);
    box(p, 11, 3.2, 8, 0xf2d18a, -1, 1.6, -1);
    kit.roofTop(p, 11.6, 8.6, 3.2, 0xd97b52);
    p.children[p.children.length - 1].position.set(-1, 4.8, -1);
    for (const x of [-4, 0, 4]) box(p, 1.4, 1.4, 0.2, 0x9fe8ec, x - 1, 1.9, 3.1);
    box(p, 1.4, 2.2, 0.3, 0x5a4230, 3.2, 1.1, 3.1);
    // Slide and a little fence.
    box(p, 2, 2.4, 2, 0x6fb2d9, 7, 1.2, 1);
    const slide = box(p, 1.6, 0.2, 4.4, 0xf5d343, 7, 1.4, 4); slide.rotation.x = 0.5;
    for (let x = -7; x <= 8; x += 1.6) cyl(p, 0.09, 1, 0x7fb069, x, 0.5, 5.6, 5);
    box(p, 16, 0.12, 0.12, 0x7fb069, 0, 1, 5.6);
    for (const [x, z] of [[-9, 2], [10, -3]]) kit.tree(p, x, z);
  }
  function palazzi(p) {
    // Three blocks of flats with red pitched roofs and balconies, like the row along the fields.
    for (let i = 0; i < 3; i++) {
      const x = -13 + i * 13, h = 10 + (i % 2) * 2.5;
      box(p, 11, h, 13, i % 2 ? 0xe6d9c2 : 0xdccdb4, x, h / 2, 0);
      box(p, 12, 0.6, 14, roofRed, x, h + 0.3, 0);
      kit.roofTop(p, 12, 14, h + 0.6, roofRed);
      p.children[p.children.length - 1].position.set(x, h + 2, 0);
      for (let row = 0; row < Math.floor(h / 3); row++) {
        for (const wx of [-3.2, 0, 3.2]) box(p, 1.2, 1.5, 0.2, glass, x + wx, 1.8 + row * 3, 6.6);
        box(p, 8.6, 0.16, 1.4, 0xcfcabd, x, 1.1 + row * 3, 7.2);
        for (let b = -4; b <= 4; b += 1.6) cyl(p, 0.07, 0.9, 0xcfcabd, x + b, 1.6 + row * 3, 7.8, 5);
      }
    }
    for (const [x, z] of [[-21, 9], [0, 10], [21, 9]]) kit.tree(p, x, z, true);
  }
  const builders = { campo, spogliatoi, chiesa, auditorium, nido, palazzi };
  const SIGN = { chiesa: 24, auditorium: 18, palazzi: 18, campo: 16, spogliatoi: 16, nido: 15 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11);

  // --- The two pitches, marked out with the line marker ---------------------------------------------------
  const fields = new T.Group(); fields.name = 'arca-campi'; scene.add(fields);
  for (const { x0, x1, z0, z1 } of PITCHES) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    plate(fields, cx, cz, w + 4, d + 4, pitchGreen, 0.02);
    for (const z of [z0, z1]) plate(fields, cx, z, w, 0.4, LINE);          // touchlines
    for (const x of [x0, x1]) plate(fields, x, cz, 0.4, d, LINE);          // goal lines
    plate(fields, cx, cz, 0.4, d, LINE);                                   // halfway line
    for (let i = 0; i < 26; i++) {                                         // centre circle
      const a = i / 26 * Math.PI * 2;
      plate(fields, cx + Math.cos(a) * 9, cz + Math.sin(a) * 9, 1.3, 0.4, LINE, 0.03, -a);
    }
    mesh(fields, new T.CylinderGeometry(0.45, 0.45, 0.06, 10), LINE, cx, 0.04, cz).castShadow = false;
    for (const side of [-1, 1]) {                                          // penalty areas
      const px = cx + side * (w / 2 - 8);
      plate(fields, px, cz, 0.4, 26, LINE);
      for (const z of [cz - 13, cz + 13]) plate(fields, px + side * 4, z, 8, 0.4, LINE);
      // Goal at the end of the pitch, facing along the field.
      const goal = new T.Group(); goal.position.set(cx + side * w / 2, 0, cz); fields.add(goal);
      for (const z of [-3.6, 3.6]) cyl(goal, 0.16, 3, LINE, 0, 1.5, z, 7);
      box(goal, 0.22, 0.22, 7.4, LINE, 0, 3, 0);
      for (let i = -3; i <= 3; i++) { const n = mesh(goal, new T.BoxGeometry(0.05, 3, 0.05), 0xd8dde0, side * -1.4, 1.5, i * 1.1); n.castShadow = false; }
    }
    for (const x of [x0, x1]) for (const z of [z0, z1]) {                   // corner flags
      cyl(fields, 0.06, 1.7, 0xf4f4ee, x, 0.85, z, 5);
      box(fields, 0.7, 0.45, 0.06, ORANGE, x + 0.35, 1.5, z);
    }
  }

  // --- The two goals the road runs through ----------------------------------------------------------------
  const roadPoint = (d, lane, y = 0) => { const f = track.frame(d); return new T.Vector3(f.x + f.dz * lane, y, f.z - f.dx * lane); };
  const gates = new T.Group(); gates.name = 'arca-porte'; scene.add(gates);
  for (const d of GOALS) {
    const f = track.frame(d);
    const goal = new T.Group();
    goal.position.set(f.x, 0, f.z); goal.rotation.y = Math.atan2(f.dx, f.dz); gates.add(goal);
    for (const x of [-9.2, 9.2]) { cyl(goal, 0.26, 6.2, LINE, x, 3.1, 0, 8); box(goal, 1.2, 0.4, 1.2, concrete, x, 0.2, 0); }
    box(goal, 18.9, 0.34, 0.34, LINE, 0, 6.2, 0);
    for (const x of [-9.2, 9.2]) { const stay = cyl(goal, 0.14, 4, LINE, x, 2.5, -1.8, 6); stay.rotation.x = 0.5; }
    // The net: a light grid hanging behind the frame, well above the cars.
    for (let x = -8.6; x <= 8.6; x += 1.2) { const n = mesh(goal, new T.BoxGeometry(0.06, 2.4, 0.06), 0xdfe4e7, x, 5, -1.1); n.castShadow = false; }
    for (let y = 4; y <= 6; y += 0.8) { const n = mesh(goal, new T.BoxGeometry(18, 0.06, 0.06), 0xdfe4e7, 0, y, -1.1); n.castShadow = false; }
    box(goal, 2.6, 0.9, 0.16, ORANGE, 0, 6.9, 0);
  }

  // --- Mud and puddles ------------------------------------------------------------------------------------
  const random = seeded(1907);
  const wet = new T.Group(); wet.name = 'arca-pozzanghere'; scene.add(wet);
  // On the road: puddles sit just above the tarmac ribbon so the cars splash through them.
  for (const [from, to] of [[150, 240], [392, 462]]) {
    for (let i = 0; i < 9; i++) {
      const d = from + (to - from) * (i + 0.5) / 9, lane = (random() - 0.5) * 9;
      const p = roadPoint(d, lane, 0.21);
      const puddle = mesh(wet, new T.CylinderGeometry(1, 1, 0.04, 12), WATER, p.x, p.y, p.z);
      puddle.scale.set(1.1 + random() * 1.4, 1, 0.8 + random());
      puddle.castShadow = false; puddle.receiveShadow = false;
    }
  }
  // On the grass: bigger puddles and churned mud, clear of the road and of the pitches.
  const roadLine = track.points(240);
  const roadGap = (x, z) => { let best = Infinity; for (const q of roadLine) { const g = Math.hypot(q.x - x, q.z - z); if (g < best) best = g; } return best; };
  for (let i = 0; i < 70; i++) {
    const x = (random() - 0.5) * 300, z = (random() - 0.5) * 200;
    const gap = roadGap(x, z);
    if (gap < 9 || gap > 46) continue;
    if (isReserved(track, layout, x, z)) continue;
    if (layout.landmarks.some((m) => Math.hypot(m.x - x, m.z - z) < (RESERVED[m.kind] || 23))) continue;
    const mud = random() < 0.45;
    const blob = mesh(wet, new T.CylinderGeometry(1, 1, 0.05, 11), mud ? MUD : WATER, x, 0.05, z);
    blob.scale.set(1.6 + random() * 3, 1, 1.2 + random() * 2.4);
    blob.rotation.y = random() * Math.PI;
    blob.castShadow = false;
  }
}
