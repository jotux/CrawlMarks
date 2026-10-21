import { useEffect, useState } from 'react';
import { parseNum } from '../state';

interface Props {
  label: string;
  value: number;
  onChange: (n: number) => void;
  unit: string;
  /** shown under the field, which is marked invalid */
  error?: string;
}

/** A numeric input that keeps what was typed while it's mid-edit ("4", "4.", "") and commits valid numbers. */
export function NumberField({ label, value, onChange, unit, error }: Props) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (parseNum(draft) !== value) setDraft(String(value));
    // only resync when the committed value changes from outside
  }, [value]);

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className={`field-box${error ? ' invalid' : ''}`}>
        <input
          inputMode="decimal"
          aria-invalid={!!error}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseNum(e.target.value);
            if (n !== null) onChange(n);
          }}
          onBlur={() => setDraft(String(value))}
        />
        <span className="unit">{unit}</span>
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
