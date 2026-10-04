// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Page from "./page";

// E1 — Proyecto nuevo en producción el día 1: la página muestra el nombre del PROYECTO.md.
it("muestra el nombre del proyecto como título principal", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Guardián");
});
