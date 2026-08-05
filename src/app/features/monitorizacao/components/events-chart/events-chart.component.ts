import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  warningOutline,
  addOutline,
  listOutline,
  chevronDownOutline,
  chevronUpOutline,
} from 'ionicons/icons';

type AnyEvent = any;

type EventLaneKey = 'surgical' | 'airway' | 'clinical' | 'position';

interface EventLane {
  key: EventLaneKey;
  label: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-events-chart',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  templateUrl: './events-chart.component.html',
  styleUrls: ['./events-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsChartComponent {
  @Input() events: AnyEvent[] = [];
  @Input() positionHistory: AnyEvent[] = [];
  @Input() anesthesiaStartTime: Date | string | null = null;
  @Input() surgeryEndTime: Date | string | null = null;
  @Input() viewStartTime: number | null = null;
  @Input() viewEndTime: number | null = null;
  @Input() hoverTime: number | null = null;
  @Input() collapsed = false;
  @Input() readonly = false;

  @Output() hoverTimeChange = new EventEmitter<number | null>();
  @Output() addEvent = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();

  @Output('toggle') toggleRequested = new EventEmitter<void>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly lanes: EventLane[] = [
    { key: 'surgical', label: 'CR', color: '#f97316', icon: '✚' },
    { key: 'airway', label: 'VA', color: '#8b5cf6', icon: '◈' },
    { key: 'clinical', label: 'CL', color: '#ef4444', icon: '⚠' },
    { key: 'position', label: 'PS', color: '#22c55e', icon: '↺' },
  ];

  constructor() {
    addIcons({
      warningOutline,
      addOutline,
      listOutline,
      chevronDownOutline,
      chevronUpOutline,
    });
  }

  get totalCount(): number {
    return (this.events?.length || 0) + (this.positionHistory?.length || 0);
  }

  onHeaderClick(event?: MouseEvent): void {
    event?.stopPropagation();
    this.toggle();
  }

  toggle(event?: MouseEvent): void {
    event?.stopPropagation();
    this.collapsedChange.emit(!this.collapsed);
    this.toggleRequested.emit();
  }

  openHistoryClick(event: MouseEvent): void {
    event.stopPropagation();
    this.openHistory.emit();
  }

  addEventClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.readonly) return;
    this.addEvent.emit();
  }

  desc(item: AnyEvent): string {
    return String(
      item?.description ||
      item?.detail ||
      item?.note ||
      item?.observation ||
      item?.position ||
      item?.type ||
      'Evento'
    );
  }

  itemHM(item: AnyEvent): string {
    const explicitTime = item?.time;
    if (typeof explicitTime === 'string' && /^\d{1,2}:\d{2}/.test(explicitTime)) {
      return explicitTime.slice(0, 5).padStart(5, '0');
    }

    const date = this.toDate(item?.timestamp || explicitTime);
    if (!date) return '--:--';

    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  itemsForLane(key: EventLaneKey): AnyEvent[] {
    if (key === 'position') {
      const positionsFromHistory = (this.positionHistory || []).map((positionItem) => ({
        ...positionItem,
        category: 'position',
        type: positionItem?.type || 'position',
        description: positionItem?.description || positionItem?.position || positionItem?.label || 'Mudança de posição',
      }));

      const positionsFromEvents = (this.events || []).filter((item) => this.classify(item) === 'position');
      return [...positionsFromHistory, ...positionsFromEvents].sort((a, b) => this.itemTime(a) - this.itemTime(b));
    }

    return (this.events || [])
      .filter((item) => this.classify(item) === key)
      .sort((a, b) => this.itemTime(a) - this.itemTime(b));
  }

  posX(item: AnyEvent): number {
    const start = this.viewStartTime ?? this.toDate(this.anesthesiaStartTime)?.getTime();
    const itemTime = this.itemTime(item);

    if (!start || !Number.isFinite(itemTime)) return 50;

    const end = this.viewEndTime ?? (this.toDate(this.surgeryEndTime)?.getTime() || Date.now());
    const total = Math.max(end - start, 1);
    const raw = ((itemTime - start) / total) * 100;

    return raw;
  }

  onMarkerEnter(item: AnyEvent): void {
    const time = this.itemTime(item);
    this.hoverTimeChange.emit(Number.isFinite(time) ? time : null);
  }

  onMarkerLeave(): void {
    this.hoverTimeChange.emit(null);
  }

  private classify(item: AnyEvent): EventLaneKey {
    const category = this.normalize(item?.category || item?.eventCategory || item?.group);
    const type = this.normalize(item?.type || item?.eventType || item?.name);
    const description = this.normalize(this.desc(item));
    const haystack = `${category} ${type} ${description}`;

    if (this.matches(haystack, ['position', 'posicao', 'posição', 'decubito', 'decúbito', 'supino', 'prona', 'lateral'])) {
      return 'position';
    }

    if (this.matches(haystack, ['airway', 'via aerea', 'via aérea', 'intub', 'extub', 'mascara', 'máscara', 'tubo', 'laring', 'ventil'])) {
      return 'airway';
    }

    if (this.matches(haystack, ['surgical', 'cirurgico', 'cirúrgico', 'cirurgia', 'incis', 'sutura', 'campo', 'garrote', 'dreno'])) {
      return 'surgical';
    }

    return 'clinical';
  }

  private matches(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
  }

  private normalize(value: unknown): string {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private itemTime(item: AnyEvent): number {
    const date = this.toDate(item?.timestamp || item?.time || item?.createdAt || item?.date);
    return date?.getTime() || 0;
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    if (typeof value === 'number') {
      const dateFromNumber = new Date(value);
      return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      if (/^\d{1,2}:\d{2}/.test(trimmed)) {
        const [hour, minute] = trimmed.split(':').map(Number);
        const base = this.toDate(this.anesthesiaStartTime) || new Date();
        base.setHours(hour || 0, minute || 0, 0, 0);
        return base;
      }

      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }
}
