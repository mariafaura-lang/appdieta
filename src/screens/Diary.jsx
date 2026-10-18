import { useState } from 'react';
import { useStore, removeLogEntry } from '../store.jsx';
import { entriesOn, dayTarget, dayGoals, weekSummary } from '../lib/targets.js';
import { sumMacros } from '../lib/nutrition.js';
import { SLOTS } from '../lib/dayplan.js';
import { addDays, iso, DOW_LONG, dayOfWeek, fmtShort } from '../lib/dates.js';
import { WeekCard } from '../components/Summary.jsx';
import { useToast, fmt } from '../components/ui.jsx';

const MEAL_ORDER = ['desayuno', 'comida', 'cena', 'postre'];

/** Diario: qué se ha comido cada día, con totales frente al objetivo. */
export default function Diary({ go }) {
  const { state, update } = useStore();
  const toast = useToast();
  const today = iso();
  const [weeks, setWeeks] = useState(1);
  const [open, setOpen] = useState(today);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(today, -i));
  const last7 = weekSummary(state, today);

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
    <div className="stack">
      <WeekCard today={today} />
      {last7.loggedCount === 0 && (
        <p className="small muted">Aquí verás día a día lo que has comido. Se llena solo al confirmar el menú o registrar con el botón ＋.</p>
      )}

      {days.map((date) => {
        const entries = entriesOn(state, date).sort((a, b) => a.time - b.time);
        const tot = sumMacros(entries);
        const target = dayTarget(state, date);
        const goals = dayGoals(state, date);
        const isOpen = open === date;
        const label = date === today ? 'Hoy' : date === addDays(today, -1) ? 'Ayer' : DOW_LONG[dayOfWeek(date)];
        const groups = MEAL_ORDER.map((m) => [m, entries.filter((e) => e.meal === m)]).filter(([, l]) => l.length);
        const others = entries.filter((e) => !MEAL_ORDER.includes(e.meal));
        const diff = tot.kcal - target;
        return (
          <section key={date} className="card" style={{ paddingTop: 12, paddingBottom: 12 }}>
            <button className="row between" style={{ background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left' }}
              onClick={() => setOpen(isOpen ? null : date)} aria-expanded={isOpen}>
              <span>
                <b style={{ textTransform: 'capitalize' }}>{label}</b> <span className="small muted">{fmtShort(date)}</span>
                <div className="tiny muted num">
                  {entries.length ? `${entries.length} registros · ${Math.round(tot.p)} / ${goals.protein} g prot` : 'sin registros'}
                </div>
              </span>
              <span className="num" style={{ textAlign: 'right' }}>
                <b>{entries.length ? fmt(tot.kcal) : '—'}</b> <span className="small muted">/ {fmt(target)}</span>
                {entries.length > 0 && date < today && (
                  <div className="tiny" style={{ color: Math.abs(diff) < 100 ? 'var(--accent)' : diff > 0 ? 'var(--warn)' : 'var(--text-2)' }}>
                    {Math.abs(diff) < 100 ? 'en objetivo' : diff > 0 ? `+${fmt(diff)}` : `−${fmt(-diff)}`}
                  </div>
                )}
              </span>
            </button>
            {isOpen && (
              <div style={{ marginTop: 8 }}>
                {entries.length === 0 ? (
                  <p className="small muted">Nada apuntado este día.{date === today || date === addDays(today, -1) ? ' Puedes añadirlo con ＋ (elige «Ayer» si hace falta).' : ''}</p>
                ) : (
                  <>
                    {[...groups, ...(others.length ? [['otros', others]] : [])].map(([m, list]) => {
                      const meta = SLOTS.find((x) => x.id === m);
                      return (
                        <div key={m} style={{ marginTop: 6 }}>
                          <div className="tiny bold muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {meta ? `${meta.emoji} ${meta.label}` : 'Otros y extras'}
                          </div>
                          <div className="list">
                            {list.map((e) => (
                              <div key={e.id} className="list-item" style={{ padding: '8px 0' }}>
                                <span className="emoji" style={{ width: 34, height: 34, fontSize: '1.2rem' }}>{e.emoji || '•'}</span>
                                <span className="grow" style={{ minWidth: 0 }}>
                                  <div className="small bold ellipsis">{e.name}</div>
                                  <div className="tiny muted num">{fmt(e.kcal)} kcal · {Math.round(e.p)} g prot{e.kind === 'fuera' ? ' · estimado' : ''}</div>
                                </span>
                                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Borrar ${e.name}`} onClick={() => remove(e)}>🗑</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="tiny muted num" style={{ marginTop: 6 }}>
                      Hidratos {Math.round(tot.c)} g · Grasa {Math.round(tot.f)} g
                    </p>
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}
      <button className="btn block" onClick={() => setWeeks((w) => w + 1)}>Ver una semana más</button>
      <button className="btn ghost block small" onClick={() => go('menu')}>Ir al calendario →</button>
    </div>
  );
}
