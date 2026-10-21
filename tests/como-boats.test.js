import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrack } from '../src/track.js';
import { BOAT_ROUTES, bridgeClearance } from '../src/scenery/como-routes.js';

/** Head room a boat must keep under a deck: enough that it reads as passing under, not grazing. */
const MIN_CLEARANCE = 1.5;

test('every boat on the lake passes UNDER the iron bridges, never through them', () => {
  const track = getTrack('como');
  const bridges = track.sections.filter((section) => section.kind === 'bridge');
  assert.equal(bridges.length, 2, 'Como has two iron bridges');

  for (const route of BOAT_ROUTES) {
    const clearance = bridgeClearance(track, route.from, route.to, route.air);
    if (clearance === Infinity) continue; // This route never goes under a bridge.
    assert.ok(clearance >= MIN_CLEARANCE,
      `${route.kind} da ${route.from} a ${route.to}: passa a ${clearance.toFixed(2)} m dal ponte`);
  }
  // At least one route really does cross, or the check above would be vacuous.
  assert.ok(BOAT_ROUTES.some((route) => bridgeClearance(track, route.from, route.to, route.air) !== Infinity),
    'almeno una rotta deve passare sotto un ponte, altrimenti il test non verifica niente');
});

test('the piers stand clear of the shipping lanes', () => {
  const track = getTrack('como');
  for (const section of track.sections) {
    if (section.kind !== 'bridge') continue;
    // The renderer plants this many piers, evenly spaced (see the bridge branch of buildTrack).
    const piers = Math.max(1, Math.round(section.pathLength / 18));
    for (let i = 1; i <= piers; i += 1) {
      const pier = section.pose(i / (piers + 1), 0);
      for (const route of BOAT_ROUTES) {
        const dx = route.to[0] - route.from[0], dz = route.to[1] - route.from[1];
        const lengthSquared = dx * dx + dz * dz;
        const t = Math.max(0, Math.min(1, ((pier.x - route.from[0]) * dx + (pier.z - route.from[1]) * dz) / lengthSquared));
        const away = Math.hypot(pier.x - (route.from[0] + dx * t), pier.z - (route.from[1] + dz * t));
        assert.ok(away > 4, `un pilastro di ${section.id} è a ${away.toFixed(1)} m dalla rotta del ${route.kind}`);
      }
    }
  }
});
