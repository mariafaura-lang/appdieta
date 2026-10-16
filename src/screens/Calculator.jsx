import { useState } from 'react';
import { useStore, addBatch } from '../store.jsx';
import { FOOD_BY_ID } from '../data/foods.js';
import { batchTotals, ingredientPer100, ingredientMacros, perPortion, portionsByWeight, rawWeight, batchCost, isVegetarian, roundMacros } from '../lib/nutrition.js';
import { uid } from '../lib/inventory.js';
import { iso } from '../lib/dates.js';
import { deductIngredients, haveGrams } from '../lib/pantry.js';
import { FoodSearchSheet } from '../components/FoodSearch.jsx';
import { Sheet, Seg, Stepper, NumInput, Field, MacroRow, Empty, useToast, fmt, fmtEur } from '../components/ui.jsx';

export const EMPTY_DRAFT = { name: '', emoji: '🥡', recipeId: null, freezes: 'bien', meals: null, light: false, ingredients: [], portions: 5, mode: 'equal', potWeight: '', tupperWeights: [] };

export const USES = [
  { id: 'principal', label: 'Comida o cena', meals: ['comida', 'cena'], light: false },
  { id: 'ligera', label: 'Cena ligera (crema/puré)', meals: ['cena', 'comida'], light: true },
  { id: 'desayuno', label: 'Desayuno', meals: ['desayuno'], light: false },
  { id: 'postre', label: 'Postre', meals: ['postre'], light: false },
];

export function useOf(d) {
  if (d.light) return 'ligera';
  if (d.meals?.includes('desayuno')) return 'desayuno';
  if (d.meals?.includes('postre')) return 'postre';
  return 'principal';
}

const EMOJIS = ['🥡', '🧁', '🥪', '🍏', '🥒', '🥘', '🍲', '🍛', '🍝', '🍚', '🌶️', '🫘', '🥦', '🐟', '🍗', '🥗', '🎃', '🫕'];

export default function Calculator({ go }) {
  const { state, update } = useStore();
  const toast = useToast();
  const d = state.draft || EMPTY_DRAFT;
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const setDraft = (fn) => update((s) => { s.draft = s.draft || structuredClone(EMPTY_DRAFT); fn(s.draft); });
  const totals = batchTotals(d.ingredients, state.customFoods);
  const weights = (d.tupperWeights || []).map(Number).filter((w) => w > 0);
  const byWeight = d.mode === 'weight';
  const portionsList = byWeight ? portionsByWeight(totals, d.potWeight, weights).map(roundMacros) : [];
  const per = byWeight
    ? (portionsList.length ? perPortion(totals, portionsList.length) : null)
    : roundMacros(perPortion(totals, d.portions));
  const cookedWeight = Number(d.potWeight) || weights.reduce((a, b) => a + b, 0);
  const nTuppers = byWeight ? weights.length : d.portions;
  const canFreeze = d.ingredients.length > 0 && nTuppers > 0;

  return (
    <div className="stack">
      <div className="card">
        <div className="row">
          <select aria-label="Icono" value={d.emoji} onChange={(e) => setDraft((x) => { x.emoji = e.target.value; })} style={{ width: 64, flex: 'none', fontSize: '1.3rem', padding: 6 }}>
            {EMOJIS.map((e) => <option key={e}>{e}</option>)}
          </select>
          <input placeholder="Nombre del lote (ej.: lentejas)" value={d.name} onChange={(e) => setDraft((x) => { x.name = e.target.value; })} aria-label="Nombre del lote" />
        </div>
        <select id="uso-lote" aria-label="Para qué es este lote" style={{ marginTop: 8 }} value={useOf(d)}
          onChange={(e) => setDraft((x) => { const u = USES.find((k) => k.id === e.target.value); x.meals = u.meals; x.light = u.light; })}>
          {USES.map((u) => <option key={u.id} value={u.id}>Para: {u.label}</option>)}
        </select>
      </div>

      <section className="card" style={{ paddingTop: 10 }}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <h2>Ingredientes</h2>
          <span className="small muted num">{fmt(rawWeight(d.ingredients))} g en crudo</span>
        </div>
        {d.ingredients.length === 0 ? (
          <Empty icon="🧺"><p className="small">Añade lo que echas a la olla con sus gramos, o elige una receta del recetario.</p></Empty>
        ) : (
          d.ingredients.map((ing) => {
            const p100 = ingredientPer100(ing, state.customFoods);
            const m = ingredientMacros(ing, state.customFoods);
            const open = expanded === ing.key;
            return (
              <div key={ing.key} className="ing">
                <button className="ghost" style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0 }} onClick={() => setExpanded(open ? null : ing.key)} aria-expanded={open}>
                  <div className="name">{ing.name}{ing.per100 ? ' ✎' : ''}</div>
                  <div className="meta num">{fmt(m.kcal)} kcal · P {Math.round(m.p)} g · {open ? 'ocultar' : 'valores/100 g'}</div>
                </button>
                <label style={{ position: 'relative' }}>
                  <NumInput aria-label={`Gramos de ${ing.name}`} value={ing.grams} onChange={(v) => setDraft((x) => { x.ingredients.find((i) => i.key === ing.key).grams = v; })} />
                  <span className="tiny muted" style={{ position: 'absolute', right: 8, top: 12 }}>g</span>
                </label>
                <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Quitar ${ing.name}`} onClick={() => setDraft((x) => { x.ingredients = x.ingredients.filter((i) => i.key !== ing.key); })}>✕</button>
                {open && (
                  <div className="per100">
                    {[['kcal', 'kcal'], ['p', 'Prot.'], ['c', 'Hidr.'], ['f', 'Grasa']].map(([k, l]) => (
                      <label key={k}>
                        {l}/100 g
                        <NumInput
                          value={p100[k]}
                          onChange={(v) => setDraft((x) => {
                            const it = x.ingredients.find((i) => i.key === ing.key);
                            it.per100 = { ...ingredientPer100(it, state.customFoods), [k]: v === '' ? 0 : v };
                          })}
                        />
                      </label>
                    ))}
                    {ing.per100 && (
                      <button className="btn sm ghost" style={{ gridColumn: '1 / -1' }} onClick={() => setDraft((x) => { delete x.ingredients.find((i) => i.key === ing.key).per100; })}>
                        Restaurar valores de la base
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <button className="btn soft block" style={{ marginTop: 12 }} onClick={() => setSearchOpen(true)}>＋ Añadir ingrediente</button>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Total del lote</h2>
          <span className="small muted">{fmtEur(batchCost(d.ingredients, state.customFoods))}</span>
        </div>
        <div style={{ marginTop: 10 }}><MacroRow m={totals} /></div>
      </section>

      <section className="card stack">
        <h2>Reparto en táperes</h2>
        <Seg
          value={d.mode}
          onChange={(v) => setDraft((x) => { x.mode = v; if (v === 'weight' && !x.tupperWeights?.length) x.tupperWeights = Array(x.portions).fill(''); })}
          options={[{ value: 'equal', label: 'Táperes iguales' }, { value: 'weight', label: 'Pesando' }]}
        />
        {!byWeight ? (
          <div className="row between">
            <span className="bold">¿Cuántos táperes salen?</span>
            <Stepper value={d.portions} onChange={(v) => setDraft((x) => { x.portions = v; })} label="Número de táperes" />
          </div>
        ) : (
          <>
            <p className="small muted">Pesa la olla llena y réstale el peso de la olla vacía (o deja en blanco y se suma lo que pesen los táperes). Después pesa cada táper sin la tapa.</p>
            <Field label="Peso total cocinado (g, opcional)">
              <NumInput value={d.potWeight} onChange={(v) => setDraft((x) => { x.potWeight = v; })} placeholder={weights.length ? `${weights.reduce((a, b) => a + b, 0)} (suma de táperes)` : 'ej.: 2400'} />
            </Field>
            {cookedWeight > 0 && (
              <p className="small num">≈ <b>{Math.round((totals.kcal / cookedWeight) * 100)} kcal</b> y {Math.round((totals.p / cookedWeight) * 1000) / 10} g proteína por 100 g cocinados</p>
            )}
            <div className="stack" style={{ gap: 6 }}>
              {(d.tupperWeights || []).map((w, i) => (
                <div key={i} className="row">
                  <span className="small bold" style={{ width: 64 }}>Táper {i + 1}</span>
                  <NumInput aria-label={`Peso táper ${i + 1}`} value={w} placeholder="g" onChange={(v) => setDraft((x) => { x.tupperWeights[i] = v; })} />
                  <span className="small num muted" style={{ width: 84, textAlign: 'right' }}>
                    {Number(w) > 0 && cookedWeight ? `${fmt((totals.kcal * w) / cookedWeight)} kcal` : ''}
                  </span>
                  <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Quitar táper ${i + 1}`} onClick={() => setDraft((x) => { x.tupperWeights.splice(i, 1); })}>✕</button>
                </div>
              ))}
              <button className="btn sm" onClick={() => setDraft((x) => { x.tupperWeights = [...(x.tupperWeights || []), '']; })}>＋ Táper</button>
            </div>
            {Number(d.potWeight) > 0 && weights.length > 0 && Math.abs(weights.reduce((a, b) => a + b, 0) - d.potWeight) > d.potWeight * 0.03 && (
              <p className="tiny muted">Los táperes suman {fmt(weights.reduce((a, b) => a + b, 0))} g de {fmt(d.potWeight)} g. Lo que falte se considera no guardado.</p>
            )}
          </>
        )}

        {per && (
          <div>
            <div className="small bold" style={{ marginBottom: 6 }}>{byWeight ? 'Media por táper' : 'Por táper'}</div>
            <MacroRow m={per} />
          </div>
        )}
      </section>

      <div className="grid2">
        <button className="btn" disabled={!d.ingredients.length} onClick={() => setSaveOpen(true)}>💾 Guardar receta</button>
        <button className="btn primary" disabled={!canFreeze} onClick={() => setFreezeOpen(true)}>🧊 Congelar {nTuppers || ''}</button>
      </div>
      <button className="btn ghost block small" onClick={() => update((s) => { s.draft = null; })} disabled={!state.draft}>Vaciar calculadora</button>

      <FoodSearchSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPick={(f) => {
          const key = uid();
          setDraft((x) => { x.ingredients.push({ key, foodId: f.id, name: f.name, grams: 100 }); });
          setTimeout(() => document.querySelector(`[aria-label="Gramos de ${CSS.escape(f.name)}"]`)?.focus(), 250);
        }}
      />

      <FreezeSheet
        open={freezeOpen}
        onClose={() => setFreezeOpen(false)}
        n={nTuppers}
        onConfirm={(date) => {
          update((s) => {
            deductIngredients(s, d.ingredients);
            addBatch(s, {
              name: d.name || 'Lote',
              emoji: d.emoji,
              recipeId: d.recipeId,
              freezes: d.freezes,
              meals: d.meals || undefined,
              light: d.light || undefined,
              totals,
              mode: d.mode,
              portions: d.portions,
              potWeight: d.potWeight,
              tupperWeights: d.tupperWeights || [],
              frozenAt: date,
            });
            s.draft = null;
          });
          setFreezeOpen(false);
          const fromHome = d.ingredients.filter((i) => haveGrams(state, i.foodId) > 0).length;
          toast(`🧊 ${nTuppers} táperes de ${d.name || 'lote'} al congelador${fromHome ? ` · descontados ${fromHome} ingredientes de casa` : ''}`);
          go('congelador');
        }}
      />
      <SaveRecipeSheet key={saveOpen ? 'open' : 'closed'} open={saveOpen} onClose={() => setSaveOpen(false)} draft={d} />
    </div>
  );
}

function FreezeSheet({ open, onClose, n, onConfirm }) {
  const [date, setDate] = useState(iso());
  return (
    <Sheet open={open} onClose={onClose} title={`Congelar ${n} táperes`}>
      <div className="stack">
        <Field label="Fecha de congelación"><input type="date" value={date} max={iso()} onChange={(e) => setDate(e.target.value)} /></Field>
        <button className="btn primary block" onClick={() => onConfirm(date || iso())}>Guardar en el congelador</button>
      </div>
    </Sheet>
  );
}

function SaveRecipeSheet({ open, onClose, draft }) {
  const { state, update } = useStore();
  const toast = useToast();
  const existing = draft.recipeId && state.myRecipes.find((r) => r.id === draft.recipeId);
  const [minutes, setMinutes] = useState(existing?.minutes || 45);
  const [freezes, setFreezes] = useState(existing?.freezes || draft.freezes || 'bien');
  const [steps, setSteps] = useState(existing ? existing.steps.join('\n') : '');
  const [name, setName] = useState('');
  const servings = draft.mode === 'weight' ? Math.max(1, (draft.tupperWeights || []).filter((w) => Number(w) > 0).length) : draft.portions;

  const save = (asNew) => {
    const recipe = {
      id: !asNew && existing ? existing.id : `mi-${uid()}`,
      custom: true,
      name: name || draft.name || 'Mi receta',
      emoji: draft.emoji,
      servings,
      minutes: Number(minutes) || 0,
      freezes,
      freezeNote: '',
      meals: draft.meals || undefined,
      light: draft.light || undefined,
      ingredients: draft.ingredients.map(({ foodId, grams, per100 }) => ({ foodId, grams: Number(grams) || 0, ...(per100 ? { per100 } : {}) })),
      steps: steps.split('\n').map((x) => x.trim()).filter(Boolean),
      createdAt: iso(),
    };
    update((s) => {
      s.myRecipes = s.myRecipes.filter((r) => r.id !== recipe.id);
      s.myRecipes.unshift(recipe);
      if (s.draft) { s.draft.recipeId = recipe.id; s.draft.name = recipe.name; s.draft.freezes = freezes; }
    });
    toast(`💾 «${recipe.name}» guardada en tus recetas`);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Guardar como receta">
      <div className="stack">
        <Field label="Nombre"><input value={name} placeholder={draft.name || 'Mi receta'} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid2">
          <Field label="Tiempo (min)"><NumInput value={minutes} onChange={setMinutes} /></Field>
          <Field label="¿Congela bien?">
            <select value={freezes} onChange={(e) => setFreezes(e.target.value)}>
              <option value="bien">Sí, bien</option>
              <option value="regular">Regular</option>
              <option value="no">No congelar</option>
            </select>
          </Field>
        </div>
        <Field label="Pasos (uno por línea, opcional)"><textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} /></Field>
        <p className="small muted">Se guarda para {servings} táperes; podrás escalarla en el recetario. Vegetariana: {isVegetarian(draft.ingredients, state.customFoods) ? 'sí' : 'no'}.</p>
        <button className="btn primary block" onClick={() => save(false)}>{existing ? 'Actualizar receta' : 'Guardar receta'}</button>
        {existing && <button className="btn block" onClick={() => save(true)}>Guardar como nueva</button>}
      </div>
    </Sheet>
  );
}

/** Carga una receta (escalada) en la calculadora. */
export function draftFromRecipe(recipe, servings, customFoods = []) {
  const k = servings / recipe.servings;
  return {
    ...structuredClone(EMPTY_DRAFT),
    name: recipe.name,
    emoji: recipe.emoji || '🥡',
    recipeId: recipe.id,
    freezes: recipe.freezes,
    meals: recipe.meals || null,
    light: !!recipe.light,
    portions: servings,
    ingredients: recipe.ingredients.map((i) => ({
      key: uid(),
      foodId: i.foodId,
      name: (FOOD_BY_ID[i.foodId] || customFoods.find((f) => f.id === i.foodId))?.name || i.name || i.foodId,
      grams: Math.round(i.grams * k),
      ...(i.per100 ? { per100: i.per100 } : {}),
    })),
  };
}
