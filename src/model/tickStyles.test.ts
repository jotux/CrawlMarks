import { describe, expect, it } from 'vitest';
import { TICK_STYLES, tickSegments } from './tickStyles';

const length = (segs: [number, number][]) => segs.reduce((s, [a, b]) => s + (b - a), 0);

describe('tick styles', () => {
  for (const { id } of TICK_STYLES) {
    it(`${id}: long lines are longer than short ones and stay on the face`, () => {
      const long = tickSegments(id, true, 0);
      const shorts = [1, 2, 3].map((k) => tickSegments(id, false, k));
      for (const segs of [long, ...shorts]) {
        for (const [a, b] of segs) {
          expect(a).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThanOrEqual(1);
          expect(b).toBeGreaterThan(a);
        }
      }
      for (const s of shorts) expect(length(s)).toBeLessThan(length(long));
    });
  }

  it('left and right justify to opposite edges', () => {
    expect(tickSegments('left', false, 1)[0][0]).toBe(tickSegments('left', true, 0)[0][0]);
    expect(tickSegments('right', false, 1)[0][1]).toBe(tickSegments('right', true, 0)[0][1]);
  });

  it('alternating swaps sides between neighbouring short lines', () => {
    expect(tickSegments('alternating', false, 1)).not.toEqual(tickSegments('alternating', false, 2));
    expect(tickSegments('alternating', false, 1)).toEqual(tickSegments('alternating', false, 3));
  });
});

describe('newer tick styles', () => {
  it('string side starts from the edge the strip reads from, flipping with the hand', () => {
    expect(tickSegments('string-side', false, 1, { count: 4, hand: 'right' })).toEqual(tickSegments('left', false, 1));
    expect(tickSegments('string-side', true, 0, { count: 4, hand: 'left' })).toEqual(tickSegments('right', true, 0));
  });

  it('staircase steps each short line across the tab, all the same length', () => {
    const ctx = { count: 4, hand: 'right' as const };
    const shorts = [1, 2, 3, 4].map((k) => tickSegments('staircase', false, k, ctx)[0]);
    for (let i = 1; i < shorts.length; i++) expect(shorts[i][0]).toBeGreaterThan(shorts[i - 1][0]);
    expect(shorts[0][0]).toBeCloseTo(0.1);
    expect(shorts[3][1]).toBeCloseTo(0.9);
    for (const [a, b] of shorts) expect(b - a).toBeCloseTo(0.2);
    expect(tickSegments('staircase', false, 1, { count: 1, hand: 'right' })[0]).toEqual([0.4, 0.6]);
  });

  it('dot-dash short marks are tiny and centred', () => {
    const [[a, b]] = tickSegments('dot-dash', false, 2);
    expect(b - a).toBeLessThanOrEqual(0.12);
    expect((a + b) / 2).toBeCloseTo(0.5);
  });
});
