import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FilterStateService } from 'src/app/core/services/filter-state.service';

@Component({
  selector: 'app-date-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-filter.component.html',
  styleUrls: ['./date-filter.component.scss']
})
export class DateFilterComponent implements OnInit, OnDestroy {
  @Input() date: string = '';
  @Output() dateChange = new EventEmitter<string>();

  private filterSubscription?: Subscription;

  constructor(private filterState: FilterStateService) {}

  ngOnInit() {
    const savedDate = this.filterState.getSelectedDate();
    if (savedDate) {
      this.date = savedDate;
      this.dateChange.emit(this.date);
    }

    this.filterSubscription = this.filterState.filterState$.subscribe(state => {
      if (state.selectedDate !== this.date) {
        this.date = state.selectedDate || '';
        this.dateChange.emit(this.date);
      }
    });
  }

  ngOnDestroy() {
    this.filterSubscription?.unsubscribe();
  }

  get formattedDate(): string {
    return this.filterState.formatDateForDisplay(this.date);
  }

  onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newDate = target.value;
    
    this.date = newDate;
    this.dateChange.emit(newDate);
    this.filterState.setSelectedDate(newDate || null);
  }

  openPicker(input: HTMLInputElement) {
    if (input.showPicker) {
      input.showPicker();
    } else {
      input.click();
    }
  }

  clearFilter() {
    this.date = '';
    this.dateChange.emit('');
    this.filterState.resetFilters();
  }

  setToday() {
    const today = new Date();
    const dateStr = this.filterState.dateToString(today);
    
    this.date = dateStr;
    this.dateChange.emit(dateStr);
    this.filterState.setSelectedDate(dateStr);
  }

  setDate(year: number, month: number, day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    this.date = dateStr;
    this.dateChange.emit(dateStr);
    this.filterState.setSelectedDate(dateStr);
  }
}