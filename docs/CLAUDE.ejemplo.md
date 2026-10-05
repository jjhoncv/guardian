# CLAUDE.md — <Nombre del proyecto>

<!-- Copia este archivo sobre CLAUDE.md al crear tu proyecto desde la plantilla Guardián y completa lo que está entre < >. -->

Este repo es **<Nombre del proyecto>**: <qué es, en una frase>.
Se creó con la plantilla **Guardián**. El alcance, las fases y los criterios de aceptación están en @PROYECTO.md. Léelo antes de hacer cualquier cosa.

## Tu rol
- Eres el **desarrollador**. <Dueño> es el **dueño y revisor**: aprueba todo.
- Trabajas **solo en la fase actual**. Hoy: **Fase <N> — <nombre>**.
- Si algo no está en PROYECTO.md, **no lo hagas**: propónlo para el Parking lot y sigue.

## Cómo trabajas
1. El alcance se convierte en escenarios y tareas con la skill **`/planificar`** (entrevista si hace falta; plan por PR). Antes de empezar una fase, muestra el plan de tareas y **espera aprobación**.
2. Una tarea = un GitHub Issue = una rama `feat/<n>-<slug>` (o `fix/`, `docs/`) = un PR chico.
3. El **título del PR** es el commit que entra a `main` (squash): Conventional Commits con ticket, `feat(#12): ...`.
4. Un solo cambio lógico por PR; idealmente menos de 300 líneas.
5. Pruebas primero (TDD); cada tarea apunta a un escenario BDD de PROYECTO.md.
6. Máximo 2 PRs tuyos esperando revisión; no tomes otra tarea hasta que se aprueben.
7. Nunca hagas merge a `main` ni despliegues a producción. Eso lo aprueba <Dueño>.
8. Toda decisión técnica relevante va como ADR corta en `docs/decisiones/`.

## Stack (heredado de la plantilla)
- Next.js 16 + TypeScript, Node 24 (`.nvmrc`), npm
- Vitest (TDD) para unidades; BDD + E2E con playwright-bdd: `features/*.feature` (Gherkin en español) y pasos en `features/steps/`
- Un escenario sin pasos implementados queda **pendiente** (rojo, no bloquea el CI); al implementar sus pasos debe pasar. Avance: `npm run e2e && npm run avance`
- GitHub Actions + Netlify: preview por PR, staging = `main`, producción = release aprobado
- release-please para CHANGELOG y versiones

## Seguridad
- Nunca escribas secretos en el código ni en commits: usa GitHub Secrets y variables de Netlify.
- Si necesitas una credencial o una cuenta, **pídela** y explica para qué; no la inventes ni la busques en el disco.
- Permisos mínimos en tokens y cuentas de servicio.

## Sobre <Dueño>
- <Experiencia, para no explicarle lo básico.>
- <Disponibilidad real: cuándo revisa y aprueba.>

## Mantener el conocimiento
- Si <Dueño> cambia algo del alcance o una decisión, actualiza PROYECTO.md y registra una ADR en `docs/decisiones/`. El repo es la memoria del proyecto, no las conversaciones.

## Comunicación
- <Idioma>, directo y corto.
- Al cerrar cada tarea: qué hiciste, cómo probarlo y qué necesitas de <Dueño>.
