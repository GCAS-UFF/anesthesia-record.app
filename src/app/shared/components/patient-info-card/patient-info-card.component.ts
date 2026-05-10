import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-patient-info-card',
  templateUrl: './patient-info-card.component.html',
  styleUrls: ['./patient-info-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class PatientInfoCardComponent {
  @Input() patientName: string = '';
  @Input() age: string = '';
  @Input() record: string = '';
  @Input() procedure: string = '';
  @Input() room: string = '';
  @Input() allergies: string[] = [];

  get hasAllergies(): boolean {
    return this.allergies && this.allergies.length > 0;
  }
}
