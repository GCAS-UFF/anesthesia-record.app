import {
  Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { FluidBalance, VitalRecord } from '../../models/monitoring-view.model';
import { applyScrollRatio, getScrollRatio, scrollToEnd } from '../../utils/scroll-sync.util';
import {
  canvasWidthCss, computeTimelineWindow, deoverlapPercents, minGapPercentFor, ROW_LABEL_GUTTER_PX,
  timeToPercent, TimelineWindow,
} from '../../utils/chart-timeline.util';

type FixedField = 'temp' | 'spo2' | 'etco2' | 'bis';
export type VitalCellField = FixedField | { custom: string };

interface VitalRowDef {
  field: VitalCellField;
  labelKey?: string;
  label?: string;
}

const FIXED_ROWS: VitalRowDef[] = [
  { field: 'temp', labelKey: 'monitorizacao.shell.vitals.rows.temp' },
  { field: 'spo2', labelKey: 'monitorizacao.shell.vitals.rows.spo2' },
  { field: 'etco2', labelKey: 'monitorizacao.shell.vitals.rows.etco2' },
  { field: 'bis', labelKey: 'monitorizacao.shell.vitals.rows.bis' },
];


@Component({
  selector: 'app-vitals-section',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './vitals-section.component.html',
  styleUrls: ['./vitals-section.component.scss'],
})
export class VitalsSectionComponent implements OnChanges {
  @Input() vitalRecords: VitalRecord[] = [];
  @Input() fluidBalance: FluidBalance[] = [];
  @Input() customFields: { key: string; label: string; unit?: string }[] = [];
  @Input() anesthesiaStartTime: Date | null = null;
  @Input() anesthesiaEndTime: Date | null = null;
  @Input() zoom = 1;
  @Input() readonly = false;

  @Output() addRecord = new EventEmitter<void>();
  @Output() addCustomField = new EventEmitter<void>();
  @Output() cellTap = new EventEmitter<{ record: VitalRecord; field: VitalCellField }>();
  @Output() hydrationCellTap = new EventEmitter<VitalRecord>();
  @Output() deleteRecord = new EventEmitter<VitalRecord>();
  @Output() editTime = new EventEmitter<VitalRecord>();
  @Output() scrollRatioChange = new EventEmitter<number>();

  @ViewChild('scrollHost') private scrollHostRef?: ElementRef<HTMLDivElement>;

  @Input() set syncScrollRatio(ratio: number | null) {
    if (ratio == null || !this.scrollHostRef) return;
    applyScrollRatio(this.scrollHostRef.nativeElement, ratio);
  }

  readonly rowLabelGutterPx = ROW_LABEL_GUTTER_PX;

  ngOnChanges(changes: SimpleChanges): void {
    const recordsChange = changes['vitalRecords'];
    if (!recordsChange) return;
    const prevLen = recordsChange.previousValue?.length ?? 0;
    const newLen = recordsChange.currentValue?.length ?? 0;
    if (newLen > prevLen && this.scrollHostRef) {
      scrollToEnd(this.scrollHostRef.nativeElement);
    }
  }

  get canvasWidth(): string {
    return canvasWidthCss(this.vitalRecords.length, this.zoom);
  }

  get rows(): VitalRowDef[] {
    return [
      ...FIXED_ROWS,
      ...this.customFields.map((f) => ({ field: { custom: f.key }, label: f.label + (f.unit ? ` (${f.unit})` : '') })),
    ];
  }

  onScroll(el: HTMLDivElement): void {
    this.scrollRatioChange.emit(getScrollRatio(el));
  }

  private get window(): TimelineWindow {
    return computeTimelineWindow(this.anesthesiaStartTime, this.anesthesiaEndTime, this.vitalRecords[0]?.timestamp);
  }


  get adjustedPercents(): number[] {
    const win = this.window;
    const raw = this.vitalRecords.map((r) => timeToPercent(new Date(r.timestamp).getTime(), win));
    return deoverlapPercents(raw, minGapPercentFor(this.vitalRecords.length));
  }

  xPercentAt(index: number): number {
    return this.adjustedPercents[index] ?? 0;
  }

  valueFor(record: VitalRecord, field: VitalCellField): number | undefined {
    if (typeof field === 'string') return record[field];
    return record.custom?.[field.custom];
  }

  hydrationAt(record: VitalRecord, index: number): number {
    const ts = new Date(record.timestamp).getTime();
    const prevTs = index > 0 ? new Date(this.vitalRecords[index - 1].timestamp).getTime() : -Infinity;
    return this.fluidBalance
      .filter((f) => {
        if (f.type !== 'gain') return false;
        const fts = new Date(f.timestamp).getTime();
        return fts > prevTs && fts <= ts;
      })
      .reduce((sum, f) => sum + (f.volumeMl || 0), 0);
  }

  hasGainAt(record: VitalRecord, index: number): boolean {
    return this.hydrationAt(record, index) > 0;
  }
}
