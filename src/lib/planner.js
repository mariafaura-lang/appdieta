import { FOOD_BY_ID, CATEGORIES } from '../data/foods.js';
import { allRecipes, recipeInfo } from './recipes.js';
import { activeBatches, remaining } from './inventory.js';
import { dailyTarget, proteinTarget } from './energy.js';
import { diffDays } from './dates.js';

// Ingredientes de despensa que no cuentan como "compartidos" (se tienen siempre).
const STAPLES = new Set(['aceite_oliva', 'ajo', 'pimenton', 'comino', 'harina', 'caldo_pollo', 'caldo_verduras', 'azucar']);

/** Fracción de las kcal del día que suele ocupar un táper. */
export function tupperShare(tuppersPerDay) {
  return { 1: 0.4, 2: 0.35, 3: 0.27, 4: 0.22 }[tuppersPerDay] || 0.35;
}

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

/** Puntúa una receta para el plan según objetivo, variedad y valoración. */
export function scoreRecipe(state, recipe, info, today) {
  const T = dailyTarget(state.profile);
  const perDay = Number(state.settings.tuppersPerDay) || 2;
  const ideal = T * tupperShare(perDay);
  const idealProtein = (proteinTarget(state.profile) * 0.8) / (perDay + 1);
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

/**
 * Sugiere qué cocinar el finde.
 * opts: { days, nRecipes, vegetarianOnly, exclude: [ids] }
 */
export function suggestPlan(state, today, opts = {}) {
  const days = opts.days ?? 7;
  const perDay = Number(state.settings.tuppersPerDay) || 2;
  const stock = activeBatches(state).reduce((s, b) => s + remaining(b).length, 0);
  const need = Math.max(0, days * perDay - stock);
  const k = Math.max(1, Math.min(opts.nRecipes ?? (need > 10 ? 3 : need > 5 ? 2 : 1), 4));

  const candidates = allRecipes(state)
    .filter((r) => r.freezes !== 'no' && !(opts.exclude || []).includes(r.id))
    .map((r) => ({ r, info: recipeInfo(r, state.customFoods) }))
    .filter((x) => !opts.vegetarianOnly || x.info.vegetarian)
    .map((x) => ({ ...x, score: scoreRecipe(state, x.r, x.info, today) }))
    .sort((a, b) => b.score - a.score);

  if (need === 0 || candidates.length === 0) return { need, stock, days, picks: [], alternatives: candidates.slice(0, 8) };

  const pool = candidates.slice(0, 12);
  const kk = Math.min(k, pool.length);
  let best = null;
  for (const combo of combinations(pool, kk)) {
    const recipes = combo.map((c) => c.r);
    const shared = sharedIngredients(recipes).length;
    const groups = new Set(recipes.map(mainProteinGroup)).size;
    const total = combo.reduce((s, c) => s + c.score, 0) + shared * 0.35 + (groups - 1) * 0.6;
    if (!best || total > best.total) best = { combo, total };
  }

  const picks = splitServings(best.combo, need);
  return {
    need,
    stock,
    days,
    picks,
    shared: sharedIngredients(picks.map((p) => p.r)),
    alternatives: candidates.filter((c) => !picks.some((p) => p.r.id === c.r.id)).slice(0, 8),
  };
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
