import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImportDialog, SetupsProvider, Toast, useSetupLibrary } from './components/Setups';
import { fitCrawl } from './model/fit';
import { Fit } from './screens/Fit';
import { Readings } from './screens/Readings';
import { Setup } from './screens/Setup';
import { Sheet } from './screens/Sheet';
import { Strip } from './screens/Strip';
import { SharedSetup, decodeSetup, shareCodeIn } from './setups';
import { AppState, useAppState, validReadings } from './state';
import { STEPS, StepId } from './steps';

function readStep(): StepId {
  const id = location.hash.replace(/^#\/?/, '');
  return STEPS.find((s) => s.id === id)?.id ?? 'setup';
}

/** Steps live in the URL hash so the browser's back button walks the flow. */
function useStep() {
  const [step, setStep] = useState(readStep);
  useEffect(() => {
    const onChange = () => {
      setStep(readStep());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return step;
}

/** A message that clears itself after a couple of seconds. */
function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number>();
  const notify = useCallback((m: string) => {
    setMessage(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2400);
  }, []);
  return [message, notify] as const;
}

/**
 * A setup arriving in a share link (#/open?s=…), or 'broken' if the link can't be read.
 * The link is dropped from the address bar at once, so a reload doesn't offer it again.
 */
function useIncomingSetup() {
  const [incoming, setIncoming] = useState<SharedSetup | 'broken' | null>(null);
  useEffect(() => {
    const check = () => {
      const code = shareCodeIn(location.hash);
      if (!code) return;
      history.replaceState(null, '', '#/setup');
      decodeSetup(code).then((shared) => setIncoming(shared ?? 'broken'));
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);
  return [incoming, () => setIncoming(null)] as const;
}

function StepScreen({ step, state, setState }: { step: StepId; state: AppState; setState: Dispatch<SetStateAction<AppState>> }) {
  const readings = useMemo(() => validReadings(state), [state]);
  const result = useMemo(() => fitCrawl(readings, state.curveModel), [readings, state.curveModel]);

  switch (step) {
    case 'setup': return <Setup state={state} setState={setState} />;
    case 'strip': return <Strip state={state} />;
    case 'readings': return <Readings state={state} setState={setState} />;
    case 'fit': return <Fit state={state} setState={setState} result={result} readings={readings} />;
    case 'sheet': return <Sheet state={state} setState={setState} result={result} readings={readings} />;
  }
}

export default function App() {
  const [state, setState] = useAppState();
  const step = useStep();
  const [message, notify] = useToast();
  const setups = useSetupLibrary(state, setState, notify);
  const [incoming, clearIncoming] = useIncomingSetup();

  return (
    <SetupsProvider value={setups}>
      <StepScreen step={step} state={state} setState={setState} />
      {incoming && <ImportDialog shared={incoming} api={setups} onClose={clearIncoming} />}
      <Toast message={message} />
    </SetupsProvider>
  );
}
