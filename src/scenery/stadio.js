/**
 * Stadio degli Azzurri d'Italia: the road runs through the arena along the pitch, between the main stand and the
 * field; gates in the end stands let the cars in and out. The crowd (instanced bricks in blue and black) bounces
 * and cheers louder whenever a car is inside the stadium.
 * Landmark local frame: +z points toward the road (the road centre line is at local z = +30, along local x).
 */
import * as THREE from 'three';

export const streetHouses = 16;
export const RESERVED = { arena: 40 };

/** The whole stadium footprint is kept free of trees, bricks and street houses. */
export function isReserved(track, layout, x, z) {
  return layout.landmarks.some((p) => {
    if (p.kind !== 'arena') return false;
    const dx = x - p.x, dz = z - p.z, c = Math.cos(p.rotation), s = Math.sin(p.rotation);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.abs(lx) < 102 && lz > -76 && lz < 70;
  });
}

export function build(kit, scene, track, layout) {
  const { THREE: T, box, cyl, mesh, cream, glass } = kit;
  const blue = 0x1e5bd8, black = 0x14161d, concrete = 0xb9b3a8, dark = 0x2a2f3a, grass = 0x2f8f3c, white = 0xf4f0e2;
  const crowd = [];
  const stands = [];
  function tier(p, x, z, w, d, level, facing) {
    // One terrace step: `facing` is the direction the seated crowd looks at (+1 → +z, -1 → -z, 'x±' for the ends).
    const y = 1.1 + level * 2.2;
    box(p, w, 2.2, d, level % 2 ? concrete : 0xa8a29a, x, y, z);
    stands.push({ x, z, w, d, top: y + 1.1, facing });
  }
  function stand(p, x, z, w, d, facing, levels = 3) {
    for (let level = 0; level < levels; level++) {
      const shift = (level - (levels - 1) / 2) * 3.4;
      if (facing === 1 || facing === -1) tier(p, x, z - shift * facing, w, 3.4, level, facing);
      else tier(p, x - shift * (facing === 'x+' ? 1 : -1), z, 3.4, d, level, facing);
    }
    // Back wall and a flat roof on pillars.
    if (facing === 1 || facing === -1) {
      box(p, w, 9, 0.8, dark, x, 4.5, z - (d / 2 + 0.4) * facing);
      const roofMesh = box(p, w + 2, 0.5, d + 4, 0x8d9299, x, 11.2, z - 1.2 * facing); roofMesh.castShadow = false;
      for (let px = -w / 2 + 6; px <= w / 2 - 6; px += 20) box(p, 0.6, 11, 0.6, 0x8d9299, x + px, 5.5, z - (d / 2 - 0.5) * facing);
    } else {
      const side = facing === 'x+' ? 1 : -1;
      box(p, 0.8, 9, d, dark, x - (w / 2 + 0.4) * side, 4.5, z);
      const roofMesh = box(p, w + 4, 0.5, d + 2, 0x8d9299, x - 1.2 * side, 11.2, z); roofMesh.castShadow = false;
    }
  }
  function arena(p, item) {
    // Pitch on the far side of the road, with lines, centre circle and goals.
    box(p, 96, 0.22, 60, 0x3f7d3a, 0, 0.09, -20);
    box(p, 90, 0.12, 54, grass, 0, 0.26, -20);
    for (let i = 0; i < 9; i++) box(p, 10, 0.02, 54, i % 2 ? 0x2f8f3c : 0x3a9a44, -40 + i * 10, 0.34, -20);
    for (const z of [-46.8, 6.8]) box(p, 90, 0.05, 0.35, white, 0, 0.36, z);
    for (const x of [-44.8, 0, 44.8]) box(p, 0.35, 0.05, 54, white, x, 0.36, -20);
    const ring = mesh(p, new T.RingGeometry(6.2, 6.7, 32), white, 0, 0.37, -20); ring.rotation.x = -Math.PI / 2;
    for (const x of [-44.5, 44.5]) { for (const z of [-24, -16]) box(p, 0.25, 2.6, 0.25, white, x, 1.3, z); box(p, 0.25, 0.25, 8.3, white, x, 2.6, -20); }
    // Stands: main stand by the road (z 53–63), far stand (z -66 – -56), end stands with a gate for the road.
    stand(p, 0, 58, 176, 10, -1);
    stand(p, 0, -61, 176, 10, 1);
    for (const side of [-1, 1]) {
      stand(p, side * 87, -28.5, 10, 75, side > 0 ? 'x-' : 'x+');
      stand(p, side * 87, 58, 10, 10, side > 0 ? 'x-' : 'x+', 2);
      // Gate: two striped towers and a lintel over the road.
      for (const z of [8, 52]) {
        box(p, 4, 12, 4, blue, side * 86, 6, z);
        for (let y = 1.5; y < 12; y += 3) box(p, 4.1, 1.5, 4.1, black, side * 86, y, z);
        box(p, 4.6, 0.6, 4.6, white, side * 86, 12.3, z);
      }
      const lintel = box(p, 2.2, 3, 44.4, blue, side * 86, 11.5, 30); lintel.castShadow = false;
      box(p, 2.3, 0.8, 44.6, black, side * 86, 13.3, 30);
      // Floodlight pylons at the corners.
      for (const z of [-72, 66]) { cyl(p, 0.45, 30, 0x7d84a8, side * 96, 15, z, 7); const head = box(p, 5, 2.2, 1, kit.lampGlow, side * 96, 30.6, z); head.castShadow = false; }
    }
    // Advertising boards along the main stand base and the far stand.
    const ads = [0xe0503c, 0xffd766, 0x2f8f3c, 0xffffff, 0x1e5bd8, 0xff7a12];
    for (let i = 0; i < 26; i++) { box(p, 6.2, 1.1, 0.25, ads[i % ads.length], -78 + i * 6.3, 0.75, 52); box(p, 6.2, 1.1, 0.25, ads[(i + 3) % ads.length], -78 + i * 6.3, 0.75, -55.2); }
    // Scoreboard on the far stand.
    box(p, 18, 6, 1, dark, 0, 16, -62); box(p, 16.5, 4.6, 0.3, 0x0b1f4a, 0, 16, -61.4);
    for (let i = 0; i < 6; i++) box(p, 1.4, 1.4, 0.2, i % 2 ? kit.lampGlow : 0xff7a12, -6 + i * 2.4, 16, -61.2).castShadow = false;
    // Blue-and-black banners hanging from the roofs.
    for (let i = 0; i < 12; i++) { const x = -72 + i * 13; box(p, 4, 3.2, 0.2, i % 2 ? blue : black, x, 9.3, 51.6); box(p, 4, 3.2, 0.2, i % 2 ? black : blue, x, 9.3, -54.6); }
    // Crowd: instanced bricks on every tier (blue, black and a few white/orange), remembered for the cheer animation.
    const geometry = new T.BoxGeometry(0.9, 1.35, 0.7);
    const palettes = [[blue, 0.46], [black, 0.4], [white, 0.09], [0xff7a12, 0.05]];
    const seats = [];
    let seed = 77;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (const t of stands) {
      const alongX = t.facing === 1 || t.facing === -1;
      const count = Math.floor((alongX ? t.w : t.d) / 1.35) - 1;
      for (let i = 0; i < count; i++) {
        const offset = -((alongX ? t.w : t.d) / 2) + 1 + i * 1.35 + (random() - 0.5) * 0.3;
        const x = alongX ? t.x + offset : t.x;
        const z = alongX ? t.z : t.z + offset;
        const roll = random();
        let acc = 0, palette = 0;
        for (let k = 0; k < palettes.length; k++) { acc += palettes[k][1]; if (roll < acc) { palette = k; break; } }
        seats.push({ x, y: t.top + 0.68, z, palette, phase: random() * Math.PI * 2, rotation: alongX ? (t.facing > 0 ? 0 : Math.PI) : (t.facing === 'x+' ? Math.PI / 2 : -Math.PI / 2) });
      }
    }
    const meshes = palettes.map(([color]) => {
      const list = seats.filter((s) => s.palette === palettes.findIndex(([c]) => c === color));
      const instanced = new T.InstancedMesh(geometry, kit.mat(color), Math.max(1, list.length));
      instanced.castShadow = false; instanced.receiveShadow = false; instanced.userData.dynamic = true;
      p.add(instanced);
      return { instanced, list };
    });
    for (const s of seats) { s.cos = Math.cos(s.rotation); s.sin = Math.sin(s.rotation); }
    // Each fan is a turn about the vertical, a vertical stretch and a position: the matrix is written straight into
    // the instance buffer (thousands of fans every frame; going through an Object3D is what slow devices feel).
    const paint = (intensity, clock) => {
      for (const { instanced, list } of meshes) {
        const m = instanced.instanceMatrix.array;
        for (let i = 0; i < list.length; i++) {
          const s = list[i], o = i * 16;
          const bounce = (0.05 + 0.62 * intensity) * Math.abs(Math.sin(clock * (4 + intensity * 3.5) + s.phase));
          const stretch = 1 + intensity * 0.25 * Math.abs(Math.sin(clock * 6 + s.phase));
          m[o] = s.cos; m[o + 1] = 0; m[o + 2] = -s.sin; m[o + 3] = 0;
          m[o + 4] = 0; m[o + 5] = stretch; m[o + 6] = 0; m[o + 7] = 0;
          m[o + 8] = s.sin; m[o + 9] = 0; m[o + 10] = s.cos; m[o + 11] = 0;
          m[o + 12] = s.x; m[o + 13] = s.y + bounce; m[o + 14] = s.z; m[o + 15] = 1;
        }
        instanced.instanceMatrix.needsUpdate = true;
      }
    };
    paint(0, 0);
    crowd.push({ paint, item, intensity: 0 });
  }
  for (const item of layout.landmarks) kit.placeLandmark(item, item.kind === 'arena' ? arena : kit.builders[item.kind], item.kind === 'arena' ? 62 : 11, item.kind === 'arena' ? 22 : 17);

  // Fans cheer when any car is inside the stadium (within ~100 m of its centre along the lap).
  kit.animate((clock, dt, racers, currentTrack) => {
    for (const entry of crowd) {
      const half = currentTrack.length / 2;
      const near = racers.some((r) => Math.abs(currentTrack.wrap(r.progress - entry.item.distance + half) - half) < 100);
      const target = near ? 1 : 0;
      entry.intensity += Math.max(-dt * 1.2, Math.min(dt * 2.5, target - entry.intensity));
      entry.paint(entry.intensity, clock);
    }
  });
}
