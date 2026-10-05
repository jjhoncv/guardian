# Guardián

[![CI](https://github.com/jjhoncv/guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/jjhoncv/guardian/actions/workflows/ci.yml)
[![Deploy](https://github.com/jjhoncv/guardian/actions/workflows/deploy.yml/badge.svg)](https://github.com/jjhoncv/guardian/actions/workflows/deploy.yml)
[![Release](https://github.com/jjhoncv/guardian/actions/workflows/release.yml/badge.svg)](https://github.com/jjhoncv/guardian/actions/workflows/release.yml)

Plantilla de GitHub que mantiene el foco y el alcance de proyectos de software: alcance fijo y medible, producción desde el día 1, tareas chicas que tú apruebas.

- **Fase actual:** 1 — Esqueleto
- **Staging:** https://staging--guardian-jjhoncv.netlify.app
- **Producción:** https://guardian-jjhoncv.netlify.app
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

1. **Repo:** *Use this template → Create a new repository* (público: los rulesets y la aprobación de Environments son gratis solo en repos públicos, ADR 0007).
2. **Alcance:** copia `docs/PROYECTO.ejemplo.md` sobre `PROYECTO.md` y complétalo. El `# título` es el nombre que muestra la página.
3. **Instrucciones para Claude:** copia `docs/CLAUDE.ejemplo.md` sobre `CLAUDE.md` y completa lo que está entre `< >` (nombre, dueño, fase actual).
4. **Limpia lo heredado del Guardián:**
   - borra `CHANGELOG.md` y deja `.release-please-manifest.json` en `{ ".": "0.0.0" }`;
   - en `package.json`, cambia `name` y deja `version` en `0.0.0`;
   - en este README, cambia las URLs y los badges.
5. **Netlify:** crea un sitio con *Deploy manually* (sin conectarlo a GitHub, ADR 0008) y un *Personal access token* con vencimiento.
6. **Secretos y variables** (desde tu terminal, nunca en el código):
   ```sh
   gh variable set NETLIFY_SITE_ID -R <dueño/repo> --body <project-id>
   gh secret set NETLIFY_AUTH_TOKEN -R <dueño/repo>
   gh secret set RELEASE_PLEASE_TOKEN -R <dueño/repo>   # PAT fine-grained: solo este repo, Contents + Pull requests (RW), 90 días
   ```
7. **Protecciones:** `scripts/configurar-repo.sh <dueño/repo> <tu-usuario>` (antes del primer release: crea el Environment `production` con aprobación obligatoria).
8. **Push** de los cambios por PR → staging. Merge del PR de release → aprobación → producción.

## Desarrollo local

```sh
nvm use        # Node 24 (.nvmrc)
npm ci
npm run dev    # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
```

## Qué trae

| Pieza | Dónde |
|---|---|
| Plantillas de issue (tarea con escenario BDD) y PR | `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md` |
| CI: lint, typecheck, pruebas, build | `.github/workflows/ci.yml` |
| Deploy preview / staging (build sin secretos) | `.github/workflows/deploy.yml`, `build-netlify.yml` |
| Releases + producción con aprobación | `.github/workflows/release.yml`, `release-please-config.json` |
| Protecciones y seguridad del repo | `scripts/configurar-repo.sh`, `.github/dependabot.yml` |
| Next.js 16 + TypeScript + Vitest | `app/`, `lib/` |
| ADRs | `docs/decisiones/` |
