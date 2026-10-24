import { describe, expect, it } from 'vitest';
import { labelStep, stripTicks, tickStep } from './strip';

describe('strip ticks', () => {
  it('picks the finest step that stays at least 1 mm apart', () => {
    expect(tickStep(52, 50)).toBe(1); // 1.04 mm
    expect(tickStep(50, 50)).toBe(1); // 1.0 mm
    expect(tickStep(40, 50)).toBe(2); // 1.6 mm
    expect(tickStep(15, 50)).toBe(5); // 1.5 mm
  });

  it('labels a major line every 10 when there is room', () => {
    expect(labelStep(52, 50)).toBe(10);
    expect(labelStep(15, 50)).toBe(20);
  });

  it('builds a 0–50 strip with 10 divisions per major line on a 52 mm face', () => {
    const ticks = stripTicks(52, 50);
    expect(ticks.filter((t) => t.size === 'label').map((t) => t.units)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(ticks.filter((t) => t.size === 'half').map((t) => t.units)).toEqual([5, 15, 25, 35, 45]);
    expect(ticks).toHaveLength(51);
  });
});
