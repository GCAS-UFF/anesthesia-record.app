import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, HostListener, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, addOutline, settingsOutline, trashOutline, createOutline,
  pulseOutline, medkitOutline, warningOutline, waterOutline
} from 'ionicons/icons';

export type HistoryTab = 'vitals' | 'agents' | 'events' | 'balance';

@Component({
  selector: 'app-history-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon],
  templateUrl: './history-drawer.component.html',
  styleUrls: ['./history-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryDrawerComponent implements OnInit {
  @Input() initialTab: HistoryTab = 'vitals';
  @Input() vitalRecords: any[] = [];
  @Input() customFields: { label: string; key: string }[] = [];
  @Input() agents: any[] = [];
  @Input() events: any[] = [];
  @Input() balance: any[] = [];
  @Input() isSurgeryFinished = false;

  @Output() close = new EventEmitter<void>();
  // Vitals
  @Output() editRecord = new EventEmitter<any>();
  @Output() deleteRecord = new EventEmitter<any>();
  // Agents
  @Output() editAgent = new EventEmitter<any>();
  @Output() deleteAgent = new EventEmitter<any>();
  // Events
  @Output() editEvent = new EventEmitter<any>();
  @Output() deleteEvent = new EventEmitter<any>();
  // Balance
  @Output() editBalance = new EventEmitter<any>();
  @Output() deleteBalance = new EventEmitter<any>();

  @Output() addCustomField = new EventEmitter<void>();
  @Output() addTimePoint = new EventEmitter<void>();

  activeTab: HistoryTab = 'vitals';

  ngOnInit() { this.activeTab = this.initialTab; }

  constructor() {
    addIcons({ closeOutline, addOutline, settingsOutline, trashOutline, createOutline,
      pulseOutline, medkitOutline, warningOutline, waterOutline });
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('backdrop')) {
      this.close.emit();
    }
  }

  temp(r: any): any { return r?.temperatura ?? r?.temp ?? '—'; }
  custom(r: any, key: string): any { return (r && r[key] != null) ? r[key] : '—'; }
  desc(e: any): string { return e?.description ?? e?.note ?? e?.observation ?? ''; }
  itemName(b: any): string { return b?.item ?? b?.name ?? b?.description ?? ''; }
  vol(b: any): number { return Number(b?.volumeMl ?? b?.volume ?? 0) || 0; }
  eventLabel(e: any): string {
    if (e?.categoryLabel) return e.categoryLabel;
    const cat = String(e?.category || e?.categoryId || '').toLowerCase();
    const map: Record<string, string> = {
      intubation: 'Intubação', extubation: 'Extubação', incision: 'Incisão',
      block: 'Bloqueio', tourniquet_on: 'Garrote ON', tourniquet_off: 'Garrote OFF',
      position: 'Posição', complication: 'Complicação', other: 'Outro'
    };
    if (map[cat]) return map[cat];

    const t = String(e?.type || '').toLowerCase();
    if (t === 'position') return 'Posição';
    if (t === 'incident') return 'Incidente';
    return e?.type || 'Evento';
  }

  trackTime = (_: number, r: any) => r?.clientId || r?.id || r?.time || _;
}
