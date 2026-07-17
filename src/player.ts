export const moveStep = (current: number, delta: -1 | 1, totalSteps: number): number => {
  const lastIndex = Math.max(0, totalSteps - 1);
  return Math.min(lastIndex, Math.max(0, current + delta));
};

export const playbackDelay = (speed: number): number => {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return Math.round(900 / safeSpeed);
};
