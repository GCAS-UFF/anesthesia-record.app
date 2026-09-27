import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { PrimaryActionKind } from '../../models/monitoring-view.model';

/**
 * Barra única do topo da Monitorização: identificação do paciente e do
 * procedimento, cronômetros e o controle de estado do procedimento em um só
 * lugar (antes o início ficava no cartão do paciente e o fim na barra inferior).
 * A regra de estados continua no componente pai (`primaryAction`).
 */
@Component({
  selector: 'app-monitoring-top-bar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './monitoring-top-bar.component.html',
  styleUrls: ['./monitoring-top-bar.component.scss'],
})
export class MonitoringTopBarComponent {
  @Input() patientName = '';
  @Input() patientAge: string | number = '';
  @Input() patientRecord = '';
  @Input() procedureName = '';
  @Input() anesthesiaTimer = '00:00:00';
  @Input() surgeryTimer = '00:00:00';
  @Input() primaryAction: PrimaryActionKind = 'start-anesthesia';
  @Input() isAnesthesiaStarted = false;
  @Input() isSurgeryStarted = false;
  @Input() isSurgeryFinished = false;
  @Input() isAnesthesiaFinished = false;
  @Input() canEdit = true;
  /** Mesma regra da antiga barra inferior: finalizar a cirurgia é possível desde que a anestesia tenha começado. */
  @Input() canFinalize = false;
  @Input() pendingSyncCount = 0;
  @Input() isSyncing = false;

  @Output() back = new EventEmitter<void>();
  @Output() patientClick = new EventEmitter<void>();
  @Output() primaryClick = new EventEmitter<void>();
  @Output() finalizeClick = new EventEmitter<void>();
  @Output() syncNow = new EventEmitter<void>();

  get primaryLabelKey(): string {
    switch (this.primaryAction) {
      case 'start-anesthesia': return 'monitorizacao.shell.patientCard.startAnesthesia';
      case 'start-surgery': return 'monitorizacao.shell.patientCard.startSurgery';
      case 'surgery-in-progress': return 'monitorizacao.shell.actions.finalizeSurgery';
      case 'awaiting-finalize': return 'monitorizacao.shell.actions.finalizeAnesthesia';
      default: return 'monitorizacao.shell.patientCard.finished';
    }
  }

  get isFinalizeStep(): boolean {
    return this.primaryAction === 'surgery-in-progress' || this.primaryAction === 'awaiting-finalize';
  }

  get primaryDisabled(): boolean {
    if (this.primaryAction === 'finished') return true;
    return this.isFinalizeStep ? !this.canFinalize : !this.canEdit;
  }

  /** Anestesia iniciada e cirurgia ainda não: finalizar a cirurgia continua disponível, como antes. */
  get showSecondaryFinalize(): boolean {
    return this.primaryAction === 'start-surgery' && this.canFinalize;
  }

  get initials(): string {
    return (this.patientName || '')
      .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '—';
  }
}
