import { useRef } from 'react';
import { useStore } from '../store.jsx';
import { ACTIVITY_LEVELS, bmr, tdee, dailyTarget, proteinTarget, isProfileComplete, MIN_KCAL } from '../lib/energy.js';
import { Seg, Field, NumInput, Stepper, useToast, fmt } from '../components/ui.jsx';
import { iso } from '../lib/dates.js';
import { ExerciseSettings } from './ExerciseSettings.jsx';
import { ReminderSettings } from '../components/Reminders.jsx';

export default function Profile({ welcome, onDone }) {
  const { state, update, replace } = useStore();
  const toast = useToast();
  const fileRef = useRef();
  const p = state.profile;
  const set = (k) => (v) => update((s) => { s.profile[k] = v; });
  const complete = isProfileComplete(p);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>{welcome ? '¡Hola! 👋' : 'Objetivo y ajustes'}</h1>
          <div className="sub">{welcome ? 'Cuatro datos y calculo tu objetivo. Puedes cambiarlos cuando quieras.' : 'Tus datos se guardan solo en este dispositivo.'}</div>
        </div>
      </header>

      <div className="stack">
        <section className="card stack">
          <h2>Tus datos</h2>
          <Seg value={p.sex} onChange={set('sex')} options={[{ value: 'm', label: 'Mujer' }, { value: 'h', label: 'Hombre' }]} />
          <div className="grid3">
            <Field label="Edad"><NumInput value={p.age} onChange={set('age')} placeholder="años" /></Field>
            <Field label="Altura (cm)"><NumInput value={p.heightCm} onChange={set('heightCm')} placeholder="165" /></Field>
            <Field label="Peso (kg)"><NumInput value={p.weightKg} onChange={set('weightKg')} placeholder="70" /></Field>
          </div>
          <div className="field">
            <span>Actividad diaria (sin contar entrenos que registres aparte)</span>
            <div className="stack" style={{ gap: 6 }}>
              {ACTIVITY_LEVELS.map((l) => (
                <button key={l.id} className={`btn ${p.activity === l.id ? 'soft' : ''}`} style={{ justifyContent: 'space-between', textAlign: 'left' }} onClick={() => set('activity')(l.id)} aria-pressed={p.activity === l.id}>
                  <span>{l.label}</span>
                  <span className="tiny muted" style={{ fontWeight: 400 }}>{l.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card stack">
          <h2>Déficit y proteína</h2>
          <Field label={`Déficit diario: ${p.deficit} kcal (moderado)`}>
            <input className="range" type="range" min={300} max={500} step={50} value={p.deficit} onChange={(e) => set('deficit')(Number(e.target.value))} />
          </Field>
          <Field label={`Proteína: ${p.proteinPerKg} g por kg de peso`}>
            <input className="range" type="range" min={1.2} max={2.2} step={0.1} value={p.proteinPerKg} onChange={(e) => set('proteinPerKg')(Number(e.target.value))} />
          </Field>
          <p className="tiny muted">1,6 g/kg ayuda a conservar músculo mientras pierdes grasa. Si tienes mucho peso que perder, puedes bajar a 1,2–1,4.</p>
        </section>

        {complete && (
          <section className="card tinted stack">
            <h2>Tu objetivo</h2>
            <div className="grid2">
              <div>
                <div className="hero-number" style={{ fontSize: '2rem' }}>{fmt(dailyTarget(p))}</div>
                <div className="hero-label">kcal/día de media</div>
              </div>
              <div>
                <div className="hero-number" style={{ fontSize: '2rem', color: 'var(--protein)' }}>{proteinTarget(p)} g</div>
                <div className="hero-label">proteína/día</div>
              </div>
            </div>
            <p className="small">
              Basal ≈ {fmt(bmr(p))} kcal · gasto diario ≈ <b>{fmt(tdee(p))} kcal</b>. Con {fmt(tdee(p) - dailyTarget(p))} kcal de déficit, el ritmo esperado ronda los{' '}
              <b>{((Math.max(0, tdee(p) - dailyTarget(p)) * 7) / 7700).toFixed(2).replace('.', ',')} kg/semana</b>. Es una estimación: ajústala mirando tu tendencia de peso tras 2–3 semanas.
            </p>
            {dailyTarget(p) === (MIN_KCAL[p.sex] || 1200) && (
              <p className="small">ℹ️ Hemos limitado el objetivo a {MIN_KCAL[p.sex]} kcal, el mínimo recomendable sin supervisión.</p>
            )}
            {welcome && <button className="btn primary block" onClick={onDone}>Empezar</button>}
          </section>
        )}

        {!welcome && (
          <>
            <section className="card stack">
              <h2>Táperes</h2>
              <div className="row between">
                <span className="small">Táperes que sueles comer al día</span>
                <Stepper value={state.settings.tuppersPerDay} min={1} max={4} onChange={(v) => update((s) => { s.settings.tuppersPerDay = v; })} />
              </div>
            </section>
            <ExerciseSettings />
            <ReminderSettings />
            <section className="card stack">
              <h2>Copia de seguridad</h2>
              <p className="small muted">Los datos viven en este navegador. Exporta una copia de vez en cuando o para pasarlos a otro móvil.</p>
              <div className="grid2">
                <button
                  className="btn"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `taper-copia-${iso()}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  ⬇️ Exportar
                </button>
                <button className="btn" onClick={() => fileRef.current.click()}>⬆️ Importar</button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const data = JSON.parse(await f.text());
                    if (!data || typeof data !== 'object' || !('profile' in data)) throw new Error();
                    const prev = state;
                    replace(data);
                    toast('Copia importada', () => replace(prev));
                  } catch {
                    toast('Ese archivo no parece una copia de Táper');
                  }
                  e.target.value = '';
                }}
              />
              <button
                className="btn ghost danger"
                onClick={() => {
                  if (confirm('¿Borrar todos los datos de este dispositivo? Exporta antes una copia si la quieres conservar.')) {
                    const prev = state;
                    replace({});
                    toast('Datos borrados', () => replace(prev));
                  }
                }}
              >
                Borrar todos los datos
              </button>
            </section>
          </>
        )}
      </div>
    </>
  );
}
