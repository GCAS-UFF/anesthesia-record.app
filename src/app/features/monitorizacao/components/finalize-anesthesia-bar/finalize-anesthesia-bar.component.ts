import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline,
  powerOutline, listOutline, refreshOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-finalize-anesthesia-bar',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './finalize-anesthesia-bar.component.html',
  styleUrls: ['./finalize-anesthesia-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinalizeAnesthesiaBarComponent {
  @Input() draftSavedAt: Date | null = null;
  @Input() pendingSyncCount = 0;
  @Input() isAnesthesiaStarted = false;
  @Input() isSurgeryFinished = false;
  @Input() isAnesthesiaFinished = false;
  @Input() isSyncing = false;

  @Output() syncNow = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() finalize = new EventEmitter<void>();

  get isReadOnly(): boolean {
    return this.isAnesthesiaFinished;
  }

  constructor() {
    addIcons({ saveOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline,
      powerOutline, listOutline, refreshOutline });
  }

  get savedLabel(): string {
    if (!this.draftSavedAt) return 'Sem rascunho salvo';
    const d = this.draftSavedAt;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `Rascunho salvo ${hh}:${mm}:${ss}`;
  }
}
