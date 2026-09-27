import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonReorder, IonReorderGroup, ItemReorderEventDetail, ModalController } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { MonitoringLayout, TIMELINE_GROUPS, TimelineGroupDef, TimelineGroupId } from '../../services/monitoring-layout.service';

/**
 * Modo Personalizar: ordem e visibilidade dos grupos da linha do tempo, com
 * prévia ao vivo (`onPreview`). Só muda a apresentação — nenhum dado clínico é
 * arrastável. Salvar → `dismiss(layout, 'save')`; Cancelar → quem abriu
 * restaura o layout anterior.
 */
@Component({
  selector: 'app-customize-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe, IonReorderGroup, IonReorder],
  template: `
    <header class="pn__head">
      <h2 class="pn__title">{{ 'monitorizacao.shell.customize.title' | translate }}</h2>
      <button type="button" class="pn__icon-btn" (click)="cancel()" [attr.aria-label]="'common.close' | translate">×</button>
    </header>

    <div class="pn__body">
      <p class="pn__hint">{{ 'monitorizacao.shell.customize.hint' | translate }}</p>

      <ion-reorder-group class="cz__list" [disabled]="false" (ionItemReorder)="onReorder($event)">
        <div class="cz__item" *ngFor="let g of items" [class.cz__item--locked]="g.locked" [class.cz__item--hidden]="isHidden(g.id)">
          <ion-reorder *ngIf="!g.locked" class="cz__handle" [attr.aria-label]="'monitorizacao.shell.customize.dragAria' | translate">≡</ion-reorder>
          <span class="cz__handle cz__handle--locked" *ngIf="g.locked" aria-hidden="true">🔒</span>
          <span class="cz__name">{{ g.labelKey | translate }}</span>
          <span class="cz__fixed" *ngIf="g.locked">{{ 'monitorizacao.shell.customize.fixed' | translate }}</span>
          <button
            type="button"
            class="cz__eye"
            *ngIf="!g.locked"
            [attr.aria-pressed]="!isHidden(g.id)"
            [attr.aria-label]="'monitorizacao.shell.customize.toggleAria' | translate"
            (click)="toggle(g.id)"
          >{{ isHidden(g.id) ? ('monitorizacao.shell.customize.hidden' | translate) : ('monitorizacao.shell.customize.visible' | translate) }}</button>
        </div>
      </ion-reorder-group>

      <div class="pn__confirm" *ngIf="confirmingReset">
        <p>{{ 'monitorizacao.shell.customize.resetConfirm' | translate }}</p>
        <div>
          <button type="button" class="pn__btn" (click)="confirmingReset = false">{{ 'common.cancel' | translate }}</button>
          <button type="button" class="pn__btn pn__btn--danger" (click)="reset()">{{ 'monitorizacao.shell.customize.reset' | translate }}</button>
        </div>
      </div>
      <button type="button" class="pn__btn" *ngIf="!confirmingReset" (click)="confirmingReset = true">
        {{ 'monitorizacao.shell.customize.reset' | translate }}
      </button>
    </div>

    <footer class="pn__foot">
      <button type="button" class="pn__btn" (click)="cancel()">{{ 'common.cancel' | translate }}</button>
      <button type="button" class="pn__btn pn__btn--primary" (click)="save()">{{ 'monitorizacao.shell.customize.save' | translate }}</button>
    </footer>
  `,
  styleUrls: ['./customize-panel.component.scss'],
})
export class CustomizePanelComponent implements OnInit {
  @Input() layout!: MonitoringLayout;
  @Input() defaultLayout!: MonitoringLayout;
  @Input() onPreview: (layout: MonitoringLayout) => void = () => {};

  items: TimelineGroupDef[] = [];
  hidden = new Set<TimelineGroupId>();
  confirmingReset = false;

  constructor(private readonly modalController: ModalController) {}

  ngOnInit(): void {
    this.apply(this.layout);
  }

  private apply(layout: MonitoringLayout): void {
    this.items = layout.order.map((id) => TIMELINE_GROUPS.find((g) => g.id === id)!).filter(Boolean);
    this.hidden = new Set(layout.hidden);
  }

  private get current(): MonitoringLayout {
    return { order: this.items.map((g) => g.id), hidden: [...this.hidden] };
  }

  isHidden(id: TimelineGroupId): boolean {
    return this.hidden.has(id);
  }

  toggle(id: TimelineGroupId): void {
    if (this.hidden.has(id)) this.hidden.delete(id);
    else this.hidden.add(id);
    this.onPreview(this.current);
  }

  onReorder(ev: CustomEvent<ItemReorderEventDetail>): void {
    this.items = ev.detail.complete(this.items);
    this.onPreview(this.current);
  }

  reset(): void {
    this.confirmingReset = false;
    this.apply(this.defaultLayout);
    this.onPreview(this.current);
  }

  save(): void {
    void this.modalController.dismiss(this.current, 'save');
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }
}
