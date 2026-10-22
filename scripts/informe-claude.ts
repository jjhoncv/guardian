// Cuando Claude en la nube termina un ticket sin PR (o con error), el Guardián deja el motivo en el ticket:
// sin esto, el dueño solo ve un run «en verde» y nada más (Info Site, T2). Lógica pura; el workflow la llama con
// la salida de claude-code-action ($RUNNER_TEMP/claude-execution-output.json).
// Uso: node scripts/informe-claude.ts <salida.json> <ticket> <hayPr: si|no>
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

type Negado = { tool_name?: string; tool_input?: { command?: string; file_path?: string } };
type Resultado = { type: "result"; is_error?: boolean; num_turns?: number; total_cost_usd?: number; permission_denials?: Negado[] };

const corto = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}…` : s);

function describir(n: Negado): string {
  const detalle = n.tool_input?.command ?? n.tool_input?.file_path ?? "";
  return detalle ? `\`${n.tool_name ?? "?"}\`: \`${corto(detalle.replace(/\s+/g, " ").trim())}\`` : `\`${n.tool_name ?? "?"}\``;
}

export function informe(salida: unknown[], ticket: number, hayPr: boolean): string | null {
  const r = [...salida].reverse().find((m): m is Resultado => (m as Resultado)?.type === "result");
  if (!r) return null;
  if (hayPr && !r.is_error) return null;

  const lineas = [hayPr ? `Claude terminó con error el ticket #${ticket}.` : `Claude terminó el ticket #${ticket} sin abrir un PR.`];
  if (r.is_error) lineas[0] = hayPr ? lineas[0] : `${lineas[0]} Además, terminó con error.`;
  if (r.is_error && (r.num_turns ?? 0) <= 1 && !r.total_cost_usd) {
    lineas.push("", "No llegó a hablar con el modelo: lo más probable es que se agotó el **límite de uso** de tu suscripción (o el tope de la API key). Vuelve a intentarlo cuando se renueve, comentando `@claude toma este ticket`.");
  }
  const negados = [...new Set((r.permission_denials ?? []).map(describir))];
  if (negados.length) {
    lineas.push("", `Le negaron ${negados.length === 1 ? "1 comando que no tiene permitido" : `${negados.length} comandos que no tiene permitidos`}:`, ...negados.map((d) => `- ${d}`));
    lineas.push("", "Si alguno hace falta para el ticket, el consultor lo agrega a las herramientas permitidas del Guardián.");
  }
  lineas.push("", `_Turnos: ${r.num_turns ?? "?"}._`);
  return lineas.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [archivo, ticket, hayPr] = process.argv.slice(2);
  const datos: unknown = JSON.parse(readFileSync(archivo, "utf8"));
  const texto = informe(Array.isArray(datos) ? datos : [datos], Number(ticket), hayPr === "si");
  if (texto) process.stdout.write(texto + "\n");
}
