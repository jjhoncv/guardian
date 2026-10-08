import { describe, expect, it } from "vitest";
import { svgCurva } from "./grafico";
import type { Curva } from "./hoja";

const curva: Curva = { titulo: "vitrina", inicio: "2026-10-06", plan: [[0, 0], [50, 14], [100, 28]], real: [[0, 0], [25, 1], [75, 2], [100, 3]], desvio: -25 };

describe("gráfico de la curva para Telegram (SVG propio, sin servicios externos)", () => {
  it("dice el proyecto y el desvío en el título, y los ejes", () => {
    const svg = svgCurva(curva);
    // El desvío va en su propio color (verde adelantado, rojo atrasado) dentro del título.
    expect(svg).toMatch(/vitrina: <tspan fill="#34a853">25 días adelantado<\/tspan> vs\. el plan original/);
    expect(svg).toContain("avance del proyecto (% de tickets hechos)");
    expect(svg).toContain("día del proyecto");
  });

  it("dibuja el plan original (gris punteado) y lo real (verde), con el punto de hoy marcado", () => {
    const svg = svgCurva(curva);
    expect(svg).toMatch(/<polyline[^>]*stroke="#9aa0a6"[^>]*stroke-dasharray/);
    expect(svg).toMatch(/<polyline[^>]*stroke="#34a853"/);
    expect(svg).toContain("hoy: día 3 · 100 %");
  });

  it("escapa el nombre del proyecto", () => {
    expect(svgCurva({ ...curva, titulo: "a<b>&c" })).toContain("a&lt;b&gt;&amp;c");
  });

  it("es un SVG válido de tamaño fijo para el celular", () => {
    expect(svgCurva(curva)).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="800" height="600"/);
  });
});
