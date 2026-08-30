import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, refreshOutline } from 'ionicons/icons';
import { AnesthetistOption, ReportFilters } from 'src/app/core/models/reports.model';
import { SURGERY_STATUS_LABELS, SurgeryStatusEnum } from 'src/app/core/models/api-enums.model';

@Component({
  selector: 'app-report-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './report-filters.component.html',
  styleUrls: ['./report-filters.component.scss']
})
export class ReportFiltersComponent {
  @Input() filters!: ReportFilters;
  @Input() anesthetistOptions: AnesthetistOption[] = [];
  @Input() showAnesthetistFilter = true;
  @Input() showStatusFilter = true;

  @Output() filtersChange = new EventEmitter<ReportFilters>();
  @Output() refresh = new EventEmitter<void>();

  statusOptions = Object.entries(SURGERY_STATUS_LABELS).map(([id, label]) => ({
    id: Number(id) as SurgeryStatusEnum,
    label,
  }));

  constructor() {
    addIcons({ calendarOutline, refreshOutline });
  }

  emit() {
    this.filtersChange.emit({ ...this.filters });
  }

  onStartDateChange(value: string) {
    this.filters.startDate = value;
    this.emit();
  }

  onEndDateChange(value: string) {
    this.filters.endDate = value;
    this.emit();
  }

  onAnesthesiologistChange(value: number | null) {
    this.filters.anesthesiologistId = value;
    this.emit();
  }

  onStatusChange(value: SurgeryStatusEnum | null) {
    this.filters.status = value;
    this.emit();
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  setQuickRange(range: 'today' | 'last7' | 'thisMonth') {
    const today = new Date();
    let start = new Date(today);

    if (range === 'last7') {
      start.setDate(today.getDate() - 6);
    } else if (range === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    this.filters.startDate = this.toIsoDate(start);
    this.filters.endDate = this.toIsoDate(today);
    this.emit();
  }
}
