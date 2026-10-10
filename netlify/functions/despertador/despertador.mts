// Función programada de Netlify (ADR 0028): despierta los avisos del Guardián a la hora exacta, en cada intento
// de las ventanas del dueño (8:07–8:52 y 19:07–21:52 en Lima = 13 y 00–02 UTC). Fuera de la ventana o el
// domingo, avisos.yml no manda nada; cada aviso del día sale una sola vez.
import { despertar } from "./despertar.ts";

const despertador = async () => {
  console.log(await despertar(process.env.GUARDIAN_DESPERTADOR_TOKEN));
};

export default despertador;

export const config = { schedule: "7,22,37,52 0-2,13 * * *" };
