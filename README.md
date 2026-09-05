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

## Estado actual del desarrollo

Fase 1 (Core) en progreso. Implementado:

* Estado central del juego y máquina de estados (`MENU`, `PLAYING`, `PAUSED`, `GAME_OVER`).
* Game loop basado en `requestAnimationFrame` + `deltaTime`.
* Captura de teclado global (sin `<input>` visible).
* Generación de reportes con timers.
* Validación incremental de la palabra escrita.
* Completado / expiración de reportes.
* Puntuación básica con bonus por velocidad, contador de combo, productividad y game over.
* HUD y tarjetas de reporte con feedback de escritura, pausa (Esc) y reinicio.

Pendiente: modificadores (Fase 2), sistemas de score/combo/dificultad completos (Fase 3),
distracciones (Fase 4), audio y pulido (Fase 5).

## Cómo ejecutar

```bash
npm install
npm run dev
```

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
Durante la Fase 1 solo se crean los archivos necesarios; el resto se añade por fase.

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

No depender exclusivamente de `setInterval()` para movimiento o timers críticos del gameplay.

`setTimeout()` / `setInterval()` pueden utilizarse para eventos simples de spawning si no generan problemas con el estado del juego.

---

# 6. Game State

El estado principal debe contener únicamente información relevante para la partida.

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

Separar: Game State → Game Logic → UI.

---

# 7. Reports

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
SPAWN → PENDING → ACTIVE → PLAYER INPUT → CORRECT → COMPLETED
ACTIVE → TIMEOUT → EXPIRED
ACTIVE → INVALID INPUT → FAILED
```

El comportamiento exacto de `FAILED` debe ser configurable.

---

# 9. Report Input

El jugador debe poder escribir sin hacer click previamente sobre un input HTML.

El juego captura directamente `window.addEventListener("keydown", ...)`.

Cada tecla se compara contra la respuesta esperada del reporte activo. Al completar la palabra el reporte pasa a `COMPLETED`, el input se limpia y se selecciona el siguiente reporte.

---

# 10. Input Validation

El sistema mantiene `currentInput` y lo compara con `report.expectedInput`.

```javascript
const isCorrect = currentInput === report.expectedInput;
```

Durante la escritura se usa comparación incremental (`expectedInput.startsWith(currentInput)`).

El comportamiento ante un error se define centralmente, no dentro de la UI.

---

# 11. Modifiers

Los modificadores transforman la palabra original en una palabra esperada diferente.

```text
Original Word → Modifier → Expected Input
```

Los modificadores se implementan como funciones independientes. Agregar nuevos modificadores no debe requerir modificar `ReportManager`.

---

# 12. Modifier Definitions

## RED — Uppercase

```text
servidor → SERVIDOR
```

## BLUE — Reverse

```text
servidor → rodivres
```

## GREEN — Vowel Shift

```text
a → e
e → i
i → o
o → u
u → a
```

Ejemplo: `casa → cese`. La transformación debe ser determinista.

---

# 13. Modifier Data

```javascript
{
    id: "uppercase",
    color: "red",
    label: "MAYÚSCULAS",
    transform: (word) => word.toUpperCase()
}
```

```javascript
{
    id: "reverse",
    color: "blue",
    label: "AL REVÉS",
    transform: (word) => word.split("").reverse().join("")
}
```

---

# 14. Modifier Selection

El modificador de un reporte se determina al generarlo:

```javascript
const modifier = modifierSystem.getRandomModifier();
const expectedInput = modifier.transform(word);
```

El reporte almacena el resultado esperado. No recalcular la transformación en múltiples partes del código.

---

# 15. Report Generation

`ReportManager` es responsable de: crear reportes, asignar palabras, asignar modificadores, calcular respuesta esperada, controlar timers, completar y expirar reportes.

No es responsable de: renderizar HTML complejo, controlar la puntuación global, reproducir sonidos directamente.

---

# 16. Report Spawning

Variables configurables:

```javascript
spawnInterval
minSpawnInterval
maxActiveReports
reportTimeLimit
```

Los valores se centralizan para facilitar el balance.

---

# 17. Multiple Reports

El juego permite varios reportes simultáneos. El jugador debe poder identificar cuál es el reporte activo.

---

# 18. Active Report

Debe existir únicamente un `activeReportId` en cada momento. La escritura se aplica únicamente al reporte activo.

Selección: click, teclas numéricas o atajos. Para el MVP se usa **click sobre el reporte**.

---

# 19. Distractions

Objetos visuales que aparecen sobre la oficina y se eliminan con click.

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

MVP: `fly` (mosca en posición aleatoria), `notification` (notificación sobre la interfaz), `popup` (ventana que bloquea parcialmente la interfaz).

---

# 21. Distraction Manager

Responsabilidades: spawn, position, movement, lifetime, click detection, removal, penalties.

No modifica directamente el score: emite un evento o devuelve un resultado para que `ScoreSystem` / `Game` aplique la consecuencia.

---

# 22. Mouse Interaction

Usar `pointerdown` o `click`. Cada distracción tiene un elemento DOM independiente con `data-distraction-id` que la relaciona con su estado interno.

---

# 23. Productivity

```javascript
productivity = 100;
```

```text
Reporte expirado    → -10 productivity
Error               → -5 productivity
Distracción ignorada → -5 productivity
```

Los valores están centralizados en configuración.

---

# 24. Game Over

Cuando `productivity <= 0` el juego pasa a `GAME_OVER`. Se detienen: spawning, input, timers, distracciones, difficulty updates. El jugador puede reiniciar inmediatamente.

---

# 25. Score System

El score depende principalmente de: reporte completado + velocidad + combo.

```javascript
basePoints = 100;
speedBonus = ...
comboMultiplier = ...
```

No usar fórmulas excesivamente complejas.

---

# 26. Combo

```text
Reporte completado → combo += 1
Fallo / expiración  → combo = 0
```

Multiplicador:

```text
0-4    → x1
5-9    → x2
10-19  → x3
20+    → x4
```

Valores configurables.

---

# 27. Difficulty System

La dificultad aumenta automáticamente. Variables: `level`, `spawnInterval`, `reportTimeLimit`, `distractionFrequency`, `maxActiveReports`.

---

# 28. Difficulty Scaling

```javascript
spawnInterval = Math.max(
    minSpawnInterval,
    initialSpawnInterval - level * 0.15
);
```

Evitar sistemas complejos de dificultad adaptativa durante el MVP.

---

# 29. Word Pool

Palabras almacenadas localmente en `src/data/words.js`. Relacionadas con oficina, fáciles de reconocer, longitud variable. No incluir palabras excesivamente largas en niveles iniciales.

---

# 30. Configuration

Valores de gameplay centralizados en `src/config.js` (`GAME_CONFIG`). Evitar números mágicos repartidos por múltiples archivos.

---

# 31. UI Architecture

```text
GameScreen
├── HUD (Score, Combo, Productivity, Level)
├── ReportsContainer → ReportCard[]
├── DistractionsContainer → Distraction[]
└── GameOverScreen
```

---

# 32. Report Card

Cada reporte muestra: REPORT ID, WORD, MODIFIER, TIMER, INPUT. El input actual se muestra visualmente para feedback inmediato.

---

# 33. Visual Feedback

* **Correct**: sonido, animación, puntos, combo, el reporte desaparece.
* **Incorrect**: shake, sonido de error, feedback visual, penalización.
* **Expired**: el reporte desaparece, animación de error, penalización.
* **Distraction removed**: click effect, sonido, animación de desaparición.

---

# 34. Input UX

El teclado está siempre activo durante `PLAYING`. No usar un `<input>` visible como mecánica principal. El texto escrito se muestra como feedback dentro del reporte activo.

---

# 35. Event Communication

Evitar acoplar sistemas directamente. Usar `EventTarget` + `CustomEvent`. No implementar un event bus complejo.

```text
ReportManager → reportCompleted → Game → ScoreSystem → HUD
```

---

# 36. Main Game Controller

`Game.js` coordina: `ReportManager`, `DistractionManager`, `ScoreSystem`, `DifficultySystem`, `AudioManager`, `GameUI`.

Responsable de: inicializar, iniciar partida, pausar, reiniciar, actualizar sistemas, finalizar partida.

---

# 37. Responsibilities

| Archivo | Responsabilidad |
| --- | --- |
| `Game.js` | Orquestación general |
| `ReportManager.js` | Lógica de reportes |
| `ModifierSystem.js` | Transformaciones de palabras |
| `DistractionManager.js` | Lógica de distracciones |
| `ScoreSystem.js` | Score y combo |
| `DifficultySystem.js` | Escalado de dificultad |
| `GameUI.js` | Actualización general de interfaz |
| `ReportUI.js` | Render de reportes |
| `HUD.js` | Score, combo, productividad y nivel |
| `AudioManager.js` | Sonidos y música |

---

# 38. Data vs Logic

Los datos permanecen separados de la lógica en `src/data/`. No hardcodear listas de palabras dentro de `ReportManager`.

---

# 39. Error Handling

No implementar un sistema complejo de errores. Sí evitar: null references, reportes inexistentes, IDs duplicados, eventos ejecutándose después de `GAME_OVER`, timers activos después de reiniciar.

```javascript
if (gameState.status !== "PLAYING") {
    return;
}
```

---

# 40. Performance

Evitar: crear cientos de elementos DOM innecesariamente, timers infinitos, listeners duplicados, animaciones JavaScript cuando CSS puede realizarlas, re-renderizar toda la interfaz en cada frame.

Actualizar únicamente los elementos que cambian.

---

# 41. CSS

Clases semánticas:

```text
.report / .report--active / .report--expired
.report__word / .report__modifier / .report__timer / .report__input
.modifier--red / .modifier--blue / .modifier--green
```

Preferir CSS variables para colores y valores reutilizables.

---

# 42. Animations

Preferir `transform` y `opacity`. Evitar modificar continuamente `top` / `left` / `width` / `height` mediante JavaScript cuando sea posible.

---

# 43. Audio

`AudioManager` abstrae el acceso al audio:

```javascript
audio.play("reportComplete");
audio.play("error");
audio.play("distractionClick");
audio.play("combo");
audio.play("gameOver");
```

El resto del juego no manipula directamente objetos `Audio`.

---

# 44. MVP

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

---

# 45. Development Priority

## Phase 1 — Core

Game state, game loop, keyboard input, report generation, word validation, report completion.

## Phase 2 — Modifiers

Uppercase, reverse, vowel shift.

## Phase 3 — Game Systems

Score, combo, productivity, timer, difficulty.

## Phase 4 — Distractions

Spawn, click, removal, lifetime, penalty.

## Phase 5 — Polish

Animations, sound, particles, screen shake, better UI, game over screen.

---

# 46. Definition of Done

Una feature está terminada cuando: funciona en navegador, no genera errores en consola, puede reiniciarse correctamente, no deja timers/listeners activos incorrectamente, no rompe otros sistemas, tiene feedback visual mínimo, su código es sencillo de modificar.

---

# 47. Instructions for AI Coding Agents

Este README es el contexto técnico principal del proyecto.

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

Antes de modificar código, identificar: qué sistema es responsable, qué estado necesita, qué otros sistemas dependen de él, si ya existe una implementación reutilizable.

Para nuevas funcionalidades, preferir agregar comportamiento a un sistema existente sobre crear un nuevo sistema si ambos resuelven el problema.

---

# 48. AI Implementation Rules

## DO

Mantener funciones pequeñas, nombres descriptivos, responsabilidades claras, reutilizar código, usar constantes para configuración, usar ES Modules, comentar solo lógica no obvia, probar inmediatamente después de cada cambio.

## DON'T

No agregar Redux, React ni TypeScript. No crear clases innecesarias, patrones Enterprise ni una API/backend. No agregar librerías para funcionalidades triviales. No refactorizar todo el proyecto para una feature pequeña.

---

# 49. Design Principle

```text
FUN → GAMEPLAY → FEEDBACK → POLISH → ARCHITECTURE
```

La arquitectura debe ser suficientemente buena para desarrollar rápidamente, pero nunca el objetivo principal.

---

# 50. Current Game Vision

```text
                OFFICE PANIC

     ⌨️ TYPE FAST + 🖱️ CLICK FAST + 🧠 THINK FAST = SURVIVE
```

El jugador comienza pensando "solo tengo que escribir palabras" y termina pensando "tengo tres reportes pendientes, uno está al revés, una mosca está tapando otro y mi productividad está en 12%". Ese incremento de presión es el núcleo de la experiencia.
