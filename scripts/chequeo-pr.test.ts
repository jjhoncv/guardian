import { describe, expect, it } from "vitest";
import { evaluar, exento, lineasCambiadas, tieneEscenario, ticketsDelCuerpo } from "./chequeo-pr";

describe("ticketsDelCuerpo", () => {
  it("encuentra los tickets de Closes / Fixes / Resolves", () => {
    expect(ticketsDelCuerpo("## Ticket\n\nCloses #12\nfixes #3 y resolves #40")).toEqual([12, 3, 40]);
  });
  it("ignora menciones sueltas", () => {
    expect(ticketsDelCuerpo("Relacionado con #12")).toEqual([]);
  });
});

describe("exento", () => {
  it("exime release-please, Dependabot y PRs de documentación", () => {
    expect(exento({ titulo: "chore(main): release 1.0.0", autor: "jjhoncv", rama: "release-please--branches--main" })).toBeTruthy();
    expect(exento({ titulo: "chore(deps): bump x", autor: "dependabot[bot]", rama: "dependabot/npm/x" })).toBeTruthy();
    expect(exento({ titulo: "docs(#24): parking lot", autor: "jjhoncv", rama: "docs/24-x" })).toBeTruthy();
  });
  it("no exime código", () => {
    expect(exento({ titulo: "feat(#12): login", autor: "jjhoncv", rama: "feat/12-login" })).toBeNull();
  });
});

describe("tieneEscenario", () => {
  it("acepta el formulario de tarea y la línea **Escenario:**", () => {
    expect(tieneEscenario("### Escenario BDD\n\n```gherkin\nEscenario: Agregar\n  Dado x\n```")).toBe(true);
    expect(tieneEscenario("**Escenario:** E1 — Proyecto nuevo")).toBe(true);
  });
  it("rechaza un ticket sin escenario o con la sección vacía", () => {
    expect(tieneEscenario("Hacer el login")).toBe(false);
    expect(tieneEscenario("### Escenario BDD\n\n_No response_\n\n### Qué se hace\nalgo")).toBe(false);
  });
});

describe("lineasCambiadas", () => {
  it("suma agregadas + borradas sin contar el lockfile", () => {
    const archivos = [
      { filename: "app/page.tsx", additions: 10, deletions: 5 },
      { filename: "package-lock.json", additions: 900, deletions: 100 },
    ];
    expect(lineasCambiadas(archivos)).toBe(15);
  });
});

describe("evaluar", () => {
  const pr = { titulo: "feat(#12): login", autor: "jjhoncv", rama: "feat/12-login", cuerpo: "Closes #12" };
  it("bloquea un PR sin ticket", () => {
    expect(evaluar({ ...pr, cuerpo: "sin ticket" }, {}, 10).errores[0]).toMatch(/ticket/);
  });
  it("bloquea si el ticket no tiene escenario", () => {
    expect(evaluar(pr, { 12: "Hacer el login" }, 10).errores[0]).toMatch(/#12.*escenario/);
  });
  it("pasa con ticket y escenario, y solo avisa si es grande", () => {
    const r = evaluar(pr, { 12: "**Escenario:** E3" }, 450);
    expect(r.errores).toEqual([]);
    expect(r.avisos[0]).toMatch(/450 líneas/);
  });
  it("un PR exento pasa siempre", () => {
    expect(evaluar({ ...pr, autor: "dependabot[bot]", cuerpo: "" }, {}, 5000).errores).toEqual([]);
  });
});
