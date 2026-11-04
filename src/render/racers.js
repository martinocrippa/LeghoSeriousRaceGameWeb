/**
 * GameRenderer methods. The cars in a race and what they throw: car models and their effects, projectiles, tyre marks.
 * Plain methods on `this`, attached to GameRenderer.prototype in renderer.js; moved here unchanged.
 */
import * as THREE from 'three';
import { createCarModel } from '../cars.js';
import { slideOffset, skidColour } from '../lean.js';
import { ROAD_Y, PLAYER_COLORS, JELLY_COLOR, CANDY_COLORS, material, mesh, _skidPosition, _skidQuaternion, _skidYaw, _skidScale, _skidMatrix, _skidColor, _skidAxis, pathPoint, alignToRoad, strut, setShadows, disposeObject } from './common.js';

export const racersMethods = {
  addRacer(racer, index) {
    const root = new THREE.Group();
    const car = createCarModel(racer.spec);
    setShadows(car);
    root.add(car);
    const shield = mesh(new THREE.SphereGeometry(2.6, 16, 10),
      new THREE.MeshPhysicalMaterial({ color: 0x79e0ff, transparent: true, opacity: 0.22, roughness: 0.1,
        metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }), root, 0, 1.1, 0);
    shield.scale.y = 0.8;
    shield.castShadow = false;
    shield.visible = false;
    // Jelly blob that glues a stuck car: shrinks as it melts (see racer.stuck in the simulation).
    const jelly = mesh(new THREE.SphereGeometry(2.2, 14, 10),
      new THREE.MeshStandardMaterial({ color: JELLY_COLOR, emissive: 0x2fd36f, emissiveIntensity: 0.3, transparent: true, opacity: 0.55,
        roughness: 0.25, depthWrite: false, side: THREE.DoubleSide }), root, 0, 0.9, 0);
    jelly.castShadow = false;
    jelly.visible = false;
    // Ice cream on the windscreen: a splat over the nose of the car while `racer.creamed` runs down.
    const cream = new THREE.Group();
    for (const [i, color] of [0xfff1e0, 0xf7a8c0, 0x8fd9a8].entries()) {
      const blob = mesh(new THREE.SphereGeometry(0.5 - i * 0.07, 10, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: true, opacity: 0.92 }),
        cream, (i - 1) * 0.42, 0.95 + (i % 2) * 0.22, 0.9);
      blob.scale.set(1.1, 0.8, 0.6);
      blob.castShadow = false;
    }
    cream.visible = false;
    root.add(cream);
    // The storm cloud: a dark little cloud just over the roof, rain under it and now and then a lightning bolt. Kept
    // small and low: a car right behind the player sits between the chase camera and the road.
    const storm = new THREE.Group();
    const cloudMat = material(0x4a5160, { roughness: 1 });
    for (const [x, y, z, r] of [[0, 3, 0, 0.62], [-0.6, 2.85, 0.05, 0.45], [0.6, 2.85, -0.05, 0.47], [0.22, 3.2, 0.22, 0.44], [-0.25, 3.15, -0.22, 0.4]]) {
      mesh(new THREE.SphereGeometry(r, 9, 7), cloudMat, storm, x, y, z).castShadow = false;
    }
    const rainMat = material(0x9fd3ff, { transparent: true, opacity: 0.7, roughness: 0.3 });
    const drops = [];
    for (let i = 0; i < 10; i += 1) {
      const drop = mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), rainMat, storm, ((i * 7) % 10) / 10 * 1.6 - 0.8, 2.5, ((i * 3) % 10) / 10 * 1.2 - 0.6);
      drop.castShadow = false;
      drop.userData.phase = i / 10;
      drops.push(drop);
    }
    const bolt = new THREE.Group();
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xffe94a, emissive: 0xffe94a, emissiveIntensity: 1.2 });
    for (const [x, y, tilt] of [[0.08, 2.4, 0.5], [-0.08, 1.95, -0.5]]) mesh(new THREE.BoxGeometry(0.14, 0.55, 0.1), boltMat, bolt, x, y, 0).rotation.z = tilt;
    bolt.children.forEach((part) => { part.castShadow = false; });
    storm.add(bolt);
    storm.userData = { drops, bolt };
    storm.visible = false;
    root.add(storm);
    // The propeller: a mast and two blades that pop up over the roof while the bonus runs, so a child can see
    // at a glance who is about to fly off the next ramp.
    const propeller = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), material(0xf4f0e2), propeller, 0, 0.55, 0);
    const blades = new THREE.Group();
    blades.position.y = 1.15;
    for (const side of [-1, 1]) {
      const blade = mesh(new THREE.BoxGeometry(2.2, 0.07, 0.42), material(side > 0 ? 0xe5203a : 0xffd74a), blades, side * 1.1, 0, 0);
      blade.rotation.z = side * 0.18;
      blade.castShadow = false;
    }
    mesh(new THREE.SphereGeometry(0.2, 9, 7), material(0x3b4148), blades, 0, 0, 0).castShadow = false;
    propeller.add(blades);
    propeller.position.y = 1.4;
    propeller.visible = false;
    // The parachute: a canopy of red, white and yellow gores on four lines, over the roof when it flies and
    // trailing behind the tail, like a dragster's, when it brakes. The pack shows for the instant before it opens.
    const parachute = new THREE.Group();
    const pack = mesh(new THREE.BoxGeometry(0.7, 0.4, 0.55), material(0xe5203a), parachute, 0, 1.55, -0.2);
    pack.castShadow = false;
    const canopy = new THREE.Group();
    const gores = [0xe5203a, 0xf4f0e2, 0xffd74a];
    for (let i = 0; i < 9; i += 1) {
      const gore = mesh(new THREE.SphereGeometry(1.9, 3, 6, (i / 9) * Math.PI * 2, (Math.PI * 2) / 9, 0, Math.PI / 2), material(gores[i % 3], { side: THREE.DoubleSide }), canopy, 0, 0, 0);
      gore.castShadow = false;
    }
    canopy.scale.y = 0.55;
    canopy.position.y = 3.5;
    const line = material(0x3b4148);
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      // From the canopy's rim down to the roof, as a thin rod: each one is pointed at the roof once, here.
      const cord = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 4), line, canopy, 0, 0, 0);
      const top = new THREE.Vector3(x, 0, z), foot = new THREE.Vector3(0, (1.5 - 3.5) / 0.55, 0);
      cord.position.copy(top).add(foot).multiplyScalar(0.5);
      cord.scale.y = top.distanceTo(foot);
      cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
      cord.castShadow = false;
    }
    canopy.visible = false;
    parachute.add(canopy);
    parachute.userData.canopy = canopy;
    parachute.userData.pack = pack;
    parachute.visible = false;
    root.add(parachute);
    // The hang-glider: an orange delta wing on an A-frame over the roof. Folded small on the ground, spread in the air.
    const glider = new THREE.Group();
    const wingShape = new THREE.BufferGeometry();
    wingShape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 2.2, -2.9, 0, -1.3, 2.9, 0, -1.3, 0, 0.35, -0.6], 3));
    wingShape.setIndex([0, 1, 3, 0, 3, 2, 1, 2, 3]);
    wingShape.computeVertexNormals();
    const wing = mesh(wingShape, material(0xff7a1a, { side: THREE.DoubleSide }), glider, 0, 1.4, 0);
    wing.castShadow = false;
    const keel = mesh(new THREE.BoxGeometry(0.08, 0.08, 3.4), material(0x3b4148), glider, 0, 1.42, 0.3);
    keel.castShadow = false;
    for (const side of [-1, 1]) {
      const strut = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 4), material(0xc9cdd1), glider, side * 0.35, 0.8, 0.1);
      strut.rotation.z = side * 0.28;
      strut.castShadow = false;
    }
    glider.position.y = 0.9;
    glider.visible = false;
    root.add(glider);
    propeller.userData.blades = blades;
    root.add(propeller);
    const trail = new THREE.Group();
    root.add(trail);
    // Flame and dust puffs share one geometry and material across the whole field (flagged so racer disposal keeps them).
    if (!this.flameGeometry) {
      this.flameGeometry = new THREE.IcosahedronGeometry(0.22, 0);
      this.flameGeometry.userData.shared = true;
      this.dustGeometry = new THREE.IcosahedronGeometry(0.32, 1);
      this.dustGeometry.userData.shared = true;
      this.flameMaterial = material(0xffc13c, { emissive: 0xff8a0a, emissiveIntensity: 1.2, transparent: true, opacity: 0.88 });
      this.flameMaterial.userData.shared = true;
    }
    const flameMat = this.flameMaterial;
    for (let i = 0; i < 6; i += 1) {
      const puff = mesh(this.flameGeometry, flameMat, trail, 0, 0.45, -2.2);
      puff.castShadow = false;
      puff.userData.phase = i / 6;
    }
    // Dust cloud for gravel circuits (theme.dust): puffs recycle behind the rear wheels while the car rolls.
    const dust = new THREE.Group();
    root.add(dust);
    dust.visible = false;
    const dustCount = this.quality.dust;
    if (this.track?.theme?.dust && dustCount > 0) {
      if (this.dustMaterial?.userData.color !== this.track.theme.dust) {
        this.dustMaterial = material(this.track.theme.dust, { transparent: true, opacity: 0.55, roughness: 1 });
        this.dustMaterial.userData.shared = true;
        this.dustMaterial.userData.color = this.track.theme.dust;
      }
      const dustMat = this.dustMaterial;
      for (let i = 0; i < dustCount; i += 1) {
        const puff = mesh(this.dustGeometry, dustMat, dust, 0, 0.3, -1.5);
        puff.castShadow = false;
        puff.receiveShadow = false;
        puff.userData.phase = i / dustCount;
        puff.userData.side = i % 2 ? 1 : -1;
      }
    }
    let marker;
    if (index < this.players) {
      const markerMat = material(PLAYER_COLORS[index], { emissive: PLAYER_COLORS[index], emissiveIntensity: 0.2 });
      marker = mesh(new THREE.ConeGeometry(0.35, 0.5, 4), markerMat, root, 0, 3.4, 0);
      marker.rotation.z = Math.PI;
      marker.castShadow = false;
    }
    this.scene.add(root);
    const model = { root, car, shield, jelly, cream, storm, propeller, parachute, glider, trail, dust, marker, spec: racer.spec, previousLane: racer.lane, baseScale: car.scale.clone() };
    this.racerModels.set(racer.id, model);
    return model;
  },

  /**
   * The rainbow overlay of one car, made the first time that car picks the bonus: the same geometry (shared, not
   * copied) under one glowing material whose hue the render loop turns every frame. Plain blending, not additive:
   * added on top of a light car every colour came out white. It is a child of the car, so it follows the car's
   * pitch; its own transform is reset because the clone carries the car's.
   */
  rainbowShell(car) {
    if (!this.rainbowMaterial) {
      this.rainbowMaterial = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.68, depthWrite: false });
      this.rainbowMaterial.userData.shared = true;
    }
    const shell = car.clone(true);
    shell.position.set(0, 0, 0);
    shell.rotation.set(0, 0, 0);
    shell.scale.setScalar(1.06);
    // The geometry stays the car's own: disposeObject collects it in a Set, so it is freed once with the car.
    shell.traverse((child) => {
      if (child.material) child.material = this.rainbowMaterial;
      child.castShadow = false;
      child.receiveShadow = false;
    });
    car.add(shell);
    return shell;
  },

  updateProjectiles(race) {
    const active = (this.activeProjectiles ||= new Set());
    active.clear();
    for (const list of [race.projectiles, race.hazards]) for (const item of list || []) {
      active.add(item.id);
      let object = this.projectileModels.get(item.id);
      if (!object) {
        object = new THREE.Group();
        if (item.type === 'bomb') {
          mesh(new THREE.SphereGeometry(0.56, 12, 8), material(0x45415d), object, 0, 0.48, 0);
          mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.38, 5), material(0xffe197), object, 0, 1.1, 0);
          mesh(new THREE.IcosahedronGeometry(0.16, 0), material(0xff9e3a, { emissive: 0xff6900, emissiveIntensity: 1 }), object, 0, 1.3, 0);
        } else if (item.type === 'jelly') {
          // A lime-green translucent blob waiting on the road; it wobbles until somebody drives into it.
          const blob = mesh(new THREE.SphereGeometry(0.9, 12, 8),
            new THREE.MeshStandardMaterial({ color: JELLY_COLOR, emissive: 0x2fd36f, emissiveIntensity: 0.35, transparent: true, opacity: 0.75, roughness: 0.3 }), object, 0, 0.42, 0);
          blob.scale.y = 0.45;
          blob.castShadow = false;
          object.userData.jelly = blob;
        } else if (item.type === 'oil') {
          // A flat black slick with a shine on it, lying across the tarmac until it dries.
          const slick = mesh(new THREE.CircleGeometry(1.5, 18),
            new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.85 }), object, 0, 0.03, 0);
          slick.rotation.x = -Math.PI / 2;
          slick.scale.set(1, 1.35, 1);
          slick.castShadow = false;
          const sheen = mesh(new THREE.CircleGeometry(0.85, 14),
            new THREE.MeshBasicMaterial({ color: 0x4a6f8a, transparent: true, opacity: 0.35, depthWrite: false }), object, 0.3, 0.05, -0.2);
          sheen.rotation.x = -Math.PI / 2;
          sheen.castShadow = false;
          object.userData.oil = slick;
        } else if (item.type === 'fountain') {
          // A firework fountain planted on the tarmac: a cone that spits a jet of sparks straight up.
          mesh(new THREE.ConeGeometry(0.55, 0.9, 10), material(0xe5203a), object, 0, 0.45, 0);
          mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 6), material(0xf4f0e2), object, 0, 1.02, 0);
          const sparks = new THREE.Group();
          for (let i = 0; i < 14; i += 1) {
            const spark = mesh(new THREE.IcosahedronGeometry(0.15, 0),
              material(i % 2 ? 0xffd74a : 0xff8a1e, { emissive: i % 2 ? 0xffb200 : 0xff5a00, emissiveIntensity: 1.1 }), sparks);
            spark.castShadow = false;
            spark.userData.phase = i / 14;
          }
          object.add(sparks);
          object.userData.sparks = sparks;
        } else if (item.type === 'spin') {
          // A catherine wheel: a disc of coloured spokes rolling across the road.
          const wheel = new THREE.Group();
          mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 10), material(0xf4f0e2), wheel, 0, 0, 0).rotation.z = Math.PI / 2;
          for (let i = 0; i < 6; i += 1) {
            const spoke = mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12),
              material(i % 2 ? 0xe5203a : 0xffd74a, { emissive: i % 2 ? 0xa01020 : 0xffa300, emissiveIntensity: 0.9 }), wheel, 0, 0, 0);
            spoke.rotation.x = (i / 6) * Math.PI;
            spoke.castShadow = false;
          }
          wheel.position.y = 0.5;
          object.add(wheel);
          object.userData.wheel = wheel;
        } else if (item.type === 'gelato') {
          // A cone of ice cream flying nose first: the wafer at the back, three scoops and a cherry. Half again as
          // big as it looks sensible on paper — at 50 m/s anything smaller is a speck.
          object.scale.setScalar(1.6);
          const cone = mesh(new THREE.ConeGeometry(0.3, 0.9, 9), material(0xe0b56a), object, 0, 0.3, -0.35);
          cone.rotation.x = -Math.PI / 2;
          for (const [i, color] of [0xfff1e0, 0xf7a8c0, 0x8fd9a8].entries()) {
            mesh(new THREE.SphereGeometry(0.27 - i * 0.03, 9, 7), material(color), object, (i - 1) * 0.16, 0.42 + i * 0.05, 0.2);
          }
          mesh(new THREE.SphereGeometry(0.1, 6, 5), material(0xe5203a), object, 0, 0.72, 0.2).castShadow = false;
        } else if (item.type === 'bale') {
          // A round bale bowling off down the road: it rolls as it goes, on its side, the way it fell.
          const roll = new THREE.Group();
          const straw = material(0xe0c070, { roughness: 0.95 });
          const drum = mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 14), straw, roll);
          drum.rotation.z = Math.PI / 2;
          for (const side of [-1, 1]) {
            const cap = mesh(new THREE.CylinderGeometry(0.93, 0.93, 0.1, 14), material(0xc9a44e, { roughness: 0.95 }), roll, side * 0.82, 0, 0);
            cap.rotation.z = Math.PI / 2;
          }
          roll.position.y = 0.95;
          object.add(roll);
          object.userData.roll = roll;
        } else if (item.type === 'bullet') {
          // The machine gun fires sweets: a wrapped candy, a different colour each shot, twisting as it flies.
          // The materials are shared across all the candies in the air — five a second would otherwise mean five
          // new materials a second.
          if (!this.candyMaterials) {
            this.candyMaterials = CANDY_COLORS.map((hex) => {
              const mat = material(hex, { emissive: hex, emissiveIntensity: 0.35, roughness: 0.25 });
              mat.userData.shared = true;
              return mat;
            });
          }
          const candy = new THREE.Group();
          const mat = this.candyMaterials[(this.candyCount = (this.candyCount || 0) + 1) % CANDY_COLORS.length];
          const sweet = mesh(new THREE.SphereGeometry(0.26, 10, 8), mat, candy);
          sweet.scale.set(1.35, 1, 1);
          for (const side of [-1, 1]) {
            const twist = mesh(new THREE.ConeGeometry(0.2, 0.3, 6), mat, candy, side * 0.46, 0, 0);
            twist.rotation.z = side * Math.PI / 2;
          }
          candy.traverse((child) => { child.castShadow = false; });
          candy.position.y = 0.1;
          object.add(candy);
          object.userData.candy = candy;
        } else {
          const rocket = mesh(new THREE.ConeGeometry(0.32, 1.3, 8), material(0xff885d), object, 0, 0.3, 0);
          rocket.rotation.x = Math.PI / 2;
          const flame = mesh(new THREE.ConeGeometry(0.2, 0.8, 6), material(0xffd74a, { emissive: 0xffa300, emissiveIntensity: 0.8 }), object, 0, 0.3, -0.8);
          flame.rotation.x = -Math.PI / 2;
        }
        this.projectileModels.set(item.id, object);
        this.trackObjects.add(object);
      }
      pathPoint(this.track, item.distance, item.lane, ROAD_Y + (item.y || 0), object.position);
      // On the road, not above it: on a rally circuit the tarmac tilts under a slick and a flat disc got buried at
      // one end and left floating at the other — the children saw the oil pools "cut in half".
      alignToRoad(object, this.track, item.distance, item.lane);
      if (object.userData.jelly) {
        const wobble = 1 + Math.sin(this.clock * 6 + item.distance) * 0.08;
        object.userData.jelly.scale.set(wobble, 0.45 * (2 - wobble), wobble);
      }
      if (object.userData.sparks) {
        // Each spark rides its own little arc and starts again from the nozzle, so the jet never stops.
        for (const spark of object.userData.sparks.children) {
          const phase = (this.clock * 1.6 + spark.userData.phase) % 1;
          const spread = phase * 2.4;
          spark.position.set(Math.sin(spark.userData.phase * 41) * spread, 1.1 + phase * 3.4 - phase * phase * 3.2, Math.cos(spark.userData.phase * 37) * spread);
          spark.scale.setScalar(1 - phase * 0.6);
        }
      }
      if (object.userData.wheel) object.userData.wheel.rotation.x = this.clock * 14;
      if (object.userData.roll) object.userData.roll.rotation.x = -this.clock * 7;
      if (object.userData.candy) object.userData.candy.rotation.x = this.clock * 18;
    }
    for (const [id, object] of this.projectileModels) {
      if (!active.has(id)) {
        this.trackObjects.remove(object);
        disposeObject(object);
        this.projectileModels.delete(id);
      }
    }
  },

  /**
   * Lays one strip under each rear tyre, as long as the ground covered this frame so the strips join into a line.
   * The strips follow the car's heading and its tail swing, and take the colour of the surface under them.
   */
  dropSkids(model, racer, stance, step) {
    const skids = this.skids;
    const swing = model.slide.angle;
    const offset = slideOffset(swing, stance?.frontZ ?? 0);
    // Exactly the ground covered: overlapping strips double the alpha and the line comes out dashed.
    const length = Math.max(0.2, (racer.speed || 0) * step);
    _skidYaw.setFromAxisAngle(_skidAxis, swing);
    _skidQuaternion.copy(model.root.quaternion).multiply(_skidYaw);
    _skidColor.set(skidColour(this.track.surfaceAt ? this.track.surfaceAt(racer.progress) : 'asphalt'));
    const cos = Math.cos(swing), sin = Math.sin(swing);
    for (const tyre of model.rearTyres) {
      // 12 mm over the tarmac (the car rides 15 mm up): any closer and depth precision lets the road cover it.
      _skidPosition.set(tyre.x * cos + tyre.z * sin + offset.x, -0.003, -tyre.x * sin + tyre.z * cos + offset.z)
        .applyQuaternion(model.root.quaternion).add(model.root.position);
      _skidScale.set(tyre.width * 0.85, 1, length);
      _skidMatrix.compose(_skidPosition, _skidQuaternion, _skidScale);
      skids.mesh.setMatrixAt(skids.next, _skidMatrix);
      skids.mesh.setColorAt(skids.next, _skidColor);
      skids.next = (skids.next + 1) % skids.count;
    }
    skids.dirty = true;
  },
};
