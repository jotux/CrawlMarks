import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QrCode, SetupControl, SetupsApi, SetupsProvider } from '../components/Setups';
import { fitCrawl } from '../model/fit';
import { AppState, defaultState, validReadings, withReading } from '../state';
import { Fit } from './Fit';
import { Readings } from './Readings';
import { Setup } from './Setup';
import { Sheet } from './Sheet';
import { Strip } from './Strip';

const sample: AppState = {
  ...defaultState,
  curveModel: 'fold',
  readings: { 5: '26.5', 10: '41.5', 18: '39.5', 25: '32.5', 30: '26.5', 40: '13.5', 50: '0' },
};
const noop = () => {};

function render(state: AppState) {
  const readings = validReadings(state);
  const result = fitCrawl(readings, state.curveModel);
  return {
    setup: renderToStaticMarkup(<Setup state={state} setState={noop} />),
    strip: renderToStaticMarkup(<Strip state={state} />),
    readings: renderToStaticMarkup(<Readings state={state} setState={noop} />),
    fit: renderToStaticMarkup(<Fit state={state} setState={noop} result={result} readings={readings} />),
    sheet: renderToStaticMarkup(<Sheet state={state} setState={noop} result={result} readings={readings} />),
  };
}

describe('screens', () => {
  it('render the full flow with sample readings', () => {
    const html = render(sample);
    expect(html.setup).toContain('Describe your tab');
    expect(html.strip).toContain('this bar = 50 mm');
    expect(html.readings).toContain('Point-on');
    expect(html.readings).toContain('aria-label="Delete 18 m"');
    expect(html.readings).toContain('Move 18 m.');
    expect(html.fit).toContain('Same crawl, two distances');
    expect(html.sheet).toContain('L1');
    expect(html.sheet).toContain('FOLD');
    expect(html.sheet).toContain('Art. 9.3.7 Finger Protection');
    expect(html.sheet).toContain('Additional memoranda are not permitted.');
    expect(html.sheet).toContain('Interpretation, 11 Aug 2020, Barebow tab 3');
  });

  it('show the curve picker, on every curve', () => {
    for (const curveModel of ['auto', 'linear', 'quadratic', 'fold', 'manual'] as const) {
      const html = render({ ...sample, curveModel });
      expect(html.fit).toContain('id="curve-model"');
      expect(html.sheet).toContain('L1');
    }
    expect(render({ ...sample, curveModel: 'quadratic' }).fit).toContain('a − c·d − e·d²');
    expect(render({ ...sample, curveModel: 'auto' }).fit).toContain('Using <strong>');
  });

  it('draw the tab template at its own width, kept in range', () => {
    expect(render(sample).sheet).toContain('38 × 72 mm');
    expect(render({ ...sample, templateWidth: 25 }).sheet).toContain('25 × 72 mm');
    expect(render({ ...sample, templateWidth: 200 }).sheet).toContain('58 × 72 mm');
    expect(render({ ...sample, templateWidth: 4 }).sheet).toContain('10 × 72 mm');
  });

  it('allow only one point-on distance', () => {
    const moved = withReading(sample, 40, '0');
    expect(moved.readings[40]).toBe('0');
    expect(moved.readings[50]).toBe('');
    expect(moved.readings[30]).toBe('26.5');
    expect(withReading(sample, 40, '13').readings[50]).toBe('0');
    expect(Object.values(withReading(sample, 18, '0.0').readings).filter((t) => Number(t) === 0 && t !== '')).toHaveLength(1);
  });

  it('offer a single-distance tab when there is only one reading', () => {
    const one = render({ ...sample, readings: { 18: '39.5' } });
    expect(one.readings).toContain('Build tab for single distance');
    expect(one.sheet).toContain('Single-distance tab');
    expect(one.sheet).toContain('18 m · strip reading 39.5');
    expect(one.sheet).not.toContain('Key card');
    expect(render(sample).readings).not.toContain('Build tab for single distance');
    expect(render({ ...sample, readings: { 18: '39.5', 25: '32' } }).readings).not.toContain('Build tab for single distance');
  });

  it('let setup continue with a single distance', () => {
    const one = render({ ...defaultState, distances: [18] });
    expect(one.setup).not.toContain('Pick at least');
    expect(one.readings).toContain('Enter your reading to make a tab for this distance.');
    expect(render({ ...defaultState, distances: [] }).setup).toContain('Pick at least one distance.');
  });

  it('plot only recorded distances when asked, even without a curve', () => {
    const html = render({ ...sample, plotMode: 'recorded' });
    expect(html.sheet).toContain('One line per recorded distance');
    expect(html.sheet).not.toContain('Small marks between');
    expect(html.sheet).not.toContain('FOLD');
    expect(html.sheet).toContain('5 · 30 m');
    expect(render(sample).sheet).toContain('Small marks between');
    const two = render({ ...sample, plotMode: 'recorded', readings: { 18: '39.5', 30: '26.5' } });
    expect(two.sheet).toContain('One line per recorded distance');
  });

  it('explain what is missing before there are readings', () => {
    const html = render(defaultState);
    expect(html.readings).toContain('Enter readings for at least three distances.');
    expect(html.fit).toContain('three or more distances');
    expect(html.sheet).toContain('Back to readings');
  });

  it('show the open setup and draw share QR codes', () => {
    const api = { state: sample, current: { id: 'a', name: 'Indoor 18 m' }, library: [], unsaved: true } as unknown as SetupsApi;
    const header = renderToStaticMarkup(<SetupsProvider value={api}><SetupControl variant="header" /></SetupsProvider>);
    expect(header).toContain('Indoor 18 m');
    expect(header).toContain('unsaved-dot');
    const sidebar = renderToStaticMarkup(<SetupsProvider value={api}><SetupControl variant="sidebar" /></SetupsProvider>);
    expect(sidebar).toContain('>Share<');
    expect(renderToStaticMarkup(<SetupControl variant="header" />)).toBe('');
    expect(renderToStaticMarkup(<QrCode text="https://jotux.github.io/CrawlMarks/#/open?s=zAbC" />)).toMatch(/<path d="M\d+ \d+h1v1h-1z/);
  });
});
