# 0024. Claude en la nube: API key con tope, solo el dueño + automático, Sonnet 5.5

- **Fecha:** 2026-10-06
- **Estado:** Aceptada (detalla 0003)

## Contexto

La Fase 3 hace que Claude desarrolle los tickets en GitHub Actions con `anthropics/claude-code-action`. Había que decidir con qué llave paga, quién lo activa, qué modelo usa y cómo llega a abrir el PR (por defecto la action solo sube la rama y deja un link).

## Decisión

- **Llave:** una API key de Anthropic **solo para el CI**, con **tope de gasto mensual** en la consola de Anthropic. No se usa el token del plan Pro (no tiene tope en dólares y comparte límites con las sesiones del dueño).
- **Disparo:** solo cuenta un `@claude` escrito **por el dueño** (`github.repository_owner`); además, al fusionar un PR, Claude toma **solo** el siguiente ticket de la fase actual si hay menos de 2 PRs suyos esperando revisión.
- **Modelo:** Sonnet 5.5 (`--model claude-sonnet-5-5`), con máximo de turnos y de tiempo por tarea.
- **PR:** se le permite **solo** `gh pr create` para abrir el PR con `Closes #N`; no puede aprobar ni fusionar, y `main` exige la aprobación del dueño (0009 → 1 aprobación).
- **Identidad:** la GitHub App oficial de Claude (`claude[bot]`); sus PRs disparan el CI y el preview.

## Por qué

El costo queda acotado y separado del uso personal; nadie más puede gastar la llave aunque el repo sea público; Sonnet rinde para tareas chicas y bien definidas; abrir el PR es necesario para que el flujo avance solo, y la protección de `main` mantiene la regla de oro.
