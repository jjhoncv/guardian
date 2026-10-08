# 0026. Visibilidad: un solo Sheet del Guardián y badges vivos en el README

- **Fecha:** 2026-10-08
- **Estado:** Aceptada

## Contexto

La Fase 4 (E5) pide ver, desde el celular, la fase actual, el % de avance y el color de salud de cada proyecto, en el Sheet o en el README. El dueño va a tener varios proyectos a la vez, y `main` solo cambia por PR (ruleset).

## Decisión

1. **Un solo Sheet del Guardián** con todos los proyectos: una fila por proyecto en *Proyecto* y la columna `proyecto` en *Fases*, *Tareas* y *Salud*. Lo escribe el workflow de estado con una service account de **escritura solo sobre ese Sheet**; hay un Sheet de pruebas y uno de producción, con service accounts separadas.
2. **README con badges vivos:** el workflow de estado guarda `estado.json` en una rama **`estado`** (sin protección, solo para eso) y el README muestra badges de shields.io que leen ese archivo (fase, % de avance, color de salud). El README no se commitea en cada cambio y `main` sigue cambiando solo por PR.
3. **Fechas objetivo por fase:** cada milestone «Fase N» recibe `due_on` calculado desde los Límites del proyecto. Sin fechas no hay atraso que medir.

## Por qué

- Un Sheet para todo: se abre uno solo y se ven todos los proyectos con su color; escala a proyectos grandes.
- Badges vivos: siempre al día sin un PR diario que aprobar (ruido) ni permisos para escribir en `main`.
- shields.io solo recibe la URL pública de `estado.json` (fase, %, color), nada sensible.

## Descartado

- Un Sheet por proyecto (más Sheets que abrir).
- Un PR automático diario que actualiza el README.
