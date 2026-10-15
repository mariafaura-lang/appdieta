import { dailyTarget, proteinTarget, flexibleMacros } from './energy.js';
import { dayOfWeek, weekDays } from './dates.js';
import { sumMacros } from './nutrition.js';

/**
 * Objetivo planificado de un día de la semana (sin contar ejercicio devuelto).
 * Con ciclado, los días de entreno reciben un extra y los de descanso
 * compensan, de forma que la media semanal es igual al objetivo base.
 */
export function plannedTarget(state, date) {
  const base = dailyTarget(state.profile);
  const s = state.settings || {};
  if (!s.cycling) return base;
  const days = s.trainingDays || [];
  const n = days.length;
  if (n === 0 || n === 7) return base;
  const bonus = Number(s.trainingBonus) || 0;
  const train = base + bonus;
  const rest = (7 * base - n * train) / (7 - n);
  return Math.round(days.includes(dayOfWeek(date)) ? train : rest);
}

export function workoutsOn(state, date) {
  return (state.workouts || []).filter((w) => w.date === date);
}

export function exerciseReturn(state, date) {
  const pct = Number(state.settings?.exerciseReturnPct ?? 0) / 100;
  const burned = workoutsOn(state, date).reduce((s, w) => s + (Number(w.kcal) || 0), 0);
  return Math.round(burned * pct);
}

export function dayTarget(state, date) {
  return plannedTarget(state, date) + exerciseReturn(state, date);
}

export function entriesOn(state, date) {
  return (state.log || []).filter((e) => e.date === date);
}

export function dayIntake(state, date) {
  return sumMacros(entriesOn(state, date));
}

export function dayGoals(state, date) {
  const kcal = dayTarget(state, date);
  const protein = proteinTarget(state.profile);
  return { kcal, protein, ...flexibleMacros(kcal, protein) };
}

/**
 * Resumen semanal (lunes–domingo). Media y balance solo cuentan días ya
 * cerrados con algo registrado (no hoy, que sigue en curso), para no
 * confundir "no apunté" o "aún no he cenado" con "comí poco".
 */
export function weekSummary(state, today) {
  const days = weekDays(today).map((date) => {
    const intake = dayIntake(state, date);
    const logged = entriesOn(state, date).length > 0;
    return { date, target: dayTarget(state, date), intake, logged, future: date > today };
  });
  const logged = days.filter((d) => d.logged && d.date < today);
  const consumed = logged.reduce((s, d) => s + d.intake.kcal, 0);
  const targetLogged = logged.reduce((s, d) => s + d.target, 0);
  const weekTarget = days.reduce((s, d) => s + d.target, 0);
  const avg = logged.length ? consumed / logged.length : 0;
  const avgTarget = logged.length ? targetLogged / logged.length : weekTarget / 7;
  // Lo que queda para cerrar la semana en objetivo (días sin registrar
  // del pasado se asumen en objetivo).
  const pastUnlogged = days.filter((d) => !d.logged && d.date < today);
  const assumed = pastUnlogged.reduce((s, d) => s + d.target, 0);
  const remainingDays = days.filter((d) => d.date >= today);
  const remainingBudget = weekTarget - consumed - assumed;
  const perRemainingDay = remainingDays.length ? remainingBudget / remainingDays.length : 0;
  return {
    days,
    loggedCount: logged.length,
    consumed,
    targetLogged,
    balance: consumed - targetLogged, // negativo = por debajo del objetivo (déficit extra)
    avg: Math.round(avg),
    avgTarget: Math.round(avgTarget),
    weekTarget,
    perRemainingDay: Math.round(perRemainingDay),
    remainingDays: remainingDays.length,
  };
}
