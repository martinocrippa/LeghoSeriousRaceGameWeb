/**
 * Parco Increa at dawn: the old quarry lake is a pit in the middle of the loop (a hole in the ground plane with
 * sloping earth banks and water at the bottom), ringed by trees; geese, turtles and carps live at the lakeside
 * viewpoint; the Tangenziale viaduct, Cascina Increa, the green amphitheatre, the quagliodromo and the school
 * line the road; autumn leaves drift across the park in the wind.
 *
 * The animals the children asked for are all here and all moving: ducks flying over the park in a skein, red carp
 * and long grey catfish patrolling under the surface of the quarry lake. The turtles walking across the road are
 * circuit data (`critters`), drawn by the renderer, because the race has to know where they are.
 */
import * as THREE from 'three';

export const streetHouses = 8;
export const RESERVED = { tangenziale: 38, cascina: 30, quagliodromo: 26, anfiteatro: 22, lago: 24 };

const PIT_RADIUS = 52;
const WATER_RADIUS = 38;
const DEPTH = 6;

function pitCentre(track) {
  const points = track.points(300);
  return { x: points.reduce((s, p) => s + p.x, 0) / points.length, z: points.reduce((s, p) => s + p.z, 0) / points.length };
}

export function groundHoles(track) {
  const centre = pitCentre(track);
  return [{ x: centre.x, z: centre.z, radius: PIT_RADIUS }];
}

/** The pit and its tree ring stay free of the generic scatter. */
export function isReserved(track, layout, x, z) {
  const centre = pitCentre(track);
  return Math.hypot(x - centre.x, z - centre.z) < PIT_RADIUS + 16;
}

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh, cream, glass } = kit;
  const earth = 0x4a3a2c, darkEarth = 0x3b2d22, brick = 0xa8623f, roofTile = 0x8f4b35, wood = 0x8a6238, concrete = 0xb5afa4, grassDawn = 0x6f8a3a;
  let seed = 31;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const animated = [];

  // --- Landmark builders (local frame: +z faces the road) -------------------------------------------
  function tangenziale(p) {
    // A stretch of the Tangenziale Est viaduct: concrete deck on pillars, guard rails, a lorry and two cars.
    for (const x of [-24, -8, 8, 24]) for (const z of [-3.6, 3.6]) cyl(p, 0.9, 7, concrete, x, 3.5, z, 10);
    box(p, 60, 1.1, 11, concrete, 0, 7.4, 0);
    box(p, 60, 0.12, 9.6, 0x3d4149, 0, 8.02, 0);
    for (let x = -27; x <= 27; x += 6) box(p, 2.6, 0.03, 0.18, 0xd8d8dc, x, 8.1, 0);
    for (const z of [-5.2, 5.2]) { box(p, 60, 0.3, 0.2, 0x9aa0a8, 0, 8.7, z); for (let x = -28; x <= 28; x += 4) box(p, 0.14, 0.9, 0.14, 0x9aa0a8, x, 8.5, z); }
    // Lorry and cars on the deck.
    box(p, 7, 2.6, 2.4, 0xe0503c, -12, 9.35, -2.4); box(p, 2.4, 2.4, 2.4, 0xffd766, -16.7, 9.25, -2.4); for (const x of [-15, -10]) for (const z of [-3.4, -1.4]) cyl(p, 0.55, 0.4, 0x14161d, x, 8.55, z, 8).rotation.x = Math.PI / 2;
    for (const [x, c] of [[6, 0x1e5bd8], [18, 0xf4f0e2]]) { box(p, 3.6, 1.1, 1.9, c, x, 8.75, 2.4); box(p, 2, 0.8, 1.7, glass, x, 9.6, 2.4); }
    // Green motorway sign on the near side.
    box(p, 0.3, 9.5, 0.3, 0x5a5f66, -6, 4.75, 8); box(p, 9, 2.4, 0.3, 0x2f7d4f, -1.5, 9.4, 8); box(p, 8.4, 0.5, 0.05, 0xf4f0e2, -1.5, 9.4, 8.2);
  }
  function anfiteatro(p) {
    // The park's green amphitheatre: concentric grass steps around a small stage.
    for (let i = 0; i < 4; i++) { const step = cyl(p, 14 - i * 2.6, 0.9, i % 2 ? 0x6f8a3a : 0x7f9a44, 0, 0.45 + i * 0.85, -2, 26); step.castShadow = false; }
    cyl(p, 3.6, 0.6, 0xd9c4a1, 0, 3.9, -2, 20);
    box(p, 4.2, 3, 0.4, wood, 0, 5.9, -5.4); box(p, 4.6, 0.3, 3.2, 0xe0503c, 0, 7.5, -4);
    for (const x of [-2, 2]) cyl(p, 0.12, 3, wood, x, 6, -2.6, 6);
    for (const [x, z] of [[-13, 8], [13, 8], [-15, -8], [15, -8]]) kit.tree(p, x, z, false);
    // Kids on the steps.
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4, r = 9.5 - (i % 2) * 2.6; box(p, 0.7, 1.1, 0.5, [0xe0503c, 0xffd766, 0x1e5bd8, 0xff7a12][i % 4], Math.sin(a) * r, 1.8 + (i % 2 ? 0 : 0.85), -2 + Math.cos(a) * r * 0.6); }
  }
  function cascina(p) {
    // Cascina Increa: long brick farmhouse with a porch, courtyard, barn, well and a tractor.
    box(p, 40, 0.25, 30, 0xb59a74, 0, 0.1, -3);
    box(p, 26, 7, 8, brick, -4, 3.5, -10); kit.roofTop(p, 27, 9.5, 7, roofTile); p.children[p.children.length - 1].position.set(-4, 8.2, -10);
    kit.windows(p, 26, 1.9, -5.9, 2); for (const w of p.children.slice(-18)) w.position.x += -4;
    for (let x = -15; x <= 7; x += 4.4) cyl(p, 0.38, 3.6, 0xd9c4a1, x, 1.8, -5.2, 8);
    box(p, 24, 0.5, 3.4, roofTile, -4, 3.9, -4.4);
    box(p, 12, 6, 9, 0xc98a5a, 12, 3, 4); kit.roofTop(p, 13, 10, 6, roofTile); p.children[p.children.length - 1].position.set(12, 7.2, 4);
    box(p, 4, 4.2, 0.3, wood, 12, 2.1, 8.6);
    for (let i = 0; i < 6; i++) { const bale = cyl(p, 0.9, 1.6, 0xe0c070, 8 + (i % 3) * 2.2, 0.9 + Math.floor(i / 3) * 1.7, -1 - Math.floor(i / 3) * 0.2, 12); bale.rotation.z = Math.PI / 2; }
    cyl(p, 1.1, 1.2, 0x9a9a8a, -14, 0.6, 5, 12); for (const x of [-15, -13]) box(p, 0.15, 2.4, 0.15, wood, x, 1.8, 5); box(p, 2.6, 0.3, 1.6, roofTile, -14, 3.1, 5);
    // Tractor.
    box(p, 3.2, 1.6, 1.8, 0xe0503c, -6, 1.5, 5); box(p, 1.4, 1.4, 1.6, 0x14161d, -5.2, 2.9, 5); for (const [x, r] of [[-7.2, 0.9], [-4.6, 0.55]]) for (const z of [4, 6]) cyl(p, r, 0.5, 0x14161d, x, r, z, 10).rotation.x = Math.PI / 2;
    for (const [x, z] of [[-19, 9], [19, -9]]) kit.tree(p, x, z, false);
  }
  function quagliodromo(p) {
    // Fenced training meadow for pointing dogs: quails in the grass, a dog on point, the trainer's shed.
    box(p, 32, 0.2, 22, grassDawn, 0, 0.08, -1);
    for (let x = -16; x <= 16; x += 2) { for (const z of [-12, 10]) box(p, 0.16, 1.2, 0.16, wood, x, 0.6, z); }
    for (let z = -12; z <= 10; z += 2) for (const x of [-16, 16]) box(p, 0.16, 1.2, 0.16, wood, x, 0.6, z);
    for (const z of [-12, 10]) box(p, 32, 0.1, 0.1, wood, 0, 1.05, z); for (const x of [-16, 16]) box(p, 0.1, 0.1, 22, wood, x, 1.05, -1);
    for (let i = 0; i < 40; i++) { const g = box(p, 0.2, 0.8 + random() * 0.6, 0.2, i % 3 ? 0x8a9a3a : 0xb0a040, -14 + random() * 28, 0.5, -10 + random() * 18); g.rotation.y = random() * 3; }
    // Quails: small brown bodies, tiny heads with a crest.
    for (const [x, z] of [[-6, -4], [-3, 2], [4, -6], [7, 3], [1, 6], [-9, 5]]) {
      const body = mesh(p, new THREE.SphereGeometry(0.42, 8, 6), 0x8a6a3a, x, 0.6, z); body.scale.set(1, 0.8, 1.3);
      mesh(p, new THREE.SphereGeometry(0.2, 6, 5), 0x6b4a2f, x, 0.95, z + 0.5); box(p, 0.06, 0.28, 0.06, 0x2b2b2b, x, 1.2, z + 0.55);
    }
    // Pointing dog: frozen with one paw lifted and the tail straight out.
    const dogX = -1, dogZ = -2;
    kit.legs(p, dogX, dogZ, 0.3, 0.55, 0.8, 0xf4f0e2); const dogBody = mesh(p, new THREE.SphereGeometry(0.5, 10, 7), 0xf4f0e2, dogX, 1.15, dogZ); dogBody.scale.set(0.9, 0.8, 1.8);
    box(p, 0.5, 0.45, 0.7, 0xd9642a, dogX, 1.45, dogZ + 1.1); box(p, 0.12, 0.12, 0.9, 0xf4f0e2, dogX, 1.45, dogZ - 1.3); for (const s of [-0.2, 0.2]) box(p, 0.12, 0.3, 0.1, 0xd9642a, dogX + s, 1.75, dogZ + 1.15);
    // Trainer's shed and sign.
    box(p, 6, 3.2, 4, wood, 12, 1.6, -8); kit.roofTop(p, 6.6, 4.6, 3.2, roofTile); p.children[p.children.length - 1].position.set(12, 4.4, -8);
    box(p, 1.2, 2.2, 0.15, 0x3b2d22, 12, 1.1, -5.9);
  }
  function lago(p) {
    // Lakeside viewpoint: a wooden pier toward the pit, geese on the bank, turtles on a log, reeds and a board.
    box(p, 26, 0.2, 18, grassDawn, 0, 0.08, 2);
    box(p, 2.6, 0.22, 12, wood, 0, 0.62, -8); for (const z of [-13, -9, -5]) for (const x of [-1.5, 1.5]) cyl(p, 0.14, 1.1, 0x6b4a2f, x, 0.4, z, 6);
    for (const z of [-13.5, -3]) box(p, 3, 0.12, 0.12, 0x6b4a2f, 0, 1.2, z); for (const x of [-1.5, 1.5]) box(p, 0.12, 0.12, 11, 0x6b4a2f, x, 1.2, -8);
    // Geese: white bodies, black heads and necks, orange beaks and feet.
    for (const [x, z, a] of [[-7, -2, 0.4], [-9.5, 1, -0.6], [6, -1, 2.4], [8.5, 3, 1.6], [-4, 4, 3]]) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = a; p.add(g);
      for (const s of [-0.18, 0.18]) box(g, 0.12, 0.55, 0.12, 0xff8a3d, s, 0.35, 0);
      const body = mesh(g, new THREE.SphereGeometry(0.5, 10, 7), 0xf4f0e2, 0, 0.95, 0); body.scale.set(0.9, 0.8, 1.4);
      box(g, 0.16, 0.9, 0.16, 0x14161d, 0, 1.6, 0.55); mesh(g, new THREE.SphereGeometry(0.2, 8, 6), 0x14161d, 0, 2.1, 0.62); box(g, 0.1, 0.1, 0.32, 0xff8a3d, 0, 2.05, 0.9);
      box(g, 0.1, 0.1, 0.5, 0x14161d, 0, 1.05, -0.8);
    }
    // Turtles sunning on a log.
    const log = cyl(p, 0.45, 5, 0x6b4a2f, 6, 0.45, -11, 9); log.rotation.z = Math.PI / 2;
    for (const x of [4.6, 6.2, 7.6]) { const shell = mesh(p, new THREE.SphereGeometry(0.42, 8, 6), 0x3f6b2f, x, 1.05, -11); shell.scale.y = 0.55; mesh(p, new THREE.SphereGeometry(0.16, 6, 5), 0x6b8a3a, x + 0.45, 0.95, -11); }
    for (let i = 0; i < 16; i++) cyl(p, 0.08, 1.6 + (i % 3) * 0.4, 0x5e7f2f, -12 + i * 1.5 + (i % 2) * 0.4, 0.9, -6 - (i % 3) * 1.2, 5);
    for (const x of [-11, 11]) kit.tree(p, x, 6, false);
    box(p, 2.6, 1.6, 0.12, wood, -5, 1.6, 8); for (const x of [-6, -4]) box(p, 0.12, 1.6, 0.12, wood, x, 0.8, 8);
  }
  const builders = { tangenziale, anfiteatro, cascina, quagliodromo, lago };
  const SIGN = { tangenziale: 13, cascina: 15, quagliodromo: 13, anfiteatro: 15, lago: 12 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11);

  // --- The quarry pit: sloping banks down to the water, carps under the surface, a ring of trees -------
  const centre = pitCentre(track);
  const profile = [new THREE.Vector2(PIT_RADIUS + 0.4, 0.02), new THREE.Vector2(PIT_RADIUS - 2, -0.6), new THREE.Vector2(WATER_RADIUS + 4, -DEPTH + 1.2), new THREE.Vector2(WATER_RADIUS - 1, -DEPTH), new THREE.Vector2(0, -DEPTH - 0.4)];
  const bank = mesh(scene, new THREE.LatheGeometry(profile, 40), darkEarth, centre.x, 0, centre.z); bank.castShadow = false; bank.material.side = THREE.DoubleSide;
  const rim = mesh(scene, new THREE.RingGeometry(PIT_RADIUS - 0.5, PIT_RADIUS + 3, 40), earth, centre.x, 0.03, centre.z); rim.rotation.x = -Math.PI / 2; rim.castShadow = false;
  const water = new THREE.Mesh(new THREE.CircleGeometry(WATER_RADIUS, 40), new THREE.MeshStandardMaterial({ color: 0x2f7f8a, transparent: true, opacity: 0.72, roughness: 0.3, metalness: 0.05 }));
  water.rotation.x = -Math.PI / 2; water.position.set(centre.x, -DEPTH + 0.35, centre.z); water.name = 'lake-water'; water.castShadow = false; scene.add(water);
  // Red carp near the surface, and four catfish cruising slowly along the bottom: a "siluro" is twice as long as a
  // carp, dark grey, flat-headed and has whiskers, so it has to be built rather than recoloured.
  for (let i = 0; i < 16; i++) {
    const a = random() * Math.PI * 2, r = 6 + random() * (WATER_RADIUS - 10);
    const fish = new THREE.Group();
    fish.position.set(centre.x + Math.cos(a) * r, -DEPTH + 0.05, centre.z + Math.sin(a) * r);
    scene.add(fish);
    const red = i % 4 ? 0xd94a1e : 0xe8873a;
    const body = mesh(fish, new THREE.SphereGeometry(0.7, 8, 6), red, 0, 0, 0);
    body.scale.set(0.6, 0.35, 1.6); body.castShadow = false;
    const tail = mesh(fish, new THREE.ConeGeometry(0.34, 0.8, 4), red, 0, 0, -1.4);
    tail.rotation.x = -Math.PI / 2; tail.castShadow = false;
    const fin = mesh(fish, new THREE.ConeGeometry(0.26, 0.5, 4), 0xf0a058, 0, 0.26, 0.1);
    fin.castShadow = false;
    kit.dynamic(fish); animated.push({ kind: 'carp', object: fish, angle: a, radius: r, speed: 0.08 + random() * 0.08, phase: random() * 6, depth: 0.05 });
  }
  for (let i = 0; i < 4; i++) {
    const a = random() * Math.PI * 2, r = 9 + random() * (WATER_RADIUS - 16);
    const siluro = new THREE.Group();
    siluro.position.set(centre.x + Math.cos(a) * r, -DEPTH - 0.6, centre.z + Math.sin(a) * r);
    scene.add(siluro);
    const body = mesh(siluro, new THREE.SphereGeometry(0.9, 9, 7), 0x4a4f48, 0, 0, 0);
    body.scale.set(0.7, 0.55, 3.1); body.castShadow = false;
    const head = mesh(siluro, new THREE.SphereGeometry(0.7, 8, 6), 0x565c52, 0, 0, 2.3);
    head.scale.set(1.1, 0.5, 0.9); head.castShadow = false;
    for (const side of [-1, 1]) {
      const whisker = cyl(siluro, 0.05, 1.6, 0x6f7568, side * 0.45, -0.05, 2.9, 4);
      whisker.rotation.set(-1.2, 0, side * 0.5); whisker.castShadow = false;
    }
    const tail = mesh(siluro, new THREE.ConeGeometry(0.45, 1.4, 4), 0x4a4f48, 0, 0, -3.1);
    tail.rotation.x = -Math.PI / 2; tail.castShadow = false;
    kit.dynamic(siluro); animated.push({ kind: 'carp', object: siluro, angle: a, radius: r, speed: 0.04 + random() * 0.03, phase: random() * 6, depth: -0.6 });
  }
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * Math.PI * 2, r = PIT_RADIUS + 6 + (i % 3) * 4;
    kit.tree(scene, centre.x + Math.cos(a) * r, centre.z + Math.sin(a) * r, i % 4 === 0);
  }
  const reeds = [];
  for (let i = 0; i < 40; i++) {
    const a = random() * Math.PI * 2, r = WATER_RADIUS + 0.5 + random() * 2.5;
    const reed = cyl(scene, 0.07, 1.6 + random() * 0.8, 0x5e7f2f, centre.x + Math.cos(a) * r, -DEPTH + 1, centre.z + Math.sin(a) * r, 5);
    reed.geometry.translate(0, reed.geometry.parameters.height / 2, 0); reed.position.y = -DEPTH + 0.3;
    kit.dynamic(reed); reeds.push({ object: reed, phase: random() * 6 });
  }

  // --- Ducks over the park ---------------------------------------------------------------------------------
  // A skein of nine mallards on a long circuit over the quarry, in a V with the leader in front. They fly low
  // enough to be seen from the car (about twenty metres) and their wings beat all the way round.
  const ducks = [];
  // Wide enough that the skein crosses over the road on part of its circuit: at PIT_RADIUS + 34 they stayed over
  // the water in the middle, where a driver never looks.
  const duckRadius = PIT_RADIUS + 62;
  for (let i = 0; i < 9; i++) {
    const duck = new THREE.Group();
    const body = mesh(duck, new THREE.SphereGeometry(0.55, 9, 7), 0x6b5a3a, 0, 0, 0);
    body.scale.set(0.8, 0.75, 1.7); body.castShadow = false;
    const neck = mesh(duck, new THREE.SphereGeometry(0.28, 7, 6), 0x2f6b4a, 0, 0.18, 0.85);
    neck.scale.set(1, 1.2, 1); neck.castShadow = false;
    const beak = box(duck, 0.18, 0.12, 0.42, 0xffb02e, 0, 0.14, 1.28); beak.castShadow = false;
    const tail = mesh(duck, new THREE.ConeGeometry(0.22, 0.6, 4), 0x4a3f2a, 0, 0.08, -1.2);
    tail.rotation.x = Math.PI / 2; tail.castShadow = false;
    const wings = [];
    for (const side of [-1, 1]) {
      const wing = box(duck, 1.5, 0.08, 0.6, 0x8a7a52, side * 0.85, 0.12, -0.1);
      wing.castShadow = false;
      wings.push({ mesh: wing, side });
    }
    scene.add(duck);
    kit.dynamic(duck);
    // The V: the leader on the axis, the others trailing back and out to alternate sides.
    const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    ducks.push({ object: duck, wings, lead: rank * 0.055, side: rank * side * 3.4, phase: random() * 6.3, angle: 0 });
  }
  function flyDuck(duck, clock, dt) {
    duck.angle = (clock * 0.11) - duck.lead;
    const r = duckRadius + duck.side;
    const x = centre.x + Math.cos(duck.angle) * r, z = centre.z + Math.sin(duck.angle) * r;
    duck.object.position.set(x, 17 + Math.sin(clock * 0.5 + duck.phase) * 2.4, z);
    duck.object.rotation.y = Math.atan2(-Math.sin(duck.angle), Math.cos(duck.angle)) + Math.PI / 2;
    const beat = Math.sin(clock * 7 + duck.phase);
    for (const wing of duck.wings) wing.mesh.rotation.z = wing.side * beat * 0.8;
    duck.object.rotation.z = beat * 0.06;
  }

  // The turtles that cross the road are not built here any more: they are `critters` in tracks/increa.js, so the
  // race knows where they are, and the renderer draws them from that list (buildCritters).

  // --- Wind: autumn leaves tumbling across the park -------------------------------------------------------
  const leafColors = [0xc27a2e, 0xe0a43a, 0x9a4a24, 0xd8c04a];
  const leaves = [];
  const span = { minX: track.bounds.minX - 10, maxX: track.bounds.maxX + 10, minZ: track.bounds.minZ - 10, maxZ: track.bounds.maxZ + 10 };
  for (let i = 0; i < 48; i++) {
    const leaf = box(scene, 0.5, 0.05, 0.36, leafColors[i % leafColors.length], span.minX + random() * (span.maxX - span.minX), 0.5 + random() * 4, span.minZ + random() * (span.maxZ - span.minZ));
    leaf.castShadow = false; kit.dynamic(leaf);
    leaves.push({ object: leaf, phase: random() * 6.3, lift: 0.8 + random() * 3.5, speed: 0.8 + random() * 0.5 });
  }
  const wind = new THREE.Vector3(1, 0, 0.35).normalize();
  kit.animate((clock, dt) => {
    const gust = 7 + Math.sin(clock * 0.7) * 3 + Math.sin(clock * 1.9) * 1.5;
    for (const leaf of leaves) {
      const o = leaf.object;
      o.position.addScaledVector(wind, gust * leaf.speed * dt);
      o.position.y = leaf.lift + Math.sin(clock * 2.2 + leaf.phase) * 0.8;
      o.position.z += Math.sin(clock * 1.3 + leaf.phase) * dt * 2;
      o.rotation.x += dt * 3; o.rotation.y += dt * 1.7;
      if (o.position.x > span.maxX) { o.position.x = span.minX; o.position.z = span.minZ + ((leaf.phase * 40) % (span.maxZ - span.minZ)); }
      if (o.position.z > span.maxZ) o.position.z = span.minZ;
    }
    for (const reed of reeds) reed.object.rotation.z = Math.sin(clock * 2.4 + reed.phase) * 0.12 * (gust / 7);
    for (const carp of animated) {
      carp.angle += dt * carp.speed;
      carp.object.position.set(centre.x + Math.cos(carp.angle) * carp.radius, -DEPTH + carp.depth + Math.sin(clock * 1.5 + carp.phase) * 0.12, centre.z + Math.sin(carp.angle) * carp.radius);
      carp.object.rotation.y = -carp.angle;
    }
    for (const duck of ducks) flyDuck(duck, clock, dt);
  });
}
