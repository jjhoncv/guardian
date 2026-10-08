---
name: guardian-consultor
description: Revisión de consultor de un PR de Claude desarrollador en un proyecto del Guardián. Revisa seguridad, alcance, robustez y legibilidad; arregla en el mismo PR con un commit (consultor), deja la lección en docs/lecciones.md del proyecto (y en guardian-skeleton si es general) y abre issue en el Guardián si la falla es de la plataforma. Úsala en el repo del Guardián con «/guardian-consultor <repo> <PR>».
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

## 3. Si hay que corregir
- Rama del PR: `git checkout -B <rama> origin/<rama>`. **Prueba primero** (que falle), después el arreglo.
- Antes de cada commit: `git diff --cached | grep '^+<<<<<<<'` debe estar vacío (nunca commitear conflictos). Si la rama está atrasada con `main`, resuelve los conflictos uno por uno y corre lint, typecheck, test, build y e2e antes de subir.
- Commit: `fix(#N): <qué> (consultor)`, con el porqué en el cuerpo.
- **Lección** en `docs/lecciones.md` del proyecto, en la sección que corresponda (siempre / según el tipo / según el stack), con su porqué y el PR de ejemplo. Respeta el tope (~15): consolida o gradúa si hace falta.
- Si la lección sirve para cualquier proyecto: PR igual en `jjhoncv/guardian-skeleton`.
- Si la falla es de la plataforma: issue y PR en el Guardián. Si es una idea, va al Parking lot.

## 4. Cerrar con el dueño
- Qué encontró (lo bueno también: lecciones que Claude ya aplicó), qué corrigió y con qué commits.
- Cómo probarlo en el preview, en pasos.
- Qué necesita de él y el **orden** de los merges.
