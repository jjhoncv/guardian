// Política de avisos (Fase 5): el Guardián habla solo en las ventanas del dueño y solo con novedades.
// Lunes a sábado: ☀️ 8:00 «buenos días», 🌙 19:00 «cierre del día» y 🚨 emergencias dentro de 8:00–9:00 y
// 19:00–22:00 (Lima). Domingo: silencio. Cada cosa se avisa una vez; sin novedades, no se manda nada.
import { curvaProyecto, filasFoco } from "./hoja.ts";
import { claveActividad, claveFoco, clavePendiente, resumenDiario, type ParaResumen } from "./resumen.ts";
import type { Color } from "./salud.ts";
import { html } from "./telegram.ts";

/** Lo que el Guardián ya avisó (se guarda en la rama `avisos` del repo del Guardián). */
export type Memoria = { enviados: Record<string, string>; colores: Record<string, Color>; curvas: Record<string, { desvio: number; fase: string | null }> };
export type Momento = "manana" | "noche" | "emergencias" | "nada";
export type Decision = { texto: string | null; curvas: string[]; memoria: Memoria };

/** Día de la semana (0 = domingo) y minutos del día en Lima (UTC−5, sin horario de verano). */
function lima(iso: string) {
  const d = new Date(Date.parse(iso) - 5 * 3_600_000);
  return { dia: d.getUTCDay(), minutos: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export function enVentana(iso: string): boolean {
  const { dia, minutos } = lima(iso);
  return dia !== 0 && ((minutos >= 8 * 60 && minutos < 9 * 60) || (minutos >= 19 * 60 && minutos < 22 * 60));
}

/** Qué toca según la hora (el workflow también lo indica según su horario). */
export function momentoDe(iso: string): Momento {
  if (!enVentana(iso)) return "nada";
  const { minutos } = lima(iso);
  if (minutos < 8 * 60 + 30) return "manana";
  if (minutos >= 19 * 60 && minutos < 19 * 60 + 30) return "noche";
  return "emergencias";
}

const TITULO = { manana: "☀️ <b>Buenos días</b>", noche: "🌙 <b>Cierre del día</b>" };
const EMOJI: Record<Color, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚫" };
const nombre = (repo: string) => repo.split("/")[1];

export function decidir(proyectos: ParaResumen[], memoria: Memoria, hoy: string, momento: Momento = momentoDe(hoy)): Decision {
  const nada: Decision = { texto: null, curvas: [], memoria };
  if (momento === "nada" || !enVentana(hoy)) return nada;
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
    return { texto: emergencias.flatMap((e) => e.lineas).join("\n"), curvas: emergencias.filter((e) => e.rojo).map((e) => e.repo), memoria: { ...memoria, enviados, colores } };
  }

  // ☀️ / 🌙: el resumen sale solo si hay algo nuevo (pendiente, aviso del Foco, actividad de Claude o cambio de color).
  const claves = activos.flatMap(({ datos, pendientes, actividad }) => [
    ...pendientes.map((p) => clavePendiente(datos.repo, p)),
    ...filasFoco([datos], hoy).slice(1).filter((f) => f[0] !== "🟢" && !f[4].includes("/pull/")).map((f) => claveFoco(datos.repo, f[2])),
    ...[...actividad.fusionados, ...actividad.abiertos].map((x) => claveActividad(datos.repo, x.url)),
  ]);
  const nuevas = new Set(claves.filter((k) => !memoria.enviados[k]));
  const cambioColor = activos.filter((p) => p.datos.estado && memoria.colores[p.datos.repo] !== p.datos.estado.salud.color);
  if (!nuevas.size && !cambioColor.length) return nada;

  const actividadVista = new Set(Object.keys(memoria.enviados).filter((k) => k.includes("|claude|")));
  const texto = resumenDiario(proyectos, hoy, { titulo: TITULO[momento], nuevas, actividadVista });
  // Curvas: solo de los proyectos cuyo desvío se movió un día o más, o cuya fase cambió.
  const curvas: string[] = [];
  const memoriaCurvas = { ...memoria.curvas };
  for (const { datos } of activos) {
    const c = curvaProyecto(datos, hoy);
    if (!c) continue;
    const fase = datos.estado?.fase?.titulo ?? null;
    const antes = memoria.curvas[datos.repo];
    if (!antes || Math.abs(antes.desvio - c.desvio) >= 1 || antes.fase !== fase) curvas.push(datos.repo);
    memoriaCurvas[datos.repo] = { desvio: c.desvio, fase };
  }
  const enviados = { ...memoria.enviados, ...Object.fromEntries(claves.map((k) => [k, memoria.enviados[k] ?? ahora])) };
  const colores = { ...memoria.colores, ...Object.fromEntries(activos.filter((p) => p.datos.estado).map((p) => [p.datos.repo, p.datos.estado!.salud.color])) };
  return { texto, curvas, memoria: { enviados, colores, curvas: memoriaCurvas } };
}
