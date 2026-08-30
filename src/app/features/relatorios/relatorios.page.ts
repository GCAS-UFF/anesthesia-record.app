import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analyticsOutline, calendarOutline, checkmarkCircleOutline, closeCircleOutline,
  documentTextOutline, flaskOutline, medkitOutline, pulseOutline, syncOutline
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { ReportsService } from 'src/app/core/services/reports.service';
import { AnesthetistOption, ReportFilters, ReportsSummary } from 'src/app/core/models/reports.model';
import { ReportFiltersComponent } from './components/report-filters/report-filters.component';
import { ReportStateComponent } from './components/report-state/report-state.component';
import { ClinicalEventsReportComponent } from './components/clinical-events-report/clinical-events-report.component';
import { DrugConsumptionReportComponent } from './components/drug-consumption-report/drug-consumption-report.component';
import { SurgeriesReportComponent } from './components/surgeries-report/surgeries-report.component';
import { AnesthetistsReportComponent } from './components/anesthetists-report/anesthetists-report.component';
import { CancellationsReportComponent } from './components/cancellations-report/cancellations-report.component';
import { AsaReportComponent } from './components/asa-report/asa-report.component';
import { RecoveryReportComponent } from './components/recovery-report/recovery-report.component';
import { AntibioticProphylaxisReportComponent } from './components/antibiotic-prophylaxis-report/antibiotic-prophylaxis-report.component';
import { FluidBalanceReportComponent } from './components/fluid-balance-report/fluid-balance-report.component';
import { IntegrationStatusReportComponent } from './components/integration-status-report/integration-status-report.component';

type Tab = 'operacional' | 'clinico' | 'medicamentos' | 'integracoes';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-relatorios',
  standalone: true,
  templateUrl: './relatorios.page.html',
  styleUrls: ['./relatorios.page.scss'],
  imports: [
    CommonModule,
    IonIcon,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    ReportFiltersComponent,
    ReportStateComponent,
    ClinicalEventsReportComponent,
    DrugConsumptionReportComponent,
    SurgeriesReportComponent,
    AnesthetistsReportComponent,
    CancellationsReportComponent,
    AsaReportComponent,
    RecoveryReportComponent,
    AntibioticProphylaxisReportComponent,
    FluidBalanceReportComponent,
    IntegrationStatusReportComponent,
  ]
})
export class RelatoriosPage implements OnInit {
  activeTab: Tab = 'operacional';

  filters: ReportFilters = this.defaultFilters();
  anesthetistOptions: AnesthetistOption[] = [];

  summary: ReportsSummary | null = null;
  summaryLoading = false;
  summaryError: string | null = null;

  constructor(private reportsService: ReportsService) {
    addIcons({
      analyticsOutline, calendarOutline, checkmarkCircleOutline, closeCircleOutline,
      documentTextOutline, flaskOutline, medkitOutline, pulseOutline, syncOutline
    });
  }

  ngOnInit(): void {
    this.loadAnesthetistOptions();
    this.loadSummary();
  }

  selectTab(tab: Tab) {
    this.activeTab = tab;
  }

  onFiltersChange(filters: ReportFilters) {
    this.filters = filters;
    this.loadSummary();
  }

  onRefresh() {
    this.loadSummary();
  }

  private defaultFilters(): ReportFilters {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(today),
      anesthesiologistId: null,
      status: null
    };
  }

  private async loadAnesthetistOptions() {
    try {
      const response = await firstValueFrom(this.reportsService.getAnesthetistOptions());
      this.anesthetistOptions = response?.data ?? [];
    } catch (error) {
      console.error('Erro ao carregar anestesistas para o filtro', error);
    }
  }

  async loadSummary() {
    this.summaryLoading = true;
    this.summaryError = null;
    try {
      const response = await firstValueFrom(this.reportsService.getSummary(this.filters));
      if (response?.valid === false) {
        this.summaryError = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.summary = null;
        return;
      }
      this.summary = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar resumo executivo', error);
      this.summaryError = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.summary = null;
    } finally {
      this.summaryLoading = false;
    }
  }

  formatSyncDate(value: string | null): string {
    if (!value) return 'Nunca sincronizado';
    return new Date(value).toLocaleString('pt-BR');
  }
}
