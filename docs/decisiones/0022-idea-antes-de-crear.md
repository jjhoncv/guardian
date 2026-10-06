# 0022. La idea y el alcance van antes de crear nada; comandos con prefijo `guardian`

- **Fecha:** 2026-10-05
- **Estado:** Aceptada (complementa 0019 y 0021)

## Contexto

En la prueba, `nuevo-proyecto.sh` creó repo, sitio de Netlify y tokens con un nombre («lista-de-lecturas») antes de saber de qué trataba el proyecto; la entrevista llegó después, dentro del proyecto, y el nombre resultó otro («Vitrina»). El ciclo de vida de `PROYECTO.md` ya decía 0 Idea → 1 Alcance antes del esqueleto. Además, los comandos del Guardián se confundían con los de Claude, y el dueño no sabía qué tenía definido ni qué le faltaba.

## Decisión

- **`/guardian-idea`** (en el repo del Guardián): ¿prueba o proyecto real? → ficha de una página (5 u 8 preguntas simples, sin jerga de negocio; incluye «cómo sabré que funcionó» y «límites») → nombre con disponibilidad verificada → `PROYECTO.md` en `~/Projects/ideas/<slug>/`. **No crea nada.**
- **`nuevo-proyecto.sh <slug> --alcance <archivo>`**: el proyecto nace con ese alcance; el nombre sale de su título.
- **`/guardian-planificar`** (renombre de `/planificar`): en el proyecto, alcance → escenarios + plan por PR. Su entrevista queda como respaldo.
- **`/guardian`**: menú y estado (paso del ciclo, qué está ✅ y qué falta ⬜, siguiente paso). Todos los comandos llevan el prefijo `guardian`.
- `PROYECTO.md` suma las secciones **Cómo sé que funcionó** y **Límites**.

## Por qué

Evita crear y borrar infraestructura por un nombre equivocado, pone el criterio de éxito antes del primer commit (clave para no dejar proyectos a medias) y separa con claridad lo que es del Guardián de lo que es de Claude.
