import { useStore, removeLogEntry } from '../store.jsx';
import { entriesOn } from '../lib/targets.js';
import { iso, parse, DOW_LONG, dayOfWeek, fmtShort } from '../lib/dates.js';
import { WeekCard, DayCard } from '../components/Summary.jsx';
import { QuickLogPanel } from '../components/QuickLog.jsx';
import { Nudges } from '../components/Nudges.jsx';
import { PlanToday } from '../components/PlanToday.jsx';
import { useToast, fmt } from '../components/ui.jsx';

export default function Today({ go }) {
  const { state, update } = useStore();
  const toast = useToast();
  const today = iso();
  const entries = entriesOn(state, today).sort((a, b) => a.time - b.time);

  const remove = (e) => {
    const copy = { ...e };
    update((s) => removeLogEntry(s, e.id));
    toast(e.kind === 'tupper' ? 'Borrado; el táper vuelve al congelador' : 'Registro borrado', () =>
      update((s) => {
        s.log.push(copy);
        if (copy.kind === 'tupper') {
          const p = s.batches.find((b) => b.id === copy.batchId)?.portions.find((x) => x.id === copy.portionId);
          if (p) p.eatenAt = copy.date;
        }
      }),
    );
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1 style={{ textTransform: 'capitalize' }}>{DOW_LONG[dayOfWeek(today)]}</h1>
          <div className="sub">{fmtShort(today)} · {parse(today).getFullYear()}</div>
        </div>
        <button className="icon-btn" aria-label="Perfil y ajustes" onClick={() => go('perfil')}>⚙️</button>
      </header>
      <div className="stack">
        <Nudges go={go} />
        <WeekCard today={today} />
        <DayCard date={today} />
        <PlanToday go={go} />
      </div>

      <div className="section-title"><h2>Registro rápido</h2><span className="small muted">lo que no estaba en el menú</span></div>
      <QuickLogPanel compact />

      <div className="section-title">
        <h2>Lo de hoy</h2>
        <span className="small muted num">{entries.length ? `${fmt(entries.reduce((s, e) => s + e.kcal, 0))} kcal` : ''}</span>
      </div>
      <div className="card flat" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {entries.length === 0 ? (
          <p className="small muted" style={{ padding: '12px 0' }}>Nada todavía. Un toque arriba y listo.</p>
        ) : (
          <div className="list">
            {entries.map((e) => (
              <div key={e.id} className="list-item">
                <span className="emoji">{e.emoji || '•'}</span>
                <span className="grow">
                  <div className="bold small ellipsis">{e.name}</div>
                  <div className="tiny muted num">{fmt(e.kcal)} kcal · {Math.round(e.p)} g prot{e.kind === 'fuera' ? ' · estimado' : ''}</div>
                </span>
                <button className="icon-btn" aria-label={`Borrar ${e.name}`} onClick={() => remove(e)}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
