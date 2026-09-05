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
  minReportTime: 3.8,

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
  // El nivel efectivo ahora viene de la jornada: (turno - 1) * 4 + horas
  // transcurridas del turno. Estas pendientes controlan cuanto endurece.
  secondsPerLevel: 25, // (sin uso: la dificultad la marca el reloj)
  spawnIntervalPerLevel: 0.24, // cuanto baja el intervalo de spawn por nivel
  reportTimePerLevel: 0.6, // cuanto baja el tiempo de reporte por nivel (llegan mas rapido)

  // --- Jornada / turnos ---
  schedule: {
    startHour: 9,
    endHour: 17,
    secondsPerHour: 10, // 1 hora del juego = 10 s reales -> turno = ~1:20 min
    // Fases por hora. `from` es la hora a la que arranca la fase.
    phases: [
      {
        id: "morning",
        label: "MANANA",
        from: 9,
        modifiers: ["none", "uppercase"],
        distractions: false,
      },
      {
        id: "afternoon",
        label: "TARDE",
        from: 12,
        modifiers: ["none", "uppercase", "vowelShift"],
        distractions: true,
      },
      {
        id: "rush",
        label: "HORA PICO",
        from: 16,
        modifiers: ["none", "uppercase", "vowelShift", "reverse"],
        distractions: true,
      },
    ],
    // Cartel al entrar a la fase (morning no muestra nada: es el arranque).
    banners: {
      afternoon: "EMPEZO LA TARDE",
      rush: "HORA PICO",
    },
  },

  // --- Tutorial (solo turno 1) ---
  tutorial: {
    requiredPerStep: 2,
    steps: [
      {
        modifier: "none",
        color: "gray",
        title: "CARPETAS AMARILLAS",
        desc: "Palabra normal: escribela tal cual.",
      },
      {
        modifier: "uppercase",
        color: "red",
        title: "CARPETAS ROJAS",
        desc: "En MAYUSCULAS (manten Shift).",
      },
      {
        modifier: "reverse",
        color: "blue",
        title: "CARPETAS AZULES",
        desc: "Escribe la palabra al reves.",
      },
      {
        modifier: "vowelShift",
        color: "green",
        title: "CARPETAS VERDES",
        desc: "Cambia cada vocal: a->e  e->i  i->o  o->u  u->a",
      },
    ],
  },

  // --- Distracciones ---
  // Roam lento por la oficina; al tocar al personaje aplican un efecto de
  // pantalla (blur / negro) en vez de restar productividad.
  initialDistractionInterval: 5.5,
  minDistractionInterval: 2,
  distractionIntervalPerLevel: 0.42,
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
