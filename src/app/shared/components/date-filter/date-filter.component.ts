import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-filter.component.html',
  styleUrls: ['./date-filter.component.scss']
})
export class DateFilterComponent {
  @Input() date: string = '';
  @Output() dateChange = new EventEmitter<string>();

  get formattedDate(): string {
    if (!this.date) return '';
    const parts = this.date.split('-');
    if (parts.length !== 3) return this.date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.dateChange.emit(target.value);
  }

  openPicker(input: HTMLInputElement) {
    if (input.showPicker) {
      input.showPicker();
    } else {
      input.click();
    }
  }
}
