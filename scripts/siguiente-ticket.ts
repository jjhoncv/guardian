// Elige el siguiente ticket para Claude (ADR 0024): el de número más bajo de la fase actual (el milestone
// «Fase N» abierto de número más bajo) que todavía no tenga un PR de Claude; nunca más de 2 PRs de Claude
// esperando revisión. No abre la fase siguiente: cerrar una fase es decisión del dueño. En el CI: node scripts/siguiente-ticket.ts → escribe ticket=<N> en $GITHUB_OUTPUT.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export type Estado = {
  milestones: { numero: number; titulo: string; abiertos: number }[];
  issues: { numero: number; milestone: number }[];
  prsDeClaude: { cierra: number[] }[];
  limite: number;
};
export type Eleccion = { ticket: number } | { motivo: string };

export function elegirSiguiente(e: Estado): Eleccion {
  if (e.prsDeClaude.length >= e.limite) {
    return { motivo: `Hay ${e.prsDeClaude.length} PRs de Claude esperando revisión (límite ${e.limite}).` };
  }
  const faseActual = e.milestones
    .filter((m) => /^Fase \d+/.test(m.titulo))
    .sort((a, b) => Number(a.titulo.match(/\d+/)![0]) - Number(b.titulo.match(/\d+/)![0]))[0];
  if (!faseActual) return { motivo: "No quedan tickets abiertos en ninguna fase." };
  if (faseActual.abiertos === 0) {
    return { motivo: `«${faseActual.titulo}» está completa: actualiza la fase en CLAUDE.md y cierra el milestone; al cerrarlo, Claude toma solo el primer ticket de la siguiente.` };
  }
  const enCurso = new Set(e.prsDeClaude.flatMap((p) => p.cierra));
  const libre = e.issues
    .filter((i) => i.milestone === faseActual.numero && !enCurso.has(i.numero))
    .sort((a, b) => a.numero - b.numero)[0];
  if (!libre) return { motivo: `Los tickets abiertos de «${faseActual.titulo}» ya tienen PR; falta tu revisión.` };
  return { ticket: libre.numero };
}

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${ruta}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${ruta}`);
  return r.json() as Promise<T>;
}

async function main() {
  type M = { number: number; title: string; open_issues: number };
  type I = { number: number; milestone: { number: number } | null; pull_request?: unknown };
  type P = { body: string | null; user: { login: string } };
  const milestones = await api<M[]>("milestones?state=open&per_page=100");
  const issues = await api<I[]>("issues?state=open&per_page=100");
  const prs = await api<P[]>("pulls?state=open&per_page=100");
  const cierra = (b: string | null) =>
    [...(b ?? "").matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]));
  const eleccion = elegirSiguiente({
    milestones: milestones.map((m) => ({ numero: m.number, titulo: m.title, abiertos: m.open_issues })),
    issues: issues.filter((i) => !i.pull_request && i.milestone).map((i) => ({ numero: i.number, milestone: i.milestone!.number })),
    prsDeClaude: prs.filter((p) => p.user.login === "claude[bot]").map((p) => ({ cierra: cierra(p.body) })),
    limite: 2,
  });
  const linea = "ticket" in eleccion ? `Siguiente ticket para Claude: #${eleccion.ticket}` : `Claude no toma otro ticket: ${eleccion.motivo}`;
  console.log(linea);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${linea}\n`);
  if (process.env.GITHUB_OUTPUT && "ticket" in eleccion) appendFileSync(process.env.GITHUB_OUTPUT, `ticket=${eleccion.ticket}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
