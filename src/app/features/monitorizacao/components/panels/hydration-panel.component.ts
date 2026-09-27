import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FluidBalance } from '../../models/monitoring-view.model';
import { keypadToNumber, NumericKeypadComponent, numberToKeypad } from './numeric-keypad.component';

/**
 * Hidratação rápida (💧), fora do catálogo de balanço: volume no teclado próprio
 * e hora do lançamento (padrão: agora). Devolve `{ volumeMl, time }` com
 * `'save'`, ou `'delete'` na edição.
 */
@Component({
  selector: 'app-hydration-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, NumericKeypadComponent],
  template: `
    <header class="pn__head">
      <h2 class="pn__title">💧 {{ (initial ? 'monitorizacao.shell.panels.hydrationEditTitle' : 'monitorizacao.shell.panels.hydrationNewTitle') | translate }}</h2>
      <button type="button" class="pn__icon-btn" (click)="cancel()" [attr.aria-label]="'common.close' | translate">×</button>
    </header>

    <div class="pn__body">
      <p class="pn__hint">{{ 'monitorizacao.shell.panels.hydrationHint' | translate }}</p>
      <div class="pn__field pn__field--active">
        <span class="pn__field-label"><span>{{ 'monitorizacao.shell.panels.volume' | translate }}</span><em>ml</em></span>
        <span class="pn__field-value">{{ volume }}</span>
      </div>
      <div class="pn__time">
        <span class="pn__label">{{ 'monitorizacao.shell.panels.time' | translate }}</span>
        <input type="time" [(ngModel)]="time" [attr.aria-label]="'monitorizacao.shell.panels.time' | translate" />
        <button type="button" class="pn__chip" (click)="setNow()">{{ 'monitorizacao.shell.panels.now' | translate }}</button>
      </div>
    </div>

    <div class="hp__keypad">
      <app-numeric-keypad [value]="volume" [allowDecimal]="false" (valueChange)="volume = $event"></app-numeric-keypad>
    </div>

    <footer class="pn__foot">
      <button type="button" class="pn__btn pn__btn--danger" *ngIf="initial" (click)="remove()">{{ 'monitorizacao.page.actions.delete' | translate }}</button>
      <button type="button" class="pn__btn pn__btn--primary" [disabled]="!canSave" (click)="save()">{{ 'common.save' | translate }}</button>
    </footer>
  `,
  styleUrls: ['./hydration-panel.component.scss'],
})
export class HydrationPanelComponent implements OnInit {
  @Input() initial: FluidBalance | null = null;

  volume = '';
  time = '';

  constructor(private readonly modalController: ModalController) {}

  ngOnInit(): void {
    this.volume = numberToKeypad(this.initial?.volumeMl ?? null);
    this.time = this.initial?.time ?? this.nowHM();
  }

  get canSave(): boolean {
    const n = keypadToNumber(this.volume);
    return n != null && n > 0;
  }

  save(): void {
    if (!this.canSave) return;
    void this.modalController.dismiss({ volumeMl: keypadToNumber(this.volume), time: this.time || this.nowHM() }, 'save');
  }

  remove(): void {
    void this.modalController.dismiss(null, 'delete');
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  setNow(): void {
    this.time = this.nowHM();
  }

  private nowHM(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
