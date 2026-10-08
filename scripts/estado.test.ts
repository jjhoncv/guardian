import { describe, expect, it } from "vitest";
import { avanceDeProyecto, badges, faseActual, leerAvance, mainEnRojoDesde, type Estado } from "./estado";

describe("faseActual", () => {
  it("es el milestone «Fase N» abierto de número más bajo, con su fecha objetivo", () => {
    const ms = [
      { title: "Fase 3 — Comentarios", due_on: null },
      { title: "Fase 2 — Entrar", due_on: "2026-11-02T12:00:00Z" },
      { title: "Otro", due_on: null },
    ];
    expect(faseActual(ms)).toEqual({ titulo: "Fase 2 — Entrar", vence: "2026-11-02T12:00:00Z" });
  });

  it("sin fases abiertas no hay fase actual", () => {
    expect(faseActual([{ title: "Otro", due_on: null }])).toBeNull();
  });
});

describe("mainEnRojoDesde", () => {
  const run = (conclusion: string, created_at: string) => ({ conclusion, created_at, status: "completed" });

  it("con el último CI en verde, main no está en rojo", () => {
    expect(mainEnRojoDesde([run("success", "2026-10-20T10:00:00Z"), run("failure", "2026-10-19T10:00:00Z")])).toBeNull();
  });

  it("desde el primer fallo de la racha actual", () => {
    const runs = [run("failure", "2026-10-20T10:00:00Z"), run("failure", "2026-10-19T10:00:00Z"), run("success", "2026-10-18T10:00:00Z")];
    expect(mainEnRojoDesde(runs)).toBe("2026-10-19T10:00:00Z");
  });

  it("ignora los runs en curso y los cancelados", () => {
    const runs = [{ conclusion: null, created_at: "2026-10-21T10:00:00Z", status: "in_progress" }, run("cancelled", "2026-10-20T11:00:00Z"), run("failure", "2026-10-20T10:00:00Z")];
    expect(mainEnRojoDesde(runs)).toBe("2026-10-20T10:00:00Z");
  });
});

describe("leerAvance", () => {
  it("solo acepta números válidos (el archivo viene de un job que corre el código del proyecto)", () => {
    expect(leerAvance('{"verdes":12,"total":15,"porcentaje":80}')).toEqual({ verdes: 12, total: 15, porcentaje: 80 });
    expect(leerAvance('{"verdes":"<script>","total":15,"porcentaje":80}')).toBeNull();
    expect(leerAvance("no es json")).toBeNull();
  });
});

describe("badges (shields.io endpoint)", () => {
  const estado: Estado = {
    proyecto: "vitrina",
    fase: { titulo: "Fase 3 — Comentarios", vence: null },
    avance: { verdes: 12, total: 15, porcentaje: 80 },
    salud: { color: "amarillo", emoji: "🟡", motivos: ["x"], diasAtraso: 2, pausa: false },
    actualizado: "2026-10-20T12:00:00Z",
  };

  it("fase, avance y salud", () => {
    const b = badges(estado);
    expect(b.fase).toEqual({ schemaVersion: 1, label: "fase", message: "3 — Comentarios", color: "blue" });
    expect(b.avance).toEqual({ schemaVersion: 1, label: "avance", message: "12 de 15 · 80 %", color: "blue" });
    expect(b.salud).toEqual({ schemaVersion: 1, label: "salud", message: "🟡 amarillo", color: "yellow" });
  });

  it("sin datos dice «sin fase» y «sin datos»; la pausa se nota", () => {
    const b = badges({ ...estado, fase: null, avance: null, salud: { ...estado.salud, pausa: true } });
    expect(b.fase.message).toBe("sin fase abierta");
    expect(b.avance.message).toBe("sin datos");
    expect(b.salud.message).toBe("⏸️ en pausa");
  });
});

describe("avanceDeProyecto (respaldo cuando el CI no tiene escenarios, ADR 0020)", () => {
  it("lee «N de M escenarios en verde (P %)» de PROYECTO.md", () => {
    expect(avanceDeProyecto("texto\n\n**4 de 6 escenarios en verde (67 %).**\n")).toEqual({ verdes: 4, total: 6, porcentaje: 67 });
  });

  it("sin esa línea no hay avance", () => {
    expect(avanceDeProyecto("# X\n\nnada")).toBeNull();
  });

  it("el badge de un avance sin escenarios dice «sin escenarios»", () => {
    const e = { proyecto: "x", fase: null, avance: { verdes: 0, total: 0, porcentaje: 0 }, salud: { color: "verde" as const, emoji: "🟢", motivos: [], diasAtraso: 0, pausa: false }, actualizado: "" };
    expect(badges(e).avance.message).toBe("sin escenarios");
  });
});
