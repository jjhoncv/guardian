import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Nombre del proyecto: el texto del primer título `# ...` del markdown. */
export function nombreDelProyecto(markdown: string): string {
  const titulo = markdown.match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (!titulo) {
    throw new Error("PROYECTO.md debe empezar con un título `# Nombre del proyecto`.");
  }
  return titulo[1];
}

/** Lee el nombre desde el PROYECTO.md de la raíz del repo (en build). */
export function leerNombreDelProyecto(): string {
  return nombreDelProyecto(readFileSync(join(process.cwd(), "PROYECTO.md"), "utf8"));
}
