import type { Dispatch, SetStateAction } from 'react';
import { NextLink, Screen, Tip } from '../components/Screen';
import { NumberField } from '../components/NumberField';
import { TabDiagram } from '../components/TabDiagram';
import { AppState, Hand, TabSpec, setupProblems } from '../state';

const PRESET_DISTANCES = [3, 5, 10, 15, 18, 20, 25, 30, 40, 50, 60, 70];

export function Setup({ state, setState }: { state: AppState; setState: Dispatch<SetStateAction<AppState>> }) {
  const { tab } = state;
  const problems = setupProblems(state);
  const setTab = (patch: Partial<TabSpec>) => setState((s) => ({ ...s, tab: { ...s.tab, ...patch } }));
  const toggle = (d: number) => setState((s) => ({
    ...s,
    distances: s.distances.includes(d) ? s.distances.filter((x) => x !== d) : [...s.distances, d].sort((a, b) => a - b),
  }));
  const chips = [...new Set([...PRESET_DISTANCES, ...state.distances])].sort((a, b) => a - b);

  return (
    <Screen
      step={0}
      title="Describe your tab"
      intro="We'll print a measuring strip sized to fit the face of your tab."
      footer={<NextLink to="strip" blocked={problems[0]}>Make sight-in strip</NextLink>}
      aside={
        <>
          <div className="card diagram-card only-wide"><TabDiagram tab={tab} /></div>
          <Tip>Measure from the top edge of the tab face, where it sits under your nock.</Tip>
        </>
      }
    >
      <fieldset className="group">
        <legend>Shooting hand</legend>
        <div className="segmented">
          {(['right', 'left'] as Hand[]).map((h) => (
            <button key={h} aria-pressed={tab.hand === h} onClick={() => setTab({ hand: h })}>
              {h === 'right' ? 'Right' : 'Left'}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="card diagram-card only-narrow"><TabDiagram tab={tab} /></div>

      <div className="grid-2">
        <NumberField label="Face length" unit="mm" value={tab.faceLength} onChange={(n) => setTab({ faceLength: n })} />
        <NumberField label="Face width" unit="mm" value={tab.faceWidth} onChange={(n) => setTab({ faceWidth: n })} />
        <NumberField label="Marking zone starts" unit="mm" value={tab.zoneStart} onChange={(n) => setTab({ zoneStart: n })} />
        <NumberField label="Marking zone ends" unit="mm" value={tab.zoneEnd} onChange={(n) => setTab({ zoneEnd: n })} />
      </div>

      <fieldset className="group">
        <legend>Distances to sight in</legend>
        <div className="chips">
          {chips.map((d) => (
            <button key={d} className="chip" aria-pressed={state.distances.includes(d)} onClick={() => toggle(d)}>
              {d} m
            </button>
          ))}
        </div>
      </fieldset>
    </Screen>
  );
}
