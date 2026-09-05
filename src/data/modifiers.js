// Definiciones de modificadores. Cada uno transforma la palabra original en la
// palabra que el jugador debe escribir. Agregar uno nuevo aqui no requiere tocar
// ReportManager ni la UI.

const VOWEL_MAP = { a: "e", e: "i", i: "o", o: "u", u: "a" };

function vowelShift(word) {
  return word.replace(/[aeiou]/g, (v) => VOWEL_MAP[v]);
}

export const MODIFIERS = [
  {
    id: "none",
    color: "gray",
    label: "NORMAL",
    transform: (word) => word,
  },
  {
    id: "uppercase",
    color: "red",
    label: "MAYUSCULAS",
    transform: (word) => word.toUpperCase(),
  },
  {
    id: "reverse",
    color: "blue",
    label: "AL REVES",
    transform: (word) => word.split("").reverse().join(""),
  },
  {
    id: "vowelShift",
    color: "green",
    label: "VOCALES",
    transform: vowelShift,
  },
];

const BY_ID = new Map(MODIFIERS.map((m) => [m.id, m]));

export function getModifier(id) {
  return BY_ID.get(id) || MODIFIERS[0];
}
