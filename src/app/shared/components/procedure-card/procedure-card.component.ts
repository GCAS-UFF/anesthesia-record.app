import { Component, Input, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
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
  trashOutline,
  archiveOutline, personRemoveOutline, returnUpBackOutline, exitOutline, calendarClearOutline, timeOutline } from 'ionicons/icons';
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

  @Input() canAssumePatient = true;
  @Input() canAbandon = true;
  @Input() isCurrentAnesthesiologist = false;

  @Input() id!: string | number;
  @Input() isOpen: boolean = false;
  @Output() openChange = new EventEmitter<string | number | null>();

  @Input() swipeThreshold = 80;
  @Input() maxSwipeOffset = 200;
  @Input() showDeleteAction = true;

  @Output() assume = new EventEmitter<boolean>();
  @Output() openFicha = new EventEmitter<void>();
  @Output() viewRegistro = new EventEmitter<void>();

  @Output() abandonSurgery = new EventEmitter<void>();

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
    addIcons({exitOutline,timeOutline,fitnessOutline,calendarClearOutline,medicalOutline,documentTextOutline,readerOutline,returnUpBackOutline,personRemoveOutline,archiveOutline,heartOutline,checkmarkCircle,personOutline,trashOutline});
  }

  get isCompleted(): boolean { return this.status === SurgeryStatusEnum.Concluido; }
  get isInProgress(): boolean { return this.status === SurgeryStatusEnum.EmProgresso; }
  get isWaiting(): boolean { return this.status === SurgeryStatusEnum.Agendado; }

  get hasProcedure(): boolean {
    return !!this.procedure && this.procedure !== 'Procedimento não informado';
  }

  get canAssumeThisPatient(): boolean {
    if (this.isCurrentAnesthesiologist) {
      return true;
    }

    if (this.anesthesiologist && this.anesthesiologist.trim() !== '') {
      return false;
    }

    return this.canAssumePatient;
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

    if (!this.isDragging)
      return;

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
    this.abandonSurgery.emit();
  }
}