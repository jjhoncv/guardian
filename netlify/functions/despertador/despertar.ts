// Despertador de los avisos (ADR 0028): GitHub no corre sus cron a tiempo; Netlify sí. A la hora de cada intento,
// la función programada del sitio del Guardián le pide a GitHub que corra `avisos.yml` con `aviso=auto`
// (la misma lógica que el cron: ventanas del dueño y una vez por día).
export const REPO = "jjhoncv/guardian";

export async function despertar(token: string | undefined, f: typeof fetch = fetch): Promise<string> {
  if (!token) throw new Error("Falta GUARDIAN_DESPERTADOR_TOKEN en las variables de Netlify");
  const r = await f(`https://api.github.com/repos/${REPO}/actions/workflows/avisos.yml/dispatches`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" },
    body: JSON.stringify({ ref: "main", inputs: { aviso: "auto" } }),
  });
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} al despertar los avisos: ${await r.text()}`);
  return `Avisos despertados (${new Date().toISOString()}).`;
}
