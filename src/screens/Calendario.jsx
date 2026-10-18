import { Seg } from '../components/ui.jsx';
import MenuWeek from './MenuWeek.jsx';
import Planner from './Planner.jsx';

export default function Calendario({ sub, go }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Calendario</h1>
          <div className="sub">Qué comes cada día y qué cocinar el finde</div>
        </div>
      </header>
      <div style={{ marginBottom: 14 }}>
        <Seg value={sub} onChange={go} options={[{ value: 'menu', label: '📅 Semana' }, { value: 'plan', label: '🛒 Compra del finde' }]} />
      </div>
      {sub === 'menu' && <MenuWeek setSub={go} />}
      {sub === 'plan' && <Planner setSub={go} />}
    </>
  );
}
