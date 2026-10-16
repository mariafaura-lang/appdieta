// Menú por días: cada día tiene huecos (desayuno, comida, cena, postre) que
// se llenan con un táper del congelador, una receta rápida de casa o
// una comida fuera. Los táperes asignados quedan reservados hasta confirmar.

import { addDays, dayOfWeek, iso } from './dates.js';
import { remaining, activeBatches } from './inventory.js';
import { allRecipes, findRecipe, mealsOf, recipeInfo } from './recipes.js';
import { dailyTarget } from './energy.js';

export const SLOTS = [
  { id: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { id: 'comida', label: 'Comida', emoji: '🍽️' },
  { id: 'cena', label: 'Cena', emoji: '🌙' },
  { id: 'postre', label: 'Postre', emoji: '🍏' },
];

/** Reparto orientativo de las kcal del día entre huecos (el resto, extras). */
const SHARE = { desayuno: 0.22, comida: 0.36, cena: 0.24, postre: 0.08 };

export function activeSlots(state) {
  const on = state.settings.meals || {};
  return SLOTS.filter((s) => on[s.id] !== false);
}

export function slotKcalTarget(state, slot) {
  return Math.round(dailyTarget(state.profile) * (SHARE[slot] || 0.25));
}

export function isTrainDay(state, date) {
  return (state.settings.trainDays || []).includes(dayOfWeek(date));
}

/** Qué huecos puede cubrir un lote (por su receta o lo que se marcó al congelar). */
export function batchMeals(state, batch) {
  if (batch.meals?.length) return batch.meals;
  const r = batch.recipeId && findRecipe(state, batch.recipeId);
  return r ? mealsOf(r) : ['comida', 'cena'];
}

export function batchIsLight(state, batch) {
  if (batch.light != null) return batch.light;
  const r = batch.recipeId && findRecipe(state, batch.recipeId);
  return !!r?.light;
}

export function batchIsCold(state, batch) {
  const r = batch.recipeId && findRecipe(state, batch.recipeId);
  return !!r?.cold;
}

export function getSlot(state, date, slot) {
  return state.plan?.[date]?.[slot] || null;
}

/** Táperes de cada lote reservados en el menú y aún sin confirmar. */
export function reservedCounts(state, fromDate = iso()) {
  const counts = {};
  for (const [date, day] of Object.entries(state.plan || {})) {
    if (date < fromDate) continue;
    for (const slot of Object.values(day)) {
      if (slot?.kind === 'tupper' && !slot.done) counts[slot.batchId] = (counts[slot.batchId] || 0) + 1;
    }
  }
  return counts;
}

export function availableIn(state, batch, reserved = reservedCounts(state)) {
  return remaining(batch).length - (reserved[batch.id] || 0);
}

/** Macros previstas de un hueco del plan. */
export function slotMacros(state, slot) {
  if (!slot) return null;
  if (slot.kind === 'tupper') {
    const b = state.batches.find((x) => x.id === slot.batchId);
    const p = b && remaining(b)[0];
    return p ? { kcal: p.kcal, p: p.p, c: p.c, f: p.f } : null;
  }
  if (slot.kind === 'receta') {
    const r = findRecipe(state, slot.recipeId);
    return r ? recipeInfo(r, state.customFoods).per : null;
  }
  if (slot.kind === 'fuera') return { kcal: Number(slot.kcal) || 0, p: 0, c: 0, f: 0 };
  return null;
}

export function slotLabel(state, slot) {
  if (!slot) return null;
  if (slot.kind === 'tupper') {
    const b = state.batches.find((x) => x.id === slot.batchId);
    return b ? { emoji: b.emoji, name: b.name, sub: 'táper' } : { emoji: '❔', name: 'Táper ya no disponible', sub: '' };
  }
  if (slot.kind === 'receta') {
    const r = findRecipe(state, slot.recipeId);
    if (!r) return { emoji: '❔', name: 'Receta', sub: '' };
    if (!r.quick) {
      const b = activeBatches(state).find((x) => x.recipeId === r.id);
      return { emoji: r.emoji, name: r.name, sub: b ? 'táper' : 'por cocinar en lote' };
    }
    return { emoji: r.emoji, name: r.name, sub: `${r.minutes} min en casa` };
  }
  if (slot.kind === 'fuera') return { emoji: '🍽️', name: slot.name || 'Comida fuera', sub: 'estimado' };
  return null;
}

/** Lotes candidatos para un hueco, mejor primero. */
export function candidatesFor(state, date, slot, reserved, avoid = []) {
  const train = slot === 'desayuno' && isTrainDay(state, date);
  const lightDinner = slot === 'cena' && state.settings.lightDinner !== false;
  const target = slotKcalTarget(state, slot);
  return activeBatches(state)
    .filter((b) => availableIn(state, b, reserved) > 0 && batchMeals(state, b).includes(slot))
    .map((b) => {
      const p = remaining(b)[0];
      let score = 0;
      score -= Math.abs(p.kcal - target) / target; // encaja en el objetivo
      score += Math.min(1, (Date.now() - new Date(b.frozenAt)) / (86400000 * 60)) * 0.8; // rotar lo más antiguo
      if (lightDinner) score += batchIsLight(state, b) ? 1.5 : -1;
      if (train && batchIsCold(state, b)) score += 0.5;
      if (avoid.includes(b.id)) score -= 2; // variedad: no repetir lo de ayer
      return { b, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.b);
}

/** Recetas rápidas de casa para un hueco (desayunos de casa y postres), en orden fijo de rotación. */
export function quickRecipesFor(state, slot) {
  return allRecipes(state)
    .filter((r) => r.quick && mealsOf(r).includes(slot))
    .sort((a, b) => (state.ratings[b.id] || 0) - (state.ratings[a.id] || 0) || (b.fruit ? 1 : 0) - (a.fruit ? 1 : 0));
}

/** Recetas de lote para un hueco (para planificar aunque aún no estén cocinadas). */
export function batchRecipesFor(state, slot, { train = false } = {}) {
  return allRecipes(state)
    .filter((r) => !r.quick && r.freezes !== 'no' && mealsOf(r).includes(slot) && (!train || r.cold))
    .sort((a, b) => (state.ratings[b.id] || 0) - (state.ratings[a.id] || 0));
}

/**
 * Rellena los huecos vacíos de los próximos días. No toca lo ya decidido.
 * Devuelve lo que no se ha podido cubrir con táperes, por hueco.
 */
export function autofill(state, from, days) {
  const reserved = reservedCounts(state, from);
  const missing = {};
  state.plan = state.plan || {};
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const prev = state.plan[addDays(date, -1)] || {};
    const day = (state.plan[date] = state.plan[date] || {});
    for (const { id: slot } of activeSlots(state)) {
      if (day[slot]) continue;
      const train = slot === 'desayuno' && isTrainDay(state, date);
      // desayunos de casa y postres (fruta o similar) no son de táper
      const home = (slot === 'desayuno' && !train) || slot === 'postre';
      const quick = quickRecipesFor(state, slot);
      // el postre se rellena con fruta; el resto de opciones quedan para elegir a mano
      const pool = slot === 'postre' && quick.some((r) => r.fruit) ? quick.filter((r) => r.fruit) : quick;
      if (home && pool.length) {
        const idx = (dayOfWeek(date) + i) % pool.length;
        day[slot] = { kind: 'receta', recipeId: pool[idx].id };
        continue;
      }
      const usedToday = Object.values(day).filter((x) => x?.kind === 'tupper').map((x) => x.batchId);
      const avoid = [...usedToday, prev[slot]?.batchId].filter(Boolean);
      const [best] = candidatesFor(state, date, slot, reserved, avoid);
      if (best) {
        day[slot] = { kind: 'tupper', batchId: best.id };
        reserved[best.id] = (reserved[best.id] || 0) + 1;
      } else if (train && batchRecipesFor(state, 'desayuno', { train: true }).length) {
        // sin táper de desayuno: se planifica una receta de tren para cocinar el finde
        day[slot] = { kind: 'receta', recipeId: batchRecipesFor(state, 'desayuno', { train: true })[0].id };
        missing['desayuno-tren'] = (missing['desayuno-tren'] || 0) + 1;
      } else {
        const key = train ? 'desayuno-tren' : slot;
        missing[key] = (missing[key] || 0) + 1;
      }
    }
  }
  return missing;
}

/**
 * Cuántos táperes harán falta por tipo en los próximos días, contando
 * lo que ya hay en el congelador sin reservar ni comprometer.
 */
export function needsByMeal(state, from, days) {
  const slots = activeSlots(state).map((s) => s.id);
  const want = { 'desayuno-tren': 0, comida: 0, cena: 0, postre: 0 };
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    for (const slot of slots) {
      if (slot === 'postre') continue; // el postre es fruta o algo rápido: no se cocina en lote
      const planned = getSlot(state, date, slot);
      if (planned?.done) continue;
      const r = planned?.kind === 'receta' ? findRecipe(state, planned.recipeId) : null;
      if (planned && planned.kind !== 'tupper' && !(r && !r.quick)) continue; // receta de casa o fuera: no necesita táper
      if (slot === 'desayuno') {
        if (isTrainDay(state, date) || (r && !r.quick)) want['desayuno-tren']++;
      } else want[slot]++;
    }
  }
  // Lo que ya hay (reservado incluido: esas reservas son parte de estos días)
  const have = { 'desayuno-tren': 0, comida: 0, cena: 0, postre: 0 };
  for (const b of activeBatches(state)) {
    const meals = batchMeals(state, b);
    let n = remaining(b).length;
    for (const key of ['desayuno-tren', 'postre', 'cena', 'comida']) {
      const slot = key === 'desayuno-tren' ? 'desayuno' : key;
      if (!meals.includes(slot) || n === 0) continue;
      if (key === 'cena' && state.settings.lightDinner !== false && !batchIsLight(state, b) && meals.includes('comida')) continue;
      const take = Math.min(n, Math.max(0, want[key] - have[key]));
      have[key] += take;
      n -= take;
    }
    // sobrante de platos principales: cubre comidas
    if (n > 0 && meals.includes('comida')) have.comida += n;
  }
  const need = {};
  for (const k of Object.keys(want)) need[k] = Math.max(0, want[k] - have[k]);
  return { want, have, need };
}
