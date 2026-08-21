import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  AfterViewInit, OnChanges, OnDestroy, ChangeDetectionStrategy, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pulseOutline, addOutline, listOutline, settingsOutline } from 'ionicons/icons';
import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ptBR } from 'date-fns/locale';
import zoomPlugin from 'chartjs-plugin-zoom';

type MonitoringRecord = any;

Chart.register(...registerables, zoomPlugin);


const clinicalMarkersPlugin: Plugin<'line'> = {
  id: 'clinicalMarkers',
  afterDatasetsDraw(chart, _args, opts: any) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    const xScale: any = scales['x'];
    if (!xScale) return;
    const getXForTime = (ts: Date | string | null): number => {
      if (!ts) return -1;
      const targetTime = new Date(ts).getTime();
      return xScale.getPixelForValue(targetTime);
    };

    const draw = (x: number, symbol: 'x' | 'o' | 'dot', color: string, label: string) => {
      if (x < 0) return;
      const yTop = chartArea.top;
      const yBot = chartArea.bottom;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const cy = yTop + 10;
      if (symbol === 'x') {
        ctx.beginPath();
        ctx.moveTo(x - 5, cy - 5); ctx.lineTo(x + 5, cy + 5);
        ctx.moveTo(x + 5, cy - 5); ctx.lineTo(x - 5, cy + 5);
        ctx.stroke();
      } else if (symbol === 'o') {
        ctx.beginPath(); ctx.arc(x, cy, 5, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, cy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, cy, 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, yTop - 2);
      ctx.restore();
    };

    draw(getXForTime(opts.anesthesiaStartTime), 'x', '#7c3aed', 'Anestesia');
    draw(getXForTime(opts.surgeryStartTime), 'o', '#0ea5e9', 'Cirurgia');
    draw(getXForTime(opts.surgeryEndTime), 'dot', '#0f172a', 'Fim');
    draw(getXForTime(opts.anesthesiaEndTime), 'x', '#0f172a', 'Fim Anes');
  }
};

Chart.register(clinicalMarkersPlugin);

@Component({
  selector: 'app-vital-signs-chart',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  templateUrl: './vital-signs-chart.component.html',
  styleUrls: ['./vital-signs-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VitalSignsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() vitalRecords: MonitoringRecord[] = [];
  @Input() anesthesiaStartTime: Date | string | null = null;
  @Input() anesthesiaEndTime: Date | string | null = null;
  @Input() surgeryStartTime: Date | string | null = null;
  @Input() surgeryEndTime: Date | string | null = null;
  @Input() hoverTime: number | null = null;
  @Input() customFields: any[] = [];

  @Input() positionHistory: any[] = [];
  @Input() clinicalEvents: any[] = [];
  @Input() agents: any[] = [];
  @Input() collapsed = false;
  @Input() readonly = false;

  @Output() hoverTimeChange = new EventEmitter<number | null>();
  @Output() addVitalRecord = new EventEmitter<void>();
  @Output() addCustomField = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() viewBoundsChange = new EventEmitter<{min: number, max: number}>();

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private resizeObs?: ResizeObserver;
  currentSnapshot: any = null;

  constructor() {
    addIcons({ pulseOutline, addOutline, listOutline, settingsOutline });
  }

  ngAfterViewInit(): void {
    this.buildChart();
    this.resizeObs = new ResizeObserver(() => this.chart?.resize());
    const host = this.canvasRef.nativeElement.parentElement;
    if (host) this.resizeObs.observe(host);
  }

  ngOnChanges(c: SimpleChanges): void {
    if (this.chart && (c['vitalRecords'] || c['hoverTime'] ||
      c['anesthesiaStartTime'] || c['anesthesiaEndTime'] ||
      c['surgeryStartTime'] || c['surgeryEndTime'] || c['customFields'])) {
      this.updateChart();
    }
    if (c['vitalRecords']) this.updateSnapshot();


    if (c['readonly'] && this.chart) {
      this.applyReadonlyToZoomConfig();
      this.chart.update();
    }
  }

  ngOnDestroy(): void { this.resizeObs?.disconnect(); this.chart?.destroy(); }

  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: { datasets: this.buildDatasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          zoom: {
            pan: {
              enabled: !this.readonly,
              mode: 'x',
              onPan: ({chart}) => this.emitBounds(chart)
            },
            zoom: {
              wheel: { enabled: !this.readonly },
              pinch: { enabled: !this.readonly },
              mode: 'x',
              onZoom: ({chart}) => this.emitBounds(chart)
            }
          },
          tooltip: {
            enabled: true,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            backgroundColor: 'rgba(15,23,42,0.95)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10
          }
        },
        scales: {
          x: { 
            type: 'time',
            time: { 
              displayFormats: { minute: 'HH:mm' }
            },
            adapters: {
              date: { locale: ptBR }
            },
            grid: { color: 'rgba(226,232,240,0.5)' }, 
            ticks: { 
              stepSize: 5, 
              font: { size: 10 }, 
              color: '#64748b' 
            } 
          },
          y: {
            position: 'left', min: 0, max: 240, grid: { color: 'rgba(226,232,240,0.4)' },
            ticks: { stepSize: 30, font: { size: 10 }, color: '#64748b' }
          },
          yTemp: {
            position: 'right', min: 32, max: 42, grid: { display: false },
            ticks: { stepSize: 2, font: { size: 10 }, color: '#f59e0b' }
          }
        },
        onHover: (_evt, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const rec = this.vitalRecords[idx];
            if (rec) this.hoverTimeChange.emit(new Date((rec as any).timestamp || Date.now()).getTime());
          } else {
            this.hoverTimeChange.emit(null);
          }
        }
      },
      plugins: [clinicalMarkersPlugin]
    };

    this.chart = new Chart(ctx, config);
    this.updateChart();
  }

  private buildDatasets() {
    const base = [
      {
        label: 'FC', data: [], borderColor: '#ef4444', backgroundColor: '#ef4444',
        pointRadius: 4, pointStyle: 'circle', tension: 0.2, borderWidth: 2, yAxisID: 'y'
      },
      {
        label: 'PAS', data: [], borderColor: '#3b82f6', backgroundColor: '#ffffff',
        pointRadius: 5, pointStyle: 'triangle', pointRotation: 180, tension: 0, borderWidth: 2,
        showLine: false, yAxisID: 'y'
      },
      {
        label: 'PAD', data: [], borderColor: '#3b82f6', backgroundColor: '#ffffff',
        pointRadius: 5, pointStyle: 'triangle', tension: 0, borderWidth: 2,
        showLine: false, yAxisID: 'y'
      },
      {
        label: 'PAM', data: [], borderColor: '#1e3a8a', backgroundColor: '#1e3a8a',
        pointRadius: 5, pointStyle: 'triangle', tension: 0.2, borderWidth: 1, borderDash: [3, 3], yAxisID: 'y'
      },
      {
        label: 'SpO₂', data: [], borderColor: '#10b981', backgroundColor: '#10b981',
        pointRadius: 3, pointStyle: 'circle', tension: 0.3, borderWidth: 2, yAxisID: 'y'
      },
      {
        label: 'T°C', data: [], borderColor: '#f59e0b', backgroundColor: '#f59e0b',
        pointRadius: 3, pointStyle: 'circle', tension: 0.3, borderWidth: 1.5, borderDash: [5, 3], yAxisID: 'yTemp'
      },
    ] as any;

    const styles = ['rect', 'star', 'rectRot', 'crossRot'];
    (this.customFields || []).forEach((cf, i) => {
       base.push({
         label: cf.label, data: [], borderColor: '#64748b', backgroundColor: '#64748b',
         pointRadius: 4, pointStyle: styles[i % 4], tension: 0.2, borderWidth: 2, yAxisID: 'y'
       });
    });

    return base;
  }

  private updateChart(): void {
    if (!this.chart) return;
    
    this.chart.data.datasets = this.buildDatasets();
    const ds = this.chart.data.datasets as any[];
    
    const mapToPoint = (r: any, key: string) => {
      const ts = new Date(r.timestamp || r.time).getTime();
      const val = (key === 'temp') ? (r.temperatura ?? r.temp ?? null) : (r[key] ?? null);
      return val !== null && val !== '' && !isNaN(Number(val)) ? { x: ts, y: Number(val) } : null;
    };

    ds[0].data = this.vitalRecords.map(r => mapToPoint(r, 'fc')).filter(Boolean);
    ds[1].data = this.vitalRecords.map(r => mapToPoint(r, 'pas')).filter(Boolean);
    ds[2].data = this.vitalRecords.map(r => mapToPoint(r, 'pad')).filter(Boolean);
    ds[3].data = this.vitalRecords.map(r => mapToPoint(r, 'pam')).filter(Boolean);
    ds[4].data = this.vitalRecords.map(r => mapToPoint(r, 'spo2')).filter(Boolean);
    ds[5].data = this.vitalRecords.map(r => mapToPoint(r, 'temp')).filter(Boolean);

    (this.customFields || []).forEach((cf, i) => {
      if (ds[6 + i]) {
        ds[6 + i].data = this.vitalRecords.map(r => mapToPoint(r, cf.key)).filter(Boolean);
      }
    });

    // Forçar a escala X a englobar desde o início da anestesia até o momento atual (ou fim)
    if (this.chart.options.scales && this.chart.options.scales['x']) {
      // Se o usuário já deu zoom, pan, ou moveu a barra de rolagem, não
      // sobrescrevemos a escala para não dar "reset" na visualização.
      const isZoomed = (this.chart as any).isZoomedOrPanned ? (this.chart as any).isZoomedOrPanned() : false;

      if (!isZoomed && !this.hasCustomView) {
        delete this.chart.options.scales['x'].min;
        delete this.chart.options.scales['x'].max;
        
        if (this.anesthesiaStartTime) {
          this.chart.options.scales['x'].suggestedMin = new Date(this.anesthesiaStartTime).getTime();
        }
        
        let endTime = Date.now();
        if (this.surgeryEndTime) {
          endTime = new Date(this.surgeryEndTime).getTime();
        } else if (this.vitalRecords && this.vitalRecords.length > 0) {
          const lastRec = this.vitalRecords[this.vitalRecords.length - 1];
          const lastRecTime = new Date(lastRec.timestamp || lastRec.time).getTime();
          if (lastRecTime > endTime) endTime = lastRecTime;
        }

        // Garantir que a janela mínima de tempo exibida no gráfico seja de 2 horas (7200000 ms)
        const MIN_WINDOW_MS = 7200000;
        const suggestedMin = this.chart.options.scales['x'].suggestedMin;
        const startTime = (typeof suggestedMin === 'number') ? suggestedMin : (endTime - MIN_WINDOW_MS);
        
        if (endTime - startTime < MIN_WINDOW_MS) {
          endTime = startTime + MIN_WINDOW_MS;
        }

        this.chart.options.scales['x'].suggestedMax = endTime;
      }
    }

    const opts: any = this.chart.options.plugins as any;
    opts.clinicalMarkers = {
      records: this.vitalRecords,
      anesthesiaStartTime: this.anesthesiaStartTime,
      anesthesiaEndTime: this.anesthesiaEndTime,
      surgeryStartTime: this.surgeryStartTime,
      surgeryEndTime: this.surgeryEndTime
    };
    this.chart.update('none');
    
    // Emit initial bounds after first update
    setTimeout(() => this.emitBounds(this.chart!), 100);
  }

  private emitBounds(chart: Chart) {
    if (!chart || !chart.scales['x']) return;
    const min = chart.scales['x'].min;
    const max = chart.scales['x'].max;
    if (min !== undefined && max !== undefined) {
      this.viewBoundsChange.emit({ min, max });
      this.syncScrollbarFromBounds(min, max);
    }
  }

  panChart(deltaX: number) {
    if (this.readonly) return; // Cirurgia finalizada: arraste/pan desabilitado (ver ngOnChanges).
    if (this.chart) {
      (this.chart as any).pan({ x: deltaX }, undefined, 'x');
    }
  }

  private applyReadonlyToZoomConfig(): void {
    if (!this.chart) return;
    const zoomOpts: any = (this.chart.options.plugins as any)?.zoom;
    if (!zoomOpts) return;
    zoomOpts.pan.enabled = !this.readonly;
    zoomOpts.zoom.wheel.enabled = !this.readonly;
    zoomOpts.zoom.pinch.enabled = !this.readonly;
  }

  
  scrollbarValue = 0; 
  private readonly MIN_WINDOW_MS = 2 * 60 * 60 * 1000; 
  private syncingScrollbar = false;
  private hasCustomView = false;

  private getFullRange(): { start: number; end: number } {
    const start = this.anesthesiaStartTime
      ? new Date(this.anesthesiaStartTime).getTime()
      : (this.vitalRecords[0] ? new Date((this.vitalRecords[0] as any).timestamp || (this.vitalRecords[0] as any).time).getTime() : Date.now() - this.MIN_WINDOW_MS);

    let end = this.surgeryEndTime ? new Date(this.surgeryEndTime).getTime() : Date.now();
    const lastRec = this.vitalRecords[this.vitalRecords.length - 1] as any;
    if (lastRec) {
      const lastRecTime = new Date(lastRec.timestamp || lastRec.time).getTime();
      if (lastRecTime > end) end = lastRecTime;
    }
    if (end - start < this.MIN_WINDOW_MS) end = start + this.MIN_WINDOW_MS;
    return { start, end };
  }

  private syncScrollbarFromBounds(min: number, max: number): void {
    if (this.syncingScrollbar) return;
    const { start, end } = this.getFullRange();
    const windowSpan = Math.max(max - min, 1);
    const travel = Math.max(end - start - windowSpan, 1);
    const center = min - start;
    this.scrollbarValue = Math.min(100, Math.max(0, (center / travel) * 100));
  }

  onScrollbarInput(value: number): void {
    if (!this.chart) return;
    this.scrollbarValue = value;
    const { start, end } = this.getFullRange();

    const currentScale: any = this.chart.scales['x'];
    const currentSpan = (currentScale?.max != null && currentScale?.min != null)
      ? (currentScale.max - currentScale.min)
      : this.MIN_WINDOW_MS;
    const windowSpan = Math.max(currentSpan, this.MIN_WINDOW_MS);
    const travel = Math.max(end - start - windowSpan, 1);

    const newMin = start + (travel * (value / 100));
    const newMax = newMin + windowSpan;

    this.syncingScrollbar = true;
    this.hasCustomView = true;
    if (this.chart.options.scales && this.chart.options.scales['x']) {
      (this.chart.options.scales['x'] as any).min = newMin;
      (this.chart.options.scales['x'] as any).max = newMax;
    }
    this.chart.update('none');
    this.viewBoundsChange.emit({ min: newMin, max: newMax });
    this.syncingScrollbar = false;
  }

  
  resetToLatest(): void {
    this.hasCustomView = false;
    if (this.chart?.options?.scales?.['x']) {
      delete (this.chart.options.scales['x'] as any).min;
      delete (this.chart.options.scales['x'] as any).max;
    }
    (this.chart as any)?.resetZoom?.();
    this.updateChart();
  }

  private updateSnapshot(): void {
    if (!this.vitalRecords || this.vitalRecords.length === 0) {
      this.currentSnapshot = null;
      return;
    }

    const snap: any = {};
    const lastRec = this.vitalRecords[this.vitalRecords.length - 1];
    snap.time = lastRec.time;

    for (let i = this.vitalRecords.length - 1; i >= 0; i--) {
      const r = this.vitalRecords[i] as any;
      if (snap.fc == null && r.fc != null && r.fc !== '') snap.fc = r.fc;
      if (snap.pas == null && r.pas != null && r.pas !== '') snap.pas = r.pas;
      if (snap.pad == null && r.pad != null && r.pad !== '') snap.pad = r.pad;
      if (snap.pam == null && r.pam != null && r.pam !== '') snap.pam = r.pam;
      if (snap.spo2 == null && r.spo2 != null && r.spo2 !== '') snap.spo2 = r.spo2;
      if (snap.etco2 == null && r.etco2 != null && r.etco2 !== '') snap.etco2 = r.etco2;
      if (snap.temp == null && (r.temp ?? r.temperatura) != null && (r.temp ?? r.temperatura) !== '') snap.temp = r.temp ?? r.temperatura;
      if (snap.bis == null && r.bis != null && r.bis !== '') snap.bis = r.bis;

      (this.customFields || []).forEach(cf => {
        if (snap[cf.key] == null && r.custom?.[cf.key] != null && r.custom?.[cf.key] !== '') {
          snap[cf.key] = r.custom[cf.key];
        } else if (snap[cf.key] == null && r[cf.key] != null && r[cf.key] !== '') {
          snap[cf.key] = r[cf.key];
        }
      });
    }

    this.currentSnapshot = snap;
  }

  onAddClick(): void { this.addVitalRecord.emit(); }
  onAddFieldClick(): void { this.addCustomField.emit(); }
  onHistoryClick(): void { this.openHistory.emit(); }
}
