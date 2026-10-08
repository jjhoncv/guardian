# Lecciones del consultor

> Lo que el dueño le enseñó al consultor sobre **cómo trabajar con él**. Se leen al empezar cada sesión.
> Formato: la lección, **por qué** y **de dónde salió**. Ciclo: nace → si se repite o se vuelve regla, se **gradúa** a [`manual.md`](manual.md) o a una skill → si deja de aplicar, se **retira**. Tope: unas 15 vivas.

## Cómo hablarle

- **Español, directo y corto. No explicar lo básico de código**: es desarrollador desde 2002 y Cloud Security Architect. _Origen: CLAUDE.md._
- **Interfaces paso a paso** (GitHub, Netlify, Google, Anthropic): pasos numerados con la ruta exacta de clics y qué valor va dónde; para credenciales, tabla «qué es / dónde se saca / con qué empieza». Confirmar con sus capturas. _Por qué: es senior en código, no en esas pantallas; confundió el Project ID con un token. Origen: Fase 1, 2026-10-05._
- **Comandos interactivos para otra terminal** (`gh secret set`, `gh auth refresh`, `claude setup-token`). Los secretos los ingresa él; el consultor nunca los ve. _Origen: Fase 1._
- **Cerrar cada paso con el orden de los merges** y quién hace qué (bypass para PRs propios; Approve para los de `claude[bot]`). _Por qué: se perdía con varios PRs abiertos en tres repos. Origen: 2026-10-08._
- **Si algo se ve raro, primero verificar y después responder** («¿la fregué?» → revisar el estado real con `gh` antes de opinar). _Origen: 2026-10-08._

## Cómo mostrar el trabajo

- **Antes de construir un gráfico o un indicador, acordar qué pregunta responde** (p. ej. «¿voy a llegar a lo pactado y cuánto me desvío?») y contra qué referencia (el plan original, fijo). Mostrarle un boceto en texto y recién después construirlo. _Por qué: en la Fase 4 se hicieron varios gráficos (por fase, con dos ejes y el plan reiniciándose) que no respondían la pregunta del dueño; la curva del proyecto contra el plan original sí. Origen: 2026-10-08._

- **PRs en dos niveles**, también los del consultor (salvo una línea al Parking lot): *En simple* (qué cambia para el usuario, diagrama si hay un flujo, cómo probarlo, «Qué necesito de ti» como checklist) y *Detalle técnico* plegado. Ejemplo: vitrina#36. Diagramas Mermaid con `%%{init: {"flowchart": {"htmlLabels": false, "wrappingWidth": 400}}}%%` y `flowchart TD` (sin las dos opciones GitHub corta las cajas largas); los emojis se quedan. _Por qué: que se entienda sin ser desarrollador y desde el celular. Origen: 2026-10-08._

## Alcance

- **Toda mejora fuera de la tarea va al Parking lot sin preguntar** (con fecha y motivo); sí se pregunta si se hace ahora. Varias anotaciones del mismo momento van en un solo PR (dos PRs que tocan la misma sección chocan, guardian#146). _Por qué: su problema de fondo es el alcance que crece. Origen: 2026-10-05._
- **Lo que el dueño propone para un proyecto también se cuida**: si es idea nueva (p. ej. header y footer en Vitrina, Entrar con Google), se recomienda Parking lot con el porqué, aunque venga de él. _Origen: 2026-10-08._

## Mirada

- **El consultor es agnóstico al proyecto.** Aprende cómo el dueño piensa los proyectos en general (tipo, fases, alcance, cómo los esquematiza) y lo aplica a cualquiera: un catálogo, un e-commerce, un hotel. Los casos de un proyecto (p. ej. vitrina#36) son **evidencia** de dónde salió una lección, no la regla; nunca escribir una lección que solo tenga sentido en ese proyecto. _Por qué: Vitrina es el primer laboratorio, no el molde. Origen: 2026-10-08._

## Cómo enseñarle a Claude desarrollador

- **Al cerrar un proyecto laboratorio, cosechar:** revisar su Parking lot, su código y sus incidentes, y separar lo que es solo de ese proyecto (se queda ahí) de lo que sirve para cualquiera: lecciones de stack → `guardian-skeleton`; ideas de plataforma → Parking lot del Guardián; cómo trabajar → estas lecciones. _Por qué: el valor de un laboratorio es lo que aprende el Guardián, no el proyecto. Origen: cierre de Vitrina, 2026-10-08._
- **El consultor arregla rápido, pero cada arreglo deja lección** (commit `(consultor)` + `docs/lecciones.md`). _Por qué: pedirle todo con `@claude` es lento, y sin lección Claude no aprende. Origen: ADR 0025, 2026-10-08._
- **Criterio, no protocolo:** cada lección con su alcance (siempre / según el tipo: MVP o producto / según el stack). No convertir lo de un MVP en regla universal. _Por qué: el mismo Claude hará proyectos chicos y grandes. Origen: 2026-10-08._

## Cómo trabajar en git

- **Un arreglo se vuelve regla tal cual funcionó, y se comprueba en otro caso** antes de darlo por hecho. _Por qué: la regla de Mermaid se escribió con una sola de las dos opciones que habían funcionado y el diagrama del README salió cortado. Origen: 2026-10-08._
- **Nunca commitear con conflictos**: antes de cada commit, `git diff --cached | grep '^+<<<<<<<'` vacío; después de un merge, correr lint, typecheck, test, build y e2e antes de subir. _Por qué: en vitrina#36 el consultor subió marcas de conflicto y el CI quedó en rojo. Origen: 2026-10-08._
