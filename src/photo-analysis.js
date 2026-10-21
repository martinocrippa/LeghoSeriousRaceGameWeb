import { normalizeParts } from './parts.js';

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const hex = rgb => '#' + rgb.map(n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')).join('');
const median = values => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** Every tunable of the local analysis. Adjust here after a manual pass over real photos. */
export const THRESHOLDS = Object.freeze({
  ring: 0.06, ringMin: 2, minBorderSamples: 8,
  clusterMinShare: 0.1, clusterMinSides: 2, clusterSideShare: 0.25, toleranceBase: 14, toleranceSpread: 2.2, toleranceMin: 20, toleranceMax: 55,
  borderFitMin: 0.5,
  shadowSaturation: 0.15, shadowValue: 0.45, shadowTolerance: 1.6,
  areaMin: 0.04, areaMax: 0.6, maxSidesTouched: 1, fillMin: 0.25, dominance: 1.5, smallObject: 0.08,
  saturationMin: 0.27, valueMin: 0.18, backgroundGap: 27, neutralGap: 36,
  colorfulObject: 0.05, colorfulFrame: 0.018,
  wheelValue: 0.32, wheelSaturation: 0.35, wheelMinArea: 0.004, wheelAspectMin: 0.6, wheelAspectMax: 1.6, wheelFill: 0.5, wheelBand: 0.55, bigWheelRatio: 0.5,
  protrusionRise: 0.25, antennaWidth: 0.12, wingWidth: 0.45, antennaHeight: 0.35, wingHeight: 0.3, wingEdge: 0.35,
  cargoHues: 4, cargoDominance: 0.4,
});

const WIDTH_BY_SHAPE = { truck: 1.8, buggy: 1.65, racer: 1.6, classic: 1.7 };
const HEIGHT_BY_SHAPE = { truck: 1.55, buggy: 1.15, racer: 0.95, classic: 1.15 };
const NOTES = {
  object: 'Ho ritagliato l’auto dallo sfondo: colori, proporzioni e qualche pezzo sono stimati dalla foto. Controlla i pezzi suggeriti e correggi quello che vuoi.',
  objectSmall: ' L’auto è piccola nella foto: una foto più vicina aiuta.',
  palette: 'Lo sfondo è movimentato, quindi ho stimato solo i colori. Scegli tu forma, misure e pezzi: una foto su un tavolo sgombro aiuta.',
  low: 'I colori dell’auto sono poco distinguibili. Ho creato una base da personalizzare: una foto ravvicinata su sfondo chiaro aiuta.',
};

function hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: h * 60, s: max ? d / max : 0, v: max / 255 };
}

function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

/** k-means (k = 3) over the border pixels: a table plus a wall usually form two clusters. */
function backgroundModel(samples) {
  const T = THRESHOLDS;
  const medianRgb = list => [0, 1, 2].map(k => median(list.map(sample => sample.rgb[k])));
  const overall = medianRgb(samples);
  let centers = ['top', 'bottom', 'sides'].map(group => {
    const members = samples.filter(sample => sample.group === group);
    return members.length ? medianRgb(members) : overall;
  });
  const sideTotals = {};
  for (const sample of samples) sideTotals[sample.side] = (sideTotals[sample.side] || 0) + 1;
  const assignment = new Uint8Array(samples.length);
  for (let iteration = 0; iteration < 6; iteration++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    samples.forEach((sample, index) => {
      let best = 0, bestDistance = Infinity;
      centers.forEach((center, k) => {
        const d = distance(sample.rgb, center);
        if (d < bestDistance) { bestDistance = d; best = k; }
      });
      assignment[index] = best;
      const sum = sums[best];
      sum[0] += sample.rgb[0]; sum[1] += sample.rgb[1]; sum[2] += sample.rgb[2]; sum[3]++;
    });
    centers = centers.map((center, k) => (sums[k][3] ? [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]] : center));
  }
  const clusters = centers.map((center, k) => {
    const members = samples.filter((_, index) => assignment[index] === k);
    if (members.length < samples.length * T.clusterMinShare) return null;
    // A real background (table, wall) shows on several sides; a toy leaning on one edge does not.
    const perSide = {};
    for (const member of members) perSide[member.side] = (perSide[member.side] || 0) + 1;
    const sides = Object.entries(perSide).filter(([side, count]) => count >= Math.max(3, sideTotals[side] * T.clusterSideShare)).length;
    if (sides < T.clusterMinSides) return null;
    const spread = median(members.map(sample => distance(sample.rgb, center)));
    return { center, tolerance: clamp(T.toleranceBase + T.toleranceSpread * spread, T.toleranceMin, T.toleranceMax) };
  }).filter(Boolean);
  const fit = samples.filter(sample => clusters.some(cluster => distance(sample.rgb, cluster.center) <= cluster.tolerance)).length / samples.length;
  return { clusters, fit };
}

function morph(mask, width, height, dilating) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let hit = dilating ? 0 : 1;
    scan: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      // Outside the image counts as set for erosion and unset for dilation, so edges do not shrink.
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const value = mask[ny * width + nx];
      if (dilating && value) { hit = 1; break scan; }
      if (!dilating && !value) { hit = 0; break scan; }
    }
    out[y * width + x] = hit;
  }
  return out;
}
const dilate = (mask, width, height) => morph(mask, width, height, true);
const erode = (mask, width, height) => morph(mask, width, height, false);

/** 4-connected components with area, bounding box and centroid sums. */
function labelComponents(mask, width, height) {
  const labels = new Int32Array(mask.length);
  const queue = new Int32Array(mask.length);
  const list = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    const id = list.length + 1;
    const component = { id, area: 0, minX: width, maxX: -1, minY: height, maxY: -1, sumX: 0, sumY: 0, first: start };
    let head = 0, tail = 0;
    labels[start] = id; queue[tail++] = start;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width, y = (index - x) / width;
      component.area++; component.sumX += x; component.sumY += y;
      if (x < component.minX) component.minX = x;
      if (x > component.maxX) component.maxX = x;
      if (y < component.minY) component.minY = y;
      if (y > component.maxY) component.maxY = y;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const next of neighbors) if (next >= 0 && mask[next] && !labels[next]) { labels[next] = id; queue[tail++] = next; }
    }
    list.push(component);
  }
  return { labels, list };
}

/**
 * Pure, deterministic object segmentation on a small image: models the background from the
 * border, flood-fills it, cleans the mask and keeps the most central blob. Reports honestly
 * when the photo cannot be separated (cluttered border, object filling the frame, ...).
 */
export function segmentObject(data, width, height) {
  const T = THRESHOLDS;
  const ring = Math.max(T.ringMin, Math.round(Math.min(width, height) * T.ring));
  const inRing = (x, y) => x < ring || y < ring || x >= width - ring || y >= height - ring;
  const samples = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!inRing(x, y)) continue;
    const i = (y * width + x) * 4;
    if (data[i + 3] < 128) continue;
    const side = y < ring ? 'top' : y >= height - ring ? 'bottom' : x < ring ? 'left' : 'right';
    samples.push({ rgb: [data[i], data[i + 1], data[i + 2]], side, group: side === 'left' || side === 'right' ? 'sides' : side });
  }
  if (samples.length < T.minBorderSamples) return { reliable: false, reason: 'border', borderFit: 0 };
  const { clusters, fit } = backgroundModel(samples);
  if (fit < T.borderFitMin) return { reliable: false, reason: 'border', borderFit: fit };
  const isBackground = rgb => {
    let best = Infinity;
    for (const cluster of clusters) best = Math.min(best, distance(rgb, cluster.center) / cluster.tolerance);
    if (best <= 1) return true;
    if (best > T.shadowTolerance) return false;
    const c = hsv(...rgb);
    return c.s < T.shadowSaturation && c.v >= T.shadowValue;
  };
  const size = width * height;
  const backgroundLike = new Uint8Array(size), reached = new Uint8Array(size), queue = new Int32Array(size);
  let opaque = 0;
  for (let index = 0; index < size; index++) {
    const i = index * 4;
    if (data[i + 3] < 128) { backgroundLike[index] = 1; continue; }
    opaque++;
    if (isBackground([data[i], data[i + 1], data[i + 2]])) backgroundLike[index] = 1;
  }
  let head = 0, tail = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x;
    if (inRing(x, y) && backgroundLike[index] && !reached[index]) { reached[index] = 1; queue[tail++] = index; }
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width, y = (index - x) / width;
    const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
    for (const next of neighbors) if (next >= 0 && backgroundLike[next] && !reached[next]) { reached[next] = 1; queue[tail++] = next; }
  }
  const raw = new Uint8Array(size);
  for (let index = 0; index < size; index++) raw[index] = data[index * 4 + 3] >= 128 && !reached[index] ? 1 : 0;
  const closed = erode(dilate(raw, width, height), width, height);
  const opened = dilate(erode(closed, width, height), width, height);
  const { labels, list } = labelComponents(opened, width, height);
  if (!list.length) return { reliable: false, reason: 'empty', borderFit: fit };
  for (const component of list) {
    const dx = component.sumX / component.area / width - 0.5, dy = component.sumY / component.area / height - 0.55;
    component.sides = (component.minX <= 0) + (component.maxX >= width - 1) + (component.minY <= 0) + (component.maxY >= height - 1);
    component.score = component.area * Math.exp(-1.5 * (dx * dx + dy * dy)) * 0.5 ** component.sides;
  }
  list.sort((a, b) => b.score - a.score);
  const [best, runner] = list;
  const areaFraction = best.area / Math.max(1, opaque);
  const fill = best.area / ((best.maxX - best.minX + 1) * (best.maxY - best.minY + 1));
  let reason = null;
  if (areaFraction < T.areaMin || areaFraction > T.areaMax) reason = 'area';
  // Toys sit on a table: a blob reaching the top edge has swallowed the room behind them.
  else if (best.minY <= 0) reason = 'top';
  else if (best.sides > T.maxSidesTouched) reason = 'sides';
  else if (fill < T.fillMin) reason = 'fill';
  else if (runner && best.score < T.dominance * runner.score) reason = 'dominance';
  const mask = new Uint8Array(size);
  for (let index = 0; index < size; index++) mask[index] = labels[index] === best.id ? 1 : 0;
  const closedComponents = labelComponents(closed, width, height);
  const closedId = closedComponents.labels[best.first];
  const closedComponent = closedComponents.list.find(component => component.id === closedId) || best;
  const closedMask = new Uint8Array(size);
  for (let index = 0; index < size; index++) closedMask[index] = closedComponents.labels[index] === closedId ? 1 : 0;
  return {
    reliable: !reason, reason, borderFit: fit, clusters, width, height, mask, closedMask, area: best.area, areaFraction,
    sidesTouched: best.sides, centroid: { x: best.sumX / best.area, y: best.sumY / best.area },
    bbox: { minX: best.minX, maxX: best.maxX, minY: best.minY, maxY: best.maxY },
    closedBbox: { minX: closedComponent.minX, maxX: closedComponent.maxX, minY: closedComponent.minY, maxY: closedComponent.maxY },
  };
}

/** k-means over one list of colours; returns the clusters big enough to matter, with a tolerance from their spread. */
function colourClusters(colours, k, minShare) {
  const T = THRESHOLDS;
  if (colours.length < k) return [];
  let centers = Array.from({ length: k }, (_, i) => colours[Math.floor((i + 0.5) * colours.length / k)]);
  const assignment = new Uint8Array(colours.length);
  for (let iteration = 0; iteration < 8; iteration++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    colours.forEach((rgb, index) => {
      let best = 0, bestDistance = Infinity;
      centers.forEach((center, c) => { const d = distance(rgb, center); if (d < bestDistance) { bestDistance = d; best = c; } });
      assignment[index] = best;
      const sum = sums[best];
      sum[0] += rgb[0]; sum[1] += rgb[1]; sum[2] += rgb[2]; sum[3]++;
    });
    centers = centers.map((center, c) => (sums[c][3] ? [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]] : center));
  }
  return centers.map((center, c) => {
    const members = colours.filter((_, index) => assignment[index] === c);
    if (members.length < colours.length * minShare) return null;
    const spread = median(members.map(rgb => distance(rgb, center)));
    return { center, tolerance: clamp(T.toleranceBase + T.toleranceSpread * spread, T.toleranceMin, T.toleranceMax), share: members.length / colours.length };
  }).filter(Boolean);
}

/**
 * Second strategy for cluttered rooms: toys stand on a table, and the table is the one background we can trust.
 * Models the table from the bottom band, then reads each column upwards: table → object → table again (or the
 * room). Columns bounded by table above and below define the object; unbounded columns (an antenna against the
 * wall, a shirt right behind the roof) are capped at a plausible height so the room never joins the toy.
 */
export function segmentOnTable(data, width, height) {
  const T = THRESHOLDS;
  const band = Math.max(3, Math.round(height * 0.1));
  const bottom = [];
  for (let y = height - band; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] >= 128) bottom.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (bottom.length < T.minBorderSamples) return { reliable: false, reason: 'table', borderFit: 0 };
  const clusters = colourClusters(bottom, 2, 0.2);
  const isTable = rgb => {
    let best = Infinity;
    for (const cluster of clusters) best = Math.min(best, distance(rgb, cluster.center) / cluster.tolerance);
    if (best <= 1) return true;
    if (best > T.shadowTolerance) return false;
    const c = hsv(...rgb);
    return c.s < 0.2 && c.v >= T.shadowValue * 0.8;
  };
  const fit = bottom.filter(isTable).length / bottom.length;
  if (!clusters.length || fit < 0.7) return { reliable: false, reason: 'table', borderFit: fit };
  const size = width * height;
  const table = new Uint8Array(size);
  let opaque = 0;
  for (let index = 0; index < size; index++) {
    const i = index * 4;
    if (data[i + 3] < 128) { table[index] = 1; continue; }
    opaque++;
    if (isTable([data[i], data[i + 1], data[i + 2]])) table[index] = 1;
  }
  // Column runs: skip the table under the toy, then climb until three table pixels in a row close the run.
  const runs = new Array(width).fill(null);
  for (let x = 0; x < width; x++) {
    let y = height - 1;
    while (y >= 0 && table[y * width + x]) y--;
    if (y < 0 || y < height * 0.25) continue;
    const runBottom = y;
    let tableRun = 0, top = 0, bounded = false;
    for (; y >= 0; y--) {
      if (table[y * width + x]) { tableRun++; if (tableRun >= 3) { top = y + 3; bounded = true; break; } }
      else tableRun = 0;
    }
    if (runBottom - top + 1 >= height * 0.05) runs[x] = { top, bottom: runBottom, bounded };
  }
  // The toy is the widest group of neighbouring object columns (gaps of up to two columns allowed).
  let bestGroup = null, start = -1, gap = 0;
  for (let x = 0; x <= width; x++) {
    if (x < width && runs[x]) { if (start < 0) start = x; gap = 0; continue; }
    if (start >= 0 && (++gap > 2 || x === width)) {
      const end = x - gap;
      if (!bestGroup || end - start > bestGroup.end - bestGroup.start) bestGroup = { start, end };
      start = -1; gap = 0;
    }
  }
  if (!bestGroup || bestGroup.end - bestGroup.start < width * 0.08) return { reliable: false, reason: 'table-empty', borderFit: fit };
  const columns = [];
  for (let x = bestGroup.start; x <= bestGroup.end; x++) if (runs[x]) columns.push(runs[x]);
  const boundedTops = columns.filter(run => run.bounded).map(run => run.top);
  if (boundedTops.length < columns.length * 0.35) return { reliable: false, reason: 'table-open', borderFit: fit };
  const referenceTop = median(boundedTops.slice().sort((a, b) => a - b).slice(0, Math.max(1, Math.floor(boundedTops.length / 3))));
  const referenceBottom = median(columns.map(run => run.bottom));
  const cap = Math.max(0, Math.round(referenceTop - (referenceBottom - referenceTop) * 0.45));
  const raw = new Uint8Array(size);
  for (let x = bestGroup.start; x <= bestGroup.end; x++) {
    const run = runs[x];
    if (!run) continue;
    const top = run.bounded ? run.top : Math.max(run.top, cap);
    for (let y = top; y <= run.bottom; y++) if (!table[y * width + x]) raw[y * width + x] = 1;
  }
  const closed = erode(dilate(raw, width, height), width, height);
  const opened = dilate(erode(closed, width, height), width, height);
  const { labels, list } = labelComponents(opened, width, height);
  if (!list.length) return { reliable: false, reason: 'table-empty', borderFit: fit };
  list.sort((a, b) => b.area - a.area);
  const best = list[0];
  const areaFraction = best.area / Math.max(1, opaque);
  const fill = best.area / ((best.maxX - best.minX + 1) * (best.maxY - best.minY + 1));
  const sides = (best.minX <= 0) + (best.maxX >= width - 1) + (best.minY <= 0) + (best.maxY >= height - 1);
  let reason = null;
  if (areaFraction < 0.03 || areaFraction > T.areaMax) reason = 'area';
  else if (sides > 2) reason = 'sides';
  else if (fill < T.fillMin) reason = 'fill';
  const mask = new Uint8Array(size);
  for (let index = 0; index < size; index++) mask[index] = labels[index] === best.id ? 1 : 0;
  const closedComponents = labelComponents(closed, width, height);
  const closedId = closedComponents.labels[best.first];
  const closedComponent = closedComponents.list.find(component => component.id === closedId) || best;
  const closedMask = new Uint8Array(size);
  for (let index = 0; index < size; index++) closedMask[index] = closedComponents.labels[index] === closedId ? 1 : 0;
  return {
    reliable: !reason, reason, borderFit: fit, clusters, width, height, mask, closedMask, area: best.area, areaFraction, method: 'table',
    sidesTouched: sides, centroid: { x: best.sumX / best.area, y: best.sumY / best.area },
    bbox: { minX: best.minX, maxX: best.maxX, minY: best.minY, maxY: best.maxY },
    closedBbox: { minX: closedComponent.minX, maxX: closedComponent.maxX, minY: closedComponent.minY, maxY: closedComponent.maxY },
  };
}

/**
 * Tires: dark, unsaturated blobs in the lower part of the object. "Dark" is relative to the object itself (its
 * darkest quarter), so grey rubber in a bright photo still counts; merged blobs (two wheels joined by a shadow)
 * are split with extra erosion, and the count includes every blob of plausible size, not just the two biggest.
 */
export function detectWheels(data, segmentation, debug = null) {
  const T = THRESHOLDS;
  const { width, height, mask, bbox } = segmentation;
  const values = [];
  for (let y = bbox.minY; y <= bbox.maxY; y++) for (let x = bbox.minX; x <= bbox.maxX; x++) {
    const index = y * width + x;
    if (mask[index]) values.push(hsv(data[index * 4], data[index * 4 + 1], data[index * 4 + 2]).v);
  }
  if (values.length < 20) return { count: 0, ratio: 0, big: false };
  const sorted = values.slice().sort((a, b) => a - b);
  const darkCut = Math.min(T.wheelValue + 0.12, Math.max(0.2, sorted[Math.floor(sorted.length * 0.24)]));
  const dark = new Uint8Array(width * height);
  for (let y = bbox.minY; y <= bbox.maxY; y++) for (let x = bbox.minX; x <= bbox.maxX; x++) {
    const index = y * width + x;
    if (!mask[index]) continue;
    const c = hsv(data[index * 4], data[index * 4 + 1], data[index * 4 + 2]);
    if (c.v < darkCut && c.s < T.wheelSaturation + 0.1) dark[index] = 1;
  }
  const bboxHeight = bbox.maxY - bbox.minY + 1, bboxWidth = bbox.maxX - bbox.minX + 1;
  const bandTop = bbox.minY + (1 - T.wheelBand) * bboxHeight;
  const minArea = Math.max(6, T.wheelMinArea * width * height * 0.6);
  const plausible = (component) => {
    const w = component.maxX - component.minX + 1, h = component.maxY - component.minY + 1, aspect = w / h;
    const fill = component.area / (w * h);
    const ok = component.area >= minArea && aspect >= 0.5 && aspect <= 1.9 && fill >= 0.42 && component.sumY / component.area >= bandTop && w < bboxWidth * 0.5;
    if (debug) debug.push({ area: component.area, w, h, aspect: +aspect.toFixed(2), fill: +fill.toFixed(2), cx: Math.round(component.sumX / component.area), cy: Math.round(component.sumY / component.area), bandTop: Math.round(bandTop), ok });
    return ok;
  };
  // Light opening first; blobs still too wide to be one tire get eroded again so touching wheels separate.
  const cleaned = dilate(erode(dark, width, height), width, height);
  const components = labelComponents(cleaned, width, height).list;
  let wheels = [];
  for (const component of components) {
    if (component.area < minArea) continue;
    const w = component.maxX - component.minX + 1, h = component.maxY - component.minY + 1;
    if (w / h > 1.9 && component.area >= minArea * 2) {
      const part = new Uint8Array(width * height);
      const { labels } = labelComponents(cleaned, width, height);
      for (let index = 0; index < part.length; index++) part[index] = labels[index] === component.id ? 1 : 0;
      const split = labelComponents(erode(erode(part, width, height), width, height), width, height).list.map(piece => ({ ...piece, area: piece.area * 1.6 }));
      wheels.push(...split.filter(plausible));
    } else if (plausible(component)) wheels.push(component);
  }
  // A light hub can split one tire into two neighbouring crescents: merge blobs whose centres nearly touch.
  wheels.sort((a, b) => b.area - a.area);
  const merged = [];
  for (const blob of wheels) {
    const size = ((blob.maxX - blob.minX + 1) + (blob.maxY - blob.minY + 1)) / 2;
    const near = merged.find(other => {
      const otherSize = ((other.maxX - other.minX + 1) + (other.maxY - other.minY + 1)) / 2;
      return Math.hypot(other.sumX / other.area - blob.sumX / blob.area, other.sumY / other.area - blob.sumY / blob.area) < Math.max(size, otherSize) * 0.75;
    });
    if (near) {
      near.area += blob.area; near.sumX += blob.sumX; near.sumY += blob.sumY;
      near.minX = Math.min(near.minX, blob.minX); near.maxX = Math.max(near.maxX, blob.maxX);
      near.minY = Math.min(near.minY, blob.minY); near.maxY = Math.max(near.maxY, blob.maxY);
    } else merged.push({ ...blob });
  }
  wheels = merged.sort((a, b) => b.area - a.area).slice(0, 4);
  if (debug) debug.push({ merged: wheels.map(c => ({ cx: Math.round(c.sumX / c.area), cy: Math.round(c.sumY / c.area), size: Math.round(((c.maxX - c.minX + 1) + (c.maxY - c.minY + 1)) / 2) })) });
  if (!wheels.length) return { count: 0, ratio: 0, big: false, trike: false };
  const largest = wheels.slice(0, 2);
  const diameter = largest.reduce((sum, c) => sum + ((c.maxX - c.minX + 1) + (c.maxY - c.minY + 1)) / 2, 0) / largest.length;
  const ratio = diameter / bboxHeight;
  const visible = wheels.filter((c) => ((c.maxX - c.minX + 1) + (c.maxY - c.minY + 1)) / 2 >= diameter * 0.45);
  // A trike shows one lone wheel far out at one end and a close pair at the other end of a long chassis.
  // Three visible wheels on a three-quarter view of a normal car are spread out and never form that "1 + 2" pattern.
  let trike = false;
  if (visible.length === 3 && bboxWidth > bboxHeight * 1.5) {
    const centres = visible.map(c => ({ x: c.sumX / c.area, y: c.sumY / c.area })).sort((a, b) => a.x - b.x);
    const gaps = [centres[1].x - centres[0].x, centres[2].x - centres[1].x];
    const pair = gaps[0] < gaps[1] ? [centres[0], centres[1]] : [centres[1], centres[2]];
    const pairGap = Math.min(...gaps), loneGap = Math.max(...gaps);
    // The rear pair sits side by side at the same height; wheels stacked vertically belong to a normal four-wheeler seen at an angle.
    trike = pairGap > diameter * 0.5 && pairGap < diameter * 1.6 && Math.abs(pair[0].y - pair[1].y) < diameter * 0.6 && loneGap > diameter * 3;
  }
  return { count: visible.length, ratio, big: ratio >= T.bigWheelRatio, trike };
}

/** Columns rising well above the roof line: thin → antenna, wide at an end → high wing, wide in the middle → tall cab. */
function detectProtrusions(segmentation) {
  const T = THRESHOLDS;
  const { width, closedMask, closedBbox, bbox } = segmentation;
  const spanX = bbox.maxX - bbox.minX + 1;
  const tops = [];
  for (let x = closedBbox.minX; x <= closedBbox.maxX; x++) {
    for (let y = closedBbox.minY; y <= closedBbox.maxY; y++) if (closedMask[y * width + x]) { tops.push({ x, top: y }); break; }
  }
  if (tops.length < 3) return [];
  const bodyTop = median(tops.map(column => column.top));
  // Measure rises against the body below the roof line, so a wide wing does not inflate the reference height.
  const bodyHeight = Math.max(1, bbox.maxY - bodyTop + 1);
  const rise = T.protrusionRise * bodyHeight;
  const runs = [];
  let current = null;
  for (const column of tops) {
    if (column.top >= bodyTop - rise) continue;
    if (current && column.x - current.endX <= 2) { current.endX = column.x; current.top = Math.min(current.top, column.top); }
    else { current = { startX: column.x, endX: column.x, top: column.top }; runs.push(current); }
  }
  return runs.map(run => {
    const runWidth = (run.endX - run.startX + 1) / spanX, runHeight = (bodyTop - run.top) / bodyHeight;
    const center = ((run.startX + run.endX) / 2 - bbox.minX) / spanX;
    const atEdge = center < T.wingEdge || center > 1 - T.wingEdge;
    if (runWidth <= T.antennaWidth && runHeight >= T.antennaHeight) return { part: 'antenna', runWidth, runHeight };
    if (runWidth <= T.wingWidth && runHeight >= T.wingHeight) return { part: atEdge ? 'highWing' : 'cab', runWidth, runHeight };
    return null;
  }).filter(Boolean).sort((a, b) => b.runHeight - a.runHeight).slice(0, 2);
}

/** Pure, deterministic pixel analysis: palette, proportions and part suggestions. */
export function analyzePixels(data, width, height) {
  const T = THRESHOLDS;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || data.length !== width * height * 4) throw new Error('Immagine non valida.');
  const border = [];
  const borderHue = new Float64Array(24);
  let opaque = 0, hash = 2166136261;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 128) continue;
    opaque++;
    if ((x + y) % 13 === 0) for (let k = 0; k < 3; k++) hash = Math.imul(hash ^ data[i + k], 16777619) >>> 0;
    if (x < width * 0.07 || x > width * 0.93 || y < height * 0.07 || y > height * 0.93) {
      const rgb = [data[i], data[i + 1], data[i + 2]];
      border.push(rgb);
      const c = hsv(...rgb);
      if (c.s > 0.26 && c.v > 0.16) borderHue[Math.floor(c.h / 15) % 24]++;
    }
  }
  if (opaque < Math.max(4, width * height * 0.005)) throw new Error('La foto è vuota o trasparente. Scegli una foto in cui l’auto sia visibile.');
  // Border model first (clean tables and walls); when the room swallows the toy, fall back to the table strategy.
  let segmentation = segmentObject(data, width, height);
  if (!segmentation.reliable) {
    const onTable = segmentOnTable(data, width, height);
    if (onTable.reliable) segmentation = onTable;
    else segmentation = { ...segmentation, tableReason: onTable.reason };
  }
  const reliable = segmentation.reliable;
  // Fallback statistics: median border color and hues that dominate the frame edge (walls, furniture).
  const background = border.length ? [0, 1, 2].map(k => median(border.map(rgb => rgb[k]))) : [255, 255, 255];
  const hueTotal = borderHue.reduce((a, b) => a + b, 0);
  const buckets = new Map();
  const points = [];
  let neutralWeight = 0, observedWeight = 0, saturatedPixels = 0, considered = 0;
  const neutral = [0, 0, 0], observedMean = [0, 0, 0];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x, i = index * 4;
    if (data[i + 3] < 128) continue;
    if (reliable && !segmentation.mask[index]) continue;
    considered++;
    const rgb = [data[i], data[i + 1], data[i + 2]];
    const c = hsv(...rgb);
    let centerWeight = 1, diff = Infinity, borderPenalty = 1;
    if (!reliable) {
      const dx = (x / width - 0.5) * 2, dy = (y / height - 0.52) * 2;
      centerWeight = 0.15 + Math.exp(-(dx * dx * 2.2 + dy * dy * 2.8));
      diff = distance(rgb, background);
    }
    observedWeight += centerWeight;
    rgb.forEach((v, k) => { observedMean[k] += v * centerWeight; });
    if ((reliable || diff > T.neutralGap) && c.v > 0.12 && c.v < 0.95) {
      neutralWeight += centerWeight;
      rgb.forEach((v, k) => { neutral[k] += v * centerWeight; });
    }
    if (c.s < T.saturationMin || c.v < T.valueMin || (!reliable && diff < T.backgroundGap)) continue;
    const key = Math.floor(c.h / 15) % 24;
    if (!reliable) {
      const borderFraction = hueTotal ? borderHue[key] / hueTotal : 0;
      borderPenalty = 1 - Math.min(0.82, borderFraction * 1.25);
    }
    const weight = centerWeight * c.s ** 1.4 * borderPenalty * (0.55 + c.v * 0.45);
    saturatedPixels++;
    if (!buckets.has(key)) buckets.set(key, { weight: 0, rgb: [0, 0, 0], hue: key * 15 + 7.5 });
    const bucket = buckets.get(key);
    bucket.weight += weight;
    rgb.forEach((v, k) => { bucket.rgb[k] += v * weight; });
    if (!reliable) points.push({ x, y, weight });
  }
  const sorted = [...buckets.values()].sort((a, b) => b.weight - a.weight);
  // Merge neighboring hue bins so a red-orange body doesn't become both colors.
  const colors = [];
  for (const bucket of sorted) {
    if (colors.some(c => Math.min(Math.abs(c.hue - bucket.hue), 360 - Math.abs(c.hue - bucket.hue)) < 32)) continue;
    colors.push({ hue: bucket.hue, rgb: bucket.rgb.map(v => v / bucket.weight), weight: bucket.weight });
    if (colors.length === 4) break;
  }
  const colorful = colors.length > 0 && saturatedPixels / Math.max(1, reliable ? considered : opaque) > (reliable ? T.colorfulObject : T.colorfulFrame);
  // Lift very dark photographed plastic (shadows, indoor light) into readable game colors.
  const lift = rgb => { const peak = Math.max(...rgb); return peak < 145 ? rgb.map(v => v * 145 / Math.max(peak, 1)) : rgb; };
  for (const color of colors) color.rgb = lift(color.rgb);
  // Without a separable object keep the visible color instead of inventing a gray palette.
  const primary = lift(colorful ? colors[0].rgb : neutralWeight ? neutral.map(v => v / neutralWeight) : observedMean.map(v => v / observedWeight));
  const secondary = colorful && colors[1] && colors[1].weight > colors[0].weight * 0.08 ? colors[1].rgb : [255, 211, 87];

  let ratio = 1.7;
  if (reliable) {
    const columns = new Float64Array(width), rows = new Float64Array(height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (segmentation.mask[y * width + x]) { columns[x]++; rows[y]++; }
    const quantile = (counts, q) => {
      const target = segmentation.area * q;
      let sum = 0;
      for (let i = 0; i < counts.length; i++) { sum += counts[i]; if (sum >= target) return i; }
      return counts.length - 1;
    };
    ratio = (quantile(columns, 0.94) - quantile(columns, 0.06) + 1) / (quantile(rows, 0.94) - quantile(rows, 0.06) + 1);
  } else if (points.length > 8) {
    const quantile = (key, q) => {
      const ordered = points.slice().sort((a, b) => a[key] - b[key]);
      const target = ordered.reduce((sum, p) => sum + p.weight, 0) * q;
      let sum = 0;
      for (const p of ordered) { sum += p.weight; if (sum >= target) return p[key]; }
      return ordered.at(-1)[key];
    };
    ratio = (quantile('x', 0.94) - quantile('x', 0.06) + 1) / (quantile('y', 0.94) - quantile('y', 0.06) + 1);
  }
  const shape = ratio > 2.15 ? 'racer' : ratio < 1.15 ? 'truck' : 'buggy';
  const length = reliable ? clamp(2.55 + (ratio - 1.2) * 0.45, 2.4, 3.7) : clamp(2.8 + (ratio - 1.3) * 0.28, 2.7, 3.55);
  const carHeight = reliable ? clamp(1.85 - 0.42 * ratio, 0.7, 1.7) : HEIGHT_BY_SHAPE[shape];
  const confidence = !colorful ? 'low' : reliable ? 'object' : 'palette';

  const wheels = reliable ? detectWheels(data, segmentation) : { count: 0, ratio: 0, big: false };
  const protrusions = reliable ? detectProtrusions(segmentation) : [];
  const totalWeight = colors.reduce((sum, c) => sum + c.weight, 0);
  const parts = [];
  if (confidence === 'object') {
    if (wheels.big) parts.push('bigWheels');
    if (wheels.trike) parts.push('threeWheels');
    parts.push(...protrusions.map(p => p.part));
  }
  if (colorful && colors.length >= T.cargoHues && colors[0].weight / totalWeight < T.cargoDominance) parts.push('cargo');
  let qualityNote = NOTES[confidence];
  if (confidence === 'object' && segmentation.areaFraction < T.smallObject) qualityNote += NOTES.objectSmall;
  if (confidence === 'object' && wheels.count) qualityNote += wheels.trike ? ' Ho visto una ruota sola davanti e due dietro: un triciclo!' : ` Ho contato ${wheels.count} ruote in vista.`;

  return {
    color: hex(primary), accent: hex(secondary), palette: colors.length ? colors.map(c => hex(c.rgb)) : [hex(primary), hex(secondary)],
    shape, width: WIDTH_BY_SHAPE[shape], length: Math.round(length * 100) / 100, height: Math.round(carHeight * 100) / 100,
    parts: normalizeParts(parts),
    signature: (hash >>> 0).toString(16), confidence, qualityNote,
    hints: {
      reliable, reason: segmentation.reason || null, method: segmentation.method || (reliable ? 'border' : null), borderFit: segmentation.borderFit ?? 0, maskArea: segmentation.areaFraction ?? 0,
      sidesTouched: segmentation.sidesTouched ?? 0, ratio, wheelRatio: wheels.ratio, wheels: wheels.count,
      protrusions: protrusions.map(p => p.part), bbox: reliable ? segmentation.bbox : null,
    },
  };
}

export function validatePhotoFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) throw new Error('Scegli una foto valida.');
  if (file.size > MAX_BYTES) throw new Error('Questa foto è troppo grande. Scegline una sotto i 12 MB.');
  if (!ALLOWED_TYPES.has(file.type) && !(file.type === '' && /\.(jpe?g|png|webp)$/i.test(file.name || ''))) throw new Error('Usa una foto JPG, PNG oppure WebP.');
}

export async function analyzePhoto(file) {
  validatePhotoFile(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const candidate = new Image();
      const timer = setTimeout(() => reject(new Error('La foto impiega troppo tempo. Prova con una foto più piccola.')), 15000);
      candidate.onload = () => { clearTimeout(timer); resolve(candidate); };
      candidate.onerror = () => { clearTimeout(timer); reject(new Error('Non riesco a leggere questa foto. Prova con un altro file JPG o PNG.')); };
      candidate.src = url;
    });
    if (img.naturalWidth < 16 || img.naturalHeight < 16) throw new Error('La foto è troppo piccola. Scegli una foto più grande.');
    if (img.naturalWidth * img.naturalHeight > 60_000_000) throw new Error('La risoluzione è molto alta. Scegli una foto più piccola (fino a 60 megapixel).');
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Il browser non riesce ad aprire la foto.');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const analysis = analyzePixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    // When the object was isolated, frame the thumbnail around it with a small margin.
    let crop = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
    if (analysis.confidence === 'object' && analysis.hints.bbox) {
      const scale = img.naturalWidth / canvas.width;
      const box = analysis.hints.bbox;
      const boxWidth = (box.maxX - box.minX + 1) * scale, boxHeight = (box.maxY - box.minY + 1) * scale;
      const x = clamp(box.minX * scale - boxWidth * 0.15, 0, img.naturalWidth - 1);
      const y = clamp(box.minY * scale - boxHeight * 0.15, 0, img.naturalHeight - 1);
      crop = { x, y, width: Math.max(16, Math.min(img.naturalWidth - x, boxWidth * 1.3)), height: Math.max(16, Math.min(img.naturalHeight - y, boxHeight * 1.3)) };
    }
    const thumbRatio = Math.min(1, 512 / Math.max(crop.width, crop.height));
    canvas.width = Math.max(1, Math.round(crop.width * thumbRatio));
    canvas.height = Math.max(1, Math.round(crop.height * thumbRatio));
    context.fillStyle = '#f4f0e7'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
    const name = (file.name || 'La mia auto').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 28) || 'La mia auto';
    const { signature, hints, qualityNote, ...spec } = analysis;
    return {
      spec: { ...spec, version: 2, id: `photo-${signature}`, name, source: 'photo', tag: 'LA TUA CREAZIONE', description: 'La tua foto diventa un’auto di mattoncini da personalizzare.', provenance: 'Versione procedurale ricavata localmente dai colori, dalle proporzioni e dai pezzi riconoscibili nella foto.' },
      thumbnail,
      qualityNote,
      hints,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
