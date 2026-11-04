/**
 * The Adda valley in autumn. The river is a band of water down the middle of the loop, entering under the
 * little wooden bridge at the north crossing and leaving under the Ponte San Michele at the south one.
 * Extras: Leonardo's cable ferry shuttling across the water on its own, the covered gallery over the descent
 * from Calusco, the iron arch of the Ponte San Michele with the railway deck underneath (a train really does
 * pass below the cars) and poplars and reeds along both banks.
 * Everything is a brick-toy caricature; placements are fictional and do not follow the real roads.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 10;
export const RESERVED = { madonnadelbosco: 54, cementificio: 42, galleria: 30, traghetto: 28, castagneto: 28, belvedere: 22, village: 26 };

/** Distances along the lap where the road crosses the water (the two bridge bumps in src/tracks/adda.js). */
const NORTH_CROSSING = 286, SOUTH_CROSSING = 690, HALF_WIDTH = 18;

const cache = new WeakMap();

/** The river centre line with a unit normal at each sample: north of the first crossing, down the middle of
 *  the loop, south of the second, so it leaves the circuit at both ends and never touches the road elsewhere. */
function riverCentre(track) {
  if (cache.has(track)) return cache.get(track);
  const a = track.frame(NORTH_CROSSING), b = track.frame(SOUTH_CROSSING);
  const along = (t, sway) => ({ x: a.x + (b.x - a.x) * t + sway, z: a.z + (b.z - a.z) * t });
  const centre = [
    { x: a.x + 8, z: a.z - 150 }, { x: a.x + 3, z: a.z - 70 }, { x: a.x, z: a.z },
    along(0.22, -11), along(0.45, 7), along(0.7, -9), { x: b.x, z: b.z },
    { x: b.x - 3, z: b.z + 70 }, { x: b.x + 6, z: b.z + 150 },
  ];
  const curve = new THREE.CatmullRomCurve3(centre.map((p) => new THREE.Vector3(p.x, 0, p.z)), false);
  const points = curve.getPoints(90).map((p) => ({ x: p.x, z: p.z }));
  const banks = points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x, dz = next.z - prev.z, m = Math.hypot(dx, dz) || 1;
    return { ...p, nx: -dz / m, nz: dx / m };
  });
  cache.set(track, banks);
  return banks;
}

/** Trees, bricks and street houses stay out of the water and off the gravel banks. */
export function isReserved(track, layout, x, z) {
  return riverCentre(track).some((p) => Math.hypot(p.x - x, p.z - z) < HALF_WIDTH + 9);
}

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh, cream, glass, wood, darkWood, stone } = kit;
  const rust = 0xc4622a, amber = 0xe0a33a, iron = 0x4a4f57, concrete = 0x9aa0a4, gold = 0xe8bf4a,
    water = 0x4d7f9c, gravel = 0xc3bba6, moss = 0x6f8a45;

  /** A chestnut: fat trunk, two low boughs and a wide crown, with a couple of burrs still on it. */
  function chestnut(parent, x, z, height, random) {
    const trunk = cyl(parent, 0.62, height * 0.55, 0x6a4a33, x, height * 0.27, z, 7);
    for (const side of [-1, 1]) {
      const bough = cyl(parent, 0.26, height * 0.45, 0x6a4a33, x + side * 0.9, height * 0.5, z, 6);
      bough.rotation.z = -side * 0.42;
    }
    const tone = [rust, amber, 0xb5473a, 0xd08a2c][Math.floor(random() * 4)];
    const crown = mesh(parent, new THREE.IcosahedronGeometry(height * 0.42, 1), tone, x, height * 0.82, z);
    crown.scale.set(1.25, 0.82, 1.25);
    for (let i = 0; i < 3; i++) {
      const a = random() * Math.PI * 2, r = height * 0.34;
      mesh(parent, new THREE.IcosahedronGeometry(0.42, 0), 0x8a9b3f, x + Math.cos(a) * r, height * 0.72, z + Math.sin(a) * r);
    }
  }

  // --- Landmarks ---------------------------------------------------------------------------------------
  function cementificio(p) {
    // Calusco's cement works: the long shed, four silos, the conveyor and the chimney you see from everywhere.
    box(p, 34, 0.3, 24, concrete, 0, 0.12, 0);
    box(p, 26, 9, 12, 0xd8d3c6, 0, 4.5, 6); box(p, 27, 0.6, 13, 0x8d8579, 0, 9.2, 6);
    for (let i = 0; i < 6; i++) box(p, 2.4, 2.6, 0.2, glass, -10 + i * 4, 4.4, 12.1);
    for (let i = 0; i < 4; i++) { const x = -9 + i * 6; cyl(p, 2.6, 18, 0xe4dfd2, x, 9, -6, 14); cyl(p, 2.9, 1, 0x8d8579, x, 18.2, -6, 14); cone(p, 2.9, 2.4, 0xb9b2a2, x, 19.9, -6, 14); }
    const belt = box(p, 1.8, 0.5, 22, 0x7e8489, 4, 11, 1); belt.rotation.x = -0.34;
    for (const z of [-4, 4]) cyl(p, 0.3, 9, iron, 4, 4.5, z, 6);
    // The chimney: red and white bands, a wisp of steam on top.
    const stack = new THREE.Group(); stack.position.set(-16, 0, -10); p.add(stack);
    for (let i = 0; i < 7; i++) cyl(stack, 2.1 - i * 0.12, 5, i % 2 ? 0xd94141 : 0xf1ece0, 0, 2.5 + i * 5, 0, 14);
    cyl(stack, 1.4, 1.2, iron, 0, 36, 0, 14);
    for (let i = 0; i < 4; i++) { const puff = mesh(stack, new THREE.IcosahedronGeometry(2.2 + i * 0.7, 0), 0xf4f4f0, (i % 2 ? 1 : -1) * i * 1.4, 38.5 + i * 3, i * 0.8); puff.castShadow = false; }
  }
  function galleria(p) {
    // The wooded rock spur the covered gallery is cut into, with its retaining wall along the road.
    for (const [x, z, r, h] of [[-12, -6, 9, 15], [2, -10, 11, 19], [15, -4, 8, 13], [-3, 2, 7, 11]]) {
      const rock = cone(p, r, h, 0x8e8a80, x, h / 2 - 1, z, 6); rock.castShadow = false; rock.rotation.y = x * 0.3;
    }
    box(p, 34, 5, 1.4, 0xa39c8e, 0, 2.5, 9); for (let x = -15; x <= 15; x += 5) box(p, 1.1, 5.6, 0.5, 0x8d8579, x, 2.8, 9.5);
    for (const [x, z] of [[-14, -2], [-4, -8], [8, -6], [16, 2]]) kit.tree(p, x, z, true);
  }
  function traghetto(p) {
    // The Imbersago landing: the wooden pier, the slipway and the mast that carries the ferry's cable.
    box(p, 16, 0.3, 10, gravel, 0, 0.12, 2);
    const pier = box(p, 4.5, 0.4, 13, wood, -4, 0.85, -6); pier.rotation.x = 0.05;
    for (const z of [-11, -6, -1]) for (const x of [-5.8, -2.2]) cyl(p, 0.28, 1.6, darkWood, x, 0.6, z, 6);
    const slipway = box(p, 6, 0.35, 11, 0xbdb5a2, 5, 0.9, -6); slipway.rotation.x = 0.12;
    box(p, 3.2, 2.6, 2.6, cream, -9, 1.6, 4); kit.roofTop(p, 3.6, 3, 4.2);
    p.children[p.children.length - 1].position.set(-9, 5.4, 4);
    cyl(p, 0.34, 9, darkWood, 8, 4.5, 0, 7); box(p, 2.2, 0.35, 0.35, iron, 8, 8.8, 0);
    for (const [x, z] of [[-13, -8], [12, -10], [14, 6]]) kit.cypress(p, x, z, 9);
  }
  function madonnadelbosco(p) {
    // The wooded hill above the straight, the sanctuary on top with its golden Madonna, the sacred stairway
    // down through the trees and two gilded statues of Pope John XXIII (Roncalli) watching over it.
    const hill = mesh(p, new THREE.SphereGeometry(34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f7a3f, 0, -2, -12);
    hill.scale.y = 0.62; hill.castShadow = false;
    const shoulder = mesh(p, new THREE.SphereGeometry(20, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x6b8447, -26, -2, 4);
    shoulder.scale.y = 0.5; shoulder.castShadow = false;
    // Sanctuary: baroque front, nave, dome and bell tower on the flattened top.
    const top = new THREE.Group(); top.position.set(0, 18.5, -12); p.add(top);
    cyl(top, 15, 1.4, 0xd9cfb6, 0, -0.5, 0, 16);
    box(top, 12, 8, 16, 0xf2e6cd, 0, 4, -2); box(top, 13, 0.7, 17, 0xe0d3b4, 0, 8.4, -2);
    box(top, 13, 10, 1.6, 0xf7eeda, 0, 5, 6.6); kit.roofTop(top, 13.6, 2.4, 10, 0xb9553f);
    top.children[top.children.length - 1].position.set(0, 11.2, 6.6);
    for (const x of [-4, 4]) box(top, 1.3, 9, 1.3, 0xe8dcc0, x, 4.5, 7.3);
    box(top, 2.6, 4.6, 0.4, 0x7a5236, 0, 2.3, 7.5);
    const rose = mesh(top, new THREE.CylinderGeometry(1.5, 1.5, 0.3, 18), 0x8fb3d9, 0, 7, 7.5); rose.rotation.x = Math.PI / 2;
    cyl(top, 4.4, 3, 0xf2e6cd, 0, 9.4, -6, 16);
    const dome = mesh(top, new THREE.SphereGeometry(4.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f8f6f, 0, 10.6, -6); dome.castShadow = false;
    cyl(top, 0.45, 2, cream, 0, 15.8, -6, 8);
    // The golden Madonna standing on the very top of the church.
    const madonna = new THREE.Group(); madonna.position.set(0, 16.8, -6); top.add(madonna);
    cone(madonna, 1.35, 4.2, gold, 0, 2.1, 0, 10); mesh(madonna, new THREE.SphereGeometry(0.72, 10, 8), gold, 0, 4.6, 0);
    const halo = mesh(madonna, new THREE.TorusGeometry(1.05, 0.13, 6, 16), gold, 0, 4.9, -0.3); halo.rotation.x = Math.PI / 2; halo.castShadow = false;
    for (const s of [-1, 1]) { const arm = cyl(madonna, 0.24, 2.4, gold, s * 1.15, 2.6, 0.35, 6); arm.rotation.z = s * 0.7; }
    // Bell tower.
    box(top, 3.4, 20, 3.4, 0xe8dcc0, 9, 10, -4); box(top, 4.2, 0.6, 4.2, cream, 9, 20.3, -4);
    cone(top, 2.8, 5, 0xb9553f, 9, 23, -4, 8);
    for (const y of [12, 16.5]) for (const z of [-2.35, -5.65]) box(top, 1.1, 2, 0.2, 0x4a3a30, 9, y, z);
    // The sacred stairway: steps down the hillside toward the road, with lamp posts every few flights.
    for (let i = 0; i < 24; i++) {
      const t = i / 23, y = 18.2 - t * 17.4, z = 2 + t * 22;
      box(p, 7 - t * 1.4, 0.6, 1.1, 0xe3d9c2, 0, y, z);
      if (i % 6 === 3) for (const x of [-3.6, 3.6]) cyl(p, 0.16, 2.4, stone, x, y + 1.2, z, 6);
    }
    // Two gilded statues of Pope Roncalli: one at the top of the stairway, one at its foot by the road.
    const roncalli = (x, y, z, scale) => {
      const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); g.rotation.y = Math.PI; p.add(g);
      box(g, 2.6, 1.8, 2.6, 0xcfc6ae, 0, 0.9, 0); box(g, 2.1, 0.5, 2.1, 0xe3d9c2, 0, 2, 0);
      cone(g, 1.15, 3.6, gold, 0, 4.1, 0, 10); mesh(g, new THREE.SphereGeometry(0.62, 10, 8), gold, 0, 6.2, 0);
      cone(g, 0.5, 1.4, gold, 0, 6.9, 0, 8);
      const blessing = cyl(g, 0.2, 2, gold, 0.95, 4.9, 0.4, 6); blessing.rotation.z = -0.9;
      const crook = cyl(g, 0.14, 3.4, gold, -1.05, 4.6, 0.2, 6); crook.rotation.z = 0.16;
    };
    roncalli(-7.5, 17.6, 4, 1); roncalli(6.5, 0.4, 24, 1.15);
    // Autumn wood all over the hill.
    const random = seeded(3307);
    for (let i = 0; i < 34; i++) {
      const a = random() * Math.PI * 2, r = 12 + random() * 21;
      const x = Math.cos(a) * r, z = -12 + Math.sin(a) * r * 0.72;
      if (Math.abs(x) < 6 && z > -4) continue;                       // keep the stairway clear
      const y = Math.max(0, 16 - (Math.hypot(x, (z + 12) / 0.62) / 34) ** 2 * 16);
      cyl(p, 0.3, 3, 0x6a4a33, x, y + 1.5, z, 6);
      mesh(p, new THREE.IcosahedronGeometry(2 + random() * 1.4, 0), [rust, amber, 0xb5473a, moss][i % 4], x, y + 4.4, z);
    }
  }
  function castagneto(p) {
    // A chestnut wood: fat old trunks, wide autumn crowns, spiky burrs on the ground and the drying hut.
    const random = seeded(2711);
    for (let i = 0; i < 13; i++) {
      const a = random() * Math.PI * 2, r = 5 + random() * 17;
      const x = Math.cos(a) * r, z = -6 + Math.sin(a) * r * 0.75;
      chestnut(p, x, z, 6.5 + random() * 3, random);
    }
    // Burrs and chestnuts scattered under the trees, and a basket full of them.
    for (let i = 0; i < 22; i++) {
      const x = (random() - 0.5) * 34, z = -8 + (random() - 0.5) * 22;
      if (random() < 0.45) mesh(p, new THREE.IcosahedronGeometry(0.55, 0), 0x8a9b3f, x, 0.4, z);
      else { const nut = mesh(p, new THREE.SphereGeometry(0.34, 8, 6), 0x6b3f22, x, 0.3, z); nut.scale.set(1, 0.8, 1); }
    }
    cyl(p, 1.2, 1.4, 0xa9784c, 9, 0.7, 4, 10);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(p, new THREE.SphereGeometry(0.34, 8, 6), 0x6b3f22, 9 + Math.cos(a) * 0.6, 1.6, 4 + Math.sin(a) * 0.6); }
    // The "essiccatoio": the little stone hut where the chestnuts were dried.
    box(p, 5.4, 4, 5, 0xd6cdb6, -12, 2, 2); kit.roofTop(p, 5.8, 5.4, 4, 0x8a5a3a);
    p.children[p.children.length - 1].position.set(-12, 5.2, 2);
    box(p, 1.4, 2.2, 0.3, 0x5a4230, -12, 1.1, 4.6);
    for (let i = 0; i < 3; i++) { const log = cyl(p, 0.3, 4, 0xa9784c, -6.5, 0.35 + i * 0.6, 3 + i * 0.3, 7); log.rotation.z = Math.PI / 2; }
  }
  function belvedere(p) {
    // A little lookout over the gorge, facing the Ponte San Michele.
    box(p, 14, 0.4, 8, 0xd8cfb8, 0, 0.18, 2);
    for (let x = -6.4; x <= 6.4; x += 1.6) cyl(p, 0.11, 1.1, iron, x, 0.75, 5.6, 6);
    box(p, 13.2, 0.16, 0.16, iron, 0, 1.32, 5.6);
    cyl(p, 0.2, 1.5, iron, 3.4, 0.9, 4.4, 8);
    const scope = cyl(p, 0.26, 1.5, 0x2f3238, 3.4, 1.8, 4.1, 8); scope.rotation.x = 1.15;
    const board = box(p, 3.6, 2.2, 0.2, 0xf4ecd6, -3.6, 1.9, 4.6); board.rotation.x = -0.32;
    for (const x of [-5, -2.2]) cyl(p, 0.12, 1.4, wood, x, 0.7, 4.7, 6);
    cyl(p, 0.16, 6.5, cream, -6.6, 3.25, 0, 8); box(p, 2.4, 1.5, 0.1, 0xd2631f, -5.3, 5.8, 0);
    for (const [x, z] of [[7, -2], [-8, -3]]) kit.tree(p, x, z);
    box(p, 3, 1.4, 1.2, 0x8a7a5e, 6, 0.7, 1);
  }
  const builders = { cementificio, galleria, traghetto, madonnadelbosco, castagneto, belvedere };
  const SIGN = { madonnadelbosco: 32, cementificio: 22, traghetto: 14, galleria: 14, castagneto: 15, belvedere: 12 };
  for (const item of layout.landmarks) {
    kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11, item.kind === 'madonnadelbosco' ? 22 : 17);
  }

  // --- The river ---------------------------------------------------------------------------------------
  const banks = riverCentre(track);
  const bandShape = (extra) => new THREE.Shape([
    ...banks.map((p) => new THREE.Vector2(p.x + p.nx * (HALF_WIDTH + extra), -(p.z + p.nz * (HALF_WIDTH + extra)))),
    ...[...banks].reverse().map((p) => new THREE.Vector2(p.x - p.nx * (HALF_WIDTH + extra), -(p.z - p.nz * (HALF_WIDTH + extra)))),
  ]);
  const shore = new THREE.Mesh(new THREE.ShapeGeometry(bandShape(6)), new THREE.MeshStandardMaterial({ color: gravel, roughness: 0.95 }));
  shore.rotation.x = -Math.PI / 2; shore.position.y = 0.05; shore.receiveShadow = true; shore.name = 'adda-shore'; scene.add(shore);
  const river = new THREE.Mesh(new THREE.ShapeGeometry(bandShape(0)), new THREE.MeshStandardMaterial({ color: water, roughness: 0.3, metalness: 0.08 }));
  river.rotation.x = -Math.PI / 2; river.position.y = 0.2; river.receiveShadow = true; river.name = 'adda-water'; scene.add(river);
  // Poplars and reed beds along both banks, clear of the road and of the landmarks.
  const roadLine = track.points(240);
  const roadGap = (x, z) => { let best = Infinity; for (const q of roadLine) { const gap = Math.hypot(q.x - x, q.z - z); if (gap < best) best = gap; } return best; };
  const random = seeded(8123);
  for (let i = 3; i < banks.length - 3; i += 2) {
    const p = banks[i];
    for (const side of [-1, 1]) {
      const off = HALF_WIDTH + 3 + random() * 6;
      const x = p.x + p.nx * side * off, z = p.z + p.nz * side * off;
      if (roadGap(x, z) < 26) continue;
      if (layout.landmarks.some((m) => Math.hypot(m.x - x, m.z - z) < (RESERVED[m.kind] || 23))) continue;
      const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      if (random() < 0.34) chestnut(g, 0, 0, 7 + random() * 2.5, random);
      else if (random() < 0.7) { cyl(g, 0.34, 7, 0x6a4a33, 0, 3.5, 0, 6); const crown = cone(g, 2.3, 11, [rust, amber, moss][i % 3], 0, 10, 0, 7); crown.castShadow = false; }
      else for (let r = 0; r < 5; r++) cyl(g, 0.09, 2.4 + random(), 0x9c9a54, (random() - 0.5) * 5, 1.4, (random() - 0.5) * 5, 5);
    }
  }

  // --- The covered gallery on the descent from Calusco ----------------------------------------------------
  const roadPoint = (d, lane, y = 0) => { const f = track.frame(d); return new THREE.Vector3(f.x + f.dz * lane, y, f.z - f.dx * lane); };
  const gallery = new THREE.Group(); gallery.name = 'adda-gallery'; scene.add(gallery);
  for (let d = 95; d <= 145; d += 5) {
    const y = track.elevation(d);
    for (const side of [-1, 1]) {
      const base = roadPoint(d, side * 9.6);
      cyl(gallery, 0.55, y + 13.4, concrete, base.x, (y + 13.4) / 2, base.z, 8);
    }
    const a = roadPoint(d, -9.6), b = roadPoint(d, 9.6);
    const beam = mesh(gallery, new THREE.BoxGeometry(20.6, 0.9, 2.4), concrete, (a.x + b.x) / 2, y + 13.8, (a.z + b.z) / 2);
    beam.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    beam.castShadow = false;
  }
  for (const [d, sign] of [[95, -1], [145, 1]]) {
    const portal = new THREE.Group(), f = track.frame(d);
    portal.position.set(f.x, track.elevation(d), f.z); portal.rotation.y = Math.atan2(f.dx, f.dz); gallery.add(portal);
    box(portal, 23, 1.8, 1.2, 0xd8d3c6, 0, 15.2, sign * 0.6);
    for (const x of [-10.2, 10.2]) box(portal, 1.6, 15.4, 1.4, 0xd8d3c6, x, 7.7, sign * 0.6);
    const label = box(portal, 5, 1.4, 0.2, 0x2f6b3a, 0, 15.2, sign * 1.3); label.castShadow = false;
  }

  // --- Ponte San Michele: the railway deck runs under the road deck on the same iron arch ------------------
  // Everything here is built along the straight bridge axis. The road curves away from it within 50 m, so the
  // railway leaves the bridge on its own embankment instead of staying under the cars.
  const span = track.frame(SOUTH_CROSSING);
  const axis = (s, lateral = 0, y = 0) => new THREE.Vector3(
    span.x + span.dx * s + span.dz * lateral, y, span.z + span.dz * s - span.dx * lateral);
  const railY = Math.max(3.2, track.elevation(SOUTH_CROSSING) - 6.5);
  const bridge = new THREE.Group(); bridge.name = 'adda-ponte'; scene.add(bridge);
  for (const side of [-1, 1]) {
    const arc = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      arc.push(axis(-48 + t * 96, side * 5.2, 0.3 + Math.sin(t * Math.PI) * (railY - 0.9)));
    }
    mesh(bridge, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 44, 0.55, 6, false), iron).castShadow = false;
    for (let i = 2; i < 23; i += 2) {
      const q = arc[i], h = railY - q.y;
      if (h > 0.6) cyl(bridge, 0.17, h, iron, q.x, q.y + h / 2, q.z, 5);
    }
  }
  const RAIL_HALF = 95;
  const deck = new THREE.Group();
  deck.position.copy(axis(0)); deck.rotation.y = Math.atan2(span.dx, span.dz); bridge.add(deck);
  box(deck, 11.4, 0.4, RAIL_HALF * 2, iron, 0, railY, 0);
  for (const x of [-5.2, 5.2]) { box(deck, 0.7, 1.2, RAIL_HALF * 2, iron, x, railY - 0.75, 0); box(deck, 0.16, 1.1, RAIL_HALF * 2, iron, x + Math.sign(x) * 0.4, railY + 0.75, 0); }
  for (const x of [-0.9, 0.9]) box(deck, 0.16, 0.24, RAIL_HALF * 2, 0x6d6257, x, railY + 0.34, 0);
  for (let s = -RAIL_HALF + 8; s < RAIL_HALF; s += 8) {
    if (Math.abs(s) < 46) continue;                                  // the arch carries the middle
    const base = axis(s);
    const ground = kit.groundAt(base.x, base.z), h = Math.max(0.6, railY - 0.9 - ground);
    cyl(bridge, 1.1, h, 0xa39c8e, base.x, ground + h / 2, base.z, 10);
  }
  // Iron lattice between the railway deck and the road deck overhead.
  for (let s = -24; s <= 24; s += 8) {
    const up = track.elevation(SOUTH_CROSSING + s) - 0.4 - railY;
    if (up < 1) continue;
    for (const side of [-1, 1]) {
      const q = roadPoint(SOUTH_CROSSING + s, side * 5.2);
      cyl(bridge, 0.22, up, iron, q.x, railY + up / 2, q.z, 5);
    }
  }

  // The ironwork the cars drive inside: tall lattice trusses either side of the road deck, braced over the
  // cars and tapering down at both ends. This is what makes the bridge readable from the driving seat.
  const TRUSS_FROM = SOUTH_CROSSING - 46, TRUSS_TO = SOUTH_CROSSING + 46, TRUSS_H = 4.6;
  const trussTop = (d) => track.elevation(d) + 1.2 + TRUSS_H * Math.min(1, Math.max(0, Math.min(d - TRUSS_FROM, TRUSS_TO - d) / 14));
  for (let d = TRUSS_FROM; d <= TRUSS_TO + 0.1; d += 5.75) {
    const foot = track.elevation(d), h = trussTop(d) - foot;
    for (const side of [-1, 1]) {
      const q = roadPoint(d, side * 8.2);
      cyl(bridge, 0.24, h, iron, q.x, foot + h / 2, q.z, 5);
    }
  }
  for (const side of [-1, 1]) {
    const chord = Array.from({ length: 21 }, (_, i) => {
      const d = TRUSS_FROM + (TRUSS_TO - TRUSS_FROM) * (i / 20);
      return roadPoint(d, side * 8.2, trussTop(d));
    });
    mesh(bridge, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chord), 34, 0.22, 5, false), iron).castShadow = false;
    // Diagonal bracing, one zig per bay.
    for (let i = 0; i < 20; i += 2) {
      const d0 = TRUSS_FROM + (TRUSS_TO - TRUSS_FROM) * (i / 20), d1 = TRUSS_FROM + (TRUSS_TO - TRUSS_FROM) * ((i + 2) / 20);
      const a = roadPoint(d0, side * 8.2, track.elevation(d0)), b = roadPoint(d1, side * 8.2, trussTop(d1));
      const len = a.distanceTo(b);
      if (len < 1) continue;
      const brace = mesh(bridge, new THREE.BoxGeometry(0.16, len, 0.16), iron, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      brace.castShadow = false;
    }
  }
  for (let d = TRUSS_FROM + 11.5; d < TRUSS_TO; d += 11.5) {
    const y = trussTop(d), a = roadPoint(d, -8.2, y), b = roadPoint(d, 8.2, y);
    const beam = mesh(bridge, new THREE.BoxGeometry(17, 0.3, 0.3), iron, (a.x + b.x) / 2, y, (a.z + b.z) / 2);
    beam.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2; beam.castShadow = false;
  }
  kit.dynamic(bridge);

  // --- The bridge mirrored on the water -------------------------------------------------------------------
  // The renderer draws no true reflections, so the outline is laid flat on the river and stretched downstream:
  // coming down from Paderno you read the arch's shape in the water, which is what makes this bridge famous.
  const downstream = (() => {
    const a = banks.at(-6), b = banks.at(-2), dx = b.x - a.x, dz = b.z - a.z, m = Math.hypot(dx, dz) || 1;
    return { x: dx / m, z: dz / m };
  })();
  const mirrorMaterial = new THREE.MeshBasicMaterial({ color: 0x1f4a66, transparent: true, opacity: 0.38, depthWrite: false });
  const reflection = new THREE.Group(); reflection.name = 'adda-riflesso'; scene.add(reflection);
  // Squashed almost flat and held just above the water, so every part of it draws on top of the river
  // instead of sinking into the river bed.
  reflection.scale.y = 0.08; reflection.position.y = 0.241;
  const REACH = 17;                                       // only the stretch actually over the water
  const mirror = (at) => {
    const points = Array.from({ length: 19 }, (_, i) => {
      const p = at(-REACH + (REACH * 2) * (i / 18));
      return new THREE.Vector3(p.x + downstream.x * p.y * 0.9, 0.24, p.z + downstream.z * p.y * 0.9);
    });
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.62, 4, false), mirrorMaterial);
    m.castShadow = false; m.receiveShadow = false; m.renderOrder = 3; reflection.add(m);
  };
  for (const side of [-1, 1]) {
    mirror((s) => axis(s, side * 5.2, 0.3 + Math.sin((s + 48) / 96 * Math.PI) * (railY - 0.9)));  // the arch
    mirror((s) => axis(s, side * 5.4, railY));                                                    // the railway deck
    mirror((s) => roadPoint(SOUTH_CROSSING + s, side * 8.2, track.elevation(SOUTH_CROSSING + s)));// the road deck
    mirror((s) => roadPoint(SOUTH_CROSSING + s, side * 8.2, trussTop(SOUTH_CROSSING + s)));       // the ironwork above
  }

  // --- The little wooden bridge at the north crossing ------------------------------------------------------
  const little = new THREE.Group(); little.name = 'adda-ponticello'; scene.add(little);
  for (const side of [-1, 1]) {
    const rail = [], feet = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, d = NORTH_CROSSING - 26 + t * 52, base = track.elevation(d) + 1.1;
      rail.push(roadPoint(d, side * 8.2, base + Math.sin(t * Math.PI) * 2.2));
      feet.push(base);
    }
    mesh(little, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 26, 0.34, 5, false), darkWood).castShadow = false;
    for (let i = 1; i < 14; i += 2) {
      const h = rail[i].y - feet[i];
      if (h > 0.4) cyl(little, 0.16, h, wood, rail[i].x, feet[i] + h / 2, rail[i].z, 5);
    }
  }

  // --- Leonardo's ferry: a cable across the river and the boat the current pushes over, with no motor -------
  const jetty = layout.landmarks.find((m) => m.kind === 'traghetto') || { x: banks[30].x, z: banks[30].z };
  let anchor = banks[0], best = Infinity;
  for (const p of banks) { const gap = Math.hypot(p.x - jetty.x, p.z - jetty.z); if (gap < best) { best = gap; anchor = p; } }
  const towardJetty = Math.sign((jetty.x - anchor.x) * anchor.nx + (jetty.z - anchor.z) * anchor.nz) || 1;
  const near = { x: anchor.x + anchor.nx * towardJetty * (HALF_WIDTH - 1), z: anchor.z + anchor.nz * towardJetty * (HALF_WIDTH - 1) };
  const far = { x: anchor.x - anchor.nx * towardJetty * (HALF_WIDTH - 1), z: anchor.z - anchor.nz * towardJetty * (HALF_WIDTH - 1) };
  for (const end of [near, far]) {
    const mast = new THREE.Group(); mast.position.set(end.x, 0, end.z); scene.add(mast);
    cyl(mast, 0.34, 11, darkWood, 0, 5.5, 0, 7); box(mast, 2.6, 0.4, 0.4, iron, 0, 10.6, 0);
    box(mast, 4.5, 0.3, 3.4, wood, 0, 0.5, 0);
  }
  const cable = mesh(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(near.x, 10.4, near.z), new THREE.Vector3((near.x + far.x) / 2, 8.4, (near.z + far.z) / 2), new THREE.Vector3(far.x, 10.4, far.z),
  ]), 20, 0.09, 4, false), 0x6f757c); cable.castShadow = false;
  const ferry = new THREE.Group(); ferry.name = 'adda-traghetto'; scene.add(ferry);
  for (const x of [-1.9, 1.9]) { const hull = mesh(ferry, new THREE.SphereGeometry(1, 10, 6), darkWood, x, 0.45, 0); hull.scale.set(0.8, 0.45, 4.2); }
  box(ferry, 5.4, 0.3, 7.6, wood, 0, 0.95, 0);
  for (const z of [-3.5, 3.5]) box(ferry, 5.4, 0.7, 0.24, wood, 0, 1.4, z);
  cyl(ferry, 0.22, 5.2, darkWood, 0, 3.5, -0.6, 6);
  box(ferry, 1.8, 1.6, 1.8, 0xd94141, -1.4, 1.8, 1.4); box(ferry, 1.6, 1.4, 1.6, 0xf1c14a, 1.5, 1.7, -1.2);
  const tiller = cyl(ferry, 0.14, 2.4, wood, 2.2, 1.7, 2.6, 5); tiller.rotation.z = 0.5;
  kit.dynamic(ferry);

  // --- The train that passes under the cars ----------------------------------------------------------------
  const train = new THREE.Group(); train.name = 'adda-treno'; scene.add(train);
  for (let c = 0; c < 4; c++) {
    const car = new THREE.Group(); car.position.z = c * 9.4; train.add(car);
    box(car, 3.1, 2.3, 8.8, c === 0 ? 0x2f6b3a : 0xf1ece0, 0, 1.75, 0);
    box(car, 3.2, 0.4, 9, 0x2f6b3a, 0, 3.05, 0);
    for (let i = 0; i < 4; i++) for (const x of [-1.6, 1.6]) box(car, 0.12, 1.1, 1.6, glass, x, 2.1, -3 + i * 2);
    box(car, 3.2, 0.5, 9, 0x50565e, 0, 0.5, 0);
    for (const z of [-3, 3]) for (const x of [-1.3, 1.3]) { const w = cyl(car, 0.42, 0.3, 0x35393f, x, 0.35, z, 10); w.rotation.z = Math.PI / 2; }
  }
  kit.dynamic(train);

  const TRAIN_LENGTH = 38;
  kit.animate((clock) => {
    // The ferry crosses on the current alone, pausing at each bank; Leonardo's boat never hurries.
    const period = 26, cycle = (clock % period) / period;
    const raw = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
    const t = Math.min(1, Math.max(0, (raw - 0.12) / 0.76));
    const ease = t * t * (3 - 2 * t);
    ferry.position.set(near.x + (far.x - near.x) * ease, 0.25 + Math.sin(clock * 0.9) * 0.05, near.z + (far.z - near.z) * ease);
    ferry.rotation.y = Math.atan2(far.x - near.x, far.z - near.z) + (cycle < 0.5 ? 0.42 : -0.42);
    ferry.rotation.z = Math.sin(clock * 0.7) * 0.03;
    // The train runs the lower deck, waits off the end of the embankment, then comes back the other way.
    const run = 30, wait = 8, half = run + wait, phase = clock % (half * 2), forward = phase < half;
    const local = Math.min(1, (forward ? phase : phase - half) / run);
    const travel = -RAIL_HALF - TRAIN_LENGTH + (RAIL_HALF * 2 + TRAIN_LENGTH * 2) * (forward ? local : 1 - local);
    train.position.copy(axis(travel, 0, railY + 0.45));
    train.rotation.y = Math.atan2(span.dx, span.dz) + (forward ? 0 : Math.PI);
    // The real bridge shudders when a train goes over it; so does this one.
    const over = Math.max(0, 1 - Math.abs(travel) / 70), shake = over * over * 0.06;
    bridge.position.set(Math.sin(clock * 27 + 1.7) * shake * 0.5, Math.sin(clock * 34) * shake, 0);
    bridge.rotation.z = Math.sin(clock * 21) * shake * 0.01;
  });
}
