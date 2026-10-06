# 0009. Fase 1: `main` con 0 aprobaciones obligatorias

- **Fecha:** 2026-10-04
- **Estado:** Reemplazada en la Fase 3 (ADR 0024): `main` exige 1 aprobación; el dueño (admin) puede fusionar sus propios PRs

## Contexto

En la Fase 1 los PRs se abren con la sesión de `gh` de Jhonnatan, y GitHub no permite aprobar un PR propio.

## Decisión

`main` exige PR y pipeline en verde, con 0 aprobaciones. El merge lo hace solo Jhonnatan y cuenta como su aprobación. En la Fase 3, cuando Claude abra PRs con su propia identidad, sube a 1 aprobación obligatoria.

## Por qué

Con 1 aprobación obligatoria ningún PR de la Fase 1 podría entrar.
