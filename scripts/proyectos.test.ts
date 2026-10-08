import { describe, expect, it } from "vitest";
import { actividadDe, pendientesDe, type Crudo } from "./proyectos";

const hoy = "2026-10-14T17:00:00Z";
const base: Crudo = {
  repo: "jjhoncv/vitrina",
  prs: [],
  esperandoAprobacion: [],
  milestones: [],
  issuesAbiertos: [],
  comentarios: [],
  prsRecientes: [],
  ticketsCerradosRecientes: 0,
};

describe("pendientes del dueño (lo que espera una acción suya)", () => {
  it("PR de Claude esperando revisión, marcado ⏰ si lleva más de 24 h", () => {
    const p = pendientesDe({ ...base, prs: [
      { number: 44, title: "feat(#12): filtro de categorías", html_url: "https://github.com/jjhoncv/vitrina/pull/44", user: { login: "claude[bot]" }, draft: false, created_at: "2026-10-12T10:00:00Z", head: { ref: "feat/12-filtro" } },
      { number: 45, title: "feat(#13): x", html_url: "u45", user: { login: "claude[bot]" }, draft: false, created_at: "2026-10-14T10:00:00Z", head: { ref: "feat/13-x" } },
      { number: 46, title: "borrador", html_url: "u46", user: { login: "claude[bot]" }, draft: true, created_at: "2026-10-10T10:00:00Z", head: { ref: "feat/14" } },
    ] }, hoy);
    expect(p).toEqual([
      { tipo: "pr", urgente: true, texto: "PR #44 «filtro de categorías» te espera hace 2 días", accion: "Revisa el preview y aprueba o comenta", url: "https://github.com/jjhoncv/vitrina/pull/44" },
      { tipo: "pr", urgente: false, texto: "PR #45 «x» te espera desde hoy", accion: "Revisa el preview y aprueba o comenta", url: "u45" },
    ]);
  });

  it("release esperando merge y deploy esperando aprobación", () => {
    const p = pendientesDe({ ...base,
      prs: [{ number: 47, title: "chore(main): release 0.5.0", html_url: "u47", user: { login: "jjhoncv" }, draft: false, created_at: "2026-10-14T09:00:00Z", head: { ref: "release-please--branches--main--components--vitrina" } }],
      esperandoAprobacion: [{ html_url: "run1", display_title: "chore(main): release 0.4.0 (#37)" }],
    }, hoy);
    expect(p.map((x) => [x.tipo, x.texto, x.url])).toEqual([
      ["deploy", "Deploy a producción esperando tu aprobación: «chore(main): release 0.4.0 (#37)»", "run1"],
      ["release", "Release «0.5.0» listo para fusionar", "u47"],
    ]);
  });

  it("Claude te preguntó algo: su último comentario en un ticket abierto sin respuesta tuya", () => {
    const p = pendientesDe({ ...base,
      issuesAbiertos: [{ number: 5, title: "Pedir el enlace", html_url: "i5", labels: [], pull_request: undefined }],
      comentarios: [
        { issue_url: "https://api.github.com/repos/jjhoncv/vitrina/issues/5", html_url: "c1", user: { login: "jjhoncv" }, body: "@claude adelante", created_at: "2026-10-13T10:00:00Z" },
        { issue_url: "https://api.github.com/repos/jjhoncv/vitrina/issues/5", html_url: "c2", user: { login: "claude[bot]" }, body: "### Necesito de ti\n\n¿Uso **Gmail** o Resend? Dime A o B.", created_at: "2026-10-13T11:00:00Z" },
      ],
    }, hoy);
    expect(p).toEqual([{ tipo: "pregunta", urgente: false, texto: "Claude te escribió en #5 «Pedir el enlace»: «¿Uso Gmail o Resend? Dime A o B.»", accion: "Respóndele con @claude", url: "c2" }]);
  });

  it("si tú respondiste después, ya no es pendiente; en un PR abierto lo cubre la revisión del PR", () => {
    const p = pendientesDe({ ...base,
      issuesAbiertos: [{ number: 5, title: "x", html_url: "i5", labels: [], pull_request: undefined }, { number: 44, title: "pr", html_url: "u44", labels: [], pull_request: {} }],
      comentarios: [
        { issue_url: ".../issues/5", html_url: "c2", user: { login: "claude[bot]" }, body: "pregunta", created_at: "2026-10-13T11:00:00Z" },
        { issue_url: ".../issues/5", html_url: "c3", user: { login: "jjhoncv" }, body: "respuesta", created_at: "2026-10-13T12:00:00Z" },
        { issue_url: ".../issues/44", html_url: "c4", user: { login: "claude[bot]" }, body: "listo", created_at: "2026-10-13T12:00:00Z" },
      ],
    }, hoy);
    expect(p).toEqual([]);
  });

  it("fase completa sin cerrar y alerta de rollback", () => {
    const p = pendientesDe({ ...base,
      milestones: [{ title: "Fase 2 — Entrar", state: "open", open_issues: 0, closed_issues: 3, html_url: "m2", due_on: null, created_at: "", description: null }],
      issuesAbiertos: [{ number: 50, title: "Rollback de producción v0.5.0", html_url: "i50", labels: [{ name: "alerta" }], pull_request: undefined }],
    }, hoy);
    expect(p.map((x) => [x.tipo, x.urgente, x.texto, x.accion])).toEqual([
      ["alerta", true, "Alerta: «Rollback de producción v0.5.0»", "Revisa qué pasó en producción"],
      ["fase", false, "«Fase 2 — Entrar» está completa (3 de 3)", "Revisa el Parking lot y ciérrala para abrir la siguiente"],
    ]);
  });
});

describe("actividad de Claude en las últimas 24 h", () => {
  it("PRs fusionados y abiertos por Claude, y tickets cerrados", () => {
    const a = actividadDe({ ...base, ticketsCerradosRecientes: 3, prsRecientes: [
      { number: 36, title: "feat(#9): guardar comentario", user: { login: "claude[bot]" }, created_at: "2026-10-13T20:00:00Z", merged_at: "2026-10-14T09:00:00Z", html_url: "u36" },
      { number: 40, title: "feat(#10): x", user: { login: "claude[bot]" }, created_at: "2026-10-14T08:00:00Z", merged_at: null, html_url: "u40" },
      { number: 41, title: "chore: y", user: { login: "jjhoncv" }, created_at: "2026-10-14T08:00:00Z", merged_at: "2026-10-14T09:00:00Z", html_url: "u41" },
      { number: 20, title: "viejo", user: { login: "claude[bot]" }, created_at: "2026-10-01T08:00:00Z", merged_at: "2026-10-02T09:00:00Z", html_url: "u20" },
    ] }, hoy);
    expect(a).toEqual({ fusionados: [{ numero: 36, titulo: "guardar comentario", url: "u36" }], abiertos: [{ numero: 40, titulo: "x", url: "u40" }], ticketsCerrados: 3 });
  });
});
