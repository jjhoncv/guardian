import { http, HttpResponse } from "msw";
import ejemplo from "./fixtures/ejemplo.json";

// Una entrada por API simulada. Los datos salen de fixtures/ y deben cumplir su contrato en contratos/.
export const handlers = [http.get("*/api/ejemplo", () => HttpResponse.json(ejemplo))];
