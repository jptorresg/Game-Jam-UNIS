# Office Panic

Arcade typing game desarrollado para una Game Jam.

El jugador trabaja en una oficina procesando reportes que llegan constantemente. Cada reporte contiene una palabra que debe ser escrita correctamente antes de que expire su tiempo.

Los reportes pueden tener modificadores que alteran la palabra objetivo. Paralelamente, aparecen distracciones que deben eliminarse haciendo click con el mouse.

El objetivo es crear una experiencia arcade rápida basada en:

* Velocidad de escritura.
* Precisión.
* Atención.
* Multitarea.
* Gestión de presión.

---

## Cómo ejecutar

```bash
npm install
npm run dev
```

## Estado del desarrollo

* **Fase 1 — Core:** hecho. Estado central y máquina de estados, game loop con
  `deltaTime`, captura de teclado global, generación y validación de reportes,
  puntuación con bonus de velocidad, combo, productividad, game over y reinicio.
* **Fase 2 — Modificadores:** en progreso.
* **Fase 3 — Sistemas (score/combo/dificultad):** pendiente.
* **Fase 4 — Distracciones:** pendiente.
* **Fase 5 — Audio y pulido:** pendiente (audio al final).

---

# 1. Technical Constraints

Este proyecto está diseñado para una Game Jam.

## Reglas principales

* Mantener la implementación simple.
* Priorizar gameplay sobre arquitectura.
* Evitar dependencias innecesarias.
* No implementar backend.
* No implementar autenticación.
* No implementar base de datos.
* No introducir frameworks frontend.
* No crear abstracciones innecesarias.
* Preferir código directo y fácil de modificar.
* Toda funcionalidad debe poder probarse rápidamente.

Si una solución sencilla funciona, **no reemplazarla por una solución más compleja**.

---

# 2. Stack

## Runtime

Browser moderno compatible con:

* ES Modules.
* DOM API.
* Keyboard Events.
* Pointer Events.
* CSS animations.
* Web Audio API.

## Frontend

```text
HTML5
CSS3
JavaScript ES Modules
```

No utilizar:

* React
* Vue
* Angular
* Svelte
* TypeScript

salvo que el equipo decida explícitamente cambiar esta decisión.

## Build Tool

Vite.

Responsabilidades:

* Development server.
* Hot reload.
* Production build.

## Rendering

La UI principal se renderizará utilizando:

```text
HTML + CSS
```

Canvas solamente debe utilizarse si posteriormente se necesitan:

* Partículas.
* Efectos visuales.
* Efectos de pantalla.

No utilizar Canvas para toda la interfaz.

## Audio

Web Audio API y/o archivos de audio locales.

## Version Control

Git + GitHub.

---

# 3. Project Structure

```text
office-panic/
│
├── index.html
├── package.json
├── README.md
│
├── src/
│   ├── main.js
│   ├── style.css
│   │
│   ├── game/
│   │   ├── Game.js
│   │   ├── ReportManager.js
│   │   ├── DistractionManager.js
│   │   ├── ModifierSystem.js
│   │   ├── ScoreSystem.js
│   │   └── DifficultySystem.js
│   │
│   ├── data/
│   │   ├── words.js
│   │   ├── modifiers.js
│   │   └── distractions.js
│   │
│   ├── ui/
│   │   ├── GameUI.js
│   │   ├── ReportUI.js
│   │   ├── HUD.js
│   │   └── MenuUI.js
│   │
│   └── audio/
│       └── AudioManager.js
│
└── assets/
    ├── images/
    ├── sounds/
    └── fonts/
```

Esta estructura puede simplificarse si durante la jam se vuelve innecesariamente compleja.

---

# 4. Game States

El juego debe manejar cuatro estados principales:

```javascript
MENU
PLAYING
PAUSED
GAME_OVER
```

Flujo:

```text
MENU
  ↓
PLAYING
  ↓
PAUSED
  ↓
PLAYING
  ↓
GAME_OVER
  ↓
MENU / RESTART
```

El estado actual debe estar centralizado en `Game.js`.

No crear múltiples sistemas independientes que puedan modificar el estado global del juego.

---

# 5. Game Loop

El juego funciona mediante un loop basado en tiempo.

Conceptualmente:

```text
requestAnimationFrame()
        ↓
calculate deltaTime
        ↓
update game systems
        ↓
update timers
        ↓
update distractions
        ↓
update difficulty
        ↓
render/update DOM
        ↓
requestAnimationFrame()
```

Usar `deltaTime` para cualquier comportamiento dependiente del tiempo.

No depender exclusivamente de:

```javascript
setInterval()
```

para movimiento o timers críticos del gameplay.

`setTimeout()` / `setInterval()` pueden utilizarse para eventos simples de spawning si no generan problemas con el estado del juego.

---

# 6. Game State

El estado principal debe contener únicamente información relevante para la partida.

Ejemplo:

```javascript
const gameState = {
    status: "PLAYING",

    score: 0,
    combo: 0,
    productivity: 100,

    level: 1,

    reports: [],
    distractions: [],

    activeReportId: null,

    elapsedTime: 0
};
```

Evitar almacenar referencias DOM directamente dentro del estado lógico.

Separar:

```text
Game State
     ↓
Game Logic
     ↓
UI
```

---

# 7. Reports

Los reportes son la mecánica principal.

Cada reporte debe tener:

```javascript
{
    id: "report-001",
    word: "servidor",
    modifier: "uppercase",

    expectedInput: "SERVIDOR",

    timeLimit: 8,
    remainingTime: 8,

    status: "pending",

    points: 100
}
```

## Report Status

```text
PENDING
ACTIVE
COMPLETED
EXPIRED
FAILED
```

---

# 8. Report Lifecycle

```text
SPAWN
  ↓
PENDING
  ↓
ACTIVE
  ↓
PLAYER INPUT
  ↓
CORRECT
  ↓
COMPLETED
```

o:

```text
ACTIVE
  ↓
TIMEOUT
  ↓
EXPIRED
```

o:

```text
ACTIVE
  ↓
INVALID INPUT
  ↓
FAILED
```

El comportamiento exacto de `FAILED` debe ser configurable.

---

# 9. Report Input

El jugador debe poder escribir sin hacer click previamente sobre un input HTML.

El juego debe capturar directamente:

```javascript
window.addEventListener("keydown", ...)
```

Cada tecla debe compararse contra la respuesta esperada del reporte activo.

Ejemplo:

```text
Expected:

SERVIDOR

Input:

S
SE
SER
SERV
SERVI
...
SERVIDOR
```

Al completar la palabra:

```text
report → COMPLETED
```

El input se limpia y se selecciona el siguiente reporte.

---

# 10. Input Validation

El sistema debe mantener:

```javascript
currentInput
```

y compararlo con:

```javascript
report.expectedInput
```

Ejemplo:

```javascript
const isCorrect =
    currentInput === report.expectedInput;
```

Durante la escritura puede utilizarse comparación incremental.

Ejemplo:

```text
Expected: SERVIDOR
Input:    SERV

VALID
```

Pero:

```text
Expected: SERVIDOR
Input:    SERX

INVALID
```

El comportamiento ante un error debe definirse centralmente y no dentro de la UI.

---

# 11. Modifiers

Los modificadores transforman la palabra original en una palabra esperada diferente.

Arquitectura:

```text
Original Word
      ↓
Modifier
      ↓
Expected Input
```

Ejemplo:

```javascript
word = "servidor"

modifier = "uppercase"

expectedInput = "SERVIDOR"
```

Los modificadores deben implementarse como funciones independientes.

Conceptualmente:

```javascript
modifiers = {
    uppercase(word),
    reverse(word),
    vowelShift(word)
}
```

Agregar nuevos modificadores no debe requerir modificar `ReportManager`.

---

# 12. Modifier Definitions

## RED — Uppercase

Color:

```text
RED
```

Transformación:

```text
servidor
↓
SERVIDOR
```

---

## BLUE — Reverse

Color:

```text
BLUE
```

Transformación:

```text
servidor
↓
rodivres
```

---

## GREEN — Vowel Shift

Color:

```text
GREEN
```

Regla inicial:

```text
a → e
e → i
i → o
o → u
u → a
```

Ejemplo:

```text
casa
↓
cese
```

La transformación debe ser determinista.

---

# 13. Modifier Data

Los modificadores deben tener metadata:

```javascript
{
    id: "uppercase",
    color: "red",
    label: "MAYÚSCULAS",

    transform: (word) => word.toUpperCase()
}
```

Ejemplo:

```javascript
{
    id: "reverse",
    color: "blue",
    label: "AL REVÉS",

    transform: (word) =>
        word.split("").reverse().join("")
}
```

Esto permite que la UI obtenga la información del modificador sin duplicarla.

---

# 14. Modifier Selection

El modificador de un reporte debe determinarse al generarlo.

Ejemplo:

```javascript
const modifier =
    modifierSystem.getRandomModifier();
```

Posteriormente:

```javascript
const expectedInput =
    modifier.transform(word);
```

El reporte debe almacenar el resultado esperado.

No recalcular la transformación en múltiples partes del código.

---

# 15. Report Generation

El `ReportManager` será responsable de:

* Crear reportes.
* Asignar palabras.
* Asignar modificadores.
* Calcular respuesta esperada.
* Controlar timers.
* Completar reportes.
* Expirar reportes.

No debe ser responsable de:

* Renderizar HTML complejo.
* Controlar puntuación global.
* Reproducir sonidos directamente.

---

# 16. Report Spawning

El sistema debe generar reportes progresivamente.

Variables configurables:

```javascript
spawnInterval
minSpawnInterval
maxActiveReports
reportTimeLimit
```

Ejemplo:

```text
Level 1
→ 1 reporte cada 3 segundos

Level 2
→ 1 reporte cada 2.5 segundos

Level 3
→ 1 reporte cada 2 segundos
```

Los valores deben centralizarse para facilitar el balance.

---

# 17. Multiple Reports

El juego debe permitir varios reportes simultáneamente.

Ejemplo:

```text
┌──────────────┐
│ REPORT #01   │
│ servidor     │
│ 🔴           │
│ 3.4s         │
└──────────────┘

┌──────────────┐
│ REPORT #02   │
│ impresora    │
│ 🔵           │
│ 7.1s         │
└──────────────┘

┌──────────────┐
│ REPORT #03   │
│ correo       │
│ 🟢           │
│ 9.3s         │
└──────────────┘
```

El jugador debe poder identificar cuál es el reporte activo.

---

# 18. Active Report

Debe existir únicamente un:

```javascript
activeReportId
```

en cada momento.

La escritura se aplica únicamente al reporte activo.

La selección del reporte puede realizarse mediante:

* Click.
* Teclas numéricas.
* Atajos.

Para el MVP se recomienda **click sobre el reporte**.

---

# 19. Distractions

Las distracciones son objetos visuales que aparecen sobre la oficina.

El jugador las elimina haciendo click.

Ejemplo:

```javascript
{
    id: "distraction-01",
    type: "fly",

    x: 500,
    y: 250,

    lifetime: 4,

    clickable: true
}
```

---

# 20. Distraction Types

MVP:

### Fly

Una mosca que aparece en una posición aleatoria.

```text
🪰
```

### Notification

Una notificación que aparece sobre la interfaz.

```text
🔔 New notification
```

### Popup

Una ventana que bloquea parcialmente la interfaz.

```text
┌────────────────────┐
│ SYSTEM MESSAGE     │
│                    │
│      [ OK ]        │
└────────────────────┘
```

---

# 21. Distraction Manager

Responsabilidades:

* Spawn.
* Position.
* Movement.
* Lifetime.
* Click detection.
* Removal.
* Penalties.

No debe modificar directamente el score.

Debe emitir un evento o devolver un resultado para que `ScoreSystem` / `Game` aplique la consecuencia.

---

# 22. Mouse Interaction

Utilizar:

```javascript
pointerdown
```

o:

```javascript
click
```

para detectar interacción.

Cada distracción debe tener un elemento DOM independiente.

Ejemplo:

```html
<div
    class="distraction distraction--fly"
    data-distraction-id="distraction-01">
</div>
```

El ID permite relacionar el elemento visual con el estado interno.

---

# 23. Productivity

La partida tiene un valor:

```javascript
productivity = 100;
```

La productividad disminuye cuando ocurren eventos negativos.

Ejemplo:

```text
Reporte expirado
→ -10 productivity

Error
→ -5 productivity

Distracción ignorada
→ -5 productivity
```

Los valores deben estar centralizados en configuración.

---

# 24. Game Over

Cuando:

```javascript
productivity <= 0
```

el juego cambia a:

```text
GAME_OVER
```

Se deben detener:

* Spawning.
* Input.
* Timers.
* Distracciones.
* Difficulty updates.

El jugador debe poder reiniciar inmediatamente.

---

# 25. Score System

El score debe depender principalmente de:

```text
Reporte completado
+ velocidad
+ combo
```

Ejemplo:

```javascript
basePoints = 100;
speedBonus = ...
comboMultiplier = ...
```

No utilizar fórmulas excesivamente complejas.

La puntuación debe sentirse consistente y fácil de balancear.

---

# 26. Combo

Cada reporte completado correctamente:

```text
combo += 1
```

Un fallo o reporte expirado:

```text
combo = 0
```

El multiplicador puede ser:

```text
0-4    → x1
5-9    → x2
10-19  → x3
20+    → x4
```

Los valores son configurables.

---

# 27. Difficulty System

La dificultad aumenta automáticamente.

Variables:

```javascript
level
spawnInterval
reportTimeLimit
distractionFrequency
maxActiveReports
```

Ejemplo:

```text
Level 1
↓
Level 2
↓
Level 3
↓
Level 4
↓
...
```

El sistema debe aumentar dificultad sin crear comportamientos impredecibles.

---

# 28. Difficulty Scaling

El escalado debe basarse en una función sencilla.

Ejemplo conceptual:

```javascript
spawnInterval =
    Math.max(
        minSpawnInterval,
        initialSpawnInterval - level * 0.15
    );
```

Evitar sistemas complejos de dificultad adaptativa durante el MVP.

---

# 29. Word Pool

Las palabras estarán almacenadas localmente.

Ejemplo:

```javascript
export const WORDS = [
    "servidor",
    "impresora",
    "correo",
    "reunion",
    "cliente",
    "factura",
    "documento",
    "contraseña",
    "sistema",
    "archivo"
];
```

Las palabras deben ser:

* Relacionadas con oficina.
* Fáciles de reconocer.
* De longitud variable.

No incluir palabras excesivamente largas en niveles iniciales.

---

# 30. Configuration

Los valores de gameplay deben estar centralizados.

Ejemplo:

```javascript
export const GAME_CONFIG = {
    initialProductivity: 100,

    initialSpawnInterval: 3,
    minSpawnInterval: 0.8,

    initialReportTime: 8,

    maxActiveReports: 3,

    baseReportPoints: 100,

    comboResetOnError: true
};
```

Evitar números mágicos repartidos por múltiples archivos.

---

# 31. UI Architecture

La UI debe reflejar el estado del juego.

Componentes principales:

```text
GameScreen
│
├── HUD
│   ├── Score
│   ├── Combo
│   ├── Productivity
│   └── Level
│
├── ReportsContainer
│   └── ReportCard[]
│
├── DistractionsContainer
│   └── Distraction[]
│
└── GameOverScreen
```

---

# 32. Report Card

Cada reporte debe mostrar:

```text
REPORT ID
WORD
MODIFIER
TIMER
INPUT
```

Ejemplo:

```text
┌──────────────────────┐
│ REPORT #124          │
│                      │
│     servidor         │
│                      │
│     🔴 MAYÚSCULAS    │
│                      │
│     SERV             │
│                      │
│     04.21s           │
└──────────────────────┘
```

El input actual debe mostrarse visualmente para dar feedback inmediato.

---

# 33. Visual Feedback

Cada acción importante debe generar feedback.

## Correct

* Sonido.
* Animación.
* Puntos.
* Combo.
* Reporte desaparece.

## Incorrect

* Shake.
* Sonido de error.
* Feedback visual.
* Penalización.

## Expired

* Reporte desaparece.
* Animación de error.
* Penalización.

## Distraction removed

* Click effect.
* Sonido.
* Animación de desaparición.

---

# 34. Input UX

El jugador nunca debería preguntarse:

> "¿Dónde tengo que escribir?"

El teclado debe estar siempre activo durante `PLAYING`.

No utilizar un `<input>` visible como mecánica principal.

El texto escrito debe mostrarse como feedback dentro del reporte activo.

---

# 35. Event Communication

Evitar acoplar sistemas directamente.

Ejemplo:

```text
ReportManager
      ↓
reportCompleted
      ↓
Game
      ↓
ScoreSystem
      ↓
HUD
```

En JavaScript puede utilizarse un sistema de eventos sencillo:

```javascript
EventTarget
CustomEvent
```

No implementar un event bus complejo.

---

# 36. Main Game Controller

`Game.js` coordina los sistemas principales:

```text
Game
│
├── ReportManager
├── DistractionManager
├── ScoreSystem
├── DifficultySystem
├── AudioManager
└── GameUI
```

El `Game` controller es responsable de:

* Inicializar.
* Iniciar partida.
* Pausar.
* Reiniciar.
* Actualizar sistemas.
* Finalizar partida.

---

# 37. Responsibilities

## Game.js

Orquestación general.

## ReportManager.js

Lógica de reportes.

## ModifierSystem.js

Transformaciones de palabras.

## DistractionManager.js

Lógica de distracciones.

## ScoreSystem.js

Score y combo.

## DifficultySystem.js

Escalado de dificultad.

## GameUI.js

Actualización general de interfaz.

## ReportUI.js

Render de reportes.

## HUD.js

Score, combo, productividad y nivel.

## AudioManager.js

Sonidos y música.

---

# 38. Data vs Logic

Los datos deben permanecer separados de la lógica.

Ejemplo:

```text
data/
├── words.js
├── modifiers.js
└── distractions.js
```

No hardcodear listas de palabras dentro de `ReportManager`.

---

# 39. Error Handling

Durante la Game Jam no implementar un sistema complejo de errores.

Sí deben evitarse:

* Null references.
* Reportes inexistentes.
* IDs duplicados.
* Eventos ejecutándose después de GAME_OVER.
* Timers activos después de reiniciar.

Antes de modificar estado:

```javascript
if (gameState.status !== "PLAYING") {
    return;
}
```

cuando sea necesario.

---

# 40. Performance

El juego debe mantenerse ligero.

Evitar:

* Crear cientos de elementos DOM innecesariamente.
* Timers infinitos.
* Listeners duplicados.
* Animaciones JavaScript cuando CSS puede realizarlas.
* Re-renderizar toda la interfaz en cada frame.

Actualizar únicamente los elementos que cambian.

---

# 41. CSS

Utilizar clases semánticas.

Ejemplo:

```text
.report
.report--active
.report--expired
.report__word
.report__modifier
.report__timer
.report__input
```

Para modificadores:

```text
.modifier--red
.modifier--blue
.modifier--green
```

Preferir CSS variables para colores y valores reutilizables.

---

# 42. Animations

Preferir:

```css
transform
opacity
```

para animaciones.

Evitar modificar continuamente:

```css
top
left
width
height
```

mediante JavaScript cuando sea posible.

---

# 43. Audio

`AudioManager` debe abstraer el acceso al audio.

API conceptual:

```javascript
audio.play("reportComplete");
audio.play("error");
audio.play("distractionClick");
audio.play("combo");
audio.play("gameOver");
```

El resto del juego no debe manipular directamente objetos `Audio`.

---

# 44. MVP

El MVP obligatorio es:

```text
[1] Start Game
[2] Generate report
[3] Display word
[4] Display modifier
[5] Transform expected input
[6] Capture keyboard
[7] Validate input
[8] Complete report
[9] Score
[10] Combo
[11] Productivity
[12] Generate distraction
[13] Click distraction
[14] Difficulty increase
[15] Game Over
[16] Restart
```

Si todos estos puntos funcionan, existe un juego jugable.

---

# 45. Development Priority

Implementar en este orden:

## Phase 1 — Core

* Game state.
* Game loop.
* Keyboard input.
* Report generation.
* Word validation.
* Report completion.

## Phase 2 — Modifiers

* Uppercase.
* Reverse.
* Vowel shift.

## Phase 3 — Game Systems

* Score.
* Combo.
* Productivity.
* Timer.
* Difficulty.

## Phase 4 — Distractions

* Spawn.
* Click.
* Removal.
* Lifetime.
* Penalty.

## Phase 5 — Polish

* Animations.
* Sound.
* Particles.
* Screen shake.
* Better UI.
* Game over screen.

---

# 46. Definition of Done

Una feature se considera terminada cuando:

* Funciona en navegador.
* No genera errores en consola.
* Puede reiniciarse correctamente.
* No deja timers/listeners activos incorrectamente.
* No rompe otros sistemas.
* Tiene feedback visual mínimo.
* Su código es sencillo de modificar.

---

# 47. Instructions for AI Coding Agents

Este README es el contexto técnico principal del proyecto.

Cuando una IA modifique el código:

1. Leer primero la estructura existente.
2. Reutilizar sistemas existentes.
3. No crear archivos nuevos si no son necesarios.
4. No introducir dependencias sin justificación.
5. No agregar frameworks.
6. No implementar funcionalidades fuera del alcance solicitado.
7. Mantener JavaScript simple.
8. Mantener separación entre lógica y UI.
9. No duplicar reglas de gameplay.
10. Centralizar configuración.
11. Mantener compatibilidad con navegadores modernos.
12. No sobreingenierizar.

### Antes de modificar código

Identificar:

```text
¿Qué sistema es responsable de esta funcionalidad?
¿Qué estado necesita?
¿Qué otros sistemas dependen de él?
¿Existe ya una implementación reutilizable?
```

### Para nuevas funcionalidades

Preferir:

```text
Agregar comportamiento a un sistema existente
```

sobre:

```text
Crear un nuevo sistema
```

si ambos resuelven correctamente el problema.

---

# 48. AI Implementation Rules

## DO

```text
✓ Mantener funciones pequeñas.
✓ Utilizar nombres descriptivos.
✓ Mantener responsabilidades claras.
✓ Reutilizar código.
✓ Usar constantes para configuración.
✓ Usar ES Modules.
✓ Comentar únicamente lógica no obvia.
✓ Probar inmediatamente después de cada cambio.
```

## DON'T

```text
✗ No agregar Redux.
✗ No agregar React.
✗ No agregar TypeScript.
✗ No crear clases innecesarias.
✗ No crear patrones Enterprise.
✗ No crear una API/backend.
✗ No agregar librerías para funcionalidades triviales.
✗ No refactorizar todo el proyecto para una feature pequeña.
```

---

# 49. Design Principle

La prioridad del proyecto es:

```text
FUN
 ↓
GAMEPLAY
 ↓
FEEDBACK
 ↓
POLISH
 ↓
ARCHITECTURE
```

La arquitectura debe ser suficientemente buena para desarrollar rápidamente, pero nunca debe convertirse en el objetivo principal.

---

# 50. Current Game Vision

La experiencia final debe sentirse como:

```text
                OFFICE PANIC

     ⌨️ TYPE FAST
          +
     🖱️ CLICK FAST
          +
     🧠 THINK FAST
          =
       SURVIVE
```

El jugador debe comenzar pensando:

> "Solo tengo que escribir palabras."

y terminar pensando:

> "Tengo tres reportes pendientes, uno está al revés, una mosca está tapando otro y mi productividad está en 12%."

Ese incremento de presión es el núcleo de la experiencia.
