# 0031. Tickets completos: Claude no adivina

- **Fecha:** 2026-10-23
- **Estado:** aceptada

## Contexto

En Info Site cada ticket traía un solo escenario (el camino feliz) y un párrafo. Claude adivinaba el resto: qué pasa al cancelar, qué texto exacto mostrar, qué tablas toca y de qué otro ticket depende. Tomó #11 (tope de imágenes) antes de que existiera #10 (subida) y terminó sin PR. El dueño pidió tickets profesionales y completos.

## Decisión

- Cada tarea del plan (`plan/tareas.json`) puede traer, además de lo de siempre: **historia** (como… quiero… para…), **depende** (ids de otras tareas), **reglas**, **diseño** (maqueta y textos exactos), **datos** (tablas, migraciones), **pruebas esperadas** y **fuera de alcance**. Son opcionales: los planes viejos siguen válidos.
- Entre **3 y 6 escenarios por ticket**: camino feliz, al menos uno alternativo y uno de error. Más de 6 es un error del plan: el ticket se parte en dos para que el PR siga chico.
- El ticket muestra las dependencias con su número de issue (`#10 — Subida de imágenes`).
- **El plan es la fuente:** si cambia, `guardian-tickets.yml` reescribe el cuerpo de los tickets abiertos. Los cerrados no se tocan. Lo que se agregue a mano en un ticket abierto se pierde: se edita el plan.

## Consecuencias

- El avance baja de porcentaje al sumar escenarios: mide mejor lo que falta.
- Los PRs de Claude crecen un poco; el tope de 6 escenarios los mantiene chicos.
- `siguiente-ticket.ts` puede saltar los tickets cuyas dependencias siguen abiertas (#272).
