import { expect, it } from "vitest";
import { filasSimulacion, serieSimulacion, simular } from "./simulacion";

it("el proyecto-x pasa por todos los colores en el orden esperado", () => {
  const colores = simular().map((m) => m.datos.estado!.salud.color);
  expect(colores).toEqual(["verde", "amarillo", "amarillo", "rojo", "rojo", "gris", "gris", "verde", "verde", "amarillo"]);
});

it("al retomar con fechas nuevas la salud vuelve a verde, pero el Foco avisa que el plazo corre más que el trabajo", () => {
  const filas = filasSimulacion(simular());
  expect(filas[8][2]).toBe("🟢 verde");
  expect(filas[8][7]).toMatch(/^🟡 «Fase 1 — Lista»: el plazo va más rápido que el trabajo/);
});

it("en las semanas grises lo primero es decidir pausa o cierre, y el atraso se sigue viendo", () => {
  const fila = filasSimulacion(simular())[7];
  expect(fila[7]).toMatch(/^⚫ 29 días sin actividad/);
  expect(Number(fila[3])).toBeGreaterThan(20);
});

it("serie numérica para el gráfico: avance real de la fase, tiempo del plan, avance del proyecto y días de atraso", () => {
  const serie = serieSimulacion(simular());
  expect(serie[0]).toEqual(["momento", "avance real de la fase (%)", "tiempo del plan (%)", "avance del proyecto (%)", "días de atraso"]);
  expect(serie[1]).toEqual(["🟢 4 nov · arranca", 25, 30, 0, 0]);
  expect(serie[7]).toEqual(["⚫ 14 dic · 1 mes parado", 50, 100, 18, 35]);
  expect(serie).toHaveLength(11);
});
