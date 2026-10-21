import { describe, expect, it } from 'vitest';
import { crawlAt, farDistanceFor, fitCrawl, offCurve, twinDistance, type CrawlFit, type CurveModel } from './fit';

const truth = { a: 60, b: 200, c: 1.2 };
const exact = (d: number) => truth.a - truth.b / d - truth.c * d;

function mustFit(readings: { distance: number; crawl: number }[], model: CurveModel = 'ballistic'): CrawlFit {
  const r = fitCrawl(readings, model);
  if (!r.ok) throw new Error(r.reason);
  return r.fit;
}

describe('fitCrawl', () => {
  it('recovers the parameters of noiseless data', () => {
    const fit = mustFit([5, 10, 18, 25, 30, 40].map((d) => ({ distance: d, crawl: exact(d) })));
    expect(fit.p[0]).toBeCloseTo(truth.a, 6);
    expect(fit.p[1]).toBeCloseTo(truth.b, 6);
    expect(fit.p[2]).toBeCloseTo(truth.c, 6);
    expect(fit.rms).toBeCloseTo(0, 6);
    expect(fit.fold).toBeCloseTo(Math.sqrt(200 / 1.2), 6);
    expect(crawlAt(fit, fit.pointOn!)).toBeCloseTo(0, 6);
  });

  it('fits the prototype sample readings sensibly', () => {
    const data = [[5, 26.5], [10, 41.5], [18, 39.5], [25, 32.5], [30, 26.5], [40, 13.5], [50, 0]];
    const fit = mustFit(data.map(([distance, crawl]) => ({ distance, crawl })));
    expect(fit.fold).toBeGreaterThan(10);
    expect(fit.fold).toBeLessThan(15);
    expect(fit.pointOn).toBeGreaterThan(45);
    expect(fit.pointOn).toBeLessThan(55);
    expect(fit.rms).toBeLessThan(2);
  });

  it('needs three distinct distances', () => {
    expect(fitCrawl([{ distance: 10, crawl: 30 }, { distance: 10, crawl: 31 }, { distance: 20, crawl: 25 }]).ok).toBe(false);
  });

  it('rejects crawl that grows with distance', () => {
    const r = fitCrawl([10, 20, 30, 40].map((d) => ({ distance: d, crawl: d })));
    expect(r.ok).toBe(false);
  });

  it('reports no fold when there is no near turn-back', () => {
    const fit = mustFit([20, 30, 40, 50].map((d) => ({ distance: d, crawl: 50 - d + 5 / d })));
    expect(fit.fold).toBeNull();
  });
});

describe('twins and inverses', () => {
  const fit = mustFit([5, 10, 18, 25, 30, 40].map((d) => ({ distance: d, crawl: exact(d) })));

  it('a near distance and its twin share a crawl', () => {
    for (const d of [3, 5, 8, 10]) expect(crawlAt(fit, twinDistance(fit, d)!)).toBeCloseTo(crawlAt(fit, d), 9);
    for (const d of [3, 5, 8, 10]) expect(twinDistance(fit, d)).toBeCloseTo(truth.b / (truth.c * d), 6);
  });

  it('farDistanceFor inverts crawlAt on the far branch', () => {
    for (const d of [15, 22.5, 35, 45]) expect(farDistanceFor(fit, crawlAt(fit, d))).toBeCloseTo(d, 9);
  });
});

describe('offCurve', () => {
  it('flags only readings further than the limit, worst first', () => {
    const readings = [5, 10, 18, 25, 30, 40, 50].map((d) => ({ distance: d, crawl: exact(d) }));
    readings[2] = { distance: 18, crawl: exact(18) + 4 }; // one bad reading
    const fit = mustFit(readings);
    const misses = offCurve(fit, readings, 1.5);
    expect(misses[0].distance).toBe(18);
    expect(misses[0].off).toBeGreaterThan(1.5);
    expect(misses.every((m) => Math.abs(m.off) > 1.5)).toBe(true);
  });

  it('flags nothing for a clean fit', () => {
    const readings = [5, 10, 18, 25, 30, 40].map((d) => ({ distance: d, crawl: exact(d) }));
    expect(offCurve(mustFit(readings), readings, 0.1)).toEqual([]);
  });
});

describe('other curves', () => {
  const ds = [5, 10, 18, 25, 30, 40, 50];

  it('linear recovers a straight line and has no fold', () => {
    const fit = mustFit(ds.map((d) => ({ distance: d, crawl: 55 - 1.1 * d })), 'linear');
    expect(fit.p[0]).toBeCloseTo(55, 6);
    expect(fit.p[1]).toBeCloseTo(1.1, 6);
    expect(fit.fold).toBeNull();
    expect(fit.pointOn).toBeCloseTo(50, 6);
  });

  it('quadratic recovers a bending line', () => {
    const q = (d: number) => 60 - 0.8 * d - 0.008 * d * d;
    const fit = mustFit(ds.map((d) => ({ distance: d, crawl: q(d) })), 'quadratic');
    expect(fit.p).toHaveLength(3);
    expect(fit.p[2]).toBeCloseTo(0.008, 6);
    expect(fit.rms).toBeCloseTo(0, 6);
    expect(fit.fold).toBeNull();
    expect(crawlAt(fit, fit.pointOn!)).toBeCloseTo(0, 6);
  });

  it('quadratic finds the fold when the readings turn back', () => {
    const fit = mustFit(ds.map((d) => ({ distance: d, crawl: exact(d) })), 'quadratic');
    expect(fit.fold).not.toBeNull();
    expect(fit.fold!).toBeGreaterThan(5);
    expect(fit.fold!).toBeLessThan(25);
  });

  it('manual passes through every reading without overshooting', () => {
    const data = [[5, 26.5], [10, 41.5], [18, 39.5], [25, 32.5], [30, 26.5], [40, 13.5], [50, 0]];
    const fit = mustFit(data.map(([distance, crawl]) => ({ distance, crawl })), 'manual');
    for (const [d, y] of data) expect(crawlAt(fit, d)).toBeCloseTo(y, 9);
    expect(fit.rms).toBeCloseTo(0, 9);
    expect(fit.fold).toBe(10);
    expect(fit.pointOn).toBeCloseTo(50, 6);
    for (let d = 10; d <= 50; d += 0.5) expect(crawlAt(fit, d)).toBeLessThanOrEqual(41.5 + 1e-9);
  });

  it('auto picks the curve the readings came from', () => {
    const line = fitCrawl(ds.map((d) => ({ distance: d, crawl: 55 - 1.1 * d + (d % 2 ? 0.2 : -0.2) })), 'auto');
    expect(line.ok && line.fit.kind).toBe('linear');
    const folded = fitCrawl(ds.map((d) => ({ distance: d, crawl: exact(d) })), 'auto');
    expect(folded.ok && folded.fit.kind).toBe('ballistic');
  });

  it('defaults to quadratic', () => {
    const r = fitCrawl(ds.map((d) => ({ distance: d, crawl: 55 - 1.1 * d })));
    expect(r.ok && r.fit.kind).toBe('quadratic');
  });
});
