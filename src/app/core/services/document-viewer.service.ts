import { Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { Observable } from 'rxjs';

import { DocumentViewerModalComponent } from 'src/app/shared/components/document-viewer-modal/document-viewer-modal.component';
import { PaperOrientation } from './native-print';

export interface DocumentViewerRequest {  
  title: string;
  subtitle?: string;  
  load: () => Observable<string>;  
  orientation?: PaperOrientation;
}


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
