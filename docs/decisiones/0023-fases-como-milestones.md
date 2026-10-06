# 0023. Cada fase es un milestone de GitHub

- **Fecha:** 2026-10-05
- **Estado:** Aceptada

## Contexto

Las fases (las «épicas») solo existían como texto en `PROYECTO.md`. En GitHub se veían los tickets de la fase en curso, pero no las fases siguientes ni el progreso de cada una.

## Decisión

- Un **milestone por fase**, titulado «Fase N — nombre», con sus entregables en la descripción. GitHub muestra la barra de % (tickets cerrados / total), también en la app del celular.
- Los tickets de una fase se siguen **detallando cuando la fase empieza** (para no inflar el backlog); el milestone existe desde el inicio.
- En los proyectos, el workflow «Tickets del plan» crea los milestones y asigna cada ticket (también los ya creados). `/guardian` muestra el % por fase.
- Las etiquetas `fase-N` se mantienen (sirven para filtrar).

## Por qué

Es la herramienta nativa de GitHub para agrupar trabajo con progreso visible, sin sumar tarjetas al tablero ni un sistema paralelo. Se descartaron los issues «épica» con sub-issues: duplicaban la información y llenaban el tablero.
