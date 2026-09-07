import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { printOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { ReportsService } from 'src/app/core/services/reports.service';
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

  constructor(
    private reportsService: ReportsService,
    private toastController: ToastController
  ) {
    addIcons({ printOutline });
  }

  async visualizar() {
    if (this.generating) return;
    this.generating = true;
    try {
      const blob = await firstValueFrom(this.reportsService.getReportPrintHtml(this.reportKey, this.filters, this.category));
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('Erro ao gerar relatório', error);
      await this.showToast('Não foi possível gerar o relatório. Tente novamente.', 'danger');
    } finally {
      this.generating = false;
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await this.toastController.create({ message, duration: 3200, color, position: 'top' });
    await toast.present();
  }
}
