# Guardián

> El proyecto raíz. Está por encima de cualquier proyecto de software que se construya con él.
> Este documento es el alcance congelado. Lo que no esté aquí va al **Parking lot**.

---

## 1. Problema

Los proyectos personales de software se quedan a medias porque el alcance crece sin control. Cada idea nueva entra al proyecto, el MVP se vuelve un monstruo, se pierde el foco y llega el aburrimiento.

## 2. Qué es el Guardián

Un **repositorio plantilla en GitHub** que trae todo lo necesario para que un proyecto:

1. Nazca con un **alcance fijo y medible**.
2. Esté **en producción desde el día 1**, aunque sea vacío.
3. Avance en **tareas chicas** que desarrolla Claude y que tú apruebas.
4. Muestre **en todo momento** en qué fase va, qué tan sano está y qué falta.
5. Te **empuje** con avisos y no te deje salirte del alcance.

Cada proyecto nuevo se crea clonando esta plantilla.

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
0. Idea
1. Alcance       → PROYECTO.md del proyecto: qué es, qué NO es, valor, criterios de aceptación
2. Escenarios    → Criterios convertidos en BDD (Dado / Cuando / Entonces). Todos en rojo.
3. Esqueleto     → Repo + pipeline + Netlify. Página vacía con el nombre del proyecto EN PRODUCCIÓN.
4. Plan          → Máximo 5 fases. Cada fase = un entregable usable en producción.
                   Cada tarea = un ticket que pone en verde uno o más escenarios.
5. Ciclo diario  → Claude toma ticket → PR chico → pruebas → preview → tú apruebas → staging
6. Release       → PR de release con CHANGELOG = ticket de pase → tú apruebas → producción
7. Cierre        → Fase cerrada → revisión del Parking lot → siguiente fase o cierre consciente
```

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
| Ticket | GitHub Issue `#12`, con escenario BDD vinculado y criterio de "hecho" |
| Rama | `feat/12-login`, `fix/15-correo` |
| Commit | Conventional Commits: `feat(#12): agrega formulario de login` |
| PR | Plantilla con: ticket, escenario que pone en verde, link al preview, checklist |
| CHANGELOG | Sección `Unreleased` que se actualiza con cada merge; se congela en cada versión (release-please) |
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

### Fase 1 — Esqueleto
- Repo plantilla con README, PROYECTO.md de ejemplo, plantillas de issue y PR, `docs/decisiones/`
- Pipeline: lint + pruebas
- Netlify: preview, staging y producción con aprobación
- release-please: CHANGELOG y releases
- Protección de `main` y seguridad base

**Valor:** un proyecto vacío en producción con todo el flujo funcionando.

### Fase 2 — Alcance y pruebas
- Skill de Claude Code: del PROYECTO.md genera escenarios BDD y tickets
- Estructura de pruebas lista: TDD, BDD, E2E con Playwright, mocks
- Chequeo en el PR: ¿apunta a un escenario del alcance? ¿es chico?

**Valor:** el alcance se vuelve pruebas, y el % en verde es el avance real.

### Fase 3 — Claude en la nube
- Claude Code Action: `@claude` en un issue → PR
- Al hacer merge, Claude toma la siguiente tarea sola
- Límite de 2 PRs en revisión

**Valor:** el proyecto avanza mientras trabajas; tú solo apruebas.

### Fase 4 — Visibilidad
- Sincronización GitHub → Sheet del guardián
- Cálculo diario de salud
- README como dashboard

**Valor:** sabes en qué fase estás y qué tan sano está el proyecto sin abrir el código.

### Fase 5 — Empuje
- Resumen diario al mediodía
- Alerta de cambio de color
- Recordatorio de revisión semanal

**Valor:** el guardián te empuja aunque no entres.

### Criterios de aceptación del Guardián

```gherkin
Escenario: Proyecto nuevo en producción el día 1
  Dado un repo creado desde la plantilla Guardián
  Cuando completo el PROYECTO.md y hago push
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
