# Guardián

> El proyecto raíz. Está por encima de cualquier proyecto de software que se construya con él.
> Este documento es el alcance congelado. Lo que no esté aquí va al **Parking lot**.

---

## 1. Problema

Los proyectos personales de software se quedan a medias porque el alcance crece sin control. Cada idea nueva entra al proyecto, el MVP se vuelve un monstruo, se pierde el foco y llega el aburrimiento.

## 2. Qué es el Guardián

Una **plataforma en GitHub** (este repo: workflows reutilizables, scripts y reglas) más un **esqueleto mínimo** (`jjhoncv/guardian-skeleton`) para que un proyecto:

1. Nazca con un **alcance fijo y medible**.
2. Esté **en producción desde el día 1**, aunque sea vacío.
3. Avance en **tareas chicas** que desarrolla Claude y que tú apruebas.
4. Muestre **en todo momento** en qué fase va, qué tan sano está y qué falta.
5. Te **empuje** con avisos y no te deje salirte del alcance.

Cada proyecto nuevo se crea con `scripts/nuevo-proyecto.sh <nombre>`: primero revisa y pide las llaves (Paso 0), después crea el sitio, el repo y las protecciones y sube el esqueleto. El proyecto **usa** los workflows del Guardián en una versión fija (`@vX.Y.Z`); no los copia.

## 3. Roles

| Rol | Quién | Qué hace |
|---|---|---|
| Dueño / Revisor | Jhonnatan | Define el alcance, aprueba PRs y pases a producción, prueba en staging. Programa si quiere. |
| Desarrollador | Claude (en la nube, vía GitHub Actions) | Toma tareas, escribe código y pruebas, abre PRs chicos. |
| Guardián | La plantilla + reglas + automatizaciones | Vigila el alcance, mide el avance, avisa, bloquea lo que no corresponde. |

**Regla de oro:** nada llega a `main` ni a producción sin tu aprobación.

## 4. Piezas

| Pieza | Herramienta | Para qué |
|---|---|---|
| Código, tickets, PRs, releases | GitHub | Fuente de verdad de la ejecución |
| Pipeline | GitHub Actions | Pruebas, deploys, automatizaciones del guardián |
| Desarrollador | Claude Code Action | Claude trabaja en la nube; tu Mac puede estar apagada |
| Hosting | Netlify | Preview por PR, staging y producción |
| Base de datos | Google Sheets | Tablero del guardián + BD de la app mientras sea MVP |
| Pruebas | Vitest / Jest (TDD), Cucumber o Playwright-BDD (BDD), Playwright (E2E) | Medir el avance real |
| Mocks | Contratos (OpenAPI/JSON Schema), fixtures, MSW, Mailpit | Datos y correos falsos para las pruebas |
| Framework | Next.js 16 + TypeScript | Base de cada proyecto creado con la plantilla |
| Avisos | Bot de Telegram | Resumen diario y alertas al celular |

## 5. Ciclo de vida de un proyecto

```
0. Idea          → /guardian-idea (en el Guardián): ¿prueba o real?, ficha de 1 página, nombre libre. No crea nada.
1. Alcance       → /guardian-idea: PROYECTO.md con qué es, qué NO es, valor, cómo sé que funcionó, límites, fases y criterios.
2. Esqueleto     → scripts/nuevo-proyecto.sh <slug> --alcance …: sitio, repo, secretos y protecciones;
                   el proyecto nace con su alcance y su página EN STAGING.
3. Escenarios    → /guardian-planificar (en el proyecto): criterios → BDD (Dado / Cuando / Entonces). Todos en rojo.
4. Plan          → /guardian-planificar: máximo 5 fases; cada tarea pone en verde uno o más escenarios.
                   El plan se aprueba por PR; al fusionarlo se crean los tickets.
5. Ciclo diario  → Claude toma ticket → PR chico → pruebas → preview → tú apruebas → staging
6. Release       → PR de release con CHANGELOG = ticket de pase → tú apruebas → producción → smoke test
7. Cierre        → Fase cerrada → revisión del Parking lot → siguiente fase o cierre consciente
```

`/guardian` muestra en cualquier momento en qué paso estás, qué falta y el siguiente paso.

**El avance del proyecto = % de escenarios BDD + E2E en verde.** No lo que digan los tickets.

## 6. Reglas del guardián

1. **Sin escenario no hay código.** Toda tarea apunta a un escenario BDD del alcance.
2. **Idea nueva → Parking lot.** No entra al alcance actual.
3. **PR chico:** un solo cambio lógico, idealmente menos de 300 líneas. El pipeline avisa si se pasa.
4. **Límite de trabajo en curso:** máximo 2 PRs esperando tu revisión. Claude no toma otra tarea hasta que apruebes.
5. **Merge solo con pipeline en verde y tu aprobación.** `main` está protegida.
6. **Producción solo con release aprobado** (GitHub Environment con aprobación obligatoria).
7. **Máximo 5 fases por MVP.** Si no entra en 5, el alcance está mal cortado.

## 7. Trazabilidad

| Elemento | Convención |
|---|---|
| Fase (épica) | **Milestone** «Fase N — nombre» con sus entregables; GitHub muestra el % de tickets cerrados (ADR 0023) |
| Ticket | GitHub Issue `#12`, con escenario BDD vinculado y criterio de "hecho" |
| Rama | `feat/12-login`, `fix/15-correo` |
| Commit | Conventional Commits: `feat(#12): agrega formulario de login` |
| PR | Plantilla con: ticket, escenario que pone en verde, link al preview, checklist |
| CHANGELOG | Los cambios sin publicar se acumulan en el **PR de release** abierto (hace de `Unreleased`); al fusionarlo se congelan como versión en `CHANGELOG.md` (release-please, ADR 0017) |
| Release | Versión semántica `v0.3.0` + notas generadas |
| Pase a producción | El PR de release; requiere tu aprobación |
| Decisiones | `docs/decisiones/` — una ADR corta por decisión: qué se decidió y por qué |
| Tablero | GitHub Projects con columnas: Por hacer / En curso / En revisión / Hecho |

## 8. Ambientes

Una sola rama (`main`), tres lugares:

| Ambiente | Cuándo se despliega | Para qué | Datos |
|---|---|---|---|
| Preview | Cada PR | Ver el cambio aislado de Claude | Sheet de pruebas |
| Staging | Cada merge a `main` | Probar el conjunto antes de subir | Sheet de pruebas |
| Producción | Cada release aprobado | Uso real | Sheet de producción |

- **Smoke test** después de cada deploy a producción: 3 o 4 pruebas E2E rápidas. Si fallan → alerta y rollback.
- **Rollback:** volver a la versión anterior desde Netlify con un clic.

## 9. Calidad

- **TDD:** pruebas unitarias antes del código.
- **BDD:** los criterios de aceptación escritos como escenarios; son la definición del alcance.
- **E2E:** Playwright levanta Chrome y recorre los flujos reales (el QA automático).
- **Contratos:** definen entradas y salidas de cada parte; de ellos salen los mocks.
- **Mocks:** fixtures, APIs simuladas (MSW) y correos capturados (Mailpit).

## 10. Visibilidad

### README como dashboard (se regenera en cada merge)
- Badges: pipeline, cobertura, deploy
- Barra: % del alcance cubierto
- Fase actual, próximo hito, links a staging y producción
- Salud del proyecto (color)

### Sheet del guardián

| Pestaña | Contenido |
|---|---|
| Proyecto | Nombre, alcance, fechas, estado, links |
| Fases | Fase, entregable, fecha objetivo, % escenarios en verde |
| Tareas | Ticket, fase, responsable, estado, fecha objetivo, fecha real |
| Parking lot | Idea, fecha, por qué, decisión (entra / se descarta) |
| Decisiones | Fecha, decisión, motivo, link a ADR |
| Eventos | Log automático: PR abierto, aprobado, deploy, release, fallo |
| Salud | Una fila por día: color, % avance, días de atraso, quién bloquea |

GitHub es la fuente de verdad de la ejecución; el guardián **copia** el estado al Sheet. No se edita el plan en dos lados.

## 11. Barra de salud

| Color | Condición |
|---|---|
| 🟢 Verde | Tareas al día y pipeline de `main` en verde |
| 🟡 Amarillo | 1 o 2 días de atraso, o un PR esperando tu revisión más de 24 h |
| 🔴 Rojo | Más de 3 días de atraso, o `main` en rojo más de 24 h |
| ⚫ Gris | 14 días sin actividad → el guardián propone **pausa** o **cierre consciente** |

- La barra mide **si desbloqueas a Claude**, no si tú programaste.
- **Modo pausa:** para vacaciones o semanas pesadas. La barra se congela, no cae.
- **Cierre consciente:** si el proyecto ya no vale la pena, se cierra con una nota de por qué. Nada muere en silencio.

## 12. Ritmo

| Cuándo | Qué haces | Tiempo |
|---|---|---|
| Lunes a viernes, refrigerio | Lees el resumen diario, revisas el preview, apruebas o comentas PRs desde la app de GitHub | 15 min |
| Fin de semana | Revisión semanal: avance de la fase, staging, decisiones, Parking lot, aprobar release | 30 min |

**Resumen diario (mediodía):** qué hizo Claude, qué espera de ti, % de avance, color de salud.

El plan se arma con **esta capacidad real**, no con la ideal.

## 13. Seguridad

- `main` protegida: requiere PR, pipeline en verde y tu aprobación.
- Producción con GitHub Environment y aprobación obligatoria.
- Claude con permisos mínimos: puede abrir PRs, no puede hacer merge ni tocar producción.
- Secretos en GitHub Secrets y Netlify: API key de Claude, service account de Google, tokens.
- Service accounts separadas para el Sheet de pruebas y el de producción.
- Secret scanning y Dependabot activados.
- Tope de gasto en la API key de Claude.

---

## 14. Alcance del Guardián (su propio MVP)

El Guardián se construye con sus propias reglas. Si no logra sacarse a sí mismo a producción, no sirve.

### Fase 1 — Esqueleto ✅ cerrada el 2026-10-04 (v0.4.0; E1 y E4 en verde, E1 probado con `lista-de-lecturas`)
- Repo plantilla con README, PROYECTO.md de ejemplo, plantillas de issue y PR, `docs/decisiones/`
- Pipeline: lint + pruebas
- Netlify: preview, staging y producción con aprobación
- release-please: CHANGELOG y releases
- Protección de `main` y seguridad base

**Valor:** un proyecto vacío en producción con todo el flujo funcionando.

### Fase 2 — Alcance y pruebas ✅ cerrada el 2026-10-05 (v0.7.0; E2 en verde, probado con el proyecto real Vitrina)
- Skill de Claude Code `/planificar`: si PROYECTO.md está en blanco, entrevista al dueño y lo redacta (el dueño decide el alcance); del PROYECTO.md genera escenarios BDD en rojo y un plan de tareas en un PR; al fusionarlo se crean los tickets
- Estructura de pruebas lista: TDD, BDD, E2E con Playwright, mocks
- Chequeo en el PR: ¿apunta a un escenario del alcance? ¿es chico?
- Smoke test E2E después de cada deploy a producción (sección 8)

**Valor:** el alcance se vuelve pruebas, y el % en verde es el avance real.

### Fase 3 — Claude en la nube
- Claude Code Action: `@claude` en un issue → PR
- Al hacer merge, Claude toma la siguiente tarea sola
- Límite de 2 PRs en revisión
- Claude con identidad y permisos mínimos: abre PRs, no hace merge ni toca producción; `main` pasa a exigir 1 aprobación (ADR 0009)
- Tope de gasto en la API key de Claude

**Valor:** el proyecto avanza mientras trabajas; tú solo apruebas.

### Fase 4 — Visibilidad
- Sincronización GitHub → Sheet del guardián
- Cálculo diario de salud
- README como dashboard
- Service accounts separadas para el Sheet de pruebas y el de producción

**Valor:** sabes en qué fase estás y qué tan sano está el proyecto sin abrir el código.

### Fase 5 — Empuje
- Resumen diario al mediodía
- Alerta de cambio de color
- Recordatorio de revisión semanal
- Aviso antes de que venzan los tokens (PAT de release-please, token de Netlify)

**Valor:** el guardián te empuja aunque no entres.

### Avance del Guardián (a mano hasta la Fase 4, ADR 0020)

| Escenario | Estado |
|---|---|
| E1 Proyecto nuevo en producción el día 1 | ✅ (Fase 1; con `nuevo-proyecto.sh` desde la Fase 2) |
| E2 Alcance convertido en pruebas | ✅ (Fase 2; Vitrina: 14 escenarios en rojo y 8 tickets en 3 fases) |
| E3 Claude entrega un PR chico | ✅ (Fase 3; Vitrina: #12, #14 y #15 hechos por Claude, aprobados y fusionados) |
| E4 Nada sube a producción sin mí | ✅ (Fase 1) |
| E5 Veo la salud desde el celular | ⬜ Fase 4 |
| E6 El guardián me avisa | ⬜ Fase 5 |

**4 de 6 escenarios en verde (67 %).**

### Criterios de aceptación del Guardián

```gherkin
Escenario: Proyecto nuevo en producción el día 1
  Dado un proyecto creado con nuevo-proyecto.sh
  Cuando termina el script
  Entonces existe una página con el nombre del proyecto en staging y en producción

Escenario: Alcance convertido en pruebas
  Dado un PROYECTO.md con criterios de aceptación
  Cuando ejecuto la skill de planificación
  Entonces se generan escenarios BDD en rojo y un ticket por tarea, en máximo 5 fases

Escenario: Claude entrega un PR chico
  Dado un ticket aprobado
  Cuando Claude lo toma
  Entonces abre un PR vinculado al ticket, con preview, pruebas en verde y menos de 300 líneas

Escenario: Nada sube a producción sin mí
  Dado un PR de release abierto
  Cuando no lo apruebo
  Entonces producción no cambia

Escenario: Veo la salud desde el celular
  Dado un proyecto en curso
  Cuando abro el Sheet o el README
  Entonces veo la fase actual, el % de avance y el color de salud

Escenario: El guardián me avisa
  Dado que es mediodía de un día laborable
  Cuando hay PRs esperando mi revisión
  Entonces recibo un resumen con lo que hizo Claude y lo que espera de mí
```

## 15. Fuera del alcance (Parking lot inicial)

- Gamificación: puntos, rachas, logros
- Observabilidad del producto: Sentry, uptime, analítica
- Seguimiento del costo de tokens por sesión (por ahora basta el tope de gasto)
- Feature flags, ambiente de QA aparte, blue-green
- Interfaz web propia del guardián (el Sheet y el README alcanzan)
- Migrar la BD de Sheets a una BD real
- GitHub App propia para release-please (por ahora: PAT fine-grained limitado al repo, 90 días)
- Mailpit para probar correos: hasta que un proyecto envíe correos no hay nada que probar con él
- Un solo workflow **Pipeline** en Actions (calidad ∥ chequeo ∥ build → preview/staging; release → producción → smoke) en vez de 7 separados — 2026-10-05 — candidato a la Fase 4 (Visibilidad)
- CI: instalar Chrome sin `--with-deps` (solo el navegador, con caché) para no depender de los mirrors de Ubuntu en cada corrida — 2026-10-05 — un día de mirrors lentos el paso tardó ~7 min (lo normal: 15–30 s)
- Skills del Guardián (`/guardian`, `/guardian-planificar`) como **plugin de Claude Code versionado**, en vez de copiarlas a cada proyecto — 2026-10-05 — una corrección hoy no llega sola a los proyectos ya creados (los workflows sí)
- El check «validar esqueleto» verifica que existan los marcadores que completa `nuevo-proyecto.sh` (`<Dueño>`, `Fase <N> — <nombre>`, …) — 2026-10-05 — si cambian en el esqueleto, el completado falla sin avisar
- Fecha objetivo en cada milestone de fase, calculada desde los **Límites** del `PROYECTO.md` — 2026-10-05 — GitHub marca el atraso y alimenta la barra de salud; candidato a la Fase 4
- **Smoke del preview**: el deploy de cada PR verifica que la página responda 200 y, si no, el check queda en rojo — 2026-10-06 — en Vitrina #12 el deploy salió verde aunque el preview respondía 500 (faltaban las variables de Google)
- Cuando Claude falla en la nube, el Guardián **comenta en el ticket** el motivo (p. ej. «sin crédito en la API») — 2026-10-06 — el error quedó escondido en el log de Actions y no se veía desde el celular
- `@claude` también en **comentarios sobre líneas de código** y en reviews de PR (`pull_request_review_comment`, `pull_request_review`), no solo en la conversación — 2026-10-06 — hoy un comentario en una línea del diff no despierta a Claude
- Al arrancar, Claude **comenta en el ticket** «Estoy trabajando en esto» con el link al run (y el tablero lo pasa a *En curso*) — 2026-10-06 — mientras Claude trabaja no se ve nada en el tablero ni en el issue hasta que abre el PR

## 16. Decisiones tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-04 | Avisos por **Telegram** (bot propio, enviado desde GitHub Actions) | Llega directo al celular, es gratis y simple de automatizar |
| 2026-10-04 | Framework base: **Next.js 16** (línea Active LTS, última estable al crear la plantilla) + TypeScript | Versión con soporte activo; desplegable en Netlify |
| 2026-10-04 | Repo `jjhoncv/guardian` **público** | Rulesets y aprobación obligatoria en Environments sin plan pago |
| 2026-10-04 | **Un solo sitio de Netlify**; todos los deploys desde GitHub Actions (preview `pr-N`, staging, producción `--prod`) | Producción depende solo del Environment con aprobación |
| 2026-10-04 | Fase 1: `main` exige PR + pipeline en verde con **0 aprobaciones**; Jhonnatan hace el merge. Sube a 1 aprobación en la Fase 3 | Los PRs de la Fase 1 salen a nombre de Jhonnatan y GitHub no permite aprobar el propio |
| 2026-10-04 | `PROYECTO.md` del repo es el del Guardián; la plantilla trae `docs/PROYECTO.ejemplo.md` | El Guardián se construye con sus propias reglas |
| 2026-10-04 | release-please con **PAT fine-grained** (Contents + Pull requests, solo este repo, 90 días) | Los PRs creados con `GITHUB_TOKEN` no disparan el CI |
| 2026-10-04 | Node 24 LTS + npm | Requisito de Next.js 16; sin herramientas extra |
| 2026-10-04 | **Solo squash merge**; el título del PR es el mensaje del commit | Con merge commits el CHANGELOG sale duplicado |
| 2026-10-04 | La plantilla trae `docs/CLAUDE.ejemplo.md`; el `CLAUDE.md` del repo es el del Guardián | Un proyecto nuevo no debe heredar las instrucciones del Guardián |
| 2026-10-04 | Smoke test de producción en la **Fase 2**; aviso de vencimiento de tokens en la **Fase 5** | El smoke test necesita Playwright; los tokens vencen en silencio y rompen releases y deploys |
| 2026-10-04 | Workflow **Inicializar proyecto**: el repo nuevo arranca con su `PROYECTO.md`, `CLAUDE.md` y `README.md` y sin la historia del Guardián (sale del Parking lot `nuevo-proyecto.sh`) | La plantilla copia todo el repo; limpiar a mano confunde y va contra E1 |
| 2026-10-04 | El PR de release hace de sección `Unreleased` del CHANGELOG | release-please no escribe esa sección; el PR abierto muestra lo pendiente (ADR 0017) |
| 2026-10-04 | **Cierre de la Fase 1.** Los puntos de la sección 13 sin fase pasan a las Fases 3 y 4 | Revisión de cierre contra todo el alcance |
| 2026-10-04 | BDD con **playwright-bdd**: los `.feature` corren sobre Playwright | Un solo runner para BDD y E2E (ADR 0018) |
| 2026-10-04 | `/planificar` entrevista al dueño si PROYECTO.md está en blanco; escenarios y plan se aprueban **por PR** y los tickets se crean al fusionarlo | Todo se aprueba por PR; el dueño decide el alcance (ADR 0019) |
| 2026-10-04 | Chequeo de PR: **bloquea** sin ticket o sin escenario, **avisa** por tamaño; rollback automático + issue si falla el smoke test | Reglas 1 y 3 de la sección 6 y sección 8 |
| 2026-10-04 | El % del propio Guardián se lleva a mano en PROYECTO.md hasta la Fase 4 | Sus escenarios son del flujo, no de una página (ADR 0020) |
| 2026-10-05 | **Plataforma + esqueleto:** los proyectos llaman a los workflows reutilizables del Guardián (`@vX.Y.Z`) y nacen de `guardian-skeleton` con `nuevo-proyecto.sh` (Paso 0, sitio de Netlify automático, un PAT por proyecto) | La plantilla copiaba la maquinaria del Guardián y las copias quedaban congeladas (ADR 0021) |
| 2026-10-05 | **Paso 0 antes de crear nada:** `/guardian-idea` (ficha + alcance + nombre) → `nuevo-proyecto.sh --alcance` → `/guardian-planificar`; comandos con prefijo `guardian` y `/guardian` como menú | Se estaba creando la infraestructura antes de saber de qué trataba el proyecto (ADR 0022) |
| 2026-10-05 | **Cierre de la Fase 2.** E2 probado de punta a punta con el proyecto real Vitrina | Avance del Guardián: 3 de 6 escenarios (50 %) |
| 2026-10-05 | Cada fase es un **milestone** de GitHub (Guardián y proyectos); el workflow de tickets los crea y asigna | Las fases solo existían en PROYECTO.md; así se ve el % por fase, también desde el celular (ADR 0023) |
| 2026-10-06 | Fase 3: API key con tope mensual, `@claude` solo del dueño + siguiente tarea automática (máx. 2 PRs), Sonnet 5.5, Claude abre el PR y no puede fusionar | ADR 0024 |
| 2026-10-06 | La API de Claude se paga **aparte** del plan Pro: crédito prepagado (USD 10) sin recarga automática + tope del workspace `guardian-ci` | Sin crédito, Claude falla en el primer turno sin gastar nada; el tope corta cualquier loop |
| 2026-10-06 | Claude no abre la fase siguiente solo: con la fase actual sin tickets, avisa y espera que el dueño la cierre (milestone + CLAUDE.md) | Cerrar una fase es decisión del dueño (paso 7 del ciclo); evita gastar crédito en tickets que aún no tocan |
| 2026-10-06 | **Cierre de la Fase 3.** E3 probado en Vitrina: Claude hizo #2, #3 y #4; el dueño aprobó cada PR y la siguiente tarea arrancó sola | Avance del Guardián: 4 de 6 escenarios (67 %) |
| 2026-10-06 | `main` exige **1 aprobación**: los PRs de `claude[bot]` esperan al dueño; el dueño (admin) puede fusionar los suyos sin auto-aprobarse | Cierra la ADR 0009; Claude no puede fusionar ni saltarse la regla |
