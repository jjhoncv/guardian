import { describe, expect, it } from "vitest";
import { desdeHeader, desdeVariables, tokensPorVencer } from "./tokens";
import type { DatosProyecto } from "./hoja";

describe("tokens por vencer (T5)", () => {
  it("lee la fecha del header que GitHub devuelve al usar un PAT", () => {
    expect(desdeHeader("2027-01-05 12:00:00 -0500")).toBe("2027-01-05");
    expect(desdeHeader(null)).toBeNull();
  });

  it("lee las variables VENCE_<SECRETO> (las fechas que no se pueden leer por API)", () => {
    expect(desdeVariables(JSON.stringify({ VENCE_NETLIFY_AUTH_TOKEN: "2026-12-01", VENCE_ANTHROPIC_API_KEY: "2026-11-05", OTRA: "x", VENCE_MAL: "mañana" }))).toEqual([
      { secreto: "NETLIFY_AUTH_TOKEN", vence: "2026-12-01" },
      { secreto: "ANTHROPIC_API_KEY", vence: "2026-11-05" },
    ]);
  });

  const datos = (vencimientos: { secreto: string; vence: string }[]): DatosProyecto => ({
    repo: "jjhoncv/vitrina",
    estado: { proyecto: "vitrina", fase: null, avance: null, salud: { color: "verde", emoji: "🟢", motivos: [], diasAtraso: 0, pausa: false }, actualizado: "", vencimientos },
    milestones: [],
    tareas: [],
  });

  it("avisa desde 7 días antes, urgente con 2 días o menos, con los pasos para renovar y el link", () => {
    const hoy = "2026-10-30T13:00:00Z";
    const p = tokensPorVencer(datos([
      { secreto: "ANTHROPIC_API_KEY", vence: "2026-11-05" },
      { secreto: "RELEASE_PLEASE_TOKEN", vence: "2026-11-01" },
      { secreto: "NETLIFY_AUTH_TOKEN", vence: "2026-12-30" },
    ]), hoy);
    expect(p).toEqual([
      { tipo: "token", urgente: true, texto: "RELEASE_PLEASE_TOKEN vence en 2 días (2026-11-01)", accion: "Nuevo PAT fine-grained con los mismos permisos (solo este repo) → gh secret set RELEASE_PLEASE_TOKEN -R jjhoncv/vitrina", url: "https://github.com/settings/personal-access-tokens" },
      { tipo: "token", urgente: false, texto: "ANTHROPIC_API_KEY vence en 6 días (2026-11-05)", accion: "Nueva key en el workspace con tope → gh secret set ANTHROPIC_API_KEY -R jjhoncv/vitrina y gh variable set VENCE_ANTHROPIC_API_KEY", url: "https://console.anthropic.com/settings/keys" },
    ]);
  });

  it("vencido: lo dice", () => {
    const p = tokensPorVencer(datos([{ secreto: "NETLIFY_AUTH_TOKEN", vence: "2026-10-28" }]), "2026-10-30T13:00:00Z");
    expect(p[0]).toMatchObject({ urgente: true, texto: "NETLIFY_AUTH_TOKEN venció hace 2 días (2026-10-28)" });
  });
});
