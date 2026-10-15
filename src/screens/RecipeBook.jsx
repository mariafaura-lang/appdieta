import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { allRecipes, recipeInfo, FILTERS, FREEZE_LABEL, scaleIngredients } from '../lib/recipes.js';
import { FOOD_BY_ID, normalize } from '../data/foods.js';
import { draftFromRecipe } from './Calculator.jsx';
import { Sheet, Stepper, Stars, MacroRow, Empty, useToast, fmt, fmtEur } from '../components/ui.jsx';

const SORTS = [
  { id: 'rating', label: 'Mejor valoradas' },
  { id: 'kcal', label: 'Menos kcal' },
  { id: 'protein', label: 'Más proteína' },
  { id: 'time', label: 'Más rápidas' },
  { id: 'cost', label: 'Más baratas' },
];

export default function RecipeBook({ onCook }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [active, setActive] = useState([]);
  const [sort, setSort] = useState('rating');
  const [open, setOpen] = useState(null);

  const items = useMemo(() => {
    const list = allRecipes(state).map((r) => ({ r, i: recipeInfo(r, state.customFoods), rating: state.ratings[r.id] || 0 }));
    const nq = normalize(q);
    const filtered = list.filter(({ r, i }) =>
      (!nq || normalize(r.name).includes(nq) || r.ingredients.some((ing) => normalize(FOOD_BY_ID[ing.foodId]?.name).includes(nq))) &&
      active.every((fid) => FILTERS.find((f) => f.id === fid).test(r, i)),
    );
    const cmp = {
      rating: (a, b) => b.rating - a.rating || (a.r.custom ? -1 : 0) - (b.r.custom ? -1 : 0),
      kcal: (a, b) => a.i.per.kcal - b.i.per.kcal,
      protein: (a, b) => b.i.per.p - a.i.per.p,
      time: (a, b) => a.r.minutes - b.r.minutes,
      cost: (a, b) => a.i.costPerServing - b.i.costPerServing,
    }[sort];
    return filtered.sort(cmp);
  }, [state, q, active, sort]);

  const toggle = (id) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const current = open && allRecipes(state).find((r) => r.id === open);

  return (
    <div className="stack">
      <input type="search" placeholder="Buscar receta o ingrediente" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar receta" />
      <div className="chips" role="group" aria-label="Filtros">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip${active.includes(f.id) ? ' on' : ''}`} aria-pressed={active.includes(f.id)} onClick={() => toggle(f.id)}>{f.label}</button>
        ))}
      </div>
      <div className="row between">
        <span className="small muted">{items.length} recetas</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar" style={{ width: 'auto', minHeight: 36, padding: '4px 10px', fontSize: '0.85rem' }}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {items.length === 0 && <Empty icon="🔎"><p className="small">Ninguna receta cumple todos los filtros.</p></Empty>}
      {items.map(({ r, i, rating }) => {
        const fz = FREEZE_LABEL[r.freezes];
        return (
          <button key={r.id} className="card recipe-card" onClick={() => setOpen(r.id)}>
            <span className="emoji">{r.emoji || '🥡'}</span>
            <span className="grow" style={{ minWidth: 0 }}>
              <div className="bold">{r.name}</div>
              <div className="kv" style={{ marginTop: 4 }}>
                <span><b>{fmt(i.per.kcal)}</b> kcal</span>
                <span><b>{Math.round(i.per.p)} g</b> prot</span>
                <span>⏱ {r.minutes} min</span>
                <span>{fmtEur(i.costPerServing)}/táper</span>
              </div>
              <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
                <span className={`badge ${fz.tone}`}>{fz.icon} {fz.text}</span>
                {i.vegetarian && <span className="badge">🌱 Veg</span>}
                {i.highProtein && <span className="badge" style={{ background: 'var(--protein-soft)' }}>💪 Proteica</span>}
                {r.custom && <span className="badge">✎ Mía</span>}
                {rating > 0 && <Stars value={rating} small />}
              </div>
            </span>
          </button>
        );
      })}

      {current && <RecipeDetail key={current.id} recipe={current} onClose={() => setOpen(null)} onCook={onCook} />}
    </div>
  );
}

function RecipeDetail({ recipe, onClose, onCook }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [servings, setServings] = useState(recipe.servings);
  const info = recipeInfo(recipe, state.customFoods);
  const fz = FREEZE_LABEL[recipe.freezes];
  const ings = scaleIngredients(recipe, servings);
  const foodName = (id) => (FOOD_BY_ID[id] || state.customFoods.find((f) => f.id === id))?.name || id;

  return (
    <Sheet open onClose={onClose} title={`${recipe.emoji || ''} ${recipe.name}`}>
      <div className="stack">
        <div className="row wrap" style={{ gap: 6 }}>
          <span className={`badge ${fz.tone}`}>{fz.icon} {fz.text}</span>
          {info.vegetarian && <span className="badge">🌱 Vegetariana</span>}
          {info.highProtein && <span className="badge" style={{ background: 'var(--protein-soft)' }}>💪 Alta en proteína</span>}
          <span className="badge">⏱ {recipe.minutes} min</span>
          <span className="badge">{fmtEur(info.costPerServing)}/táper</span>
        </div>
        {recipe.freezeNote && <p className="small" style={{ color: 'var(--text-2)' }}>{recipe.freezeNote}</p>}

        <div>
          <div className="small bold" style={{ marginBottom: 6 }}>Por táper</div>
          <MacroRow m={info.per} />
        </div>

        <div className="row between">
          <span className="bold">Táperes</span>
          <Stepper value={servings} onChange={setServings} max={20} label="Táperes" />
        </div>

        <div className="card flat" style={{ padding: '4px 16px' }}>
          <div className="list">
            {ings.map((i, k) => (
              <div key={k} className="list-item small" style={{ padding: '8px 0' }}>
                <span className="grow">{foodName(i.foodId)}</span>
                <span className="num bold">{fmt(i.grams)} g</span>
              </div>
            ))}
          </div>
        </div>
        <p className="small muted num">Lote completo: {fmtEur(info.costPerServing * servings)} aprox.</p>

        {recipe.steps?.length > 0 && (
          <div>
            <div className="small bold" style={{ marginBottom: 6 }}>Pasos</div>
            <ol className="steps small">{recipe.steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
          </div>
        )}

        <div className="row between">
          <span className="small bold">Tu valoración</span>
          <Stars value={state.ratings[recipe.id] || 0} onChange={(n) => update((s) => { s.ratings[recipe.id] = n; })} />
        </div>

        <button
          className="btn primary block"
          onClick={() => {
            update((s) => { s.draft = draftFromRecipe(recipe, servings, s.customFoods); });
            onClose();
            onCook();
          }}
        >
          🍳 Cocinar {servings} táperes
        </button>
        {recipe.custom && (
          <button
            className="btn ghost danger block"
            onClick={() => {
              const copy = structuredClone(recipe);
              update((s) => { s.myRecipes = s.myRecipes.filter((r) => r.id !== recipe.id); });
              onClose();
              toast('Receta eliminada', () => update((s) => { s.myRecipes.unshift(copy); }));
            }}
          >
            Eliminar mi receta
          </button>
        )}
      </div>
    </Sheet>
  );
}
