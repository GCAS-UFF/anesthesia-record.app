import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonRippleEffect, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  medicalOutline,
  personOutline,
  documentTextOutline,
  readerOutline,
  fitnessOutline,
  heartOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  clipboardOutline,
  trashOutline,
  archiveOutline,
  personRemoveOutline,
  returnUpBackOutline,
  exitOutline,
  calendarClearOutline,
  timeOutline,
  lockOpenOutline
} from 'ionicons/icons';
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

  @Input() isCancelled = false;
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
  @Input() surgeryDate: string | null = null;
  @Input() anesthesiologist = '';
  @Input() age = 0;
  @Input() record = '';

  @Input() isCurrentAnesthesiologist = false;
  @Input() isPreAnesthesiaRecordDone = false;
  @Input() canAssumePatient = true;
  @Input() canAbandon = true;
  @Input() isAdmin = false;

  @Output() openPreAnesthesia = new EventEmitter<void>();
  @Output() viewPreAnesthesia = new EventEmitter<void>();
  @Output() assume = new EventEmitter<boolean>();
  @Output() openFicha = new EventEmitter<void>();
  @Output() viewRegistro = new EventEmitter<void>();
  @Output() abandonSurgery = new EventEmitter<void>();
  @Output() reopenFicha = new EventEmitter<void>();

  @Input() id!: string | number;
  @Input() isOpen: boolean = false;
  @Output() openChange = new EventEmitter<string | number | null>();
  @Input() swipeThreshold = 80;
  @Input() maxSwipeOffset = 200;
  @Input() showDeleteAction = true;

  isSwipedLeft = false;
  slideOffset = 0;
  isAnimating = false;
  private startX = 0;
  private currentX = 0;
  private isDragging = false;
  private isSwiping = false;
  private touchId: number | null = null;
  openCardId: string | number | null = null;

  constructor() {
    addIcons({
      exitOutline,
      timeOutline,
      fitnessOutline,
      calendarClearOutline,
      lockOpenOutline,
      medicalOutline,
      documentTextOutline,
      readerOutline,
      returnUpBackOutline,
      personRemoveOutline,
      archiveOutline,
      heartOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      clipboardOutline,
      personOutline,
      trashOutline
    });
  }

  get isCompleted(): boolean {
    return this.status === SurgeryStatusEnum.Concluido;
  }

  get isInProgress(): boolean {
    return this.status === SurgeryStatusEnum.EmProgresso;
  }

  get isWaiting(): boolean {
    return this.status === SurgeryStatusEnum.Agendado;
  }

  get isFinished(): boolean {
    return this.status === SurgeryStatusEnum.Concluido ||
      this.status === SurgeryStatusEnum.Cancelada;
  }

  
  get isMyActivePatient(): boolean {
    return this.isCurrentAnesthesiologist && !this.isFinished;
  }

  get hasProcedure(): boolean {
    return !!this.procedure && this.procedure !== 'Procedimento não informado';
  }

  get canAssumeThisPatient(): boolean {
    if (this.isAdmin) {
      return false;
    }

    if (!this.canAssumePatient) {
      return false;
    }

    if (this.isCurrentAnesthesiologist) {
      return true;
    }

    if (this.anesthesiologist && this.anesthesiologist.trim() !== '') {
      return false;
    }

    return true;
  }


  get shouldShowAssumeButton(): boolean {
    if (this.isAdmin) {
      return false;
    }

    if (!this.canAssumePatient) {
      return false;
    }

    if (this.isFinished) {
      return false;
    }

    if (this.isCurrentAnesthesiologist) {
      return false;
    }

    // Mostrar se o paciente não tem responsável
    return !this.anesthesiologist || this.anesthesiologist.trim() === '';
  }


  get canFillPreAnesthesia(): boolean {
    if (this.isFinished) {
      return false;
    }
    return this.isCurrentAnesthesiologist;
  }

  
  get isAssignedToOtherDoctor(): boolean {
    if (this.isCurrentAnesthesiologist) {
      return false;
    }
    return !!this.anesthesiologist && this.anesthesiologist.trim() !== '';
  }

  get shouldShowViewPreAnesthesia(): boolean {
    if (this.isCurrentAnesthesiologist) {
      return false;
    }
    return this.isPreAnesthesiaRecordDone;
  }

  get shouldShowOnlyViewRecords(): boolean {
    return this.isFinished || this.isAssignedToOtherDoctor || this.shouldShowViewPreAnesthesia;
  }
 
  get shouldShowAbandonButton(): boolean {
    if (this.isFinished) {
      return false;
    }

    if (this.isAdmin) {
      return !!this.anesthesiologist && this.anesthesiologist.trim() !== '';
    }

    if (!this.isCurrentAnesthesiologist) {
      return false;
    }

    if (this.canAssumePatient) {
      return false;
    }

    if (!this.canAbandon) {
      return false;
    }

    return true;
  }

  get isAbandonButtonEnabled(): boolean {
    if (!this.shouldShowAbandonButton) {
      return false;
    }

    return true;
  }

  get abandonButtonLabel(): string {
    return this.isAdmin ? 'Remover Médico' : 'Abandonar';
  }

  get abandonButtonIcon(): string {
    return this.isAdmin ? 'person-remove-outline' : 'exit-outline';
  }

  
  get shouldShowReopenButton(): boolean {
    return this.isAdmin && this.isCompleted;
  }

  get canOpenAnestheticRecord(): boolean {
    if (!this.isPreAnesthesiaRecordDone) {
      return false;
    }

    if (this.isFinished) {
      return false;
    }

    return this.isCurrentAnesthesiologist;
  }

  get shouldShowGoToSurgeryButton(): boolean {
    if (this.isAdmin) {
      return false;
    }

    if (this.canAssumePatient) {
      return false;
    }

    if (!this.isCurrentAnesthesiologist) {
      return false;
    }

    if (this.isFinished) {
      return false;
    }

    return true;
  }

  
  get isGoToSurgeryButtonEnabled(): boolean {
    return this.isPreAnesthesiaRecordDone && !this.isFinished;
  }

  get slideTransform(): string {
    return `translateX(${this.slideOffset}px)`;
  }

  onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;

    this.touchId = touch.identifier;
    this.startX = touch.clientX;
    this.currentX = this.startX;
    this.isDragging = true;
    this.isSwiping = false;
    this.isAnimating = false;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;

    const touch = Array.from(event.touches).find(t => t.identifier === this.touchId);
    if (!touch) return;

    const deltaX = touch.clientX - this.startX;

    if (!this.isSwiping && Math.abs(deltaX) > 10) {
      this.isSwiping = true;
    }

    if (this.isSwiping) {
      const newOffset = Math.min(0, deltaX);
      this.slideOffset = Math.max(-this.maxSwipeOffset, newOffset);
      this.currentX = touch.clientX;
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (this.isSwiping) {
      this.openChange.emit(this.id);
    } else {
      this.isSwipedLeft = false;
      this.openChange.emit(null);
    }

    if (!this.isDragging) return;

    this.isDragging = false;
    this.touchId = null;

    if (this.isSwiping) {
      this.finishSwipe();
    }

    this.isSwiping = false;
  }

  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('.btn')) {
      return;
    }

    this.startX = event.clientX;
    this.currentX = this.startX;
    this.isDragging = true;
    this.isSwiping = false;
    this.isAnimating = false;
  }

  onMouseUp(event: MouseEvent) {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (this.isSwiping) {
      this.finishSwipe();
    }

    this.isSwiping = false;
  }

  onMouseLeave(event: MouseEvent) {
    if (this.isDragging && this.isSwiping) {
      this.finishSwipe();
    }
    this.isDragging = false;
    this.isSwiping = false;
  }

  private finishSwipe() {
    this.isAnimating = true;

    if (this.slideOffset < -this.swipeThreshold) {
      this.isSwipedLeft = true;
      this.slideOffset = -this.maxSwipeOffset;
    } else {
      this.isSwipedLeft = false;
      this.slideOffset = 0;
    }

    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  resetSwipe() {
    if (this.isSwipedLeft) {
      this.isAnimating = true;
      this.isSwipedLeft = false;
      this.slideOffset = 0;
      setTimeout(() => {
        this.isAnimating = false;
      }, 300);
    }
  }

  onOpenPreAnesthesia() {
    this.resetSwipe();
    this.openPreAnesthesia.emit();
  }

  onViewPreAnesthesia() {
    this.resetSwipe();
    this.viewPreAnesthesia.emit();
  }

  onAssume() {
    this.resetSwipe();
    this.assume.emit(this.isCurrentAnesthesiologist);
  }

  onOpenFicha() {
    this.resetSwipe();
    this.openFicha.emit();
  }

  onViewRegistro() {
    this.resetSwipe();
    this.viewRegistro.emit();
  }

  onAbandon() {
    this.resetSwipe();
    this.abandonSurgery.emit();
  }

  onReopenFicha() {
    this.resetSwipe();
    this.reopenFicha.emit();
  }
}