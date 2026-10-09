---
name: guardian-consultor
description: Revisión de consultor de un PR de Claude desarrollador en un proyecto del Guardián. Revisa seguridad, alcance, robustez y legibilidad; clasifica cada falla: las de orquestación las arregla en el Guardián o el esqueleto; las de Claude las arregla en el PR con un commit (consultor) y deja la lección en docs/lecciones.md, para que Claude la aplique solo la próxima vez. Úsala en el repo del Guardián con «/guardian-consultor <repo> <PR>».
---

# /guardian-consultor — revisar un PR de Claude desarrollador

Antes de empezar, lee `docs/consultor/manual.md` (quién es quién) y `docs/consultor/lecciones.md` (cómo hablarle al dueño, formato de PR).

## 1. Contexto
- `gh pr view <PR> -R <repo>`: ticket (`Closes #N`), escenario, archivos, checks.
- `PROYECTO.md` del proyecto: **objetivo**, **tipo** (Límites: prueba/MVP o producto) y fase actual.
- `docs/lecciones.md` del proyecto: qué ya sabe Claude. Anota si **aplicó** lecciones previas (señal de madurez).

## 2. Revisar (en este orden)
1. **Alcance:** ¿hace solo lo del ticket? ¿mezcla otro ticket (dependencias)? ¿menos de 300 líneas?
2. **Seguridad («siempre»):** autorización en el servidor, URLs sin headers del visitante, tokens fuera de la URL, secretos fuera del código, nada reimplementado a mano.
3. **Robustez según el tipo:** qué pasa si falla una parte (hoja, correo, API); límites de entrada.
4. **Probarlo de verdad:** checks del PR y el **preview** (`curl` a las páginas tocadas; los errores 500 no siempre los ve el CI).
5. **Legibilidad del PR:** ¿está en dos niveles (En simple + Detalle técnico)? Si no, corrige la descripción.

## 3. Si Claude no aplicó una lección que ya tenía

Antes de repetir la lección, busca **por qué no la aplicó**:
- ¿Una capa que lee **siempre** (`CLAUDE.md`, la skill que corrió, la plantilla del ticket) dice otra cosa? Gana la que lee siempre: corrige la contradicción ahí.
- ¿La skill o el momento no leen `docs/lecciones.md`? Agrégale el paso de leerlas.
- Recién si nada de eso explica el error, la lección está mal escrita: reescríbela más clara.

_Ejemplo: en Vencimientos pidió secretos «en Netlify y GitHub Secrets» porque `CLAUDE.md` decía «usa GitHub Secrets y variables de Netlify» y `/guardian-planificar` no leía las lecciones (guardian-skeleton#16)._

## 4. Si hay que corregir: primero, ¿de quién es la falla? (ADR 0027)

**De orquestación** (plantilla, workflow, permisos, versión, capas que se contradicen; Claude no podía hacerlo mejor):
- Arréglala arriba: issue y PR en el Guardián, o PR en `jjhoncv/guardian-skeleton`. Si el proyecto ya tiene la copia (plantilla, CLAUDE.md), corrígela también, en un commit `(consultor)` en el PR o en un PR propio.
- _Ej.: vencimientos#17 traía el enlace `pr-9` porque la plantilla pedía el número del PR antes de que existiera (guardian-skeleton#18)._

**De Claude** (su código o su PR). Mientras Claude es «bebé», arréglalo tú:
- Rama del PR: `git checkout -B <rama> origin/<rama>`. **Prueba primero** (que falle), después el arreglo.
- Antes de cada commit: `git diff --cached | grep '^+<<<<<<<'` debe estar vacío (nunca commitear conflictos). Si la rama está atrasada con `main`, resuelve los conflictos uno por uno y corre lint, typecheck, test, build y e2e antes de subir.
- Commit: `fix(#N): <qué> (consultor)`, con el porqué en el cuerpo.
- **Lección** en `docs/lecciones.md` del proyecto, en la sección que corresponda (siempre / según el tipo / según el stack), con su porqué y el PR de ejemplo. Respeta el tope (~15): consolida o gradúa si hace falta. Si sirve para cualquier proyecto, PR igual en `guardian-skeleton`.
- En los PRs siguientes, comprueba si la aplicó solo (paso 3). Para probar una lección reescrita, o si el dueño lo pide, pídele el arreglo en su PR: `@claude corrige <qué> según la lección «<título>» de docs/lecciones.md, con una prueba que lo cubra.`

Si es una idea y no una falla, va al Parking lot.

## 5. Cerrar con el dueño
- Qué encontró (lo bueno también: lecciones que Claude ya aplicó), qué corrigió y con qué commits.
- Cómo probarlo en el preview, en pasos.
- Qué necesita de él y el **orden** de los merges.
