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
import { FLUID_CATEGORY_LABELS, FluidCategoryEnum, CLINICAL_EVENT_TYPE_LABELS, ClinicalEventTypeEnum } from 'src/app/core/models/api-enums.model';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export type HistoryTab = 'vitals' | 'agents' | 'events' | 'balance';

@Component({
  selector: 'app-history-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, IonButton, IonIcon, TranslatePipe],
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
  
  @Input() isAnesthesiaFinished = false;

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

  constructor(private translate: TranslateService) {
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
  itemName(b: any): string {
    const categoryId: FluidCategoryEnum | undefined = b?.categoryId ?? b?.category;
    const categoryLabel = categoryId != null ? FLUID_CATEGORY_LABELS[categoryId as FluidCategoryEnum] : null;
    return b?.item ?? b?.name ?? b?.description ?? categoryLabel ?? this.translate.instant('monitorizacao.common.otherItem');
  }
  vol(b: any): number { return Number(b?.volumeMl ?? b?.volume ?? 0) || 0; }
  eventLabel(e: any): string {
    if (e?.categoryLabel) return e.categoryLabel;


    const eventTypeId: ClinicalEventTypeEnum | undefined = e?.eventTypeId;
    if (eventTypeId != null && CLINICAL_EVENT_TYPE_LABELS[eventTypeId]) {
      return CLINICAL_EVENT_TYPE_LABELS[eventTypeId];
    }

    const cat = String(e?.category || e?.categoryId || '').toLowerCase();
    const map: Record<string, string> = {
      intubation: this.translate.instant('monitorizacao.historyDrawer.eventCategories.intubation'),
      extubation: this.translate.instant('monitorizacao.historyDrawer.eventCategories.extubation'),
      incision: this.translate.instant('monitorizacao.historyDrawer.eventCategories.incision'),
      block: this.translate.instant('monitorizacao.historyDrawer.eventCategories.block'),
      tourniquet_on: this.translate.instant('monitorizacao.historyDrawer.eventCategories.tourniquetOn'),
      tourniquet_off: this.translate.instant('monitorizacao.historyDrawer.eventCategories.tourniquetOff'),
      position: this.translate.instant('monitorizacao.historyDrawer.eventCategories.position'),
      complication: this.translate.instant('monitorizacao.historyDrawer.eventCategories.complication'),
      other: this.translate.instant('monitorizacao.common.otherItem'),
    };
    if (map[cat]) return map[cat];

    const t = String(e?.type || '').toLowerCase();
    if (t === 'position') return this.translate.instant('monitorizacao.historyDrawer.eventCategories.position');
    if (t === 'incident') return this.translate.instant('monitorizacao.historyDrawer.eventCategories.incident');
    return e?.type || this.translate.instant('monitorizacao.common.eventFallback');
  }

  trackTime = (_: number, r: any) => r?.clientId || r?.id || r?.time || _;
}
