import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { DrugConsumptionReport, ReportFilters } from 'src/app/core/models/reports.model';
import { DrugCategoryEnum, DRUG_CATEGORY_LABELS } from 'src/app/core/models/api-enums.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';
import { BarChartComponent } from '../charts/bar-chart.component';
import { DonutChartComponent } from '../charts/donut-chart.component';

@Component({
  selector: 'app-drug-consumption-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportStateComponent, ReportPdfActionsComponent, BarChartComponent, DonutChartComponent],
  templateUrl: './drug-consumption-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class DrugConsumptionReportComponent implements OnChanges {
  @Input({ required: true }) filters!: ReportFilters;

  report: DrugConsumptionReport | null = null;
  loading = false;
  error: string | null = null;
  category: DrugCategoryEnum | null = null;

  categoryOptions = Object.entries(DRUG_CATEGORY_LABELS).map(([id, label]) => ({
    id: Number(id) as DrugCategoryEnum,
    label
  }));

  constructor(private reportsService: ReportsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters']) {
      this.load();
    }
  }

  get isEmpty(): boolean {
    return !!this.report && this.report.totalAdministrations === 0;
  }

  get drugLabels(): string[] {
    return this.report?.byDrug.map(x => x.description) ?? [];
  }

  get drugCounts(): number[] {
    return this.report?.byDrug.map(x => x.count) ?? [];
  }

  get categoryLabels(): string[] {
    return this.report?.byCategory.map(x => x.name) ?? [];
  }

  get categoryCounts(): number[] {
    return this.report?.byCategory.map(x => x.count) ?? [];
  }

  onCategoryChange() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getDrugConsumption(this.filters, this.category));
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar relatório de consumo de fármacos', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
