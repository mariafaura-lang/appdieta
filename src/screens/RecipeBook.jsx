import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { allRecipes, recipeInfo, FILTERS, freezeLabel, scaleIngredients, mealsOf } from '../lib/recipes.js';
import { addLogEntry, removeLogEntry } from '../store.jsx';
import { uid } from '../lib/inventory.js';
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

const primaryMeal = (r) => (r.light ? 'cena' : mealsOf(r)[0]);
const isMine = (r) => !!r.custom || (r.source || '').startsWith('Receta de casa');

const CATEGORIES = [
  { id: 'todas', label: 'Todas', test: () => true },
  { id: 'desayuno', label: '🌅 Desayunos', test: (r) => mealsOf(r).includes('desayuno') },
  { id: 'comida', label: '🍽️ Comidas', test: (r) => mealsOf(r).includes('comida') && !r.light },
  { id: 'cena', label: '🌙 Cenas ligeras', test: (r) => primaryMeal(r) === 'cena' },
  { id: 'postre', label: '🍏 Postres', test: (r) => mealsOf(r).includes('postre') },
  { id: 'mias', label: '✎ Mías', test: isMine },
];

const GROUPS = [
  { id: 'mias', label: '✎ Mis recetas y de casa', test: isMine },
  { id: 'desayuno-tren', label: '🚆 Desayunos para llevar (de lote)', test: (r) => primaryMeal(r) === 'desayuno' && !r.quick },
  { id: 'desayuno-casa', label: '🌅 Desayunos rápidos de casa', test: (r) => primaryMeal(r) === 'desayuno' && r.quick },
  { id: 'comida', label: '🍽️ Comidas', test: (r) => primaryMeal(r) === 'comida' },
  { id: 'cena', label: '🌙 Cenas ligeras', test: (r) => primaryMeal(r) === 'cena' },
  { id: 'postre', label: '🍏 Postres y fruta', test: (r) => primaryMeal(r) === 'postre' },
];

// Filtros secundarios (las comidas del día ya van por categoría)
const EXTRA_FILTERS = FILTERS.filter((f) => !f.id.startsWith('m-') && f.id !== 'mine');

export default function RecipeBook({ onCook }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(() => { try { return sessionStorage.getItem('recetas-cat') || 'todas'; } catch { return 'todas'; } });
  const [active, setActive] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('rating');
  const [open, setOpen] = useState(null);
  const chooseCat = (c) => { setCat(c); try { sessionStorage.setItem('recetas-cat', c); } catch { /* sin almacenamiento */ } };

  const items = useMemo(() => {
    const list = allRecipes(state).map((r) => ({ r, i: recipeInfo(r, state.customFoods), rating: state.ratings[r.id] || 0 }));
    const words = normalize(q).split(/\s+/).filter(Boolean);
    const catTest = CATEGORIES.find((c) => c.id === cat)?.test || (() => true);
    const filtered = list.filter(({ r, i }) => {
      const hay = normalize(`${r.name} ${r.source || ''} ${r.ingredients.map((ing) => FOOD_BY_ID[ing.foodId]?.name || '').join(' ')}`);
      return words.every((w) => hay.includes(w)) && catTest(r) && active.every((fid) => EXTRA_FILTERS.find((f) => f.id === fid).test(r, i));
    });
    const cmp = {
      rating: (a, b) => b.rating - a.rating || (a.r.custom ? -1 : 0) - (b.r.custom ? -1 : 0),
      kcal: (a, b) => a.i.per.kcal - b.i.per.kcal,
      protein: (a, b) => b.i.per.p - a.i.per.p,
      time: (a, b) => a.r.minutes - b.r.minutes,
      cost: (a, b) => a.i.costPerServing - b.i.costPerServing,
    }[sort];
    return filtered.sort(cmp);
  }, [state, q, cat, active, sort]);

  const toggle = (id) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const current = open && allRecipes(state).find((r) => r.id === open);
  const grouped = cat === 'todas' && !q && active.length === 0;

  const card = ({ r, i, rating }) => <RecipeCard key={r.id} r={r} i={i} rating={rating} onOpen={() => setOpen(r.id)} />;

  return (
    <div className="stack">
      <input type="search" placeholder="🔎 Buscar receta o ingrediente (pollo, lentejas…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar receta" />
      <div className="chips" role="tablist" aria-label="Categorías">
        {CATEGORIES.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={`chip${cat === c.id ? ' on' : ''}`} onClick={() => chooseCat(c.id)}>{c.label}</button>
        ))}
      </div>
      <div className="row between">
        <span className="small muted">{items.length} recetas</span>
        <button className="btn sm ghost" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          ⚙️ Filtros{active.length ? ` (${active.length})` : ''} {showFilters ? '▲' : '▼'}
        </button>
      </div>
      {showFilters && (
        <div className="card flat stack" style={{ gap: 10 }}>
          <div className="chips wrap" role="group" aria-label="Filtros">
            {EXTRA_FILTERS.map((f) => (
              <button key={f.id} className={`chip${active.includes(f.id) ? ' on' : ''}`} aria-pressed={active.includes(f.id)} onClick={() => toggle(f.id)}>{f.label}</button>
            ))}
          </div>
          <label className="row between small">
            <span className="bold">Ordenar por</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar" style={{ width: 'auto', minHeight: 36, padding: '4px 10px', fontSize: '0.85rem' }}>
              {SORTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </label>
          {active.length > 0 && <button className="btn sm ghost" onClick={() => setActive([])}>Quitar filtros</button>}
        </div>
      )}

      {items.length === 0 && <Empty icon="🔎"><p className="small">No hay recetas con esa búsqueda o filtros.</p></Empty>}
      {grouped
        ? GROUPS.map((g) => {
            const list = items.filter(({ r }) => g.test(r) && (g.id === 'mias' || !isMine(r)));
            if (!list.length) return null;
            return (
              <section key={g.id} className="stack" style={{ gap: 8 }}>
                <div className="section-title" style={{ margin: '10px 2px 0' }}>
                  <h2>{g.label}</h2>
                  <span className="small muted">{list.length}</span>
                </div>
                {list.map(card)}
              </section>
            );
          })
        : items.map(card)}

      {current && <RecipeDetail key={current.id} recipe={current} onClose={() => setOpen(null)} onCook={onCook} />}
    </div>
  );
}

function RecipeCard({ r, i, rating, onOpen }) {
  const fz = freezeLabel(r);
  return (
    <button className="card recipe-card" onClick={onOpen}>
      <span className="emoji">{r.emoji || '🥡'}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <div className="bold">{r.name}</div>
        <div className="kv" style={{ marginTop: 4 }}>
          <span><b>{fmt(i.per.kcal)}</b> kcal</span>
          <span><b>{Math.round(i.per.p)} g</b> prot</span>
          <span>⏱ {r.minutes} min</span>
          <span>{fmtEur(i.costPerServing)}/{r.quick ? 'ración' : 'táper'}</span>
        </div>
        <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
          <span className={`badge ${fz.tone}`}>{fz.icon} {fz.text}</span>
          {r.cold && !r.quick && <span className="badge">🚆 Se come frío</span>}
          {i.vegetarian && <span className="badge">🌱 Veg</span>}
          {i.highProtein && <span className="badge" style={{ background: 'var(--protein-soft)' }}>💪 Proteica</span>}
          {rating > 0 && <Stars value={rating} small />}
        </div>
      </span>
    </button>
  );
}

function RecipeDetail({ recipe, onClose, onCook }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [servings, setServings] = useState(recipe.servings);
  const info = recipeInfo(recipe, state.customFoods);
  const fz = freezeLabel(recipe);
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
        {recipe.source && <p className="tiny muted">📺 Inspirada en: {recipe.source}. Adaptada a ingredientes de aquí y a táperes.</p>}

        <div>
          <div className="small bold" style={{ marginBottom: 6 }}>{recipe.quick ? 'Por ración' : 'Por táper'}</div>
          <MacroRow m={info.per} />
        </div>

        <div className="row between">
          <span className="bold">{recipe.quick ? 'Raciones' : 'Táperes'}</span>
          <Stepper value={servings} onChange={setServings} max={20} label="Raciones" />
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

        {recipe.quick ? (
          <button
            className="btn primary block"
            onClick={() => {
              const id = uid();
              update((s) => addLogEntry(s, { id, kind: 'receta', name: recipe.name, emoji: recipe.emoji, recipeId: recipe.id, ...info.per }));
              onClose();
              toast(`${recipe.emoji} ${recipe.name} apuntado`, () => update((s) => removeLogEntry(s, id)));
            }}
          >
            ✓ Me lo he tomado (1 ración)
          </button>
        ) : (
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
        )}
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
