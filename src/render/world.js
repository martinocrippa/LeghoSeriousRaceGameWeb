/**
 * GameRenderer methods. Building a circuit's world: road, sections, banking, obstacles, animals and the scenery around it.
 * Plain methods on `this`, attached to GameRenderer.prototype in renderer.js; moved here unchanged.
 */
import { isLocalSceneryReserved, localGroundHoles } from '../local-scenery.js';
import * as THREE from 'three';
import { KNOCK_RISE, KNOCK_SLIDE, KNOCK_TIME, livePose } from '../critters.js';
import { ROAD_Y, GROUND_REACH, SURFACE_COLORS, cobbleTexture, material, easeOutBack, mesh, worldPoint, alignToRoad, poseQuaternion, sectionStrip, sectionTube, strut, heightfield, seededRandom, checkerTexture, textTexture, ribbon } from './common.js';

export const worldMethods = {
  buildTrack(track) {
    const { theme, length, roadWidth } = track;
    const loops = (track.sections || []).filter((section) => !section.optional);
    const insideLoop = (distance) => loops.some((loop) => distance >= loop.from && distance < loop.to);
    // The road is drawn in pieces: loop-the-loops replace it, and each surface (cobbles, asphalt, dirt) gets its own material.
    const cuts = new Set([0, length]);
    for (const loop of loops) { cuts.add(loop.from); cuts.add(loop.to); }
    for (const surface of track.surfaces || []) { cuts.add(surface.from); cuts.add(surface.to); }
    const edges = [...cuts].sort((a, b) => a - b);
    const materials = new Map();
    const surfaceMaterial = (kind, part) => {
      const key = `${kind}:${part}`;
      if (!materials.has(key)) {
        const colors = SURFACE_COLORS[kind];
        const color = part === 'road' ? (colors ? colors.road : theme.road) : (colors ? colors.shoulder : theme.shoulder);
        const extra = { side: THREE.DoubleSide };
        if (kind === 'cobbles' && part === 'road' && typeof document !== 'undefined') { extra.map = cobbleTexture(); extra.roughness = 0.9; }
        materials.set(key, material(color, extra));
      }
      return materials.get(key);
    };
    for (let i = 0; i < edges.length - 1; i += 1) {
      const start = edges[i], span = edges[i + 1] - start;
      if (span < 0.5 || insideLoop(start)) continue;
      const kind = track.surfaceAt ? track.surfaceAt(start + span / 2) : 'default';
      const segments = Math.max(4, Math.round(span / (length / 600)));
      this.world.add(ribbon(track, start, span, roadWidth + 1.2, 0, 0.11, surfaceMaterial(kind, 'shoulder'), segments));
      this.world.add(ribbon(track, start, span, roadWidth, 0, ROAD_Y, surfaceMaterial(kind, 'road'), segments));
    }
    const curbA = material(theme.curb[0], { side: THREE.DoubleSide });
    const curbB = material(theme.curb[1], { side: THREE.DoubleSide });
    const stripe = material(theme.stripe, { side: THREE.DoubleSide });
    const segments = Math.round(length / 3);
    for (let i = 0; i < segments; i += 1) {
      const distance = (length / segments) * i;
      if (insideLoop(distance) || insideLoop(distance + length / segments)) continue;
      for (const lane of [-roadWidth / 2, roadWidth / 2]) {
        this.world.add(ribbon(track, distance, length / segments, 0.62, lane, ROAD_Y + 0.018,
          i % 2 ? curbA : curbB, 3));
      }
    }
    for (let distance = 8; distance < length; distance += 12) {
      if (insideLoop(distance) || insideLoop(distance + 3.1) || (track.surfaceAt && track.surfaceAt(distance) === 'cobbles')) continue;
      this.world.add(ribbon(track, distance, 3.1, 0.14, 0, ROAD_Y + 0.023, stripe, 2));
    }
    this.buildSections(track);
    this.buildBankings(track);
    this.buildObstacles(track);
    this.buildCritters(track);

    const finish = new THREE.Group();
    const frame = track.frame(0);
    finish.position.copy(worldPoint(track, 0, 0, ROAD_Y));
    finish.rotation.y = Math.atan2(frame.dx, frame.dz);
    const white = material(0xf2eafb);
    const black = material(0x303447);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 14; column += 1) {
        mesh(new THREE.BoxGeometry(1, 0.025, 1), (column + row) % 2 ? white : black,
          finish, column - 6.5, 0.03, row - 0.5);
      }
    }
    const yellow = material(0xffc449);
    const blue = material(0x5d5dc8);
    for (const side of [-1, 1]) {
      mesh(new THREE.CylinderGeometry(0.35, 0.44, 11.4, 12), blue, finish, side * (roadWidth / 2 + 0.9), 5.7, 0);
      mesh(new THREE.BoxGeometry(1.5, 0.45, 1.5), yellow, finish, side * (roadWidth / 2 + 0.9), 0.22, 0);
      mesh(new THREE.SphereGeometry(0.56, 12, 8), yellow, finish, side * (roadWidth / 2 + 0.9), 11.6, 0);
    }
    mesh(new THREE.BoxGeometry(roadWidth + 3, 1.5, 0.7), blue, finish, 0, 10.7, 0);
    const sign = mesh(new THREE.PlaneGeometry(7, 1.45),
      new THREE.MeshBasicMaterial({ map: textTexture('LEGHO', '#2e8f97', '#ffffff', 1024, 180), side: THREE.DoubleSide }),
      finish, 0, 10.73, -0.37);
    sign.rotation.y = Math.PI;
    // The starting signal: a black box on the gantry with three big lamps that come on one at a time as the
    // countdown runs, then all turn green together. Three little spheres that simply switched from red to green
    // told a child nothing about when to expect the off.
    this.startLights = [];
    this.startLightsLit = undefined;
    // Local +z is the direction of travel, so the cars arrive from -z and look at the -z face of everything here
    // (that is why the LEGHO sign above is turned round). The backing plate therefore goes BEHIND the lamps, at
    // positive z: put in front, as it was at first, it is a black slab hanging over the road and you see no lamps.
    const housing = mesh(new THREE.BoxGeometry(3.4, 1.2, 0.3), material(0x1a1d22), finish, 0, 8.95, 0.12);
    housing.castShadow = false;
    mesh(new THREE.BoxGeometry(3.7, 0.14, 0.44), material(0xffc449), finish, 0, 9.58, 0.12).castShadow = false;
    for (let i = 0; i < 3; i += 1) {
      const socket = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.18, 14), material(0x0d0f12), finish, (i - 1) * 1.05, 8.95, -0.06);
      socket.rotation.x = Math.PI / 2;
      socket.castShadow = false;
      const light = mesh(new THREE.SphereGeometry(0.31, 14, 10), material(0x3a2020, { emissive: 0x150808, emissiveIntensity: 0.2 }),
        finish, (i - 1) * 1.05, 8.95, -0.2);
      this.startLights.push(light);
      light.castShadow = false;
      light.userData.dynamic = true;
    }
    this.world.add(finish);
    // Bridges: pillars and railings where an elevation bump is flagged `bridge` (the road crosses over flat ground).
    const iron = material(0x3a3f45, { roughness: 0.6, metalness: 0.3 });
    const concrete = material(0x8d9299);
    // Where the road passes UNDER the deck, its pillars must not come down on top of it. They used to: on the
    // the school track the first floor stands over the car park, and two of its columns landed in the middle of the road
    // down there — you drove straight through them, and the chase camera ended up inside one.
    const lowRoad = [];
    for (let d = 0; d < track.length; d += 3) {
      const rise = track.elevation ? track.elevation(d) : 0;
      if (rise < 3) lowRoad.push({ ...track.frame(d), rise });
    }
    const clearance = (roadWidth / 2 + 2) ** 2;
    const blocksTheRoadBelow = (x, z, rise) => lowRoad.some((point) => rise - point.rise > 3
      && (point.x - x) ** 2 + (point.z - z) ** 2 < clearance);
    for (const bump of (track.elevationBumps || []).filter((b) => b.bridge)) {
      const from = bump.distance - bump.length / 2, to = bump.distance + bump.length / 2;
      for (let d = from + 4; d < to; d += 7) {
        const rise = track.elevation(d);
        if (rise < 0.8) continue;
        for (const side of [-1, 1]) {
          const base = worldPoint(track, d, side * (roadWidth / 2 - 0.9), 0);
          if (blocksTheRoadBelow(base.x, base.z, rise)) continue;
          mesh(new THREE.CylinderGeometry(0.45, 0.55, rise, 10), concrete, this.world, base.x, rise / 2 - 0.05, base.z);
        }
      }
      for (const side of [-1, 1]) {
        this.world.add(ribbon(track, from, to - from, 0.14, side * (roadWidth / 2 + 0.55), ROAD_Y + 1.05, iron, 40));
        for (let d = from; d <= to; d += 5) mesh(new THREE.BoxGeometry(0.14, 1.05, 0.14), iron, this.world).position.copy(worldPoint(track, d, side * (roadWidth / 2 + 0.55), ROAD_Y + 0.52));
      }
    }
    // Gates: an iron arch over the road carrying the street's name, like the one on Corso Roma in Aprica.
    for (const gate of track.gates || []) {
      const group = new THREE.Group();
      group.position.copy(worldPoint(track, gate.distance, 0, ROAD_Y));
      const gateFrame = track.frame(gate.distance);
      group.rotation.y = Math.atan2(gateFrame.dx, gateFrame.dz);
      const span = roadWidth / 2 + 1.3;
      for (const side of [-1, 1]) {
        mesh(new THREE.CylinderGeometry(0.28, 0.34, 7, 10), iron, group, side * span, 3.5, 0);
        mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), concrete, group, side * span, 0.25, 0);
        const lamp = mesh(new THREE.SphereGeometry(0.3, 10, 7), material(0xfff1b0, { emissive: 0xffd45a, emissiveIntensity: 1.1 }), group, side * span, 7.3, 0);
        lamp.castShadow = false;
      }
      const arch = mesh(new THREE.TorusGeometry(span, 0.22, 8, 28, Math.PI), iron, group, 0, 7, 0);
      arch.castShadow = false;
      for (let i = 1; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI;
        mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), iron, group, Math.cos(angle) * span, 7 + Math.sin(angle) * span - 0.55, 0);
      }
      if (gate.name) {
        const sign = mesh(new THREE.PlaneGeometry(6.5, 1.3), new THREE.MeshBasicMaterial({ map: textTexture(gate.name, '#3a3f45', '#fff4d8', 1024, 200), side: THREE.DoubleSide }), group, 0, 6.2, 0);
        sign.castShadow = false;
        for (const x of [-3, 3]) mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), iron, group, x, 6.9, 0);
      }
      this.world.add(group);
    }
  },

  /**
   * Solid props standing on the road (track.obstacles). They are drawn HERE and nowhere else, at exactly the
   * radius and height the simulation bumps against, so the thing on the screen is the thing that stops the car.
   * Nothing the renderer invents by itself is solid — the columns under a bridge, the crates, the flags are all
   * still scenery, because making those solid is how you end up with a bonus walled in behind a column.
   */
  buildObstacles(track) {
    // By id, so the race can blow one up, flatten it or grow it back (syncObstacles). Kept on the world, which is
    // cached per circuit, so the map always belongs to the props actually in the scene.
    const groups = this.world.userData.obstacleGroups = new Map();
    if (!track.obstacles?.length) return;
    const stripeA = material(0xe5203a), stripeB = material(0xf4f0e2);
    const straw = material(0xe0c070, { roughness: 0.95 }), strawEnd = material(0xc9a44e, { roughness: 0.95 });
    const plastic = material(0x2f7d4f), lid = material(0x3f4149);
    const timber = material(0xc8a06a), steel = material(0x8d9299);
    const concrete = material(0x9aa0a8), soil = material(0x4a3a2c), leaf = material(0x4f8f5a);
    const stone = material(0x9a9484, { roughness: 0.95 });
    for (const obstacle of track.obstacles) {
      const group = new THREE.Group();
      group.name = `obstacle-${obstacle.id}`;
      group.position.copy(worldPoint(track, obstacle.distance, obstacle.lane, ROAD_Y));
      alignToRoad(group, track, obstacle.distance, obstacle.lane);
      group.rotation.y += obstacle.turn;
      const r = obstacle.radius, h = obstacle.height;
      if (obstacle.kind === 'cone') {
        mesh(new THREE.BoxGeometry(r * 2.2, 0.1, r * 2.2), stripeB, group, 0, 0.05, 0);
        mesh(new THREE.ConeGeometry(r, h, 10), stripeA, group, 0, h / 2 + 0.05, 0);
        mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.68, 0.18, 10), stripeB, group, 0, h * 0.45, 0);
      } else if (obstacle.kind === 'bale') {
        // A round bale lies on its side: the flat ends face across the road, the way one falls off a trailer.
        const roll = mesh(new THREE.CylinderGeometry(r, r, r * 1.7, 14), straw, group, 0, r, 0);
        roll.rotation.z = Math.PI / 2;
        for (const side of [-1, 1]) {
          const cap = mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.1, 14), strawEnd, group, side * r * 0.87, r, 0);
          cap.rotation.z = Math.PI / 2;
        }
        for (let i = 0; i < 5; i += 1) {
          const band = mesh(new THREE.TorusGeometry(r * 1.01, 0.04, 5, 14), strawEnd, group, (i - 2) * r * 0.32, r, 0);
          band.rotation.y = Math.PI / 2;
          band.castShadow = false;
        }
      } else if (obstacle.kind === 'bin') {
        mesh(new THREE.CylinderGeometry(r, r * 0.82, h - 0.12, 10), plastic, group, 0, (h - 0.12) / 2, 0);
        mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 0.14, 10), lid, group, 0, h - 0.05, 0);
        for (const side of [-1, 1]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 6), lid, group, side * r * 0.7, 0.1, 0).rotation.z = Math.PI / 2;
      } else if (obstacle.kind === 'barrier') {
        for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.14, h, 0.14), steel, group, side * (r - 0.15), h / 2, 0);
        for (let i = 0; i < 3; i += 1) mesh(new THREE.BoxGeometry(r * 2, 0.22, 0.12), i % 2 ? stripeB : stripeA, group, 0, h - 0.2 - i * 0.34, 0);
      } else if (obstacle.kind === 'desk') {
        // A school desk, four times life size like the rest of the school: a top on four steel legs.
        mesh(new THREE.BoxGeometry(r * 2, 0.16, r * 1.4), timber, group, 0, h - 0.08, 0);
        mesh(new THREE.BoxGeometry(r * 1.9, 0.3, r * 1.2), material(0x8d9299), group, 0, h - 0.3, 0);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          mesh(new THREE.CylinderGeometry(0.09, 0.09, h - 0.16, 7), steel, group, sx * (r - 0.25), (h - 0.16) / 2, sz * (r * 0.55));
        }
      } else if (obstacle.kind === 'column') {
        mesh(new THREE.BoxGeometry(r * 2.3, 0.3, r * 2.3), concrete, group, 0, 0.15, 0);
        mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 12), concrete, group, 0, h / 2, 0);
        // A painted band at bumper height: in a dark car park it is what tells a child the column is there.
        mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.7, 12), material(0xf0a81e), group, 0, 1.25, 0);
      } else if (obstacle.kind === 'planter') {
        mesh(new THREE.CylinderGeometry(r, r * 0.86, h * 0.68, 12), stone, group, 0, h * 0.34, 0);
        mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.12, 12), soil, group, 0, h * 0.7, 0);
        for (let i = 0; i < 5; i += 1) {
          const a = i / 5 * Math.PI * 2;
          mesh(new THREE.IcosahedronGeometry(r * 0.42, 0), leaf, group, Math.cos(a) * r * 0.42, h * 0.82, Math.sin(a) * r * 0.42);
        }
      } else if (obstacle.kind === 'island') {
        // A roundabout island: kerb ring, a low grass dome, a shrub or two and the blue chevrons facing the
        // traffic. You go round it on either side — which is exactly what the simulation makes you do.
        mesh(new THREE.CylinderGeometry(r, r, 0.34, 20), material(0xe8e4d8), group, 0, 0.17, 0);
        mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.16, 20), material(0x6f9a52), group, 0, 0.36, 0);
        const dome = mesh(new THREE.SphereGeometry(r * 0.86, 14, 8), material(0x6f9a52), group, 0, 0.3, 0);
        dome.scale.y = 0.42;
        for (let i = 0; i < 4; i += 1) {
          const a = i / 4 * Math.PI * 2 + 0.4;
          mesh(new THREE.IcosahedronGeometry(r * 0.24, 0), material(0x4f8f5a), group, Math.cos(a) * r * 0.44, 0.7, Math.sin(a) * r * 0.44);
        }
        // Chevrons on the near side, where a car arrives; they are what tells a child which way round it goes.
        for (const side of [-1, 1]) {
          const sign = mesh(new THREE.BoxGeometry(1.2, 0.8, 0.1), material(0x2f5f9a), group, side * r * 0.55, 0.85, r * 0.72);
          sign.rotation.y = side * 0.4;
          const arrow = mesh(new THREE.ConeGeometry(0.26, 0.5, 3), material(0xf4f0e2), group, side * r * 0.55, 0.85, r * 0.78);
          arrow.rotation.set(Math.PI / 2, 0, side * Math.PI / 2);
          arrow.castShadow = false;
        }
      } else {
        // rock: a lump of the hillside that rolled down into the road.
        const lump = mesh(new THREE.IcosahedronGeometry(r, 0), stone, group, 0, h * 0.45, 0);
        lump.scale.set(1, h / (r * 2) * 1.1, 0.92);
        lump.rotation.set(obstacle.distance, obstacle.lane, 0.4);
        mesh(new THREE.IcosahedronGeometry(r * 0.45, 0), stone, group, r * 0.7, h * 0.22, -r * 0.4);
      }
      // A prop that can be blown up must keep its own meshes: batchStaticMeshes would otherwise melt them into
      // the circuit's merged geometry, and hiding or flattening the (by then empty) group would change nothing.
      if (obstacle.breakable) group.traverse((child) => { child.userData.dynamic = true; });
      this.world.add(group);
      groups.set(obstacle.id, group);
    }
  },

  /**
   * A broken prop is gone (blown up) or lies flat (rolled over by a bale) until the race grows it back; then it
   * pops up out of the road instead of blinking into place. Read from the race every frame, so it cannot drift.
   */
  syncObstacles(race, step) {
    const groups = this.world?.userData.obstacleGroups;
    if (!groups?.size) return;
    for (const obstacle of race.obstacles || []) {
      const group = groups.get(obstacle.id);
      if (!group) continue;
      const data = group.userData;
      if (obstacle.down > 0) {
        data.grow = 0;
        group.visible = !!obstacle.squashed;
        if (obstacle.squashed) group.scale.set(1.35, 0.16, 1.35);
        continue;
      }
      group.visible = true;
      if (data.grow === undefined || data.grow >= 1) continue;
      data.grow = Math.min(1, data.grow + step / 0.4);
      group.scale.setScalar(easeOutBack(data.grow));
    }
  },

  /** Every prop standing and full size again: for the aerial preview, which has no race to read. */
  resetObstacles() {
    for (const group of this.world?.userData.obstacleGroups?.values() || []) {
      group.visible = true;
      group.scale.setScalar(1);
      group.userData.grow = undefined;
    }
  },

  /**
   * Animals crossing the road (track.critters, see critters.js). Like the obstacles they are drawn HERE from the
   * circuit's own list, and they move by the same function the race uses, so the turtle you see is the turtle
   * that climbs on your car.
   */
  buildCritters(track) {
    const models = this.world.userData.critters = new Map();
    if (!track.critters?.length) return;
    const tint = (hex) => material(hex, { roughness: 0.9 });
    for (const critter of track.critters) {
      const group = new THREE.Group();
      group.name = `critter-${critter.id}`;
      const legs = [];
      const leg = (geometry, mat, x, y, z, sway, axis = 'x') => { const part = mesh(geometry, mat, group, x, y, z); legs.push({ mesh: part, sway, axis }); };
      if (critter.kind === 'sheep') {
        // A woolly block on four dark legs: from the chase camera what reads is the white body and the black face.
        // The wool glows a little: under the Crete sunset a plain white turned the colour of the road and the sheep
        // read as a boulder. The body sits high so the four black legs show underneath it.
        const wool = material(0xf6f3ea, { roughness: 0.95, emissive: 0x6a665c, emissiveIntensity: 0.55 }), face = tint(0x1f1e22);
        const body = mesh(new THREE.SphereGeometry(0.85, 10, 8), wool, group, 0, 1.35, 0);
        body.scale.set(1, 0.85, 1.35);
        for (const [x, z] of [[-0.4, 0.55], [0.4, 0.2], [0, -0.6], [0.1, 0.85]]) mesh(new THREE.SphereGeometry(0.42, 8, 6), wool, group, x, 1.82, z).castShadow = false;
        mesh(new THREE.BoxGeometry(0.6, 0.62, 0.7), face, group, 0, 1.5, 1.4);
        for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.38, 0.14, 0.2), face, group, side * 0.42, 1.72, 1.3).castShadow = false;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(new THREE.BoxGeometry(0.2, 0.8, 0.2), face, sx * 0.42, 0.4, sz * 0.6, sx * sz);
      } else if (critter.kind === 'boar') {
        // Dark bristly body, a long snout with a pink nose and two white tusks: it trots, so its legs swing fast.
        const hide = tint(0x4a3a2e), dark = tint(0x2e241c);
        const body = mesh(new THREE.SphereGeometry(0.8, 10, 8), hide, group, 0, 1.05, 0);
        body.scale.set(0.85, 0.8, 1.4);
        mesh(new THREE.BoxGeometry(0.6, 0.2, 1.4), dark, group, 0, 1.66, -0.1).castShadow = false;
        mesh(new THREE.BoxGeometry(0.6, 0.55, 0.8), hide, group, 0, 1.1, 1.25);
        mesh(new THREE.BoxGeometry(0.4, 0.34, 0.14), tint(0xe09a9a), group, 0, 1, 1.7).castShadow = false;
        for (const side of [-1, 1]) {
          const tusk = mesh(new THREE.ConeGeometry(0.07, 0.38, 5), tint(0xf4f0e2), group, side * 0.25, 0.98, 1.6);
          tusk.rotation.x = -0.8;
          tusk.castShadow = false;
          mesh(new THREE.BoxGeometry(0.16, 0.28, 0.12), dark, group, side * 0.22, 1.5, 1.1).castShadow = false;
        }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(new THREE.BoxGeometry(0.22, 0.7, 0.22), dark, sx * 0.36, 0.35, sz * 0.6, sx * sz);
      } else if (critter.kind === 'donkey') {
        // The Regnano donkey: grey, pale muzzle, a dark stripe of mane and the two long ears that make it a donkey.
        const coat = tint(0x8d8a86), pale = tint(0xe8e2d6), dark = tint(0x3a3634);
        const body = mesh(new THREE.BoxGeometry(0.95, 0.85, 1.9), coat, group, 0, 1.35, 0);
        body.castShadow = true;
        mesh(new THREE.BoxGeometry(0.42, 0.9, 0.5), coat, group, 0, 1.85, 0.95).rotation.x = 0.45;   // neck
        mesh(new THREE.BoxGeometry(0.46, 0.46, 0.85), coat, group, 0, 2.15, 1.35);
        mesh(new THREE.BoxGeometry(0.4, 0.34, 0.3), pale, group, 0, 2.03, 1.8).castShadow = false;
        mesh(new THREE.BoxGeometry(0.12, 0.2, 1.1), dark, group, 0, 2.05, 0.75).castShadow = false;  // mane
        for (const side of [-1, 1]) {
          const ear = mesh(new THREE.BoxGeometry(0.12, 0.62, 0.16), coat, group, side * 0.16, 2.62, 1.18);
          ear.rotation.z = side * 0.25;
          ear.castShadow = false;
        }
        const tail = mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), dark, group, 0, 1.25, -1.0);
        tail.rotation.x = -0.35;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(new THREE.BoxGeometry(0.2, 0.95, 0.2), coat, sx * 0.32, 0.48, sz * 0.72, sx * sz);
      } else if (critter.kind === 'squirrel') {
        // A squirrel at toy scale — life size it would be a speck from the chase camera — red-brown, white belly,
        // and the big bushy tail curling up over its back, which is the whole silhouette.
        const fur = tint(0xb4552a), belly = tint(0xf2e6d2), dark = tint(0x2b1e18);
        const body = mesh(new THREE.SphereGeometry(0.42, 9, 7), fur, group, 0, 0.5, 0.05);
        body.scale.set(0.85, 0.9, 1.25);
        mesh(new THREE.SphereGeometry(0.26, 8, 6), belly, group, 0, 0.42, 0.32).castShadow = false;
        mesh(new THREE.SphereGeometry(0.27, 8, 6), fur, group, 0, 0.82, 0.48);
        for (const side of [-1, 1]) {
          mesh(new THREE.BoxGeometry(0.08, 0.18, 0.06), fur, group, side * 0.12, 1.08, 0.44).castShadow = false;
          mesh(new THREE.SphereGeometry(0.045, 5, 4), dark, group, side * 0.13, 0.88, 0.7).castShadow = false;
        }
        for (const [y, z, r] of [[0.65, -0.45, 0.3], [1.0, -0.6, 0.34], [1.35, -0.45, 0.3], [1.5, -0.15, 0.22]]) {
          mesh(new THREE.SphereGeometry(r, 8, 6), fur, group, 0, y, z);
        }
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(new THREE.BoxGeometry(0.12, 0.26, 0.14), fur, sx * 0.22, 0.13, sz * 0.24, sx * sz);
      } else if (critter.kind === 'rat') {
        // A Roman rat, toy-sized like the squirrel: grey-brown, round ears, pink nose and the long bare pink tail
        // trailing flat on the cobbles — the tail is what tells it apart from the squirrel at a glance.
        const fur = tint(0x6e6258), pink = tint(0xe8a0a4), dark = tint(0x1e1a18);
        const body = mesh(new THREE.SphereGeometry(0.45, 9, 7), fur, group, 0, 0.42, -0.05);
        body.scale.set(0.8, 0.7, 1.45);
        const head = mesh(new THREE.ConeGeometry(0.28, 0.6, 8), fur, group, 0, 0.42, 0.72);
        head.rotation.x = Math.PI / 2;
        mesh(new THREE.SphereGeometry(0.07, 6, 5), pink, group, 0, 0.42, 1.02).castShadow = false;
        for (const side of [-1, 1]) {
          mesh(new THREE.SphereGeometry(0.15, 7, 5), pink, group, side * 0.18, 0.7, 0.55).scale.set(1, 1, 0.35);
          mesh(new THREE.SphereGeometry(0.045, 5, 4), dark, group, side * 0.13, 0.52, 0.8).castShadow = false;
        }
        const tail = mesh(new THREE.CylinderGeometry(0.035, 0.07, 1.4, 6), pink, group, 0, 0.18, -1.1);
        tail.rotation.x = Math.PI / 2 - 0.15;
        tail.castShadow = false;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(new THREE.BoxGeometry(0.1, 0.22, 0.12), pink, sx * 0.24, 0.11, sz * 0.3, sx * sz);
      } else if (critter.kind === 'gull') {
        // A seagull of the Roman rooftops: white body, grey wings that flap while it waddles, yellow beak with the
        // red spot, yellow legs. The wings are the "legs" that swing, about the body's long axis.
        const white = material(0xf7f5ef, { roughness: 0.9, emissive: 0x55534c, emissiveIntensity: 0.4 });
        const grey = tint(0x8d949c), yellow = tint(0xf0c23a), dark = tint(0x1e1e22);
        const body = mesh(new THREE.SphereGeometry(0.45, 10, 8), white, group, 0, 0.85, 0);
        body.scale.set(0.85, 0.85, 1.5);
        mesh(new THREE.SphereGeometry(0.3, 9, 7), white, group, 0, 1.3, 0.55);
        const beak = mesh(new THREE.ConeGeometry(0.09, 0.42, 6), yellow, group, 0, 1.25, 0.95);
        beak.rotation.x = Math.PI / 2;
        mesh(new THREE.SphereGeometry(0.05, 5, 4), tint(0xd8322a), group, 0, 1.2, 1.02).castShadow = false;
        for (const side of [-1, 1]) {
          mesh(new THREE.SphereGeometry(0.045, 5, 4), dark, group, side * 0.17, 1.38, 0.72).castShadow = false;
          leg(new THREE.BoxGeometry(0.75, 0.08, 0.85), grey, side * 0.62, 1.0, -0.1, side, 'z');
          mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), yellow, group, side * 0.16, 0.3, 0.05).castShadow = false;
        }
        mesh(new THREE.BoxGeometry(0.4, 0.1, 0.5), dark, group, 0, 0.92, -0.75).castShadow = false; // black wing tips
      } else {
        // The Increa turtle, as the park scenery used to build it: a domed shell, a lighter plate, head and tail.
        const shell = mesh(new THREE.SphereGeometry(0.75, 10, 8), tint(0x3f6b2f), group, 0, 0.42, 0);
        shell.scale.set(1, 0.5, 1.25);
        const plate = mesh(new THREE.SphereGeometry(0.5, 8, 6), tint(0x55823c), group, 0, 0.5, 0);
        plate.scale.set(1, 0.4, 1.2);
        plate.castShadow = false;
        mesh(new THREE.SphereGeometry(0.24, 7, 6), tint(0x7a9a4a), group, 0, 0.36, 0.95);
        mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), tint(0x7a9a4a), group, 0, 0.3, -1.05);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(new THREE.BoxGeometry(0.22, 0.22, 0.42), tint(0x6b8a3a), sx * 0.52, 0.16, sz * 0.52, sx * sz);
      }
      // They walk, so they must never be merged into the static batch.
      group.traverse((child) => { child.userData.dynamic = true; });
      // Its size, for lying it on its side without sinking it into the road: `rise` is half its height (the body's
      // middle, roughly), `half` half its width.
      const box = new THREE.Box3().setFromObject(group);
      const size = { rise: Math.max(0.2, box.max.y / 2), half: Math.max(0.2, Math.abs(box.min.x), Math.abs(box.max.x)) };
      this.world.add(group);
      models.set(critter.id, { group, legs, critter, size, stride: { boar: 14, squirrel: 22, sheep: 9, donkey: 6, rat: 24, gull: 11 }[critter.kind] || 7 });
    }
  },

  /**
   * Walks every animal to where `time` puts it. During a race that is the race clock, and an animal sitting on a
   * car is drawn on that car's roof, stamping, until it jumps back down to its walk. One bowled over by a shot
   * barrel-rolls to the verge, lies on its side kicking its legs, then pops back up (see `poseKnockedCritter`).
   * The race's own copy of the animal is used when there is one: getting back up shifts its walk clock.
   */
  updateCritters(time, race) {
    const models = this.world?.userData.critters;
    if (!models?.size) return;
    const state = race?.critters ? new Map(race.critters.map((critter) => [critter.id, critter])) : null;
    for (const model of models.values()) {
      const { group, legs, critter } = model;
      const live = state?.get(critter.id) || critter;
      const attack = live.attack;
      const victim = attack ? this.racerModels.get(attack.racerId) : null;
      if (victim) {
        group.position.copy(victim.root.position);
        group.position.y += 1.6 + Math.abs(Math.sin(this.clock * 13)) * 0.55;
        group.rotation.set(0, victim.root.rotation.y + Math.sin(this.clock * 17) * 0.7, Math.sin(this.clock * 11) * 0.25);
        for (const part of legs) part.mesh.rotation[part.axis] = Math.sin(this.clock * 24) * 0.8 * part.sway;
        continue;
      }
      const pose = livePose(live, time);
      const frame = this.track.frame(critter.distance);
      worldPoint(this.track, critter.distance, pose.lane, ROAD_Y + 0.04, group.position);
      if (pose.knocked) { this.poseKnockedCritter(model, live.knock, time, frame); continue; }
      // The lane axis is (dz, -dx), so walking one way or the other is half a turn apart; during the pause the
      // animal swings round to face the way it is about to go.
      const heading = Math.atan2(frame.dz * pose.dir, -frame.dx * pose.dir);
      group.rotation.set(0, heading + (1 - Math.min(1, pose.turn / 0.35)) * Math.PI, 0);
      const step = pose.walking ? Math.sin(time * model.stride) * 0.35 : 0;
      for (const part of legs) part.mesh.rotation[part.axis] = step * part.sway;
    }
  },

  /**
   * A bowled-over animal, cartoon style and never hurt. It swings round to face down the road and barrel-rolls a
   * turn and a quarter towards the verge (the race slides it there in KNOCK_SLIDE seconds), lies on its side with
   * its legs kicking in the air, and in the last KNOCK_RISE seconds pops back up with a boing, turning to face the
   * verge — exactly how its walk takes over again, from the pause on that side, so there is no jump.
   */
  poseKnockedCritter(model, knock, time, frame) {
    const { group, legs, size } = model;
    const elapsed = Math.max(0, time - knock.at);
    const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
    const walking = Math.atan2(frame.dz * knock.dir, -frame.dx * knock.dir);
    const along = Math.atan2(frame.dx, frame.dz);
    const verge = Math.atan2(frame.dz * knock.side, -frame.dx * knock.side);
    const getUp = KNOCK_TIME - KNOCK_RISE;
    let roll, yaw, hop = 0, kick = 0;
    if (elapsed < KNOCK_SLIDE) {
      const k = elapsed / KNOCK_SLIDE;
      roll = (1 - (1 - k) * (1 - k)) * Math.PI * 2.5;
      yaw = turn(walking, along, Math.min(1, elapsed / 0.15));
      hop = Math.sin(k * Math.PI) * 0.45;
      kick = 1;
    } else if (elapsed < getUp) {
      roll = Math.PI / 2 + Math.sin(elapsed * 9) * 0.06;
      yaw = along;
      kick = 1;
    } else {
      const k = Math.min(1, (elapsed - getUp) / KNOCK_RISE);
      roll = (Math.PI / 2) * (1 - easeOutBack(k));
      // Back on its feet, it shakes the dust off with a little wiggle that has died away by the time it walks.
      yaw = turn(along, verge, Math.min(1, k * 1.6)) + Math.sin(time * 34) * 0.18 * Math.sin(Math.max(0, k - 0.5) * 2 * Math.PI);
    }
    // Rolled about its feet, it would sink into the road: lift it by how far its body now reaches below them.
    const c = Math.cos(roll), sn = Math.sin(roll);
    group.position.y += Math.sqrt((size.rise * c) ** 2 + (size.half * sn) ** 2) - size.rise * c + hop;
    // Rolling about its own forward axis: with +x towards positive lanes, a negative angle tips the top that way.
    group.rotation.set(0, yaw, -knock.side * roll);
    const swing = kick ? Math.sin(time * 19) * 0.75 : 0;
    for (const part of legs) part.mesh.rotation[part.axis] = swing * part.sway;
  },

  /** Iron shortcut bridges and loop-the-loops (track.sections): deck, rails and the ironwork that holds them up. */
  buildSections(track) {
    const iron = material(0x3f4a4d, { roughness: 0.55, metalness: 0.35 });
    const rust = material(0x8a4a33, { roughness: 0.8, metalness: 0.2 });
    const stone = material(0x9a9484);
    const deckMat = material(0x5d6066, { side: THREE.DoubleSide, roughness: 0.85 });
    const loopMat = material(track.theme.road, { side: THREE.DoubleSide });
    const rail = material(0xd94141, { roughness: 0.5 });
    const pale = material(0xf4f0e2, { side: THREE.DoubleSide });
    for (const section of track.sections || []) {
      const steps = Math.ceil(section.pathLength / 1.2);
      if (section.kind === 'bridge') {
        const half = section.width / 2;
        this.world.add(sectionStrip(section, half, ROAD_Y + 0.02, deckMat, steps));
        this.world.add(sectionStrip(section, half + 0.35, ROAD_Y - 0.12, iron, steps));
        // Iron trusses: a top chord, a lower chord and posts every few metres on both sides; piers stand in the water below.
        for (const side of [-1, 1]) {
          this.world.add(sectionTube(section, side * (half + 0.2), ROAD_Y + 2.3, 0.11, iron, steps));
          this.world.add(sectionTube(section, side * (half + 0.2), ROAD_Y + 0.9, 0.06, rust, steps));
          const posts = Math.round(section.pathLength / 3.6);
          for (let i = 0; i <= posts; i += 1) {
            const u = i / posts;
            const pose = section.pose(u, side * (half + 0.2));
            const foot = new THREE.Vector3(pose.x, pose.y + ROAD_Y, pose.z);
            strut(foot, foot.clone().setY(pose.y + ROAD_Y + 2.3), 0.16, iron, this.world);
            if (i < posts) {
              const next = section.pose((i + 1) / posts, side * (half + 0.2));
              strut(foot, new THREE.Vector3(next.x, next.y + ROAD_Y + 2.3, next.z), 0.08, rust, this.world);
            }
          }
        }
        const piers = Math.max(1, Math.round(section.pathLength / 18));
        for (let i = 1; i <= piers; i += 1) {
          const pose = section.pose(i / (piers + 1), 0);
          const pier = mesh(new THREE.CylinderGeometry(1.15, 1.45, pose.y + 2.2, 12), stone, this.world, pose.x, pose.y / 2 - 1.05, pose.z);
          pier.castShadow = false;
          mesh(new THREE.BoxGeometry(section.width + 1.2, 0.5, 2.8), stone, this.world, pose.x, pose.y - 0.1, pose.z).quaternion.copy(poseQuaternion(pose));
        }
        for (const u of [0, 1]) {
          const pose = section.pose(u, 0);
          const portal = new THREE.Group();
          portal.position.set(pose.x, pose.y + ROAD_Y, pose.z);
          portal.quaternion.copy(poseQuaternion(pose));
          for (const side of [-1, 1]) mesh(new THREE.BoxGeometry(0.5, 4.2, 0.5), rust, portal, side * (half + 0.45), 2.1, 0);
          mesh(new THREE.BoxGeometry(section.width + 1.4, 0.5, 0.5), rust, portal, 0, 4.2, 0);
          if (section.name && typeof document !== 'undefined') {
            const sign = mesh(new THREE.PlaneGeometry(section.width + 1.2, 1.1), new THREE.MeshBasicMaterial({ map: textTexture(section.name, '#8a4a33', '#fff4d8', 1024, 180), side: THREE.DoubleSide }), portal, 0, 3.3, 0);
            sign.rotation.y = Math.PI; // readable by the cars arriving from behind the portal
            sign.castShadow = false;
          }
          this.world.add(portal);
        }
      } else {
        const half = section.width / 2;
        this.world.add(sectionStrip(section, half, ROAD_Y, loopMat, steps));
        this.world.add(sectionStrip(section, half + 0.6, ROAD_Y - 0.14, iron, steps));
        for (const side of [-1, 1]) {
          this.world.add(sectionTube(section, side * (half + 0.15), ROAD_Y + 0.55, 0.14, rail, steps));
          for (let i = 0; i <= 40; i += 1) {
            const pose = section.pose(i / 40, side * (half + 0.15));
            const foot = new THREE.Vector3(pose.x + pose.up.x * ROAD_Y, pose.y + pose.up.y * ROAD_Y, pose.z + pose.up.z * ROAD_Y);
            strut(foot, foot.clone().addScaledVector(new THREE.Vector3(pose.up.x, pose.up.y, pose.up.z), 0.55), 0.1, pale, this.world);
          }
        }
        // The wheel: two rims outside the track, an axle through the centre and spokes to the outer face of the deck.
        const base = track.frame(section.from + section.lead);
        const centre = new THREE.Vector3(base.x, section.radius, base.z);
        const across = new THREE.Vector3(base.dz, 0, -base.dx);
        const rimOffset = section.shift / 2 + half + 3.2;
        for (const side of [-1, 1]) {
          const rimCentre = centre.clone().addScaledVector(across, side * rimOffset);
          const rim = mesh(new THREE.TorusGeometry(section.radius + 0.9, 0.42, 8, 48), iron, this.world);
          rim.position.copy(rimCentre);
          rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), across);
          rim.castShadow = false;
          for (const leg of [-1, 1]) {
            const top = rimCentre.clone().addScaledVector(new THREE.Vector3(base.dx, 0, base.dz), leg * section.radius * 0.72).setY(section.radius * 0.35);
            const foot = top.clone().addScaledVector(new THREE.Vector3(base.dx, 0, base.dz), leg * 4).setY(0);
            strut(top, foot, 0.5, iron, this.world);
            mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), stone, this.world, foot.x, 0.3, foot.z);
          }
        }
        const axle = mesh(new THREE.CylinderGeometry(0.42, 0.42, rimOffset * 2 + 0.8, 10), iron, this.world);
        axle.position.copy(centre);
        axle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), across);
        axle.castShadow = false;
        const circleStart = Math.hypot(section.lead, section.shift / 2) / section.pathLength;
        const circleSpan = (2 * Math.PI * section.radius) / section.pathLength;
        for (let i = 0; i < 12; i += 1) {
          const u = circleStart + circleSpan * (i / 12);
          for (const side of [-1, 1]) {
            const pose = section.pose(u, side * (half + 0.6));
            const outer = new THREE.Vector3(pose.x - pose.up.x * 0.3, pose.y - pose.up.y * 0.3, pose.z - pose.up.z * 0.3);
            const rimCentre = centre.clone().addScaledVector(across, side * rimOffset);
            const radial = outer.clone().sub(centre).addScaledVector(across, -outer.clone().sub(centre).dot(across)).normalize();
            const rimPoint = rimCentre.clone().addScaledVector(radial, section.radius + 0.9);
            // Deck-to-rim ties only high up: near the ground they would cross the lead-in and lead-out lanes.
            if (pose.y > 9.5) strut(outer, rimPoint, 0.16, rust, this.world);
            strut(centre.clone().addScaledVector(across, side * rimOffset), rimPoint, 0.14, iron, this.world);
          }
        }
        if (section.name && typeof document !== 'undefined') {
          const pose = section.pose(0, 0);
          const banner = new THREE.Group();
          banner.position.set(pose.x, ROAD_Y, pose.z);
          banner.quaternion.copy(poseQuaternion(pose));
          for (const side of [-1, 1]) mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.5, 8), iron, banner, side * (half + 1.2), 3.25, 0);
          const sign = mesh(new THREE.PlaneGeometry(section.width + 2, 1.4), new THREE.MeshBasicMaterial({ map: textTexture(section.name, '#d94141', '#ffffff', 1024, 180), side: THREE.DoubleSide }), banner, 0, 6.1, 0);
          sign.rotation.y = Math.PI; // readable by the cars arriving at the loop
          sign.castShadow = false;
          this.world.add(banner);
        }
      }
    }
  },

  /** Concrete wall under the raised edge of a banked bend, so the "parabolica" does not float. */
  buildBankings(track) {
    const concrete = material(0xb9b3a8, { side: THREE.DoubleSide });
    for (const bank of track.bankings || []) {
      const lane = bank.side * (track.roadWidth / 2 + 0.6);
      const positions = [];
      const indices = [];
      const steps = Math.ceil((bank.to - bank.from) / 2);
      for (let i = 0; i <= steps; i += 1) {
        const distance = bank.from + ((bank.to - bank.from) * i) / steps;
        const top = worldPoint(track, distance, lane, ROAD_Y + 0.05);
        positions.push(top.x, top.y, top.z, top.x, -0.3, top.z);
        if (i < steps) {
          const k = i * 2;
          indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const wall = new THREE.Mesh(geometry, concrete);
      wall.receiveShadow = true;
      this.world.add(wall);
      for (let distance = bank.from + 6; distance < bank.to - 4; distance += 10) {
        const top = worldPoint(track, distance, lane, 0);
        if (top.y < 1) continue;
        mesh(new THREE.BoxGeometry(0.7, top.y, 0.7), concrete, this.world, top.x - 0, top.y / 2, top.z);
      }
    }
  },

  buildScenery(track) {
    const { theme, length, roadWidth } = track;
    const random = seededRandom(4281);
    // Ground: one big plane, with round holes where the local scenery digs a pit (the quarry lake of Parco Increa).
    const holes = localGroundHoles(track);
    let groundGeometry;
    if (holes.length) {
      const shape = new THREE.Shape([new THREE.Vector2(-GROUND_REACH, -GROUND_REACH), new THREE.Vector2(GROUND_REACH, -GROUND_REACH), new THREE.Vector2(GROUND_REACH, GROUND_REACH), new THREE.Vector2(-GROUND_REACH, GROUND_REACH)]);
      for (const hole of holes) {
        const path = new THREE.Path();
        path.absarc(hole.x, -hole.z, hole.radius, 0, Math.PI * 2, true);
        shape.holes.push(path);
      }
      groundGeometry = new THREE.ShapeGeometry(shape, 4);
    } else groundGeometry = new THREE.PlaneGeometry(GROUND_REACH * 2, GROUND_REACH * 2);
    // `floorTiles: [a, b, metres]` lays the ground out in squares instead of one flat colour.
    let groundMaterial = material(theme.ground);
    if (theme.floorTiles) {
      const [tintA, tintB, tile = 9] = theme.floorTiles;
      const texture = checkerTexture(tintA, tintB);
      texture.repeat.set(GROUND_REACH / tile, GROUND_REACH / tile);
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      groundMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92 });
    }
    const ground = mesh(groundGeometry, groundMaterial, this.world, 0, -0.045, 0);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    if (track.hasElevation) this.world.add(heightfield(track, groundMaterial));
    const groundAt = (x, z) => (track.groundHeight ? track.groundHeight(x, z) : 0);
    const points = Array.from({ length: 180 }, (_, i) => track.frame((i / 180) * length));
    const bounds = points.reduce((result, point) => ({
      minX: Math.min(result.minX, point.x), maxX: Math.max(result.maxX, point.x),
      minZ: Math.min(result.minZ, point.z), maxZ: Math.max(result.maxZ, point.z),
    }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
    const nearRoad = (x, z, margin) => points.some((point) => (point.x - x) ** 2 + (point.z - z) ** 2 < margin ** 2);
    const treePositions = [];
    for (let attempt = 0; attempt < 1200 && treePositions.length < theme.trees.count; attempt += 1) {
      const x = bounds.minX - 30 + random() * (bounds.maxX - bounds.minX + 60);
      const z = bounds.minZ - 30 + random() * (bounds.maxZ - bounds.minZ + 60);
      if (!nearRoad(x, z, roadWidth / 2 + 4) && !isLocalSceneryReserved(track,x,z)) treePositions.push({ x, z, size: 0.7 + random() * 1.15, base: groundAt(x, z) });
    }
    const dummy = new THREE.Object3D();
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 7), material(theme.trees.trunk), treePositions.length);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.15, 1), material(theme.trees.crown), treePositions.length);
    const topCrowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 1), material(theme.trees.top), treePositions.length);
    treePositions.forEach(({ x, z, size, base }, index) => {
      dummy.position.set(x, base + 1.5 * size, z);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      dummy.position.y = base + 4.3 * size;
      dummy.scale.set(size, size * 1.07, size);
      dummy.rotation.y = random() * 6;
      dummy.updateMatrix();
      crowns.setMatrixAt(index, dummy.matrix);
      crowns.setColorAt(index, new THREE.Color().setHSL(theme.trees.hue + random() * 0.1, 0.34, 0.47 + random() * 0.08));
      dummy.position.y = base + 5.9 * size;
      dummy.scale.set(size * 0.9, size, size * 0.9);
      dummy.updateMatrix();
      topCrowns.setMatrixAt(index, dummy.matrix);
    });
    for (const object of [trunks, crowns, topCrowns]) {
      object.castShadow = true;
      object.receiveShadow = true;
      this.world.add(object);
    }
    // The wind bends the crowns, never the trunks: two instanced meshes are enough for a whole wood.
    this.trees = { crowns, topCrowns, spots: treePositions.map((t, i) => ({ ...t, phase: i * 1.7 })) };

    // Hills ring the circuit; the default circuit keeps its original 135–200 m ring.
    const reach = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX), Math.abs(bounds.minZ), Math.abs(bounds.maxZ));
    const hillRing = Math.max(135, reach + 58);
    for (let i = 0; i < (theme.hills.length ? 23 : 0); i += 1) {
      const angle = (i / 23) * Math.PI * 2;
      const distance = hillRing + random() * 65;
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;
      if (nearRoad(x, z, 22)) continue;
      const hill = mesh(new THREE.ConeGeometry(18 + random() * 17, 22 + random() * 27, 5),
        material(theme.hills[i % theme.hills.length]), this.world, x, 0, z);
      hill.position.y = hill.geometry.parameters.height / 2 - 2;
      hill.rotation.y = random() * 3;
      hill.castShadow = false;
    }

    // Props beside the road stand on the GROUND, not on the road. Where the road climbs onto a deck the two part
    // company: a flag placed at road height floats in mid-air next to the viaduct, and near the ends of the bump it
    // comes up through the deck itself — which is what the children saw on the pencil-case bridge. So anything
    // planted by the roadside sits on the terrain, and where the road is flying it is left out altogether.
    // Shortcut bridges and the loop are decks of their own, drawn from track.sections rather than from the height
    // profile: a flagpole planted on the road below still came up through the pencil-case plank. These are the
    // points those decks cover, and how high above the ground each one flies.
    const decks = [];
    for (const section of track.sections || []) {
      const steps = Math.max(8, Math.round(section.pathLength / 2));
      for (let i = 0; i <= steps; i += 1) {
        const pose = section.pose(i / steps, 0);
        decks.push({ x: pose.x, z: pose.z, y: pose.y, reach: section.width / 2 + 3 });
      }
    }
    const onTheGround = (point, distance) => {
      const groundY = track.groundHeight ? track.groundHeight(point.x, point.z) : 0;
      const roadY = track.elevation ? track.elevation(distance) : 0;
      if (roadY - groundY > 2.5) return null;
      // Under a deck that a four-metre flagpole would pierce: leave the prop out altogether.
      for (const deck of decks) {
        if (deck.y - groundY > 5 || deck.y < groundY - 1) continue;
        if ((deck.x - point.x) ** 2 + (deck.z - point.z) ** 2 < deck.reach * deck.reach) return null;
      }
      point.y = groundY;
      return point;
    };
    const brickGeo = new THREE.BoxGeometry(3.4, 1.35, 1.8);
    const studGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 12);
    for (let i = 0; i < 22; i += 1) {
      const distance = (i / 22) * length + 8;
      const lane = (roadWidth / 2 + 3.9 + random() * 3) * (i % 2 ? 1 : -1);
      const point = worldPoint(track, distance, lane, 0);
      if (isLocalSceneryReserved(track,point.x,point.z)) continue;
      if (!onTheGround(point, distance)) continue;
      const brick = new THREE.Group();
      brick.position.copy(point);
      brick.rotation.y = random() * Math.PI;
      const mat = material(theme.bricks[i % theme.bricks.length]);
      mesh(brickGeo, mat, brick, 0, 0.675, 0);
      for (const x of [-1.1, 0, 1.1]) {
        for (const z of [-0.45, 0.45]) mesh(studGeo, mat, brick, x, 1.47, z);
      }
      this.world.add(brick);
    }

    const flagMaterial = [material(theme.flags[0], { side: THREE.DoubleSide }), material(theme.flags[1], { side: THREE.DoubleSide })];
    const lampMaterial = theme.lamps ? material(0xfff1b0, { emissive: 0xffd45a, emissiveIntensity: 1.3 }) : null;
    for (let i = 0; i < 30; i += 1) {
      const distance = (i / 30) * length;
      const p = worldPoint(track, distance, roadWidth / 2 + 2.8, 0);
      if (!onTheGround(p, distance)) continue;
      const flag = new THREE.Group();
      flag.position.copy(p);
      const frame = track.frame(distance);
      flag.rotation.y = Math.atan2(frame.dx, frame.dz);
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 3.8, 5), material(0xf7f1de), flag, 0, 1.9, 0);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 3.7, 0, 1.9, 3.15, 0, 0, 2.65, 0], 3));
      geometry.computeVertexNormals();
      mesh(geometry, flagMaterial[i % 2], flag);
      if (lampMaterial) {
        const lamp = mesh(new THREE.SphereGeometry(0.26, 10, 7), lampMaterial, flag, 0, 4, 0);
        lamp.castShadow = false;
      }
      this.world.add(flag);
    }
    this.clouds = null;
    if (theme.clouds) {
      this.clouds = new THREE.Group();
      const cloudMat = material(theme.cloudColor ?? 0xffffff, { roughness: 1 });
      for (let i = 0; i < 15; i += 1) {
        const cloud = new THREE.Group();
        cloud.position.set((random() - 0.5) * 360, 47 + random() * 26, (random() - 0.5) * 300);
        for (let p = 0; p < 4; p += 1) {
          const puff = mesh(new THREE.SphereGeometry(5, 10, 6), cloudMat, cloud, p * 5 - 7.5, p % 2 ? 2 : 0, 0);
          puff.scale.set(1.3, 0.58 + random() * 0.25, 0.85);
          puff.castShadow = false;
        }
        cloud.userData.drift = { x: cloud.position.x, y: cloud.position.y, phase: i * 0.9 };
        this.clouds.add(cloud);
      }
      this.world.add(this.clouds);
    }
    // Night skies (theme.stars): a dome of coloured points, optionally with a Milky Way band, plus a glowing moon.
    this.stars = null;
    this.starLayers = null;
    if (theme.stars) {
      const { count = 1800, milkyWay = false } = theme.stars;
      const layers = [{ positions: [], colors: [] }, { positions: [], colors: [] }];
      const color = new THREE.Color();
      const tilt = new THREE.Vector3(1, 0, 0);
      const turn = new THREE.Vector3(0, 1, 0);
      const point = new THREE.Vector3();
      for (let i = 0; i < count; i += 1) {
        const inBand = milkyWay && random() < 0.58;
        if (inBand) {
          const along = random() * Math.PI * 2;
          const spread = (random() + random() + random() - 1.5) * 0.22;
          point.set(Math.cos(along), spread, Math.sin(along)).normalize().applyAxisAngle(tilt, 0.95).applyAxisAngle(turn, 0.7);
        } else {
          const theta = random() * Math.PI * 2;
          const phi = Math.acos(1 - random());
          point.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        }
        if (point.y < 0.035) continue;
        const radius = 560 + random() * 50;
        const warm = random();
        color.setHSL(warm < 0.14 ? 0.07 : warm < 0.28 ? 0.13 : 0.6, warm < 0.28 ? 0.6 : 0.2 + random() * 0.3, inBand ? 0.7 + random() * 0.3 : 0.8 + random() * 0.2);
        const layer = layers[random() < 0.08 ? 1 : 0];
        layer.positions.push(point.x * radius, point.y * radius, point.z * radius);
        layer.colors.push(color.r, color.g, color.b);
      }
      this.stars = new THREE.Group();
      this.stars.name = 'starfield';
      this.stars.userData.dynamic = true;
      this.starLayers = layers.map((layer, index) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(layer.positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(layer.colors, 3));
        const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: index ? 4.6 : 2.1, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: index ? 1 : 0.92, fog: false, depthWrite: false }));
        points.frustumCulled = false;
        points.userData.dynamic = true;
        this.stars.add(points);
        return points;
      });
      const moonMat = material(0xfff7dc, { emissive: 0xfff0c4, emissiveIntensity: 0.85, fog: false });
      const moon = mesh(new THREE.SphereGeometry(13, 22, 16), moonMat, this.stars, -250, 290, -440);
      const halo = mesh(new THREE.SphereGeometry(21, 22, 16), material(0xfff7dc, { transparent: true, opacity: 0.1, fog: false, depthWrite: false }), this.stars, -250, 290, -440);
      for (const object of [moon, halo]) { object.castShadow = false; object.receiveShadow = false; object.userData.dynamic = true; }
      this.world.add(this.stars);
    }
  }

  /* ---------- Hit effects: brick debris, flashes, smoke and camera shake ---------- */,
};
