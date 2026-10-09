// Lector de GitHub compartido por el Sheet (Fase 4) y los avisos (Fase 5): proyectos con el topic
// `guardian-proyecto`, su estado, fases y tickets, más lo que espera una acción del dueño y lo que hizo Claude.
import type { Estado } from "./estado.ts";
import type { DatosProyecto } from "./hoja.ts";

const DIA = 86_400_000;
const CLAUDE = "claude[bot]";

type Pr = { number: number; title: string; html_url: string; user: { login: string }; draft: boolean; created_at: string; head: { ref: string } };
type Issue = { number: number; title: string; html_url: string; labels: { name: string }[]; pull_request?: unknown };
type Comentario = { issue_url: string; html_url: string; user: { login: string }; body: string; created_at: string };
type PrReciente = { number: number; title: string; user: { login: string }; created_at: string; merged_at: string | null; html_url: string };
type Milestone = DatosProyecto["milestones"][number] & { html_url: string };

/** Lo que se lee de GitHub para los avisos (sin estado ni tickets, que van en DatosProyecto). */
export type Crudo = {
  repo: string;
  prs: Pr[];
  esperandoAprobacion: { html_url: string; display_title: string }[];
  milestones: Milestone[];
  issuesAbiertos: Issue[];
  comentarios: Comentario[];
  prsRecientes: PrReciente[];
  ticketsCerradosRecientes: number;
};

export type Pendiente = { tipo: "alerta" | "deploy" | "pr" | "pregunta" | "release" | "fase"; urgente: boolean; texto: string; accion: string; url: string };
export type Actividad = { fusionados: { numero: number; titulo: string; url: string }[]; abiertos: { numero: number; titulo: string; url: string }[]; ticketsCerrados: number };

const ORDEN: Record<Pendiente["tipo"], number> = { alerta: 0, deploy: 1, pr: 2, pregunta: 3, release: 4, fase: 5 };
/** «feat(#12): filtro de categorías» → «filtro de categorías». */
const sinPrefijo = (titulo: string) => titulo.replace(/^\w+(\([^)]*\))?!?:\s*/, "");
const numeroDe = (issueUrl: string) => Number(issueUrl.split("/").at(-1));

/** Primera línea útil de un comentario de Claude, sin Markdown (para el aviso). */
function primeraLinea(cuerpo: string): string {
  const linea = cuerpo
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !/^(#|---|- \[|\*\*Claude finished|·|>)/.test(l)) ?? "";
  const limpia = linea.replace(/\*\*|`|\[([^\]]*)\]\([^)]*\)/g, (_, texto) => texto ?? "");
  return limpia.length > 120 ? `${limpia.slice(0, 119)}…` : limpia;
}

/** Todo lo que espera una acción del dueño, de más a menos urgente, con su link. */
export function pendientesDe(c: Crudo, hoy: string): Pendiente[] {
  const p: (Pendiente & { desde?: string })[] = [];
  for (const i of c.issuesAbiertos.filter((i) => i.labels.some((l) => l.name === "alerta"))) {
    p.push({ tipo: "alerta", urgente: true, texto: `Alerta: «${i.title}»`, accion: "Revisa qué pasó en producción", url: i.html_url });
  }
  for (const r of c.esperandoAprobacion) {
    p.push({ tipo: "deploy", urgente: true, texto: `Deploy a producción esperando tu aprobación: «${r.display_title}»`, accion: "Review deployments → Approve", url: r.html_url });
  }
  for (const pr of c.prs.filter((x) => !x.draft)) {
    if (pr.head.ref.startsWith("release-please--")) {
      const version = pr.title.match(/release\s+(\S+)/)?.[1] ?? pr.title;
      p.push({ tipo: "release", urgente: false, texto: `Release «${version}» listo para fusionar`, accion: "Fusiónalo (bypass) y aprueba el deploy", url: pr.html_url });
    } else if (pr.user.login === CLAUDE) {
      const dias = Math.floor((Date.parse(hoy) - Date.parse(pr.created_at)) / DIA);
      p.push({
        tipo: "pr",
        urgente: dias >= 1,
        texto: `PR #${pr.number} «${sinPrefijo(pr.title)}» te espera ${dias >= 1 ? `hace ${dias} ${dias === 1 ? "día" : "días"}` : "desde hoy"}`,
        accion: "Revisa el preview y aprueba o comenta",
        url: pr.html_url,
        desde: pr.created_at,
      });
    }
  }
  // Claude te escribió: su último comentario en un ticket abierto (no PR: eso lo cubre la revisión) sin respuesta tuya.
  const ultimo = new Map<number, Comentario>();
  for (const k of [...c.comentarios].sort((a, b) => a.created_at.localeCompare(b.created_at))) ultimo.set(numeroDe(k.issue_url), k);
  for (const i of c.issuesAbiertos.filter((i) => !i.pull_request)) {
    const k = ultimo.get(i.number);
    if (k?.user.login === CLAUDE) {
      p.push({ tipo: "pregunta", urgente: false, texto: `Claude te escribió en #${i.number} «${i.title}»: «${primeraLinea(k.body)}»`, accion: "Respóndele con @claude", url: k.html_url });
    }
  }
  for (const m of c.milestones.filter((m) => /^Fase \d+/.test(m.title) && m.state === "open" && m.open_issues === 0 && m.closed_issues > 0)) {
    p.push({ tipo: "fase", urgente: false, texto: `«${m.title}» está completa (${m.closed_issues} de ${m.closed_issues})`, accion: "Revisa el Parking lot y ciérrala para abrir la siguiente", url: m.html_url });
  }
  return p
    .sort((a, b) => ORDEN[a.tipo] - ORDEN[b.tipo] || Number(b.urgente) - Number(a.urgente) || (a.desde ?? "").localeCompare(b.desde ?? ""))
    .map((x) => {
      const sinFecha: Pendiente & { desde?: string } = { ...x };
      delete sinFecha.desde;
      return sinFecha;
    });
}

/** Lo que hizo Claude en las últimas 24 h. */
export function actividadDe(c: Crudo, hoy: string): Actividad {
  const desde = new Date(Date.parse(hoy) - DIA).toISOString();
  const deClaude = c.prsRecientes.filter((p) => p.user.login === CLAUDE);
  const item = (p: PrReciente) => ({ numero: p.number, titulo: sinPrefijo(p.title), url: p.html_url });
  return {
    fusionados: deClaude.filter((p) => p.merged_at && p.merged_at > desde).map(item),
    abiertos: deClaude.filter((p) => !p.merged_at && p.created_at > desde).map(item),
    ticketsCerrados: c.ticketsCerradosRecientes,
  };
}

// ——— Lectura desde GitHub (red) ———

type GitHub = <T>(ruta: string) => Promise<T>;

export function clienteGitHub(token: string): GitHub {
  return async <T>(ruta: string) => {
    const r = await fetch(`https://api.github.com/${ruta}`, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(`GitHub ${r.status} ${ruta}`);
    return r.json() as Promise<T>;
  };
}

/** Todas las páginas de una lista de GitHub (los repos grandes pasan de 100 tickets). */
async function todas<T>(github: GitHub, ruta: string): Promise<T[]> {
  const items: T[] = [];
  for (let pagina = 1; pagina <= 20; pagina++) {
    const lote = await github<T[]>(`${ruta}${ruta.includes("?") ? "&" : "?"}per_page=100&page=${pagina}`);
    items.push(...lote);
    if (lote.length < 100) break;
  }
  return items;
}

/** Los proyectos del dueño: repos con el topic `guardian-proyecto`. */
export async function reposDelDueno(github: GitHub, dueno: string): Promise<string[]> {
  const { items } = await github<{ items: { full_name: string }[] }>(`search/repositories?q=${encodeURIComponent(`topic:guardian-proyecto user:${dueno}`)}&per_page=100`);
  return items.map((r) => r.full_name).sort();
}

/** Estado, fases y tickets de un proyecto (para el Sheet y los avisos). */
export async function leerProyecto(github: GitHub, repo: string): Promise<DatosProyecto> {
  type IssueTodo = { number: number; title: string; state: string; created_at: string; closed_at: string | null; milestone: { title: string } | null; pull_request?: unknown };
  const [respuestaEstado, milestones, issues, pulls] = await Promise.all([
    fetch(`https://raw.githubusercontent.com/${repo}/estado/estado.json`),
    github<DatosProyecto["milestones"]>(`repos/${repo}/milestones?state=all&per_page=100`),
    todas<IssueTodo>(github, `repos/${repo}/issues?state=all`),
    github<{ body: string | null }[]>(`repos/${repo}/pulls?state=open&per_page=100`),
  ]);
  const estado = respuestaEstado.ok ? ((await respuestaEstado.json()) as Estado) : null;
  // Un ticket está «en revisión» si un PR abierto lo cierra.
  const enRevision = new Set(pulls.flatMap((p) => [...(p.body ?? "").matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]))));
  const tareas: DatosProyecto["tareas"] = issues
    .filter((i) => !i.pull_request && i.milestone && /^Fase \d+/.test(i.milestone.title))
    .map((i) => ({
      numero: i.number,
      titulo: i.title,
      fase: i.milestone!.title,
      estado: i.state === "closed" ? "hecho" : enRevision.has(i.number) ? "en revisión" : "abierto",
      creado: i.created_at,
      cerrado: i.closed_at,
    }));
  return { repo, estado, milestones, tareas };
}

/** Lo que hace falta para los avisos: PRs, aprobaciones, comentarios y actividad reciente. */
export async function leerCrudo(github: GitHub, repo: string, hoy: string): Promise<Crudo> {
  const ayer = new Date(Date.parse(hoy) - DIA).toISOString();
  const semana = new Date(Date.parse(hoy) - 7 * DIA).toISOString();
  const [prs, esperando, milestones, issuesAbiertos, comentarios, prsRecientes, cerrados] = await Promise.all([
    github<Pr[]>(`repos/${repo}/pulls?state=open&per_page=100`),
    github<{ workflow_runs: { html_url: string; display_title: string }[] }>(`repos/${repo}/actions/runs?status=waiting&per_page=20`),
    github<Milestone[]>(`repos/${repo}/milestones?state=open&per_page=100`),
    todas<Issue>(github, `repos/${repo}/issues?state=open`),
    github<Comentario[]>(`repos/${repo}/issues/comments?since=${semana}&sort=created&direction=desc&per_page=100`),
    github<PrReciente[]>(`repos/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=50`),
    github<{ pull_request?: unknown; closed_at: string | null }[]>(`repos/${repo}/issues?state=closed&since=${ayer}&per_page=100`),
  ]);
  return {
    repo,
    prs,
    esperandoAprobacion: esperando.workflow_runs,
    milestones,
    issuesAbiertos,
    comentarios,
    prsRecientes,
    // `since` filtra por última actualización: se cuentan solo los cerrados en las últimas 24 h.
    ticketsCerradosRecientes: cerrados.filter((i) => !i.pull_request && (i.closed_at ?? "") > ayer).length,
  };
}

/** Para la revisión semanal: PRs de Claude fusionados y tickets cerrados en 7 días, e ideas nuevas del Parking lot. */
export async function leerSemana(github: GitHub, repo: string, hoy: string): Promise<{ ideas: string[]; prsFusionados: number; ticketsCerrados: number }> {
  const { ideasNuevas } = await import("./semanal.ts");
  const desde = new Date(Date.parse(hoy) - 7 * DIA).toISOString();
  const [prs, cerrados, proyecto] = await Promise.all([
    github<PrReciente[]>(`repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`),
    todas<{ pull_request?: unknown; closed_at: string | null }>(github, `repos/${repo}/issues?state=closed&since=${desde}`),
    github<{ content: string }>(`repos/${repo}/contents/PROYECTO.md`).catch(() => null),
  ]);
  return {
    ideas: proyecto ? ideasNuevas(Buffer.from(proyecto.content, "base64").toString("utf8"), hoy) : [],
    prsFusionados: prs.filter((p) => p.user.login === CLAUDE && p.merged_at && p.merged_at > desde).length,
    ticketsCerrados: cerrados.filter((i) => !i.pull_request && (i.closed_at ?? "") > desde).length,
  };
}
