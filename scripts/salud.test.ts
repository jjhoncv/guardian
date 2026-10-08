import { describe, expect, it } from "vitest";
import { calcularSalud, type EstadoSalud } from "./salud";

const hoy = "2026-10-20T12:00:00Z";
const sano: EstadoSalud = {
  hoy,
  fase: { titulo: "Fase 2 — Entrar", vence: "2026-10-25T12:00:00Z" },
  prsEsperando: [],
  mainEnRojoDesde: null,
  ultimaActividad: "2026-10-20T09:00:00Z",
  pausa: false,
};

describe("calcularSalud (sección 11 de PROYECTO.md)", () => {
  it("verde: fase al día, sin PRs esperando y main en verde", () => {
    expect(calcularSalud(sano)).toMatchObject({ color: "verde", motivos: [] });
  });

  it("amarillo: 1 a 3 días de atraso de la fase", () => {
    const s = calcularSalud({ ...sano, fase: { titulo: "Fase 2 — Entrar", vence: "2026-10-18T12:00:00Z" } });
    expect(s).toMatchObject({ color: "amarillo", diasAtraso: 2 });
    expect(s.motivos).toContain("«Fase 2 — Entrar» lleva 2 días de atraso");
  });

  it("amarillo: un PR espera tu revisión más de 24 h", () => {
    const s = calcularSalud({ ...sano, prsEsperando: [{ numero: 14, desde: "2026-10-19T08:00:00Z" }] });
    expect(s.color).toBe("amarillo");
    expect(s.motivos).toContain("El PR #14 espera tu revisión hace más de 24 h");
  });

  it("un PR que espera menos de 24 h no cambia el color", () => {
    expect(calcularSalud({ ...sano, prsEsperando: [{ numero: 14, desde: "2026-10-20T08:00:00Z" }] }).color).toBe("verde");
  });

  it("rojo: más de 3 días de atraso", () => {
    expect(calcularSalud({ ...sano, fase: { titulo: "Fase 2 — Entrar", vence: "2026-10-15T12:00:00Z" } })).toMatchObject({ color: "rojo", diasAtraso: 5 });
  });

  it("rojo: main en rojo más de 24 h", () => {
    const s = calcularSalud({ ...sano, mainEnRojoDesde: "2026-10-19T06:00:00Z" });
    expect(s.color).toBe("rojo");
    expect(s.motivos).toContain("`main` está en rojo hace más de 24 h");
  });

  it("gris: 14 días sin actividad (propone pausa o cierre consciente), aunque haya atraso", () => {
    const s = calcularSalud({ ...sano, ultimaActividad: "2026-10-06T12:00:00Z", fase: { titulo: "F", vence: "2026-10-01T12:00:00Z" } });
    expect(s.color).toBe("gris");
    expect(s.motivos[0]).toMatch(/14 días sin actividad: ¿pausa o cierre consciente\?/);
  });

  it("modo pausa: la barra se congela en el color anterior y no cae", () => {
    const s = calcularSalud({ ...sano, pausa: true, colorAnterior: "amarillo", mainEnRojoDesde: "2026-10-10T00:00:00Z" });
    expect(s).toMatchObject({ color: "amarillo", pausa: true, motivos: ["En pausa: la barra está congelada"] });
  });

  it("sin fase con fecha objetivo no hay atraso que medir", () => {
    expect(calcularSalud({ ...sano, fase: { titulo: "Fase 1", vence: null } })).toMatchObject({ color: "verde", diasAtraso: 0 });
    expect(calcularSalud({ ...sano, fase: null }).color).toBe("verde");
  });

  it("el emoji acompaña al color", () => {
    expect(calcularSalud(sano).emoji).toBe("🟢");
    expect(calcularSalud({ ...sano, mainEnRojoDesde: "2026-10-18T00:00:00Z" }).emoji).toBe("🔴");
  });
});
