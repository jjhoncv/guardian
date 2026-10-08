// Estado del proyecto para el dashboard (ADR 0026): fase actual, % de avance y salud, más los badges
// de shields.io. Lo corre guardian-estado.yml, que no ejecuta código del proyecto, y lo guarda en la rama `estado`.
// Uso: node scripts/estado.ts <carpeta-salida> [avance.json]  (usa $GITHUB_REPOSITORY y $GITHUB_TOKEN)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { calcularSalud, type Color, type Salud } from "./salud.ts";

export type Avance = { verdes: number; total: number; porcentaje: number };
export type Estado = {
  proyecto: string;
  fase: { titulo: string; vence: string | null } | null;
  avance: Avance | null;
  salud: Salud;
  actualizado: string;
};
type Badge = { schemaVersion: 1; label: string; message: string; color: string };

/** Fase actual: el milestone «Fase N» abierto de número más bajo (ADR 0023). */
export function faseActual(milestones: { title: string; due_on: string | null }[]): Estado["fase"] {
  const fases = milestones
    .filter((m) => /^Fase \d+/.test(m.title))
    .sort((a, b) => Number(a.title.match(/\d+/)![0]) - Number(b.title.match(/\d+/)![0]));
  return fases[0] ? { titulo: fases[0].title, vence: fases[0].due_on } : null;
}

/** Desde cuándo el CI de `main` está en rojo (primer fallo de la racha actual); runs del más nuevo al más viejo. */
export function mainEnRojoDesde(runs: { conclusion: string | null; created_at: string; status: string }[]): string | null {
  let desde: string | null = null;
  for (const r of runs) {
    if (r.status !== "completed" || r.conclusion === "cancelled" || r.conclusion === "skipped") continue;
    if (r.conclusion !== "failure") break;
    desde = r.created_at;
  }
  return desde;
}

/** El avance llega de un job que corre el código del proyecto: solo se aceptan números. */
export function leerAvance(texto: string): Avance | null {
  try {
    const { verdes, total, porcentaje } = JSON.parse(texto);
    return [verdes, total, porcentaje].every((n) => Number.isInteger(n) && n >= 0 && n <= 100_000) ? { verdes, total, porcentaje } : null;
  } catch {
    return null;
  }
}

const COLOR_SHIELDS: Record<Color, string> = { verde: "brightgreen", amarillo: "yellow", rojo: "red", gris: "lightgrey" };

export function badges(e: Estado): Record<"fase" | "avance" | "salud", Badge> {
  const badge = (label: string, message: string, color: string): Badge => ({ schemaVersion: 1, label, message, color });
  return {
    fase: badge("fase", e.fase ? e.fase.titulo.replace(/^Fase\s+/, "") : "sin fase abierta", "blue"),
    avance: badge("avance", e.avance ? `${e.avance.verdes} de ${e.avance.total} · ${e.avance.porcentaje} %` : "sin datos", "blue"),
    salud: e.salud.pausa ? badge("salud", "⏸️ en pausa", "lightgrey") : badge("salud", `${e.salud.emoji} ${e.salud.color}`, COLOR_SHIELDS[e.salud.color]),
  };
}

async function api<T>(ruta: string): Promise<T> {
  const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${ruta}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${ruta}`);
  return r.json() as Promise<T>;
}

async function main() {
  const salida = process.argv[2] ?? "estado";
  const archivoAvance = process.argv[3];
  const anterior: Partial<Estado> = existsSync(join(salida, "estado.json")) ? JSON.parse(readFileSync(join(salida, "estado.json"), "utf8")) : {};
  // Sin un avance nuevo (corrida diaria), se mantiene el último conocido.
  const avance = archivoAvance && existsSync(archivoAvance) ? leerAvance(readFileSync(archivoAvance, "utf8")) : (anterior.avance ?? null);

  type Run = { name: string; conclusion: string | null; created_at: string; status: string };
  const [milestones, pausa, pulls, runs, commits, ultimoIssue] = await Promise.all([
    api<{ title: string; due_on: string | null }[]>("milestones?state=open&per_page=100"),
    api<unknown[]>("issues?state=open&labels=pausa&per_page=1"),
    api<{ number: number; draft: boolean; created_at: string; user: { login: string } }[]>("pulls?state=open&per_page=100"),
    api<{ workflow_runs: Run[] }>("actions/runs?branch=main&event=push&per_page=50"),
    api<{ commit: { committer: { date: string } } }[]>("commits?sha=main&per_page=1"),
    api<{ updated_at: string }[]>("issues?state=all&sort=updated&direction=desc&per_page=1"),
  ]);
  const hoy = new Date().toISOString();
  const fase = faseActual(milestones);
  const salud = calcularSalud({
    hoy,
    fase,
    prsEsperando: pulls.filter((p) => !p.draft && p.user.login === "claude[bot]").map((p) => ({ numero: p.number, desde: p.created_at })),
    mainEnRojoDesde: mainEnRojoDesde(runs.workflow_runs.filter((r) => r.name === "CI")),
    ultimaActividad: [commits[0]?.commit.committer.date, ultimoIssue[0]?.updated_at].filter(Boolean).sort().at(-1) ?? hoy,
    pausa: pausa.length > 0,
    colorAnterior: anterior.salud?.color,
  });
  const estado: Estado = { proyecto: process.env.GITHUB_REPOSITORY!.split("/")[1], fase, avance, salud, actualizado: hoy };

  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, "estado.json"), JSON.stringify(estado, null, 2) + "\n");
  for (const [nombre, b] of Object.entries(badges(estado))) writeFileSync(join(salida, `${nombre}.json`), JSON.stringify(b) + "\n");
  const linea = `${salud.emoji} ${estado.proyecto}: ${fase?.titulo ?? "sin fase abierta"} · ${avance ? `${avance.porcentaje} %` : "avance sin datos"}${salud.motivos.length ? ` · ${salud.motivos.join(" · ")}` : ""}`;
  console.log(linea);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Estado\n\n${linea}\n`, { flag: "a" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
