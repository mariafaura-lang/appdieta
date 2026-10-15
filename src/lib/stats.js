import { addDays, diffDays } from './dates.js';

/** Peso por fecha (si hay varias entradas un día, la última). */
export function weightByDate(weights) {
  const map = new Map();
  for (const w of [...weights].sort((a, b) => a.date.localeCompare(b.date))) map.set(w.date, Number(w.kg));
  return map;
}

/**
 * Media móvil de 7 días: para cada día con pesaje, media de los pesajes
 * de ese día y los 6 anteriores.
 */
export function movingAverage(weights, window = 7) {
  const map = weightByDate(weights);
  const dates = [...map.keys()].sort();
  return dates.map((date) => {
    const vals = [];
    for (let i = 0; i < window; i++) {
      const v = map.get(addDays(date, -i));
      if (v != null) vals.push(v);
    }
    return { date, kg: map.get(date), avg: vals.reduce((a, b) => a + b, 0) / vals.length };
  });
}

/** Cambio semanal de la media (kg/semana) comparando la última media con la de hace ~7 días. */
export function weeklyTrend(weights) {
  const ma = movingAverage(weights);
  if (ma.length < 2) return null;
  const last = ma[ma.length - 1];
  const ref = [...ma].reverse().find((x) => diffDays(last.date, x.date) >= 7);
  if (!ref) return null;
  const days = diffDays(last.date, ref.date);
  return ((last.avg - ref.avg) / days) * 7;
}

export function lastNDays(today, n) {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

export function stepsSeries(steps, today, n = 14) {
  const map = new Map(steps.map((s) => [s.date, Number(s.steps)]));
  return lastNDays(today, n).map((date) => ({ date, steps: map.get(date) ?? null }));
}

export function average(nums) {
  const v = nums.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
