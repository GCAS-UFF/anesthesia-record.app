import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { IntegrationStatusReport } from 'src/app/core/models/reports.model';
import { ReportStateComponent } from '../report-state/report-state.component';
import { ReportPdfActionsComponent } from '../report-pdf-actions/report-pdf-actions.component';

@Component({
  selector: 'app-integration-status-report',
  standalone: true,
  imports: [CommonModule, ReportStateComponent, ReportPdfActionsComponent],
  templateUrl: './integration-status-report.component.html',
  styleUrls: ['../report-card.scss']
})
export class IntegrationStatusReportComponent implements OnInit {
  report: IntegrationStatusReport | null = null;
  loading = false;
  error: string | null = null;

  constructor(private reportsService: ReportsService) { }

  ngOnInit(): void {
    this.load();
  }

  formatDate(value: string | null): string {
    if (!value) return 'Nunca sincronizado';
    const date = new Date(value);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const response = await firstValueFrom(this.reportsService.getIntegrationStatus());
      if (response?.valid === false) {
        this.error = response.message || 'Não foi possível carregar os relatórios. Tente novamente.';
        this.report = null;
        return;
      }
      this.report = response?.data ?? null;
    } catch (error) {
      console.error('Erro ao carregar status da integração', error);
      this.error = 'Não foi possível carregar os relatórios. Tente novamente.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }
}
