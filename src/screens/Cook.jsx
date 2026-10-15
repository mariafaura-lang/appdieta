import { Seg } from '../components/ui.jsx';
import RecipeBook from './RecipeBook.jsx';
import Calculator from './Calculator.jsx';
import Planner from './Planner.jsx';

export default function Cook({ sub, setSub, go }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Cocinar</h1>
          <div className="sub">Recetas por lote, calculadora y plan del finde</div>
        </div>
      </header>
      <div style={{ marginBottom: 14 }}>
        <Seg
          value={sub}
          onChange={setSub}
          options={[
            { value: 'recetas', label: 'Recetas' },
            { value: 'calculadora', label: 'Calculadora' },
            { value: 'plan', label: 'Plan finde' },
          ]}
        />
      </div>
      {sub === 'recetas' && <RecipeBook onCook={() => setSub('calculadora')} />}
      {sub === 'calculadora' && <Calculator go={go} />}
      {sub === 'plan' && <Planner go={go} setSub={setSub} />}
    </>
  );
}
