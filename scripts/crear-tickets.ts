// Crea un issue por tarea del plan aprobado (plan/tareas.json, ADR 0019). Idempotente: cada issue
// lleva una marca con el id de la tarea y no se vuelve a crear.
// En el CI: node scripts/crear-tickets.ts plan/tareas.json  (usa $GITHUB_REPOSITORY y $GITHUB_TOKEN)
// Solo validar (sin tocar GitHub): node scripts/crear-tickets.ts plan/tareas.json --validar
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export type Fase = { numero: number; nombre: string; entregable: string };
export type Escenario = { archivo: string; gherkin: string };
export type Tarea = {
  id: string;
  fase: number;
  titulo: string;
  escenarios: Escenario[];
  que: string;
  hecho: string;
  necesita?: string;
};
export type Plan = { fases: Fase[]; tareas: Tarea[] };

export const marca = (id: string) => `<!-- guardian:tarea=${id} -->`;

export function validarPlan(plan: Plan): string[] {
  const errores: string[] = [];
  if (plan.fases.length > 5) errores.push(`El plan tiene ${plan.fases.length} fases: máximo 5 fases (regla 7).`);
  const fases = new Set(plan.fases.map((f) => f.numero));
  const vistos = new Set<string>();
  for (const t of plan.tareas) {
    if (vistos.has(t.id)) errores.push(`${t.id}: id repetido.`);
    vistos.add(t.id);
    if (!t.escenarios.length) errores.push(`${t.id}: tarea sin escenario (regla 1).`);
    if (!fases.has(t.fase)) errores.push(`${t.id}: apunta a la fase ${t.fase}, que no existe en el plan.`);
  }
  return errores;
}

export function cuerpoTicket(t: Tarea, f: Fase): string {
  const escenarios = t.escenarios.map((e) => "```gherkin\n" + e.gherkin.trim() + "\n```\nEn `" + e.archivo + "`").join("\n\n");
  return [
    `### Fase\nFase ${f.numero} — ${f.nombre}`,
    `### Escenario BDD\n${escenarios}`,
    `### Qué se hace\n${t.que}`,
    `### Criterio de hecho\n${t.hecho}`,
    `### Qué necesita del dueño\n${t.necesita?.trim() || "Nada."}`,
    `_Creado desde el plan aprobado (\`plan/tareas.json\`, tarea ${t.id})._\n${marca(t.id)}`,
  ].join("\n\n");
}

export function pendientes(tareas: Tarea[], cuerposExistentes: string[]): Tarea[] {
  return tareas.filter((t) => !cuerposExistentes.some((c) => c.includes(marca(t.id))));
}

async function api<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${ruta}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok && r.status !== 422) throw new Error(`${r.status} ${ruta}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function main() {
  const plan: Plan = JSON.parse(readFileSync(process.argv[2] ?? "plan/tareas.json", "utf8"));
  const errores = validarPlan(plan);
  if (errores.length) {
    for (const e of errores) console.log(`::error title=Plan inválido::${e}`);
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--validar")) {
    console.log(`Plan válido: ${plan.fases.length} fases, ${plan.tareas.length} tareas.`);
    return;
  }
  const existentes: string[] = [];
  for (let pagina = 1; ; pagina++) {
    const lote = await api<{ body?: string }[]>(`issues?state=all&per_page=100&page=${pagina}`);
    existentes.push(...lote.map((i) => i.body ?? ""));
    if (lote.length < 100) break;
  }
  const lineas = ["## Tickets del plan"];
  for (const f of plan.fases) {
    // 422 = la etiqueta ya existe.
    await api("labels", { method: "POST", body: JSON.stringify({ name: `fase-${f.numero}`, color: "1D76DB", description: `Fase ${f.numero} — ${f.nombre}` }) });
  }
  const nuevas = pendientes(plan.tareas, existentes);
  for (const t of nuevas) {
    const fase = plan.fases.find((f) => f.numero === t.fase)!;
    const issue = await api<{ number: number }>("issues", {
      method: "POST",
      body: JSON.stringify({ title: t.titulo, body: cuerpoTicket(t, fase), labels: [`fase-${t.fase}`] }),
    });
    lineas.push(`- #${issue.number} ${t.id} — ${t.titulo}`);
  }
  lineas.push(`\n${nuevas.length} creados; ${plan.tareas.length - nuevas.length} ya existían.`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lineas.join("\n") + "\n");
  console.log(lineas.join("\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
