/**
 * Milano Sprint. The Duomo, the yellow tram and the skyline keep the shared builders; the castle does not, because
 * "aggiungi il castello sforzesco" means the real one and not a fairy-tale keep: red brick curtain walls with
 * swallowtail merlons, the two white round towers at the front corners, the Torre del Filarete in the middle with
 * its clock and spire, the moat and the drawbridge, and the Filarete fountain out in front — the one every child in
 * Milan calls "la torta degli sposi". Pigeons take off from the square when a car goes past.
 *
 * A brick-toy caricature; proportions are squashed so the whole thing reads from a car going by at 90 km/h.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 20;
export const RESERVED = { castle: 46, duomo: 34, skyline: 30, tram: 22 };

const BRICK = 0xa8492f, BRICK_DARK = 0x8c3a26, BRICK_LIGHT = 0xc06044;
const STONE = 0xe4d8c0, SLATE = 0x4a5560, WATER = 0x4f8fa8, COPPER = 0x5aa89a;

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh, glass } = kit;
  const random = seeded(1452);
  const flocks = [];

  /** A run of swallowtail merlons along a wall: the notched "ghibelline" battlement of every Visconti castle. */
  function merlons(parent, from, to, z, y, step = 3) {
    const count = Math.max(2, Math.round((to - from) / step));
    for (let i = 0; i <= count; i += 1) {
      const x = from + (i / count) * (to - from);
      box(parent, 1.3, 1.6, 1.2, BRICK_LIGHT, x, y + 0.8, z);
      // The swallowtail: two little horns with a notch between them.
      for (const side of [-0.38, 0.38]) box(parent, 0.5, 0.9, 1.2, BRICK_LIGHT, x + side, y + 2.05, z);
    }
  }

  /** One of the two white round towers that stand at the front corners of the castle. */
  function roundTower(parent, x, z, radius = 3.4, height = 15) {
    cyl(parent, radius, height, STONE, x, height / 2, z, 16);
    cyl(parent, radius * 1.12, 1, 0xf2ead6, x, height + 0.5, z, 16);
    const count = 12;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      box(parent, 1.1, 1.5, 1.1, 0xf2ead6, x + Math.cos(a) * radius * 1.02, height + 1.75, z + Math.sin(a) * radius * 1.02);
    }
    for (const y of [5, 9.5]) for (const a of [-0.6, 0.2, 1]) {
      box(parent, 0.5, 1.5, 0.3, SLATE, x + Math.cos(a) * radius, y, z + Math.sin(a) * radius);
    }
  }

  function castello(p) {
    const HALF = 17, FRONT = 12, BACK = -16, WALL = 11;
    // The square in front of it, and the moat that runs along the curtain wall.
    // The square is kept short so the castle itself can stand close to the road: at fifty metres it was a shape
    // at the edge of the picture, and the point of a landmark is that you see it from the car.
    box(p, 36, 0.25, 12, 0xd9d0bf, 0, 0.1, 17, false);
    const moat = mesh(p, new T.BoxGeometry(40, 0.3, 4.4), WATER, 0, 0.3, FRONT + 4.4);
    moat.castShadow = false;
    box(p, 42, 0.6, 1, 0x8d8578, 0, 0.3, FRONT + 6.8, false);
    // Curtain wall: front, two sides, back. Brick, with the merlons on top.
    box(p, HALF * 2, WALL, 1.8, BRICK, 0, WALL / 2, FRONT);
    merlons(p, -HALF + 1, HALF - 1, FRONT, WALL);
    for (const side of [-1, 1]) {
      box(p, 1.8, WALL, FRONT - BACK, BRICK_DARK, side * HALF, WALL / 2, (FRONT + BACK) / 2);
      for (let z = BACK + 2; z <= FRONT - 2; z += 3.4) {
        box(p, 1.2, 1.6, 1.3, BRICK_LIGHT, side * HALF, WALL + 0.8, z);
        for (const t of [-0.38, 0.38]) box(p, 1.2, 0.9, 0.5, BRICK_LIGHT, side * HALF, WALL + 2.05, z + t);
      }
    }
    box(p, HALF * 2, WALL - 1, 1.8, BRICK_DARK, 0, (WALL - 1) / 2, BACK);
    // The courtyard floor, so the inside is not a hole in the ground.
    box(p, HALF * 2 - 2, 0.2, FRONT - BACK - 3, 0xc9bda6, 0, 0.1, (FRONT + BACK) / 2 + 0.5, false);
    // The Torre del Filarete: the gate tower in the middle of the front, with the clock and the spire.
    const tower = new T.Group();
    tower.position.set(0, 0, FRONT);
    p.add(tower);
    box(tower, 9, 22, 9, BRICK_LIGHT, 0, 11, 0);
    box(tower, 10, 1.2, 10, STONE, 0, 22.6, 0);
    for (let i = 0; i < 4; i += 1) for (const side of [-1, 1]) {
      box(tower, 1.2, 1.6, 1.2, STONE, side * 4.3, 24, (i - 1.5) * 2.6);
      box(tower, 1.2, 1.6, 1.2, STONE, (i - 1.5) * 2.6, 24, side * 4.3);
    }
    box(tower, 7, 5, 7, STONE, 0, 26.5, 0);
    const spire = cone(tower, 5.6, 9, COPPER, 0, 33.5, 0, 8);
    spire.rotation.y = Math.PI / 8;
    mesh(tower, new T.SphereGeometry(0.7, 8, 6), 0xffd053, 0, 38.4, 0);
    // The gateway, the portcullis arch and the drawbridge chains.
    box(tower, 5, 8, 1.4, 0x3b2f24, 0, 4, 4.6);
    const arch = mesh(tower, new T.CylinderGeometry(2.5, 2.5, 1.5, 14, 1, false, 0, Math.PI), STONE, 0, 8, 4.6);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI;
    for (const side of [-1.9, 1.9]) box(tower, 0.16, 6.5, 0.16, 0x5a5f66, side, 9.5, 5.4);
    // The clock face, and the merlons of the Sforza coat of arms panel below it.
    const clock = mesh(tower, new T.CircleGeometry(1.5, 18), 0xf2ead6, 0, 15.5, 4.62);
    clock.castShadow = false;
    box(tower, 0.16, 1, 0.1, SLATE, 0, 15.9, 4.75);
    box(tower, 0.8, 0.16, 0.1, SLATE, 0.3, 15.5, 4.75);
    box(tower, 3.4, 2.2, 0.2, 0xd9d0bf, 0, 11.6, 4.62);
    box(tower, 2.4, 1.2, 0.1, 0x2f6b8a, 0, 11.6, 4.75);
    // The two white round towers at the front corners, and two square ones at the back.
    roundTower(p, -HALF + 0.5, FRONT - 0.5);
    roundTower(p, HALF - 0.5, FRONT - 0.5);
    for (const side of [-1, 1]) {
      box(p, 7, 14, 7, BRICK, side * (HALF - 1), 7, BACK + 1);
      box(p, 8, 1, 8, BRICK_LIGHT, side * (HALF - 1), 14.5, BACK + 1);
    }
    // Inside the courtyard: the tall Torre di Bona and the roofs of the Corte Ducale.
    box(p, 6, 18, 6, BRICK_DARK, -8, 9, BACK + 8);
    kit.roofTop(p, 7, 7, 18, SLATE);
    p.children[p.children.length - 1].position.set(-8, 18, BACK + 8);
    box(p, 14, 8, 8, BRICK, 7, 4, BACK + 7);
    kit.roofTop(p, 15, 9, 8, SLATE);
    p.children[p.children.length - 1].position.set(7, 8, BACK + 7);
    kit.windows(p, 14, 2.4, BACK + 11.1, 1);
    for (const w of p.children.slice(-5)) w.position.x += 7;
    // The Filarete fountain out on the square: the wedding cake.
    const fountain = new T.Group();
    fountain.position.set(0, 0, 17);
    p.add(fountain);
    cyl(fountain, 5.2, 0.7, 0xe8e0cc, 0, 0.35, 0, 24);
    const pool = mesh(fountain, new T.CircleGeometry(4.6, 24), WATER, 0, 0.74, 0);
    pool.rotation.x = -Math.PI / 2;
    pool.castShadow = false;
    cyl(fountain, 2.6, 1.1, 0xe8e0cc, 0, 1.3, 0, 20);
    cyl(fountain, 1.3, 1.2, 0xf2ead6, 0, 2.4, 0, 16);
    cyl(fountain, 2.2, 0.35, 0xbfe3ea, 0, 3.1, 0, 20);
    cyl(fountain, 0.5, 1.6, 0xf2ead6, 0, 4, 0, 12);
    mesh(fountain, new T.SphereGeometry(0.55, 10, 8), 0xbfe3ea, 0, 5, 0);
    // The chestnut trees along the square and the lamps by the moat.
    for (const [x, z] of [[-20, 15], [20, 15], [-12, 20], [12, 20]]) kit.tree(p, x, z, false);
    for (const x of [-13, 13]) kit.lamp(p, x, FRONT + 8.4, 4.6);
    // Pigeons on the square: they sit there, and they scatter when a car comes past the castle.
    const flock = new T.Group();
    p.add(flock);
    for (let i = 0; i < 22; i += 1) {
      const bird = new T.Group();
      bird.position.set(-16 + random() * 32, 0, 13 + random() * 8);
      bird.rotation.y = random() * Math.PI * 2;
      flock.add(bird);
      const body = mesh(bird, new T.SphereGeometry(0.34, 7, 5), i % 4 ? 0x8d93a0 : 0xd8d4c8, 0, 0.5, 0);
      body.scale.set(0.8, 0.8, 1.3);
      mesh(bird, new T.SphereGeometry(0.16, 6, 5), i % 4 ? 0x6b7280 : 0xbdb9ad, 0, 0.82, 0.32);
      for (const side of [-1, 1]) {
        const wing = box(bird, 0.1, 0.32, 0.6, i % 4 ? 0x6b7280 : 0xbdb9ad, side * 0.3, 0.55, 0);
        wing.userData.side = side;
      }
      kit.dynamic(bird);
      flocks.push({ object: bird, home: bird.position.clone(), phase: random() * 6.3, lift: 0, drift: (random() - 0.5) * 2 });
    }
  }

  const builders = { castle: castello };
  const SIGN = { castle: 25, duomo: 13, skyline: 20 };
  const castleItem = layout.landmarks.find((item) => item.kind === 'castle');
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11);

  kit.animate((clock, dt, racers) => {
    if (!castleItem) return;
    // A car within thirty metres of the castle puts the pigeons up; they settle again when it has gone.
    let close = false;
    for (const racer of racers) {
      const f = track.frame(racer.progress);
      if (Math.hypot(f.x - castleItem.x, f.z - castleItem.z) < 62) { close = true; break; }
    }
    for (const bird of flocks) {
      bird.lift += ((close ? 1 : 0) - bird.lift) * Math.min(1, dt * (close ? 2.6 : 0.7));
      const object = bird.object;
      object.position.y = bird.lift * (3 + Math.sin(clock * 3 + bird.phase) * 1.6);
      object.position.x = bird.home.x + bird.lift * bird.drift * 4;
      object.position.z = bird.home.z + bird.lift * Math.sin(bird.phase) * 4;
      object.rotation.y = bird.home.x * 0.1 + bird.lift * clock * 0.8;
      for (const part of object.children) {
        if (part.userData.side === undefined) continue;
        part.rotation.z = part.userData.side * (bird.lift > 0.05 ? Math.sin(clock * 14 + bird.phase) * 0.9 : 0);
      }
    }
  });
}
