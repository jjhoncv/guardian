# 0025. Rol del consultor: arregla rápido y lo vuelve lección de Claude

- **Fecha:** 2026-10-08
- **Estado:** Aceptada

## Contexto

En Vitrina, el Claude local del Guardián revisó los PRs de Claude de la nube y encontró fallas (host header injection en #20, token en la URL en #24). Pedirle cada arreglo a Claude de la nube con `@claude` es lento: cada comentario levanta un contenedor y tarda minutos. Pero si el consultor arregla sin dejar rastro, Claude de la nube no aprende y la plataforma depende de que el consultor esté.

## Decisión

Tres roles:
- **Desarrollador:** Claude de la nube. Hace los tickets y responde a los `@claude` del dueño (lo del ticket, en el mismo PR; una idea nueva, al Parking lot del proyecto).
- **Dueño:** prueba, aprueba y decide.
- **Consultor:** el Claude del Guardián. Mientras el desarrollador es nuevo, revisa sus PRs y **arregla directo** lo necesario, con esta regla:
  1. El arreglo va en el mismo PR, en un commit marcado `(consultor)`, para que se vea qué no hizo el desarrollador.
  2. En ese mismo commit agrega la **lección** a «Lecciones de revisión» del `CLAUDE.md` del proyecto; si es general, también al de `guardian-skeleton` (PR propio).
  3. Si la falla es de la plataforma (workflows, scripts), la arregla en el Guardián.

## Madurez

Cuantas más lecciones tiene el desarrollador y menos commits `(consultor)` aparecen por PR, menos interviene el consultor; con el desarrollador «experto», el dueño le habla solo a él. La revisión automática de cada PR está en el Parking lot.
