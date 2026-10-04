# 0001. Una sola rama `main`

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

Con un solo dev y un agente hace falta definir el modelo de ramas y ambientes.

## Decisión

Una sola rama `main`, sin `develop`. Ambientes: preview por PR, staging = `main`, producción = release aprobado.

## Por qué

Dos ramas duplican merges y revisiones sin aportar control: el control lo dan los PRs y el release aprobado.
