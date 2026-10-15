// Sincronización con datos de salud.
//
// La web no puede leer Apple Salud ni Health Connect directamente: ambos
// requieren una app nativa (p. ej. empaquetando esta web con Capacitor).
// Esta capa define el formato normalizado y los adaptadores; cuando exista
// el envoltorio nativo, solo tiene que exponer `window.TaperNative.health`
// con la interfaz descrita en docs/salud.md y todo lo demás ya funciona.

/**
 * Entreno normalizado.
 * @typedef {{ id: string, date: string, type: string, minutes: number, kcal: number,
 *             source: 'manual'|'apple'|'healthconnect', externalId?: string }} Workout
 * Pasos diarios normalizados.
 * @typedef {{ date: string, steps: number, source: string }} StepsDay
 */

export const WORKOUT_TYPES = [
  { id: 'fuerza', label: 'Fuerza', emoji: '🏋️', met: 5 },
  { id: 'correr', label: 'Correr', emoji: '🏃', met: 9 },
  { id: 'bici', label: 'Bici', emoji: '🚴', met: 7 },
  { id: 'caminar', label: 'Caminar', emoji: '🚶', met: 3.8 },
  { id: 'nadar', label: 'Nadar', emoji: '🏊', met: 7 },
  { id: 'clase', label: 'Clase dirigida', emoji: '🤸', met: 6 },
  { id: 'yoga', label: 'Yoga / pilates', emoji: '🧘', met: 3 },
  { id: 'otro', label: 'Otro', emoji: '⚡', met: 5 },
];

/** Estimación de kcal activas: (MET − 1) × kg × horas (sin el basal). */
export function estimateWorkoutKcal(typeId, minutes, weightKg) {
  const t = WORKOUT_TYPES.find((x) => x.id === typeId) || WORKOUT_TYPES.at(-1);
  return Math.round((t.met - 1) * (Number(weightKg) || 70) * ((Number(minutes) || 0) / 60));
}

// Tipos de Apple HealthKit y Health Connect → nuestros tipos.
const TYPE_MAP = {
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'fuerza',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'fuerza',
  HKWorkoutActivityTypeRunning: 'correr',
  HKWorkoutActivityTypeCycling: 'bici',
  HKWorkoutActivityTypeWalking: 'caminar',
  HKWorkoutActivityTypeSwimming: 'nadar',
  HKWorkoutActivityTypeYoga: 'yoga',
  EXERCISE_TYPE_STRENGTH_TRAINING: 'fuerza',
  EXERCISE_TYPE_WEIGHTLIFTING: 'fuerza',
  EXERCISE_TYPE_RUNNING: 'correr',
  EXERCISE_TYPE_BIKING: 'bici',
  EXERCISE_TYPE_WALKING: 'caminar',
  EXERCISE_TYPE_SWIMMING_POOL: 'nadar',
  EXERCISE_TYPE_YOGA: 'yoga',
  EXERCISE_TYPE_PILATES: 'yoga',
};

/** Convierte un entreno crudo de la pasarela nativa al formato de la app. */
export function normalizeWorkout(raw, source) {
  const start = new Date(raw.start);
  const end = raw.end ? new Date(raw.end) : null;
  const minutes = raw.minutes ?? (end ? Math.round((end - start) / 60000) : 0);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    id: `${source}-${raw.id}`,
    externalId: String(raw.id),
    source,
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    type: TYPE_MAP[raw.type] || 'otro',
    minutes,
    kcal: Math.round(Number(raw.activeKcal ?? raw.kcal ?? 0)),
  };
}

/** Une entrenos sin duplicar: lo sincronizado sustituye a su versión anterior. */
export function mergeWorkouts(existing, incoming) {
  const key = (w) => (w.externalId ? `${w.source}:${w.externalId}` : w.id);
  const map = new Map(existing.map((w) => [key(w), w]));
  for (const w of incoming) map.set(key(w), { ...map.get(key(w)), ...w });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Pasos: por día se queda el mayor valor (el reloj suele contar más que la estimación manual). */
export function mergeSteps(existing, incoming) {
  const map = new Map(existing.map((s) => [s.date, s]));
  for (const s of incoming) {
    const prev = map.get(s.date);
    if (!prev || Number(s.steps) >= Number(prev.steps)) map.set(s.date, s);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function nativeBridge() {
  return typeof window !== 'undefined' ? window.TaperNative?.health : undefined;
}

function nativeProvider(id, label, platform) {
  return {
    id,
    label,
    platform,
    available: () => nativeBridge()?.platform === platform,
    unavailableReason: `Necesita la app instalada en ${platform === 'ios' ? 'iPhone' : 'Android'}. En la versión web registra los entrenos a mano.`,
    async connect() {
      const b = nativeBridge();
      if (!b) throw new Error('Sin pasarela nativa');
      return b.requestPermissions(['workouts', 'steps', 'activeEnergy']);
    },
    async pull(sinceIso) {
      const b = nativeBridge();
      const [workouts, steps] = await Promise.all([b.getWorkouts(sinceIso), b.getDailySteps(sinceIso)]);
      return {
        workouts: workouts.map((w) => normalizeWorkout(w, id)),
        steps: steps.map((s) => ({ date: s.date, steps: Math.round(s.steps), source: id })),
      };
    },
  };
}

export const PROVIDERS = [
  { id: 'manual', label: 'Manual (web)', platform: 'web', available: () => true, connect: async () => true, pull: async () => ({ workouts: [], steps: [] }) },
  nativeProvider('apple', 'Apple Salud', 'ios'),
  nativeProvider('healthconnect', 'Health Connect', 'android'),
];

/** Aplica una sincronización al estado (mutable). */
export function applySync(state, { workouts, steps }) {
  state.workouts = mergeWorkouts(state.workouts || [], workouts);
  state.steps = mergeSteps(state.steps || [], steps);
  state.health.lastSync = new Date().toISOString();
}
