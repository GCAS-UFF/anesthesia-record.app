import { PaperOrientation } from 'src/app/core/services/native-print';

/** px CSS por milímetro (96 dpi), a mesma relação usada pelo motor de impressão do Chromium. */
export const MM_TO_PX = 96 / 25.4;

export interface PageSetup {
  orientation: PaperOrientation;
  widthMm: number;
  heightMm: number;
  marginVerticalMm: number;
  marginHorizontalMm: number;
}

const A4_SHORT_MM = 210;
const A4_LONG_MM = 297;
const DEFAULT_MARGIN_MM = 12;

/**
 * Lê o `@page { size; margin }` que as views de impressão do backend declaram, para que a folha
 * exibida no visualizador tenha a mesma largura útil da impressão (e, portanto, a mesma quebra
 * de linhas e tabelas).
 */
export function parsePageSetup(html: string, fallback: PaperOrientation = 'portrait'): PageSetup {
  const pageRule = /@page\s*\{([^}]*)\}/i.exec(html)?.[1] ?? '';

  const sizeMatch = /size\s*:\s*A4\s+(landscape|portrait)/i.exec(pageRule);
  const orientation = (sizeMatch?.[1]?.toLowerCase() as PaperOrientation | undefined) ?? fallback;

  const marginMatch = /margin\s*:\s*([\d.]+)mm(?:\s+([\d.]+)mm)?/i.exec(pageRule);
  const marginVerticalMm = marginMatch ? Number(marginMatch[1]) : DEFAULT_MARGIN_MM;
  const marginHorizontalMm = marginMatch?.[2] ? Number(marginMatch[2]) : marginVerticalMm;

  const landscape = orientation === 'landscape';
  return {
    orientation,
    widthMm: landscape ? A4_LONG_MM : A4_SHORT_MM,
    heightMm: landscape ? A4_SHORT_MM : A4_LONG_MM,
    marginVerticalMm,
    marginHorizontalMm,
  };
}

/** Altura útil (sem margens) de uma página impressa, em px CSS. */
export function pageContentHeightPx(setup: PageSetup): number {
  return (setup.heightMm - 2 * setup.marginVerticalMm) * MM_TO_PX;
}

export function sheetWidthPx(setup: PageSetup): number {
  return setup.widthMm * MM_TO_PX;
}

/** Quantidade de páginas A4 que o conteúdo ocupa, pela altura útil de cada página. */
export function countPages(documentHeightPx: number, setup: PageSetup): number {
  const content = documentHeightPx - 2 * setup.marginVerticalMm * MM_TO_PX;
  return Math.max(1, Math.ceil(content / pageContentHeightPx(setup) - 0.01));
}

export const DOC_SIZE_MESSAGE = 'siga-doc-size';
export const DOC_PRINT_MESSAGE = 'siga-doc-print';

/**
 * Script executado dentro do iframe isolado: informa ao SIGA o tamanho do documento e atende
 * ao pedido de impressão (PWA). Não tem acesso ao app — o iframe roda sem allow-same-origin.
 */
const BRIDGE_SCRIPT = `
(function () {
  var last = '';
  function report() {
    // Mede o body (e não o documento), que não herda a altura do próprio iframe.
    var b = document.body;
    var w = Math.ceil(Math.max(b.offsetWidth, b.scrollWidth));
    var h = Math.ceil(Math.max(b.offsetHeight, b.scrollHeight));
    var key = w + 'x' + h;
    if (key === last) return;
    last = key;
    parent.postMessage({ type: '${DOC_SIZE_MESSAGE}', width: w, height: h }, '*');
  }
  window.addEventListener('message', function (e) {
    if (e.source !== parent || !e.data) return;
    if (e.data.type === '${DOC_PRINT_MESSAGE}') window.print();
  });
  window.addEventListener('load', report);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(report);
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  report();
})();`;

/**
 * Acrescenta ao HTML original (sem alterá-lo) um estilo só de tela, que desenha a folha com as
 * margens do `@page`, e o script de ponte. Na impressão (`@media print`) vale o CSS original.
 */
export function buildViewerDocument(html: string, setup: PageSetup): string {
  const contentWidthMm = setup.widthMm - 2 * setup.marginHorizontalMm;
  const contentHeightMm = setup.heightMm - 2 * setup.marginVerticalMm;

  const injected = `
<style id="siga-document-viewer">
  @media screen {
    /* Sem "font boosting": no Chrome mobile a folha (1123px) seria vista como página larga
       e os textos ampliados, estourando a largura da folha. */
    html {
      background: #ffffff !important;
      overflow: hidden !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    html body {
      box-sizing: content-box !important;
      width: ${contentWidthMm}mm !important;
      min-height: ${contentHeightMm}mm !important;
      margin: 0 !important;
      padding: ${setup.marginVerticalMm}mm ${setup.marginHorizontalMm}mm !important;
      background: #ffffff !important;
    }
  }
</style>
<script>${BRIDGE_SCRIPT}</script>`;

  const closingBody = html.toLowerCase().lastIndexOf('</body>');
  return closingBody >= 0
    ? html.slice(0, closingBody) + injected + html.slice(closingBody)
    : html + injected;
}
