import { NextLink, PrintButton, Screen } from '../components/Screen';
import { LogoImage, ScaleBar, StripDrawing } from '../components/drawings';
import { AppState, SCALE_MAX, TabSpec, fmtMetres, zoneLength } from '../state';
import { tickStep } from '../model/strip';

const STEPS_TEXT = [
  'Cut along the dashed line.',
  'Stick it to the tab face, top edge flush.',
  'Shoot each distance until grouped, then read the line under your crawl.',
];

const summary = (tab: TabSpec) =>
  `${tab.faceLength} × ${tab.faceWidth} mm · ${tab.hand} hand · zone ${tab.zoneStart}–${tab.zoneEnd} mm`;

const scaleNote = (tab: TabSpec) => {
  const step = tickStep(zoneLength(tab), SCALE_MAX);
  return `Reads 0–${SCALE_MAX} down the marking zone, with a tick every ${step === 1 ? 'unit' : `${step} units`}.`;
};

/** Empty rows after the chosen distances, for any extra ones shot on the day. */
const SPARE_ROWS = 3;

/** Printed table for writing down the strip reading at each distance while sighting in. */
function ReadingsTable({ distances }: { distances: number[] }) {
  const rows = [...distances.map(fmtMetres), ...Array<string>(SPARE_ROWS).fill('')];
  return (
    <table className="record-table">
      <thead>
        <tr><th>Distance</th><th>Reading (0–{SCALE_MAX})</th><th>Notes</th></tr>
      </thead>
      <tbody>
        {rows.map((d, i) => <tr key={i}><td>{d}</td><td /><td /></tr>)}
      </tbody>
    </table>
  );
}

export function Strip({ state }: { state: AppState }) {
  const { tab } = state;
  return (
    <>
      <Screen
        step={1}
        title="Print & stick"
        intro="Print at 100% scale. Check the 50 mm bar with a ruler before cutting."
        footer={<NextLink to="readings">I've shot my distances</NextLink>}
      >
        <div className="card strip-card">
          <div className="strip-preview"><StripDrawing tab={tab} /></div>
          <div className="strip-info">
            <div className="strip-logo"><LogoImage width={45} /></div>
            <div>
              <h2 className="label-caps">Strip</h2>
              <p className="muted">{summary(tab)}</p>
              <p className="muted">{scaleNote(tab)}</p>
            </div>
            <div>
              <h2 className="label-caps">Scale check</h2>
              <p className="muted small">The printed page has a 50 mm bar. Measure it before you cut.</p>
            </div>
            <div>
              <h2 className="label-caps">Readings table</h2>
              <p className="muted small">The printed page also has a table to write your reading at each distance, ready for the next step.</p>
            </div>
            <ol className="steps">{STEPS_TEXT.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        </div>
        <PrintButton label="Print or save as PDF" />
      </Screen>

      <section className="print-only print-page">
        <LogoImage width={45} trueSize />
        <h1>Sight-in strip</h1>
        <p>{summary(tab)} · {scaleNote(tab)}</p>
        <div className="print-row">
          <StripDrawing tab={tab} trueSize />
          <div className="print-notes">
            <div className="print-scale"><ScaleBar trueSize /><span>this bar = 50 mm</span></div>
            <ol>{STEPS_TEXT.map((s) => <li key={s}>{s}</li>)}</ol>
            <div>
              <h2>Your readings</h2>
              <ReadingsTable distances={state.distances} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
