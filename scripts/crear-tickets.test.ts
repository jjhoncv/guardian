import { describe, expect, it } from "vitest";
import { cuerpoTicket, marca, pendientes, tituloMilestone, validarPlan, fechasPorFase, type Plan } from "./crear-tickets";

const plan: Plan = {
  fases: [{ numero: 1, nombre: "Lista básica", entregable: "Agregar y marcar libros" }],
  tareas: [
    {
      id: "T1",
      fase: 1,
      titulo: "Agregar un libro pendiente",
      escenarios: [{ archivo: "features/fase-1-lista.feature", gherkin: 'Escenario: Agregar\n  Dado x\n  Cuando y\n  Entonces z' }],
      que: "Formulario para agregar título y autor.",
      hecho: "El escenario «Agregar» en verde.",
    },
  ],
};

describe("validarPlan", () => {
  it("acepta un plan correcto", () => {
    expect(validarPlan(plan)).toEqual([]);
  });
  it("rechaza más de 5 fases, tareas sin escenario, fases inexistentes e ids repetidos", () => {
    const malo: Plan = {
      fases: [1, 2, 3, 4, 5, 6].map((n) => ({ numero: n, nombre: `F${n}`, entregable: "x" })),
      tareas: [
        { ...plan.tareas[0], escenarios: [] },
        { ...plan.tareas[0], fase: 9 },
      ],
    };
    const errores = validarPlan(malo).join("\n");
    expect(errores).toMatch(/máximo 5 fases/);
    expect(errores).toMatch(/T1.*sin escenario/);
    expect(errores).toMatch(/T1.*fase 9/);
    expect(errores).toMatch(/T1.*repetido/);
  });
});

describe("cuerpoTicket", () => {
  it("tiene el formato del formulario de tarea y la marca de la tarea", () => {
    const cuerpo = cuerpoTicket(plan.tareas[0], plan.fases[0]);
    expect(cuerpo).toContain("### Fase\nFase 1 — Lista básica");
    expect(cuerpo).toContain("### Escenario BDD\n```gherkin\nEscenario: Agregar");
    expect(cuerpo).toContain("`features/fase-1-lista.feature`");
    expect(cuerpo).toContain("### Criterio de hecho\nEl escenario «Agregar» en verde.");
    expect(cuerpo).toContain(marca("T1"));
  });
});

describe("pendientes", () => {
  it("solo devuelve las tareas que no tienen issue todavía", () => {
    const otra = { ...plan.tareas[0], id: "T2" };
    const existentes = [`algo\n${marca("T1")}`, "issue sin marca"];
    expect(pendientes([plan.tareas[0], otra], existentes).map((t) => t.id)).toEqual(["T2"]);
  });
});

describe("tituloMilestone", () => {
  it("cada fase es un milestone «Fase N — nombre»", () => {
    expect(tituloMilestone(plan.fases[0])).toBe("Fase 1 — Lista básica");
  });
});

describe("fechasPorFase", () => {
  const fases = [
    { numero: 2, nombre: "Entrar", entregable: "" },
    { numero: 1, nombre: "Catálogo", entregable: "" },
  ];
  const inicio = new Date("2026-10-05T00:00:00Z");

  it("da una fecha objetivo a cada fase, en orden, desde las semanas de Límites", () => {
    const f = fechasPorFase(fases, "## 6. Límites\n\n- **Semanas:** 4\n", inicio);
    expect(f.get(1)).toBe("2026-10-19T12:00:00Z");
    expect(f.get(2)).toBe("2026-11-02T12:00:00Z");
  });

  it("sin semanas en Límites (o sin PROYECTO.md) no pone fechas", () => {
    expect(fechasPorFase(fases, "## 6. Límites\n\n- **Tipo:** prueba\n", inicio).size).toBe(0);
    expect(fechasPorFase(fases, null, inicio).size).toBe(0);
  });
});
