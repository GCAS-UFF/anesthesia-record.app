import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy,
  Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import {
  Agent, ClinicalEvent, FluidBalance, InfusionPumpEntry, PositionEntry, ResourceFlowEntry, VitalRecord,
} from '../../models/monitoring-view.model';
import { computeTimelineWindow, TimelineWindow } from '../../utils/chart-timeline.util';
import { isHydrationEntry } from '../../utils/fluid-balance.util';
import { PositionFigureComponent } from '../position-figure/position-figure.component';
import { TIMELINE_GROUPS, TimelineGroupId } from '../../services/monitoring-layout.service';

export type VitalField = 'pas' | 'pad' | 'pam' | 'fc' | 'spo2' | 'etco2' | 'temp' | 'bis';
export type TimelineCellField = VitalField | { custom: string };
export interface TimelineCellTap { record: VitalRecord; field: TimelineCellField | null; }

/** Largura mínima de uma coluna de registro — mesma regra de antes (MIN_COLUMN_PX). */
const MIN_COL_PX = 64;
/** Respiro antes da primeira e depois da última coluna, para os símbolos não encostarem na borda. */
const PAD_L = 36;
const PAD_R = 44;
const CHART_MIN_H = 200;
const CHART_MAX_H = 560;
const Y_MIN = 30;
const Y_MAX = 240;
const Y_TICKS = [30, 60, 90, 120, 150, 180, 210, 240];
const CHART_PAD_T = 30;
const CHART_PAD_B = 10;
const LANE_H = 24;
const REFRESH_MS = 30_000;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 4;

interface Column { record: VitalRecord; x: number; }
interface Bar { x: number; w: number; }
interface LanedChip<T> { item: T; x: number; w: number; lane: number; label: string; }
interface Milestone { x: number; label: string; kind: 'anesthesia' | 'surgery'; }
interface ValueRow { key: string; field: TimelineCellField; labelKey?: string; label?: string; unit?: string; tone?: string; }

const PRESSURE_ROWS: ValueRow[] = [
  { key: 'pas', field: 'pas', labelKey: 'monitorizacao.shell.timeline.rows.pas', unit: 'mmHg', tone: 'pas' },
  { key: 'pad', field: 'pad', labelKey: 'monitorizacao.shell.timeline.rows.pad', unit: 'mmHg', tone: 'pad' },
  { key: 'pam', field: 'pam', labelKey: 'monitorizacao.shell.timeline.rows.pam', unit: 'mmHg', tone: 'pam' },
  { key: 'fc', field: 'fc', labelKey: 'monitorizacao.shell.timeline.rows.fc', unit: 'bpm', tone: 'fc' },
];

const MONITOR_ROWS: ValueRow[] = [
  { key: 'spo2', field: 'spo2', labelKey: 'monitorizacao.shell.vitals.rows.spo2', unit: '%' },
  { key: 'etco2', field: 'etco2', labelKey: 'monitorizacao.shell.vitals.rows.etco2', unit: 'mmHg' },
  { key: 'temp', field: 'temp', labelKey: 'monitorizacao.shell.vitals.rows.temp', unit: '°C' },
  { key: 'bis', field: 'bis', labelKey: 'monitorizacao.shell.vitals.rows.bis' },
];

/**
 * Linha do tempo única da Monitorização.
 *
 * Todas as trilhas (recursos, fármacos, gráfico, valores, balanço, posição e
 * eventos) ficam dentro do MESMO contêiner rolável: horas e rótulos são fixos
 * via `position: sticky`, então a hora, o ponto do gráfico e o valor de cada
 * registro compartilham a mesma coordenada X por construção — sem a antiga
 * sincronização de rolagem por proporção entre quatro cartões.
 *
 * As colunas de registro usam a mesma janela (`computeTimelineWindow`) e a
 * mesma regra de "nunca duas colunas coladas" de antes, agora em pixels. Itens
 * com minuto próprio (fármacos, eventos, hidratação, bombas, O₂/Ar, posição)
 * são posicionados pelo minuto exato, interpolando entre as colunas vizinhas
 * para continuar coerentes com elas mesmo quando uma coluna foi empurrada.
 */
@Component({
  selector: 'app-monitoring-timeline',
  standalone: true,
  imports: [CommonModule, TranslatePipe, DatePipe, PositionFigureComponent],
  templateUrl: './monitoring-timeline.component.html',
  styleUrls: ['./monitoring-timeline.component.scss'],
})
export class MonitoringTimelineComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() vitalRecords: VitalRecord[] = [];
  @Input() customFields: { key: string; label: string; unit?: string }[] = [];
  @Input() agents: Agent[] = [];
  @Input() infusionPumps: InfusionPumpEntry[] = [];
  @Input() oxygenFlows: ResourceFlowEntry[] = [];
  @Input() compressedAirFlows: ResourceFlowEntry[] = [];
  @Input() fluidBalance: FluidBalance[] = [];
  @Input() positionHistory: PositionEntry[] = [];
  @Input() clinicalEvents: ClinicalEvent[] = [];
  @Input() anesthesiaStartTime: Date | null = null;
  @Input() anesthesiaEndTime: Date | null = null;
  @Input() surgeryStartTime: Date | null = null;
  @Input() surgeryEndTime: Date | null = null;
  @Input() readonly = false;
  @Input() lastSavedAt: Date | null = null;
  /** Espaço reservado à direita (px) enquanto uma gaveta lateral está aberta em paisagem. */
  @Input() reservedRight = 0;
  /** Grupos visíveis, na ordem escolhida no modo Personalizar. */
  @Input() groups: TimelineGroupId[] = TIMELINE_GROUPS.map((g) => g.id);

  @Output() cellTap = new EventEmitter<TimelineCellTap>();
  @Output() agentTap = new EventEmitter<Agent>();
  @Output() pumpTap = new EventEmitter<InfusionPumpEntry>();
  @Output() eventTap = new EventEmitter<ClinicalEvent>();
  @Output() balanceTap = new EventEmitter<void>();
  @Output() hydrationAdd = new EventEmitter<void>();
  @Output() hydrationTap = new EventEmitter<FluidBalance>();
  @Output() resourceToggle = new EventEmitter<'o2' | 'air'>();
  @Output() positionTap = new EventEmitter<void>();
  @Output() customize = new EventEmitter<void>();

  @ViewChild('scrollHost') private scrollHostRef?: ElementRef<HTMLDivElement>;
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLDivElement>;
  @ViewChild('labelProbe') private labelProbeRef?: ElementRef<HTMLDivElement>;

  readonly pressureRows = PRESSURE_ROWS;
  readonly yTicks = Y_TICKS;
  /** Símbolo do marco (× anestesia, ○ cirurgia) no topo do gráfico. */
  readonly glyphY = 12;
  readonly glyphR = 6;

  zoom = 1;
  chartH = 260;
  trackW = 800;
  columns: Column[] = [];
  milestones: Milestone[] = [];
  nowX: number | null = null;
  o2Bars: Bar[] = [];
  airBars: Bar[] = [];
  pumpChips: LanedChip<InfusionPumpEntry>[] = [];
  agentChips: LanedChip<Agent>[] = [];
  eventChips: LanedChip<ClinicalEvent>[] = [];
  hydrationChips: LanedChip<FluidBalance>[] = [];
  positionMarks: { item: PositionEntry; x: number }[] = [];
  gainsByCol: number[] = [];
  lossesByCol: number[] = [];
  pasPts = '';
  padPts = '';
  pamPts = '';
  fcPts = '';
  pasMarks: { x: number; y: number }[] = [];
  padMarks: { x: number; y: number }[] = [];
  fcMarks: { x: number; y: number }[] = [];
  monitorRows: ValueRow[] = MONITOR_ROWS;

  private win: TimelineWindow = { viewStart: Date.now(), span: 1 };
  private pxPerMs = 0;
  private resizeObserver?: ResizeObserver;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private fitFrame = 0;
  private viewReady = false;

  constructor(private readonly cdr: ChangeDetectorRef, private readonly zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customFields']) {
      this.monitorRows = [
        ...MONITOR_ROWS,
        ...this.customFields.map((f) => ({ key: f.key, field: { custom: f.key }, label: f.label, unit: f.unit })),
      ];
    }
    this.recompute();

    const grew = (name: string) => {
      const c = changes[name];
      return !!c && (c.currentValue?.length ?? 0) > (c.previousValue?.length ?? 0);
    };
    // Um novo lançamento importa mais que o histórico: rola até o fim, como antes.
    if (grew('vitalRecords') || grew('agents') || grew('clinicalEvents') || grew('fluidBalance') || changes['reservedRight']) {
      this.scrollToEnd();
    }
    this.scheduleFit();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    const host = this.scrollHostRef?.nativeElement;
    if (host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
      this.resizeObserver.observe(host);
    }
    // A linha "agora" e as barras em curso avançam com o relógio.
    this.zone.runOutsideAngular(() => {
      this.refreshTimer = setInterval(() => this.zone.run(() => this.recompute()), REFRESH_MS);
      // Pinça fora da zona: só entra no Angular uma vez por quadro (scheduleZoom).
      if (host) {
        host.addEventListener('touchstart', this.onTouchStart, { passive: false });
        host.addEventListener('touchmove', this.onTouchMove, { passive: false });
        host.addEventListener('touchend', this.onTouchEnd);
        host.addEventListener('touchcancel', this.onTouchEnd);
        host.addEventListener('wheel', this.onWheel, { passive: false });
      }
    });
    this.scheduleFit();
    this.scrollToEnd();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    clearInterval(this.refreshTimer);
    cancelAnimationFrame(this.fitFrame);
    cancelAnimationFrame(this.pinchFrame);
    const host = this.scrollHostRef?.nativeElement;
    if (host) {
      host.removeEventListener('touchstart', this.onTouchStart);
      host.removeEventListener('touchmove', this.onTouchMove);
      host.removeEventListener('touchend', this.onTouchEnd);
      host.removeEventListener('touchcancel', this.onTouchEnd);
      host.removeEventListener('wheel', this.onWheel);
    }
  }

  // ---------------------------------------------------------------------------
  // Geometria
  // ---------------------------------------------------------------------------

  private get endMs(): number {
    return this.anesthesiaEndTime ? this.anesthesiaEndTime.getTime() : Date.now();
  }

  private earliestTimestamp(): string | undefined {
    const all = [
      this.vitalRecords[0]?.timestamp,
      ...this.agents.map((a) => a.timestamp),
      ...this.clinicalEvents.map((e) => e.timestamp),
      ...this.fluidBalance.map((b) => b.timestamp),
      ...this.oxygenFlows.map((f) => f.timestamp),
      ...this.compressedAirFlows.map((f) => f.timestamp),
      ...this.infusionPumps.map((p) => p.timestamp),
      ...this.positionHistory.map((p) => p.timestamp),
    ].filter((t): t is string => !!t);
    if (!all.length) return undefined;
    return all.reduce((min, t) => (new Date(t).getTime() < new Date(min).getTime() ? t : min));
  }

  /**
   * Largura visível para as trilhas. Não desconta `reservedRight`: abrir a gaveta
   * só acrescenta espaço à direita do canvas, então nenhuma coluna muda de X.
   */
  private availableTrackWidth(): number {
    const host = this.scrollHostRef?.nativeElement;
    const labelW = this.labelProbeRef?.nativeElement.offsetWidth ?? 160;
    const width = host ? host.clientWidth - labelW : 800;
    return Math.max(width, 320);
  }

  private rawX(ms: number, trackW: number): number {
    const frac = (ms - this.win.viewStart) / this.win.span;
    return PAD_L + frac * (trackW - PAD_L - PAD_R);
  }

  /** X de um instante qualquer, coerente com as colunas deslocadas pelo de-overlap. */
  xAt(ms: number): number {
    const cols = this.columns;
    if (!cols.length || ms < new Date(cols[0].record.timestamp).getTime()) {
      return this.rawX(ms, this.baseTrackW);
    }
    for (let i = cols.length - 1; i >= 0; i--) {
      const colMs = new Date(cols[i].record.timestamp).getTime();
      if (colMs <= ms) {
        const x = cols[i].x + (ms - colMs) * this.pxPerMs;
        const next = cols[i + 1];
        return next ? Math.min(x, next.x - 2) : x;
      }
    }
    return this.rawX(ms, this.baseTrackW);
  }

  private baseTrackW = 800;

  private recompute(): void {
    const firstTs = this.earliestTimestamp();
    this.win = computeTimelineWindow(this.anesthesiaStartTime, this.anesthesiaEndTime, firstTs);

    const available = this.availableTrackWidth();
    this.baseTrackW = Math.max(available * this.zoom, this.vitalRecords.length * MIN_COL_PX + PAD_L + PAD_R);
    this.pxPerMs = (this.baseTrackW - PAD_L - PAD_R) / this.win.span;

    // Colunas: posição pelo tempo, nunca duas coladas (mesma regra do deoverlapPercents).
    const cols: Column[] = [];
    this.vitalRecords.forEach((record, i) => {
      const raw = this.rawX(new Date(record.timestamp).getTime(), this.baseTrackW);
      cols.push({ record, x: i ? Math.max(raw, cols[i - 1].x + MIN_COL_PX) : raw });
    });
    this.columns = cols;

    const nowMs = this.endMs;
    this.nowX = this.anesthesiaStartTime || cols.length ? this.xAt(nowMs) : null;
    const lastX = Math.max(cols[cols.length - 1]?.x ?? 0, this.nowX ?? 0);
    this.trackW = Math.max(this.baseTrackW, lastX + PAD_R);

    this.buildMilestones();
    this.buildSeries();
    this.o2Bars = this.flowBars(this.oxygenFlows);
    this.airBars = this.flowBars(this.compressedAirFlows);
    this.buildPumps(nowMs);
    this.agentChips = this.lane(this.agents, (a) => [a.name, a.dose].filter(Boolean).join(' '), 150);
    this.eventChips = this.lane(
      this.clinicalEvents.filter((e) => (e.type || '').toLowerCase() !== 'position'),
      (e) => e.catalogEventName || e.categoryLabel || e.description || e.type,
      150,
    );
    this.hydrationChips = this.lane(
      this.fluidBalance.filter(isHydrationEntry),
      (b) => `${b.volumeMl} ml · ${b.time}`,
      110,
    );
    this.positionMarks = this.positionHistory.map((item) => ({ item, x: this.xAt(new Date(item.timestamp).getTime()) }));
    this.buildBalance();
  }

  private buildMilestones(): void {
    const raw: { d: Date | null; kind: Milestone['kind'] }[] = [
      { d: this.anesthesiaStartTime, kind: 'anesthesia' },
      { d: this.surgeryStartTime, kind: 'surgery' },
      { d: this.surgeryEndTime, kind: 'surgery' },
      { d: this.anesthesiaEndTime, kind: 'anesthesia' },
    ];
    const out: Milestone[] = [];
    for (const m of raw) {
      if (!m.d) continue;
      let x = this.xAt(m.d.getTime());
      // Dois marcos quase no mesmo minuto: afasta o rótulo para não sobrepor.
      const prev = out[out.length - 1];
      if (prev && x - prev.x < 56) x = prev.x + 56;
      out.push({ x, label: this.hm(m.d), kind: m.kind });
    }
    this.milestones = out;
  }

  private y(value: number): number {
    const clamped = Math.min(Y_MAX, Math.max(Y_MIN, value));
    const pct = (clamped - Y_MIN) / (Y_MAX - Y_MIN);
    return CHART_PAD_T + (1 - pct) * (this.chartH - CHART_PAD_T - CHART_PAD_B);
  }

  yFor(tick: number): number {
    return this.y(tick);
  }

  private buildSeries(): void {
    const pts = (field: 'pas' | 'pad' | 'pam' | 'fc') => this.columns
      .filter((c) => c.record[field] != null)
      .map((c) => ({ x: c.x, y: this.y(c.record[field] as number) }));
    const pas = pts('pas'); const pad = pts('pad'); const pam = pts('pam'); const fc = pts('fc');
    const line = (p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(' ');
    this.pasPts = line(pas); this.padPts = line(pad); this.pamPts = line(pam); this.fcPts = line(fc);
    this.pasMarks = pas; this.padMarks = pad; this.fcMarks = fc;
  }

  triangleUp(p: { x: number; y: number }): string {
    return `${p.x},${p.y - 5} ${p.x - 5},${p.y + 4} ${p.x + 5},${p.y + 4}`;
  }

  triangleDown(p: { x: number; y: number }): string {
    return `${p.x},${p.y + 5} ${p.x - 5},${p.y - 4} ${p.x + 5},${p.y - 4}`;
  }

  /** O₂/Ar: `isActive=false` é o sentinela que encerra a barra contínua. */
  private flowBars(entries: ResourceFlowEntry[]): Bar[] {
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const bars: Bar[] = [];
    let open: number | null = null;
    for (const e of sorted) {
      const ms = new Date(e.timestamp).getTime();
      if (e.isActive) {
        if (open == null) open = ms;
      } else if (open != null) {
        bars.push(this.bar(open, ms));
        open = null;
      }
    }
    if (open != null) bars.push(this.bar(open, this.endMs));
    return bars;
  }

  private bar(startMs: number, endMs: number): Bar {
    const x = this.xAt(startMs);
    return { x, w: Math.max(6, this.xAt(endMs) - x) };
  }

  private buildPumps(nowMs: number): void {
    const sorted = [...this.infusionPumps].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const laneEnds: number[] = [];
    this.pumpChips = sorted.map((p) => {
      const start = new Date(p.timestamp).getTime();
      const end = Math.min(new Date(p.endAt).getTime(), nowMs);
      const x = this.xAt(start);
      const w = Math.max(48, this.xAt(end) - x);
      let lane = laneEnds.findIndex((e) => e <= x);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(x + w + 4); } else { laneEnds[lane] = x + w + 4; }
      return { item: p, x, w, lane, label: p.medicationName };
    });
  }

  /** Itens com minuto próprio: posição exata, empilhando em faixas quando se sobrepõem. */
  private lane<T extends { timestamp: string }>(items: T[], labelOf: (t: T) => string, maxW: number): LanedChip<T>[] {
    const sorted = [...items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const laneEnds: number[] = [];
    return sorted.map((item) => {
      const label = labelOf(item) || '—';
      const w = Math.min(maxW, 18 + label.length * 6.4);
      const x = this.xAt(new Date(item.timestamp).getTime());
      let lane = laneEnds.findIndex((e) => e <= x);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(x + w + 4); } else { laneEnds[lane] = x + w + 4; }
      return { item, x, w, lane, label };
    });
  }

  laneRowHeight(chips: LanedChip<unknown>[], min = 34): number {
    const lanes = chips.reduce((m, c) => Math.max(m, c.lane + 1), 1);
    return Math.max(min, lanes * LANE_H + 8);
  }

  laneTop(lane: number): number {
    return 4 + lane * LANE_H;
  }

  /** Ganhos/perdas do catálogo somados por intervalo (mesma janela usada pela antiga linha de Hidratação). */
  private buildBalance(): void {
    const catalog = this.fluidBalance.filter((b) => !isHydrationEntry(b));
    const sumFor = (type: 'gain' | 'loss') => this.columns.map((c, i) => {
      const ts = new Date(c.record.timestamp).getTime();
      const prev = i > 0 ? new Date(this.columns[i - 1].record.timestamp).getTime() : -Infinity;
      return catalog
        .filter((b) => b.type === type)
        .filter((b) => { const t = new Date(b.timestamp).getTime(); return t > prev && t <= ts; })
        .reduce((s, b) => s + (b.volumeMl || 0), 0);
    });
    this.gainsByCol = sumFor('gain');
    this.lossesByCol = sumFor('loss');
  }

  get totalGains(): number {
    return this.fluidBalance.filter((b) => b.type === 'gain').reduce((s, b) => s + (b.volumeMl || 0), 0);
  }

  get totalLosses(): number {
    return this.fluidBalance.filter((b) => b.type === 'loss').reduce((s, b) => s + (b.volumeMl || 0), 0);
  }

  get currentPosition(): string {
    return this.positionHistory[this.positionHistory.length - 1]?.position || '';
  }

  get isO2Active(): boolean {
    return this.oxygenFlows[this.oxygenFlows.length - 1]?.isActive ?? false;
  }

  get isAirActive(): boolean {
    return this.compressedAirFlows[this.compressedAirFlows.length - 1]?.isActive ?? false;
  }

  // ---------------------------------------------------------------------------
  // Valores
  // ---------------------------------------------------------------------------

  valueFor(record: VitalRecord, field: TimelineCellField): number | undefined {
    if (typeof field === 'string') return record[field] ?? undefined;
    return record.custom?.[field.custom];
  }

  display(field: TimelineCellField, value: number | undefined): string {
    if (value === undefined || value === null) return '';
    if (field === 'temp') return value.toFixed(1).replace('.', ',');
    return String(value);
  }

  lastValue(field: TimelineCellField): string {
    for (let i = this.vitalRecords.length - 1; i >= 0; i--) {
      const v = this.valueFor(this.vitalRecords[i], field);
      if (v !== undefined && v !== null) return this.display(field, v);
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Altura do gráfico: ocupa o que sobrar da área visível (tablets grandes ganham gráfico maior)
  // ---------------------------------------------------------------------------

  private scheduleFit(): void {
    if (!this.viewReady) return;
    cancelAnimationFrame(this.fitFrame);
    this.fitFrame = requestAnimationFrame(() => this.fit());
  }

  private fit(): void {
    const host = this.scrollHostRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!host || !canvas) return;
    const others = canvas.offsetHeight - this.chartH;
    const target = Math.round(Math.min(CHART_MAX_H, Math.max(CHART_MIN_H, host.clientHeight - others - 2)));
    const widthChanged = Math.abs(this.availableTrackWidth() * this.zoom - this.baseTrackW) > 1;
    if (Math.abs(target - this.chartH) > 2 || widthChanged) {
      this.chartH = target;
      this.recompute();
      this.cdr.detectChanges();
    }
  }

  // ---------------------------------------------------------------------------
  // Navegação
  // ---------------------------------------------------------------------------

  /** Botões − / + do rodapé: passos de 0,2 até 2× e de 0,5 acima disso; mantêm "agora" à vista, como antes. */
  zoomIn(): void {
    const step = this.zoom >= 2 ? 0.5 : 0.2;
    this.zoom = Math.min(ZOOM_MAX, Math.round((this.zoom + step) * 10) / 10);
    this.recompute();
    this.scrollToEnd();
  }

  zoomOut(): void {
    const step = this.zoom > 2 ? 0.5 : 0.2;
    this.zoom = Math.max(ZOOM_MIN, Math.round((this.zoom - step) * 10) / 10);
    this.recompute();
    this.scrollToEnd();
  }

  get zoomMin(): number { return ZOOM_MIN; }
  get zoomMax(): number { return ZOOM_MAX; }

  get zoomLabel(): string {
    return `${this.zoom.toFixed(1).replace('.', ',')}×`;
  }

  // ---------------------------------------------------------------------------
  // Zoom por pinça (e Ctrl + roda no computador)
  // ---------------------------------------------------------------------------

  private pinch: { startDist: number; startZoom: number; anchorClientX: number } | null = null;
  private pinchFrame = 0;
  private pendingZoom: { zoom: number; anchorClientX: number } | null = null;

  private readonly onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    this.pinch = {
      startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1,
      startZoom: this.zoom,
      anchorClientX: (a.clientX + b.clientX) / 2,
    };
    e.preventDefault();
  };

  private readonly onTouchMove = (e: TouchEvent) => {
    if (!this.pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const ratio = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / this.pinch.startDist;
    this.scheduleZoom(this.pinch.startZoom * ratio, (a.clientX + b.clientX) / 2);
  };

  private readonly onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) this.pinch = null;
  };

  private readonly onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    this.scheduleZoom(this.zoom * Math.exp(-e.deltaY / 300), e.clientX);
  };

  /** Um reprocessamento por quadro, mesmo com muitos eventos de toque. */
  private scheduleZoom(zoom: number, anchorClientX: number): void {
    this.pendingZoom = { zoom, anchorClientX };
    if (this.pinchFrame) return;
    this.pinchFrame = requestAnimationFrame(() => {
      this.pinchFrame = 0;
      const pending = this.pendingZoom;
      this.pendingZoom = null;
      if (pending) this.zone.run(() => this.setZoomAt(pending.zoom, pending.anchorClientX));
    });
  }

  /** Aplica o zoom mantendo parado o instante que está sob os dedos (ou sob o cursor). */
  private setZoomAt(zoom: number, anchorClientX: number): void {
    const host = this.scrollHostRef?.nativeElement;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    if (!host || Math.abs(next - this.zoom) < 0.01) return;
    const labelW = this.labelProbeRef?.nativeElement.offsetWidth ?? 160;
    const anchorX = Math.max(labelW, anchorClientX - host.getBoundingClientRect().left);
    const frac = (host.scrollLeft + anchorX - labelW) / this.trackW;

    this.zoom = next;
    this.recompute();
    this.cdr.detectChanges();
    host.scrollLeft = frac * this.trackW - (anchorX - labelW);
  }

  scrollToEnd(): void {
    requestAnimationFrame(() => {
      const el = this.scrollHostRef?.nativeElement;
      if (el) el.scrollLeft = el.scrollWidth;
    });
  }

  scrollToStart(): void {
    const el = this.scrollHostRef?.nativeElement;
    if (el) el.scrollLeft = 0;
  }

  onCell(record: VitalRecord, field: TimelineCellField | null): void {
    if (this.readonly) return;
    this.cellTap.emit({ record, field });
  }

  trackCol = (_: number, c: Column) => c.record.clientId ?? c.record.timestamp;
  trackChip = (_: number, c: LanedChip<{ clientId?: string; timestamp: string }>) => c.item.clientId ?? c.item.timestamp;
  trackRow = (_: number, r: ValueRow) => r.key;

  private hm(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
