import {
  ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, AfterViewInit,
  Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { VitalRecord } from '../../models/monitoring-view.model';
import { applyScrollRatio, getScrollRatio, scrollToEnd } from '../../utils/scroll-sync.util';
import {
  canvasWidthCss, computeTimelineWindow, deoverlapPercents, minGapPercentFor, ROW_LABEL_GUTTER_PX,
  timeToPercent, TimelineWindow,
} from '../../utils/chart-timeline.util';

const CHART_H = 300;
const PAD_T = 34;
const PAD_B = 30;
const PAD_R = 28;
const Y_MIN = 30;
const Y_MAX = 240;
const Y_TICKS = [30, 60, 90, 120, 150, 180, 210, 240];
const MILESTONE_GLYPH_Y = 19;
const MILESTONE_GLYPH_R = 7;

interface Point { x: number; y: number; }
interface Milestone { x: number; kind: 'anesthesia' | 'surgery'; }

/**
 * A largura do <svg> (atributo `width`/`viewBox`, não CSS) é a largura REAL em
 * pixels do canvas — medida via ResizeObserver, não um valor lógico fixo. Como
 * 1 unidade do viewBox passa a valer exatamente 1px em ambos os eixos, o navegador
 * nunca escala o conteúdo (sem distorcer texto/símbolos), mesmo quando o canvas
 * cresce com a quantidade de lançamentos — e como a largura CSS do canvas usa a
 * mesma `canvasWidthCss` da tabela de sinais vitais, cada marco cai exatamente
 * sob a coluna correspondente lá em cima.
 */
@Component({
  selector: 'app-vitals-chart-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './vitals-chart-card.component.html',
  styleUrls: ['./vitals-chart-card.component.scss'],
})
export class VitalsChartCardComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() vitalRecords: VitalRecord[] = [];
  @Input() anesthesiaStartTime: Date | null = null;
  @Input() anesthesiaEndTime: Date | null = null;
  @Input() surgeryStartTime: Date | null = null;
  @Input() surgeryEndTime: Date | null = null;
  @Input() zoom = 1;

  @Output() scrollRatioChange = new EventEmitter<number>();
  @Output() zoomChange = new EventEmitter<number>();

  @ViewChild('scrollHost') private scrollHostRef?: ElementRef<HTMLDivElement>;
  @ViewChild('canvasEl') private canvasElRef?: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @Input() set syncScrollRatio(ratio: number | null) {
    if (ratio == null || !this.scrollHostRef) return;
    applyScrollRatio(this.scrollHostRef.nativeElement, ratio);
  }

  /** Largura real medida do canvas (px) — usada como largura do viewBox. */
  measuredWidth = 640;

  ngAfterViewInit(): void {
    if (!this.canvasElRef || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = Math.round(entries[0].contentRect.width);
      if (width > 0 && width !== this.measuredWidth) {
        this.measuredWidth = width;
        this.cdr.markForCheck();
      }
    });
    this.resizeObserver.observe(this.canvasElRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const recordsChange = changes['vitalRecords'];
    if (!recordsChange) return;
    const prevLen = recordsChange.previousValue?.length ?? 0;
    const newLen = recordsChange.currentValue?.length ?? 0;
    // Um novo lançamento é mais importante que o histórico — mostra o mais
    // recente (rola pro fim) em vez de deixar o médico procurar manualmente.
    if (newLen > prevLen && this.scrollHostRef) {
      scrollToEnd(this.scrollHostRef.nativeElement);
    }
  }

  onScroll(el: HTMLDivElement): void {
    this.scrollRatioChange.emit(getScrollRatio(el));
  }

  get canvasWidth(): string {
    return canvasWidthCss(this.vitalRecords.length, this.zoom);
  }

  get chartW(): number {
    return this.measuredWidth;
  }

  readonly chartH = CHART_H;
  readonly padL = ROW_LABEL_GUTTER_PX;
  readonly padR = PAD_R;
  readonly milestoneGlyphY = MILESTONE_GLYPH_Y;
  readonly milestoneGlyphR = MILESTONE_GLYPH_R;
  readonly yTicks = Y_TICKS;

  zoomIn(): void {
    this.zoomChange.emit(Math.min(2, Math.round((this.zoom + 0.2) * 10) / 10));
  }

  zoomOut(): void {
    this.zoomChange.emit(Math.max(0.8, Math.round((this.zoom - 0.2) * 10) / 10));
  }

  private get window(): TimelineWindow {
    return computeTimelineWindow(this.anesthesiaStartTime, this.anesthesiaEndTime, this.vitalRecords[0]?.timestamp);
  }

  /**
   * Uma coluna por lançamento, nunca duas coladas — mesmo cálculo (e mesmo
   * `deoverlapPercents`) que o vitals-section aplica na tabela, pra garantir
   * que a coluna do registro N fique no mesmo pixel nos dois quadros mesmo
   * quando dois registros são lançados muito perto um do outro no tempo.
   * Também reserva a folga ROW_LABEL_GUTTER_PX antes da trilha (mesma folga
   * da coluna de rótulos da tabela) — sem isso a primeira marcação ficaria
   * colada na borda esquerda.
   */
  private get adjustedXs(): number[] {
    const win = this.window;
    const raw = this.vitalRecords.map((r) => timeToPercent(new Date(r.timestamp).getTime(), win));
    const adjusted = deoverlapPercents(raw, minGapPercentFor(this.vitalRecords.length));
    // Reserva padR também na direita — sem isso, o último ponto (pct=100%)
    // cai bem na borda do viewBox e o próprio <svg> corta símbolo/texto que
    // ultrapasse esse limite (overflow:hidden é o padrão do elemento).
    return adjusted.map((pct) => this.padL + (pct / 100) * (this.chartW - this.padL - this.padR));
  }

  private y(value: number): number {
    const pct = (value - Y_MIN) / (Y_MAX - Y_MIN);
    return PAD_T + (1 - pct) * (CHART_H - PAD_T - PAD_B);
  }

  yFor(tick: number): number {
    return this.y(tick);
  }

  private seriesFor(field: 'pas' | 'pad' | 'fc'): Point[] {
    const xs = this.adjustedXs;
    const points: Point[] = [];
    this.vitalRecords.forEach((r, i) => {
      const value = r[field];
      if (value === undefined || value === null) return;
      points.push({ x: xs[i], y: this.y(value) });
    });
    return points;
  }

  get pasPoints(): Point[] { return this.seriesFor('pas'); }
  get padPoints(): Point[] { return this.seriesFor('pad'); }
  get fcPoints(): Point[] { return this.seriesFor('fc'); }

  polyline(points: Point[]): string {
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  }

  /** Triângulo apontando para cima (PAS). */
  triangleUp(p: Point, size = 5): string {
    return `${p.x},${p.y - size} ${p.x - size},${p.y + size} ${p.x + size},${p.y + size}`;
  }

  /** Triângulo apontando para baixo (PAD). */
  triangleDown(p: Point, size = 5): string {
    return `${p.x},${p.y + size} ${p.x - size},${p.y - size} ${p.x + size},${p.y - size}`;
  }

  get milestones(): Milestone[] {
    const raw: { ts: number; kind: Milestone['kind'] }[] = [];
    if (this.anesthesiaStartTime) raw.push({ ts: this.anesthesiaStartTime.getTime(), kind: 'anesthesia' });
    if (this.anesthesiaEndTime) raw.push({ ts: this.anesthesiaEndTime.getTime(), kind: 'anesthesia' });
    if (this.surgeryStartTime) raw.push({ ts: this.surgeryStartTime.getTime(), kind: 'surgery' });
    if (this.surgeryEndTime) raw.push({ ts: this.surgeryEndTime.getTime(), kind: 'surgery' });
    if (!raw.length) return [];

    const win = this.window;
    const pcts = raw.map((m) => timeToPercent(m.ts, win));
    // Só 2-4 marcos no máximo — um gap fixo (bem maior que o de colunas de
    // registro) já basta pra não deixar o "X" da anestesia colado no círculo
    // da cirurgia quando os dois começam quase juntos.
    const adjusted = deoverlapPercents(pcts, 6);
    return raw.map((m, i) => ({
      kind: m.kind,
      x: this.padL + (adjusted[i] / 100) * (this.chartW - this.padL - this.padR),
    }));
  }

  /** Pontas do "X" do glifo de anestesia, em torno de (x, milestoneGlyphY). */
  crossLine1(x: number): { x1: number; y1: number; x2: number; y2: number } {
    const r = this.milestoneGlyphR;
    return { x1: x - r, y1: this.milestoneGlyphY - r, x2: x + r, y2: this.milestoneGlyphY + r };
  }

  crossLine2(x: number): { x1: number; y1: number; x2: number; y2: number } {
    const r = this.milestoneGlyphR;
    return { x1: x - r, y1: this.milestoneGlyphY + r, x2: x + r, y2: this.milestoneGlyphY - r };
  }

  get xLabels(): { x: number; label: string }[] {
    const xs = this.adjustedXs;
    return this.vitalRecords.map((r, i) => ({ x: xs[i], label: r.time }));
  }
}
