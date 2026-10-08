// Avisos al celular del dueño por su bot de Telegram (Fase 5, decisión del 2026-10-04). Todo sale del repo
// del Guardián: secreto TELEGRAM_BOT_TOKEN y variable TELEGRAM_CHAT_ID.
// Uso (CI): node scripts/telegram.ts "texto en HTML de Telegram"
import { pathToFileURL } from "node:url";

/** Escapa el texto que viene de GitHub (títulos, motivos) para el modo HTML de Telegram. */
export const html = (texto: string) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Telegram acepta hasta 4096 caracteres por mensaje: se parte por líneas, sin cortar una a la mitad. */
export function partir(texto: string, max = 4000): string[] {
  const partes: string[] = [];
  let actual = "";
  for (const linea of texto.split("\n")) {
    const junto = actual ? `${actual}\n${linea}` : linea;
    if (junto.length > max && actual) {
      partes.push(actual);
      actual = linea;
    } else actual = junto;
  }
  if (actual) partes.push(actual);
  return partes;
}

type Opciones = { token: string; chat: string; fetch?: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ json(): Promise<unknown> }> };

export async function enviarTelegram(texto: string, { token, chat, fetch: f = fetch }: Opciones): Promise<void> {
  for (const parte of partir(texto)) {
    const r = (await (await f(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: parte, parse_mode: "HTML", disable_web_page_preview: true }),
    })).json()) as { ok: boolean; description?: string };
    // El error nunca incluye la URL: lleva el token.
    if (!r.ok) throw new Error(`Telegram no aceptó el mensaje: ${r.description ?? "sin detalle"}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!token || !chat) throw new Error("Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
  await enviarTelegram(process.argv[2] ?? "🛡️ <b>Guardián conectado</b>", { token, chat });
  console.log("Mensaje enviado a Telegram.");
}
