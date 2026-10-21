---
name: guardian-idea
description: Paso 0 y 1 del ciclo de vida del Guardián. Conversa la idea con el dueño (¿prueba o proyecto real?), arma una ficha de una página, propone un nombre libre y redacta el PROYECTO.md con su alcance. No crea nada en GitHub ni en Netlify. Úsala en el repo del Guardián antes de crear un proyecto.
---

# /guardian-idea — de la idea al alcance, sin crear nada

Reglas:
- **No crees nada** en GitHub, Netlify ni otras cuentas. Solo escribes en `~/Projects/ideas/<slug>/`.
- **Una pregunta por vez**, cortas, en el idioma del dueño. El dueño no es de negocio: nada de jerga.
- **El dueño decide.** Tú preguntas, resumes, propones y redactas.
- Lo que sea "estaría bueno…" o crecimiento futuro → **Parking lot** del proyecto.
- **Muestra antes de escribir** y espera el OK.
- **El alcance dice qué, no con qué.** Nada de versiones, librerías ni herramientas de prueba en el `PROYECTO.md`: el stack va en una línea en *Límites* y lo demás lo decide `/guardian-planificar` con ADRs. Los criterios de UI van en palabras del dueño («se ve como el diseño aprobado», «en el celular no se sale nada»).
- **No descartes una pieza del dueño** (su librería, sus componentes, su patrón) sin preguntarle. Si algo falló, verifica la causa antes de culpar a la pieza.

## Paso 1 — Escuchar

Si el dueño trae un borrador (archivo o texto), léelo y úsalo: solo pregunta lo que falte. Si no, pide: «Cuéntame tu idea con tus palabras». Resume en 3–4 líneas y confirma que entendiste.

## Paso 2 — ¿Prueba o proyecto real?

Pregunta con opciones:
- **Prueba** (validar algo rápido) → ficha corta de 5 preguntas.
- **Proyecto real** → ficha completa de 8.

## Paso 3 — Ficha de la idea

Una pregunta por vez. Si el dueño no sabe, propón una respuesta razonable y que él la ajuste.

| # | Pregunta | Prueba | Real |
|---|---|---|---|
| 1 | ¿Qué problema resuelve y **a quién** le pasa? (una persona concreta) | ✅ | ✅ |
| 2 | ¿Cómo lo resuelven **hoy**? | | ✅ |
| 3 | ¿Cuál es la **versión más chica** que lo prueba? | ✅ | ✅ |
| 4 | ¿**Cómo sabrás que funcionó**? Algo medible y con plazo («5 personas comentan en 2 semanas») | ✅ | ✅ |
| 5 | ¿Qué es lo **más dudoso**? (se prueba primero) | | ✅ |
| 6 | **Límites:** semanas disponibles; en un proyecto real, también presupuesto y cuentas necesarias | ✅ (solo semanas) | ✅ |
| 7 | **Veredicto:** ¿seguir, achicar o no seguir? Un «no» a tiempo es un buen resultado | | ✅ |
| 8 | **Nombre:** propone 3 cortos y memorables; el dueño elige o trae otro | ✅ | ✅ |

**Tipo de sitio** (proyecto real; en una prueba, solo las que apliquen). Después de la pregunta 3, una por vez:

| Pregunta | Qué se anota |
|---|---|
| ¿Tiene **administrador**? ¿Con usuarios y roles? | Alcance de las fases y Parking lot |
| ¿Dónde viven los **datos**? (Google Sheets o una base de datos como MySQL) | *Límites* → `- **Datos:** …` |
| ¿Se **suben archivos o imágenes**? | *Límites* (dónde se guardan) y lección de subidas |
| ¿Tienes **convenciones** para programarlo (un repo o documento de referencia)? | `~/Projects/ideas/<slug>/convenciones.md`, que `nuevo-proyecto.sh` lleva al proyecto |
| ¿Qué **nivel de diseño** (prueba de concepto / profesional / a medida) y 2–3 **referencias** que te gusten? | *Límites* → `- **Diseño:** …` y Decisiones |

**Nombre → slug** (minúsculas y guiones: «Vitrina» → `vitrina`). Verifica que esté libre:
- Repo: `gh repo view "$(gh api user -q .login)/<slug>"` → si existe, está ocupado.
- Sitio: `curl -s -o /dev/null -w '%{http_code}' https://<slug>-<dueño>.netlify.app` → `404` = libre.

## Paso 4 — Alcance (`PROYECTO.md`)

Con la ficha, redacta el `PROYECTO.md` con estas secciones, en este orden:

1. **Problema** · 2. **Qué es** · 3. **Qué NO es** · 4. **Valor** · 5. **Cómo sé que funcionó** (de la pregunta 4) · 6. **Límites** (de la 6) · 7. **Fases** (máximo 5; cada una un entregable usable en producción; propón un primer corte chico) · 8. **Criterios de aceptación** (Gherkin en español; `Escenario / Dado / Cuando / Entonces`; un resultado **observable en la página**) · 9. **Parking lot** (con fecha y motivo) · 10. **Decisiones tomadas** (tabla Fecha / Decisión / Motivo).

El título (`# <Nombre>`) es el nombre del proyecto: es lo que mostrará la página.

Si el proyecto necesita cuentas externas (Google, correo, pagos…), anótalas en **Límites** para que el dueño sepa qué le van a pedir.

En **Límites** escribe siempre la línea `- **Semanas:** N` (las semanas disponibles en total; el Guardián las reparte en una fecha objetivo por fase) y la línea `- **Tipo:** prueba / MVP rápido` o `- **Tipo:** producto` (según el paso 2). Claude la lee antes de cada ticket para decidir cuánto construir (`docs/lecciones.md` del proyecto).

## Paso 5 — Mostrar y esperar

Muestra la ficha y el `PROYECTO.md` completos. **Espera el OK** y ajusta lo que pida.

## Paso 6 — Guardar y siguiente paso

Escribe:
- `~/Projects/ideas/<slug>/idea.md` — la ficha (pregunta → respuesta) y el tipo (prueba / real).
- `~/Projects/ideas/<slug>/PROYECTO.md` — el alcance.

Termina con el siguiente paso, en la terminal del dueño, desde el repo del Guardián:

```sh
scripts/nuevo-proyecto.sh <slug> --alcance ~/Projects/ideas/<slug>/PROYECTO.md --revisar   # revisa qué falta
scripts/nuevo-proyecto.sh <slug> --alcance ~/Projects/ideas/<slug>/PROYECTO.md             # crea el proyecto
```

Y recuerda: después, dentro del proyecto, `/guardian-planificar` convierte este alcance en escenarios y tickets. Cierra con la lista corta de **lo que esta idea deja para el plan** (versiones, herramientas de prueba, ADRs técnicas, estructura de los datos).
