import { useState } from 'react';
import { useStore, confirmSlot, removeLogEntry } from '../store.jsx';
import { SLOTS, candidatesFor, quickRecipesFor, batchRecipesFor, reservedCounts, availableIn, slotMacros, slotLabel, isTrainDay } from '../lib/dayplan.js';
import { remaining, uid, activeBatches } from '../lib/inventory.js';
import { iso } from '../lib/dates.js';
import { FOOD_BY_ID, normalize } from '../data/foods.js';
import { allRecipes, recipeInfo } from '../lib/recipes.js';
import { EATING_OUT } from '../data/extras.js';
import { Sheet, useToast, fmt } from './ui.jsx';

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

const OUT_SIZE = 1; // tamaño «normal» al elegir comida fuera desde el buscador

function optionFromBatch(b, reserved, state) {
  const p = remaining(b)[0];
  return {
    key: `t-${b.id}`, emoji: b.emoji, name: b.name, kcal: p.kcal, p: p.p,
    sub: `táper · quedan ${availableIn(state, b, reserved)}`,
    value: { kind: 'tupper', batchId: b.id },
  };
}

function optionFromRecipe(r, state) {
  const per = recipeInfo(r, state.customFoods).per;
  const cooked = activeBatches(state).some((b) => b.recipeId === r.id);
  return {
    key: `r-${r.id}`, emoji: r.emoji, name: r.name, kcal: per.kcal, p: per.p,
    sub: r.quick ? `en casa · ${r.minutes} min` : cooked ? 'táper' : 'por cocinar',
    value: { kind: 'receta', recipeId: r.id },
  };
}

/** Las 2–3 opciones más fáciles para un hueco: lo planeado, lo que hay en el congelador o lo rápido. */
function suggestionsFor(state, date, slotId, reserved, current) {
  const out = [];
  if (current && !current.done) {
    const lbl = slotLabel(state, current);
    const m = slotMacros(state, current);
    if (lbl) out.push({ key: 'plan', emoji: lbl.emoji, name: lbl.name, kcal: m?.kcal || 0, p: m?.p || 0, sub: 'lo que tenías pensado', value: current });
  }
  const train = slotId === 'desayuno' && isTrainDay(state, date);
  const homeFirst = (slotId === 'desayuno' && !train) || slotId === 'postre';
  const tuppers = candidatesFor(state, date, slotId, reserved).slice(0, 2).map((b) => optionFromBatch(b, reserved, state));
  const quick = quickRecipesFor(state, slotId);
  const quickPool = slotId === 'postre' && quick.some((r) => r.fruit) ? quick.filter((r) => r.fruit) : quick;
  const quickOpts = quickPool.slice(0, 2).map((r) => optionFromRecipe(r, state));
  const rest = homeFirst ? [...quickOpts, ...tuppers] : [...tuppers, ...quickOpts];
  if (!rest.length && slotId !== 'postre') {
    rest.push(...batchRecipesFor(state, slotId, { train }).slice(0, 2).map((r) => optionFromRecipe(r, state)));
  }
  for (const o of rest) if (!out.some((x) => x.value.batchId && x.value.batchId === o.value.batchId) && !out.some((x) => x.key === o.key)) out.push(o);
  return out.slice(0, 3);
}

function searchOptions(state, q, reserved) {
  const nq = normalize(q);
  if (!nq) return [];
  const words = nq.split(/\s+/);
  const hit = (text) => words.every((w) => normalize(text).includes(w));
  const tuppers = activeBatches(state).filter((b) => hit(b.name)).map((b) => optionFromBatch(b, reserved, state));
  const recipes = allRecipes(state)
    .filter((r) => hit(r.name) || r.ingredients.some((i) => hit(FOOD_BY_ID[i.foodId]?.name || '')))
    .map((r) => optionFromRecipe(r, state));
  const out = EATING_OUT.filter((o) => hit(`${o.name} fuera restaurante`)).map((o) => ({
    key: `f-${o.id}`, emoji: o.emoji, name: o.name, kcal: o.sizes[OUT_SIZE], p: 0, sub: 'comida fuera · estimado',
    value: { kind: 'fuera', name: o.name, kcal: o.sizes[OUT_SIZE] },
  }));
  return [...tuppers, ...recipes, ...out].slice(0, 20);
}

/**
 * Hoja para elegir qué va en un hueco: arriba 2–3 sugerencias de un toque y
 * debajo un buscador (recetas, táperes y comidas fuera).
 * mode 'plan' lo deja planificado; mode 'log' además lo apunta como comido.
 */
export function SlotPicker({ target, onClose, mode = 'plan' }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  if (!target) return null;
  const { date, slotId } = target;
  const meta = slotMeta(slotId);
  const current = state.plan?.[date]?.[slotId];
  const reserved = reservedCounts(state);
  if (current?.kind === 'tupper' && !current.done) reserved[current.batchId] = Math.max(0, (reserved[current.batchId] || 1) - 1);
  const suggestions = suggestionsFor(state, date, slotId, reserved, mode === 'log' ? current : null);
  const results = searchOptions(state, q, reserved);
  const close = () => { setQ(''); onClose(); };

  const choose = (opt) => {
    const id = uid();
    update((s) => {
      s.plan[date] = s.plan[date] || {};
      s.plan[date][slotId] = { ...opt.value, done: null };
      if (mode === 'log') confirmSlot(s, date, slotId, id);
    });
    if (mode === 'log') toast(`✓ ${opt.name} apuntado`, () => update((s) => removeLogEntry(s, id)));
    close();
  };

  const row = (o) => (
    <button key={o.key} className="list-item" onClick={() => choose(o)}>
      <span className="emoji">{o.emoji}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <div className="small bold">{o.name}</div>
        <div className="tiny muted num">{fmt(o.kcal)} kcal{o.p ? ` · ${Math.round(o.p)} g prot` : ''} · {o.sub}</div>
      </span>
      {mode !== 'log' && current?.kind === o.value.kind && (current.batchId || current.recipeId) === (o.value.batchId || o.value.recipeId) && <span className="badge good">elegido</span>}
    </button>
  );

  return (
    <Sheet open onClose={close} title={`${meta.emoji} ${mode === 'log' ? `¿Qué has tomado de ${meta.label.toLowerCase()}?` : meta.label}`}>
      <div className="stack">
        {suggestions.length > 0 && !q && (
          <div>
            <div className="small bold">Sugerido</div>
            <div className="list">{suggestions.map(row)}</div>
          </div>
        )}
        <input id="slot-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar: lentejas, muffins, menú del día…" aria-label="Buscar receta, táper o comida fuera" />
        {q && (results.length ? <div className="list">{results.map(row)}</div> : <p className="small muted">Nada con «{q}». Prueba con un ingrediente.</p>)}
        {mode === 'plan' && current && !current.done && !q && (
          <button className="btn ghost danger block" onClick={() => { update((s) => { delete s.plan[date][slotId]; }); close(); }}>Dejar sin decidir</button>
        )}
      </div>
    </Sheet>
  );
}

/** Fila de Hoy: invita a apuntar lo comido (sin mostrar lo planeado). */
export function TodayRow({ slotId, onPick }) {
  const { state, update } = useStore();
  const today = iso();
  const slot = state.plan?.[today]?.[slotId];
  const meta = slotMeta(slotId);
  const entry = slot?.done ? state.log.find((e) => e.id === slot.done) : null;
  const ask = { desayuno: '¿Qué has desayunado?', comida: '¿Qué has comido?', cena: '¿Qué has cenado?', postre: '¿Postre?' }[slotId];
  return (
    <div className="list-item" style={{ padding: '10px 0' }}>
      <button onClick={entry ? undefined : onPick} className="row grow" style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', gap: 12, minWidth: 0 }}
        aria-label={entry ? `${meta.label}: ${entry.name}` : `Apuntar ${meta.label}`}>
        <span className="emoji">{entry?.emoji || meta.emoji}</span>
        <span className="grow" style={{ minWidth: 0 }}>
          <div className="tiny muted">{meta.label}{entry ? '' : ' · toca para apuntar'}</div>
          {entry ? (
            <>
              <div className="small bold ellipsis">✓ {entry.name}</div>
              <div className="tiny muted num">{fmt(entry.kcal)} kcal · {Math.round(entry.p)} g prot</div>
            </>
          ) : (
            <div className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>{ask}</div>
          )}
        </span>
      </button>
      {entry && <button className="btn sm ghost" style={{ flex: 'none' }} onClick={() => update((s) => removeLogEntry(s, entry.id))} aria-label={`Deshacer ${meta.label}`}>Deshacer</button>}
    </div>
  );
}
