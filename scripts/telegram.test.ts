import { describe, expect, it, vi } from "vitest";
import { enviarFoto, enviarTelegram, html, partir } from "./telegram";

describe("Telegram (Fase 5)", () => {
  it("escapa el texto que viene de GitHub (títulos de tickets) para el modo HTML", () => {
    expect(html("PR #3: <script> & «x»")).toBe("PR #3: &lt;script&gt; &amp; «x»");
  });

  it("parte los mensajes largos por líneas, sin pasar el límite", () => {
    const partes = partir(["a".repeat(30), "b".repeat(30), "c".repeat(30)].join("\n"), 70);
    expect(partes).toEqual(["a".repeat(30) + "\n" + "b".repeat(30), "c".repeat(30)]);
  });

  it("envía cada parte al chat del dueño, sin vista previa de links", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    await enviarTelegram("hola", { token: "T0K3N", chat: "42", fetch: fetchFalso });
    expect(fetchFalso).toHaveBeenCalledWith("https://api.telegram.org/botT0K3N/sendMessage", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).toEqual({ chat_id: "42", text: "hola", parse_mode: "HTML", disable_web_page_preview: true });
  });

  it("si Telegram rechaza, el error explica por qué y nunca muestra el token", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ json: async () => ({ ok: false, description: "Forbidden: bot was blocked by the user" }) });
    const error = await enviarTelegram("hola", { token: "T0K3N", chat: "42", fetch: fetchFalso }).catch((e: Error) => e.message);
    expect(error).toBe("Telegram no aceptó el mensaje: Forbidden: bot was blocked by the user");
    expect(error).not.toContain("T0K3N");
  });
});

describe("enviarFoto", () => {
  it("manda la imagen con su leyenda al chat del dueño", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    await enviarFoto(new Uint8Array([137, 80, 78, 71]), "vitrina: 40 días adelantado", { token: "T0K3N", chat: "42", fetch: fetchFalso });
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/botT0K3N/sendPhoto");
    expect(init.body.get("chat_id")).toBe("42");
    expect(init.body.get("caption")).toBe("vitrina: 40 días adelantado");
    expect(init.body.get("photo")).toBeInstanceOf(Blob);
  });
});
