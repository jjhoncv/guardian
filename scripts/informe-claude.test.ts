import { describe, expect, it } from "vitest";
import { informe } from "./informe-claude";

const resultado = (extra: Record<string, unknown> = {}) => ({
  type: "result",
  subtype: "success",
  is_error: false,
  num_turns: 11,
  total_cost_usd: 0.2,
  permission_denials: [],
  ...extra,
});

describe("informe de Claude en el ticket", () => {
  it("no dice nada si Claude abrió el PR y no hubo error", () => {
    expect(informe([resultado()], 4, true)).toBeNull();
  });

  it("si no abrió PR, lista los comandos que le negaron", () => {
    const texto = informe(
      [
        { type: "system" },
        resultado({
          permission_denials: [
            { tool_name: "Bash", tool_input: { command: "ls -la src/module" } },
            { tool_name: "Bash", tool_input: { command: "npx sql-ts --config sqlts.json" } },
            { tool_name: "Bash", tool_input: { command: "ls -la src/module" } },
          ],
        }),
      ],
      4,
      false,
    )!;
    expect(texto).toContain("Claude terminó el ticket #4 sin abrir un PR.");
    expect(texto).toContain("`ls -la src/module`");
    expect(texto).toContain("`npx sql-ts --config sqlts.json`");
    expect(texto.match(/ls -la src\/module/g)).toHaveLength(1); // sin repetidos
  });

  it("sin llegar a hablar con el modelo, sospecha del límite de uso", () => {
    const texto = informe([resultado({ is_error: true, num_turns: 1, total_cost_usd: 0 })], 4, false)!;
    expect(texto).toContain("límite de uso");
  });

  it("avisa del error aunque haya abierto el PR", () => {
    expect(informe([resultado({ is_error: true })], 4, true)).toContain("terminó con error");
  });

  it("acorta comandos largos para no llenar el ticket", () => {
    const largo = "echo " + "x".repeat(300);
    const texto = informe([resultado({ permission_denials: [{ tool_name: "Bash", tool_input: { command: largo } }] })], 4, false)!;
    expect(texto).toContain("…");
    expect(texto).not.toContain("x".repeat(200));
  });

  it("sin resultado en la salida, no inventa nada", () => {
    expect(informe([{ type: "system" }], 4, false)).toBeNull();
  });
});
