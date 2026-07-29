import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FilterState {
  selectedDate: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class FilterStateService {
  private readonly STORAGE_KEY = 'filter_state';
  private filterState = new BehaviorSubject<FilterState>(this.loadState());

  filterState$ = this.filterState.asObservable();

  private loadState(): FilterState {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error loading filter state:', e);
      }
    }
    return { selectedDate: null };
  }

  private saveState(state: FilterState) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  setSelectedDate(date: string | null) {
    const newState = { selectedDate: date };
    this.filterState.next(newState);
    this.saveState(newState);
  }

  getSelectedDate(): string | null {
    return this.filterState.value.selectedDate;
  }

  resetFilters() {
    this.setSelectedDate(null);
  }

  formatDateForDisplay(dateStr: string | null): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  stringToDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}