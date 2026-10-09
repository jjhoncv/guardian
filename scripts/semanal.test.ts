import { describe, expect, it } from "vitest";
import { ideasNuevas, tendencia } from "./semanal";

const proyecto = `# X

## 15. Fuera del alcance (Parking lot inicial)

- Gamificación: puntos, rachas
- **Pronóstico y «qué pasa si»:** con la velocidad real… — 2026-10-08 — el dueño preguntó
- Un solo workflow **Pipeline** en Actions (calidad ∥ chequeo) — 2026-10-07 — candidato
- Fecha objetivo en cada milestone de fase, calculada desde los **Límites** del \`PROYECTO.md\` — 2026-10-09 — atraso
- **Layout base en el esqueleto** (cabecera…) — 2026-10-02 — viejo
- ~~Aviso al instante~~ (hecho en la Fase 5) — 2026-10-08 — ya hecho
- Base de datos real (2026-10-06): primero hay que validar la prueba.

## 16. Decisiones tomadas

- **Otra cosa** — 2026-10-08 — no es del Parking lot
`;

describe("revisión semanal", () => {
  it("ideas del Parking lot de los últimos 7 días, más recientes primero, con el título desde el comienzo de la línea", () => {
    expect(ideasNuevas(proyecto, "2026-10-10T13:00:00Z")).toEqual([
      "Fecha objetivo en cada milestone de fase, calculada desde los Límites del PROYECTO.md",
      "Pronóstico y «qué pasa si»",
      "Un solo workflow Pipeline en Actions",
      "Base de datos real",
    ]);
  });

  it("tendencia del desvío respecto de hace una semana", () => {
    // desvío > 0 = atrasado: subir es empeorar.
    expect(tendencia(3, 1)).toBe("⚠️ 2 días peor que hace una semana");
    expect(tendencia(-1, 1)).toBe("✅ 2 días mejor que hace una semana");
    expect(tendencia(2, 2)).toBe("igual que hace una semana");
    expect(tendencia(2, undefined)).toBe("");
  });
});
