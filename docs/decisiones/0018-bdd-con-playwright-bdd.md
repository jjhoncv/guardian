# 0018. BDD con playwright-bdd

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

La Fase 2 necesita BDD (escenarios Gherkin) y E2E con Playwright. Las opciones eran Cucumber.js o playwright-bdd.

## Decisión

**playwright-bdd**: los `.feature` se convierten en pruebas de Playwright y corren con el mismo runner, configuración y reportes que los E2E.

## Por qué

Un solo runner y un solo navegador en el CI. Cucumber.js sumaría otro runner, otra configuración y otra integración con el navegador.
