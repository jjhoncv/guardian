import { describe, expect, it } from "vitest";
import { checksum, planificar } from "./migraciones";

const archivo = (nombre: string, contenido = `-- ${nombre}`) => ({ nombre, contenido });
const aplicada = (nombre: string, contenido = `-- ${nombre}`) => ({ nombre, checksum: checksum(contenido) });

describe("planificar", () => {
  it("en una base vacía aplica todas, en orden por número", () => {
    const plan = planificar([archivo("002-services.sql"), archivo("001-auth.sql")], []);
    expect(plan.pendientes.map((m) => m.nombre)).toEqual(["001-auth.sql", "002-services.sql"]);
    expect(plan.errores).toEqual([]);
  });

  it("salta las que ya se aplicaron", () => {
    const plan = planificar([archivo("001-auth.sql"), archivo("002-services.sql")], [aplicada("001-auth.sql")]);
    expect(plan.pendientes.map((m) => m.nombre)).toEqual(["002-services.sql"]);
  });

  it("no hace nada si todo está aplicado", () => {
    const plan = planificar([archivo("001-auth.sql")], [aplicada("001-auth.sql")]);
    expect(plan).toEqual({ pendientes: [], errores: [] });
  });

  it("falla si una migración ya aplicada cambió", () => {
    const plan = planificar([archivo("001-auth.sql", "CREATE TABLE users (id INT);")], [aplicada("001-auth.sql")]);
    expect(plan.errores).toEqual(["001-auth.sql ya se aplicó y su contenido cambió: no la edites, crea una migración nueva"]);
    expect(plan.pendientes).toEqual([]);
  });

  it("falla si una nueva tiene un número menor que la última aplicada", () => {
    const plan = planificar([archivo("001-auth.sql"), archivo("002-banners.sql"), archivo("003-services.sql")], [aplicada("001-auth.sql"), aplicada("003-services.sql")]);
    expect(plan.errores).toEqual(["002-banners.sql está fuera de orden: la última aplicada es 003-services.sql; usa un número mayor"]);
  });

  it("falla con un nombre que no sigue NNN-nombre.sql", () => {
    const plan = planificar([archivo("crear-usuarios.sql"), archivo("01-x.sql")], []);
    expect(plan.errores).toEqual([
      "crear-usuarios.sql no sigue el formato NNN-nombre.sql (p. ej. 001-crear-usuarios.sql)",
      "01-x.sql no sigue el formato NNN-nombre.sql (p. ej. 001-crear-usuarios.sql)",
    ]);
  });

  it("falla si dos migraciones repiten número", () => {
    const plan = planificar([archivo("002-banners.sql"), archivo("002-services.sql")], []);
    expect(plan.errores).toEqual(["002-banners.sql y 002-services.sql repiten el número 002"]);
  });

  it("ignora lo que no es .sql", () => {
    const plan = planificar([archivo("README.md"), archivo("001-auth.sql")], []);
    expect(plan.pendientes.map((m) => m.nombre)).toEqual(["001-auth.sql"]);
    expect(plan.errores).toEqual([]);
  });
});

describe("checksum", () => {
  it("es el mismo para el mismo contenido aunque cambien los fines de línea", () => {
    expect(checksum("SELECT 1;\r\n")).toBe(checksum("SELECT 1;\n"));
  });

  it("cambia si cambia el contenido", () => {
    expect(checksum("SELECT 1;")).not.toBe(checksum("SELECT 2;"));
  });
});
