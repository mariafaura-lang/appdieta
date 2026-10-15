import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { suggestPlan, shoppingList, shoppingText, fmtQty, sharedIngredients, tupperShare } from '../lib/planner.js';
import { FREEZE_LABEL } from '../lib/recipes.js';
import { dailyTarget } from '../lib/energy.js';
import { FOOD_BY_ID, CATEGORIES } from '../data/foods.js';
import { iso, fmtShort } from '../lib/dates.js';
import { draftFromRecipe } from './Calculator.jsx';
import { Stepper, Seg, Empty, useToast, fmt, fmtEur } from '../components/ui.jsx';

export default function Planner({ setSub }) {
  const { state, update } = useStore();
  const toast = useToast();
  const today = iso();
  const [days, setDays] = useState(7);
  const [nRecipes, setNRecipes] = useState(0); // 0 = automático
  const [veg, setVeg] = useState(false);
  const [exclude, setExclude] = useState([]);
  const [overrides, setOverrides] = useState({}); // id -> servings

  const plan = useMemo(
    () => suggestPlan(state, today, { days, nRecipes: nRecipes || undefined, vegetarianOnly: veg, exclude }),
    [state, today, days, nRecipes, veg, exclude],
  );
  const picks = plan.picks.map((p) => ({ ...p, servings: overrides[p.r.id] ?? p.servings }));
  const totalNew = picks.reduce((s, p) => s + p.servings, 0);
  const shared = sharedIngredients(picks.map((p) => p.r));
  const cost = picks.reduce((s, p) => s + p.info.costPerServing * p.servings, 0);
  const perTupper = state.profile.weightKg ? Math.round(dailyTarget(state.profile) * tupperShare(state.settings.tuppersPerDay)) : null;

  const makeList = () => {
    const items = shoppingList(picks, state.customFoods);
    update((s) => {
      s.shopping = { createdAt: today, recipes: picks.map((p) => `${p.r.name} ×${p.servings}`), items, checked: {} };
    });
    setTimeout(() => document.getElementById('lista-compra')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row between">
          <span className="bold">Días a cubrir</span>
          <Stepper value={days} onChange={setDays} min={1} max={14} label="Días a cubrir" />
        </div>
        <div className="row between">
          <span className="bold">Recetas distintas</span>
          <div style={{ width: 190 }}>
            <Seg value={nRecipes} onChange={setNRecipes} options={[{ value: 0, label: 'Auto' }, { value: 2, label: '2' }, { value: 3, label: '3' }]} />
          </div>
        </div>
        <label className="toggle"><span className="small bold">Solo vegetarianas</span><input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} /></label>
        <p className="small" style={{ color: 'var(--text-2)' }}>
          Tienes <b>{plan.stock}</b> táperes; para {days} días a {state.settings.tuppersPerDay}/día necesitas{' '}
          <b>{plan.need > 0 ? `${plan.need} más` : 'ninguno más 🎉'}</b>.
          {perTupper && <> Buscamos táperes de ~{fmt(perTupper)} kcal para encajar en tu objetivo.</>}
        </p>
      </section>

      {plan.need === 0 ? (
        <div className="card"><Empty icon="🧊"><p>Con lo que hay en el congelador tienes los días cubiertos. Aprovecha el finde para descansar.</p></Empty></div>
      ) : picks.length === 0 ? (
        <div className="card"><Empty icon="🤷"><p className="small">No hay recetas que cumplan los filtros.</p></Empty></div>
      ) : (
        <>
          <div className="section-title" style={{ marginTop: 6 }}>
            <h2>Propuesta: {totalNew} táperes</h2>
            <span className="small muted">{fmtEur(cost)} aprox.</span>
          </div>
          {picks.map((p) => {
            const fz = FREEZE_LABEL[p.r.freezes];
            return (
              <div key={p.r.id} className="card">
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <span className="emoji">{p.r.emoji}</span>
                  <div className="grow">
                    <div className="bold">{p.r.name}</div>
                    <div className="kv" style={{ marginTop: 4 }}>
                      <span><b>{fmt(p.info.per.kcal)}</b> kcal</span>
                      <span><b>{Math.round(p.info.per.p)} g</b> prot</span>
                      <span>⏱ {p.r.minutes} min</span>
                      {p.r.freezes !== 'bien' && <span>{fz.icon} {fz.text}</span>}
                    </div>
                  </div>
                </div>
                <div className="row between" style={{ marginTop: 10 }}>
                  <Stepper value={p.servings} min={1} max={20} onChange={(v) => setOverrides((o) => ({ ...o, [p.r.id]: v }))} label="Táperes" />
                  <div className="row">
                    <button className="btn sm" onClick={() => setExclude((e) => [...e, p.r.id])}>Cambiar</button>
                    <button className="btn sm soft" onClick={() => { update((s) => { s.draft = draftFromRecipe(p.r, p.servings, s.customFoods); }); setSub('calculadora'); }}>Cocinar</button>
                  </div>
                </div>
              </div>
            );
          })}
          {shared.length > 0 && (
            <p className="small" style={{ color: 'var(--text-2)' }}>
              🧺 Comparten: {shared.map((id) => FOOD_BY_ID[id]?.name.toLowerCase() || id).join(', ')}. Compras menos variedad y aprovechas los paquetes.
            </p>
          )}
          {exclude.length > 0 && <button className="btn sm ghost" onClick={() => setExclude([])}>Restaurar descartadas ({exclude.length})</button>}
          <button className="btn primary block" onClick={makeList}>🛒 Generar lista de la compra</button>
        </>
      )}

      {state.shopping && <ShoppingList />}
    </div>
  );
}

function ShoppingList() {
  const { state, update } = useStore();
  const toast = useToast();
  const sh = state.shopping;
  const groups = Object.keys(CATEGORIES)
    .map((cat) => [cat, sh.items.filter((i) => i.cat === cat)])
    .filter(([, list]) => list.length);
  const pending = sh.items.filter((i) => !sh.checked[i.foodId]);

  return (
    <section className="card" id="lista-compra">
      <div className="row between">
        <h2>Lista de la compra</h2>
        <span className="small muted">{fmtShort(sh.createdAt)}</span>
      </div>
      <p className="tiny muted" style={{ marginTop: 4 }}>{sh.recipes.join(' · ')}. Marca lo que ya tienes en casa.</p>
      {groups.map(([cat, list]) => (
        <div key={cat} style={{ marginTop: 12 }}>
          <div className="tiny bold muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{CATEGORIES[cat]}</div>
          {list.map((i) => {
            const done = !!sh.checked[i.foodId];
            return (
              <label key={i.foodId} className={`check${done ? ' done' : ''}`}>
                <input type="checkbox" checked={done} onChange={() => update((s) => { s.shopping.checked[i.foodId] = !done; })} />
                <span className="grow small">{i.name}</span>
                <span className="small num bold">{fmtQty(i.grams)}</span>
              </label>
            );
          })}
        </div>
      ))}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={async () => {
            const text = `Lista de la compra (${pending.length})\n\n${shoppingText(pending)}`;
            try {
              if (navigator.share) await navigator.share({ title: 'Lista de la compra', text });
              else { await navigator.clipboard.writeText(text); toast('Lista copiada'); }
            } catch { /* cancelado */ }
          }}
        >
          📤 Compartir
        </button>
        <button className="btn ghost danger" onClick={() => { const prev = sh; update((s) => { s.shopping = null; }); toast('Lista borrada', () => update((s) => { s.shopping = prev; })); }}>Borrar lista</button>
      </div>
    </section>
  );
}
