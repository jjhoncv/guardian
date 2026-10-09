// Tokens por vencer (Fase 5, T5). El PAT de release-please se lee solo (GitHub devuelve su vencimiento al
// usarlo); Netlify y Anthropic no lo exponen: su fecha va en variables VENCE_<SECRETO> que guarda nuevo-proyecto.sh.
import type { DatosProyecto } from "./hoja.ts";
import type { Pendiente } from "./proyectos.ts";

export type Vencimiento = { secreto: string; vence: string };
const DIA = 86_400_000;

/** «2027-01-05 12:00:00 -0500» (header github-authentication-token-expiration) → «2027-01-05». */
export const desdeHeader = (header: string | null) => header?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

/** Variables del repo (toJSON(vars)) → las fechas VENCE_<SECRETO> válidas. */
export function desdeVariables(json: string | undefined): Vencimiento[] {
  const vars: Record<string, string> = json ? JSON.parse(json) : {};
  return Object.entries(vars)
    .filter(([k, v]) => k.startsWith("VENCE_") && /^\d{4}-\d{2}-\d{2}$/.test(v))
    .map(([k, v]) => ({ secreto: k.slice("VENCE_".length), vence: v }));
}

/** Cómo renovar cada secreto y dónde. */
function renovar(secreto: string, repo: string): { accion: string; url: string } {
  switch (secreto) {
    case "RELEASE_PLEASE_TOKEN":
      return { accion: `Nuevo PAT fine-grained con los mismos permisos (solo este repo) → gh secret set RELEASE_PLEASE_TOKEN -R ${repo}`, url: "https://github.com/settings/personal-access-tokens" };
    case "NETLIFY_AUTH_TOKEN":
      return { accion: `Nuevo token en Netlify → gh secret set NETLIFY_AUTH_TOKEN -R ${repo} y gh variable set VENCE_NETLIFY_AUTH_TOKEN`, url: "https://app.netlify.com/user/applications#personal-access-tokens" };
    case "ANTHROPIC_API_KEY":
      return { accion: `Nueva key en el workspace con tope → gh secret set ANTHROPIC_API_KEY -R ${repo} y gh variable set VENCE_ANTHROPIC_API_KEY`, url: "https://console.anthropic.com/settings/keys" };
    default:
      return { accion: `Renuévalo → gh secret set ${secreto} -R ${repo}`, url: `https://github.com/${repo}/settings/secrets/actions` };
  }
}

/** Avisos desde 7 días antes (urgente con 2 días o menos, o vencido), con los pasos para renovar. */
export function tokensPorVencer(d: DatosProyecto, hoy: string): Pendiente[] {
  const hoyLima = new Date(Date.parse(hoy) - 5 * 3_600_000).toISOString().slice(0, 10);
  return (d.estado?.vencimientos ?? [])
    .map((v) => ({ ...v, dias: Math.round((Date.parse(v.vence) - Date.parse(hoyLima)) / DIA) }))
    .filter((v) => v.dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .map((v) => ({
      tipo: "token" as const,
      urgente: v.dias <= 2,
      texto: v.dias >= 0 ? `${v.secreto} vence en ${v.dias} ${v.dias === 1 ? "día" : "días"} (${v.vence})` : `${v.secreto} venció hace ${-v.dias} ${v.dias === -1 ? "día" : "días"} (${v.vence})`,
      ...renovar(v.secreto, d.repo),
    }));
}
