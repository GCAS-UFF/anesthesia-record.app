import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { ClinicalEventsReport, ReportFilters } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';
import { DonutChartComponent } from '../charts/donut-chart.component';
import { LineChartComponent } from '../charts/line-chart.component';

@Component({
  selector: 'app-clinical-events-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent, DonutChartComponent, LineChartComponent],
  templateUrl: './clinical-events-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class ClinicalEventsReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: ClinicalEventsReport | null = null;
  loading = false;
  error: string | null = null;

  constructor(private reportsService: ReportsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.load();
    }
  }

  get isEmpty(): boolean {
    return !!this.report && this.report.totalEvents === 0;
  }

  get typeLabels(): string[] {
    return this.report?.byType.map(x => x.eventTypeLabel) ?? [];
  }

  get typeCounts(): number[] {
    return this.report?.byType.map(x => x.count) ?? [];
  }

  get anesthetistLabels(): string[] {
    return this.report?.byAnesthetist.map(x => x.name) ?? [];
  }

  get anesthetistCounts(): number[] {
    return this.report?.byAnesthetist.map(x => x.count) ?? [];
  }

  get dayLabels(): string[] {
    return this.report?.byDay.map(x => x.date) ?? [];
  }

  get dayCounts(): number[] {
    return this.report?.byDay.map(x => x.count) ?? [];
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getClinicalEvents(this.filters));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de eventos clínicos', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
