import { defineConfig } from "vite";

// `assets/` se sirve tal cual (imagenes, sonidos, fuentes). Un archivo en
// `assets/images/x.png` queda accesible como `/images/x.png`.
//
// La base del build es "./" (rutas relativas) para que el juego funcione al
// subirlo a itch.io, que lo sirve desde una subcarpeta dentro de un iframe. En
// desarrollo se deja en "/" para no cambiar nada del servidor local.
export default defineConfig(({ command }) => ({
  publicDir: "assets",
  base: command === "build" ? "./" : "/",
}));
