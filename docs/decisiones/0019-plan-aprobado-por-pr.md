# 0019. El plan de tareas se aprueba por PR

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

La skill de planificación podía crear issues directamente. Pero en el Guardián todo lo que cambia el proyecto se aprueba por PR, y el alcance lo decide el dueño.

## Decisión

- Si `PROYECTO.md` está en blanco, `/planificar` entrevista al dueño y lo redacta; el dueño decide qué entra y qué no.
- `/planificar` abre un PR con los `.feature` (en rojo) y el plan de tareas (máximo 5 fases).
- Al fusionar ese PR, un workflow crea un issue por tarea con su etiqueta de fase y lo agrega al tablero.

## Por qué

El plan queda revisado y versionado como cualquier cambio, y los tickets se crean en la nube, sin depender de la Mac.
