import { describe, expect, it } from "vitest";
import { decidir, enVentana, momentoDe, type Memoria } from "./politica";
import type { ParaResumen } from "./resumen";
import type { DatosProyecto } from "./hoja";

// Lima = UTC−5.
const lima = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-05:00`).toISOString();
const vacia: Memoria = { enviados: {}, colores: {}, curvas: {} };
const salud = (color: "verde" | "rojo", alertas: { gravedad: "rojo"; texto: string; accion: string }[] = []) =>
  ({ color, emoji: color === "verde" ? "🟢" : "🔴", motivos: alertas.map((a) => a.texto), alertas, diasAtraso: 0, pausa: false });
const datos = (s: ReturnType<typeof salud>): DatosProyecto => ({
  repo: "jjhoncv/vitrina",
  estado: { proyecto: "vitrina", fase: { titulo: "Fase 2 — B", vence: null }, avance: { verdes: 5, total: 10, porcentaje: 50 }, salud: s, actualizado: "" },
  milestones: [], tareas: [],
});
const p = (s: ReturnType<typeof salud>, pendientes: ParaResumen["pendientes"] = [], fusionados: { numero: number; titulo: string; url: string }[] = []): ParaResumen =>
  ({ datos: datos(s), pendientes, actividad: { fusionados, abiertos: [], ticketsCerrados: 0 } });
const pr = { tipo: "pr" as const, urgente: false, texto: "PR #44 «x» te espera desde hoy", accion: "Revisa", url: "https://github.com/jjhoncv/vitrina/pull/44" };

describe("ventanas del dueño: L–S 8:00–9:00 y 19:00–22:00 (Lima); domingo, nada", () => {
  it("dentro y fuera de las ventanas", () => {
    expect(enVentana(lima("2026-10-12", "08:30"))).toBe(true); // lunes
    expect(enVentana(lima("2026-10-12", "12:00"))).toBe(false);
    expect(enVentana(lima("2026-10-12", "21:59"))).toBe(true);
    expect(enVentana(lima("2026-10-12", "22:00"))).toBe(false);
    expect(enVentana(lima("2026-10-17", "08:15"))).toBe(true); // sábado
    expect(enVentana(lima("2026-10-18", "08:15"))).toBe(false); // domingo
  });

  it("momento según la hora: buenos días, cierre del día o solo emergencias", () => {
    expect(momentoDe(lima("2026-10-12", "08:00"))).toBe("manana");
    expect(momentoDe(lima("2026-10-12", "19:00"))).toBe("noche");
    expect(momentoDe(lima("2026-10-17", "08:07"))).toBe("semanal"); // sábado
    expect(momentoDe(lima("2026-10-12", "12:00"))).toBe("nada");
    expect(momentoDe(lima("2026-10-18", "08:00"))).toBe("nada");
  });

  it("GitHub atrasa los cron: el ☀️ / 🌙 sale en la primera corrida de la ventana que aún no lo mandó (#210)", () => {
    expect(momentoDe(lima("2026-10-12", "08:52"))).toBe("manana");
    expect(momentoDe(lima("2026-10-12", "21:37"))).toBe("noche");
    const yaHoy: Memoria = { ...vacia, hechos: { "2026-10-12|manana": "x", "2026-10-12|noche": "x" } };
    expect(momentoDe(lima("2026-10-12", "08:22"), yaHoy)).toBe("emergencias");
    expect(momentoDe(lima("2026-10-12", "20:30"), yaHoy)).toBe("emergencias");
    // El 🌙 de las 21:00 en Lima ya es el día siguiente en UTC: cuenta para el día de Lima.
    const yaViernes: Memoria = { ...vacia, hechos: { "2026-10-16|noche": "x" } };
    expect(momentoDe(lima("2026-10-16", "21:07"), yaViernes)).toBe("emergencias");
    expect(momentoDe(lima("2026-10-13", "08:07"), yaHoy)).toBe("manana"); // otro día
  });

  it("el ☀️ / 🌙 / 📅 del día se marca como hecho aunque no haya novedades (una vez por día)", () => {
    const r = decidir([p(salud("verde"))], vacia, lima("2026-10-12", "08:07"));
    expect(r.texto).toContain("Buenos días"); // primera vez: el cambio de color cuenta como novedad
    const otra = decidir([p(salud("verde"))], r.memoria, lima("2026-10-13", "08:07"));
    expect(otra.texto).toBeNull();
    expect(otra.memoria.hechos).toHaveProperty("2026-10-13|manana");
    expect(momentoDe(lima("2026-10-13", "08:22"), otra.memoria)).toBe("emergencias");
  });
});

describe("qué se manda (y qué no)", () => {
  it("buenos días con algo nuevo: manda el resumen y recuerda lo que avisó", () => {
    const r = decidir([p(salud("verde"), [pr])], vacia, lima("2026-10-12", "08:00"));
    expect(r.texto).toContain("☀️ <b>Buenos días</b>");
    expect(r.texto).toContain("🆕 vitrina · PR #44");
    expect(r.memoria.enviados).toHaveProperty("jjhoncv/vitrina|pr|https://github.com/jjhoncv/vitrina/pull/44");
  });

  it("si no hay nada nuevo, no manda nada (el silencio es que todo va bien)", () => {
    const primera = decidir([p(salud("verde"), [pr])], vacia, lima("2026-10-12", "08:00"));
    const noche = decidir([p(salud("verde"), [pr])], primera.memoria, lima("2026-10-12", "19:00"));
    expect(noche.texto).toBeNull();
  });

  it("lo que ya se avisó sigue en el resumen si hay novedad, pero sin 🆕", () => {
    const primera = decidir([p(salud("verde"), [pr])], vacia, lima("2026-10-12", "08:00"));
    const otro = { ...pr, texto: "PR #45 «y» te espera desde hoy", url: "https://github.com/jjhoncv/vitrina/pull/45" };
    const noche = decidir([p(salud("verde"), [pr, otro])], primera.memoria, lima("2026-10-12", "19:00"));
    expect(noche.texto).toContain("🌙 <b>Cierre del día</b>");
    expect(noche.texto).toContain("🆕 vitrina · PR #45");
    expect(noche.texto).toMatch(/\d\. vitrina · PR #44/);
  });

  it("emergencia: un proyecto que pasa a 🔴 avisa al momento, una sola vez", () => {
    const rojo = salud("rojo", [{ gravedad: "rojo", texto: "«Fase 2» lleva 5 días de atraso", accion: "Decide" }]);
    // El 🌙 de hoy ya salió: a las 20:30 solo toca emergencias.
    const memoria = { ...vacia, colores: { "jjhoncv/vitrina": "verde" as const }, hechos: { "2026-10-12|noche": "x" } };
    const r = decidir([p(rojo)], memoria, lima("2026-10-12", "20:30"));
    expect(r.texto).toContain("🚨 <b>vitrina</b> pasó de 🟢 a 🔴");
    expect(r.texto).toContain("«Fase 2» lleva 5 días de atraso");
    expect(r.curvas).toEqual(["jjhoncv/vitrina"]);
    expect(decidir([p(rojo)], r.memoria, lima("2026-10-12", "21:00")).texto).toBeNull();
  });

  it("fuera de las ventanas no manda nada y no marca nada como avisado (espera a la siguiente ventana)", () => {
    const rojo = salud("rojo", [{ gravedad: "rojo", texto: "atraso", accion: "Decide" }]);
    const r = decidir([p(rojo)], { ...vacia, colores: { "jjhoncv/vitrina": "verde" } }, lima("2026-10-12", "14:00"));
    expect(r.texto).toBeNull();
    expect(r.memoria.colores["jjhoncv/vitrina"]).toBe("verde");
  });

  it("la actividad de Claude cuenta como novedad, una vez", () => {
    const hecho = [{ numero: 36, titulo: "guardar", url: "u36" }];
    const r = decidir([p(salud("verde"), [], hecho)], vacia, lima("2026-10-12", "08:00"));
    expect(r.texto).toContain("fusionó");
    expect(decidir([p(salud("verde"), [], hecho)], r.memoria, lima("2026-10-12", "19:00")).texto).toBeNull();
  });
});

describe("sábado 8:00: revisión semanal (llega siempre)", () => {
  it("con tendencia del desvío, actividad de la semana, ideas nuevas y todas las curvas", () => {
    const conSemana = { ...p(salud("verde")), semana: { ideas: ["Pronóstico"], prsFusionados: 9, ticketsCerrados: 23 } };
    const memoria = { ...vacia, enviados: {}, colores: { "jjhoncv/vitrina": "verde" as const } };
    const r = decidir([conSemana], memoria, lima("2026-10-17", "08:00"), "semanal");
    expect(r.texto).toContain("📅 <b>Revisión semanal</b>");
    expect(r.texto).toContain("🤖 Claude esta semana: 9 PRs fusionados · 23 tickets cerrados");
    expect(r.texto).toContain("💡 <b>Parking lot: 1 idea nueva</b>");
    expect(r.texto).toContain("• vitrina: Pronóstico · <a href=\"https://github.com/jjhoncv/vitrina/blob/main/PROYECTO.md\">ver todas</a>");
  });

  it("aunque no haya novedades, la revisión semanal sale", () => {
    const r = decidir([p(salud("verde"))], { ...vacia, colores: { "jjhoncv/vitrina": "verde" } }, lima("2026-10-17", "08:00"), "semanal");
    expect(r.texto).toContain("📅 <b>Revisión semanal</b>");
  });
});
