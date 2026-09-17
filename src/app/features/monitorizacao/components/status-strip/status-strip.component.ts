import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-status-strip',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './status-strip.component.html',
  styleUrls: ['./status-strip.component.scss'],
})
export class StatusStripComponent {
  @Input() lastSavedAt: Date | null = null;
  @Input() pendingSyncCount = 0;
}
