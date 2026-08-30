import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { AntibioticProphylaxisReport, ReportFilters } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';

@Component({
  selector: 'app-antibiotic-prophylaxis-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent],
  templateUrl: './antibiotic-prophylaxis-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class AntibioticProphylaxisReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: AntibioticProphylaxisReport | null = null;
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

  get medicationLabels(): string[] {
    return this.report?.topMedications.map(x => x.name) ?? [];
  }

  get medicationCounts(): number[] {
    return this.report?.topMedications.map(x => x.count) ?? [];
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getAntibioticProphylaxis(this.filters));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de antibioticoprofilaxia', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
