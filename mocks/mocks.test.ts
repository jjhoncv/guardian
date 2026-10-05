import Ajv from "ajv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import contrato from "./contratos/ejemplo.schema.json";
import fixture from "./fixtures/ejemplo.json";
import { servidor } from "./servidor";

const valida = new Ajv().compile(contrato);

describe("mocks", () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: "error" }));
  afterAll(() => servidor.close());

  it("el fixture cumple el contrato", () => {
    expect(valida(fixture), JSON.stringify(valida.errors)).toBe(true);
  });

  it("MSW responde la API simulada con el fixture, y la respuesta cumple el contrato", async () => {
    const respuesta = await fetch("http://localhost/api/ejemplo");
    const datos = await respuesta.json();
    expect(datos).toEqual(fixture);
    expect(valida(datos)).toBe(true);
  });
});
