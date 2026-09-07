===============================================================
 OFFICE PANIC
 Juego de mecanografia arcade  -  Game Jam UNIS
===============================================================

-----------------------------------------------
 DE QUE TRATA
-----------------------------------------------

Eres un oficinista y tienes que sobrevivir tu turno de 9:00 AM
a 5:00 PM.

Desde los bordes de la oficina te llegan carpetas (reportes)
hacia tu personaje, en el centro. Cada carpeta trae una palabra
que tienes que escribir con el teclado ANTES de que te alcance.
Si una carpeta llega, o si te equivocas al escribir, tu
PRODUCTIVIDAD baja. Si llega a 0, te despiden (game over).

Al mismo tiempo aparecen distracciones (una mosca, el jefe, el
telefono, un companero, un pop-up...) que se pasean por la
oficina y te molestan la vista cuando te tocan. Las quitas
haciendo CLICK sobre ellas.

Completar palabras da puntos. Encadenar aciertos sin fallar
sube el COMBO y multiplica los puntos. Cada turno que superas
es mas rapido y mas dificil.


-----------------------------------------------
 COMO SE JUEGA
-----------------------------------------------

- Escribe con el TECLADO la palabra de la carpeta. No hace
  falta hacer click en ningun recuadro: empieza a escribir y
  el juego engancha la carpeta cuya palabra empieza por esa
  letra.
- Haz CLICK con el raton sobre las distracciones para quitarlas.
- ENTER: empezar la partida / pasar al siguiente turno /
  reintentar.
- ESC: pausa.

El turno 1 arranca con un tutorial corto que ensena los cuatro
colores de carpeta:

  AMARILLA  ->  escribe la palabra tal cual.
  ROJA      ->  escribela en MAYUSCULAS.
  VERDE     ->  cambia cada vocal:  a>e  e>i  i>o  o>u  u>a
  AZUL      ->  escribela al reves.

Las carpetas verdes aparecen a partir de la tarde y las azules
en la "hora pico", cuando todo se acelera.

Tu mejor puntuacion se guarda en el navegador y se muestra en
el menu de inicio.


-----------------------------------------------
 COMO EJECUTARLO
-----------------------------------------------

El juego corre en el navegador. IMPORTANTE: no funciona
abriendo el index.html con doble click (los navegadores
bloquean la carga de modulos y de los sonidos desde un
archivo local). Hay que servirlo con un pequeno servidor
local. Tienes dos opciones:


OPCION A  -  Version ya compilada (carpeta "dist")
-------------------------------------------------------
Si el ZIP trae una carpeta llamada "dist", ya esta todo
compilado y solo necesitas levantar un servidor dentro de
ella.

  1. Instala Node.js si no lo tienes:  https://nodejs.org
     (cualquier version reciente sirve).
  2. Abre una terminal (CMD o PowerShell) dentro de la
     carpeta "dist".
  3. Ejecuta:

        npx serve

     (o, si tienes Python:   python -m http.server 8080  )

  4. Abre en el navegador la direccion que te muestre la
     terminal, normalmente:

        http://localhost:3000
        (o http://localhost:8080 con Python)


OPCION B  -  Desde el codigo fuente
-------------------------------------------------------
Si el ZIP trae las carpetas "src" y "assets" y el archivo
"package.json":

  1. Instala Node.js:  https://nodejs.org
  2. Abre una terminal dentro de la carpeta del proyecto.
  3. Ejecuta una sola vez:

        npm install

  4. Y luego, para jugar:

        npm run dev

  5. Abre en el navegador la direccion que aparece, normalmente:

        http://localhost:5173

  Para generar tu propia version compilada:  npm run build
  (queda en la carpeta "dist").


-----------------------------------------------
 REQUISITOS Y NOTAS
-----------------------------------------------

- Navegador moderno de escritorio (Chrome, Edge o Firefox
  actualizados). Con teclado y raton.
- El SONIDO se activa despues del primer click o tecla dentro
  de la pagina (es una norma de los navegadores). Si no oyes
  nada, haz click una vez en la ventana del juego.
- Manten la pestana del juego EN PRIMER PLANO. Si la dejas en
  segundo plano el navegador congela la animacion y el audio.
- Todo es local: no necesita internet (salvo la primera
  instalacion), ni cuenta, ni conexion a ningun servidor.


-----------------------------------------------
 CREDITOS
-----------------------------------------------

Hecho para la Game Jam UNIS.
Repositorio:  https://github.com/jptorresg/Game-Jam-UNIS

HTML + CSS + JavaScript (ES Modules), sin frameworks.
Empaquetado con Vite.
