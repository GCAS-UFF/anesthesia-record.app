import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

export type MoreAction = 'ficha' | 'position' | 'frequency' | 'customField' | 'customize';

/**
 * Menu "Mais" da barra de ferramentas, no mesmo estilo dos demais painéis.
 * Devolve a ação escolhida (`dismiss(action, 'select')`); quem abriu executa
 * depois de fechar, porque só um painel fica aberto por vez.
 */
@Component({
  selector: 'app-more-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <header class="pn__head">
      <h2 class="pn__title">{{ 'monitorizacao.shell.tools.moreTitle' | translate }}</h2>
      <button type="button" class="pn__icon-btn" (click)="cancel()" [attr.aria-label]="'common.close' | translate">×</button>
    </header>
    <div class="pn__body">
      <div class="pn__list">
        <button type="button" (click)="pick('ficha')">{{ 'monitorizacao.page.anestesicaButtonLabel' | translate }}</button>
        <ng-container *ngIf="canEdit">
          <button type="button" (click)="pick('position')">{{ 'monitorizacao.shell.tools.changePosition' | translate }}</button>
          <button type="button" (click)="pick('frequency')">
            {{ 'monitorizacao.shell.patientCard.frequencyButton' | translate: { minutes: intervalMinutes } }}
          </button>
          <button type="button" (click)="pick('customField')">{{ 'monitorizacao.shell.tools.newCustomField' | translate }}</button>
        </ng-container>
        <button type="button" (click)="pick('customize')">{{ 'monitorizacao.shell.customize.title' | translate }}</button>
      </div>
    </div>
  `,
  styleUrls: ['./more-panel.component.scss'],
})
export class MorePanelComponent {
  @Input() canEdit = true;
  @Input() intervalMinutes = 5;

  constructor(private readonly modalController: ModalController) {}

  pick(action: MoreAction): void {
    void this.modalController.dismiss(action, 'select');
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }
}
