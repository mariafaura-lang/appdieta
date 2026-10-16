import { useState } from 'react';
import { useStore } from '../store.jsx';
import { LOCATIONS, itemsIn, addItem, fmtAmount, suggestedExpiry, UNIT_GRAMS } from '../lib/pantry.js';
import { searchFoods } from '../data/foods.js';
import { allRecipes } from '../lib/recipes.js';
import { iso, diffDays, fmtShort } from '../lib/dates.js';
import { Sheet, Seg, Field, NumInput, Empty, useToast } from '../components/ui.jsx';

function expiryBadge(item, today) {
  if (!item.expires) return null;
  const d = diffDays(item.expires, today);
  if (d < 0) return <span className="badge bad">caducado {fmtShort(item.expires)}</span>;
  if (d <= 2) return <span className="badge warn">{d === 0 ? 'caduca hoy' : d === 1 ? 'caduca mañana' : `caduca en ${d} días`}</span>;
  return <span className="badge">hasta {fmtShort(item.expires)}</span>;
}

export function PantryList({ loc }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState(null);
  const today = iso();
  const items = itemsIn(state, loc);
  const meta = LOCATIONS.find((l) => l.id === loc);

  const step = (it) => (it.unit === 'ud' ? 1 : it.qty > 500 ? 100 : 50);
  const change = (it, delta) => update((s) => {
    const x = s.pantry.find((i) => i.id === it.id);
    x.qty = Math.max(0, Math.round((x.qty + delta) * 10) / 10);
    if (x.qty === 0) s.pantry = s.pantry.filter((i) => i.id !== it.id);
  });

  // Recetas que aprovechan lo que caduca pronto
  const soon = items.filter((i) => i.expires && diffDays(i.expires, today) <= 2 && i.foodId);
  const ideas = soon.length
    ? allRecipes(state).filter((r) => r.ingredients.some((g) => soon.some((i) => i.foodId === g.foodId))).slice(0, 3)
    : [];

  return (
    <div className="stack">
      <button className="btn soft block" onClick={() => setAdding(true)}>＋ Añadir a {meta.label.toLowerCase()}</button>
      {ideas.length > 0 && (
        <div className="notice">
          <span style={{ fontSize: '1.2rem' }}>💡</span>
          <p className="small">Para aprovechar lo que caduca: {ideas.map((r) => r.name).join(' · ')}.</p>
        </div>
      )}
      {items.length === 0 ? (
        <div className="card">
          <Empty icon={meta.emoji}>
            <p className="small">Nada apuntado en {meta.label.toLowerCase()}. Añádelo a mano o guarda aquí la compra desde la lista del plan del finde.</p>
          </Empty>
        </div>
      ) : (
        <div className="card flat" style={{ padding: '4px 16px' }}>
          <div className="list">
            {items.map((it) => (
              <div key={it.id} className="list-item" style={{ gap: 8 }}>
                <button className="grow" style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }} onClick={() => setEdit(it)} aria-label={`Editar ${it.name}`}>
                  <div className="small bold ellipsis">{it.name}</div>
                  <div className="row wrap" style={{ gap: 4, marginTop: 2 }}>
                    <span className="tiny num muted">{fmtAmount(it)}</span>
                    {expiryBadge(it, today)}
                  </div>
                </button>
                <div className="stepper" style={{ flex: 'none' }}>
                  <button type="button" aria-label={`Quitar ${step(it)} de ${it.name}`} onClick={() => change(it, -step(it))}>−</button>
                  <button type="button" aria-label={`Añadir ${step(it)} a ${it.name}`} onClick={() => change(it, step(it))}>+</button>
                </div>
                <button className="icon-btn" style={{ width: 40, height: 40 }} aria-label={`${it.name} se acabó`}
                  onClick={() => {
                    const copy = { ...it };
                    update((s) => { s.pantry = s.pantry.filter((i) => i.id !== it.id); });
                    toast(`${it.name}: se acabó`, () => update((s) => { s.pantry.push(copy); }));
                  }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {adding && <ItemSheet loc={loc} onClose={() => setAdding(false)} />}
      {edit && <ItemSheet item={edit} loc={edit.loc} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ItemSheet({ item, loc: initialLoc, onClose }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [q, setQ] = useState(item ? item.name : '');
  const [food, setFood] = useState(item?.foodId ? { id: item.foodId, name: item.name } : null);
  const [loc, setLoc] = useState(item?.loc || initialLoc);
  const [unit, setUnit] = useState(item?.unit || 'g');
  const [qty, setQty] = useState(item?.qty ?? '');
  const [expires, setExpires] = useState(item?.expires || '');
  const results = !food && q ? searchFoods(q, state.customFoods, 6) : [];

  const pick = (f) => {
    setFood(f);
    setQ(f.name);
    const l = item ? loc : initialLoc;
    if (UNIT_GRAMS[f.id] && !item) { setUnit('ud'); setQty(1); }
    if (!expires) setExpires(suggestedExpiry(f.id, l, iso(), state.customFoods) || '');
  };

  const save = (e) => {
    e.preventDefault();
    const name = (food?.name || q).trim();
    if (!name || !(Number(qty) > 0)) return;
    update((s) => {
      if (item) {
        const x = s.pantry.find((i) => i.id === item.id);
        Object.assign(x, { name, foodId: food?.id || null, loc, unit, qty: Number(qty), expires: expires || null });
      } else {
        addItem(s, { foodId: food?.id || null, name, loc, qty: Number(qty), unit, expires: expires || null });
      }
    });
    toast(item ? 'Guardado' : `${name} añadido a ${LOCATIONS.find((l) => l.id === loc).label.toLowerCase()}`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={item ? item.name : 'Añadir a casa'}>
      <form className="stack" onSubmit={save}>
        <Field label="Qué es">
          <input id="pantry-name" autoFocus={!item} value={q} placeholder="Buscar: espinacas, pollo, huevos…"
            onChange={(e) => { setQ(e.target.value); setFood(null); }} />
        </Field>
        {results.length > 0 && (
          <div className="list" style={{ marginTop: -6 }}>
            {results.map((f) => (
              <button type="button" key={f.id} className="list-item small" onClick={() => pick(f)}>
                <span className="grow">{f.name}</span><span className="muted">＋</span>
              </button>
            ))}
          </div>
        )}
        {!food && q && results.length === 0 && <p className="tiny muted">Se guardará como «{q}» (sin enlazar a la base de alimentos).</p>}
        <Seg value={loc} onChange={(l) => { setLoc(l); if (food && !item) setExpires(suggestedExpiry(food.id, l, iso(), state.customFoods) || ''); }}
          options={LOCATIONS.map((l) => ({ value: l.id, label: `${l.emoji} ${l.label}` }))} />
        <div className="grid2">
          <Field label="Cantidad"><NumInput id="pantry-qty" value={qty} onChange={setQty} /></Field>
          <Field label="Unidad">
            <select id="pantry-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="g">gramos</option>
              <option value="ud">unidades</option>
            </select>
          </Field>
        </div>
        <Field label="Consumir antes de (opcional)">
          <input id="pantry-exp" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
        <button className="btn primary block" disabled={!q || !(Number(qty) > 0)}>{item ? 'Guardar' : 'Añadir'}</button>
      </form>
    </Sheet>
  );
}
