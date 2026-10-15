# Sincronización con Apple Salud y Health Connect

Un navegador no puede leer Apple Salud (HealthKit) ni Health Connect. Para sincronizar hace falta empaquetar esta web como app nativa (p. ej. con Capacitor) y usar un plugin de salud. La app ya está preparada: `src/lib/health.js` define el formato normalizado, los adaptadores y la fusión sin duplicados.

## Lo que debe exponer la capa nativa

```js
window.TaperNative = {
  health: {
    platform: 'ios' | 'android',
    // Pide permisos de lectura. Devuelve true/false.
    requestPermissions(['workouts', 'steps', 'activeEnergy']): Promise<boolean>,
    // Entrenos desde la fecha ISO dada.
    getWorkouts(sinceIso): Promise<Array<{ id, start, end?, minutes?, type, activeKcal }>>,
    // Pasos agregados por día local.
    getDailySteps(sinceIso): Promise<Array<{ date: 'YYYY-MM-DD', steps }>>,
  },
};
```

- `type` puede venir como `HKWorkoutActivityType…` (iOS) o `EXERCISE_TYPE_…` (Health Connect); se traduce a los tipos de la app y lo desconocido queda como «Otro».
- Cuando existe la pasarela, en *Ajustes → Ejercicio* se activa el proveedor correspondiente; `applySync` une entrenos por `source + externalId` (re-sincronizar no duplica) y en pasos se queda el mayor valor del día.
- Los entrenos sincronizados funcionan igual que los manuales: se devuelve el % configurado de sus kcal al objetivo del día.
