import {
  Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { InfusionPumpEntry, PositionEntry, ResourceFlowEntry } from '../../models/monitoring-view.model';
import { applyScrollRatio, getScrollRatio, scrollToEnd } from '../../utils/scroll-sync.util';
import {
  canvasWidthCss, computeTimelineWindow, deoverlapPercents, minGapPercentFor, timeToPercent,
} from '../../utils/chart-timeline.util';
import { PositionFigureComponent } from './position-figure.component';

interface Segment { startPct: number; endPct: number; label?: string; }
interface LanedSegment extends Segment { lane: number; }

const LANE_HEIGHT_PX = 22;

function assignLanes<T extends Segment>(segments: T[]): (T & { lane: number })[] {
  const sorted = [...segments].sort((a, b) => a.startPct - b.startPct);
  const laneEnds: number[] = [];
  return sorted.map((seg) => {
    let lane = laneEnds.findIndex((end) => end <= seg.startPct);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.endPct);
    } else {
      laneEnds[lane] = seg.endPct;
    }
    return { ...seg, lane };
  });
}


const RESOURCES_ROW_LABEL_GUTTER_PX = 104;

@Component({
  selector: 'app-resources-flow-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, PositionFigureComponent],
  templateUrl: './resources-flow-card.component.html',
  styleUrls: ['./resources-flow-card.component.scss'],
})
export class ResourcesFlowCardComponent implements OnChanges {
  @Input() posicaoAtual = '';
  @Input() posicoesPossiveis: string[] = [];
  @Input() positionHistory: PositionEntry[] = [];
  @Input() oxygenFlows: ResourceFlowEntry[] = [];
  @Input() compressedAirFlows: ResourceFlowEntry[] = [];
  @Input() infusionPumps: InfusionPumpEntry[] = [];
  @Input() anesthesiaStartTime: Date | null = null;
  @Input() anesthesiaEndTime: Date | null = null;
  @Input() zoom = 1;
  @Input() readonly = false;

  @Output() positionChange = new EventEmitter<string>();
  @Output() addResource = new EventEmitter<'o2' | 'air'>();
  @Output() scrollRatioChange = new EventEmitter<number>();

  @ViewChild('scrollHost') private scrollHostRef?: ElementRef<HTMLDivElement>;

  @Input() set syncScrollRatio(ratio: number | null) {
    if (ratio == null || !this.scrollHostRef) return;
    applyScrollRatio(this.scrollHostRef.nativeElement, ratio);
  }

  readonly rowLabelGutterPx = RESOURCES_ROW_LABEL_GUTTER_PX;

  ngOnChanges(changes: SimpleChanges): void {
    const grew = (name: string) => {
      const change = changes[name];
      if (!change) return false;
      return (change.currentValue?.length ?? 0) > (change.previousValue?.length ?? 0);
    };
    if ((grew('positionHistory') || grew('oxygenFlows') || grew('compressedAirFlows') || grew('infusionPumps')) && this.scrollHostRef) {
      scrollToEnd(this.scrollHostRef.nativeElement);
    }
  }

  onScroll(el: HTMLDivElement): void {
    this.scrollRatioChange.emit(getScrollRatio(el));
  }

  private get window() {
    const firstTs = [...this.oxygenFlows, ...this.compressedAirFlows, ...this.positionHistory]
      .map((e) => e.timestamp).sort()[0];
    return computeTimelineWindow(this.anesthesiaStartTime, this.anesthesiaEndTime, firstTs);
  }

  private get viewEndMs(): number {
    return this.anesthesiaEndTime ? this.anesthesiaEndTime.getTime() : Date.now();
  }


  private get sharedCount(): number {
    return Math.max(
      this.positionHistory.length, this.oxygenFlows.length,
      this.compressedAirFlows.length, this.infusionPumps.length, 1,
    );
  }

  get canvasWidth(): string {
    return canvasWidthCss(this.sharedCount, this.zoom);
  }

  xPercent(timestamp: string): number {
    return timeToPercent(new Date(timestamp).getTime(), this.window);
  }


  get positionPercents(): number[] {
    const raw = this.positionHistory.map((p) => this.xPercent(p.timestamp));
    return deoverlapPercents(raw, minGapPercentFor(this.sharedCount));
  }


  private segmentsFor(entries: ResourceFlowEntry[]): Segment[] {
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const segments: Segment[] = [];
    let openStart: number | null = null;

    for (const entry of sorted) {
      const ts = new Date(entry.timestamp).getTime();
      if (entry.isActive) {
        if (openStart == null) openStart = ts;
      } else if (openStart != null) {
        segments.push({ startPct: this.xPercent(new Date(openStart).toISOString()), endPct: this.xPercent(entry.timestamp) });
        openStart = null;
      }
    }
    if (openStart != null) {
      segments.push({ startPct: this.xPercent(new Date(openStart).toISOString()), endPct: this.xPercent(new Date(this.viewEndMs).toISOString()) });
    }
    return segments;
  }

  get oxygenSegments(): Segment[] { return this.segmentsFor(this.oxygenFlows); }
  get airSegments(): Segment[] { return this.segmentsFor(this.compressedAirFlows); }

  get isOxygenActive(): boolean {
    return this.oxygenFlows[this.oxygenFlows.length - 1]?.isActive ?? false;
  }

  get isAirActive(): boolean {
    return this.compressedAirFlows[this.compressedAirFlows.length - 1]?.isActive ?? false;
  }

  get infusionSegments(): (LanedSegment & { medicationName: string })[] {
    const raw = this.infusionPumps.map((p) => ({
      startPct: this.xPercent(p.timestamp),
      endPct: this.xPercent(p.endAt),
      medicationName: p.medicationName,
    }));
    return assignLanes(raw);
  }

  get infusionLaneCount(): number {
    return Math.max(1, ...this.infusionSegments.map((s) => s.lane + 1));
  }

  get infusionRowHeightPx(): number {
    return Math.max(34, this.infusionLaneCount * LANE_HEIGHT_PX + 12);
  }


  laneCenterPct(lane: number): number {
    return ((lane + 0.5) / this.infusionLaneCount) * 100;
  }

  get hasAnyResourceData(): boolean {
    return !!(this.oxygenFlows.length || this.compressedAirFlows.length || this.infusionPumps.length || this.positionHistory.length);
  }
}
