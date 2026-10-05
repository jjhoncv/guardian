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

Rollback: en Netlify, *Deploys* → deploy anterior de producción → *Publish deploy*.

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

| Pieza | Dónde |
|---|---|
| Plantillas de issue (tarea con escenario BDD) y PR | `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` |
| CI: lint, typecheck, pruebas, build | `.github/workflows/ci.yml` |
| Chequeo del PR: ticket con escenario (bloquea) y tamaño (avisa) | `.github/workflows/chequeo-pr.yml`, `scripts/chequeo-pr.ts` |
| Deploy preview / staging (build sin secretos) | `.github/workflows/deploy.yml`, `build-netlify.yml` |
| Releases + producción con aprobación | `.github/workflows/release.yml`, `release-please-config.json` |
| Inicialización de un proyecto nuevo | `.github/workflows/inicializar.yml`, `scripts/inicializar-proyecto.sh`, `docs/*.ejemplo.md` |
| Protecciones y seguridad del repo | `scripts/configurar-repo.sh`, `.github/dependabot.yml` |
| Next.js 16 + TypeScript + Vitest | `app/`, `lib/` |
| Escenarios BDD (playwright-bdd) y % de avance | `features/`, `playwright.config.ts`, `scripts/avance.ts` |
| Mocks: contratos (JSON Schema), fixtures y MSW | `mocks/` |
| ADRs | `docs/decisiones/` |
