// Resumen diario por Telegram (Fase 5, E6). Responde, en orden: ¿qué tengo que hacer hoy? (con el link para
// hacerlo desde el celular), ¿qué avanzó Claude? y ¿cómo va cada proyecto?
import { curvaProyecto, desvioTexto, filasFoco, type DatosProyecto } from "./hoja.ts";
import type { Actividad, Pendiente } from "./proyectos.ts";
import { html } from "./telegram.ts";

export type ParaResumen = {
  datos: DatosProyecto;
  pendientes: Pendiente[];
  actividad: Actividad;
  /** Solo para la revisión semanal: ideas nuevas del Parking lot y actividad de 7 días. */
  semana?: { ideas: string[]; prsFusionados: number; ticketsCerrados: number };
};

/** Identidad de cada cosa avisada (para no repetir): los números (días de atraso, horas) no cuentan. */
export const clavePendiente = (repo: string, p: Pendiente) => `${repo}|${p.tipo}${p.urgente ? "-urgente" : ""}|${p.url}`;
export const claveFoco = (repo: string, texto: string) => `${repo}|foco|${texto.replace(/\d+/g, "#")}`;
export const claveActividad = (repo: string, url: string) => `${repo}|claude|${url}`;

/** Opciones de la política de avisos: título del momento, qué es nuevo (🆕) y qué actividad ya se contó. */
export type OpcionesResumen = { titulo?: string; nuevas?: Set<string>; actividadVista?: Set<string>; sinActividad?: boolean; sinProyectos?: boolean };

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** Fecha y hora de Lima (UTC−5, sin horario de verano). */
function enLima(iso: string) {
  const d = new Date(Date.parse(iso) - 5 * 3_600_000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]} · ${hh}:${mm}`;
}

const nombre = (repo: string) => repo.split("/")[1];
const enlace = (url: string) => `<a href="${html(url)}">abrir</a>`;

// Prioridad: lo que rompe o bloquea primero; lo que solo informa al final.
const PRIORIDAD = { alerta: 0, deploy: 1, prUrgente: 2, rojo: 3, gris: 4, pregunta: 5, pr: 6, amarillo: 7, release: 8, fase: 9 } as const;

export function resumenDiario(proyectos: ParaResumen[], hoy: string, opciones: OpcionesResumen = {}): string {
  const nueva = (clave: string) => (opciones.nuevas?.has(clave) ? "🆕 " : "");
  const activos = proyectos.filter((p) => !p.datos.estado?.salud.pausa);
  const items = activos.flatMap(({ datos, pendientes }) => {
    const proyecto = nombre(datos.repo);
    const desdePendientes = pendientes.map((p) => ({
      prioridad: p.tipo === "pr" ? (p.urgente ? PRIORIDAD.prUrgente : PRIORIDAD.pr) : PRIORIDAD[p.tipo],
      linea: `${nueva(clavePendiente(datos.repo, p))}${p.tipo === "pr" && p.urgente ? "⏰ " : ""}${html(proyecto)} · ${html(p.texto)}`,
      accion: p.accion,
      url: p.url,
    }));
    // Lo del Foco (atraso, main en rojo, inactividad, plazo vs. trabajo); los PRs ya están arriba con su link.
    const desdeFoco = filasFoco([datos], hoy)
      .slice(1)
      .filter((f) => f[0] !== "🟢" && !f[4].includes("/pull/"))
      .map((f) => ({
        prioridad: f[0] === "🔴" ? PRIORIDAD.rojo : f[0] === "⚫" ? PRIORIDAD.gris : PRIORIDAD.amarillo,
        linea: `${nueva(claveFoco(datos.repo, f[2]))}${f[0]} ${html(proyecto)} · ${html(f[2])}`,
        accion: f[3],
        url: f[4],
      }));
    return [...desdePendientes, ...desdeFoco];
  });
  items.sort((a, b) => a.prioridad - b.prioridad);

  // La actividad ya contada en un aviso anterior no se repite.
  const sinVista = (repo: string, xs: Actividad["fusionados"]) => xs.filter((x) => !opciones.actividadVista?.has(claveActividad(repo, x.url)));
  const activos2 = activos.map((p) => ({ ...p, actividad: { ...p.actividad, fusionados: sinVista(p.datos.repo, p.actividad.fusionados), abiertos: sinVista(p.datos.repo, p.actividad.abiertos) } }));
  const conActividad = activos2.filter(({ actividad: a }) => a.fusionados.length || a.abiertos.length);
  const tickets = activos.filter((p) => p.actividad.ticketsCerrados > 0);
  const totalTickets = tickets.reduce((n, p) => n + p.actividad.ticketsCerrados, 0);

  const lineas = [`${opciones.titulo ?? "🛡️ <b>Guardián</b>"} · ${enLima(hoy)}`, ""];
  if (!items.length && !conActividad.length && !totalTickets) {
    lineas.push("🟢 Todo en orden, sin novedades", "");
  } else {
    if (items.length) {
      lineas.push(`🔴 <b>Atender hoy (${items.length})</b>`);
      items.forEach((i, n) => lineas.push(`${n + 1}. ${i.linea}`, `   → ${html(i.accion)} · ${enlace(i.url)}`));
    } else lineas.push("🟢 Nada que atender hoy");
    lineas.push("");
    if (!opciones.sinActividad && (conActividad.length || totalTickets)) {
      lineas.push("🤖 <b>Claude desde ayer</b>");
      for (const { datos, actividad: a } of conActividad) {
        const pr = (x: Actividad["fusionados"][number]) => `<a href="${html(x.url)}">#${x.numero}</a> ${html(x.titulo)}`;
        const partes = [a.fusionados.length ? `fusionó ${a.fusionados.map(pr).join(", ")}` : "", a.abiertos.length ? `abrió ${a.abiertos.map(pr).join(", ")}` : ""].filter(Boolean);
        lineas.push(`• ${html(nombre(datos.repo))}: ${partes.join(" · ")}`);
      }
      if (totalTickets) {
        const detalle = tickets.length > 1 ? ` (${tickets.map((p) => `${nombre(p.datos.repo)} ${p.actividad.ticketsCerrados}`).join(" · ")})` : "";
        lineas.push(`• ${totalTickets} ${totalTickets === 1 ? "ticket cerrado" : "tickets cerrados"}${detalle}`);
      }
      lineas.push("");
    }
  }

  if (opciones.sinProyectos) return lineas.join("\n").trimEnd();
  lineas.push("📊 <b>Proyectos</b>");
  for (const { datos } of proyectos) {
    const e = datos.estado;
    if (e?.salud.pausa) {
      lineas.push(`⏸️ ${html(nombre(datos.repo))} · en pausa`);
      continue;
    }
    const fases = datos.milestones.filter((m) => /^Fase \d+/.test(m.title));
    const terminado = fases.length > 0 && fases.every((m) => m.state === "closed");
    const fase = e?.fase?.titulo ?? (terminado ? "terminado" : "sin fase abierta");
    const avance = e?.avance && e.avance.total > 0 ? ` · ${e.avance.porcentaje} %` : "";
    const desvio = desvioTexto(curvaProyecto(datos, hoy)?.desvio);
    lineas.push(`${e?.salud.emoji ?? "·"} ${html(nombre(datos.repo))} · ${html(fase)}${avance}${desvio ? ` · ${desvio}` : ""}`);
  }
  return lineas.join("\n");
}
