import { useEffect, useMemo, useState } from 'react';
import { fitCrawl } from './model/fit';
import { Fit } from './screens/Fit';
import { Readings } from './screens/Readings';
import { Setup } from './screens/Setup';
import { Sheet } from './screens/Sheet';
import { Strip } from './screens/Strip';
import { useAppState, validReadings } from './state';
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

export default function App() {
  const [state, setState] = useAppState();
  const step = useStep();
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
