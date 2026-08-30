import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input,
  OnChanges, OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-wrap"><canvas #chartCanvas></canvas></div>`,
  styles: [`
    .chart-wrap { position: relative; width: 100%; height: 280px; }
    canvas { width: 100% !important; height: 100% !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() labels: string[] = [];
  @Input() data: number[] = [];
  @Input() datasetLabel = 'Quantidade';
  @Input() color = '#3b82f6';
  @Input() horizontal = false;

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

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [{
          label: this.datasetLabel,
          data: this.data,
          backgroundColor: this.color,
          borderRadius: 6,
          maxBarThickness: 42
        }]
      },
      options: {
        indexAxis: this.horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { ticks: { autoSkip: false }, grid: { display: !this.horizontal } },
          y: { beginAtZero: true, grid: { display: this.horizontal } }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.labels;
    this.chart.data.datasets[0].data = this.data;
    this.chart.update('none');
  }
}
