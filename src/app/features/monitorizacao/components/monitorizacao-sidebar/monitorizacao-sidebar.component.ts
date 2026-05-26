import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { Agent, ClinicalEvent, FluidBalance } from 'src/app/core/models/clinical-data.model';

@Component({
  selector: 'app-monitorizacao-sidebar',
  templateUrl: './monitorizacao-sidebar.component.html',
  styleUrls: ['./monitorizacao-sidebar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitorizacaoSidebarComponent {
  @Input() isSurgeryStarted = false;
  @Input() isSurgeryFinished = false;
  @Input() isAnesthesiaStarted = false;
  @Input() startTimeAnesthesia: string | null = null;
  @Input() startTimeSurgery: string | null = null;
  @Input() timerValue: string = '00:00:00';
  
  @Input() agents: Agent[] = [];
  @Input() events: ClinicalEvent[] = [];
  @Input() balanceItems: FluidBalance[] = [];
  @Input() expandedSections: any = { agents: true, events: true, balance: true };

  @Output() onIniciarAnestesia = new EventEmitter<void>();
  @Output() onIniciarCirurgia = new EventEmitter<void>();
  @Output() onFinalizarCirurgia = new EventEmitter<void>();
  
  @Output() onToggleSection = new EventEmitter<string>();
  
  @Output() onOpenAgentModal = new EventEmitter<Agent | undefined>();
  @Output() onDeleteAgent = new EventEmitter<string>();
  
  @Output() onOpenEventModal = new EventEmitter<{ type: 'event' | 'incident' | 'technique' | 'position', item?: ClinicalEvent }>();
  @Output() onDeleteEvent = new EventEmitter<string>();
  
  @Output() onOpenBalanceModal = new EventEmitter<FluidBalance | undefined>();
  @Output() onDeleteBalance = new EventEmitter<string>();

  trackById(index: number, item: any) {
    return item.id;
  }

  getTotalGains() {
    return this.balanceItems.filter(b => b.type === 'gain').reduce((acc, b) => acc + (b.value || 0), 0);
  }
  
  getTotalLosses() {
    return this.balanceItems.filter(b => b.type === 'loss').reduce((acc, b) => acc + (b.value || 0), 0);
  }
  
  getNetBalance() {
    return this.getTotalGains() - this.getTotalLosses();
  }

  iniciarAnestesia() {
    this.onIniciarAnestesia.emit();
  }

  iniciarCirurgia() {
    this.onIniciarCirurgia.emit();
  }

  finalizarCirurgia() {
    this.onFinalizarCirurgia.emit();
  }

  toggleSection(section: string, event: Event) {
    event.stopPropagation();
    this.onToggleSection.emit(section);
  }

  openAgentModal(agent?: Agent) {
    if (!this.isSurgeryFinished) {
      this.onOpenAgentModal.emit(agent);
    }
  }

  deleteAgent(event: Event, id: string) {
    event.stopPropagation();
    if (!this.isSurgeryFinished) {
      this.onDeleteAgent.emit(id);
    }
  }

  openEventModal(type: 'event' | 'incident' | 'technique' | 'position', item?: ClinicalEvent) {
    if (!this.isSurgeryFinished) {
      this.onOpenEventModal.emit({ type, item });
    }
  }

  deleteEvent(event: Event, id: string) {
    event.stopPropagation();
    if (!this.isSurgeryFinished) {
      this.onDeleteEvent.emit(id);
    }
  }

  openBalanceModal(item?: FluidBalance) {
    if (!this.isSurgeryFinished) {
      this.onOpenBalanceModal.emit(item);
    }
  }

  deleteBalance(event: Event, id: string) {
    event.stopPropagation();
    if (!this.isSurgeryFinished) {
      this.onDeleteBalance.emit(id);
    }
  }
}
