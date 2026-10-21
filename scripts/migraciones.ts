// Migraciones de los proyectos con base de datos (ADR 0029): qué archivos de db/migraciones/ faltan aplicar.
// Lógica pura; la conexión a MySQL vive en tools/db/migrar.ts. Una migración aplicada no se edita: se crea otra.
import { createHash } from "node:crypto";

export type Archivo = { nombre: string; contenido: string };
export type Aplicada = { nombre: string; checksum: string };
export type Plan = { pendientes: Archivo[]; errores: string[] };

const FORMATO = /^(\d{3})-[a-z0-9-]+\.sql$/;

/** Huella del contenido, sin importar los fines de línea (Windows o Unix). */
export function checksum(contenido: string): string {
  return createHash("sha256").update(contenido.replace(/\r\n/g, "\n")).digest("hex");
}

/** Las migraciones a aplicar, en orden, o los errores que impiden aplicarlas. */
export function planificar(archivos: Archivo[], aplicadas: Aplicada[]): Plan {
  const errores: string[] = [];
  const sql = archivos.filter((a) => a.nombre.endsWith(".sql"));

  for (const a of sql) {
    if (!FORMATO.test(a.nombre)) errores.push(`${a.nombre} no sigue el formato NNN-nombre.sql (p. ej. 001-crear-usuarios.sql)`);
  }
  const validas = sql.filter((a) => FORMATO.test(a.nombre)).sort((x, y) => x.nombre.localeCompare(y.nombre));

  for (let i = 1; i < validas.length; i++) {
    const [antes, ahora] = [validas[i - 1].nombre, validas[i].nombre];
    if (antes.slice(0, 3) === ahora.slice(0, 3)) errores.push(`${antes} y ${ahora} repiten el número ${ahora.slice(0, 3)}`);
  }

  const hechas = new Map(aplicadas.map((a) => [a.nombre, a.checksum]));
  for (const a of validas) {
    const huella = hechas.get(a.nombre);
    if (huella && huella !== checksum(a.contenido)) errores.push(`${a.nombre} ya se aplicó y su contenido cambió: no la edites, crea una migración nueva`);
  }

  const ultima = [...hechas.keys()].sort().at(-1);
  const pendientes = validas.filter((a) => !hechas.has(a.nombre));
  for (const a of pendientes) {
    if (ultima && a.nombre < ultima) errores.push(`${a.nombre} está fuera de orden: la última aplicada es ${ultima}; usa un número mayor`);
  }

  return errores.length ? { pendientes: [], errores } : { pendientes, errores };
}
