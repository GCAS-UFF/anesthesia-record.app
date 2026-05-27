import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-patient-info-card',
  templateUrl: './patient-info-card.component.html',
  styleUrls: ['./patient-info-card.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
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
  @Input() unit: string = '';
  @Input() floor: string = '';
  @Input() surgicalCenter: string = '';
  @Input() allergies: any = [];
  @Input() compact: boolean = false;
  @Input() status: string = 'ASA II';

  get formattedAllergies(): string {
    if (!this.allergies) return '';
    if (Array.isArray(this.allergies)) {
      return this.allergies.map((a: any) => {
        if (typeof a === 'string') return a;
        return a.name || a.description || a.medicamento || 'Alergia (não especificada)';
      }).join(', ');
    }
    return String(this.allergies);
  }

  get hasAllergies(): boolean {
    if (!this.allergies) return false;
    if (Array.isArray(this.allergies)) return this.allergies.length > 0;
    return true;
  }
}
