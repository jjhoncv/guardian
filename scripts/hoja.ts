// Filas del Sheet del Guardián (ADR 0026): un solo Sheet con todos los proyectos, espejo de GitHub.
// Funciones puras; las usa tools/sheet/sincronizar.ts, que lee GitHub y escribe en Google Sheets.
import type { Estado } from "./estado.ts";

export type DatosProyecto = {
  repo: string;
  estado: Estado | null;
  milestones: { title: string; due_on: string | null; open_issues: number; closed_issues: number; state: string }[];
  tareas: { numero: number; titulo: string; fase: string; estado: "abierto" | "en revisión" | "hecho"; creado: string; cerrado: string | null }[];
};

export const ENCABEZADOS = {
  Proyecto: ["proyecto", "fase actual", "fecha objetivo", "avance", "salud", "motivo", "actualizado", "repo"],
  Fases: ["proyecto", "fase", "fecha objetivo", "tickets hechos", "estado"],
  Tareas: ["proyecto", "ticket", "título", "fase", "estado", "creado", "cerrado", "link"],
  Salud: ["fecha", "proyecto", "salud", "avance", "días de atraso", "motivo"],
} as const satisfies Record<string, readonly string[]>;
export type Pestaña = keyof typeof ENCABEZADOS;

const nombre = (repo: string) => repo.split("/")[1];
const dia = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
const numeroFase = (titulo: string) => Number(titulo.match(/^Fase (\d+)/)?.[1] ?? Infinity);
const salud = (e: Estado) => (e.salud.pausa ? `⏸️ en pausa (${e.salud.emoji} ${e.salud.color})` : `${e.salud.emoji} ${e.salud.color}`);
const avance = (e: Estado) => (!e.avance ? "" : e.avance.total === 0 ? "sin escenarios" : `${e.avance.verdes} de ${e.avance.total} (${e.avance.porcentaje} %)`);

export function filasProyecto(datos: DatosProyecto[]): string[][] {
  return [
    [...ENCABEZADOS.Proyecto],
    ...datos.map(({ repo, estado: e }) =>
      e
        ? [nombre(repo), e.fase?.titulo ?? "sin fase abierta", dia(e.fase?.vence), avance(e), salud(e), e.salud.motivos.join(" · "), e.actualizado.slice(0, 16).replace("T", " "), `https://github.com/${repo}`]
        : [nombre(repo), "", "", "", "sin estado todavía", "", "", `https://github.com/${repo}`],
    ),
  ];
}

export function filasFases(datos: DatosProyecto[]): string[][] {
  const filas = datos.flatMap(({ repo, milestones }) =>
    milestones
      .filter((m) => /^Fase \d+/.test(m.title))
      .sort((a, b) => numeroFase(a.title) - numeroFase(b.title))
      .map((m) => [nombre(repo), m.title, dia(m.due_on), `${m.closed_issues} de ${m.open_issues + m.closed_issues}`, m.state === "closed" ? "cerrada" : "abierta"]),
  );
  return [[...ENCABEZADOS.Fases], ...filas];
}

export function filasTareas(datos: DatosProyecto[]): string[][] {
  const filas = datos.flatMap(({ repo, tareas }) =>
    [...tareas]
      .sort((a, b) => a.numero - b.numero)
      .map((t) => [nombre(repo), `#${t.numero}`, t.titulo, t.fase, t.estado, dia(t.creado), dia(t.cerrado), `https://github.com/${repo}/issues/${t.numero}`]),
  );
  return [[...ENCABEZADOS.Tareas], ...filas];
}

/** Historial: una fila por día y proyecto. La de hoy se reemplaza; las anteriores no se tocan. */
export function filasSalud(existentes: readonly (readonly string[])[], datos: DatosProyecto[], hoy: string): string[][] {
  const conEstado = datos.filter((d) => d.estado);
  const hoyDe = new Set(conEstado.map((d) => nombre(d.repo)));
  const historial = existentes.slice(1).map((f) => [...f]).filter((f) => !(f[0] === hoy && hoyDe.has(f[1])));
  const nuevas = conEstado.map(({ repo, estado: e }) => [hoy, nombre(repo), salud(e!), e!.avance ? `${e!.avance.porcentaje} %` : "", String(e!.salud.diasAtraso), e!.salud.motivos.join(" · ")]);
  return [[...ENCABEZADOS.Salud], ...historial, ...nuevas];
}
