import { Dispatch, FormEvent, SetStateAction, useRef, useState } from 'react';
import { NextLink, Screen, Tip } from '../components/Screen';
import { AppState, MAX_DISTANCE, SCALE_MAX, distanceUnit, fmtDistance, parseNum, readingRows, validReadings, withDistance, withDistanceAt, withReading, withoutDistance } from '../state';

export function Readings({ state, setState }: { state: AppState; setState: Dispatch<SetStateAction<AppState>> }) {
  const [adding, setAdding] = useState('');
  const rows = readingRows(state);
  const valid = validReadings(state);

  const listRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const setReading = (d: number, text: string) => setState((s) => withReading(s, d, text));

  const addDistance = (e: FormEvent) => {
    e.preventDefault();
    const d = parseNum(adding);
    if (d === null || d <= 0 || d > MAX_DISTANCE[state.units]) return;
    setState((s) => withDistance(s, d));
    setAdding('');
  };

  /** Moves distance d to where the pointer is: below every other row whose middle is above it. */
  const dragTo = (d: number, y: number) => {
    const others = [...(listRef.current?.querySelectorAll<HTMLElement>('.table-row') ?? [])]
      .filter((row) => Number(row.dataset.distance) !== d);
    const to = others.filter((row) => { const b = row.getBoundingClientRect(); return b.top + b.height / 2 < y; }).length;
    setState((s) => withDistanceAt(s, d, to));
  };

  return (
    <Screen
      step={2}
      title="Enter your readings"
      intro={`At each distance, the strip number (0–${SCALE_MAX}) level with your nock. Halfway between ticks is fine.`}
      footer={
        <>
          <NextLink to="fit" blocked={valid.length < 3
            ? state.distances.length === 1 && valid.length === 0
              ? 'Enter your reading to make a tab for this distance.'
              : `Enter readings for at least three distances${valid.length === 1 ? ', or make a tab for just this one' : ''}.`
            : null}>
            Fit my curve
          </NextLink>
          {valid.length === 1 && (
            <a className="btn-secondary" href="#/sheet">Build tab for single distance</a>
          )}
        </>
      }
      aside={
        <Tip>
          Include a few short distances as well as long ones. Up close your crawl turns back, and those readings show where.
        </Tip>
      }
    >
      <div className="card table">
        <div className="table-head"><span /><span>Distance</span><span>Reading</span><span>Point-on</span><span /></div>
        <div ref={listRef}>
        {rows.map((r, i) => {
          const pointOn = r.value === 0;
          return (
            <div className={`table-row${dragging === r.distance ? ' dragging' : ''}`} key={r.distance} data-distance={r.distance}>
              <button
                className="drag-handle"
                aria-label={`Move ${fmtDistance(r.distance, state.units)}. Drag, or use the arrow keys.`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(r.distance);
                }}
                onPointerMove={(e) => dragging === r.distance && dragTo(r.distance, e.clientY)}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onKeyDown={(e) => {
                  const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                  if (!step) return;
                  e.preventDefault();
                  setState((s) => withDistanceAt(s, r.distance, i + step));
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
                </svg>
              </button>
              <span className="distance">{fmtDistance(r.distance, state.units)}</span>
              <div>
                <label className={`field-box compact${r.error ? ' invalid' : ''}`}>
                  <span className="sr-only">Reading at {fmtDistance(r.distance, state.units)}</span>
                  <input
                    inputMode="decimal"
                    placeholder="—"
                    value={r.text}
                    aria-invalid={!!r.error}
                    onChange={(e) => setReading(r.distance, e.target.value)}
                  />
                </label>
                {r.error && <div className="field-error">{r.error}</div>}
              </div>
              <button
                className="pill"
                aria-pressed={pointOn}
                onClick={() => setReading(r.distance, pointOn ? '' : '0')}
              >
                {pointOn ? 'Point-on' : 'Mark'}
              </button>
              <button className="row-delete" aria-label={`Delete ${fmtDistance(r.distance, state.units)}`} onClick={() => setState((s) => withoutDistance(s, r.distance))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          );
        })}
        </div>
        <form className="add-row" onSubmit={addDistance}>
          <label className="field-box compact">
            <span className="sr-only">New distance in {state.units === 'imperial' ? 'yards' : 'metres'}</span>
            <input inputMode="decimal" placeholder="Add a distance" value={adding} onChange={(e) => setAdding(e.target.value)} />
            <span className="unit">{distanceUnit(state.units)}</span>
          </label>
          <button className="btn-text" type="submit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Add
          </button>
        </form>
      </div>
    </Screen>
  );
}
