// Base de alimentos: valores por 100 g (en crudo salvo indicación).
// Fuentes de referencia: BEDCA / USDA, redondeados. Precio aproximado en €/kg
// (supermercado España, 2025) para estimar el coste de las recetas.
// veg: apto para dieta vegetariana. cat: pasillo para la lista de la compra.

const F = (id, name, cat, kcal, p, c, f, price, veg = true) => ({
  id, name, cat, kcal, p, c, f, price, veg,
});

export const CATEGORIES = {
  verdura: 'Fruta y verdura',
  carne: 'Carne',
  pescado: 'Pescado',
  lacteos: 'Lácteos y huevos',
  legumbres: 'Legumbres',
  cereales: 'Pasta, arroz y cereales',
  despensa: 'Despensa',
  congelados: 'Congelados',
  otros: 'Otros',
};

export const FOODS = [
  // Verduras y hortalizas
  F('cebolla', 'Cebolla', 'verdura', 40, 1.1, 9.3, 0.1, 1.6),
  F('ajo', 'Ajo', 'verdura', 149, 6.4, 33, 0.5, 6),
  F('puerro', 'Puerro', 'verdura', 61, 1.5, 14, 0.3, 2.8),
  F('zanahoria', 'Zanahoria', 'verdura', 41, 0.9, 9.6, 0.2, 1.2),
  F('pimiento_rojo', 'Pimiento rojo', 'verdura', 31, 1, 6, 0.3, 3),
  F('pimiento_verde', 'Pimiento verde', 'verdura', 20, 0.9, 4.6, 0.2, 2.5),
  F('tomate', 'Tomate', 'verdura', 18, 0.9, 3.9, 0.2, 2.2),
  F('tomate_triturado', 'Tomate triturado (lata)', 'despensa', 32, 1.6, 5.5, 0.3, 1.8),
  F('tomate_frito', 'Tomate frito', 'despensa', 80, 1.5, 10, 3.5, 2.5),
  F('calabacin', 'Calabacín', 'verdura', 17, 1.2, 3.1, 0.3, 1.8),
  F('berenjena', 'Berenjena', 'verdura', 25, 1, 5.9, 0.2, 2),
  F('calabaza', 'Calabaza', 'verdura', 26, 1, 6.5, 0.1, 1.5),
  F('brocoli', 'Brócoli', 'verdura', 34, 2.8, 6.6, 0.4, 3),
  F('coliflor', 'Coliflor', 'verdura', 25, 1.9, 5, 0.3, 2.2),
  F('espinacas', 'Espinacas', 'verdura', 23, 2.9, 3.6, 0.4, 4),
  F('judias_verdes', 'Judías verdes', 'verdura', 31, 1.8, 7, 0.2, 3),
  F('brotes_soja', 'Brotes de soja', 'verdura', 31, 3, 6, 0.2, 5),
  F('enoki', 'Setas enoki / shiitake', 'verdura', 37, 2.7, 7.8, 0.3, 10),
  F('col_china', 'Col china', 'verdura', 13, 1.2, 2.2, 0.2, 2),
  F('kimchi', 'Kimchi', 'verdura', 23, 1.1, 4, 0.5, 10),
  F('champinones', 'Champiñones', 'verdura', 22, 3.1, 3.3, 0.3, 4),
  F('patata', 'Patata', 'verdura', 77, 2, 17, 0.1, 1.2),
  F('boniato', 'Boniato', 'verdura', 86, 1.6, 20, 0.1, 2.2),
  F('pepino', 'Pepino', 'verdura', 15, 0.7, 3.6, 0.1, 1.5),
  F('rucula', 'Rúcula / canónigos', 'verdura', 25, 2.6, 3.7, 0.7, 12),
  F('apio', 'Apio', 'verdura', 16, 0.7, 3, 0.2, 2),
  F('col_lombarda', 'Col lombarda', 'verdura', 31, 1.4, 7.4, 0.2, 1.5),
  F('col', 'Col / repollo', 'verdura', 25, 1.3, 5.8, 0.1, 1.3),
  F('guisantes_cong', 'Guisantes congelados', 'congelados', 77, 5.2, 13.6, 0.4, 2.8),
  F('menestra_cong', 'Menestra congelada', 'congelados', 45, 2.5, 7, 0.3, 2.5),
  F('maiz', 'Maíz dulce (lata)', 'despensa', 86, 3.3, 19, 1.4, 4),
  F('limon', 'Limón', 'verdura', 29, 1.1, 9.3, 0.3, 2),
  F('jengibre', 'Jengibre fresco', 'verdura', 80, 1.8, 18, 0.8, 8),
  F('cilantro', 'Cilantro / perejil fresco', 'verdura', 36, 3, 6, 0.8, 15),

  // Fruta
  F('manzana', 'Manzana', 'verdura', 52, 0.3, 14, 0.2, 2),
  F('platano', 'Plátano', 'verdura', 89, 1.1, 23, 0.3, 2),
  F('naranja', 'Naranja', 'verdura', 47, 0.9, 12, 0.1, 1.6),
  F('pera', 'Pera', 'verdura', 57, 0.4, 15, 0.1, 2.2),
  F('fresas', 'Fresas', 'verdura', 32, 0.7, 7.7, 0.3, 4),
  F('aguacate', 'Aguacate', 'verdura', 160, 2, 8.5, 14.7, 5),

  // Carne
  F('pechuga_pollo', 'Pechuga de pollo', 'carne', 110, 23, 0, 1.6, 7.5, false),
  F('contramuslo_pollo', 'Contramuslo de pollo deshuesado', 'carne', 145, 19, 0, 7.5, 7, false),
  F('alitas_pollo', 'Alitas de pollo (peso con hueso)', 'carne', 134, 12.3, 0, 9, 4.5, false),
  F('pavo_pechuga', 'Pechuga de pavo', 'carne', 105, 24, 0, 1, 8.5, false),
  F('pavo_picado', 'Carne picada de pavo', 'carne', 140, 20, 0, 6.5, 7.5, false),
  F('pollo_picado', 'Carne picada de pollo', 'carne', 120, 20, 0, 4.5, 8, false),
  F('cerdo_picado', 'Carne picada de cerdo magra', 'carne', 180, 19, 0, 11.5, 7, false),
  F('ternera_filete', 'Ternera en filetes finos', 'carne', 131, 21, 0, 5, 14, false),
  F('ternera_picada', 'Carne picada de ternera (5 % grasa)', 'carne', 137, 21, 0, 5, 10, false),
  F('mixta_picada', 'Carne picada mixta cerdo/ternera', 'carne', 230, 17, 0, 18, 7, false),
  F('ternera_guisar', 'Ternera para guisar (aguja)', 'carne', 150, 20, 0, 7.5, 13, false),
  F('lomo_cerdo', 'Lomo de cerdo', 'carne', 143, 22, 0, 6, 7.5, false),
  F('chorizo', 'Chorizo', 'carne', 455, 24, 2, 39, 11, false),
  F('jamon_taquitos', 'Taquitos de jamón serrano', 'carne', 240, 31, 0, 13, 15, false),
  F('pechuga_pavo_fiambre', 'Fiambre de pavo', 'carne', 100, 18, 3, 1.5, 10, false),

  // Pescado
  F('merluza', 'Merluza', 'pescado', 72, 15.9, 0, 1, 11, false),
  F('salmon_ahumado', 'Salmón ahumado', 'pescado', 160, 22, 0, 8, 25, false),
  F('salmon', 'Salmón', 'pescado', 208, 20, 0, 13.4, 15, false),
  F('atun_lata', 'Atún al natural (lata)', 'pescado', 103, 23.5, 0, 1, 14, false),
  F('bacalao', 'Bacalao desalado', 'pescado', 82, 18, 0, 0.7, 14, false),
  F('gambas', 'Gambas peladas congeladas', 'pescado', 85, 18, 0.9, 0.9, 12, false),
  F('sepia', 'Sepia / calamar', 'pescado', 79, 16, 0.8, 0.7, 9, false),
  F('mejillon', 'Mejillón (carne)', 'pescado', 86, 12, 3.7, 2.2, 6, false),

  // Huevos y lácteos
  F('huevo', 'Huevo (≈ 60 g sin cáscara/ud)', 'lacteos', 143, 12.6, 0.7, 9.5, 4),
  F('clara', 'Clara de huevo pasteurizada', 'lacteos', 48, 10.5, 0.7, 0.2, 4),
  F('leche_desnatada', 'Leche desnatada', 'lacteos', 34, 3.4, 5, 0.1, 0.9),
  F('leche_semi', 'Leche semidesnatada', 'lacteos', 46, 3.2, 4.8, 1.6, 0.95),
  F('leche_entera', 'Leche entera', 'lacteos', 63, 3.1, 4.7, 3.6, 1),
  F('bebida_avena', 'Bebida de avena', 'lacteos', 45, 0.6, 7, 1.5, 1.5),
  F('yogur_natural', 'Yogur natural', 'lacteos', 61, 3.5, 4.7, 3.3, 2.5),
  F('yogur_griego_0', 'Yogur griego 0 %', 'lacteos', 57, 10, 3.6, 0.2, 4.5),
  F('skyr', 'Skyr / yogur proteico', 'lacteos', 63, 11, 4, 0.2, 5),
  F('queso_fresco', 'Queso fresco batido 0 %', 'lacteos', 46, 8, 3.5, 0.2, 3.5),
  F('queso_cottage', 'Queso cottage', 'lacteos', 98, 11, 3.4, 4.3, 7),
  F('queso_burgos', 'Queso de Burgos light', 'lacteos', 120, 13, 3.5, 6, 7),
  F('feta', 'Queso feta', 'lacteos', 264, 14, 4, 21, 12),
  F('mozzarella', 'Mozzarella', 'lacteos', 250, 18, 2, 19, 8),
  F('queso_rallado', 'Queso rallado (emmental)', 'lacteos', 380, 28, 0.5, 29, 10),
  F('parmesano', 'Parmesano', 'lacteos', 392, 33, 3, 28, 18),
  F('nata_cocinar', 'Nata para cocinar 15 %', 'lacteos', 165, 2.7, 4, 15, 4),
  F('mantequilla', 'Mantequilla', 'lacteos', 717, 0.9, 0.1, 81, 9),

  // Legumbres
  F('garbanzo_cocido', 'Garbanzos cocidos (bote)', 'legumbres', 120, 7, 16, 2.5, 2.4),
  F('garbanzo_seco', 'Garbanzos secos', 'legumbres', 364, 19, 61, 6, 2.8),
  F('lenteja_seca', 'Lentejas secas', 'legumbres', 353, 24, 54, 1.4, 2.6),
  F('lenteja_roja', 'Lentejas rojas secas', 'legumbres', 358, 24, 60, 2, 3.5),
  F('lenteja_cocida', 'Lentejas cocidas (bote)', 'legumbres', 100, 8, 14, 0.5, 2.4),
  F('alubia_blanca_seca', 'Alubias blancas secas', 'legumbres', 333, 23, 60, 0.8, 3.5),
  F('alubia_cocida', 'Alubias cocidas (bote)', 'legumbres', 95, 6.5, 13, 0.5, 2.4),
  F('alubia_negra_cocida', 'Alubias negras cocidas (bote)', 'legumbres', 91, 6, 12, 0.5, 3),
  F('alubia_roja_cocida', 'Alubias rojas cocidas (bote)', 'legumbres', 105, 7.5, 15, 0.5, 2.6),
  F('tofu', 'Tofu firme', 'legumbres', 144, 15.6, 2.3, 8.7, 7),
  F('tofu_sedoso', 'Tofu sedoso', 'legumbres', 55, 5, 2, 2.7, 6),
  F('bebida_soja', 'Bebida de soja sin azúcar', 'lacteos', 33, 3.3, 0.6, 1.8, 1.6),
  F('soja_texturizada', 'Soja texturizada seca', 'legumbres', 330, 50, 30, 1, 8),
  F('edamame', 'Edamame congelado', 'congelados', 121, 11.9, 8.9, 5.2, 6),

  // Cereales
  F('arroz', 'Arroz blanco (crudo)', 'cereales', 360, 7, 79, 0.6, 1.5),
  F('arroz_integral', 'Arroz integral (crudo)', 'cereales', 362, 7.5, 76, 2.7, 2.2),
  F('arroz_cocido', 'Arroz blanco cocido', 'cereales', 130, 2.7, 28, 0.3, 3),
  F('pasta', 'Pasta (cruda)', 'cereales', 357, 12.5, 72, 1.5, 1.6),
  F('pasta_integral', 'Pasta integral (cruda)', 'cereales', 348, 13, 66, 2.5, 2.2),
  F('pasta_cocida', 'Pasta cocida', 'cereales', 158, 5.8, 31, 0.9, 3),
  F('fideos', 'Fideos (crudos)', 'cereales', 357, 12, 73, 1.5, 1.6),
  F('cuscus', 'Cuscús (crudo)', 'cereales', 376, 12.8, 77, 0.6, 2.8),
  F('quinoa', 'Quinoa (cruda)', 'cereales', 368, 14, 64, 6, 7),
  F('avena', 'Copos de avena', 'cereales', 375, 13.5, 59, 7, 2),
  F('pan', 'Pan blanco (barra)', 'cereales', 265, 9, 51, 3.2, 3.5),
  F('pan_integral', 'Pan integral', 'cereales', 250, 10, 43, 3.5, 4),
  F('pan_molde_integral', 'Pan de molde integral', 'cereales', 240, 11, 40, 3.5, 4),
  F('pan_rallado', 'Pan rallado', 'cereales', 395, 13, 72, 5, 3),
  F('tortilla_trigo', 'Tortilla de trigo (wrap)', 'cereales', 310, 8.5, 52, 7.5, 6),
  F('obleas_empanadilla', 'Obleas de empanadilla', 'cereales', 300, 7, 50, 7.5, 5),
  F('harina', 'Harina de trigo', 'cereales', 364, 10, 76, 1, 0.9),
  F('lasana', 'Placas de lasaña', 'cereales', 357, 12.5, 72, 1.5, 3.5),

  // Despensa
  F('aceite_oliva', 'Aceite de oliva', 'despensa', 884, 0, 0, 100, 8),
  F('caldo_pollo', 'Caldo de pollo (brick)', 'despensa', 5, 0.6, 0.3, 0.2, 1.5),
  F('caldo_verduras', 'Caldo de verduras (brick)', 'despensa', 6, 0.2, 1, 0.1, 1.5),
  F('vino_blanco', 'Vino blanco (cocina)', 'despensa', 82, 0.1, 2.6, 0, 3),
  F('leche_coco', 'Leche de coco light', 'despensa', 75, 0.7, 2.5, 7, 5),
  F('curry_pasta', 'Pasta de curry', 'despensa', 120, 2, 10, 8, 18),
  F('salsa_ostras', 'Salsa de ostras', 'despensa', 51, 1.4, 11, 0.3, 8),
  F('ketchup', 'Kétchup', 'despensa', 112, 1.2, 26, 0.2, 3),
  F('maicena', 'Maicena / fécula', 'despensa', 381, 0.3, 91, 0.1, 3),
  F('aceite_sesamo', 'Aceite de sésamo', 'despensa', 884, 0, 0, 100, 15),
  F('gochujang', 'Gochujang (pasta de guindilla coreana)', 'despensa', 210, 4, 45, 1.5, 15),
  F('vinagre_arroz', 'Vinagre de arroz', 'despensa', 20, 0, 1, 0, 6),
  F('miso', 'Miso / doenjang', 'despensa', 199, 12, 26, 6, 12),
  F('curry_japones', 'Curry japonés en bloque', 'despensa', 512, 6, 45, 34, 15),
  F('mayonesa_light', 'Mayonesa ligera', 'despensa', 300, 1, 8, 29, 5),
  F('salsa_soja', 'Salsa de soja', 'despensa', 53, 8, 4.9, 0.6, 6),
  F('miel', 'Miel', 'despensa', 304, 0.3, 82, 0, 8),
  F('azucar', 'Azúcar', 'despensa', 387, 0, 100, 0, 1.2),
  F('pimenton', 'Pimentón', 'despensa', 282, 14, 54, 13, 25),
  F('canela', 'Canela', 'despensa', 247, 4, 81, 1.2, 30),
  F('levadura', 'Levadura química', 'despensa', 53, 0, 28, 0, 15),
  F('cacao_puro', 'Cacao puro en polvo', 'despensa', 228, 20, 58, 14, 18),
  F('comino', 'Comino / especias', 'despensa', 375, 18, 44, 22, 25),
  F('tomate_concentrado', 'Tomate concentrado', 'despensa', 82, 4.3, 19, 0.5, 5),
  F('almendras', 'Almendras', 'despensa', 579, 21, 22, 50, 14),
  F('nueces', 'Nueces', 'despensa', 654, 15, 14, 65, 14),
  F('cacahuete_crema', 'Crema de cacahuete', 'despensa', 588, 25, 20, 50, 9),
  F('chocolate_negro', 'Chocolate negro 85 %', 'despensa', 600, 10, 20, 50, 15),
  F('jalapenos', 'Jalapeños encurtidos', 'despensa', 27, 1, 5, 0.4, 8),
  F('aceitunas', 'Aceitunas', 'despensa', 145, 1, 4, 15, 5),
  F('hummus', 'Hummus', 'legumbres', 177, 8, 14, 9.6, 8),
  F('proteina_whey', 'Proteína whey en polvo', 'otros', 380, 78, 7, 5, 25),
];

export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));

export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Busca alimentos por nombre (sin tildes); prioriza coincidencia al inicio. */
export function searchFoods(query, extraFoods = [], limit = 12) {
  const q = normalize(query);
  const all = [...extraFoods, ...FOODS];
  if (!q) return all.slice(0, limit);
  const words = q.split(/\s+/);
  return all
    .map((f) => {
      const n = normalize(f.name);
      if (!words.every((w) => n.includes(w))) return null;
      const score = (n.startsWith(q) ? 0 : 1) + (n.includes(q) ? 0 : 1);
      return { f, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.f.name.length - b.f.name.length)
    .slice(0, limit)
    .map((x) => x.f);
}
