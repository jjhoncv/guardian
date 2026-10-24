// Base propia por PR para los previews (#282): <repo>_pr_<N> en el cluster de staging. Lógica pura; la conexión
// la hace tools/db/base-preview.ts. El nombre entra en SQL como identificador: se valida aquí.
const PREVIEW = /^[a-z0-9_]+_pr_\d+$/;

export function nombreBasePreview(repositorio: string, pr: number | string): string {
  const n = String(pr);
  if (!/^[1-9]\d*$/.test(n)) throw new Error(`número de PR inválido: ${n}`);
  const repo = (repositorio.split("/").pop() ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const sufijo = `_pr_${n}`;
  return repo.slice(0, 64 - sufijo.length) + sufijo;
}

export function sentencias(accion: "crear" | "borrar", nombre: string): string[] {
  if (!PREVIEW.test(nombre)) throw new Error(`${nombre} no es una base de preview`);
  const borrar = `DROP DATABASE IF EXISTS \`${nombre}\``;
  return accion === "crear" ? [borrar, `CREATE DATABASE \`${nombre}\``] : [borrar];
}
