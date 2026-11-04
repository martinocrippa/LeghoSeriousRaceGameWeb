/**
 * GameRenderer methods. What the menus draw: the aerial track preview and the flyover with the helicopter, the garage showroom, the car thumbnails.
 * Plain methods on `this`, attached to GameRenderer.prototype in renderer.js; moved here unchanged.
 */
import * as THREE from 'three';
import { createCarModel } from '../cars.js';
import { ROAD_Y, PREVIEW_TIME_SCALE, FLYOVER_SECONDS, RACE_NEAR, RACE_FAR, GROUND_REACH, SHOWROOM_LOOK, _position, _target, _look, _rest, _behind, material, mesh, worldPoint, setShadows, disposeObject, addLights, makeStar } from './common.js';

export const menusMethods = {
  /** Prepares the aerial 3D preview used by the track picker: no race objects, fog pushed back to see the whole loop. */
  previewTrack(track) {
    this.setTrack(track);
    this.clearRace();
    // Switching circuit while the helicopter is up: take it out of the sky before the world under it changes.
    if (this.flyover) this.stopFlyover();
    this.previewingTrack = true;
    this.previewShadowDirty = true;
    // The world is cached per circuit: a desk blown up in the last race must be standing again in the preview.
    this.resetObstacles();
    this.setShadowFrustum(0, 0, this.worldShadowExtent);
    this.trackObjects.visible = false;
    const { theme } = track;
    this.previewReach = this.framePreview(track);
    this.scene.fog.near = this.previewReach * 1.6;
    this.scene.fog.far = this.previewReach * 3 + Math.max(theme.fogFar, 200);
  },

  /**
   * How wide the aerial preview has to be. The circuit alone is not enough: the Bernina railway runs well outside
   * the track's own bounds, so the little train was simply off camera and nobody ever saw it move. The scenery may
   * also reach very far (a glacier, the Apuan Alps), so the view grows by at most a third — enough to take in what
   * happens beside the road, not so much that the circuit becomes a dot.
   */
  framePreview(track) {
    const { bounds } = track;
    const trackReach = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
    const scenery = this.localScenery;
    if (!scenery) return trackReach;
    const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
    const box = new THREE.Box3().setFromObject(scenery);
    if (!Number.isFinite(box.min.x)) return trackReach;
    const needed = 2 * Math.max(cx - box.min.x, box.max.x - cx, cz - box.min.z, box.max.z - cz);
    return Math.min(Math.max(trackReach, needed), trackReach * 1.35);
  },

  /**
   * "Esplora le piste": a helicopter flies one lap of the circuit in about ten seconds, so a child can see what is
   * coming before choosing it. It borrows the same camera as the aerial preview and hands back the orbit when it
   * lands. Nothing about the circuit is simulated: it is a camera following a helicopter along the road.
   */
  startFlyover(seconds = FLYOVER_SECONDS) {
    if (!this.track) return false;
    this.flyover = { time: 0, span: Math.max(4, seconds), at: new THREE.Vector3(), look: new THREE.Vector3(), started: false };
    // Down at a couple of hundred metres the aerial fog would swallow the road, so it comes back to racing depth.
    const { theme } = this.track;
    this.scene.fog.near = Math.max(theme.fogNear, 140);
    this.scene.fog.far = Math.max(theme.fogFar, 900);
    this.flyover.helicopter = this.buildHelicopter();
    this.scene.add(this.flyover.helicopter);
    return true;
  },

  /**
   * The helicopter you actually see. It flies the lap ahead of the camera, which means the picture has something
   * in it that is moving on purpose — an aerial shot of an empty circuit reads as a camera glitch, not as a flight.
   */
  buildHelicopter() {
    const heli = new THREE.Group();
    const shell = material(0xe5203a), dark = material(0x2b3038), glass = material(0x9fe8ec, { transparent: true, opacity: 0.6 });
    const body = mesh(new THREE.SphereGeometry(1.5, 14, 10), shell, heli, 0, 0, 0.3);
    body.scale.set(0.85, 0.9, 1.5);
    const nose = mesh(new THREE.SphereGeometry(1.1, 12, 9), glass, heli, 0, 0.1, 2.1);
    nose.scale.set(0.8, 0.75, 1.1);
    mesh(new THREE.BoxGeometry(0.5, 0.5, 3.6), shell, heli, 0, 0.5, -2.4);
    mesh(new THREE.BoxGeometry(0.16, 1.5, 0.9), shell, heli, 0, 1.2, -3.9);
    mesh(new THREE.BoxGeometry(1.6, 0.14, 0.5), dark, heli, 0, 0.9, -3.9);
    for (const side of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.16, 0.16, 3.4), dark, heli, side * 0.9, -1.3, 0.3);
      mesh(new THREE.BoxGeometry(0.14, 1, 0.14), dark, heli, side * 0.9, -0.85, 1.2);
      mesh(new THREE.BoxGeometry(0.14, 1, 0.14), dark, heli, side * 0.9, -0.85, -0.6);
    }
    // The main rotor and the tail rotor, each on its own group so they can be spun.
    const rotor = new THREE.Group();
    rotor.position.set(0, 1.5, 0.3);
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), dark, rotor, 0, 0.2, 0);
    for (let i = 0; i < 4; i += 1) {
      const blade = mesh(new THREE.BoxGeometry(11, 0.09, 0.7), dark, rotor, 0, 0.45, 0);
      blade.rotation.y = (i / 4) * Math.PI;
    }
    heli.add(rotor);
    const tail = new THREE.Group();
    tail.position.set(0.25, 1.2, -3.9);
    for (let i = 0; i < 2; i += 1) {
      const blade = mesh(new THREE.BoxGeometry(0.09, 2.6, 0.4), dark, tail, 0, 0, 0);
      blade.rotation.x = (i / 2) * Math.PI;
    }
    heli.add(tail);
    heli.traverse((object) => { object.castShadow = false; object.receiveShadow = false; });
    heli.userData = { rotor, tail };
    return heli;
  },

  stopFlyover() {
    if (this.flyover?.helicopter) {
      this.scene.remove(this.flyover.helicopter);
      disposeObject(this.flyover.helicopter);
    }
    this.flyover = null;
    if (!this.track) return;
    const { theme } = this.track;
    const reach = this.previewReach || 400;
    this.scene.fog.near = reach * 1.6;
    this.scene.fog.far = reach * 3 + Math.max(theme.fogFar, 200);
    this.previewShadowDirty = true;
  },

  /**
   * One frame of the helicopter lap. Returns how much of the lap is done (0..1), or null when it has finished and
   * the caller should go back to `renderTrackPreview`.
   */
  renderTrackFlyover(dt = 1 / 60) {
    if (!this.track || !this.flyover) return null;
    const step = Math.min(dt, 0.1);
    this.clock += step;
    this.frame += 1;
    this.flyover.time += step;
    const done = this.flyover.time / this.flyover.span;
    if (done >= 1) { this.stopFlyover(); return null; }
    const track = this.track;
    const distance = done * track.length;
    // The shadow map follows the helicopter: once every third of a second is enough at this height.
    this.renderer.shadowMap.needsUpdate = this.clock - (this.previewShadowAt || -9) >= 0.34;
    if (this.renderer.shadowMap.needsUpdate) this.previewShadowAt = this.clock;
    const camera = this.cameras[0];
    camera.fov = 52;
    camera.aspect = this.width / this.height;
    // The helicopter rides the road a little out to one side, drifting from one side to the other over the lap so
    // the circuit is seen from more than one angle.
    const sway = Math.sin(done * Math.PI * 4) * 22;
    const height = 26 + Math.sin(this.clock * 0.9) * 0.7;
    const heli = this.flyover.helicopter;
    worldPoint(track, distance, sway, ROAD_Y, _position);
    heli.position.set(_position.x, _position.y + height, _position.z);
    // It points where it is going, worked out from two points on the path rather than from the tangent: the
    // tangent is constant along each of the 2048 segments, so using it made the whole shot step round corners.
    const ahead = worldPoint(track, distance + 26, sway, ROAD_Y, _target);
    heli.rotation.y = Math.atan2(ahead.x - _position.x, ahead.z - _position.z);
    heli.rotation.z = THREE.MathUtils.lerp(heli.rotation.z, -Math.sin(done * Math.PI * 4) * 0.12, Math.min(1, step * 3));
    heli.userData.rotor.rotation.y += step * 42;
    heli.userData.tail.rotation.x += step * 60;
    // The camera sits behind and above it, and is pulled toward that place rather than snapped to it. That one
    // change is what takes the judder out: every value below comes from a track sample, and those are piecewise
    // straight, so following them exactly makes the picture step from segment to segment.
    const behind = worldPoint(track, distance - 46, sway * 0.6, ROAD_Y, _behind);
    _rest.set(behind.x, behind.y + height + 9, behind.z);
    const look = worldPoint(track, distance + 40, 0, ROAD_Y, _look);
    _look.set(look.x, look.y + 3, look.z);
    if (!this.flyover.started) { this.flyover.started = true; this.flyover.at.copy(_rest); this.flyover.look.copy(_look); }
    const ease = 1 - Math.exp(-step * 3.2);
    this.flyover.at.lerp(_rest, ease);
    this.flyover.look.lerp(_look, ease);
    camera.position.copy(this.flyover.at);
    camera.lookAt(this.flyover.look);
    camera.near = RACE_NEAR;
    camera.far = Math.max(RACE_FAR, 1600);
    camera.updateProjectionMatrix();
    this.animateSky(step);
    this.localScenery?.userData.animate?.(this.clock, step, [], track);
    this.updateCritters(this.clock, null);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.render(this.scene, camera);
    return done;
  },

  renderTrackPreview(dt = 1 / 60) {
    if (!this.track) return;
    const step = Math.min(dt, 0.1);
    this.clock += step;
    this.frame += 1;
    // Aerial view of a static circuit: the shadow map is rebuilt when the track changes, then about once a second
    // (boats, leaves). Counted in seconds, not in frames, so it does not thin out when the menu runs faster.
    const dueShadow = this.clock - (this.previewShadowAt || -9) >= 1;
    this.renderer.shadowMap.needsUpdate = this.previewShadowDirty || dueShadow;
    if (this.renderer.shadowMap.needsUpdate) this.previewShadowAt = this.clock;
    this.previewShadowDirty = false;
    this.orbitAngle = (this.orbitAngle || 0) + step * 0.11;
    const { bounds } = this.track;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const reach = this.previewReach || Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
    const aspect = this.width / this.height;
    const camera = this.cameras[0];
    camera.fov = 48;
    camera.aspect = aspect;
    // Frame the circuit instead of guessing a distance. The old rule put the camera 25 degrees above the horizon,
    // which flattens a flat circuit into a thin strip at the horizon line and leaves most of the panel empty sky —
    // it is an aerial view, so it looks down from fifty degrees, far enough out that the whole loop fits BOTH the
    // vertical and the horizontal opening of the lens. The panel is tall and narrow, so the horizontal one wins.
    const radius = reach * 0.5 * 1.14;
    const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
    const horizontal = Math.atan(Math.tan(vertical) * aspect);
    const distance = Math.max(radius / Math.tan(vertical), radius / Math.tan(horizontal));
    const elevation = 0.87;
    const ground = distance * Math.cos(elevation);
    camera.position.set(cx + Math.sin(this.orbitAngle) * ground, distance * Math.sin(elevation), cz + Math.cos(this.orbitAngle) * ground);
    camera.lookAt(cx, 0, cz);
    // From up here nothing is within a hundred metres and the ground plane runs out two kilometres away: the near
    // plane can move out (which buys back depth precision, so distant scenery stops flickering) and the far one has
    // to take in the whole plane, or it cuts a hole in the ground and the sky shows through it.
    camera.near = Math.max(RACE_NEAR, distance * 0.05);
    camera.far = distance + GROUND_REACH * 2;
    camera.updateProjectionMatrix();
    this.animateSky(step);
    // Time runs faster while you look at a circuit from above: a train that waits seven seconds at each end, or a
    // ferry crossing a lake, has to show what it does within the few seconds a child spends on this screen.
    this.localScenery?.userData.animate?.(this.clock * PREVIEW_TIME_SCALE, step * PREVIEW_TIME_SCALE, [], this.track);
    this.updateCritters(this.clock * PREVIEW_TIME_SCALE, null);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.render(this.scene, camera);
  },

  buildShowroom() {
    // Dark arcade showroom: navy floor, asphalt turntable, orange curb and the chosen car under the spotlight.
    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x0f1220);
    this.previewScene.fog = new THREE.Fog(0x0f1220, 34, 65);
    const { sun: light, hemi } = addLights(this.previewScene);
    this.previewLight = light;
    hemi.groundColor.setHex(0x1c2038);
    hemi.color.setHex(0xdfe8ff);
    hemi.intensity = 2;
    light.intensity = 3.8;
    light.position.set(-10, 20, 14);
    light.shadow.camera.left = -16;
    light.shadow.camera.right = 16;
    light.shadow.camera.top = 16;
    light.shadow.camera.bottom = -16;
    light.shadow.mapSize.set(Math.min(1024, this.quality.shadowMap), Math.min(1024, this.quality.shadowMap));
    this.previewCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 130);
    this.previewCamera.position.set(12.6, 10.3, 15.5);
    this.previewCamera.lookAt(0, 1.2, 0);
    const floor = mesh(new THREE.PlaneGeometry(160, 160), material(0x0f1220), this.previewScene, 0, -0.8, 0);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;
    const podium = new THREE.Group();
    this.previewScene.add(podium);
    const base = mesh(new THREE.CylinderGeometry(7.45, 7.45, 0.65, 96), material(0x1b2030), podium, 0, -0.36, 0);
    const skirt = mesh(new THREE.CylinderGeometry(7.45, 7.6, 0.18, 96), material(0x151a28), podium, 0, -0.7, 0);
    const top = mesh(new THREE.CylinderGeometry(7.46, 7.46, 0.12, 96), material(0x232a3d), podium, 0, -0.01, 0);
    const track = mesh(new THREE.RingGeometry(5.1, 7.1, 96), material(0x3a3f52, { side: THREE.DoubleSide }), podium, 0, 0.06, 0);
    track.rotation.x = -Math.PI / 2;
    const curb = mesh(new THREE.RingGeometry(5.03, 5.2, 96), material(0xff7a12, { side: THREE.DoubleSide, emissive: 0xff7a12, emissiveIntensity: 0.35 }), podium, 0, 0.07, 0);
    curb.rotation.x = -Math.PI / 2;
    this.showroomParts = { floor, base, skirt, top, track, curb, hemi };
    const dashMaterial = material(0xd6d9e6);
    for (let i = 0; i < 30; i += 1) {
      const angle = (i / 30) * Math.PI * 2;
      const dash = mesh(new THREE.BoxGeometry(0.52, 0.025, 0.08), dashMaterial, podium,
        Math.sin(angle) * 6.15, 0.08, Math.cos(angle) * 6.15);
      dash.rotation.y = angle;
    }
    const white = material(0xf4f0e2);
    const black = material(0x14161d);
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 2; j += 1) mesh(new THREE.BoxGeometry(0.48, 0.03, 0.48), (i + j) % 2 ? white : black,
        podium, -0.25 + j * 0.5, 0.091, 5.35 + i * 0.48);
    }
    // Tyre stacks instead of trees: a garage, not a meadow.
    const tyre = material(0x22262f, { roughness: 0.95 });
    const tyreStripe = [material(0xff7a12), material(0x1e5bd8), material(0xffe600)];
    [[-4, -3.1, 3], [3.7, -2.7, 2], [-3.1, 2.4, 2]].forEach(([x, z, count], i) => {
      for (let k = 0; k < count; k += 1) {
        const ring = mesh(new THREE.TorusGeometry(0.62, 0.26, 10, 22), tyre, podium, x, 0.28 + k * 0.5, z);
        ring.rotation.x = Math.PI / 2;
        if (k === count - 1) {
          const band = mesh(new THREE.TorusGeometry(0.62, 0.27, 6, 22, Math.PI * 0.7), tyreStripe[i], podium, x, 0.29 + k * 0.5, z);
          band.rotation.x = Math.PI / 2;
        }
      }
    });
    const decorativeBrick = new THREE.Group();
    const blueBrick = material(0x1e5bd8);
    decorativeBrick.position.set(3.3, 0.12, 2.1);
    decorativeBrick.rotation.y = -0.3;
    mesh(new THREE.BoxGeometry(1.25, 0.55, 0.75), blueBrick, decorativeBrick, 0, 0.275, 0);
    for (const x of [-0.35, 0.35]) mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 12), blueBrick, decorativeBrick, x, 0.61, 0);
    podium.add(decorativeBrick);
    this.previewStars = [];
    [[-4.5, 4.5, 0.8, 0.47], [4, 3.6, -2, 0.35], [1.4, 5.7, -3, 0.26]].forEach(([x, y, z, size]) => {
      const star = makeStar(material(0xffe600, { metalness: 0.12, roughness: 0.36, emissive: 0xffe600, emissiveIntensity: 0.25 }), size);
      star.position.set(x, y, z);
      star.rotation.set(0.08, 0.6, -0.12);
      star.userData.baseY = y;
      this.previewStars.push(star);
      this.previewScene.add(star);
    });
    this.previewRoot = new THREE.Group();
    this.previewRoot.position.y = 0.11;
    this.previewScene.add(this.previewRoot);
  },

  /** Repaints the showroom for an interface skin (see SHOWROOM_LOOK); the car models are never re-coloured. */
  setShowroomLook(name = 'scuro') {
    const look = SHOWROOM_LOOK[name] || SHOWROOM_LOOK.scuro;
    const parts = this.showroomParts;
    if (!parts) return false;
    this.previewScene.background.setHex(look.back);
    this.previewScene.fog.color.setHex(look.back);
    parts.floor.material.color.setHex(look.floor);
    parts.base.material.color.setHex(look.podium[0]);
    parts.skirt.material.color.setHex(look.podium[1]);
    parts.top.material.color.setHex(look.podium[2]);
    parts.track.material.color.setHex(look.asphalt);
    parts.curb.material.color.setHex(look.curb);
    parts.curb.material.emissive.setHex(look.curb);
    parts.hemi.color.setHex(look.hemiSky);
    parts.hemi.groundColor.setHex(look.hemiGround);
    for (const star of this.previewStars || []) { star.material.color.setHex(look.star); star.material.emissive.setHex(look.star); }
    this.previewShadowDirty = true;
    return true;
  },

  renderPreview(spec, dt = 1 / 60) {
    this.clock += Math.min(dt, 0.1);
    this.frame += 1;
    // The showroom car only sways: refresh its shadow when the model changes and ten times a second — in seconds,
    // so the cadence is the same whether the menu draws at 30 or at 120 fps.
    const dueShadow = this.clock - (this.previewShadowAt || -9) >= 0.1;
    this.renderer.shadowMap.needsUpdate = this.previewSpec !== spec || this.previewShadowDirty || dueShadow;
    if (this.renderer.shadowMap.needsUpdate) this.previewShadowAt = this.clock;
    this.previewShadowDirty = false;
    if (this.previewSpec !== spec) {
      if (this.previewModel) {
        this.previewRoot.remove(this.previewModel);
        disposeObject(this.previewModel);
      }
      this.previewSpec = spec;
      this.previewModel = createCarModel(spec);
      setShadows(this.previewModel);
      const bounds = new THREE.Box3().setFromObject(this.previewModel);
      const size = bounds.getSize(new THREE.Vector3());
      const scale = Math.min(1.52, 5.45 / Math.max(size.x, size.z, size.y * 1.3));
      this.previewModel.scale.setScalar(scale);
      this.previewRoot.add(this.previewModel);
    }
    this.previewRoot.rotation.y = -0.43 + Math.sin(this.clock * 0.22) * 0.12;
    this.previewRoot.position.y = 0.12 + Math.sin(this.clock * 1.5) * 0.018;
    this.previewStars.forEach((star, i) => {
      star.position.y = star.userData.baseY + Math.sin(this.clock * 1.6 + i * 1.8) * 0.13;
      star.rotation.y = 0.6 + Math.sin(this.clock * 0.7 + i) * 0.25;
    });
    const aspect = this.width / this.height;
    this.previewCamera.fov = aspect < 0.95 ? 47 : 36;
    this.previewCamera.updateProjectionMatrix();
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.render(this.previewScene, this.previewCamera);
  },

  createCarThumbnail(spec) {
    if (!this.thumbnailRenderer) {
      this.thumbnailRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.thumbnailRenderer.setSize(320, 220, false);
      this.thumbnailRenderer.setPixelRatio(1);
      this.thumbnailRenderer.outputColorSpace = THREE.SRGBColorSpace;
      this.thumbnailRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.thumbnailRenderer.toneMappingExposure = 1.13;
      this.thumbnailRenderer.setClearColor(0xe9eef5, 0);
      this.thumbnailScene = new THREE.Scene();
      addLights(this.thumbnailScene, false);
      this.thumbnailCamera = new THREE.PerspectiveCamera(34, 320 / 220, 0.1, 100);
    }
    const car = createCarModel(spec);
    this.thumbnailScene.add(car);
    const bounds = new THREE.Box3().setFromObject(car);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x * 0.8, size.z * 0.72, size.y * 1.05, 1.8);
    this.thumbnailCamera.position.copy(center).add(new THREE.Vector3(radius * 1.6, radius * 1.2, radius * 2.1));
    this.thumbnailCamera.lookAt(center.x, center.y - 0.02, center.z);
    this.thumbnailRenderer.render(this.thumbnailScene, this.thumbnailCamera);
    // WebP keeps the garage cache small; browsers without a WebP encoder fall back to PNG on their own.
    const dataUrl = this.thumbnailRenderer.domElement.toDataURL('image/webp', 0.85);
    this.thumbnailScene.remove(car);
    disposeObject(car);
    // The garage asks for its thumbnails in a burst. A few seconds after the last one this second WebGL context is
    // given back, instead of staying alive (GPU memory, and one more against the browser's cap on live contexts)
    // for the whole session. It cannot be the main renderer: a render target skips the ACES tone mapping and the
    // main canvas has no alpha, so the thumbnails would change look.
    clearTimeout(this.thumbnailIdle);
    this.thumbnailIdle = setTimeout(() => this.releaseThumbnailRenderer(), 3000);
    return dataUrl;
  },

  releaseThumbnailRenderer() {
    clearTimeout(this.thumbnailIdle);
    if (!this.thumbnailRenderer) return;
    this.thumbnailRenderer.dispose();
    this.thumbnailRenderer.forceContextLoss();
    this.thumbnailRenderer = null;
  },
};
