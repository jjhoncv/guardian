# 0025. Rol del consultor: arregla rápido y lo vuelve lección de Claude

- **Fecha:** 2026-10-08
- **Estado:** Aceptada

## Contexto

En Vitrina, el Claude local del Guardián revisó los PRs de Claude de la nube y encontró fallas (host header injection en #20, token en la URL en #24). Pedirle cada arreglo a Claude de la nube con `@claude` es lento: cada comentario levanta un contenedor y tarda minutos. Pero si el consultor arregla sin dejar rastro, Claude de la nube no aprende y la plataforma depende de que el consultor esté.

## Decisión

> **Precisada por la ADR 0027 (2026-10-08):** antes de arreglar, el consultor separa las fallas de orquestación (se arreglan en el Guardián o el esqueleto) de las de Claude (las arregla en el PR y deja lección, mientras Claude es nuevo).

Tres roles:
- **Desarrollador:** Claude de la nube. Hace los tickets y responde a los `@claude` del dueño (lo del ticket, en el mismo PR; una idea nueva, al Parking lot del proyecto).
- **Dueño:** prueba, aprueba y decide.
- **Consultor:** el Claude del Guardián. Mientras el desarrollador es nuevo, revisa sus PRs y **arregla directo** lo necesario, con esta regla:
  1. El arreglo va en el mismo PR, en un commit marcado `(consultor)`, para que se vea qué no hizo el desarrollador.
  2. En ese mismo commit agrega la **lección** a «Lecciones de revisión» del `CLAUDE.md` del proyecto; si es general, también al de `guardian-skeleton` (PR propio).
  3. Si la falla es de la plataforma (workflows, scripts), la arregla en el Guardián.

## La guía de Claude, por capas

Para que Claude no mezcle propósitos ni entre en círculos, la guía tiene cuatro capas que no se mezclan:

| Capa | Dónde | Qué contiene | Cuándo cambia |
|---|---|---|---|
| 1. Objetivo | `PROYECTO.md` | Problema, qué NO es, **tipo** (prueba/MVP o producto), fase actual | Solo con aprobación del dueño y ADR |
| 2. Cómo trabajar | `CLAUDE.md` (corto) | Inicio y fin de cada ticket, orden de prioridad | Casi nunca |
| 3. Criterio | `docs/lecciones.md` | Lecciones con alcance (siempre / según tipo / según stack) y su porqué | Con cada revisión del consultor, con tope (~15) |
| 4. Garantías | Pruebas y checks del CI | Lo que nunca puede fallar | Cuando una lección se gradúa |

**Prioridad:** objetivo del proyecto > alcance de la fase y del ticket > tipo de proyecto > lecciones. Ninguna lección justifica salirse del ticket.

**Ciclo de una lección:** nace en una revisión (con su PR de ejemplo) → si se repite o es de «siempre», se **gradúa** a prueba o check y sale del texto → si deja de aplicar, se **retira**.

## Madurez

Cuantas más lecciones tiene el desarrollador y menos commits `(consultor)` aparecen por PR, menos interviene el consultor; con el desarrollador «experto», el dueño le habla solo a él. La revisión automática de cada PR está en el Parking lot.
