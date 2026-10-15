import { useState } from 'react';
import { useStore } from '../store.jsx';
import { dailyTarget } from '../lib/energy.js';
import { plannedTarget } from '../lib/targets.js';
import { weekDays, iso, DOW_SHORT } from '../lib/dates.js';
import { PROVIDERS, applySync } from '../lib/health.js';
import { useToast, fmt } from '../components/ui.jsx';

export function ExerciseSettings() {
  const { state, update } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const s = state.settings;
  const set = (k, v) => update((x) => { x.settings[k] = v; });
  const week = weekDays(iso());
  const base = state.profile.weightKg ? dailyTarget(state.profile) : 0;

  return (
    <section className="card stack">
      <h2>Ejercicio</h2>
      <div className="field">
        <span>Devolver el {s.exerciseReturnPct} % de las kcal quemadas en entrenos</span>
        <input className="range" type="range" min={0} max={100} step={10} value={s.exerciseReturnPct} onChange={(e) => set('exerciseReturnPct', Number(e.target.value))} />
        <span className="tiny muted" style={{ fontWeight: 400 }}>Los relojes suelen sobreestimar; devolver el 30–50 % es prudente.</span>
      </div>

      <label className="toggle">
        <span className="small">
          <b>Objetivo según entreno o descanso</b>
          <div className="tiny muted">Más kcal los días de entreno, menos los de descanso. La media semanal no cambia.</div>
        </span>
        <input type="checkbox" checked={s.cycling} onChange={(e) => set('cycling', e.target.checked)} />
      </label>

      {s.cycling && (
        <>
          <div className="field">
            <span>Días de entreno</span>
            <div className="grid4" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {DOW_SHORT.map((d, i) => {
                const on = s.trainingDays.includes(i);
                return (
                  <button key={d} className={`chip${on ? ' on' : ''}`} style={{ padding: 0 }} aria-pressed={on}
                    onClick={() => set('trainingDays', on ? s.trainingDays.filter((x) => x !== i) : [...s.trainingDays, i].sort())}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="field">
            <span>Extra en días de entreno: +{s.trainingBonus} kcal</span>
            <input className="range" type="range" min={100} max={400} step={50} value={s.trainingBonus} onChange={(e) => set('trainingBonus', Number(e.target.value))} />
          </div>
          {base > 0 && (
            <div className="grid4" style={{ gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
              {week.map((d, i) => (
                <div key={d} className="tiny">
                  <div className="muted">{DOW_SHORT[i]}</div>
                  <b className="num">{fmt(plannedTarget(state, d))}</b>
                </div>
              ))}
            </div>
          )}
          {base > 0 && <p className="tiny muted">Media semanal: {fmt(week.reduce((a, d) => a + plannedTarget(state, d), 0) / 7)} kcal (igual que tu objetivo de {fmt(base)}).</p>}
        </>
      )}

      <div className="field">
        <span>Sincronizar entrenos y pasos</span>
        <div className="stack" style={{ gap: 6 }}>
          {PROVIDERS.map((p) => {
            const avail = p.available();
            const on = state.health.provider === p.id;
            return (
              <button key={p.id} className={`btn ${on ? 'soft' : ''}`} style={{ justifyContent: 'space-between', textAlign: 'left' }} disabled={!avail}
                onClick={async () => {
                  try {
                    setBusy(true);
                    await p.connect();
                    const data = await p.pull(state.health.lastSync || '2000-01-01');
                    update((x) => { x.health.provider = p.id; applySync(x, data); });
                  } catch {
                    toast('No se pudo conectar');
                  } finally {
                    setBusy(false);
                  }
                }}>
                <span>{p.label}</span>
                <span className="tiny muted" style={{ fontWeight: 400 }}>{on ? 'activo' : avail ? 'conectar' : 'próximamente'}</span>
              </button>
            );
          })}
        </div>
        <span className="tiny muted" style={{ fontWeight: 400 }}>
          Apple Salud y Health Connect necesitan la app nativa (la estructura ya está preparada). En la web, apunta el entreno a mano: un toque en «Entreno».{busy ? ' Sincronizando…' : ''}
        </span>
      </div>
    </section>
  );
}
