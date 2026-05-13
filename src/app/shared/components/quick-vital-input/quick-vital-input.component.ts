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

  constructor() {
    addIcons({ checkmarkCircle, trashOutline });
  }

  save() {
    this.onSave.emit();
  }

  clear() {
    this.onCancel.emit();
  }
}
