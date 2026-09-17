import {
  Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { Agent } from '../../models/monitoring-view.model';
import { applyScrollRatio, getScrollRatio, scrollToEnd } from '../../utils/scroll-sync.util';
import {
  canvasWidthCss, computeTimelineWindow, deoverlapPercents, minGapPercentFor, ROW_LABEL_GUTTER_PX,
  timeToPercent,
} from '../../utils/chart-timeline.util';


@Component({
  selector: 'app-agents-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './agents-card.component.html',
  styleUrls: ['./agents-card.component.scss'],
})
export class AgentsCardComponent implements OnChanges {
  @Input() agents: Agent[] = [];
  @Input() anesthesiaStartTime: Date | null = null;
  @Input() anesthesiaEndTime: Date | null = null;
  @Input() zoom = 1;
  @Input() readonly = false;

  @Output() addAgent = new EventEmitter<void>();
  @Output() editAgent = new EventEmitter<Agent>();
  @Output() deleteAgent = new EventEmitter<Agent>();
  @Output() scrollRatioChange = new EventEmitter<number>();

  @ViewChild('scrollHost') private scrollHostRef?: ElementRef<HTMLDivElement>;

  @Input() set syncScrollRatio(ratio: number | null) {
    if (ratio == null || !this.scrollHostRef) return;
    applyScrollRatio(this.scrollHostRef.nativeElement, ratio);
  }

  readonly rowLabelGutterPx = ROW_LABEL_GUTTER_PX;

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['agents'];
    if (!change) return;
    const prevLen = change.previousValue?.length ?? 0;
    const newLen = change.currentValue?.length ?? 0;
    if (newLen > prevLen && this.scrollHostRef) {
      scrollToEnd(this.scrollHostRef.nativeElement);
    }
  }

  onScroll(el: HTMLDivElement): void {
    this.scrollRatioChange.emit(getScrollRatio(el));
  }

  get canvasWidth(): string {
    return canvasWidthCss(this.agents.length, this.zoom);
  }

  private xPercent(agent: Agent): number {
    const win = computeTimelineWindow(this.anesthesiaStartTime, this.anesthesiaEndTime, this.agents[0]?.timestamp);
    return timeToPercent(new Date(agent.timestamp).getTime(), win);
  }

  get agentPercents(): number[] {
    const raw = this.agents.map((a) => this.xPercent(a));
    return deoverlapPercents(raw, minGapPercentFor(this.agents.length));
  }
}
