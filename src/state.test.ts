import { describe, expect, it } from 'vitest';
import { defaultState, withDistance, withDistanceAt, withoutDistance } from './state';

const at = (distances: number[]) => ({ ...defaultState, distances });

describe('distance list', () => {
  it('moves a distance to a new position', () => {
    expect(withDistanceAt(at([5, 10, 18, 25]), 25, 0).distances).toEqual([25, 5, 10, 18]);
    expect(withDistanceAt(at([5, 10, 18, 25]), 5, 2).distances).toEqual([10, 18, 5, 25]);
    expect(withDistanceAt(at([5, 10, 18]), 10, 99).distances).toEqual([5, 18, 10]);
    const same = at([5, 10]);
    expect(withDistanceAt(same, 5, -1)).toBe(same);
    expect(withDistanceAt(same, 30, 0)).toBe(same);
  });

  it('deletes a distance but keeps its reading', () => {
    const s = withoutDistance({ ...at([5, 10, 18]), readings: { 10: '20' } }, 10);
    expect(s.distances).toEqual([5, 18]);
    expect(s.readings[10]).toBe('20');
  });

  it('adds in distance order, or at the end once reordered', () => {
    expect(withDistance(at([5, 18, 30]), 10).distances).toEqual([5, 10, 18, 30]);
    expect(withDistance(at([30, 5, 18]), 10).distances).toEqual([30, 5, 18, 10]);
    const s = at([5, 10]);
    expect(withDistance(s, 10)).toBe(s);
  });
});
