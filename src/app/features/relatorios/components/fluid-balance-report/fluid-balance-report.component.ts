import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { FluidBalanceReport, ReportFilters } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';
import { DonutChartComponent } from '../charts/donut-chart.component';

@Component({
  selector: 'app-fluid-balance-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent, DonutChartComponent],
  templateUrl: './fluid-balance-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class FluidBalanceReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: FluidBalanceReport | null = null;
  loading = false;
  error: string | null = null;

  constructor(private reportsService: ReportsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.load();
    }
  }

  get isEmpty(): boolean {
    return !!this.report && this.report.totalGainMl === 0 && this.report.totalLossMl === 0;
  }

  get categoryLabels(): string[] {
    return this.report?.byCategory.map(x => x.name) ?? [];
  }

  get categoryVolumes(): number[] {
    return this.report?.byCategory.map(x => x.totalMl) ?? [];
  }

  get procedureLabels(): string[] {
    return this.report?.byProcedure.map(x => x.name) ?? [];
  }

  get procedureVolumes(): number[] {
    return this.report?.byProcedure.map(x => x.totalMl) ?? [];
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getFluidBalance(this.filters));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de balanço hídrico', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
