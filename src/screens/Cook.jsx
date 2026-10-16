import { Seg } from '../components/ui.jsx';
import RecipeBook from './RecipeBook.jsx';
import Calculator from './Calculator.jsx';
import Planner from './Planner.jsx';
import MenuWeek from './MenuWeek.jsx';

export default function Cook({ sub, setSub, go }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Cocinar</h1>
          <div className="sub">Menú de la semana, recetas, lotes y plan del finde</div>
        </div>
      </header>
      <div style={{ marginBottom: 14 }}>
        <Seg
          value={sub}
          onChange={setSub}
          options={[
            { value: 'menu', label: 'Menú' },
            { value: 'recetas', label: 'Recetas' },
            { value: 'calculadora', label: 'Lote' },
            { value: 'plan', label: 'Finde' },
          ]}
        />
      </div>
      {sub === 'menu' && <MenuWeek setSub={setSub} />}
      {sub === 'recetas' && <RecipeBook onCook={() => setSub('calculadora')} />}
      {sub === 'calculadora' && <Calculator go={go} />}
      {sub === 'plan' && <Planner go={go} setSub={setSub} />}
    </>
  );
}
