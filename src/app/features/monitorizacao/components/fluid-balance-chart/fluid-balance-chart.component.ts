import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  waterOutline, addOutline, listOutline,
  chevronUpOutline, chevronDownOutline,
} from 'ionicons/icons';
import { FLUID_CATEGORY_LABELS, FluidCategoryEnum } from 'src/app/core/models/api-enums.model';

type AnyBalance = any;

@Component({
  selector: 'app-fluid-balance-chart',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  templateUrl: './fluid-balance-chart.component.html',
  styleUrls: ['./fluid-balance-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FluidBalanceChartComponent {
  @Input() balance: AnyBalance[] = [];
  @Input() anesthesiaStartTime: Date | string | null = null;
  @Input() surgeryEndTime: Date | string | null = null;
  @Input() viewStartTime: number | null = null;
  @Input() viewEndTime: number | null = null;
  @Input() hoverTime: number | null = null;
  @Input() collapsed = false;
  @Input() readonly = false;

  private readonly MAX_BAR_PX = 90;
  private readonly MIN_BAR_PX = 24;

  @Output() hoverTimeChange = new EventEmitter<number | null>();
  @Output() addBalance = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() toggle = new EventEmitter<void>();

  constructor() {
    addIcons({ waterOutline, addOutline, listOutline, chevronUpOutline, chevronDownOutline });
  }

  onHeaderClick(_e: MouseEvent) { this.toggle.emit(); }

  vol(b: AnyBalance): number { return Number(b?.volumeMl ?? b?.volume ?? 0) || 0; }
  itemName(b: AnyBalance): string {
   
    const categoryId: FluidCategoryEnum | undefined = b?.categoryId ?? b?.category;
    const categoryLabel = categoryId != null ? FLUID_CATEGORY_LABELS[categoryId as FluidCategoryEnum] : null;
    let displayName = b?.item ?? b?.name ?? b?.description ?? categoryLabel ?? 'Outro';
    if (displayName === 'Outro' && b?.detail) {
      displayName = b.detail;
    } else if (b?.detail) {
      displayName = `${displayName} (${b.detail})`;
    }
    return displayName;
  }

  itemHM(b: AnyBalance): string {
    if (b?.time) return String(b.time);
    const d = new Date(b?.timestamp || Date.now());
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  get gains(): AnyBalance[] { return (this.balance || []).filter(b => b?.type === 'gain'); }
  get losses(): AnyBalance[] { return (this.balance || []).filter(b => b?.type === 'loss'); }

  get totalGain(): number { return this.gains.reduce((s, b) => s + this.vol(b), 0); }
  get totalLoss(): number { return this.losses.reduce((s, b) => s + this.vol(b), 0); }
  get net(): number { return this.totalGain - this.totalLoss; }

  posX(item: AnyBalance): number {
    if (!this.anesthesiaStartTime) return 50;
    
    // Se temos view bounds do pan/zoom, usamos eles. Senão, usamos os tempos totais.
    const start = this.viewStartTime ?? new Date(this.anesthesiaStartTime).getTime();
    const end = this.viewEndTime ?? (this.surgeryEndTime ? new Date(this.surgeryEndTime).getTime() : Date.now());
    
    const total = Math.max(end - start, 1);
    const t = new Date(item?.timestamp || Date.now()).getTime();
    
    // Retorna a porcentagem relativa à janela visualizada atual
    return ((t - start) / total) * 100;
  }

  get maxVol(): number {
    return Math.max(50, ...(this.balance || []).map(b => this.vol(b)));
  }

  barPx(item: AnyBalance): number {
    const v = this.vol(item);
    if (v <= 0) return this.MIN_BAR_PX;
    const px = (v / this.maxVol) * this.MAX_BAR_PX;
    return Math.max(this.MIN_BAR_PX, Math.round(px));
  }
}
