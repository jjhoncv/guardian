import { describe, expect, it } from "vitest";
import { nombreBasePreview, sentencias } from "./base-preview";

describe("nombreBasePreview", () => {
  it("es <repo>_pr_<N>, con guiones como guiones bajos y en minúsculas", () => {
    expect(nombreBasePreview("jjhoncv/info-site", 61)).toBe("info_site_pr_61");
    expect(nombreBasePreview("Dueño/Mi-Tienda.Online", "7")).toBe("mi_tienda_online_pr_7");
  });

  it("rechaza un número de PR que no es un entero positivo (el nombre va en el SQL)", () => {
    expect(() => nombreBasePreview("jjhoncv/info-site", "61; DROP DATABASE x")).toThrow(/número de PR/);
    expect(() => nombreBasePreview("jjhoncv/info-site", 0)).toThrow(/número de PR/);
  });

  it("no pasa del máximo de MySQL para un nombre de base (64)", () => {
    const largo = "a".repeat(80);
    expect(nombreBasePreview(`x/${largo}`, 12345).length).toBeLessThanOrEqual(64);
    expect(nombreBasePreview(`x/${largo}`, 12345)).toMatch(/_pr_12345$/);
  });
});

describe("sentencias", () => {
  it("crear: borra la base anterior del PR y la crea vacía (cada deploy migra desde cero)", () => {
    expect(sentencias("crear", "info_site_pr_61")).toEqual(["DROP DATABASE IF EXISTS `info_site_pr_61`", "CREATE DATABASE `info_site_pr_61`"]);
  });

  it("borrar: solo la borra", () => {
    expect(sentencias("borrar", "info_site_pr_61")).toEqual(["DROP DATABASE IF EXISTS `info_site_pr_61`"]);
  });

  it("nunca toca una base que no sea de un PR", () => {
    expect(() => sentencias("borrar", "info_site")).toThrow(/no es una base de preview/);
  });
});
