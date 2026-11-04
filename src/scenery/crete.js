/**
 * Crete Senesi scenery: golden wheat fields in many shades hugging the hills, dark plowed patches, rows of wheat
 * swaying by the road, grey calanchi ridges and white biancane domes, stone farmhouses with cypress drives, the red
 * brick abbey of Monte Oliveto Maggiore and a gigantic Monte Amiata on the horizon. The animals come from the kit.
 */
import * as THREE from 'three';

export const streetHouses = 0;
export const RESERVED = { amiata: 270, casale: 34, calanchi: 40, biancane: 34, abbazia: 46 };

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh, cream, glass } = kit;
  const stone = 0xd8c39a, clay = 0xb9b3a4, clayDark = 0xa39d8f, clayLight = 0xcfc8b6, brick = 0xa8523a, tile = 0x8f4b35, wood = 0x6b4a2f;
  let seed = 1977;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

  // --- Landmark builders (local frame: +z faces the road) --------------------------------------------
  function amiata(p) {
    // Enormous: fills the horizon. Main cone plus two shoulders, a pale summit and a darker forest skirt.
    const skirt = cone(p, 230, 34, 0x5f6f4a, 0, 15, -40, 9); skirt.castShadow = false;
    const main = cone(p, 190, 125, 0x5c6e8a, 0, 61, -60, 8); main.castShadow = false;
    const east = cone(p, 120, 74, 0x6d7f95, 140, 36, -20, 7); east.castShadow = false;
    const west = cone(p, 105, 62, 0x7b8a9c, -150, 30, -10, 7); west.castShadow = false;
    const summit = mesh(p, new THREE.SphereGeometry(16, 12, 8), 0xffe9c2, 0, 118, -60); summit.castShadow = false; summit.scale.y = 0.6;
    for (const [x, z] of [[-40, 40], [30, 46], [90, 30], [-95, 24]]) kit.cypress(p, x, z, 9);
  }
  function casale(p) {
    // Stone farmhouse with a dovecote tower and a loggia, a white drive lined with cypresses, hay bales, an olive.
    box(p, 46, 0.22, 34, 0xd9b66d, 0, 0.08, -2);
    box(p, 16, 6.5, 9, stone, -3, 3.25, -8); kit.roofTop(p, 17, 10.5, 6.5, tile); p.children[p.children.length - 1].position.set(-3, 7.7, -8);
    box(p, 5, 11, 5, stone, 7.5, 5.5, -8); box(p, 5.6, 0.5, 5.6, cream, 7.5, 11.2, -8); kit.roofTop(p, 5.6, 5.6, 11.4, tile); p.children[p.children.length - 1].position.set(7.5, 12.6, -8);
    for (const y of [3, 6, 9]) box(p, 0.9, 1.4, 0.2, glass, 7.5, y, -5.4);
    for (let x = -9.5; x <= 3.5; x += 3.2) box(p, 0.9, 1.4, 0.2, glass, x, 3.4, -3.4);
    for (let x = -9; x <= 3; x += 4) cyl(p, 0.3, 3, cream, x, 1.5, -2.6, 8); box(p, 14, 0.4, 3, tile, -3, 3.3, -2);
    box(p, 1.4, 2.6, 0.2, wood, -3, 1.3, -3.4);
    box(p, 4, 0.06, 30, 0xf0e6d2, 0, 0.2, 8);
    for (let z = -4; z <= 14; z += 4.5) for (const x of [-3.4, 3.4]) kit.cypress(p, x, z, 7 + (z % 9) * 0.3);
    for (let i = 0; i < 5; i++) { const bale = cyl(p, 0.9, 1.7, 0xe0c070, 12 + (i % 3) * 2.3, 0.9 + Math.floor(i / 3) * 1.6, 2 + Math.floor(i / 3) * 0.3, 12); bale.rotation.z = Math.PI / 2; }
    cyl(p, 0.35, 2.4, 0x6b4a2f, -15, 1.2, 0, 6); mesh(p, new THREE.IcosahedronGeometry(2.6, 1), 0x7f9a5a, -15, 3.8, 0);
    // Tractor and a well.
    box(p, 3.2, 1.6, 1.8, 0xe0503c, 15, 1.5, -6); box(p, 1.4, 1.4, 1.6, 0x14161d, 15.8, 2.9, -6); for (const [x, r] of [[13.8, 0.9], [16.4, 0.55]]) for (const z of [-7, -5]) cyl(p, r, 0.5, 0x14161d, x, r, z, 10).rotation.x = Math.PI / 2;
  }
  function calanchi(p) {
    // Grey clay badlands: a row of sharp eroded ridges with gullies, bare of vegetation.
    const base = cone(p, 30, 8, clayDark, 0, 3, -10, 7); base.castShadow = false;
    for (let i = 0; i < 9; i++) {
      const x = -22 + i * 5.5, h = 9 + (i % 3) * 4 + (i === 4 ? 6 : 0), z = -10 + (i % 2) * 5;
      const ridge = cone(p, 3.2 + (i % 2), h, i % 2 ? clay : clayLight, x, h / 2 + 2, z, 4); ridge.rotation.y = 0.4 + i * 0.3; ridge.castShadow = false;
      const gully = box(p, 0.9, h * 0.8, 0.5, clayDark, x + 1.4, h * 0.4 + 2, z + 2.6); gully.rotation.z = 0.25;
    }
    for (const [x, z] of [[-26, 6], [26, 5]]) kit.cypress(p, x, z, 6);
  }
  function biancane(p) {
    // White clay domes ("biancane") with a few thin ridges between them.
    box(p, 40, 0.16, 28, 0xcfc1a4, 0, 0.06, -2);
    for (const [x, z, r] of [[-12, -6, 6], [-2, -9, 7.5], [9, -5, 5.5], [16, -11, 4.5], [-16, -13, 4], [4, 2, 4.2]]) {
      const dome = mesh(p, new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xdcd6c8, x, 0.1, z); dome.scale.y = 0.55; dome.castShadow = false;
    }
    for (let i = 0; i < 5; i++) { const ridge = cone(p, 1.4, 5 + i, clayLight, -14 + i * 7, 2.5 + i / 2, 4, 4); ridge.castShadow = false; }
    kit.cypress(p, 19, 4, 7);
  }
  function abbazia(p) {
    // Monte Oliveto Maggiore: long red-brick monastery, church with a square bell tower, cloister, cypress ring on a mound.
    const mound = cyl(p, 40, 4, 0x8f8a5a, 0, 2, -8, 18); mound.castShadow = false;
    box(p, 34, 8, 10, brick, -4, 8, -12); kit.roofTop(p, 35, 11.5, 12, tile); p.children[p.children.length - 1].position.set(-4, 13.2, -12);
    kit.windows(p, 34, 5.4, -6.9, 2); for (const w of p.children.slice(-24)) w.position.x += -4;
    box(p, 12, 11, 9, brick, 18, 9.5, -8); kit.roofTop(p, 13, 10.5, 15, tile); p.children[p.children.length - 1].position.set(18, 16.2, -8);
    box(p, 4.2, 22, 4.2, brick, 24, 15, -12); box(p, 5, 0.6, 5, cream, 24, 26.3, -12); kit.roofTop(p, 5, 5, 26.6, tile); p.children[p.children.length - 1].position.set(24, 27.8, -12);
    for (const y of [18, 22]) for (const s of [-1.2, 1.2]) box(p, 0.7, 1.6, 0.2, glass, 24 + s, y, -9.8);
    const rose = mesh(p, new THREE.CylinderGeometry(1.6, 1.6, 0.3, 18), cream, 18, 12, -3.4); rose.rotation.x = Math.PI / 2;
    box(p, 2.2, 4, 0.3, wood, 18, 6, -3.4);
    // Cloister: a square of columns in front of the monastery.
    for (let x = -14; x <= 6; x += 4) for (const z of [-3, 1]) cyl(p, 0.35, 3.8, cream, x, 4 + 1.9, z, 8);
    box(p, 24, 0.5, 5, tile, -4, 10.2, -1);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; kit.cypress(p, Math.cos(a) * 34, -8 + Math.sin(a) * 26, 7 + (i % 3) * 1.5); }
  }
  const builders = { amiata, casale, calanchi, biancane, abbazia };
  const SIGN = { amiata: 90, casale: 17, calanchi: 15, biancane: 15, abbazia: 15 };
  const WIDTH = { amiata: 26, abbazia: 20 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11, WIDTH[item.kind] ?? 17);

  // --- Wheat fields: patches hugging the hills, in many golds plus a few plowed browns ------------------
  const road = track.points(420);
  const roadDistance = (x, z) => { let best = Infinity; for (const p of road) { const gap = Math.hypot(p.x - x, p.z - z); if (gap < best) best = gap; } return best; };
  const clear = (x, z, margin) => roadDistance(x, z) > margin && layout.landmarks.every((l) => Math.hypot(l.x - x, l.z - z) > (RESERVED[l.kind] || 23) + 6);
  const golds = [0xe8c56d, 0xd9a54a, 0xf2cd7a, 0xc9963a, 0xf0d98a, 0xdcb85c];
  const browns = [0x7a5a3a, 0x8f6b48];
  const patchMaterials = new Map();
  const patchMaterial = (color) => { if (!patchMaterials.has(color)) patchMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.95 })); return patchMaterials.get(color); };
  function patch(cx, cz, w, d, color, turn) {
    // A gently rounded quad grid whose vertices sit just above the terrain, so fields follow the hills.
    const n = 6;
    const positions = [];
    const indices = [];
    const c = Math.cos(turn), s = Math.sin(turn);
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = i / n - 0.5, v = j / n - 0.5;
      const round = 1 - 0.18 * (u * u + v * v) * 4;
      const lx = u * w * round, lz = v * d * round;
      const x = cx + lx * c - lz * s, z = cz + lx * s + lz * c;
      positions.push(x, kit.groundAt(x, z) + 0.07, z);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, cc = a + n + 1, dd = cc + 1; indices.push(a, cc, b, b, cc, dd); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const field = new THREE.Mesh(geometry, patchMaterial(color));
    field.receiveShadow = true;
    scene.add(field);
  }
  const { bounds } = track;
  let patches = 0;
  for (let attempt = 0; attempt < 900 && patches < 70; attempt++) {
    const x = bounds.minX - 90 + random() * (bounds.maxX - bounds.minX + 180);
    const z = bounds.minZ - 90 + random() * (bounds.maxZ - bounds.minZ + 180);
    const w = 26 + random() * 44, d = 22 + random() * 40;
    if (!clear(x, z, Math.max(w, d) / 2 + track.roadWidth / 2 + 3)) continue;
    const color = random() < 0.2 ? browns[patches % 2] : golds[Math.floor(random() * golds.length)];
    patch(x, z, w, d, color, random() * Math.PI);
    patches++;
  }
  // Rows of wheat stalks along the road edges, swaying in the summer breeze.
  const stalk = new THREE.BoxGeometry(0.16, 1.5, 0.16);
  const stalkMaterials = [0xe0b85a, 0xd9a54a, 0xf0c86a].map((c) => kit.mat(c));
  const rows = [];
  const instances = [[], [], []];
  for (let d = 0; d < track.length; d += 1.1) {
    for (const side of [-1, 1]) {
      const f = track.frame(d);
      const lane = side * (track.roadWidth / 2 + 3.2 + random() * 6);
      const x = f.x + f.dz * lane, z = f.z - f.dx * lane;
      if (!layout.landmarks.every((l) => Math.hypot(l.x - x, l.z - z) > (RESERVED[l.kind] || 23) - 4)) continue;
      if (random() < 0.35) continue;
      instances[Math.floor(random() * 3)].push({ x, y: kit.groundAt(x, z) + 0.75, z, phase: random() * 6.3, lean: random() * Math.PI * 2 });
    }
  }
  const dummy = new THREE.Object3D();
  instances.forEach((list, k) => {
    if (!list.length) return;
    const wheat = new THREE.InstancedMesh(stalk, stalkMaterials[k], list.length);
    wheat.castShadow = false; wheat.receiveShadow = false; wheat.userData.dynamic = true;
    list.forEach((s, i) => { dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(0, s.lean, 0); dummy.updateMatrix(); wheat.setMatrixAt(i, dummy.matrix); });
    scene.add(wheat);
    rows.push({ wheat, list });
  });
  const ear = new THREE.SphereGeometry(0.22, 6, 5);
  rows.forEach(({ list }, k) => {
    const ears = new THREE.InstancedMesh(ear, stalkMaterials[(k + 1) % 3], list.length);
    ears.castShadow = false; ears.receiveShadow = false; ears.userData.dynamic = true;
    list.forEach((s, i) => { dummy.position.set(s.x, s.y + 0.8, s.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.6, 1); dummy.updateMatrix(); ears.setMatrixAt(i, dummy.matrix); });
    scene.add(ears);
    rows[k].ears = ears;
  });
  // A few cypress pairs and hay bales scattered along the lap.
  for (let d = 60; d < track.length; d += 95) {
    const f = track.frame(d);
    for (const side of [-1, 1]) {
      const lane = side * (track.roadWidth / 2 + 5.5);
      const x = f.x + f.dz * lane, z = f.z - f.dx * lane;
      if (!clear(x, z, track.roadWidth / 2 + 4)) continue;
      const g = new THREE.Group(); g.position.set(x, kit.groundAt(x, z), z); scene.add(g);
      kit.cypress(g, 0, 0, 6.5 + (d % 40) / 10); kit.cypress(g, side * 2.8, 2.6, 5.5);
    }
  }
  kit.animate((clock) => {
    // The wheat leans with a slow travelling wave; only every third frame's worth of work thanks to the small counts.
    for (const { wheat, ears, list } of rows) {
      list.forEach((s, i) => {
        const lean = Math.sin(clock * 1.6 + s.phase + s.x * 0.05) * 0.16;
        dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(lean, s.lean, lean * 0.6); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); wheat.setMatrixAt(i, dummy.matrix);
        if (ears) { dummy.position.set(s.x + lean * 1.2, s.y + 0.8, s.z + lean * 0.7); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.6, 1); dummy.updateMatrix(); ears.setMatrixAt(i, dummy.matrix); }
      });
      wheat.instanceMatrix.needsUpdate = true;
      if (ears) ears.instanceMatrix.needsUpdate = true;
    }
  });
}
