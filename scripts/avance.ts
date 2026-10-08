// Avance del proyecto = % de escenarios BDD del alcance en verde (PROYECTO.md, sección 5).
// Lee el reporte JSON de Playwright; los escenarios @plantilla no cuentan.
// Uso: node scripts/avance.ts test-results/resultados.json  (escribe en $GITHUB_STEP_SUMMARY si existe)
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

type Spec = { title: string; tags?: string[]; tests: { status?: string }[] };
type Suite = { specs?: Spec[]; suites?: Suite[] };
type Rojo = { titulo: string; estado: "pendiente" | "falla" };
export type Avance = { total: number; verdes: number; porcentaje: number; rojos: Rojo[] };

function specs(suite: Suite): Spec[] {
  return [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(specs)];
}

export function calcularAvance(reporte: Suite): Avance {
  const alcance = specs(reporte).filter((s) => !(s.tags ?? []).includes("plantilla"));
  const rojos: Rojo[] = [];
  let verdes = 0;
  for (const s of alcance) {
    const estado = s.tests[0]?.status;
    if (estado === "expected" || estado === "flaky") verdes++;
    else rojos.push({ titulo: s.title, estado: estado === "skipped" ? "pendiente" : "falla" });
  }
  const total = alcance.length;
  return { total, verdes, porcentaje: total ? Math.round((verdes / total) * 100) : 0, rojos };
}

export function resumenMarkdown(a: Avance): string {
  const lineas = [`## Avance: ${a.verdes} de ${a.total} escenarios en verde (${a.porcentaje} %)`];
  if (a.total === 0) lineas.push("", "Todavía no hay escenarios del alcance (corre `/planificar`).");
  if (a.rojos.length) {
    lineas.push("", "| Escenario | Estado |", "|---|---|");
    for (const r of a.rojos) lineas.push(`| ${r.titulo} | ${r.estado === "pendiente" ? "🔴 pendiente" : "❌ falla"} |`);
  }
  return lineas.join("\n") + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const archivo = process.argv[2] ?? "test-results/resultados.json";
  const avance = calcularAvance(JSON.parse(readFileSync(archivo, "utf8")));
  const md = resumenMarkdown(avance);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  // Para el workflow de estado (ADR 0026): solo los números, junto al reporte.
  const { verdes, total, porcentaje } = avance;
  writeFileSync(join(dirname(archivo), "avance.json"), JSON.stringify({ verdes, total, porcentaje }) + "\n");
  process.stdout.write(md);
}
