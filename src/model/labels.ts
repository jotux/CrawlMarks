/**
 * Spreads labels along one axis so no two are closer than `gap`, moving each as
 * little as it can from where it wants to be and keeping them all inside
 * [lo, hi]. Labels keep their order. Returns positions in the input order.
 *
 * Crowded labels are grouped into runs; each run is centred on the mean of its
 * targets and pushed back inside the bounds, merging with its neighbour
 * whenever two runs would touch.
 */
export function spreadLabels(targets: number[], gap: number, lo: number, hi: number): number[] {
  const order = targets.map((_, i) => i).sort((a, b) => targets[a] - targets[b]);
  interface Run { first: number; count: number; sum: number; top: number }
  const place = (r: Run) => {
    const span = (r.count - 1) * gap;
    const ideal = r.sum / r.count - span / 2;
    // if the run is taller than the space, start it at the top and let it overflow
    r.top = Math.max(lo, Math.min(hi - span, ideal));
  };

  const runs: Run[] = [];
  order.forEach((idx, k) => {
    const run: Run = { first: k, count: 1, sum: targets[idx], top: 0 };
    place(run);
    runs.push(run);
    while (runs.length > 1) {
      const b = runs[runs.length - 1];
      const a = runs[runs.length - 2];
      if (a.top + a.count * gap <= b.top + 1e-9) break;
      a.count += b.count;
      a.sum += b.sum;
      place(a);
      runs.pop();
    }
  });

  const out = new Array<number>(targets.length);
  for (const r of runs) {
    for (let j = 0; j < r.count; j++) out[order[r.first + j]] = r.top + j * gap;
  }
  return out;
}
