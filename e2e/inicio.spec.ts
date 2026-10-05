import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// E1 — la página publicada muestra el nombre del PROYECTO.md, sea cual sea.
const nombre = readFileSync("PROYECTO.md", "utf8").match(/^#[ \t]+(.+?)[ \t]*$/m)?.[1] ?? "";

test("la página de inicio muestra el nombre del proyecto @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(nombre);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombre);
});
