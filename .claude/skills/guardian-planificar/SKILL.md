---
name: guardian-planificar
description: Pasos 3 y 4 del ciclo de vida del Guardián, dentro de un proyecto. Convierte el alcance (PROYECTO.md) en escenarios BDD en rojo y un plan de tareas aprobado por PR; al fusionarlo se crean los tickets. Úsala al empezar un proyecto creado con nuevo-proyecto.sh, o cuando el dueño cambie el alcance.
---

# /guardian-planificar — del alcance a escenarios y tickets

Reglas que no se negocian (PROYECTO.md y ADR 0019):
- **El dueño decide el alcance.** Tú preguntas, propones y redactas; no inventas funcionalidades.
- **Idea nueva o "estaría bueno…" → Parking lot**, no al alcance.
- **Máximo 5 fases.** Cada fase es un entregable usable en producción.
- **Sin escenario no hay tarea.** Cada tarea pone en verde al menos un escenario; cada escenario tiene una tarea.
- **Nada se crea sin aprobación:** primero muestras, después escribes, y todo entra por PR.

## Paso 1 — ¿Hay alcance?

Lee `PROYECTO.md`. Está **en blanco o incompleto** si conserva textos de la plantilla como «Qué duele hoy y a quién.», `<nombre>`, `<entregable>`, `Escenario: <nombre>`, o si no tiene criterios de aceptación en Gherkin.

- En blanco → lo normal es definirlo antes con **`/guardian-idea`** en el repo del Guardián. Si el dueño prefiere hacerlo aquí → **Paso 2 (entrevista de respaldo)**.
- Completo → **Paso 3 (planificar)**.

## Paso 2 — Entrevista de respaldo (solo si el alcance está en blanco)

Una sección por vez, preguntas cortas, en el idioma del dueño. Después de cada respuesta, resume en una línea y sigue.

1. **Problema:** ¿qué duele hoy y a quién?
2. **Qué es:** en una o dos frases.
3. **Qué NO es:** ¿qué podría esperar alguien y queda fuera a propósito?
4. **Valor:** ¿qué cambia para el usuario cuando esté en producción?
5. **Fases (máx. 5):** ¿cuál es el primer entregable usable? Propón un corte chico; empuja lo demás a fases siguientes o al Parking lot.
6. **Criterios de aceptación:** por cada entregable, escenarios en Gherkin en español (`Escenario / Dado / Cuando / Entonces`), con un resultado **observable en la página**.

Muestra el `PROYECTO.md` completo y **espera el OK** antes de seguir. Lo que el dueño mande al Parking lot va en su sección, con fecha y motivo.

## Paso 3 — Planificar

**Escenarios** — un archivo por fase: `features/fase-<N>-<slug>.feature`.
- Primera línea `# language: es`; `Característica:` con el entregable de la fase; cada escenario con la etiqueta `@fase-<N>`.
- Copia los escenarios de los criterios de `PROYECTO.md` **sin cambiar su sentido**. Si uno no se puede probar en la página, propón reescribirlo y pregunta.
- **No escribas pasos** (`features/steps/`): un escenario sin pasos queda *pendiente* (rojo) y no rompe el CI (ADR 0018). Los pasos llegan con cada tarea.
- No toques los escenarios `@plantilla`.

**Tareas** — `plan/tareas.json`:

```json
{
  "fases": [{ "numero": 1, "nombre": "Lista básica", "entregable": "Agregar libros y marcarlos como leídos" }],
  "tareas": [
    {
      "id": "T1",
      "fase": 1,
      "titulo": "Agregar un libro pendiente",
      "escenarios": [{ "archivo": "features/fase-1-lista-basica.feature", "gherkin": "Escenario: Agregar un libro pendiente\n  Dado …\n  Cuando …\n  Entonces …" }],
      "que": "Qué se construye, en dos o tres líneas.",
      "hecho": "El escenario «Agregar un libro pendiente» en verde.",
      "necesita": ""
    }
  ]
}
```

- Una tarea = **un PR chico** (idealmente < 300 líneas). Si no entra, pártela.
- Ordena las tareas en el orden en que conviene hacerlas.
- `necesita`: cuentas, credenciales o decisiones del dueño; vacío si nada.
- **Si `plan/tareas.json` ya existe:** conserva los ids existentes y agrega las tareas nuevas con ids nuevos (los tickets ya creados no se repiten ni se borran).

## Paso 4 — Mostrar y esperar

Antes de escribir archivos, muestra al dueño:

| Fase | Tarea | Escenarios |
|---|---|---|

más el total: «N escenarios en rojo, M tareas, K fases». **Espera su OK.**

## Paso 5 — Escribir, verificar y abrir el PR

1. Rama `docs/plan-<slug-de-la-fase>` desde `main`.
2. Escribe los `.feature` y `plan/tareas.json` (y `PROYECTO.md` si hubo entrevista).
3. Verifica:
   - `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/crear-tickets.ts plan/tareas.json --validar` → sin errores.
   - `npm run build && npm run e2e && npm run avance` → los escenarios nuevos aparecen **pendientes** y el avance arranca en 0 %.
4. Commit y PR con título `docs(plan): <resumen>` (Conventional Commits). En el cuerpo: la tabla del Paso 4 y «Al fusionar este PR se crean M tickets (workflow *Tickets del plan*)».
5. Dile al dueño qué revisar en el PR y que **fusionarlo = aprobar el plan**.

Al fusionarlo, el workflow *Tickets del plan* crea un issue por tarea con su etiqueta `fase-N`; con *Auto-add* activado entran solos al tablero.
