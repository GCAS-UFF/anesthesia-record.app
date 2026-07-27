import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pulseOutline, medkitOutline, warningOutline, waterOutline,
  checkmarkDoneOutline, cutOutline, timeOutline, listOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-quick-action-sidebar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  templateUrl: './quick-action-sidebar.component.html',
  styleUrls: ['./quick-action-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickActionSidebarComponent {
  @Input() isAnesthesiaStarted = false;
  @Input() isSurgeryStarted = false;
  @Input() isSurgeryFinished = false;
  @Input() startTimeAnesthesia: Date | string | null = null;
  @Input() startTimeSurgery: Date | string | null = null;
  @Input() anesthesiaTimer = '00:00:00';
  @Input() surgeryTimer = '00:00:00';

  @Input() posicaoAtual = '';
  @Input() posicoesPossiveis: string[] = [];
  @Input() positionHistory: Array<{ time: string; position: string }> = [];

  @Input() recentActivity: Array<{ time: string; icon: string; label: string; color: string }> = [];
  @Input() autoMonitoringIntervalMinutes: number | null = null;

  @Output() iniciarAnestesia = new EventEmitter<void>();
  @Output() iniciarCirurgia = new EventEmitter<void>();
  @Output() mudarPosicao = new EventEmitter<string>();
  @Output() reconfigurarFrequencia = new EventEmitter<void>();
  @Output() addVital = new EventEmitter<void>();
  @Output() addAgent = new EventEmitter<void>();
  @Output() addEvent = new EventEmitter<void>();
  @Output() addBalance = new EventEmitter<void>();
  @Output() openHistoryFull = new EventEmitter<void>();

  showPositionPicker = false;

  constructor() {
    addIcons({ pulseOutline, medkitOutline, warningOutline, waterOutline,
      checkmarkDoneOutline, cutOutline, timeOutline, listOutline });
  }

  togglePos() { this.showPositionPicker = !this.showPositionPicker; }
  choosePos(p: string) {
    this.mudarPosicao.emit(p);
    this.showPositionPicker = false;
  }
}
