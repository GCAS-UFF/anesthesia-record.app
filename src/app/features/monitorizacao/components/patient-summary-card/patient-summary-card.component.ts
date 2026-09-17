import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { PrimaryActionKind } from '../../models/monitoring-view.model';

@Component({
  selector: 'app-patient-summary-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './patient-summary-card.component.html',
  styleUrls: ['./patient-summary-card.component.scss'],
})
export class PatientSummaryCardComponent {
  @Input() patientName = '';
  @Input() patientAge: string | number = '';
  @Input() patientRecord: string | number = '';
  @Input() anesthesiaTimer = '00:00:00';
  @Input() surgeryTimer = '00:00:00';
  @Input() primaryAction: PrimaryActionKind = 'start-anesthesia';
  @Input() autoMonitoringIntervalMinutes = 5;
  @Input() canEdit = true;
  @Input() pendingSyncCount = 0;
  @Input() isSyncing = false;

  @Output() primaryActionClick = new EventEmitter<void>();
  @Output() frequencyClick = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() syncNow = new EventEmitter<void>();

  get initials(): string {
    const parts = this.patientName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  get primaryActionLabelKey(): string {
    switch (this.primaryAction) {
      case 'start-surgery': return 'monitorizacao.shell.patientCard.startSurgery';
      case 'surgery-in-progress': return 'monitorizacao.shell.patientCard.surgeryInProgress';
      case 'awaiting-finalize': return 'monitorizacao.shell.patientCard.waitingFinalize';
      case 'finished': return 'monitorizacao.shell.patientCard.finished';
      default: return 'monitorizacao.shell.patientCard.startAnesthesia';
    }
  }

  /** Só 'start-anesthesia'/'start-surgery' são clicáveis — o encerramento (cirurgia e
   * anestesia) acontece sempre pelo botão "Finalizar" da barra inferior, no mesmo
   * fluxo em 2 etapas já usado na tela antiga. */
  get isStaticState(): boolean {
    return this.primaryAction === 'finished'
      || this.primaryAction === 'awaiting-finalize'
      || this.primaryAction === 'surgery-in-progress';
  }
}
