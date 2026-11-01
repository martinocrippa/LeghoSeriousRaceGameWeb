/**
 * Rome from sunset into the night, as a brick toy. The Colosseum stands in the east ring with gladiators walking
 * round it and two of them duelling in the arena; St Peter's, Bernini's colonnade and the obelisk fill the west ring;
 * in the middle ring the Circo Massimo hosts a rock concert played by four priests (one in the round "saturno" hat),
 * with a crowd jumping and coloured beams sweeping the sky; on the hill above the top straight sits Michelangelo's
 * Mose with his horns and the tablets of the law. Where the lap crosses itself, the upper road is the bridge of the
 * angels and the lower one runs through a stone gallery whose portals stand ABOVE the chase camera (~11 m), as the
 * rule for galleries in CLAUDE.md demands. Umbrella pines and ochre palazzi everywhere else.
 * Everything is a toy caricature; placements are fictional.
 */
import { seeded } from '../random.js';

export const streetHouses = 0;
export const RESERVED = { colosseo: 40, sanpietro: 40, concerto: 34, mose: 22 };

/** The two crossings: the strand that goes over on the bridge and the one that runs underneath, in the gallery. */
const CROSSINGS = [{ over: 97, under: 402 }, { over: 902, under: 598 }];

const TRAVERTINE = 0xe3d6b4, TRAVERTINE_DARK = 0xc9b58c, MARBLE = 0xf4f1ea, BRICK = 0xb5643c;
const OCHRE = 0xe0a85a, TERRACOTTA = 0xc8643c, DOME = 0xb8c4c8, DARK = 0x26262b, SKIN = 0xf0c09a;
const PINE_TRUNK = 0x6b4a32, PINE_CROWN = 0x3c5a2c, PINE_TOP = 0x4d6e36, GRASS = 0x6f8a4a, SAND = 0xd9bf8a;
const LAMP = 0xfff1b0;

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, cone, mesh } = kit;
  const random = seeded(7531);
  const road = track.points(400);
  const roadGap = (x, z) => Math.min(...road.map((p) => Math.hypot(p.x - x, p.z - z)));
  /** A point beside the road at `lane`, at the height the road has there, and the road's heading. */
  const roadPoint = (distance, lane) => {
    const f = track.frame(distance);
    return { x: f.x + f.dz * lane, y: track.elevation(distance), z: f.z - f.dx * lane, heading: Math.atan2(f.dx, f.dz) };
  };
  const glowMaterials = new Map();
  /** A self-lit part (lamps, stage lights, the LED wall): it must read at night, when the sun is almost gone. */
  const glow = (parent, geometry, color, x = 0, y = 0, z = 0, intensity = 1.2) => {
    const key = `${color}:${intensity}`;
    if (!glowMaterials.has(key)) glowMaterials.set(key, new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 }));
    const part = new T.Mesh(geometry, glowMaterials.get(key));
    part.position.set(x, y, z);
    part.castShadow = false;
    parent.add(part);
    return part;
  };
  /**
   * The hills reach under the landmarks, so a building would sink on one side and float on the other. Lift the
   * group to the highest ground of its footprint and stand it on a plinth that goes down to the lowest. The plinth is
   * round and lives beside the landmark group, not in it: the clearance test measures each mesh by the corners of
   * its bounding box, and a 30 m disc has corners where its edge is not. The disc itself stays clear of the road.
   */
  const plinths = new T.Group(); plinths.name = 'roma-basamenti'; scene.add(plinths);
  const settle = (g, item, radius, color, scaleZ = 1) => {
    let high = -Infinity, low = Infinity;
    for (const r of [0, radius * 0.5, radius]) for (let i = 0; i < 16; i += 1) {
      const h = kit.groundAt(item.x + r * Math.cos(i * Math.PI / 8), item.z + r * Math.sin(i * Math.PI / 8));
      high = Math.max(high, h); low = Math.min(low, h);
    }
    g.position.y = high;
    const depth = high - low + 0.5;
    const base = new T.Group(); base.position.set(item.x, high, item.z); base.rotation.y = item.rotation; plinths.add(base);
    // Sloping sides, so on the low side it reads as a little hill and not as a cliff.
    const plinth = mesh(base, new T.CylinderGeometry(radius, radius + depth * 1.4, depth, 40), color, 0, 0.25 - depth / 2, 0);
    plinth.scale.z = scaleZ;
    plinth.castShadow = false;
  };

  /** A person at toy scale: body, head and two arms; returns the parts the animations move. */
  function figure(parent, { robe, height = 3, x = 0, z = 0, hat = null, skin = SKIN }) {
    const g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
    const legs = [-1, 1].map((side) => box(g, 0.42, height * 0.4, 0.42, robe === DARK ? DARK : skin, side * 0.28, height * 0.2, 0));
    box(g, 1.2, height * 0.42, 0.75, robe, 0, height * 0.6, 0);
    const head = new T.Group(); head.position.set(0, height * 0.88, 0); g.add(head);
    mesh(head, new T.SphereGeometry(height * 0.12, 10, 8), skin, 0, height * 0.04, 0);
    if (hat) hat(head);
    const arms = [-1, 1].map((side) => {
      const arm = new T.Group(); arm.position.set(side * 0.78, height * 0.78, 0); g.add(arm);
      box(arm, 0.32, height * 0.36, 0.32, robe, 0, -height * 0.18, 0);
      return arm;
    });
    return { g, legs, head, arms };
  }

  // --- The Colosseum ------------------------------------------------------------------------------------
  const COLOSSEO = { a: 24, b: 19, segments: 36, tier: 4.6 };
  /** One gladiator: red tunic, crested helmet, the big red shield and a short sword. */
  function gladiator(parent, x, z) {
    const man = figure(parent, { robe: 0xb52a22, height: 3.2, x, z, hat: (head) => {
      cyl(head, 0.46, 0.5, 0x9a9ea6, 0, 0.42, 0, 12);
      box(head, 0.18, 0.5, 0.9, 0xd8322a, 0, 0.85, 0);                       // the crest
    } });
    box(man.g, 1.3, 0.25, 0.8, 0xc9a24a, 0, 1.85, 0);                         // the belt
    const shield = box(man.arms[0], 0.25, 1.9, 1.3, 0xc8102e, -0.25, -0.9, 0.3);
    box(shield, 0.1, 0.25, 1.35, 0xf0b41c, -0.08, 0, 0);
    const sword = box(man.arms[1], 0.12, 1.3, 0.12, 0xd6dade, 0, -1.5, 0.45);
    sword.rotation.x = 0.9;
    return man;
  }
  function colosseo(g, item) {
    const { a, b, segments, tier } = COLOSSEO;
    settle(g, item, 31, GRASS, 0.85);
    // The arena sand, the stepped seating rising from it, and the outer wall of arches in three tiers and an attic.
    const sand = mesh(g, new T.CircleGeometry(1, 36), SAND, 0, 0.32, 0);
    sand.rotation.x = -Math.PI / 2; sand.scale.set(a - 9, b - 9, 1); sand.castShadow = false;
    const seats = new T.MeshStandardMaterial({ color: TRAVERTINE_DARK, roughness: 0.85, side: T.DoubleSide });
    for (let i = 0; i < 4; i += 1) {
      const r = a - 2 - i * 2.4, h = 13 - i * 3;
      const wall = new T.Mesh(new T.CylinderGeometry(r, r, h, 36, 1, true), seats);
      wall.position.y = h / 2; wall.scale.z = b / a; wall.castShadow = true; wall.receiveShadow = true;
      g.add(wall);
      const step = mesh(g, new T.RingGeometry(r - 2.4, r, 36), TRAVERTINE, 0, h, 0);
      step.rotation.x = -Math.PI / 2; step.scale.y = b / a; step.castShadow = false;
    }
    // The broken side (the inner ring shows where the outer wall fell) faces away from the start.
    const ruined = (angle) => angle > Math.PI * 1.15 && angle < Math.PI * 1.75;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2, next = ((i + 1) / segments) * Math.PI * 2;
      const x0 = a * Math.cos(angle), z0 = b * Math.sin(angle), x1 = a * Math.cos(next), z1 = b * Math.sin(next);
      const span = Math.hypot(x1 - x0, z1 - z0), heading = -Math.atan2(z1 - z0, x1 - x0);
      const tiers = ruined(angle) ? (i % 2 ? 1 : 2) : 3;
      for (let t = 0; t < tiers; t += 1) {
        const pier = box(g, 1.3, tier - 0.9, 2.2, TRAVERTINE, x0, t * tier + (tier - 0.9) / 2, z0);
        pier.rotation.y = heading;
        const lintel = box(g, span + 0.3, 0.9, 2.2, t % 2 ? TRAVERTINE : TRAVERTINE_DARK, (x0 + x1) / 2, t * tier + tier - 0.45, (z0 + z1) / 2);
        lintel.rotation.y = heading;
      }
      if (tiers === 3) {
        const attic = box(g, span + 0.3, 2.6, 2.2, TRAVERTINE, (x0 + x1) / 2, 3 * tier + 1.3, (z0 + z1) / 2);
        attic.rotation.y = heading;
      }
    }
  }

  // --- St Peter's -----------------------------------------------------------------------------------------
  function sanpietro(g, item) {
    settle(g, item, 31, GRASS);
    // The piazza paving, then the facade with its columns and statues, the body and the great dome behind.
    const piazza = mesh(g, new T.CircleGeometry(1, 40), 0xcfc5b0, 0, 0.3, 9);
    piazza.rotation.x = -Math.PI / 2; piazza.scale.set(23, 16, 1); piazza.castShadow = false;
    box(g, 34, 15, 6, TRAVERTINE, 0, 7.5, -11);
    box(g, 36, 1.4, 7, TRAVERTINE_DARK, 0, 15.7, -11);
    box(g, 30, 2.4, 6, TRAVERTINE, 0, 17.6, -11);
    for (let i = 0; i < 8; i += 1) cyl(g, 0.8, 13.5, MARBLE, -14 + i * 4, 6.75, -7.6, 10);
    for (let i = 0; i < 3; i += 1) box(g, 2.6, 4.6, 0.6, DARK, -4 + i * 4, 2.3, -7.9);       // the doors
    for (let i = 0; i < 7; i += 1) {
      cyl(g, 0.35, 1.8, MARBLE, -12 + i * 4, 19.7, -9.5, 8);
      mesh(g, new T.SphereGeometry(0.4, 8, 6), MARBLE, -12 + i * 4, 20.9, -9.5);
    }
    box(g, 26, 14, 16, TRAVERTINE_DARK, 0, 7, -22);
    cyl(g, 8, 6, TRAVERTINE, 0, 17, -22, 24);
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      cyl(g, 0.45, 6, MARBLE, Math.cos(angle) * 8.2, 17, -22 + Math.sin(angle) * 8.2, 8);
    }
    mesh(g, new T.SphereGeometry(8.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), DOME, 0, 20, -22);
    cyl(g, 1.3, 3.6, MARBLE, 0, 30, -22, 10);
    cone(g, 1.5, 2, DOME, 0, 32.8, -22, 10);
    box(g, 0.25, 2.2, 0.25, 0xf0b41c, 0, 34.8, -22);
    box(g, 1.2, 0.25, 0.25, 0xf0b41c, 0, 35.2, -22);
    // Bernini's colonnade: two curved arms of columns embracing the piazza, open towards the road.
    const ax = 21, bz = 14, cz = 9;
    for (const [from, to] of [[-1.15, 1.15], [Math.PI - 1.15, Math.PI + 1.15]]) {
      for (let angle = from; angle <= to + 1e-6; angle += 0.115) {
        for (const ring of [0, 2.6]) cyl(g, 0.42, 6.2, MARBLE, Math.cos(angle) * (ax + ring), 3.1, cz - Math.sin(angle) * (bz + ring), 8);
        const roof = box(g, 3.4, 1.1, 4, TRAVERTINE, Math.cos(angle) * (ax + 1.3), 6.75, cz - Math.sin(angle) * (bz + 1.3));
        roof.rotation.y = Math.atan2(Math.cos(angle) * bz, -Math.sin(angle) * ax);  // along the arc
        if (Math.round(angle / 0.115) % 3 === 0) cyl(g, 0.3, 1.5, MARBLE, Math.cos(angle) * (ax + 1.3), 8, cz - Math.sin(angle) * (bz + 1.3), 6);
      }
    }
    // The obelisk in the middle and the two fountains either side of it.
    box(g, 2.4, 1.6, 2.4, TRAVERTINE_DARK, 0, 1.1, cz);
    mesh(g, new T.CylinderGeometry(0.55, 0.9, 13, 4), 0xd8c8a0, 0, 8.4, cz).rotation.y = Math.PI / 4;
    cone(g, 0.8, 1.4, 0xd8c8a0, 0, 15.6, cz, 4).rotation.y = Math.PI / 4;
    for (const x of [-11, 11]) {
      cyl(g, 2.4, 0.9, TRAVERTINE, x, 0.75, cz, 16);
      glow(g, new T.CylinderGeometry(2, 2, 0.2, 16), 0x7fb8e0, x, 1.2, cz, 0.35);
      cyl(g, 0.4, 2.6, TRAVERTINE, x, 1.6, cz, 8);
      mesh(g, new T.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xbfe0f4, x, 2.9, cz).castShadow = false;
    }
  }

  // --- Mose -------------------------------------------------------------------------------------------------
  function mose(g, item) {
    settle(g, item, 12, MARBLE);
    // The tomb of Julius II behind him: a marble wall with pilasters and a niche.
    box(g, 17, 13, 2.4, 0xe9e3d6, 0, 6.5, -6);
    for (const x of [-7, -3.6, 3.6, 7]) box(g, 1.2, 13, 1, MARBLE, x, 6.5, -4.6);
    box(g, 18, 1.2, 3, MARBLE, 0, 13.4, -5.6);
    box(g, 5.6, 7.5, 0.6, 0xd6cdbb, 0, 7, -4.7);
    // The statue, seated, a good four times life size: lap and legs, chest, arms, the head with the two horns,
    // the long beard down to his belly and the tablets of the law under his right arm.
    box(g, 6.4, 1.8, 5, MARBLE, 0, 0.9, -1);                     // the plinth
    box(g, 4.6, 3, 2.8, MARBLE, 0, 3.3, -2.4);                   // the seat
    box(g, 4.2, 1.8, 3.4, 0xece6d9, 0, 4.3, 0.2);               // the lap, under the robe
    for (const side of [-1, 1]) box(g, 1.4, 2.6, 1.4, 0xece6d9, side * 1.2, 3.1, 1.8);
    box(g, 0.9, 0.5, 1.4, MARBLE, 1.2, 1.95, 2.6);              // the bare foot forward
    box(g, 3.6, 4, 2.2, MARBLE, 0, 7.1, -1.2);                   // the chest
    for (const side of [-1, 1]) {
      const arm = box(g, 1, 3.6, 1, MARBLE, side * 2.2, 6.6, -0.6);
      arm.rotation.z = side * 0.15;
      const horn = cone(g, 0.22, 1, MARBLE, side * 0.45, 11, -1.2, 6);
      horn.rotation.z = -side * 0.35;
    }
    mesh(g, new T.SphereGeometry(1.15, 12, 10), MARBLE, 0, 9.9, -1.2);
    const beard = cone(g, 0.95, 3.2, 0xe6dfd0, 0, 7.6, -0.05, 8);
    beard.rotation.x = Math.PI;
    const tablets = box(g, 1.6, 2.6, 0.5, 0xddd4c2, 2.6, 5.6, 0.6);
    tablets.rotation.z = 0.2;
    // Steps up to him and two lamps that light him up when it gets dark.
    for (let i = 0; i < 3; i += 1) box(g, 10 - i * 1.2, 0.4, 1.4, TRAVERTINE, 0, 0.2 + i * 0.4, 4.6 - i * 0.9);
    kit.lamp(g, -6.5, 4, 5);
    kit.lamp(g, 6.5, 4, 5);
  }

  // --- The priests' rock concert at the Circo Massimo ------------------------------------------------------
  const concert = { priests: [], beams: [], screen: null, crowd: null, people: [] };
  function concerto(g, item) {
    settle(g, item, 22, GRASS);
    // The long lawn of the Circo Massimo, with the old track worn into it.
    const lawn = mesh(g, new T.CircleGeometry(1, 36), 0x7f9a52, 0, 0.3, 0);
    lawn.rotation.x = -Math.PI / 2; lawn.scale.set(20, 21, 1); lawn.castShadow = false;
    // The stage: platform, LED wall, truss with lights, speaker towers.
    box(g, 26, 2, 12, DARK, 0, 1, -16);
    concert.screen = glow(g, new T.BoxGeometry(20, 9, 0.5), 0xff3a6e, 0, 7.6, -21.6, 0.9);
    kit.dynamic(concert.screen);
    for (const x of [-12.5, 12.5]) {
      box(g, 0.6, 15, 0.6, 0x8a8f96, x, 7.5, -21);
      box(g, 0.6, 15, 0.6, 0x8a8f96, x, 7.5, -11);
      for (let i = 0; i < 3; i += 1) {
        box(g, 4, 3, 3.2, DARK, x + Math.sign(x) * 3.2, 1.5 + i * 3, -11.5);
        cyl(g, 0.9, 0.3, 0x5a5e66, x + Math.sign(x) * 3.2, 1.5 + i * 3, -9.8, 12).rotation.x = Math.PI / 2;
      }
    }
    box(g, 26, 0.8, 0.8, 0x8a8f96, 0, 15, -11);
    box(g, 26, 0.8, 0.8, 0x8a8f96, 0, 15, -21);
    const colors = [0xff3a3a, 0x3aa0ff, 0xffe14a, 0x3aff8a, 0xd04aff];
    const beamMaterial = (color) => new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    for (let i = 0; i < 5; i += 1) {
      const x = -10 + i * 5;
      glow(g, new T.CylinderGeometry(0.5, 0.7, 0.9, 10), colors[i], x, 14.2, -11, 1.6);
      // A beam is a long thin cone hanging from its lamp, swinging; it points up and out over the crowd.
      const pivot = new T.Group(); pivot.position.set(x, 14.2, -11); g.add(pivot);
      const beam = new T.Mesh(new T.ConeGeometry(2.6, 16, 14, 1, true), beamMaterial(colors[i]));
      beam.position.y = 8; beam.rotation.x = Math.PI; beam.castShadow = false;
      pivot.add(beam);
      kit.dynamic(pivot);
      concert.beams.push(pivot);
    }
    // The band: four priests in black cassocks with the white collar, one in the round saturno hat.
    const saturno = (head) => {
      cyl(head, 0.95, 0.12, DARK, 0, 0.45, 0, 16);
      mesh(head, new T.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), DARK, 0, 0.45, 0);
    };
    const band = [
      { x: -7, z: -14, instrument: 'guitar', color: 0xd8322a },
      { x: -2.2, z: -13, instrument: 'mic', hat: saturno },
      { x: 3, z: -14, instrument: 'guitar', color: 0x3a7ad8 },
      { x: 7.5, z: -18, instrument: 'drums' },
    ];
    for (const member of band) {
      const priest = figure(g, { robe: DARK, height: 3.4, x: member.x, z: member.z, hat: member.hat });
      priest.g.position.y = 2;
      box(priest.g, 0.9, 0.22, 0.8, 0xf7f5ef, 0, 3.0, 0.02);                   // the white collar
      box(priest.g, 1.3, 1.4, 0.8, DARK, 0, 0.7, 0);                            // the cassock down to the feet
      if (member.instrument === 'guitar') {
        const guitar = new T.Group(); guitar.position.set(0, 1.9, 0.55); guitar.rotation.z = 0.5; priest.g.add(guitar);
        box(guitar, 1.2, 0.8, 0.2, member.color, 0, 0, 0);
        box(guitar, 1.8, 0.16, 0.12, 0x3a2a1e, 1.3, 0.1, 0);
        priest.instrument = guitar;
      } else if (member.instrument === 'mic') {
        box(g, 0.1, 3.6, 0.1, 0x8a8f96, member.x, 3.8, member.z + 1.2);
        mesh(g, new T.SphereGeometry(0.18, 8, 6), 0x2a2a2e, member.x, 5.7, member.z + 1.2);
      } else {
        const drum = cyl(g, 1.1, 1.2, 0xf4f0e2, member.x, 3.1, member.z + 1.6, 14);
        drum.rotation.x = Math.PI / 2;
        for (const side of [-1, 1]) {
          cyl(g, 0.6, 0.6, 0xd8322a, member.x + side * 1.4, 3.9, member.z + 1.4, 12);
          cyl(g, 0.8, 0.06, 0xe0b25a, member.x + side * 2.2, 4.8, member.z + 0.8, 14);
        }
      }
      kit.dynamic(priest.g);
      concert.priests.push(priest);
    }
    // The crowd: little people in a dozen colours, jumping to the music.
    const person = new T.BoxGeometry(0.9, 2.2, 0.7);
    const crowd = new T.InstancedMesh(person, new T.MeshStandardMaterial({ roughness: 0.8 }), 110);
    const shade = new T.Color();
    const palette = [0xd8322a, 0x3a7ad8, 0xf0b41c, 0x2a9a5a, 0xf4f0e2, 0x8a4ad8, 0x26262b, 0xff7a12];
    for (let i = 0; i < 110; i += 1) {
      const x = -17 + random() * 34, z = -7 + random() * 22;
      concert.people.push({ x, z, phase: random() * Math.PI * 2, speed: 5 + random() * 3 });
      crowd.setColorAt(i, shade.setHex(palette[i % palette.length]));
      const spot = new T.Object3D(); spot.position.set(x, 1.4, z); spot.updateMatrix();
      crowd.setMatrixAt(i, spot.matrix);
    }
    crowd.castShadow = true;
    g.add(crowd);
    kit.dynamic(crowd);
    concert.crowd = crowd;
  }

  const builders = { colosseo, sanpietro, mose, concerto };
  const SIGN = { colosseo: 34, sanpietro: 34, concerto: 21, mose: 12 };
  const placed = {};
  for (const item of layout.landmarks) placed[item.kind] = kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind], SIGN[item.kind] ?? 11, item.kind === 'concerto' ? 24 : 17);

  // --- Bridges of the angels, and the galleries underneath ---------------------------------------------------
  const crossings = new T.Group(); crossings.name = 'roma-ponti-gallerie'; scene.add(crossings);
  const wallLane = track.roadWidth / 2 + 2.6;
  for (const { over, under } of CROSSINGS) {
    // Angels on the parapets of the bridge, leaving the middle (over the gallery) free.
    for (let offset = -48; offset <= 48; offset += 12) {
      if (Math.abs(offset) < 14) continue;
      for (const side of [-1, 1]) {
        const at = roadPoint(over + offset, side * (track.roadWidth / 2 + 0.9));
        const angel = new T.Group(); angel.position.set(at.x, at.y, at.z); angel.rotation.y = at.heading; crossings.add(angel);
        box(angel, 1, 1.4, 1, TRAVERTINE, 0, 0.7, 0);
        cone(angel, 0.6, 2.2, MARBLE, 0, 2.5, 0, 8);
        mesh(angel, new T.SphereGeometry(0.34, 8, 6), MARBLE, 0, 3.85, 0);
        for (const wing of [-1, 1]) {
          const feathers = box(angel, 0.12, 1.6, 0.9, MARBLE, 0, 3.1, wing * 0.55);
          feathers.rotation.x = wing * 0.5;
        }
      }
    }
    // The gallery: stone walls both sides of the lower road with lamps in them...
    for (let offset = -26; offset <= 26; offset += 4.3) {
      for (const side of [-1, 1]) {
        const at = roadPoint(under + offset, side * wallLane);
        const wall = box(crossings, 1.2, 6.2, 4.4, BRICK, at.x, at.y + 3.1, at.z);
        wall.rotation.y = at.heading;
        if (Math.round(offset / 4.3) % 2 === 0) {
          const lamp = roadPoint(under + offset, side * (wallLane - 0.75));
          glow(crossings, new T.BoxGeometry(0.3, 0.6, 1.2), LAMP, lamp.x, lamp.y + 4.6, lamp.z, 1.4).rotation.y = at.heading;
        }
      }
    }
    // ...and a portal at each end, its arch well above the chase camera so it frames the bridge instead of hiding it.
    for (const end of [-1, 1]) {
      const centre = roadPoint(under + end * 14, 0);
      const portal = new T.Group(); portal.position.set(centre.x, centre.y, centre.z); portal.rotation.y = centre.heading; crossings.add(portal);
      for (const side of [-1, 1]) {
        box(portal, 3.2, 16, 2.4, TRAVERTINE, side * 10.6, 8, 0);
        box(portal, 3.8, 1, 3, TRAVERTINE_DARK, side * 10.6, 16.5, 0);
      }
      box(portal, 24.4, 1.8, 2.4, TRAVERTINE, 0, 15.1, 0);
      box(portal, 2, 2.6, 2.6, TRAVERTINE_DARK, 0, 15.1, 0);           // the keystone
    }
  }

  // --- Umbrella pines and ochre palazzi ----------------------------------------------------------------------
  const keepOff = layout.landmarks.map((item) => ({ x: item.x, z: item.z, radius: (RESERVED[item.kind] ?? 23) + 4 }));
  const free = (x, z, gap) => keepOff.every((p) => Math.hypot(p.x - x, p.z - z) > p.radius) && roadGap(x, z) > gap;
  const pines = [];
  const { minX, maxX, minZ, maxZ } = track.bounds;
  for (let tries = 0; tries < 2400 && pines.length < 80; tries += 1) {
    const x = minX - 70 + random() * (maxX - minX + 140), z = minZ - 70 + random() * (maxZ - minZ + 140);
    if (!free(x, z, 14) || pines.some((p) => Math.hypot(p.x - x, p.z - z) < 9)) continue;
    pines.push({ x, z, y: kit.groundAt(x, z), height: 8.5 + random() * 3.5, spread: 4.2 + random() * 1.8, lean: (random() - 0.5) * 0.16 });
  }
  const trunks = new T.InstancedMesh(new T.CylinderGeometry(0.32, 0.48, 1, 7), kit.mat(PINE_TRUNK), pines.length);
  const crowns = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), kit.mat(PINE_CROWN), pines.length);
  const tops = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), kit.mat(PINE_TOP), pines.length);
  const place = new T.Object3D();
  pines.forEach((pine, i) => {
    place.position.set(pine.x, pine.y + pine.height / 2, pine.z); place.rotation.set(pine.lean, 0, pine.lean * 0.6); place.scale.set(1, pine.height, 1);
    place.updateMatrix(); trunks.setMatrixAt(i, place.matrix);
    // The flat umbrella crown that makes a Roman pine a Roman pine, and a smaller lighter cap on top of it.
    place.rotation.set(0, 0, 0);
    place.position.set(pine.x + pine.lean * pine.height * 0.5, pine.y + pine.height, pine.z - pine.lean * pine.height * 0.3);
    place.scale.set(pine.spread, 1.3, pine.spread); place.updateMatrix(); crowns.setMatrixAt(i, place.matrix);
    place.position.y += 0.9; place.scale.set(pine.spread * 0.65, 0.8, pine.spread * 0.65); place.updateMatrix(); tops.setMatrixAt(i, place.matrix);
  });
  for (const instanced of [trunks, crowns, tops]) { instanced.castShadow = true; instanced.receiveShadow = true; instanced.name = 'roma-pini'; scene.add(instanced); }

  const palazzi = new T.Group(); palazzi.name = 'roma-palazzi'; scene.add(palazzi);
  const colours = [OCHRE, TERRACOTTA, 0xe8c27a, 0xd98c52];
  for (let i = 0, built = 0; i < 400 && built < 16; i += 1) {
    const angle = random() * Math.PI * 2, reach = 1.08 + random() * 0.2;
    const x = Math.cos(angle) * (maxX + 30) * reach, z = Math.sin(angle) * (maxZ + 40) * reach;
    if (!free(x, z, 22) || pines.some((p) => Math.hypot(p.x - x, p.z - z) < 8)) continue;
    const g = new T.Group(); g.position.set(x, kit.groundAt(x, z), z); g.rotation.y = Math.atan2(-x, -z); palazzi.add(g);
    const height = 9 + Math.floor(random() * 3) * 2.5;
    box(g, 14, height, 10, colours[built % colours.length]);
    box(g, 14.6, 0.8, 10.6, TERRACOTTA, 0, height + 0.4, 0);
    kit.windows(g, 14, height, 5.05, Math.floor(height / 3));
    box(g, 2.2, 3, 0.2, 0x5a3a24, 0, 1.5, 5.1);
    built += 1;
  }

  // --- Gladiators round the Colosseum, two duelling in the arena ------------------------------------------
  const arena = placed.colosseo;
  const gladiators = [];
  if (arena) {
    const ring = new T.Group(); ring.name = 'roma-gladiatori';
    ring.position.copy(arena.position); ring.rotation.y = arena.rotation.y;
    scene.add(ring);
    for (let i = 0; i < 6; i += 1) gladiators.push({ man: gladiator(ring, 0, 0), phase: (i / 6) * Math.PI * 2, speed: i % 2 ? 0.05 : -0.04 });
    const duel = [gladiator(ring, -2.2, 0), gladiator(ring, 2.2, 0)];
    duel[0].g.rotation.y = Math.PI / 2; duel[1].g.rotation.y = -Math.PI / 2;
    for (const man of duel) man.g.position.y = 0.32;
    kit.dynamic(ring);
    concert.duel = duel;
  }

  const crowdMatrix = new T.Object3D();
  kit.animate((clock) => {
    // Gladiators: a slow march round the amphitheatre, legs and sword arm swinging.
    for (const { man, phase, speed } of gladiators) {
      const angle = phase + clock * speed;
      const a = COLOSSEO.a + 5, b = COLOSSEO.b + 5;
      man.g.position.set(Math.cos(angle) * a, 0, Math.sin(angle) * b);
      const dx = -Math.sin(angle) * a * Math.sign(speed), dz = Math.cos(angle) * b * Math.sign(speed);
      man.g.rotation.y = Math.atan2(dx, dz);
      const step = Math.sin(clock * 5 + phase * 3) * 0.5;
      man.legs[0].rotation.x = step; man.legs[1].rotation.x = -step;
      man.arms[1].rotation.x = -step;
    }
    // The duel: they lunge in turn and the swords clash.
    for (const [i, man] of (concert.duel || []).entries()) {
      const lunge = Math.max(0, Math.sin(clock * 3 + i * Math.PI));
      man.arms[1].rotation.x = -0.6 - lunge * 1.4;
      man.g.position.x = (i ? 1 : -1) * (2.2 - lunge * 0.6);
    }
    // The priests rock: bouncing, headbanging, the drummer hammering away.
    const beat = clock * 7.5;
    concert.priests.forEach((priest, i) => {
      priest.g.position.y = 2 + Math.max(0, Math.sin(beat + i)) * (i === 3 ? 0.1 : 0.45);
      priest.head.rotation.x = Math.sin(beat * 2 + i) * 0.35;
      priest.arms[0].rotation.x = -0.9 + Math.sin(beat * 2 + i) * (i === 3 ? 0.8 : 0.25);
      priest.arms[1].rotation.x = i === 1 ? -2.6 + Math.sin(beat * 0.5) * 0.3 : -0.9 + Math.sin(beat * 2 + i + 1) * 0.8;
      if (priest.instrument) priest.instrument.rotation.z = 0.5 + Math.sin(beat + i) * 0.15;
    });
    for (const [i, pivot] of concert.beams.entries()) {
      pivot.rotation.x = 0.55 + Math.sin(clock * 0.9 + i) * 0.35;
      pivot.rotation.z = Math.sin(clock * 0.7 + i * 1.7) * 0.6;
    }
    if (concert.screen) concert.screen.material.emissive.setHSL((clock * 0.08) % 1, 0.9, 0.45);
    if (concert.crowd) {
      concert.people.forEach((person, i) => {
        crowdMatrix.position.set(person.x, 1.4 + Math.max(0, Math.sin(clock * person.speed + person.phase)) * 0.9, person.z);
        crowdMatrix.updateMatrix();
        concert.crowd.setMatrixAt(i, crowdMatrix.matrix);
      });
      concert.crowd.instanceMatrix.needsUpdate = true;
    }
  });
}
