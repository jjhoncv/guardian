# 0025. Rol del consultor: las revisiones se vuelven lecciones de Claude

- **Fecha:** 2026-10-08
- **Estado:** Aceptada

## Contexto

En Vitrina, el Claude local del Guardián revisó los PRs de Claude de la nube y pidió arreglos puntuales (host header injection en #20, token en la URL en #24). En el uso real, el dueño solo conversa con Claude de la nube: esos arreglos tapaban lo que le falta a la plataforma.

## Decisión

Tres roles:
- **Desarrollador:** Claude de la nube. Hace los tickets y responde a los `@claude` del dueño (lo del ticket, en el mismo PR; una idea nueva, al Parking lot del proyecto).
- **Dueño:** prueba, aprueba y decide.
- **Consultor:** el Claude del Guardián. Puede revisar los repos de los proyectos, pero lo que encuentra no lo arregla en el PR: lo convierte en reglas y **lecciones de revisión** del `CLAUDE.md` del esqueleto (para los proyectos nuevos) y del proyecto (por PR). Las fallas de la plataforma (workflows, scripts) sí las arregla en el Guardián.

## Por qué

Cada revisión mejora a todos los proyectos y no depende de que el consultor esté presente. La revisión automática de cada PR queda en el Parking lot.
