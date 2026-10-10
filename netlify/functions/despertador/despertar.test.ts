import { describe, expect, it, vi } from "vitest";
import { despertar } from "./despertar";

describe("despertador de los avisos (ADR 0028)", () => {
  it("pide a GitHub correr avisos.yml en main con aviso=auto", async () => {
    const f = vi.fn(async () => new Response(null, { status: 204 }));
    await despertar("tok", f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/jjhoncv/guardian/actions/workflows/avisos.yml/dispatches");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual({ ref: "main", inputs: { aviso: "auto" } });
  });

  it("sin token, falla con un mensaje que dice dónde ponerlo", async () => {
    await expect(despertar(undefined)).rejects.toThrow("GUARDIAN_DESPERTADOR_TOKEN");
  });

  it("si GitHub lo rechaza, falla (queda en el log de la función)", async () => {
    const f = vi.fn(async () => new Response("Bad credentials", { status: 401 }));
    await expect(despertar("tok", f as unknown as typeof fetch)).rejects.toThrow("401");
  });
});
