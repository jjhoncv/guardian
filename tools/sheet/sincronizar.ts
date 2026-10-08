// Sincroniza el estado de todos los proyectos del Guardián con su Sheet (ADR 0026). GitHub es la fuente
// de verdad: Proyecto, Fases y Tareas se reescriben; Salud guarda una fila por día y proyecto.
// Proyectos = repos del dueño con el topic `guardian-proyecto` (los marca configurar-repo.sh).
// Uso (CI): node tools/sheet/sincronizar.ts   env: GITHUB_TOKEN, DUENO, SHEET_ID, SHEET_SA (JSON de la service account)
import { JWT } from "google-auth-library";
import { anchos, barrasResumen, ENCABEZADOS, filasFases, filasFoco, filasPlan, filasProyecto, filasResumen, filasSalud, filasTareas, filasTendencia, type DatosProyecto, type Pestaña } from "../../scripts/hoja.ts";
import type { Estado } from "../../scripts/estado.ts";
import { filasSimulacion, serieSimulacion, simular } from "../../scripts/simulacion.ts";

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
  if (process.env.SIMULACION === "1") return escribirSimulacion(hoja.sheets.some((s) => s.properties.title === "Simulación"));
  const faltan = (Object.keys(ENCABEZADOS) as Pestaña[]).filter((p) => !hoja.sheets.some((s) => s.properties.title === p));
  if (faltan.length) await sheets(":batchUpdate", { method: "POST", body: { requests: faltan.map((title) => ({ addSheet: { properties: { title } } })) } });

  const { items } = await github<{ items: { full_name: string }[] }>(`search/repositories?q=${encodeURIComponent(`topic:guardian-proyecto user:${DUENO}`)}&per_page=100`);
  const datos = await Promise.all(items.map((r) => datosDe(r.full_name)));
  datos.sort((a, b) => a.repo.localeCompare(b.repo));

  const ahora = new Date().toISOString();
  const hoy = ahora.slice(0, 10);
  const salud = await sheets<{ values?: string[][] }>(`/values/${encodeURIComponent("Salud!A:F")}`);
  const historial = filasSalud(salud.values ?? [], datos, hoy);
  const filas: Record<Pestaña, (string | number)[][]> = {
    Foco: filasFoco(datos, ahora),
    Resumen: filasResumen(datos, ahora),
    Proyecto: filasProyecto(datos),
    Fases: filasFases(datos),
    Tareas: filasTareas(datos),
    Salud: historial,
    Tendencia: filasTendencia(historial),
    Plan: [],
  };
  const plan = filasPlan(datos, ahora);
  filas.Plan = plan.filas.length ? plan.filas : [[...ENCABEZADOS.Plan]];
  const pestañas = Object.keys(filas) as Pestaña[];
  // Todo se reescribe salvo Salud, que solo crece: no se borra (si algo falla, el historial queda).
  await sheets("/values:batchClear", { method: "POST", body: { ranges: pestañas.filter((p) => p !== "Salud").map((p) => `${p}!A:Z`) } });
  // RAW: el texto se guarda tal cual, nunca como fórmula.
  await sheets("/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: pestañas.map((p) => ({ range: `${p}!A1`, values: filas[p] })) } });
  // Barras de progreso: las únicas celdas que se escriben como fórmula, armadas solo con números y colores fijos.
  const barras = barrasResumen(datos, ahora);
  if (barras.length) {
    const columna = (i: number) => barras.map((b) => [b[i]]);
    const n = barras.length + 1;
    await sheets("/values:batchUpdate", {
      method: "POST",
      body: { valueInputOption: "USER_ENTERED", data: [{ range: `Resumen!C2:C${n}`, values: columna(0) }, { range: `Resumen!F2:F${n}`, values: columna(1) }, { range: `Resumen!H2:H${n}`, values: columna(2) }] },
    });
  }
  await darFormato(filas, datos, plan.bloques);

  const linea = datos.map((d) => `${d.estado?.salud.emoji ?? "·"} ${d.repo.split("/")[1]}`).join("  ");
  console.log(`Sheet actualizado (${datos.length} proyectos): ${linea}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Sheet del Guardián\n\n${datos.length} proyectos: ${linea}\n`);
  }
}

// Formato del tablero: Resumen primero, encabezados fijos, filas del color de su salud, columnas a su ancho
// y el gráfico de tendencia. Solo formato: los valores ya se escribieron como texto.
const FONDO: Record<string, { red: number; green: number; blue: number }> = {
  verde: { red: 0.85, green: 0.95, blue: 0.85 },
  amarillo: { red: 1, green: 0.95, blue: 0.8 },
  rojo: { red: 0.96, green: 0.8, blue: 0.8 },
  gris: { red: 0.88, green: 0.88, blue: 0.88 },
};
const POR_DEFECTO = ["Sheet1", "Hoja 1", "Hoja1"];

type Bloque = { titulo: string; columna: number; filas: number };
async function darFormato(filas: Record<Pestaña, (string | number)[][]>, datos: DatosProyecto[], bloques: Bloque[]) {
  type Hoja = { properties: { sheetId: number; title: string }; charts?: { chartId: number }[] };
  const { sheets: hojas } = await sheets<{ sheets: Hoja[] }>("?fields=sheets(properties(sheetId,title),charts(chartId))");
  const id = (t: Pestaña) => hojas.find((h) => h.properties.title === t)!.properties.sheetId;
  const requests: unknown[] = [];
  (Object.keys(filas) as Pestaña[]).forEach((p, index) => {
    const sheetId = id(p);
    requests.push(
      { updateSheetProperties: { properties: { sheetId, index, gridProperties: { frozenRowCount: 1 } }, fields: "index,gridProperties.frozenRowCount" } },
      { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 } } }, fields: "userEnteredFormat(textFormat,backgroundColor)" } },
    );
    // Ancho calculado (el ajuste automático no cuenta el encabezado en negrita); las barras, 140 px.
    anchos(filas[p]).forEach((px, c) => {
      const barra = p === "Resumen" && [2, 5, 7].includes(c);
      requests.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: c, endIndex: c + 1 }, properties: { pixelSize: barra ? 140 : px }, fields: "pixelSize" } });
    });
  });
  // Resumen: cada proyecto con el color de su salud (la pausa, en gris).
  const resumen = id("Resumen");
  datos.forEach((d, i) => {
    const color = d.estado ? (d.estado.salud.pausa ? "gris" : d.estado.salud.color) : "gris";
    requests.push({ repeatCell: { range: { sheetId: resumen, startRowIndex: i + 1, endRowIndex: i + 2 }, cell: { userEnteredFormat: { backgroundColor: FONDO[color] } }, fields: "userEnteredFormat.backgroundColor" } });
  });
  // Foco: cada fila del color de su gravedad.
  const foco = id("Foco");
  filas.Foco.slice(1).forEach((f, i) => {
    const color = f[0] === "🔴" ? "rojo" : f[0] === "🟡" ? "amarillo" : f[0] === "⚫" ? "gris" : "verde";
    requests.push({ repeatCell: { range: { sheetId: foco, startRowIndex: i + 1, endRowIndex: i + 2 }, cell: { userEnteredFormat: { backgroundColor: FONDO[color] } }, fields: "userEnteredFormat.backgroundColor" } });
  });
  // Gráficos: se rehacen en cada corrida con los proyectos de hoy.
  for (const c of hojas.find((h) => h.properties.sheetId === resumen)?.charts ?? []) requests.push({ deleteEmbeddedObject: { objectId: c.chartId } });
  const debajo = datos.length + 3;
  // Plan vs. real de la fase en curso: uno por proyecto, en fila. Plan punteado gris; real azul.
  bloques.forEach((b, k) => {
    const col = (c: number) => ({ sourceRange: { sources: [{ sheetId: id("Plan"), startRowIndex: 0, endRowIndex: b.filas, startColumnIndex: b.columna + c, endColumnIndex: b.columna + c + 1 }] } });
    requests.push({
      addChart: {
        chart: {
          spec: {
            title: `${b.titulo}: plan vs. real`,
            basicChart: {
              chartType: "LINE",
              legendPosition: "BOTTOM_LEGEND",
              headerCount: 1,
              axis: [{ position: "LEFT_AXIS", title: "% de la fase", viewWindowOptions: { viewWindowMin: 0, viewWindowMax: 100, viewWindowMode: "EXPLICIT" } }],
              domains: [{ domain: col(0) }],
              series: [
                { series: col(1), targetAxis: "LEFT_AXIS", color: { red: 0.6, green: 0.63, blue: 0.65 }, lineStyle: { type: "MEDIUM_DASHED", width: 2 } },
                { series: col(2), targetAxis: "LEFT_AXIS", color: { red: 0.26, green: 0.52, blue: 0.96 }, lineStyle: { width: 3 }, pointStyle: { shape: "CIRCLE", size: 6 } },
              ],
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: resumen, rowIndex: debajo, columnIndex: 0 }, offsetXPixels: k * 540, widthPixels: 520, heightPixels: 320 } },
        },
      },
    });
  });
  const tendencia = filas.Tendencia;
  if (tendencia.length > 1 && tendencia[0].length > 1) {
    const rango = (columna: number) => ({ sourceRange: { sources: [{ sheetId: id("Tendencia"), startRowIndex: 0, endRowIndex: tendencia.length, startColumnIndex: columna, endColumnIndex: columna + 1 }] } });
    requests.push({
      addChart: {
        chart: {
          spec: {
            title: "Avance por día (% de escenarios en verde)",
            basicChart: {
              chartType: "LINE",
              legendPosition: "BOTTOM_LEGEND",
              headerCount: 1,
              axis: [{ position: "LEFT_AXIS", title: "%", viewWindowOptions: { viewWindowMin: 0, viewWindowMax: 100, viewWindowMode: "EXPLICIT" } }],
              domains: [{ domain: rango(0) }],
              series: tendencia[0].slice(1).map((_, i) => ({ series: rango(i + 1), targetAxis: "LEFT_AXIS" })),
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: resumen, rowIndex: debajo + (bloques.length ? 17 : 0), columnIndex: 0 }, widthPixels: 520, heightPixels: 320 } },
        },
      },
    });
  }
  // La pestaña vacía que Google crea por defecto se quita (solo si está vacía).
  for (const h of hojas.filter((h) => POR_DEFECTO.includes(h.properties.title))) {
    const { values } = await sheets<{ values?: unknown[][] }>(`/values/${encodeURIComponent(`${h.properties.title}!A1:Z20`)}`);
    if (!values?.length) requests.push({ deleteSheet: { sheetId: h.properties.sheetId } });
  }
  await sheets(":batchUpdate", { method: "POST", body: { requests } });
}

/** Simulación (solo Sheet de pruebas): un proyecto inventado en 10 momentos, con el mismo cálculo que el tablero real. */
async function escribirSimulacion(existe: boolean) {
  if (!existe) await sheets(":batchUpdate", { method: "POST", body: { requests: [{ addSheet: { properties: { title: "Simulación" } } }] } });
  const momentos = simular();
  const filas = filasSimulacion(momentos);
  const serie = serieSimulacion(momentos);
  await sheets("/values:batchClear", { method: "POST", body: { ranges: ["Simulación!A:Z"] } });
  // La tabla a la izquierda; los números del gráfico, a la derecha (desde la columna L).
  await sheets("/values:batchUpdate", { method: "POST", body: { valueInputOption: "RAW", data: [{ range: "Simulación!A1", values: filas }, { range: "Simulación!L1", values: serie }] } });
  type Hoja = { properties: { sheetId: number; title: string }; charts?: { chartId: number }[] };
  const { sheets: hojas } = await sheets<{ sheets: Hoja[] }>("?fields=sheets(properties(sheetId,title),charts(chartId))");
  const hojaSim = hojas.find((h) => h.properties.title === "Simulación")!;
  const sheetId = hojaSim.properties.sheetId;
  const col = (c: number) => ({ sourceRange: { sources: [{ sheetId, startRowIndex: 0, endRowIndex: serie.length, startColumnIndex: 11 + c, endColumnIndex: 12 + c }] } });
  const linea = (c: number, rgb: [number, number, number], punteada = false) => ({ series: col(c), targetAxis: "LEFT_AXIS", type: "LINE", color: { red: rgb[0], green: rgb[1], blue: rgb[2] }, lineStyle: { width: 3, ...(punteada ? { type: "MEDIUM_DASHED" } : {}) }, pointStyle: { shape: "CIRCLE", size: 6 } });
  const grafico = {
    addChart: {
      chart: {
        spec: {
          title: "proyecto-x en el tiempo: avance vs. plan y días de atraso",
          basicChart: {
            chartType: "COMBO",
            legendPosition: "BOTTOM_LEGEND",
            headerCount: 1,
            axis: [
              { position: "LEFT_AXIS", title: "%", viewWindowOptions: { viewWindowMin: 0, viewWindowMax: 100, viewWindowMode: "EXPLICIT" } },
              { position: "RIGHT_AXIS", title: "días de atraso" },
            ],
            domains: [{ domain: col(0) }],
            series: [
              linea(1, [0.26, 0.52, 0.96]),
              linea(2, [0.6, 0.63, 0.65], true),
              linea(3, [0.2, 0.66, 0.33]),
              { series: col(4), targetAxis: "RIGHT_AXIS", type: "COLUMN", color: { red: 0.92, green: 0.26, blue: 0.21 } },
            ],
          },
        },
        position: { overlayPosition: { anchorCell: { sheetId, rowIndex: filas.length + 2, columnIndex: 0 }, widthPixels: 900, heightPixels: 380 } },
      },
    },
  };
  const requests: unknown[] = [
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 } } }, fields: "userEnteredFormat(textFormat,backgroundColor)" } },
    ...anchos(filas).map((px, c) => ({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: c, endIndex: c + 1 }, properties: { pixelSize: px }, fields: "pixelSize" } })),
    ...filas.slice(1).map((f, i) => ({ repeatCell: { range: { sheetId, startRowIndex: i + 1, endRowIndex: i + 2, startColumnIndex: 0, endColumnIndex: filas[0].length }, cell: { userEnteredFormat: { backgroundColor: FONDO[f[2].split(" ")[1]] ?? FONDO.verde } }, fields: "userEnteredFormat.backgroundColor" } })),
    ...(hojaSim.charts ?? []).map((c) => ({ deleteEmbeddedObject: { objectId: c.chartId } })),
    grafico,
  ];
  await sheets(":batchUpdate", { method: "POST", body: { requests } });
  console.log(`Simulación escrita: ${filas.length - 1} momentos del proyecto-x (datos inventados).`);
}

await main();
