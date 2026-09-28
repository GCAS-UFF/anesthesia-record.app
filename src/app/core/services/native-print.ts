import { Capacitor, registerPlugin } from '@capacitor/core';

export type PaperOrientation = 'portrait' | 'landscape';

export interface PrintHtmlOptions {
  html: string;
  jobName: string;
  orientation: PaperOrientation;
}

/**
 * Plugin nativo local (android/app/.../SigaPrintPlugin.java). Renderiza o HTML num WebView
 * fora da tela e abre o diálogo de impressão do Android (PrintManager), que também oferece
 * "Salvar como PDF" — sem abrir o Chrome nem outro aplicativo.
 */
interface SigaPrintPlugin {
  printHtml(options: PrintHtmlOptions): Promise<void>;
}

export const SigaPrint = registerPlugin<SigaPrintPlugin>('SigaPrint');

export function isNativePrintAvailable(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('SigaPrint');
}
