import { Seg } from '../components/ui.jsx';
import RecipeBook from './RecipeBook.jsx';
import Calculator from './Calculator.jsx';

export default function Recetario({ sub, go }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Recetario</h1>
          <div className="sub">Recetas por lote y calculadora de táperes</div>
        </div>
      </header>
      <div style={{ marginBottom: 14 }}>
        <Seg value={sub} onChange={go} options={[{ value: 'recetas', label: '📖 Recetas' }, { value: 'calculadora', label: '⚖️ Calcular lote' }]} />
      </div>
      {sub === 'recetas' && <RecipeBook onCook={() => go('calculadora')} />}
      {sub === 'calculadora' && <Calculator go={go} />}
    </>
  );
}
