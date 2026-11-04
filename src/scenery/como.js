/**
 * Lake Como scenery: the lake fills the loop interior (inverted Y), mountains all around, Como at the
 * south-west tip, Lecco at the south-east tip, Bellagio on the hairpin between the two arms, ferries and
 * passenger boats cruising the water, sailboats bobbing, and railings along the shore with gaps at the bridges.
 * Everything is a brick-toy caricature; placements are fictional.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';
import { insidePolygon as inside } from '../geometry.js';
import { BOAT_ROUTES, SAIL_AIR, bridgeClearance } from './como-routes.js';

export const streetHouses = 0;
export const RESERVED = { comocity: 48, bellagio: 40, lecco: 62, villa: 26, village: 26 };

const layoutCache = new WeakMap();

/** Deterministic mountain positions: a jittered grid, kept off the water, the road and the landmarks. */
function mountainLayout(track, layout) {
  if (layoutCache.has(track)) return layoutCache.get(track);
  const random = seeded(9021);
  const road = track.points(360);
  const roadDistance = (x, z) => { let best = Infinity; for (const p of road) { const gap = Math.hypot(p.x - x, p.z - z); if (gap < best) best = gap; } return best; };
  const mountains = [];
  const { bounds } = track;
  for (let z = bounds.minZ - 150; z <= bounds.maxZ + 130; z += 27) {
    for (let x = bounds.minX - 150; x <= bounds.maxX + 150; x += 27) {
      const px = x + (random() - 0.5) * 16, pz = z + (random() - 0.5) * 16;
      if (inside(px, pz, layout.shoreline)) continue;
      const gap = roadDistance(px, pz);
      const radius = Math.min(58, 16 + (gap - 12) * 0.42);
      if (radius < 15 || gap < radius + 13) continue;
      if (layout.landmarks.some((p) => Math.hypot(p.x - px, p.z - pz) < (RESERVED[p.kind] || 23) + radius * 0.6)) continue;
      if (mountains.some((m) => Math.hypot(m.x - px, m.z - pz) < (m.radius + radius) * 0.55)) continue;
      const height = radius * (1.05 + random() * 0.55);
      mountains.push({ x: px, z: pz, radius, height, far: gap > 60, turn: random() * Math.PI, snow: height > 62 });
    }
  }
  layoutCache.set(track, mountains);
  return mountains;
}

export function isReserved(track, layout, x, z) {
  return mountainLayout(track, layout).some((m) => Math.hypot(m.x - x, m.z - z) < m.radius * 0.9);
}

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh, cream, roof, glass, green } = kit;
  const terracotta = 0xc9643f, ochre = 0xe0a94a, rose = 0xd9788a, mustard = 0xd8b04b, stone = 0xd9cfbf, steel = 0x8fa3ad;

  // --- Landmarks -------------------------------------------------------------------------------------
  function bellagio(p) {
    // The village climbs a hill on the point between the two arms: stepped houses, the stairway, San Giacomo's tower.
    // Sits inside the hairpin, so it stays compact: the two shores are only ~40 m apart at its front.
    const hill = mesh(p, new THREE.SphereGeometry(16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x4f8a52, 0, 0, -8);
    hill.scale.y = 0.6; hill.castShadow = false;
    const colors = [ochre, terracotta, rose, mustard, cream, 0xe98a5a];
    const slots = [[-10, 1, 0.5], [-5, 3, 2.8], [0, 3.5, 4.4], [5, 3, 2.8], [10, 1, 0.5], [-7, -4, 5.6], [-2.5, -6, 7.8], [3.5, -6, 7.6], [8, -4, 5.6], [-3.5, -13, 8.6], [4, -13, 8.4]];
    slots.forEach(([x, z, y], i) => {
      const h = 5 + (i % 3) * 1.4;
      box(p, 5, h, 4.6, colors[i % colors.length], x, y + h / 2, z);
      kit.roofTop(p, 5.4, 5, y + h, roof);
      const last = p.children[p.children.length - 1]; last.position.x = x; last.position.z = z;
      for (const wx of [-1.4, 1.4]) box(p, 0.9, 1.2, 0.15, glass, x + wx, y + h * 0.55, z + 2.35);
      box(p, 3.6, 0.2, 0.6, cream, x, y + h * 0.5 - 0.7, z + 2.6);
    });
    // Stairway (Salita Serbelloni) from the lakefront up to the church.
    for (let i = 0; i < 12; i++) box(p, 3, 0.55, 1.1, stone, 0, 0.3 + i * 0.72, 8 - i * 1.55);
    box(p, 7, 7, 6, cream, 0, 9.4 + 3.5, -14); kit.roofTop(p, 7.5, 6.5, 16.4, roof); p.children[p.children.length - 1].position.set(0, 16.4 + 1.2, -14);
    box(p, 3, 14, 3, 0xe7d5b2, 5.5, 9.4 + 7, -14); box(p, 3.6, 0.5, 3.6, cream, 5.5, 23.6, -14); cone(p, 2.4, 3.6, roof, 5.5, 25.6, -14);
    for (const y of [17, 20]) for (const x of [4.7, 6.3]) box(p, 0.6, 1.4, 0.2, glass, x, y, -12.4);
    // Lakefront promenade with striped umbrellas and a couple of plane trees.
    box(p, 26, 0.25, 6, 0xe8dcc4, 0, 0.12, 11);
    for (let i = 0; i < 5; i++) { const x = -9.6 + i * 4.8; cyl(p, 0.08, 2.4, cream, x, 1.2, 11.5, 5); cone(p, 1.5, 0.9, i % 2 ? 0xe0503c : 0x1e5bd8, x, 2.7, 11.5, 10); }
    for (const x of [-12, 12]) kit.tree(p, x, 8, false);
  }
  function lecco(p) {
    // Lecco: taller lakeside houses, the basilica's tall bell tower and the saw-toothed Resegone behind.
    const colors = [0xf1c27d, 0xe08e6a, 0xf7e2b2, 0xc9d3a8, 0xd9a6a0];
    for (let i = 0; i < 6; i++) {
      const x = -14 + i * 5.6, z = i % 2 ? 3 : -2, h = 7 + (i % 3) * 2;
      box(p, 5, h, 5.2, colors[i % colors.length], x, h / 2, z); kit.roofTop(p, 5.5, 5.8, h); p.children[p.children.length - 1].position.set(x, h + 1.2, z);
      kit.windows(p, 5, 1.8, z + 2.65, Math.floor(h / 2.3)); for (const w of p.children.slice(-Math.floor(h / 2.3) * 2)) w.position.x += x;
    }
    box(p, 4, 26, 4, 0xe7d5b2, 0, 13, -12); box(p, 4.8, 0.6, 4.8, cream, 0, 26.3, -12); cone(p, 3.2, 6, roof, 0, 29.3, -12);
    for (const y of [16, 20, 24]) box(p, 1, 1.8, 0.2, glass, 0, y, -9.9);
    const clock = mesh(p, new THREE.CircleGeometry(1.2, 18), cream, 0, 12, -9.85); clock.rotation.y = 0;
    // Resegone: a row of nine sharp teeth.
    for (let i = 0; i < 9; i++) {
      const x = -32 + i * 8, h = 26 + (i % 3) * 9 + (i === 4 ? 10 : 0);
      const tooth = cone(p, 6.5, h, i % 2 ? 0x7a8494 : 0x8a95a5, x, h / 2, -42 - (i % 2) * 6, 5);
      tooth.castShadow = false;
    }
    const base = mesh(p, new THREE.CylinderGeometry(44, 52, 12, 12), 0x5f7a63, 0, 6, -46); base.castShadow = false;
    box(p, 30, 0.25, 6, 0xe8dcc4, 0, 0.12, 9);
    for (const x of [-16, 16]) kit.tree(p, x, 6, true);
  }
  function comocity(p) {
    // Como: the Duomo with its dome, the round Tempio Voltiano, the steel "Life Electric" arc and lakefront palazzi.
    box(p, 62, 0.25, 40, 0xe6dccb, 0, 0.1, -6);
    // Duomo
    box(p, 16, 14, 24, 0xf1e9d8, -12, 7, -14); box(p, 18, 1.2, 26, stone, -12, 14.4, -14);
    cyl(p, 5.5, 4, 0xf1e9d8, -12, 16.5, -18, 16); const dome = mesh(p, new THREE.SphereGeometry(5.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f8f6f, -12, 18.5, -18); dome.castShadow = false;
    cyl(p, 0.5, 3, cream, -12, 25.6, -18, 8); mesh(p, new THREE.SphereGeometry(0.6, 8, 6), 0xffd053, -12, 27.4, -18);
    box(p, 17, 17, 1.4, 0xf6efe3, -12, 8.5, -1.5); const rose2 = mesh(p, new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20), 0x8fb3d9, -12, 11.5, -0.7); rose2.rotation.x = Math.PI / 2;
    box(p, 2.6, 5, 0.4, 0x6b4a3a, -12, 2.5, -0.7); for (const x of [-18.5, -5.5]) { box(p, 1.4, 20, 1.4, 0xf6efe3, x, 10, -1.5); cone(p, 1.1, 3, cream, x, 21.5, -1.5, 6); }
    // Tempio Voltiano
    cyl(p, 6, 6, 0xf4eee0, 16, 3, -16, 20); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cyl(p, 0.35, 5.6, cream, 16 + Math.cos(a) * 6.4, 2.8, -16 + Math.sin(a) * 6.4, 8); }
    cyl(p, 7.2, 0.8, stone, 16, 6.4, -16, 20); const vdome = mesh(p, new THREE.SphereGeometry(5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x4f7f87, 16, 6.8, -16); vdome.castShadow = false;
    // Life Electric: a slender steel arc by the water.
    const arc = mesh(p, new THREE.TorusGeometry(5.5, 0.32, 8, 26, Math.PI * 0.92), steel, 26, 1.2, 8); arc.rotation.z = 0.15; arc.castShadow = false;
    cyl(p, 1.6, 1.2, stone, 26, 0.6, 8, 12);
    // Lakefront palazzi
    const colors = [0xf1c27d, 0xe9a48b, 0xf7e2b2, 0xc9d3a8];
    for (let i = 0; i < 4; i++) { const x = -28 + i * 7.5, h = 9 + (i % 2) * 2.5; box(p, 6.5, h, 7, colors[i], x, h / 2, 6); box(p, 7, 0.4, 7.5, roof, x, h + 0.2, 6); for (let row = 0; row < Math.floor(h / 3); row++) for (const wx of [-2, 0, 2]) box(p, 1, 1.4, 0.15, glass, x + wx, 1.6 + row * 3, 9.6); }
    for (const x of [-30, 30]) kit.tree(p, x, 12, false);
    for (const x of [-20, 0, 20]) kit.lamp(p, x, 14, 4);
  }
  const builders = { bellagio, lecco, comocity };
  const SIGN = { comocity: 18, lecco: 13, bellagio: 16 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11);

  // --- Lake, shore, railings ---------------------------------------------------------------------------
  const { shoreline } = layout;
  const shape = new THREE.Shape(shoreline.map((p) => new THREE.Vector2(p.x, -p.z)));
  const water = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x3aa9cc, roughness: 0.35, metalness: 0.05 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.015; water.receiveShadow = true; water.name = 'lake-water'; scene.add(water);
  const shorePath = new THREE.CatmullRomCurve3(shoreline.map((p) => new THREE.Vector3(p.x, 0.08, p.z)), true);
  mesh(scene, new THREE.TubeGeometry(shorePath, 320, 0.7, 5, true), 0xe7d5af).castShadow = false;
  const gaps = (track.sections || []).flatMap((s) => [s.from, s.to]);
  const nearGap = (d) => gaps.some((g) => Math.abs(track.wrap(d - g + track.length / 2) - track.length / 2) < 6.5);
  const railLane = -track.roadWidth / 2 - 0.9;
  const shorePoint = (d, lane, y) => { const f = track.frame(d); return new THREE.Vector3(f.x + f.dz * lane, y, f.z - f.dx * lane); };
  for (let d = 0; d < track.length; d += 11.5) {
    if (nearGap(d)) continue;
    const p = shorePoint(d, railLane, 0.65); cyl(scene, 0.13, 1.3, cream, p.x, 0.65, p.z, 6);
  }
  // Rail in pieces so the bridges can leave the road through the openings.
  let piece = [];
  const flush = () => { if (piece.length > 2) mesh(scene, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(piece), piece.length * 2, 0.09, 5, false), cream).castShadow = false; piece = []; };
  const start = gaps.length ? gaps[0] : 0;
  for (let i = 0; i <= 200; i++) {
    const d = start + i / 200 * track.length;
    if (nearGap(d)) { flush(); continue; }
    piece.push(shorePoint(d, railLane, 1.05));
  }
  flush();

  // --- Mountains ---------------------------------------------------------------------------------------
  for (const m of mountainLayout(track, layout)) {
    const color = m.far ? (m.height > 55 ? 0x6f7f8f : 0x5f8a66) : 0x4f7f57;
    const mountain = cone(scene, m.radius, m.height, color, m.x, m.height / 2 - 1.5, m.z, 6 + Math.floor(m.radius / 20));
    mountain.rotation.y = m.turn; mountain.castShadow = false;
    if (m.snow) { const cap = cone(scene, m.radius * 0.28, m.height * 0.3, 0xf4f7fb, m.x, m.height * 0.85 - 1.5, m.z, mountain.geometry.parameters.radialSegments); cap.rotation.y = m.turn; cap.castShadow = false; }
  }

  // --- Boats -------------------------------------------------------------------------------------------
  const road = track.points(300);
  const waterDistance = (x, z) => { let best = Infinity; for (const p of road) { const gap = Math.hypot(p.x - x, p.z - z); if (gap < best) best = gap; } return best; };
  const inWater = (x, z, margin = 18) => inside(x, z, shoreline) && waterDistance(x, z) > margin;
  const random = seeded(4471);
  const animated = [];
  // Sailboats: bobbing at anchor.
  let placed = 0;
  for (let attempt = 0; attempt < 400 && placed < 12; attempt++) {
    const x = track.bounds.minX + random() * (track.bounds.maxX - track.bounds.minX), z = track.bounds.minZ + random() * (track.bounds.maxZ - track.bounds.minZ);
    if (!inWater(x, z, 19)) continue;
    // Never moor a 5.2 m mast where a bridge deck is lower than that: the mast would spear the roadway.
    if (bridgeClearance(track, [x, z], [x, z], SAIL_AIR, 3) < 1) continue;
    const boat = new THREE.Group(); boat.name = 'lake-boat'; boat.position.set(x, 0.2, z); boat.rotation.y = random() * Math.PI * 2; scene.add(boat);
    const hull = mesh(boat, new THREE.SphereGeometry(1, 10, 6), placed % 3 === 0 ? 0xffd56e : placed % 3 === 1 ? 0xf4f7ed : 0xe0503c, 0, 0.3, 0); hull.scale.set(1.1, 0.5, 3);
    cyl(boat, 0.07, 5, cream, 0, 2.7, 0);
    const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 5, 0, 0, 1.3, 0, 0, 1.3, 2.7], 3)); sail.computeVertexNormals();
    boat.add(new THREE.Mesh(sail, new THREE.MeshStandardMaterial({ color: placed % 2 ? 0xfff8dc : 0xffa589, side: THREE.DoubleSide })));
    kit.dynamic(boat);
    animated.push({ kind: 'sail', object: boat, phase: random() * 6.3 });
    placed++;
  }
  // Passenger boats ("battelli"): white hull, blue stripe, two decks, a red funnel; they cruise each arm and turn round.
  function battello() {
    const g = new THREE.Group();
    const hull = box(g, 3.2, 1.4, 13, 0xf4f7ed, 0, 0.7, 0); hull.scale.z = 1;
    cone(g, 1.6, 2.4, 0xf4f7ed, 0, 0.7, 7.6, 4).rotation.y = Math.PI / 4;
    box(g, 3.3, 0.35, 13.2, 0x1e5bd8, 0, 1.2, 0);
    box(g, 2.8, 1.3, 9, 0xf4f7ed, 0, 2.05, -0.5); for (let z = -4; z <= 3; z += 1.4) for (const x of [-1.42, 1.42]) box(g, 0.08, 0.7, 0.9, glass, x, 2.1, z);
    box(g, 2.4, 1.1, 5, 0xf4f7ed, 0, 3.25, -1); box(g, 2.6, 0.2, 9.4, 0x1e5bd8, 0, 3.9, -0.5);
    cyl(g, 0.35, 1.6, 0xe0503c, 0, 4.6, -2.5, 8); box(g, 2.4, 0.9, 0.12, glass, 0, 3.3, 1.55);
    return g;
  }
  // Car ferries ("traghetti"): flat double-ended deck with a wheelhouse; they never need to turn round.
  function traghetto() {
    const g = new THREE.Group();
    box(g, 4.4, 1, 12, 0xf4f7ed, 0, 0.5, 0); box(g, 4.6, 0.25, 12.4, 0x1e5bd8, 0, 1.05, 0);
    for (const z of [-6.1, 6.1]) { const ramp = box(g, 4, 0.2, 1.6, 0x8a8f99, 0, 1.25, z); ramp.rotation.x = z > 0 ? -0.35 : 0.35; }
    box(g, 2.2, 1.6, 2.6, 0xf4f7ed, 0, 2, -1); box(g, 2.3, 0.7, 2.7, glass, 0, 2.9, -1); box(g, 2.4, 0.15, 2.9, 0x1e5bd8, 0, 3.3, -1);
    for (const [x, z, c] of [[-1.1, 2.6, 0xe0503c], [1.1, 2.4, 0xffd766], [-1.1, -3.6, 0x2f8f3c]]) { box(g, 1.5, 0.7, 2.6, c, x, 1.55, z); box(g, 1.3, 0.5, 1.3, glass, x, 2.1, z - 0.3); }
    return g;
  }
  // Routes and air draughts live in como-routes.js so that a Node test can prove every boat fits under every bridge.
  for (const route of BOAT_ROUTES) {
    const g = route.kind === 'battello' ? battello() : traghetto();
    g.name = `lake-${route.kind}`; scene.add(g); kit.dynamic(g);
    const length = Math.hypot(route.to[0] - route.from[0], route.to[1] - route.from[1]);
    animated.push({ ...route, object: g, length, heading: 0 });
    // Small jetties at both ends of the crossing.
    for (const end of [route.from, route.to]) {
      const toward = Math.atan2(route.to[0] - route.from[0], route.to[1] - route.from[1]);
      const pier = new THREE.Group(); pier.position.set(end[0], 0, end[1]); pier.rotation.y = toward; scene.add(pier);
      box(pier, 2.4, 0.25, 6, 0xa97f52, 3.6, 0.55, 0); for (const z of [-2.4, 2.4]) for (const x of [2.6, 4.6]) cyl(pier, 0.14, 1, 0x8b6640, x, 0.4, z, 6);
    }
  }
  kit.animate((clock, dt) => {
    for (const item of animated) {
      if (item.kind === 'sail') {
        item.object.position.y = 0.2 + Math.sin(clock * 1.3 + item.phase) * 0.08;
        item.object.rotation.z = Math.sin(clock * 0.9 + item.phase) * 0.06;
        continue;
      }
      // Back and forth along the route: t goes 0→1→0; battelli turn round at the ends, ferries are double-ended.
      const period = (item.length / item.speed) * 2 + 6;
      const cycle = ((clock * 1 + item.phase * period) % period) / period;
      const raw = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
      const t = Math.min(1, Math.max(0, (raw - 0.03) / 0.94));
      const x = item.from[0] + (item.to[0] - item.from[0]) * t, z = item.from[1] + (item.to[1] - item.from[1]) * t;
      item.object.position.set(x, 0.12 + Math.sin(clock * 1.1 + item.phase) * 0.04, z);
      const forward = cycle < 0.5 ? 1 : -1;
      const target = Math.atan2((item.to[0] - item.from[0]) * forward, (item.to[1] - item.from[1]) * forward);
      if (item.kind === 'traghetto') item.object.rotation.y = Math.atan2(item.to[0] - item.from[0], item.to[1] - item.from[1]);
      else {
        let delta = target - item.object.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        item.object.rotation.y += Math.max(-dt * 1.6, Math.min(dt * 1.6, delta));
      }
    }
  });
}
