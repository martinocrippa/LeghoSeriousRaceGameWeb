import { createLocalScenery } from './local-scenery.js';
import * as THREE from 'three';
import { DEFAULT_TRACK } from './track.js';
import { racerPose } from './sections.js';
import { SPIN_TIME, STORM_TIME, STUCK_TIME } from './race.js';
import { QUALITY_LEVELS } from './quality.js';
import { MAX_PLAYERS } from './pilots.js';
import { seeded } from './random.js';
import { leansIntoTurns } from './wheels.js';
import { bendCurvature, leanLimit, leanTarget, stepLean, rest, wheelSteer, slideTarget, slideOffset, leavesMarks } from './lean.js';
import { ROAD_Y, RACE_NEAR, RACE_FAR, WORLD_UP, _position, _target, _look, _rest, _behind, bankRise, material, easeOutBack, mesh, createSkids, worldPoint, alignToRoad, poseQuaternion, disposeObject, batchStaticMeshes, textTexture, addLights, ribbon, overheadDecks, duckUnderDecks } from './render/common.js';
import { worldMethods } from './render/world.js';
import { effectsMethods } from './render/effects.js';
import { atmosphereMethods } from './render/atmosphere.js';
import { menusMethods } from './render/menus.js';
import { racersMethods } from './render/racers.js';

export { FLYOVER_SECONDS } from './render/common.js';

/**
 * The game's 3D view. This file keeps the core: WebGL set-up, quality, choosing the track, the race camera and the
 * mirror. The other method groups live in src/render/ (world, effects, atmosphere, menus, racers) and are attached
 * to the prototype at the bottom, so `this` and every method name are what they were.
 */
export class GameRenderer {
  constructor(container, track = DEFAULT_TRACK, { quality = 'medium' } = {}) {
    this.container = container;
    this.quality = QUALITY_LEVELS[quality] || QUALITY_LEVELS.medium;
    this.frame = 0;
    // No multisampling when the game starts on "low" (touch devices, slow PCs): it is fixed when the context is made,
    // so a later step down to "low" keeps whatever the start chose.
    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality.id !== 'low', alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.13;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Shadow maps are rebuilt on demand: every race frame, rarely in the menus (see renderPreview/renderTrackPreview).
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-label', 'Circuito di corsa tridimensionale');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;touch-action:none';
    container.appendChild(this.canvas);
    this.players = 1;
    this.clock = 0;
    this.racerModels = new Map();
    this.boxModels = new Map();
    this.projectileModels = new Map();
    this.cameras = Array.from({ length: MAX_PLAYERS }, () => new THREE.PerspectiveCamera(56, 1, RACE_NEAR, RACE_FAR));
    this.cameraInitialized = this.cameras.map(() => false);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc8e8ef);
    this.scene.fog = new THREE.Fog(0xc8e8ef, 105, 270);
    this.lights = addLights(this.scene);
    this.sun = this.lights.sun;
    this.sun.shadow.mapSize.set(this.quality.shadowMap, this.quality.shadowMap);
    // Per-race objects (ramps, pads, boxes, projectiles) live outside the circuit world so both can be rebuilt independently.
    this.trackObjects = new THREE.Group();
    this.scene.add(this.trackObjects);
    this.world = null;
    this.track = null;
    this.setTrack(track);
    this.buildShowroom();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  resize() {
    const bounds = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.round(bounds.width));
    this.height = Math.max(1, Math.round(bounds.height));
    this.renderer.setSize(this.width, this.height, false);
    this.previewCamera.aspect = this.width / this.height;
    this.previewCamera.updateProjectionMatrix();
    this.cameras.forEach((camera, player) => {
      const view = this.viewportFor(Math.min(player, this.players - 1));
      camera.aspect = view.w / view.h;
      camera.updateProjectionMatrix();
    });
  }

  /**
   * Each pilot's part of the screen, in WebGL pixels (origin bottom left). One pilot: all of it; two: side by side;
   * three or four: a 2×2 grid, pilot 1 top left, 2 top right, 3 bottom left, 4 bottom right (with three, the fourth
   * corner stays empty and main.js puts the minimap there).
   */
  viewportFor(player) {
    const W = this.width, H = this.height;
    if (this.players <= 2) {
      const left = Math.floor((player * W) / this.players), right = Math.floor(((player + 1) * W) / this.players);
      return { x: left, y: 0, w: right - left, h: H };
    }
    const half = Math.floor(W / 2), mid = Math.floor(H / 2), col = player % 2, top = player < 2;
    return { x: col ? half : 0, y: top ? mid : 0, w: col ? W - half : half, h: top ? H - mid : mid };
  }

  setMode(players = 1) {
    this.players = Math.max(1, Math.min(MAX_PLAYERS, Number(players) || 1));
    this.cameraInitialized = this.cameras.map(() => false);
    this.resize();
  }

  /** Switches the graphics profile at runtime: resolution, shadow maps, mirror cadence. Dust puffs apply to the next race. */
  setQuality(level) {
    const next = QUALITY_LEVELS[level];
    if (!next || next === this.quality) return false;
    this.quality = next;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, next.pixelRatio));
    this.renderer.setSize(this.width || 1, this.height || 1, false);
    for (const [light, size] of [[this.sun, next.shadowMap], [this.previewLight, Math.min(1024, next.shadowMap)]]) {
      if (!light) continue;
      light.shadow.mapSize.set(size, size);
      if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
    }
    if (this.mirror) {
      this.mirror.target.dispose();
      disposeObject(this.mirror.scene);
      this.mirror = null;
    }
    // The wind rigs carry a fixed number of streaks, so a new profile needs new ones.
    if (this.windLayer) {
      this.scene.remove(this.windLayer);
      disposeObject(this.windLayer);
      this.windLayer = null;
      this.windRigs = null;
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.previewShadowDirty = true;
    return true;
  }

  /** Rebuilds road and scenery for another circuit, releasing the previous world's GPU resources. */
  setTrack(track = DEFAULT_TRACK) {
    if (this.track === track) return;
    this.worldCache ||= new Map();
    if (this.world) this.scene.remove(this.world);
    this.track = track;
    this.activeRace = null;
    this.applyTheme(track);
    this.overheadDecks = overheadDecks(track);
    // Built worlds are kept (the three most recent, by circuit id) so flicking through the track picker never rebuilds one.
    let entry = this.worldCache.get(track.id);
    if (entry) {
      this.worldCache.delete(track.id);
      ({ world: this.world, localScenery: this.localScenery, startLights: this.startLights, clouds: this.clouds, stars: this.stars, starLayers: this.starLayers, trees: this.trees, mist: this.mist } = entry);
      this.startLightsLit = undefined;
      this.scene.add(this.world);
    } else {
      this.world = new THREE.Group();
      this.scene.add(this.world);
      this.buildTrack(track);
      this.buildScenery(track);
      // Local scenery may animate (boats, crowds, leaves in the wind): its moving meshes are flagged dynamic and skip batching.
      this.localScenery = createLocalScenery(track);
      this.world.add(this.localScenery);
      batchStaticMeshes(this.world);
      entry = { world: this.world, localScenery: this.localScenery, startLights: this.startLights, clouds: this.clouds, stars: this.stars, starLayers: this.starLayers, trees: this.trees, mist: this.mist };
    }
    this.worldCache.set(track.id, entry);
    for (const [id, old] of this.worldCache) {
      if (this.worldCache.size <= 3) break;
      this.worldCache.delete(id);
      disposeObject(old.world);
    }
    this.previewShadowDirty = true;
  }

  applyTheme(track) {
    const { theme, bounds } = track;
    this.weatherLap = null; this.weatherFrom = null; this.weatherTo = null; this.weatherMix = 1;
    this.starLevel = theme.weather?.[0]?.stars ?? 1;
    if (this.rain) this.rain.visible = false;
    this.scene.background.setHex(theme.sky);
    this.scene.fog.color.setHex(theme.fog);
    this.scene.fog.near = theme.fogNear;
    this.scene.fog.far = theme.fogFar;
    this.lights.hemi.color.setHex(theme.light.hemiSky);
    this.lights.hemi.groundColor.setHex(theme.light.hemiGround);
    this.lights.hemi.intensity = theme.light.hemiIntensity;
    this.sun.color.setHex(theme.light.sun);
    this.sun.intensity = theme.light.sunIntensity;
    // Wider circuits need a wider shadow frustum; the default keeps its original ±100.
    const reach = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX), Math.abs(bounds.minZ), Math.abs(bounds.maxZ));
    this.worldShadowExtent = Math.max(100, reach + 20);
    this.setShadowFrustum(0, 0, this.worldShadowExtent);
  }

  /** Aims the sun's shadow camera at (cx, cz) covering +/-extent metres: the whole circuit in the menus, the players in a race. */
  setShadowFrustum(cx, cz, extent) {
    const sun = this.sun, shadow = sun.shadow.camera;
    sun.position.set(cx - 30, 55, cz + 30);
    sun.target.position.set(cx, 0, cz);
    sun.target.updateMatrixWorld();
    if (this.shadowExtent !== extent) {
      this.shadowExtent = extent;
      shadow.left = -extent; shadow.right = extent; shadow.top = extent; shadow.bottom = -extent;
      shadow.far = 180 + Math.max(0, extent - 100) * 2;
      shadow.updateProjectionMatrix();
    }
  }

  /** In a race the shadow map follows the players: a small frustum gives sharp shadows from a smaller texture. */
  fitShadowToPlayers(positions) {
    if (!positions.length) return;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of positions) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const extent = Math.min(this.worldShadowExtent, Math.max(60, Math.max(maxX - minX, maxZ - minZ) / 2 + 60));
    // Snap the centre and round the extent so shadow edges do not shimmer while the camera glides.
    const snap = 0.5;
    this.setShadowFrustum(Math.round((minX + maxX) / 2 / snap) * snap, Math.round((minZ + maxZ) / 2 / snap) * snap, Math.ceil(extent / 10) * 10);
  }

  /** Removes racer, box and projectile models so the world can be shown without a race. */
  clearRace() {
    this.activeRace = null;
    for (const model of this.racerModels.values()) {
      this.scene.remove(model.root);
      disposeObject(model.root);
    }
    this.racerModels.clear();
    this.boxModels.clear();
    disposeObject(this.trackObjects);
    this.trackObjects.clear();
    this.skids = null;
    this.projectileModels.clear();
    this.cameraInitialized = this.cameras.map(() => false);
    for (const object of this.effects || []) { this.scene.remove(object); if (object.userData.kind !== 'debris') { object.material.dispose(); object.geometry.dispose(); } }
    this.effects = [];
    this.shake = this.cameras.map(() => 0);
  }

  prepareRace(race) {
    if (this.activeRace === race) return;
    this.setTrack(race.track || DEFAULT_TRACK);
    this.clearRace();
    this.activeRace = race;
    const track = this.track;
    if (this.previewingTrack) {
      // Leaving the aerial preview: race objects back on, fog back to the circuit's own distances, and the
      // camera planes back to the ones a race needs — the preview flies far higher and had to widen them.
      this.previewingTrack = false;
      this.scene.fog.near = track.theme.fogNear;
      this.scene.fog.far = track.theme.fogFar;
      for (const camera of this.cameras) { camera.near = RACE_NEAR; camera.far = RACE_FAR; camera.updateProjectionMatrix(); }
    }
    this.trackObjects.visible = true;
    this.skids = createSkids(this.quality.skids);
    if (this.skids) this.trackObjects.add(this.skids.mesh);
    this.resetObstacles();
    const rampOrange = material(0xf5a243, { side: THREE.DoubleSide });
    const rampYellow = material(0xffde81, { side: THREE.DoubleSide });
    for (const ramp of race.ramps || []) {
      const width = ramp.width || track.roadWidth - 0.75;
      const lane = ramp.lane || 0;
      const length = ramp.length || 9;
      const height = ramp.height || 2.1;
      const top = ribbon(track, ramp.distance, length, width, lane,
        (u) => ROAD_Y + 0.05 + u * height, rampOrange, 20);
      top.castShadow = true;
      this.trackObjects.add(top);
      for (let i = 0; i < 5; i += 1) {
        const start = (i / 5) * length;
        this.trackObjects.add(ribbon(track, ramp.distance + start, length / 14, width, lane,
          (u) => ROAD_Y + 0.075 + ((start + (u * length) / 14) / length) * height, rampYellow, 3));
      }
      const endFrame = track.frame(ramp.distance + length);
      const end = worldPoint(track, ramp.distance + length, lane, ROAD_Y + height / 2);
      const face = mesh(new THREE.BoxGeometry(width, height, 0.13), rampOrange, this.trackObjects, end.x, end.y, end.z);
      face.rotation.y = Math.atan2(endFrame.dx, endFrame.dz);
    }
    const padMaterial = material(0x44d7e8, { emissive: 0x24aabc, emissiveIntensity: 0.5, side: THREE.DoubleSide });
    const arrowMaterial = material(0xf0ffbb, { emissive: 0xbbe98a, emissiveIntensity: 0.45, side: THREE.DoubleSide });
    for (const boost of race.boosts || []) {
      this.trackObjects.add(ribbon(track, boost.distance, boost.length || 8, boost.width || 3, boost.lane || 0, ROAD_Y + 0.03, padMaterial, 8));
      for (let i = 1; i <= 3; i += 1) {
        const point = worldPoint(track, boost.distance + i * 1.8, boost.lane || 0, ROAD_Y + 0.055);
        const arrow = new THREE.Group();
        arrow.position.copy(point);
        // Flat on the road, not horizontal above it: on the Parabolica's banking the tarmac leans 26 degrees.
        alignToRoad(arrow, track, boost.distance + i * 1.8, boost.lane || 0);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -0.5, 0, 0, 0.5, 1, 0, -0.5, 0.7, 0, -0.7, 0, 0, 0, -0.7, 0, -0.7], 3));
        geometry.setIndex([0, 1, 5, 5, 1, 4, 4, 1, 3, 3, 1, 2]);
        geometry.computeVertexNormals();
        mesh(geometry, arrowMaterial, arrow);
        this.trackObjects.add(arrow);
      }
    }
    const boxMat = material(0xffffff, { map: textTexture('?'), emissive: 0x7d50c2, emissiveIntensity: 0.08 });
    for (const box of race.boxes || []) {
      const group = new THREE.Group();
      group.position.copy(worldPoint(track, box.distance, box.lane, ROAD_Y));
      // The ring on the ground is a flat disc: on a banked bend (Villasanta's Parabolica) it was half buried in
      // the tarmac, so the crates looked sliced. It leans with the road now, and the crate leans with it.
      alignToRoad(group, track, box.distance, box.lane);
      const cube = mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), boxMat, group, 0, 1.7, 0);
      cube.rotation.z = 0.12;
      const ring = mesh(new THREE.TorusGeometry(0.85, 0.055, 6, 20), material(0xdac6ff, { emissive: 0x9862df, emissiveIntensity: 0.4 }), group, 0, 0.04, 0);
      ring.rotation.x = -Math.PI / 2;
      group.userData.cube = cube;
      this.trackObjects.add(group);
      this.boxModels.set(box.id, group);
    }
  }

  render(race, dt = 1 / 60) {
    if (!race?.racers?.length) return;
    const step = Math.min(0.08, Math.max(0, dt));
    this.clock += step;
    this.prepareRace(race);
    race.racers.forEach((racer, index) => {
      let model = this.racerModels.get(racer.id);
      if (!model) model = this.addRacer(racer, index);
      const frame = this.track.frame(racer.progress);
      const laneVelocity = step > 0 ? (racer.lane - model.previousLane) / Math.max(step, 0.016) : 0;
      model.previousLane = racer.lane;
      const steering = THREE.MathUtils.clamp(laneVelocity * 0.018, -0.17, 0.17);
      // An animal stamping on the roof shakes the car far harder than a knock does.
      const wobble = racer.attacked > 0 ? Math.sin(this.clock * 31) * 0.16 : racer.stun > 0 ? Math.sin(this.clock * 23) * 0.08 : 0;
      const pose = racerPose(this.track, racer);
      const bank = this.track.bank ? this.track.bank(racer.progress) : 0;
      if (pose) {
        // On a bridge or in the loop the section path gives position and full orientation (upside down at the top).
        const lift = ROAD_Y + (racer.y || 0) + 0.015;
        model.root.position.set(pose.x + pose.up.x * lift, pose.y + pose.up.y * lift, pose.z + pose.up.z * lift);
        model.root.quaternion.copy(poseQuaternion(pose));
        model.root.rotateY(steering + wobble);
        model.car.rotation.x = THREE.MathUtils.lerp(model.car.rotation.x, 0, 0.2);
      } else {
        worldPoint(this.track, racer.progress, racer.lane, ROAD_Y + (racer.y || 0) + 0.015, model.root.position);
        // On the verge the car bumps along on the grass.
        if (racer.offroad && !(racer.y > 0.05)) model.root.position.y += Math.abs(Math.sin(this.clock * 29 + racer.progress * 0.7)) * 0.08;
        if (bank) {
          // Banked bend: the car rolls with the road surface, whose normal leans away from the raised edge.
          const tilt = Math.tan(Math.abs(bank)) * (bank > 0 ? 1 : -1);
          model.root.quaternion.copy(poseQuaternion({ forward: { x: frame.dx, y: 0, z: frame.dz }, up: { x: -frame.dz * tilt, y: 1, z: frame.dx * tilt } }));
          model.root.rotateY(steering + wobble);
        } else model.root.rotation.set(0, Math.atan2(frame.dx, frame.dz) + steering + wobble, 0);
        let ramp = null;
        if (race.ramps) for (const candidate of race.ramps) { if (this.track.wrap(racer.progress - candidate.distance) < candidate.length) { ramp = candidate; break; } }
        const slope = this.track.slope ? this.track.slope(racer.progress) : 0;
        const targetPitch = ramp ? -Math.atan2(ramp.height || 2.1, ramp.length) : racer.y > 0.4 ? 0.06 : -Math.atan(slope);
        model.car.rotation.x = THREE.MathUtils.lerp(model.car.rotation.x, targetPitch, 0.14);
      }
      // Bends, drawn livelier (src/lean.js), and visual only: nothing here feeds the simulation. The body leans about
      // the axle line (the `tilt` group in cars.js: body and wheels roll together, so a tall rear wing does not slide
      // sideways and look unbolted): cars roll out of the bend, motorbikes and trikes lean in, on a spring so the body
      // settles and rocks back instead of snapping. The steering wheels turn with the road, and in the tight bends
      // the tail swings out a little. On a bridge, in the loop or in the air everything rights itself.
      const tilt = model.car.userData.tilt || model.car.userData.body;
      const stance = tilt === model.car.userData.tilt ? model.car.userData.stance : null;
      if (!model.lean) {
        const inward = leansIntoTurns(racer.spec);
        model.lean = { angle: 0, speed: 0, inward, limit: leanLimit(inward, stance?.halfTrack ?? 1) };
        model.slide = { angle: 0, speed: 0 };
        model.steerWheels = (model.car.userData.wheels || []).filter((wheel) => wheel.userData.steerSign);
        model.steerAngle = 0;
        // The rear axle, the one that scrubs the road when the tail slides: where its tyres sit and how wide they are.
        const carWheels = (model.car.userData.wheels || []).filter((wheel) => wheel.userData.group !== 'trailer');
        const rearZ = Math.min(...carWheels.map((wheel) => wheel.position.z));
        model.rearTyres = carWheels.filter((wheel) => wheel.position.z < rearZ + 0.05).map((wheel) => ({ x: wheel.position.x, z: wheel.position.z, width: wheel.userData.tread || 0.27 }));
      }
      const grounded = !pose && !(racer.y > 0.3) && !(racer.spinning > 0);
      const curvature = grounded ? bendCurvature(this.track, racer.progress) : 0;
      const g = ((racer.speed || 0) ** 2 * curvature) / 9.81;
      if (tilt) {
        tilt.rotation.z = stepLean(model.lean, grounded ? leanTarget(g, steering, model.lean.inward, model.lean.limit) : 0, step);
        if (stance) {
          const at = rest(tilt.rotation.z, stance, model.lean.inward);
          tilt.position.x = at.x; tilt.position.y = at.y;
        }
      }
      if (model.steerWheels.length) {
        const target = grounded ? wheelSteer(curvature, stance?.wheelbase ?? 2, steering) : 0;
        model.steerAngle += (target - model.steerAngle) * (1 - Math.exp(-step / 0.08));
        for (const wheel of model.steerWheels) wheel.rotation.y = model.steerAngle * wheel.userData.steerSign;
      }
      stepLean(model.slide, grounded ? slideTarget(g) : 0, step);
      if (this.skids && leavesMarks({ grounded, slide: model.slide.angle, drifting: racer.drifting, spinning: racer.spinning, slipping: racer.slipping })) {
        this.dropSkids(model, racer, stance, step);
      }
      // An articulated trailer lags the tractor, so it points where the cab came from. A deterministic function of
      // the steering, clamped so the container can never fold into the cab.
      const hitch = model.car.userData.hitch;
      if (hitch) {
        const target = THREE.MathUtils.clamp(-steering * 1.8, -0.34, 0.34);
        model.trailerYaw = (model.trailerYaw || 0) + (target - (model.trailerYaw || 0)) * (1 - Math.exp(-step / 0.24));
        hitch.rotation.y = model.trailerYaw;
      }
      for (const wheel of model.car.userData.wheels || []) wheel.rotation.x += (racer.speed || 0) * step * 1.9;
      for (const spinner of model.car.userData.spinners || []) spinner.rotation.y += step * (5 + (racer.speed || 0) * 0.6);
      model.shield.visible = racer.shield > 0;
      model.shield.rotation.y += step * 0.8;
      model.propeller.visible = racer.propeller > 0;
      if (model.propeller.visible) {
        model.propeller.userData.blades.rotation.y = this.clock * 26;
        // It folds away in the last second instead of blinking out of existence.
        model.propeller.scale.setScalar(Math.min(1, racer.propeller));
      }
      // The two flying presents. The parachute opens at once, above the car in a jump, behind it on the ground, and a
      // braking one folds away in its last half second. The hang-glider comes out properly only in the air.
      const flying = racer.y > 0.4;
      model.parachute.visible = !!racer.chute;
      if (model.parachute.visible) {
        const { canopy, pack } = model.parachute.userData;
        const braking = racer.chute === 'brake';
        const target = braking ? Math.min(1, racer.parachute * 2) : 1;
        model.parachuteOpen = Math.min(target, (model.parachuteOpen || 0) + step * 3);
        canopy.visible = model.parachuteOpen > 0.05;
        pack.visible = !canopy.visible;
        if (canopy.visible) {
          // A braking one is smaller, so it does not hide the car from the chase camera. Turned on its back the dome
          // faces the road behind and the lines reach forward to the tail.
          const size = model.parachuteOpen * (braking ? 0.65 : 1);
          canopy.scale.set(size, 0.55 * size, size);
          canopy.position.set(0, braking ? 1.3 : 3.5, braking ? -2.7 : 0);
          canopy.rotation.x = braking ? -Math.PI / 2 : 0;
          canopy.rotation.z = Math.sin(this.clock * (braking ? 9 : 2.4)) * (braking ? 0.1 : 0.06);
        }
      } else model.parachuteOpen = 0;
      model.glider.visible = racer.glider > 0;
      if (model.glider.visible) {
        model.gliderSpread = THREE.MathUtils.lerp(model.gliderSpread ?? 0.45, flying ? 1 : 0.45, 1 - Math.exp(-step * 6));
        model.glider.scale.set(model.gliderSpread, 1, 0.7 + model.gliderSpread * 0.3);
        // In the air it banks with the bends, like the bikes: into the turn.
        model.glider.rotation.z = flying ? -steering * 1.6 : 0;
      }
      model.storm.visible = racer.storm > 0;
      if (model.storm.visible) {
        // It blows in over the first quarter second, bobs, rains, and flashes a bolt about once a second.
        const { drops, bolt } = model.storm.userData;
        const grow = Math.min(1, (STORM_TIME - racer.storm) * 4, racer.storm * 2);
        model.storm.scale.setScalar(Math.max(0.05, grow));
        model.storm.position.y = Math.sin(this.clock * 2.2) * 0.12;
        for (const drop of drops) drop.position.y = 2.6 - ((this.clock * 2.6 + drop.userData.phase) % 1) * 1.1;
        const flash = (this.clock * 1.1 + racer.storm * 0.37) % 1;
        bolt.visible = flash < 0.09;
      }
      model.cream.visible = racer.creamed > 0;
      if (model.cream.visible) model.cream.scale.setScalar(0.8 + Math.min(1, racer.creamed / 2.6) * 0.35);
      // Spun out on the oil: one full turn on the spot, fast at first and slowing as the tyres find grip again.
      if (racer.spinning > 0) {
        const k = 1 - racer.spinning / SPIN_TIME;
        model.car.rotation.y = (1 - (1 - k) ** 3) * Math.PI * 2;
        model.car.position.x = 0; model.car.position.z = 0;
        model.slide.angle = 0; model.slide.speed = 0;
      } else {
        // Not spinning: the tail swing, pivoted on the front axle.
        const at = slideOffset(model.slide.angle, stance?.frontZ ?? 0);
        model.car.rotation.y = model.slide.angle;
        model.car.position.x = at.x; model.car.position.z = at.z;
      }
      model.jelly.visible = racer.stuck > 0;
      if (model.jelly.visible) {
        // Melting: from full size down to a puddle over the half second the car is stuck, with a wobble.
        const melt = 0.3 + 0.7 * Math.min(1, racer.stuck / STUCK_TIME);
        const wobble = Math.sin(this.clock * 9) * 0.07;
        model.jelly.scale.set(melt * (1 + wobble), melt * 0.7, melt * (1 - wobble));
        model.jelly.position.y = 0.9 * melt;
      }
      // Flattened by a bale: a biscuit of a car for most of the second, then it springs back past its own height.
      if (racer.squashed > 0) {
        const k = racer.squashed > 0.25 ? 0 : 1 - racer.squashed / 0.25;
        const flat = 0.24 + (1 - 0.24) * easeOutBack(k), wide = 1.3 - 0.3 * k;
        model.car.scale.set(model.baseScale.x * wide, model.baseScale.y * flat, model.baseScale.z * wide);
        model.flattened = true;
      } else if (model.flattened) {
        model.car.scale.copy(model.baseScale);
        model.flattened = false;
      }
      // The rainbow: a glowing copy of the car over the car itself, its colour running through the whole spectrum.
      // It flashes between strong and faint rather than on and off — switched off for a third of the time, a
      // rainbow car looked like an ordinary one in half the screenshots. In the last second and a half it flashes
      // faster, so the driver knows it is about to end.
      if (racer.rainbow > 0) {
        model.rainbow ||= this.rainbowShell(model.car);
        model.rainbow.visible = true;
        this.rainbowMaterial.opacity = Math.sin(this.clock * (racer.rainbow < 1.5 ? 34 : 16)) > 0 ? 0.8 : 0.42;
      } else if (model.rainbow) model.rainbow.visible = false;
      model.trail.visible = racer.boost > 0 || racer.rainbow > 0;
      for (const puff of model.trail.children) {
        const phase = (this.clock * 2.5 + puff.userData.phase) % 1;
        puff.position.set(Math.sin(puff.userData.phase * 37) * 0.5, 0.35 + phase * 0.4, -1.8 - phase * 3.8);
        puff.scale.setScalar((1 - phase) * 1.7);
      }
      if (model.dust?.children.length) {
        const speed = racer.speed || 0;
        const rolling = speed > 5 && !(racer.y > 0.3);
        model.dust.visible = rolling;
        if (rolling) {
          // A drifting car throws up far more dust than a car simply going fast: that is how you see the slide.
          const intensity = Math.min(1, speed / ((race.baseSpeed || 24) * 1.1)) * (racer.boost > 0 ? 1.4 : 1) * (racer.drifting ? 1.7 : 1);
          for (const puff of model.dust.children) {
            const phase = (this.clock * 1.5 + puff.userData.phase) % 1;
            const fade = phase < 0.75 ? 1 : (1 - phase) / 0.25;
            puff.position.set(puff.userData.side * (0.75 + phase * 1.9) + Math.sin(phase * 17 + puff.userData.phase * 53) * 0.35, 0.2 + phase * 1.9, -1.1 - phase * 6.5);
            puff.scale.setScalar((0.45 + phase * 2.6) * intensity * fade);
          }
        }
      }
      // A wrecked car is gone for its one second: only the fire is there, then it is back whole.
      const burning = racer.wrecked > 0;
      if (model.car.visible === burning) model.car.visible = !burning;
      if (burning && this.frame % 4 === 0) this.spawnFlame(model.root.position);
      if (model.marker) model.marker.position.y = 3.25 + Math.sin(this.clock * 3.5) * 0.15;
    });
    for (const box of race.boxes || []) {
      const group = this.boxModels.get(box.id);
      if (!group) continue;
      const cube = group.userData.cube;
      cube.visible = box.available !== false && !(box.cooldown > 0);
      cube.rotation.y = this.clock * 0.85 + box.distance * 0.1;
      cube.position.y = 1.72 + Math.sin(this.clock * 2.1 + box.distance) * 0.18;
    }
    this.syncObstacles(race, step);
    if (this.skids?.dirty) {
      this.skids.mesh.instanceMatrix.needsUpdate = true;
      this.skids.mesh.instanceColor.needsUpdate = true;
      this.skids.dirty = false;
    }
    this.updateCritters(race.time, race);
    if (this.rainbowMaterial) this.rainbowMaterial.color.setHSL((this.clock * 1.4) % 1, 1, 0.5);
    this.updateProjectiles(race);
    this.updateEffects(step);
    this.animateSky(step);
    this.updateWeather(step, race);
    this.updateAtmosphere(step, race);
    this.localScenery?.userData.animate?.(this.clock, step, race.racers, this.track);
    // Three, two, one, go: one more lamp lights on every second of the countdown, and at zero they all go green.
    // `lit` is -1 while they are green, so the state only has to be written when it actually changes.
    const lit = race.countdown > 0 ? Math.min(3, Math.max(0, 3 - Math.floor(race.countdown))) : -1;
    if (this.startLightsLit !== lit) {
      this.startLightsLit = lit;
      this.startLights.forEach((light, index) => {
        const on = lit < 0 || index < lit;
        light.material.color.setHex(lit < 0 ? 0x8df073 : on ? 0xff4a2a : 0x3a2020);
        light.material.emissive.setHex(lit < 0 ? 0x40b61f : on ? 0xff2a00 : 0x150808);
        light.material.emissiveIntensity = on ? 1.1 : 0.2;
      });
    }
    this.frame += 1;
    // One shadow pass per frame (the mirror re-uses it), aimed at the players instead of the whole circuit.
    const playerRacers = [];
    for (let player = 0; player < this.players; player += 1) playerRacers.push(race.racers.find((entry) => entry.playerIndex === player) || race.racers[player] || race.racers[0]);
    this.fitShadowToPlayers(playerRacers.map((racer) => this.racerModels.get(racer.id)?.root.position).filter(Boolean));
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setScissorTest(true);
    for (let player = 0; player < this.players; player += 1) {
      const racer = playerRacers[player];
      const camera = this.cameras[player];
      const frame = this.track.frame(racer.progress - 1);
      const speedFraction = Math.min((racer.speed || 0) / 48, 1.3);
      const chaseDistance = (this.players === 2 ? 16.6 : 13.5) + speedFraction * 1.8;
      const pose = racerPose(this.track, racer);
      let targetPosition;
      let look;
      let cameraUp = null;
      if (pose && pose.section.kind === 'bridge') {
        // Across a bridge the camera follows the deck, looking a little further along it.
        const heading = new THREE.Vector3(pose.forward.x, 0, pose.forward.z).normalize();
        targetPosition = new THREE.Vector3(pose.x - heading.x * chaseDistance, pose.y + 10.5 + speedFraction * 1.6, pose.z - heading.z * chaseDistance);
        const ahead = pose.section.pose(Math.min(1, pose.fraction + 9.5 / pose.section.pathLength), racer.lane * 0.6);
        look = new THREE.Vector3(ahead.x, ahead.y + 1.05, ahead.z);
      } else if (pose && pose.fraction * pose.section.pathLength > 13.5) {
        // Loop-the-loop: the camera rides through it behind the car and rolls with the track (upside down at the top).
        const section = pose.section;
        const back = section.pose(pose.fraction - 12.5 / section.pathLength, racer.lane * 0.3);
        cameraUp = new THREE.Vector3(back.up.x, back.up.y, back.up.z);
        const height = 10.5 - Math.min(5.4, pose.y * 0.55) + speedFraction;
        targetPosition = new THREE.Vector3(back.x, back.y, back.z).addScaledVector(cameraUp, height);
        const ahead = section.pose(Math.min(1, pose.fraction + 7 / section.pathLength), racer.lane * 0.6);
        look = new THREE.Vector3(ahead.x, ahead.y, ahead.z).addScaledVector(new THREE.Vector3(ahead.up.x, ahead.up.y, ahead.up.z), 1.05);
      } else if (pose) {
        // First metres of the loop's lead-in: the usual chase camera, aimed along the section path.
        targetPosition = new THREE.Vector3(pose.x - frame.dx * chaseDistance, 10.5 + speedFraction * 1.6, pose.z - frame.dz * chaseDistance);
        const ahead = pose.section.pose(Math.min(1, pose.fraction + 9.5 / pose.section.pathLength), racer.lane * 0.6);
        look = new THREE.Vector3(ahead.x, ahead.y + 1.05, ahead.z);
      } else {
        const position = worldPoint(this.track, racer.progress, racer.lane, ROAD_Y + (racer.y || 0), _position);
        const cameraGround = this.track.elevation ? this.track.elevation(racer.progress - chaseDistance) : 0;
        targetPosition = _target.set(position.x - frame.dx * chaseDistance,
          cameraGround + 10.5 + speedFraction * 1.6 + (racer.y || 0) * 0.48 + Math.max(0, bankRise(this.track, racer.progress, racer.lane)),
          position.z - frame.dz * chaseDistance);
        look = worldPoint(this.track, racer.progress + 9.5, racer.lane * 0.6, 1.05 + (racer.y || 0) * 0.3, _look);
      }
      // A deck overhead: the camera ducks under it rather than sitting on top of the floor the car drives beneath.
      duckUnderDecks(this.overheadDecks, targetPosition, (pose ? pose.y : (this.track.elevation ? this.track.elevation(racer.progress) : 0)) + ROAD_Y);
      if (!this.cameraInitialized[player]) {
        camera.position.copy(targetPosition);
        this.cameraInitialized[player] = true;
      } else camera.position.lerp(targetPosition, 1 - Math.exp(-step * 7));
      // Camera shake after a hit: a decaying random offset applied only for this frame's render. None when the
      // system asks for reduced motion (main.js sets reduceMotion): the debris and the flash still show the hit.
      const shake = this.shake?.[player] || 0;
      const restPosition = _rest.copy(camera.position);
      if (shake > 0) {
        if (!this.reduceMotion) {
          camera.position.x += (Math.random() - 0.5) * shake * 1.4;
          camera.position.y += (Math.random() - 0.5) * shake * 0.9;
          camera.position.z += (Math.random() - 0.5) * shake * 1.4;
        }
        this.shake[player] = Math.max(0, shake - step * 1.5);
      }
      camera.up.copy(cameraUp || WORLD_UP);
      camera.lookAt(look);
      camera.fov = (this.players === 2 ? 62 : 56) + (racer.boost > 0 ? 4 : 0);
      const view = this.viewportFor(player);
      const left = view.x, right = view.x + view.w;
      camera.aspect = view.w / view.h;
      camera.updateProjectionMatrix();
      this.renderer.setViewport(view.x, view.y, view.w, view.h);
      this.renderer.setScissor(view.x, view.y, view.w, view.h);
      this.updateWind(player, camera, racer, step);
      this.renderer.render(this.scene, camera);
      // The mirror re-renders the world into a small texture: lighter profiles refresh it every second or fourth frame,
      // one player at a time, and redraw the last image in between. Three or four pilots: none, the views are small.
      const { mirrorEvery } = this.quality;
      if (mirrorEvery > 0 && this.players <= 2) this.renderMirror(racer, left, right, (this.frame + player) % mirrorEvery === 0);
      camera.position.copy(restPosition);
    }
    this.renderer.setScissorTest(false);
  }

  /**
   * Turbo wind: white streaks flying past the camera, so a boost feels fast instead of merely being fast.
   * The rigs live in the scene (a camera outside the graph would not render its children) and are shown one at a
   * time, right before that player's viewport is drawn, so in split-screen nobody sees the other's wind.
   */
  updateWind(player, camera, racer, step) {
    const count = this.quality.wind | 0;
    if (!count) { if (this.windLayer) this.windLayer.visible = false; return; }
    if (!this.windLayer) {
      this.windLayer = new THREE.Group();
      this.windLayer.frustumCulled = false;
      this.scene.add(this.windLayer);
      this.windRigs = [];
      this.windLevel = this.cameras.map(() => 0);
    }
    let rig = this.windRigs[player];
    if (!rig) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false });
      const geometry = new THREE.BoxGeometry(0.06, 0.06, 1);
      const group = new THREE.Group();
      group.frustumCulled = false;
      const streaks = [];
      for (let i = 0; i < count; i += 1) {
        const streak = new THREE.Mesh(geometry, material);
        streak.castShadow = false;
        streak.receiveShadow = false;
        streak.frustumCulled = false;
        group.add(streak);
        streaks.push(streak);
        this._placeStreak(streak, -6 - (i / count) * 40);
      }
      this.windLayer.add(group);
      rig = { group, material, geometry, streaks };
      this.windRigs[player] = rig;
    }
    // Fade in and out so the streaks never pop into existence mid-corner.
    const target = racer.boost > 0 ? 1 : 0;
    const level = this.windLevel[player] = THREE.MathUtils.lerp(this.windLevel[player] || 0, target, 1 - Math.exp(-step * 6));
    this.windLayer.visible = level > 0.02;
    for (const rigged of this.windRigs) if (rigged) rigged.group.visible = false;
    if (!this.windLayer.visible) return;
    rig.group.visible = true;
    rig.material.opacity = level * 0.5;
    rig.group.position.copy(camera.position);
    rig.group.quaternion.copy(camera.quaternion);
    const flow = (58 + (racer.speed || 0) * 1.6) * step;
    for (const streak of rig.streaks) {
      streak.position.z += flow;
      if (streak.position.z > -3.5) this._placeStreak(streak, -46);
    }
  }

  /** One streak on a ring around the view axis: never in the middle, where the car is. */
  _placeStreak(streak, z) {
    // Decorative, but it still draws from the game's one generator (src/random.js) rather than a second source.
    if (!this._windRandom) this._windRandom = seeded(0x51ea77);
    const random = this._windRandom;
    const angle = random() * Math.PI * 2;
    const radius = 5.5 + random() * 9;
    streak.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, z);
    streak.scale.z = 3 + random() * 7;
  }

  /** Rear-view mirror: the scene behind the car rendered to a small target, then drawn flipped at the top of the view. */
  renderMirror(racer, left, right, refresh = true) {
    const viewWidth = right - left;
    if (viewWidth < 520 || this.height < 420) return;
    if (!this.mirror) {
      const target = new THREE.WebGLRenderTarget(384, 144, { samples: this.quality.mirrorSamples });
      target.texture.wrapS = THREE.RepeatWrapping;
      target.texture.repeat.x = -1;
      target.texture.offset.x = 1;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0e1a);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 1.86), new THREE.MeshBasicMaterial({ map: target.texture }));
      quad.position.y = -0.03;
      scene.add(quad);
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.1), new THREE.MeshBasicMaterial({ color: 0x3a4361 }));
      frame.position.set(0, 0.95, 0.01);
      scene.add(frame);
      this.mirror = { target, scene, camera: new THREE.PerspectiveCamera(68, 384 / 144, 0.4, 160), quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10) };
      this.mirror.quadCamera.position.z = 1;
    }
    const { target, scene, camera, quadCamera } = this.mirror;
    if (refresh) {
      worldPoint(this.track, racer.progress - 0.8, racer.lane, ROAD_Y + (racer.y || 0) + 2.1, camera.position);
      camera.lookAt(worldPoint(this.track, racer.progress - 34, racer.lane * 0.4, ROAD_Y + 1.4, _behind));
      // A mirror shows the road just behind the car: fog closes in early so distant scenery costs nothing.
      const fog = this.scene.fog, fogNear = fog.near, fogFar = fog.far;
      fog.near = Math.min(fogNear, 40);
      fog.far = Math.min(fogFar, 150);
      // Your own car sits between the mirror camera and the road: a tall rear wing or the antenna filled the whole
      // mirror. Hide the driver's own model (car, shield bubble, flame trail) for this pass only.
      const own = this.racerModels.get(racer.id)?.root;
      const wasVisible = own ? own.visible : false;
      if (own) own.visible = false;
      // The turbo streaks are anchored to the chase camera, so they would smear across the mirror as well.
      const wind = this.windLayer, windWasVisible = wind ? wind.visible : false;
      if (wind) wind.visible = false;
      try {
        this.renderer.setRenderTarget(target);
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, 384, 144);
        this.renderer.render(this.scene, camera);
      } finally {
        this.renderer.setRenderTarget(null);
        if (own) own.visible = wasVisible;
        if (wind) wind.visible = windWasVisible;
        fog.near = fogNear;
        fog.far = fogFar;
      }
    }
    const width = Math.round(Math.min(360, viewWidth * 0.27));
    const height = Math.round(width * 144 / 384);
    const x = left + Math.round((viewWidth - width) / 2);
    const y = this.height - height - 16;
    this.renderer.setScissorTest(true);
    this.renderer.setViewport(x, y, width, height);
    this.renderer.setScissor(x, y, width, height);
    this.renderer.render(scene, quadCamera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    const geometries = new Set();
    const materials = new Set();
    for (const scene of [this.scene, this.previewScene, this.thumbnailScene]) {
      scene?.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        list.forEach((mat) => materials.add(mat));
      });
    }
    for (const geometry of geometries) geometry.dispose();
    for (const mat of materials) {
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
    if (this.mirror) { this.mirror.target.dispose(); disposeObject(this.mirror.scene); }
    for (const entry of this.worldCache?.values() || []) disposeObject(entry.world);
    for (const geometry of [this.flameGeometry, this.dustGeometry]) geometry?.dispose();
    for (const mat of [this.flameMaterial, this.dustMaterial]) mat?.dispose();
    this.renderer.dispose();
    this.releaseThumbnailRenderer();
    this.canvas.remove();
  }
}

Object.assign(GameRenderer.prototype, worldMethods, effectsMethods, atmosphereMethods, menusMethods, racersMethods);
