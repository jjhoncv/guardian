import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, Then } = createBdd();

const nombre = readFileSync("PROYECTO.md", "utf8").match(/^#[ \t]+(.+?)[ \t]*$/m)?.[1] ?? "";

Given("que abro la página de inicio", async ({ page }) => {
  await page.goto("/");
});

Then("veo el nombre del proyecto como título", async ({ page }) => {
  await expect(page).toHaveTitle(nombre);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nombre);
});
