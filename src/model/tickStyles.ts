import type { Hand } from '../state';

/** How long and short lines are laid out across the tab face. */
export type TickStyle = 'big-little' | 'left' | 'right' | 'string-side' | 'split' | 'alternating' | 'opposed' | 'staircase' | 'dot-dash';

export interface TickStyleInfo {
  id: TickStyle;
  name: string;
  description: string;
}

export const TICK_STYLES: TickStyleInfo[] = [
  { id: 'big-little', name: 'Big-little', description: 'Both centred, short lines narrower' },
  { id: 'left', name: 'Left-justified', description: 'Lines start from the left edge' },
  { id: 'right', name: 'Right-justified', description: 'Lines start from the right edge' },
  { id: 'string-side', name: 'String side', description: 'Lines start from the edge you read, as on the strip; flips for left hand' },
  { id: 'split', name: 'Split', description: 'Short lines are stubs at both edges' },
  { id: 'alternating', name: 'Alternating', description: 'Short lines swap sides, easy to count' },
  { id: 'opposed', name: 'Opposed', description: 'Long lines left, short lines right' },
  { id: 'staircase', name: 'Staircase', description: 'Short lines step across, so where one sits says which it is' },
  { id: 'dot-dash', name: 'Dot-dash', description: 'Long lines with tiny dashes between' },
];

export const DEFAULT_TICK_STYLE: TickStyle = 'big-little';

/** [from, to] as fractions of the tab width */
export type Segment = [number, number];

/** What some styles need beyond the line itself. */
export interface TickContext {
  /** short lines between each pair of long lines (Staircase spreads them across the tab) */
  count: number;
  /** shooting hand (String side starts from the edge the strip reads from) */
  hand: Hand;
}

const DEFAULT_CONTEXT: TickContext = { count: 4, hand: 'right' };

/** Staircase: short line length, and the span its steps cover. */
const STAIR = { length: 0.2, from: 0.1, to: 0.9 };

/**
 * The segments one line is drawn with. `minor` is 0 for a long line and 1, 2, …
 * for the short lines above it. Every style keeps the World Archery rule of two
 * line shapes, both the same thickness.
 */
export function tickSegments(style: TickStyle, long: boolean, minor: number, ctx: TickContext = DEFAULT_CONTEXT): Segment[] {
  switch (style) {
    case 'big-little':
      return [long ? [0.14, 0.86] : [0.34, 0.66]];
    case 'left':
      return [long ? [0.1, 0.8] : [0.1, 0.45]];
    case 'right':
      return [long ? [0.2, 0.9] : [0.55, 0.9]];
    case 'string-side':
      // the strip's ticks run down the left edge for a right hand, the right edge for a left
      return tickSegments(ctx.hand === 'right' ? 'left' : 'right', long, minor);
    case 'split':
      return long ? [[0.1, 0.9]] : [[0.1, 0.3], [0.7, 0.9]];
    case 'alternating':
      if (long) return [[0.14, 0.86]];
      return [minor % 2 === 1 ? [0.1, 0.45] : [0.55, 0.9]];
    case 'opposed':
      return [long ? [0.1, 0.7] : [0.55, 0.9]];
    case 'staircase': {
      if (long) return [[STAIR.from, STAIR.to]];
      if (ctx.count <= 1) return [[0.5 - STAIR.length / 2, 0.5 + STAIR.length / 2]];
      // first short line above a long one at the left, each next one a step to the right
      const step = (STAIR.to - STAIR.from - STAIR.length) / (ctx.count - 1);
      const a = STAIR.from + (Math.min(minor, ctx.count) - 1) * step;
      return [[a, a + STAIR.length]];
    }
    case 'dot-dash':
      return [long ? [0.14, 0.86] : [0.45, 0.55]];
  }
}

export const isTickStyle = (v: unknown): v is TickStyle => TICK_STYLES.some((s) => s.id === v);
