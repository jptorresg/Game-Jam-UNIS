import { defineConfig } from "vite";

// `assets/` se sirve tal cual (imagenes, sonidos, fuentes). Un archivo en
// `assets/images/x.png` queda accesible como `/images/x.png`.
export default defineConfig({
  publicDir: "assets",
});
