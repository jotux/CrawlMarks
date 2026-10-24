import { useEffect, useState } from 'react';
import { CurveModel, DEFAULT_CURVE_MODEL, isCurveModel, type Reading } from './model/fit';
import { DEFAULT_TICK_STYLE, TickStyle, isTickStyle } from './model/tickStyles';

export type Hand = 'right' | 'left';

/** Metric: tab in mm, distances in metres. Imperial: tab in inches, distances in yards. */
export type Units = 'metric' | 'imperial';
export const isUnits = (v: unknown): v is Units => v === 'metric' || v === 'imperial';

const MM_PER_IN = 25.4;
const M_PER_YD = 0.9144;
export const distanceUnit = (u: Units) => (u === 'imperial' ? 'yd' : 'm');
export const lengthUnit = (u: Units) => (u === 'imperial' ? 'in' : 'mm');
/** A tab measurement (kept in mm) in the chosen unit, to 2 decimal places. */
export const toLength = (mm: number, u: Units) => Math.round((u === 'imperial' ? mm / MM_PER_IN : mm) * 100) / 100;
/** A tab measurement typed in the chosen unit, back in mm. */
export const fromLength = (v: number, u: Units) => (u === 'imperial' ? v * MM_PER_IN : v);
export const fmtLength = (mm: number, u: Units) => `${toLength(mm, u)} ${lengthUnit(u)}`;
/** width × length with the unit once, e.g. 38 × 72 mm */
export const fmtSize = (w: number, h: number, u: Units) => `${toLength(w, u)} × ${toLength(h, u)} ${lengthUnit(u)}`;
/** A distance without its unit: whole numbers plain, others to one decimal place. */
export const fmtDistanceNumber = (d: number) => `${Math.abs(d - Math.round(d)) < 0.05 ? Math.round(d) : d.toFixed(1)}`;
export const fmtDistance = (d: number, u: Units) => `${fmtDistanceNumber(d)} ${distanceUnit(u)}`;
/** Farthest distance that can be added, in the chosen unit (about 150 m either way). */
export const MAX_DISTANCE: Record<Units, number> = { metric: 150, imperial: 165 };

/** What the marker sheet draws: lines from the fitted curve every 5 m, or only the recorded distances. */
export type PlotMode = 'curve' | 'recorded';
export const isPlotMode = (v: unknown): v is PlotMode => v === 'curve' || v === 'recorded';

export interface TabSpec {
  hand: Hand;
  /** mm; the strip and the marks span the whole face length, measured from the top edge */
  faceLength: number;
  faceWidth: number;
}

export interface AppState {
  units: Units;
  tab: TabSpec;
  /** metres or yards (see units), in the order the readings list shows them (nearest first unless reordered) */
  distances: number[];
  /** raw text typed per distance, keyed by distance: strip units, 0 at the top edge of the face, SCALE_MAX at the bottom */
  readings: Record<string, string>;
  minorMarks: number;
  tickStyle: TickStyle;
  /** mm width of the final tab template; null follows the face width from setup */
  templateWidth: number | null;
  curveModel: CurveModel;
  plotMode: PlotMode;
}

export const MINOR_RANGE = { min: 1, max: 10 };
/** Face widths allowed, in mm, with how each end reads: 3–35 mm, or 1/8–1 in. */
export const FACE_WIDTH_RANGE: Record<Units, { min: number; max: number; labels: [string, string] }> = {
  metric: { min: 3, max: 35, labels: ['3 mm', '35 mm'] },
  imperial: { min: MM_PER_IN / 8, max: MM_PER_IN, labels: ['1/8 in', '1 in'] },
};
/** mm the final tab template may span: at least the narrowest face, and up to 20 wider than the setup face */
export const templateWidthRange = (tab: TabSpec) => {
  const min = FACE_WIDTH_RANGE.metric.min;
  return { min, max: Math.max(min, tab.faceWidth + 20) };
};

/** The sight-in strip reads 0–50 down the face length, whatever its size. */
export const SCALE_MAX = 50;

export const defaultState: AppState = {
  units: 'metric',
  tab: { hand: 'right', faceLength: 60, faceWidth: 5 },
  distances: [5, 10, 18, 25, 30, 40, 50],
  readings: {},
  minorMarks: 4,
  tickStyle: DEFAULT_TICK_STYLE,
  templateWidth: null,
  curveModel: DEFAULT_CURVE_MODEL,
  plotMode: 'curve',
};

const STORAGE_KEY = 'crawlmarks:v3';

function merge(saved: Partial<AppState>): AppState {
  return {
    ...defaultState,
    ...saved,
    units: isUnits(saved.units) ? saved.units : 'metric',
    tab: {
      hand: saved.tab?.hand ?? defaultState.tab.hand,
      faceLength: saved.tab?.faceLength ?? defaultState.tab.faceLength,
      faceWidth: saved.tab?.faceWidth ?? defaultState.tab.faceWidth,
    },
    readings: { ...saved.readings },
    tickStyle: isTickStyle(saved.tickStyle) ? saved.tickStyle : DEFAULT_TICK_STYLE,
    curveModel: isCurveModel(saved.curveModel) ? saved.curveModel : DEFAULT_CURVE_MODEL,
    plotMode: isPlotMode(saved.plotMode) ? saved.plotMode : 'curve',
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? merge(JSON.parse(raw)) : defaultState;
  } catch {
    return defaultState;
  }
}

/** App state, kept in this browser's localStorage between visits. */
export function useAppState() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private window, blocked): the app still works for this visit
    }
  }, [state]);
  return [state, setState] as const;
}

export const clampTemplateWidth = (tab: TabSpec, n: number) => {
  const { min, max } = templateWidthRange(tab);
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
};

/** Width the final tab template is drawn at, kept inside templateWidthRange. */
export const templateWidth = (state: AppState) => clampTemplateWidth(state.tab, state.templateWidth ?? state.tab.faceWidth);

/** mm down the tab face for a strip reading */
export const unitsToMm = (tab: TabSpec, units: number) => (units * tab.faceLength) / SCALE_MAX;

export function parseNum(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type TabField = 'faceLength' | 'faceWidth';

/** True when the width is inside FACE_WIDTH_RANGE for the units (with room for mm↔in rounding). */
const faceWidthOk = (mm: number, units: Units) => {
  const { min, max } = FACE_WIDTH_RANGE[units];
  return mm >= min - 0.01 && mm <= max + 0.01;
};

/** What is wrong with each tab measurement, shown under its field. */
export function tabFieldErrors(tab: TabSpec, units: Units = 'metric'): Partial<Record<TabField, string>> {
  const { faceLength, faceWidth } = tab;
  const len = (mm: number) => fmtLength(mm, units);
  const [minW, maxW] = FACE_WIDTH_RANGE[units].labels;
  const out: Partial<Record<TabField, string>> = {};
  if (!(faceLength >= 20 && faceLength <= 200)) out.faceLength = `Between ${len(20)} and ${len(200)}`;
  if (!faceWidthOk(faceWidth, units)) out.faceWidth = `Between ${minW} and ${maxW}`;
  return out;
}

export function setupProblems(state: AppState): string[] {
  const { faceLength, faceWidth } = state.tab;
  const out: string[] = [];
  const len = (mm: number) => fmtLength(mm, state.units);
  const [minW, maxW] = FACE_WIDTH_RANGE[state.units].labels;
  if (!(faceLength >= 20 && faceLength <= 200)) out.push(`Face length should be between ${len(20)} and ${len(200)}.`);
  if (!faceWidthOk(faceWidth, state.units)) out.push(`Face width should be between ${minW} and ${maxW}.`);
  if (state.distances.length < 1) out.push('Pick at least one distance.');
  return out;
}

/**
 * Sets the reading at distance d. A reading of 0 is the point-on distance, and there is
 * only one, so setting it clears 0 from every other distance.
 */
export function withReading(state: AppState, d: number, text: string): AppState {
  const readings: Record<string, string> = { ...state.readings, [d]: text };
  if (parseNum(text) === 0) {
    for (const [other, t] of Object.entries(readings)) if (Number(other) !== d && parseNum(t) === 0) readings[other] = '';
  }
  return { ...state, readings };
}

/**
 * Adds distance d. A list still in distance order keeps that order; a reordered one
 * gets d at the end.
 */
export function withDistance(state: AppState, d: number): AppState {
  const ds = state.distances;
  if (ds.includes(d)) return state;
  const sorted = ds.every((x, i) => i === 0 || ds[i - 1] < x);
  return { ...state, distances: sorted ? [...ds, d].sort((a, b) => a - b) : [...ds, d] };
}

/** Removes distance d. Its reading is kept, in case it comes back. */
export const withoutDistance = (state: AppState, d: number): AppState => ({ ...state, distances: state.distances.filter((x) => x !== d) });

/** Moves distance d to position `to` in the list. */
export function withDistanceAt(state: AppState, d: number, to: number): AppState {
  const rest = state.distances.filter((x) => x !== d);
  if (rest.length === state.distances.length) return state;
  const at = Math.max(0, Math.min(rest.length, to));
  if (state.distances.indexOf(d) === at) return state;
  return { ...state, distances: [...rest.slice(0, at), d, ...rest.slice(at)] };
}

export interface ReadingRow {
  distance: number;
  text: string;
  value: number | null;
  error: string | null;
}

export function readingRows(state: AppState): ReadingRow[] {
  return state.distances.map((distance) => {
    const text = state.readings[distance] ?? '';
    const value = parseNum(text);
    let error: string | null = null;
    if (text.trim() !== '' && value === null) error = 'Not a number';
    else if (value !== null && (value < 0 || value > SCALE_MAX)) error = `Must be 0–${SCALE_MAX}`;
    return { distance, text, value: error ? null : value, error };
  });
}

export function validReadings(state: AppState): Reading[] {
  return readingRows(state)
    .filter((r): r is ReadingRow & { value: number } => r.value !== null)
    .map((r) => ({ distance: r.distance, crawl: r.value }));
}

/**
 * Switches units. Tab sizes are kept in mm, so only distances change: each becomes the
 * nearest whole yard (or metre), keeping its reading. Distances that land on the same
 * number merge, keeping the first one's reading.
 */
export function withUnits(state: AppState, units: Units): AppState {
  if (state.units === units) return state;
  const factor = units === 'imperial' ? 1 / M_PER_YD : M_PER_YD;
  const convert = (d: number) => Math.max(1, Math.round(d * factor));
  const readings: Record<string, string> = {};
  for (const d of state.distances) {
    const text = state.readings[d];
    if (text !== undefined && !(convert(d) in readings)) readings[convert(d)] = text;
  }
  return { ...state, units, distances: [...new Set(state.distances.map(convert))], readings };
}
