import { Component, EventEmitter, Output, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmarkCircle, trashOutline } from 'ionicons/icons';
import { MonitoringRecord } from 'src/app/core/models/monitoring-record.model';

@Component({
  selector: 'app-quick-vital-input',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './quick-vital-input.component.html',
  styleUrls: ['./quick-vital-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickVitalInputComponent {
  @Input() vitalData: MonitoringRecord | null = null;
  @Output() onSave = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  isSaving = false;

  constructor() {
    addIcons({ checkmarkCircle, trashOutline });
  }

  save() {
    if (!this.isValid()) return;

    this.sanitizeData();
    this.isSaving = true;
    
    // Simula um delay de salvamento para feedback visual (loading leve)
    setTimeout(() => {
      this.onSave.emit();
      this.isSaving = false;
    }, 600);
  }

  private sanitizeData() {
    if (!this.vitalData) return;

    // Garante que os números estão dentro de faixas aceitáveis (Clamping)
    const clamp = (val: number | null, min: number, max: number) => {
      if (val === null) return null;
      return Math.min(Math.max(val, min), max);
    };

    this.vitalData.pas = clamp(this.vitalData.pas, 0, 300);
    this.vitalData.pad = clamp(this.vitalData.pad, 0, 250);
    this.vitalData.fc = clamp(this.vitalData.fc, 0, 250);
    this.vitalData.spo2 = clamp(this.vitalData.spo2, 0, 100);
    this.vitalData.temp = clamp(this.vitalData.temp, 30, 45);
    this.vitalData.etco2 = clamp(this.vitalData.etco2, 0, 150);
  }

  private isValid(): boolean {
    if (!this.vitalData) return false;
    
    // Valida se pelo menos um sinal vital foi preenchido
    const hasVital = !!(this.vitalData.pas || this.vitalData.pad || this.vitalData.fc || 
                        this.vitalData.spo2 || this.vitalData.temp || this.vitalData.etco2);
    
    // Valida formato de hora (HH:mm)
    const isTimeValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(this.vitalData.time);

    return hasVital && isTimeValid;
  }

  clear() {
    this.onCancel.emit();
  }
}
