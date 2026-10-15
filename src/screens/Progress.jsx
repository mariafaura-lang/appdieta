import { useState } from 'react';
import { useStore } from '../store.jsx';
import { movingAverage, weeklyTrend, stepsSeries, average } from '../lib/stats.js';
import { iso, addDays, fmtShort, fmtRelative } from '../lib/dates.js';
import { WORKOUT_TYPES } from '../lib/health.js';
import { WeightChart, StepsChart } from '../components/Charts.jsx';
import { WorkoutSheet } from '../components/WorkoutSheet.jsx';
import { Seg, NumInput, useToast, fmt } from '../components/ui.jsx';

const kg = (n) => n.toFixed(1).replace('.', ',');

export default function Progress() {
  const { state, update } = useStore();
  const toast = useToast();
  const today = iso();
  const [range, setRange] = useState(30);
  const todayWeight = state.weights.find((w) => w.date === today);
  const [w, setW] = useState(todayWeight?.kg ?? '');
  const todaySteps = state.steps.find((s) => s.date === today);
  const [steps, setSteps] = useState(todaySteps?.steps ?? '');
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const ma = movingAverage(state.weights);
  const last = ma.at(-1);
  const trend = weeklyTrend(state.weights);
  const first = ma[0];
  const from = range === 0 ? (first?.date || addDays(today, -30)) : addDays(today, -range + 1);
  const stepsData = stepsSeries(state.steps, today, 14);
  const recentWorkouts = [...state.workouts].filter((x) => x.date >= addDays(today, -13)).sort((a, b) => b.date.localeCompare(a.date));

  const saveWeight = () => {
    const v = Number(w);
    if (!v) return;
    update((s) => {
      s.weights = s.weights.filter((x) => x.date !== today);
      s.weights.push({ date: today, kg: v });
      s.profile.weightKg = Math.round(movingAverage(s.weights).at(-1).avg * 10) / 10;
    });
    toast(`⚖️ ${kg(v)} kg apuntado. Gracias por el dato.`);
  };

  const trendText =
    trend == null
      ? 'Con una semana de pesajes verás la tendencia.'
      : Math.abs(trend) < 0.05
        ? 'Estable esta semana.'
        : trend < 0
          ? `Bajando ${kg(-trend)} kg/semana`
          : `Subiendo ${kg(trend)} kg/semana — normal que fluctúe; mira 2–3 semanas.`;

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Progreso</h1>
          <div className="sub">Peso, pasos y entrenos</div>
        </div>
      </header>

      <div className="stack">
        <section className="card stack">
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="hero-number">{last ? kg(last.avg) : '—'}</div>
              <div className="hero-label">kg · media de 7 días</div>
            </div>
            <div className="small" style={{ textAlign: 'right', maxWidth: '55%', color: 'var(--text-2)' }}>{trendText}</div>
          </div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); saveWeight(); }}>
            <NumInput aria-label="Peso de hoy en kg" value={w} onChange={setW} step="0.1" placeholder={last ? kg(last.kg) : 'kg'} />
            <button className="btn primary" style={{ flex: 'none' }} disabled={!w}>{todayWeight ? 'Actualizar' : 'Apuntar hoy'}</button>
          </form>
          <Seg value={range} onChange={setRange} options={[{ value: 30, label: '30 días' }, { value: 90, label: '90 días' }, { value: 0, label: 'Todo' }]} />
          <WeightChart data={ma} from={from} to={today} />
          {first && last && first.date !== last.date && (
            <p className="small muted num">Desde el {fmtShort(first.date)}: {kg(last.avg - first.avg)} kg en la media.</p>
          )}
          {ma.length > 0 && (
            <details>
              <summary className="small muted">Ver y editar pesajes</summary>
              <div className="list">
                {[...ma].reverse().slice(0, 30).map((d) => (
                  <div key={d.date} className="list-item small num">
                    <span className="grow">{fmtShort(d.date)} · <b>{kg(d.kg)} kg</b> <span className="muted">(media {kg(d.avg)})</span></span>
                    <button className="btn sm ghost danger" onClick={() => update((s) => { s.weights = s.weights.filter((x) => x.date !== d.date); })}>Borrar</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="card stack">
          <div className="row between">
            <h2>Pasos</h2>
            <span className="small muted num">media 7 días: {fmt(average(stepsData.slice(-7).map((d) => d.steps)))}</span>
          </div>
          <form className="row" onSubmit={(e) => {
            e.preventDefault();
            const v = Number(steps);
            if (!v && v !== 0) return;
            update((s) => { s.steps = s.steps.filter((x) => x.date !== today); s.steps.push({ date: today, steps: v, source: 'manual' }); });
            toast(`👟 ${fmt(v)} pasos apuntados`);
          }}>
            <NumInput aria-label="Pasos de hoy" value={steps} onChange={setSteps} step="1" placeholder="pasos de hoy" />
            <button className="btn primary" style={{ flex: 'none' }} disabled={steps === ''}>{todaySteps ? 'Actualizar' : 'Apuntar'}</button>
          </form>
          <StepsChart data={stepsData} />
        </section>

        <section className="card stack">
          <div className="row between">
            <h2>Entrenos (14 días)</h2>
            <button className="btn sm soft" onClick={() => setWorkoutOpen(true)}>＋ Entreno</button>
          </div>
          {recentWorkouts.length === 0 ? (
            <p className="small muted">Sin entrenos registrados. Apunta las kcal que te da tu otra app y se devuelve el {state.settings.exerciseReturnPct} % a tu objetivo de ese día.</p>
          ) : (
            <div className="list">
              {recentWorkouts.map((x) => {
                const t = WORKOUT_TYPES.find((k) => k.id === x.type) || WORKOUT_TYPES.at(-1);
                return (
                  <div key={x.id} className="list-item">
                    <span className="emoji">{t.emoji}</span>
                    <span className="grow small">
                      <b>{t.label}</b> · {x.minutes} min
                      <div className="tiny muted num">{fmtRelative(x.date, today)} · {fmt(x.kcal)} kcal · +{fmt((x.kcal * state.settings.exerciseReturnPct) / 100)} al objetivo{x.source !== 'manual' ? ` · ${x.source}` : ''}</div>
                    </span>
                    <button className="icon-btn" aria-label="Borrar entreno" onClick={() => {
                      const copy = { ...x };
                      update((s) => { s.workouts = s.workouts.filter((k) => k.id !== x.id); });
                      toast('Entreno borrado', () => update((s) => { s.workouts.push(copy); }));
                    }}>🗑</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <WorkoutSheet open={workoutOpen} onClose={() => setWorkoutOpen(false)} />
    </>
  );
}
