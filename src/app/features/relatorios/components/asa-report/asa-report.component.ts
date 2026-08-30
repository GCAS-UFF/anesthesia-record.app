import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { AsaReport, ReportFilters } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';
import { DonutChartComponent } from '../charts/donut-chart.component';
import { LineChartComponent } from '../charts/line-chart.component';

@Component({
  selector: 'app-asa-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent, DonutChartComponent, LineChartComponent],
  templateUrl: './asa-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class AsaReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: AsaReport | null = null;
  loading = false;
  error: string | null = null;

  constructor(private reportsService: ReportsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.load();
    }
  }

  get isEmpty(): boolean {
    return !!this.report && this.report.totalEvaluated === 0;
  }

  get distributionLabels(): string[] {
    return this.report?.distribution.map(x => x.label) ?? [];
  }

  get distributionCounts(): number[] {
    return this.report?.distribution.map(x => x.count) ?? [];
  }

  get anesthetistLabels(): string[] {
    return this.report?.byAnesthetist.map(x => x.name) ?? [];
  }

  get anesthetistCounts(): number[] {
    return this.report?.byAnesthetist.map(x => x.count) ?? [];
  }

  get weekLabels(): string[] {
    return this.report?.byWeek.map(x => x.name) ?? [];
  }

  get weekCounts(): number[] {
    return this.report?.byWeek.map(x => x.count) ?? [];
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getAsa(this.filters));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de classificação ASA', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
