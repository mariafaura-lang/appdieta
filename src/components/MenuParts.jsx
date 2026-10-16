import { useState } from 'react';
import { useStore, confirmSlot, removeLogEntry } from '../store.jsx';
import { SLOTS, candidatesFor, quickRecipesFor, reservedCounts, availableIn, slotMacros, slotLabel, isTrainDay, slotKcalTarget } from '../lib/dayplan.js';
import { remaining, uid } from '../lib/inventory.js';
import { allRecipes, mealsOf, recipeInfo } from '../lib/recipes.js';
import { EATING_OUT, SIZE_LABELS } from '../data/extras.js';
import { Sheet, Seg, useToast, fmt } from './ui.jsx';

export function slotMeta(id) {
  return SLOTS.find((s) => s.id === id);
}

/** Una fila de hueco del menú. Toca para cambiar; ✓ para confirmar si es hoy o antes. */
export function SlotRow({ date, slotId, canConfirm, onEdit }) {
  const { state, update } = useStore();
  const toast = useToast();
  const slot = state.plan?.[date]?.[slotId];
  const meta = slotMeta(slotId);
  const lbl = slotLabel(state, slot);
  const m = slotMacros(state, slot);
  const unavailable = slot?.kind === 'tupper' && !slot.done && !state.batches.find((b) => b.id === slot.batchId && remaining(b).length > 0);

  const confirm = () => {
    const id = uid();
    update((s) => confirmSlot(s, date, slotId, id));
    toast(`✓ ${lbl?.name || meta.label} apuntado`, () => update((s) => removeLogEntry(s, id)));
  };

  return (
    <div className="list-item" style={{ padding: '10px 0' }}>
      <button onClick={onEdit} className="row grow" style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', gap: 12, minWidth: 0 }} aria-label={`Cambiar ${meta.label}`}>
        <span className="emoji" style={{ opacity: slot?.done ? 0.5 : 1 }}>{lbl?.emoji || meta.emoji}</span>
        <span className="grow" style={{ minWidth: 0 }}>
          <div className="tiny muted">{meta.label}{slot?.kind === 'tupper' && slot.thawed && !slot.done ? ' · ya en la nevera' : ''}</div>
          {lbl ? (
            <div className="small bold ellipsis" style={{ textDecoration: slot.done ? 'line-through' : 'none', color: unavailable ? 'var(--bad)' : undefined }}>{lbl.name}</div>
          ) : (
            <div className="small muted">Sin decidir · toca para elegir</div>
          )}
          {m && <div className="tiny muted num">{fmt(m.kcal)} kcal · {Math.round(m.p)} g prot{lbl?.sub ? ` · ${lbl.sub}` : ''}{unavailable ? ' · ya no queda en el congelador' : ''}</div>}
        </span>
      </button>
      {canConfirm && slot && !slot.done && !unavailable && (
        <button className="btn sm soft" style={{ flex: 'none' }} onClick={confirm} aria-label={`Confirmar ${meta.label}`}>✓ Comido</button>
      )}
      {slot?.done && (
        <button className="btn sm ghost" style={{ flex: 'none' }} onClick={() => update((s) => removeLogEntry(s, slot.done))} aria-label={`Deshacer ${meta.label}`}>Deshacer</button>
      )}
    </div>
  );
}

/** Hoja para elegir qué va en un hueco. */
export function SlotPicker({ target, onClose }) {
  const { state, update } = useStore();
  const [size, setSize] = useState(1);
  if (!target) return null;
  const { date, slotId } = target;
  const meta = slotMeta(slotId);
  const current = state.plan?.[date]?.[slotId];
  const reserved = reservedCounts(state);
  // al reemplazar, el táper actual no debe contar como reservado
  if (current?.kind === 'tupper' && !current.done) reserved[current.batchId] = (reserved[current.batchId] || 1) - 1;
  const batches = candidatesFor(state, date, slotId, reserved);
  const others = state.batches.filter((b) => remaining(b).length > 0 && !batches.includes(b) && availableIn(state, b, reserved) > 0);
  const quick = quickRecipesFor(state, slotId);
  const quickOther = allRecipes(state).filter((r) => r.quick && !mealsOf(r).includes(slotId));
  const train = slotId === 'desayuno' && isTrainDay(state, date);

  const set = (value) => {
    update((s) => {
      s.plan[date] = s.plan[date] || {};
      if (value) s.plan[date][slotId] = value;
      else delete s.plan[date][slotId];
    });
    onClose();
  };

  const tupperBtn = (b) => {
    const p = remaining(b)[0];
    return (
      <button key={b.id} className="list-item" onClick={() => set({ kind: 'tupper', batchId: b.id })}>
        <span className="emoji">{b.emoji}</span>
        <span className="grow">
          <div className="small bold">{b.name}</div>
          <div className="tiny muted num">{fmt(p.kcal)} kcal · {Math.round(p.p)} g prot · {availableIn(state, b, reserved)} libres</div>
        </span>
        {current?.batchId === b.id && <span className="badge good">elegido</span>}
      </button>
    );
  };

  return (
    <Sheet open onClose={onClose} title={`${meta.emoji} ${meta.label}`}>
      <div className="stack">
        <p className="small muted">
          {train ? '🚆 Día de tren: mejor un táper que se pueda comer frío. ' : ''}
          Objetivo orientativo: ~{fmt(slotKcalTarget(state, slotId))} kcal.
        </p>
        {batches.length > 0 && (
          <div>
            <div className="small bold">Del congelador</div>
            <div className="list">{batches.map(tupperBtn)}</div>
          </div>
        )}
        {quick.length > 0 && (
          <div>
            <div className="small bold">En casa, al momento</div>
            <div className="list">
              {quick.map((r) => {
                const per = recipeInfo(r, state.customFoods).per;
                return (
                  <button key={r.id} className="list-item" onClick={() => set({ kind: 'receta', recipeId: r.id })}>
                    <span className="emoji">{r.emoji}</span>
                    <span className="grow">
                      <div className="small bold">{r.name}</div>
                      <div className="tiny muted num">{fmt(per.kcal)} kcal · {Math.round(per.p)} g prot · {r.minutes} min</div>
                    </span>
                    {current?.recipeId === r.id && <span className="badge good">elegido</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <div className="small bold" style={{ marginBottom: 6 }}>Comer fuera</div>
          <Seg value={size} onChange={setSize} options={SIZE_LABELS.map((l, i) => ({ value: i, label: l }))} />
          <div className="chips wrap" style={{ marginTop: 8 }}>
            {EATING_OUT.map((o) => (
              <button key={o.id} className="chip" onClick={() => set({ kind: 'fuera', name: o.name, kcal: o.sizes[size] })}>{o.emoji} {o.name} · {fmt(o.sizes[size])}</button>
            ))}
          </div>
        </div>
        {(others.length > 0 || quickOther.length > 0) && (
          <details>
            <summary className="small muted">Otras opciones</summary>
            <div className="list">
              {others.map(tupperBtn)}
              {quickOther.map((r) => (
                <button key={r.id} className="list-item small" onClick={() => set({ kind: 'receta', recipeId: r.id })}>
                  <span className="emoji">{r.emoji}</span><span className="grow">{r.name}</span>
                </button>
              ))}
            </div>
          </details>
        )}
        {batches.length === 0 && !quick.length && (
          <p className="small muted">No hay táperes para este hueco. El planificador del finde te propondrá qué cocinar.</p>
        )}
        {current && !current.done && <button className="btn ghost danger block" onClick={() => set(null)}>Dejar sin decidir</button>}
      </div>
    </Sheet>
  );
}
