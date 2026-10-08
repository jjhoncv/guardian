import { describe, expect, it } from "vitest";
import { resumenDiario, type ParaResumen } from "./resumen";
import type { DatosProyecto } from "./hoja";

const hoy = "2026-10-14T17:00:00Z"; // miércoles 12:00 en Lima
const salud = (color: "verde" | "amarillo" | "rojo" | "gris", alertas: { gravedad: "rojo" | "amarillo" | "gris"; texto: string; accion: string; pr?: number }[] = [], pausa = false) =>
  ({ color, emoji: { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚫" }[color], motivos: alertas.map((a) => a.texto), alertas, diasAtraso: 0, pausa });
const proyecto = (repo: string, s: ReturnType<typeof salud>, fase: string | null, porcentaje: number, extra: Partial<DatosProyecto> = {}): DatosProyecto => ({
  repo,
  estado: { proyecto: repo.split("/")[1], fase: fase ? { titulo: fase, vence: null } : null, avance: { verdes: porcentaje, total: 100, porcentaje }, salud: s, actualizado: hoy },
  milestones: fase ? [{ title: fase, due_on: null, open_issues: 1, closed_issues: 1, state: "open", created_at: "2026-10-01T00:00:00Z" }] : [{ title: "Fase 1 — A", due_on: null, open_issues: 0, closed_issues: 2, state: "closed", created_at: "2026-10-01T00:00:00Z" }],
  tareas: [],
  ...extra,
});
const sinNada = { pendientes: [], actividad: { fusionados: [], abiertos: [], ticketsCerrados: 0 } };

describe("resumen diario (E6)", () => {
  it("primero lo que tienes que hacer, numerado y con link; después lo que hizo Claude; al final cada proyecto", () => {
    const vitrina: ParaResumen = {
      datos: proyecto("jjhoncv/vitrina", salud("rojo", [{ gravedad: "rojo", texto: "«Fase 2» lleva 5 días de atraso", accion: "Decide: achicar o reprogramar" }, { gravedad: "amarillo", texto: "El PR #44 espera tu revisión hace más de 24 h", accion: "x", pr: 44 }]), "Fase 2 — Entrar", 60),
      pendientes: [
        { tipo: "pr", urgente: true, texto: "PR #44 «filtro» te espera hace 2 días", accion: "Revisa el preview y aprueba o comenta", url: "https://github.com/jjhoncv/vitrina/pull/44" },
        { tipo: "pregunta", urgente: false, texto: "Claude te escribió en #45 «Colores»: «¿Uso los de la marca?»", accion: "Respóndele con @claude", url: "https://c45" },
      ],
      actividad: { fusionados: [{ numero: 36, titulo: "guardar comentario", url: "u36" }], abiertos: [{ numero: 44, titulo: "filtro", url: "u44" }], ticketsCerrados: 2 },
    };
    const guardian: ParaResumen = { datos: proyecto("jjhoncv/guardian", salud("verde"), "Fase 5 — Empuje", 83), ...sinNada };
    expect(resumenDiario([guardian, vitrina], hoy)).toBe([
      "🛡️ <b>Guardián</b> · miércoles 14 oct · 12:00",
      "",
      "🔴 <b>Atender hoy (3)</b>",
      "1. ⏰ vitrina · PR #44 «filtro» te espera hace 2 días",
      '   → Revisa el preview y aprueba o comenta · <a href="https://github.com/jjhoncv/vitrina/pull/44">abrir</a>',
      "2. 🔴 vitrina · «Fase 2» lleva 5 días de atraso",
      '   → Decide: achicar o reprogramar · <a href="https://github.com/jjhoncv/vitrina/milestones">abrir</a>',
      "3. vitrina · Claude te escribió en #45 «Colores»: «¿Uso los de la marca?»",
      '   → Respóndele con @claude · <a href="https://c45">abrir</a>',
      "",
      "🤖 <b>Claude desde ayer</b>",
      '• vitrina: fusionó <a href="u36">#36</a> guardar comentario · abrió <a href="u44">#44</a> filtro',
      "• 2 tickets cerrados",
      "",
      "📊 <b>Proyectos</b>",
      "🟢 guardian · Fase 5 — Empuje · 83 %",
      "🔴 vitrina · Fase 2 — Entrar · 60 %",
    ].join("\n"));
  });

  it("sin nada que atender ni actividad: una línea, y los proyectos", () => {
    const texto = resumenDiario([{ datos: proyecto("jjhoncv/vitrina", salud("verde"), null, 100), ...sinNada }], hoy);
    expect(texto).toContain("🟢 Todo en orden, sin novedades");
    expect(texto).toContain("🟢 vitrina · terminado · 100 %");
    expect(texto).not.toContain("Atender hoy");
  });

  it("un proyecto en pausa no pide nada: solo aparece como pausado", () => {
    const pausado: ParaResumen = { ...sinNada, datos: proyecto("jjhoncv/x", salud("rojo", [{ gravedad: "rojo", texto: "atraso", accion: "y" }], true), "Fase 1 — A", 10), pendientes: [{ tipo: "fase", urgente: false, texto: "t", accion: "a", url: "u" }] };
    const texto = resumenDiario([pausado], hoy);
    expect(texto).toContain("⏸️ x · en pausa");
    expect(texto).not.toContain("Atender hoy");
  });

  it("escapa lo que viene de GitHub", () => {
    const p: ParaResumen = { ...sinNada, datos: proyecto("jjhoncv/x", salud("verde"), "Fase 1 — <A>", 10), pendientes: [{ tipo: "pr", urgente: false, texto: "PR #1 «<b>x</b>»", accion: "a", url: "u" }] };
    expect(resumenDiario([p], hoy)).toContain("PR #1 «&lt;b&gt;x&lt;/b&gt;»");
  });
});
