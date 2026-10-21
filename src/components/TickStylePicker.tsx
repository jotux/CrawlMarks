import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { TICK_STYLES, TickStyle } from '../model/tickStyles';
import type { Hand } from '../state';
import { TickPreview } from './drawings';

/** A dropdown listbox whose options show what each tick style looks like. */
export function TickStylePicker({ value, hand, onChange }: { value: TickStyle; hand: Hand; onChange: (s: TickStyle) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => TICK_STYLES.findIndex((s) => s.id === value));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = TICK_STYLES.find((s) => s.id === value) ?? TICK_STYLES[0];

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const show = () => {
    setActive(TICK_STYLES.findIndex((s) => s.id === value));
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(TICK_STYLES[i].id);
    setOpen(false);
    button.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      show();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const last = TICK_STYLES.length - 1;
    if (e.key === 'ArrowDown') setActive((i) => Math.min(last, i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') {
      setOpen(false);
      button.current?.focus();
    } else if (e.key === 'Tab') setOpen(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  };

  return (
    <div className="picker" ref={root}>
      <button
        ref={button}
        className="picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
      >
        <TickPreview style={current.id} hand={hand} />
        <span id={`${id}-value`} className="picker-name">{current.name}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="picker-chevron"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <span id={`${id}-label`} className="sr-only">Tick style</span>
      {open && (
        <ul
          ref={list}
          className="picker-list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
        >
          {TICK_STYLES.map((s, i) => (
            <li
              key={s.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={s.id === value}
              className={`picker-option${i === active ? ' active' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <TickPreview style={s.id} hand={hand} />
              <span className="picker-text">
                <span className="picker-name">{s.name}</span>
                <span className="picker-desc">{s.description}</span>
              </span>
              {s.id === value && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="picker-check"><path d="M5 12l5 5 9-10" /></svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
