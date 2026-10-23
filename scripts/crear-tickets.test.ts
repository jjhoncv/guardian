import { describe, expect, it } from "vitest";
import { cuerpoTicket, cuerposAActualizar, marca, pendientes, tituloMilestone, validarPlan, descripcion, fechasPorFase, type Plan } from "./crear-tickets";

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
    expect(cuerpo).toContain("### Escenarios BDD\n```gherkin\nEscenario: Agregar");
    expect(cuerpo).toContain("`features/fase-1-lista.feature`");
    expect(cuerpo).toContain("### Criterio de hecho\nEl escenario «Agregar» en verde.");
    expect(cuerpo).toContain(marca("T1"));
  });

  it("un plan viejo (sin las secciones nuevas) no muestra secciones vacías", () => {
    const cuerpo = cuerpoTicket(plan.tareas[0], plan.fases[0]);
    expect(cuerpo).not.toMatch(/### (Historia|Depende de|Reglas|Diseño|Datos|Pruebas esperadas|Fuera de alcance)/);
  });

  it("un ticket completo trae historia, dependencias con su número, reglas, diseño, datos, pruebas y lo que queda fuera", () => {
    const completa = {
      ...plan.tareas[0],
      id: "T3",
      historia: "Como lector, quiero agregar un libro, para no olvidarlo.",
      depende: ["T1", "T2"],
      reglas: ["El título es obligatorio.", "No se repiten títulos."],
      diseno: "Igual a la maqueta `docs/maquetas/lista.html` (#agregar).",
      datos: "Tabla `books` (migración nueva).",
      pruebas: "Unitarias del modelo; los escenarios en BDD y E2E.",
      fuera: "Importar desde Goodreads.",
      escenarios: [
        { archivo: "features/fase-1-lista.feature", gherkin: "Escenario: Agregar\n  Dado x" },
        { archivo: "features/fase-1-lista.feature", gherkin: "Escenario: Título vacío\n  Dado y" },
      ],
    };
    const titulos = new Map([["T1", "Agregar un libro pendiente"], ["T2", "Marcar como leído"]]);
    const cuerpo = cuerpoTicket(completa, plan.fases[0], new Map([["T1", 4]]), titulos);
    expect(cuerpo).toContain("### Historia\nComo lector, quiero agregar un libro, para no olvidarlo.");
    expect(cuerpo).toContain("### Depende de\n- #4 — Agregar un libro pendiente\n- T2 — Marcar como leído (todavía sin ticket)");
    expect(cuerpo).toContain("### Escenarios BDD\n```gherkin\nEscenario: Agregar");
    expect(cuerpo).toContain("Escenario: Título vacío");
    expect(cuerpo).toContain("### Reglas\n- El título es obligatorio.\n- No se repiten títulos.");
    expect(cuerpo).toContain("### Diseño\nIgual a la maqueta");
    expect(cuerpo).toContain("### Datos\nTabla `books`");
    expect(cuerpo).toContain("### Pruebas esperadas\nUnitarias");
    expect(cuerpo).toContain("### Fuera de alcance\nImportar desde Goodreads.");
    // El orden importa: primero el para qué, luego el qué, al final lo que queda fuera y el criterio de hecho.
    const orden = ["### Historia", "### Depende de", "### Escenarios BDD", "### Qué se hace", "### Reglas", "### Diseño", "### Datos", "### Pruebas esperadas", "### Fuera de alcance", "### Criterio de hecho"];
    expect(orden.map((h) => cuerpo.indexOf(h))).toEqual(orden.map((h) => cuerpo.indexOf(h)).sort((a, b) => a - b));
  });
});

describe("dependencias en el plan", () => {
  it("rechaza dependencias que no existen o que apuntan a la misma tarea, y más de 6 escenarios", () => {
    const malo: Plan = {
      fases: plan.fases,
      tareas: [{ ...plan.tareas[0], depende: ["T1", "T9"], escenarios: Array(7).fill(plan.tareas[0].escenarios[0]) }],
    };
    const errores = validarPlan(malo).join("\n");
    expect(errores).toMatch(/T1.*depende de sí misma/);
    expect(errores).toMatch(/T1.*T9.*no existe/);
    expect(errores).toMatch(/T1.*7 escenarios.*máximo 6/);
  });
});

describe("cuerposAActualizar", () => {
  it("actualiza solo los tickets abiertos cuyo cuerpo cambió con el plan", () => {
    const actual = cuerpoTicket(plan.tareas[0], plan.fases[0]);
    const issues = [
      { number: 1, state: "open", body: actual },
      { number: 2, state: "open", body: `viejo\n${marca("T2")}` },
      { number: 3, state: "closed", body: `viejo\n${marca("T3")}` },
    ];
    const nuevos = new Map([["T1", actual], ["T2", `nuevo\n${marca("T2")}`], ["T3", `nuevo\n${marca("T3")}`]]);
    expect(cuerposAActualizar(issues, nuevos)).toEqual([{ number: 2, body: `nuevo\n${marca("T2")}` }]);
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

it("la descripción de la fase guarda su fecha original (la línea fija del plan)", () => {
  expect(descripcion({ numero: 1, nombre: "A", entregable: "lista" }, "2026-11-09T12:00:00Z")).toBe("Entregable: lista\nFecha original: 2026-11-09");
  expect(descripcion({ numero: 1, nombre: "A", entregable: "lista" })).toBe("Entregable: lista");
});
