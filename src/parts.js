/**
 * Composable accessories ("pezzi") for cars created from photos.
 * No three.js import here: photo analysis and its Node tests depend on this list.
 */
export const CAR_PARTS = [
  { id: 'bigWheels', label: 'Ruotone', emoji: '🛞', hint: 'Ruote giganti da fuoristrada' },
  { id: 'highWing', label: 'Alettone', emoji: '🏁', hint: 'Un grande alettone alto dietro' },
  { id: 'fan', label: 'Ventola', emoji: '🌀', hint: 'Una grande ventola sul retro' },
  { id: 'antenna', label: 'Antenna', emoji: '📡', hint: 'Un’antenna sottile e altissima' },
  { id: 'cargo', label: 'Carico', emoji: '📦', hint: 'Mattoncini colorati impilati dietro' },
  { id: 'rocket', label: 'Razzo', emoji: '🚀', hint: 'Un razzo pronto al lancio' },
  { id: 'driver', label: 'Pilota', emoji: '🧑‍🚀', hint: 'Un pilota al volante' },
  { id: 'cab', label: 'Cabina', emoji: '🚚', hint: 'Una cabina alta con il tetto' },
  { id: 'fin', label: 'Pinna', emoji: '🦈', hint: 'Una pinna sul tetto' },
  { id: 'threeWheels', label: 'Tre ruote', emoji: '🛵', hint: 'Una ruota sola davanti e due dietro, come un triciclo da corsa' },
];

export const PART_IDS = CAR_PARTS.map((part) => part.id);

/** Keeps only known part ids, without duplicates, in catalog order. */
export function normalizeParts(parts) {
  if (!Array.isArray(parts)) return [];
  const wanted = new Set(parts.filter((id) => typeof id === 'string'));
  return PART_IDS.filter((id) => wanted.has(id));
}
