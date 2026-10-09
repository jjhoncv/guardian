// Revisión semanal del sábado (Fase 5, T4): la tendencia del desvío y las ideas nuevas del Parking lot,
// para decidir qué entra en la siguiente fase.

const DIA = 86_400_000;

/** Ideas del Parking lot de un PROYECTO.md de los últimos 7 días, más recientes primero (las tachadas ya se hicieron).
 * El título es el comienzo de la idea, hasta « — », « (» o «: ». */
export function ideasNuevas(proyecto: string, hoy: string): string[] {
  const seccion = proyecto.match(/^##[^\n]*Parking lot[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im)?.[1] ?? "";
  const desde = new Date(Date.parse(hoy) - 7 * DIA).toISOString().slice(0, 10);
  return seccion
    .split("\n")
    .filter((l) => l.startsWith("- ") && !l.startsWith("- ~~"))
    .map((l) => ({ fecha: l.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "", texto: l.slice(2).replace(/\*\*|`/g, "") }))
    .filter((x) => x.fecha >= desde)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(({ texto }) => {
      const titulo = texto.split(/ — | \(|: /)[0].replace(/:$/, "").trim();
      return titulo.length > 90 ? `${titulo.slice(0, 89)}…` : titulo;
    });
}

/** Cómo cambió el desvío en la semana (desvío > 0 = atrasado). */
export function tendencia(hoy: number, haceUnaSemana: number | undefined): string {
  if (haceUnaSemana === undefined) return "";
  const cambio = hoy - haceUnaSemana;
  if (cambio === 0) return "igual que hace una semana";
  const dias = `${Math.abs(cambio)} ${Math.abs(cambio) === 1 ? "día" : "días"}`;
  return cambio > 0 ? `⚠️ ${dias} peor que hace una semana` : `✅ ${dias} mejor que hace una semana`;
}
