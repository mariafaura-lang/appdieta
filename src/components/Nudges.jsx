import { useStore } from '../store.jsx';
import { computeNudges } from '../lib/nudges.js';
import { iso } from '../lib/dates.js';

export function Nudges({ go }) {
  const { state, update } = useStore();
  const list = computeNudges(state);
  if (!list.length) return null;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {list.slice(0, 3).map((n) => (
        <div key={n.id} className="notice" role="note">
          <span style={{ fontSize: '1.2rem' }}>{n.icon}</span>
          <div className="grow">
            <p>{n.text}</p>
            {n.action && (
              <button className="btn sm soft" style={{ marginTop: 8 }} onClick={() => go(n.action.to)}>{n.action.label}</button>
            )}
          </div>
          <button className="x" aria-label="Descartar aviso" onClick={() => update((s) => { s.dismissed[`${n.id}:${iso()}`] = true; })}>✕</button>
        </div>
      ))}
    </div>
  );
}
