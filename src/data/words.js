// Pool de palabras. Vocabulario de oficina, longitud variable, faciles de reconocer.
export const WORDS = [
  "correo",
  "agenda",
  "cliente",
  "factura",
  "informe",
  "memoria",
  "sistema",
  "archivo",
  "oficina",
  "reunion",
  "servidor",
  "teclado",
  "pantalla",
  "impresora",
  "documento",
];

export function randomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}
