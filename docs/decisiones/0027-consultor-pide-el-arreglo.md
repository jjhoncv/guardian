# 0027. El consultor separa fallas de orquestación y de Claude; a Claude le pide el arreglo

- **Fecha:** 2026-10-08
- **Estado:** aceptada (precisa la regla de arreglo de la ADR 0025). Corregida el mismo día por el dueño: mientras Claude es «bebé», el consultor sigue arreglando él

## Contexto

Según la ADR 0025, el consultor arreglaba en el PR de Claude, con un commit `(consultor)`, y dejaba la lección. En vencimientos#17 corrigió dos cosas así: el enlace al preview (la plantilla del esqueleto pedía un número que Claude no puede conocer) y «hoy» calculado en UTC (un error de Claude). El dueño observó que, cuando el consultor arregla el código de Claude, nadie comprueba que la lección se entienda: Claude no tiene memoria entre ejecuciones y solo aprende de lo que lee (`CLAUDE.md`, `docs/lecciones.md`).

## Decisión

Antes de tocar nada, el consultor clasifica la falla:

| Falla | Ejemplos | Qué hace el consultor |
|---|---|---|
| **De orquestación** | Plantilla, workflow, permisos, versión, capas que se contradicen | La arregla **arriba**, en el Guardián o en guardian-skeleton (y en la copia del proyecto si hace falta). Claude no podía hacerlo mejor |
| **De Claude** | Un error en su código o su PR | Mientras Claude es «bebé»: lo **arregla en el PR** (commit `(consultor)`) y deja la **lección** en `docs/lecciones.md` del proyecto (y en el esqueleto si es general), para que la próxima vez lo haga solo |

**Cómo se comprueba que aprendió:** en los PRs siguientes, el consultor mira si Claude aplicó la lección sin que se la pidan (paso 3 de `/guardian-consultor`). Si no la aplicó, primero busca contradicciones entre capas y después reescribe la lección. Para probar una lección reescrita, o cuando el dueño lo pida, puede pedirle el arreglo a Claude con `@claude corrige … según la lección «…»`.

**Madurez:** a medida que Claude aplica las lecciones solo, aparecen menos commits `(consultor)` y el consultor interviene menos; con Claude «experto», el dueño le habla solo a él.

## Por qué

Claude solo aprende de lo que lee, así que cada arreglo debe dejar lección. Separar orquestación de Claude evita culparlo (y llenarlo de lecciones) por fallas que venían de arriba. Mientras es nuevo, el consultor lo ayuda arreglando, como un mentor; la prueba de que aprendió es que deja de necesitarlo.
