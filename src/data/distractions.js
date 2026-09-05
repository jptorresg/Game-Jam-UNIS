// Tipos de distraccion. `lifetime` en segundos; `speed` en px/segundo (0 = fija).
export const DISTRACTION_TYPES = {
  fly: {
    lifetime: 4.5,
    speed: 140,
    glyph: "\u{1FAB0}", // mosca
  },
  notification: {
    lifetime: 6,
    speed: 0,
    glyph: "\u{1F514}", // campana
  },
  popup: {
    lifetime: 8,
    speed: 0,
    glyph: "\u{26A0}\u{FE0F}", // advertencia
  },
};

export const DISTRACTION_IDS = Object.keys(DISTRACTION_TYPES);

export function randomDistractionType(level = 1) {
  const pool = ["fly", "fly", "notification"];
  if (level >= 3) pool.push("popup");
  if (level >= 4) pool.push("notification", "popup");
  return pool[Math.floor(Math.random() * pool.length)];
}
