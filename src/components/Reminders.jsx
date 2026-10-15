import { useEffect } from 'react';
import { useStore } from '../store.jsx';
import { iso } from '../lib/dates.js';
import { Field } from './ui.jsx';

const supportsNotif = () => typeof window !== 'undefined' && 'Notification' in window;

async function notify(title, body) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: 'icon.svg', tag: 'peso' });
    new Notification(title, { body, icon: 'icon.svg' });
  } catch {
    /* sin notificaciones: queda el aviso dentro de la app */
  }
}

/**
 * Recordatorio de peso. En web solo es fiable con la app abierta o en segundo
 * plano reciente: programa un aviso para la hora elegida y, al volver a la app,
 * lanza el de hoy si aún no se ha mostrado. El aviso dentro de la app (Hoy)
 * funciona siempre.
 */
export function useWeightReminder() {
  const { state, update } = useStore();
  const { weightReminder, notifications, reminderHour } = state.settings;
  const weighedToday = state.weights.some((w) => w.date === iso());
  const notifiedToday = state.dismissed?.[`notif-peso:${iso()}`];

  useEffect(() => {
    if (!weightReminder || !notifications || weighedToday || notifiedToday) return;
    if (!supportsNotif() || Notification.permission !== 'granted') return;
    const fire = () => {
      notify('¿Te pesas hoy?', 'Un dato rápido en ayunas. Lo importante es la media semanal. 🌿');
      update((s) => { s.dismissed[`notif-peso:${iso()}`] = true; });
    };
    const at = new Date();
    at.setHours(Number(reminderHour) || 9, 0, 0, 0);
    const ms = at - new Date();
    if (ms <= 0) {
      fire();
      return;
    }
    const t = setTimeout(fire, ms);
    return () => clearTimeout(t);
  }, [weightReminder, notifications, reminderHour, weighedToday, notifiedToday, update]);
}

export function ReminderSettings() {
  const { state, update } = useStore();
  const s = state.settings;
  const perm = supportsNotif() ? Notification.permission : 'unsupported';
  return (
    <section className="card stack">
      <h2>Recordatorios</h2>
      <label className="toggle">
        <span className="small bold">Recordarme pesarme</span>
        <input type="checkbox" checked={s.weightReminder} onChange={(e) => update((x) => { x.settings.weightReminder = e.target.checked; })} />
      </label>
      {s.weightReminder && (
        <>
          <Field label="A partir de las">
            <select value={s.reminderHour} onChange={(e) => update((x) => { x.settings.reminderHour = Number(e.target.value); })}>
              {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </Field>
          <label className="toggle">
            <span className="small">
              <b>Notificación del sistema</b>
              <div className="tiny muted">
                {perm === 'unsupported' ? 'Este navegador no las admite; verás el aviso en Hoy.' : perm === 'denied' ? 'Bloqueadas en el navegador. Actívalas en los ajustes del sitio.' : 'Llega si la app está abierta o instalada. En iPhone, añádela a la pantalla de inicio.'}
              </div>
            </span>
            <input
              type="checkbox"
              disabled={perm === 'unsupported' || perm === 'denied'}
              checked={s.notifications && perm === 'granted'}
              onChange={async (e) => {
                const on = e.target.checked;
                if (on && Notification.permission !== 'granted') {
                  const r = await Notification.requestPermission();
                  if (r !== 'granted') return;
                }
                update((x) => { x.settings.notifications = on; });
              }}
            />
          </label>
        </>
      )}
      <p className="tiny muted">Los avisos de Hoy (proteína, táperes que se acaban, lotes antiguos) son suaves y se pueden descartar.</p>
    </section>
  );
}
