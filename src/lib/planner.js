import { FOOD_BY_ID, CATEGORIES } from '../data/foods.js';
import { allRecipes, recipeInfo, mealsOf, findRecipe } from './recipes.js';
import { activeBatches, remaining } from './inventory.js';
import { dailyTarget, proteinTarget } from './energy.js';
import { diffDays, addDays } from './dates.js';
import { needsByMeal, slotKcalTarget } from './dayplan.js';
import { expiringSoon } from './pantry.js';

// Ingredientes de despensa que no cuentan como "compartidos" (se tienen siempre).
const STAPLES = new Set(['aceite_oliva', 'ajo', 'pimenton', 'comino', 'harina', 'caldo_pollo', 'caldo_verduras', 'azucar']);

function mainProteinGroup(recipe) {
  let best = null;
  for (const ing of recipe.ingredients) {
    const f = FOOD_BY_ID[ing.foodId];
    if (!f) continue;
    const prot = (f.p * ing.grams) / 100;
    if (!best || prot > best.prot) best = { prot, cat: f.cat };
  }
  return best?.cat || 'otros';
}

function keyIngredients(recipe) {
  return new Set(recipe.ingredients.map((i) => i.foodId).filter((id) => !STAPLES.has(id)));
}

/** Tipos de táper que planifica el finde y qué recetas valen para cada uno. */
export const CATEGORIES_PLAN = [
  { key: 'desayuno-tren', slot: 'desayuno', label: 'Desayunos para el tren', emoji: '🚆',
    filter: (r) => mealsOf(r).includes('desayuno') && r.cold && !r.quick },
  { key: 'comida', slot: 'comida', label: 'Comidas', emoji: '🍽️',
    filter: (r) => mealsOf(r).includes('comida') && !r.light && !r.quick },
  { key: 'cena', slot: 'cena', label: 'Cenas', emoji: '🌙',
    filter: (r, st) => mealsOf(r).includes('cena') && !r.quick && (st.settings.lightDinner === false || r.light) },
  { key: 'postre', slot: 'postre', label: 'Postres', emoji: '🍏',
    filter: (r) => mealsOf(r).includes('postre') && !r.quick },
];

/** Puntúa una receta para el plan según objetivo del hueco, variedad y valoración. */
export function scoreRecipe(state, recipe, info, today, slot = 'comida') {
  const ideal = slotKcalTarget(state, slot);
  const share = ideal / dailyTarget(state.profile);
  const idealProtein = proteinTarget(state.profile) * share;
  const diff = (info.per.kcal - ideal) / ideal;
  let score = 0;
  score -= diff > 0 ? diff * 4 : -diff * 2; // pasarse penaliza más que quedarse corto
  score += Math.min(1.5, info.per.p / idealProtein);
  score += (state.ratings[recipe.id] || 0) * 0.25;
  if (recipe.freezes === 'regular') score -= 0.6;
  // Variedad: penaliza lo que ya hay en el congelador o se cocinó hace poco
  const inFreezer = activeBatches(state)
    .filter((b) => b.recipeId === recipe.id)
    .reduce((s, b) => s + remaining(b).length, 0);
  score -= inFreezer * 0.35;
  const recent = (state.batches || []).filter((b) => b.recipeId === recipe.id && diffDays(today, b.frozenAt) <= 14).length;
  score -= recent * 0.8;
  // Aprovechar lo que hay en casa, sobre todo lo que caduca pronto
  const soon = new Set(expiringSoon(state, today, 4).map((i) => i.foodId));
  const home = new Set((state.pantry || []).map((i) => i.foodId));
  for (const ing of recipe.ingredients) {
    if (soon.has(ing.foodId)) score += 0.6;
    else if (home.has(ing.foodId) && !STAPLES.has(ing.foodId)) score += 0.15;
  }
  return score;
}

function combinations(arr, k, start = 0, acc = [], out = []) {
  if (acc.length === k) { out.push(acc); return out; }
  for (let i = start; i < arr.length; i++) combinations(arr, k, i + 1, [...acc, arr[i]], out);
  return out;
}

export function sharedIngredients(recipes) {
  const counts = new Map();
  for (const r of recipes) for (const id of keyIngredients(r)) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

function autoCount(key, need) {
  if (key === 'comida') return need > 10 ? 3 : need > 5 ? 2 : 1;
  if (key === 'cena') return need > 6 ? 2 : 1;
  return 1;
}

/** Elige recetas para una categoría, premiando compartir ingredientes con lo ya elegido. */
function pickFor(state, today, cat, need, opts, alreadyPicked) {
  const candidates = allRecipes(state)
    .filter((r) => r.freezes !== 'no' && cat.filter(r, state) && !(opts.exclude || []).includes(r.id))
    .map((r) => ({ r, info: recipeInfo(r, state.customFoods) }))
    .filter((x) => !opts.vegetarianOnly || x.info.vegetarian)
    .map((x) => ({ ...x, score: scoreRecipe(state, x.r, x.info, today, cat.slot) }))
    .sort((a, b) => b.score - a.score);
  if (need === 0 || candidates.length === 0) return { picks: [], alternatives: candidates.slice(0, 6) };
  const k = Math.max(1, Math.min(opts.nRecipes?.[cat.key] ?? autoCount(cat.key, need), 4));
  const pool = candidates.slice(0, 10);
  const kk = Math.min(k, pool.length);
  let best = null;
  for (const combo of combinations(pool, kk)) {
    const recipes = combo.map((c) => c.r);
    const shared = sharedIngredients([...recipes, ...alreadyPicked]).length;
    const groups = new Set(recipes.map(mainProteinGroup)).size;
    const total = combo.reduce((s, c) => s + c.score, 0) + shared * 0.35 + (groups - 1) * 0.6;
    if (!best || total > best.total) best = { combo, total };
  }
  const picks = splitServings(best.combo, need);
  return { picks, alternatives: candidates.filter((c) => !picks.some((p) => p.r.id === c.r.id)).slice(0, 6) };
}

/**
 * Sugiere qué cocinar el finde, por tipo de táper, según el menú y el congelador.
 * opts: { days, vegetarianOnly, exclude: [ids], nRecipes: { comida: 2, … } }
 */
export function suggestWeekend(state, from, opts = {}) {
  const days = opts.days ?? 7;
  const { need, want, have } = needsByMeal(state, from, days);
  const sections = [];
  const picked = [];
  for (const cat of CATEGORIES_PLAN) {
    if (!want[cat.key]) continue;
    const res = pickFor(state, from, cat, need[cat.key], opts, picked);
    picked.push(...res.picks.map((p) => p.r));
    sections.push({ ...cat, need: need[cat.key], want: want[cat.key], have: have[cat.key], ...res });
  }
  // Desayunos y postres de casa ya decididos en el menú: sus ingredientes van a la lista
  const quickCounts = new Map();
  for (let i = 0; i < days; i++) {
    for (const slot of Object.values(state.plan?.[addDays(from, i)] || {})) {
      if (slot?.kind === 'receta' && !slot.done) quickCounts.set(slot.recipeId, (quickCounts.get(slot.recipeId) || 0) + 1);
    }
  }
  const quick = [...quickCounts.entries()]
    .map(([id, n]) => ({ r: findRecipe(state, id), servings: n }))
    .filter((x) => x.r);
  return { days, sections, quick, shared: sharedIngredients(picked) };
}

/** Reparte las raciones necesarias entre las recetas (mínimo 3 por lote). */
export function splitServings(combo, need) {
  const n = combo.length;
  const base = Math.max(3, Math.floor(need / n));
  let extra = Math.max(0, need - base * n);
  return combo.map((c) => {
    const s = base + (extra > 0 ? 1 : 0);
    extra--;
    return { ...c, servings: s };
  });
}

/** Lista de la compra agregada a partir de recetas escaladas. */
export function shoppingList(picks, customFoods = []) {
  const map = new Map();
  for (const { r, servings } of picks) {
    const k = servings / r.servings;
    for (const ing of r.ingredients) {
      const f = FOOD_BY_ID[ing.foodId] || customFoods.find((x) => x.id === ing.foodId);
      const prev = map.get(ing.foodId) || { foodId: ing.foodId, name: f?.name || ing.foodId, cat: f?.cat || 'otros', grams: 0, recipes: [] };
      prev.grams += ing.grams * k;
      if (!prev.recipes.includes(r.name)) prev.recipes.push(r.name);
      map.set(ing.foodId, prev);
    }
  }
  const items = [...map.values()].map((x) => ({ ...x, grams: Math.round(x.grams) }));
  const order = Object.keys(CATEGORIES);
  return items.sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || a.name.localeCompare(b.name, 'es'));
}

export function fmtQty(g) {
  if (g >= 1000) return `${(Math.round(g / 50) * 50 / 1000).toLocaleString('es-ES')} kg`;
  if (g >= 100) return `${Math.round(g / 10) * 10} g`;
  return `${Math.round(g)} g`;
}

export function shoppingText(items) {
  const byCat = new Map();
  for (const it of items) {
    if (!byCat.has(it.cat)) byCat.set(it.cat, []);
    byCat.get(it.cat).push(it);
  }
  return [...byCat.entries()]
    .map(([cat, list]) => `${CATEGORIES[cat] || cat}\n${list.map((i) => `☐ ${i.name} — ${fmtQty(i.grams)}`).join('\n')}`)
    .join('\n\n');
}
