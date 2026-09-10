import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController, ModalController, AlertController } from '@ionic/angular/standalone';
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
  trashOutline,
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

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
    TranslatePipe,
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

  readonly statusFilters: { value: StatusFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'integracoesFichas.filters.status.all' },
    { value: 'pending', labelKey: 'integracoesFichas.filters.status.pending' },
    { value: 'error', labelKey: 'integracoesFichas.filters.status.error' },
    { value: 'integrated', labelKey: 'integracoesFichas.filters.status.integrated' },
  ];

  readonly typeFilters: { value: TypeFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'integracoesFichas.types.all' },
    { value: 'preAnesthesia', labelKey: 'integracoesFichas.types.preAnesthesia' },
    { value: 'anesthesia', labelKey: 'integracoesFichas.types.anesthesia' },
    { value: 'monitoring', labelKey: 'integracoesFichas.types.monitoring' },
  ];

  private sub = new Subscription();
  private subscribedToUpdates = false;

  constructor(
    private pendingIntegrationsService: PendingIntegrationsService,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private alertController: AlertController,
    private router: Router,
    private datePipe: DatePipe,
    private ngZone: NgZone,
    private translate: TranslateService,
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
      trashOutline,
    });
  }

  ngOnInit(): void {

    if (this.subscribedToUpdates) return;
    this.subscribedToUpdates = true;

    this.sub.add(
      merge(this.anesthesiaRecordService.pendingDraftsCount$, this.anesthesiaRecordService.syncing$)
        .pipe(debounceTime(300))
        .subscribe(() => this.reload()),
    );

    this.sub.add(this.pendingIntegrationsService.changed$.pipe(debounceTime(300)).subscribe(() => this.reload()));
  }

  ionViewWillEnter(): void {
    this.ngZone.run(() => this.refreshWithLoading());
  }

  private async refreshWithLoading(): Promise<void> {
    const loading = await this.loadingController.create({
      spinner: 'crescent',
      message: this.translate.instant('integracoesFichas.loadingPending'),
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
        return this.translate.instant('integracoesFichas.types.preAnesthesia');
      case 'anesthesia':
        return this.translate.instant('integracoesFichas.types.anesthesia');
      case 'monitoring':
        return this.translate.instant('integracoesFichas.types.monitoring');
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
    return (
      item.patient.name ||
      (item.surgeryId
        ? this.translate.instant('integracoesFichas.surgeryLabel', { id: item.surgeryId })
        : this.translate.instant('integracoesFichas.patientUnknown'))
    );
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
      result.ok
        ? this.translate.instant('integracoesFichas.toast.sendSuccess')
        : this.translate.instant('integracoesFichas.toast.sendError'),
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
      this.translate.instant('integracoesFichas.toast.sendAllResult', {
        success: result.success,
        failed: result.failed,
      }),
      result.failed ? 'warning' : 'success',
      3600,
    );

    await this.reload();
  }

  async removeItem(item: PendingIntegration): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('integracoesFichas.removeConfirm.title'),
      message: this.translate.instant('integracoesFichas.removeConfirm.message', {
        type: this.typeLabel(item.type),
        patient: this.patientLabel(item),
      }),
      buttons: [
        { text: this.translate.instant('integracoesFichas.removeConfirm.cancel'), role: 'cancel', cssClass: 'secondary' },
        {
          text: this.translate.instant('integracoesFichas.removeConfirm.confirm'),
          role: 'destructive',
          handler: async () => {
            this.pendingIntegrationsService.removeItem(item);
            await this.toast(this.translate.instant('integracoesFichas.toast.itemRemoved'), 'warning');
            await this.reload();
          },
        },
      ],
    });
    await alert.present();
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
      { label: this.translate.instant('integracoesFichas.details.patient'), value: this.patientLabel(item) },
      { label: this.translate.instant('integracoesFichas.details.type'), value: this.typeLabel(item.type) },
    ];

    if (item.patient.medicalRecordNumber) fields.push({ label: this.translate.instant('integracoesFichas.details.medicalRecord'), value: item.patient.medicalRecordNumber });
    if (item.surgeryId) fields.push({ label: this.translate.instant('integracoesFichas.details.surgery'), value: item.surgeryId });
    if (item.error?.lastAttemptAt) fields.push({ label: this.translate.instant('integracoesFichas.details.lastAttempt'), value: this.formatDate(item.error.lastAttemptAt) });
    if (item.error?.attempts) fields.push({ label: this.translate.instant('integracoesFichas.details.attempts'), value: item.error.attempts });
    if (item.error?.endpoint) fields.push({ label: this.translate.instant('integracoesFichas.details.endpoint'), value: item.error.endpoint });
    if (item.error?.httpStatus) fields.push({ label: this.translate.instant('integracoesFichas.details.httpStatus'), value: item.error.httpStatus });
    if (item.error?.message) fields.push({ label: this.translate.instant('integracoesFichas.details.message'), value: item.error.message });

    const data: RecordData = {
      title: this.translate.instant('integracoesFichas.details.title'),
      sections: [{ title: this.translate.instant('integracoesFichas.details.sectionTitle'), fields }],
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
