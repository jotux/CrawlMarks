import qrcode from 'qrcode-generator';
import { Dispatch, FormEvent, ReactNode, SetStateAction, createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { fitCrawl } from '../model/fit';
import {
  CURRENT_KEY, CurrentSetup, LIBRARY_KEY, SavedSetup, SharedSetup, encodeSetup, hasUnsavedWork, loadCurrent, loadLibrary,
  newId, savedWhen, shareUrl, suggestedName, summary, uniqueName,
} from '../setups';
import { AppState, defaultState, validReadings } from '../state';
import { StepId } from '../steps';

/** Feedback (the form opens with CrawlMarks picked) and donations: in the menu, and at the foot of the sidebar on desktop. */
export const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeb-l9rLaZKnhJ7bXVsEKB-LSi4JHMoBKxBJUnZGYwJsY_JsQ/viewform?usp=pp_url&entry.88605366=CrawlMarks';
export const KOFI_URL = 'https://ko-fi.com/F3I529J4CF';

export interface SetupsApi {
  state: AppState;
  current: CurrentSetup;
  library: SavedSetup[];
  /** work that opening something else would lose */
  unsaved: boolean;
  /** Saves over the setup the work came from; false when it has none and needs a name. */
  save(): boolean;
  /** Saves under name, replacing a saved setup already called that. */
  saveAs(name: string): void;
  open(id: string): void;
  remove(id: string): void;
  startNew(): void;
  /** Loads a setup from a share link, saving it too if asked. */
  load(shared: SharedSetup, save: boolean): void;
  notify(message: string): void;
}

const SetupsContext = createContext<SetupsApi | null>(null);
export const SetupsProvider = SetupsContext.Provider;

/** Saved setups and which one is open, kept in localStorage beside the current work. */
export function useSetupLibrary(state: AppState, setState: Dispatch<SetStateAction<AppState>>, notify: (m: string) => void): SetupsApi {
  const [library, setLibrary] = useState(loadLibrary);
  const [current, setCurrent] = useState(loadCurrent);
  useEffect(() => {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)); } catch { /* storage unavailable */ }
  }, [library]);
  useEffect(() => {
    try { localStorage.setItem(CURRENT_KEY, JSON.stringify(current)); } catch { /* storage unavailable */ }
  }, [current]);

  const store = (id: string, name: string, s: AppState = state) => {
    setLibrary((lib) => [{ id, name, savedAt: Date.now(), state: s }, ...lib.filter((x) => x.id !== id)]);
    setCurrent({ id, name });
  };

  return {
    state,
    current,
    library,
    unsaved: hasUnsavedWork(state, current, library),
    save() {
      const saved = library.find((s) => s.id === current.id);
      if (!saved) return false;
      store(saved.id, saved.name);
      notify(`Saved “${saved.name}”`);
      return true;
    },
    saveAs(name) {
      const same = library.find((s) => s.name.toLowerCase() === name.toLowerCase());
      store(same?.id ?? newId(), name);
      notify(`Saved “${name}”`);
    },
    open(id) {
      const saved = library.find((s) => s.id === id);
      if (!saved) return;
      setState(saved.state);
      setCurrent({ id, name: saved.name });
      go(landingStep(saved.state));
    },
    remove(id) {
      setLibrary((lib) => lib.filter((s) => s.id !== id));
      if (current.id === id) setCurrent({ id: null, name: current.name });
    },
    startNew() {
      setState(defaultState);
      setCurrent({ id: null, name: null });
      go('setup');
    },
    load(shared, save) {
      setState(shared.state);
      if (save) {
        const name = uniqueName(shared.name ?? suggestedName(shared.state), library);
        store(newId(), name, shared.state);
        notify(`Saved “${name}”`);
      } else {
        setCurrent({ id: null, name: shared.name });
      }
      go(landingStep(shared.state));
    },
    notify,
  };
}

/** The step to show a setup on: its marker sheet once it has one, else where it needs work. */
export function landingStep(state: AppState): StepId {
  const readings = validReadings(state);
  if (readings.length === 1 || fitCrawl(readings, state.curveModel).ok) return 'sheet';
  return readings.length > 0 ? 'readings' : 'setup';
}

/** Shows a step without leaving a history entry behind (so Back doesn't reopen a share link). */
export function go(step: StepId) {
  history.replaceState(null, '', `#/${step}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/* ---------- dialogs ---------- */

/** A modal dialog: a bottom sheet on phones, centred on wide screens. Escape or a tap outside closes it. */
export function Modal({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d || d.open) return;
    d.showModal();
    // focus the field marked for it, else the dialog itself (not its close button)
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus() ?? d.querySelector<HTMLElement>('.modal-body')?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
    >
      <div className="modal-body" tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => ref.current?.close()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

type Dialog =
  | { kind: 'menu' }
  | { kind: 'saveAs' }
  | { kind: 'open' }
  | { kind: 'share' }
  /** about to replace unsaved work: then runs once the user has chosen */
  | { kind: 'confirm'; title: string; then: () => void };

const displayName = (c: CurrentSetup) => c.name ?? 'Untitled setup';

function status(api: SetupsApi): string {
  const saved = api.library.find((s) => s.id === api.current.id);
  if (saved) return api.unsaved ? 'Edited since saved' : `Saved ${savedWhen(saved.savedAt)}`;
  return api.current.name ? 'Opened from a link · not saved' : 'Not saved yet';
}

/** Three arrows (fletching left, point right) in place of hamburger lines, as in RangePlotter. */
const ArrowsIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="currentColor" aria-hidden="true">
    {[0, 9, 18].map((y) => (
      <g key={y} transform={`translate(0 ${y})`}>
        <line x1="8" y1="5" x2="22" y2="5" stroke="currentColor" strokeWidth="1.8" />
        <polygon points="28,5 21,1.8 22.8,5 21,8.2" />
        <polygon points="0.5,1.5 9,4.2 9,5.8 0.5,8.5 3.2,5" />
      </g>
    ))}
  </svg>
);

/**
 * The open setup's name and its Save, Open and Share actions: an arrows menu in the top
 * bar on a phone, a block in the sidebar on desktop.
 */
export function SetupControl({ variant }: { variant: 'header' | 'sidebar' }) {
  const api = useContext(SetupsContext);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);
  if (!api) return null;

  const close = () => setDialog(null);
  const save = () => {
    if (api.save()) close();
    else setDialog({ kind: 'saveAs' });
  };
  /** Runs action now, or after asking, when it would replace unsaved work. */
  const guard = (title: string, action: () => void) => {
    if (api.unsaved) setDialog({ kind: 'confirm', title, then: action });
    else { close(); action(); }
  };
  const name = displayName(api.current);
  const dot = api.unsaved && <span className="unsaved-dot" title="Not saved" aria-label="(not saved)" />;
  const actions: ({ label: string; run: () => void } | 'divider')[] = [
    { label: 'Save', run: save },
    { label: 'Save as…', run: () => setDialog({ kind: 'saveAs' }) },
    { label: 'Open…', run: () => setDialog({ kind: 'open' }) },
    { label: 'Share link', run: () => setDialog({ kind: 'share' }) },
    'divider',
    { label: 'New setup', run: () => guard('Start a new setup?', api.startNew) },
    'divider',
    // both in a new tab, so the setup being worked on stays put
    { label: 'Send feedback', run: () => window.open(FEEDBACK_URL, '_blank', 'noopener') },
    { label: 'Buy me an arrow', run: () => window.open(KOFI_URL, '_blank', 'noopener') },
  ];

  return (
    <>
      {variant === 'header' ? (
        <div className="menu-wrap" ref={menuRef}>
          <button
            className="menu-btn"
            aria-label={`Menu: ${name}${api.unsaved ? ', not saved' : ''}`}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <ArrowsIcon />
            {dot}
          </button>
          {menuOpen && (
            <nav id={menuId} className="menu" aria-label="Setup">
              <div className="menu-title">{name}<small>{status(api)}</small></div>
              {actions.map((a, i) => a === 'divider'
                ? <div key={i} className="menu-divider" role="separator" />
                : <button key={a.label} type="button" onClick={() => { setMenuOpen(false); a.run(); }}>{a.label}</button>)}
            </nav>
          )}
        </div>
      ) : (
        <div className="setup-block">
          <div className="setup-block-label">Setup</div>
          <button className="setup-name" onClick={() => setDialog({ kind: 'menu' })} aria-label={`Setup: ${name}. More actions`}>
            <span className="setup-name-text">{name}</span>
            {dot}
          </button>
          <div className="setup-block-actions">
            <button className="btn-text" onClick={save}>Save</button>
            <button className="btn-text" onClick={() => setDialog({ kind: 'open' })}>Open</button>
            <button className="btn-text" onClick={() => setDialog({ kind: 'share' })}>Share</button>
          </div>
        </div>
      )}

      {dialog?.kind === 'menu' && (
        <Modal title={name} onClose={close}>
          <p className="modal-note">{status(api)}</p>
          <div className="menu-actions">
            {actions.map((a, i) => a === 'divider' ? <div key={i} className="menu-divider" role="separator" /> : <button key={a.label} className="btn-outline" onClick={a.run}>{a.label}</button>)}
          </div>
        </Modal>
      )}
      {dialog?.kind === 'saveAs' && <SaveAsDialog api={api} onDone={close} />}
      {dialog?.kind === 'open' && <OpenDialog api={api} onClose={close} onOpen={(s) => guard(`Open “${s.name}”?`, () => api.open(s.id))} />}
      {dialog?.kind === 'share' && <ShareDialog api={api} onClose={close} />}
      {dialog?.kind === 'confirm' && <ConfirmReplace api={api} title={dialog.title} onClose={close} then={dialog.then} />}
    </>
  );
}

function SaveAsDialog({ api, onDone }: { api: SetupsApi; onDone: () => void }) {
  const [name, setName] = useState(api.current.name ?? suggestedName(api.state));
  const trimmedName = name.trim().slice(0, 60);
  const replaces = api.library.find((s) => s.name.toLowerCase() === trimmedName.toLowerCase() && s.id !== api.current.id);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmedName) return;
    api.saveAs(trimmedName);
    onDone();
  };
  return (
    <Modal title="Save setup as" onClose={onDone}>
      <form className="modal-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Name</span>
          <span className="field-box">
            <input data-autofocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
          </span>
        </label>
        {replaces && <p className="modal-note warn">This replaces the saved setup called “{replaces.name}”.</p>}
        <button className="cta" type="submit" disabled={!trimmedName}>{replaces ? 'Replace' : 'Save'}</button>
      </form>
    </Modal>
  );
}

function OpenDialog({ api, onClose, onOpen }: { api: SetupsApi; onClose: () => void; onOpen: (s: SavedSetup) => void }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const list = [...api.library].sort((a, b) => b.savedAt - a.savedAt);
  return (
    <Modal title="Open a setup" onClose={onClose}>
      {list.length === 0 ? (
        <p className="modal-note">No saved setups yet. Use Save to keep this one.</p>
      ) : (
        <ul className="setup-list">
          {list.map((s) => (
            <li key={s.id}>
              {deleting === s.id ? (
                <div className="setup-row confirm">
                  <span>Delete “{s.name}”?</span>
                  <button className="btn-text danger" onClick={() => { api.remove(s.id); setDeleting(null); }}>Delete</button>
                  <button className="btn-text" onClick={() => setDeleting(null)}>Keep</button>
                </div>
              ) : (
                <div className="setup-row">
                  <button className="setup-open" onClick={() => onOpen(s)} aria-current={s.id === api.current.id || undefined}>
                    <span className="setup-open-name">{s.name}{s.id === api.current.id && <span className="setup-badge">open now</span>}</span>
                    <span className="setup-open-meta">{summary(s.state)} · {savedWhen(s.savedAt)}</span>
                  </button>
                  <button className="icon-btn" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** Asks before replacing unsaved work: save it first (when it has a home), drop it, or stay. */
function ConfirmReplace({ api, title, onClose, then }: { api: SetupsApi; title: string; onClose: () => void; then: () => void }) {
  const saved = api.library.find((s) => s.id === api.current.id);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal-note">
        {saved ? `“${saved.name}” has changes that aren’t saved.` : 'Your current work isn’t saved. Opening another setup replaces it.'}
      </p>
      <div className="menu-actions">
        {saved && <button className="cta" onClick={() => { api.save(); onClose(); then(); }}>Save and continue</button>}
        <button className="btn-outline" onClick={() => { onClose(); then(); }}>{saved ? 'Continue without saving' : 'Continue anyway'}</button>
        <button className="btn-text center" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/** QR code for text, drawn as one SVG path on a light square so phones can scan it in dark mode too. */
export function QrCode({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { size: n, path: d };
  }, [text]);
  return (
    <svg className="qr" viewBox={`-4 -4 ${size + 8} ${size + 8}`} role="img" aria-label="QR code of the share link" shapeRendering="crispEdges">
      <rect x="-4" y="-4" width={size + 8} height={size + 8} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

function ShareDialog({ api, onClose }: { api: SetupsApi; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const name = api.current.name;
  useEffect(() => {
    let live = true;
    encodeSetup({ name, state: api.state }).then((code) => live && setUrl(shareUrl(code)));
    return () => { live = false; };
  }, [api.state, name]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      api.notify('Link copied');
    } catch {
      api.notify('Couldn’t copy. Select the link and copy it.');
    }
  };
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <Modal title="Share link" onClose={onClose}>
      <p className="modal-note">
        Open this link on another phone or computer to load {name ? `“${name}”` : 'this setup'}: your tab, distances, readings and marks.
        Scan the code with a phone’s camera, or copy the link.
      </p>
      {url ? (
        <>
          <QrCode text={url} />
          <label className="field-box compact share-url">
            <span className="sr-only">Share link</span>
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </label>
          <div className="menu-actions">
            {canShare && (
              <button className="cta" onClick={() => navigator.share({ title: `CrawlMarks${name ? ` · ${name}` : ''}`, url }).catch(() => {})}>
                Share…
              </button>
            )}
            <button className={canShare ? 'btn-outline' : 'cta'} onClick={copy}>Copy link</button>
          </div>
          <p className="modal-note small">The setup is stored in the link itself, not on a server. Anyone with the link can open a copy.</p>
        </>
      ) : (
        <p className="modal-note">Making link…</p>
      )}
    </Modal>
  );
}

/** Shown when the app is opened from a share link. */
export function ImportDialog({ shared, api, onClose }: { shared: SharedSetup | 'broken'; api: SetupsApi; onClose: () => void }) {
  if (shared === 'broken') {
    return (
      <Modal title="Can’t open this link" onClose={onClose}>
        <p className="modal-note">The link is incomplete or damaged. Ask for it again, or copy all of it.</p>
        <div className="menu-actions"><button className="cta" onClick={onClose}>OK</button></div>
      </Modal>
    );
  }
  const take = (save: boolean) => { api.load(shared, save); onClose(); };
  return (
    <Modal title="Open shared setup?" onClose={onClose}>
      <p className="modal-note">
        <strong>{shared.name ?? 'Untitled setup'}</strong><br />
        {summary(shared.state)}
      </p>
      {api.unsaved && <p className="modal-note warn">This replaces what you’re working on, which isn’t saved.</p>}
      <div className="menu-actions">
        <button className="cta" onClick={() => take(false)}>Open</button>
        <button className="btn-outline" onClick={() => take(true)}>Open and save</button>
        <button className="btn-text center" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

/** A short message at the bottom of the screen. */
export function Toast({ message }: { message: string | null }) {
  return <div className={`toast${message ? ' show' : ''}`} role="status" aria-live="polite">{message}</div>;
}
