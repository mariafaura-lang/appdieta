import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { isProfileComplete } from './lib/energy.js';
import Today from './screens/Today.jsx';
import Freezer from './screens/Freezer.jsx';
import Cook from './screens/Cook.jsx';
import Progress from './screens/Progress.jsx';
import Profile from './screens/Profile.jsx';
import { QuickLogSheet } from './components/QuickLog.jsx';
import { useWeightReminder } from './components/Reminders.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '☀️' },
  { id: 'congelador', label: 'Congelador', icon: '🧊' },
  { id: 'registrar', label: 'Registrar', icon: '+', plus: true },
  { id: 'cocinar', label: 'Cocinar', icon: '🍳' },
  { id: 'progreso', label: 'Progreso', icon: '📈' },
];

export default function App() {
  const { state, update } = useStore();
  const [tab, setTab] = useState(() => (location.hash.slice(1) || 'hoy'));
  const [cookSub, setCookSub] = useState('recetas');
  const [quickOpen, setQuickOpen] = useState(false);
  useWeightReminder();

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    window.scrollTo(0, 0);
  }, [tab, cookSub]);

  const go = (to) => {
    if (to === 'registrar') return setQuickOpen(true);
    if (to === 'plan' || to === 'calculadora' || to === 'recetas') {
      setCookSub(to);
      return setTab('cocinar');
    }
    setTab(to);
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
        {tab === 'congelador' && <Freezer go={go} />}
        {tab === 'cocinar' && <Cook sub={cookSub} setSub={setCookSub} go={go} />}
        {tab === 'progreso' && <Progress />}
        {tab === 'perfil' && <Profile />}
      </main>
      <nav className="nav" aria-label="Secciones">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${t.plus ? 'plus' : ''} ${tab === t.id ? 'on' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              aria-label={t.plus ? 'Registrar comida' : t.label}
              onClick={() => (t.plus ? setQuickOpen(true) : setTab(t.id))}
            >
              <span className="i" aria-hidden="true">{t.icon}</span>
              {!t.plus && <span>{t.label}</span>}
            </button>
          ))}
        </div>
      </nav>
      <QuickLogSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
}
