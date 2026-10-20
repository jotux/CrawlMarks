import { describe, expect, it } from 'vitest';
import { fitCrawl, type CrawlFit } from './fit';
import { buildMarks, nearLabels, recordedMarks } from './marks';

const exact = (d: number) => 60 - 200 / d - 1.2 * d;
const r = fitCrawl([5, 10, 18, 25, 30, 40].map((d) => ({ distance: d, crawl: exact(d) })), 'fold');
if (!r.ok) throw new Error(r.reason);
const fit: CrawlFit = r.fit;
const opts = { minor: 4, scaleMax: 52, nearestReading: 5, farthestReading: 40 };

describe('buildMarks', () => {
  const marks = buildMarks(fit, opts);
  const longs = marks.filter((m) => m.long);

  it('puts long lines every 5 m from just past the fold to point-on', () => {
    // fold ≈ 12.9 m, point-on ≈ 46.4 m
    expect(longs.map((m) => m.distance)).toEqual([15, 20, 25, 30, 35, 40, 45]);
    expect(longs.map((m) => m.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']);
  });

  it('puts the requested short lines between neighbours only', () => {
    expect(marks.filter((m) => !m.long)).toHaveLength(6 * 4);
    expect(marks.find((m) => m.id === 'L2·3')?.distance).toBeCloseTo(23, 9);
    expect(marks.some((m) => m.id.startsWith('L7·'))).toBe(false);
  });

  it('keeps every line inside the scale', () => {
    const tight = buildMarks(fit, { ...opts, scaleMax: 20 });
    expect(tight.every((m) => m.crawl >= 0 && m.crawl <= 20)).toBe(true);
    expect(tight[0].id).toBe('L1');
    expect(tight[0].distance).toBe(30); // crawl at 25 m is 22 mm
  });
});

describe('nearLabels', () => {
  const marks = buildMarks(fit, opts);

  it('labels only distances inside the fold', () => {
    const labels = nearLabels(fit, marks, [5, 10, 18, 25], 52);
    expect(labels.map((l) => l.distance)).toEqual([5, 10]);
  });

  it('refers each near distance to the closest line', () => {
    // 10 m is the twin of 200 / (1.2 · 10) ≈ 16.67 m, which is L1·2 with 4 short lines (16 m, 17 m)
    const [ten] = nearLabels(fit, marks, [10], 52);
    expect(['L1·1', 'L1·2']).toContain(ten.ref);
  });
});

describe('recordedMarks', () => {
  it('draws one long line per reading, numbered up the tab, sharing lines for equal readings', () => {
    const marks = recordedMarks([
      { distance: 30, crawl: 26.5 },
      { distance: 5, crawl: 26.5 },
      { distance: 18, crawl: 39.5 },
      { distance: 50, crawl: 0 },
      { distance: 60, crawl: -3 },
    ], 50);
    expect(marks).toEqual([
      { distance: 18, crawl: 39.5, long: true, minor: 0, id: 'L1' },
      { distance: 5, crawl: 26.5, long: true, minor: 0, id: 'L2', alsoFor: [30] },
      { distance: 50, crawl: 0, long: true, minor: 0, id: 'L3' },
    ]);
  });
});
