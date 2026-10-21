/**
 * Plane geometry shared by the scenery. Pure functions, no three.js and no DOM, so a module can use them
 * from `isReserved`/`groundHoles` (which run without the kit) as well as from inside `build`.
 */

/** Even-odd point-in-polygon on the XZ plane; the polygon is a closed ring of `{ x, z }`. */
export function insidePolygon(x, z, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) result = !result;
  }
  return result;
}
