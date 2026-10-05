import { describe, expect, it } from "vitest";
import { calcularAvance, resumenMarkdown } from "./avance";

// Forma mínima del reporte JSON de Playwright.
const spec = (title: string, status: string, tags: string[] = []) => ({ title, tags, tests: [{ status }] });
const reporte = (...specs: ReturnType<typeof spec>[]) => ({
  suites: [{ title: "x", specs: [], suites: [{ title: "y", specs }] }],
});

describe("calcularAvance", () => {
  it("cuenta en verde los escenarios que pasan y en rojo los pendientes", () => {
    const a = calcularAvance(reporte(spec("A", "expected"), spec("B", "skipped")));
    expect(a).toMatchObject({ total: 2, verdes: 1, porcentaje: 50 });
    expect(a.rojos.map((e) => e.titulo)).toEqual(["B"]);
  });

  it("no cuenta los escenarios @plantilla", () => {
    const a = calcularAvance(reporte(spec("Base", "expected", ["plantilla"]), spec("A", "skipped")));
    expect(a).toMatchObject({ total: 1, verdes: 0, porcentaje: 0 });
  });

  it("un escenario que falla es rojo; uno que pasa al reintentar es verde", () => {
    const a = calcularAvance(reporte(spec("A", "unexpected"), spec("B", "flaky")));
    expect(a).toMatchObject({ total: 2, verdes: 1 });
    expect(a.rojos[0]).toEqual({ titulo: "A", estado: "falla" });
  });

  it("sin escenarios de alcance el avance es 0 %", () => {
    expect(calcularAvance(reporte())).toMatchObject({ total: 0, verdes: 0, porcentaje: 0 });
  });
});

describe("resumenMarkdown", () => {
  it("muestra «X de Y escenarios en verde (Z %)» y lista los rojos", () => {
    const md = resumenMarkdown(calcularAvance(reporte(spec("A", "expected"), spec("B", "skipped"))));
    expect(md).toContain("1 de 2 escenarios en verde (50 %)");
    expect(md).toContain("B");
  });
});
