// Everything here is drawn in millimetres. On screen the SVGs scale to their
// container; with `trueSize` they carry real mm dimensions so they print 1:1.
// Crawls arrive in strip units (0–SCALE_MAX across the zone) and are placed with unitsToMm.
import type { TabSpec } from '../state';
import { SCALE_MAX, fmtMetres, unitsToMm, zoneLength } from '../state';
import type { Mark, NearLabel } from '../model/marks';
import { stripTicks, tickStep } from '../model/strip';
import { TickContext, TickStyle, tickSegments } from '../model/tickStyles';

/** One tab line in the chosen style, spanning `w` from `x0`. */
function TickLine({ style, ctx, long, minor, x0, w, y, strokeWidth }: {
  style: TickStyle; ctx: TickContext; long: boolean; minor: number; x0: number; w: number; y: number; strokeWidth: number;
}) {
  return (
    <>
      {tickSegments(style, long, minor, ctx).map(([a, b]) => (
        <line key={a} x1={x0 + a * w} x2={x0 + b * w} y1={y} y2={y} stroke="#17201B" strokeWidth={strokeWidth} />
      ))}
    </>
  );
}

/** The logo on its own: `width` mm wide when printed, scaled to its container on screen. */
export function LogoImage({ width, trueSize }: { width: number; trueSize?: boolean }) {
  const h = logoHeight(width);
  return (
    <svg viewBox={`0 0 ${width} ${h}`} {...size(width, h, trueSize)} role="img" aria-label="CrawlMarks">
      <Logo x={0} y={0} width={width} />
    </svg>
  );
}

/** Style context for a tab's marks: short lines per gap (the most any gap has) and the shooting hand. */
const marksContext = (tab: TabSpec, marks: Mark[]): TickContext => ({ count: Math.max(1, ...marks.map((m) => m.minor)), hand: tab.hand });

/** A small sample of a style for the picker and legend: long, three short, long. */
export function TickPreview({ style, hand = 'right', width = 56, height = 34 }: {
  style: TickStyle; hand?: TabSpec['hand']; width?: number; height?: number;
}) {
  const rows = [true, false, false, false, true];
  const pad = 4;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className="tick-preview">
      <rect x="0.5" y="0.5" width={width - 1} height={height - 1} rx="4" fill="#FFFFFF" stroke="#C9CFC9" />
      {rows.map((long, i) => (
        <TickLine key={i} style={style} ctx={{ count: 3, hand }} long={long} minor={long ? 0 : 4 - i} x0={pad} w={width - pad * 2}
          y={pad + 1 + (i * (height - pad * 2 - 2)) / (rows.length - 1)} strokeWidth={1.5} />
      ))}
    </svg>
  );
}

function size(w: number, h: number, trueSize?: boolean) {
  return trueSize ? { width: `${w}mm`, height: `${h}mm` } : { className: 'scaled' };
}

/** Corner radii of the outline: gentle at the top; the tab face rounds more at the bottom, the strip doesn't. */
const faceRadii = (w: number, h: number, roundBottom = true) => {
  const top = Math.min(w, h) * 0.1;
  return { top, bottom: roundBottom ? Math.min(w * 0.4, h * 0.3) : top };
};

/** How far in from the side edge the outline is at height y: zero except in the rounded corners. */
export function faceInset(w: number, h: number, y: number, roundBottom = true) {
  const { top, bottom } = faceRadii(w, h, roundBottom);
  const arc = (r: number, d: number) => r - Math.sqrt(Math.max(0, r * r - d * d));
  if (y < top) return arc(top, top - y);
  if (y > h - bottom) return arc(bottom, y - (h - bottom));
  return 0;
}

/** Tab face outline: gentle corners at the top, rounder at the bottom unless roundBottom is false. */
export function facePath(w: number, h: number, roundBottom = true) {
  const { top: r1, bottom: r2 } = faceRadii(w, h, roundBottom);
  return `M ${r1},0 H ${w - r1} A ${r1} ${r1} 0 0 1 ${w},${r1} V ${h - r2} A ${r2} ${r2} 0 0 1 ${w - r2},${h} `
    + `H ${r2} A ${r2} ${r2} 0 0 1 0,${h - r2} V ${r1} A ${r1} ${r1} 0 0 1 ${r1},0 Z`;
}

const CUT = { fill: 'none', stroke: '#4A5650', strokeWidth: 0.3, strokeDasharray: '1.5 1' };

/** Size of the small capitals (RAWL, ARKS) relative to the C and M. */
const LOGO_SMALL_CAPS = 0.75;
/** Logo width per unit of font size: CRAWLMARKS in condensed capitals, eight of them small. */
const LOGO_WIDTH_PER_FONT = 0.48 * (2 + 8 * LOGO_SMALL_CAPS);

/** Height of the logo (wordmark plus ruler) for a given width, with a little room below the ruler. */
export const logoHeight = (width: number) => (width / LOGO_WIDTH_PER_FONT) * 1.3;

/**
 * The CrawlMarks wordmark with its ruler, drawn in mm with its top-left at (x, y).
 * textLength pins the word to `width` so the ruler always lines up under it.
 */
export function Logo({ x, y, width }: { x: number; y: number; width: number }) {
  const font = width / LOGO_WIDTH_PER_FONT;
  const rulerY = y + font * 0.95;
  const rulerH = font * 0.28;
  return (
    <g aria-label="CrawlMarks">
      <text x={x} y={y + font * 0.78} fontSize={font} className="svg-display" fontWeight={700}
        textLength={width} lengthAdjust="spacingAndGlyphs" fill="#17201B">
        C<tspan fontSize={font * LOGO_SMALL_CAPS}>RAWL</tspan>
        <tspan fill="#B07A00">M<tspan fontSize={font * LOGO_SMALL_CAPS}>ARKS</tspan></tspan>
      </text>
      <rect x={x} y={rulerY} width={width} height={rulerH * 0.23} fill="#B07A00" />
      {Array.from({ length: 21 }, (_, i) => (
        <rect key={i} x={x + Math.min(i * 5, 98.8) * width / 100} y={rulerY} width={width * 0.012}
          height={rulerH * (i % 5 === 0 ? 1 : 0.57)} fill="#B07A00" />
      ))}
    </g>
  );
}

/**
 * Font size of the strip's numbers, and how close to the top and bottom cut lines their
 * middles may sit (more room at the bottom, where the corner curves in under them).
 */
const STRIP_LABEL = { size: 2.6, top: 1.7, bottom: 3.2 };

export function StripDrawing({ tab, trueSize }: { tab: TabSpec; trueSize?: boolean }) {
  const { faceWidth: w, faceLength: h } = tab;
  const ticks = stripTicks(zoneLength(tab), SCALE_MAX);
  // ticks run down the edge under the index finger; mirror for a left-handed tab
  const left = tab.hand === 'right';
  const x0 = left ? 0 : w;
  const dir = left ? 1 : -1;
  const LEN = { label: 7, half: 5, small: 3 };
  // each tick starts at the cut line, so in the rounded corners it steps in and keeps its full length
  const edge = (y: number) => x0 + dir * faceInset(w, h, y, false);
  // numbers stay inside the strip even when the zone starts or ends at its edge
  const labelY = (y: number) => Math.min(h - STRIP_LABEL.bottom, Math.max(STRIP_LABEL.top, y));
  // TOP sits in the top corner away from the ticks
  const corner = Math.max(1.2, faceRadii(w, h, false).top);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} {...size(w, h, trueSize)} role="img"
      aria-label={`Sight-in strip, 0 to ${SCALE_MAX} with a tick every ${tickStep(zoneLength(tab), SCALE_MAX)}`}>
      <path d={facePath(w, h, false)} {...CUT} />
      {ticks.map((t) => {
        const y = unitsToMm(tab, t.units);
        return <line key={t.units} x1={edge(y)} x2={edge(y) + dir * LEN[t.size]} y1={y} y2={y} stroke="#17201B" strokeWidth={t.size === 'small' ? 0.18 : 0.3} />;
      })}
      {ticks.filter((t) => t.size === 'label').map((t) => {
        const y = labelY(unitsToMm(tab, t.units));
        return (
          <text key={t.units} x={edge(y) + dir * 8.5} y={y} className="svg-mono" fontSize={STRIP_LABEL.size}
            dominantBaseline="central" textAnchor={left ? 'start' : 'end'}>
            {t.units}
          </text>
        );
      })}
      <text x={left ? w - corner : corner} y={1.1} className="svg-sans" fontSize={2} fontWeight={600} fill="#4A5650"
        textAnchor={left ? 'end' : 'start'} dominantBaseline="hanging" letterSpacing={0.15}>TOP</text>
    </svg>
  );
}

export function ScaleBar({ trueSize }: { trueSize?: boolean }) {
  return (
    <svg viewBox="0 0 50 2" {...size(50, 2, trueSize)} role="img" aria-label="50 millimetre scale bar" preserveAspectRatio="none">
      <rect x="0" y="0" width="50" height="2" fill="#17201B" />
    </svg>
  );
}

/** What gets copied onto the tab: plain lines only, two lengths. */
export function TabTemplate({ tab, marks, style, trueSize }: { tab: TabSpec; marks: Mark[]; style: TickStyle; trueSize?: boolean }) {
  const { faceWidth: w, faceLength: h } = tab;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} {...size(w, h, trueSize)} role="img" aria-label={`Tab template with ${marks.length} lines`}>
      <path d={facePath(w, h)} {...CUT} />
      {marks.map((m) => (
        <TickLine key={m.id} style={style} ctx={marksContext(tab, marks)} long={m.long} minor={m.minor} x0={0} w={w} y={unitsToMm(tab, m.crawl)} strokeWidth={0.35} />
      ))}
    </svg>
  );
}

/** US business card, portrait: 2 × 3.5 in */
export const CARD = { w: 50.8, h: 88.9 };
const CARD_M = 3;
const PLOT_TOP = 12.5;
const PLOT_BOTTOM = CARD.h - 6;
const NEAR_RIGHT = 14.5;
const TAB_X = 15.5;
const TAB_W = 15.5;
const FAR_X = TAB_X + TAB_W + 1.3;
const LABEL_SPACING = 2.6;

/** Vertical scale of the key card relative to the real tab, chosen so the marking zone fills the card. */
export const keyCardScale = (tab: TabSpec) => Math.min(3, (PLOT_BOTTOM - PLOT_TOP) / zoneLength(tab));

/**
 * The numbered key card, business-card size: near distances on the left, far
 * ones on the right. Line spacing is proportional to the tab; the tab drawing
 * itself is narrowed so the labels fit.
 */
export function KeyCard({ tab, marks, style, near, foldCrawl, foldDistance, trueSize }: {
  tab: TabSpec;
  style: TickStyle;
  marks: Mark[];
  near: NearLabel[];
  foldCrawl: number | null;
  foldDistance: number | null;
  trueSize?: boolean;
}) {
  const scale = keyCardScale(tab);
  const y = (crawl: number) => PLOT_TOP + (crawl / SCALE_MAX) * zoneLength(tab) * scale;

  // label every long line; short lines only where there is room
  const farPlaced: number[] = [];
  const farLabels: { m: Mark; y: number }[] = [];
  for (const m of [...marks.filter((x) => x.long), ...marks.filter((x) => !x.long)]) {
    const yy = y(m.crawl);
    if (m.long || farPlaced.every((q) => Math.abs(q - yy) >= LABEL_SPACING)) {
      farPlaced.push(yy);
      farLabels.push({ m, y: yy });
    }
  }

  const nearPlaced: number[] = foldCrawl !== null ? [y(foldCrawl)] : [];
  const nearShown = near.filter((n) => {
    const yy = y(n.crawl);
    if (!nearPlaced.every((q) => Math.abs(q - yy) >= LABEL_SPACING)) return false;
    nearPlaced.push(yy);
    return true;
  });

  return (
    <svg viewBox={`0 0 ${CARD.w} ${CARD.h}`} {...size(CARD.w, CARD.h, trueSize)} role="img" aria-label="Key card: each tab line with its distance">
      <rect x={0.15} y={0.15} width={CARD.w - 0.3} height={CARD.h - 0.3} {...CUT} />
      <Logo x={CARD_M} y={CARD_M} width={19} />
      <text x={CARD.w - CARD_M} y={CARD_M + 2} className="svg-sans" fontSize={1.9} fontWeight={700} letterSpacing={0.25} fill="#17201B" textAnchor="end">KEY CARD</text>
      <text x={CARD.w - CARD_M} y={CARD_M + 4.6} className="svg-mono" fontSize={1.5} fill="#4A5650" textAnchor="end">{scale.toFixed(1)}× tall</text>
      <rect x={TAB_X} y={PLOT_TOP - 1.5} width={TAB_W} height={y(SCALE_MAX) - PLOT_TOP + 3} rx={1} fill="none" stroke="#8A948E" strokeWidth={0.25} strokeDasharray="1 0.8" />
      {foldCrawl !== null && (
        <>
          <line x1={TAB_X + 0.8} x2={TAB_X + TAB_W - 0.8} y1={y(foldCrawl)} y2={y(foldCrawl)} stroke="#9A3412" strokeWidth={0.25} strokeDasharray="1 0.6" />
          <text x={NEAR_RIGHT} y={y(foldCrawl)} className="svg-sans" fontSize={1.5} fontWeight={600} fill="#9A3412" textAnchor="end" dominantBaseline="central">
            FOLD {foldDistance?.toFixed(0)} m
          </text>
        </>
      )}
      {marks.map((m) => (
        <TickLine key={m.id} style={style} ctx={marksContext(tab, marks)} long={m.long} minor={m.minor} x0={TAB_X} w={TAB_W} y={y(m.crawl)} strokeWidth={m.long ? 0.4 : 0.25} />
      ))}
      {farLabels.map(({ m, y: yy }) => m.long ? (
        <g key={m.id}>
          <rect x={FAR_X} y={yy - 1.3} width={6} height={2.6} rx={0.8} fill="#17201B" />
          <text x={FAR_X + 3} y={yy} className="svg-mono" fontSize={1.8} fontWeight={600} fill="#FFFFFF" textAnchor="middle" dominantBaseline="central">{m.id}</text>
          <text x={FAR_X + 7} y={yy} className="svg-mono" fontSize={2} fontWeight={600} fill="#0A3F3E" dominantBaseline="central">{m.alsoFor ? `${[m.distance, ...m.alsoFor].map((d) => fmtMetres(d).replace(' m', '')).join(' · ')} m` : fmtMetres(m.distance)}</text>
        </g>
      ) : (
        <text key={m.id} x={FAR_X + 1.2} y={yy} className="svg-mono" fontSize={1.5} fill="#4A5650" dominantBaseline="central">
          ·{m.id.split('·')[1]} {fmtMetres(m.distance)}
        </text>
      ))}
      {nearShown.map((n) => (
        <g key={n.distance}>
          <text x={NEAR_RIGHT - 1.4} y={y(n.crawl)} className="svg-mono" dominantBaseline="central" textAnchor="end">
            <tspan fontSize={2} fontWeight={600} fill="#9A3412">{fmtMetres(n.distance)}</tspan>
            <tspan fontSize={1.4} fill="#4A5650" dx={0.6}>{n.exact ? '' : '≈'}{n.ref}</tspan>
          </text>
          <path d={`M ${NEAR_RIGHT - 1} ${y(n.crawl) - 0.7} l 1.2 0.7 l -1.2 0.7 z`} fill="#9A3412" />
        </g>
      ))}
      {marks.some((m) => !m.long) && (
        <text x={CARD.w / 2} y={CARD.h - 2.4} className="svg-mono" fontSize={1.4} fill="#4A5650" textAnchor="middle">L2·3 = 3rd short line above L2</text>
      )}
    </svg>
  );
}
