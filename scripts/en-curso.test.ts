import { describe, expect, it } from "vitest";
import { comentarioEnCurso, opcionEnCurso } from "./en-curso";

describe("tarjeta en curso", () => {
  const opciones = [
    { id: "a", name: "Por hacer" },
    { id: "b", name: "En curso" },
    { id: "c", name: "En revisión" },
  ];

  it("encuentra la columna «En curso» sin importar mayúsculas ni tildes", () => {
    expect(opcionEnCurso(opciones)).toBe("b");
    expect(opcionEnCurso([{ id: "x", name: "en  curso " }])).toBe("x");
    expect(opcionEnCurso([{ id: "y", name: "In progress" }])).toBe("y");
  });

  it("sin esa columna no mueve nada", () => {
    expect(opcionEnCurso([{ id: "a", name: "Por hacer" }])).toBeNull();
  });

  it("el comentario dice qué hace Claude y enlaza al run", () => {
    const c = comentarioEnCurso(6, "https://github.com/jjhoncv/info-site/actions/runs/1");
    expect(c).toContain("Claude está trabajando en el ticket #6");
    expect(c).toContain("https://github.com/jjhoncv/info-site/actions/runs/1");
  });
});
