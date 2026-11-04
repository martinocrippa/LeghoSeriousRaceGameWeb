/**
 * Brianza by night: Montevecchia's hill with the sanctuary on top and the long lit stairway, terraced vineyards,
 * the villas of Usmate Velate and Arcore with glowing windows, dark green hills all around and fireflies.
 * Toy caricatures; placements are fictional.
 */
import * as THREE from 'three';

export const streetHouses = 8;
export const RESERVED = { montevecchia: 72, villascaccabarozzi: 30, chiesa: 26, villaborromeo: 40, vigneti: 40 };

const hillCache = new WeakMap();
function hillLayout(track, layout) {
  if (hillCache.has(track)) return hillCache.get(track);
  let seed = 4242;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const road = track.points(360);
  const hills = [];
  const { bounds } = track;
  for (let z = bounds.minZ - 120; z <= bounds.maxZ + 120; z += 34) for (let x = bounds.minX - 140; x <= bounds.maxX + 140; x += 34) {
    const px = x + (random() - 0.5) * 20, pz = z + (random() - 0.5) * 20;
    let gap = Infinity; for (const p of road) { const d = Math.hypot(p.x - px, p.z - pz); if (d < gap) gap = d; }
    const radius = Math.min(44, 14 + (gap - 14) * 0.5);
    if (radius < 14 || gap < radius + 12) continue;
    if (layout.landmarks.some((l) => Math.hypot(l.x - px, l.z - pz) < (RESERVED[l.kind] || 23) + radius * 0.7)) continue;
    if (hills.some((h) => Math.hypot(h.x - px, h.z - pz) < (h.radius + radius) * 0.6)) continue;
    hills.push({ x: px, z: pz, radius, height: radius * (0.45 + random() * 0.3), shade: Math.floor(random() * 3) });
  }
  hillCache.set(track, hills);
  return hills;
}

export function isReserved(track, layout, x, z) {
  return hillLayout(track, layout).some((h) => Math.hypot(h.x - x, h.z - z) < h.radius * 0.85);
}

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh, cream, glass, lampGlow } = kit;
  const stone = 0xc9b99b, roof = 0x8a4a3a, hillGreen = 0x27503a, vine = 0x2f6a45, warm = 0xffe0a0;
  const glow = (p, w, h, x, y, z) => { const m = box(p, w, h, 0.12, lampGlow, x, y, z); m.castShadow = false; return m; };
  const animated = [];

  function montevecchia(p) {
    // The hill, terraced on its slopes, with the sanctuary and bell tower on top and the long lit stairway down the front.
    const hill = mesh(p, new THREE.SphereGeometry(46, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillGreen, 0, 0, -12); hill.scale.y = 0.72; hill.castShadow = false;
    for (let i = 0; i < 4; i++) { const ring = mesh(p, new THREE.CylinderGeometry(38 - i * 7, 42 - i * 7, 2.2, 22, 1, true), i % 2 ? 0x2f6040 : 0x35704a, 0, 6 + i * 6.2, -12); ring.castShadow = false; ring.material.side = THREE.DoubleSide; }
    // Sanctuary on the summit.
    const top = 33;
    cyl(p, 13, 1.2, stone, 0, top + 0.6, -12, 20);
    box(p, 12, 8, 9, 0xf3e4c8, 0, top + 5.2, -14); kit.roofTop(p, 12.5, 9.5, top + 9.2, roof); p.children[p.children.length - 1].position.set(0, top + 10.4, -14);
    box(p, 4, 9, 0.8, 0xf3e4c8, 0, top + 5.7, -9.4); cone(p, 3, 2.4, 0xf3e4c8, 0, top + 11.3, -9.4, 4).rotation.y = Math.PI / 4;
    box(p, 3.6, 16, 3.6, 0xe7d5b2, 7.5, top + 9.2, -14); box(p, 4.2, 0.5, 4.2, cream, 7.5, top + 17.4, -14); cone(p, 2.6, 4, roof, 7.5, top + 19.6, -14, 4).rotation.y = Math.PI / 4;
    for (const y of [top + 12, top + 15]) glow(p, 0.7, 1.4, 7.5, y, -12.1);
    glow(p, 1.6, 2.6, 0, top + 4.2, -9.3); for (const x of [-4, 4]) glow(p, 0.9, 1.4, x, top + 6, -9.3);
    mesh(p, new THREE.SphereGeometry(0.5, 8, 6), lampGlow, 7.5, top + 21.8, -14).castShadow = false;
    // The stairway: steps down the front slope, lamps along it, lime trees at the sides.
    for (let i = 0; i < 26; i++) {
      const t = i / 25, y = top - t * top, z = -9 + t * 46;
      box(p, 4, 0.5, 1.6, stone, 0, y + 0.25, z);
      if (i % 5 === 0) for (const s of [-3.2, 3.2]) { cyl(p, 0.1, 3, 0x3a3f52, s, y + 1.5, z, 5); mesh(p, new THREE.SphereGeometry(0.3, 8, 6), lampGlow, s, y + 3.2, z).castShadow = false; }
      if (i % 4 === 2) for (const s of [-6, 6]) { cyl(p, 0.25, 2.2, 0x3f3a44, s, y + 1.1, z, 6); mesh(p, new THREE.IcosahedronGeometry(1.7, 1), 0x1f4a3d, s, y + 3.4, z); }
    }
    // Small chapels of the Via Crucis beside the stairs.
    for (let i = 0; i < 4; i++) { const t = 0.2 + i * 0.2, y = top - t * top, z = -9 + t * 46; box(p, 2, 2.4, 1.6, 0xf3e4c8, -9.5, y + 1.2, z); cone(p, 1.5, 1.2, roof, -9.5, y + 3, z, 4).rotation.y = Math.PI / 4; glow(p, 0.6, 0.9, -9.5, y + 1.3, z + 0.82); }
    kit.lamp(p, -14, 40, 4.2); kit.lamp(p, 14, 40, 4.2);
  }
  function villascaccabarozzi(p) {
    box(p, 34, 0.2, 26, 0x2a4a34, 0, 0.08, -1);
    kit.builders.villa(p);
    for (const x of [-6, -2, 2, 6]) glow(p, 0.9, 1.3, x, 2.2, 3.62);
    glow(p, 1.6, 2.4, 0, 1.6, 3.85);
    for (const x of [-12, 12]) kit.lamp(p, x, 9, 4);
    for (let x = -16; x <= 16; x += 2.2) box(p, 0.16, 1.4, 0.16, 0x3a3f52, x, 0.7, 10.5); box(p, 33, 0.1, 0.1, 0x3a3f52, 0, 1.35, 10.5);
    for (const [x, z] of [[-15, -8], [15, -8]]) kit.tree(p, x, z, true);
  }
  function chiesa(p) {
    kit.builders.church(p);
    glow(p, 2.2, 1.6, 8, 13.5, 1.95); const clock = mesh(p, new THREE.CircleGeometry(1.1, 18), lampGlow, 8, 10.5, 1.9); clock.castShadow = false;
    for (const x of [-4, 4]) glow(p, 0.9, 1.6, x, 3.5, 6.15);
    for (const x of [-9, 12]) kit.lamp(p, x, 9, 4);
    box(p, 26, 0.16, 12, 0x3a3f52, 1, 0.07, 9);
  }
  function villaborromeo(p) {
    // Long neoclassical facade with columns and a pediment, a park of tall trees, the little Vela chapel on one side.
    box(p, 56, 0.22, 36, 0x2a4a34, 0, 0.09, -4);
    box(p, 36, 9, 12, 0xf1e3c6, 0, 4.5, -8); box(p, 37, 0.7, 13, stone, 0, 9.3, -8); kit.roofTop(p, 37, 13.5, 9.8, roof); p.children[p.children.length - 1].position.set(0, 11, -8);
    for (let x = -12; x <= 12; x += 4) cyl(p, 0.5, 8.4, cream, x, 4.2, -1.4, 10);
    box(p, 30, 0.8, 3, cream, 0, 8.8, -1.4); cone(p, 7, 2.6, cream, 0, 10.4, -1.4, 4).rotation.y = Math.PI / 4;
    for (const x of [-16, -14, 14, 16]) for (const y of [2.2, 6]) glow(p, 0.9, 1.4, x, y, -1.85);
    for (let x = -10; x <= 10; x += 4) glow(p, 1.4, 2.2, x, 2.4, -1.9);
    box(p, 3, 4.6, 0.4, 0x4a2f22, 0, 2.3, -1.85);
    // The Vela chapel: a small domed building.
    cyl(p, 3.4, 5, 0xf1e3c6, 22, 2.5, -4, 14); const dome = mesh(p, new THREE.SphereGeometry(3.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f8f6f, 22, 5, -4); dome.castShadow = false; glow(p, 0.7, 1.2, 22, 2.6, -0.55);
    for (const [x, z] of [[-24, -14], [-18, 4], [24, -16], [-26, 8], [8, 10], [-8, 12]]) kit.tree(p, x, z, true);
    for (const x of [-20, 0, 20]) kit.lamp(p, x, 13, 4.2);
  }
  function village(p) {
    kit.builders.village(p);
    for (let i = 0; i < 4; i++) glow(p, 0.8, 1.2, (i - 1.5) * 5.4, 2.4, (i % 2 ? 2 : -1) + 2.6);
    kit.lamp(p, -9, 7, 4); kit.lamp(p, 9, 7, 4);
  }
  function vigneti(p) {
    // Terraced vineyard hill with rows of vines and a farmhouse on top.
    const hill = mesh(p, new THREE.SphereGeometry(28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hillGreen, 0, 0, -8); hill.scale.y = 0.6; hill.castShadow = false;
    for (let i = 0; i < 4; i++) {
      const r = 24 - i * 5.5, y = 3.5 + i * 3.6;
      const ring = mesh(p, new THREE.CylinderGeometry(r - 1.5, r, 1.8, 24, 1, true), 0x35704a, 0, y, -8); ring.castShadow = false; ring.material.side = THREE.DoubleSide;
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; box(p, 1.4, 1.1, 0.4, vine, Math.cos(a) * (r - 2.2), y + 1.4, -8 + Math.sin(a) * (r - 2.2)).rotation.y = -a; }
    }
    box(p, 7, 4, 5, 0xf3e4c8, 0, 17.5, -8); kit.roofTop(p, 7.5, 5.5, 19.5, roof); p.children[p.children.length - 1].position.set(0, 20.7, -8);
    glow(p, 0.9, 1.2, 0, 17.4, -5.4); kit.lamp(p, 4, 17.4, 3, -6);
    for (const x of [-20, 20]) kit.lamp(p, x, 9, 4);
  }
  const builders = { montevecchia, villascaccabarozzi, chiesa, villaborromeo, village, vigneti };
  const SIGN = { montevecchia: 42, villaborromeo: 16, villascaccabarozzi: 13, vigneti: 22 };
  const WIDTH = { montevecchia: 20, villaborromeo: 20 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind], SIGN[item.kind] ?? 11, WIDTH[item.kind] ?? 17);

  // Dark green hills all around.
  for (const h of hillLayout(track, layout)) {
    const mound = mesh(scene, new THREE.SphereGeometry(h.radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), [0x1b3326, 0x223f2f, 0x27503a][h.shade], h.x, kit.groundAt(h.x, h.z) - 0.5, h.z);
    mound.scale.y = h.height / h.radius; mound.castShadow = false;
  }
  // The arc of the Lecco pre-Alps far away on the northern horizon: dark silhouettes against the stars,
  // with the saw-toothed Resegone on the right and the Grigne behind. Flat and unlit, so they read as distance.
  const skyline = new THREE.Group();
  skyline.name = 'prealpi';
  scene.add(skyline);
  let ridgeSeed = 707;
  const ridgeRandom = () => { ridgeSeed = (Math.imul(ridgeSeed, 1664525) + 1013904223) >>> 0; return ridgeSeed / 4294967296; };
  for (let ring = 0; ring < 2; ring += 1) {
    const radius = 430 + ring * 120, shade = ring ? 0x121a2c : 0x1a2740;
    for (let i = 0; i < 22; i += 1) {
      // Spread over the northern half of the horizon only: the valley opens the other way.
      const angle = -Math.PI * 0.95 + (i / 21) * Math.PI * 0.9;
      const height = (ring ? 52 : 74) + ridgeRandom() * (ring ? 26 : 52);
      const width = 40 + ridgeRandom() * 34;
      const teeth = i > 13 && i < 19 && ring === 0;                   // the Resegone's saw
      const peak = cone(skyline, teeth ? width * 0.42 : width, height, shade,
        Math.cos(angle) * radius, height / 2 - 24, Math.sin(angle) * radius, teeth ? 5 : 6);
      peak.rotation.y = ridgeRandom() * Math.PI;
      peak.castShadow = false;
      peak.receiveShadow = false;
    }
  }

  // Fireflies drifting over the verges.
  const fireflyMaterial = new THREE.MeshBasicMaterial({ color: 0xd9ff7a });
  const road = track.points(120);
  let seed = 99;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 40; i++) {
    const p = road[Math.floor(random() * road.length)];
    const lane = (random() < 0.5 ? -1 : 1) * (track.roadWidth / 2 + 4 + random() * 10);
    const fly = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), fireflyMaterial);
    fly.position.set(p.x + p.dz * lane, kit.groundAt(p.x, p.z) + 1.5, p.z - p.dx * lane); fly.castShadow = false; fly.userData.dynamic = true; scene.add(fly);
    animated.push({ fly, base: fly.position.clone(), phase: random() * 6.3, radius: 1 + random() * 2.5 });
  }
  kit.animate((clock) => {
    for (const f of animated) {
      f.fly.position.set(f.base.x + Math.sin(clock * 0.7 + f.phase) * f.radius, f.base.y + Math.sin(clock * 1.3 + f.phase * 2) * 0.8, f.base.z + Math.cos(clock * 0.5 + f.phase) * f.radius);
      f.fly.visible = Math.sin(clock * 3 + f.phase * 5) > -0.2;
    }
  });
}
