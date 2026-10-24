/** Finest tick a person can read at a glance on a printed tab, about a ruler's 1 mm. */
export const MIN_TICK_MM = 1;
/** Number labels need room for their own height plus a little air. */
export const MIN_LABEL_MM = 4;

/**
 * Small-tick step, in strip units, for a scale of `scaleMax` units spread over
 * `lengthMm` millimetres: the finest of 1, 2 or 5 units that keeps ticks at least
 * MIN_TICK_MM apart.
 */
export function tickStep(lengthMm: number, scaleMax: number): number {
  return [1, 2, 5, 10].find((s) => (s * lengthMm) / scaleMax >= MIN_TICK_MM - 1e-9) ?? 10;
}

/** Label step in strip units: a labelled major line every 10 where it fits, else every 20 or 50. */
export function labelStep(lengthMm: number, scaleMax: number): number {
  return [10, 20, 50].find((s) => (s * lengthMm) / scaleMax >= MIN_LABEL_MM - 1e-9) ?? 50;
}

export interface Tick {
  units: number;
  size: 'label' | 'half' | 'small';
}

/** Every tick on the strip: small ticks on the step, a longer one each 5 units, labelled ones on the label step. */
export function stripTicks(lengthMm: number, scaleMax: number): Tick[] {
  const step = tickStep(lengthMm, scaleMax);
  const label = labelStep(lengthMm, scaleMax);
  const ticks: Tick[] = [];
  for (let u = 0; u <= scaleMax; u++) {
    if (u % label === 0) ticks.push({ units: u, size: 'label' });
    else if (u % 5 === 0 && (5 * lengthMm) / scaleMax >= MIN_TICK_MM) ticks.push({ units: u, size: 'half' });
    else if (u % step === 0) ticks.push({ units: u, size: 'small' });
  }
  return ticks;
}
