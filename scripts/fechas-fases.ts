// Fecha objetivo de cada fase (ADR 0026): las semanas disponibles de PROYECTO.md → Límites se reparten
// entre las fases; sin fechas no hay atraso que medir para la salud del proyecto.

/** Semanas disponibles según la sección «Límites»: «**Tiempo:** 6 semanas…» o «**Semanas:** 6». */
export function semanasDisponibles(proyecto: string): number | null {
  const limites = proyecto.match(/^##\s*(?:\d+\.\s*)?Límites\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m)?.[1] ?? "";
  const n = limites.match(/\*\*(?:Tiempo|Semanas):\*\*\s*(\d+)/i)?.[1];
  return n ? Number(n) : null;
}

/** Vencimiento de cada fase (ISO, mediodía UTC para que no cambie de día por zona horaria). */
export function fechasObjetivo(fases: number, semanas: number, inicio: Date): string[] {
  const dias = semanas * 7;
  const base = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate(), 12);
  return Array.from({ length: fases }, (_, i) => {
    const fecha = new Date(base + Math.round(((i + 1) * dias) / fases) * 86_400_000);
    return fecha.toISOString().replace(".000Z", "Z");
  });
}
