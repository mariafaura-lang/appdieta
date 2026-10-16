// Lo que hay en casa: ingredientes en congelador, nevera y despensa.
// Cantidades en gramos (o unidades para lo que se cuenta por piezas).

import { FOOD_BY_ID, normalize } from '../data/foods.js';
import { diffDays, iso, addDays } from './dates.js';
import { uid } from './inventory.js';

export const LOCATIONS = [
  { id: 'congelador', label: 'Congelador', emoji: '🧊' },
  { id: 'nevera', label: 'Nevera', emoji: '🥬' },
  { id: 'despensa', label: 'Despensa', emoji: '🫙' },
];

/** Gramos por unidad para alimentos que se suelen contar por piezas. */
export const UNIT_GRAMS = {
  huevo: 60, manzana: 180, platano: 120, naranja: 150, limon: 100, aguacate: 160,
  cebolla: 150, pimiento_rojo: 180, pimiento_verde: 130, calabacin: 300, berenjena: 300,
  tomate: 120, patata: 200, zanahoria: 80, puerro: 150, pepino: 250, tortilla_trigo: 50,
  yogur_natural: 125, yogur_griego_0: 125, skyr: 150, brocoli: 400, coliflor: 700,
};

const DEFAULT_LOC = {
  congelados: 'congelador', carne: 'nevera', pescado: 'nevera', lacteos: 'nevera', verdura: 'nevera',
  legumbres: 'despensa', cereales: 'despensa', despensa: 'despensa', otros: 'despensa',
};

/** Días de nevera orientativos al guardar (para avisar sin agobiar). */
const FRIDGE_DAYS = { carne: 3, pescado: 2, verdura: 6, lacteos: 10 };

export function defaultLocation(foodId, customFoods = []) {
  const f = FOOD_BY_ID[foodId] || customFoods.find((x) => x.id === foodId);
  if (foodId === 'tofu' || foodId === 'tofu_sedoso' || foodId === 'hummus') return 'nevera';
  return DEFAULT_LOC[f?.cat] || 'despensa';
}

export function suggestedExpiry(foodId, loc, today = iso(), customFoods = []) {
  if (loc !== 'nevera') return null;
  const f = FOOD_BY_ID[foodId] || customFoods.find((x) => x.id === foodId);
  const d = FRIDGE_DAYS[f?.cat];
  if (!d) return null;
  return addDays(today, d);
}

export function gramsOf(item) {
  if (item.unit === 'ud') return item.foodId && UNIT_GRAMS[item.foodId] ? item.qty * UNIT_GRAMS[item.foodId] : 0;
  return Number(item.qty) || 0;
}

export function haveGrams(state, foodId) {
  return (state.pantry || []).filter((i) => i.foodId === foodId).reduce((s, i) => s + gramsOf(i), 0);
}

export function itemsIn(state, loc) {
  return (state.pantry || [])
    .filter((i) => i.loc === loc)
    .sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999') || a.name.localeCompare(b.name, 'es'));
}

/** Añade (o suma a lo que ya hay del mismo alimento, sitio y unidad). */
export function addItem(state, { foodId = null, name, loc, qty, unit = 'g', expires = null, addedAt = iso() }) {
  state.pantry = state.pantry || [];
  const same = state.pantry.find((i) => i.loc === loc && i.unit === unit && (foodId ? i.foodId === foodId : normalize(i.name) === normalize(name)));
  if (same) {
    same.qty = Math.round((Number(same.qty) + Number(qty)) * 10) / 10;
    if (expires && (!same.expires || expires < same.expires)) same.expires = expires;
    return same;
  }
  const item = { id: uid(), foodId, name: name || FOOD_BY_ID[foodId]?.name || 'Alimento', loc, qty: Number(qty) || 0, unit, expires, addedAt };
  state.pantry.push(item);
  return item;
}

/**
 * Descuenta ingredientes usados (p. ej. al cocinar un lote). Gasta primero lo
 * que caduca antes y lo de la nevera. Devuelve lo descontado por alimento.
 */
export function deductIngredients(state, ingredients) {
  const used = [];
  const order = { nevera: 0, despensa: 1, congelador: 2 };
  for (const ing of ingredients) {
    let need = Number(ing.grams) || 0;
    if (!ing.foodId || need <= 0) continue;
    const items = (state.pantry || [])
      .filter((i) => i.foodId === ing.foodId && gramsOf(i) > 0)
      .sort((a, b) => order[a.loc] - order[b.loc] || (a.expires || '9999').localeCompare(b.expires || '9999'));
    let took = 0;
    for (const it of items) {
      if (need <= 0) break;
      const g = gramsOf(it);
      const t = Math.min(g, need);
      const perUnit = it.unit === 'ud' ? UNIT_GRAMS[it.foodId] : 1;
      it.qty = Math.max(0, Math.round(((g - t) / perUnit) * 10) / 10);
      need -= t;
      took += t;
    }
    if (took > 0) used.push({ foodId: ing.foodId, grams: Math.round(took) });
  }
  state.pantry = (state.pantry || []).filter((i) => i.qty > 0);
  return used;
}

/** Lo de la nevera que caduca en los próximos `days` días (o ya caducó). */
export function expiringSoon(state, today = iso(), days = 2) {
  return (state.pantry || [])
    .filter((i) => i.expires && diffDays(i.expires, today) <= days)
    .sort((a, b) => a.expires.localeCompare(b.expires));
}

export function fmtAmount(item) {
  if (item.unit === 'ud') return `${item.qty} ud`;
  const g = Number(item.qty) || 0;
  return g >= 1000 ? `${(Math.round(g / 50) * 50 / 1000).toLocaleString('es-ES')} kg` : `${Math.round(g)} g`;
}
