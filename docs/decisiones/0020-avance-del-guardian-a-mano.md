# 0020. El % del Guardián se lleva a mano hasta la Fase 4

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

La Fase 2 mide el avance como % de escenarios BDD en verde. Los escenarios del propio Guardián (deploys, aprobaciones, avisos) son del flujo, no de una página, y se prueban mal con Playwright.

## Decisión

La medición automática aplica a los proyectos creados con la plantilla. El avance del Guardián se marca a mano en `PROYECTO.md` (escenarios en verde por fase) hasta la Fase 4, que trae el dashboard.

## Por qué

Automatizar pruebas de flujo para el Guardián costaría más que la Fase 2 entera y no cambia ninguna decisión.
