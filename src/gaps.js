/**
 * Times and gaps for the results screens. Pure: no DOM, no three.js.
 *
 * The race ends as soon as every human has crossed the line, so the opponents still on track have no finish time.
 * Theirs is estimated from their average speed so far and marked `estimated`, and the screen prints it with "~".
 */

/**
 * One `{ time, estimated }` per racer id. `now` is the race clock when the results are shown, `finishDistance` the
 * progress at the line. Estimated times are kept in rank order, so a gap never contradicts the position.
 */
export function raceTimes(racers, now, finishDistance) {
  const times = new Map();
  let previous = 0;
  for (const racer of [...racers].sort((a, b) => a.rank - b.rank)) {
    let time, estimated = false;
    if (racer.finished && Number.isFinite(racer.finishTime)) time = racer.finishTime;
    else {
      const average = now > 0 && racer.progress > 0 ? racer.progress / now : 0;
      const remaining = Math.max(0, finishDistance - racer.progress);
      time = now + remaining / Math.max(1, average);
      estimated = true;
    }
    // Ahead on the road means ahead in time too: an estimate never lands before the racer in front of it.
    if (estimated) time = Math.max(time, previous + 0.1);
    previous = time;
    times.set(racer.id, { time, estimated });
  }
  return times;
}

/** Tenths of a second, decimal comma: "12,4" or, from a minute up, "1:05,3". */
export function formatSeconds(seconds) {
  const tenths = Math.round(Math.abs(seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = tenths % 600;
  const whole = Math.floor(rest / 10), decimal = rest % 10;
  return minutes ? `${minutes}:${String(whole).padStart(2, '0')},${decimal}` : `${whole},${decimal}`;
}

/** A race time on the results screen: "1:12,4", or "~1:12,4" when it is an estimate. */
export function formatRaceTime({ time, estimated }) {
  const text = formatSeconds(time);
  return `${estimated ? '~' : ''}${text.includes(':') ? text : `0:${text.padStart(4, '0')}`}`;
}

/**
 * The gap of one time from the reference pilot's: "+1,8 s" behind, "−0,9 s" (a real minus sign) ahead,
 * "~ +4,0 s" when either time is an estimate. `kind` picks the colour: 'behind', 'ahead' or 'even'.
 */
export function formatGap(time, reference) {
  const delta = time.time - reference.time;
  const tenths = Math.round(Math.abs(delta) * 10);
  const kind = tenths === 0 ? 'even' : delta > 0 ? 'behind' : 'ahead';
  const sign = kind === 'behind' ? '+' : kind === 'ahead' ? '−' : '';
  const body = formatSeconds(delta);
  const text = `${sign}${body}${body.includes(':') ? '' : ' s'}`;
  return { text: time.estimated || reference.estimated ? `~ ${text}` : text, kind };
}

/** Sums the times of a cup's races. One estimated race makes the total an estimate as well. */
export function addTimes(total, time) {
  if (!time) return total ?? null;
  if (!total) return { time: time.time, estimated: !!time.estimated };
  return { time: total.time + time.time, estimated: total.estimated || !!time.estimated };
}
