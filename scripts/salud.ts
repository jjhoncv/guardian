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
export type Salud = { color: Color; emoji: string; motivos: string[]; diasAtraso: number; pausa: boolean };

const DIA = 86_400_000;
const EMOJI: Record<Color, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴", gris: "⚫" };
const dias = (desde: string, hasta: string) => Math.floor((Date.parse(hasta) - Date.parse(desde)) / DIA);

export function calcularSalud(e: EstadoSalud): Salud {
  const salud = (color: Color, motivos: string[], diasAtraso = 0, pausa = false): Salud => ({ color, emoji: EMOJI[color], motivos, diasAtraso, pausa });

  if (e.pausa) return salud(e.colorAnterior ?? "verde", ["En pausa: la barra está congelada"], 0, true);

  const inactivo = dias(e.ultimaActividad, e.hoy);
  if (inactivo >= 14) return salud("gris", [`${inactivo} días sin actividad: ¿pausa o cierre consciente?`]);

  const atraso = e.fase?.vence ? Math.max(0, dias(e.fase.vence, e.hoy)) : 0;
  const rojo: string[] = [];
  const amarillo: string[] = [];
  if (atraso > 3) rojo.push(`«${e.fase!.titulo}» lleva ${atraso} días de atraso`);
  else if (atraso >= 1) amarillo.push(`«${e.fase!.titulo}» lleva ${atraso} ${atraso === 1 ? "día" : "días"} de atraso`);
  if (e.mainEnRojoDesde && Date.parse(e.hoy) - Date.parse(e.mainEnRojoDesde) > DIA) rojo.push("`main` está en rojo hace más de 24 h");
  for (const pr of e.prsEsperando) {
    if (Date.parse(e.hoy) - Date.parse(pr.desde) > DIA) amarillo.push(`El PR #${pr.numero} espera tu revisión hace más de 24 h`);
  }

  if (rojo.length) return salud("rojo", [...rojo, ...amarillo], atraso);
  if (amarillo.length) return salud("amarillo", amarillo, atraso);
  return salud("verde", [], atraso);
}
