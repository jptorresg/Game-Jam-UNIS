// Configuracion central de gameplay. Evitar numeros magicos repartidos por el codigo.
export const GAME_CONFIG = {
  initialProductivity: 100,

  // Spawning de reportes
  initialSpawnInterval: 3, // segundos entre reportes
  minSpawnInterval: 0.8,
  maxActiveReports: 3,

  // Tiempo de vida de un reporte
  initialReportTime: 8, // segundos

  // Puntuacion
  baseReportPoints: 100,
  speedBonusMax: 50, // bonus maximo por completar rapido

  // Combo
  comboResetOnError: true,

  // Penalizaciones a la productividad
  penalties: {
    reportExpired: 10,
    inputError: 5,
  },
};
