import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { printOutline } from 'ionicons/icons';
import { ReportsService } from 'src/app/core/services/reports.service';
import { DocumentViewerService } from 'src/app/core/services/document-viewer.service';
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

/** "clinical-events" → "clinicalEvents", a chave usada pelos títulos em relatorios.*.title. */
function toI18nKey(reportKey: string): string {
  return reportKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const [year, month, day] = (iso || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

@Component({
  selector: 'app-report-pdf-actions',
  standalone: true,
  imports: [CommonModule, IonIcon, TranslatePipe],
  templateUrl: './report-pdf-actions.component.html',
  styleUrls: ['../report-card.scss']
})
export class ReportPdfActionsComponent {
  @Input({ required: true }) reportKey!: string;
  @Input() filters: ReportFilters = defaultFilters();
  @Input() category: DrugCategoryEnum | null = null;

  constructor(
    private reportsService: ReportsService,
    private documentViewer: DocumentViewerService,
    private translate: TranslateService,
  ) {
    addIcons({ printOutline });
  }

  visualizar(): void {
    // Congela os filtros do momento do clique: o documento exibido corresponde ao que estava na tela.
    const filters = { ...this.filters };
    const category = this.category;

    void this.documentViewer.open({
      title: this.translate.instant(`relatorios.${toI18nKey(this.reportKey)}.title`),
      subtitle: `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`,
      orientation: 'portrait',
      load: () => this.reportsService.getReportPrintHtml(this.reportKey, filters, category),
    });
  }
}
