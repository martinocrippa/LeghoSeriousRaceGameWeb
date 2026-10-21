/**
 * Regnano Castello in summer: the ruined round-towered castle and the ruined Romanesque church on the ridge,
 * the stone borgo with two vaulted passages the road runs under, the chestnut woods below, the farmer's vegetable
 * garden, the donkey's corner, a tractor, and the marble-white Apuan Alps closing the horizon.
 * Everything is a brick-toy caricature; placements are fictional and do not follow the real lanes.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 0;
export const RESERVED = { apuane: 150, castello: 46, borgo: 40, chiesa: 36, belvedere: 30, castagneto: 30, orto: 26, asino: 24, trattore: 22 };

/** Where the road ducks under a vault between two houses, in the cobbled stretch of the borgo. */
const PASSAGES = [168, 236];

const STONE = 0x9a8f7d, STONE_DARK = 0x7b7160, ROOF = 0xa8503c, PLASTER = 0xe0d3b8, MARBLE = 0xeef0f2;

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, wood, darkWood, stone } = kit;

  /** Rubble stone wall with a ragged top: what is left of a ruin. */
  function ruinWall(p, x, y, z, w, h, d, tone = STONE) {
    box(p, w, h, d, tone, x, y + h / 2, z, false);
    const random = seeded(Math.round(Math.abs(x) * 31 + Math.abs(z) * 7) + 1);
    for (let i = 0; i < Math.max(2, Math.round(w / 1.2)); i++) {
      const bx = x - w / 2 + (i + 0.5) * (w / Math.max(2, Math.round(w / 1.2)));
      box(p, w / Math.max(2, Math.round(w / 1.2)) * 0.9, 0.3 + random() * 0.9, d * 0.95, tone, bx, y + h + 0.2, z, false);
    }
  }

  // --- Landmarks ---------------------------------------------------------------------------------------
  function castello(p) {
    // The castle: the round keep still standing to half its height, broken curtain walls, a gateway arch, all
    // on its rocky knoll. It is a ruin and stays a ruin.
    const knoll = mesh(p, new T.SphereGeometry(30, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f7a3a, 0, -1, -8);
    knoll.scale.y = 0.42; knoll.castShadow = false;
    const base = 10;
    cyl(p, 7, base + 9, STONE, -3, (base + 9) / 2, -10, 12);                 // the round keep
    cyl(p, 7.6, 1, STONE_DARK, -3, base + 9.4, -10, 12);
    for (let i = 0; i < 9; i++) {                                            // broken crenellations
      const a = i / 9 * Math.PI * 2;
      if (i % 3 === 2) continue;
      box(p, 1.5, 1.6 + (i % 2), 1.5, STONE, -3 + Math.cos(a) * 6.6, base + 10.6, -10 + Math.sin(a) * 6.6, false);
    }
    for (const y of [8, 13]) box(p, 1.1, 2, 0.4, 0x2b2f34, -3, y, -3.6);
    ruinWall(p, 10, 0, -2, 16, 7, 1.6);                                      // curtain walls, collapsing
    ruinWall(p, -16, 0, 2, 12, 5.4, 1.6);
    ruinWall(p, 2, 0, -20, 20, 4.2, 1.6);
    // The gateway: two jambs and a broken arch.
    for (const x of [-2, 4]) box(p, 1.6, 5.4, 1.8, STONE_DARK, x, 2.7, 6, false);
    const arch = mesh(p, new T.TorusGeometry(3, 0.8, 5, 10, Math.PI * 0.8), STONE_DARK, 1, 5.4, 6);
    arch.rotation.set(0, Math.PI / 2, 0.3); arch.castShadow = false;
    // Fallen blocks and the brambles that have taken over.
    const random = seeded(7321);
    for (let i = 0; i < 14; i++) {
      const a = random() * Math.PI * 2, r = 9 + random() * 13;
      mesh(p, new T.IcosahedronGeometry(0.5 + random() * 0.9, 0), STONE_DARK, Math.cos(a) * r, 0.5, -6 + Math.sin(a) * r);
    }
    for (const [x, z] of [[-18, -14], [16, -16], [-12, 10], [18, 8]]) kit.tree(p, x, z);
  }
  function borgo(p) {
    // The stone houses of the hamlet, packed tight on their terrace, with red roofs, wooden shutters,
    // outside staircases and a little chapel shrine at the corner.
    box(p, 40, 2.4, 22, STONE_DARK, 0, 1.2, -2, false);                       // the terrace they stand on
    const random = seeded(5150);
    const slots = [[-14, -6, 7.5], [-6, -2, 9], [3, -6, 8], [12, -3, 7], [-10, 4, 6.5], [7, 5, 7.5]];
    slots.forEach(([x, z, h], i) => {
      box(p, 8, h, 7.6, i % 3 === 1 ? PLASTER : STONE, x, 2.4 + h / 2, z);
      box(p, 9, 0.5, 8.6, ROOF, x, 2.4 + h + 0.25, z);
      kit.roofTop(p, 9, 8.6, 2.4 + h + 0.5, ROOF);
      p.children[p.children.length - 1].position.set(x, 2.4 + h + 1.6, z);
      for (let row = 0; row < Math.floor(h / 3); row++) for (const wx of [-2, 2]) {
        box(p, 1, 1.4, 0.2, 0x3b4148, x + wx, 4 + row * 3, z + 3.9);
        for (const s of [-1, 1]) box(p, 0.42, 1.4, 0.14, i % 2 ? 0x6f8f5a : 0x8a5a3a, x + wx + s * 0.72, 4 + row * 3, z + 4.05);
      }
      if (i % 2 === 0) for (let s = 0; s < 6; s++) box(p, 2.4, 0.4, 0.8, STONE_DARK, x + 5.4, 2.6 + s * 0.6, z + 2.6 - s * 0.7, false);
    });
    // Wayside shrine ("maestà") on the corner.
    box(p, 2, 3.4, 1.6, PLASTER, 18, 4.1, 6); kit.roofTop(p, 2.2, 1.8, 5.8, ROOF);
    p.children[p.children.length - 1].position.set(18, 6.4, 6);
    const niche = mesh(p, new T.BoxGeometry(1.1, 1.5, 0.2), 0x3b4148, 18, 4.4, 6.85); niche.castShadow = false;
    for (let i = 0; i < 5; i++) mesh(p, new T.IcosahedronGeometry(0.5 + random() * 0.4, 0), 0xc2653f, -19 + i * 1.4, 2.7, 9);
    for (const [x, z] of [[-22, 6], [22, -8]]) kit.tree(p, x, z);
  }
  function chiesa(p) {
    // The Romanesque church of the year 1000: nave walls open to the sky, the apse still curved,
    // the bell gable broken, a stone altar left inside.
    box(p, 20, 1.4, 14, STONE_DARK, 0, 0.7, 0, false);
    ruinWall(p, 0, 1.4, 5.4, 17, 6.5, 1.4);
    ruinWall(p, 0, 1.4, -5.4, 17, 4.4, 1.4);
    ruinWall(p, -8.4, 1.4, 0, 1.4, 8, 9.6);
    // The apse: a half cylinder still standing at the east end.
    const apse = mesh(p, new T.CylinderGeometry(4.6, 4.8, 6, 12, 1, true, -Math.PI / 2, Math.PI), STONE, 8.6, 4.4, 0);
    apse.castShadow = false;
    for (let i = 0; i < 5; i++) box(p, 1.2, 1 + i * 0.3, 1.2, STONE, 8.6 + Math.cos(-1.2 + i * 0.6) * 4.7, 7.6, Math.sin(-1.2 + i * 0.6) * 4.7, false);
    const slit = mesh(p, new T.BoxGeometry(0.5, 2, 0.4), 0x2b2f34, 12.9, 4.4, 0); slit.castShadow = false;
    // Broken bell gable over the west front.
    box(p, 4, 4, 1.2, STONE, -8.4, 11.4, 0, false);
    box(p, 1.4, 2, 0.5, 0x2b2f34, -8.4, 11.4, 0);
    // Doorway with its round arch, and the altar block inside.
    for (const z of [-1.6, 1.6]) box(p, 1.4, 4.4, 1.2, STONE_DARK, -8.4, 3.6, z, false);
    const door = mesh(p, new T.TorusGeometry(1.6, 0.6, 5, 10, Math.PI), STONE_DARK, -8.4, 5.8, 0);
    door.rotation.y = Math.PI / 2; door.castShadow = false;
    box(p, 2.6, 1.2, 1.6, STONE, 5, 2, 0);
    const random = seeded(1001);
    for (let i = 0; i < 12; i++) {
      const a = random() * Math.PI * 2, r = 9 + random() * 8;
      mesh(p, new T.IcosahedronGeometry(0.4 + random() * 0.7, 0), STONE_DARK, Math.cos(a) * r, 0.4, Math.sin(a) * r);
    }
    for (const [x, z] of [[-14, 9], [15, 10], [-15, -9]]) kit.tree(p, x, z);
  }
  function asino(p) {
    // The donkey's corner: the animal under its lean-to, a hay bale, the trough and a dry-stone wall.
    box(p, 12, 0.3, 9, 0xa8a086, 0, 0.14, 0, false);
    for (let x = -6; x <= 6; x += 1.5) box(p, 1.5, 1.5, 1, STONE, x, 0.9, -4.4, false);
    for (const [x, z] of [[-3.4, -2.4], [3.4, -2.4], [-3.4, 2], [3.4, 2]]) cyl(p, 0.16, 3, wood, x, 1.5, z, 6);
    box(p, 8.4, 0.3, 6, 0x8a5a3a, 0, 3.1, 0);
    // The donkey: grey body, lighter muzzle, long ears.
    const d = new T.Group(); d.position.set(0.5, 0, 1.5); p.add(d);
    box(d, 1.1, 1.3, 2.6, 0x8d8a85, 0, 1.5, 0);
    kit.legs(d, 0, 0, 1.1, 2.2, 0.9, 0x6f6c68);
    box(d, 0.8, 0.9, 0.9, 0x8d8a85, 0, 2.1, 1.5);
    box(d, 0.6, 0.5, 0.5, 0xd5d0c6, 0, 1.9, 1.95);
    for (const ex of [-0.28, 0.28]) { const ear = cyl(d, 0.12, 0.9, 0x8d8a85, ex, 2.8, 1.4, 5); ear.rotation.x = -0.2; }
    const tail = cyl(d, 0.08, 0.8, 0x6f6c68, 0, 1.9, -1.4, 5); tail.rotation.x = 0.5;
    cyl(p, 1, 1.2, 0xd8c273, -4.5, 0.6, 2.5, 10);
    box(p, 1.8, 0.7, 1, STONE_DARK, 3.6, 0.5, 3.2);
    for (const [x, z] of [[-9, 4], [9, -6]]) kit.tree(p, x, z);
  }
  function orto(p) {
    // the farmer's vegetable garden in a clearing: rows of beans on canes, a water butt, the hut and the scarecrow.
    box(p, 20, 0.25, 14, 0x6b563c, 0, 0.12, 0, false);
    const random = seeded(3113);
    for (let row = 0; row < 4; row++) {
      const z = -5 + row * 3.4;
      box(p, 17, 0.3, 1.6, 0x7a6144, 0, 0.3, z, false);
      for (let i = 0; i < 7; i++) {
        const x = -7.2 + i * 2.4;
        if (row % 2 === 0) { cyl(p, 0.05, 2.2, 0x9a8b5a, x, 1.1, z, 5); mesh(p, new T.IcosahedronGeometry(0.42, 0), 0x3f7a35, x, 1.9, z); }
        else mesh(p, new T.IcosahedronGeometry(0.5 + random() * 0.25, 0), row === 1 ? 0x4f8f3a : 0xc2453a, x, 0.7, z);
      }
    }
    box(p, 3.4, 3, 3, 0x8a6a4a, -11, 1.5, -3); kit.roofTop(p, 3.8, 3.4, 3, 0x6f6455);
    p.children[p.children.length - 1].position.set(-11, 4.2, -3);
    cyl(p, 1.1, 1.8, 0x4a5a52, 10, 0.9, -3, 10);
    // Scarecrow.
    cyl(p, 0.09, 3, wood, 8, 1.5, 3, 5); box(p, 2.2, 0.12, 0.12, wood, 8, 2.4, 3);
    box(p, 0.9, 1, 0.5, 0xc2653f, 8, 2.1, 3); mesh(p, new T.SphereGeometry(0.34, 8, 6), 0xd8c273, 8, 2.9, 3);
    cone(p, 0.6, 0.4, 0x6f6455, 8, 3.2, 3, 8);
    for (let x = -9; x <= 9; x += 2.2) cyl(p, 0.07, 1.1, wood, x, 0.55, 7.2, 5);
    for (const [x, z] of [[-13, 6], [13, 6]]) kit.tree(p, x, z);
  }
  function belvedere(p) {
    // The viewpoint over the valley: a low stone parapet, a bench, the panorama board and a lime tree.
    box(p, 16, 0.4, 7, 0xb0a894, 0, 0.2, 1, false);
    for (let x = -7.4; x <= 7.4; x += 1.6) box(p, 1.6, 1.1, 1, STONE, x, 0.9, 4.4, false);
    box(p, 16, 0.3, 1.2, STONE_DARK, 0, 1.55, 4.4, false);
    for (const x of [-4.4, 4.4]) { box(p, 0.4, 0.9, 1.4, STONE_DARK, x, 0.45, 0.4, false); }
    box(p, 10, 0.25, 1.4, wood, 0, 1, 0.4);
    box(p, 10, 1.1, 0.2, wood, 0, 1.6, -0.2);
    const board = box(p, 4.4, 2.4, 0.2, 0xe4dcc6, 6.4, 1.6, 2.4); board.rotation.x = -0.34;
    for (const x of [5.2, 7.6]) cyl(p, 0.12, 1.5, wood, x, 0.75, 2.6, 6);
    kit.tree(p, -9, -2, false);
    cyl(p, 0.11, 3.4, 0xf1ece0, 9, 1.7, -1, 6);
  }
  function apuane(p) {
    // The Apuan Alps: sharp marble peaks, white at the top where the quarries cut them.
    const random = seeded(4411);
    for (let i = 0; i < 9; i++) {
      const x = -150 + i * 38 + (random() - 0.5) * 20;
      const h = 90 + random() * 70, r = 34 + random() * 16;
      const peak = cone(p, r, h, i % 2 ? 0x8a94a1 : 0x7b8693, x, h / 2 - 6, -30 - random() * 50, 5);
      peak.rotation.y = random() * Math.PI; peak.castShadow = false;
      const cap = cone(p, r * 0.34, h * 0.3, MARBLE, x, h * 0.84 - 6, -30, 5);
      cap.rotation.y = peak.rotation.y; cap.castShadow = false;
      // A quarry scar: a pale terrace cut into the flank.
      if (i % 3 === 0) { const cut = box(p, r * 0.7, 3, 6, MARBLE, x + r * 0.3, h * 0.5, -22, false); cut.castShadow = false; }
    }
    const base = mesh(p, new T.CylinderGeometry(180, 210, 16, 14), 0x4f6b3a, 0, 2, -60); base.castShadow = false;
  }
  function trattore(p) {
    // A small orange tractor parked at the edge of the lane, with its trailer of chestnut baskets.
    const t = new T.Group(); t.position.set(0, 0, 0); p.add(t);
    box(t, 2.2, 1.4, 4, 0xd9621f, 0, 1.5, 0);
    box(t, 2, 1.6, 1.6, 0xd9621f, 0, 2.6, -0.6); box(t, 2.1, 0.25, 1.8, 0x2b2f34, 0, 3.5, -0.6);
    for (const x of [-0.85, 0.85]) box(t, 0.14, 1.1, 0.14, 0x2b2f34, x, 3, -1.4);
    box(t, 1, 0.6, 0.3, 0x2b2f34, 0, 2, 1.9);
    for (const [x, z, r] of [[-1.3, 1.4, 0.55], [1.3, 1.4, 0.55], [-1.45, -1.3, 1], [1.45, -1.3, 1]]) {
      const wheel = cyl(t, r, 0.45, 0x2b2f34, x, r, z, 12); wheel.rotation.z = Math.PI / 2;
      const rim = cyl(t, r * 0.5, 0.5, 0xd8d3c6, x, r, z, 10); rim.rotation.z = Math.PI / 2;
    }
    const trailer = new T.Group(); trailer.position.set(0, 0, -5.6); p.add(trailer);
    box(trailer, 2.4, 0.4, 4, wood, 0, 1, 0);
    for (const z of [-1.9, 1.9]) box(trailer, 2.4, 0.9, 0.2, wood, 0, 1.6, z);
    for (const x of [-1.15, 1.15]) box(trailer, 0.2, 0.9, 4, wood, x, 1.6, 0);
    for (const [x, z] of [[-0.6, -1], [0.6, -1], [0, 0.9]]) { cyl(trailer, 0.5, 0.7, 0xa9784c, x, 1.55, z, 9); mesh(trailer, new T.SphereGeometry(0.42, 8, 6), 0x5a3a24, x, 1.95, z); }
    for (const x of [-1.2, 1.2]) { const w = cyl(trailer, 0.5, 0.35, 0x2b2f34, x, 0.5, 0, 10); w.rotation.z = Math.PI / 2; }
    box(p, 6, 0.9, 0.9, STONE, 0, 0.45, 5, false);
  }
  function castagneto(p) {
    // An old chestnut grove: fat trunks, the drying hut and the spiky husks under the trees.
    const random = seeded(2024);
    for (let i = 0; i < 15; i++) {
      const a = random() * Math.PI * 2, r = 5 + random() * 17;
      const x = Math.cos(a) * r, z = -4 + Math.sin(a) * r * 0.8, h = 8 + random() * 3.5;
      cyl(p, 0.7, h * 0.5, 0x5c4531, x, h * 0.25, z, 7);
      for (const s of [-1, 1]) { const b = cyl(p, 0.24, h * 0.4, 0x5c4531, x + s, h * 0.45, z, 6); b.rotation.z = -s * 0.4; }
      const crown = mesh(p, new T.IcosahedronGeometry(h * 0.4, 1), random() < 0.5 ? 0x3f6b32 : 0x4f7d3a, x, h * 0.78, z);
      crown.scale.set(1.2, 0.85, 1.2);
    }
    box(p, 4, 3.4, 3.6, STONE, -12, 1.7, 4); kit.roofTop(p, 4.4, 4, 3.4, 0x6f6455);
    p.children[p.children.length - 1].position.set(-12, 5.1, 4);
    box(p, 1.2, 2, 0.3, 0x3b2f24, -12, 1, 5.9);
    for (let i = 0; i < 16; i++) {
      const a = random() * Math.PI * 2, r = 4 + random() * 16;
      mesh(p, new T.IcosahedronGeometry(0.4, 0), 0x8a9b3f, Math.cos(a) * r, 0.35, -4 + Math.sin(a) * r * 0.8);
    }
  }
  const builders = { castello, borgo, chiesa, asino, orto, belvedere, apuane, trattore, castagneto };
  const SIGN = { apuane: 120, castello: 30, borgo: 24, chiesa: 24, belvedere: 14, castagneto: 20, orto: 15, asino: 13, trattore: 12 };
  for (const item of layout.landmarks) {
    kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11, item.kind === 'apuane' ? 24 : 17);
  }

  // --- The two vaulted passages the road runs under -------------------------------------------------------
  const roadPoint = (d, lane, y = 0) => { const f = track.frame(d); return new T.Vector3(f.x + f.dz * lane, y, f.z - f.dx * lane); };
  const vaults = new T.Group(); vaults.name = 'regnano-volte'; scene.add(vaults);
  for (const d of PASSAGES) {
    const f = track.frame(d), y = track.elevation(d);
    const arch = new T.Group();
    arch.position.set(f.x, y, f.z); arch.rotation.y = Math.atan2(f.dx, f.dz); vaults.add(arch);
    // Two stone houses either side of the lane, joined overhead by a barrel vault.
    for (const side of [-1, 1]) {
      box(arch, 7, 8.6, 9, side > 0 ? STONE : PLASTER, side * 10.2, 4.3, 0);
      box(arch, 7.6, 0.5, 9.6, ROOF, side * 10.2, 8.85, 0);
      kit.roofTop(arch, 7.6, 9.6, 9.1, ROOF);
      arch.children[arch.children.length - 1].position.set(side * 10.2, 10.1, 0);
      for (const z of [-2.6, 2.6]) box(arch, 1, 1.4, 0.2, 0x3b4148, side * 6.75, 5, z);
    }
    // The room that bridges the lane: wide enough to actually sit on both houses.
    box(arch, 15, 2.6, 9, STONE, 0, 7.2, 0);
    box(arch, 15.6, 0.5, 9.6, ROOF, 0, 8.7, 0);
    for (const z of [-2.4, 2.4]) box(arch, 0.9, 1.2, 0.2, 0x3b4148, 0, 7.4, z);
    const vault = mesh(vaults, new T.TorusGeometry(6.9, 1.1, 6, 14, Math.PI), STONE_DARK, f.x, y + 5.9, f.z);
    vault.rotation.set(0, Math.atan2(f.dx, f.dz) + Math.PI / 2, 0); vault.castShadow = false;
    for (const side of [-1, 1]) {
      const jamb = roadPoint(d, side * 6.9, y);
      cyl(vaults, 0.7, 5.9, STONE_DARK, jamb.x, y + 2.95, jamb.z, 8);
    }
    const lamp = mesh(vaults, new T.SphereGeometry(0.3, 8, 6), 0xfff1b0, f.x, y + 5, f.z); lamp.castShadow = false;
    // Washing strung between the two houses, right over the lane: nothing says "alley" faster.
    const line = mesh(vaults, new T.CylinderGeometry(0.05, 0.05, 13.4, 5), 0x6a6152, f.x, y + 6.6, f.z);
    line.rotation.set(0, Math.atan2(f.dx, f.dz), Math.PI / 2); line.castShadow = false;
    const sheets = seeded(9310 + d);
    for (let i = 0; i < 6; i += 1) {
      const at = roadPoint(d, -5.4 + i * 2.1, y);
      const sheet = mesh(vaults, new T.PlaneGeometry(1.5, 1.7 + sheets() * 0.8),
        [0xf4f0e2, 0xe6d7af, 0x9fc2d8, 0xe0a8a0][i % 4], at.x, y + 5.7, at.z);
      sheet.rotation.y = Math.atan2(f.dx, f.dz) + Math.PI / 2;
      sheet.material.side = T.DoubleSide; sheet.castShadow = false;
    }
  }

  // --- The alley itself: dry-stone walls, torches and a well line the cobbled stretch ---------------------
  // The cobbles run from 140 to 320 m (see src/tracks/regnano.js). Walls just outside the racing lanes are what
  // makes a 12 m road read as a medieval lane; they stay clear of the test's roadWidth/2 + 1 keep-out.
  const alley = new T.Group(); alley.name = 'regnano-vicolo'; scene.add(alley);
  const wallRandom = seeded(7711);
  for (let d = 146; d <= 316; d += 7) {
    if (PASSAGES.some((passage) => Math.abs(d - passage) < 12)) continue; // the vault houses already fill these
    const y = track.elevation(d);
    for (const side of [-1, 1]) {
      const at = roadPoint(d, side * 8.6, y);
      const height = 1.8 + wallRandom() * 1.6;
      // 1.4 across the lane, 6.6 along it: the rotation below points local +Z down the road.
      const wall = box(alley, 1.4, height, 6.6, wallRandom() > 0.5 ? STONE : STONE_DARK, at.x, y + height / 2, at.z);
      wall.rotation.y = Math.atan2(track.frame(d).dx, track.frame(d).dz);
      if (wallRandom() > 0.72) {
        // A torch on a bracket, the way the hamlet is lit on a summer evening.
        const torch = mesh(alley, new T.CylinderGeometry(0.09, 0.09, 1.1, 5), 0x4a3a28, at.x, y + height + 0.55, at.z);
        torch.castShadow = false;
        const flame = mesh(alley, new T.IcosahedronGeometry(0.3, 0),
          0xffb03a, at.x, y + height + 1.25, at.z);
        flame.castShadow = false;
      }
    }
  }
  // The village well, on the wide corner by the church.
  const wellAt = roadPoint(288, -13, track.elevation(288));
  const well = new T.Group(); well.name = 'regnano-pozzo'; well.position.copy(wellAt); alley.add(well);
  cyl(well, 2.1, 1.6, STONE, 0, 0.8, 0, 12);
  cyl(well, 2.2, 0.25, STONE_DARK, 0, 1.7, 0, 12);
  for (const x of [-1.9, 1.9]) cyl(well, 0.16, 3.4, 0x4a3a28, x, 3.1, 0, 6);
  box(well, 4.6, 0.3, 2.4, ROOF, 0, 4.9, 0);
  kit.roofTop(well, 4.6, 2.4, 5, ROOF);
  well.children[well.children.length - 1].position.set(0, 5.6, 0);
  cyl(well, 0.08, 4, 0x4a3a28, 0, 4.4, 0, 5).rotation.z = Math.PI / 2;
  box(well, 1, 1.1, 1, 0x6a5a42, 0, 3.4, 0);
}
