import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController, ModalController } from '@ionic/angular/standalone';
import {
  IonSpinner,
  IonIcon,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudOutline,
  cloudUploadOutline,
  refreshOutline,
  timeOutline,
  alertCircleOutline,
  checkmarkDoneCircleOutline,
  informationCircleOutline,
  searchOutline,
  createOutline,
  documentTextOutline,
  medkitOutline,
  pulseOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import {
  PendingIntegrationsService,
  PendingIntegration,
  IntegrationType,
  IntegrationStatus,
} from 'src/app/core/services/pending-integrations.service';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import {
  RecordViewerModalComponent,
  RecordData,
} from 'src/app/shared/components/record-viewer-modal/record-viewer-modal.component';

type StatusFilter = 'all' | IntegrationStatus;
type TypeFilter = 'all' | IntegrationType;

@Component({
  selector: 'app-integracoes-fichas',
  templateUrl: './integracoes-fichas.page.html',
  styleUrls: ['./integracoes-fichas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSpinner,
    IonIcon,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    StatusBarComponent,
    HeaderInstitucionalComponent,
  ],
  providers: [DatePipe],
})
export class IntegracoesFichasPage implements OnInit, OnDestroy {
  items: PendingIntegration[] = [];
  filteredItems: PendingIntegration[] = [];

  isLoading = false;
  isSendingAll = false;
  sendingId: string | null = null;
  sentCount = 0;
  sentLog: { type: IntegrationType; patientName?: string; sentAt: string }[] = [];

  statusFilter: StatusFilter = 'all';
  typeFilter: TypeFilter = 'all';
  searchTerm = '';

  readonly statusFilters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'error', label: 'Com erro' },
    { value: 'integrated', label: 'Integrados' },
  ];

  readonly typeFilters: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'preAnesthesia', label: 'Ficha Pré-Anestésica' },
    { value: 'anesthesia', label: 'Ficha Anestésica' },
    { value: 'monitoring', label: 'Monitorização' },
  ];

  private sub = new Subscription();

  constructor(
    private pendingIntegrationsService: PendingIntegrationsService,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private router: Router,
    private datePipe: DatePipe,
  ) {
    addIcons({
      cloudOutline,
      cloudUploadOutline,
      refreshOutline,
      timeOutline,
      alertCircleOutline,
      checkmarkDoneCircleOutline,
      informationCircleOutline,
      searchOutline,
      createOutline,
      documentTextOutline,
      medkitOutline,
      pulseOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const loading = await this.loadingController.create({
      spinner: 'crescent',
      message: 'Carregando integrações pendentes...',
      backdropDismiss: false,
    });
    await loading.present();

    this.isLoading = true;
    try {
      await this.reload();
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }

    this.sub.add(
      merge(this.anesthesiaRecordService.pendingDraftsCount$, this.anesthesiaRecordService.syncing$)
        .pipe(debounceTime(300))
        .subscribe(() => this.reload()),
    );

    this.sub.add(this.pendingIntegrationsService.changed$.pipe(debounceTime(300)).subscribe(() => this.reload()));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get pendingCount(): number {
    return this.items.filter((i) => i.status === 'pending').length;
  }

  get errorCount(): number {
    return this.items.filter((i) => i.status === 'error').length;
  }

  async reload(): Promise<void> {
    this.items = await this.pendingIntegrationsService.list();
    this.sentCount = this.pendingIntegrationsService.getSentCount();
    this.sentLog = this.pendingIntegrationsService.getSentLog();
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredItems = this.items.filter((item) => {
      if (this.statusFilter !== 'all' && item.status !== this.statusFilter) return false;
      if (this.typeFilter !== 'all' && item.type !== this.typeFilter) return false;

      if (term) {
        const name = (item.patient.name ?? '').toLowerCase();
        const record = (item.patient.medicalRecordNumber ?? '').toLowerCase();
        if (!name.includes(term) && !record.includes(term)) return false;
      }

      return true;
    });
  }

  typeLabel(type: IntegrationType): string {
    switch (type) {
      case 'preAnesthesia':
        return 'Ficha Pré-Anestésica';
      case 'anesthesia':
        return 'Ficha Anestésica';
      case 'monitoring':
        return 'Monitorização';
    }
  }

  typeIcon(type: IntegrationType): string {
    switch (type) {
      case 'preAnesthesia':
        return 'document-text-outline';
      case 'anesthesia':
        return 'medkit-outline';
      case 'monitoring':
        return 'pulse-outline';
    }
  }

  patientLabel(item: PendingIntegration): string {
    return item.patient.name || (item.surgeryId ? `Cirurgia nº ${item.surgeryId}` : 'Paciente não identificado');
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return this.datePipe.transform(iso, "dd/MM/yyyy 'às' HH:mm") ?? '—';
  }

  jsonFor(item: PendingIntegration): string {
    return JSON.stringify(item.payload, null, 2);
  }

  async sendItem(item: PendingIntegration): Promise<void> {
    if (this.sendingId || !item.canSendNow || item.requiresNavigation) return;

    this.sendingId = item.id;
    const result = await this.pendingIntegrationsService.sendOne(item);
    this.sendingId = null;

    await this.toast(
      result.ok ? 'Integração realizada com sucesso.' : 'Não foi possível realizar a integração.',
      result.ok ? 'success' : 'danger',
    );

    await this.reload();
  }

  async sendAll(): Promise<void> {
    if (this.isSendingAll) return;

    const sendable = this.items.filter((i) => i.canSendNow && !i.requiresNavigation);
    if (!sendable.length) return;

    this.isSendingAll = true;
    const result = await this.pendingIntegrationsService.sendAll(sendable);
    this.isSendingAll = false;

    await this.toast(
      `Integração concluída: ${result.success} enviado(s) com sucesso, ${result.failed} com erro.`,
      result.failed ? 'warning' : 'success',
      3600,
    );

    await this.reload();
  }

  openForm(item: PendingIntegration): void {
    if (item.navigateRoute) {
      this.router.navigate(item.navigateRoute);
    }
  }

  get sendableCount(): number {
    return this.items.filter((i) => i.canSendNow && !i.requiresNavigation).length;
  }

  async viewDetails(item: PendingIntegration): Promise<void> {
    const fields: { label: string; value: string | number | null }[] = [
      { label: 'Paciente', value: this.patientLabel(item) },
      { label: 'Tipo', value: this.typeLabel(item.type) },
    ];

    if (item.patient.medicalRecordNumber) fields.push({ label: 'Prontuário', value: item.patient.medicalRecordNumber });
    if (item.surgeryId) fields.push({ label: 'Cirurgia', value: item.surgeryId });
    if (item.error?.lastAttemptAt) fields.push({ label: 'Última tentativa', value: this.formatDate(item.error.lastAttemptAt) });
    if (item.error?.attempts) fields.push({ label: 'Tentativas', value: item.error.attempts });
    if (item.error?.endpoint) fields.push({ label: 'Endpoint', value: item.error.endpoint });
    if (item.error?.httpStatus) fields.push({ label: 'Status HTTP', value: item.error.httpStatus });
    if (item.error?.message) fields.push({ label: 'Mensagem', value: item.error.message });

    const data: RecordData = {
      title: 'Detalhes da Integração',
      sections: [{ title: 'Diagnóstico técnico', fields }],
    };

    const modal = await this.modalController.create({
      component: RecordViewerModalComponent,
      componentProps: { data },
      cssClass: 'fa-sheet-modal',
    });
    await modal.present();
  }

  private async toast(message: string, color: 'success' | 'warning' | 'danger' = 'success', duration = 2600): Promise<void> {
    const t = await this.toastController.create({ message, duration, color, position: 'top' });
    await t.present();
  }
}
