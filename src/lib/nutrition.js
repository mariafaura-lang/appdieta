import { FOOD_BY_ID } from '../data/foods.js';

export const ZERO = { kcal: 0, p: 0, c: 0, f: 0 };

export const round = (n, d = 0) => {
  const k = 10 ** d;
  return Math.round((Number(n) || 0) * k) / k;
};

export function addMacros(a, b) {
  return { kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f };
}

export function scaleMacros(m, k) {
  return { kcal: m.kcal * k, p: m.p * k, c: m.c * k, f: m.f * k };
}

export function sumMacros(list) {
  return list.reduce((acc, m) => addMacros(acc, m), { ...ZERO });
}

export function roundMacros(m) {
  return { kcal: round(m.kcal), p: round(m.p, 1), c: round(m.c, 1), f: round(m.f, 1) };
}

/**
 * Un ingrediente de lote: { foodId, name, grams, per100: {kcal,p,c,f} }.
 * per100 puede venir editado por el usuario; si falta, se toma de la base.
 */
export function ingredientPer100(ing, customFoods = []) {
  if (ing.per100) return ing.per100;
  const f = FOOD_BY_ID[ing.foodId] || customFoods.find((x) => x.id === ing.foodId);
  return f ? { kcal: f.kcal, p: f.p, c: f.c, f: f.f } : { ...ZERO };
}

export function ingredientMacros(ing, customFoods) {
  return scaleMacros(ingredientPer100(ing, customFoods), (Number(ing.grams) || 0) / 100);
}

export function batchTotals(ingredients, customFoods) {
  return sumMacros(ingredients.map((i) => ingredientMacros(i, customFoods)));
}

export function rawWeight(ingredients) {
  return ingredients.reduce((s, i) => s + (Number(i.grams) || 0), 0);
}

/** Reparto en raciones iguales. */
export function perPortion(totals, portions) {
  const n = Math.max(1, Number(portions) || 1);
  return scaleMacros(totals, 1 / n);
}

/**
 * Reparto por peso: se pesa la olla (sin el recipiente) y cada táper.
 * Cada táper recibe la fracción de su peso sobre el total cocinado.
 */
export function portionsByWeight(totals, potWeight, tupperWeights) {
  const W = Number(potWeight) || tupperWeights.reduce((s, w) => s + (Number(w) || 0), 0);
  if (!W) return tupperWeights.map(() => ({ ...ZERO }));
  return tupperWeights.map((w) => scaleMacros(totals, (Number(w) || 0) / W));
}

export function batchCost(ingredients, customFoods = []) {
  return ingredients.reduce((s, ing) => {
    const f = FOOD_BY_ID[ing.foodId] || customFoods.find((x) => x.id === ing.foodId);
    const price = f?.price ?? 0;
    return s + (price * (Number(ing.grams) || 0)) / 1000;
  }, 0);
}

export function isVegetarian(ingredients, customFoods = []) {
  return ingredients.every((ing) => {
    const f = FOOD_BY_ID[ing.foodId] || customFoods.find((x) => x.id === ing.foodId);
    return f ? f.veg !== false : true;
  });
}

/** % de kcal que viene de la proteína. */
export function proteinShare(m) {
  return m.kcal ? (m.p * 4) / m.kcal : 0;
}
