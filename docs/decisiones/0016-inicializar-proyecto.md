# 0016. Inicializar el proyecto con un workflow

- **Fecha:** 2026-10-04
- **Estado:** Aceptada (automatiza lo que 0010 y 0014 dejaban como paso manual)

## Contexto

Una plantilla de GitHub copia todo el repo. En la prueba de E1 (`lista-de-lecturas`) el proyecto nuevo heredó el alcance, las instrucciones para Claude, el README, el CHANGELOG, la versión y las ADRs del Guardián. El README pedía limpiarlo a mano: fácil de olvidar y contrario a "completo el PROYECTO.md y hago push".

## Decisión

Workflow `inicializar.yml` + `scripts/inicializar-proyecto.sh`. En el primer push de un repo que no es la plantilla (o a mano):

- `PROYECTO.md`, `CLAUDE.md` y `README.md` salen de `docs/*.ejemplo.md`, con el nombre derivado del repo (`lista-de-lecturas` → "Lista de lecturas").
- Se borran el CHANGELOG y las ADRs del Guardián (queda la plantilla de ADR y un enlace a las heredadas); versión `0.0.0` y `name` = repo.
- Corre una sola vez: la marca es que exista `docs/PROYECTO.ejemplo.md`, que el propio script borra.

Se descartó separar la plantilla en otro repo: cada mejora habría que hacerla dos veces.

## Por qué

Funciona aunque el proyecto se cree desde la web o el celular, sin la Mac. El commit lo hace `GITHUB_TOKEN`, que no dispara otros workflows ni puede tocar `.github/workflows/`: por eso el workflow no se borra a sí mismo, solo queda inactivo.
