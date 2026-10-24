import type { Dispatch, SetStateAction } from 'react';
import { NextLink, Screen, Tip } from '../components/Screen';
import { NumberField } from '../components/NumberField';
import { TabDiagram } from '../components/TabDiagram';
import { AppState, Hand, TabSpec, Units, fmtDistance, fromLength, lengthUnit, setupProblems, tabFieldErrors, toLength, withDistance, withUnits, withoutDistance } from '../state';

const PRESET_DISTANCES: Record<Units, number[]> = {
  metric: [3, 5, 10, 15, 18, 20, 25, 30, 40, 50, 60, 70, 80, 90],
  imperial: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100],
};

const UNIT_OPTIONS: { id: Units; label: string }[] = [
  { id: 'metric', label: 'Metric · mm, m' },
  { id: 'imperial', label: 'Imperial · in, yd' },
];

export function Setup({ state, setState }: { state: AppState; setState: Dispatch<SetStateAction<AppState>> }) {
  const { tab, units } = state;
  const problems = setupProblems(state);
  const errors = tabFieldErrors(tab, units);
  // tab sizes are kept in mm and shown in the chosen unit
  const lengthField = (field: keyof Omit<TabSpec, 'hand'>, label: string) => (
    <NumberField label={label} unit={lengthUnit(units)} value={toLength(tab[field], units)} error={errors[field]}
      onChange={(n) => setTab({ [field]: fromLength(n, units) })} />
  );
  const setTab = (patch: Partial<TabSpec>) => setState((s) => ({ ...s, tab: { ...s.tab, ...patch } }));
  const toggle = (d: number) => setState((s) => (s.distances.includes(d) ? withoutDistance(s, d) : withDistance(s, d)));
  const chips = [...new Set([...PRESET_DISTANCES[units], ...state.distances])].sort((a, b) => a - b);

  return (
    <Screen
      step={0}
      title="Describe your tab"
      intro="We'll print a measuring strip sized to fit the face of your tab."
      footer={<NextLink to="strip" blocked={problems[0]}>Make sight-in strip</NextLink>}
      aside={
        <>
          <div className="card diagram-card only-wide"><TabDiagram tab={tab} units={units} /></div>
          <Tip>Measure from the top edge of the tab face, where it sits under your nock.</Tip>
        </>
      }
    >
      <fieldset className="group">
        <legend>Units</legend>
        <div className="segmented">
          {UNIT_OPTIONS.map((u) => (
            <button key={u.id} aria-pressed={units === u.id} onClick={() => setState((s) => withUnits(s, u.id))}>{u.label}</button>
          ))}
        </div>
      </fieldset>

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

      <div className="card diagram-card only-narrow"><TabDiagram tab={tab} units={units} /></div>

      <div className="grid-2">
        {lengthField('faceLength', 'Face length')}
        {lengthField('faceWidth', 'Face width')}
      </div>

      <fieldset className="group">
        <legend>Distances to sight in</legend>
        <div className="chips">
          {chips.map((d) => (
            <button key={d} className="chip" aria-pressed={state.distances.includes(d)} onClick={() => toggle(d)}>
              {fmtDistance(d, units)}
            </button>
          ))}
        </div>
      </fieldset>
    </Screen>
  );
}
