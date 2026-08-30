import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { documentTextOutline, printOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
import { PrintingService } from 'src/app/core/services/printing.service';
import { ReportFilters } from 'src/app/core/models/reports.model';
import { DrugCategoryEnum } from 'src/app/core/models/api-enums.model';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultFilters(): ReportFilters {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: toIsoDate(start), endDate: toIsoDate(today), anesthesiologistId: null, status: null };
}

@Component({
  selector: 'app-report-pdf-actions',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './report-pdf-actions.component.html',
  styleUrls: ['../report-card.scss']
})
export class ReportPdfActionsComponent {
  @Input({ required: true }) reportKey!: string;
  @Input() filters: ReportFilters = defaultFilters();
  @Input() category: DrugCategoryEnum | null = null;

  generating = false;
  printing = false;

  constructor(
    private reportsService: ReportsService,
    private printingService: PrintingService,
    private toastController: ToastController
  ) {
    addIcons({ documentTextOutline, printOutline });
  }

  async generatePdf() {
    if (this.generating) return;
    this.generating = true;
    try {
      const blob = await firstValueFrom(this.reportsService.getReportPdf(this.reportKey, this.filters, this.category));
      await this.printingService.openPdf(blob, this.fileName());
    } catch (error) {
      console.error('Erro ao gerar PDF', error);
      await this.showToast('Não foi possível gerar o PDF. Tente novamente.', 'danger');
    } finally {
      this.generating = false;
    }
  }

  async print() {
    if (this.printing) return;
    this.printing = true;
    try {
      const blob = await firstValueFrom(this.reportsService.getReportPdf(this.reportKey, this.filters, this.category));
      const result = await this.printingService.printPdf(blob, this.fileName());
      if (!result.ok) {
        await this.showToast(result.message || 'Não foi possível imprimir o relatório.', 'medium');
      }
    } catch (error) {
      console.error('Erro ao preparar impressão', error);
      await this.showToast('Não foi possível gerar o PDF para impressão. Tente novamente.', 'danger');
    } finally {
      this.printing = false;
    }
  }

  private fileName(): string {
    const stamp = new Date().toISOString().slice(0, 10);
    return `relatorio-${this.reportKey}-${stamp}.pdf`;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await this.toastController.create({ message, duration: 3200, color, position: 'top' });
    await toast.present();
  }
}
