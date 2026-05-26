import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { MonitoringRecord } from 'src/app/core/models/monitoring-record.model';

@Component({
  selector: 'app-monitorizacao-tabela',
  templateUrl: './monitorizacao-tabela.component.html',
  styleUrls: ['./monitorizacao-tabela.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitorizacaoTabelaComponent {
  @Input() vitalRecords: MonitoringRecord[] = [];
  @Input() customFields: { label: string, key: string }[] = [];
  @Input() selectedRecord: MonitoringRecord | null = null;
  @Input() isSurgeryFinished = false;

  @Output() onAddCustomField = new EventEmitter<void>();
  @Output() onAddTimePoint = new EventEmitter<void>();
  @Output() onEditCustomFieldMenu = new EventEmitter<{ label: string, key: string }>();
  @Output() onSelectRecord = new EventEmitter<MonitoringRecord>();
  @Output() onDeleteRecord = new EventEmitter<MonitoringRecord>();
  // We need to emit changes to custom field values too, but since they are objects reference, 
  // ngModel directly mutates the reference. However, OnPush might not detect changes unless we emit.
  // Wait, if it mutates the reference, the parent component won't know. 
  // We should ideally emit an update when a custom field changes, or let ngModel update it and emit a generic save event.
  // For now we'll stick to ngModel since the parent shares the reference, but we might need a save trigger.

  trackByRecords(index: number, record: MonitoringRecord) {
    return record.id || record.time;
  }

  addCustomField() {
    this.onAddCustomField.emit();
  }

  addTimePoint() {
    this.onAddTimePoint.emit();
  }

  editCustomFieldMenu(field: { label: string, key: string }) {
    if (!this.isSurgeryFinished) {
      this.onEditCustomFieldMenu.emit(field);
    }
  }

  selectRecord(record: MonitoringRecord) {
    if (!this.isSurgeryFinished) {
      this.onSelectRecord.emit(record);
    }
  }

  deleteRecord(event: Event, record: MonitoringRecord) {
    event.stopPropagation();
    if (!this.isSurgeryFinished) {
      this.onDeleteRecord.emit(record);
    }
  }
}
