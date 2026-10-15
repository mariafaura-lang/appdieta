import { useState } from 'react';
import { searchFoods, CATEGORIES } from '../data/foods.js';
import { useStore } from '../store.jsx';
import { uid } from '../lib/inventory.js';
import { Sheet, Field, NumInput } from './ui.jsx';

export function FoodSearchSheet({ open, onClose, onPick }) {
  const { state, update } = useStore();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const results = searchFoods(q, state.customFoods, 30);

  const close = () => { setQ(''); setCreating(false); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={creating ? 'Nuevo alimento' : 'Añadir ingrediente'}>
      {creating ? (
        <NewFoodForm
          initialName={q}
          onSave={(food) => {
            update((s) => { s.customFoods.push(food); });
            onPick(food);
            close();
          }}
        />
      ) : (
        <div className="stack">
          <input autoFocus type="search" placeholder="Buscar: pollo, lentejas, arroz…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar alimento" />
          <div className="list">
            {results.map((f) => (
              <button key={f.id} className="list-item" onClick={() => { onPick(f); close(); }}>
                <span className="grow">
                  <div className="bold small">{f.name}{f.custom ? ' ·  mío' : ''}</div>
                  <div className="tiny muted num">
                    100 g: {f.kcal} kcal · P {f.p} · H {f.c} · G {f.f} — {CATEGORIES[f.cat] || ''}
                  </div>
                </span>
                <span className="muted">＋</span>
              </button>
            ))}
            {results.length === 0 && <p className="small muted" style={{ padding: '12px 0' }}>Sin resultados para «{q}».</p>}
          </div>
          <button className="btn block" onClick={() => setCreating(true)}>＋ Crear alimento con sus valores</button>
        </div>
      )}
    </Sheet>
  );
}

function NewFoodForm({ initialName, onSave }) {
  const [v, setV] = useState({ name: initialName || '', kcal: '', p: '', c: '', f: '', price: '', veg: true, cat: 'otros' });
  const set = (k) => (val) => setV((x) => ({ ...x, [k]: val }));
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          id: `custom-${uid()}`,
          custom: true,
          name: v.name.trim(),
          cat: v.cat,
          kcal: Number(v.kcal) || 0,
          p: Number(v.p) || 0,
          c: Number(v.c) || 0,
          f: Number(v.f) || 0,
          price: Number(v.price) || 0,
          veg: v.veg,
        });
      }}
    >
      <p className="small muted">Copia los valores por 100 g de la etiqueta.</p>
      <Field label="Nombre"><input required value={v.name} onChange={(e) => set('name')(e.target.value)} /></Field>
      <div className="grid4">
        <Field label="kcal"><NumInput required value={v.kcal} onChange={set('kcal')} /></Field>
        <Field label="Prot."><NumInput value={v.p} onChange={set('p')} /></Field>
        <Field label="Hidr."><NumInput value={v.c} onChange={set('c')} /></Field>
        <Field label="Grasa"><NumInput value={v.f} onChange={set('f')} /></Field>
      </div>
      <div className="grid2">
        <Field label="Precio €/kg (opcional)"><NumInput value={v.price} onChange={set('price')} /></Field>
        <Field label="Pasillo">
          <select value={v.cat} onChange={(e) => set('cat')(e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
      </div>
      <label className="toggle"><span className="small bold">Apto vegetariano</span><input type="checkbox" checked={v.veg} onChange={(e) => set('veg')(e.target.checked)} /></label>
      <button className="btn primary block" disabled={!v.name || v.kcal === ''}>Guardar y añadir</button>
    </form>
  );
}
