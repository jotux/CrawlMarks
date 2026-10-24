import { useId } from 'react';
import type { TabSpec, Units } from '../state';
import { fmtLength } from '../state';

// Screen-only explainer, drawn in px. The tab is a simple picture of a real barebow tab
// (leather, then a black plate with a ruler along the seam), so its colours are fixed;
// the face outline, dimension lines and labels follow the theme.
const W = 340, H = 256;
const TOP = 46, MAX_H = 158, MAX_W = 200;
/** plate width, and leather width, as multiples of the face width and length */
const PLATE = 1.4, LEATHER = 0.65;
/** room beside the plate for the face length dimension and its label */
const LENGTH_LABEL = 34;
const ink = { fill: 'var(--ink)' };
const muted = { fill: 'var(--muted)' };

/** A dimension line with end ticks, from (x1, y1) to (x2, y2). */
function Dim({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const vertical = x1 === x2;
  const tick = (x: number, y: number) => vertical
    ? <line x1={x - 4} x2={x + 4} y1={y} y2={y} />
    : <line x1={x} x2={x} y1={y - 4} y2={y + 4} />;
  return (
    <g style={{ stroke: 'var(--muted)' }} strokeWidth="1.25">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {tick(x1, y1)}
      {tick(x2, y2)}
    </g>
  );
}

/**
 * The tab with its plate on the right of the seam at x = 0 and the leather to the left, top at
 * y = 0. Mirrored by the caller for a left-handed tab. `mm` is px per millimetre, for the ruler.
 */
function TabPicture({ w, h, mm, id }: { w: number; h: number; mm: number; id: string }) {
  const p = w * PLATE;
  const l = h * LEATHER;
  const r = h * 0.05;
  // square at the seam, rounded at the outer corners
  const plate = `M 0 0 H ${p - r * 2} Q ${p} 0 ${p} ${r * 2} V ${h - r * 2} Q ${p} ${h} ${p - r * 2} ${h} H 0 Z`;
  const ticks: number[] = [];
  for (let t = 2; t * mm < h - 2; t += 2) ticks.push(t);
  return (
    <g>
      {/* suede backing showing at the free edge, then the leather */}
      <rect x={-l - 4} y={3} width={l + 4} height={h - 2} rx={r} fill="#B9774A" />
      <rect x={-l} y={0} width={l + 2} height={h} rx={r} fill={`url(#${id}-leather)`} />
      <path d={plate} fill={`url(#${id}-plate)`} stroke="#55595F" strokeWidth="0.75" />
      {/* ruler along the seam, ticked every 2 mm and longer every 10 */}
      {ticks.map((t) => (
        <line key={t} x1={0} x2={t % 10 === 0 ? w * 0.22 : w * 0.12} y1={t * mm} y2={t * mm} stroke="#EDEDED" strokeWidth="0.75" />
      ))}
    </g>
  );
}

/** Where each setup measurement is taken on the tab face, drawn from the current numbers. */
export function TabDiagram({ tab, units }: { tab: TabSpec; units: Units }) {
  const len = (mm: number) => fmtLength(mm, units);
  // the diagram can be on the page twice (narrow and wide layouts), so gradient ids must be unique
  const id = `tab${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const length = Math.max(tab.faceLength, 1);
  const width = Math.max(tab.faceWidth, 1);
  const scale = Math.min(MAX_H / length, MAX_W / (width * PLATE + length * LEATHER));
  const w = width * scale, h = length * scale, p = w * PLATE, l = h * LEATHER;
  const left = tab.hand === 'left';
  // the seam: leather on one side, plate then the length label on the other, all centred.
  // Plate on the right for a right-handed tab, mirrored for a left.
  const span = l + p + LENGTH_LABEL;
  const seam = left ? (W - span) / 2 + LENGTH_LABEL + p : (W - span) / 2 + l;
  const x = (dx: number) => (left ? seam - dx : seam + dx);
  const faceL = Math.min(x(0), x(w)), faceR = Math.max(x(0), x(w));
  const bottom = TOP + h;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tab-diagram" role="img"
      aria-label={`Tab face ${len(tab.faceLength)} by ${len(tab.faceWidth)}, on the plate over its ruler, measured from the top edge under your nock.`}>
      <defs>
        <linearGradient id={`${id}-leather`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A2A26" />
          <stop offset="1" stopColor="#2B1715" />
        </linearGradient>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2A2C30" />
          <stop offset="1" stopColor="#141518" />
        </linearGradient>
      </defs>

      <g transform={left ? `translate(${seam} ${TOP}) scale(-1 1)` : `translate(${seam} ${TOP})`}>
        <TabPicture w={w} h={h} mm={scale} id={id} />
      </g>

      {/* the face: on the plate, over the ruler */}
      <rect x={faceL} y={TOP} width={w} height={h} style={{ fill: 'var(--teal)', stroke: 'var(--teal)' }}
        fillOpacity="0.22" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={(faceL + faceR) / 2} y={TOP + h / 2} className="diagram-label" textAnchor="middle" dominantBaseline="central"
        fill="#FFFFFF" fontWeight={600}>face</text>

      {/* top edge: where every measurement starts */}
      <line x1={faceL - 3} x2={faceR + 3} y1={TOP} y2={TOP} style={{ stroke: 'var(--accent)' }} strokeWidth="3.5" strokeLinecap="round" />
      <text x={(faceL + faceR) / 2} y={TOP - 24} className="diagram-label" textAnchor="middle" style={{ fill: 'var(--accent-ink)' }} fontWeight={600}>Top edge</text>
      <text x={(faceL + faceR) / 2} y={TOP - 11} className="diagram-label small" textAnchor="middle" style={muted}>Under your nock</text>

      {/* face length, down the outside of the plate */}
      <Dim x1={x(p + 12)} y1={TOP} x2={x(p + 12)} y2={bottom} />
      <text transform={`translate(${x(p + 24)} ${TOP + h / 2}) rotate(${left ? -90 : 90})`} className="diagram-label" textAnchor="middle" style={ink}>
        Face length · <tspan className="mono">{len(tab.faceLength)}</tspan>
      </text>

      {/* face width, across the face only */}
      <Dim x1={faceL} y1={bottom + 16} x2={faceR} y2={bottom + 16} />
      <text x={(faceL + faceR) / 2} y={bottom + 32} className="diagram-label" textAnchor="middle" style={ink}>
        Face width · <tspan className="mono">{len(tab.faceWidth)}</tspan>
      </text>
    </svg>
  );
}
