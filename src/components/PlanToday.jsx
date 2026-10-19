import { useState } from 'react';
import { useStore } from '../store.jsx';
import { activeSlots, getSlot, slotLabel } from '../lib/dayplan.js';
import { addDays, iso } from '../lib/dates.js';
import { TodayRow, SlotPicker } from './MenuParts.jsx';

export function PlanToday({ go }) {
  const { state, update } = useStore();
  const [picker, setPicker] = useState(null);
  const today = iso();
  const tomorrow = addDays(today, 1);
  const slots = activeSlots(state);
  const toThaw = slots
    .map((s) => ({ id: s.id, slot: getSlot(state, tomorrow, s.id) }))
    .filter((x) => x.slot?.kind === 'tupper' && !x.slot.done);
  const pendingThaw = toThaw.filter((x) => !x.slot.thawed);
  const evening = new Date().getHours() >= (Number(state.settings.thawHour) || 19);

  return (
    <section className="card" aria-label="Hoy he comido" style={{ paddingBottom: 8 }}>
      <div className="row between">
        <h2>Hoy he comido</h2>
        <button className="btn sm ghost" onClick={() => go('menu')}>Calendario →</button>
      </div>
      <div className="list">
        {slots.map((s) => (
          <TodayRow key={s.id} slotId={s.id} onPick={() => setPicker({ date: today, slotId: s.id })} />
        ))}
      </div>
      {toThaw.length > 0 && (evening || pendingThaw.length < toThaw.length) && (
        <div className="notice" style={{ marginTop: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>🧊</span>
          <div className="grow small">
            <b>Para mañana, pasa a la nevera:</b>
            {toThaw.map((x) => {
              const lbl = slotLabel(state, x.slot);
              return (
                <label key={x.id} className={`check${x.slot.thawed ? ' done' : ''}`} style={{ padding: '6px 0', borderBottom: 'none' }}>
                  <input type="checkbox" checked={!!x.slot.thawed} onChange={(e) => update((s) => { s.plan[tomorrow][x.id].thawed = e.target.checked; })} />
                  <span>{lbl.emoji} {lbl.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      <SlotPicker target={picker} mode="log" onClose={() => setPicker(null)} />
    </section>
  );
}
