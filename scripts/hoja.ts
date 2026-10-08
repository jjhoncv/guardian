// Filas del Sheet del Guardián (ADR 0026): un solo Sheet con todos los proyectos, espejo de GitHub.
// Funciones puras; las usa tools/sheet/sincronizar.ts, que lee GitHub y escribe en Google Sheets.
import type { Estado } from "./estado.ts";

export type DatosProyecto = {
  repo: string;
  estado: Estado | null;
  milestones: { title: string; due_on: string | null; open_issues: number; closed_issues: number; state: string; created_at: string; closed_at?: string | null }[];
  tareas: { numero: number; titulo: string; fase: string; estado: "abierto" | "en revisión" | "hecho"; creado: string; cerrado: string | null }[];
};

export const ENCABEZADOS = {
  Resumen: ["proyecto", "salud", "avance del proyecto", "", "fase actual", "trabajo de la fase", "", "tiempo de la fase", "", "tickets", "vence", "¿qué lo frena?"],
  Proyecto: ["proyecto", "fase actual", "fecha objetivo", "avance", "salud", "motivo", "actualizado", "repo"],
  Fases: ["proyecto", "fase", "fecha objetivo", "tickets hechos", "estado"],
  Tareas: ["proyecto", "ticket", "título", "fase", "estado", "creado", "cerrado", "link"],
  Salud: ["fecha", "proyecto", "salud", "avance", "días de atraso", "motivo"],
  Tendencia: ["fecha"],
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

const DIA = 86_400_000;

/** Colores fijos de las barras (nunca vienen del proyecto). */
const COLORES = { avance: "#34a853", trabajo: "#4285f4", tiempo: "#9aa0a6", alerta: "#ea4335" } as const;

/** Barra de progreso real: fórmula SPARKLINE armada solo con un entero 0–100 y un color fijo. */
export function barra(porcentaje: number, tipo: keyof typeof COLORES): string {
  const n = Math.max(0, Math.min(100, Math.round(porcentaje)));
  return `=SPARKLINE(${n},{"charttype","bar";"max",100;"color1","${COLORES[tipo]}"})`;
}

/** Ancho de cada columna (px) según su texto más largo, encabezado incluido. */
export function anchos(filas: readonly (readonly (string | number)[])[]): number[] {
  const columnas = Math.max(...filas.map((f) => f.length));
  return Array.from({ length: columnas }, (_, c) => Math.min(420, Math.max(...filas.map((f) => String(f[c] ?? "").length)) * 8 + 32));
}

export type FaseEnCurso = {
  titulo: string;
  trabajo: number;
  tiempo: number | null;
  diasRestantes: number | null;
  hechos: number;
  enRevision: number;
  porHacer: number;
  alerta: string | null;
};

/** La fase abierta de número más bajo: % de tickets hechos (avance real) vs. % del plazo gastado (contra la fecha tentativa). */
export function faseEnCurso(d: DatosProyecto, hoy: string): FaseEnCurso | null {
  const fases = d.milestones.filter((m) => /^Fase \d+/.test(m.title)).sort((a, b) => numeroFase(a.title) - numeroFase(b.title));
  const i = fases.findIndex((m) => m.state === "open");
  if (i < 0) return null;
  const f = fases[i];
  const tareas = d.tareas.filter((t) => t.fase === f.title);
  const hechos = tareas.filter((t) => t.estado === "hecho").length;
  const enRevision = tareas.filter((t) => t.estado === "en revisión").length;
  const trabajo = tareas.length ? Math.round((hechos / tareas.length) * 100) : 0;
  let tiempo: number | null = null;
  let diasRestantes: number | null = null;
  if (f.due_on) {
    // La fase empieza cuando se cerró la anterior (fecha real); si no, en su fecha tentativa; si no, al crearse.
    const inicio = Date.parse(fases[i - 1]?.closed_at ?? fases[i - 1]?.due_on ?? f.created_at);
    const fin = Date.parse(f.due_on);
    tiempo = Math.max(0, Math.round(((Date.parse(hoy) - inicio) / Math.max(fin - inicio, DIA)) * 100));
    diasRestantes = Math.ceil((fin - Date.parse(hoy)) / DIA);
  }
  const alerta = tiempo !== null && tiempo - trabajo >= 20 ? "⚠️ el plazo va más rápido que el trabajo" : null;
  return { titulo: f.title, trabajo, tiempo, diasRestantes, hechos, enRevision, porHacer: tareas.length - hechos - enRevision, alerta };
}

const vence = (dias: number | null) =>
  dias === null ? "sin fecha objetivo" : dias > 1 ? `en ${dias} días` : dias === 1 ? "mañana" : dias === 0 ? "hoy" : `venció hace ${-dias} ${dias === -1 ? "día" : "días"}`;

/** Texto del Resumen. Las columnas de barra (C, F, H) van vacías aquí: las llena `barrasResumen`, aparte. */
export function filasResumen(datos: DatosProyecto[], hoy: string): string[][] {
  return [
    [...ENCABEZADOS.Resumen],
    ...datos.map((d) => {
      const e = d.estado;
      const f = faseEnCurso(d, hoy);
      const avanceProyecto = !e?.avance ? "" : e.avance.total === 0 ? "sin escenarios" : `${e.avance.porcentaje} % · ${e.avance.verdes} de ${e.avance.total}`;
      const frena = [...(e?.salud.motivos ?? []), ...(f?.alerta ? [f.alerta] : [])].join(" · ") || "—";
      return [
        nombre(d.repo),
        e ? salud(e) : "sin estado todavía",
        "",
        avanceProyecto,
        f?.titulo ?? "sin fase abierta",
        "",
        f ? `${f.trabajo} %` : "",
        "",
        !f ? "" : f.tiempo === null ? "sin fecha objetivo" : `${Math.min(f.tiempo, 100)} %`,
        f ? `✅ ${f.hechos} · 👀 ${f.enRevision} · ⬜ ${f.porHacer}` : "",
        f ? vence(f.diasRestantes) : "",
        frena,
      ];
    }),
  ];
}

/** Barras del Resumen (columnas C, F y H), una fila por proyecto. Solo fórmulas armadas aquí. */
export function barrasResumen(datos: DatosProyecto[], hoy: string): string[][] {
  return datos.map((d) => {
    const f = faseEnCurso(d, hoy);
    const a = d.estado?.avance;
    return [
      a && a.total > 0 ? barra(a.porcentaje, "avance") : "",
      f ? barra(f.trabajo, "trabajo") : "",
      f && f.tiempo !== null ? barra(f.tiempo, f.alerta ? "alerta" : "tiempo") : "",
    ];
  });
}

/** Avance (%) por día y proyecto, en columnas: la fuente del gráfico de tendencia. */
export function filasTendencia(salud: readonly (readonly string[])[]): (string | number)[][] {
  const filas = salud.slice(1).filter((f) => f[0] && f[1]);
  const proyectos = [...new Set(filas.map((f) => f[1]))].sort();
  const fechas = [...new Set(filas.map((f) => f[0]))].sort();
  const valor = new Map(filas.map((f) => [`${f[0]}|${f[1]}`, Number.parseInt(f[3] ?? "", 10)]));
  return [
    ["fecha", ...proyectos],
    ...fechas.map((fecha) => [fecha, ...proyectos.map((p) => {
      const v = valor.get(`${fecha}|${p}`);
      return v === undefined || Number.isNaN(v) ? "" : v;
    })]),
  ];
}
