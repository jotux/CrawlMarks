import type { Dispatch, SetStateAction } from 'react';
import { NextLink, Screen, Tip } from '../components/Screen';
import { CURVE_MODELS, CrawlFit, CurveKind, CurveModel, FitResult, Miss, Reading, crawlAt, isCurveModel, offCurve, twinDistance } from '../model/fit';
import { AppState, SCALE_MAX, fmtMetres } from '../state';

const INTRO = 'Pick how to draw a line through your readings. Your tab marks are placed along it. '
  + 'Use it to double-check your readings are consistent: any that sit well off the line are circled and worth reshooting.';

const CURVES: Record<CurveModel, { name: string; formula?: string; about: string }> = {
  auto: { name: 'Auto', about: 'Picks the curve that best predicts each reading from the others.' },
  linear: { name: 'Linear', formula: 'a − c·d', about: 'A straight line: crawl shrinks evenly with distance.' },
  quadratic: { name: 'Quadratic', formula: 'a − c·d − e·d²', about: 'Bends as the arrow slows in flight. Best fit for aiming with the arrow point.' },
  fold: { name: 'Fold', formula: 'a − b/d − c·d', about: 'Crawl peaks, then shrinks again up close.' },
  manual: { name: 'Manual (join the dots)', about: 'A smooth line through every reading. Errors in a reading are not smoothed out.' },
};

function CurvePicker({ value, used, onChange }: { value: CurveModel; used: CurveKind | null; onChange: (m: CurveModel) => void }) {
  const shown = value === 'auto' ? used : value;
  return (
    <div className="field">
      <label className="field-label" htmlFor="curve-model">Curve</label>
      <span className="field-box select-box">
        <select id="curve-model" value={value} onChange={(e) => isCurveModel(e.target.value) && onChange(e.target.value)}>
          {CURVE_MODELS.map((m) => <option key={m} value={m}>{CURVES[m].name}</option>)}
        </select>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </span>
      <p className="muted small curve-about">
        {value === 'auto' && (used ? <>Using <strong>{CURVES[used].name}</strong>. </> : null)}
        {shown && CURVES[shown].formula && <span className="mono">crawl = {CURVES[shown].formula} · </span>}
        {CURVES[shown ?? value].about}
      </p>
    </div>
  );
}

const ACCENT = '#E0A100';
const MISS = 'var(--miss)';
/** A reading this far off the curve, in strip units, is worth a second look. */
const OFF_CURVE_LIMIT = SCALE_MAX * 0.03;

const fmtOff = (off: number) => `${off > 0 ? '+' : '−'}${Math.abs(off).toFixed(1)}`;

function CrawlChart({ fit, readings, misses }: { fit: CrawlFit; readings: Reading[]; misses: Miss[] }) {
  const L = 30, R = 314, T = 14, B = 190;
  const xMax = Math.ceil((Math.max(...readings.map((r) => r.distance), fit.pointOn ?? 0) + 2) / 10) * 10;
  const peak = fit.fold !== null ? crawlAt(fit, fit.fold) : 0;
  const yMax = Math.ceil((Math.max(peak, ...readings.map((r) => r.crawl)) + 1) / 5) * 5;
  const X = (d: number) => L + (d / xMax) * (R - L);
  const Y = (c: number) => B - (Math.max(c, -yMax * 0.04) / yMax) * (B - T);
  const path = (from: number, to: number) => {
    let s = '';
    for (let i = 0; i <= 120; i++) {
      const d = from + ((to - from) * i) / 120;
      s += `${i ? ' L' : 'M'}${X(d).toFixed(1)} ${Y(crawlAt(fit, d)).toFixed(1)}`;
    }
    return s;
  };
  const start = Math.max(1.5, Math.min(...readings.map((r) => r.distance)) * 0.6);
  const end = Math.min(xMax, (fit.pointOn ?? xMax) + 2);
  const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);
  const xTicks = Array.from({ length: xMax / 10 }, (_, i) => (i + 1) * 10);
  const isNear = (d: number) => fit.fold !== null && d < fit.fold;

  return (
    <svg viewBox="0 0 320 220" className="chart" role="img"
      aria-label={`Crawl against distance${fit.fold !== null ? `, peaking near ${fit.fold.toFixed(0)} m` : ''}.`}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={Y(v)} y2={Y(v)} style={{ stroke: v === 0 ? 'var(--axis)' : v % 5 === 0 ? 'var(--grid)' : 'var(--grid-minor)' }} />
          {v % 5 === 0 && <text x={L - 6} y={Y(v)} className="chart-label" textAnchor="end" dominantBaseline="central">{v}</text>}
        </g>
      ))}
      {xTicks.map((v) => <text key={v} x={X(v)} y={B + 14} className="chart-label" textAnchor="middle">{v}</text>)}
      {fit.fold !== null ? (
        <>
          <line x1={X(fit.fold)} x2={X(fit.fold)} y1={T} y2={B} style={{ stroke: 'var(--muted)' }} strokeDasharray="3 4" />
          <text x={X(fit.fold) + 5} y={T + 4} className="chart-label caps">Fold</text>
          <path d={path(fit.fold, end)} fill="none" style={{ stroke: 'var(--teal)' }} strokeWidth="2.5" />
          <path d={path(start, fit.fold)} fill="none" style={{ stroke: 'var(--near-branch)' }} strokeWidth="2.5" strokeDasharray="6 4" />
        </>
      ) : (
        <path d={path(start, end)} fill="none" style={{ stroke: 'var(--teal)' }} strokeWidth="2.5" />
      )}
      {misses.map((m) => {
        const x = X(m.distance);
        const right = x < R - 40;
        return (
          <g key={`miss-${m.distance}`}>
            <line x1={x} x2={x} y1={Y(m.crawl)} y2={Y(crawlAt(fit, m.distance))} style={{ stroke: MISS }} strokeOpacity="0.45" strokeWidth="1" />
            <circle cx={x} cy={Y(m.crawl)} r="8.5" fill="none" style={{ stroke: MISS }} strokeOpacity="0.6" strokeWidth="1.25" />
            <text x={right ? x + 12 : x - 12} y={Y(m.crawl)} className="chart-label miss-label" textAnchor={right ? 'start' : 'end'} dominantBaseline="central">
              {fmtOff(m.off)}
            </text>
          </g>
        );
      })}
      {readings.map((r) => isNear(r.distance) ? (
        <rect key={r.distance} x={X(r.distance) - 5} y={Y(r.crawl) - 5} width="10" height="10" rx="2" fill="#F2A27A" style={{ stroke: 'var(--ink)' }} strokeWidth="2" />
      ) : (
        <circle key={r.distance} cx={X(r.distance)} cy={Y(r.crawl)} r="5" fill={ACCENT} style={{ stroke: 'var(--ink)' }} strokeWidth="2" />
      ))}
    </svg>
  );
}

export function Fit({ state, setState, result, readings }: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  result: FitResult;
  readings: Reading[];
}) {
  const picker = (
    <CurvePicker value={state.curveModel} used={result.ok ? result.fit.kind : null}
      onChange={(curveModel) => setState((s) => ({ ...s, curveModel }))} />
  );
  if (!result.ok) {
    return (
      <Screen step={3} title="Your crawl curve" intro={INTRO} asideFirst aside={picker}>
        <Tip tone="warn">{result.reason}</Tip>
      </Screen>
    );
  }

  const { fit } = result;
  const fold = fit.fold;
  const pairs = fold !== null
    ? state.distances.filter((d) => d < fold).flatMap((d) => {
      const twin = twinDistance(fit, d);
      return twin === null ? [] : [{ d, twin }];
    })
    : [];
  const misses = offCurve(fit, readings, OFF_CURVE_LIMIT);

  return (
    <Screen
      step={3}
      title="Your crawl curve"
      intro={INTRO}
      footer={<NextLink to="sheet">Build marker sheet</NextLink>}
      asideFirst
      aside={
        <>
          {picker}
          <div className="stats">
            <div className="stat"><div className="stat-label">Fit error</div><div className="stat-value">{fit.rms.toFixed(1)}</div></div>
            <div className="stat"><div className="stat-label">Fold</div><div className="stat-value">{fold !== null ? fold.toFixed(0) : '—'}<span> m</span></div></div>
            <div className="stat"><div className="stat-label">Point-on</div><div className="stat-value">{fit.pointOn !== null ? fit.pointOn.toFixed(0) : '—'}<span> m</span></div></div>
          </div>
        </>
      }
    >

      <figure className="card chart-card">
        <CrawlChart fit={fit} readings={readings} misses={misses} />
        <figcaption>
          {fold !== null && (
            <span><svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" style={{ stroke: 'var(--near-branch)' }} strokeWidth="2.5" strokeDasharray="6 4" /></svg>Near branch</span>
          )}
          <span><svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" style={{ stroke: 'var(--teal)' }} strokeWidth="2.5" /></svg>Far branch</span>
          {misses.length > 0 && (
            <span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" style={{ stroke: MISS }} strokeOpacity="0.6" strokeWidth="1.25" /></svg>Off the curve</span>
          )}
          <span>Strip reading ↑ · distance m →</span>
        </figcaption>
      </figure>

      {misses.length > 0 && (
        <Tip>
          {misses.length === 1 ? 'This reading is' : 'These readings are'} more than {OFF_CURVE_LIMIT.toFixed(1)} off the curve:{' '}
          {misses.map((m) => `${fmtMetres(m.distance)} (${fmtOff(m.off)})`).join(', ')}.
          {' '}Check for typos, or reshoot {misses.length === 1 ? 'it' : 'them'}.
        </Tip>
      )}
      {fold === null && fit.kind === 'fold' && <Tip tone="warn">No turn-back found yet. Add readings at a few shorter distances and fit again.</Tip>}

      {pairs.length > 0 && (
        <div className="pairs">
          <h2 className="group-title">Same crawl, two distances</h2>
          <div className="pair-list">
            {pairs.map(({ d, twin }) => (
              <div key={d} className="pair">
                <span className="near">{d} m</span><span className="muted">=</span>
                <span className="far">{fmtMetres(Math.round(twin * 2) / 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}
