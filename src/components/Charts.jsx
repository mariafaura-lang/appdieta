import { useRef, useState } from 'react';
import { fmtShort, diffDays } from '../lib/dates.js';
import { fmt } from './ui.jsx';

const W = 340;
const H = 170;
const PAD = { l: 34, r: 10, t: 10, b: 22 };

function niceRange(min, max, pad) {
  const lo = Math.floor((min - pad) * 2) / 2;
  const hi = Math.ceil((max + pad) * 2) / 2;
  return [lo, hi === lo ? lo + 1 : hi];
}

/** Hover/tap: busca el punto más cercano en X. */
function useHover(points, toX) {
  const ref = useRef();
  const [i, setI] = useState(null);
  const onMove = (e) => {
    const svg = ref.current;
    if (!svg || !points.length) return;
    const box = svg.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((p, k) => { if (Math.abs(toX(p) - x) < Math.abs(toX(points[best]) - x)) best = k; });
    setI(best);
  };
  return { ref, i, onMove, onLeave: () => setI(null) };
}

/** Peso diario (puntos) y media móvil de 7 días (línea). */
export function WeightChart({ data, from, to }) {
  const span = Math.max(1, diffDays(to, from));
  const pts = data.filter((d) => d.date >= from && d.date <= to);
  const vals = pts.flatMap((d) => [d.kg, d.avg]);
  const [lo, hi] = vals.length ? niceRange(Math.min(...vals), Math.max(...vals), 0.3) : [0, 1];
  const x = (d) => PAD.l + (diffDays(d.date, from) / span) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = pts.map((d, k) => `${k ? 'L' : 'M'}${x(d).toFixed(1)},${y(d.avg).toFixed(1)}`).join('');
  const h = useHover(pts, x);
  const cur = h.i != null ? pts[h.i] : null;

  if (!pts.length) return <p className="small muted" style={{ padding: '24px 0' }}>Sin pesajes en este periodo.</p>;
  return (
    <div style={{ position: 'relative' }}>
      <svg ref={h.ref} className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfica de peso y media de 7 días"
        onPointerMove={h.onMove} onPointerDown={h.onMove} onPointerLeave={h.onLeave} style={{ touchAction: 'pan-y' }}>
        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end">{t.toFixed(1).replace('.', ',')}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 4}>{fmtShort(from)}</text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end">{fmtShort(to)}</text>
        {pts.map((d) => (
          <circle key={d.date} cx={x(d)} cy={y(d.kg)} r="4" fill="var(--muted)" opacity="0.55" stroke="var(--surface)" strokeWidth="2" />
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.length > 0 && (
          <circle cx={x(pts.at(-1))} cy={y(pts.at(-1).avg)} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
        )}
        {cur && (
          <>
            <line x1={x(cur)} x2={x(cur)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-2)" strokeWidth="1" opacity="0.5" />
            <circle cx={x(cur)} cy={y(cur.avg)} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
          </>
        )}
      </svg>
      {cur && (
        <div className="tip" style={{ left: `${(x(cur) / W) * 100}%`, top: `${(y(Math.max(cur.kg, cur.avg)) / H) * 100}%` }}>
          {fmtShort(cur.date)} · {cur.kg.toFixed(1).replace('.', ',')} kg · media {cur.avg.toFixed(1).replace('.', ',')}
        </div>
      )}
      <div className="legend" style={{ marginTop: 6 }}>
        <span><i style={{ background: 'var(--accent)' }} />Media 7 días</span>
        <span><i style={{ background: 'var(--muted)', width: 8, height: 8, borderRadius: 99 }} />Pesaje del día</span>
      </div>
    </div>
  );
}

/** Pasos diarios en columnas, con línea de media. */
export function StepsChart({ data, goal }) {
  const vals = data.map((d) => d.steps || 0);
  const max = Math.max(goal || 0, ...vals, 1000) * 1.08;
  const n = data.length;
  const band = (W - PAD.l - PAD.r) / n;
  const bw = Math.min(24, band - 4);
  const x = (k) => PAD.l + band * k + (band - bw) / 2;
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const logged = data.filter((d) => d.steps != null);
  const avg = logged.length ? logged.reduce((s, d) => s + d.steps, 0) / logged.length : 0;
  const h = useHover(data.map((d, k) => k), (k) => x(k) + bw / 2);
  const cur = h.i != null ? data[h.i] : null;
  const ticks = [0, Math.round(max / 2 / 1000) * 1000, Math.floor(max / 1000) * 1000];
  const r = 4;

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={h.ref} className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pasos de los últimos días"
        onPointerMove={h.onMove} onPointerDown={h.onMove} onPointerLeave={h.onLeave} style={{ touchAction: 'pan-y' }}>
        {ticks.map((t, k) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end">{t >= 1000 ? `${t / 1000}K` : t}</text>
          </g>
        ))}
        {data.map((d, k) => {
          if (!d.steps) return null;
          const top = y(d.steps);
          const bottom = y(0);
          const hh = Math.max(0, bottom - top);
          const rr = Math.min(r, hh);
          return (
            <path key={d.date} opacity={h.i == null || h.i === k ? 1 : 0.5}
              d={`M${x(k)},${bottom}V${top + rr}Q${x(k)},${top} ${x(k) + rr},${top}H${x(k) + bw - rr}Q${x(k) + bw},${top} ${x(k) + bw},${top + rr}V${bottom}Z`}
              fill="var(--accent)" />
          );
        })}
        {avg > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y(avg)} y2={y(avg)} stroke="var(--text-2)" strokeWidth="1.5" />}
        {data.map((d, k) => (k % 2 === (n - 1) % 2 ? <text key={d.date} x={x(k) + bw / 2} y={H - 6} textAnchor="middle">{Number(d.date.slice(8))}</text> : null))}
      </svg>
      {cur && (
        <div className="tip" style={{ left: `${((x(h.i) + bw / 2) / W) * 100}%`, top: `${(y(cur.steps || 0) / H) * 100}%` }}>
          {fmtShort(cur.date)} · {cur.steps == null ? 'sin dato' : `${fmt(cur.steps)} pasos`}
        </div>
      )}
      <p className="tiny muted" style={{ marginTop: 4 }}>La línea horizontal marca tu media: {fmt(avg)} pasos/día.</p>
    </div>
  );
}
