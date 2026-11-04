/**
 * A school at first light, as a brick toy. Built from the aerial photo and the interior ones: the
 * glazed hall behind its dense timber brise-soleil, the cantilevered canopy over the forecourt, the first-floor
 * corridor with its exposed glulam beams and dark balustrade, the gym with small square windows scattered across
 * the wall, the photovoltaic roof, the lime trees along the street, the softball field — and the amphitheatre with
 * stepped tiers that the aerial photo does not show, because it is newer than the photo.
 *
 * The one thing that cannot be built is a ceiling: the chase camera flies at ~11 m, and anything closed over the
 * road would fill the screen from behind. So "inside" is made of walls, columns, beams overhead above 14 m, and
 * lights. Everything is a toy caricature; placements are fictional.
 */
import * as THREE from 'three';
import { seeded } from '../random.js';

export const streetHouses = 0;
export const RESERVED = {
  atrio: 40, corridoio: 34, scalinata: 26, palestra: 46, anfiteatro: 40,
  parcheggio: 34, fotovoltaico: 44, viadeimattoncini: 26, softball: 40,
};

/** The first-floor corridor: the stretch of lap that is up on columns (see the elevation bump in the track data). */
const CORRIDOR = { from: 150, to: 335 };
/** The forecourt and the hall, where the paving slabs are. */
const HALL = { from: 96, to: 150 };

const TIMBER = 0xc08a4e, TIMBER_DARK = 0x8a5f33, PLASTER = 0xf1ece2, DARK = 0x2e3238, GLASS = 0x5f7e94;
const CONCRETE = 0xb9b3a6, LINO = 0xd8cfbc, LAMP = 0xfff3cf;

export function build(kit, scene, track, layout) {
  const { box, cyl, cone, mesh } = kit;
  const random = seeded(4212);
  /** A point on the road at `lane` metres to the side, at the height the road actually has there. */
  const roadPoint = (distance, lane) => {
    const f = track.frame(distance);
    return { x: f.x + f.dz * lane, y: track.elevation(distance), z: f.z - f.dx * lane, heading: Math.atan2(f.dx, f.dz) };
  };

  /** The timber grid that fronts the hall: verticals with shelves across them, the building's own signature. */
  function brise(parent, width, height, x = 0, z = 0) {
    for (let i = 0; i * 1.9 <= width; i += 1) {
      const px = x - width / 2 + i * 1.9;
      box(parent, 0.45, height, 0.45, TIMBER, px, height / 2, z);
      for (let row = 1; row * 2.4 < height; row += 1) box(parent, 1.7, 0.28, 0.9, TIMBER, px + 0.95, row * 2.4, z + 0.3);
    }
  }

  /** Pendant cylinder lamps, the ones hanging in the hall. */
  function pendants(parent, count, spread, y, z = 0) {
    for (let i = 0; i < count; i += 1) {
      const px = -spread / 2 + (i * spread) / Math.max(1, count - 1);
      cyl(parent, 0.04, y - 3.4, DARK, px, y - (y - 3.4) / 2, z);
      const shade = cyl(parent, 0.75, 1.5, LAMP, px, 3.4, z, 10);
      shade.castShadow = false;
    }
  }

  const builders = {
    // The glazed hall: timber grid, the dark cantilevered soffit and the white reception desk inside.
    atrio: (g) => {
      box(g, 32, 1.2, 22, CONCRETE, 0, 0.6, -8);
      box(g, 30, 0.9, 20, PLASTER, 0, 1.6, -8);
      brise(g, 28, 17, 0, 1.4);
      box(g, 32, 1.6, 2.4, DARK, 0, 17.8, 1.6);        // the deep dark fascia over the glazing
      box(g, 30, 0.8, 20, DARK, 0, 18.4, -8);
      for (const x of [-14, 14]) box(g, 1.4, 17, 20, PLASTER, x, 8.5, -8);
      box(g, 12, 2.6, 4, PLASTER, -9, 3.3, -1);         // reception desk
      box(g, 12, 0.3, 4.4, LINO, -9, 4.7, -1);
      for (let i = 0; i < 7; i += 1) box(g, 9, 0.5, 1.6, TIMBER, 9, 2.6 + i * 0.9, 2 - i * 1.1); // the open stair
      pendants(g, 4, 18, 12, -4);
      kit.sign(g, 'ISTITUTO MATTONCINO', 10, 20);
    },
    // The corridor's outer wall, seen from the road: glulam beams, balustrade, wall uplights.
    corridoio: (g) => {
      box(g, 36, 13, 3, PLASTER, 0, 6.5, -5);
      for (let i = 0; i < 6; i += 1) {
        box(g, 1.1, 1.1, 8, TIMBER, -15 + i * 6, 12.4, -1);          // beams reaching out over the lane
        box(g, 0.9, 5.4, 0.9, TIMBER, -15 + i * 6, 3.2, 1.2);       // and the posts under them
        const up = mesh(g, new THREE.BoxGeometry(0.7, 0.5, 0.5), LAMP, -15 + i * 6, 7.4, -3.2);
        up.castShadow = false;
      }
      box(g, 36, 0.35, 0.35, DARK, 0, 3.4, 1.6);                     // the dark metal balustrade rail
      for (let i = 0; i * 1.3 < 36; i += 1) box(g, 0.1, 2.6, 0.1, DARK, -18 + i * 1.3, 2.1, 1.6);
      for (let i = 0; i < 4; i += 1) box(g, 3.6, 4.4, 0.25, GLASS, -13 + i * 8.6, 7.6, -3.4);
    },
    // The open staircase with its angular white soffit and a strip of light along the edge.
    scalinata: (g) => {
      box(g, 20, 1, 18, CONCRETE, 0, 0.5, -4);
      for (let i = 0; i < 12; i += 1) box(g, 16, 0.7, 1.5, PLASTER, 0, 1.3 + i * 0.85, 4 - i * 1.4);
      box(g, 20, 1.1, 20, PLASTER, 0, 12.6, -5);
      const strip = mesh(g, new THREE.BoxGeometry(18, 0.3, 0.6), LAMP, 0, 11.9, 4.4);
      strip.castShadow = false;
      for (const x of [-9.5, 9.5]) box(g, 1.2, 12, 1.2, PLASTER, x, 6, -5);
    },
    // The gym: a long low hall with small square windows scattered across the wall, exactly as in the photo.
    palestra: (g) => {
      box(g, 44, 15, 30, PLASTER, 0, 7.5, -16);
      box(g, 46, 1.2, 32, CONCRETE, 0, 15.5, -16);
      const grid = seeded(8801);
      for (let i = 0; i < 26; i += 1) {
        const col = Math.floor(grid() * 8), row = Math.floor(grid() * 3);
        box(g, 2.2, 2.2, 0.3, GLASS, -19 + col * 5.4, 5.4 + row * 3.1, -0.9);
      }
      for (const x of [-10, 10]) box(g, 3.2, 5, 0.4, TIMBER, x, 2.5, -0.9);
      kit.sign(g, 'PALESTRA', 8, 14);
    },
    // The amphitheatre the aerial photo is missing: half-moon tiers facing the school, with a wooden stage.
    anfiteatro: (g) => {
      for (let i = 0; i < 6; i += 1) {
        const radius = 13 + i * 2.6;
        const tier = mesh(g, new THREE.CylinderGeometry(radius, radius, 1.2, 26, 1, false, -Math.PI / 2, Math.PI),
          i % 2 ? CONCRETE : 0xc9c2b0, 0, 0.6 + i * 1.2, -2);
        tier.receiveShadow = true;
      }
      const stage = mesh(g, new THREE.CylinderGeometry(11, 11, 0.6, 24, 1, false, -Math.PI / 2, Math.PI), TIMBER, 0, 0.3, -2);
      stage.castShadow = false;
      for (const x of [-15, 15]) kit.lamp(g, x, 4, 5.5);
      kit.sign(g, 'ANFITEATRO', 12, 15);
    },
    // The car park: it is the ground floor, so what you see from the road is its columns and the parked cars.
    parcheggio: (g) => {
      box(g, 36, 0.4, 26, 0x5a5c60, 0, 0.2, -14);
      for (let i = 0; i < 5; i += 1) for (const z of [-7, -20]) box(g, 1.6, 11, 1.6, CONCRETE, -16 + i * 8, 5.5, z);
      const paint = seeded(3390);
      for (let i = 0; i < 9; i += 1) {
        const px = -16 + i * 4, pz = -10 - Math.floor(paint() * 2) * 12;
        const body = box(g, 3.6, 2.2, 7.4, [0xe0503c, 0x3b8de0, 0xf4f0e2, 0x4a4f57, 0xffd74a][i % 5], px, 1.5, pz);
        box(g, 3.2, 1.4, 3.6, GLASS, px, 3.2, pz - 0.4);
        body.castShadow = true;
      }
      for (let i = 0; i < 4; i += 1) {
        const tube = mesh(g, new THREE.BoxGeometry(5, 0.3, 0.5), LAMP, -12 + i * 8, 10.4, -14);
        tube.castShadow = false;
      }
      kit.sign(g, 'PARCHEGGIO', 12, 15);
    },
    // The other wing, under its blue field of solar panels.
    fotovoltaico: (g) => {
      box(g, 44, 11, 26, PLASTER, 0, 5.5, -16);
      for (let row = 0; row < 3; row += 1) for (let i = 0; i < 8; i += 1) {
        const panel = box(g, 4.4, 0.3, 3.4, 0x1c2b5e, -17 + i * 4.8, 12.2 + row * 0.1, -7 - row * 6.5);
        panel.rotation.x = -0.32;
      }
      for (const x of [-19, 19]) box(g, 2, 12, 2, CONCRETE, x, 6, -3.5);
      kit.sign(g, 'LE AULE', 8, 13);
    },
    // The street, its lime trees and the school gate.
    viadeimattoncini: (g) => {
      box(g, 46, 0.2, 9, 0x4a4d54, 0, 0.1, -12);
      for (let i = 0; i < 7; i += 1) kit.tree(g, -21 + i * 7, -5, true);
      for (const x of [-9, 9]) box(g, 0.5, 6, 0.5, DARK, x, 3, -1);
      for (let i = 0; i * 1.1 < 17; i += 1) box(g, 0.12, 4.4, 0.12, DARK, -8.5 + i * 1.1, 2.2, -1);
      kit.lamp(g, -16, -3, 7);
      kit.lamp(g, 16, -3, 7);
      kit.sign(g, 'VIA DEI MATTONCINI', 11, 15);
    },
    // The softball field next door: backstop, diamond and a low stand.
    softball: (g) => {
      const dirt = mesh(g, new THREE.CircleGeometry(18, 22), 0xb9764a, 0, 0.03, -14);
      dirt.rotation.x = -Math.PI / 2; dirt.castShadow = false;
      for (const [x, z] of [[0, -2], [11, -13], [0, -25], [-11, -13]]) box(g, 2.2, 0.2, 2.2, PLASTER, x, 0.12, z);
      for (let i = 0; i < 7; i += 1) box(g, 0.14, 7, 0.14, DARK, -5.4 + i * 1.8, 3.5, 4);
      box(g, 12, 0.2, 0.2, DARK, 0, 7, 4);
      for (let i = 0; i < 3; i += 1) box(g, 16, 0.6, 2, CONCRETE, 16, 0.6 + i * 1.1, -14 + i * 2.2);
      kit.sign(g, 'CAMPO DA SOFTBALL', 11, 16);
    },
  };

  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], 13, 17);

  // --- The building the road runs through ----------------------------------------------------------------
  // Walls both sides of the first-floor corridor and the hall, just outside the racing lanes (the test keeps a
  // roadWidth/2 + 1 = 6 m corridor clear). This is what makes a 10 m road read as being indoors.
  const inside = new THREE.Group(); inside.name = 'alba-interni'; scene.add(inside);
  const wallLane = track.roadWidth / 2 + 2.6;
  for (let d = CORRIDOR.from; d <= CORRIDOR.to; d += 6) {
    for (const side of [-1, 1]) {
      const at = roadPoint(d, side * wallLane);
      const wall = box(inside, 1.2, 9, 6.2, side < 0 ? PLASTER : TIMBER_DARK, at.x, at.y + 4.5, at.z);
      wall.rotation.y = at.heading;
      if (side > 0) { // the glazed side, looking out over the garden
        const pane = box(inside, 0.4, 5, 4.4, GLASS, at.x, at.y + 5.2, at.z);
        pane.rotation.y = at.heading;
      }
    }
    // Glulam beams crossing overhead, high enough for the camera to pass above them.
    if (d % 12 === 0) {
      const at = roadPoint(d, 0);
      const beam = box(inside, track.roadWidth + 7, 1.1, 1.1, TIMBER, at.x, at.y + 15.4, at.z);
      beam.rotation.y = at.heading;
    }
  }
  // The hall floor and its columns, where the road comes in off the forecourt.
  for (let d = HALL.from; d <= HALL.to; d += 7) {
    for (const side of [-1, 1]) {
      const at = roadPoint(d, side * (wallLane + 1.4));
      const column = box(inside, 1.5, 15, 1.5, PLASTER, at.x, at.y + 7.5, at.z);
      column.rotation.y = at.heading;
      const glow = mesh(inside, new THREE.SphereGeometry(0.5, 8, 6), LAMP, at.x, at.y + 12.4, at.z);
      glow.castShadow = false;
    }
  }

  // --- Lights coming on, one row at a time, while the sky warms up ---------------------------------------
  const windows = new THREE.Group(); windows.name = 'alba-finestre'; scene.add(windows);
  const lit = [];
  for (let d = 380; d < 940; d += 22) {
    const at = roadPoint(d, 26 + random() * 8);
    const pane = mesh(windows, new THREE.BoxGeometry(3.4, 2.6, 0.3), LAMP, at.x, at.y + 4 + Math.floor(random() * 3) * 3.4, at.z);
    pane.rotation.y = at.heading;
    pane.castShadow = false;
    pane.visible = false;
    lit.push(pane);
  }
  kit.dynamic(windows);

  // The caretaker's floor polisher going up and down the corridor before anybody arrives.
  const polisher = new THREE.Group(); polisher.name = 'alba-lucidatrice'; scene.add(polisher);
  box(polisher, 1.8, 0.6, 2.6, 0xe0503c, 0, 0.3, 0);
  cyl(polisher, 0.9, 0.25, 0x4a4f57, 0, 0.12, 1, 12);
  box(polisher, 0.12, 1.5, 0.12, DARK, 0, 1.1, -1);
  box(polisher, 1.1, 0.16, 0.16, DARK, 0, 1.85, -1);
  cone(polisher, 0.55, 1.6, 0x3b8de0, 0, 0.8, -1.6, 6);
  kit.dynamic(polisher);

  kit.animate((clock) => {
    // One row of windows lights up every couple of seconds until the whole school is awake, then it starts over.
    const wake = (clock % 40) / 40;
    lit.forEach((pane, i) => { pane.visible = i / lit.length < wake; });
    // The polisher walks the corridor and turns round at each end.
    const span = CORRIDOR.to - CORRIDOR.from - 20;
    const phase = (clock * 0.035) % 2;
    const along = CORRIDOR.from + 10 + span * (phase < 1 ? phase : 2 - phase);
    const at = roadPoint(along, wallLane - 1.8);
    polisher.position.set(at.x, at.y + 0.1, at.z);
    polisher.rotation.y = at.heading + (phase < 1 ? 0 : Math.PI);
  });
}
