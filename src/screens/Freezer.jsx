import { useState } from 'react';
import { useStore, eatTupper, removeLogEntry, addBatch } from '../store.jsx';
import { byAge, remaining, ageDays, ageStatus, totalRemaining, uid, OLD_AFTER_DAYS } from '../lib/inventory.js';
import { iso, fmtShort, fmtRelative } from '../lib/dates.js';
import { Sheet, Field, NumInput, Stepper, Empty, useToast, fmt } from '../components/ui.jsx';
import { FREEZE_LABEL } from '../lib/recipes.js';
import { reservedCounts } from '../lib/dayplan.js';
import { USES } from './Calculator.jsx';
import { PantryList } from './Pantry.jsx';
import { LOCATIONS, expiringSoon } from '../lib/pantry.js';

export default function Home({ go }) {
  const { state } = useStore();
  const [sec, setSec] = useState(() => { try { return sessionStorage.getItem('casa-sec') || 'taperes'; } catch { return 'taperes'; } });
  const choose = (v) => { setSec(v); try { sessionStorage.setItem('casa-sec', v); } catch { /* sin almacenamiento */ } };
  const count = (loc) => (state.pantry || []).filter((i) => i.loc === loc).length;
  const soon = expiringSoon(state).length;
  return (
    <>
      <header className="topbar">
        <div>
          <h1>Casa</h1>
          <div className="sub">Táperes e ingredientes que tenéis{soon ? ` · ${soon} caduca${soon === 1 ? '' : 'n'} pronto` : ''}</div>
        </div>
      </header>
      <div className="chips" style={{ marginBottom: 12 }} role="tablist">
        {[{ id: 'taperes', label: '🥡 Táperes' }, ...LOCATIONS.map((l) => ({ id: l.id, label: `${l.emoji} ${l.label}${count(l.id) ? ` ${count(l.id)}` : ''}` }))].map((t) => (
          <button key={t.id} role="tab" aria-selected={sec === t.id} className={`chip${sec === t.id ? ' on' : ''}`} onClick={() => choose(t.id)}>{t.label}</button>
        ))}
      </div>
      {sec === 'taperes' ? <Freezer go={go} /> : <PantryList loc={sec} />}
    </>
  );
}

function Freezer({ go }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [manage, setManage] = useState(null);
  const [adding, setAdding] = useState(false);
  const today = iso();
  const batches = byAge(state);
  const total = totalRemaining(state);
  const perDay = Number(state.settings.tuppersPerDay) || 2;
  const old = batches.filter((b) => ageStatus(b, today) !== 'ok');
  const reserved = reservedCounts(state, today);

  const eat = (b) => {
    const id = uid();
    update((s) => eatTupper(s, b.id, null, today, id));
    toast(`🥡 1 táper de ${b.name} registrado`, () => update((s) => removeLogEntry(s, id)));
  };

  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="small muted num">
          {total} {total === 1 ? 'táper' : 'táperes'} · para ~{Math.floor(total / perDay)} días ({perDay}/día)
        </div>
        <button className="btn sm" aria-label="Añadir táperes manualmente" onClick={() => setAdding(true)}>＋ Táperes</button>
      </div>

      {old.length > 0 && (
        <div className="card warn" style={{ marginBottom: 12 }}>
          <div className="bold">⏳ Para comer pronto</div>
          <p className="small" style={{ marginTop: 4 }}>
            {old.map((b) => `${b.name} (${fmtRelative(b.frozenAt, today)})`).join(' · ')}. Llevan más de {OLD_AFTER_DAYS} días; siguen siendo seguros, pero ganan sabor si los rotas ya.
          </p>
        </div>
      )}

      {batches.length === 0 ? (
        <div className="card">
          <Empty icon="🧊">
            <p>El congelador está vacío.</p>
            <p className="small" style={{ marginTop: 6 }}>Cocina un lote y sus táperes aparecerán aquí con la fecha.</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 14, gap: 8 }}>
              <button className="btn primary" onClick={() => go('cocinar')}>Ver recetas</button>
              <button className="btn" onClick={() => setAdding(true)}>Ya tengo táperes</button>
            </div>
          </Empty>
        </div>
      ) : (
        <div className="stack">
          {batches.map((b) => {
            const rem = remaining(b);
            const st = ageStatus(b, today);
            const fz = FREEZE_LABEL[b.freezes];
            const weights = rem.some((p) => p.grams);
            const kcals = rem.map((p) => p.kcal);
            const kcalText = Math.min(...kcals) === Math.max(...kcals) ? fmt(kcals[0]) : `${fmt(Math.min(...kcals))}–${fmt(Math.max(...kcals))}`;
            return (
              <div key={b.id} className="card">
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <span className="emoji">{b.emoji}</span>
                  <div className="grow">
                    <div className="bold">{b.name}</div>
                    <div className="small muted num">
                      {kcalText} kcal · {Math.round(rem[0].p)} g prot{weights ? ' · pesados' : ''} por táper
                    </div>
                    <div className="row wrap" style={{ marginTop: 6, gap: 6 }}>
                      <span className={`badge ${st === 'ok' ? '' : st === 'antiguo' ? 'warn' : 'bad'}`}>
                        🗓 {fmtShort(b.frozenAt)} · {fmtRelative(b.frozenAt, today)}
                      </span>
                      {b.freezes !== 'bien' && fz && <span className={`badge ${fz.tone}`}>{fz.icon} {fz.text}</span>}
                    </div>
                  </div>
                  <div className="center">
                    <div className="hero-number" style={{ fontSize: '1.8rem' }}>{rem.length}</div>
                    <div className="tiny muted">de {b.portions.length}</div>
                    {reserved[b.id] > 0 && <div className="tiny" style={{ color: reserved[b.id] > rem.length ? 'var(--bad)' : 'var(--accent)' }}>📅 {reserved[b.id]} en menú</div>}
                  </div>
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn soft grow" onClick={() => eat(b)}>Me como 1</button>
                  <button className="btn" onClick={() => setManage(b.id)}>Gestionar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <details className="card flat" style={{ marginTop: 12 }}>
        <summary className="small bold">❄️ Consejos para congelar bien</summary>
        <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'grid', gap: 6, color: 'var(--text-2)' }}>
          <li><b>Enfría antes de congelar</b> (10–15 min en la encimera o un rato en la nevera): evita cristales de hielo y quemaduras de congelación.</li>
          <li><b>Saca todo el aire</b>: envuelve burritos y sándwiches en film o aluminio y usa bolsas o táperes que cierren bien.</li>
          <li><b>Etiqueta</b> con nombre y fecha. Aquí la fecha queda apuntada sola y te aviso a partir de {OLD_AFTER_DAYS} días.</li>
          <li><b>Mejor en 1–2 meses.</b> Aguantan 3–6, pero pierden sabor: rota primero lo más antiguo.</li>
          <li><b>Descongela en la nevera</b> la noche antes; los desayunos del tren se comen fríos por la mañana.</li>
          <li>Para cocinar mucho de una vez: decide las recetas, <b>compra uno o dos días antes</b> y haz hueco en el congelador.</li>
        </ul>
      </details>

      <ManageSheet batchId={manage} onClose={() => setManage(null)} />
      <AddManualSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function ManageSheet({ batchId, onClose }) {
  const { state, update } = useStore();
  const toast = useToast();
  const b = state.batches.find((x) => x.id === batchId);
  if (!b) return null;
  const rem = remaining(b);
  return (
    <Sheet open onClose={onClose} title={b.name}>
      <div className="stack">
        <Field label="Fecha de congelación">
          <input type="date" value={b.frozenAt} max={iso()} onChange={(e) => e.target.value && update((s) => { s.batches.find((x) => x.id === b.id).frozenAt = e.target.value; })} />
        </Field>
        <p className="small muted">Lleva {ageDays(b)} días en el congelador.</p>
        <div className="card flat" style={{ padding: '4px 16px' }}>
          <div className="list">
            {rem.map((p, i) => (
              <div key={p.id} className="list-item">
                <span className="grow small num">
                  Táper {i + 1}{p.grams ? ` · ${p.grams} g` : ''} — <b>{fmt(p.kcal)} kcal</b>, {Math.round(p.p)} g prot
                </span>
                <button
                  className="btn sm ghost danger"
                  onClick={() => {
                    update((s) => { s.batches.find((x) => x.id === b.id).portions.find((x) => x.id === p.id).eatenAt = 'descartado'; });
                    toast('Táper quitado sin registrarlo', () => update((s) => { s.batches.find((x) => x.id === b.id).portions.find((x) => x.id === p.id).eatenAt = null; }));
                  }}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="tiny muted">«Quitar» descuenta un táper sin sumarlo a lo comido (regalado, tirado o ya registrado).</p>
        <button
          className="btn danger block"
          onClick={() => {
            const copy = structuredClone(b);
            update((s) => { s.batches = s.batches.filter((x) => x.id !== b.id); });
            onClose();
            toast('Lote eliminado', () => update((s) => { s.batches.push(copy); }));
          }}
        >
          Eliminar lote completo
        </button>
      </div>
    </Sheet>
  );
}

function AddManualSheet({ open, onClose }) {
  const { update } = useStore();
  const [name, setName] = useState('');
  const [n, setN] = useState(4);
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  const [date, setDate] = useState(iso());
  const [use, setUse] = useState('principal');
  return (
    <Sheet open={open} onClose={onClose} title="Añadir táperes que ya tengo">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const k = Number(kcal) || 0;
          const prot = Number(p) || 0;
          const rest = Math.max(0, k - prot * 4);
          update((s) =>
            addBatch(s, {
              name: name || 'Táper',
              mode: 'equal',
              portions: n,
              totals: { kcal: k * n, p: prot * n, c: ((rest * 0.55) / 4) * n, f: ((rest * 0.45) / 9) * n },
              frozenAt: date,
              meals: USES.find((u) => u.id === use).meals,
              light: USES.find((u) => u.id === use).light || undefined,
            }),
          );
          setName(''); setKcal(''); setP('');
          onClose();
        }}
      >
        <p className="small muted">Para lo que ya está en el congelador. Si no sabes las calorías, pon una estimación; puedes calcularlas en la calculadora de lote.</p>
        <Field label="Qué es"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: lentejas de mamá" /></Field>
        <Field label="Para">
          <select id="uso-manual" value={use} onChange={(e) => setUse(e.target.value)}>
            {USES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </Field>
        <div className="row between">
          <span className="small bold">Número de táperes</span>
          <Stepper value={n} onChange={setN} />
        </div>
        <div className="grid2">
          <Field label="kcal por táper"><NumInput value={kcal} onChange={setKcal} required /></Field>
          <Field label="Proteína por táper (g)"><NumInput value={p} onChange={setP} /></Field>
        </div>
        <Field label="Fecha de congelación"><input type="date" value={date} max={iso()} onChange={(e) => setDate(e.target.value)} /></Field>
        <button className="btn primary block" disabled={!kcal}>Añadir al congelador</button>
      </form>
    </Sheet>
  );
}
