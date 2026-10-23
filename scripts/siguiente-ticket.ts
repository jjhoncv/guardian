// Elige el siguiente ticket para Claude (ADR 0024): el de número más bajo de la fase actual (el milestone
// «Fase N» abierto de número más bajo) que todavía no tenga un PR de Claude; nunca más de 2 PRs de Claude
// esperando revisión; salta los que dependen de un ticket abierto (#272, sección «Depende de»). No abre la fase siguiente: cerrar una fase es decisión del dueño. En el CI: node scripts/siguiente-ticket.ts → escribe ticket=<N> en $GITHUB_OUTPUT.
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export type Estado = {
  milestones: { numero: number; titulo: string; abiertos: number }[];
  issues: { numero: number; milestone: number; depende?: number[] }[];
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
  const abiertos = new Set(e.issues.map((i) => i.numero));
  const sinPr = e.issues.filter((i) => i.milestone === faseActual.numero && !enCurso.has(i.numero)).sort((a, b) => a.numero - b.numero);
  if (!sinPr.length) return { motivo: `Los tickets abiertos de «${faseActual.titulo}» ya tienen PR; falta tu revisión.` };
  const espera = (i: (typeof sinPr)[number]) => (i.depende ?? []).filter((d) => abiertos.has(d));
  const libre = sinPr.find((i) => !espera(i).length);
  if (!libre) {
    const detalle = sinPr.map((i) => `#${i.numero} espera a ${espera(i).map((d) => `#${d}`).join(", ")}`).join("; ");
    return { motivo: `Los tickets libres de «${faseActual.titulo}» esperan a otros: ${detalle}.` };
  }
  return { ticket: libre.numero };
}

/** Los #N de la sección «Depende de» del ticket (la escribe crear-tickets.ts, ADR 0031). */
export function dependencias(cuerpo: string | null): number[] {
  const seccion = (cuerpo ?? "").match(/###\s*Depende de\s*\n([\s\S]*?)(?=\n###\s|$)/i)?.[1] ?? "";
  return [...seccion.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
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
  type I = { number: number; body: string | null; milestone: { number: number } | null; pull_request?: unknown };
  type P = { body: string | null; user: { login: string } };
  const milestones = await api<M[]>("milestones?state=open&per_page=100");
  const issues = await api<I[]>("issues?state=open&per_page=100");
  const prs = await api<P[]>("pulls?state=open&per_page=100");
  const cierra = (b: string | null) =>
    [...(b ?? "").matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]));
  const eleccion = elegirSiguiente({
    milestones: milestones.map((m) => ({ numero: m.number, titulo: m.title, abiertos: m.open_issues })),
    issues: issues.filter((i) => !i.pull_request && i.milestone).map((i) => ({ numero: i.number, milestone: i.milestone!.number, depende: dependencias(i.body) })),
    prsDeClaude: prs.filter((p) => p.user.login === "claude[bot]").map((p) => ({ cierra: cierra(p.body) })),
    limite: 2,
  });
  const linea = "ticket" in eleccion ? `Siguiente ticket para Claude: #${eleccion.ticket}` : `Claude no toma otro ticket: ${eleccion.motivo}`;
  console.log(linea);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${linea}\n`);
  if (process.env.GITHUB_OUTPUT && "ticket" in eleccion) appendFileSync(process.env.GITHUB_OUTPUT, `ticket=${eleccion.ticket}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
