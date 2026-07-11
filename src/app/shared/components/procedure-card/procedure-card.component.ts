import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonRippleEffect, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  medicalOutline,
  personOutline,
  documentTextOutline,
  readerOutline, fitnessOutline, heartOutline, 
  checkmarkCircle} from 'ionicons/icons';
import { SurgeryStatusEnum } from 'src/app/core/models/api-enums.model';

export type ProcedureStatus = SurgeryStatusEnum | null;
export type ProcedureType = 'Eletiva' | 'Urgência' | 'Emergência';

@Component({
  selector: 'app-procedure-card',
  standalone: true,
  imports: [CommonModule, IonRippleEffect, IonIcon],
  providers: [DatePipe],
  templateUrl: './procedure-card.component.html',
  styleUrls: ['./procedure-card.component.scss'],
})
export class ProcedureCardComponent {
  readonly SurgeryStatusEnum = SurgeryStatusEnum;
  @Input() patientName = '';
  @Input() room = '';
  @Input() surgicalCenter = '';
  @Input() bed = '';
  @Input() floor = '';
  @Input() unit = '';
  @Input() procedure = '';
  @Input() status: SurgeryStatusEnum | null = null;
  @Input() type: ProcedureType | string = 'Eletiva';
  @Input() time: string | null = '';
  @Input() completedAt: string | null = null;
  @Input() birthDate = '';
  @Input() anesthesiologist = '';
  @Input() age = 0;
  @Input() record = '';
  @Input() id: number | string = '';

  @Output() assume = new EventEmitter<void>();
  @Output() openFicha = new EventEmitter<void>();
  @Output() viewRegistro = new EventEmitter<void>();

  constructor() {
    addIcons({heartOutline,medicalOutline,documentTextOutline,checkmarkCircle, personOutline,readerOutline,fitnessOutline});
  }

  get isCompleted(): boolean { return this.status === SurgeryStatusEnum.Concluido; }
  get isInProgress(): boolean { return this.status === SurgeryStatusEnum.EmProgresso; }
  get isWaiting(): boolean { return this.status === SurgeryStatusEnum.Agendado; }
  get isCancelled(): boolean { return this.status === SurgeryStatusEnum.Cancelada; }

  get hasProcedure(): boolean {
    return !!this.procedure && this.procedure !== 'Procedimento não informado';
  }

  onAssume() { this.assume.emit(); }
  onOpenFicha() { this.openFicha.emit(); }
  onViewRegistro() { this.viewRegistro.emit(); }
}