// SVG → PNG dentro del workflow (sin servicios externos), para mandar el gráfico por Telegram.
import { Resvg } from "@resvg/resvg-js";

export const aPng = (svg: string): Uint8Array => new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: "DejaVu Sans" } }).render().asPng();
