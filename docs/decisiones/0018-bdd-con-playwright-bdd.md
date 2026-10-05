# 0018. BDD con playwright-bdd

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

La Fase 2 necesita BDD (escenarios Gherkin) y E2E con Playwright. Las opciones eran Cucumber.js o playwright-bdd.

## Decisión

**playwright-bdd**: los `.feature` se convierten en pruebas de Playwright y corren con el mismo runner, configuración y reportes que los E2E.

## Por qué

Un solo runner y un solo navegador en el CI. Cucumber.js sumaría otro runner, otra configuración y otra integración con el navegador.

## Cómo se mide el avance

- Un escenario cuyos pasos no existen se **salta** (`missingSteps: "skip-scenario"`): cuenta en rojo como *pendiente* y no bloquea el merge.
- Un escenario con pasos implementados corre en el check obligatorio del CI: si falla, bloquea.
- `scripts/avance.ts` publica en el resumen del CI «X de Y escenarios en verde (Z %)». Los escenarios `@plantilla` (base de la plantilla, no del alcance) no cuentan.
