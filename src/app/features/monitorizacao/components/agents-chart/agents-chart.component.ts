import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  medkitOutline, addOutline, listOutline,
  chevronUpOutline, chevronDownOutline,
} from 'ionicons/icons';

type AnyAgent = any;

@Component({
  selector: 'app-agents-chart',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  templateUrl: './agents-chart.component.html',
  styleUrls: ['./agents-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentsChartComponent {
  @Input() agents: AnyAgent[] = [];
  @Input() anesthesiaStartTime: Date | string | null = null;
  @Input() surgeryEndTime: Date | string | null = null;
  @Input() viewStartTime: number | null = null;
  @Input() viewEndTime: number | null = null;
  @Input() hoverTime: number | null = null;
  @Input() collapsed = false;
  @Input() readonly = false;

  @Output() hoverTimeChange = new EventEmitter<number | null>();
  @Output() addAgent = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() toggle = new EventEmitter<void>();

  constructor() {
    addIcons({ medkitOutline, addOutline, listOutline, chevronUpOutline, chevronDownOutline });
  }

  onHeaderClick(_e: MouseEvent) { this.toggle.emit(); }

  get lanes(): Array<{ name: string; items: AnyAgent[] }> {
    const groups: Record<string, AnyAgent[]> = {};
    for (const a of this.agents || []) {
      const k = a?.name || a?.medicationName || '—';
      (groups[k] ||= []).push(a);
    }
    return Object.entries(groups).map(([name, items]) => ({ name, items }));
  }

  private itemTime(item: AnyAgent): number {
    if (item?.timestamp) {
      const t = new Date(item.timestamp).getTime();
      if (!isNaN(t)) return t;
    }
    if (item?.time && this.anesthesiaStartTime) {
      const [h, m] = String(item.time).split(':').map(Number);
      const d = new Date(this.anesthesiaStartTime);
      if (!isNaN(h)) d.setHours(h, m || 0, 0, 0);
      return d.getTime();
    }
    return Date.now();
  }

  itemHM(item: AnyAgent): string {
    if (item?.time) return String(item.time);
    const d = new Date(this.itemTime(item));
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  posX(a: AnyAgent): number {
    if (!this.anesthesiaStartTime) return 50;
    
    const start = this.viewStartTime ?? new Date(this.anesthesiaStartTime).getTime();
    const end = this.viewEndTime ?? (this.surgeryEndTime ? new Date(this.surgeryEndTime).getTime() : Date.now());
    
    const total = Math.max(end - start, 1);
    const t = this.itemTime(a);
    
    return ((t - start) / total) * 100;
  }

  colorFor(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('sevo')) return '#8b5cf6';
    if (n.includes('propofol')) return '#f97316';
    if (n.includes('fentanil') || n.includes('remi')) return '#ec4899';
    if (n.includes('oxig') || n.includes('o2') || n.includes('ar')) return '#06b6d4';
    if (n.includes('rocu') || n.includes('cisatra')) return '#14b8a6';
    return '#8b5cf6';
  }
}
