import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACKS, DEFAULT_TRACK, getTrack, createTrack, TRACK_LENGTH, ROAD_WIDTH, TOTAL_LAPS, TRACK_RAMPS, TRACK_BOOSTS, TRACK_BOXES, getTrackFrame, wrapDistance,
} from '../src/track.js';

test('the default circuit is numerically identical to the original single track', () => {
  assert.equal(DEFAULT_TRACK.id, 'nuvole');
  assert.equal(TRACK_LENGTH, 550);
  assert.equal(ROAD_WIDTH, 14);
  assert.equal(TOTAL_LAPS, 3);
  assert.deepEqual(TRACK_RAMPS, [
    { id: 'ramp-1', distance: 106, length: 12, lane: null, height: 2.1 },
    { id: 'ramp-2', distance: 357, length: 12, lane: null, height: 2.1 },
  ]);
  assert.deepEqual(TRACK_BOOSTS, [
    { id: 'pad-1', distance: 57, lane: -3.7, length: 8, width: 3.2 },
    { id: 'pad-2', distance: 254, lane: 3.7, length: 8, width: 3.2 },
    { id: 'pad-3', distance: 462, lane: 0, length: 8, width: 3.2 },
  ]);
  assert.deepEqual(TRACK_BOXES.map((box) => [box.id, box.distance, box.lane]), [
    ['box-a-0', 37, -4.2], ['box-a-1', 37, 0], ['box-a-2', 37, 4.2],
    ['box-b-0', 202, -4.2], ['box-b-1', 202, 0], ['box-b-2', 202, 4.2],
    ['box-c-0', 316, -4.2], ['box-c-1', 316, 0], ['box-c-2', 316, 4.2],
    ['box-d-0', 439, -4.2], ['box-d-1', 439, 0], ['box-d-2', 439, 4.2],
  ]);
  // Reference frames recorded from the original implementation: sampling must stay bit-identical.
  assert.deepEqual(getTrackFrame(0), { x: 0, z: -72.69575465244395, dx: 0.9990648516556008, dz: 0.04323681517378882 });
  assert.deepEqual(getTrackFrame(100), { x: 75.46522408073159, z: -26.86152693042533, dx: -0.16297247523855557, dz: 0.9866306159422676 });
  assert.deepEqual(getTrackFrame(412.5), { x: -63.51345566747331, z: 3.5220728955430167, dx: 0.4553892083717536, dz: -0.8902924625641553 });
  assert.equal(wrapDistance(-25), 525);
  assert.equal(getTrack('non-esiste'), DEFAULT_TRACK);
  assert.equal(TRACKS.length, 20);
  assert.equal(new Set(TRACKS.map((track) => track.id)).size, 20);
});

test('createTrack rejects unusable definitions', () => {
  const base = { id: 'x', name: 'X', length: 300, controlPoints: [[0, -50], [50, 0], [0, 50], [-50, 0]] };
  assert.doesNotThrow(() => createTrack(base));
  assert.throws(() => createTrack({ ...base, roadWidth: 8 }), /10 m/);
  assert.throws(() => createTrack({ ...base, laps: 0 }), /laps/);
  assert.throws(() => createTrack({ ...base, controlPoints: base.controlPoints.slice(0, 3) }), /control points/);
  assert.throws(() => createTrack({ ...base, boxes: [{ id: 'far', distance: 999, lane: 0 }] }), /off the circuit/);
  assert.equal(createTrack(base).theme.sky, DEFAULT_TRACK.theme.sky);
  assert.equal(createTrack({ ...base, theme: { sky: 1, trees: { count: 3 } } }).theme.trees.trunk, DEFAULT_TRACK.theme.trees.trunk);
});

for (const track of TRACKS) {
  test(`${track.id}: closed loop, gentle curvature, no self-approach, items on the road and clear of ramps`, () => {
    assert.deepEqual(track.frame(0), track.frame(track.length));
    const points = track.points(256);
    let length = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      assert.ok(Math.abs(Math.hypot(a.dx, a.dz) - 1) < 1e-10, 'normalized tangent');
      length += Math.hypot(a.x - b.x, a.z - b.z);
    }
    assert.ok(Math.abs(length - track.length) < 1, `polyline length ${length} ≈ ${track.length}`);

    const items = [...track.ramps, ...track.boosts, ...track.boxes];
    assert.equal(new Set(items.map((item) => item.id)).size, items.length, 'unique item ids');
    const maxLane = track.roadWidth / 2 - 1.1;
    for (const item of items) {
      assert.ok(item.distance >= 0 && item.distance < track.length, `${item.id} on the loop`);
      if (item.lane !== null) assert.ok(Math.abs(item.lane) <= maxLane + 1e-9, `${item.id} inside the road`);
    }
    const sortedRamps = [...track.ramps].sort((a, b) => a.distance - b.distance);
    for (let i = 0; i < sortedRamps.length; i++) {
      const current = sortedRamps[i], next = sortedRamps[(i + 1) % sortedRamps.length];
      const gap = track.wrap(next.distance - current.distance - current.length);
      if (sortedRamps.length > 1) assert.ok(gap >= 40, `${current.id} leaves room to land before ${next.id}`);
      for (const item of [...track.boosts, ...track.boxes]) {
        const along = track.wrap(item.distance - (current.distance - 6));
        assert.ok(along > current.length + 36, `${item.id} is not in the jump zone of ${current.id}`);
      }
    }

    // Curvature: tangents two metres apart; radius = spacing / turning angle.
    const dense = track.points(Math.round(track.length / 2));
    const spacing = track.length / dense.length;
    let minRadius = Infinity;
    for (let i = 0; i < dense.length; i++) {
      const a = dense[i], b = dense[(i + 1) % dense.length];
      const angle = Math.acos(Math.min(1, Math.max(-1, a.dx * b.dx + a.dz * b.dz)));
      minRadius = Math.min(minRadius, spacing / Math.max(angle, 1e-9));
    }
    assert.ok(minRadius >= track.roadWidth / 2 + 1, `${track.id}: tightest bend radius ${minRadius.toFixed(1)} m is drivable`);

    // Sections far apart along the loop must not come close in space, unless one passes over the other on a bridge.
    let minGap = Infinity;
    for (let i = 0; i < dense.length; i++) {
      for (let j = i + 1; j < dense.length; j++) {
        const along = Math.min(j - i, dense.length - (j - i)) * spacing;
        if (along < 60) continue;
        const gap = Math.hypot(dense[i].x - dense[j].x, dense[i].z - dense[j].z);
        if (gap >= track.roadWidth + 8) continue;
        const rise = Math.abs(track.elevation(dense[i].distance) - track.elevation(dense[j].distance));
        assert.ok(rise >= 5, `${track.id}: sections at ${dense[i].distance.toFixed(0)} m and ${dense[j].distance.toFixed(0)} m are ${gap.toFixed(1)} m apart with only ${rise.toFixed(1)} m of height difference`);
        minGap = Math.min(minGap, gap);
      }
    }
    if (minGap < Infinity) assert.ok(track.elevationBumps.some((bump) => bump.bridge), `${track.id}: a crossing needs a bridge`);
    assert.ok(Number.isFinite(track.bounds.minX) && track.bounds.maxX > track.bounds.minX, 'bounds');
  });
}
