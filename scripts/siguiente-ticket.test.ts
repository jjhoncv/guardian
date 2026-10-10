import { describe, expect, it } from "vitest";
import { elegirSiguiente, type Estado } from "./siguiente-ticket";

const base: Estado = {
  milestones: [
    { numero: 1, titulo: "Fase 1 — Catálogo", abiertos: 2 },
    { numero: 2, titulo: "Fase 2 — Entrar", abiertos: 3 },
  ],
  issues: [
    { numero: 3, milestone: 1 },
    { numero: 2, milestone: 1 },
    { numero: 5, milestone: 2 },
  ],
  prsDeClaude: [],
  limite: 2,
};

describe("elegirSiguiente", () => {
  it("toma el ticket de número más bajo de la fase actual (primera fase con abiertos)", () => {
    expect(elegirSiguiente(base)).toEqual({ ticket: 2 });
  });

  it("salta los tickets que ya tienen un PR de Claude abierto", () => {
    const e = { ...base, prsDeClaude: [{ cierra: [2] }] };
    expect(elegirSiguiente(e)).toEqual({ ticket: 3 });
  });

  it("no toma nada si ya hay 2 PRs de Claude esperando revisión", () => {
    const e = { ...base, prsDeClaude: [{ cierra: [2] }, { cierra: [9] }] };
    expect(elegirSiguiente(e)).toEqual({ motivo: "Hay 2 PRs de Claude esperando revisión (límite 2)." });
  });

  it("no salta a la fase siguiente mientras la actual tenga tickets abiertos", () => {
    const e = { ...base, prsDeClaude: [{ cierra: [2, 3] }] };
    expect(elegirSiguiente(e)).toEqual({ motivo: "Los tickets abiertos de «Fase 1 — Catálogo» ya tienen PR; falta tu revisión." });
  });

  it("no abre la fase siguiente sola: si la actual está completa, pide cerrarla", () => {
    const e = { ...base, milestones: [{ ...base.milestones[0], abiertos: 0 }, base.milestones[1]], issues: [{ numero: 5, milestone: 2 }] };
    expect(elegirSiguiente(e)).toEqual({
      motivo: "«Fase 1 — Catálogo» está completa: actualiza la fase en CLAUDE.md y cierra el milestone; al cerrarlo, Claude toma solo el primer ticket de la siguiente.",
    });
  });

  it("no hay nada que hacer si no quedan tickets abiertos", () => {
    expect(elegirSiguiente({ ...base, milestones: [], issues: [] })).toEqual({ motivo: "No quedan tickets abiertos en ninguna fase." });
  });
});
