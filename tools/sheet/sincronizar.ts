// Sincroniza el estado de todos los proyectos del Guardián con su Sheet (ADR 0026). GitHub es la fuente
// de verdad: Proyecto, Fases y Tareas se reescriben; Salud guarda una fila por día y proyecto.
// Proyectos = repos del dueño con el topic `guardian-proyecto` (los marca configurar-repo.sh).
// Uso (CI): node tools/sheet/sincronizar.ts   env: GITHUB_TOKEN, DUENO, SHEET_ID, SHEET_SA (JSON de la service account)
import { JWT } from "google-auth-library";
import { ENCABEZADOS, filasFases, filasProyecto, filasSalud, filasTareas, type DatosProyecto, type Pestaña } from "../../scripts/hoja.ts";
import type { Estado } from "../../scripts/estado.ts";

const { GITHUB_TOKEN, DUENO, SHEET_ID, SHEET_SA } = process.env;
if (!GITHUB_TOKEN || !DUENO || !SHEET_ID || !SHEET_SA) throw new Error("Faltan GITHUB_TOKEN, DUENO, SHEET_ID o SHEET_SA");

async function github<T>(ruta: string): Promise<T> {
  const r = await fetch(`https://api.github.com/${ruta}`, { headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub ${r.status} ${ruta}`);
  return r.json() as Promise<T>;
}

async function datosDe(repo: string): Promise<DatosProyecto> {
  type Issue = { number: number; title: string; state: string; created_at: string; closed_at: string | null; milestone: { title: string } | null; pull_request?: unknown };
  type Pull = { body: string | null };
  const [respuestaEstado, milestones, issues, pulls] = await Promise.all([
    fetch(`https://raw.githubusercontent.com/${repo}/estado/estado.json`),
    github<DatosProyecto["milestones"]>(`repos/${repo}/milestones?state=all&per_page=100`),
    github<Issue[]>(`repos/${repo}/issues?state=all&per_page=100`),
    github<Pull[]>(`repos/${repo}/pulls?state=open&per_page=100`),
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

// Google Sheets: la librería firma y renueva el token; aquí solo REST.
const cuenta = JSON.parse(SHEET_SA);
const google = new JWT({ email: cuenta.client_email, key: cuenta.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const base = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
async function sheets<T>(ruta: string, init?: { method: string; body: unknown }): Promise<T> {
  const r = await google.request<T>({ url: `${base}${ruta}`, method: (init?.method ?? "GET") as "GET", data: init?.body });
  return r.data;
}

async function main() {
  // Acceso al Sheet primero: si la llave no puede, el error lo dice claro.
  const hoja = await sheets<{ sheets: { properties: { title: string } }[] }>("?fields=sheets.properties.title").catch((e) => {
    throw new Error(`La service account ${cuenta.client_email} no puede abrir el Sheet: compártelo con ella como Editor. (${e.message})`);
  });
  const faltan = (Object.keys(ENCABEZADOS) as Pestaña[]).filter((p) => !hoja.sheets.some((s) => s.properties.title === p));
  if (faltan.length) await sheets(":batchUpdate", { method: "POST", body: { requests: faltan.map((title) => ({ addSheet: { properties: { title } } })) } });

  const { items } = await github<{ items: { full_name: string }[] }>(`search/repositories?q=${encodeURIComponent(`topic:guardian-proyecto user:${DUENO}`)}&per_page=100`);
  const datos = await Promise.all(items.map((r) => datosDe(r.full_name)));
  datos.sort((a, b) => a.repo.localeCompare(b.repo));

  const hoy = new Date().toISOString().slice(0, 10);
  const salud = await sheets<{ values?: string[][] }>(`/values/${encodeURIComponent("Salud!A:F")}`);
  const filas: Record<Pestaña, string[][]> = {
    Proyecto: filasProyecto(datos),
    Fases: filasFases(datos),
    Tareas: filasTareas(datos),
    Salud: filasSalud(salud.values ?? [], datos, hoy),
  };
  const pestañas = Object.keys(filas) as Pestaña[];
  // Proyecto, Fases y Tareas pueden achicarse: se limpian. Salud solo crece: no se borra (si algo falla, el historial queda).
  await sheets("/values:batchClear", { method: "POST", body: { ranges: pestañas.filter((p) => p !== "Salud").map((p) => `${p}!A:Z`) } });
  // RAW: el texto se guarda tal cual, nunca como fórmula.
  await sheets("/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: pestañas.map((p) => ({ range: `${p}!A1`, values: filas[p] })) } });

  const linea = datos.map((d) => `${d.estado?.salud.emoji ?? "·"} ${d.repo.split("/")[1]}`).join("  ");
  console.log(`Sheet actualizado (${datos.length} proyectos): ${linea}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Sheet del Guardián\n\n${datos.length} proyectos: ${linea}\n`);
  }
}

await main();
