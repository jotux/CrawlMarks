import { useId } from 'react';
import type { TabSpec, Units } from '../state';
import { fmtLength } from '../state';

// Screen-only explainer, drawn in px. The tab itself is a simple picture of a real barebow tab
// (leather face, plate, ruler strip), so its colours are fixed;
// the dimension lines and labels follow the theme.
const W = 340, H = 256;
const TOP = 46, MAX_H = 158, MAX_W = 96;
/** room left of the tab for the face length dimension and its label */
const LENGTH_LABEL = 34;
/** plate width as a share of the face width, as on the reference tab */
const PLATE = 0.62;
const ink = { fill: 'var(--ink)' };
const muted = { fill: 'var(--muted)' };

/** A dimension line with end ticks, from (x1, y1) to (x2, y2). */
function Dim({ x1, y1, x2, y2, color = 'var(--muted)' }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  const vertical = x1 === x2;
  const tick = (x: number, y: number) => vertical
    ? <line x1={x - 4} x2={x + 4} y1={y} y2={y} />
    : <line x1={x} x2={x} y1={y - 4} y2={y + 4} />;
  return (
    <g style={{ stroke: color }} strokeWidth="1.25">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {tick(x1, y1)}
      {tick(x2, y2)}
    </g>
  );
}

/**
 * The tab drawn with its plate on the right, `w` × `h` face at the origin. Mirrored by the caller
 * for a left-handed tab. `mm` is px per millimetre, for the ruler ticks.
 */
function TabPicture({ w, h, mm, id }: { w: number; h: number; mm: number; id: string }) {
  const p = w * PLATE;
  const r = Math.min(w, h) * 0.09;
  const strip = Math.max(5, w * 0.07);
  const pt = -5, pb = h + 5; // the plate stands a little proud of the face
  const plate = `M ${w} ${pt} H ${w + p * 0.72} Q ${w + p} ${pt} ${w + p} ${pt + h * 0.14} `
    + `V ${pb - h * 0.3} Q ${w + p} ${pb} ${w + p * 0.62} ${pb} H ${w} Z`;
  const ticks: number[] = [];
  for (let t = 2; t * mm < h - 2; t += 2) ticks.push(t);
  return (
    <g>
      {/* suede backing showing at the free edge, then the leather face */}
      <rect x={-4} y={3} width={w + 4} height={h} rx={r} fill="#B9774A" />
      <rect x={0} y={0} width={w} height={h} rx={r} fill={`url(#${id}-leather)`} />
      <path d={plate} fill={`url(#${id}-plate)`} stroke="#9C8758" strokeWidth="0.75" />
      {/* black ruler strip along the seam, ticked every 2 mm and longer every 10 */}
      <rect x={w} y={pt} width={strip} height={pb - pt} fill="#161616" />
      {ticks.map((t) => (
        <line key={t} x1={w} x2={w + (t % 10 === 0 ? strip * 0.8 : strip * 0.45)} y1={t * mm} y2={t * mm} stroke="#EDEDED" strokeWidth="0.75" />
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
  const scale = Math.min(MAX_H / length, MAX_W / width);
  const w = width * scale, h = length * scale, p = w * PLATE;
  const left = tab.hand === 'left';
  // the tab and its length label, centred across the diagram
  const LEFT = (W - (w + p) + LENGTH_LABEL) / 2;
  // the face sits beside the plate: plate on the right for a right-handed tab, mirrored for a left
  const faceX = left ? LEFT + p : LEFT;
  const outer = LEFT + w + p;
  const bottom = TOP + h;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tab-diagram" role="img"
      aria-label={`Tab face ${len(tab.faceLength)} by ${len(tab.faceWidth)}, measured from the top edge under your nock. The marks use the whole face length.`}>
      <defs>
        <linearGradient id={`${id}-leather`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A2A26" />
          <stop offset="1" stopColor="#2B1715" />
        </linearGradient>
        <linearGradient id={`${id}-plate`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D8C48F" />
          <stop offset="1" stopColor="#BFA86F" />
        </linearGradient>
      </defs>

      <g transform={left ? `translate(${outer} ${TOP}) scale(-1 1)` : `translate(${LEFT} ${TOP})`}>
        <TabPicture w={w} h={h} mm={scale} id={id} />
      </g>

      {/* top edge: where every measurement starts */}
      <line x1={faceX - 3} x2={faceX + w + 3} y1={TOP} y2={TOP} style={{ stroke: 'var(--accent)' }} strokeWidth="3.5" strokeLinecap="round" />
      <text x={faceX + w / 2} y={TOP - 24} className="diagram-label" textAnchor="middle" style={{ fill: 'var(--accent-ink)' }} fontWeight={600}>Top edge</text>
      <text x={faceX + w / 2} y={TOP - 11} className="diagram-label small" textAnchor="middle" style={muted}>Under your nock</text>

      {/* face length, down the outside */}
      <Dim x1={LEFT - 16} y1={TOP} x2={LEFT - 16} y2={bottom} />
      <text transform={`translate(${LEFT - 26} ${TOP + h / 2}) rotate(-90)`} className="diagram-label" textAnchor="middle" style={ink}>
        Face length · <tspan className="mono">{len(tab.faceLength)}</tspan>
      </text>

      {/* face width, under the leather only */}
      <Dim x1={faceX} y1={bottom + 16} x2={faceX + w} y2={bottom + 16} />
      <text x={faceX + w / 2} y={bottom + 32} className="diagram-label" textAnchor="middle" style={ink}>
        Face width · <tspan className="mono">{len(tab.faceWidth)}</tspan>
      </text>
    </svg>
  );
}
