import { NextLink, PrintButton, Screen } from '../components/Screen';
import { LogoImage, ScaleBar, StripDrawing } from '../components/drawings';
import { AppState, SCALE_MAX, TabSpec, Units, fmtDistance, fmtLength, fmtSize, toLength, zoneLength } from '../state';
import { tickStep } from '../model/strip';

const STEPS_TEXT = [
  'Cut along the dashed line.',
  'Stick it to the tab face, top edge flush.',
  'Shoot each distance until grouped, then read the line under your crawl.',
];

const summary = (tab: TabSpec, u: Units) =>
  `${fmtSize(tab.faceLength, tab.faceWidth, u)} · ${tab.hand} hand · zone ${toLength(tab.zoneStart, u)}–${fmtLength(tab.zoneEnd, u)}`;

/** The bar printed for checking the scale with a ruler: 50 mm, or 2 in for imperial rulers. */
const SCALE_CHECK: Record<Units, { length: number; label: string }> = {
  metric: { length: 50, label: '50 mm' },
  imperial: { length: 50.8, label: '2 in' },
};

const scaleNote = (tab: TabSpec) => {
  const step = tickStep(zoneLength(tab), SCALE_MAX);
  return `Reads 0–${SCALE_MAX} down the marking zone, with a tick every ${step === 1 ? 'unit' : `${step} units`}.`;
};

/** On-screen px per mm for the strip preview, and the most px a very wide face may take across. */
const PREVIEW_PX_PER_MM = 2.6;
const PREVIEW_MAX_PX = 150;

/**
 * The strip on screen at a fixed scale, so its outline is always in proportion to the face
 * length, whatever the width. Only faces too wide for PREVIEW_MAX_PX are drawn smaller.
 */
function StripPreview({ tab }: { tab: TabSpec }) {
  const pxPerMm = Math.min(PREVIEW_PX_PER_MM, PREVIEW_MAX_PX / tab.faceWidth);
  return (
    // content-box: the drawing gets exactly this width, with the padding outside it
    <div className="strip-preview" style={{ width: tab.faceWidth * pxPerMm, boxSizing: 'content-box' }}>
      <StripDrawing tab={tab} />
    </div>
  );
}

/** Empty rows after the chosen distances, for any extra ones shot on the day. */
const SPARE_ROWS = 3;

/** Printed table for writing down the strip reading at each distance while sighting in. */
function ReadingsTable({ distances, units }: { distances: number[]; units: Units }) {
  const rows = [...distances.map((d) => fmtDistance(d, units)), ...Array<string>(SPARE_ROWS).fill('')];
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
  const { tab, units } = state;
  const check = SCALE_CHECK[units];
  return (
    <>
      <Screen
        step={1}
        title="Print & stick"
                intro={`Print at 100% scale. Check the ${check.label} bar with a ruler before cutting.`}
        footer={<NextLink to="readings">I've shot my distances</NextLink>}
      >
        <div className="card strip-card">
          <StripPreview tab={tab} />
          <div className="strip-info">
            <div className="strip-logo"><LogoImage width={45} /></div>
            <div>
              <h2 className="label-caps">Strip</h2>
              <p className="muted">{summary(tab, units)}</p>
              <p className="muted">{scaleNote(tab)}</p>
            </div>
            <div>
              <h2 className="label-caps">Scale check</h2>
              <p className="muted small">The printed page has a {check.label} bar. Measure it before you cut.</p>
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
        <p>{summary(tab, units)} · {scaleNote(tab)}</p>
        <div className="print-row">
          <StripDrawing tab={tab} trueSize />
          <div className="print-notes">
            <div className="print-scale"><ScaleBar length={check.length} label={check.label} trueSize /><span>this bar = {check.label}</span></div>
            <ol>{STEPS_TEXT.map((s) => <li key={s}>{s}</li>)}</ol>
            <div>
              <h2>Your readings</h2>
              <ReadingsTable distances={state.distances} units={units} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
