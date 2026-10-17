import type { ReactNode } from 'react';
import { STEPS } from '../steps';
// bump package.json "version" with each fix or feature; only this field is bundled
import { version } from '../../package.json';

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

interface ScreenProps {
  step: number;
  title: string;
  intro: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function Screen({ step, title, intro, children, footer }: ScreenProps) {
  const prev = STEPS[step - 1];
  return (
    <div className="screen no-print">
      <header className="topbar">
        <span />
        <Wordmark />
        <div className="step-count">STEP {step + 1} / {STEPS.length}</div>
      </header>
      <div className="progress" aria-hidden="true">
        <div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <main className="main">
        <div>
          <h1>{title}</h1>
          <p className="intro">{intro}</p>
        </div>
        {children}
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
      <div className="version">Mobile-v{version}</div>
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
