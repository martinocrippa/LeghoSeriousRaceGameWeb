# Scenery modules (per-circuit scenography)

Each circuit with `theme.local` may have a module here, registered in `index.js` under the same key.
The module builds the circuit's landmarks and extras with a shared **kit** so nothing here imports the
renderer, and it never touches `local-scenery.js`, `renderer.js`, `race.js` or `track.js`.

Definitions of the circuits themselves (control points, items, theme, landmarks) live in `src/tracks/<id>.js`
(pure data, no three.js) and are imported by `src/track.js`.

## Module contract

```js
import * as THREE from 'three';                 // allowed: three.js only, no DOM access except through kit.sign
export const streetHouses = 12;                 // optional: generic houses on the OUTER side of the road (default per circuit or 0)
export const RESERVED = { mykind: 40 };         // optional: radius (m) kept free of trees/bricks/houses around a landmark kind (default 23)
export function isReserved(track, layout, x, z) // optional: extra zones kept free (lake water, stadium footprint…)
export function groundHoles(track, layout)      // optional: [{ x, z, radius }] cut out of the flat ground plane (a pit)
export function build(kit, scene, track, layout) // required: place EVERY landmark of the circuit and the extras
```

`layout.landmarks` = the circuit's `landmarks` with world position and orientation added:
`{ kind, name, distance, lane, x, z, rotation }`. `rotation` (radians about Y) makes the group's local **+z axis
point toward the road**, so build things with the road at local `+z` and the "back" at local `-z`.
`layout.streets` = generic street houses (placed by local-scenery.js, not by the module).
`layout.shoreline` = for `como` only, the lake shore polygon (`[{x,z}]`).

Typical `build`:

```js
export function build(kit, scene, track, layout) {
  const builders = { mykind: (g, item) => { ...kit.box(g, ...) ... } };
  for (const item of layout.landmarks) kit.placeLandmark(item, builders[item.kind] || kit.builders[item.kind]);
  // extras: fields, water, mountains, animated things...
  kit.animate((clock, dt, racers, track) => { ... });   // optional
}
```

## The kit

Geometry helpers (all create shadow-casting meshes with a cached `MeshStandardMaterial` per colour):

| Helper | Signature | Notes |
| --- | --- | --- |
| `kit.mesh` | `(parent, geometry, color, x=0, y=0, z=0)` | returns the Mesh |
| `kit.box` | `(parent, w, h, d, color, x=0, y=h/2, z=0)` | y defaults to half height (sits on the ground) |
| `kit.cyl` | `(parent, radius, h, color, x=0, y=h/2, z=0, segments=10)` | |
| `kit.cone` | `(parent, radius, h, color, x=0, y=0, z=0, segments=4)` | y is the centre, not the base |
| `kit.roofTop` | `(parent, w, d, y, color=kit.roof)` | pyramid roof of a `w × d` building whose top is at `y` |
| `kit.windows` | `(parent, w, height, z, rows=2)` | rows of windows on a facade at local z |
| `kit.sign` | `(parent, text, z, width=17)` | name board on two posts (no-op in Node tests) |
| `kit.tree` | `(parent, x, z, tall=false)` | round tree, or a tall conifer |
| `kit.cypress` | `(parent, x, z, h=7)` | |
| `kit.lamp` | `(parent, x, z, h=4.2)` | street lamp with a glowing head |
| `kit.legs` | `(parent, x, z, w, d, h, color)` | four thin legs (animals, tables) |
| `kit.mat` | `(color)` | cached MeshStandardMaterial (roughness .75) |
| `kit.placeLandmark` | `(item, builder, signDistance=11, signWidth=17)` | creates the group `landmark-<kind>` at the item, rotated toward the road, calls `builder(group, item)`, adds the sign |
| `kit.builders` | legacy builders `{ villa, church, park, village, duomo, tram, castle, skyline, pond, school, home, amiata, sheep, boar, fox, deer, hoopoe, stadium, propileo, funicular, cittaalta, skislope, chairlift, chalet, river }` | reuse them when they fit |
| `kit.dynamic(object)` | flags every mesh under `object` as dynamic | REQUIRED for anything you move in `kit.animate`; static meshes are merged into batches and cannot move |
| `kit.animate(fn)` | `fn(clock, dt, racers, track)` each frame | `racers[i].progress` (cumulative metres), `.lane`, `.speed`; use `track.wrap(progress)` to compare with a landmark's `distance` |
| `kit.inside(x, z, polygon)` | point in polygon `[{x,z}]` | it is `insidePolygon` from `src/geometry.js`: import it directly when you need it in `isReserved`/`groundHoles`, which run without the kit — do not write a second copy |
| `kit.groundAt(x, z)` | terrain height (hills), 0 on flat circuits | place things at `y = kit.groundAt(x, z)` on circuits with `elevation` |
| colours | `kit.cream, kit.roof, kit.glass, kit.green, kit.stone, kit.lampGlow, kit.wood, kit.darkWood, kit.snow` | |
| `kit.THREE` | the three.js namespace | |

Randomness comes from `seeded()` in `src/random.js`, never from `Math.random()` or a hand-rolled generator:
a scenery must rebuild identically every time.

Prefer few, chunky shapes (this is a brick toy world for 6–10 year olds): boxes, cylinders, cones, icosahedra.
Keep a landmark under ~120 meshes; instanced meshes (`THREE.InstancedMesh`) for crowds, fields, flocks.
Water: a flat `ShapeGeometry`/`CircleGeometry` rotated `-Math.PI/2`, `castShadow=false`.
Big terrain shapes (mountains, hills, calanchi): `castShadow=false` to keep the shadow map cheap.

## Coordinates and lanes

- Track distance `d` runs along the loop; `track.frame(d)` → `{x, z, dx, dz}` (position and unit tangent).
- A point at lateral offset `lane` from the centre line: `x = f.x + f.dz*lane`, `z = f.z - f.dx*lane`.
- `track.roadWidth` is 14 (or 12/16); cars stay within `±(roadWidth/2 - 1.1)`.
- Landmarks are usually at `|lane| ≈ 26…34` (their sign board at local `z ≈ 11…13` faces the road).
- Which side is "outer" depends on the loop direction: check `layout.landmarks` positions against the loop
  interior, or follow the existing landmarks of the circuit.

## Hard constraints checked by `npm test` (tests/local-tracks.test.js, tests/track.test.js)

1. Every landmark kind in the circuit definition must produce a group named `landmark-<kind>` with meshes
   whose bounding box has `max.y > 3` (so every kind needs a builder, even a small one).
2. Every mesh corner (x/z of its geometry bounding box, transformed to world) must be at least
   `roadWidth/2 + 1` metres from every point of the road centre line — nothing may overhang the racing lanes.
   Extras placed with `scene.add` directly are not checked, but keep them off the road too (players notice).
3. `createLocalScenery(track)` must run in Node (no `document`/`window` except via `kit.sign`; `typeof document === 'undefined'` guards are fine).
4. Circuit definition rules (`createTrack`): ≥ 4 control points, gentle bends (tightest radius ≥ roadWidth/2+1, aim ≥ 12),
   distant parts of the loop ≥ roadWidth+8 apart, items (`ramps/boosts/boxes`) on the road, boosts/boxes not
   within 48 m after a ramp start, ramps ≥ 40 m apart, unique ids.
5. `Il circuito delle nuvole` (default) must not change.

## Circuit definition features (src/tracks/<id>.js)

```js
{ id, name, tagline, description, length, roadWidth, laps, controlPoints: [[x,z]…],
  ramps: [ramp('ramp-1', d)], boosts: [pad('pad-1', d, lane)], boxes: [...boxRow('a', d)],
  landmarks: [{ kind, name, distance, lane }],
  elevation: [{ distance, length, height }],                 // raised-cosine hills the road climbs (terrain follows)
  surfaces: [{ from, to, kind: 'cobbles'|'asphalt'|'dirt' }], // road material changes along the lap
  bankings: [{ from, to, angle, side: 1|-1 }],                // banked bend: the `side` edge rises (≥ 50 m long, ≤ 40°)
  shortcuts: [{ id, name, from, to }],                        // optional iron bridge skipping road (Como)
  loops: [{ id, name, distance, radius, lead }],              // loop-the-loop replacing the road (Stadio)
  gates: [{ id, distance, name }],                            // iron arch with a name over the road
  theme: { local, sky, fog, fogNear, fogFar, ground, road, shoulder, curb:[a,b], stripe, hills:[…], bricks:[…],
           flags:[a,b], trees:{ trunk, crown, top, hue, count }, clouds, lamps, stars:{count, milkyWay}, dust,
           light:{ hemiSky, hemiGround, hemiIntensity, sun, sunIntensity } } }
```

`theme.dust` (a colour) adds dust puffs behind the cars (gravel/dirt). `theme.hills: []` removes the ring of
generic hills (do it when the module builds its own mountains). `trees.count` controls the generic tree scatter,
which already avoids landmarks (`RESERVED`), `isReserved` zones and the road.

Texts shown to children are Italian, short and friendly; code comments are English. Never use the LEGO name.

## Interiors (the school circuits)

The engine has no rooms: no walls, no ceilings, no volumes. `alba` and `intervallo` still read as being indoors,
and the recipe is worth reusing.

- **Scale.** The cars are toys, so build the place four times life size. A corridor becomes a 10 m road between
  walls; a school desk becomes a bridge on four steel columns.
- **Walls, not rooms.** Put walls on both sides of the road, just outside the keep-out band (`roadWidth / 2 + 1`),
  and run the whole perimeter of the room when there is one. That alone is what turns a floor into a room.
- **No ceiling, ever.** The chase camera flies at ~11 m. Anything closed over the road blocks the view from behind.
  Beams and strings of bunting are fine above ~14 m, because the camera passes under them and you see through.
  Say so honestly: from above you always see the sky. It is a stage set, not a model of the building.
- **Floors.** Let `theme.road` be the floor (lino, paving) and use `surfaces` only for the patches that are NOT the
  floor — the tiled corner, the wet grass, the spilled sugar. Painting the whole road `asphalt` makes an indoor
  circuit look like a street, which is exactly the mistake worth avoiding.
- **Levels.** There is no negative height. An underground car park is ground level, and the floor above it is an
  `elevation` bump with `bridge: true` — which also gives the self-crossing the ≥ 5 m the track test wants.
- **Landmarks on a bend.** The clearance test is purely 2D and runs against the whole lap, so on a circuit that
  crosses itself the inside of the crossing is unusable even though the two strands are at different heights. Keep
  a landmark's footprint smaller than its distance from the nearest piece of road, and check both sides.
