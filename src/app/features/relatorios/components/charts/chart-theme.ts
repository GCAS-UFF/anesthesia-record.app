import { Chart } from 'chart.js';

/**
 * Cores e tipografia dos gráficos dos Relatórios, no tema SIGA
 * (mesmos valores de src/theme/_siga-tokens.scss). Hex puro porque o Chart.js
 * desenha no canvas e não enxerga variáveis de CSS.
 */
export const SIGA_CHART = {
  primary: '#1b8ba6',
  text: '#4a6572',
  grid: 'rgba(34, 55, 64, 0.08)',
  font: "'Manrope', system-ui, -apple-system, sans-serif",
  /** Categorias (rosca): cores do tema primeiro, depois variações distinguíveis entre si. */
  palette: [
    '#1b8ba6', // azul SIGA
    '#2f9e6e', // verde
    '#c98a2e', // âmbar
    '#c23a6b', // carmim
    '#223740', // grafite
    '#6fb8cb', // azul claro
    '#8fc9ad', // verde claro
    '#8a5a1f', // âmbar escuro
    '#e39ab6', // carmim claro
    '#4a6572', // cinza-azulado
  ],
};

let applied = false;

/** Fonte, cor de texto e grade padrão de todos os gráficos (uma vez só). */
export function applySigaChartDefaults(): void {
  if (applied) return;
  applied = true;
  Chart.defaults.font.family = SIGA_CHART.font;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = SIGA_CHART.text;
  Chart.defaults.borderColor = SIGA_CHART.grid;
}
