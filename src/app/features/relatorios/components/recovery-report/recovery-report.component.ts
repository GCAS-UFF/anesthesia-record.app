import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { RecoveryReport, ReportFilters } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';
import { DonutChartComponent } from '../charts/donut-chart.component';

@Component({
  selector: 'app-recovery-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent, DonutChartComponent],
  templateUrl: './recovery-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class RecoveryReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: RecoveryReport | null = null;
  loading = false;
  error: string | null = null;

  constructor(private reportsService: ReportsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.load();
    }
  }

  get isEmpty(): boolean {
    return !!this.report && this.report.patientsEvaluated === 0;
  }

  get scoreLabels(): string[] {
    return this.report?.scoreDistribution.map(x => 'Score ' + x.score) ?? [];
  }

  get scoreCounts(): number[] {
    return this.report?.scoreDistribution.map(x => x.count) ?? [];
  }

  get destinationLabels(): string[] {
    return this.report?.destinationDistribution.map(x => x.name) ?? [];
  }

  get destinationCounts(): number[] {
    return this.report?.destinationDistribution.map(x => x.count) ?? [];
  }

  get dischargeConditionLabels(): string[] {
    return this.report?.dischargeConditionDistribution.map(x => x.name) ?? [];
  }

  get dischargeConditionCounts(): number[] {
    return this.report?.dischargeConditionDistribution.map(x => x.count) ?? [];
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getRecovery(this.filters));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de recuperação', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
