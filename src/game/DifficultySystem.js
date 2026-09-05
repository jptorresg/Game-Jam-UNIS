import { GAME_CONFIG } from "../config.js";

// Escalado de dificultad. Funcion sencilla y determinista basada en el tiempo
// transcurrido: cada `secondsPerLevel` sube un nivel y los parametros se ajustan.
export class DifficultySystem {
  levelFor(elapsedTime) {
    return 1 + Math.floor(elapsedTime / GAME_CONFIG.secondsPerLevel);
  }

  paramsFor(level) {
    const steps = level - 1;
    return {
      spawnInterval: clampMin(
        GAME_CONFIG.initialSpawnInterval - steps * GAME_CONFIG.spawnIntervalPerLevel,
        GAME_CONFIG.minSpawnInterval,
      ),
      reportTime: clampMin(
        GAME_CONFIG.initialReportTime - steps * GAME_CONFIG.reportTimePerLevel,
        GAME_CONFIG.minReportTime,
      ),
      maxActiveReports: Math.min(
        GAME_CONFIG.maxActiveReportsCap,
        GAME_CONFIG.initialMaxActiveReports + Math.floor(steps / 2),
      ),
      distractionInterval: clampMin(
        GAME_CONFIG.initialDistractionInterval -
          steps * GAME_CONFIG.distractionIntervalPerLevel,
        GAME_CONFIG.minDistractionInterval,
      ),
      distractionsEnabled: level >= GAME_CONFIG.firstDistractionLevel,
    };
  }
}

function clampMin(value, min) {
  return value < min ? min : value;
}
