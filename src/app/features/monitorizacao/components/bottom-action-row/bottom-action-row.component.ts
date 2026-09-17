import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-bottom-action-row',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './bottom-action-row.component.html',
  styleUrls: ['./bottom-action-row.component.scss'],
})
export class BottomActionRowComponent {
  @Input() readonly = false;
  @Input() canFinalize = false;
  @Input() isSurgeryFinished = false;

  @Output() addEvent = new EventEmitter<void>();
  @Output() addBalance = new EventEmitter<void>();
  @Output() finalize = new EventEmitter<void>();
}
