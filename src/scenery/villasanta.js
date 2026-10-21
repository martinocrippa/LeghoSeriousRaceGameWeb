/**
 * Villasanta scenery: the cobbled church square, the little houses, the Porta di Villasanta gate into the wooded
 * Parco di Monza, an old grandstand watching the banked "sopraelevata", the industrial sheds with a striped
 * smokestack and the red-and-white Monza stadium. Toy caricatures; placements are fictional.
 */
import * as THREE from 'three';

export const streetHouses = 18;
export const RESERVED = { porta: 30, sopraelevata: 30, industrial: 44, stadiomonza: 46 };

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, green } = kit;
  const red = 0xe0503c, white = 0xf4f0e2, stone = 0xd9cfbf, iron = 0x3a3f45, cobble = 0x8d8983, shed = 0x9fb3c4, shedDark = 0x6f8494;

  function church(p, item) {
    // The parish church with its square: cobbles, a fountain, café umbrellas and lamps.
    const square = box(p, 34, 0.18, 26, cobble, 0, 0.08, 1); square.receiveShadow = true;
    kit.builders.church(p);
    cyl(p, 2.6, 0.5, stone, -10, 0.45, 8, 20); cyl(p, 2.2, 0.15, 0x68cbd4, -10, 0.75, 8, 20); cyl(p, 0.35, 2.2, stone, -10, 1.6, 8, 8); mesh(p, new T.SphereGeometry(0.55, 10, 7), 0x9ae8ed, -10, 2.9, 8);
    for (let i = 0; i < 3; i++) { const x = 11 + i * 3.4; cyl(p, 0.08, 2.4, cream, x, 1.2, 9, 5); cone(p, 1.5, 0.9, i % 2 ? red : white, x, 2.7, 9, 10); box(p, 1.2, 0.1, 1.2, 0x6b4a2f, x, 0.8, 9); }
    for (const x of [-15, 15]) kit.lamp(p, x, 11, 4);
  }
  function porta(p) {
    // Porta di Villasanta: two stone pillars with urns, iron gates, park wall and the woods behind.
    box(p, 44, 0.2, 14, 0xb5ad9c, 0, 0.08, -2);
    for (const x of [-4.5, 4.5]) { box(p, 2.2, 7, 2.2, stone, x, 3.5, 4); box(p, 2.8, 0.5, 2.8, stone, x, 7.25, 4); mesh(p, new T.SphereGeometry(0.9, 10, 7), stone, x, 8.4, 4); }
    for (let x = -3.2; x <= 3.2; x += 0.8) box(p, 0.12, 5.2, 0.12, iron, x, 2.6, 4);
    box(p, 7, 0.16, 0.16, iron, 0, 5.2, 4); box(p, 7, 0.16, 0.16, iron, 0, 1.2, 4);
    for (const side of [-1, 1]) { box(p, 14, 3.2, 1, stone, side * 13, 1.6, 4); box(p, 14.4, 0.4, 1.3, 0xc9bfae, side * 13, 3.4, 4); }
    for (const [x, z] of [[-16, -3], [-9, -6], [-2, -4], [6, -6], [13, -3], [18, -5], [-19, -8], [0, -9], [10, -9]]) kit.tree(p, x, z, true);
    kit.lamp(p, -8, 7, 4.2); kit.lamp(p, 8, 7, 4.2);
  }
  function sopraelevata(p) {
    // Old grandstand facing the banked bend, with a scoreboard, a checkered flag and a few spectators.
    box(p, 30, 0.2, 14, 0xb5ad9c, 0, 0.08, 0);
    for (let tier = 0; tier < 3; tier++) box(p, 26, 1.4, 2.6, tier % 2 ? 0xa8a29a : 0xbfb9b0, 0, 0.7 + tier * 1.4, 2 - tier * 2.6);
    box(p, 26, 5, 0.6, 0x8d9299, 0, 5.4, -5);
    box(p, 28, 0.4, 10, 0x5a5f66, 0, 7.4, -1).castShadow = false;
    for (const x of [-12, 0, 12]) box(p, 0.4, 7.2, 0.4, 0x8d9299, x, 3.6, -5);
    const colors = [red, white, 0x1e5bd8, 0xffd766];
    for (let i = 0; i < 18; i++) { const tier = i % 3; box(p, 0.8, 1.2, 0.6, colors[i % colors.length], -11 + (i * 1.45) % 24, 1.4 + tier * 1.4 + 0.6, 2 - tier * 2.6); }
    box(p, 10, 3, 0.4, 0x14161d, 0, 9.8, -1); for (let i = 0; i < 4; i++) box(p, 1.6, 1, 0.1, i % 2 ? 0xff7a12 : white, -3.6 + i * 2.4, 9.8, -0.75);
    cyl(p, 0.08, 6, cream, 14, 3, 6, 5); for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) box(p, 0.5, 0.5, 0.06, (r + c) % 2 ? 0x14161d : white, 14.3 + c * 0.5, 5.6 - r * 0.5, 6);
  }
  function industrial(p) {
    // Three sheds with saw-tooth skylights and roller doors, a banded smokestack, a lorry at the loading bay.
    box(p, 64, 0.2, 40, 0xa9a49a, 0, 0.08, -4);
    for (let i = 0; i < 3; i++) {
      const x = -22 + i * 22, w = 18, h = 7 + (i % 2) * 1.5;
      box(p, w, h, 16, i % 2 ? shed : 0xc4ccd4, x, h / 2, -8);
      for (let k = 0; k < 4; k++) { const sky = box(p, w, 1.4, 1.6, shedDark, x, h + 0.7, -14 + k * 4); sky.rotation.x = 0.5; }
      box(p, 4.5, 4, 0.3, shedDark, x - 4, 2, 0.1); box(p, 4.5, 4, 0.3, 0x3a3f45, x + 4, 2, 0.1);
      box(p, w * 0.9, 0.5, 0.2, red, x, h - 0.6, 0.15);
    }
    cyl(p, 1.3, 24, 0x9a4a3a, 30, 12, -14, 12); for (let y = 4; y < 24; y += 5) cyl(p, 1.35, 1.2, white, 30, y, -14, 12);
    box(p, 8, 2.8, 2.6, 0x1e5bd8, -14, 1.9, 6); box(p, 2.6, 2.6, 2.6, white, -19.4, 1.8, 6); for (const x of [-17, -12]) for (const z of [5, 7]) cyl(p, 0.6, 0.5, 0x14161d, x, 0.6, z, 8).rotation.x = Math.PI / 2;
    for (let x = -30; x <= 30; x += 3) box(p, 0.12, 1.6, 0.12, 0x8d9299, x, 0.8, 11); box(p, 60, 0.08, 0.08, 0x8d9299, 0, 1.5, 11);
    for (const x of [-30, 30]) kit.tree(p, x, 8, false);
  }
  function stadiomonza(p) {
    // The Monza stadium in red and white: four stands round a pitch, floodlights, banners.
    box(p, 60, 0.2, 46, 0x7a7f88, 0, 0.08, 0);
    box(p, 34, 0.12, 22, 0x2f8f3c, 0, 0.24, 0); for (const z of [-10.8, 10.8]) box(p, 34, 0.06, 0.3, white, 0, 0.32, z); for (const x of [-16.8, 0, 16.8]) box(p, 0.3, 0.06, 22, white, x, 0.32, 0);
    const ring = mesh(p, new T.RingGeometry(2.6, 2.9, 24), white, 0, 0.33, 0); ring.rotation.x = -Math.PI / 2;
    for (const [x, z, w, d] of [[0, -16.5, 50, 8], [0, 16.5, 50, 8], [-24, 0, 8, 26], [24, 0, 8, 26]]) {
      box(p, w, 3.2, d, red, x, 1.6, z); box(p, w * 0.92, 3, d * 0.92, white, x, 4.6, z); box(p, w * 0.84, 2.6, d * 0.84, red, x, 7.4, z);
    }
    box(p, 52, 0.4, 10, 0x5a5f66, 0, 10.2, -16.5).castShadow = false; for (let x = -22; x <= 22; x += 8.8) box(p, 0.5, 4, 0.5, 0x8d9299, x, 8.2, -21);
    for (const [x, z] of [[-29, -21], [29, -21], [-29, 21], [29, 21]]) { cyl(p, 0.35, 20, 0x8d9299, x, 10, z, 6); box(p, 3.2, 1.4, 0.6, kit.lampGlow, x, 20.6, z).castShadow = false; }
    for (let i = 0; i < 11; i++) box(p, 3.6, 1.6, 0.25, i % 2 ? red : white, -20 + i * 4, 9.4, 16.6);
    box(p, 14, 3, 0.4, 0x14161d, 0, 12.4, -17); for (let i = 0; i < 5; i++) box(p, 1.6, 1, 0.1, i % 2 ? red : white, -4.8 + i * 2.4, 12.4, -16.75);
  }
  const builders = { church, porta, sopraelevata, industrial, stadiomonza, home: kit.builders.home, villa: kit.builders.villa };
  const SIGN = { church: 14, porta: 12, sopraelevata: 9, industrial: 22, stadiomonza: 25 };
  const WIDTH = { industrial: 20, stadiomonza: 20 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind], SIGN[item.kind] ?? 11, WIDTH[item.kind] ?? 17);

  // --- Parco di Monza: dense woods on both sides between the gate and the end of the banking, wall pieces outside ---
  const road = track.points(400);
  const clearOfLandmarks = (x, z) => layout.landmarks.every((l) => Math.hypot(l.x - x, l.z - z) > (RESERVED[l.kind] || 23) + 2);
  let seed = 5;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let d = 262; d <= 430; d += 5.5) {
    for (const side of [-1, 1]) {
      const lane = side * (track.roadWidth / 2 + 10 + random() * 12);
      const f = track.frame(d);
      const x = f.x + f.dz * lane, z = f.z - f.dx * lane;
      if (!clearOfLandmarks(x, z)) continue;
      if (road.some((p) => Math.hypot(p.x - x, p.z - z) < track.roadWidth / 2 + 4)) continue;
      kit.tree(scene, x, z, random() < 0.6);
    }
  }
  const wallMat = stone;
  for (const [from, to] of [[258, 296], [396, 432]]) {
    for (let d = from; d < to; d += 6) {
      const f = track.frame(d + 3);
      const lane = track.roadWidth / 2 + 4.2;
      const wall = box(scene, 6, 2.6, 0.9, wallMat, f.x + f.dz * lane, 1.3, f.z - f.dx * lane);
      wall.rotation.y = Math.atan2(f.dx, f.dz);
    }
  }
  // Cobbled square's lamps along the centre stretch.
  for (let d = 24; d <= 126; d += 17) { const f = track.frame(d); const lane = track.roadWidth / 2 + 3.6; kit.lamp(scene, f.x + f.dz * lane, f.z - f.dx * lane, 4.4); }
}
