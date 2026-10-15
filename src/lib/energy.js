// Cálculo de gasto energético y objetivos.

export const ACTIVITY_LEVELS = [
  { id: 'sedentario', label: 'Sedentaria', hint: 'Trabajo sentado, < 5.000 pasos', factor: 1.2 },
  { id: 'ligero', label: 'Ligera', hint: '5.000–8.000 pasos o 1–2 entrenos/sem', factor: 1.375 },
  { id: 'moderado', label: 'Moderada', hint: '8.000–11.000 pasos o 3–4 entrenos/sem', factor: 1.55 },
  { id: 'alto', label: 'Alta', hint: 'Trabajo físico o 5+ entrenos/sem', factor: 1.725 },
];

/** Metabolismo basal (Mifflin-St Jeor). */
export function bmr({ sex, age, heightCm, weightKg }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'h' ? base + 5 : base - 161;
}

export function tdee(profile) {
  const lvl = ACTIVITY_LEVELS.find((l) => l.id === profile.activity) || ACTIVITY_LEVELS[0];
  return bmr(profile) * lvl.factor;
}

export const MIN_KCAL = { h: 1500, m: 1200 };

/**
 * Objetivo diario: gasto − déficit (300–500), sin bajar del mínimo seguro.
 */
export function dailyTarget(profile) {
  const deficit = Math.min(500, Math.max(300, Number(profile.deficit) || 400));
  const t = tdee(profile) - deficit;
  return Math.round(Math.max(MIN_KCAL[profile.sex] || 1200, t) / 10) * 10;
}

/** Proteína: g/kg de peso corporal (1,6 por defecto, rango útil 1,2–2,2). */
export function proteinTarget(profile) {
  const gkg = Number(profile.proteinPerKg) || 1.6;
  return Math.round(profile.weightKg * gkg);
}

/** Referencia orientativa (no obligatoria) de grasa e hidratos. */
export function flexibleMacros(kcal, proteinG) {
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.max(0, Math.round((kcal - proteinG * 4 - fat * 9) / 4));
  return { fat, carbs };
}

export function isProfileComplete(p) {
  return p && p.age > 0 && p.heightCm > 0 && p.weightKg > 0 && p.sex;
}
