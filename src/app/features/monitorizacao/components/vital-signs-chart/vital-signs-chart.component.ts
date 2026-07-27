import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef,
  AfterViewInit, OnChanges, OnDestroy, ChangeDetectionStrategy, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pulseOutline, addOutline, listOutline, settingsOutline } from 'ionicons/icons';
import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';
type MonitoringRecord = any;

Chart.register(...registerables);


const clinicalMarkersPlugin: Plugin<'line'> = {
  id: 'clinicalMarkers',
  afterDatasetsDraw(chart, _args, opts: any) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    const records: any[] = opts?.records || [];
    if (!records.length) return;
    const xScale: any = scales['x'];
    if (!xScale) return;

    const findIdx = (ts: Date | string | null): number => {
      if (!ts) return -1;
      const t = new Date(ts).getTime();
      let best = -1; let bestDiff = Infinity;
      records.forEach((r, i) => {
        const rt = new Date(r.timestamp || r.time || 0).getTime();
        const d = Math.abs(rt - t);
        if (d < bestDiff) { bestDiff = d; best = i; }
      });
      return best;
    };

    const draw = (idx: number, symbol: 'x' | 'o' | 'dot', color: string, label: string) => {
      if (idx < 0) return;
      const x = xScale.getPixelForValue(idx);
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

    draw(findIdx(opts.anesthesiaStartTime), 'x', '#7c3aed', 'Anestesia');
    draw(findIdx(opts.surgeryStartTime), 'o', '#0ea5e9', 'Cirurgia');
    draw(findIdx(opts.surgeryEndTime), 'dot', '#0f172a', 'Fim');
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
      c['anesthesiaStartTime'] || c['surgeryStartTime'] || c['surgeryEndTime'])) {
      this.updateChart();
    }
    if (c['vitalRecords']) this.updateSnapshot();
  }

  ngOnDestroy(): void { this.resizeObs?.disconnect(); this.chart?.destroy(); }

  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: { labels: [], datasets: this.buildDatasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15,23,42,0.95)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10
          }
        },
        scales: {
          x: { grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { font: { size: 10 }, color: '#64748b' } },
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
    return [
      {
        label: 'FC', data: [], borderColor: '#ef4444', backgroundColor: '#ef4444',
        pointRadius: 3, pointStyle: 'circle', tension: 0.2, borderWidth: 2, yAxisID: 'y'
      },
      {
        label: 'PAS', data: [], borderColor: '#3b82f6', backgroundColor: '#3b82f6',
        pointRadius: 5, pointStyle: 'triangle', tension: 0, borderWidth: 2,
        showLine: false, yAxisID: 'y'
      },
      {
        label: 'PAD', data: [], borderColor: '#3b82f6', backgroundColor: '#3b82f6',
        pointRadius: 5, pointStyle: 'triangle', pointRotation: 180, tension: 0, borderWidth: 2,
        showLine: false, yAxisID: 'y'
      },
      {
        label: 'PAM', data: [], borderColor: '#1e3a8a', backgroundColor: '#1e3a8a',
        pointRadius: 4, pointStyle: 'rect', tension: 0.2, borderWidth: 1, borderDash: [3, 3], yAxisID: 'y'
      },
      {
        label: 'SpO₂', data: [], borderColor: '#10b981', backgroundColor: '#10b981',
        pointRadius: 3, pointStyle: 'circle', tension: 0.3, borderWidth: 2, yAxisID: 'y'
      },
      {
        label: 'T°C', data: [], borderColor: '#f59e0b', backgroundColor: '#f59e0b',
        pointRadius: 3, tension: 0.3, borderWidth: 1.5, borderDash: [5, 3], yAxisID: 'yTemp'
      },
    ] as any;
  }

  private updateChart(): void {
    if (!this.chart) return;
    const labels = this.vitalRecords.map(r => r.time);
    this.chart.data.labels = labels;
    const ds = this.chart.data.datasets as any[];
    ds[0].data = this.vitalRecords.map(r => r.fc ?? null);
    ds[1].data = this.vitalRecords.map(r => r.pas ?? null);
    ds[2].data = this.vitalRecords.map(r => r.pad ?? null);
    ds[3].data = this.vitalRecords.map(r => r.pam ?? null);
    ds[4].data = this.vitalRecords.map(r => r.spo2 ?? null);
    ds[5].data = this.vitalRecords.map((r: any) => r.temperatura ?? r.temp ?? null);

    const opts: any = this.chart.options.plugins as any;
    opts.clinicalMarkers = {
      records: this.vitalRecords,
      anesthesiaStartTime: this.anesthesiaStartTime,
      surgeryStartTime: this.surgeryStartTime,
      surgeryEndTime: this.surgeryEndTime
    };
    this.chart.update('none');
  }

  private updateSnapshot(): void {
    const last = this.vitalRecords[this.vitalRecords.length - 1];
    this.currentSnapshot = last || null;
  }

  onAddClick(): void { this.addVitalRecord.emit(); }
  onAddFieldClick(): void { this.addCustomField.emit(); }
  onHistoryClick(): void { this.openHistory.emit(); }
}
