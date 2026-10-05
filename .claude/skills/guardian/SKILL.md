---
name: guardian
description: Menú y estado del Guardián. Muestra en qué paso del ciclo de vida está el proyecto (o las ideas, si estás en el repo del Guardián), qué está definido y qué falta, el siguiente paso recomendado y los comandos guardian-* disponibles. Solo lee; no crea ni cambia nada.
---

# /guardian — menú y estado

**Solo lectura.** No crees, edites ni publiques nada; si algo falta, recomiéndalo.

## 1. Dónde estás

- Si existe `scripts/nuevo-proyecto.sh` → estás en el **repo del Guardián** (modo ideas).
- Si no → estás en un **proyecto** creado con el Guardián (modo proyecto).

## 2a. Modo ideas (repo del Guardián)

Revisa `~/Projects/ideas/*/`. Por cada idea muestra una fila:

| Idea | Ficha (`idea.md`) | Alcance (`PROYECTO.md`) | Repo creado | Siguiente paso |
|---|---|---|---|---|

- **Ficha ✅** si `idea.md` existe y no tiene preguntas sin responder.
- **Alcance ✅** si `PROYECTO.md` tiene título y, con contenido real (no textos de plantilla ni `< >`): Problema, Qué es, Qué NO es, Valor, Cómo sé que funcionó, Límites, Fases (máx. 5) y Criterios en Gherkin. Si falta algo, di **qué sección**.
- **Repo creado:** `gh repo view <dueño>/<slug>` (dueño: `gh api user -q .login`).
- **Siguiente paso:** ficha o alcance incompletos → `/guardian-idea` (retoma esa idea). Alcance listo y sin repo → `scripts/nuevo-proyecto.sh <slug> --alcance ~/Projects/ideas/<slug>/PROYECTO.md --revisar`. Repo creado → «abre Claude Code en `~/Projects/<slug>` y corre `/guardian`».

Si no hay ideas: recomienda `/guardian-idea`.

## 2b. Modo proyecto

Muestra el ciclo de vida con ✅ / ⏳ / ⬜:

```
0 Idea · 1 Alcance · 2 Esqueleto · 3 Escenarios · 4 Plan · 5 Ciclo diario · 6 Release · 7 Cierre
```

y una tabla de **qué está definido y qué falta**:

| Qué | Cómo lo compruebas |
|---|---|
| Alcance | `PROYECTO.md` completo (mismas secciones que en modo ideas) |
| Escenarios | `features/fase-*.feature` (cuenta escenarios; los `@plantilla` no cuentan) |
| Plan | `plan/tareas.json` (fases y tareas) |
| Tickets | `gh issue list --state all --json labels,state` agrupados por `fase-N`: abiertos / cerrados |
| En revisión | `gh pr list --json title,author` (máximo 2 PRs de Claude esperando al dueño) |
| Avance | último run de CI en `main`: `gh run list --workflow CI --branch main --limit 1` y en su log la línea «Avance: X de Y» |
| Fase actual | `CLAUDE.md` («Hoy: Fase N») |
| Producción | último release: `gh release list --limit 1` |

**Siguiente paso:** alcance incompleto → `/guardian-planificar` (entrevista de respaldo) o volver a `/guardian-idea` en el Guardián. Sin escenarios o sin plan → `/guardian-planificar`. Con tickets abiertos → el primero de la fase actual. Fase completa → release y revisión del Parking lot.

## 3. Comandos del Guardián

Termina siempre con esta lista (marca dónde se usa cada uno):

| Comando | Dónde | Para qué |
|---|---|---|
| `/guardian` | Guardián y proyectos | Este menú: estado y siguiente paso |
| `/guardian-idea` | Repo del Guardián | Idea → ficha → alcance (`PROYECTO.md`) y nombre. No crea nada |
| `scripts/nuevo-proyecto.sh <slug> --alcance …` | Terminal, en el Guardián | Crea sitio, repo, secretos y protecciones; sube el esqueleto con tu alcance |
| `/guardian-planificar` | Proyecto | Alcance → escenarios BDD en rojo + plan de tareas por PR → tickets al fusionar |

Responde en el idioma del dueño, en corto: estado, qué falta, **un** siguiente paso.
