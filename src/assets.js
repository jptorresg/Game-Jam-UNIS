// Resuelve la ruta de un asset (imagen, sonido, musica) respetando la base del
// build. En desarrollo `import.meta.env.BASE_URL` es "/", asi que el resultado
// es identico a antes (`/images/...`). En el build para itch.io la base es
// "./", de modo que el juego funciona aunque se sirva desde una subcarpeta
// dentro de un iframe.
const BASE = import.meta.env.BASE_URL;

export function asset(path) {
  return BASE + String(path).replace(/^\/+/, "");
}
