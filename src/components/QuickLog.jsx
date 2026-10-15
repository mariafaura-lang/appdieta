import { useState } from 'react';
import { useStore, eatTupper, addLogEntry, removeLogEntry } from '../store.jsx';
import { byAge, remaining, uid } from '../lib/inventory.js';
import { EXTRAS, EATING_OUT, SIZE_LABELS, estimateMacros } from '../data/extras.js';
import { iso, addDays } from '../lib/dates.js';
import { WorkoutSheet } from './WorkoutSheet.jsx';
import { Sheet, Seg, NumInput, Field, useToast, fmt } from './ui.jsx';

/**
 * Contenido de registro rápido. Se usa en la pantalla Hoy y en la hoja del botón +.
 */
export function QuickLogPanel({ onDone, compact }) {
  const { state, update } = useStore();
  const toast = useToast();
  const [day, setDay] = useState('hoy');
  const [outOpen, setOutOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [pickBatch, setPickBatch] = useState(null);
  const date = day === 'hoy' ? iso() : addDays(iso(), -1);
  const batches = byAge(state);

  const logged = (text, entryId) => {
    toast(text, () => update((s) => removeLogEntry(s, entryId)));
    onDone?.();
  };

  const eat = (batch, portionId) => {
    const id = uid();
    update((s) => eatTupper(s, batch.id, portionId, date, id));
    logged(`🥡 1 táper de ${batch.name} · quedan ${remaining(batch).length - 1}`, id);
  };

  const onTupper = (b) => {
    const rem = remaining(b);
    const weights = new Set(rem.map((p) => p.grams));
    if (rem.length > 1 && rem[0].grams && weights.size > 1) setPickBatch(b);
    else eat(b);
  };

  const addEntry = (entry, text) => {
    const id = uid();
    update((s) => addLogEntry(s, { ...entry, id, date }));
    logged(text, id);
  };

  return (
    <div className="stack">
      <Seg value={day} onChange={setDay} options={[{ value: 'hoy', label: 'Hoy' }, { value: 'ayer', label: 'Ayer' }]} />

      <div>
        <div className="section-title" style={{ marginTop: 4 }}>
          <h2>Del congelador</h2>
          <span className="small muted">un toque = 1 táper</span>
        </div>
        {batches.length === 0 ? (
          <p className="small muted">No hay táperes en el congelador. Cocina un lote desde «Cocinar».</p>
        ) : (
          <div className="quick-grid">
            {batches.map((b) => {
              const rem = remaining(b);
              return (
                <button key={b.id} className="quick" onClick={() => onTupper(b)}>
                  <span style={{ fontSize: '1.4rem' }}>{b.emoji}</span>
                  <span className="grow">
                    <span className="t" style={{ display: 'block' }}>{b.name}</span>
                    <span className="s num">{fmt(rem[0].kcal)} kcal · {Math.round(rem[0].p)} g prot</span>
                  </span>
                  <span className="count num">×{rem.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="section-title" style={{ marginTop: 4 }}><h2>Extras</h2></div>
        <div className="quick-grid">
          {EXTRAS.slice(0, compact ? 9 : EXTRAS.length).map((x) => (
            <button key={x.id} className="quick" onClick={() => addEntry({ kind: 'extra', name: x.name, emoji: x.emoji, kcal: x.kcal, p: x.p, c: x.c, f: x.f }, `${x.emoji} ${x.name} · ${x.kcal} kcal`)}>
              <span style={{ fontSize: '1.3rem' }}>{x.emoji}</span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>{x.name}</span>
                <span className="s">{x.portion} · {x.kcal}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid3">
        <button className="btn" style={{ padding: '10px 6px' }} onClick={() => setOutOpen(true)}>🍽️ Fuera</button>
        <button className="btn" style={{ padding: '10px 6px' }} onClick={() => setManualOpen(true)}>✏️ Otra cosa</button>
        <button className="btn" style={{ padding: '10px 6px' }} onClick={() => setWorkoutOpen(true)}>🏋️ Entreno</button>
      </div>
      <WorkoutSheet open={workoutOpen} onClose={() => { setWorkoutOpen(false); onDone?.(); }} />

      <EatingOutSheet open={outOpen} onClose={() => setOutOpen(false)} onPick={(e) => { setOutOpen(false); addEntry(e, `${e.emoji} ${e.name} · ~${e.kcal} kcal`); }} />
      <ManualSheet open={manualOpen} onClose={() => setManualOpen(false)} onSave={(e) => { setManualOpen(false); addEntry(e, `✏️ ${e.name} · ${e.kcal} kcal`); }} />
      <Sheet open={!!pickBatch} onClose={() => setPickBatch(null)} title="¿Qué táper?">
        {pickBatch && (
          <div className="list">
            {remaining(pickBatch).map((p) => (
              <button key={p.id} className="list-item" onClick={() => { const b = pickBatch; setPickBatch(null); eat(b, p.id); }}>
                <span className="emoji">{pickBatch.emoji}</span>
                <span className="grow">
                  <b className="num">{p.grams} g</b>
                  <div className="small muted num">{fmt(p.kcal)} kcal · {Math.round(p.p)} g proteína</div>
                </span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function EatingOutSheet({ open, onClose, onPick }) {
  const [size, setSize] = useState(1);
  return (
    <Sheet open={open} onClose={onClose} title="Comida fuera">
      <div className="stack">
        <p className="small muted">Una estimación aproximada basta. Lo importante es la tendencia de la semana.</p>
        <Seg value={size} onChange={setSize} options={SIZE_LABELS.map((l, i) => ({ value: i, label: l }))} />
        <div className="quick-grid">
          {EATING_OUT.map((o) => (
            <button key={o.id} className="quick" onClick={() => onPick({ kind: 'fuera', name: o.name, emoji: o.emoji, ...estimateMacros(o.sizes[size]) })}>
              <span style={{ fontSize: '1.3rem' }}>{o.emoji}</span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>{o.name}</span>
                <span className="s num">~{fmt(o.sizes[size])} kcal</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function ManualSheet({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [p, setP] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Añadir otra cosa">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!kcal) return;
          const k = Number(kcal);
          const prot = Number(p) || 0;
          onSave({ kind: 'manual', emoji: '✏️', name: name || 'Comida', kcal: k, p: prot, c: Math.max(0, Math.round((k - prot * 4) * 0.55 / 4)), f: Math.max(0, Math.round((k - prot * 4) * 0.45 / 9)) });
          setName(''); setKcal(''); setP('');
        }}
      >
        <Field label="Qué"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: bocadillo de la oficina" /></Field>
        <div className="grid2">
          <Field label="kcal"><NumInput value={kcal} onChange={setKcal} required /></Field>
          <Field label="Proteína (g, opcional)"><NumInput value={p} onChange={setP} /></Field>
        </div>
        <button className="btn primary block" disabled={!kcal}>Añadir</button>
      </form>
    </Sheet>
  );
}

export function QuickLogSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Registrar">
      <QuickLogPanel onDone={onClose} />
    </Sheet>
  );
}
