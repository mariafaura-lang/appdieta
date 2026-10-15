import { iso, dayOfWeek } from './dates.js';
import { dayIntake, dayGoals, entriesOn, weekSummary } from './targets.js';
import { byAge, remaining, totalRemaining, ageDays, OLD_AFTER_DAYS } from './inventory.js';

/**
 * Avisos suaves para la pantalla de Hoy. Sin juicios: siempre en positivo,
 * con una acción concreta y descartables por día.
 */
export function computeNudges(state, now = new Date()) {
  const today = iso(now);
  const hour = now.getHours();
  const out = [];
  const s = state.settings;

  if (s.weightReminder && hour >= (Number(s.reminderHour) || 0) && !state.weights.some((w) => w.date === today)) {
    out.push({
      id: 'peso',
      icon: '⚖️',
      text: '¿Te pesas hoy? Mejor en ayunas y tras ir al baño. Es solo un dato: lo que cuenta es la media de 7 días.',
      action: { label: 'Apuntar peso', to: 'progreso' },
    });
  }

  const entries = entriesOn(state, today);
  if (hour >= 15 && entries.length === 0) {
    out.push({ id: 'sin-registro', icon: '🥡', text: '¿Has comido ya? Un toque en el táper y queda apuntado.', action: { label: 'Registrar', to: 'registrar' } });
  }

  const goals = dayGoals(state, today);
  const intake = dayIntake(state, today);
  const missingP = goals.protein - intake.p;
  if (hour >= 16 && entries.length > 0 && missingP > goals.protein * 0.3) {
    const best = byAge(state)
      .map((b) => ({ b, p: remaining(b)[0].p }))
      .sort((a, b) => b.p - a.p)[0];
    const idea = best && best.p >= 20 ? `un táper de ${best.b.name} (${Math.round(best.p)} g)` : 'un yogur proteico (16 g) o un par de huevos (14 g)';
    out.push({ id: 'proteina', icon: '💪', text: `Te faltan unos ${Math.round(missingP)} g de proteína. Idea: ${idea}.` });
  }

  const stock = totalRemaining(state);
  const perDay = Number(s.tuppersPerDay) || 2;
  const dow = dayOfWeek(today);
  if (stock < perDay * 3 && dow >= 3) {
    out.push({
      id: 'stock',
      icon: '🧊',
      text: stock === 0 ? 'El congelador está vacío. ¿Planeamos qué cocinar este finde?' : `Quedan ${stock} táperes. ¿Planeamos qué cocinar este finde?`,
      action: { label: 'Plan finde', to: 'plan' },
    });
  }

  const oldest = byAge(state)[0];
  if (oldest && ageDays(oldest, today) >= OLD_AFTER_DAYS) {
    out.push({
      id: `antiguo-${oldest.id}`,
      icon: '⏳',
      text: `${oldest.name} lleva ${ageDays(oldest, today)} días congelado: buen candidato para esta semana.`,
      action: { label: 'Ver congelador', to: 'congelador' },
    });
  }

  const w = weekSummary(state, today);
  if (w.loggedCount >= 3 && w.balance > 600 && w.remainingDays > 1) {
    out.push({
      id: 'semana',
      icon: '🌿',
      text: `La semana va algo por encima. Sin dramas: con unas ${Math.round(w.balance / w.remainingDays / 10) * 10} kcal menos al día lo equilibras, o simplemente sigue y mira la tendencia.`,
    });
  }

  return out.filter((n) => !state.dismissed?.[`${n.id}:${today}`]);
}
