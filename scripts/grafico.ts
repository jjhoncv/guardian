// Gráfico de la curva del proyecto vs. su plan original (Fase 5): SVG propio, sin servicios externos; el
// workflow lo convierte a PNG para mandarlo por Telegram. X = % de avance; Y = día del proyecto.
// Debajo de la línea gris del plan = más rápido de lo pactado; encima = atrasado.
import { desvioTexto, type Curva } from "./hoja.ts";

const ANCHO = 800;
const ALTO = 600;
const M = { izq: 70, der: 30, arr: 90, aba: 70 };
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Paso «redondo» para las marcas del eje de días. */
const paso = (max: number) => [1, 2, 5, 7, 10, 14, 20, 30, 60, 90].find((p) => max / p <= 8) ?? Math.ceil(max / 8);

export function svgCurva(c: Curva): string {
  const maxDia = Math.max(1, ...c.plan.map(([, y]) => y), ...c.real.map(([, y]) => y));
  const p = paso(maxDia);
  const tope = Math.ceil(maxDia / p) * p;
  const x = (pct: number) => M.izq + (pct / 100) * (ANCHO - M.izq - M.der);
  const y = (dia: number) => ALTO - M.aba - (dia / tope) * (ALTO - M.arr - M.aba);
  const puntos = (serie: [number, number][]) => serie.map(([a, b]) => `${x(a).toFixed(1)},${y(b).toFixed(1)}`).join(" ");
  const [hoyX, hoyY] = c.real.at(-1) ?? [0, 0];
  const estado = desvioTexto(c.desvio) || "al día";
  const color = c.desvio > 0 ? "#ea4335" : "#34a853";

  const marcas: string[] = [];
  for (let v = 0; v <= 100; v += 25) {
    marcas.push(`<line x1="${x(v)}" y1="${M.arr}" x2="${x(v)}" y2="${ALTO - M.aba}" stroke="#eee"/>`, `<text x="${x(v)}" y="${ALTO - M.aba + 22}" text-anchor="middle" font-size="14" fill="#555">${v} %</text>`);
  }
  for (let d = 0; d <= tope; d += p) {
    marcas.push(`<line x1="${M.izq}" y1="${y(d)}" x2="${ANCHO - M.der}" y2="${y(d)}" stroke="#eee"/>`, `<text x="${M.izq - 10}" y="${y(d) + 5}" text-anchor="end" font-size="14" fill="#555">${d}</text>`);
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}" font-family="DejaVu Sans, Arial, sans-serif">`,
    `<rect width="${ANCHO}" height="${ALTO}" fill="#fff"/>`,
    `<text x="${M.izq}" y="36" font-size="22" font-weight="bold" fill="#202124">${esc(c.titulo)}: <tspan fill="${color}">${esc(estado)}</tspan> vs. el plan original</text>`,
    `<text x="${M.izq}" y="62" font-size="14" fill="#5f6368">Gris: plan original (fijo) · Verde: real, un punto por día desde el ${esc(c.inicio)} · Debajo de la gris = más rápido</text>`,
    ...marcas,
    `<line x1="${M.izq}" y1="${ALTO - M.aba}" x2="${ANCHO - M.der}" y2="${ALTO - M.aba}" stroke="#999"/>`,
    `<line x1="${M.izq}" y1="${M.arr}" x2="${M.izq}" y2="${ALTO - M.aba}" stroke="#999"/>`,
    `<text x="${(M.izq + ANCHO - M.der) / 2}" y="${ALTO - 18}" text-anchor="middle" font-size="15" fill="#333">avance del proyecto (% de tickets hechos)</text>`,
    `<text x="20" y="${(M.arr + ALTO - M.aba) / 2}" text-anchor="middle" font-size="15" fill="#333" transform="rotate(-90 20 ${(M.arr + ALTO - M.aba) / 2})">día del proyecto</text>`,
    `<polyline points="${puntos(c.plan)}" fill="none" stroke="#9aa0a6" stroke-width="3" stroke-dasharray="10 6"/>`,
    ...c.plan.slice(1).map(([a, b]) => `<rect x="${x(a) - 6}" y="${y(b) - 6}" width="12" height="12" fill="#9aa0a6" transform="rotate(45 ${x(a)} ${y(b)})"/>`),
    `<polyline points="${puntos(c.real)}" fill="none" stroke="#34a853" stroke-width="3"/>`,
    ...c.real.map(([a, b]) => `<circle cx="${x(a).toFixed(1)}" cy="${y(b).toFixed(1)}" r="3.5" fill="#34a853"/>`),
    `<circle cx="${x(hoyX)}" cy="${y(hoyY)}" r="9" fill="none" stroke="${color}" stroke-width="3"/>`,
    `<text x="${Math.min(x(hoyX) + 14, ANCHO - M.der - 170)}" y="${y(hoyY) - 12}" font-size="15" font-weight="bold" fill="${color}">hoy: día ${hoyY} · ${hoyX} %</text>`,
    `</svg>`,
  ].join("\n");
}
