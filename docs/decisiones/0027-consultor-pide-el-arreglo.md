# 0027. El consultor separa fallas de orquestación y de Claude; a Claude le pide el arreglo

- **Fecha:** 2026-10-08
- **Estado:** aceptada (modifica la regla de arreglo de la ADR 0025)

## Contexto

Según la ADR 0025, el consultor arreglaba en el PR de Claude, con un commit `(consultor)`, y dejaba la lección. En vencimientos#17 corrigió dos cosas así: el enlace al preview (la plantilla del esqueleto pedía un número que Claude no puede conocer) y «hoy» calculado en UTC (un error de Claude). El dueño observó que, cuando el consultor arregla el código de Claude, nadie comprueba que la lección se entienda: Claude no tiene memoria entre ejecuciones y solo aprende de lo que lee (`CLAUDE.md`, `docs/lecciones.md`).

## Decisión

Antes de tocar nada, el consultor clasifica la falla:

| Falla | Ejemplos | Qué hace el consultor |
|---|---|---|
| **De orquestación** | Plantilla, workflow, permisos, versión, capas que se contradicen | La arregla **arriba**, en el Guardián o en guardian-skeleton (y en la copia del proyecto si hace falta). Claude no podía hacerlo mejor |
| **De Claude** | Un error en su código o su PR | 1) Escribe la **lección** en `docs/lecciones.md` del proyecto (y en el esqueleto si es general). 2) Le pide el arreglo en su PR con `@claude corrige … según la lección «…»`. 3) Si Claude lo corrige bien, la lección queda **validada**; si no, la lección está mal escrita: se reescribe |

El **arreglo directo** del consultor queda para lo urgente (por ejemplo, seguridad en producción) o cuando el dueño lo pide, siempre con su lección.

## Por qué

La lección es lo único que Claude conserva; pedirle el arreglo es la forma de probarla. Cuesta unos minutos más por PR (cada `@claude` levanta un contenedor), pero cada lección queda comprobada y el consultor deja de ser imprescindible.
