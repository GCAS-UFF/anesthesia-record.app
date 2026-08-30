import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface PrintResult {
  ok: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrintingService {

  async openPdf(blob: Blob, fileName: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.openInBrowser(blob);
      return;
    }

    const uri = await this.saveToCache(blob, fileName);
    await Share.share({ url: uri, title: fileName });
  }

  async printPdf(blob: Blob, fileName: string): Promise<PrintResult> {
    if (!Capacitor.isNativePlatform()) {
      this.openInBrowser(blob);
      return { ok: true };
    }

    try {
      const uri = await this.saveToCache(blob, fileName);
      await Share.share({ url: uri, title: fileName, dialogTitle: 'Imprimir relatório' });
      return { ok: true };
    } catch (error) {
      console.error('Erro ao preparar impressão', error);
      return {
        ok: false,
        message: 'Nenhuma impressora disponível no tablet. Verifique as configurações de impressão do dispositivo.'
      };
    }
  }

  private openInBrowser(blob: Blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private async saveToCache(blob: Blob, fileName: string): Promise<string> {
    const base64 = await this.blobToBase64(blob);
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    const result = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    return result.uri;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
