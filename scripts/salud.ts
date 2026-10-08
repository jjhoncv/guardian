// Salud de un proyecto (PROYECTO.md, sección 11; ADR 0026). Mide si el dueño desbloquea a Claude,
// no si programó. Función pura: el workflow de estado le pasa lo que lee de GitHub.

export type Color = "verde" | "amarillo" | "rojo" | "gris";
export type EstadoSalud = {
  hoy: string;
  /** Fase actual (milestone «Fase N» abierto de número más bajo) y su fecha objetivo. */
  fase: { titulo: string; vence: string | null } | null;
  /** PRs que esperan la revisión del dueño, con la fecha desde la que esperan. */
  prsEsperando: { numero: number; desde: string }[];
  /** Desde cuándo el último CI de `main` está en rojo; null si está en verde. */
  mainEnRojoDesde: string | null;
  ultimaActividad: string;
  /** Modo pausa: un issue abierto con la etiqueta `pausa`. */
  pausa: boolean;
  colorAnterior?: Color;
};
/** Algo que atender: qué pasa y qué hacer. Ordenadas de más a menos grave. */
export type Alerta = { gravedad: "rojo" | "amarillo" | "gris"; texto: string; accion: string; pr?: number };
export type Salud = { color: Color; emoji: string; motivos: string[]; /** Opcional: los estado.json de versiones anteriores no la traen. */ alertas?: Alerta[]; diasAtraso: number; pausa: boolean };

const DIA = 86_400_000;
const EMOJI: Record<Color, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚫" };
const dias = (desde: string, hasta: string) => Math.floor((Date.parse(hasta) - Date.parse(desde)) / DIA);

const ACCION = {
  atraso: "Decide: achicar el alcance de la fase o reprogramar su fecha",
  main: "Mira el último CI de main: algo se rompió y bloquea a Claude",
  pr: (n: number) => `Revisa el preview y aprueba o comenta el PR #${n}`,
  inactivo: "Pausa (issue con la etiqueta pausa) o cierre consciente del proyecto",
};

export function calcularSalud(e: EstadoSalud): Salud {
  const salud = (color: Color, alertas: Alerta[], diasAtraso = 0, pausa = false, motivos = alertas.map((a) => a.texto)): Salud => ({ color, emoji: EMOJI[color], motivos, alertas, diasAtraso, pausa });

  if (e.pausa) return salud(e.colorAnterior ?? "verde", [], 0, true, ["En pausa: la barra está congelada"]);

  const atraso = e.fase?.vence ? Math.max(0, dias(e.fase.vence, e.hoy)) : 0;
  const inactivo = dias(e.ultimaActividad, e.hoy);
  if (inactivo >= 14) return salud("gris", [{ gravedad: "gris", texto: `${inactivo} días sin actividad: ¿pausa o cierre consciente?`, accion: ACCION.inactivo }], atraso);

  const rojo: Alerta[] = [];
  const amarillo: Alerta[] = [];
  if (atraso > 3) rojo.push({ gravedad: "rojo", texto: `«${e.fase!.titulo}» lleva ${atraso} días de atraso`, accion: ACCION.atraso, pr: undefined });
  else if (atraso >= 1) amarillo.push({ gravedad: "amarillo", texto: `«${e.fase!.titulo}» lleva ${atraso} ${atraso === 1 ? "día" : "días"} de atraso`, accion: ACCION.atraso, pr: undefined });
  if (e.mainEnRojoDesde && Date.parse(e.hoy) - Date.parse(e.mainEnRojoDesde) > DIA) rojo.push({ gravedad: "rojo", texto: "`main` está en rojo hace más de 24 h", accion: ACCION.main, pr: undefined });
  for (const pr of e.prsEsperando) {
    if (Date.parse(e.hoy) - Date.parse(pr.desde) > DIA) amarillo.push({ gravedad: "amarillo", texto: `El PR #${pr.numero} espera tu revisión hace más de 24 h`, accion: ACCION.pr(pr.numero), pr: pr.numero });
  }

  if (rojo.length) return salud("rojo", [...rojo, ...amarillo], atraso);
  if (amarillo.length) return salud("amarillo", amarillo, atraso);
  return salud("verde", [], atraso);
}
