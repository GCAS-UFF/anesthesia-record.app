import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './base/api.service';
import { ApiUrlService } from './api-url.service';
import { DrugCategoryEnum } from '../models/api-enums.model';
import {
  AnesthetistOption,
  AnesthetistsReport,
  AntibioticProphylaxisReport,
  AsaReport,
  CancellationsReport,
  ClinicalEventsReport,
  DrugConsumptionReport,
  FluidBalanceReport,
  IntegrationStatusReport,
  RecoveryReport,
  ReportFilters,
  ReportsSummary,
  SurgeriesReport,
} from '../models/reports.model';

interface ApiEnvelope<T> {
  valid: boolean;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor(private api: ApiService, private http: HttpClient, private apiUrlService: ApiUrlService) { }

  private toParams(filters: ReportFilters, extra?: Record<string, any>): any {
    const params: any = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    if (filters.anesthesiologistId !== null && filters.anesthesiologistId !== undefined) {
      params.anesthesiologistId = filters.anesthesiologistId;
    }
    if (filters.status !== null && filters.status !== undefined) {
      params.status = filters.status;
    }
    return { ...params, ...(extra ?? {}) };
  }

  getSummary(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<ReportsSummary>>('reports/summary', this.toParams(filters));
  }

  getClinicalEvents(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<ClinicalEventsReport>>('reports/clinical-events', this.toParams(filters));
  }

  getDrugConsumption(filters: ReportFilters, category?: DrugCategoryEnum | null) {
    const extra = category !== null && category !== undefined ? { category } : undefined;
    return this.api.get<ApiEnvelope<DrugConsumptionReport>>('reports/drug-consumption', this.toParams(filters, extra));
  }

  getSurgeries(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<SurgeriesReport>>('reports/surgeries', this.toParams(filters));
  }

  getAnesthetists(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<AnesthetistsReport>>('reports/anesthetists', this.toParams(filters));
  }

  getCancellations(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<CancellationsReport>>('reports/cancellations', this.toParams(filters));
  }

  getAsa(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<AsaReport>>('reports/asa', this.toParams(filters));
  }

  getRecovery(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<RecoveryReport>>('reports/recovery', this.toParams(filters));
  }

  getAntibioticProphylaxis(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<AntibioticProphylaxisReport>>('reports/antibiotic-prophylaxis', this.toParams(filters));
  }

  getFluidBalance(filters: ReportFilters) {
    return this.api.get<ApiEnvelope<FluidBalanceReport>>('reports/fluid-balance', this.toParams(filters));
  }

  getIntegrationStatus() {
    return this.api.get<ApiEnvelope<IntegrationStatusReport>>('reports/integration-status');
  }

  getAnesthetistOptions() {
    return this.api.get<ApiEnvelope<AnesthetistOption[]>>('reports/filters/anesthetists');
  }

  getReportPdf(reportKey: string, filters: ReportFilters, category?: DrugCategoryEnum | null) {
    const params = this.toParams(filters, category !== null && category !== undefined ? { category } : undefined);
    const url = `${this.apiUrlService.getBaseUrl()}/reports/${reportKey}/pdf`;
    return this.http.get(url, { params, responseType: 'blob' });
  }
}
