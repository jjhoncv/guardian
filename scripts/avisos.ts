// Avisos del Guardián por Telegram (Fase 5). Uso (CI): node scripts/avisos.ts <prueba|resumen>
// env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GITHUB_TOKEN, DUENO; PRUEBA=«texto» antepone una marca de prueba.
import { actividadDe, clienteGitHub, leerCrudo, leerProyecto, pendientesDe, reposDelDueno } from "./proyectos.ts";
import { resumenDiario } from "./resumen.ts";
import { enviarTelegram, html } from "./telegram.ts";

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat, GITHUB_TOKEN, DUENO, PRUEBA } = process.env;
if (!token || !chat) throw new Error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
const marca = PRUEBA ? `🧪 <i>${html(PRUEBA)}</i>\n\n` : "";

async function resumen(): Promise<string> {
  if (!GITHUB_TOKEN || !DUENO) throw new Error("Faltan GITHUB_TOKEN o DUENO");
  const github = clienteGitHub(GITHUB_TOKEN);
  const hoy = new Date().toISOString();
  const repos = await reposDelDueno(github, DUENO);
  const proyectos = await Promise.all(
    repos.map(async (repo) => {
      const [datos, crudo] = await Promise.all([leerProyecto(github, repo), leerCrudo(github, repo, hoy)]);
      return { datos, pendientes: pendientesDe(crudo, hoy), actividad: actividadDe(crudo, hoy) };
    }),
  );
  return resumenDiario(proyectos, hoy);
}

const aviso = process.argv[2] ?? "prueba";
const texto = aviso === "resumen" ? await resumen() : "🛡️ <b>Guardián conectado</b> · los avisos de la Fase 5 llegarán aquí.";
await enviarTelegram(marca + texto, { token, chat });
console.log(`Aviso «${aviso}» enviado a Telegram.`);
