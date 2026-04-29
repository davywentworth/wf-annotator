export function getMagnitude(distancePx) {
  if (distancePx < 50) return 'nudge';
  if (distancePx < 200) return 'shift';
  return 'far';
}
