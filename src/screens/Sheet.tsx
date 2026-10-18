import type { Dispatch, SetStateAction } from 'react';
import { PrintButton, Screen, Tip } from '../components/Screen';
import { KeyCard, TabTemplate } from '../components/drawings';
import { FitResult, Reading, crawlAt } from '../model/fit';
import { buildMarks, nearLabels } from '../model/marks';
import { TickStyle, tickSegments } from '../model/tickStyles';
import { TickStylePicker } from '../components/TickStylePicker';
import { AppState, MINOR_RANGE, SCALE_MAX, clampTemplateWidth, templateWidth, templateWidthRange } from '../state';

function LegendLine({ style, long }: { style: TickStyle; long: boolean }) {
  return (
    <svg width="32" height="4" viewBox="0 0 32 4" aria-hidden="true">
      {tickSegments(style, long, 1).map(([a, b]) => <line key={a} x1={a * 32} x2={b * 32} y1="2" y2="2" style={{ stroke: 'var(--ink)' }} strokeWidth="1.5" />)}
    </svg>
  );
}

function Stepper({ label, note, value, unit, min, max, less, more, onChange }: {
  label: string; note: string; value: number; unit?: string; min: number; max: number;
  less: string; more: string; onChange: (n: number) => void;
}) {
  return (
    <div className="card stepper">
      <div>
        <div className="stepper-label">{label}</div>
        <div className="muted mono small">{note}</div>
      </div>
      <div className="stepper-controls">
        <button aria-label={less} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12h14" /></svg>
        </button>
        <output aria-live="polite">{value}{unit && <span className="stepper-unit">{unit}</span>}</output>
        <button aria-label={more} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>
  );
}

/** On-screen scale for the template preview, fixed so a width change reads as width, not length. */
const PREVIEW_PX_PER_MM = 2.6;

const RULES = [
  'Two line lengths only, same thickness and colour',
  'No numbers or writing on the tab face',
  'Key card kept separate from the tab',
];

export function Sheet({ state, setState, result, readings }: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  result: FitResult;
  readings: Reading[];
}) {
  if (!result.ok) {
    return (
      <Screen step={4} title="Marker sheet" intro="Fit a curve first."
        footer={<a className="cta" href="#/readings">Back to readings</a>}>
        <Tip tone="warn">{result.reason}</Tip>
      </Screen>
    );
  }

  const { fit } = result;
  const { minorMarks: minor, tickStyle } = state;
  const width = templateWidth(state);
  const widthRange = templateWidthRange(state.tab);
  // the strip and key card follow the setup tab; only the final template takes its own width
  const tab = { ...state.tab, faceWidth: width };
  const marks = buildMarks(fit, {
    minor,
    scaleMax: SCALE_MAX,
    nearestReading: Math.min(...readings.map((r) => r.distance)),
    farthestReading: Math.max(...readings.map((r) => r.distance)),
  });
  const near = nearLabels(fit, marks, state.distances, SCALE_MAX);
  const foldCrawl = fit.fold !== null && crawlAt(fit, fit.fold) <= SCALE_MAX ? crawlAt(fit, fit.fold) : null;
  const setMinor = (n: number) =>
    setState((s) => ({ ...s, minorMarks: Math.min(MINOR_RANGE.max, Math.max(MINOR_RANGE.min, n)) }));
  const setWidth = (n: number) => setState((s) => ({ ...s, templateWidth: clampTemplateWidth(s.tab, n) }));
  const step = 5 / (minor + 1);
  const keyCard = (trueSize?: boolean) => (
    <KeyCard tab={tab} marks={marks} style={tickStyle} near={near} foldCrawl={foldCrawl} foldDistance={fit.fold} trueSize={trueSize} />
  );

  return (
    <>
      <Screen
        step={4}
        title="Marker sheet"
        intro="Plain lines go on the tab. The key card is the same layout, numbered, and stays in your quiver."
        footer={<PrintButton label="Print or save as PDF" />}
        asideFirst
        aside={
          <>
            <Stepper label="Small marks between" note={`≈ ${step.toFixed(minor >= 4 ? 2 : 1)} m per mark`}
              value={minor} min={MINOR_RANGE.min} max={MINOR_RANGE.max}
              less="Fewer small marks" more="More small marks" onChange={setMinor} />

            <Stepper label="Tab face width" note={`${widthRange.min}–${widthRange.max} mm · strip is ${state.tab.faceWidth} mm`}
              value={width} unit="mm" min={widthRange.min} max={widthRange.max}
              less="Narrower tab face" more="Wider tab face" onChange={setWidth} />

            <div className="card stepper">
              <div className="stepper-label">Tick style</div>
              <TickStylePicker value={tickStyle} onChange={(s) => setState((st) => ({ ...st, tickStyle: s }))} />
            </div>
          </>
        }
      >
        {marks.length === 0 ? (
          <Tip tone="warn">None of the 5 m lines fall inside your marking zone. Check the zone on the first screen.</Tip>
        ) : (
          <>
            <section className="card template-card">
              <div className="template-preview" style={{ width: width * PREVIEW_PX_PER_MM, maxWidth: '50%' }}><TabTemplate tab={tab} marks={marks} style={tickStyle} /></div>
              <div className="template-info">
                <h2 className="label-caps">Tab face · 1:1</h2>
                <span className="muted mono tiny">{width} × {tab.faceLength} mm</span>
                <div className="legend">
                  <span><LegendLine style={tickStyle} long />Long line, every 5 m</span>
                  <span><LegendLine style={tickStyle} long={false} />Short line, {minor} per gap</span>
                </div>
              </div>
            </section>

            <section className="card keycard" aria-label="Key card">
              <div className="keycard-head">
                <h2 className="label-caps">Key card</h2>
                <span className="muted mono tiny">US business card · 3.5 × 2 in</span>
              </div>
              <div className="keycard-preview">{keyCard()}</div>
            </section>
          </>
        )}

        <div className="rules">
          <div className="rules-head">
            <h2 className="label-caps">World Archery barebow rules</h2>
          </div>
          {RULES.map((c) => (
            <div key={c} className="rule">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </Screen>

      <section className="print-only print-page">
        <h1>CrawlMarks marker sheet</h1>
        <div className="print-row">
          <div>
            <h2>Tab template · 1:1</h2>
            <TabTemplate tab={tab} marks={marks} style={tickStyle} trueSize />
          </div>
          <div className="print-notes">
            <p>Keep the key card in your quiver, not on the tab.</p>
          </div>
        </div>
        <h2>Key card · business card size</h2>
        {keyCard(true)}
      </section>
    </>
  );
}
