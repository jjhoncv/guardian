# 0017. El PR de release hace de sección `Unreleased`

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

La sección 7 de `PROYECTO.md` pedía una sección `Unreleased` en el CHANGELOG que se actualizara con cada merge. release-please no la escribe en `CHANGELOG.md`: acumula los cambios pendientes en un PR de release que se reescribe con cada merge a `main`.

## Decisión

El PR de release abierto es la sección `Unreleased`: muestra lo que entrará en la próxima versión. Al fusionarlo, release-please congela esos cambios en `CHANGELOG.md` con su número de versión.

## Por qué

Es el comportamiento estándar de release-please; forzar una sección `Unreleased` en el archivo duplicaría la información y obligaría a mantenerla a mano.
