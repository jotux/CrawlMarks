import { CurveModel, DEFAULT_CURVE_MODEL, isCurveModel } from './model/fit';
import { DEFAULT_TICK_STYLE, isTickStyle } from './model/tickStyles';
import { AppState, MINOR_RANGE, defaultState, fmtMetres, isPlotMode, validReadings } from './state';

/** A setup saved in this browser under a name. */
export interface SavedSetup {
  id: string;
  name: string;
  /** ms since epoch */
  savedAt: number;
  state: AppState;
}

/** Which saved setup the current work came from (id) and what it is called; both null for new work. */
export interface CurrentSetup {
  id: string | null;
  name: string | null;
}

export const LIBRARY_KEY = 'crawlmarks:setups';
export const CURRENT_KEY = 'crawlmarks:current';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Rebuilds app state from untrusted JSON (a saved setup or a shared link), keeping only fields it understands. */
export function sanitizeState(raw: unknown): AppState | null {
  if (!isObject(raw)) return null;
  const tab = isObject(raw.tab) ? raw.tab : {};
  const d = defaultState.tab;
  const distances = Array.isArray(raw.distances)
    ? [...new Set(raw.distances.filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0 && x <= 150))]
    : defaultState.distances;
  const readings: Record<string, string> = {};
  if (isObject(raw.readings)) {
    for (const [k, v] of Object.entries(raw.readings)) {
      if (typeof v === 'string' && v.length <= 12 && Number.isFinite(Number(k))) readings[String(Number(k))] = v;
    }
  }
  const minor = Math.round(finite(raw.minorMarks, defaultState.minorMarks));
  return {
    tab: {
      hand: tab.hand === 'left' ? 'left' : 'right',
      faceLength: finite(tab.faceLength, d.faceLength),
      faceWidth: finite(tab.faceWidth, d.faceWidth),
      zoneStart: finite(tab.zoneStart, d.zoneStart),
      zoneEnd: finite(tab.zoneEnd, d.zoneEnd),
    },
    distances,
    readings,
    minorMarks: Math.min(MINOR_RANGE.max, Math.max(MINOR_RANGE.min, minor)),
    tickStyle: isTickStyle(raw.tickStyle) ? raw.tickStyle : DEFAULT_TICK_STYLE,
    templateWidth: typeof raw.templateWidth === 'number' && Number.isFinite(raw.templateWidth) ? raw.templateWidth : null,
    curveModel: isCurveModel(raw.curveModel) ? (raw.curveModel as CurveModel) : DEFAULT_CURVE_MODEL,
    plotMode: isPlotMode(raw.plotMode) ? raw.plotMode : 'curve',
  };
}

/** The state with readings only for the distances it lists, which is all a share link or a comparison needs. */
export function trimmed(state: AppState): AppState {
  const readings: Record<string, string> = {};
  for (const d of state.distances) {
    const text = state.readings[d]?.trim();
    if (text) readings[d] = text;
  }
  return { ...state, readings };
}

export const sameState = (a: AppState, b: AppState) => JSON.stringify(trimmed(a)) === JSON.stringify(trimmed(b));

/** True when there is work that would be lost by opening something else. */
export function hasUnsavedWork(state: AppState, current: CurrentSetup, library: SavedSetup[]): boolean {
  const saved = library.find((s) => s.id === current.id);
  return !sameState(state, saved ? saved.state : defaultState);
}

export function loadLibrary(): SavedSetup[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((s): SavedSetup[] => {
      if (!isObject(s) || typeof s.id !== 'string' || typeof s.name !== 'string') return [];
      const state = sanitizeState(s.state);
      return state ? [{ id: s.id, name: s.name, savedAt: finite(s.savedAt, 0), state }] : [];
    });
  } catch {
    return [];
  }
}

export function loadCurrent(): CurrentSetup {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(CURRENT_KEY) ?? 'null');
    if (isObject(raw)) {
      return { id: typeof raw.id === 'string' ? raw.id : null, name: typeof raw.name === 'string' ? raw.name : null };
    }
  } catch {
    // fall through to new work
  }
  return { id: null, name: null };
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** name, or name (2), name (3)… whichever no other saved setup uses */
export function uniqueName(name: string, library: SavedSetup[]): string {
  const taken = new Set(library.map((s) => s.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) if (!taken.has(`${name} (${n})`.toLowerCase())) return `${name} (${n})`;
}

/** A name to offer when saving new work: its distance span, e.g. "18 m" or "5–50 m". */
export function suggestedName(state: AppState): string {
  const ds = [...state.distances].sort((a, b) => a - b);
  if (ds.length === 0) return 'My tab';
  if (ds.length === 1) return fmtMetres(ds[0]);
  return `${fmtMetres(ds[0]).replace(' m', '')}–${fmtMetres(ds[ds.length - 1])}`;
}

/** e.g. "5–50 m · 7 distances · 5 readings" */
export function summary(state: AppState): string {
  const n = state.distances.length;
  const r = validReadings(state).length;
  const span = n === 1 ? fmtMetres(state.distances[0]) : `${suggestedName(state)} · ${n} distances`;
  return `${span} · ${r} reading${r === 1 ? '' : 's'}`;
}

export function savedWhen(ms: number, now = Date.now()): string {
  const day = (t: number) => new Date(t).toDateString();
  if (day(ms) === day(now)) return 'today';
  if (day(ms) === day(now - 86_400_000)) return 'yesterday';
  const sameYear = new Date(ms).getFullYear() === new Date(now).getFullYear();
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

/* ---------- share links ---------- */

/** What a share link carries. */
export interface SharedSetup {
  name: string | null;
  state: AppState;
}

export const SHARE_ROUTE = '#/open?s=';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/**
 * The setup as text for a URL: "z" + zlib-deflated JSON in base64url, or "j" + plain JSON
 * in base64url where the browser can't compress.
 */
export async function encodeSetup(setup: SharedSetup): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, n: setup.name ?? undefined, s: trimmed(setup.state) }));
  try {
    return `z${toBase64Url(await pipe(json, new CompressionStream('deflate')))}`;
  } catch {
    return `j${toBase64Url(json)}`;
  }
}

/** Reads text made by encodeSetup; null if it is damaged or not a setup. */
export async function decodeSetup(code: string): Promise<SharedSetup | null> {
  try {
    const body = fromBase64Url(code.slice(1));
    const bytes = code[0] === 'z' ? await pipe(body, new DecompressionStream('deflate'))
      : code[0] === 'j' ? body
      : null;
    if (!bytes) return null;
    const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isObject(raw) || raw.v !== 1) return null;
    const state = sanitizeState(raw.s);
    if (!state) return null;
    const name = typeof raw.n === 'string' && raw.n.trim() ? raw.n.trim().slice(0, 60) : null;
    return { name, state };
  } catch {
    return null;
  }
}

/** The share code in a location hash like #/open?s=…, if there is one. */
export function shareCodeIn(hash: string): string | null {
  return hash.startsWith(SHARE_ROUTE) ? decodeURIComponent(hash.slice(SHARE_ROUTE.length)) || null : null;
}

export const shareUrl = (code: string, base = `${location.origin}${location.pathname}`) => `${base}${SHARE_ROUTE}${code}`;
