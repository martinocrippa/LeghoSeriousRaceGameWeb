/**
 * The classroom at break time, from the photo of the real one: rows of desks with red-framed chairs, the teacher's
 * desk, wall shelves, drawings pegged on a string, big windows onto the garden where everybody is playing.
 *
 * The scale is the joke: the cars are toys on the floor, so a desk leg is a column and a dropped pencil is a ramp.
 * Nothing is built over the road below 14 m, because the chase camera flies at ~11 m — the string of drawings is
 * strung above that, which is why it reads as bunting rather than as a lid.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 0;
export const RESERVED = {
  cattedra: 40, banchi: 46, lavagna: 34, zaino: 30, finestre: 40, giardino: 60, merenda: 26, matite: 26, libreria: 34,
};

const WOOD = 0xd9b483, WOOD_DARK = 0x9c7346, STEEL = 0x8e949c, RED = 0xd23a35, PAPER = 0xf7f3e8;
const WALL = 0xeee8da, GREEN = 0x5f8f4a, SKY = 0xbcd8ee;

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh } = kit;
  const roadPoint = (distance, lane) => {
    const f = track.frame(distance);
    return { x: f.x + f.dz * lane, y: track.elevation(distance), z: f.z - f.dx * lane, heading: Math.atan2(f.dx, f.dz) };
  };

  /** One giant school desk: top, apron and four steel legs the cars drive between. */
  function desk(parent, x, z, width = 15, depth = 9, height = 11) {
    box(parent, width, 0.8, depth, WOOD, x, height, z);
    box(parent, width - 1.4, 0.7, depth - 1.4, WOOD_DARK, x, height - 0.7, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cyl(parent, 0.45, height, STEEL, x + sx * (width / 2 - 1), height / 2, z + sz * (depth / 2 - 1), 8);
    }
  }

  /** A chair, tipped the way children leave them. */
  function chair(parent, x, z, turn = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = turn; parent.add(g);
    box(g, 6, 0.6, 6, WOOD, 0, 6, 0);
    box(g, 6, 5.4, 0.6, WOOD, 0, 9, -2.7);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.3, 6, RED, sx * 2.4, 3, sz * 2.4, 6);
    return g;
  }

  const builders = {
    // The teacher's desk, with the register and a pot of chalk on it.
    cattedra: (g) => {
      desk(g, 0, -6, 22, 12, 12);
      box(g, 8, 1.2, 6, PAPER, -4, 12.9, -6);
      cyl(g, 1.6, 3, 0x3b8de0, 6, 13.9, -6, 10);
      for (let i = 0; i < 5; i += 1) cyl(g, 0.3, 4, [RED, 0xffd74a, GREEN, 0x3b8de0, 0x9b59b6][i], 6 + (i - 2) * 0.6, 15.2, -6, 6);
      chair(g, 0, -15, Math.PI);
      kit.sign(g, 'LA CATTEDRA', 13, 16);
    },
    // Two rows of desks with their chairs: the slalom.
    banchi: (g) => {
      const jumble = seeded(6120);
      for (let row = 0; row < 2; row += 1) for (let i = 0; i < 3; i += 1) {
        const x = -22 + i * 22, z = -8 - row * 20;
        desk(g, x, z);
        chair(g, x - 3, z - 7.5, (jumble() - 0.5) * 1.4);
        chair(g, x + 3.5, z - 7.8, (jumble() - 0.5) * 1.4);
        // A notebook and a pencil left open on top.
        box(g, 5, 0.3, 3.6, PAPER, x - 2, 11.6, z + 1);
        const pencil = cyl(g, 0.34, 6, 0xffd74a, x + 3, 11.6, z, 6);
        pencil.rotation.set(0, jumble() * 3, Math.PI / 2);
      }
      kit.sign(g, 'I BANCHI', 14, 16);
    },
    // The blackboard wall, with the day's date still on it and the drawings pegged above.
    lavagna: (g) => {
      box(g, 38, 26, 2, WALL, 0, 13, -4);
      box(g, 34, 13, 0.6, 0x2f4638, 0, 12, -1.7);
      box(g, 36, 1.2, 1.2, WOOD_DARK, 0, 5, -1.4);
      for (let i = 0; i < 4; i += 1) box(g, 2.2, 0.5, 0.5, PAPER, -6 + i * 4, 5.9, -1.3);
      for (let i = 0; i < 6; i += 1) box(g, 3.2, 0.25, 0.25, [PAPER, 0xffd74a, RED][i % 3], -12 + i * 4.6, 13 + (i % 2) * 3, -1.3);
      kit.sign(g, 'LA LAVAGNA', 14, 16);
    },
    // A backpack tipped over, spilling its things: a hill with a zip.
    zaino: (g) => {
      const body = mesh(g, new T.SphereGeometry(9, 14, 10), 0x3b8de0, 0, 6, -4);
      body.scale.set(1, 0.75, 1.3);
      box(g, 12, 1, 0.6, 0xffd74a, 0, 9.4, 1.6);
      for (const sx of [-1, 1]) {
        const strap = box(g, 2, 9, 1.2, 0x2a5f9e, sx * 4, 6, -11);
        strap.rotation.x = 0.3;
      }
      box(g, 7, 5, 1.4, 0x2a5f9e, 0, 4, 5.4);
      for (let i = 0; i < 4; i += 1) {
        const item = cyl(g, 0.5, 7, [RED, GREEN, 0xffd74a, 0x9b59b6][i], 8 + i * 2.5, 0.5, 6 + i * 1.6, 6);
        item.rotation.z = Math.PI / 2;
      }
      kit.sign(g, 'LO ZAINO', 12, 14);
    },
    // The classroom windows: the wall, the frames and the daylight coming in.
    finestre: (g) => {
      box(g, 40, 30, 2.4, WALL, 0, 15, -6);
      for (let i = 0; i < 3; i += 1) {
        const x = -13 + i * 13;
        box(g, 10.5, 18, 0.5, SKY, x, 14, -4.8);
        box(g, 11.3, 1, 1.2, WALL, x, 4.6, -4.6);
        for (const sx of [-1, 1]) box(g, 0.8, 18, 1, STEEL, x + sx * 5.4, 14, -4.6);
        box(g, 11.3, 0.8, 1, STEEL, x, 23.2, -4.6);
      }
      // A plant on the sill and a curtain pulled to one side.
      cyl(g, 1.6, 2.4, RED, -17, 6.2, -4, 10);
      mesh(g, new T.IcosahedronGeometry(2.6, 0), GREEN, -17, 9, -4);
      box(g, 3, 17, 0.4, PAPER, 15, 14, -4.2);
      kit.sign(g, 'LE FINESTRE', 11, 14);
    },
    // Beyond the glass: the garden, and the class out there playing.
    giardino: (g) => {
      const lawn = mesh(g, new T.CircleGeometry(13, 20), GREEN, 0, 0.05, -28);
      lawn.rotation.x = -Math.PI / 2; lawn.castShadow = false;
      for (const [x, z] of [[-9, -34], [8, -38], [-2, -42]]) kit.tree(g, x, z);
      const ball = mesh(g, new T.SphereGeometry(2.2, 12, 9), PAPER, 3, 2.2, -26);
      ball.name = 'intervallo-pallone';
      kit.sign(g, 'I COMPAGNI IN GIARDINO', 9, 13);
    },
    // Somebody's snack, abandoned mid-break, and the sugar that went everywhere.
    merenda: (g) => {
      cyl(g, 5, 7, 0xf0a81e, 0, 3.5, -2, 12);
      cyl(g, 5.4, 0.8, RED, 0, 7.2, -2, 12);
      box(g, 9, 5, 1.4, 0xd94a7a, 9, 2.5, 2);
      box(g, 9.4, 1.2, 1.8, PAPER, 9, 5.4, 2);
      const spill = mesh(g, new T.CircleGeometry(9, 18), PAPER, -8, 0.06, 6);
      spill.rotation.x = -Math.PI / 2; spill.castShadow = false;
      kit.sign(g, 'LA MERENDA', 11, 14);
    },
    // The pot of felt-tips, standing like a bundle of totem poles.
    matite: (g) => {
      cyl(g, 6, 9, 0x4a4f57, 0, 4.5, 0, 14);
      const pens = seeded(2255);
      for (let i = 0; i < 9; i += 1) {
        const angle = (i / 9) * Math.PI * 2, r = 1.2 + pens() * 3;
        const pen = cyl(g, 0.9, 16, [RED, 0x3b8de0, GREEN, 0xffd74a, 0x9b59b6, 0xf0a81e][i % 6],
          Math.cos(angle) * r, 12 + pens() * 2, Math.sin(angle) * r, 8);
        pen.rotation.set((pens() - 0.5) * 0.3, 0, (pens() - 0.5) * 0.3);
        cone(g, 0.9, 2, 0xe8d6b4, Math.cos(angle) * r, 20.5, Math.sin(angle) * r, 8);
      }
      kit.sign(g, 'I PENNARELLI', 12, 14);
    },
    // The shelves at the back, where the drawings and the boxes live.
    libreria: (g) => {
      box(g, 34, 2, 12, WOOD_DARK, 0, 1, -6);
      for (let shelf = 0; shelf < 4; shelf += 1) {
        box(g, 34, 1, 12, WOOD, 0, 3 + shelf * 6, -6);
        for (let i = 0; i < 5; i += 1) {
          const h = 3.4 + (i % 3);
          box(g, 4.6, h, 8, [RED, 0x3b8de0, GREEN, 0xffd74a, PAPER][(i + shelf) % 5], -13 + i * 6.2, 3.5 + shelf * 6 + h / 2, -6);
        }
      }
      for (const sx of [-1, 1]) box(g, 1.6, 27, 12, WOOD_DARK, sx * 17, 13.5, -6);
      kit.sign(g, 'LA LIBRERIA', 13, 15);
    },
  };

  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], 13, 16);

  // --- The floor the race happens on ---------------------------------------------------------------------
  // A giant sheet of lino with its seams, and the skirting where the walls meet it. Kept well clear of the lanes.
  const room = new T.Group(); room.name = 'intervallo-aula'; scene.add(room);
  // Four walls right round the classroom. Without them the floor reads as an open plain between the furniture;
  // with them you are plainly inside a room. No ceiling: the camera flies at ~11 m and would be shut out by one.
  const edge = { x: 210, z: 150, back: -120 };
  const WALL_HEIGHT = 44;
  for (const [w, d, x, z] of [
    [edge.x * 2, 3, 0, edge.z], [edge.x * 2, 3, 0, edge.back],
    [3, edge.z - edge.back, -edge.x, (edge.z + edge.back) / 2], [3, edge.z - edge.back, edge.x, (edge.z + edge.back) / 2],
  ]) {
    box(room, w, WALL_HEIGHT, d, WALL, x, WALL_HEIGHT / 2, z);
    box(room, w + 0.6, 2.2, d + 0.6, 0x8a7f6a, x, 1.1, z);   // the skirting board
  }

  const seams = seeded(1414);
  for (let i = 0; i < 12; i += 1) {
    const at = roadPoint((i / 12) * track.length, (track.roadWidth / 2 + 3) * (seams() > 0.5 ? 1 : -1));
    const crumb = mesh(room, new T.BoxGeometry(1.2, 0.3, 1.2), [0xffd74a, RED, 0x3b8de0][i % 3], at.x, at.y + 0.15, at.z);
    crumb.rotation.y = seams() * 3;
    crumb.castShadow = false;
  }

  // The string of drawings, strung high above the road: above the camera, so it reads as bunting, not as a lid.
  const bunting = new T.Group(); bunting.name = 'intervallo-disegni'; scene.add(bunting);
  const sheets = [];
  for (let d = 180; d < 300; d += 10) {
    const at = roadPoint(d, 0);
    const line = box(bunting, track.roadWidth + 10, 0.2, 0.2, 0x8e949c, at.x, at.y + 17, at.z);
    line.rotation.y = at.heading;
    for (const lane of [-4, 0, 4]) {
      const hang = roadPoint(d, lane);
      const sheet = mesh(bunting, new T.PlaneGeometry(3.4, 4.2), PAPER, hang.x, at.y + 14.6, hang.z);
      sheet.rotation.y = at.heading + Math.PI / 2;
      sheet.material.side = T.DoubleSide;
      sheet.castShadow = false;
      sheets.push({ sheet, phase: sheets.length * 0.7, base: at.y + 14.6 });
    }
  }
  kit.dynamic(bunting);

  // The class outside: little figures running about in the garden beyond the windows.
  const playing = new T.Group(); playing.name = 'intervallo-compagni'; scene.add(playing);
  const garden = layout.landmarks.find((item) => item.kind === 'giardino');
  const kids = [];
  if (garden) {
    const pick = seeded(7788);
    for (let i = 0; i < 10; i += 1) {
      const kid = new T.Group();
      cyl(kid, 1.5, 5, [RED, 0x3b8de0, GREEN, 0xffd74a, 0x9b59b6][i % 5], 0, 2.5, 0, 8);
      mesh(kid, new T.SphereGeometry(1.7, 10, 8), 0xe8b98a, 0, 6.2, 0);
      playing.add(kid);
      kids.push({ kid, radius: 6 + pick() * 16, speed: 0.5 + pick() * 0.8, phase: pick() * 6.3, bob: pick() * 6.3 });
    }
    playing.position.set(garden.x, 0, garden.z);
  }
  kit.dynamic(playing);

  kit.animate((clock) => {
    // The drawings breathe on the draught from the open window.
    for (const { sheet, phase, base } of sheets) {
      sheet.position.y = base + Math.sin(clock * 1.6 + phase) * 0.35;
      sheet.rotation.z = Math.sin(clock * 2.1 + phase) * 0.14;
    }
    // Children running round the garden, bobbing as they go.
    for (const { kid, radius, speed, phase, bob } of kids) {
      const angle = clock * speed + phase;
      kid.position.set(Math.cos(angle) * radius, Math.abs(Math.sin(clock * 6 + bob)) * 1.2, Math.sin(angle) * radius - 24);
      kid.rotation.y = -angle;
    }
  });
}
