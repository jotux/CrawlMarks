import { CrawlFit, Reading, crawlAt } from './fit';

export interface Mark {
  distance: number;
  crawl: number;
  long: boolean;
  /** 0 for a long line, k for the k-th short line above it */
  minor: number;
  /** L3 for the third long line, L3·2 for the second short line above it */
  id: string;
  /** other distances that share this line (recorded-only marks with the same reading) */
  alsoFor?: number[];
}

export interface MarkOptions {
  /** short lines between each pair of long lines */
  minor: number;
  /** bottom of the strip scale; crawls outside 0..scaleMax are off the face */
  scaleMax: number;
  nearestReading: number;
  farthestReading: number;
}

const EPS = 1e-9;

/**
 * Lines for the far branch of the curve: a long line every 5 m (or yd) and `minor`
 * evenly spaced short lines between neighbours. Lines off the face
 * are dropped.
 */
export function buildMarks(fit: CrawlFit, o: MarkOptions): Mark[] {
  const first = fit.fold !== null
    ? Math.floor(fit.fold / 5) * 5 + 5
    : Math.ceil(o.nearestReading / 5 - EPS) * 5;
  const last = Math.floor((fit.pointOn ?? o.farthestReading) / 5 + EPS) * 5;
  const onFace = (crawl: number) => crawl >= -EPS && crawl <= o.scaleMax + EPS;

  const majors: number[] = [];
  for (let d = first; d <= last; d += 5) if (onFace(crawlAt(fit, d))) majors.push(d);

  const step = 5 / (o.minor + 1);
  const marks: Mark[] = [];
  majors.forEach((d, i) => {
    marks.push({ distance: d, crawl: crawlAt(fit, d), long: true, minor: 0, id: `L${i + 1}` });
    if (majors[i + 1] !== d + 5) return;
    for (let k = 1; k <= o.minor; k++) {
      const dk = d + k * step;
      const crawl = crawlAt(fit, dk);
      if (onFace(crawl)) marks.push({ distance: dk, crawl, long: false, minor: k, id: `L${i + 1}·${k}` });
    }
  });
  return marks;
}

/** Readings closer than this, in strip units, share one line. */
const SAME_LINE = 0.5;

/**
 * One long line per recorded reading, at the reading itself rather than on a curve.
 * Numbered from the bottom of the tab up (L1 has the biggest crawl), as curve lines are.
 * Readings at the same strip position share a line, listed nearest first.
 */
export function recordedMarks(readings: Reading[], scaleMax: number): Mark[] {
  const lines: { crawl: number; distances: number[] }[] = [];
  for (const r of [...readings].sort((a, b) => a.distance - b.distance)) {
    if (r.crawl < -EPS || r.crawl > scaleMax + EPS) continue;
    const same = lines.find((l) => Math.abs(l.crawl - r.crawl) < SAME_LINE);
    if (same) same.distances.push(r.distance);
    else lines.push({ crawl: r.crawl, distances: [r.distance] });
  }
  lines.sort((a, b) => b.crawl - a.crawl);
  return lines.map(({ crawl, distances: [distance, ...alsoFor] }, i) => ({
    distance, crawl, long: true, minor: 0, id: `L${i + 1}`, ...(alsoFor.length ? { alsoFor } : {}),
  }));
}

export interface NearLabel {
  distance: number;
  crawl: number;
  /** id of the line closest to this crawl */
  ref: string;
  /** true when that line is within half a strip unit */
  exact: boolean;
}

/** Near distances (inside the fold) placed on the key card next to the line they share. */
export function nearLabels(fit: CrawlFit, marks: Mark[], distances: number[], scaleMax: number): NearLabel[] {
  const fold = fit.fold;
  if (fold === null || marks.length === 0) return [];
  return [...distances].sort((a, b) => a - b)
    .filter((d) => d < fold)
    .map((d) => {
      const crawl = crawlAt(fit, d);
      const best = marks.reduce((m, x) => (Math.abs(x.crawl - crawl) < Math.abs(m.crawl - crawl) ? x : m));
      return { distance: d, crawl, ref: best.id, exact: Math.abs(best.crawl - crawl) < 0.5 };
    })
    .filter((l) => l.crawl >= 0 && l.crawl <= scaleMax);
}
