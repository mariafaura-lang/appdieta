import { useStore } from '../store.jsx';
import { dayGoals, dayIntake, weekSummary, exerciseReturn, plannedTarget } from '../lib/targets.js';
import { DOW_SHORT, iso } from '../lib/dates.js';
import { Meter, fmt, signed } from './ui.jsx';

export function WeekCard({ today = iso() }) {
  const { state } = useStore();
  const w = weekSummary(state, today);
  const max = Math.max(...w.days.map((d) => Math.max(d.target, d.intake.kcal)), 1);
  const balanceText =
    w.loggedCount === 0
      ? 'La media aparece en cuanto cierres el primer día registrado de la semana.'
      : Math.abs(w.balance) < 100
        ? 'Vas justo en el objetivo.'
        : w.balance < 0
          ? `${fmt(-w.balance)} kcal por debajo del objetivo`
          : `${fmt(w.balance)} kcal por encima; se compensa sin prisa`;
  return (
    <section className="card" aria-label="Balance semanal">
      <div className="row between">
        <h2>Esta semana</h2>
        <span className="small muted">{w.loggedCount} {w.loggedCount === 1 ? 'día cerrado' : 'días cerrados'}</span>
      </div>
      <div className="hero" style={{ marginTop: 10 }}>
        <div>
          <div className="hero-number">{w.loggedCount ? fmt(w.avg) : '—'}</div>
          <div className="hero-label">media kcal/día · objetivo {fmt(w.avgTarget)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="bold num" style={{ fontSize: '1.2rem' }}>{fmt(w.perRemainingDay)}</div>
          <div className="hero-label small">kcal/día hasta el domingo</div>
        </div>
      </div>
      <p className="small" style={{ marginTop: 8, color: 'var(--text-2)' }}>{balanceText}</p>
      <div className="week-strip" aria-hidden="true">
        {w.days.map((d, i) => {
          const h = (d.intake.kcal / max) * 100;
          const t = (d.target / max) * 100;
          return (
            <div key={d.date} className={`week-day${d.date === today ? ' today' : ''}`} title={`${fmt(d.intake.kcal)} / ${fmt(d.target)} kcal`}>
              <div className="week-bar">
                <span className={d.intake.kcal > d.target * 1.05 ? 'over' : ''} style={{ height: `${h}%` }} />
                <i style={{ bottom: `${t}%` }} />
              </div>
              {DOW_SHORT[i]}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DayCard({ date = iso() }) {
  const { state } = useStore();
  const goals = dayGoals(state, date);
  const intake = dayIntake(state, date);
  const left = goals.kcal - intake.kcal;
  const back = exerciseReturn(state, date);
  const planned = plannedTarget(state, date);
  return (
    <section className="card" aria-label="Hoy">
      <div className="hero">
        <div>
          <div className="hero-number">{fmt(Math.abs(left))}</div>
          <div className="hero-label">{left >= 0 ? 'kcal disponibles hoy' : 'kcal por encima hoy'}</div>
        </div>
        <div className="small muted num" style={{ textAlign: 'right' }}>
          objetivo {fmt(goals.kcal)}
          {back > 0 && <div>({fmt(planned)} {signed(back)} ejercicio)</div>}
        </div>
      </div>
      <div className="stack" style={{ marginTop: 14, gap: 14 }}>
        <Meter label="Calorías" value={intake.kcal} max={goals.kcal} unit="kcal" />
        <Meter label="Proteína" value={intake.p} max={goals.protein} unit="g" kind="protein" />
        <p className="small muted">
          Hidratos <b className="num" style={{ color: 'var(--text-2)' }}>{Math.round(intake.c)} g</b> · Grasa{' '}
          <b className="num" style={{ color: 'var(--text-2)' }}>{Math.round(intake.f)} g</b> — flexibles mientras cuadren las calorías
          (referencia ~{goals.carbs} g / ~{goals.fat} g).
        </p>
      </div>
    </section>
  );
}
