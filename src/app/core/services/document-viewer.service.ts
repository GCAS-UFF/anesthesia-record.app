import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { Observable } from 'rxjs';

import { DocumentViewerModalComponent } from 'src/app/shared/components/document-viewer-modal/document-viewer-modal.component';
import { PaperOrientation } from './native-print';

export interface DocumentViewerRequest {
  /** Título exibido no topo do visualizador e usado como nome do trabalho de impressão. */
  title: string;
  subtitle?: string;
  /** Requisição autenticada que devolve o HTML do documento gerado pelo backend. */
  load: () => Observable<string>;
  /** Usada só quando o documento não declara `@page { size: A4 ... }`. */
  orientation?: PaperOrientation;
}

/**
 * Ponto único de abertura dos documentos de impressão (ficha, pré-anestésica, relatórios).
 * Exibe o documento num modal em tela cheia, por cima da tela atual, que continua montada —
 * ao fechar, o usuário volta exatamente para onde estava, com os mesmos filtros.
 */
@Injectable({ providedIn: 'root' })
export class DocumentViewerService {
  private opening = false;

  constructor(private modalController: ModalController) {}

  async open(request: DocumentViewerRequest): Promise<void> {
    // Evita abrir (e gerar) o mesmo documento duas vezes num toque duplo.
    if (this.opening) return;
    this.opening = true;

    try {
      const modal = await this.modalController.create({
        component: DocumentViewerModalComponent,
        componentProps: { request },
        cssClass: 'siga-document-viewer',
        backdropDismiss: false,
      });
      await modal.present();
      await modal.onDidDismiss();
    } finally {
      this.opening = false;
    }
  }
}
