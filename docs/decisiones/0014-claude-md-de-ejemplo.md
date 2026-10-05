# 0014. `CLAUDE.md` de ejemplo para proyectos nuevos

- **Fecha:** 2026-10-04
- **Estado:** Aceptada

## Contexto

Un proyecto creado desde la plantilla heredaba el `CLAUDE.md` del Guardián: otro nombre, otro stack, otras decisiones. Claude trabajaría con instrucciones de otro proyecto.

## Decisión

Igual que con `PROYECTO.md` (ADR 0010): `CLAUDE.md` es el del Guardián y la plantilla trae `docs/CLAUDE.ejemplo.md`, genérico, que el proyecto nuevo copia sobre `CLAUDE.md` y completa.

## Por qué

Mantiene las instrucciones del Guardián en su repo y da a cada proyecto reglas propias sin editar a mano un archivo ajeno.
