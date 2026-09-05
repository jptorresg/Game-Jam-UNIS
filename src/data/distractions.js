// Tipos de distraccion. Aparecen en un borde y luego ROAM: se mueven despacio y
// rebotan por la oficina intentando molestar. Si tocan al personaje disparan un
// efecto de pantalla (no restan productividad); solo se van con click o cuando
// se agota su lifetime.
//
// lifetime : segundos que aguanta antes de rendirse e irse sola
// speed    : px/segundo aproximados (lento; rebota, no persigue)
// glyph    : placeholder visual hasta tener sprites pixel
// label    : texto que acompana al placeholder
// tone     : color del placeholder (clase distraction--<tone>)
// effect   : "blur" (nubla la vista) o "black" (pantallazo oscuro)
// effectMs : cuanto dura el efecto al tocar al personaje
export const DISTRACTION_TYPES = {
  fly: {
    lifetime: 10,
    speed: 46,
    img: "/images/distracciones/mosca.png",
    label: "",
    tone: "bug",
    effect: "blur",
    effectMs: 850,
  },
  coworker: {
    lifetime: 14,
    speed: 24,
    img: "/images/distracciones/companero.png",
    label: "¿Tienes un momento?",
    tone: "person",
    effect: "blur",
    effectMs: 1300,
  },
  meeting: {
    lifetime: 15,
    speed: 18,
    img: "/images/reunion/reunion.png",
    label: "REUNION",
    tone: "meeting",
    effect: "blur",
    effectMs: 1400,
  },
  phone: {
    lifetime: 11,
    speed: 28,
    img: "/images/distracciones/telefono.png",
    label: "RING RING",
    tone: "phone",
    effect: "black",
    effectMs: 650,
  },
  coffee: {
    lifetime: 12,
    speed: 26,
    img: "/images/distracciones/cafe.png",
    label: "¿Un cafecito?",
    tone: "coffee",
    effect: "blur",
    effectMs: 1100,
  },
  notification: {
    lifetime: 9,
    speed: 22,
    img: "/images/distracciones/notificacion.png",
    label: "Nueva notificacion",
    tone: "notif",
    effect: "black",
    effectMs: 500,
  },
  boss: {
    lifetime: 16,
    speed: 20,
    img: "/images/distracciones/jefe.png",
    label: "EL JEFE",
    tone: "boss",
    effect: "black",
    effectMs: 1700,
  },
  popup: {
    lifetime: 13,
    speed: 15,
    img: "/images/distracciones/popup.png",
    label: "",
    tone: "popup",
    effect: "black",
    effectMs: 950,
  },
};

export const DISTRACTION_IDS = Object.keys(DISTRACTION_TYPES);

// La variedad crece con el nivel.
export function randomDistractionType(level = 1) {
  const pool = ["fly", "fly", "notification"];
  if (level >= 2) pool.push("coworker", "coffee", "meeting");
  if (level >= 3) pool.push("phone", "popup");
  if (level >= 4) pool.push("boss", "coworker", "phone", "meeting");
  return pool[Math.floor(Math.random() * pool.length)];
}
