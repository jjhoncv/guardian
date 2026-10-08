// Avisos del Guardián por Telegram (Fase 5). Uso (CI): node tools/avisos/avisos.ts <prueba|resumen>
// env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GITHUB_TOKEN, DUENO; PRUEBA=«texto» antepone una marca de prueba.
import { svgCurva } from "../../scripts/grafico.ts";
import { curvaProyecto, desvioTexto } from "../../scripts/hoja.ts";
import { actividadDe, clienteGitHub, leerCrudo, leerProyecto, pendientesDe, reposDelDueno } from "../../scripts/proyectos.ts";
import { resumenDiario, type ParaResumen } from "../../scripts/resumen.ts";
import { enviarFoto, enviarTelegram, html } from "../../scripts/telegram.ts";
import { aPng } from "./png.ts";

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat, GITHUB_TOKEN, DUENO, PRUEBA } = process.env;
if (!token || !chat) throw new Error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
const telegram = { token, chat };
const marca = PRUEBA ? `🧪 <i>${html(PRUEBA)}</i>\n\n` : "";

async function leerTodo(hoy: string): Promise<ParaResumen[]> {
  if (!GITHUB_TOKEN || !DUENO) throw new Error("Faltan GITHUB_TOKEN o DUENO");
  const github = clienteGitHub(GITHUB_TOKEN);
  return Promise.all(
    (await reposDelDueno(github, DUENO)).map(async (repo) => {
      const [datos, crudo] = await Promise.all([leerProyecto(github, repo), leerCrudo(github, repo, hoy)]);
      return { datos, pendientes: pendientesDe(crudo, hoy), actividad: actividadDe(crudo, hoy) };
    }),
  );
}

const aviso = process.argv[2] ?? "prueba";
if (aviso === "resumen") {
  const hoy = new Date().toISOString();
  const proyectos = await leerTodo(hoy);
  await enviarTelegram(marca + resumenDiario(proyectos, hoy), telegram);
  // Después del texto, la curva de cada proyecto activo vs. su plan original (si tiene fechas).
  for (const { datos } of proyectos.filter((p) => !p.datos.estado?.salud.pausa)) {
    const curva = curvaProyecto(datos, hoy);
    if (!curva) continue;
    await enviarFoto(aPng(svgCurva(curva)), `${curva.titulo}: ${desvioTexto(curva.desvio)} vs. el plan original`, telegram);
  }
} else {
  await enviarTelegram(marca + "🛡️ <b>Guardián conectado</b> · los avisos de la Fase 5 llegarán aquí.", telegram);
}
console.log(`Aviso «${aviso}» enviado a Telegram.`);
