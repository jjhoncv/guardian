// Política de avisos (Fase 5): el Guardián habla solo en las ventanas del dueño y solo con novedades.
// Lunes a sábado: ☀️ 8:00 «buenos días», 🌙 19:00 «cierre del día» y 🚨 emergencias dentro de 8:00–9:00 y
// 19:00–22:00 (Lima). Domingo: silencio. Cada cosa se avisa una vez; sin novedades, no se manda nada.
import { curvaProyecto, desvioTexto, faseEnCurso, filasFoco } from "./hoja.ts";
import { tendencia } from "./semanal.ts";
import { claveActividad, claveFoco, clavePendiente, resumenDiario, type ParaResumen } from "./resumen.ts";
import type { Color } from "./salud.ts";
import { html } from "./telegram.ts";

/** Lo que el Guardián ya avisó (se guarda en la rama `avisos` del repo del Guardián). */
export type Memoria = {
  enviados: Record<string, string>;
  colores: Record<string, Color>;
  curvas: Record<string, { desvio: number; fase: string | null }>;
  /** Desvío de cada proyecto en la última revisión semanal (para la tendencia). */
  semanal?: Record<string, number>;
  /** ☀️ / 🌙 / 📅 ya resueltos por día de Lima («2026-10-12|manana»), aunque no hayan tenido novedades. */
  hechos?: Record<string, string>;
};
export type Momento = "manana" | "noche" | "semanal" | "emergencias" | "nada";
export type Decision = { texto: string | null; curvas: string[]; memoria: Memoria };

/** Fecha, día de la semana (0 = domingo) y minutos del día en Lima (UTC−5, sin horario de verano). */
function lima(iso: string) {
  const d = new Date(Date.parse(iso) - 5 * 3_600_000);
  return { fecha: d.toISOString().slice(0, 10), dia: d.getUTCDay(), minutos: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export function enVentana(iso: string): boolean {
  const { dia, minutos } = lima(iso);
  return dia !== 0 && ((minutos >= 8 * 60 && minutos < 9 * 60) || (minutos >= 19 * 60 && minutos < 22 * 60));
}

/**
 * Qué toca según la hora real y lo ya hecho hoy. GitHub atrasa (o descarta) los cron en horas de carga, así que el
 * workflow corre varias veces por ventana: la primera corrida que todavía no mandó el ☀️ / 📅 (mañana) o el 🌙 (noche)
 * de hoy lo manda; las demás, solo emergencias (#210).
 */
export function momentoDe(iso: string, memoria?: Memoria): Momento {
  if (!enVentana(iso)) return "nada";
  const { fecha, dia, minutos } = lima(iso);
  const toca: Momento = minutos < 9 * 60 ? (dia === 6 ? "semanal" : "manana") : "noche";
  return memoria?.hechos?.[`${fecha}|${toca}`] ? "emergencias" : toca;
}

/** Marca el ☀️ / 🌙 / 📅 de hoy como resuelto y olvida los de hace más de 14 días. */
function marcarHecho(memoria: Memoria, iso: string, momento: Momento): Memoria["hechos"] {
  if (momento !== "manana" && momento !== "noche" && momento !== "semanal") return memoria.hechos;
  const { fecha } = lima(iso);
  const limite = new Date(Date.parse(`${fecha}T00:00:00Z`) - 14 * 86_400_000).toISOString().slice(0, 10);
  const vigentes = Object.entries(memoria.hechos ?? {}).filter(([k]) => k.slice(0, 10) >= limite);
  return { ...Object.fromEntries(vigentes), [`${fecha}|${momento}`]: iso };
}

const TITULO = { manana: "☀️ <b>Buenos días</b>", noche: "🌙 <b>Cierre del día</b>", semanal: "📅 <b>Revisión semanal</b>" };
const EMOJI: Record<Color, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚫" };
const nombre = (repo: string) => repo.split("/")[1];

export function decidir(proyectos: ParaResumen[], memoria: Memoria, hoy: string, momento: Momento = momentoDe(hoy, memoria)): Decision {
  if (momento === "nada" || !enVentana(hoy)) return { texto: null, curvas: [], memoria };
  const hechos = marcarHecho(memoria, hoy, momento);
  const nada: Decision = { texto: null, curvas: [], memoria: { ...memoria, hechos } };
  const activos = proyectos.filter((p) => !p.datos.estado?.salud.pausa);
  const ahora = hoy;

  // 🚨 Emergencias: un proyecto que pasa a 🔴 o una alerta de rollback nueva.
  const emergencias = activos.flatMap(({ datos, pendientes }) => {
    const color = datos.estado?.salud.color;
    const antes = memoria.colores[datos.repo];
    const lineas: string[] = [];
    if (color === "rojo" && antes !== "rojo") {
      lineas.push(`🚨 <b>${html(nombre(datos.repo))}</b> pasó de ${antes ? EMOJI[antes] : "·"} a 🔴`);
      for (const f of filasFoco([datos], hoy).slice(1).filter((f) => f[0] === "🔴")) lineas.push(`• ${html(f[2])}`, `   → ${html(f[3])} · <a href="${html(f[4])}">abrir</a>`);
    }
    const alertas = pendientes.filter((p) => p.tipo === "alerta" && !memoria.enviados[clavePendiente(datos.repo, p)]);
    for (const a of alertas) lineas.push(`🚨 <b>${html(nombre(datos.repo))}</b> · ${html(a.texto)}`, `   → ${html(a.accion)} · <a href="${html(a.url)}">abrir</a>`);
    return lineas.length ? [{ repo: datos.repo, lineas, rojo: color === "rojo" && antes !== "rojo", alertas: alertas.map((a) => clavePendiente(datos.repo, a)) }] : [];
  });

  if (momento === "emergencias") {
    if (!emergencias.length) return nada;
    const enviados = { ...memoria.enviados, ...Object.fromEntries(emergencias.flatMap((e) => e.alertas).map((k) => [k, ahora])) };
    const colores = { ...memoria.colores, ...Object.fromEntries(emergencias.filter((e) => e.rojo).map((e) => [e.repo, "rojo" as Color])) };
    return { texto: emergencias.flatMap((e) => e.lineas).join("\n"), curvas: emergencias.filter((e) => e.rojo).map((e) => e.repo), memoria: { ...memoria, enviados, colores, hechos } };
  }

  // ☀️ / 🌙: el resumen sale solo si hay algo nuevo (pendiente, aviso del Foco, actividad de Claude o cambio de color).
  const claves = activos.flatMap(({ datos, pendientes, actividad }) => [
    ...pendientes.map((p) => clavePendiente(datos.repo, p)),
    ...filasFoco([datos], hoy).slice(1).filter((f) => f[0] !== "🟢" && !f[4].includes("/pull/")).map((f) => claveFoco(datos.repo, f[2])),
    ...[...actividad.fusionados, ...actividad.abiertos].map((x) => claveActividad(datos.repo, x.url)),
  ]);
  const nuevas = new Set(claves.filter((k) => !memoria.enviados[k]));
  const cambioColor = activos.filter((p) => p.datos.estado && memoria.colores[p.datos.repo] !== p.datos.estado.salud.color);
  if (momento !== "semanal" && !nuevas.size && !cambioColor.length) return nada;

  const actividadVista = new Set(Object.keys(memoria.enviados).filter((k) => k.includes("|claude|")));
  const semanal = momento === "semanal";
  let texto = resumenDiario(proyectos, hoy, { titulo: TITULO[momento], nuevas, actividadVista, sinActividad: semanal, sinProyectos: semanal });
  const desviosSemana: Record<string, number> = {};
  if (semanal) texto = [texto, "", ...seccionSemanal(proyectos, memoria, hoy, desviosSemana)].join("\n");
  // Curvas: solo de los proyectos cuyo desvío se movió un día o más, o cuya fase cambió.
  const curvas: string[] = [];
  const memoriaCurvas = { ...memoria.curvas };
  for (const { datos } of activos) {
    const c = curvaProyecto(datos, hoy);
    if (!c) continue;
    const fase = datos.estado?.fase?.titulo ?? null;
    const antes = memoria.curvas[datos.repo];
    if (semanal || !antes || Math.abs(antes.desvio - c.desvio) >= 1 || antes.fase !== fase) curvas.push(datos.repo);
    memoriaCurvas[datos.repo] = { desvio: c.desvio, fase };
  }
  const enviados = { ...memoria.enviados, ...Object.fromEntries(claves.map((k) => [k, memoria.enviados[k] ?? ahora])) };
  const colores = { ...memoria.colores, ...Object.fromEntries(activos.filter((p) => p.datos.estado).map((p) => [p.datos.repo, p.datos.estado!.salud.color])) };
  return { texto, curvas, memoria: { enviados, colores, curvas: memoriaCurvas, semanal: semanal ? { ...memoria.semanal, ...desviosSemana } : memoria.semanal, hechos } };
}

/** Lo propio del sábado: cómo terminó la semana (con tendencia), lo que hizo Claude en 7 días y las ideas nuevas. */
function seccionSemanal(proyectos: ParaResumen[], memoria: Memoria, hoy: string, desvios: Record<string, number>): string[] {
  const lineas = ["📈 <b>Cómo terminó la semana</b>"];
  for (const { datos } of proyectos) {
    const e = datos.estado;
    if (e?.salud.pausa) {
      lineas.push(`⏸️ ${html(nombre(datos.repo))} · en pausa`);
      continue;
    }
    const f = faseEnCurso(datos, hoy);
    const c = curvaProyecto(datos, hoy);
    if (c) desvios[datos.repo] = c.desvio;
    const partes = [
      f ? `${f.titulo} · ${f.hechos} de ${f.hechos + f.enRevision + f.porHacer} tickets` : "sin fase abierta",
      c ? desvioTexto(c.desvio) : "",
      c ? tendencia(c.desvio, memoria.semanal?.[datos.repo]) : "",
    ].filter(Boolean);
    lineas.push(`${e?.salud.emoji ?? "·"} ${html(nombre(datos.repo))} · ${html(partes.join(" · "))}`);
  }
  const prs = proyectos.reduce((n, p) => n + (p.semana?.prsFusionados ?? 0), 0);
  const tickets = proyectos.reduce((n, p) => n + (p.semana?.ticketsCerrados ?? 0), 0);
  lineas.push("", `🤖 Claude esta semana: ${prs} ${prs === 1 ? "PR fusionado" : "PRs fusionados"} · ${tickets} ${tickets === 1 ? "ticket cerrado" : "tickets cerrados"}`);
  // Ideas nuevas: las 3 más recientes de cada proyecto y el link a todas (una lista larga no se lee en el celular).
  const conIdeas = proyectos.filter((p) => p.semana?.ideas.length);
  const total = conIdeas.reduce((n, p) => n + p.semana!.ideas.length, 0);
  if (total) {
    lineas.push("", `💡 <b>Parking lot: ${total} ${total === 1 ? "idea nueva" : "ideas nuevas"}</b> (decide si entran en la próxima fase)`);
    for (const p of conIdeas) {
      const ideas = p.semana!.ideas;
      const mas = ideas.length > 3 ? ` · y ${ideas.length - 3} más` : "";
      lineas.push(`• ${html(nombre(p.datos.repo))}: ${ideas.slice(0, 3).map(html).join(" · ")}${mas} · <a href="https://github.com/${html(p.datos.repo)}/blob/main/PROYECTO.md">ver todas</a>`);
    }
  }
  return lineas;
}
