import { Dispatch, FormEvent, SetStateAction, useState } from 'react';
import { NextLink, Screen, Tip } from '../components/Screen';
import { AppState, SCALE_MAX, parseNum, readingRows, validReadings, withReading } from '../state';

export function Readings({ state, setState }: { state: AppState; setState: Dispatch<SetStateAction<AppState>> }) {
  const [adding, setAdding] = useState('');
  const rows = readingRows(state);
  const valid = validReadings(state);

  const setReading = (d: number, text: string) => setState((s) => withReading(s, d, text));

  const addDistance = (e: FormEvent) => {
    e.preventDefault();
    const d = parseNum(adding);
    if (d === null || d <= 0 || d > 150) return;
    setState((s) => (s.distances.includes(d) ? s : { ...s, distances: [...s.distances, d].sort((a, b) => a - b) }));
    setAdding('');
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
        <div className="table-head"><span>Distance</span><span>Reading</span><span>Point-on</span></div>
        {rows.map((r) => {
          const pointOn = r.value === 0;
          return (
            <div className="table-row" key={r.distance}>
              <span className="distance">{r.distance} m</span>
              <div>
                <label className={`field-box compact${r.error ? ' invalid' : ''}`}>
                  <span className="sr-only">Reading at {r.distance} m</span>
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
            </div>
          );
        })}
        <form className="add-row" onSubmit={addDistance}>
          <label className="field-box compact">
            <span className="sr-only">New distance in metres</span>
            <input inputMode="decimal" placeholder="Add a distance" value={adding} onChange={(e) => setAdding(e.target.value)} />
            <span className="unit">m</span>
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
