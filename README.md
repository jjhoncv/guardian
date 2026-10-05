# Guardián

[![CI](https://github.com/jjhoncv/guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/jjhoncv/guardian/actions/workflows/ci.yml)
[![Deploy](https://github.com/jjhoncv/guardian/actions/workflows/deploy.yml/badge.svg)](https://github.com/jjhoncv/guardian/actions/workflows/deploy.yml)
[![Release](https://github.com/jjhoncv/guardian/actions/workflows/release.yml/badge.svg)](https://github.com/jjhoncv/guardian/actions/workflows/release.yml)

Plantilla de GitHub que mantiene el foco y el alcance de proyectos de software: alcance fijo y medible, producción desde el día 1, tareas chicas que tú apruebas.

- **Fase actual:** 2 — Alcance y pruebas (Fase 1 cerrada: v0.4.0)
- **Staging:** https://staging--guardian-jjhoncv.netlify.app
- **Producción:** https://guardian-jjhoncv.netlify.app
- **Tablero:** https://github.com/users/jjhoncv/projects/1
- **Alcance y reglas:** [`PROYECTO.md`](PROYECTO.md) · **Decisiones:** [`docs/decisiones/`](docs/decisiones/README.md)

## Cómo fluye un cambio

```
Issue (escenario BDD) → rama feat/N-slug → PR chico → CI + preview pr-N
  → squash merge (tú) → staging
  → PR de release (release-please) → merge (tú) → aprobación del Environment (tú) → producción
```

| Ambiente | Cuándo | URL |
|---|---|---|
| Preview | Cada PR | `https://pr-N--<sitio>.netlify.app` (comentado en el PR) |
| Staging | Cada merge a `main` | `https://staging--<sitio>.netlify.app` |
| Producción | Release aprobado | `https://<sitio>.netlify.app` |

Rollback: **automático** si falla el smoke test después de un release (abre un issue `alerta`). A mano: en Netlify, *Deploys* → deploy anterior de producción → *Publish deploy*.

## Crear un proyecto desde la plantilla

1. **Repo:** *Use this template → Create a new repository*, **público** (los rulesets y la aprobación de Environments son gratis solo en repos públicos, ADR 0007). Se puede hacer desde el celular.
2. **Inicialización automática** (~1 min): el workflow *Inicializar proyecto* deja `PROYECTO.md`, `CLAUDE.md` y `README.md` propios con el nombre del repo, y borra el CHANGELOG, la versión y las ADRs del Guardián (ADR 0016). La página ya muestra el nombre del proyecto.
3. **Puesta en marcha:** sigue la sección del mismo nombre en el README del proyecto nuevo: alcance, Netlify, secretos, `scripts/configurar-repo.sh` y primer PR. Mientras falten los secretos, Deploy y Release no hacen nada.

## Mantenimiento

Los tokens vencen y nada avisa todavía (llega en la Fase 5). Anota las fechas al crearlos:

| Secreto | Si vence | Renovar |
|---|---|---|
| `RELEASE_PLEASE_TOKEN` (90 días) | No se abre ni actualiza el PR de release | Nuevo PAT fine-grained con los mismos permisos → `gh secret set RELEASE_PLEASE_TOKEN` |
| `NETLIFY_AUTH_TOKEN` | Fallan preview, staging y producción | Nuevo token en Netlify → `gh secret set NETLIFY_AUTH_TOKEN` |

## Desarrollo local

```sh
nvm use        # Node 24 (.nvmrc)
npm ci
npm run dev    # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
npm run e2e && npm run avance   # escenarios BDD en Chrome y % del alcance en verde
```

## Qué trae

**Workflows reutilizables** (los proyectos los llaman con `uses: jjhoncv/guardian/.github/workflows/<archivo>@vX.Y.Z`; el Guardián se usa a sí mismo con los llamadores `ci.yml`, `chequeo-pr.yml`, `deploy.yml`, `release.yml`, `tickets.yml`):

| Workflow | Qué hace |
|---|---|
| `guardian-ci.yml` | Lint, typecheck, pruebas, build, escenarios BDD en Chrome y % de avance |
| `guardian-chequeo-pr.yml` | Ticket con escenario (bloquea), tamaño (avisa) y plan válido si el PR trae `plan/tareas.json` |
| `guardian-deploy.yml` | Preview por PR y staging en `main` (build sin secretos; deploy sin código del proyecto) |
| `guardian-release.yml` | release-please → producción con aprobación → smoke test → rollback y alerta si falla |
| `guardian-tickets.yml` | Un issue por tarea del plan aprobado |

Cada workflow toma sus scripts y herramientas de **su propia versión** del Guardián (`job.workflow_sha`).

| Pieza | Dónde |
|---|---|
| Scripts de los workflows | `scripts/` (`avance.ts`, `chequeo-pr.ts`, `crear-tickets.ts`, `rollback.sh`) |
| netlify-cli del CI, fijado por lockfile | `tools/netlify/` |
| Protecciones, seguridad y tablero de un repo | `scripts/configurar-repo.sh` |
| Smoke test manual | `.github/workflows/smoke.yml` |
| Skill `/planificar` | `.claude/skills/planificar/SKILL.md` |
| Escenarios BDD y mocks del propio Guardián | `features/`, `mocks/` |
| ADRs | `docs/decisiones/` |
