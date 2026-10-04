import { describe, expect, it } from "vitest";
import { nombreDelProyecto } from "./nombre-proyecto";

describe("nombreDelProyecto", () => {
  it("devuelve el texto del primer título de nivel 1", () => {
    expect(nombreDelProyecto("# Guardián\n\n> intro\n\n## 1. Problema")).toBe("Guardián");
  });

  it("ignora espacios sobrantes y líneas previas", () => {
    expect(nombreDelProyecto("\n<!-- nota -->\n#   Mi App  \n")).toBe("Mi App");
  });

  it("no confunde un título de nivel 2 con el nombre", () => {
    expect(nombreDelProyecto("## Sección\n# Real")).toBe("Real");
  });

  it("falla si no hay título de nivel 1", () => {
    expect(() => nombreDelProyecto("## Sin nombre")).toThrow(/PROYECTO\.md/);
  });
});
