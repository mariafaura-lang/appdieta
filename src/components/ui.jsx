import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export function Sheet({ open, onClose, title, children, actions }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2 className="grow">{title}</h2>
          {actions}
          <button className="icon-btn" aria-label="Cerrar" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Meter({ label, value, max, unit = '', kind, right, thin }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = kind !== 'protein' && value > max * 1.02;
  return (
    <div className={`meter${thin ? ' thin' : ''}`}>
      <div className="meter-top">
        <span className="small bold">{label}</span>
        <span className="small num muted">
          {right ?? (
            <>
              <b style={{ color: 'var(--text)' }}>{Math.round(value)}</b> / {Math.round(max)} {unit}
            </>
          )}
        </span>
      </div>
      <div className="meter-track" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)} aria-label={label}>
        <div className={`meter-fill ${kind || ''} ${over ? 'over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, step = 1, label }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <output>{value}</output>
      <button type="button" aria-label="Más" onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stars({ value = 0, onChange, small }) {
  return (
    <span className={`stars${small ? ' small' : ''}`} aria-label={`Valoración ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} className={n <= value ? 'on' : ''} aria-label={`${n} estrellas`} onClick={() => onChange(n === value ? 0 : n)}>★</button>
        ) : (
          <button key={n} tabIndex={-1} className={n <= value ? 'on' : ''} disabled>★</button>
        ),
      )}
    </span>
  );
}

export function MacroRow({ m, unitKcal = 'kcal' }) {
  return (
    <div className="macro-row">
      <div><b>{Math.round(m.kcal)}</b><span>{unitKcal}</span></div>
      <div className="pro"><b>{Math.round(m.p)} g</b><span>proteína</span></div>
      <div><b>{Math.round(m.c)} g</b><span>hidratos</span></div>
      <div><b>{Math.round(m.f)} g</b><span>grasa</span></div>
    </div>
  );
}

/** Input numérico que permite vaciar el campo mientras se escribe. */
export function NumInput({ value, onChange, step = 'any', min = 0, ...rest }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={value === null || value === undefined ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
      {...rest}
    />
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Empty({ icon, children }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      {children}
    </div>
  );
}

// ---- Toast con "Deshacer" ----
const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((text, undo) => {
    clearTimeout(timer.current);
    setToast({ text, undo, k: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.k}>
          <span className="grow small">{toast.text}</span>
          {toast.undo && (
            <button onClick={() => { toast.undo(); setToast(null); }}>Deshacer</button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('es-ES');
export const fmtEur = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
export const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
