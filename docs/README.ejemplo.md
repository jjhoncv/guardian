# __NOMBRE__

[![CI](https://github.com/__REPO__/actions/workflows/ci.yml/badge.svg)](https://github.com/__REPO__/actions/workflows/ci.yml)
[![Deploy](https://github.com/__REPO__/actions/workflows/deploy.yml/badge.svg)](https://github.com/__REPO__/actions/workflows/deploy.yml)
[![Release](https://github.com/__REPO__/actions/workflows/release.yml/badge.svg)](https://github.com/__REPO__/actions/workflows/release.yml)

<Qué es, en una frase.>

- **Fase actual:** <N> — <nombre>
- **Staging:** `https://staging--<sitio>.netlify.app`
- **Producción:** `https://<sitio>.netlify.app`
- **Alcance:** [`PROYECTO.md`](PROYECTO.md) · **Decisiones:** [`docs/decisiones/`](docs/decisiones/README.md)

Creado con la plantilla [Guardián](https://github.com/jjhoncv/guardian): alcance fijo, producción desde el día 1, tareas chicas que el dueño aprueba.

## Puesta en marcha (una vez)

1. **Alcance:** completa `PROYECTO.md` y lo que está entre `< >` en `CLAUDE.md` y en este README.
2. **Netlify:** crea un sitio con *Deploy manually* (sin conectarlo a GitHub) y un *Personal access token* con vencimiento.
3. **Secretos y variables** (desde tu terminal, nunca en el código):
   ```sh
   gh variable set NETLIFY_SITE_ID -R __REPO__ --body <project-id>
   gh secret set NETLIFY_AUTH_TOKEN -R __REPO__
   gh secret set RELEASE_PLEASE_TOKEN -R __REPO__   # PAT fine-grained: solo este repo, Contents + Pull requests (RW), 90 días
   ```
   Hasta que existan, Deploy y Release no hacen nada. Qué va en cada uno:

   | Nombre | Qué es | Dónde se saca | Empieza con |
   |---|---|---|---|
   | `NETLIFY_SITE_ID` (variable) | ID del sitio; no es secreto | Netlify → sitio → *Project configuration → General → Project ID* | `xxxxxxxx-xxxx-…` |
   | `NETLIFY_AUTH_TOKEN` | Llave de tu cuenta de Netlify para publicar | Netlify → avatar → *User settings → Applications → Personal access tokens → New access token* | `nfp_` |
   | `RELEASE_PLEASE_TOKEN` | Llave de GitHub, solo de este repo, para el PR de release | GitHub → avatar → *Settings → Developer settings → Fine-grained tokens → Generate new token*: solo este repo, **Contents** y **Pull requests** en *Read and write*, 90 días | `github_pat_` |
4. **Protecciones y tablero:** `scripts/configurar-repo.sh __REPO__ <tu-usuario>` (necesita `gh` con permisos `repo`, `workflow` y `project`). Luego, en el tablero: *⋯ → Workflows → Auto-add to project* → filtro `is:issue is:open` → *Save and turn on*.
5. **Primer PR** con el alcance → preview → merge → staging → merge del PR de release → aprobación → producción.

## Cómo fluye un cambio

```
Issue (escenario BDD) → rama feat/N-slug → PR chico → CI + preview pr-N
  → squash merge (dueño) → staging
  → PR de release (release-please) → merge (dueño) → aprobación del Environment (dueño) → producción
```

Rollback: **automático** si falla el smoke test después de un release (abre un issue `alerta`). A mano: en Netlify, *Deploys* → deploy anterior de producción → *Publish deploy*.

## Mantenimiento

| Secreto | Si vence | Renovar |
|---|---|---|
| `RELEASE_PLEASE_TOKEN` (90 días) | No se abre ni actualiza el PR de release | Nuevo PAT → `gh secret set RELEASE_PLEASE_TOKEN` |
| `NETLIFY_AUTH_TOKEN` | Fallan preview, staging y producción | Nuevo token → `gh secret set NETLIFY_AUTH_TOKEN` |

## Desarrollo local

```sh
nvm use        # Node 24 (.nvmrc)
npm ci
npm run dev    # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
```
