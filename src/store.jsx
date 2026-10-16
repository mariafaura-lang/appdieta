import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { iso } from './lib/dates.js';
import { uid, makeBatch, remaining } from './lib/inventory.js';
import { findRecipe, recipeInfo } from './lib/recipes.js';
import { estimateMacros } from './data/extras.js';

const KEY = 'tuper:v1';
export const SCHEMA_VERSION = 1;

export const DEFAULT_STATE = {
  version: SCHEMA_VERSION,
  profile: {
    sex: '',
    age: '',
    heightCm: '',
    weightKg: '',
    activity: 'ligero',
    deficit: 400,
    proteinPerKg: 1.6,
  },
  settings: {
    exerciseReturnPct: 50,
    cycling: false,
    trainingDays: [0, 2, 4],
    trainingBonus: 200,
    weightReminder: true,
    reminderHour: 9,
    tuppersPerDay: 2,
    notifications: false,
    meals: { desayuno: true, comida: true, cena: true, postre: true },
    trainDays: [],
    lightDinner: true,
    thawHour: 19,
  },
  customFoods: [],
  myRecipes: [],
  ratings: {},
  draft: null,
  batches: [],
  log: [],
  workouts: [],
  weights: [],
  steps: [],
  shopping: null,
  pantry: [],
  plan: {},
  health: { provider: 'manual', lastSync: null },
  dismissed: {},
};

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_STATE);
  const s = { ...structuredClone(DEFAULT_STATE), ...raw };
  s.profile = { ...DEFAULT_STATE.profile, ...(raw.profile || {}) };
  s.settings = { ...DEFAULT_STATE.settings, ...(raw.settings || {}) };
  s.settings.meals = { ...DEFAULT_STATE.settings.meals, ...(raw.settings?.meals || {}) };
  s.plan = raw.plan || {};
  s.version = SCHEMA_VERSION;
  return s;
}

function load() {
  try {
    return migrate(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* almacenamiento lleno o bloqueado: seguimos en memoria */
    }
  }, [state]);

  /** update(draft => { ...mutar... }) */
  const update = useCallback((fn) => {
    setState((s) => {
      const next = structuredClone(s);
      fn(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ state, update, replace: (s) => setState(migrate(s)) }), [state, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}

// ---------- Acciones (mutan el borrador que entrega update) ----------

export function addLogEntry(s, entry) {
  const e = { id: uid(), date: iso(), time: Date.now(), kcal: 0, p: 0, c: 0, f: 0, ...entry };
  s.log.push(e);
  return e;
}

/** "Me he comido 1 táper de X": descuenta del inventario y registra. */
export function eatTupper(s, batchId, portionId, date = iso(), entryId = uid(), meal) {
  const b = s.batches.find((x) => x.id === batchId);
  if (!b) return null;
  const portion = portionId ? b.portions.find((p) => p.id === portionId && !p.eatenAt) : remaining(b)[0];
  if (!portion) return null;
  portion.eatenAt = date;
  return addLogEntry(s, {
    id: entryId,
    date,
    meal,
    kind: 'tupper',
    name: `Táper de ${b.name}`,
    emoji: b.emoji,
    batchId: b.id,
    portionId: portion.id,
    kcal: portion.kcal,
    p: portion.p,
    c: portion.c,
    f: portion.f,
  });
}

/** Borra un registro; si era un táper, vuelve al congelador. */
export function removeLogEntry(s, entryId) {
  const e = s.log.find((x) => x.id === entryId);
  if (!e) return;
  if (e.kind === 'tupper' && e.batchId) {
    const portion = s.batches.find((b) => b.id === e.batchId)?.portions.find((p) => p.id === e.portionId);
    if (portion) portion.eatenAt = null;
  }
  s.log = s.log.filter((x) => x.id !== entryId);
  // si venía de confirmar el menú, el hueco vuelve a quedar pendiente
  for (const day of Object.values(s.plan || {})) {
    for (const slot of Object.values(day)) if (slot?.done === entryId) slot.done = null;
  }
}

/** Confirma un hueco del menú: registra lo comido (y descuenta el táper). */
export function confirmSlot(s, date, slotId, entryId = uid()) {
  const slot = s.plan?.[date]?.[slotId];
  if (!slot || slot.done) return null;
  let entry = null;
  if (slot.kind === 'tupper') {
    entry = eatTupper(s, slot.batchId, null, date, entryId, slotId);
  } else if (slot.kind === 'receta') {
    const r = findRecipe(s, slot.recipeId);
    // receta de lote ya cocinada: se come un táper suyo
    const batch = r && !r.quick && s.batches.find((b) => b.recipeId === r.id && remaining(b).length > 0);
    if (batch) {
      entry = eatTupper(s, batch.id, null, date, entryId, slotId);
    } else if (r) {
      const per = recipeInfo(r, s.customFoods).per;
      entry = addLogEntry(s, { id: entryId, date, meal: slotId, kind: 'receta', name: r.name, emoji: r.emoji, recipeId: r.id, ...per });
    }
  } else if (slot.kind === 'fuera') {
    entry = addLogEntry(s, { id: entryId, date, meal: slotId, kind: 'fuera', name: slot.name || 'Comida fuera', emoji: '🍽️', ...estimateMacros(Number(slot.kcal) || 0) });
  }
  if (entry) slot.done = entry.id;
  return entry;
}

export function addBatch(s, params) {
  const b = makeBatch(params);
  s.batches.push(b);
  return b;
}
