import { describe, it, expect } from 'vitest';
import { batchTotals, perPortion, portionsByWeight, batchCost } from '../src/lib/nutrition.js';
import { bmr, tdee, dailyTarget, proteinTarget } from '../src/lib/energy.js';
import { plannedTarget, dayTarget, weekSummary } from '../src/lib/targets.js';
import { makeBatch, remaining } from '../src/lib/inventory.js';
import { movingAverage, weeklyTrend } from '../src/lib/stats.js';
import { suggestPlan, shoppingList } from '../src/lib/planner.js';
import { mergeWorkouts, mergeSteps, normalizeWorkout } from '../src/lib/health.js';
import { computeNudges } from '../src/lib/nudges.js';
import { weekDays, addDays } from '../src/lib/dates.js';
import { searchFoods } from '../src/data/foods.js';
import { BASE_RECIPES } from '../src/data/recipes.js';
import { recipeInfo } from '../src/lib/recipes.js';
import { DEFAULT_STATE, eatTupper, removeLogEntry, addBatch, migrate } from '../src/store.jsx';

const profile = { sex: 'm', age: 35, heightCm: 165, weightKg: 75, activity: 'ligero', deficit: 400, proteinPerKg: 1.6, onboarded: true };
const mkState = (extra = {}) => ({ ...structuredClone(DEFAULT_STATE), profile, ...extra });

describe('nutrición', () => {
  const ings = [{ foodId: 'pechuga_pollo', grams: 1000 }, { foodId: 'arroz', grams: 500 }];
  it('suma totales y reparte por táper', () => {
    const t = batchTotals(ings);
    expect(t.kcal).toBe(1100 + 1800);
    expect(perPortion(t, 5).kcal).toBe(580);
    expect(perPortion(t, 5).p).toBeCloseTo((230 + 35) / 5);
  });
  it('respeta valores por 100 g editados', () => {
    const t = batchTotals([{ foodId: 'arroz', grams: 200, per100: { kcal: 100, p: 1, c: 20, f: 0 } }]);
    expect(t.kcal).toBe(200);
  });
  it('reparte por peso de la olla', () => {
    const t = { kcal: 3000, p: 200, c: 300, f: 100 };
    const [a, b] = portionsByWeight(t, 3000, [500, 1000]);
    expect(a.kcal).toBe(500);
    expect(b.p).toBeCloseTo(66.67, 1);
    // sin peso de olla: la suma de táperes es el total
    expect(portionsByWeight(t, '', [1000, 2000])[1].kcal).toBe(2000);
  });
  it('calcula coste', () => {
    expect(batchCost([{ foodId: 'arroz', grams: 1000 }])).toBe(1.5);
  });
  it('busca sin tildes', () => {
    expect(searchFoods('platano')[0].id).toBe('platano');
    expect(searchFoods('garbanzo').length).toBeGreaterThan(1);
  });
});

describe('energía y objetivos', () => {
  it('Mifflin-St Jeor', () => {
    expect(bmr(profile)).toBeCloseTo(10 * 75 + 6.25 * 165 - 5 * 35 - 161);
    expect(tdee(profile)).toBeCloseTo(bmr(profile) * 1.375);
  });
  it('déficit moderado acotado a 300–500 y mínimo seguro', () => {
    expect(dailyTarget(profile)).toBe(Math.round((tdee(profile) - 400) / 10) * 10);
    expect(dailyTarget({ ...profile, deficit: 900 })).toBe(Math.round((tdee(profile) - 500) / 10) * 10);
    expect(dailyTarget({ ...profile, weightKg: 40, heightCm: 145, age: 70, activity: 'sedentario' })).toBe(1200);
  });
  it('proteína por peso', () => {
    expect(proteinTarget(profile)).toBe(120);
  });
  it('el ciclado mantiene la media semanal', () => {
    const s = mkState({ settings: { ...DEFAULT_STATE.settings, cycling: true, trainingDays: [0, 2, 4], trainingBonus: 200 } });
    const days = weekDays('2026-10-14');
    const sum = days.reduce((a, d) => a + plannedTarget(s, d), 0);
    expect(Math.abs(sum / 7 - dailyTarget(profile))).toBeLessThan(1);
    expect(plannedTarget(s, days[0])).toBe(dailyTarget(profile) + 200);
  });
  it('devuelve un % de las kcal de entreno', () => {
    const s = mkState({ workouts: [{ id: 'w', date: '2026-10-14', kcal: 400 }] });
    expect(dayTarget(s, '2026-10-14')).toBe(dailyTarget(profile) + 200);
  });
});

describe('inventario y registro', () => {
  it('comer un táper descuenta y deshacer lo devuelve', () => {
    const s = mkState();
    const b = addBatch(s, { name: 'Lentejas', totals: { kcal: 2000, p: 100, c: 200, f: 50 }, mode: 'equal', portions: 4 });
    expect(remaining(b)).toHaveLength(4);
    const e = eatTupper(s, b.id, null, '2026-10-14');
    expect(e.kcal).toBe(500);
    expect(remaining(s.batches[0])).toHaveLength(3);
    removeLogEntry(s, e.id);
    expect(remaining(s.batches[0])).toHaveLength(4);
    expect(s.log).toHaveLength(0);
  });
  it('lote por pesos', () => {
    const b = makeBatch({ name: 'x', totals: { kcal: 1000, p: 50, c: 0, f: 0 }, mode: 'weight', potWeight: 1000, tupperWeights: [300, 700, ''] });
    expect(b.portions.map((p) => p.kcal)).toEqual([300, 700]);
  });
  it('migra estados antiguos sin perder datos', () => {
    const s = migrate({ profile: { age: 30 }, batches: [{ id: 1 }] });
    expect(s.profile.deficit).toBe(400);
    expect(s.batches).toHaveLength(1);
    expect(s.settings.exerciseReturnPct).toBe(50);
  });
});

describe('resumen semanal', () => {
  it('solo cuenta días registrados', () => {
    const T = dailyTarget(profile);
    const s = mkState({ log: [
      { id: 'a', date: '2026-10-12', kcal: T - 300, p: 0, c: 0, f: 0 },
      { id: 'b', date: '2026-10-13', kcal: T - 100, p: 0, c: 0, f: 0 },
    ] });
    const w = weekSummary(s, '2026-10-14');
    expect(w.loggedCount).toBe(2);
    expect(w.balance).toBe(-400);
    // quedan 5 días (mi–do) y el déficit acumulado se reparte
    expect(w.perRemainingDay).toBe(Math.round(T + 400 / 5));
  });
});

describe('seguimiento', () => {
  it('media móvil de 7 días y tendencia', () => {
    const weights = Array.from({ length: 15 }, (_, i) => ({ date: addDays('2026-10-01', i), kg: 80 - i * 0.1 }));
    const ma = movingAverage(weights);
    expect(ma[0].avg).toBe(80);
    expect(ma[6].avg).toBeCloseTo(79.7);
    expect(weeklyTrend(weights)).toBeCloseTo(-0.7);
  });
});

describe('planificador', () => {
  it('propone recetas que congelan y cubren lo que falta', () => {
    const s = mkState();
    const plan = suggestPlan(s, '2026-10-17', { days: 5 });
    expect(plan.need).toBe(10);
    expect(plan.picks.reduce((a, p) => a + p.servings, 0)).toBe(10);
    expect(plan.picks.every((p) => p.r.freezes !== 'no')).toBe(true);
    const list = shoppingList(plan.picks);
    expect(list.length).toBeGreaterThan(3);
  });
  it('no propone nada si el congelador ya cubre', () => {
    const s = mkState();
    addBatch(s, { name: 'x', totals: { kcal: 5000, p: 300, c: 0, f: 0 }, mode: 'equal', portions: 14 });
    expect(suggestPlan(s, '2026-10-17', { days: 7 }).picks).toHaveLength(0);
  });
  it('solo vegetarianas', () => {
    const plan = suggestPlan(mkState(), '2026-10-17', { days: 7, vegetarianOnly: true });
    expect(plan.picks.every((p) => p.info.vegetarian)).toBe(true);
  });
});

describe('salud', () => {
  it('normaliza y une sin duplicar', () => {
    const w = normalizeWorkout({ id: 'abc', start: '2026-10-14T18:00:00', end: '2026-10-14T19:00:00', type: 'HKWorkoutActivityTypeRunning', activeKcal: 512.4 }, 'apple');
    expect(w).toMatchObject({ date: '2026-10-14', minutes: 60, type: 'correr', kcal: 512 });
    const merged = mergeWorkouts([w], [{ ...w, kcal: 520 }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].kcal).toBe(520);
    expect(mergeSteps([{ date: 'd', steps: 5000 }], [{ date: 'd', steps: 7000 }])[0].steps).toBe(7000);
  });
});

describe('recetario y avisos', () => {
  it('todas las recetas usan alimentos existentes y tienen macros razonables', () => {
    for (const r of BASE_RECIPES) {
      const i = recipeInfo(r);
      expect(i.per.kcal, r.name).toBeGreaterThan(200);
      expect(i.per.kcal, r.name).toBeLessThan(900);
    }
  });
  it('recuerda pesarse sin repetir tras descartarlo', () => {
    const s = mkState();
    const now = new Date(2026, 9, 14, 10);
    expect(computeNudges(s, now).some((n) => n.id === 'peso')).toBe(true);
    s.dismissed['peso:2026-10-14'] = true;
    expect(computeNudges(s, now).some((n) => n.id === 'peso')).toBe(false);
  });
});
