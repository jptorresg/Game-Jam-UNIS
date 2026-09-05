// Configuracion central de gameplay. Evitar numeros magicos repartidos por el codigo.
export const GAME_CONFIG = {
  initialProductivity: 100,

  // --- Reportes ---
  initialSpawnInterval: 3, // segundos entre reportes al empezar
  minSpawnInterval: 0.9,
  initialMaxActiveReports: 3,
  maxActiveReportsCap: 6,

  initialReportTime: 8, // segundos de vida de un reporte
  minReportTime: 3.5,

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
  secondsPerLevel: 22, // sube un nivel cada N segundos
  spawnIntervalPerLevel: 0.18, // cuanto baja el intervalo de spawn por nivel
  reportTimePerLevel: 0.45, // cuanto baja el tiempo de reporte por nivel

  // --- Distracciones ---
  initialDistractionInterval: 6,
  minDistractionInterval: 2,
  distractionIntervalPerLevel: 0.4,
  maxActiveDistractions: 4,
  firstDistractionLevel: 2, // no aparecen distracciones antes de este nivel

  // --- Penalizaciones a la productividad ---
  penalties: {
    reportExpired: 10,
    inputError: 5,
    distractionMissed: 5,
  },
};

// Multiplicador de combo segun los tramos configurados.
export function comboMultiplier(combo) {
  for (const tier of GAME_CONFIG.comboTiers) {
    if (combo >= tier.min) return tier.multiplier;
  }
  return 1;
}
