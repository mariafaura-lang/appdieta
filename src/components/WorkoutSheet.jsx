import { useState } from 'react';
import { useStore } from '../store.jsx';
import { WORKOUT_TYPES, estimateWorkoutKcal } from '../lib/health.js';
import { uid } from '../lib/inventory.js';
import { iso, addDays } from '../lib/dates.js';
import { Sheet, Seg, Field, NumInput, useToast } from './ui.jsx';

const DURATIONS = [20, 30, 45, 60, 90];

export function WorkoutSheet({ open, onClose }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [type, setType] = useState('fuerza');
  const [minutes, setMinutes] = useState(45);
  const [kcal, setKcal] = useState('');
  const [day, setDay] = useState('hoy');
  const estimate = estimateWorkoutKcal(type, minutes, state.profile.weightKg);
  const pct = state.settings.exerciseReturnPct;
  const value = kcal === '' ? estimate : Number(kcal);

  return (
    <Sheet open={open} onClose={onClose} title="Entreno">
      <div className="stack">
        <Seg value={day} onChange={setDay} options={[{ value: 'hoy', label: 'Hoy' }, { value: 'ayer', label: 'Ayer' }]} />
        <div className="chips wrap">
          {WORKOUT_TYPES.map((t) => (
            <button key={t.id} className={`chip${type === t.id ? ' on' : ''}`} onClick={() => setType(t.id)}>{t.emoji} {t.label}</button>
          ))}
        </div>
        <div className="field">
          <span>Duración</span>
          <div className="chips">
            {DURATIONS.map((d) => (
              <button key={d} className={`chip${minutes === d ? ' on' : ''}`} onClick={() => setMinutes(d)}>{d} min</button>
            ))}
            <NumInput aria-label="Minutos" value={minutes} onChange={setMinutes} style={{ width: 80, minHeight: 36, padding: '4px 8px' }} />
          </div>
        </div>
        <Field label={`kcal activas (de tu reloj o app; estimación: ${estimate})`}>
          <NumInput value={kcal} onChange={setKcal} placeholder={String(estimate)} />
        </Field>
        <p className="small muted">Se suman {Math.round((value * pct) / 100)} kcal a tu objetivo de ese día ({pct} %).</p>
        <button
          className="btn primary block"
          onClick={() => {
            const id = uid();
            const date = day === 'hoy' ? iso() : addDays(iso(), -1);
            update((s) => { s.workouts.push({ id, date, type, minutes: Number(minutes) || 0, kcal: value, source: 'manual' }); });
            onClose();
            setKcal('');
            toast(`${WORKOUT_TYPES.find((t) => t.id === type).emoji} Entreno guardado · +${Math.round((value * pct) / 100)} kcal`, () =>
              update((s) => { s.workouts = s.workouts.filter((w) => w.id !== id); }),
            );
          }}
        >
          Guardar entreno
        </button>
      </div>
    </Sheet>
  );
}
