import type { ReactNode } from 'react';
import { STEPS, StepId } from '../steps';
// bump package.json "version" with each fix or feature; only this field is bundled
import { version } from '../../package.json';

// phones and tablets are driven by a finger; desktops (touchscreen laptops included) by a mouse or trackpad.
// ?device=mobile or ?device=desktop overrides it, for previewing both side by side (preview.html)
const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('device') : null;
const platform = forced === 'mobile' ? 'Mobile' : forced === 'desktop' ? 'Desktop'
  : typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'Mobile' : 'Desktop';

function Wordmark() {
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  return (
    <div className="wordmark" role="img" aria-label="CrawlMarks">
      <div className="wordmark-text">C<small>rawl</small><span>M<small>arks</small></span></div>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="100" height="1.4" />
        {ticks.map((x) => (
          <rect key={x} x={Math.min(x, 98.8)} y="0" width="1.2" height={x % 25 === 0 ? 6 : 3.4} />
        ))}
      </svg>
    </div>
  );
}

const stepName = (label: string) => label[0].toUpperCase() + label.slice(1);

/** Desktop only: the logo and every step, any of which can be opened. */
function Sidebar({ step }: { step: number }) {
  return (
    <aside className="sidebar">
      <Wordmark />
      <nav aria-label="Steps">
        <ol className="step-nav">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#/${s.id}`} aria-current={i === step ? 'step' : undefined} className={i < step ? 'done' : undefined}>
                <span className="step-num" aria-hidden="true">
                  {i < step
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5 9-10" /></svg>
                    : i + 1}
                </span>
                {stepName(s.label)}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}

interface ScreenProps {
  step: number;
  title: string;
  intro: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Controls shown beside the content on desktop; on mobile, after it (or before it with asideFirst). */
  aside?: ReactNode;
  asideFirst?: boolean;
  /** step Back goes to, when it isn't the one before (a skipped step) */
  back?: StepId;
}

export function Screen({ step, title, intro, children, footer, aside, asideFirst, back }: ScreenProps) {
  const prev = back ? STEPS.find((s) => s.id === back) : STEPS[step - 1];
  const desktop = platform === 'Desktop';
  // desktop keeps Back/Next in the side panel, so every step gets one; narrow windows fall back to the footer
  const side = desktop || aside;
  return (
    <div className={`screen no-print${desktop ? ' desktop' : ''}`}>
      {desktop && <Sidebar step={step} />}
      <div className="screen-body">
        <header className="topbar">
          <span />
          <Wordmark />
          <div className="step-count">STEP {step + 1} / {STEPS.length}</div>
        </header>
        <div className="progress" aria-hidden="true">
          <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <main className={`main${side ? ' has-aside' : ''}`}>
          <div className="main-head">
            <h1>{title}</h1>
            <p className="intro">{intro}</p>
          </div>
          <div className="main-content">{children}</div>
          {side && (
            <div className={`main-aside${asideFirst ? ' first' : ''}`}>
              {aside}
              {desktop && (
                <div className="aside-actions">
                  {footer}
                  {prev && (
                    <a className="btn-text aside-back" href={`#/${prev.id}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                      Back to {prev.label}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
        <footer className="footer">
          {prev && (
            <a className="cta cta-back" href={`#/${prev.id}`} aria-label={`Back to ${prev.label}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              Back
            </a>
          )}
          {footer && <div className="footer-main">{footer}</div>}
        </footer>
      </div>
      <div className="version">{platform}-v{version}</div>
    </div>
  );
}

export function NextLink({ to, children, blocked }: { to: string; children: ReactNode; blocked?: string | null }) {
  if (blocked) {
    return (
      <>
        <p className="blocked">{blocked}</p>
        <button className="cta" disabled>{children}</button>
      </>
    );
  }
  return <a className="cta" href={`#/${to}`}>{children}</a>;
}

export function Tip({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`tip tip-${tone}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.5" /></svg>
      <span>{children}</span>
    </div>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="btn-outline" onClick={() => window.print()}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z" /></svg>
      {label}
    </button>
  );
}
