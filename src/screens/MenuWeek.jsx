import { useState } from 'react';
import { useStore } from '../store.jsx';
import { activeSlots, autofill, isTrainDay, needsByMeal, slotMacros, SLOTS } from '../lib/dayplan.js';
import { dayTarget } from '../lib/targets.js';
import { addDays, iso, DOW_SHORT, DOW_LONG, dayOfWeek, fmtShort } from '../lib/dates.js';
import { SlotRow, SlotPicker } from '../components/MenuParts.jsx';
import { useToast, fmt } from '../components/ui.jsx';

const NEED_LABEL = {
  'desayuno-tren': ['desayuno de tren', 'desayunos de tren'],
  comida: ['comida', 'comidas'],
  cena: ['cena', 'cenas'],
  postre: ['postre', 'postres'],
};

export default function MenuWeek({ setSub }) {
  const { state, update } = useStore();
  const toast = useToast();
  const today = iso();
  const [days, setDays] = useState(7);
  const [picker, setPicker] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(!(state.settings.trainDays || []).length);
  const s = state.settings;
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i));
  const { need } = needsByMeal(state, today, days);
  const missing = Object.entries(need).filter(([, n]) => n > 0);

  const fill = () => {
    update((x) => autofill(x, today, days));
    toast('✨ Menú rellenado con lo que hay en el congelador');
  };

  const clear = () => {
    const prev = structuredClone(state.plan);
    update((x) => {
      for (const d of dates) {
        const day = x.plan[d];
        if (!day) continue;
        for (const k of Object.keys(day)) if (!day[k]?.done) delete day[k];
      }
    });
    toast('Menú vaciado (lo ya comido se mantiene)', () => update((x) => { x.plan = prev; }));
  };

  return (
    <div className="stack">
      <section className="card stack">
        <button className="row between" style={{ background: 'none', border: 'none', padding: 0, width: '100%' }} onClick={() => setSettingsOpen((o) => !o)} aria-expanded={settingsOpen}>
          <h2>Mis comidas</h2>
          <span className="small muted">
            {activeSlots(state).map((x) => x.emoji).join(' ')} · 🚆 {(s.trainDays || []).map((d) => DOW_SHORT[d]).join(' ') || 'sin tren'} {settingsOpen ? '▲' : '▼'}
          </span>
        </button>
        {settingsOpen && (
          <>
            <div className="field">
              <span>Qué planifico</span>
              <div className="chips wrap">
                {SLOTS.map((x) => {
                  const on = s.meals?.[x.id] !== false;
                  return (
                    <button key={x.id} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => update((st) => { st.settings.meals[x.id] = !on; })}>{x.emoji} {x.label}</button>
                  );
                })}
              </div>
            </div>
            <div className="field">
              <span>Días que desayuno en el tren (táper que se come frío)</span>
              <div className="grid4" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {DOW_SHORT.map((d, i) => {
                  const on = (s.trainDays || []).includes(i);
                  return (
                    <button key={d} className={`chip${on ? ' on' : ''}`} style={{ padding: 0 }} aria-pressed={on} aria-label={`Tren el ${DOW_LONG[i]}`}
                      onClick={() => update((st) => { const t = st.settings.trainDays || []; st.settings.trainDays = on ? t.filter((x) => x !== i) : [...t, i].sort(); })}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <span className="tiny muted" style={{ fontWeight: 400 }}>El resto de días te propongo desayunos salados rápidos de casa.</span>
            </div>
            <label className="toggle">
              <span className="small"><b>Cenas ligeras</b><div className="tiny muted">Prioriza cremas y purés por la noche.</div></span>
              <input type="checkbox" checked={s.lightDinner !== false} onChange={(e) => update((st) => { st.settings.lightDinner = e.target.checked; })} />
            </label>
          </>
        )}
      </section>

      <div className="grid2">
        <button className="btn primary" onClick={fill}>✨ Rellenar {days} días</button>
        <button className="btn" onClick={clear}>Vaciar</button>
      </div>
      <div className="row between">
        <span className="small muted">Días a la vista</span>
        <div style={{ width: 170 }}>
          <div className="seg">
            {[7, 10, 14].map((n) => <button key={n} className={days === n ? 'on' : ''} onClick={() => setDays(n)}>{n}</button>)}
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="card warn">
          <div className="bold small">Para estos {days} días te faltan táperes de:</div>
          <p className="small" style={{ marginTop: 4 }}>{missing.map(([k, n]) => `${n} ${NEED_LABEL[k][n === 1 ? 0 : 1]}`).join(' · ')}</p>
          <button className="btn sm soft" style={{ marginTop: 8 }} onClick={() => setSub('plan')}>Planificar qué cocinar →</button>
        </div>
      )}

      {dates.map((date) => {
        const planned = activeSlots(state).reduce((sum, x) => sum + (slotMacros(state, state.plan?.[date]?.[x.id])?.kcal || 0), 0);
        const target = dayTarget(state, date);
        const label = date === today ? 'Hoy' : date === addDays(today, 1) ? 'Mañana' : DOW_LONG[dayOfWeek(date)];
        return (
          <section key={date} className="card" style={{ paddingTop: 12, paddingBottom: 6 }}>
            <div className="row between">
              <div className="row" style={{ gap: 6 }}>
                <h3 style={{ textTransform: 'capitalize' }}>{label}</h3>
                <span className="small muted">{fmtShort(date)}</span>
                {isTrainDay(state, date) && <span className="badge">🚆 tren</span>}
              </div>
              <span className="small num" style={{ color: planned > target * 1.05 ? 'var(--warn)' : 'var(--text-2)' }}>
                {fmt(planned)} / {fmt(target)}
              </span>
            </div>
            <div className="list">
              {activeSlots(state).map((x) => (
                <SlotRow key={x.id} date={date} slotId={x.id} canConfirm={date <= today} onEdit={() => setPicker({ date, slotId: x.id })} />
              ))}
            </div>
            {planned < target - 150 && planned > 0 && (
              <p className="tiny muted" style={{ paddingBottom: 6 }}>Quedan ~{fmt(target - planned)} kcal libres para extras (fruta, café, pan…).</p>
            )}
          </section>
        );
      })}

      <SlotPicker target={picker} onClose={() => setPicker(null)} />
    </div>
  );
}
