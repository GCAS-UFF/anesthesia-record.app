import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-procedure-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  providers: [DatePipe],
  templateUrl: './procedure-card.component.html',
  styleUrls: ['./procedure-card.component.scss']
})
export class ProcedureCardComponent {
  @Input() patientName: string = '';
  @Input() room: string = '';
  @Input() procedure: string = '';
  @Input() status: 'waiting' | 'completed' | string = 'waiting';
  @Input() time: string | null = '';
  @Input() completedAt: string | null = null;
  @Input() birthDate: string = '';
  @Input() age: number = 0;
  @Input() record: string = '';
  @Input() id: number | string = '';

  @Output() assume = new EventEmitter<void>();
  @Output() openFicha = new EventEmitter<void>();
  @Output() viewRegistro = new EventEmitter<void>();

  onAssume() {
    this.assume.emit();
  }

  onOpenFicha() {
    this.openFicha.emit();
  }

  onViewRegistro() {
    this.viewRegistro.emit();
  }
}
