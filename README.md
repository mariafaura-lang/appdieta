# Táper · lotes y calorías

App web (mobile-first, en español) para perder peso de forma sostenible cuando cocinas por lotes el fin de semana y comes de táperes congelados entre semana.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # lógica de cálculo (vitest)
npm run build    # estático en dist/, sirve en cualquier hosting (GitHub Pages, Netlify…)
```

Los datos se guardan en `localStorage` del navegador (con exportar/importar copia en *Ajustes*). Instalable como PWA y usable sin conexión.

## Funciones

| # | Función | Dónde |
|---|---------|-------|
| 1 | **Calculadora de lote**: ingredientes con buscador (sin tildes), gramos y valores por 100 g editables; kcal, proteína, hidratos y grasa por táper; modo *Pesando* (peso de la olla + peso de cada táper) para táperes desiguales | Cocinar → Calculadora |
| 2 | **Recetario de táperes**: 18 recetas por lote con macros por táper, filtros (kcal, proteína, vegetariana, tiempo, coste, congela bien, mías), escalado, valoración, aviso de qué congela bien/regular/no; «Cocinar» la manda a la calculadora; guarda tus recetas | Cocinar → Recetas |
| 3 | **Congelador**: los lotes entran con fecha; cuántos quedan, avisos a partir de 60 días, gestión (fecha, quitar sin registrar, añadir táperes que ya tenías) | Congelador |
| 4 | **Registro rápido**: un toque = 1 táper (descuenta del inventario; deshacer lo devuelve), extras (fruta, pan, café, picoteo…), comidas fuera por tamaño, entrada libre, hoy/ayer | Botón ＋ y pantalla Hoy |
| 5 | **Objetivo**: Mifflin-St Jeor × actividad, déficit moderado 300–500 kcal, mínimo seguro; balance del día y de la semana (prioritario), con kcal/día para cerrar la semana | Hoy, Ajustes |
| 6 | **Macros**: proteína por g/kg con barra; hidratos y grasa visibles pero flexibles | Hoy |
| 7 | **Ejercicio**: registro manual; devolución configurable (% de kcal); objetivo variable entreno/descanso con la misma media semanal; capa de sincronización preparada para Apple Salud y Health Connect | Ajustes, ＋ → Entreno |
| 8 | **Seguimiento**: peso con media móvil de 7 días y tendencia semanal; pasos diarios; gráficas | Progreso |
| 9 | **Plan del finde**: según congelador y objetivo, propone recetas y raciones priorizando ingredientes compartidos, variedad de proteína y valoración; lista de la compra por pasillos, compartible | Cocinar → Plan finde |
| 10 | **Recordatorios y avisos suaves**: pesarse (aviso en Hoy + notificación opcional), proteína pendiente, táperes que se acaban, lotes antiguos; descartables y sin culpa | Hoy, Ajustes |

## Estructura

```
src/
  data/       foods.js (≈120 alimentos /100 g + €/kg), recipes.js, extras.js
  lib/        cálculo puro y testeado: nutrition, energy, targets, inventory,
              stats, planner, nudges, health (sincronización), dates
  screens/    Today, Freezer, Cook (RecipeBook, Calculator, Planner), Progress, Profile
  components/ ui, QuickLog, Summary, Charts, FoodSearch, WorkoutSheet, Nudges, Reminders
  store.jsx   estado único versionado + migración + acciones
tests/        vitest
```

Sincronización con salud: ver [docs/salud.md](docs/salud.md).

> Las cifras son estimaciones orientativas. Ante cualquier condición médica, consulta con un profesional sanitario.
