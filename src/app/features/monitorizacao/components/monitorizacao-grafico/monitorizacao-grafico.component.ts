import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ChangeDetectionStrategy, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import Chart from 'chart.js/auto';
import { MonitoringRecord } from 'src/app/core/models/monitoring-record.model';
import { Agent, ClinicalEvent, FluidBalance } from 'src/app/core/models/clinical-data.model';

@Component({
  selector: 'app-monitorizacao-grafico',
  templateUrl: './monitorizacao-grafico.component.html',
  styleUrls: ['./monitorizacao-grafico.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonitorizacaoGraficoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() vitalRecords: MonitoringRecord[] = [];
  @Input() agents: Agent[] = [];
  @Input() events: ClinicalEvent[] = [];
  @Input() balanceItems: FluidBalance[] = [];
  @Input() startTimeAnesthesia: string | null = null;
  @Input() startTimeSurgery: string | null = null;
  @Input() hasData = false; // Add to toggle placeholder? The parent manages it, but we can manage here if needed

  @ViewChild('vitalChart', { static: false }) vitalChartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: any;

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.chart) {
      this.updateChartData();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createEmojiCanvas(emoji: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 8, 9);
    }
    return canvas;
  }

  private createChart() {
    const ctx = this.vitalChartCanvas.nativeElement;
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'FC (Pulso)', data: [], borderColor: '#ef4444', backgroundColor: '#ef4444', pointStyle: 'circle', pointRadius: 3, borderWidth: 1, tension: 0.3, spanGaps: true, yAxisID: 'y'
          },
          {
            label: 'PA Sistólica (V)', data: [], borderColor: '#3b82f6', backgroundColor: 'transparent', pointStyle: (ctx: any) => { const canvas = document.createElement('canvas'); canvas.width = 14; canvas.height = 14; const c = canvas.getContext('2d')!; c.strokeStyle = '#3b82f6'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(2, 2); c.lineTo(7, 12); c.lineTo(12, 2); c.stroke(); return canvas; }, pointRadius: 5, borderWidth: 1.5, tension: 0.1, spanGaps: true, yAxisID: 'y'
          },
          {
            label: 'PA Diastólica (Λ)', data: [], borderColor: '#3b82f6', backgroundColor: 'transparent', pointStyle: (ctx: any) => { const canvas = document.createElement('canvas'); canvas.width = 14; canvas.height = 14; const c = canvas.getContext('2d')!; c.strokeStyle = '#3b82f6'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(2, 12); c.lineTo(7, 2); c.lineTo(12, 12); c.stroke(); return canvas; }, pointRadius: 5, borderWidth: 1.5, tension: 0.1, spanGaps: true, yAxisID: 'y'
          },
          {
            label: 'PAM (▲)', data: [], borderColor: '#1e293b', backgroundColor: '#1e293b', pointStyle: 'triangle', pointRadius: 4, borderWidth: 1, tension: 0.1, spanGaps: true, yAxisID: 'y'
          },
          {
            label: 'SpO₂ (%)', data: [], borderColor: '#10b981', backgroundColor: '#10b981', pointStyle: 'rect', pointRadius: 4, borderWidth: 1, tension: 0.1, spanGaps: true, yAxisID: 'ySpO2'
          },
          { label: 'Início Anestesia (X)', data: [], borderColor: '#8b5cf6', backgroundColor: '#8b5cf6', pointStyle: 'crossRot', pointRadius: 4, borderWidth: 2, showLine: false },
          { label: 'Início Cirurgia (☉)', data: [], borderColor: '#f59e0b', backgroundColor: '#ffffff', pointStyle: (ctx: any) => { const canvas = document.createElement('canvas'); canvas.width = 14; canvas.height = 14; const c = canvas.getContext('2d')!; c.strokeStyle = '#f59e0b'; c.lineWidth = 1.5; c.beginPath(); c.arc(7, 7, 5, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(7, 7, 1.5, 0, Math.PI * 2); c.fill(); return canvas; }, pointRadius: 5, borderWidth: 2, showLine: false },
          { label: 'Agentes', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Eventos', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Posições', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Ganhos', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Perdas', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (ctx: any) => {
                if (ctx.dataset.label === 'Agentes') { const agent = this.agents.find(a => a.time === ctx.label); return `Agente: ${agent?.name} (${agent?.dose})`; }
                if (ctx.dataset.label === 'Eventos') { const ev = this.events.find(e => e.time === ctx.label); return `Evento: ${ev?.name}`; }
                if (ctx.dataset.label === 'Ganhos' || ctx.dataset.label === 'Perdas') { const item = this.balanceItems.find(b => b.time === ctx.label); return `${item?.category}: ${item?.value}ml`; }
                return `${ctx.dataset.label}: ${ctx.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: { min: 0, max: 220, ticks: { stepSize: 20, color: '#94a3b8', font: { size: 10, weight: 'bold' } }, grid: { color: '#f1f5f9' } },
          ySpO2: { type: 'linear', display: true, position: 'right', min: 80, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: (value) => value + '%', color: '#10b981', font: { weight: 'bold' } } },
          x: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });

    this.updateChartData();
  }

  private updateChartData() {
    if (!this.chart) return;

    const timesArray: string[] = [];
    this.vitalRecords.forEach(r => timesArray.push(r.time));
    if (this.startTimeAnesthesia) timesArray.push(this.startTimeAnesthesia);
    if (this.startTimeSurgery) timesArray.push(this.startTimeSurgery);
    this.agents.forEach(a => timesArray.push(a.time));
    this.events.forEach(e => timesArray.push(e.time));
    this.balanceItems.forEach(b => timesArray.push(b.time));

    let sortedTimes: string[] = [];
    if (timesArray.length > 0) {
      const sorted = [...timesArray].sort((a, b) => a.localeCompare(b));
      const minTime = sorted[0];
      const maxTime = sorted[sorted.length - 1];

      const fullTimeLabels = new Set<string>(timesArray);
      const today = new Date().toISOString().split('T')[0];
      let current = new Date(`${today}T${minTime}:00`);
      const end = new Date(`${today}T${maxTime}:00`);

      while (current <= end) {
        fullTimeLabels.add(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        current = new Date(current.getTime() + 5 * 60000);
      }

      sortedTimes = Array.from(fullTimeLabels).sort((a, b) => a.localeCompare(b));
    }

    this.chart.data.labels = sortedTimes;

    this.chart.data.datasets[0].data = sortedTimes.map(t => { const rec = this.vitalRecords.find(r => r.time === t); return rec ? rec.fc : null; });
    this.chart.data.datasets[1].data = sortedTimes.map(t => { const rec = this.vitalRecords.find(r => r.time === t); return rec ? rec.pas : null; });
    this.chart.data.datasets[2].data = sortedTimes.map(t => { const rec = this.vitalRecords.find(r => r.time === t); return rec ? rec.pad : null; });
    this.chart.data.datasets[3].data = sortedTimes.map(t => { const rec = this.vitalRecords.find(r => r.time === t); return rec ? rec.pam : null; });
    this.chart.data.datasets[4].data = sortedTimes.map(t => { const rec = this.vitalRecords.find(r => r.time === t); return rec ? rec.spo2 : null; });

    const anesDs = this.chart.data.datasets.find((d: any) => d.label && d.label.includes('Início Anestesia'));
    if (anesDs) anesDs.data = sortedTimes.map(t => t === this.startTimeAnesthesia ? 100 : null);

    const surgDs = this.chart.data.datasets.find((d: any) => d.label && d.label.includes('Início Cirurgia'));
    if (surgDs) surgDs.data = sortedTimes.map(t => t === this.startTimeSurgery ? 100 : null);

    const pillIcon = this.createEmojiCanvas('💊');
    const bellIcon = this.createEmojiCanvas('🔔');
    const positionIcon = this.createEmojiCanvas('🧍');
    const blueDrop = this.createEmojiCanvas('💧');
    const redDrop = this.createEmojiCanvas('🩸');

    const agentsDs = this.chart.data.datasets.find((d: any) => d.label === 'Agentes');
    if (agentsDs) { agentsDs.pointStyle = pillIcon; agentsDs.pointRadius = 7; agentsDs.data = sortedTimes.map(t => this.agents.find(a => a.time === t) ? 210 : null); }

    const eventsDs = this.chart.data.datasets.find((d: any) => d.label === 'Eventos');
    if (eventsDs) { eventsDs.pointStyle = bellIcon; eventsDs.pointRadius = 7; eventsDs.data = sortedTimes.map(t => this.events.find(e => e.time === t && e.type !== 'position') ? 200 : null); }

    const posDs = this.chart.data.datasets.find((d: any) => d.label === 'Posições');
    if (posDs) { posDs.pointStyle = positionIcon; posDs.pointRadius = 7; posDs.data = sortedTimes.map(t => this.events.find(e => e.time === t && e.type === 'position') ? 190 : null); }

    const gainsDs = this.chart.data.datasets.find((d: any) => d.label === 'Ganhos');
    if (gainsDs) { gainsDs.pointStyle = blueDrop; gainsDs.pointRadius = 7; gainsDs.data = sortedTimes.map(t => this.balanceItems.find(b => b.time === t && b.type === 'gain') ? 180 : null); }

    const lossesDs = this.chart.data.datasets.find((d: any) => d.label === 'Perdas');
    if (lossesDs) { lossesDs.pointStyle = redDrop; lossesDs.pointRadius = 7; lossesDs.data = sortedTimes.map(t => this.balanceItems.find(b => b.time === t && b.type === 'loss') ? 180 : null); }

    this.chart.update('none'); // Update without animation/re-render overhead
  }
}
