// Chequeo del PR (reglas 1 y 3 de PROYECTO.md): bloquea si no apunta a un ticket con escenario BDD;
// avisa si pasa de 300 líneas (sin contar el lockfile). Exentos: release-please, Dependabot y docs.
// En el CI: node scripts/chequeo-pr.ts  (lee $GITHUB_EVENT_PATH y consulta la API con $GITHUB_TOKEN)
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const LIMITE_LINEAS = 300;

type PR = { titulo: string; autor: string; rama: string; cuerpo: string };
type Archivo = { filename: string; additions: number; deletions: number };

export function ticketsDelCuerpo(cuerpo: string): number[] {
  return [...cuerpo.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]));
}

export function exento(pr: Omit<PR, "cuerpo">): string | null {
  if (pr.rama.startsWith("release-please--")) return "PR de release";
  if (pr.autor === "dependabot[bot]") return "Dependabot";
  if (/^docs(\(|:)/.test(pr.titulo)) return "documentación (sin código)";
  return null;
}

export function tieneEscenario(cuerpoTicket: string): boolean {
  if (/\*\*Escenario:\*\*\s*\S/.test(cuerpoTicket)) return true;
  const seccion = cuerpoTicket.match(/###\s*Escenario BDD\s*\n([\s\S]*?)(?=\n###\s|$)/i)?.[1] ?? "";
  return /\S/.test(seccion.replace(/_No response_/g, ""));
}

export function lineasCambiadas(archivos: Archivo[]): number {
  return archivos
    .filter((a) => !a.filename.endsWith("package-lock.json"))
    .reduce((total, a) => total + a.additions + a.deletions, 0);
}

export function evaluar(pr: PR, tickets: Record<number, string>, lineas: number) {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (exento(pr)) return { errores, avisos };
  const numeros = ticketsDelCuerpo(pr.cuerpo);
  if (numeros.length === 0) errores.push("Falta el ticket: el PR debe decir `Closes #N` (regla 1: sin escenario no hay código).");
  for (const n of numeros) {
    if (!(n in tickets)) errores.push(`El ticket #${n} no existe o no es un issue de este repo.`);
    else if (!tieneEscenario(tickets[n])) errores.push(`El ticket #${n} no tiene escenario BDD (sección «Escenario BDD» o línea «**Escenario:**»).`);
  }
  if (lineas > LIMITE_LINEAS) avisos.push(`PR grande: ${lineas} líneas (sin lockfile); lo ideal es menos de ${LIMITE_LINEAS} (regla 3).`);
  return { errores, avisos };
}

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${ruta}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw Object.assign(new Error(`${r.status} ${ruta}`), { status: r.status });
  return r.json() as Promise<T>;
}

async function main() {
  const { pull_request: p } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH!, "utf8"));
  const pr: PR = { titulo: p.title, autor: p.user.login, rama: p.head.ref, cuerpo: p.body ?? "" };
  const tickets: Record<number, string> = {};
  for (const n of ticketsDelCuerpo(pr.cuerpo)) {
    const issue = await api<{ body?: string; pull_request?: unknown }>(`issues/${n}`).catch(() => null);
    if (issue && !issue.pull_request) tickets[n] = issue.body ?? "";
  }
  const archivos: Archivo[] = [];
  for (let pagina = 1; ; pagina++) {
    const lote = await api<Archivo[]>(`pulls/${p.number}/files?per_page=100&page=${pagina}`);
    archivos.push(...lote);
    if (lote.length < 100) break;
  }
  const lineas = lineasCambiadas(archivos);
  const { errores, avisos } = evaluar(pr, tickets, lineas);
  const motivo = exento(pr);
  const resumen = [
    `## Chequeo del PR`,
    motivo ? `Exento: ${motivo}.` : `Tickets: ${ticketsDelCuerpo(pr.cuerpo).map((n) => `#${n}`).join(", ") || "ninguno"} · ${lineas} líneas`,
    ...errores.map((e) => `- ❌ ${e}`),
    ...avisos.map((a) => `- ⚠️ ${a}`),
    errores.length === 0 && avisos.length === 0 ? "- ✅ Todo en orden." : "",
  ].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumen + "\n");
  for (const a of avisos) console.log(`::warning title=PR grande::${a}`);
  for (const e of errores) console.log(`::error title=Chequeo del PR::${e}`);
  console.log(resumen);
  process.exitCode = errores.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
