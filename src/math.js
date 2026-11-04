/** `value` held between `min` and `max`. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
