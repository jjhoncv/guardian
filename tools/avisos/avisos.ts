// Avisos del Guardián por Telegram (Fase 5), con la política de scripts/politica.ts.
// Uso (CI): node tools/avisos/avisos.ts <manana|noche|semanal|emergencias|prueba>
// env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GITHUB_TOKEN, DUENO; MEMORIA=archivo JSON de lo ya avisado
// (rama `avisos`); PRUEBA=«texto» marca el mensaje como prueba y no respeta las ventanas.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { svgCurva } from "../../scripts/grafico.ts";
import { curvaProyecto, desvioTexto } from "../../scripts/hoja.ts";
import { decidir, type Memoria, type Momento } from "../../scripts/politica.ts";
import { actividadDe, clienteGitHub, leerCrudo, leerProyecto, leerSemana, pendientesDe, reposDelDueno } from "../../scripts/proyectos.ts";
import type { ParaResumen } from "../../scripts/resumen.ts";
import { enviarFoto, enviarTelegram, html } from "../../scripts/telegram.ts";
import { aPng } from "./png.ts";

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat, GITHUB_TOKEN, DUENO, PRUEBA, MEMORIA } = process.env;
if (!token || !chat) throw new Error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
const telegram = { token, chat };
const aviso = process.argv[2] ?? "prueba";

if (aviso === "prueba") {
  await enviarTelegram(`${PRUEBA ? `🧪 <i>${html(PRUEBA)}</i>\n\n` : ""}🛡️ <b>Guardián conectado</b> · los avisos de la Fase 5 llegarán aquí.`, telegram);
  console.log("Prueba enviada.");
  process.exit(0);
}

if (!GITHUB_TOKEN || !DUENO) throw new Error("Faltan GITHUB_TOKEN o DUENO");
const github = clienteGitHub(GITHUB_TOKEN);
// En una prueba, la hora es la de la ventana pedida (para ver el mensaje aunque sea otra hora).
// (el sábado para la semanal; el día de hoy para las demás).
function horaDePrueba(): string {
  const base = new Date(`${new Date().toISOString().slice(0, 10)}T${aviso === "noche" ? "19" : "08"}:05:00-05:00`);
  if (aviso === "semanal") base.setUTCDate(base.getUTCDate() + ((6 - base.getUTCDay() + 7) % 7));
  else if (base.getUTCDay() === 0) base.setUTCDate(base.getUTCDate() + 1); // el domingo no hay ventanas
  return base.toISOString();
}
const hoy = PRUEBA ? horaDePrueba() : new Date().toISOString();
const proyectos: ParaResumen[] = await Promise.all(
  (await reposDelDueno(github, DUENO)).map(async (repo) => {
    const [datos, crudo, semana] = await Promise.all([
      leerProyecto(github, repo),
      leerCrudo(github, repo, hoy),
      aviso === "semanal" ? leerSemana(github, repo, hoy) : Promise.resolve(undefined),
    ]);
    return { datos, pendientes: pendientesDe(crudo, hoy), actividad: actividadDe(crudo, hoy), semana };
  }),
);

const vacia: Memoria = { enviados: {}, colores: {}, curvas: {} };
const memoria: Memoria = MEMORIA && existsSync(MEMORIA) ? { ...vacia, ...JSON.parse(readFileSync(MEMORIA, "utf8")) } : vacia;
const d = decidir(proyectos, memoria, hoy, aviso as Momento);
if (!d.texto) {
  console.log(`«${aviso}»: sin novedades, no se manda nada.`);
} else {
  await enviarTelegram(`${PRUEBA ? `🧪 <i>${html(PRUEBA)}</i>\n\n` : ""}${d.texto}`, telegram);
  for (const repo of d.curvas) {
    const curva = curvaProyecto(proyectos.find((p) => p.datos.repo === repo)!.datos, hoy);
    if (curva) await enviarFoto(aPng(svgCurva(curva)), `${curva.titulo}: ${desvioTexto(curva.desvio)} vs. el plan original`, telegram);
  }
  console.log(`«${aviso}» enviado: ${d.curvas.length} curvas.`);
}
// Lo avisado se guarda solo fuera de las pruebas (así una prueba no «gasta» un aviso real).
if (MEMORIA && !PRUEBA) writeFileSync(MEMORIA, JSON.stringify(d.memoria, null, 2) + "\n");
