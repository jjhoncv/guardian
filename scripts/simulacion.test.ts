import { expect, it } from "vitest";
import { filasSimulacion, simular } from "./simulacion";

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
