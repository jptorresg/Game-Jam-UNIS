// Tipos de distraccion. Aparecen en un borde y se mueven hacia el centro; si
// llegan (o se acaba su lifetime) cuentan como ignoradas.
//
// lifetime : segundos de vida como respaldo (normalmente llega antes al centro)
// speed    : px/segundo aproximados hacia el centro (0 = casi fija)
// glyph    : placeholder visual hasta tener sprites pixel
// label    : texto que acompana al placeholder
// tone     : color del placeholder (clase distraction--<tone>)
export const DISTRACTION_TYPES = {
  fly: {
    lifetime: 6,
    speed: 130,
    glyph: "\u{1FAB0}",
    label: "",
    tone: "bug",
  },
  coworker: {
    lifetime: 8,
    speed: 70,
    glyph: "\u{1F9D1}",
    label: "¿Tienes un momento?",
    tone: "person",
  },
  phone: {
    lifetime: 7,
    speed: 55,
    glyph: "\u{1F4DE}",
    label: "RING RING",
    tone: "phone",
  },
  coffee: {
    lifetime: 7,
    speed: 60,
    glyph: "\u{2615}",
    label: "¿Un cafecito?",
    tone: "coffee",
  },
  boss: {
    lifetime: 9,
    speed: 45,
    glyph: "\u{1F454}",
    label: "EL JEFE",
    tone: "boss",
  },
  notification: {
    lifetime: 6,
    speed: 40,
    glyph: "\u{1F514}",
    label: "Nueva notificacion",
    tone: "notif",
  },
  popup: {
    lifetime: 8,
    speed: 0,
    glyph: "\u{26A0}\u{FE0F}",
    label: "SYSTEM MESSAGE",
    tone: "popup",
  },
};

export const DISTRACTION_IDS = Object.keys(DISTRACTION_TYPES);

// La variedad crece con el nivel.
export function randomDistractionType(level = 1) {
  const pool = ["fly", "fly", "notification"];
  if (level >= 2) pool.push("coworker", "coffee");
  if (level >= 3) pool.push("phone", "popup");
  if (level >= 4) pool.push("boss", "coworker", "phone");
  return pool[Math.floor(Math.random() * pool.length)];
}
