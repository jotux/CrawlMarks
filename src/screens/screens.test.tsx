import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fitCrawl } from '../model/fit';
import { AppState, defaultState, validReadings } from '../state';
import { Fit } from './Fit';
import { Readings } from './Readings';
import { Setup } from './Setup';
import { Sheet } from './Sheet';
import { Strip } from './Strip';

const sample: AppState = {
  ...defaultState,
  readings: { 5: '26.5', 10: '41.5', 18: '39.5', 25: '32.5', 30: '26.5', 40: '13.5', 50: '0' },
};
const noop = () => {};

function render(state: AppState) {
  const readings = validReadings(state);
  const result = fitCrawl(readings);
  return {
    setup: renderToStaticMarkup(<Setup state={state} setState={noop} />),
    strip: renderToStaticMarkup(<Strip state={state} />),
    readings: renderToStaticMarkup(<Readings state={state} setState={noop} />),
    fit: renderToStaticMarkup(<Fit state={state} result={result} readings={readings} />),
    sheet: renderToStaticMarkup(<Sheet state={state} setState={noop} result={result} readings={readings} />),
  };
}

describe('screens', () => {
  it('render the full flow with sample readings', () => {
    const html = render(sample);
    expect(html.setup).toContain('Describe your tab');
    expect(html.strip).toContain('this bar = 50 mm');
    expect(html.readings).toContain('Point-on');
    expect(html.fit).toContain('Same crawl, two distances');
    expect(html.sheet).toContain('L1');
    expect(html.sheet).toContain('FOLD');
  });

  it('draw the tab template at its own width, kept in range', () => {
    expect(render(sample).sheet).toContain('38 × 72 mm');
    expect(render({ ...sample, templateWidth: 25 }).sheet).toContain('25 × 72 mm');
    expect(render({ ...sample, templateWidth: 200 }).sheet).toContain('58 × 72 mm');
    expect(render({ ...sample, templateWidth: 4 }).sheet).toContain('10 × 72 mm');
  });

  it('explain what is missing before there are readings', () => {
    const html = render(defaultState);
    expect(html.readings).toContain('Enter readings for at least three distances.');
    expect(html.fit).toContain('three or more distances');
    expect(html.sheet).toContain('Back to readings');
  });
});
