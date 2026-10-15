// Fechas como 'YYYY-MM-DD' en hora local.

export function iso(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function diffDays(a, b) {
  return Math.round((parse(a) - parse(b)) / 86400000);
}

/** Lunes de la semana de la fecha dada. */
export function weekStart(s) {
  const d = parse(s);
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return iso(d);
}

export function weekDays(s) {
  const start = weekStart(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 0 = lunes … 6 = domingo */
export function dayOfWeek(s) {
  return (parse(s).getDay() + 6) % 7;
}

export const DOW_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DOW_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtShort(s) {
  const d = parse(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtRelative(s, today = iso()) {
  const n = diffDays(today, s);
  if (n === 0) return 'hoy';
  if (n === 1) return 'ayer';
  if (n < 7) return `hace ${n} días`;
  if (n < 14) return 'hace 1 semana';
  if (n < 60) return `hace ${Math.floor(n / 7)} semanas`;
  return `hace ${Math.floor(n / 30)} meses`;
}
