import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { suggestWeekend, shoppingList, shoppingText, fmtQty, sharedIngredients } from '../lib/planner.js';
import { freezeLabel } from '../lib/recipes.js';
import { FOOD_BY_ID, CATEGORIES } from '../data/foods.js';
import { iso, fmtShort, DOW_SHORT, DOW_LONG } from '../lib/dates.js';
import { haveGrams, addItem, defaultLocation, suggestedExpiry, UNIT_GRAMS } from '../lib/pantry.js';
import { draftFromRecipe } from './Calculator.jsx';
import { Stepper, Seg, Empty, useToast, fmt, fmtEur } from '../components/ui.jsx';

export default function Planner({ setSub }) {
  const { state, update } = useStore();
  const today = iso();
  const [days, setDays] = useState(7);
  const [veg, setVeg] = useState(false);
  const [exclude, setExclude] = useState([]);
  const [overrides, setOverrides] = useState({}); // id -> servings

  const plan = useMemo(
    () => suggestWeekend(state, today, { days, vegetarianOnly: veg, exclude }),
    [state, today, days, veg, exclude],
  );
  const withServings = (p) => ({ ...p, servings: overrides[p.r.id] ?? p.servings });
  const allPicks = plan.sections.flatMap((sec) => sec.picks.map(withServings));
  const totalNew = allPicks.reduce((s, p) => s + p.servings, 0);
  const cost = allPicks.reduce((s, p) => s + p.info.costPerServing * p.servings, 0);
  const shared = sharedIngredients(allPicks.map((p) => p.r));
  const anyNeed = plan.sections.some((sec) => sec.need > 0);

  const makeList = () => {
    const items = shoppingList([...allPicks, ...plan.quick], state.customFoods).map((i) => {
      const have = Math.round(haveGrams(state, i.foodId));
      return { ...i, have, buy: Math.max(0, i.grams - have) };
    });
    update((s) => {
      s.shopping = {
        createdAt: today,
        recipes: [...allPicks.map((p) => `${p.r.name} ×${p.servings}`), ...plan.quick.map((q) => `${q.r.name} ×${q.servings} (en casa)`)],
        items,
        checked: {},
      };
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
        <label className="toggle"><span className="small bold">Solo vegetarianas</span><input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} /></label>
        <div className="field">
          <span>Días que desayuno en el tren (táper de desayuno)</span>
          <div className="grid4" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {DOW_SHORT.map((d, i) => {
              const on = (state.settings.trainDays || []).includes(i);
              return (
                <button key={d} className={`chip${on ? ' on' : ''}`} style={{ padding: 0 }} aria-pressed={on} aria-label={`Tren el ${DOW_LONG[i]}`}
                  onClick={() => update((st) => { const t = st.settings.trainDays || []; st.settings.trainDays = on ? t.filter((x) => x !== i) : [...t, i].sort(); })}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <p className="small" style={{ color: 'var(--text-2)' }}>
          Cuento lo que hay en el congelador y lo que ya está decidido en tu <button className="btn sm ghost" style={{ padding: '0 4px', minHeight: 0, textDecoration: 'underline' }} onClick={() => setSub('menu')}>menú</button>.
          Los desayunos de casa y el postre (fruta, yogur…) no se cocinan en lote: sus ingredientes van a la lista de la compra.
        </p>
        <div className="grid4" style={{ gridTemplateColumns: `repeat(${Math.max(1, plan.sections.length)}, 1fr)`, textAlign: 'center' }}>
          {plan.sections.map((sec) => (
            <div key={sec.key} className="tiny">
              <div>{sec.emoji}</div>
              <b className="num" style={{ fontSize: '1rem', color: sec.need ? 'var(--text)' : 'var(--accent)' }}>{sec.need ? `+${sec.need}` : '✓'}</b>
              <div className="muted">{sec.key === 'desayuno-tren' ? 'desayunos tren' : sec.label.toLowerCase()}</div>
            </div>
          ))}
        </div>
      </section>

      {!anyNeed ? (
        <div className="card"><Empty icon="🧊"><p>Con lo que hay en el congelador tienes los días cubiertos. Aprovecha el finde para descansar.</p></Empty></div>
      ) : (
        <>
          <div className="section-title" style={{ marginTop: 6 }}>
            <h2>Propuesta: {totalNew} táperes</h2>
            <span className="small muted">{fmtEur(cost)} aprox.</span>
          </div>
          {plan.sections.filter((sec) => sec.need > 0).map((sec) => (
            <div key={sec.key} className="stack" style={{ gap: 8 }}>
              <div className="small bold">{sec.emoji} {sec.label} <span className="muted" style={{ fontWeight: 400 }}>· faltan {sec.need} (tienes {sec.have} de {sec.want})</span></div>
              {sec.picks.length === 0 && <p className="small muted">No hay recetas de este tipo con los filtros actuales.</p>}
              {sec.picks.map(withServings).map((p) => {
                const fz = freezeLabel(p.r);
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
            </div>
          ))}
          {shared.length > 0 && (
            <p className="small" style={{ color: 'var(--text-2)' }}>
              🧺 Comparten: {shared.map((id) => FOOD_BY_ID[id]?.name.toLowerCase() || id).join(', ')}. Compras menos variedad y aprovechas los paquetes.
            </p>
          )}
          {exclude.length > 0 && <button className="btn sm ghost" onClick={() => setExclude([])}>Restaurar descartadas ({exclude.length})</button>}
        </>
      )}
      {plan.quick.length > 0 && (
        <p className="small muted">También van a la lista los ingredientes de lo que harás en casa: {plan.quick.map((q) => `${q.r.name.toLowerCase()} ×${q.servings}`).join(', ')}.</p>
      )}
      {(anyNeed || plan.quick.length > 0) && <button className="btn primary block" onClick={makeList}>🛒 Generar lista de la compra</button>}

      {state.shopping && <ShoppingList />}
    </div>
  );
}

function ShoppingList() {
  const { state, update } = useStore();
  const toast = useToast();
  const sh = state.shopping;
  const items = sh.items.map((i) => ({ ...i, buy: i.buy ?? i.grams }));
  const toBuy = items.filter((i) => i.buy > 0);
  const atHome = items.filter((i) => i.buy <= 0);
  const groups = Object.keys(CATEGORIES)
    .map((cat) => [cat, toBuy.filter((i) => i.cat === cat)])
    .filter(([, list]) => list.length);
  const pending = toBuy.filter((i) => !sh.checked[i.foodId]);
  const bought = toBuy.filter((i) => sh.checked[i.foodId]);

  const storeBought = () => {
    update((s) => {
      for (const i of bought) {
        const loc = defaultLocation(i.foodId, s.customFoods);
        const perUnit = UNIT_GRAMS[i.foodId];
        addItem(s, {
          foodId: i.foodId,
          name: i.name,
          loc,
          qty: perUnit ? Math.ceil(i.buy / perUnit) : Math.round(i.buy),
          unit: perUnit ? 'ud' : 'g',
          expires: suggestedExpiry(i.foodId, loc, iso(), s.customFoods),
        });
      }
      s.shopping.stored = true;
    });
    toast(`🏠 ${bought.length} productos guardados en casa`);
  };

  return (
    <section className="card" id="lista-compra">
      <div className="row between">
        <h2>Lista de la compra</h2>
        <span className="small muted">{fmtShort(sh.createdAt)}</span>
      </div>
      <p className="tiny muted" style={{ marginTop: 4 }}>{sh.recipes.join(' · ')}. Ya descuenta lo que tenéis apuntado en casa; marca lo que vayas comprando.</p>
      {groups.map(([cat, list]) => (
        <div key={cat} style={{ marginTop: 12 }}>
          <div className="tiny bold muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{CATEGORIES[cat]}</div>
          {list.map((i) => {
            const done = !!sh.checked[i.foodId];
            return (
              <label key={i.foodId} className={`check${done ? ' done' : ''}`}>
                <input type="checkbox" checked={done} onChange={() => update((s) => { s.shopping.checked[i.foodId] = !done; })} />
                <span className="grow small">
                  {i.name}
                  {i.have > 0 && <span className="tiny muted"> · tenéis {fmtQty(i.have)}</span>}
                </span>
                <span className="small num bold">{fmtQty(i.buy)}</span>
              </label>
            );
          })}
        </div>
      ))}
      {toBuy.length === 0 && <p className="small" style={{ marginTop: 12 }}>🎉 Tenéis todo en casa.</p>}
      {atHome.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="small muted">Ya lo tenéis en casa ({atHome.length})</summary>
          <p className="small" style={{ marginTop: 6, color: 'var(--text-2)' }}>{atHome.map((i) => `${i.name} (${fmtQty(i.grams)})`).join(' · ')}</p>
        </details>
      )}
      {bought.length > 0 && !sh.stored && (
        <button className="btn soft block" style={{ marginTop: 12 }} onClick={storeBought}>🏠 Guardar lo comprado en casa ({bought.length})</button>
      )}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={async () => {
            const text = `Lista de la compra (${pending.length})\n\n${shoppingText(pending.map((i) => ({ ...i, grams: i.buy })))}`;
            try {
              await navigator.share({ title: 'Lista de la compra', text });
              return;
            } catch (err) {
              if (err?.name === 'AbortError') return;
            }
            try {
              await navigator.clipboard.writeText(text);
              toast('Lista copiada; pégala en WhatsApp o en Notas');
            } catch {
              toast('No se pudo copiar la lista en este navegador');
            }
          }}
        >
          📤 Compartir
        </button>
        <button className="btn ghost danger" onClick={() => { const prev = sh; update((s) => { s.shopping = null; }); toast('Lista borrada', () => update((s) => { s.shopping = prev; })); }}>Borrar lista</button>
      </div>
    </section>
  );
}
