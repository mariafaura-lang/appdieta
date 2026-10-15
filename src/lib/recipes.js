import { BASE_RECIPES } from '../data/recipes.js';
import { batchTotals, perPortion, batchCost, isVegetarian, proteinShare, roundMacros } from './nutrition.js';

export function allRecipes(state) {
  return [...(state.myRecipes || []), ...BASE_RECIPES];
}

export function findRecipe(state, id) {
  return allRecipes(state).find((r) => r.id === id);
}

export function scaleIngredients(recipe, servings) {
  const k = servings / recipe.servings;
  return recipe.ingredients.map((i) => ({ ...i, grams: Math.round(i.grams * k) }));
}

/** Datos calculados de una receta (por táper) para listados y filtros. */
export function recipeInfo(recipe, customFoods = []) {
  const totals = batchTotals(recipe.ingredients, customFoods);
  const per = roundMacros(perPortion(totals, recipe.servings));
  const cost = batchCost(recipe.ingredients, customFoods) / recipe.servings;
  return {
    per,
    costPerServing: Math.round(cost * 100) / 100,
    vegetarian: isVegetarian(recipe.ingredients, customFoods),
    highProtein: per.p >= 30 || proteinShare(per) >= 0.3,
  };
}

export const FILTERS = [
  { id: 'kcal400', label: '≤ 400 kcal', test: (r, i) => i.per.kcal <= 400 },
  { id: 'kcal550', label: '≤ 550 kcal', test: (r, i) => i.per.kcal <= 550 },
  { id: 'protein', label: 'Alta en proteína', test: (r, i) => i.highProtein },
  { id: 'veg', label: 'Vegetariana', test: (r, i) => i.vegetarian },
  { id: 'quick', label: '≤ 40 min', test: (r) => r.minutes <= 40 },
  { id: 'cheap', label: '≤ 1,50 €/ración', test: (r, i) => i.costPerServing <= 1.5 },
  { id: 'freezes', label: 'Congela bien', test: (r) => r.freezes === 'bien' },
  { id: 'mine', label: 'Mis recetas', test: (r) => !!r.custom },
];

export const FREEZE_LABEL = {
  bien: { text: 'Congela bien', icon: '❄️', tone: 'good' },
  regular: { text: 'Congela regular', icon: '⚠️', tone: 'warn' },
  no: { text: 'No congelar', icon: '🚫', tone: 'bad' },
};
