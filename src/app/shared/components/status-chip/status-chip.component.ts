import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-chip.component.html',
  styleUrls: ['./status-chip.component.scss']
})
export class StatusChipComponent {
  @Input() label: string = '';
  @Input() active: boolean = false;
  @Output() chipClick = new EventEmitter<void>();

  onClick() {
    this.chipClick.emit();
  }
}
