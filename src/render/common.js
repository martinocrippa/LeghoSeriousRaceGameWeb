/**
 * Shared pieces of the renderer (renderer.js and the method groups in this folder): constants, scratch vectors,
 * materials and textures, small geometry helpers and the static-mesh batching, moved here unchanged from
 * renderer.js. batchStaticMeshes and heightfield keep their names: the RetroPie build recognises them.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sectionAt, sectionFraction } from '../sections.js';
import { PILOT_COLOR_NUMBERS } from '../pilots.js';

export const ROAD_Y = 0.18;
/** How much faster the scenery moves in the aerial preview than during a race. */
export const PREVIEW_TIME_SCALE = 3;
/** "Esplora la pista": one lap seen from a helicopter. Ten seconds is enough to take a circuit in; thirty was
 * long enough that a child stopped watching before it landed. */
export const FLYOVER_SECONDS = 11;
// The chase camera's own planes. The aerial preview borrows camera 0 and flies several hundred metres out, so it
// widens them for itself and hands them back: with the race's 700 m the ground was sliced off mid-picture and the
// sky showed through the hole — which is exactly what Villasanta, the widest circuit, looked like.
export const RACE_NEAR = 0.15, RACE_FAR = 700;
// Half the side of the ground plane. It used to be 750 m, which the preview could see past.
export const GROUND_REACH = 2000;
export const PLAYER_COLORS = PILOT_COLOR_NUMBERS;
/** Showroom scenery per interface skin: the cars keep their own materials, only floor, podium and light change. */
export const SHOWROOM_LOOK = {
  scuro: { back: 0x101314, floor: 0x101314, podium: [0x1d2223, 0x161a1b, 0x272d2e], asphalt: 0x39403f, curb: 0xf48637, star: 0xffd54a, hemiSky: 0xd8ecff, hemiGround: 0x1a1f20 },
  chiaro: { back: 0xe8e1d3, floor: 0xe8e1d3, podium: [0xd8d0be, 0xc9c0ac, 0xe4ddcc], asphalt: 0x9a9284, curb: 0xbe352a, star: 0xf0a81e, hemiSky: 0xfffaf0, hemiGround: 0xcdc3ae },
};
export const WORLD_UP = new THREE.Vector3(0, 1, 0);
// Scratch vectors for the per-frame paths, so racing allocates nothing.
export const _position = new THREE.Vector3(), _target = new THREE.Vector3(), _look = new THREE.Vector3(), _rest = new THREE.Vector3(), _behind = new THREE.Vector3();
export const JELLY_COLOR = 0x5be03a;
/** The wrappers of the machine gun's sweets. */
export const CANDY_COLORS = [0xff4fa3, 0xffd23a, 0x4fd1ff, 0x7be04a, 0xff7a1a, 0xb36bff];
/** What a blown-up prop throws about: the colours it is built from in buildObstacles. */
export const OBSTACLE_DEBRIS = {
  cone: ['#e5203a', '#f4f0e2'], bale: ['#e0c070', '#c9a44e'], bin: ['#2f7d4f', '#3f4149'],
  barrier: ['#e5203a', '#f4f0e2', '#8d9299'], desk: ['#c8a06a', '#8d9299'], planter: ['#9a9484', '#4f8f5a', '#4a3a2c'],
  rock: ['#9a9484', '#6b6658'], column: ['#9aa0a8', '#d8d4c8'],
};
/** Road and shoulder colours of the switchable surfaces (see SURFACE_KINDS in track.js); the theme road is the default. */
export const SURFACE_COLORS = { asphalt: { road: 0x40444d, shoulder: 0xb7b1a5 }, cobbles: { road: 0x8d8983, shoulder: 0xd9cfbd }, dirt: { road: 0x8a6a48, shoulder: 0xb59a74 }, sand: { road: 0xdcc89a, shoulder: 0xe8dcbc }, grass: { road: 0x55813f, shoulder: 0x6a9a4c } };

/** Height of the road surface above its centre line at this lane: banked bends raise the outer edge (see track.bank). */
export function bankRise(track, distance, lane) {
  const bank = track.bank ? track.bank(distance) : 0;
  if (!bank) return 0;
  const half = track.roadWidth / 2;
  return Math.tan(Math.abs(bank)) * (bank > 0 ? lane + half : half - lane);
}

/** Cobblestones ("sanpietrini"): a small repeating canvas of staggered grey stones on dark joints. */
export function cobbleTexture() {
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

export function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0, ...extra });
}

/** 0→1 with a little overshoot past 1 before settling: the boing of something popping back into shape. */
export function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2;
}

export function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
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
export function createSkids(count) {
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
export const _skidPosition = new THREE.Vector3(), _skidQuaternion = new THREE.Quaternion(), _skidYaw = new THREE.Quaternion();
export const _skidScale = new THREE.Vector3(), _skidMatrix = new THREE.Matrix4(), _skidColor = new THREE.Color(), _skidAxis = new THREE.Vector3(0, 1, 0);

export function worldPoint(track, distance, lane = 0, y = ROAD_Y, target = new THREE.Vector3()) {
  const frame = track.frame(distance);
  const rise = track.elevation ? track.elevation(distance) : 0;
  return target.set(frame.x + frame.dz * lane, y + rise + bankRise(track, distance, lane), frame.z - frame.dx * lane);
}

/** Like worldPoint, but inside a loop-the-loop the point follows the loop's own path (projectiles, effects). */
export function pathPoint(track, distance, lane = 0, y = ROAD_Y, target = new THREE.Vector3()) {
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
export function alignToRoad(object, track, distance, lane = 0) {
  const frame = track.frame(distance);
  object.rotation.order = 'YXZ';
  object.rotation.y = Math.atan2(frame.dx, frame.dz);
  object.rotation.x = -Math.atan(track.slope ? track.slope(distance) : 0);
  object.rotation.z = track.bank ? track.bank(distance) : 0;
  return object;
}

/** Orientation of a car (or camera target) from a section pose: local +z forward, +y up, +x toward the positive lane. */
export function poseQuaternion(pose, target = new THREE.Quaternion()) {
  const forward = new THREE.Vector3(pose.forward.x, pose.forward.y, pose.forward.z).normalize();
  const up = new THREE.Vector3(pose.up.x, pose.up.y, pose.up.z);
  up.addScaledVector(forward, -up.dot(forward)).normalize();
  const side = new THREE.Vector3().crossVectors(up, forward).normalize();
  return target.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, forward));
}

/** A strip of road along a section path (bridge deck or loop track), `halfWidth` either side of the centre line. */
export function sectionStrip(section, halfWidth, lift, mat, steps) {
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
export function sectionTube(section, lane, lift, radius, mat, steps = 80) {
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
export function strut(a, b, thickness, mat, parent) {
  const length = a.distanceTo(b);
  if (length < 0.05) return null;
  const bar = mesh(new THREE.BoxGeometry(thickness, thickness, length), mat, parent);
  bar.position.copy(a).lerp(b, 0.5);
  bar.lookAt(b);
  bar.castShadow = false;
  return bar;
}

/** Terrain that follows the road's height profile, so hills look like hills instead of a floating ribbon. */
export function heightfield(track, mat) {
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

export function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function setShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function disposeObject(object) {
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

export function batchStaticMeshes(scene) {
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
export function checkerTexture(a, b) {
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

export function textTexture(text, background = '#7661db', foreground = '#ffffff', width = 256, height = 256) {
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

export function addLights(scene, shadows = true) {
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
export function ribbon(track, start, length, width, lane, height, mat, segments = 200) {
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

export function makeStar(mat, radius = 1) {
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
export function overheadDecks(track) {
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
export function duckUnderDecks(decks, position, floorY) {
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
