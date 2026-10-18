import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { isProfileComplete } from './lib/energy.js';
import Today from './screens/Today.jsx';
import Casa from './screens/Freezer.jsx';
import Recetario from './screens/Recetario.jsx';
import Calendario from './screens/Calendario.jsx';
import Progress from './screens/Progress.jsx';
import Profile from './screens/Profile.jsx';
import { QuickLogSheet } from './components/QuickLog.jsx';
import { useWeightReminder } from './components/Reminders.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '☀️' },
  { id: 'casa', label: 'Casa', icon: '🏠' },
  { id: 'recetario', label: 'Recetario', icon: '📖' },
  { id: 'calendario', label: 'Calendario', icon: '📅' },
  { id: 'progreso', label: 'Progreso', icon: '📈' },
];
const OLD_TABS = { congelador: 'casa', cocinar: 'recetario' };

export default function App() {
  const { state, update } = useStore();
  const [tab, setTab] = useState(() => { const h = location.hash.slice(1) || 'hoy'; return OLD_TABS[h] || h; });
  const [recSub, setRecSub] = useState('recetas');
  const [calSub, setCalSub] = useState('menu');
  const [quickOpen, setQuickOpen] = useState(false);
  useWeightReminder();

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab, recSub, calSub]);

  const go = (to) => {
    if (to === 'registrar') return setQuickOpen(true);
    if (to === 'nevera') {
      try { sessionStorage.setItem('casa-sec', 'nevera'); } catch { /* sin almacenamiento */ }
      return setTab('casa');
    }
    if (to === 'recetas' || to === 'calculadora') { setRecSub(to); return setTab('recetario'); }
    if (to === 'menu' || to === 'plan') { setCalSub(to); return setTab('calendario'); }
    setTab(OLD_TABS[to] || to);
  };

  if (!state.profile.onboarded || !isProfileComplete(state.profile)) {
    return (
      <main className="app" style={{ paddingBottom: 32 }}>
        <Profile welcome onDone={() => update((s) => { s.profile.onboarded = true; })} />
      </main>
    );
  }

  return (
    <>
      <main className="app">
        {tab === 'hoy' && <Today go={go} />}
        {tab === 'casa' && <Casa go={go} />}
        {tab === 'recetario' && <Recetario sub={recSub} go={go} />}
        {tab === 'calendario' && <Calendario sub={calSub} go={go} />}
        {tab === 'progreso' && <Progress go={go} />}
        {tab === 'perfil' && <Profile />}
      </main>
      <nav className="nav" aria-label="Secciones">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'on' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              <span className="i" aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <button className="fab" aria-label="Registrar comida" onClick={() => setQuickOpen(true)}>＋</button>
      <QuickLogSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}
