# 0015. Smoke test en la Fase 2 y aviso de tokens en la Fase 5

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

En la revisión de cierre de la Fase 1 aparecieron dos huecos: la sección 8 pide un smoke test E2E tras cada deploy a producción, pero no estaba en ninguna fase; y los tokens (PAT de release-please a 90 días, token de Netlify) vencen sin aviso.

## Decisión

- Smoke test de producción en la **Fase 2**, junto con Playwright.
- Aviso de vencimiento de tokens en la **Fase 5**, junto con los demás avisos.
- Mientras tanto, el README explica qué falla al vencer cada token y cómo renovarlo.

## Por qué

El smoke test depende de la estructura de E2E de la Fase 2. El aviso es un "empuje" como los de la Fase 5; adelantarlo agrandaría la fase actual.
