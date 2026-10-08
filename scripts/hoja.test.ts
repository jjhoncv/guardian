import { describe, expect, it } from "vitest";
import { ENCABEZADOS, filasFases, filasProyecto, filasSalud, filasTareas, type DatosProyecto } from "./hoja";

const vitrina: DatosProyecto = {
  repo: "jjhoncv/vitrina",
  estado: {
    proyecto: "vitrina",
    fase: { titulo: "Fase 3 — Comentarios", vence: "2026-11-16T12:00:00Z" },
    avance: { verdes: 12, total: 15, porcentaje: 80 },
    salud: { color: "amarillo", emoji: "🟡", motivos: ["El PR #36 espera tu revisión hace más de 24 h"], diasAtraso: 0, pausa: false },
    actualizado: "2026-10-20T11:00:05Z",
  },
  milestones: [
    { title: "Fase 1 — Catálogo", due_on: "2026-10-19T12:00:00Z", open_issues: 0, closed_issues: 3, state: "closed" },
    { title: "Fase 3 — Comentarios", due_on: "2026-11-16T12:00:00Z", open_issues: 1, closed_issues: 1, state: "open" },
    { title: "Otro", due_on: null, open_issues: 0, closed_issues: 0, state: "open" },
  ],
  tareas: [
    { numero: 9, titulo: "Guardar comentario", fase: "Fase 3 — Comentarios", estado: "en revisión", creado: "2026-10-08T10:00:00Z", cerrado: null },
    { numero: 2, titulo: "Portada", fase: "Fase 1 — Catálogo", estado: "hecho", creado: "2026-10-05T10:00:00Z", cerrado: "2026-10-06T10:00:00Z" },
  ],
};
const sinEstado: DatosProyecto = { repo: "jjhoncv/nuevo", estado: null, milestones: [], tareas: [] };

describe("hoja del Guardián (ADR 0026): una fila por proyecto, espejo de GitHub", () => {
  it("Proyecto: fase, avance, salud con motivo y links", () => {
    const [enc, fila, vacia] = filasProyecto([vitrina, sinEstado]);
    expect(enc).toEqual(ENCABEZADOS.Proyecto);
    expect(fila).toEqual([
      "vitrina", "Fase 3 — Comentarios", "2026-11-16", "12 de 15 (80 %)", "🟡 amarillo",
      "El PR #36 espera tu revisión hace más de 24 h", "2026-10-20 11:00", "https://github.com/jjhoncv/vitrina",
    ]);
    expect(vacia.slice(0, 5)).toEqual(["nuevo", "", "", "", "sin estado todavía"]);
  });

  it("Fases: solo los milestones «Fase N», en orden, con su avance de tickets", () => {
    const [, f1, f3, ...resto] = filasFases([vitrina]);
    expect(f1).toEqual(["vitrina", "Fase 1 — Catálogo", "2026-10-19", "3 de 3", "cerrada"]);
    expect(f3).toEqual(["vitrina", "Fase 3 — Comentarios", "2026-11-16", "1 de 2", "abierta"]);
    expect(resto).toEqual([]);
  });

  it("Tareas: por número de ticket, con link", () => {
    const [, t2, t9] = filasTareas([vitrina]);
    expect(t2).toEqual(["vitrina", "#2", "Portada", "Fase 1 — Catálogo", "hecho", "2026-10-05", "2026-10-06", "https://github.com/jjhoncv/vitrina/issues/2"]);
    expect(t9[4]).toBe("en revisión");
  });

  it("Salud: agrega la fila de hoy y reemplaza la de hoy si ya estaba, sin tocar el historial", () => {
    const existentes = [[...ENCABEZADOS.Salud], ["2026-10-19", "vitrina", "🟢 verde", "70 %", "0", ""], ["2026-10-20", "vitrina", "🟢 verde", "75 %", "0", ""]];
    const filas = filasSalud(existentes, [vitrina, sinEstado], "2026-10-20");
    expect(filas).toEqual([
      ENCABEZADOS.Salud,
      ["2026-10-19", "vitrina", "🟢 verde", "70 %", "0", ""],
      ["2026-10-20", "vitrina", "🟡 amarillo", "80 %", "0", "El PR #36 espera tu revisión hace más de 24 h"],
    ]);
  });

  it("la pausa se ve en Proyecto y en Salud", () => {
    const pausado = { ...vitrina, estado: { ...vitrina.estado!, salud: { ...vitrina.estado!.salud, pausa: true, motivos: ["En pausa: la barra está congelada"] } } };
    expect(filasProyecto([pausado])[1][4]).toBe("⏸️ en pausa (🟡 amarillo)");
  });
});
