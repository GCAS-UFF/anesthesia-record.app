import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-patient-info-card',
  templateUrl: './patient-info-card.component.html',
  styleUrls: ['./patient-info-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientInfoCardComponent {
  @Input() patientName: string = '';
  @Input() age: string = '';
  @Input() birthDate: string = '';
  @Input() gender: string = '';
  @Input() weight: string = '';
  @Input() record: string = '';
  @Input() procedure: string = '';
  @Input() room: string = '';
  @Input() bed: string = '';
  @Input() allergies: string[] = [];
  @Input() compact: boolean = false;
  @Input() status: string = 'ASA II';

  get hasAllergies(): boolean {
    return this.allergies && this.allergies.length > 0;
  }
}
