import { createLocalScenery, isLocalSceneryReserved, localGroundHoles } from './local-scenery.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCarModel } from './cars.js';
import { DEFAULT_TRACK, weatherIndex } from './track.js';
import { racerPose, sectionAt, sectionFraction } from './sections.js';
import { KNOCK_RISE, KNOCK_SLIDE, KNOCK_TIME, livePose } from './critters.js';
import { SPIN_TIME, STUCK_TIME } from './race.js';
import { QUALITY_LEVELS } from './quality.js';
import { PILOT_COLOR_NUMBERS } from './pilots.js';
import { seeded } from './random.js';
import { leansIntoTurns } from './wheels.js';
import { bendCurvature, leanLimit, leanTarget, stepLean, rest, wheelSteer, slideTarget, slideOffset, leavesMarks, skidColour } from './lean.js';

const ROAD_Y = 0.18;
/** How much faster the scenery moves in the aerial preview than during a race. */
const PREVIEW_TIME_SCALE = 3;
/** "Esplora la pista": one lap seen from a helicopter. Ten seconds is enough to take a circuit in; thirty was
 * long enough that a child stopped watching before it landed. */
export const FLYOVER_SECONDS = 11;
// The chase camera's own planes. The aerial preview borrows camera 0 and flies several hundred metres out, so it
// widens them for itself and hands them back: with the race's 700 m the ground was sliced off mid-picture and the
// sky showed through the hole — which is exactly what Villasanta, the widest circuit, looked like.
const RACE_NEAR = 0.15, RACE_FAR = 700;
// Half the side of the ground plane. It used to be 750 m, which the preview could see past.
const GROUND_REACH = 2000;
const PLAYER_COLORS = PILOT_COLOR_NUMBERS;
/** Showroom scenery per interface skin: the cars keep their own materials, only floor, podium and light change. */
const SHOWROOM_LOOK = {
  scuro: { back: 0x101314, floor: 0x101314, podium: [0x1d2223, 0x161a1b, 0x272d2e], asphalt: 0x39403f, curb: 0xf48637, star: 0xffd54a, hemiSky: 0xd8ecff, hemiGround: 0x1a1f20 },
  chiaro: { back: 0xe8e1d3, floor: 0xe8e1d3, podium: [0xd8d0be, 0xc9c0ac, 0xe4ddcc], asphalt: 0x9a9284, curb: 0xbe352a, star: 0xf0a81e, hemiSky: 0xfffaf0, hemiGround: 0xcdc3ae },
};
const WORLD_UP = new THREE.Vector3(0, 1, 0);
// Scratch vectors for the per-frame paths, so racing allocates nothing.
const _position = new THREE.Vector3(), _target = new THREE.Vector3(), _look = new THREE.Vector3(), _rest = new THREE.Vector3(), _behind = new THREE.Vector3();
const JELLY_COLOR = 0x5be03a;
/** The wrappers of the machine gun's sweets. */
const CANDY_COLORS = [0xff4fa3, 0xffd23a, 0x4fd1ff, 0x7be04a, 0xff7a1a, 0xb36bff];
/** What a blown-up prop throws about: the colours it is built from in buildObstacles. */
const OBSTACLE_DEBRIS = {
  cone: ['#e5203a', '#f4f0e2'], bale: ['#e0c070', '#c9a44e'], bin: ['#2f7d4f', '#3f4149'],
  barrier: ['#e5203a', '#f4f0e2', '#8d9299'], desk: ['#c8a06a', '#8d9299'], planter: ['#9a9484', '#4f8f5a', '#4a3a2c'],
  rock: ['#9a9484', '#6b6658'],
};
/** Road and shoulder colours of the switchable surfaces (see SURFACE_KINDS in track.js); the theme road is the default. */
const SURFACE_COLORS = { asphalt: { road: 0x40444d, shoulder: 0xb7b1a5 }, cobbles: { road: 0x8d8983, shoulder: 0xd9cfbd }, dirt: { road: 0x8a6a48, shoulder: 0xb59a74 }, sand: { road: 0xdcc89a, shoulder: 0xe8dcbc }, grass: { road: 0x55813f, shoulder: 0x6a9a4c } };

/** Height of the road surface above its centre line at this lane: banked bends raise the outer edge (see track.bank). */
function bankRise(track, distance, lane) {
  const bank = track.bank ? track.bank(distance) : 0;
  if (!bank) return 0;
  const half = track.roadWidth / 2;
  return Math.tan(Math.abs(bank)) * (bank > 0 ? lane + half : half - lane);
}

/** Cobblestones ("sanpietrini"): a small repeating canvas of staggered grey stones on dark joints. */
function cobbleTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#4b4842';
  context.fillRect(0, 0, size, size);
  const rows = 8, columns = 8, w = size / columns, h = size / rows;
  let seed = 7;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * w + (row % 2 ? w / 2 : 0), y = row * h;
      const shade = 130 + Math.floor(random() * 45);
      context.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
      const inset = 2.2;
      context.beginPath();
      context.roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 7);
      context.fill();
      if (x + w > size) {
        context.beginPath();
        context.roundRect(x - size + inset, y + inset, w - inset * 2, h - inset * 2, 7);
        context.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0, ...extra });
}

/** 0→1 with a little overshoot past 1 before settling: the boing of something popping back into shape. */
function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
}

function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  if (parent) parent.add(object);
  return object;
}

/**
 * Tyre marks: one instanced mesh of flat strips, recycled as a ring, so the road can carry hundreds of them for a
 * single draw call. A strip at scale zero is an empty slot. It lives in `trackObjects`, so a new race clears it.
 */
function createSkids(count) {
  if (!count) return null;
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const skidMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.InstancedMesh(geometry, skidMaterial, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const empty = new THREE.Matrix4().makeScale(0, 0, 0), black = new THREE.Color(0x000000);
  for (let i = 0; i < count; i += 1) { mesh.setMatrixAt(i, empty); mesh.setColorAt(i, black); }
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return { mesh, next: 0, count, dirty: false };
}
const _skidPosition = new THREE.Vector3(), _skidQuaternion = new THREE.Quaternion(), _skidYaw = new THREE.Quaternion();
const _skidScale = new THREE.Vector3(), _skidMatrix = new THREE.Matrix4(), _skidColor = new THREE.Color(), _skidAxis = new THREE.Vector3(0, 1, 0);

function worldPoint(track, distance, lane = 0, y = ROAD_Y, target = new THREE.Vector3()) {
  const frame = track.frame(distance);
  const rise = track.elevation ? track.elevation(distance) : 0;
  return target.set(frame.x + frame.dz * lane, y + rise + bankRise(track, distance, lane), frame.z - frame.dx * lane);
}

/** Like worldPoint, but inside a loop-the-loop the point follows the loop's own path (projectiles, effects). */
function pathPoint(track, distance, lane = 0, y = ROAD_Y, target = new THREE.Vector3()) {
  const loop = track.sections?.length ? sectionAt(track.sections, track.wrap(distance)) : null;
  if (!loop) return worldPoint(track, distance, lane, y, target);
  const pose = loop.pose(sectionFraction(loop, track.wrap(distance)), lane);
  return target.set(pose.x + pose.up.x * y, pose.y + pose.up.y * y, pose.z + pose.up.z * y);
}

/**
 * Lays a flat thing ON the road instead of horizontally above it. A puddle is a disc a few metres across, and on a
 * hilly circuit the road under it tilts: at Crete Senesi the slick was buried at one end and floating at the other,
 * which is what "the oil pools get cut" meant. YXZ order so the pitch is taken about the road's own cross axis
 * after the heading, and the roll follows the banking.
 */
function alignToRoad(object, track, distance, lane = 0) {
  const frame = track.frame(distance);
  object.rotation.order = 'YXZ';
  object.rotation.y = Math.atan2(frame.dx, frame.dz);
  object.rotation.x = -Math.atan(track.slope ? track.slope(distance) : 0);
  object.rotation.z = track.bank ? track.bank(distance) : 0;
  return object;
}

/** Orientation of a car (or camera target) from a section pose: local +z forward, +y up, +x toward the positive lane. */
function poseQuaternion(pose, target = new THREE.Quaternion()) {
  const forward = new THREE.Vector3(pose.forward.x, pose.forward.y, pose.forward.z).normalize();
  const up = new THREE.Vector3(pose.up.x, pose.up.y, pose.up.z);
  up.addScaledVector(forward, -up.dot(forward)).normalize();
  const side = new THREE.Vector3().crossVectors(up, forward).normalize();
  return target.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, forward));
}

/** A strip of road along a section path (bridge deck or loop track), `halfWidth` either side of the centre line. */
function sectionStrip(section, halfWidth, lift, mat, steps) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    for (const side of [-1, 1]) {
      const pose = section.pose(u, side * halfWidth);
      positions.push(pose.x + pose.up.x * lift, pose.y + pose.up.y * lift, pose.z + pose.up.z * lift);
    }
    if (i < steps) {
      const k = i * 2;
      indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry, mat);
  result.receiveShadow = true;
  result.castShadow = true;
  return result;
}

/** Tube following one edge (or the centre) of a section path, for handrails, chords and rims. */
function sectionTube(section, lane, lift, radius, mat, steps = 80) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const pose = section.pose(i / steps, lane);
    points.push(new THREE.Vector3(pose.x + pose.up.x * lift, pose.y + pose.up.y * lift, pose.z + pose.up.z * lift));
  }
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), steps * 2, radius, 6, false), mat);
  tube.castShadow = false;
  return tube;
}

/** Box strut between two points; used for bridge trusses and loop spokes. */
function strut(a, b, thickness, mat, parent) {
  const length = a.distanceTo(b);
  if (length < 0.05) return null;
  const bar = mesh(new THREE.BoxGeometry(thickness, thickness, length), mat, parent);
  bar.position.copy(a).lerp(b, 0.5);
  bar.lookAt(b);
  bar.castShadow = false;
  return bar;
}

/** Terrain that follows the road's height profile, so hills look like hills instead of a floating ribbon. */
function heightfield(track, mat) {
  const { bounds } = track;
  const margin = 85, step = 2.5;
  const minX = bounds.minX - margin, maxX = bounds.maxX + margin, minZ = bounds.minZ - margin, maxZ = bounds.maxZ + margin;
  const nx = Math.ceil((maxX - minX) / step), nz = Math.ceil((maxZ - minZ) / step);
  const positions = [], indices = [], uvs = [];
  for (let j = 0; j <= nz; j += 1) for (let i = 0; i <= nx; i += 1) {
    const x = minX + (i / nx) * (maxX - minX), z = minZ + (j / nz) * (maxZ - minZ);
    positions.push(x, track.groundHeight(x, z) - 0.03, z);
    // Same frame as the flat ground below (whose plane spans -GROUND_REACH..GROUND_REACH), so a floor pattern
    // runs across the join without a seam. Without a uv the heightfield carried no pattern at all — and it is the
    // piece that covers the middle of a circuit, so the ground's own checkerboard only showed outside it.
    uvs.push((x + GROUND_REACH) / (GROUND_REACH * 2), 1 - (z + GROUND_REACH) / (GROUND_REACH * 2));
  }
  for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry, mat);
  result.receiveShadow = true;
  result.castShadow = false;
  return result;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function setShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function disposeObject(object) {
  const geometries = new Set();
  const materials = new Set();
  object.traverse((child) => {
    if (child.isInstancedMesh) child.dispose();
    if (child.geometry && !child.geometry.userData.shared) geometries.add(child.geometry);
    const list = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    list.forEach((mat) => { if (!mat.userData.shared) materials.add(mat); });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((mat) => {
    mat.map?.dispose();
    mat.dispose();
  });
}

function batchStaticMeshes(scene) {
  scene.updateMatrixWorld(true);
  const batches = new Map();
  const sourceGeometries = new Set();
  scene.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || object.userData.dynamic || Array.isArray(object.material)) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${Object.keys(object.geometry.attributes).sort().join(',')}:${!!object.geometry.index}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const geometries = objects.map((object) => object.geometry.clone().applyMatrix4(object.matrixWorld));
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) { geometries.forEach((entry) => entry.dispose()); continue; }
    const merged = new THREE.Mesh(geometry, objects[0].material);
    merged.castShadow = objects[0].castShadow;
    merged.receiveShadow = objects[0].receiveShadow;
    scene.add(merged);
    objects.forEach((object) => { sourceGeometries.add(object.geometry); object.removeFromParent(); });
    geometries.forEach((entry) => entry.dispose());
  }
  // Original geometry may also be used by an unbatched mesh, so dispose only orphans.
  scene.traverse((object) => { if (object.geometry) sourceGeometries.delete(object.geometry); });
  sourceGeometries.forEach((geometry) => geometry.dispose());
}

/**
 * A two-colour checkerboard for a floor, as four texels read with a nearest filter and repeated across the ground.
 * The classroom is lino, and lino in a school is laid in squares — a single flat colour read as a field, not a floor.
 */
function checkerTexture(a, b) {
  // 128 px, not 2: a two-texel checkerboard is averaged away by the very first mipmap level and the floor goes back
  // to looking like one flat colour a few metres from the camera. At this size the squares survive minification,
  // and the seam line drawn between them keeps the joints readable further out still.
  const size = 128, half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d');
  const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;
  context.fillStyle = hex(a); context.fillRect(0, 0, size, size);
  context.fillStyle = hex(b); context.fillRect(half, 0, half, half); context.fillRect(0, half, half, half);
  context.strokeStyle = 'rgba(0,0,0,.12)';
  context.lineWidth = 2;
  context.strokeRect(0, 0, half, half); context.strokeRect(half, half, half, half);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function textTexture(text, background = '#7661db', foreground = '#ffffff', width = 256, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(255,255,255,.25)';
  context.lineWidth = 10;
  context.strokeRect(13, 13, width - 26, height - 26);
  context.fillStyle = foreground;
  let fontSize = Math.round(height * 0.72);
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  while (context.measureText(text).width > width * 0.88 && fontSize > 12) {
    fontSize -= 2;
    context.font = `900 ${fontSize}px Arial, sans-serif`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height * 0.54);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addLights(scene, shadows = true) {
  const hemi = new THREE.HemisphereLight(0xe9f5ff, 0x719768, 2.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4df, 3.4);
  sun.position.set(-30, 55, 30);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc5d9ff, 0.7);
  fill.position.set(30, 12, -40);
  scene.add(fill);
  return { hemi, sun, fill };
}

/** A closed ribbon follows the exact same track coordinates as the simulation. */
function ribbon(track, start, length, width, lane, height, mat, segments = 200) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const fraction = i / segments;
    const y = typeof height === 'function' ? height(fraction) : height;
    for (const side of [-1, 1]) {
      const point = worldPoint(track, start + length * fraction, lane + width * 0.5 * side, y);
      positions.push(point.x, point.y, point.z);
      // One texture tile every 4 m along, `width / 4` tiles across: square cobblestones on any road width.
      uvs.push((start + length * fraction) / 4, side < 0 ? 0 : width / 4);
    }
    if (i < segments) {
      const k = i * 2;
      indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const result = new THREE.Mesh(geometry, mat);
  result.receiveShadow = true;
  return result;
}

function makeStar(mat, radius = 1) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const r = radius * (i % 2 ? 0.48 : 1);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.23, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 2, steps: 1,
  });
  return mesh(geometry, mat);
}

/**
 * Where the circuit passes OVER itself on a raised deck. The chase camera flies at about 11 m, so when the car drives
 * underneath such a deck the camera used to stay above it and the picture became the underside of a floor — the
 * children's words were "the camera doesn't go under the bridge". These are the places it has to duck.
 * Only `bridge: true` bumps count: an ordinary hill carries the terrain up with it, there is nothing to pass beneath.
 */
function overheadDecks(track) {
  const decks = [];
  for (const bump of track.elevationBumps || []) {
    if (!bump.bridge) continue;
    const half = bump.length / 2;
    const step = Math.max(4, bump.length / 48);
    for (let offset = -half; offset <= half; offset += step) {
      const distance = bump.distance + offset;
      const point = track.frame(distance);
      decks.push({ x: point.x, z: point.z, y: track.elevation(distance) + ROAD_Y, radius: track.roadWidth / 2 + 5 });
    }
  }
  return decks;
}

/** Lowers a camera position that has a deck over its head, but never below the car it is following. */
function duckUnderDecks(decks, position, floorY) {
  if (!decks || !decks.length) return;
  for (const deck of decks) {
    if (position.y > deck.y - 1.2) {
      const dx = position.x - deck.x, dz = position.z - deck.z;
      if (dx * dx + dz * dz > deck.radius * deck.radius) continue;
      // Only duck for a deck the car itself is well below: driving ON the deck must not pull the camera down.
      if (floorY > deck.y - 4) continue;
      position.y = Math.max(floorY + 2.2, deck.y - 1.2);
    }
  }
}

export class GameRenderer {
  constructor(container, track = DEFAULT_TRACK, { quality = 'medium' } = {}) {
    this.container = container;
    this.quality = QUALITY_LEVELS[quality] || QUALITY_LEVELS.medium;
    this.frame = 0;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
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
    this.cameras = [0, 1].map(() => new THREE.PerspectiveCamera(56, 1, RACE_NEAR, RACE_FAR));
    this.cameraInitialized = [false, false];
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
    this.cameras.forEach((camera) => {
      camera.aspect = this.width / this.players / this.height;
      camera.updateProjectionMatrix();
    });
  }

  setMode(players = 1) {
    this.players = Math.max(1, Math.min(2, Number(players) || 1));
    this.cameraInitialized = [false, false];
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

  /** The weather entry a circuit is on, given the lap the leading player is running. */
  weatherEntry(index) {
    const list = this.track?.theme?.weather;
    return list?.length ? list[((index % list.length) + list.length) % list.length] : null;
  }

  /** Falling rain: short vertical streaks in a box that travels with the players. */
  buildRain() {
    if (this.rain) return this.rain;
    const drops = 1400, positions = new Float32Array(drops * 6);
    this.rainSpan = { x: 170, y: 46, z: 170 };
    for (let i = 0; i < drops; i++) {
      const x = (Math.random() - 0.5) * this.rainSpan.x, y = Math.random() * this.rainSpan.y, z = (Math.random() - 0.5) * this.rainSpan.z;
      positions.set([x, y, z, x, y - 0.9, z], i * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xd4e4ef, transparent: true, opacity: 0 }));
    this.rain.name = 'rain';
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    return this.rain;
  }

  /**
   * Circuits with `theme.weather` change sky, fog, light and rain once per lap, cycling through the list and
   * crossfading over a couple of seconds instead of snapping. Everything else keeps its single fixed weather.
   */
  updateWeather(step, race) {
    const list = this.track?.theme?.weather;
    if (!list?.length) { if (this.rain) this.rain.visible = false; return; }
    const lap = Math.max(...(race?.racers || []).filter((r) => r.isPlayer).map((r) => r.lap || 1), 1);
    if (this.weatherLap !== lap) {
      this.weatherLap = lap;
      this.weatherFrom = this.weatherTo ?? this.weatherEntry(0);
      this.weatherTo = this.weatherEntry(weatherIndex(this.track.theme, lap, race?.totalLaps || 1));
      this.weatherMix = this.weatherFrom === this.weatherTo ? 1 : 0;
    }
    const from = this.weatherFrom ?? list[0], to = this.weatherTo ?? list[0];
    this.weatherMix = Math.min(1, (this.weatherMix ?? 1) + step / 2.5);
    const t = this.weatherMix * this.weatherMix * (3 - 2 * this.weatherMix);
    const mix = (a, b) => a + (b - a) * t;
    const scratch = (this.weatherColor ||= new THREE.Color());
    this.scene.background.lerpColors(scratch.setHex(from.sky), new THREE.Color(to.sky), t);
    this.scene.fog.color.lerpColors(scratch.setHex(from.fog), new THREE.Color(to.fog), t);
    this.scene.fog.near = mix(from.fogNear, to.fogNear);
    this.scene.fog.far = mix(from.fogFar, to.fogFar);
    this.sun.color.lerpColors(scratch.setHex(from.sun), new THREE.Color(to.sun), t);
    this.sun.intensity = mix(from.sunIntensity, to.sunIntensity);
    this.lights.hemi.intensity = mix(from.hemiIntensity, to.hemiIntensity);
    this.starLevel = mix(from.stars ?? 1, to.stars ?? 1);
    // Rain: the streaks fall and wrap inside a box kept between the players, so both see the same shower.
    const drops = mix(from.rain || 0, to.rain || 0);
    const rain = drops > 1 ? this.buildRain() : this.rain;
    if (!rain) return;
    rain.visible = drops > 1;
    if (!rain.visible) return;
    rain.material.color.setHex(0xd4e4ef);
    rain.material.opacity = Math.min(0.5, drops / 2600);
    this.moveDrops(rain, step * 26);
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
  }

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
  }

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
  }

  /** Every prop standing and full size again: for the aerial preview, which has no race to read. */
  resetObstacles() {
    for (const group of this.world?.userData.obstacleGroups?.values() || []) {
      group.visible = true;
      group.scale.setScalar(1);
      group.userData.grow = undefined;
    }
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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

  /* ---------- Hit effects: brick debris, flashes, smoke and camera shake ---------- */
  effectMaterial(color) {
    this.effectMaterials ||= new Map();
    const key = String(color);
    if (!this.effectMaterials.has(key)) this.effectMaterials.set(key, material(new THREE.Color(color), { roughness: 0.5 }));
    return this.effectMaterials.get(key);
  }

  /** Reacts to the simulation events main.js drained this frame (hits, shield hits, bomb pops). */
  handleEvents(events, race) {
    this.effects ||= [];
    this.shake ||= [0, 0];
    for (const event of events) {
      if (event.type === 'hit' || event.type === 'shield-hit') {
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model || !racer) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'shield-hit') this.spawnFlash(position, 0x37d5f2, 2.4, 0.35);
        else {
          const palette = racer.spec?.palette?.length ? racer.spec.palette : [racer.spec?.color || '#ff6a00', racer.spec?.accent || '#ffe600'];
          // The more battered the car, the more of it flies off: the third hit is the one that takes it apart.
          const wear = 1 + (event.damage || 0) * 0.3;
          // A sweet from the machine gun scatters sweets, not bricks — unless it is the hit that takes the car apart.
          const candy = event.source === 'bullet' && (event.damage || 0) < 3;
          const colours = candy ? CANDY_COLORS.map((hex) => `#${hex.toString(16).padStart(6, '0')}`) : palette;
          this.spawnExplosion(position, colours, (event.source === 'bullet' ? 0.45 : 1) * wear);
        }
        if (racer.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], event.source === 'bullet' ? 0.3 : event.type === 'shield-hit' ? 0.35 : 0.85);
      } else if (event.type === 'pop') {
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.6);
        if (event.source === 'jelly') this.spawnFlash(position, JELLY_COLOR, 2.2, 0.3);
        else if (event.source === 'oil') this.spawnFlash(position, 0x3a4450, 1.8, 0.24);
        // A sweet from the machine gun bursting on a column: five a second, so a pop of colour rather than a fireball.
        else if (event.source === 'bullet') this.spawnFlash(position, CANDY_COLORS[Math.floor(event.distance) % CANDY_COLORS.length], 1.2, 0.14);
        else this.spawnExplosion(position, ['#ff6a00', '#ffe600', '#e5203a', '#15161c'], 1.4);
      } else if (event.type === 'land' && event.impact > 3.2) {
        // Touchdown: a puff off the tyres where the car hits, and a nudge of the camera for whoever is driving.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        this.spawnExplosion(position, ['#e8e4d8', '#b7b1a5'], Math.min(1, event.impact / 14) * (event.bounce ? 0.5 : 0.3));
        if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], Math.min(0.5, event.impact / 30));
      } else if (event.type === 'bump' || event.type === 'creamed') {
        // Running into something solid, or taking a scoop on the windscreen: a puff where it happened, and a
        // shake for the child it happened to. No fireball — nothing has broken.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'creamed') {
          this.spawnFlash(position, 0xfff1e0, 2.4, 0.3);
          this.spawnExplosion(position, ['#fff1e0', '#f7a8c0', '#8fd9a8'], 0.6);
        } else this.spawnExplosion(position, event.source === 'bale' ? ['#e0c070', '#c9a44e'] : ['#d8d4c8', '#8d9299'], event.soft ? 0.5 : 0.9);
        if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], event.soft === false ? 0.7 : 0.35);
      } else if (event.type === 'stuck') {
        // Glued by a jelly: a green splash of bricks around the car.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        this.spawnFlash(position, JELLY_COLOR, 2, 0.3);
        this.spawnExplosion(position, ['#5be03a', '#2fd36f', '#ffe600'], 0.6);
        if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], 0.4);
      } else if (event.type === 'obstacle-break' || event.type === 'obstacle-back') {
        // A prop blown up throws its own colours about; one flattened by a bale only puffs straw and dust; one
        // growing back gets a small white pop so the eye catches it.
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.8);
        if (event.type === 'obstacle-back') this.spawnFlash(position, 0xfff6d5, 2.2, 0.25);
        else if (event.squash) this.spawnExplosion(position, ['#e0c070', '#c9a44e', '#b7b1a5'], 0.7);
        else {
          this.spawnExplosion(position, OBSTACLE_DEBRIS[event.kind] || ['#d8d4c8', '#8d9299'], 1.3);
          this.spawnFlash(position, 0xffb03a, 3.6, 0.32);
        }
      } else if (event.type === 'critter-hit' || event.type === 'critter-up') {
        // An animal bowled over: a puff of dust and a white flash where the shot met it, no fire and no bricks —
        // nothing breaks. Getting back up gets a small pop of its own, like a prop growing back.
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.8);
        if (event.type === 'critter-up') this.spawnFlash(position, 0xfff6d5, 1.8, 0.2);
        else {
          this.spawnFlash(position, 0xffffff, 2.6, 0.24);
          this.spawnExplosion(position, ['#e8e4d8', '#c9bfa8', '#fff6d5'], 0.7);
        }
      } else if (['squashed', 'unsquashed', 'attacked', 'released', 'rainbow-block', 'critter-scared'].includes(event.type)) {
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'squashed') this.spawnExplosion(position, ['#e0c070', '#c9a44e'], 0.8);
        else if (event.type === 'unsquashed') this.spawnFlash(position, 0xfff6d5, 2.4, 0.22);
        else if (event.type === 'attacked') this.spawnExplosion(position, ['#e8e4d8', '#8a7a52', '#4a3a2e'], 0.7);
        else if (event.type === 'released') this.spawnFlash(position, 0xe8e4d8, 2, 0.2);
        else {
          // Something burst against the rainbow, or an animal ran off from it: a flash in whatever colour it is now.
          const colour = new THREE.Color().setHSL((this.clock * 1.4) % 1, 1, 0.6);
          this.spawnFlash(position, colour.getHex(), event.type === 'rainbow-block' ? 3.2 : 2.2, 0.28);
        }
        const shake = { squashed: 0.7, attacked: 0.8, 'rainbow-block': 0.25 }[event.type];
        if (racer?.isPlayer && shake) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], shake);
      } else if (event.type === 'wreck' || event.type === 'respawn') {
        // Third hit: the whole car comes apart in a cartoon fireball. A second later it is dropped back, brand new.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'respawn') this.spawnFlash(position, 0xfff6d5, 4.2, 0.32);
        else {
          const palette = racer?.spec?.palette?.length ? racer.spec.palette : [racer?.spec?.color || '#ff6a00', racer?.spec?.accent || '#ffe600'];
          this.spawnExplosion(position, palette, 2.2);
          this.spawnFlash(position, 0xffb03a, 5.4, 0.5);
          if (racer?.isPlayer) this.shake[racer.playerIndex] = 1.3;
        }
      }
    }
  }

  /** A lick of cartoon flame: used while a wrecked car burns, a few per second so it flickers. */
  spawnFlame(position) {
    const spread = () => (this._windRandom ? this._windRandom() : Math.random()) - 0.5;
    const flame = position.clone().add(new THREE.Vector3(spread() * 1.6, 0.3 + Math.abs(spread()) * 1.4, spread() * 1.6));
    this.spawnFlash(flame, Math.abs(spread()) > 0.25 ? 0xff8a1e : 0xffd94a, 1.5 + Math.abs(spread()) * 2, 0.26);
  }

  spawnFlash(position, color, size, life) {
    this.effects ||= []; // Flames can start before the first event batch is drained.
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    flash.position.copy(position);
    flash.scale.setScalar(size * 0.3);
    flash.userData = { kind: 'flash', life, maxLife: life, size };
    flash.castShadow = false;
    this.scene.add(flash);
    this.effects.push(flash);
  }

  spawnExplosion(position, palette, scale = 1) {
    this.debrisGeometry ||= new THREE.BoxGeometry(0.34, 0.16, 0.22);
    this.puffGeometry ||= new THREE.SphereGeometry(0.5, 10, 7);
    this.spawnFlash(position, 0xffa030, 2.6 * scale, 0.28);
    const count = Math.round(12 * scale);
    for (let i = 0; i < count; i += 1) {
      const piece = new THREE.Mesh(this.debrisGeometry, this.effectMaterial(palette[i % palette.length]));
      piece.position.copy(position);
      const angle = Math.random() * Math.PI * 2, speed = (3.5 + Math.random() * 6) * scale;
      piece.userData = {
        kind: 'debris', life: 1.1 + Math.random() * 0.6,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 5 + Math.random() * 6 * scale, Math.sin(angle) * speed),
        spin: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
      };
      piece.scale.setScalar(0.7 + Math.random() * 0.7 * scale);
      this.scene.add(piece);
      this.effects.push(piece);
    }
    for (let i = 0; i < Math.round(5 * scale); i += 1) {
      const puff = new THREE.Mesh(this.puffGeometry, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3a3f4a : 0x6b7080, transparent: true, opacity: 0.55, depthWrite: false }));
      puff.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.2));
      puff.userData = { kind: 'smoke', life: 1.2, maxLife: 1.2, velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5) };
      puff.scale.setScalar(0.5 * scale);
      puff.castShadow = false;
      this.scene.add(puff);
      this.effects.push(puff);
    }
  }

  updateEffects(step) {
    if (!this.effects?.length) return;
    const groundAt = (x, z) => (this.track?.groundHeight ? this.track.groundHeight(x, z) : 0);
    this.effects = this.effects.filter((object) => {
      const data = object.userData;
      data.life -= step;
      if (data.life <= 0) {
        this.scene.remove(object);
        if (data.kind !== 'debris') { object.material.dispose(); object.geometry.dispose(); }
        return false;
      }
      if (data.kind === 'debris') {
        data.velocity.y -= 18 * step;
        object.position.addScaledVector(data.velocity, step);
        object.rotation.x += data.spin.x * step;
        object.rotation.y += data.spin.y * step;
        object.rotation.z += data.spin.z * step;
        const floor = groundAt(object.position.x, object.position.z) + 0.1;
        if (object.position.y < floor) { object.position.y = floor; data.velocity.y *= -0.35; data.velocity.x *= 0.6; data.velocity.z *= 0.6; data.spin.multiplyScalar(0.5); }
        if (data.life < 0.3) object.scale.multiplyScalar(0.9);
      } else if (data.kind === 'smoke') {
        object.position.addScaledVector(data.velocity, step);
        object.scale.addScalar(step * 1.6);
        object.material.opacity = 0.55 * data.life / data.maxLife;
      } else {
        const t = 1 - data.life / data.maxLife;
        object.scale.setScalar(data.size * (0.3 + t * 0.7));
        object.material.opacity = 0.9 * (1 - t);
      }
      return true;
    });
  }

  /** Slow rotation and a soft twinkle of the bright stars; no-op on daytime circuits. */
  animateSky(step) {
    if (!this.starLayers) return;
    // `starLevel` comes from the weather (Rome: no stars at sunset, all of them at night); the moon waits for dark.
    const level = this.starLevel ?? 1;
    this.stars.visible = level > 0.02;
    for (const child of this.stars.children) if (!child.isPoints) child.visible = level > 0.6;
    // The whole dome turns slowly, so the moon crosses the sky over a race; the two layers twinkle out of step.
    this.stars.rotation.y += step * 0.012;
    const [faint, bright] = this.starLayers.map((layer) => layer.material);
    bright.opacity = (0.72 + Math.sin(this.clock * 3.1) * 0.24) * level;
    bright.size = 4.2 + Math.sin(this.clock * 2.3) * 0.8;
    faint.opacity = (0.84 + Math.sin(this.clock * 1.7 + 1.1) * 0.12) * level;
    faint.size = 2.1 + Math.sin(this.clock * 1.3) * 0.25;
  }

  /** Low banks of mist drifting over the ground, built once for the circuits that ask for them. */
  buildMist(count) {
    if (this.mist) return this.mist;
    this.mist = new THREE.Group();
    this.mist.name = 'mist';
    const geometry = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < count; i += 1) {
      const bank = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xeef3f7, transparent: true, opacity: 0.24, depthWrite: false, fog: false, side: THREE.DoubleSide,
      }));
      bank.rotation.x = -Math.PI / 2;
      bank.scale.set(120 + i * 22, 90 + i * 14, 1);
      bank.position.set((i * 97) % 340 - 170, 1.8 + (i % 4) * 1.1, (i * 131) % 300 - 150);
      bank.userData.drift = { x: bank.position.x, phase: i * 1.3 };
      bank.castShadow = false;
      bank.renderOrder = 2;
      this.mist.add(bank);
    }
    this.world.add(this.mist);
    return this.mist;
  }

  /**
   * Weather that is not a downpour: the wind that bends the trees and pushes the clouds, the sun travelling
   * from morning to afternoon so every shadow swings round, mountain cloud that rises and falls, drifting
   * mist and the odd snow shower. All of it is optional data on the circuit theme.
   */
  updateAtmosphere(step, race) {
    const theme = this.track?.theme;
    if (!theme) return;
    const wind = theme.wind || 0;
    // Trees: only the crowns lean, and each on its own beat, so a wood never sways as one block.
    if (wind && this.trees) {
      const dummy = (this.swayDummy ||= new THREE.Object3D());
      const { crowns, topCrowns, spots } = this.trees;
      spots.forEach((spot, index) => {
        const bend = Math.sin(this.clock * 1.15 + spot.phase) * 0.06 * wind * spot.size;
        const cross = Math.cos(this.clock * 0.83 + spot.phase) * 0.045 * wind * spot.size;
        dummy.rotation.set(0, spot.phase, 0);
        dummy.position.set(spot.x + bend, spot.base + 4.3 * spot.size, spot.z + cross);
        dummy.scale.set(spot.size, spot.size * 1.07, spot.size);
        dummy.updateMatrix();
        crowns.setMatrixAt(index, dummy.matrix);
        dummy.position.set(spot.x + bend * 1.6, spot.base + 5.9 * spot.size, spot.z + cross * 1.6);
        dummy.scale.set(spot.size * 0.9, spot.size, spot.size * 0.9);
        dummy.updateMatrix();
        topCrowns.setMatrixAt(index, dummy.matrix);
      });
      crowns.instanceMatrix.needsUpdate = true;
      topCrowns.instanceMatrix.needsUpdate = true;
    }
    // Clouds: pushed along by the same wind, and on mountain circuits they also climb and sink.
    if (this.clouds && (wind || theme.cloudRise)) {
      for (const cloud of this.clouds.children) {
        const drift = cloud.userData.drift;
        if (!drift) continue;
        drift.x += step * (3 + wind * 9);
        if (drift.x > 210) drift.x = -210;
        cloud.position.x = drift.x;
        if (theme.cloudRise) cloud.position.y = drift.y + Math.sin(this.clock * 0.12 + drift.phase) * 16 * theme.cloudRise;
      }
    }
    // The sun crosses the sky over the whole race, so the shadows swing from one side to the other.
    if (theme.sunTravel) {
      const total = race ? (race.totalLaps || 1) * (race.trackLength || 1) : 0;
      const done = race ? Math.max(...race.racers.map((r) => r.progress || 0), 0) : 0;
      const through = total ? Math.min(1, done / total) : 0;
      const angle = (-0.5 + through) * (theme.sunTravel * Math.PI / 180);
      this.sun.position.set(Math.sin(angle) * 70 - 10, 62 - Math.abs(through - 0.5) * 22, Math.cos(angle) * 55);
    }
    if (theme.mist) {
      for (const bank of this.buildMist(theme.mist).children) {
        const drift = bank.userData.drift;
        drift.x += step * (2.2 + wind * 5);
        if (drift.x > 210) drift.x = -210;
        bank.position.x = drift.x;
        bank.material.opacity = 0.14 + 0.18 * (0.5 + 0.5 * Math.sin(this.clock * 0.21 + drift.phase));
      }
    }
    // Snow: the same streaks as the rain, falling slowly and coming and going in showers.
    if (theme.snow) {
      const drops = theme.snow * Math.max(0, Math.sin(this.clock * 0.16));   // a shower roughly every forty seconds
      const snow = drops > 1 ? this.buildRain() : this.rain;
      if (snow) {
        snow.visible = drops > 1;
        if (snow.visible) {
          snow.material.color.setHex(0xffffff);
          snow.material.opacity = Math.min(0.75, drops / 900);
          this.moveDrops(snow, step * 3.4, this.clock);
        }
      }
    }
  }

  /** Moves falling streaks down by `fall`, drifting sideways, and recycles the ones that reach the ground. */
  moveDrops(object, fall, clock = 0) {
    const cameras = this.cameras.slice(0, Math.max(1, this.players || 1));
    object.position.set(
      cameras.reduce((sum, c) => sum + c.position.x, 0) / cameras.length, 0,
      cameras.reduce((sum, c) => sum + c.position.z, 0) / cameras.length,
    );
    const array = object.geometry.attributes.position.array;
    const sway = Math.sin(clock * 0.7) * fall * 0.35;
    for (let i = 0; i < array.length; i += 6) {
      array[i + 1] -= fall; array[i + 4] -= fall;
      array[i] += sway; array[i + 3] += sway;
      if (array[i + 4] < 0) {
        const x = (Math.random() - 0.5) * this.rainSpan.x, z = (Math.random() - 0.5) * this.rainSpan.z;
        array[i] = x; array[i + 3] = x; array[i + 2] = z; array[i + 5] = z;
        array[i + 1] = this.rainSpan.y; array[i + 4] = this.rainSpan.y - 0.9;
      }
    }
    object.geometry.attributes.position.needsUpdate = true;
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
    this.cameraInitialized = [false, false];
    for (const object of this.effects || []) { this.scene.remove(object); if (object.userData.kind !== 'debris') { object.material.dispose(); object.geometry.dispose(); } }
    this.effects = [];
    this.shake = [0, 0];
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
    return dataUrl;
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
    const model = { root, car, shield, jelly, cream, propeller, parachute, glider, trail, dust, marker, spec: racer.spec, previousLane: racer.lane, baseScale: car.scale.clone() };
    this.racerModels.set(racer.id, model);
    return model;
  }

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
  }

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
  }

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
      // Camera shake after a hit: a decaying random offset applied only for this frame's render.
      const shake = this.shake?.[player] || 0;
      const restPosition = _rest.copy(camera.position);
      if (shake > 0) {
        camera.position.x += (Math.random() - 0.5) * shake * 1.4;
        camera.position.y += (Math.random() - 0.5) * shake * 0.9;
        camera.position.z += (Math.random() - 0.5) * shake * 1.4;
        this.shake[player] = Math.max(0, shake - step * 1.5);
      }
      camera.up.copy(cameraUp || WORLD_UP);
      camera.lookAt(look);
      camera.fov = (this.players === 2 ? 62 : 56) + (racer.boost > 0 ? 4 : 0);
      const left = Math.floor((player * this.width) / this.players);
      const right = Math.floor(((player + 1) * this.width) / this.players);
      camera.aspect = (right - left) / this.height;
      camera.updateProjectionMatrix();
      this.renderer.setViewport(left, 0, right - left, this.height);
      this.renderer.setScissor(left, 0, right - left, this.height);
      this.updateWind(player, camera, racer, step);
      this.renderer.render(this.scene, camera);
      // The mirror re-renders the world into a small texture: lighter profiles refresh it every second or fourth frame,
      // one player at a time, and redraw the last image in between.
      const { mirrorEvery } = this.quality;
      if (mirrorEvery > 0) this.renderMirror(racer, left, right, (this.frame + player) % mirrorEvery === 0);
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
      this.windLevel = [0, 0];
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
    this.thumbnailRenderer?.dispose();
    this.canvas.remove();
  }
}
