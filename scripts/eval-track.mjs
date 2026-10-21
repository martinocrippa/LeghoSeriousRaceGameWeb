// Quick geometry check for a candidate circuit: min bend radius, min gap between distant sections,
// crossing points (gap < road width) and the arc-length distance nearest to given XZ probes.
import { createTrack } from '../src/track.js';
const def = JSON.parse(process.argv[2]);
const probes = JSON.parse(process.argv[3] || '[]');
const track = createTrack({ id: 'probe', name: 'probe', ...def });
const dense = track.points(Math.round(track.length / 2)), spacing = track.length / dense.length;
let minRadius = Infinity, minRadiusAt = 0;
for (let i = 0; i < dense.length; i++) { const a = dense[i], b = dense[(i + 1) % dense.length]; const angle = Math.acos(Math.min(1, Math.max(-1, a.dx * b.dx + a.dz * b.dz))); const r = spacing / Math.max(angle, 1e-9); if (r < minRadius) { minRadius = r; minRadiusAt = a.distance; } }
let minGap = Infinity, minGapAt = null; const crossings = [];
for (let i = 0; i < dense.length; i++) for (let j = i + 1; j < dense.length; j++) {
  const along = Math.min(j - i, dense.length - (j - i)) * spacing; if (along < 60) continue;
  const gap = Math.hypot(dense[i].x - dense[j].x, dense[i].z - dense[j].z);
  const rise = Math.abs(track.elevation(dense[i].distance) - track.elevation(dense[j].distance));
  if (gap < track.roadWidth + 8 && rise < 5) { if (gap < minGap) { minGap = gap; minGapAt = [dense[i].distance, dense[j].distance, rise]; } }
  if (gap < 3) crossings.push([Math.round(dense[i].distance), Math.round(dense[j].distance), rise.toFixed(1)]);
}
console.log(JSON.stringify({ length: track.length, minRadius: +minRadius.toFixed(1), minRadiusAt: Math.round(minRadiusAt), minGap: minGap === Infinity ? null : +minGap.toFixed(1), minGapAt, crossings: crossings.slice(0, 6), bounds: track.bounds,
  probes: probes.map(([x, z]) => { let best = Infinity, d = 0; for (const p of dense) { const g = Math.hypot(p.x - x, p.z - z); if (g < best) { best = g; d = p.distance; } } return { x, z, distance: Math.round(d), gap: +best.toFixed(1) }; }) }));
