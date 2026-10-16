import { roundMacros, perPortion, portionsByWeight } from './nutrition.js';
import { diffDays, iso } from './dates.js';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Días recomendados en congelador antes de avisar. */
export const OLD_AFTER_DAYS = 60;
export const VERY_OLD_AFTER_DAYS = 90;

/**
 * Crea un lote congelado a partir de los totales calculados.
 * mode 'equal': `portions` táperes iguales. mode 'weight': un táper por peso.
 */
export function makeBatch({ name, emoji, recipeId, totals, mode, portions, potWeight, tupperWeights, frozenAt, freezes, meals, light }) {
  let list;
  if (mode === 'weight') {
    const ws = tupperWeights.map(Number).filter((w) => w > 0);
    list = portionsByWeight(totals, potWeight, ws).map((m, i) => ({ grams: ws[i], ...roundMacros(m) }));
  } else {
    const n = Math.max(1, Number(portions) || 1);
    const m = roundMacros(perPortion(totals, n));
    list = Array.from({ length: n }, () => ({ grams: null, ...m }));
  }
  return {
    id: uid(),
    name: name || 'Lote sin nombre',
    emoji: emoji || '🥡',
    recipeId: recipeId || null,
    freezes: freezes || 'bien',
    ...(meals?.length ? { meals } : {}),
    ...(light != null ? { light } : {}),
    frozenAt: frozenAt || iso(),
    portions: list.map((p) => ({ id: uid(), eatenAt: null, ...p })),
  };
}

export function remaining(batch) {
  return batch.portions.filter((p) => !p.eatenAt);
}

export function activeBatches(state) {
  return (state.batches || []).filter((b) => remaining(b).length > 0);
}

export function totalRemaining(state) {
  return activeBatches(state).reduce((s, b) => s + remaining(b).length, 0);
}

export function ageDays(batch, today = iso()) {
  return diffDays(today, batch.frozenAt);
}

export function ageStatus(batch, today) {
  const d = ageDays(batch, today);
  if (d >= VERY_OLD_AFTER_DAYS) return 'muy-antiguo';
  if (d >= OLD_AFTER_DAYS) return 'antiguo';
  return 'ok';
}

/** Lotes con táperes, del más antiguo al más nuevo. */
export function byAge(state) {
  return [...activeBatches(state)].sort((a, b) => a.frozenAt.localeCompare(b.frozenAt));
}

/** El táper que se come al pulsar "1 táper": el más antiguo; si hay pesos, el mediano. */
export function nextPortion(batch) {
  const rem = remaining(batch);
  return rem[0] || null;
}
