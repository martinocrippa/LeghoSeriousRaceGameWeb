// Generates the Lake Como control points: the road follows the outline of an inverted-Y lake made of three
// capsules (Como, Lecco and north arms) around the junction, with a rounded hairpin at Bellagio.
// Map coordinates: X east, Y north; track coordinates are (x, z) = (X, -Y). Run: node scripts/como-generate.mjs
import { createTrack } from '../src/track.js';

const h = Number(process.argv[2]) || 33;           // half width of every arm (road centre to arm axis)
const N = Number(process.argv[3]) || 56;           // number of control points
const LENGTH = Number(process.argv[4]) || 980;
const arms = {
  como: { u: norm([-95, -125]), len: 150 },
  lecco: { u: norm([60, -120]), len: 130 },
  north: { u: norm([20, 130]), len: 140 },
};
function norm([x, y]) { const m = Math.hypot(x, y); return [x / m, y / m]; }
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const left = ([x, y]) => [-y, x];
const right = ([x, y]) => [y, -x];
const along = (arm, d, side) => add([arm.u[0] * d, arm.u[1] * d], side === 'L' ? left(arm.u) : right(arm.u), h);
const pieces = [];
function line(a, b) { pieces.push([a, b]); }
function arc(centre, radius, fromAngle, toAngle, via) {
  // Two sweeps join the same angles; keep the one whose midpoint passes nearest `via` (tip of an arm, apex of the hairpin).
  const mid = (angle) => [centre[0] + Math.cos((fromAngle + angle) / 2) * radius, centre[1] + Math.sin((fromAngle + angle) / 2) * radius];
  const dist = (angle) => Math.hypot(mid(angle)[0] - via[0], mid(angle)[1] - via[1]);
  const end = [toAngle, toAngle < fromAngle ? toAngle + Math.PI * 2 : toAngle - Math.PI * 2].sort((a, b) => dist(a) - dist(b))[0];
  const steps = Math.max(8, Math.ceil(Math.abs(end - fromAngle) * radius / 1.5));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = fromAngle + (end - fromAngle) * i / steps;
    pts.push([centre[0] + Math.cos(a) * radius, centre[1] + Math.sin(a) * radius]);
  }
  pieces.push(pts);
}
const angleOf = ([x, y]) => Math.atan2(y, x);
// Convex junction corners: intersection of two shore lines.
function intersect(p, d, q, e) {
  const det = d[0] * -e[1] - d[1] * -e[0];
  const t = ((q[0] - p[0]) * -e[1] - (q[1] - p[1]) * -e[0]) / det;
  return add(p, d, t);
}
const { como, lecco, north } = arms;
const tipC = [como.u[0] * como.len, como.u[1] * como.len];
const tipL = [lecco.u[0] * lecco.len, lecco.u[1] * lecco.len];
const tipN = [north.u[0] * north.len, north.u[1] * north.len];
// Clockwise on a north-up map: Como tip (west shoulder) -> west shore -> north tip -> east shore -> Lecco tip -> Bellagio -> Como.
const comoOuterStart = along(como, como.len, 'R');
const westCorner = intersect(along(como, 0, 'R'), como.u, along(north, 0, 'L'), north.u);
const eastCorner = intersect(along(north, 0, 'R'), north.u, along(lecco, 0, 'L'), lecco.u);
// Bellagio: inner shores meet at a 64 degree corner, filleted with radius r.
const bellagioCorner = intersect(along(como, 0, 'L'), como.u, along(lecco, 0, 'R'), lecco.u);
const r = Number(process.argv[5]) || 15;
const halfAngle = Math.acos(como.u[0] * lecco.u[0] + como.u[1] * lecco.u[1]) / 2;
const bisector = norm(add(como.u, lecco.u));
const filletCentre = add(bellagioCorner, bisector, r / Math.sin(halfAngle));
const tangentDistance = r / Math.tan(halfAngle);
const tangentLecco = add(bellagioCorner, lecco.u, tangentDistance);
const tangentComo = add(bellagioCorner, como.u, tangentDistance);

// Convex junction corners get a fillet too (radius R), so the road bends instead of kinking.
const R = Number(process.argv[6]) || 24;
function fillet(from, corner, to, d1, d2) {
  const phi = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1])));
  const bis = norm(add(d2, d1, -1));
  const centre = add(corner, bis, R / Math.cos(phi / 2));
  const t1 = add(corner, d1, -R * Math.tan(phi / 2));
  const t2 = add(corner, d2, R * Math.tan(phi / 2));
  line(from, t1);
  arc(centre, R, angleOf(add(t1, centre, -1)), angleOf(add(t2, centre, -1)), add(corner, bis, R / Math.cos(phi / 2) - R));
  line(t2, to);
}
fillet(comoOuterStart, westCorner, along(north, north.len, 'L'), [-como.u[0], -como.u[1]], north.u);
arc(tipN, h, angleOf(add(along(north, north.len, 'L'), tipN, -1)), angleOf(add(along(north, north.len, 'R'), tipN, -1)), add(tipN, north.u, h));
fillet(along(north, north.len, 'R'), eastCorner, along(lecco, lecco.len, 'L'), [-north.u[0], -north.u[1]], lecco.u);
arc(tipL, h, angleOf(add(along(lecco, lecco.len, 'L'), tipL, -1)), angleOf(add(along(lecco, lecco.len, 'R'), tipL, -1)), add(tipL, lecco.u, h));
line(along(lecco, lecco.len, 'R'), tangentLecco);
arc(filletCentre, r, angleOf(add(tangentLecco, filletCentre, -1)), angleOf(add(tangentComo, filletCentre, -1)), add(filletCentre, bisector, -r));
line(tangentComo, along(como, como.len, 'L'));
arc(tipC, h, angleOf(add(along(como, como.len, 'L'), tipC, -1)), angleOf(add(comoOuterStart, tipC, -1)), add(tipC, como.u, h));

// Flatten to a polyline, then resample at uniform spacing.
const poly = [];
for (const piece of pieces) for (const p of piece) if (!poly.length || Math.hypot(p[0] - poly[poly.length - 1][0], p[1] - poly[poly.length - 1][1]) > 1e-6) poly.push(p);
let perimeter = 0;
const cumulative = [0];
for (let i = 1; i < poly.length; i++) { perimeter += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]); cumulative.push(perimeter); }
const control = [];
for (let k = 0; k < N; k++) {
  const target = perimeter * k / N;
  let i = 1;
  while (i < cumulative.length && cumulative[i] < target) i++;
  const t = (target - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1]);
  const p = [poly[i - 1][0] + (poly[i][0] - poly[i - 1][0]) * t, poly[i - 1][1] + (poly[i][1] - poly[i - 1][1]) * t];
  control.push([+p[0].toFixed(1), +(-p[1]).toFixed(1)]);
}
const track = createTrack({ id: 'como-gen', name: 'x', length: LENGTH, roadWidth: 14, laps: 2, controlPoints: control });
const dense = track.points(Math.round(track.length / 2));
const spacing = track.length / dense.length;
let minRadius = Infinity, at = 0;
for (let i = 0; i < dense.length; i++) {
  const a = dense[i], b = dense[(i + 1) % dense.length];
  const angle = Math.acos(Math.min(1, Math.max(-1, a.dx * b.dx + a.dz * b.dz)));
  const rad = spacing / Math.max(angle, 1e-9);
  if (rad < minRadius) { minRadius = rad; at = a.distance; }
}
let minGap = Infinity;
for (let i = 0; i < dense.length; i++) for (let j = i + 1; j < dense.length; j++) {
  const d = Math.min(j - i, dense.length - (j - i)) * spacing;
  if (d < 60) continue;
  minGap = Math.min(minGap, Math.hypot(dense[i].x - dense[j].x, dense[i].z - dense[j].z));
}
const scale = LENGTH / perimeter;
console.log(JSON.stringify({ perimeter: +perimeter.toFixed(0), scale: +scale.toFixed(3), minRadius: +minRadius.toFixed(1), at: +at.toFixed(0), minGap: +minGap.toFixed(1), bounds: Object.fromEntries(Object.entries(track.bounds).map(([k, v]) => [k, +v.toFixed(0)])) }));
console.log(JSON.stringify(control));
const nearest = (X, Y, label) => {
  const x = X * scale, z = -Y * scale;
  let best = Infinity, bestD = 0;
  for (const p of dense) { const g = Math.hypot(p.x - x, p.z - z); if (g < best) { best = g; bestD = p.distance; } }
  console.log(label, Math.round(bestD), 'gap', best.toFixed(1));
};
const tipPoint = (arm) => add([arm.u[0] * arm.len, arm.u[1] * arm.len], arm.u, h);
nearest(...comoOuterStart, 'start(como west shoulder)');
nearest(...tipPoint(como), 'como-tip');
nearest(...tipPoint(lecco), 'lecco-tip');
nearest(...tipPoint(north), 'colico-tip');
nearest(...add(filletCentre, bisector, -r), 'bellagio-apex');
nearest(...westCorner, 'menaggio');
nearest(...eastCorner, 'varenna');
nearest(...along(como, 60, 'R'), 'tremezzo');
nearest(...along(como, 120, 'R'), 'cernobbio');
nearest(...along(north, 110, 'L'), 'north-bridge-from');
nearest(...along(north, 110, 'R'), 'north-bridge-to');
nearest(...along(lecco, 108, 'L'), 'lecco-bridge-from');
nearest(...along(lecco, 108, 'R'), 'lecco-bridge-to');
nearest(...along(como, 100, 'L'), 'nesso');
nearest(...along(lecco, 60, 'L'), 'mandello');
nearest(...along(north, 60, 'R'), 'bellano');
console.log('scale', scale.toFixed(3), 'h scaled', (h * scale).toFixed(1));
