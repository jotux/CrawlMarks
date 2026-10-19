import { describe, expect, it } from 'vitest';
import { spreadLabels } from './labels';

const minGap = (ys: number[]) => {
  const s = [...ys].sort((a, b) => a - b);
  return Math.min(...s.slice(1).map((y, i) => y - s[i]));
};

describe('spreadLabels', () => {
  it('leaves labels that already have room where they are', () => {
    expect(spreadLabels([10, 20, 30], 3, 0, 100)).toEqual([10, 20, 30]);
  });

  it('spreads a crowded group evenly around its centre', () => {
    const ys = spreadLabels([50, 50.5, 51], 3, 0, 100);
    expect(ys[0]).toBeCloseTo(47.5);
    expect(ys[1]).toBeCloseTo(50.5);
    expect(ys[2]).toBeCloseTo(53.5);
  });

  it('keeps input order and the minimum gap', () => {
    const targets = [80, 79.6, 79.2, 78.9, 78.7, 75, 60];
    const ys = spreadLabels(targets, 3, 10, 83);
    expect(minGap(ys)).toBeGreaterThanOrEqual(3 - 1e-9);
    // a label that sits further down the card stays further down
    for (let i = 0; i < targets.length; i++) {
      for (let j = 0; j < targets.length; j++) {
        if (targets[i] < targets[j]) expect(ys[i]).toBeLessThan(ys[j]);
      }
    }
  });

  it('pushes a group up off the bottom edge', () => {
    const ys = spreadLabels([82, 82.2, 82.4], 3, 0, 83);
    expect(Math.max(...ys)).toBeCloseTo(83);
    expect(minGap(ys)).toBeGreaterThanOrEqual(3 - 1e-9);
  });

  it('merges a pushed group into the one above it', () => {
    const ys = spreadLabels([74, 81, 82, 83], 3, 0, 83);
    expect(minGap(ys)).toBeGreaterThanOrEqual(3 - 1e-9);
    expect(Math.max(...ys)).toBeLessThanOrEqual(83 + 1e-9);
  });
});
