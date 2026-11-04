/**
 * Brugherio scenery: Palazzo Ghirlanda-Silva (the library), Villa Fiorita with its park, Piazza Roma with the
 * church of San Bartolomeo and its tall bell tower, the old water tower, the round Tempietto di San Lucio and
 * plenty of little colourful houses. Toy caricatures; placements are fictional.
 */
import * as THREE from 'three';

export const streetHouses = 24;
export const RESERVED = { palazzo: 30, villafiorita: 36, sanbartolomeo: 34, torre: 22, tempietto: 24 };

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh, cream, glass, green } = kit;
  const ochre = 0xe4b96b, cobble = 0x8d8983, stone = 0xd9cfbf, terracotta = 0xc56d51, orange = 0xff7a12;

  function palazzo(p) {
    // Long two-storey palace with a central portal, balcony, clock and the town flags; a bus stop out front.
    box(p, 40, 0.2, 24, 0xd9d2c4, 0, 0.08, 2);
    box(p, 30, 9, 11, ochre, 0, 4.5, -4); box(p, 31, 0.6, 12, stone, 0, 9.3, -4); kit.roofTop(p, 31, 12.5, 9.6, terracotta); p.children[p.children.length - 1].position.set(0, 10.8, -4);
    kit.windows(p, 30, 2, 1.6, 2);
    box(p, 3, 4.6, 0.4, 0x6b4a2f, 0, 2.3, 1.7); box(p, 5, 0.4, 1.6, stone, 0, 4.9, 2.3); for (let x = -2.2; x <= 2.2; x += 0.55) box(p, 0.1, 0.9, 0.1, 0x3a3f45, x, 5.5, 3);
    const clock = mesh(p, new THREE.CircleGeometry(1.1, 18), cream, 0, 7.6, 1.62); clock.rotation.y = 0; box(p, 0.12, 0.8, 0.08, 0x3a3f45, 0, 7.9, 1.7); box(p, 0.7, 0.12, 0.08, 0x3a3f45, 0.3, 7.6, 1.7);
    for (const [x, c] of [[-6, 0x65ae81], [6, 0xffd766]]) { cyl(p, 0.08, 4, cream, x, 11.6, -2, 5); box(p, 1.6, 1, 0.06, c, x + 0.85, 13.2, -2); }
    for (const x of [-12, 12]) kit.lamp(p, x, 6, 4.2);
    // Bus stop with an orange bus.
    box(p, 4, 0.2, 2, 0x8d9299, 15, 3.1, 8); for (const x of [13.2, 16.8]) box(p, 0.15, 3, 0.15, 0x8d9299, x, 1.5, 8.8);
    box(p, 9, 2.8, 2.4, orange, -12, 1.9, 8); box(p, 8.4, 1.1, 2.5, glass, -12, 2.5, 8); for (const x of [-15, -9]) for (const z of [6.9, 9.1]) cyl(p, 0.55, 0.4, 0x14161d, x, 0.55, z, 8).rotation.x = Math.PI / 2;
    for (const x of [-19, 19]) kit.tree(p, x, -8, false);
  }
  function villafiorita(p) {
    // Villa Fiorita and its park: hedges, a fountain, flower beds and big trees.
    box(p, 48, 0.2, 34, 0x81bd77, 0, 0.08, -2);
    kit.builders.villa(p);
    for (const x of [-20, 20]) box(p, 1.4, 1.2, 26, green, x, 0.6, -2);
    box(p, 46, 1.2, 1.4, green, 0, 0.6, -15);
    cyl(p, 3, 0.5, cream, 0, 0.45, 11, 24); cyl(p, 2.6, 0.12, 0x68cbd4, 0, 0.75, 11, 24); cyl(p, 0.35, 2.6, cream, 0, 1.6, 11, 8); mesh(p, new THREE.SphereGeometry(0.7, 12, 8), 0x9ae8ed, 0, 3, 11);
    for (let i = 0; i < 10; i++) mesh(p, new THREE.IcosahedronGeometry(0.5, 0), [0xf69db0, 0xffdd72, 0xe0503c][i % 3], -13 + i * 2.9, 0.55, 8);
    for (const [x, z] of [[-17, -12], [17, -12], [-14, 4], [15, 5]]) kit.tree(p, x, z, false);
    for (const x of [-8, 8]) kit.lamp(p, x, 13, 4);
  }
  function sanbartolomeo(p) {
    // Piazza Roma: cobbled square with a fountain and café umbrellas, the church and a tall bell tower, arcaded houses.
    const square = box(p, 40, 0.18, 28, cobble, 0, 0.08, 2); square.receiveShadow = true;
    box(p, 12, 10, 16, 0xf3dcb3, -4, 5, -8); kit.roofTop(p, 13, 17, 10, terracotta); p.children[p.children.length - 1].position.set(-4, 11.2, -8);
    box(p, 13, 12, 1.2, 0xf6efe3, -4, 6, 0.4); cone(p, 7, 3.5, 0xf6efe3, -4, 13.7, 0.4, 4).rotation.y = Math.PI / 4;
    box(p, 2.6, 4, 0.3, 0x6b4a2f, -4, 2, 1.1); const rose = mesh(p, new THREE.CylinderGeometry(1.4, 1.4, 0.3, 18), 0xbcbbe1, -4, 8.2, 1.1); rose.rotation.x = Math.PI / 2;
    box(p, 4, 24, 4, 0xe8b98b, 6, 12, -6); box(p, 4.8, 0.6, 4.8, cream, 6, 24.3, -6); cone(p, 3.2, 5.5, terracotta, 6, 27.4, -6, 4).rotation.y = Math.PI / 4;
    for (const y of [15, 19]) for (const s of [-1.1, 1.1]) box(p, 0.6, 1.6, 0.2, glass, 6 + s, y, -3.9);
    const clock = mesh(p, new THREE.CircleGeometry(1.1, 18), cream, 6, 22, -3.9); clock.rotation.y = 0;
    cyl(p, 2.4, 0.5, stone, 8, 0.45, 8, 20); cyl(p, 2, 0.15, 0x68cbd4, 8, 0.75, 8, 20); cyl(p, 0.3, 2, stone, 8, 1.5, 8, 8); mesh(p, new THREE.SphereGeometry(0.5, 10, 7), 0x9ae8ed, 8, 2.7, 8);
    for (let i = 0; i < 4; i++) { const x = -15 + i * 3.4; cyl(p, 0.08, 2.4, cream, x, 1.2, 9, 5); cone(p, 1.5, 0.9, i % 2 ? orange : cream, x, 2.7, 9, 10); box(p, 1.2, 0.1, 1.2, 0x6b4a2f, x, 0.8, 9); }
    // Arcaded houses closing the square on the left.
    box(p, 8, 8, 10, 0xe6d7af, -16, 4, -6); kit.roofTop(p, 8.5, 11, 8, terracotta); p.children[p.children.length - 1].position.set(-16, 9.2, -6);
    for (let z = -9.5; z <= -2.5; z += 3.5) cyl(p, 0.35, 3.2, cream, -11.6, 1.6, z, 8); box(p, 1.2, 0.4, 9, cream, -11.6, 3.4, -6);
    for (const y of [4.8, 6.9]) for (let z = -9; z <= -3; z += 3) box(p, 0.15, 1.2, 0.9, glass, -11.9, y, z);
    for (const x of [-18, 18]) kit.lamp(p, x, 11, 4);
  }
  function torre(p) {
    // The old water tower: four legs, a big tank with a conical lid, a ladder and a little pump house.
    box(p, 16, 0.2, 14, 0xb5ad9c, 0, 0.08, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = cyl(p, 0.35, 16, 0x8d9299, sx * 2.6, 8, sz * 2.6, 8); leg.rotation.z = -sx * 0.08; leg.rotation.x = sz * 0.08; }
    for (const y of [5, 10]) { box(p, 6, 0.3, 0.3, 0x8d9299, 0, y, 2.6); box(p, 6, 0.3, 0.3, 0x8d9299, 0, y, -2.6); box(p, 0.3, 0.3, 6, 0x8d9299, 2.6, y, 0); box(p, 0.3, 0.3, 6, 0x8d9299, -2.6, y, 0); }
    cyl(p, 4.2, 6, 0xd9cfbf, 0, 19, 0, 16); cyl(p, 4.4, 0.5, 0x8d9299, 0, 16.2, 0, 16); cone(p, 4.6, 2.6, terracotta, 0, 23.3, 0, 16);
    box(p, 5, 1.2, 0.1, 0x1e5bd8, 0, 19, 4.25);
    for (let y = 1; y < 16; y += 1.2) box(p, 0.7, 0.08, 0.08, 0x8d9299, 3.4, y, 0); box(p, 0.08, 16, 0.08, 0x8d9299, 3.1, 8, 0); box(p, 0.08, 16, 0.08, 0x8d9299, 3.7, 8, 0);
    box(p, 4, 3, 3.5, 0xe6d7af, -5.5, 1.5, 3); kit.roofTop(p, 4.5, 4, 3, terracotta); p.children[p.children.length - 1].position.set(-5.5, 4.2, 3);
    kit.tree(p, 6, 5, false);
  }
  function tempietto(p) {
    // Tempietto di San Lucio: a small round chapel with a dome, a columned porch and cypresses.
    box(p, 20, 0.2, 18, 0x9fbf7a, 0, 0.08, -1);
    cyl(p, 4.2, 6, 0xf3dcb3, 0, 3, -3, 20); cyl(p, 4.6, 0.6, stone, 0, 6.3, -3, 20);
    const dome = mesh(p, new THREE.SphereGeometry(4.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), terracotta, 0, 6.6, -3); dome.castShadow = false;
    cyl(p, 0.4, 2, cream, 0, 11.6, -3, 8); mesh(p, new THREE.SphereGeometry(0.45, 8, 6), 0xffd053, 0, 12.9, -3);
    for (const x of [-2.4, 0, 2.4]) cyl(p, 0.32, 4.6, cream, x, 2.3, 2, 8); box(p, 7, 0.5, 3.6, stone, 0, 4.85, 1); cone(p, 4.5, 1.6, terracotta, 0, 5.9, 1, 4).rotation.y = Math.PI / 4;
    box(p, 1.4, 2.6, 0.2, 0x6b4a2f, 0, 1.3, 1.25);
    for (const x of [-7, 7]) kit.cypress(p, x, -4, 7);
    kit.lamp(p, -5, 5, 3.6); kit.lamp(p, 5, 5, 3.6);
  }
  const builders = { palazzo, villafiorita, sanbartolomeo, torre, tempietto, village: kit.builders.village };
  const SIGN = { palazzo: 12, villafiorita: 16, sanbartolomeo: 14, torre: 9, tempietto: 9 };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind], SIGN[item.kind] ?? 11);

  // Extra house clusters and lamps on the outer side of the cobbled centre, so the town feels busy.
  const colors = [0xf4cc91, 0xe89b81, 0xf8e6b4, 0xccdca1, 0xd6b1a6];
  for (let i = 0; i < 6; i++) {
    const d = 322 + i * 24;
    const f = track.frame(d);
    const lane = track.roadWidth / 2 + 13;
    const x = f.x + f.dz * lane, z = f.z - f.dx * lane;
    if (!layout.landmarks.every((l) => Math.hypot(l.x - x, l.z - z) > (RESERVED[l.kind] || 23) + 4)) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(f.x - x, f.z - z); scene.add(g);
    const h = 6 + (i % 3) * 1.5;
    box(g, 6, h, 6, colors[i % colors.length], 0, h / 2, 0); kit.roofTop(g, 6.5, 6.5, h); kit.windows(g, 6, 1.8, 3.05, Math.floor(h / 2.3));
    box(g, 1, 1.9, 0.15, glass, 0, 0.95, 3.1); box(g, 3, 0.2, 0.9, cream, 0, 3.3, 3.4); for (let k = 0; k < 3; k++) mesh(g, new THREE.IcosahedronGeometry(0.28, 0), [0xe0503c, 0xf69db0, 0xffdd72][k], -0.9 + k * 0.9, 3.55, 3.7);
    kit.lamp(g, 4.5, 4, 3.8);
  }
}
