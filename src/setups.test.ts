import { describe, expect, it } from 'vitest';
import {
  SHARE_ROUTE, decodeSetup, encodeSetup, hasUnsavedWork, sanitizeState, shareCodeIn, shareUrl, suggestedName, summary, uniqueName,
} from './setups';
import { AppState, defaultState } from './state';

const sample: AppState = {
  ...defaultState,
  distances: [30, 5, 18],
  readings: { 5: '26.5', 18: '39.5', 30: '26.5', 70: '1' },
  curveModel: 'fold',
  tickStyle: 'split',
  templateWidth: 42,
};
const saved = (id: string, name: string, state: AppState = sample) => ({ id, name, savedAt: 0, state });

describe('share links', () => {
  it('round-trip a setup, dropping readings for distances it no longer has', async () => {
    const code = await encodeSetup({ name: 'Indoor 18 m', state: sample });
    expect(code[0]).toBe('z');
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await decodeSetup(code);
    expect(back?.name).toBe('Indoor 18 m');
    expect(back?.state).toEqual({ ...sample, readings: { 5: '26.5', 18: '39.5', 30: '26.5' } });
  });

  it('keep links short', async () => {
    const code = await encodeSetup({ name: null, state: sample });
    expect(shareUrl(code, 'https://jotux.github.io/CrawlMarks/').length).toBeLessThan(400);
  });

  it('reject damaged links', async () => {
    const code = await encodeSetup({ name: 'x', state: sample });
    expect(await decodeSetup(code.slice(0, 20))).toBeNull();
    expect(await decodeSetup('q123')).toBeNull();
    expect(await decodeSetup(`j${btoa(JSON.stringify({ v: 9, s: {} }))}`)).toBeNull();
  });

  it('find the code in the address', () => {
    expect(shareCodeIn(`${SHARE_ROUTE}zAbC`)).toBe('zAbC');
    expect(shareCodeIn('#/readings')).toBeNull();
    expect(shareCodeIn(SHARE_ROUTE)).toBeNull();
  });
});

describe('sanitizeState', () => {
  it('keeps only fields it understands, with sane values', () => {
    const s = sanitizeState({
      tab: { hand: 'left', faceLength: 'long', faceWidth: 40 },
      distances: [18, 18, -5, 'x', 900, 25],
      readings: { 18: '30', 25: 7, x: '1' },
      minorMarks: 99,
      tickStyle: 'nope',
      curveModel: 'linear',
      evil: '<script>',
    });
    expect(s).toEqual({
      ...defaultState,
      tab: { ...defaultState.tab, hand: 'left', faceWidth: 40 },
      distances: [18, 25],
      readings: { 18: '30' },
      minorMarks: 10,
      curveModel: 'linear',
    });
    expect(sanitizeState('nope')).toBeNull();
  });
});

describe('library', () => {
  it('names new setups after their distances', () => {
    expect(suggestedName({ ...defaultState, distances: [18] })).toBe('18 m');
    expect(suggestedName(sample)).toBe('5–30 m');
    expect(summary(sample)).toBe('5–30 m · 3 distances · 3 readings');
  });

  it('makes names unique', () => {
    const lib = [saved('a', 'Indoor'), saved('b', 'Indoor (2)')];
    expect(uniqueName('Field', lib)).toBe('Field');
    expect(uniqueName('indoor', lib)).toBe('indoor (3)');
  });

  it('knows when work is unsaved', () => {
    const lib = [saved('a', 'Indoor')];
    expect(hasUnsavedWork(sample, { id: 'a', name: 'Indoor' }, lib)).toBe(false);
    expect(hasUnsavedWork({ ...sample, readings: { ...sample.readings, 70: '9' } }, { id: 'a', name: 'Indoor' }, lib)).toBe(false);
    expect(hasUnsavedWork({ ...sample, minorMarks: 2 }, { id: 'a', name: 'Indoor' }, lib)).toBe(true);
    expect(hasUnsavedWork(defaultState, { id: null, name: null }, lib)).toBe(false);
    expect(hasUnsavedWork(sample, { id: null, name: null }, lib)).toBe(true);
  });
});
