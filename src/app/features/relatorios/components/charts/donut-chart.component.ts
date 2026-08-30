import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input,
  OnChanges, OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-wrap"><canvas #chartCanvas></canvas></div>`,
  styles: [`
    .chart-wrap { position: relative; width: 100%; height: 280px; }
    canvas { width: 100% !important; height: 100% !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DonutChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() labels: string[] = [];
  @Input() data: number[] = [];

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  private resizeObs?: ResizeObserver;

  ngAfterViewInit(): void {
    this.buildChart();
    this.resizeObs = new ResizeObserver(() => this.chart?.resize());
    const host = this.canvasRef.nativeElement.parentElement;
    if (host) this.resizeObs.observe(host);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && (changes['labels'] || changes['data'])) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.resizeObs?.disconnect();
    this.chart?.destroy();
  }

  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: this.labels,
        datasets: [{
          data: this.data,
          backgroundColor: this.labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } },
          tooltip: { mode: 'nearest' }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.labels;
    this.chart.data.datasets[0].data = this.data;
    this.chart.data.datasets[0].backgroundColor = this.labels.map((_, i) => PALETTE[i % PALETTE.length]);
    this.chart.update('none');
  }
}
