// Extras rápidos: una ración típica (kcal, proteína, hidratos, grasa).
export const EXTRAS = [
  { id: 'fruta', emoji: '🍎', name: 'Fruta', portion: '1 pieza', kcal: 80, p: 1, c: 19, f: 0.3 },
  { id: 'pan', emoji: '🥖', name: 'Pan', portion: '1 rebanada / 40 g', kcal: 105, p: 3.6, c: 20, f: 1.3 },
  { id: 'cafe-leche', emoji: '☕', name: 'Café con leche', portion: 'taza, semi', kcal: 60, p: 3.5, c: 5, f: 2.5 },
  { id: 'cafe-solo', emoji: '☕', name: 'Café solo', portion: 'sin azúcar', kcal: 3, p: 0, c: 0, f: 0 },
  { id: 'yogur', emoji: '🥛', name: 'Yogur', portion: 'natural', kcal: 75, p: 4.5, c: 6, f: 3.5 },
  { id: 'yogur-pro', emoji: '🥛', name: 'Yogur proteico', portion: '150 g', kcal: 95, p: 16, c: 6, f: 0.3 },
  { id: 'picoteo-p', emoji: '🥜', name: 'Picoteo', portion: 'puñado frutos secos', kcal: 180, p: 6, c: 5, f: 15 },
  { id: 'picoteo-g', emoji: '🍪', name: 'Dulce / galletas', portion: '3 galletas o similar', kcal: 150, p: 2, c: 21, f: 6.5 },
  { id: 'chocolate', emoji: '🍫', name: 'Chocolate', portion: '2 onzas', kcal: 110, p: 2, c: 5, f: 9 },
  { id: 'tostada', emoji: '🍞', name: 'Tostada con aceite', portion: 'con tomate', kcal: 190, p: 5, c: 26, f: 7 },
  { id: 'huevo', emoji: '🥚', name: 'Huevo', portion: '1 ud', kcal: 80, p: 7, c: 0.5, f: 5.5 },
  { id: 'queso', emoji: '🧀', name: 'Queso', portion: '30 g', kcal: 110, p: 7, c: 0.3, f: 9 },
  { id: 'cerveza', emoji: '🍺', name: 'Cerveza / copa', portion: 'caña o copa de vino', kcal: 110, p: 1, c: 8, f: 0 },
  { id: 'refresco', emoji: '🥤', name: 'Refresco', portion: 'lata con azúcar', kcal: 140, p: 0, c: 35, f: 0 },
];

// Comidas fuera: estimación por tamaño. Reparto aproximado 18 % proteína,
// 45 % hidratos y 37 % grasa.
export const EATING_OUT = [
  { id: 'menu', emoji: '🍽️', name: 'Menú del día', sizes: [650, 950, 1300] },
  { id: 'restaurante', emoji: '🍷', name: 'Restaurante / cena', sizes: [700, 1000, 1400] },
  { id: 'tapas', emoji: '🫒', name: 'Tapas / raciones', sizes: [500, 800, 1200] },
  { id: 'bocadillo', emoji: '🥪', name: 'Bocadillo / sándwich', sizes: [400, 550, 750] },
  { id: 'pizza', emoji: '🍕', name: 'Pizza', sizes: [700, 1000, 1300] },
  { id: 'hamburguesa', emoji: '🍔', name: 'Hamburguesa', sizes: [650, 950, 1300] },
  { id: 'asiatico', emoji: '🍣', name: 'Sushi / poke / asiático', sizes: [500, 750, 1000] },
  { id: 'postre', emoji: '🍰', name: 'Postre o merienda dulce', sizes: [250, 400, 600] },
];

export const SIZE_LABELS = ['Ligero', 'Normal', 'Abundante'];

export function estimateMacros(kcal) {
  return {
    kcal,
    p: Math.round((kcal * 0.18) / 4),
    c: Math.round((kcal * 0.45) / 4),
    f: Math.round((kcal * 0.37) / 9),
  };
}
