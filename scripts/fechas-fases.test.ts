import { describe, expect, it } from "vitest";
import { fechasObjetivo, semanasDisponibles } from "./fechas-fases";

const proyecto = (limites: string) => `# X\n\n## 5. Cómo sé que funcionó\n\nEn 3 semanas, 5 personas.\n\n## 6. Límites\n\n${limites}\n\n## 7. Fases\n\nFase 1 dura 9 semanas.`;

describe("semanasDisponibles", () => {
  it("lee «**Tiempo:** N semanas» de la sección Límites", () => {
    expect(semanasDisponibles(proyecto("- **Tiempo:** 6 semanas en total, unas 2 por fase."))).toBe(6);
  });

  it("lee «**Semanas:** N»", () => {
    expect(semanasDisponibles(proyecto("- **Semanas:** 4\n- **Tipo:** producto"))).toBe(4);
  });

  it("no toma semanas de otras secciones", () => {
    expect(semanasDisponibles(proyecto("- **Tipo:** prueba"))).toBeNull();
  });

  it("sin sección Límites no hay semanas", () => {
    expect(semanasDisponibles("# X\n\n## 1. Problema\n\nAlgo en 3 semanas.")).toBeNull();
  });
});

describe("fechasObjetivo", () => {
  const inicio = new Date("2026-10-05T15:00:00Z");

  it("reparte las semanas entre las fases y la última vence al final", () => {
    expect(fechasObjetivo(3, 6, inicio)).toEqual(["2026-10-19T12:00:00Z", "2026-11-02T12:00:00Z", "2026-11-16T12:00:00Z"]);
  });

  it("si no divide exacto, redondea al día", () => {
    expect(fechasObjetivo(2, 3, inicio)).toEqual(["2026-10-16T12:00:00Z", "2026-10-26T12:00:00Z"]);
  });
});
