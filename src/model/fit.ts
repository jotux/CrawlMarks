export interface Reading {
  /** metres */
  distance: number;
  /** mm down the strip from the top of the marking zone */
  crawl: number;
}

/**
 * Curves that can be fitted to the readings, d in metres:
 * - linear     crawl = a − c·d
 * - quadratic  crawl = a − c·d − e·d²   (the arrow slows as it flies, so crawl bends)
 * - fold       crawl = a − b/d − c·d    (rises to a peak, the fold, then shrinks up close)
 * - manual     a smooth line through every reading that never overshoots between them
 * Any curve that peaks inside the readings has a fold, and every near distance then
 * shares its crawl with a far one on the other side of it.
 */
export type CurveKind = 'linear' | 'quadratic' | 'fold' | 'manual';
export type CurveModel = 'auto' | CurveKind;

export const CURVE_MODELS: CurveModel[] = ['auto', 'linear', 'quadratic', 'fold', 'manual'];
export const DEFAULT_CURVE_MODEL: CurveModel = 'quadratic';
export const isCurveModel = (x: unknown): x is CurveModel => CURVE_MODELS.includes(x as CurveModel);

export interface CrawlFit {
  kind: CurveKind;
  /** linear [a, c]; quadratic [a, c, e]; fold [a, b, c]; manual [] */
  p: number[];
  /** manual only: readings sorted by distance, with the slope of the line at each */
  knots?: { d: number[]; y: number[]; m: number[] };
  /** root-mean-square error of the fit against the readings, mm */
  rms: number;
  /** distance of peak crawl, or null when the curve has no turn-back */
  fold: number | null;
  /** far distance where crawl reaches 0, or null if it never does */
  pointOn: number | null;
}

export type FitResult = { ok: true; fit: CrawlFit } | { ok: false; reason: string };

const BASIS: Record<Exclude<CurveKind, 'manual'>, (d: number) => number[]> = {
  linear: (d) => [1, -d],
  quadratic: (d) => [1, -d, -d * d],
  fold: (d) => [1, -1 / d, -d],
};

export function crawlAt(fit: CrawlFit, d: number): number {
  if (fit.kind === 'manual') return hermite(fit.knots!, d);
  return BASIS[fit.kind](d).reduce((s, x, i) => s + x * fit.p[i], 0);
}

/** Where the far side of the curve reaches `crawl`, or null if it never does. */
export function farDistanceFor(fit: CrawlFit, crawl: number): number | null {
  // walk out from the fold while the curve keeps falling, then bisect the crossing
  const STEP = 0.5, MAX = 300;
  let lo = fit.fold ?? 0.5;
  let ylo = crawlAt(fit, lo);
  if (ylo < crawl) return null;
  for (let hi = lo + STEP; hi <= MAX; hi += STEP) {
    const yhi = crawlAt(fit, hi);
    if (yhi > ylo) return null; // turned back up before reaching it
    if (yhi <= crawl) {
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (crawlAt(fit, mid) > crawl) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    lo = hi;
    ylo = yhi;
  }
  return null;
}

/** The distance on the other side of the fold that uses the same crawl as d. */
export function twinDistance(fit: CrawlFit, d: number): number | null {
  return farDistanceFor(fit, crawlAt(fit, d));
}

export interface Miss extends Reading {
  /** reading minus the curve: positive means the reading sits below the curve on the tab (more crawl) */
  off: number;
}

/** Readings further than `limit` from the fitted curve, worst first. */
export function offCurve(fit: CrawlFit, readings: Reading[], limit: number): Miss[] {
  return readings
    .map((r) => ({ ...r, off: r.crawl - crawlAt(fit, r.distance) }))
    .filter((m) => Math.abs(m.off) > limit)
    .sort((a, b) => Math.abs(b.off) - Math.abs(a.off));
}

export function fitCrawl(readings: Reading[], model: CurveModel = DEFAULT_CURVE_MODEL): FitResult {
  if (new Set(readings.map((r) => r.distance)).size < 3) {
    return { ok: false, reason: 'Enter readings at three or more distances.' };
  }
  if (model === 'auto') return fitAuto(readings);

  const raw = model === 'manual' ? manualFit(readings) : leastSquares(model, readings);
  if (!raw) return { ok: false, reason: 'These readings could not be fitted. Check for typos.' };

  // crawl must shrink with distance at the far end, or there is no point-on to aim for
  const far = Math.max(...readings.map((r) => r.distance));
  if (!(crawlAt(raw, far + 0.5) < crawlAt(raw, far - 0.5))) {
    return { ok: false, reason: 'Your crawl should get smaller as the distance grows. Check your far readings.' };
  }

  const fit: CrawlFit = { ...raw, fold: foldOf(raw, readings) };
  fit.pointOn = farDistanceFor(fit, 0);
  const sq = readings.reduce((s, { distance, crawl }) => s + (crawlAt(fit, distance) - crawl) ** 2, 0);
  return { ok: true, fit: { ...fit, rms: Math.sqrt(sq / readings.length) } };
}

/**
 * The curve that best predicts each reading from the others (leave-one-out), so a
 * curve can't win just by having more terms. Manual always passes through every
 * reading, so it isn't a candidate.
 */
function fitAuto(readings: Reading[]): FitResult {
  let best: { result: FitResult; score: number } | null = null;
  for (const kind of ['linear', 'quadratic', 'fold'] as const) {
    if (readings.length - 1 < BASIS[kind](1).length) continue;
    const result = fitCrawl(readings, kind);
    if (!result.ok) continue;
    let sq = 0;
    for (let i = 0; i < readings.length; i++) {
      const rest = leastSquares(kind, readings.filter((_, j) => j !== i));
      sq += rest ? (crawlAt(rest, readings[i].distance) - readings[i].crawl) ** 2 : Infinity;
    }
    const score = Math.sqrt(sq / readings.length);
    if (!best || score < best.score) best = { result, score };
  }
  return best?.result ?? fitCrawl(readings, 'manual');
}

function blank(kind: CurveKind): CrawlFit {
  return { kind, p: [], rms: 0, fold: null, pointOn: null };
}

function leastSquares(kind: Exclude<CurveKind, 'manual'>, readings: Reading[]): CrawlFit | null {
  const n = BASIS[kind](1).length;
  if (readings.length < n) return null;
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  const r = Array(n).fill(0);
  for (const { distance: d, crawl: y } of readings) {
    const basis = BASIS[kind](d);
    for (let i = 0; i < n; i++) {
      r[i] += basis[i] * y;
      for (let j = 0; j < n; j++) A[i][j] += basis[i] * basis[j];
    }
  }
  const p = solve(A, r);
  return p && { ...blank(kind), p };
}

/** Monotone cubic (Fritsch–Carlson) through the readings; straight lines beyond the ends. */
function manualFit(readings: Reading[]): CrawlFit {
  const sorted = [...readings].sort((a, b) => a.distance - b.distance);
  const d = sorted.map((r) => r.distance);
  const y = sorted.map((r) => r.crawl);
  const n = d.length;
  const h = d.slice(1).map((x, k) => x - d[k]);
  const delta = h.map((hk, k) => (y[k + 1] - y[k]) / hk);
  const m = d.map((_, k) => {
    if (k === 0) return delta[0];
    if (k === n - 1) return delta[n - 2];
    if (delta[k - 1] * delta[k] <= 0) return 0; // a peak or flat spot: no overshoot
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    return (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k]);
  });
  return { ...blank('manual'), knots: { d, y, m } };
}

function hermite({ d, y, m }: NonNullable<CrawlFit['knots']>, x: number): number {
  const n = d.length;
  if (x <= d[0]) return y[0] + m[0] * (x - d[0]);
  if (x >= d[n - 1]) return y[n - 1] + m[n - 1] * (x - d[n - 1]);
  let k = 0;
  while (x > d[k + 1]) k++;
  const hk = d[k + 1] - d[k], t = (x - d[k]) / hk, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y[k] + (t3 - 2 * t2 + t) * hk * m[k]
    + (-2 * t3 + 3 * t2) * y[k + 1] + (t3 - t2) * hk * m[k + 1];
}

/** Distance of peak crawl when the curve rises before it falls, else null. */
function foldOf(fit: CrawlFit, readings: Reading[]): number | null {
  const [, p1, p2] = fit.p;
  switch (fit.kind) {
    case 'linear': return null;
    case 'fold': return p1 > 0 ? Math.sqrt(p1 / p2) : null; // √(b/c)
    case 'quadratic': return p2 > 0 && p1 < 0 ? -p1 / (2 * p2) : null; // −c/(2e)
    case 'manual': {
      const { d, y } = fit.knots!;
      const top = y.indexOf(Math.max(...y));
      return top > 0 && top < readings.length - 1 ? d[top] : null;
    }
  }
}

function solve(A: number[][], r: number[]): number[] | null {
  const n = r.length;
  const M = A.map((row, i) => [...row, r[i]]);
  const scale = Math.max(...A.flat().map(Math.abs));
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let i = col + 1; i < n; i++) if (Math.abs(M[i][col]) > Math.abs(M[piv][col])) piv = i;
    if (Math.abs(M[piv][col]) < 1e-12 * scale) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let i = col + 1; i < n; i++) {
      const k = M[i][col] / M[col][col];
      for (let j = col; j <= n; j++) M[i][j] -= k * M[col][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let v = M[i][n];
    for (let j = i + 1; j < n; j++) v -= M[i][j] * x[j];
    x[i] = v / M[i][i];
  }
  return x.every(Number.isFinite) ? x : null;
}
