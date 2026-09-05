// Configuracion central de gameplay. Evitar numeros magicos repartidos por el codigo.
export const GAME_CONFIG = {
  initialProductivity: 100,

  // Punto al que convergen reportes y distracciones (coordenadas normalizadas 0..1
  // del area de juego). Es donde esta el personaje.
  center: { x: 0.5, y: 0.52 },

  // --- Reportes ---
  initialSpawnInterval: 3.2, // segundos entre reportes al empezar
  minSpawnInterval: 1.1,
  initialMaxActiveReports: 3,
  maxActiveReportsCap: 6,

  // El "tiempo" de un reporte es lo que tarda en llegar al centro desde el borde.
  // Mas alto = llega mas lento = mas margen para escribirlo.
  initialReportTime: 10,
  minReportTime: 5,

  // --- Puntuacion ---
  baseReportPoints: 100,
  speedBonusMax: 50, // bonus maximo por completar rapido
  distractionClearPoints: 15, // pequeno premio por quitar una distraccion

  // Combo: tramos -> multiplicador (se evalua de mayor a menor).
  comboTiers: [
    { min: 20, multiplier: 4 },
    { min: 10, multiplier: 3 },
    { min: 5, multiplier: 2 },
    { min: 0, multiplier: 1 },
  ],
  comboResetOnError: true,

  // --- Dificultad ---
  secondsPerLevel: 25, // sube un nivel cada N segundos
  spawnIntervalPerLevel: 0.16, // cuanto baja el intervalo de spawn por nivel
  reportTimePerLevel: 0.42, // cuanto baja el tiempo de reporte por nivel

  // --- Distracciones ---
  // Roam lento por la oficina; al tocar al personaje aplican un efecto de
  // pantalla (blur / negro) en vez de restar productividad.
  initialDistractionInterval: 5.5,
  minDistractionInterval: 2.2,
  distractionIntervalPerLevel: 0.3,
  maxActiveDistractions: 4,
  firstDistractionLevel: 2, // no aparecen distracciones antes de este nivel

  // --- Penalizaciones a la productividad ---
  penalties: {
    reportExpired: 10,
    inputError: 5,
  },
};

// Multiplicador de combo segun los tramos configurados.
export function comboMultiplier(combo) {
  for (const tier of GAME_CONFIG.comboTiers) {
    if (combo >= tier.min) return tier.multiplier;
  }
  return 1;
}
