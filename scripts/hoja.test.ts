import { describe, expect, it } from "vitest";
import { anchos, barra, barrasResumen, ENCABEZADOS, faseEnCurso, filasFases, filasProyecto, filasResumen, filasSalud, filasTareas, filasTendencia, type DatosProyecto } from "./hoja";

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
    { title: "Fase 1 — Catálogo", due_on: "2026-10-19T12:00:00Z", open_issues: 0, closed_issues: 3, state: "closed", created_at: "2026-10-05T00:00:00Z" },
    { title: "Fase 3 — Comentarios", due_on: "2026-11-16T12:00:00Z", open_issues: 1, closed_issues: 1, state: "open", created_at: "2026-10-05T00:00:00Z" },
    { title: "Otro", due_on: null, open_issues: 0, closed_issues: 0, state: "open", created_at: "2026-10-05T00:00:00Z" },
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

describe("Resumen: el tablero para leer en 10 segundos", () => {
  const conFase: DatosProyecto = {
    ...vitrina,
    milestones: [
      { title: "Fase 2 — Entrar", due_on: "2026-10-12T12:00:00Z", open_issues: 0, closed_issues: 3, state: "closed", created_at: "2026-10-01T00:00:00Z" },
      { title: "Fase 3 — Comentarios", due_on: "2026-10-22T12:00:00Z", open_issues: 2, closed_issues: 1, state: "open", created_at: "2026-10-01T00:00:00Z" },
    ],
    tareas: [
      { numero: 8, titulo: "a", fase: "Fase 3 — Comentarios", estado: "hecho", creado: "2026-10-12T00:00:00Z", cerrado: "2026-10-13T00:00:00Z" },
      { numero: 9, titulo: "b", fase: "Fase 3 — Comentarios", estado: "en revisión", creado: "2026-10-12T00:00:00Z", cerrado: null },
      { numero: 10, titulo: "c", fase: "Fase 3 — Comentarios", estado: "abierto", creado: "2026-10-12T00:00:00Z", cerrado: null },
    ],
  };
  const hoy = "2026-10-20T12:00:00Z";

  it("barra: SPARKLINE de Google Sheets solo con números y colores fijos (nunca texto del proyecto)", () => {
    expect(barra(67, "avance")).toBe('=SPARKLINE(67,{"charttype","bar";"max",100;"color1","#34a853"})');
    expect(barra(140, "tiempo")).toBe('=SPARKLINE(100,{"charttype","bar";"max",100;"color1","#9aa0a6"})');
    expect(barra(-5, "alerta")).toBe('=SPARKLINE(0,{"charttype","bar";"max",100;"color1","#ea4335"})');
  });

  it("fase: el tiempo corre desde la fecha objetivo de la fase anterior; avisa si el plazo va más rápido que el trabajo", () => {
    const f = faseEnCurso(conFase, hoy)!;
    expect(f).toMatchObject({ titulo: "Fase 3 — Comentarios", trabajo: 33, tiempo: 80, diasRestantes: 2, hechos: 1, enRevision: 1, porHacer: 1 });
    expect(f.alerta).toBe("⚠️ el plazo va más rápido que el trabajo");
  });

  it("una fila por proyecto: texto aquí, barras aparte (columnas C, F y H)", () => {
    const [enc, fila] = filasResumen([conFase], hoy);
    expect(enc).toEqual(ENCABEZADOS.Resumen);
    expect(fila).toEqual([
      "vitrina", "🟡 amarillo", "", "80 % · 12 de 15", "Fase 3 — Comentarios", "", "33 %", "", "80 %",
      "✅ 1 · 👀 1 · ⬜ 1", "en 2 días", "El PR #36 espera tu revisión hace más de 24 h · ⚠️ el plazo va más rápido que el trabajo",
    ]);
    expect(barrasResumen([conFase], hoy)).toEqual([[barra(80, "avance"), barra(33, "trabajo"), barra(80, "alerta")]]);
  });

  it("sin fecha objetivo no hay barra de tiempo ni alerta; sin estado se dice", () => {
    const sinFecha = { ...conFase, milestones: [{ ...conFase.milestones[1], due_on: null }] };
    expect(faseEnCurso(sinFecha, hoy)).toMatchObject({ tiempo: null, alerta: null });
    expect(filasResumen([sinFecha], hoy)[1][8]).toBe("sin fecha objetivo");
    expect(barrasResumen([sinFecha], hoy)[0][2]).toBe("");
    expect(filasResumen([sinEstado], hoy)[1][1]).toBe("sin estado todavía");
    expect(barrasResumen([sinEstado], hoy)).toEqual([["", "", ""]]);
  });

  it("ancho de columna según el texto más largo, encabezado incluido", () => {
    expect(anchos([["proyecto", "x"], ["guardian", "un texto bastante más largo"]])).toEqual([96, 248]);
  });

  it("tendencia: avance por día y proyecto, en columnas (para el gráfico)", () => {
    const salud = [[...ENCABEZADOS.Salud], ["2026-10-19", "vitrina", "🟢", "70 %", "0", ""], ["2026-10-19", "guardian", "🟢", "60 %", "0", ""], ["2026-10-20", "vitrina", "🟡", "80 %", "0", ""]];
    expect(filasTendencia(salud)).toEqual([
      ["fecha", "guardian", "vitrina"],
      ["2026-10-19", 60, 70],
      ["2026-10-20", "", 80],
    ]);
  });
});
