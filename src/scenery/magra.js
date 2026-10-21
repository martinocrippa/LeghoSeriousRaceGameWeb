/**
 * The gulf of the Magra at sunset. The sea rolls along the southern edge with its umbrellas and moored boats,
 * the Magra itself cuts across the western half and passes under both bridges, motorboats run in and out of
 * the river mouth, the white quarries are cut into the hillside on the east with tunnels the road runs through,
 * and the ruins of Luni stand between them. Everything is a brick-toy caricature; placements are fictional.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 6;
export const RESERVED = { apuane: 150, cave: 52, monastero: 42, luni: 36, spiaggia: 36, porto: 30, village: 28 };

/** Distances where the road crosses the river (the two bridge bumps in src/tracks/magra.js). */
const RIVER = { from: 760, to: 1050, halfWidth: 15 };
/** The quarry tunnels, cut straight through the marble. */
const TUNNELS = [[372, 424], [452, 500]];
/** How far the sea reaches out from the shore, and the stretch of lap it runs along. */
const SHORE = { from: 10, to: 250 };

const MARBLE = 0xeef0ee, MARBLE_DARK = 0xcdd0cc, SEA = 0x2f6f8f, SAND = 0xe0cd9e, STONE = 0xc9b998;

const cache = new WeakMap();
function riverCentre(track) {
  if (cache.has(track)) return cache.get(track);
  const a = track.frame(RIVER.from), b = track.frame(RIVER.to);
  const along = (t, sway) => ({ x: a.x + (b.x - a.x) * t + sway, z: a.z + (b.z - a.z) * t });
  const centre = [
    { x: a.x + 70, z: a.z - 60 }, { x: a.x + 24, z: a.z - 22 }, { x: a.x, z: a.z },
    along(0.35, -16), along(0.65, 12), { x: b.x, z: b.z },
    { x: b.x - 26, z: b.z + 40 }, { x: b.x - 60, z: b.z + 96 },
  ];
  const curve = new THREE.CatmullRomCurve3(centre.map((p) => new THREE.Vector3(p.x, 0, p.z)), false);
  const points = curve.getPoints(70).map((p) => ({ x: p.x, z: p.z }));
  const banks = points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x, dz = next.z - prev.z, m = Math.hypot(dx, dz) || 1;
    return { ...p, nx: -dz / m, nz: dx / m };
  });
  cache.set(track, banks);
  return banks;
}

/** Trees and bricks keep out of the river and off the beach. */
export function isReserved(track, layout, x, z) {
  if (riverCentre(track).some((p) => Math.hypot(p.x - x, p.z - z) < RIVER.halfWidth + 8)) return true;
  const shore = track.frame((SHORE.from + SHORE.to) / 2);
  return z > shore.z + 6;
}

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, wood, darkWood, stone } = kit;
  const roadPoint = (d, lane, y = 0) => { const f = track.frame(d); return new T.Vector3(f.x + f.dz * lane, y, f.z - f.dx * lane); };
  const animated = [];

  // --- Landmarks ---------------------------------------------------------------------------------------
  function spiaggia(p) {
    // The beach: rows of umbrellas, deckchairs, a lifeguard's tower and a pedalo pulled up on the sand.
    const random = seeded(6060);
    box(p, 46, 0.3, 18, SAND, 0, 0.12, 4, false);
    for (let i = 0; i < 7; i++) {
      const x = -18 + i * 6, z = 2 + (i % 2) * 5;
      cyl(p, 0.11, 3, cream, x, 1.5, z, 6);
      const top = cone(p, 2.4, 0.9, i % 3 === 0 ? 0xd8542f : i % 3 === 1 ? 0xf4ecd8 : 0x3f7f9b, x, 3.2, z, 10);
      top.castShadow = false;
      for (const dx of [-1, 1]) { const chair = box(p, 1.7, 0.18, 0.7, cream, x + dx * 1.5, 0.45, z + 1.6); chair.rotation.x = -0.25; }
    }
    cyl(p, 0.16, 4.4, cream, 20, 2.2, 0, 6);
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) cyl(p, 0.14, 4, cream, 20 + dx, 2, dz, 5);
    box(p, 3.6, 1.6, 3.6, 0xf4ecd8, 20, 5, 0); kit.roofTop(p, 4, 4, 5.8, 0xd8542f);
    p.children[p.children.length - 1].position.set(20, 6.6, 0);
    const pedalo = box(p, 3.4, 0.9, 5.4, 0xf4ecd8, -22, 0.6, 6); pedalo.rotation.y = 0.4;
    for (let i = 0; i < 9; i++) mesh(p, new T.IcosahedronGeometry(0.3 + random() * 0.25, 0), 0xd6c8a2, (random() - 0.5) * 40, 0.25, 8 + random() * 6);
  }
  function cave(p) {
    // The marble quarries: white terraces cut into the mountain, blocks stacked on the yard, a loading crane.
    for (let i = 0; i < 5; i++) {
      const w = 44 - i * 6, h = 7;
      const terrace = box(p, w, h, 20 - i * 2, i % 2 ? MARBLE : MARBLE_DARK, 0, 2 + i * h * 0.8, -22 - i * 7, false);
      terrace.castShadow = false;
    }
    // The saw cuts: thin grey lines down the faces.
    for (let i = 0; i < 7; i++) box(p, 0.4, 26, 0.5, 0xa8ada8, -18 + i * 6, 14, -25, false);
    box(p, 38, 0.4, 16, MARBLE_DARK, 0, 0.2, -2, false);
    const random = seeded(1717);
    for (let i = 0; i < 12; i++) {
      const bx = -14 + (i % 6) * 5.6, bz = -5 + Math.floor(i / 6) * 5;
      box(p, 4.2, 2.8, 3.6, i % 3 ? MARBLE : 0xe4e6e2, bx, 1.4 + (i % 2) * 2.8, bz);
    }
    // Gantry crane over the yard.
    for (const x of [-17, 17]) cyl(p, 0.45, 14, 0x8a9198, x, 7, 3, 8);
    box(p, 37, 1, 1.4, 0x8a9198, 0, 14.4, 3);
    box(p, 2.6, 3.4, 2, 0xd8542f, 6, 12.3, 3);
    for (let i = 0; i < 4; i++) mesh(p, new T.IcosahedronGeometry(0.9 + random() * 1.1, 0), MARBLE, -15 + i * 10, 0.8, 5);
  }
  function apuane(p) {
    // The Apuan Alps behind, quarried white at the top where the marble is.
    const random = seeded(2929);
    for (let i = 0; i < 10; i++) {
      const x = -170 + i * 38 + (random() - 0.5) * 20, h = 100 + random() * 80, r = 36 + random() * 16;
      const peak = cone(p, r, h, i % 2 ? 0x8a8478 : 0x776f64, x, h / 2 - 8, -34 - random() * 60, 5);
      peak.rotation.y = random() * Math.PI; peak.castShadow = false;
      const cap = cone(p, r * 0.4, h * 0.34, MARBLE, x, h * 0.82 - 8, -34, 5);
      cap.rotation.y = peak.rotation.y; cap.castShadow = false;
      if (i % 2 === 0) { const cut = box(p, r * 0.8, 4, 7, MARBLE, x + r * 0.25, h * 0.55, -26, false); cut.castShadow = false; }
    }
    const base = mesh(p, new T.CylinderGeometry(190, 220, 18, 14), 0x5f6b44, 0, 2, -70); base.castShadow = false;
  }
  function luni(p) {
    // Luni: the broken colonnade, the paved forum, a stretch of the amphitheatre wall and fallen capitals.
    box(p, 44, 0.4, 28, STONE, 0, 0.2, 0, false);
    for (let i = 0; i < 6; i++) {
      const x = -16 + i * 6.4, h = [7, 5.5, 8, 3, 6.5, 4][i];
      cyl(p, 0.9, 0.7, 0xdcd2ba, x, 0.55, -5, 12);
      for (let d = 0; d < Math.round(h / 1.6); d++) cyl(p, 0.72, 1.6, 0xe6ddc6, x, 1.6 + d * 1.6, -5, 12);
      if (h > 6) { cyl(p, 0.95, 0.9, 0xdcd2ba, x, h + 1.2, -5, 12); box(p, 2.4, 0.6, 2.4, 0xdcd2ba, x, h + 2, -5); }
    }
    for (let i = 0; i < 5; i++) box(p, 3, 0.8, 3, 0xd3c9b0, -14 + i * 7, 0.7, 5, false);
    // A curved run of the amphitheatre.
    for (let i = 0; i < 11; i++) {
      const a = -1.1 + i * 0.22, r = 17;
      const wall = box(p, 3, 4.5 - Math.abs(i - 5) * 0.4, 1.6, 0xd8ccb0, Math.cos(a) * r, 2.2, -16 + Math.sin(a) * r, false);
      wall.rotation.y = -a;
    }
    const random = seeded(5454);
    for (let i = 0; i < 8; i++) {
      const drum = cyl(p, 0.7, 1.5, 0xe6ddc6, (random() - 0.5) * 34, 0.35, 6 + random() * 7, 12);
      drum.rotation.z = Math.PI / 2; drum.rotation.y = random() * 3;
    }
    for (const [x, z] of [[-20, 10], [20, 11]]) kit.cypress(p, x, z, 9);
  }
  function porto(p) {
    // The little harbour on the river: pontoons, moored boats and the fuel hut.
    box(p, 26, 0.3, 10, STONE, 0, 0.14, -2, false);
    for (const z of [2, 7]) { box(p, 22, 0.35, 2.4, wood, 0, 0.9, z); for (const x of [-9, 0, 9]) cyl(p, 0.22, 1.4, darkWood, x, 0.5, z, 6); }
    box(p, 4, 2.8, 3.4, 0xf4ecd8, -10, 1.4, -4); kit.roofTop(p, 4.4, 3.8, 2.8, 0xd8542f);
    p.children[p.children.length - 1].position.set(-10, 3.9, -4);
    for (let i = 0; i < 3; i++) {
      const boat = new T.Group(); boat.position.set(-6 + i * 7, 0.35, 9.5); boat.rotation.y = 0.12 * i; p.add(boat);
      const hull = mesh(boat, new T.SphereGeometry(1, 10, 6), [0xf4ecd8, 0xd8542f, 0x3f7f9b][i], 0, 0, 0);
      hull.scale.set(1.1, 0.45, 3);
      box(boat, 1.6, 0.8, 1.8, 0xe8e4d8, 0, 0.6, -0.6);
      cyl(boat, 0.07, 4, cream, 0, 2.2, 0, 5);
    }
    for (const x of [-12, 12]) kit.cypress(p, x, -6, 8);
  }
  function monastero(p) {
    // Santa Croce del Corvo: the Romanesque church and cloister on their headland above the river mouth.
    const knoll = mesh(p, new T.SphereGeometry(30, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f7a44, 0, -2, -10);
    knoll.scale.y = 0.45; knoll.castShadow = false;
    const top = new T.Group(); top.position.set(0, 11, -8); p.add(top);
    box(top, 13, 8, 20, 0xe4d9be, 0, 4, -2);
    box(top, 14, 0.7, 21, 0xd0c4a6, 0, 8.4, -2);
    box(top, 13.4, 10, 1.4, 0xece2c8, 0, 5, 8.2);
    kit.roofTop(top, 14, 2.2, 10, 0xa8654a);
    top.children[top.children.length - 1].position.set(0, 11.2, 8.2);
    box(top, 2.8, 4.6, 0.5, 0x6b4a32, 0, 2.3, 9);
    const rose = mesh(top, new T.CylinderGeometry(1.5, 1.5, 0.3, 16), 0x9fc6d9, 0, 7.4, 9); rose.rotation.x = Math.PI / 2;
    // Square bell tower with its paired windows.
    box(top, 4.2, 20, 4.2, 0xe4d9be, 9, 10, 2);
    box(top, 5, 0.6, 5, 0xd0c4a6, 9, 20.3, 2);
    cone(top, 3.2, 3.6, 0xa8654a, 9, 22.4, 2, 8);
    for (const y of [12, 16.5]) for (const z of [-0.1, 4.1]) box(top, 1.2, 2.2, 0.2, 0x3b4148, 9, y, z);
    // Cloister: a square of little arches round a garden.
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      cyl(top, 0.32, 3, 0xece2c8, -8 + side * 0, -1.5 + 0, 0, 8);
    }
    box(top, 16, 0.3, 14, 0xd9cdae, -13, -0.4, -6, false);
    for (let i = 0; i < 7; i++) for (const z of [-12, 0]) cyl(top, 0.3, 3, 0xece2c8, -20 + i * 2.4, 1.5, z, 8);
    for (const z of [-12, 0]) box(top, 17, 0.6, 1, 0xd0c4a6, -13, 3.3, z);
    mesh(top, new T.IcosahedronGeometry(1.8, 1), 0x4f7f3f, -13, 1, -6);
    const random = seeded(1176);
    for (let i = 0; i < 9; i++) {
      const a = random() * Math.PI * 2, r = 16 + random() * 12;
      kit.cypress(p, Math.cos(a) * r, -8 + Math.sin(a) * r * 0.7, 8 + random() * 4);
    }
  }
  const builders = { spiaggia, cave, apuane, luni, porto, monastero };
  const SIGN = { apuane: 120, cave: 34, monastero: 28, luni: 24, spiaggia: 24, porto: 14 };
  for (const item of layout.landmarks) {
    kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11, item.kind === 'apuane' ? 24 : 17);
  }

  // --- The sea, rolling along the shore --------------------------------------------------------------------
  const sea = new T.Group(); sea.name = 'magra-mare'; scene.add(sea);
  const shoreMid = track.frame((SHORE.from + SHORE.to) / 2);
  const water = mesh(sea, new T.BoxGeometry(620, 0.4, 420), SEA, shoreMid.x, 0.15, shoreMid.z + 220);
  water.castShadow = false; water.receiveShadow = true;
  // Rows of white crests that roll towards the beach: the sea is up today.
  for (let row = 0; row < 7; row++) {
    const crest = new T.Group();
    const out = 42 + row * 22;                       // how far out this row starts
    crest.position.set(shoreMid.x, 0.42, shoreMid.z + out);
    sea.add(crest);
    for (let i = 0; i < 11; i++) {
      const foam = box(crest, 34, 0.3, 1.5 + (i % 2), 0xf2f7f8, -170 + i * 34, 0, (i % 3) * 1.4, false);
      foam.castShadow = false;
    }
    kit.dynamic(crest);
    animated.push({ kind: 'crest', object: crest, base: crest.position.clone(), phase: row * 0.9, run: out - 16 });
  }

  // --- The Magra, its bridges and the motorboats -----------------------------------------------------------
  const banks = riverCentre(track);
  const band = (extra) => new T.Shape([
    ...banks.map((p) => new T.Vector2(p.x + p.nx * (RIVER.halfWidth + extra), -(p.z + p.nz * (RIVER.halfWidth + extra)))),
    ...[...banks].reverse().map((p) => new T.Vector2(p.x - p.nx * (RIVER.halfWidth + extra), -(p.z - p.nz * (RIVER.halfWidth + extra)))),
  ]);
  const shore = new T.Mesh(new T.ShapeGeometry(band(5)), new T.MeshStandardMaterial({ color: SAND, roughness: 0.95 }));
  shore.rotation.x = -Math.PI / 2; shore.position.y = 0.06; shore.receiveShadow = true; scene.add(shore);
  const river = new T.Mesh(new T.ShapeGeometry(band(0)), new T.MeshStandardMaterial({ color: 0x3d7f9b, roughness: 0.3, metalness: 0.06 }));
  river.rotation.x = -Math.PI / 2; river.position.y = 0.2; river.name = 'magra-fiume'; scene.add(river);
  // Iron railings on both bridges, plus the timber decking under them.
  for (const [at, span] of [[RIVER.from, 44], [RIVER.to, 48]]) {
    for (const side of [-1, 1]) {
      const rail = [];
      for (let i = 0; i <= 12; i++) {
        const d = at - span / 2 + (span * i) / 12;
        rail.push(roadPoint(d, side * 7.4, track.elevation(d) + 1.2));
      }
      mesh(scene, new T.TubeGeometry(new T.CatmullRomCurve3(rail), 24, 0.16, 5, false), 0x4a4f57).castShadow = false;
      for (let i = 0; i <= 12; i += 2) {
        const d = at - span / 2 + (span * i) / 12, y = track.elevation(d);
        const post = roadPoint(d, side * 7.4, y);
        cyl(scene, 0.12, 1.2, 0x4a4f57, post.x, y + 0.6, post.z, 5);
      }
    }
  }
  // Motorboats running in and out of the river mouth, leaving a wake behind them.
  function motorboat(colour) {
    const g = new T.Group();
    const hull = mesh(g, new T.SphereGeometry(1, 10, 6), colour, 0, 0.35, 0); hull.scale.set(1.1, 0.5, 3.4);
    box(g, 2, 0.18, 6.6, 0xf2efe4, 0, 0.72, 0);
    box(g, 1.7, 0.9, 2.2, 0xf2efe4, 0, 1.2, -0.6);
    box(g, 1.75, 0.5, 0.14, glass, 0, 1.5, 0.5);
    cyl(g, 0.07, 2.2, 0xdfe3e6, 0, 2.2, -1.4, 5);
    const wake = mesh(g, new T.BoxGeometry(3.4, 0.14, 7), 0xdff0f4, 0, 0.14, -5.2, false);
    wake.castShadow = false;
    return g;
  }
  [[0.12, 0xd8542f], [0.58, 0xf2efe4], [0.86, 0x3f7f9b]].forEach(([phase, colour], index) => {
    const boat = motorboat(colour);
    boat.name = 'magra-motoscafo';
    scene.add(boat);
    kit.dynamic(boat);
    animated.push({ kind: 'boat', object: boat, phase, speed: 0.055 + index * 0.012 });
  });

  // --- The quarry tunnels ----------------------------------------------------------------------------------
  const tunnels = new T.Group(); tunnels.name = 'magra-gallerie'; scene.add(tunnels);
  for (const [from, to] of TUNNELS) {
    for (let d = from; d <= to; d += 4.5) {
      const y = track.elevation(d);
      const mid = roadPoint(d, 0), a = roadPoint(d, -9), b = roadPoint(d, 9);
      for (const side of [-1, 1]) {
        const foot = roadPoint(d, side * 9);
        cyl(tunnels, 1.1, y + 13.6, MARBLE_DARK, foot.x, (y + 13.6) / 2, foot.z, 7);
      }
      // Ribs, not a lid: from the car they flick past overhead, and the chase camera still sees the road.
      const rib = mesh(tunnels, new T.BoxGeometry(20.4, 1.5, 2.4), MARBLE, mid.x, y + 14.2, mid.z);
      rib.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      rib.castShadow = false;
    }
    for (const [d, sign] of [[from, -1], [to, 1]]) {
      const f = track.frame(d), y = track.elevation(d);
      const mouth = new T.Group();
      mouth.position.set(f.x, y, f.z); mouth.rotation.y = Math.atan2(f.dx, f.dz); tunnels.add(mouth);
      box(mouth, 24, 2.6, 1.6, MARBLE, 0, 15.6, sign * 0.8);
      for (const x of [-10.4, 10.4]) box(mouth, 2.6, 15.6, 1.8, MARBLE, x, 7.8, sign * 0.8);
      const lamp = mesh(mouth, new T.SphereGeometry(0.34, 8, 6), 0xffe9a8, 0, 12.6, -sign * 1.4); lamp.castShadow = false;
    }
  }

  kit.animate((clock, dt) => {
    for (const item of animated) {
      if (item.kind === 'crest') {
        // The swell rolls in: each row travels towards the beach, then starts again further out.
        const travel = (clock * 5 + item.phase * 14) % item.run;
        item.object.position.z = item.base.z - travel;
        item.object.position.y = 0.42 + Math.sin(clock * 1.6 + item.phase) * 0.22;
        // The crest fades in out at sea and is gone before it would climb onto the sand.
        const alive = travel > 3 && travel < item.run - 3;
        for (const foam of item.object.children) foam.visible = alive;
        continue;
      }
      // Motorboats: up and down the river and out to sea, turning round at each end.
      const cycle = (clock * item.speed + item.phase) % 1;
      const t = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
      const index = Math.min(banks.length - 2, Math.floor(t * (banks.length - 1)));
      const here = banks[index], next = banks[index + 1];
      item.object.position.set(here.x, 0.3 + Math.sin(clock * 2.1 + item.phase * 6) * 0.12, here.z);
      const heading = Math.atan2(next.x - here.x, next.z - here.z);
      item.object.rotation.y = cycle < 0.5 ? heading : heading + Math.PI;
      item.object.rotation.z = Math.sin(clock * 1.7 + item.phase * 5) * 0.06;
    }
  });
}
