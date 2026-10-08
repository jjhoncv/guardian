// Simulación con datos inventados (no reales) para ver cómo se mueven los indicadores del tablero en el
// tiempo: un «proyecto-x» de 3 fases y 11 tickets pasa por 10 momentos. Usa las mismas funciones que el
// tablero real (calcularSalud, faseEnCurso, filasFoco), así que lo que se ve aquí es lo que pasaría de verdad.
import { faseActual, type Estado } from "./estado.ts";
import { calcularSalud } from "./salud.ts";
import { faseEnCurso, filasFoco, type DatosProyecto } from "./hoja.ts";

const MEDIODIA = "T12:00:00Z";
const REPO = "simulacion/proyecto-x";

// Tickets: fase y fecha de cierre (null = no se cerró en la simulación). `pr` = desde cuándo hay un PR esperando.
const TICKETS: { numero: number; fase: number; cerrado: string | null; pr?: string }[] = [
  { numero: 1, fase: 1, cerrado: "2026-11-03" },
  { numero: 2, fase: 1, cerrado: "2026-11-10", pr: "2026-11-05T08:00:00Z" },
  { numero: 3, fase: 1, cerrado: "2026-12-16" },
  { numero: 4, fase: 1, cerrado: "2026-12-18" },
  { numero: 5, fase: 2, cerrado: "2026-12-19" },
  { numero: 6, fase: 2, cerrado: "2026-12-20" },
  { numero: 7, fase: 2, cerrado: "2026-12-21" },
  { numero: 8, fase: 2, cerrado: "2026-12-24" },
  { numero: 9, fase: 3, cerrado: "2026-12-28" },
  { numero: 10, fase: 3, cerrado: "2027-01-02" },
  { numero: 11, fase: 3, cerrado: null, pr: "2027-01-03T08:00:00Z" },
];
const NOMBRES = ["Fase 1 — Lista", "Fase 2 — Avisos", "Fase 3 — Reportes"];
const PLAN_ORIGINAL = ["2026-11-09", "2026-11-16", "2026-11-23"];
const PLAN_NUEVO = ["2026-12-18", "2026-12-25", "2027-01-08"]; // reprogramado al retomar
const CIERRE_FASE = ["2026-12-18", "2026-12-24", null];

const MOMENTOS: { fecha: string; evento: string; actividad: string; mainRojo?: string; reprogramado?: boolean; escenarios: number }[] = [
  { fecha: "2026-11-04", evento: "Arranca: Claude hace los primeros tickets", actividad: "2026-11-04", escenarios: 0 },
  { fecha: "2026-11-06", evento: "Un PR te espera hace más de un día", actividad: "2026-11-06", escenarios: 1 },
  { fecha: "2026-11-12", evento: "La Fase 1 se demora: 3 días de atraso", actividad: "2026-11-11", escenarios: 2 },
  { fecha: "2026-11-14", evento: "Sigue demorada: 5 días de atraso", actividad: "2026-11-13", escenarios: 2 },
  { fecha: "2026-11-15", evento: "Además se rompe main (CI en rojo desde ayer)", actividad: "2026-11-15", mainRojo: "2026-11-14T06:00:00Z", escenarios: 2 },
  { fecha: "2026-11-29", evento: "Dos semanas sin tocar el proyecto", actividad: "2026-11-15", mainRojo: "2026-11-14T06:00:00Z", escenarios: 2 },
  { fecha: "2026-12-14", evento: "Un mes parado", actividad: "2026-11-15", mainRojo: "2026-11-14T06:00:00Z", escenarios: 2 },
  { fecha: "2026-12-15", evento: "Se retoma: main arreglado y fechas reprogramadas", actividad: "2026-12-15", reprogramado: true, escenarios: 2 },
  { fecha: "2026-12-22", evento: "Una semana después: Fase 1 cerrada, Fase 2 avanza", actividad: "2026-12-22", reprogramado: true, escenarios: 6 },
  { fecha: "2027-01-05", evento: "Tres semanas después: Fase 3 casi lista, un PR te espera", actividad: "2027-01-05", reprogramado: true, escenarios: 9 },
];

export type Momento = { fecha: string; evento: string; datos: DatosProyecto };

export function simular(): Momento[] {
  return MOMENTOS.map((m) => {
    const hoy = m.fecha + MEDIODIA;
    const vence = m.reprogramado ? PLAN_NUEVO : PLAN_ORIGINAL;
    const cerrado = (fecha: string | null) => fecha !== null && fecha <= m.fecha;
    const milestones = NOMBRES.map((title, i) => {
      const propios = TICKETS.filter((t) => t.fase === i + 1);
      const hechos = propios.filter((t) => cerrado(t.cerrado)).length;
      const cerradaFase = cerrado(CIERRE_FASE[i]);
      return { title, due_on: vence[i] + MEDIODIA, open_issues: propios.length - hechos, closed_issues: hechos, state: cerradaFase ? "closed" : "open", created_at: "2026-11-02T09:00:00Z", closed_at: cerradaFase ? CIERRE_FASE[i]! + MEDIODIA : null };
    });
    const enRevision = (t: (typeof TICKETS)[number]) => !cerrado(t.cerrado) && t.pr !== undefined && t.pr.slice(0, 10) <= m.fecha;
    const tareas: DatosProyecto["tareas"] = TICKETS.map((t) => ({
      numero: t.numero,
      titulo: `Ticket ${t.numero}`,
      fase: NOMBRES[t.fase - 1],
      estado: cerrado(t.cerrado) ? "hecho" : enRevision(t) ? "en revisión" : "abierto",
      creado: "2026-11-02T09:00:00Z",
      cerrado: cerrado(t.cerrado) ? t.cerrado! + MEDIODIA : null,
    }));
    const fase = faseActual(milestones.filter((x) => x.state === "open"));
    const salud = calcularSalud({
      hoy,
      fase,
      prsEsperando: TICKETS.filter(enRevision).map((t) => ({ numero: t.numero, desde: t.pr! })),
      mainEnRojoDesde: m.mainRojo ?? null,
      ultimaActividad: m.actividad + MEDIODIA,
      pausa: false,
    });
    const estado: Estado = { proyecto: "proyecto-x", fase, avance: { verdes: m.escenarios, total: 11, porcentaje: Math.round((m.escenarios / 11) * 100) }, salud, actualizado: hoy };
    return { fecha: m.fecha, evento: m.evento, datos: { repo: REPO, estado, milestones, tareas } };
  });
}

export const ENCABEZADOS_SIMULACION = ["fecha", "qué pasó", "salud", "días de atraso", "avance real de la fase", "tiempo del plan", "avance del proyecto", "foco: lo primero que atender", "qué hacer"];

/** Una fila por momento, con lo que mostraría el tablero ese día. */
export function filasSimulacion(momentos: Momento[]): string[][] {
  return [
    ENCABEZADOS_SIMULACION,
    ...momentos.map(({ fecha, evento, datos }) => {
      const hoy = fecha + MEDIODIA;
      const e = datos.estado!;
      const f = faseEnCurso(datos, hoy);
      const foco = filasFoco([datos], hoy).slice(1);
      const extra = foco.length > 1 ? ` (+${foco.length - 1} más)` : "";
      return [
        fecha,
        evento,
        `${e.salud.emoji} ${e.salud.color}`,
        String(e.salud.diasAtraso),
        f ? `${f.trabajo} % de «${f.titulo}»` : "",
        f?.tiempo === null || !f ? "" : `${Math.min(f.tiempo, 100)} %`,
        `${e.avance!.porcentaje} %`,
        `${foco[0][0]} ${foco[0][2]}${extra}`,
        foco[0][3],
      ];
    }),
  ];
}

/** Los mismos momentos en números, para el gráfico de la pestaña Simulación. */
export function serieSimulacion(momentos: Momento[]): (string | number)[][] {
  return [
    ["fecha", "avance real de la fase (%)", "tiempo del plan (%)", "avance del proyecto (%)", "días de atraso"],
    ...momentos.map(({ fecha, datos }) => {
      const f = faseEnCurso(datos, fecha + MEDIODIA);
      const e = datos.estado!;
      return [fecha, f?.trabajo ?? 0, Math.min(f?.tiempo ?? 0, 100), e.avance!.porcentaje, e.salud.diasAtraso];
    }),
  ];
}
