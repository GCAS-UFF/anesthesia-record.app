import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { CancellationsReport, ReportFilters } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';

@Component({
  selector: 'app-cancellations-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent],
  templateUrl: './cancellations-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class CancellationsReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: CancellationsReport | null = null;
  loading = false;
  error: string | null = null;

  constructor(private reportsService: ReportsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.load();
    }
  }

  get isEmpty(): boolean {
    return !!this.report && this.report.totalSurgeries === 0;
  }

  get anesthetistLabels(): string[] {
    return this.report?.byAnesthetist.map(x => x.name) ?? [];
  }

  get anesthetistCounts(): number[] {
    return this.report?.byAnesthetist.map(x => x.count) ?? [];
  }

  get weekdayLabels(): string[] {
    return this.report?.byWeekday.map(x => x.name) ?? [];
  }

  get weekdayCounts(): number[] {
    return this.report?.byWeekday.map(x => x.count) ?? [];
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getCancellations(this.filters));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de cancelamentos', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
