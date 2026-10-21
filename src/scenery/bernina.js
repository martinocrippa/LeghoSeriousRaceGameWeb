/**
 * Passo del Bernina in summer. The hero of the circuit is the little red train: its line runs through the
 * middle of the switchbacks on a long stone viaduct, crosses over the road twice and shuttles back and forth
 * all race long. Around it: the Aprica pass, the woods of the Valtellina, the sanctuary and the station of
 * Tirano, the Brusio spiral viaduct, the Piz Bernina glacier, the ski jump on the descent and the hospice
 * with its milky Lago Bianco. Everything is a brick-toy caricature; placements are fictional.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 6;
export const RESERVED = { ghiacciaio: 82, viadotto: 44, ospizio: 36, santuario: 30, passo: 30, trampolino: 32, bosco: 26, stazione: 28, village: 26 };

/** The railway, in world metres. It only holds for the circuit as defined (length 900) — see src/tracks/bernina.js. */
const RAIL = [[104, 40], [104, -100], [66, -101], [20, -100], [-40, -100], [-80, -98], [-106, -94], [-150, -72]];
const RAIL_HEIGHT = 8;

const cache = new WeakMap();

/** Samples along the railway, every ~3 m, with the cumulative length so the train can drive it. */
function railLine(track) {
  if (cache.has(track)) return cache.get(track);
  const points = [];
  for (let i = 0; i < RAIL.length - 1; i++) {
    const [ax, az] = RAIL[i], [bx, bz] = RAIL[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 3));
    for (let k = 0; k < steps; k++) points.push({ x: ax + (bx - ax) * k / steps, z: az + (bz - az) * k / steps });
  }
  points.push({ x: RAIL.at(-1)[0], z: RAIL.at(-1)[1] });
  let total = 0;
  const line = points.map((p, i) => {
    if (i) total += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    return { ...p, y: (track.groundHeight?.(p.x, p.z) || 0) + RAIL_HEIGHT, s: total, heading: Math.atan2(next.x - prev.x, next.z - prev.z) };
  });
  cache.set(track, line);
  return line;
}

/** Trees and bricks keep off the railway. */
export function isReserved(track, layout, x, z) {
  return railLine(track).some((p) => Math.hypot(p.x - x, p.z - z) < 12);
}

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, cream, glass, wood, darkWood, stone, snow } = kit;
  const iron = 0x4a4f57, rock = 0x8a8f96, granite = 0xa9a396, rosso = 0xd0301f, pine = 0x2f5a3a, ice = 0xdff0f7;

  // --- Landmarks ---------------------------------------------------------------------------------------
  function passo(p) {
    // The top of the Aprica pass: the altitude board, two chalets and the poles that mark the road in winter.
    box(p, 20, 0.3, 14, 0xcfc6ae, 0, 0.12, 2);
    for (const [x, z, h] of [[-7, -4, 5], [8, -2, 4.4]]) {
      box(p, 9, h, 7, 0xe3c79a, x, h / 2, z); box(p, 10, 0.5, 8.4, 0x7a5236, x, h + 0.25, z);
      kit.roofTop(p, 10, 8.4, h + 0.5, 0x8a5a3a); p.children[p.children.length - 1].position.set(x, h + 1.7, z);
      for (const wx of [-2.4, 2.4]) box(p, 1.1, 1.3, 0.2, glass, x + wx, h * 0.55, z + 3.6);
      box(p, 7, 0.4, 1, wood, x, h * 0.42, z + 3.7);
    }
    cyl(p, 0.26, 7, iron, -2, 3.5, 8, 8); box(p, 6.4, 2.4, 0.3, 0x2f6b8f, -2, 7.6, 8);
    box(p, 5.4, 1.2, 0.2, cream, -2, 5.9, 8.1);
    for (let x = -14; x <= 14; x += 4.5) { cyl(p, 0.11, 3.2, 0xf1ece0, x, 1.6, 10.5, 5); box(p, 0.3, 0.5, 0.3, rosso, x, 3.1, 10.5); }
    for (const [x, z] of [[-14, -6], [13, -8], [16, 4]]) kit.tree(p, x, z, true);
  }
  function bosco(p) {
    // A thick patch of Valtellina spruce with a log pile and a couple of erratic boulders.
    const random = seeded(5501);
    for (let i = 0; i < 20; i++) {
      const a = random() * Math.PI * 2, r = 4 + random() * 15;
      kit.cypress(p, Math.cos(a) * r, -4 + Math.sin(a) * r * 0.8, 8 + random() * 6);
    }
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
      const log = cyl(p, 0.42, 6, 0xa9784c, -3 + i * 0.95 + row * 0.48, 0.45 + row * 0.85, 6, 8);
      log.rotation.z = Math.PI / 2;
    }
    for (const [x, z, r] of [[-10, 4, 2.6], [9, 2, 2]]) mesh(p, new T.IcosahedronGeometry(r, 0), rock, x, r * 0.6, z);
  }
  function santuario(p) {
    // The basilica of the Madonna di Tirano: broad baroque front, dome and a tall bell tower with an onion top.
    box(p, 34, 0.3, 26, 0xd9cfb6, 0, 0.12, 4);
    box(p, 15, 11, 22, 0xf2e6cd, 0, 5.5, -3); box(p, 16, 0.8, 23, 0xe0d3b4, 0, 11.4, -3);
    box(p, 16, 14, 1.8, 0xf7eeda, 0, 7, 8.5); kit.roofTop(p, 16.6, 2.6, 14, 0xb9553f);
    p.children[p.children.length - 1].position.set(0, 15.2, 8.5);
    for (const x of [-5.2, 5.2]) { box(p, 1.5, 12, 1.5, 0xe8dcc0, x, 6, 9.3); box(p, 2, 0.6, 2, cream, x, 12.3, 9.3); }
    box(p, 3.4, 6, 0.4, 0x7a5236, 0, 3, 9.5);
    const rose = mesh(p, new T.CylinderGeometry(1.9, 1.9, 0.3, 18), 0x8fb3d9, 0, 9.4, 9.5); rose.rotation.x = Math.PI / 2;
    cyl(p, 5.2, 3.4, 0xf2e6cd, 0, 12.9, -7, 16);
    const dome = mesh(p, new T.SphereGeometry(5.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x5f8f6f, 0, 14.2, -7); dome.castShadow = false;
    cyl(p, 0.5, 2.4, cream, 0, 20.3, -7, 8); mesh(p, new T.SphereGeometry(0.6, 8, 6), 0xe8bf4a, 0, 21.8, -7);
    box(p, 4, 26, 4, 0xe8dcc0, 11, 13, 2); box(p, 5, 0.7, 5, cream, 11, 26.3, 2);
    const onion = mesh(p, new T.SphereGeometry(2.6, 12, 9), 0x5f8f6f, 11, 28.3, 2); onion.scale.y = 1.35;
    cyl(p, 0.3, 2, 0xe8bf4a, 11, 31.4, 2, 6);
    for (const y of [15, 20]) for (const z of [0.05, 3.95]) box(p, 1.2, 2.2, 0.2, 0x4a3a30, 11, y, z);
    for (const [x, z] of [[-15, 10], [16, 11]]) kit.cypress(p, x, z, 10);
  }
  function stazione(p) {
    // Tirano station: the platform where the red train starts, the canopy and the signal.
    box(p, 30, 0.5, 9, 0xcfc6ae, 0, 0.25, 4);
    box(p, 16, 7, 8, 0xe9dcc0, -4, 3.5, -3); kit.roofTop(p, 17, 9, 7); p.children[p.children.length - 1].position.set(-4, 8.2, -3);
    kit.windows(p, 15, 2, 1.1, 2); for (const w of p.children.slice(-14)) w.position.x += -4;
    box(p, 3, 4.2, 0.3, 0x7a5236, -4, 2.1, 1.1);
    box(p, 10, 0.4, 7, 0x8f5f3f, 9, 5.4, 2); for (const [x, z] of [[5, -0.6], [13, -0.6], [5, 4.6], [13, 4.6]]) cyl(p, 0.18, 5.2, iron, x, 2.6, z, 6);
    cyl(p, 0.2, 6, 0xf1ece0, 13, 3, 7.4, 8); box(p, 1, 2.4, 0.3, rosso, 13, 6.6, 7.4);
    for (const x of [-12, 12]) { cyl(p, 0.14, 4, iron, x, 2, 7.2, 6); mesh(p, new T.SphereGeometry(0.34, 8, 6), 0xfff1b0, x, 4.2, 7.2).castShadow = false; }
    box(p, 8, 1.4, 0.2, cream, 2, 6.4, -1);
  }
  function viadotto(p) {
    // The Brusio spiral: a ring of stone arches that climbs a full turn, with a red train standing on top.
    const radius = 17, arches = 18;
    for (let i = 0; i < arches; i++) {
      const a = i / arches * Math.PI * 2, y = 2 + (i / arches) * 9;
      const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      const pier = box(p, 3.4, y, 3.4, granite, x, y / 2, z); pier.rotation.y = -a;
      const arch = mesh(p, new T.TorusGeometry(2.8, 0.8, 5, 10, Math.PI), granite, x, y, z);
      arch.rotation.set(0, -a + Math.PI / 2, 0); arch.castShadow = false;
    }
    for (let i = 0; i < arches * 2; i++) {
      const a = i / (arches * 2) * Math.PI * 2, y = 11.3 + (i / (arches * 2)) * 9;
      const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
      const slab = box(p, 5.4, 1, 6.6, granite, x, y, z); slab.rotation.y = -a;
      const rail = box(p, 0.3, 1, 6.6, cream, x + Math.cos(a) * 2.4, y + 1, z + Math.sin(a) * 2.4); rail.rotation.y = -a;
    }
    const carriage = (a, y, colour) => {
      const g = new T.Group(); g.position.set(Math.cos(a) * radius, y + 1.2, Math.sin(a) * radius); g.rotation.y = -a + Math.PI / 2; p.add(g);
      box(g, 3, 2.6, 8, colour, 0, 1.5, 0); box(g, 3.1, 0.4, 8.2, 0xf1ece0, 0, 3, 0);
      for (let i = 0; i < 3; i++) for (const x of [-1.55, 1.55]) box(g, 0.12, 1.1, 1.8, glass, x, 1.9, -2.4 + i * 2.4);
    };
    carriage(0.35, 13, rosso); carriage(0.78, 15, rosso); carriage(1.21, 17, rosso);
    for (const [x, z] of [[-24, 6], [22, -10], [0, 24]]) kit.cypress(p, x, z, 9);
  }
  function ghiacciaio(p) {
    // The Piz Bernina: a big rock pyramid with a glacier tongue coming down toward the road.
    const peak = cone(p, 44, 96, rock, 0, 44, -22, 7); peak.castShadow = false;
    const cap = cone(p, 17, 36, snow, 0, 74, -22, 7); cap.castShadow = false;
    for (const [x, z, r, h] of [[-46, 6, 26, 52], [44, -4, 30, 60]]) { const side = cone(p, r, h, 0x7e8590, x, h / 2 - 2, z, 6); side.castShadow = false; }
    for (const [x, z, r, h] of [[-46, 6, 9, 16], [44, -4, 10, 18]]) { const side = cone(p, r, h, snow, x, h / 2 + 34, z, 6); side.castShadow = false; }
    // The glacier tongue: stepped slabs of blue-white ice running down to the moraine.
    for (let i = 0; i < 7; i++) {
      const slab = box(p, 22 - i * 1.6, 3, 11, i % 2 ? ice : 0xc7e4f0, 0, 44 - i * 6.2, 4 + i * 8);
      slab.castShadow = false;
    }
    for (const [x, z] of [[-13, 62], [11, 66], [0, 70], [-6, 56]]) mesh(p, new T.IcosahedronGeometry(2.6, 0), 0x8a8073, x, 1.4, z);
    box(p, 34, 1.4, 12, 0x9aa0a4, 0, 0.7, 64);
  }
  function trampolino(p) {
    // The ski jump beside the road: the inrun tower on one side, the take-off in the middle and the landing
    // slope running away along the hillside, so nothing ever leans over the racing lanes.
    const tower = new T.Group(); tower.position.set(-19, 0, -6); p.add(tower);
    for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) cyl(tower, 0.5, 30, iron, x, 15, z, 6);
    for (let y = 6; y < 30; y += 6) { box(tower, 7, 0.4, 7, iron, 0, y, 0); for (const x of [-3, 3]) box(tower, 0.3, 6.4, 0.3, iron, x, y + 3, 0); }
    box(tower, 6, 3, 5, 0xd8d3c6, 0, 31.5, 0); kit.roofTop(tower, 6.4, 5.4, 33); tower.children[tower.children.length - 1].position.set(0, 34.2, 0);
    // The inrun: down from the tower to the take-off, white "snow" on a steel frame.
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1), x = -19 + t * 19, z = -6 + t * 3, y = 29 - t * t * 25;
      const bed = box(p, 3.6, 0.7, 5.2, snow, x, y, z);
      bed.rotation.z = 0.95 - t * 0.8;
      const h = Math.max(0.6, y - 1);
      if (i % 2 === 0) cyl(p, 0.3, h, iron, x, h / 2, z, 6);
      for (const s of [-1, 1]) box(p, 3.6, 1, 0.2, 0x2f6b8f, x, y + 0.9, z + s * 2.7);
    }
    // Landing slope and outrun, with the distance markers down both sides.
    const slope = box(p, 30, 1, 14, snow, 14, 2.4, -2); slope.rotation.z = -0.18;
    for (let x = 2; x <= 26; x += 6) { const h = Math.max(0.5, 4.5 - (x - 2) * 0.17); for (const z of [-7, 5]) cyl(p, 0.3, h, iron, x, h / 2, z, 6); }
    box(p, 20, 1.6, 15, 0x8fa87a, 14, 0.8, -2);
    box(p, 14, 0.6, 16, snow, 26, 0.3, -2);
    for (let i = 0; i < 4; i++) { const x = 4 + i * 6.5; for (const z of [-8.4, 4.4]) cyl(p, 0.12, 2.4, rosso, x, 4.4 - i * 0.9, z, 5); }
    box(p, 3.4, 3, 4, 0xe9dcc0, -6, 6.5, 5.6); for (const z of [4.2, 7]) cyl(p, 0.24, 5, iron, -6, 2.5, z, 6);
    box(p, 3.6, 0.4, 4.2, 0x7a5236, -6, 8.2, 5.6);
    for (const [x, z] of [[-27, 2], [31, 3]]) kit.cypress(p, x, z, 9);
  }
  function ospizio(p) {
    // The hospice at the top of the pass, the milky Lago Bianco behind it and the pass marker.
    const lake = mesh(p, new T.CircleGeometry(26, 26), 0xbfe0e4, 4, 0.1, -34); lake.rotation.x = -Math.PI / 2; lake.castShadow = false;
    const shore = mesh(p, new T.CircleGeometry(30, 26), 0xa9a396, 4, 0.04, -34); shore.rotation.x = -Math.PI / 2; shore.castShadow = false;
    box(p, 18, 9, 11, 0xe9dcc0, -4, 4.5, 2); box(p, 19, 0.6, 12, 0x7a5236, -4, 9.3, 2);
    kit.roofTop(p, 19, 12, 9.6, 0x8a5a3a); p.children[p.children.length - 1].position.set(-4, 10.8, 2);
    kit.windows(p, 17, 2.4, 7.6, 2); for (const w of p.children.slice(-16)) w.position.x += -4;
    box(p, 3, 4.4, 0.3, 0x7a5236, -4, 2.2, 7.7);
    box(p, 7, 5, 6, 0xd8cdb6, 10, 2.5, 4); kit.roofTop(p, 7.4, 6.4, 5); p.children[p.children.length - 1].position.set(10, 6.2, 4);
    cyl(p, 0.24, 8, cream, 13, 4, 9, 8); box(p, 3.4, 2, 0.2, rosso, 14.6, 7.4, 9);
    for (const [x, z, r] of [[-20, -10, 3.2], [18, -16, 2.6], [-14, -24, 2.2]]) mesh(p, new T.IcosahedronGeometry(r, 0), rock, x, r * 0.6, z);
    for (let i = 0; i < 5; i++) cyl(p, 0.11, 3, 0xf1ece0, -16 + i * 3.4, 1.5, 9.5, 5);
  }
  const builders = { passo, bosco, santuario, stazione, viadotto, ghiacciaio, trampolino, ospizio };
  const SIGN = { ghiacciaio: 76, viadotto: 30, ospizio: 20, trampolino: 19, santuario: 16, passo: 14, bosco: 13, stazione: 13 };
  for (const item of layout.landmarks) {
    kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11, item.kind === 'ghiacciaio' ? 22 : 17);
  }

  // --- The Bernina railway: a stone viaduct through the switchbacks, twice over the road -------------------
  const line = railLine(track);
  const roadLine = track.points(600);
  const roadGap = (x, z) => { let best = Infinity; for (const q of roadLine) { const gap = Math.hypot(q.x - x, q.z - z); if (gap < best) best = gap; } return best; };
  const rails = new T.Group(); rails.name = 'bernina-ferrovia'; scene.add(rails);
  // Deck: stone slabs following the line, a low parapet each side and the two narrow-gauge rails on top.
  // `p.y` is the rail level, so the slab hangs just below it. The line is sampled every ~3 m but the deck is
  // built in spans of DECK_STEP samples, tilted to join their ends: a twelfth of the meshes, same silhouette.
  const DECK_STEP = 4;
  for (let i = 0; i < line.length - 1; i += DECK_STEP) {
    const a = line[i], b = line[Math.min(line.length - 1, i + DECK_STEP)];
    const flat = Math.hypot(b.x - a.x, b.z - a.z);
    if (flat < 0.2) continue;
    const len = Math.hypot(flat, b.y - a.y) + 0.3;
    const piece = new T.Group();
    piece.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    piece.rotation.order = 'YXZ';
    piece.rotation.set(-Math.atan2(b.y - a.y, flat), Math.atan2(b.x - a.x, b.z - a.z), 0);
    rails.add(piece);
    mesh(piece, new T.BoxGeometry(5.6, 1.2, len), granite, 0, -0.6, 0).castShadow = false;
    for (const side of [-1, 1]) {
      mesh(piece, new T.BoxGeometry(0.45, 1, len), cream, side * 2.6, 0.5, 0).castShadow = false;
      mesh(piece, new T.BoxGeometry(0.16, 0.24, len), 0x6d6257, side * 0.75, 0.12, 0).castShadow = false;
    }
  }
  // Piers every 16 m with a shallow stone arch between each pair. Both road crossings are spanned free,
  // so nothing ever stands in the racing lanes.
  const PIER_GAP = 16, PIER_TOP = 3.6;
  const piers = [];
  for (let s = PIER_GAP; s < line.at(-1).s; s += PIER_GAP) {
    let i = 1;
    while (i < line.length - 1 && line[i].s < s) i++;
    piers.push(line[i]);
  }
  const clearOfRoad = (p) => roadGap(p.x, p.z) > 14;
  for (const p of piers) {
    if (!clearOfRoad(p)) continue;
    const ground = kit.groundAt(p.x, p.z), h = p.y - 1.2 - PIER_TOP - ground;
    if (h < 0.6) continue;
    const pier = mesh(rails, new T.BoxGeometry(4.4, h, 3.4), granite, p.x, ground + h / 2, p.z);
    pier.rotation.y = p.heading;
  }
  for (let i = 0; i < piers.length - 1; i++) {
    const a = piers[i], b = piers[i + 1];
    if (!clearOfRoad(a) || !clearOfRoad(b)) continue;
    const springY = Math.min(a.y, b.y) - 1.2 - PIER_TOP;
    const arc = Array.from({ length: 11 }, (_, k) => {
      const t = k / 10;
      return new T.Vector3(a.x + (b.x - a.x) * t, springY + Math.sin(t * Math.PI) * PIER_TOP, a.z + (b.z - a.z) * t);
    });
    const arch = mesh(rails, new T.TubeGeometry(new T.CatmullRomCurve3(arc), 14, 0.75, 5, false), granite);
    arch.castShadow = false;
  }
  const train = new T.Group(); train.name = 'bernina-trenino'; scene.add(train);
  const cars = [];
  for (let c = 0; c < 5; c++) {
    const car = new T.Group(); train.add(car); cars.push(car);
    const engine = c === 0;
    box(car, 3, engine ? 3 : 2.7, engine ? 9 : 8.6, rosso, 0, engine ? 1.9 : 1.75, 0);
    box(car, 3.1, 0.4, engine ? 9.2 : 8.8, 0xf1ece0, 0, engine ? 3.6 : 3.3, 0);
    box(car, 3.15, 0.5, engine ? 9.2 : 8.8, cream, 0, 0.75, 0);
    for (let i = 0; i < 3; i++) for (const x of [-1.55, 1.55]) box(car, 0.12, 1.2, 1.9, glass, x, 2.2, -2.6 + i * 2.6);
    if (engine) { box(car, 2.2, 0.6, 0.3, 0xffe9a8, 0, 1.2, 4.6); cyl(car, 0.22, 1.4, 0x35393f, 0, 4.2, -2, 6); }
    for (const z of [-3, 3]) for (const x of [-1.25, 1.25]) { const w = cyl(car, 0.44, 0.3, 0x35393f, x, 0.4, z, 10); w.rotation.z = Math.PI / 2; }
  }
  kit.dynamic(train);

  // --- Mountains all round ---------------------------------------------------------------------------------
  const random = seeded(7717);
  const { bounds } = track;
  const peaks = [];
  for (let z = bounds.minZ - 170; z <= bounds.maxZ + 170; z += 34) {
    for (let x = bounds.minX - 190; x <= bounds.maxX + 190; x += 34) {
      const px = x + (random() - 0.5) * 20, pz = z + (random() - 0.5) * 20;
      const gap = roadGap(px, pz);
      const radius = Math.min(62, 18 + (gap - 20) * 0.45);
      if (radius < 17 || gap < radius + 16) continue;
      if (line.some((q) => Math.hypot(q.x - px, q.z - pz) < radius + 14)) continue;
      if (layout.landmarks.some((m) => Math.hypot(m.x - px, m.z - pz) < (RESERVED[m.kind] || 23) + radius * 0.6)) continue;
      if (peaks.some((m) => Math.hypot(m.x - px, m.z - pz) < (m.radius + radius) * 0.6)) continue;
      peaks.push({ x: px, z: pz, radius, height: radius * (1.1 + random() * 0.7), turn: random() * Math.PI });
    }
  }
  for (const m of peaks) {
    const base = kit.groundAt(m.x, m.z);
    const mountain = cone(scene, m.radius, m.height, m.height > 58 ? 0x7e8590 : 0x5f8a53, m.x, base + m.height / 2 - 2, m.z, 6);
    mountain.rotation.y = m.turn; mountain.castShadow = false;
    if (m.height > 52) {
      const cap = cone(scene, m.radius * 0.3, m.height * 0.32, snow, m.x, base + m.height * 0.86 - 2, m.z, 6);
      cap.rotation.y = m.turn; cap.castShadow = false;
    }
  }

  const TRAIN_LENGTH = 46, total = line.at(-1).s;
  const at = (s) => {
    const clamped = Math.min(total, Math.max(0, s));
    let i = 1;
    while (i < line.length - 1 && line[i].s < clamped) i++;
    const a = line[i - 1], b = line[i], t = (clamped - a.s) / Math.max(1e-6, b.s - a.s);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, heading: b.heading };
  };
  kit.animate((clock) => {
    // Up the line, a pause at the pass, back down again: the red train never stops for long.
    const run = 52, wait = 7, half = run + wait, phase = clock % (half * 2), forward = phase < half;
    const local = Math.min(1, (forward ? phase : phase - half) / run);
    const head = -TRAIN_LENGTH + (total + TRAIN_LENGTH * 2) * (forward ? local : 1 - local);
    cars.forEach((car, i) => {
      const q = at(forward ? head - i * 9.4 : head + i * 9.4);
      car.position.set(q.x, q.y + 0.35, q.z);
      car.rotation.y = q.heading + (forward ? 0 : Math.PI);
    });
  });
}
