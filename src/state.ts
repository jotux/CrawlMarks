import { useEffect, useState } from 'react';
import { CurveModel, DEFAULT_CURVE_MODEL, isCurveModel, type Reading } from './model/fit';
import { DEFAULT_TICK_STYLE, TickStyle, isTickStyle } from './model/tickStyles';

export type Hand = 'right' | 'left';

/** What the marker sheet draws: lines from the fitted curve every 5 m, or only the recorded distances. */
export type PlotMode = 'curve' | 'recorded';
export const isPlotMode = (v: unknown): v is PlotMode => v === 'curve' || v === 'recorded';

export interface TabSpec {
  hand: Hand;
  /** mm, all measured from the top edge of the tab face */
  faceLength: number;
  faceWidth: number;
  zoneStart: number;
  zoneEnd: number;
}

export interface AppState {
  tab: TabSpec;
  /** metres, in the order the readings list shows them (nearest first unless reordered) */
  distances: number[];
  /** raw text typed per distance, keyed by distance: strip units, 0 at the top of the zone, SCALE_MAX at the bottom */
  readings: Record<string, string>;
  minorMarks: number;
  tickStyle: TickStyle;
  /** mm width of the final tab template; null follows the face width from setup */
  templateWidth: number | null;
  curveModel: CurveModel;
  plotMode: PlotMode;
}

export const MINOR_RANGE = { min: 1, max: 10 };
/** mm the final tab template may span: at least 10, and up to 20 wider than the setup face */
export const templateWidthRange = (tab: TabSpec) => ({ min: 10, max: Math.max(10, tab.faceWidth + 20) });

/** The sight-in strip reads 0–50 across the marking zone, whatever its size. */
export const SCALE_MAX = 50;

export const defaultState: AppState = {
  tab: { hand: 'right', faceLength: 72, faceWidth: 38, zoneStart: 6, zoneEnd: 58 },
  distances: [5, 10, 18, 25, 30, 40, 50],
  readings: {},
  minorMarks: 4,
  tickStyle: DEFAULT_TICK_STYLE,
  templateWidth: null,
  curveModel: DEFAULT_CURVE_MODEL,
  plotMode: 'curve',
};

const STORAGE_KEY = 'crawlmarks:v3';
/** Older saves, newest first, with how many of their reading units fit in the zone */
const OLDER_KEYS: { key: string; units: (tab: TabSpec) => number }[] = [
  { key: 'baremarks:v3', units: () => SCALE_MAX }, // same format, saved before the rename
  { key: 'baremarks:v2', units: () => 100 },
  { key: 'baremarks:v1', units: (tab) => zoneLength(tab) }, // mm
];

function merge(saved: Partial<AppState>): AppState {
  return {
    ...defaultState,
    ...saved,
    tab: { ...defaultState.tab, ...saved.tab },
    readings: { ...saved.readings },
    tickStyle: isTickStyle(saved.tickStyle) ? saved.tickStyle : DEFAULT_TICK_STYLE,
    curveModel: isCurveModel(saved.curveModel) ? saved.curveModel : DEFAULT_CURVE_MODEL,
    plotMode: isPlotMode(saved.plotMode) ? saved.plotMode : 'curve',
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return merge(JSON.parse(raw));
    for (const { key, units } of OLDER_KEYS) {
      const old = localStorage.getItem(key);
      if (!old) continue;
      const state = merge(JSON.parse(old));
      const factor = SCALE_MAX / units(state.tab);
      const readings: Record<string, string> = {};
      for (const [d, text] of Object.entries(state.readings)) {
        const n = parseNum(text);
        readings[d] = n === null ? text : String(Math.round(n * factor * 2) / 2);
      }
      return { ...state, readings };
    }
    return defaultState;
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
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Width the final tab template is drawn at, kept inside templateWidthRange. */
export const templateWidth = (state: AppState) => clampTemplateWidth(state.tab, state.templateWidth ?? state.tab.faceWidth);

export const zoneLength = (tab: TabSpec) => tab.zoneEnd - tab.zoneStart;
/** mm down the tab face for a strip reading */
export const unitsToMm = (tab: TabSpec, units: number) => tab.zoneStart + (units * zoneLength(tab)) / SCALE_MAX;

export function parseNum(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function setupProblems(state: AppState): string[] {
  const { faceLength, faceWidth, zoneStart, zoneEnd } = state.tab;
  const out: string[] = [];
  if (!(faceLength >= 20 && faceLength <= 200)) out.push('Face length should be between 20 and 200 mm.');
  if (!(faceWidth >= 10 && faceWidth <= 120)) out.push('Face width should be between 10 and 120 mm.');
  if (!(zoneStart >= 0)) out.push('The marking zone can’t start above the top edge.');
  if (!(zoneEnd > zoneStart + 5)) out.push('The marking zone needs to be at least 5 mm tall.');
  if (!(zoneEnd <= faceLength)) out.push('The marking zone must end on the tab face.');
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

export function fmtMetres(d: number): string {
  return `${Math.abs(d - Math.round(d)) < 0.05 ? Math.round(d) : d.toFixed(1)} m`;
}
