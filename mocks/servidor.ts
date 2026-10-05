import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Servidor de MSW para pruebas en Node (Vitest). En cada prueba: servidor.listen({ onUnhandledFrame: "error" }) / servidor.close().
export const servidor = setupServer(...handlers);
