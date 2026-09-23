import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonContent, ModalController, ToastController } from '@ionic/angular/standalone';
import { finalize, firstValueFrom, Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { OrientationService } from 'src/app/core/services/orientation.service';
import { SurgeryService } from 'src/app/core/services/surgery.service';
import { PreAnesthesicRecordService } from 'src/app/core/services/pre-anesthesic-record.service';
import { SettingsService } from 'src/app/core/services/settings.service';
import {
  CLINICAL_EVENT_TYPE_LABELS, SURGERY_STATUS_LABELS, SurgeryStatusEnum, SURGICAL_POSITION_LABEL_TO_ID,
} from 'src/app/core/models/api-enums.model';

import { ClinicalItemModalComponent } from 'src/app/shared/components/clinical-item-modal/clinical-item-modal.component';
import { QuickVitalInputComponent } from 'src/app/shared/components/quick-vital-input/quick-vital-input.component';
import {
  RecordData, RecordSection, RecordViewerModalComponent,
} from 'src/app/shared/components/record-viewer-modal/record-viewer-modal.component';
import { mapAnesthesiaRecordToRecordData } from 'src/app/shared/models/anesthesia-record.mapper';
import { formatDateTimeBR } from 'src/app/shared/utils/date-format.util';

import {
  Agent, ClinicalEvent, FluidBalance, HistoryTab, InfusionPumpEntry, PositionEntry,
  PrimaryActionKind, ResourceFlowEntry, VitalRecord,
} from './models/monitoring-view.model';

import { HeaderInstitucionalComponent } from 'src/app/shared/components/header-institucional/header-institucional.component';
import { StatusBarComponent } from 'src/app/shared/components/status-bar/status-bar.component';
import { PatientSummaryCardComponent } from './components/patient-summary-card/patient-summary-card.component';
import { VitalCellField, VitalsSectionComponent } from './components/vitals-section/vitals-section.component';
import { VitalsChartCardComponent } from './components/vitals-chart-card/vitals-chart-card.component';
import { ResourcesFlowCardComponent } from './components/resources-flow-card/resources-flow-card.component';
import { AgentsCardComponent } from './components/agents-card/agents-card.component';
import { BottomActionRowComponent } from './components/bottom-action-row/bottom-action-row.component';
import { StatusStripComponent } from './components/status-strip/status-strip.component';
import { HistoryAction, HistoryModalComponent } from './components/history-modal/history-modal.component';

const MONITORING_DRAFT_KEY = (surgeryId: string) => `draft_monitoring_${surgeryId}`;
const FICHA_ANESTESICA_CACHE_KEY = 'cache_ficha_anestesica_';

/** Faixas válidas por parâmetro — edição rápida de célula na grade de sinais vitais. */
const VITAL_CELL_LIMITS: Record<string, { min: number; max: number }> = {
  temp: { min: 30, max: 43 },
  spo2: { min: 0, max: 100 },
  etco2: { min: 0, max: 150 },
  bis: { min: 0, max: 100 },
};

const POSICOES_POSSIVEIS = [
  'Supina', 'Prona', 'Lateral Direita', 'Lateral Esquerda',
  'Litotomia', 'Trendelenburg', 'Trendelenburg Reverso',
  'Sentada', 'Canivete', 'Fowler',
];

@Component({
  selector: 'app-monitorizacao',
  standalone: true,
  templateUrl: './monitorizacao.component.html',
  styleUrls: ['./monitorizacao.component.scss'],
  imports: [
    CommonModule, TranslatePipe, IonContent,
    StatusBarComponent, HeaderInstitucionalComponent, PatientSummaryCardComponent, VitalsSectionComponent,
    VitalsChartCardComponent, ResourcesFlowCardComponent, AgentsCardComponent,
    BottomActionRowComponent, StatusStripComponent,
  ],
})
export class MonitorizacaoComponent implements OnInit, OnDestroy {
  isLoading = true;
  surgeryId = '';

  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;
  private resolvedPatientId: string | null = null;

  loggedUser: any = null;
  isResponsible = true;
  accessDenied = false;
  isCancelled = false;

  vitalRecords: VitalRecord[] = [];
  customFields: { key: string; label: string; unit?: string }[] = [];
  agents: Agent[] = [];
  clinicalEvents: ClinicalEvent[] = [];
  fluidBalance: FluidBalance[] = [];
  positionHistory: PositionEntry[] = [];
  oxygenFlows: ResourceFlowEntry[] = [];
  compressedAirFlows: ResourceFlowEntry[] = [];
  infusionPumps: InfusionPumpEntry[] = [];
  posicaoAtual = '';
  readonly posicoesPossiveis = POSICOES_POSSIVEIS;

  isAnesthesiaStarted = false;
  isSurgeryStarted = false;
  isSurgeryFinished = false;
  isAnesthesiaFinished = false;
  startTimeAnesthesia: Date | null = null;
  startTimeSurgery: Date | null = null;
  anesthesiaEndTime: Date | null = null;
  surgeryEndTime: Date | null = null;
  anesthesiaTimer = '00:00:00';
  surgeryTimer = '00:00:00';
  private tickSub?: any;
  private encerramentoTimeout?: any;

  autoMonitoringIntervalMinutes = 5;
  private autoSnapshotSub?: Subscription;

  /** Mantém a tabela de sinais vitais e o gráfico de Pressão & FC rolando juntos
   * na horizontal (mesma linha do tempo), sincronizados por proporção — ver
   * scroll-sync.util.ts. */
  sharedTimelineScrollRatio: number | null = null;
  /** Compartilhado entre a tabela de sinais vitais e o gráfico — os dois precisam
   * esticar na mesma proporção para que as colunas continuem alinhadas. */
  sharedTimelineZoom = 1;

  onTimelineScroll(ratio: number): void {
    this.sharedTimelineScrollRatio = ratio;
  }

  onTimelineZoomChange(zoom: number): void {
    this.sharedTimelineZoom = zoom;
  }

  lastDraftSavedAt: Date | null = null;
  pendingSyncCount = 0;
  isSyncing = false;
  private pendingSub?: Subscription;
  private syncingSub?: Subscription;

  private isVitalModalOpen = false;
  private isAgentModalOpen = false;
  private isEventModalOpen = false;
  private isBalanceModalOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private surgeryService: SurgeryService,
    private preAnesthesicService: PreAnesthesicRecordService,
    private orientationService: OrientationService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private translate: TranslateService,
  ) { }

  get isLocked(): boolean {
    return this.isAnesthesiaFinished || this.isCancelled;
  }

  get canEdit(): boolean {
    return this.isResponsible && !this.isLocked;
  }

  get patientName(): string {
    return this.patient?.fullName || '';
  }

  get patientRecord(): string {
    return this.patient?.medicalRecordNumber || '';
  }

  get patientAge(): string | number {
    return this.patient?.age ?? '';
  }

  /** Máquina de estados visual do card de paciente — o encerramento (cirurgia e
   * anestesia) acontece sempre pela barra inferior, no mesmo fluxo em 2 etapas
   * já usado na tela antiga (1º toque finaliza a cirurgia, 2º finaliza a anestesia). */
  get primaryAction(): PrimaryActionKind {
    if (this.isAnesthesiaFinished) return 'finished';
    if (this.isSurgeryFinished) return 'awaiting-finalize';
    if (this.isSurgeryStarted) return 'surgery-in-progress';
    if (this.isAnesthesiaStarted) return 'start-surgery';
    return 'start-anesthesia';
  }

  async ngOnInit(): Promise<void> {
    // Tela responsiva em portrait e landscape, sem travar orientação.
    this.orientationService.unlock();

    this.loggedUser = this.authService.getUser();
    this.surgeryId = this.route.snapshot.paramMap.get('id') || '';

    const qp = this.route.snapshot.queryParamMap;
    const nav = this.router.getCurrentNavigation()?.extras?.state as any || (history.state ?? {});
    const patientIdFromNav = qp.get('patientId') ?? nav?.patientId ?? null;
    if (patientIdFromNav) {
      this.resolvedPatientId = String(patientIdFromNav);
    }

    this.autoMonitoringIntervalMinutes = await this.resolveAutoMonitoringInterval();
    this.subscribeToAutoSnapshots();

    await this.loadInitialData();
    if (this.accessDenied) return;

    this.startClockTick();
    this.subscribeToPendingSync();
    this.isLoading = false;

    if (this.surgeryId) {
      this.preAnesthesicService.getByAnesthesiaRecordId(Number(this.surgeryId)).subscribe((preData: any) => {
        if (preData?.patientId) {
          this.resolvedPatientId = String(preData.patientId);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.orientationService.unlock();
    clearInterval(this.tickSub);
    clearTimeout(this.encerramentoTimeout);
    this.pendingSub?.unsubscribe();
    this.syncingSub?.unsubscribe();
    this.autoSnapshotSub?.unsubscribe();
  }

  private resolvePatientId(): string | null {
    if (this.selectedSurgery?.patientId) return String(this.selectedSurgery.patientId);
    if (this.patient?.id) return String(this.patient.id);
    if (this.resolvedPatientId) return this.resolvedPatientId;
    try {
      const raw = localStorage.getItem(`preAnesthesiaData_${this.surgeryId}`);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.patientId) return String(parsed.patientId);
    } catch {
      // ignora — segue sem patientId
    }
    return null;
  }

  private async loadInitialData(): Promise<void> {
    try {
      const draft = this.loadMonitoringDraft();
      if (draft) this.hydrateFromDraft(draft);

      const patientId = this.resolvePatientId();
      let surgery: any = null;

      if (patientId) {
        try {
          const res: any = await firstValueFrom(this.surgeryService.getPatientDate(Number(this.surgeryId), patientId));
          surgery = res?.data ?? null;
        } catch (err) {
          console.warn('[Monitorização] Falha ao buscar cirurgia na API. Tentando cache local...', err);
        }
        if (surgery) {
          localStorage.setItem(`surgery_cache_${this.surgeryId}`, JSON.stringify(surgery));
        }
      }

      if (!surgery) {
        const cached = localStorage.getItem(`surgery_cache_${this.surgeryId}`);
        if (cached) surgery = JSON.parse(cached);
      }

      this.selectedSurgery = surgery;
      this.selectedProcedure = surgery?.surgeries?.[0]?.procedures?.find((p: any) => p.isPrimary)
        ?? surgery?.surgeries?.[0]?.procedures?.[0];
      this.patient = surgery?.patient ?? null;

      this.isCancelled = surgery?.status === SurgeryStatusEnum.Cancelada
        || surgery?.patient?.status === SurgeryStatusEnum.Cancelada;
      if (this.isCancelled) {
        this.isSurgeryFinished = true;
        this.isAnesthesiaFinished = true;
        await this.toast(this.translate.instant('monitorizacao.page.alerts.patientCancelled'), 'warning', 3000);
      }

      await this.loadMonitoringRecordFromApi(!!draft);
    } catch (err) {
      console.error('[Monitorização] loadInitialData falhou', err);
    }
  }

  private async loadMonitoringRecordFromApi(hasLocalDraft: boolean): Promise<void> {
    if (!this.surgeryId) return;

    let record: any = null;
    try {
      record = await firstValueFrom(this.anesthesiaRecordService.getMonitoringRecord(Number(this.surgeryId)));
    } catch (err: any) {
      if (err?.status === 403) {
        this.accessDenied = true;
        await this.toast(this.translate.instant('monitorizacao.page.alerts.accessDenied'), 'warning', 3500);
        this.router.navigate(['/pacientes']);
        return;
      }
      console.warn('[Monitorização] Falha ao buscar registro de monitorização na API.', err);
    }
    if (!record) return;

    this.isResponsible = !record.firstAnesthesiologistId
      || String(record.firstAnesthesiologistId) === String(this.loggedUser?.id);

    const isFinished = record.status === SurgeryStatusEnum.Concluido;
    if (isFinished || !hasLocalDraft) {
      const mapped = this.anesthesiaRecordService.mapMonitoringPayloadToApp(record);
      this.hydrateFromDraft(mapped);
    }

    if (isFinished) {
      this.isSurgeryFinished = true;
      this.isAnesthesiaFinished = true;
      this.anesthesiaRecordService.saveFinalizedMonitoringRecord(this.surgeryId, record);
    }
  }

  private hydrateFromDraft(draft: any): void {
    this.vitalRecords = draft.vitalRecords || [];
    this.customFields = draft.customFields || [];
    this.agents = draft.agents || [];
    this.clinicalEvents = draft.events || [];
    this.fluidBalance = draft.fluidBalance || [];
    this.positionHistory = draft.positions || [];
    this.oxygenFlows = draft.oxygenFlows || [];
    this.compressedAirFlows = draft.compressedAirFlows || [];
    this.infusionPumps = draft.infusionPumps || [];
    this.posicaoAtual = this.positionHistory[this.positionHistory.length - 1]?.position || this.posicaoAtual;

    if (Number.isFinite(draft.autoMonitoringIntervalMinutes) && draft.autoMonitoringIntervalMinutes > 0) {
      this.autoMonitoringIntervalMinutes = draft.autoMonitoringIntervalMinutes;
    }

    if (this.isValidTimestamp(draft.anesthesiaStartTime)) {
      this.startTimeAnesthesia = new Date(draft.anesthesiaStartTime);
      this.isAnesthesiaStarted = true;
    }
    if (this.isValidTimestamp(draft.surgeryStartTime)) {
      this.startTimeSurgery = new Date(draft.surgeryStartTime);
      this.isSurgeryStarted = true;
    }
    if (this.isValidTimestamp(draft.surgeryEndTime)) {
      this.surgeryEndTime = new Date(draft.surgeryEndTime);
      this.isSurgeryFinished = true;
    }
    if (this.isValidTimestamp(draft.anesthesiaEndTime)) {
      this.anesthesiaEndTime = new Date(draft.anesthesiaEndTime);
      this.isAnesthesiaFinished = true;
    }

    if (this.isAnesthesiaStarted && !this.isAnesthesiaFinished) {
      this.startAutoMonitoring();
    }
  }

  private isValidTimestamp(value: any): boolean {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time > 0;
  }

  private loadMonitoringDraft(): any | null {
    try {
      const raw = localStorage.getItem(MONITORING_DRAFT_KEY(this.surgeryId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private buildDraftPayload() {
    const sid = Number(this.surgeryId);
    return {
      id: sid, cirurgiaId: sid, surgeryId: sid,
      patientId: this.resolvePatientId(),
      recordedByProfessionalId: this.authService.getCurrentUserId(),
      anesthesiaStartTime: this.startTimeAnesthesia?.toISOString() ?? null,
      surgeryStartTime: this.startTimeSurgery?.toISOString() ?? null,
      surgeryEndTime: this.surgeryEndTime?.toISOString() ?? null,
      anesthesiaEndTime: this.anesthesiaEndTime?.toISOString() ?? null,
      isMonitoringDraft: true,
      finalized: this.isAnesthesiaFinished,
      monitoringUpdatedAt: new Date().toISOString(),
      vitalRecords: this.vitalRecords,
      customFields: this.customFields,
      agents: this.agents,
      events: this.clinicalEvents,
      fluidBalance: this.fluidBalance,
      positions: this.positionHistory,
      oxygenFlows: this.oxygenFlows,
      compressedAirFlows: this.compressedAirFlows,
      infusionPumps: this.infusionPumps,
      posicaoAtual: this.posicaoAtual,
      autoMonitoringIntervalMinutes: this.autoMonitoringIntervalMinutes,
    };
  }

  private persistDraft(): void {
    try {
      localStorage.setItem(MONITORING_DRAFT_KEY(this.surgeryId), JSON.stringify(this.buildDraftPayload()));
      this.lastDraftSavedAt = new Date();
      this.anesthesiaRecordService.updatePendingStatus();
    } catch (err) {
      console.warn('[Monitorização] falha ao persistir rascunho local', err);
    }
  }

  private startClockTick(): void {
    clearInterval(this.tickSub);
    this.tickSub = setInterval(() => {
      this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
      this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.surgeryEndTime);
      if (this.anesthesiaEndTime && this.surgeryEndTime) {
        clearInterval(this.tickSub);
        this.tickSub = undefined;
      }
    }, 1000);
  }

  private formatDuration(start: Date | null, end?: Date | null): string {
    if (!start) return '00:00:00';
    const ref = end || new Date();
    let s = Math.max(0, Math.floor((ref.getTime() - start.getTime()) / 1000));
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private async resolveAutoMonitoringInterval(): Promise<number> {
    const FALLBACK_MINUTES = 5;
    try {
      const settings = await firstValueFrom(this.settingsService.get());
      if (!settings) return FALLBACK_MINUTES;
      if (!settings.useInstitutionalInterval && settings.monitoringIntervalMinutes > 0) {
        return settings.monitoringIntervalMinutes;
      }
      if (settings.institutionalMonitoringIntervalMinutes > 0) return settings.institutionalMonitoringIntervalMinutes;
      if (settings.monitoringIntervalMinutes > 0) return settings.monitoringIntervalMinutes;
      return FALLBACK_MINUTES;
    } catch (err) {
      console.warn('[Monitorização] falha ao carregar configuração de intervalo, usando fallback', err);
      return FALLBACK_MINUTES;
    }
  }


  private startAutoMonitoring(): void {
    if (!this.surgeryId) return;
    this.anesthesiaRecordService.startAutoMonitoring(this.surgeryId, this.autoMonitoringIntervalMinutes);
  }

  private subscribeToAutoSnapshots(): void {
    this.autoSnapshotSub = this.anesthesiaRecordService.autoSnapshotAdded$.subscribe(({ surgeryId, record }) => {
      if (surgeryId !== this.surgeryId) return;
      this.vitalRecords = [...this.vitalRecords, record].sort(this.byTs);
    });
  }

  private subscribeToPendingSync(): void {
    this.pendingSub = this.anesthesiaRecordService.pendingDraftsCount$.subscribe((n) => (this.pendingSyncCount = n));
    this.syncingSub = this.anesthesiaRecordService.syncing$.subscribe((s) => (this.isSyncing = s));
    this.anesthesiaRecordService.updatePendingStatus();
  }

  syncPendingNow(): void {
    this.isSyncing = true;
    const result: any = this.anesthesiaRecordService.syncPendingDrafts();
    if (result?.pipe) {
      result.pipe(finalize(() => (this.isSyncing = false))).subscribe();
    }
  }

  private async blockIfCancelled(): Promise<boolean> {
    if (!this.isCancelled) return false;
    await this.toast(this.translate.instant('monitorizacao.page.alerts.patientCancelled'), 'warning', 2500);
    return true;
  }


  private async ensureSurgeryAssumedIfNeeded(surgery: any, patientId: string): Promise<any | null> {
    const currentDoctorId = this.authService.getCurrentUserId();
    if (!currentDoctorId) return null;

    const noOneResponsible = surgery?.firstAnesthesiologistId == null;
    const isMine = !noOneResponsible && String(surgery.firstAnesthesiologistId) === String(currentDoctorId);
    const isClosed = surgery?.status === SurgeryStatusEnum.Concluido || surgery?.status === SurgeryStatusEnum.Cancelada;
    if (isClosed || !(noOneResponsible || isMine)) return null;

    try {
      const existingMonitoring = await firstValueFrom(this.anesthesiaRecordService.getMonitoringRecord(Number(this.surgeryId)));
      if (existingMonitoring) return null;
    } catch (err) {
      console.warn('[Monitorização] getMonitoringRecord falhou ao checar existência — não vai tentar assumir.', err);
      return null;
    }

    try {
      await firstValueFrom(this.surgeryService.assumePatient(patientId, Number(this.surgeryId), currentDoctorId));
      const refreshed: any = await firstValueFrom(this.surgeryService.getPatientDate(Number(this.surgeryId), patientId));
      const updated = refreshed?.data ?? null;
      if (updated) localStorage.setItem(`surgery_cache_${this.surgeryId}`, JSON.stringify(updated));
      return updated;
    } catch (err) {
      console.warn('[Monitorização] Falha ao assumir a cirurgia automaticamente.', err);
      return null;
    }
  }

  async onPrimaryAction(): Promise<void> {
    if (await this.blockIfCancelled()) return;

    switch (this.primaryAction) {
      case 'start-anesthesia':
        await this.iniciarAnestesia();
        break;
      case 'start-surgery':
        this.iniciarCirurgia();
        break;
      default:
        break;
    }
  }

  private async iniciarAnestesia(): Promise<void> {
    const patientId = this.resolvePatientId();
    if (patientId) {
      const updatedSurgery = await this.ensureSurgeryAssumedIfNeeded(this.selectedSurgery, patientId);
      if (updatedSurgery) this.selectedSurgery = updatedSurgery;
    }

    const now = new Date();
    this.startTimeAnesthesia = now;
    this.isAnesthesiaStarted = true;
    this.startClockTick();

    await this.promptInitialPosition();

    this.startAutoMonitoring();
    this.persistDraft();
  }


  private async promptInitialPosition(): Promise<void> {
    return new Promise((resolve) => {
      this.alertController.create({
        header: this.translate.instant('monitorizacao.page.alerts.initialPositionTitle'),
        subHeader: this.translate.instant('monitorizacao.page.alerts.initialPositionSubtitle'),
        backdropDismiss: false,
        inputs: this.posicoesPossiveis.map((p, i) => ({ type: 'radio', label: p, value: p, checked: i === 0 })),
        buttons: [{
          text: this.translate.instant('monitorizacao.page.actions.confirm'),
          handler: (value: string) => {
            this.registerPositionChange(value || this.posicoesPossiveis[0]);
            resolve();
          },
        }],
      }).then((alert) => alert.present());
    });
  }

  private iniciarCirurgia(): void {
    const now = new Date();
    this.startTimeSurgery = now;
    this.isSurgeryStarted = true;
    this.persistDraft();
  }

  onFrequencyClick(): void {
    if (!this.canEdit) return;
    this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.frequencyTitle'),
      inputs: [
        { name: 'minutes', type: 'number', value: this.autoMonitoringIntervalMinutes, placeholder: this.translate.instant('monitorizacao.page.alerts.minutesPlaceholder'), min: 1, max: 60 },
      ],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: (d) => {
            const minutes = Number(d.minutes);
            if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) return false;
            this.autoMonitoringIntervalMinutes = minutes;
            if (this.isAnesthesiaStarted && !this.isAnesthesiaFinished) {
              this.anesthesiaRecordService.updateAutoMonitoringInterval(this.surgeryId, minutes);
            }
            this.persistDraft();
            return true;
          },
        },
      ],
    }).then((alert) => alert.present());
  }

  async onAddVital(): Promise<void> {
    if (!this.canEdit || this.isVitalModalOpen) return;
    this.isVitalModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: QuickVitalInputComponent,
        cssClass: 'quick-vital-modal',
        backdropDismiss: false,
        componentProps: { customFields: this.customFields, isAuto: false, initialValue: null },
      });
      await modal.present();
      const { data, role } = await modal.onDidDismiss();
      if (role !== 'confirm' || !data) return;
      this.addVitalRecord(data);
      await this.toast(this.translate.instant('monitorizacao.page.toasts.vitalSaved'), 'success');
    } finally {
      this.isVitalModalOpen = false;
    }
  }

  private addVitalRecord(data: Partial<VitalRecord>): void {
    const now = new Date();
    const explicitTimestamp = data.timestamp && new Date(data.timestamp).toISOString();
    // Hora lançada manualmente no modal (não é só o rótulo — precisa refletir no
    // timestamp real, senão o ponto some do lugar certo no gráfico).
    const manualTimestamp = !explicitTimestamp && data.time ? this.replaceTimeInIso(now.toISOString(), data.time) : null;
    const timestamp = explicitTimestamp || manualTimestamp || now.toISOString();
    const record: VitalRecord = {
      ...data,
      clientId: this.newClientId(),
      timestamp,
      time: data.time || this.formatHM(now),
    };
    this.vitalRecords = [...this.vitalRecords, record].sort(this.byTs);
    this.persistDraft();
  }

  async onVitalCellTap(event: { record: VitalRecord; field: VitalCellField }): Promise<void> {
    if (!this.canEdit) return;
    const { record, field } = event;

    if (typeof field !== 'string') {
      // Campo personalizado: sem faixa definida, só validação numérica básica.
      const customField = this.customFields.find((f) => f.key === field.custom);
      const alert = await this.alertController.create({
        header: this.translate.instant('monitorizacao.shell.vitals.editCellTitle', { field: customField?.label || field.custom }),
        inputs: [{ name: 'value', type: 'number', value: record.custom?.[field.custom] ?? null }],
        buttons: [
          { text: this.translate.instant('common.cancel'), role: 'cancel' },
          {
            text: this.translate.instant('common.save'),
            handler: (d) => {
              const value = d.value === '' || d.value === null || d.value === undefined ? undefined : Number(d.value);
              this.updateVitalCustomField(record.clientId, field.custom, Number.isFinite(value) ? value : undefined);
            },
          },
        ],
      });
      await alert.present();
      return;
    }

    const limits = VITAL_CELL_LIMITS[field];
    const fieldLabel = this.translate.instant(`monitorizacao.shell.vitals.rows.${field}`);

    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.shell.vitals.editCellTitle', { field: fieldLabel }),
      subHeader: this.translate.instant('monitorizacao.shell.vitals.rangeHint', limits),
      inputs: [
        { name: 'value', type: 'number', value: record[field] ?? null },
      ],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: async (d) => {
            if (d.value === '' || d.value === null || d.value === undefined) {
              this.updateVitalField(record.clientId, field, undefined);
              return true;
            }
            const value = Number(d.value);
            if (!Number.isFinite(value) || value < limits.min || value > limits.max) {
              await this.toast(this.translate.instant('monitorizacao.shell.vitals.invalidValue', limits), 'warning');
              return false;
            }
            this.updateVitalField(record.clientId, field, value);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async onHydrationCellTap(record: VitalRecord): Promise<void> {
    if (!this.canEdit) return;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.shell.vitals.editHydrationTitle'),
      inputs: [
        { name: 'volumeMl', type: 'number', placeholder: this.translate.instant('monitorizacao.shell.vitals.hydrationVolumePlaceholder') },
      ],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: (d) => {
            const volumeMl = Number(d.volumeMl);
            if (!Number.isFinite(volumeMl) || volumeMl <= 0) return false;
            const entry: FluidBalance = {
              clientId: this.newClientId(),
              timestamp: record.timestamp,
              time: record.time,
              type: 'gain',
              item: this.translate.instant('monitorizacao.shell.vitals.rows.hydration'),
              volumeMl,
              itemId: null,
              detail: null,
              categoryId: null,
              balanceTypeId: null,
            };
            this.fluidBalance = [...this.fluidBalance, entry].sort(this.byTs);
            this.persistDraft();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private updateVitalField(clientId: string | undefined, field: 'temp' | 'spo2' | 'etco2' | 'bis', value: number | undefined): void {
    this.vitalRecords = this.vitalRecords.map((r) => (r.clientId === clientId ? { ...r, [field]: value } : r));
    this.persistDraft();
  }

  private updateVitalCustomField(clientId: string | undefined, key: string, value: number | undefined): void {
    this.vitalRecords = this.vitalRecords.map((r) => {
      if (r.clientId !== clientId) return r;
      const custom = { ...(r.custom || {}) };
      if (value === undefined) delete custom[key];
      else custom[key] = value;
      return { ...r, custom };
    });
    this.persistDraft();
  }

  async onAddCustomField(): Promise<void> {
    if (!this.canEdit) return;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.newCustomFieldTitle'),
      inputs: [
        { name: 'label', type: 'text', placeholder: this.translate.instant('monitorizacao.page.alerts.customFieldLabelPlaceholder') },
        { name: 'unit', type: 'text', placeholder: this.translate.instant('monitorizacao.page.alerts.customFieldUnitPlaceholder') },
      ],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('monitorizacao.page.actions.add'),
          handler: (d) => {
            if (!d.label?.trim()) return false;
            const safeLabel = d.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const key = `custom_${Date.now()}_${safeLabel}`;
            this.customFields = [...this.customFields, { key, label: d.label.trim(), unit: d.unit?.trim() }];
            this.persistDraft();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async onDeleteVitalRecord(record: VitalRecord): Promise<void> {
    if (!this.canEdit) return;
    const ok = await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveVitalAt', { time: record.time }));
    if (!ok) return;
    this.vitalRecords = this.vitalRecords.filter((r) => r.clientId !== record.clientId);
    this.persistDraft();
  }

  async onEditVitalTime(record: VitalRecord): Promise<void> {
    if (!this.canEdit) return;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.editAnesthesiaStartTitle'),
      inputs: [{ name: 'time', type: 'time', value: record.time }],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: (d) => {
            if (!d.time || d.time === record.time) return;
            const oldMinuteEpoch = Math.floor(new Date(record.timestamp).getTime() / 60000);
            const newTimestamp = this.replaceTimeInIso(record.timestamp, d.time);
            const newMinuteEpoch = Math.floor(new Date(newTimestamp).getTime() / 60000);
            const deltaMinutes = newMinuteEpoch - oldMinuteEpoch;
            const updated: VitalRecord = { ...record, timestamp: newTimestamp, time: d.time };
            this.vitalRecords = deltaMinutes !== 0
              ? this.cascadeVitalTimeShift(record.clientId!, updated, deltaMinutes)
              : this.vitalRecords.map((r) => (r.clientId === record.clientId ? updated : r)).sort(this.byTs);
            this.persistDraft();
          },
        },
      ],
    });
    await alert.present();
  }

 
  private cascadeVitalTimeShift(editedClientId: string, updatedRecord: VitalRecord, deltaMinutes: number): VitalRecord[] {
    const deltaMs = deltaMinutes * 60000;
    const originalSorted = [...this.vitalRecords].sort(this.byTs);
    const editedIndex = originalSorted.findIndex((r) => r.clientId === editedClientId);
    if (editedIndex === -1) {
      return this.vitalRecords.map((r) => (r.clientId === editedClientId ? updatedRecord : r)).sort(this.byTs);
    }

    const shiftedByClientId = new Map<string, VitalRecord>();
    shiftedByClientId.set(editedClientId, updatedRecord);

    for (let i = editedIndex + 1; i < originalSorted.length; i++) {
      const entry = originalSorted[i];
      const newDate = new Date(new Date(entry.timestamp).getTime() + deltaMs);
      shiftedByClientId.set(entry.clientId!, { ...entry, timestamp: newDate.toISOString(), time: this.formatHM(newDate) });
    }

    const occupiedMinuteEpochs = new Set<number>();
    shiftedByClientId.forEach((r) => occupiedMinuteEpochs.add(Math.floor(new Date(r.timestamp).getTime() / 60000)));

    const result: VitalRecord[] = [];
    for (const entry of originalSorted) {
      const shifted = shiftedByClientId.get(entry.clientId!);
      if (shifted) {
        result.push(shifted);
        continue;
      }
      const minuteEpoch = Math.floor(new Date(entry.timestamp).getTime() / 60000);
      if (occupiedMinuteEpochs.has(minuteEpoch)) continue;
      result.push(entry);
    }
    return result.sort(this.byTs);
  }

  async onAddAgent(): Promise<void> {
    if (!this.canEdit || this.isAgentModalOpen) return;
    this.isAgentModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'agent' },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const timestamp = data.time ? this.replaceTimeInIso(now.toISOString(), data.time) : now.toISOString();

      if (data.type === 'infusionPump') {
        const pump: InfusionPumpEntry = {
          clientId: this.newClientId(),
          timestamp, time: data.time || this.formatHM(now),
          medicationId: data.medicationId,
          medicationName: data.medicationName,
          rate: data.rate,
          rateUnit: data.rateUnit,
          volumeMl: data.volumeMl,
          endAt: this.computeInfusionEndAt(timestamp, data.rate, data.rateUnit, data.volumeMl),
        };
        this.infusionPumps = [...this.infusionPumps, pump].sort(this.byTs);
        this.persistDraft();
        return;
      }

      const entry: Agent = {
        clientId: this.newClientId(),
        timestamp, time: data.time || this.formatHM(now),
        medicationId: data.medicationId ?? null,
        name: data.name,
        dose: data.dose ?? null,
        route: data.route ?? null,
        doseValue: data.doseValue ?? null,
        unit: data.unit ?? null,
        routeId: data.routeId ?? null,
        isBolus: !!data.isBolus,
      };
      this.agents = [...this.agents, entry].sort(this.byTs);
      this.persistDraft();
    } finally {
      this.isAgentModalOpen = false;
    }
  }


  private computeInfusionEndAt(startIso: string, rate: number, rateUnit: number, volumeMl: number): string {
    const DEFAULT_WINDOW_MS = 2 * 60 * 60 * 1000;
    const MILLILITERS_PER_HOUR = 1;
    const start = new Date(startIso).getTime();
    if (rateUnit === MILLILITERS_PER_HOUR && rate > 0) {
      const durationMs = (volumeMl / rate) * 60 * 60 * 1000;
      return new Date(start + durationMs).toISOString();
    }
    return new Date(start + DEFAULT_WINDOW_MS).toISOString();
  }

  async onEditAgent(a: Agent): Promise<void> {
    if (!this.canEdit || this.isAgentModalOpen) return;
    this.isAgentModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'agent', initial: { ...a, time: a.time } },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data || data.type !== 'agent') return;
      const ts = data.time ? this.replaceTimeInIso(a.timestamp, data.time) : a.timestamp;
      this.agents = this.agents
        .map((x) => (x.clientId === a.clientId ? {
          ...x,
          medicationId: data.medicationId ?? null,
          name: data.name,
          dose: data.dose ?? null,
          doseValue: data.doseValue ?? null,
          unit: data.unit ?? null,
          routeId: data.routeId ?? null,
          route: data.route ?? null,
          isBolus: !!data.isBolus,
          timestamp: ts,
          time: data.time || x.time,
        } : x))
        .sort(this.byTs);
      this.persistDraft();
    } finally {
      this.isAgentModalOpen = false;
    }
  }

  async onDeleteAgent(a: Agent): Promise<void> {
    if (!this.canEdit) return;
    if (!await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveAgent', { name: a.name }))) return;
    this.agents = this.agents.filter((x) => x.clientId !== a.clientId);
    this.persistDraft();
  }

 
  async onAddEvent(): Promise<void> {
    if (!this.canEdit || this.isEventModalOpen) return;
    this.isEventModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'event' },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const timestamp = data.time ? this.replaceTimeInIso(now.toISOString(), data.time) : now.toISOString();
      const entry: ClinicalEvent = {
        clientId: this.newClientId(),
        timestamp, time: data.time || this.formatHM(now),
        type: data.type,
        category: data.category ?? null,
        categoryLabel: data.categoryLabel ?? null,
        itemId: data.itemId ?? null,
        description: data.description ?? data.item ?? '',
        detail: data.detail ?? null,
        eventTypeId: data.eventTypeId ?? null,
        catalogEventId: data.catalogEventId ?? null,
        catalogEventName: data.catalogEventName ?? null,
      };
      this.clinicalEvents = [...this.clinicalEvents, entry].sort(this.byTs);
      this.persistDraft();
    } finally {
      this.isEventModalOpen = false;
    }
  }

  async onEditEvent(e: ClinicalEvent): Promise<void> {
    if (!this.canEdit || this.isEventModalOpen) return;
    this.isEventModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'event', initial: { ...e, time: e.time } },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const ts = data.time ? this.replaceTimeInIso(e.timestamp, data.time) : e.timestamp;
      this.clinicalEvents = this.clinicalEvents
        .map((x) => (x.clientId === e.clientId ? {
          ...x,
          catalogEventId: data.catalogEventId ?? null,
          catalogEventName: data.catalogEventName ?? null,
          categoryLabel: data.categoryLabel ?? x.categoryLabel,
          eventTypeId: data.eventTypeId ?? x.eventTypeId,
          description: data.description ?? '',
          timestamp: ts,
          time: data.time || x.time,
        } : x))
        .sort(this.byTs);
      this.persistDraft();
    } finally {
      this.isEventModalOpen = false;
    }
  }

  async onDeleteEvent(e: ClinicalEvent): Promise<void> {
    if (!this.canEdit) return;
    if (!await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveEvent', { description: e.description || e.type }))) return;
    this.clinicalEvents = this.clinicalEvents.filter((x) => x.clientId !== e.clientId);
    if ((e.type || '').toLowerCase() === 'position') {
      this.positionHistory = this.positionHistory.filter((p) => p.clientId !== e.clientId);
      this.posicaoAtual = this.positionHistory[this.positionHistory.length - 1]?.position || this.posicaoAtual;
    }
    this.persistDraft();
  }

  // ---------------------------------------------------------------------------
  // Balanço hídrico
  // ---------------------------------------------------------------------------

  async onAddBalance(): Promise<void> {
    if (!this.canEdit || this.isBalanceModalOpen) return;
    this.isBalanceModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'balance' },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const timestamp = data.time ? this.replaceTimeInIso(now.toISOString(), data.time) : now.toISOString();
      const entry: FluidBalance = {
        clientId: this.newClientId(),
        timestamp, time: data.time || this.formatHM(now),
        type: data.balanceType,
        item: data.itemLabel || data.label || data.item,
        volumeMl: Number(data.volumeMl),
        itemId: data.itemId ?? null,
        detail: data.detail ?? null,
        categoryId: data.categoryId ?? null,
        balanceTypeId: data.balanceTypeId ?? null,
      };
      this.fluidBalance = [...this.fluidBalance, entry].sort(this.byTs);
      this.persistDraft();
    } finally {
      this.isBalanceModalOpen = false;
    }
  }

  async onEditBalance(b: FluidBalance): Promise<void> {
    if (!this.canEdit || this.isBalanceModalOpen) return;
    this.isBalanceModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'balance', initial: { ...b, time: b.time } },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data || data.type !== 'balance') return;
      const ts = data.time ? this.replaceTimeInIso(b.timestamp, data.time) : b.timestamp;
      this.fluidBalance = this.fluidBalance
        .map((x) => (x.clientId === b.clientId ? {
          ...x,
          type: data.balanceType ?? x.type,
          item: data.itemLabel || data.label || x.item,
          volumeMl: Number(data.volumeMl),
          itemId: data.itemId ?? null,
          detail: data.detail ?? null,
          categoryId: data.categoryId ?? x.categoryId,
          balanceTypeId: data.balanceTypeId ?? x.balanceTypeId,
          timestamp: ts,
          time: data.time || x.time,
        } : x))
        .sort(this.byTs);
      this.persistDraft();
    } finally {
      this.isBalanceModalOpen = false;
    }
  }

  async onDeleteBalance(b: FluidBalance): Promise<void> {
    if (!this.canEdit) return;
    if (!await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveBalance', { item: b.item, volume: b.volumeMl }))) return;
    this.fluidBalance = this.fluidBalance.filter((x) => x.clientId !== b.clientId);
    this.persistDraft();
  }


  async mudarPosicao(): Promise<void> {
    if (!this.canEdit) return;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.quickActions.positionLabel'),
      inputs: this.posicoesPossiveis.map((p, i) => ({
        type: 'radio', label: p, value: p, checked: p === this.posicaoAtual || (!this.posicaoAtual && i === 0),
      })),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('monitorizacao.page.actions.confirm'),
          handler: (pos: string) => {
            if (pos && pos !== this.posicaoAtual) this.registerPositionChange(pos);
          },
        },
      ],
    });
    await alert.present();
  }

  private registerPositionChange(pos: string): void {
    const now = new Date();
    const clientId = this.newClientId();
    const positionId = SURGICAL_POSITION_LABEL_TO_ID[pos.toLowerCase().trim()] ?? null;
    const entry: PositionEntry = {
      clientId, timestamp: now.toISOString(), time: this.formatHM(now), position: pos, positionId,
    };
    this.positionHistory = [...this.positionHistory, entry];
    this.posicaoAtual = pos;

    const eventEntry: ClinicalEvent = {
      clientId, timestamp: entry.timestamp, time: entry.time,
      type: 'position', category: 'position',
      description: `Posição: ${pos}`,
    };
    this.clinicalEvents = [...this.clinicalEvents, eventEntry].sort(this.byTs);
    this.persistDraft();
  }

  /** Alterna ligar/desligar de O2 ou Ar comprimido — `value=false` (isActive)
   * é o sentinela que encerra a barra contínua, sem representar uma medição real. */
  onAddResource(kind: 'o2' | 'air'): void {
    if (!this.canEdit) return;
    const now = new Date();
    const list = kind === 'o2' ? this.oxygenFlows : this.compressedAirFlows;
    const wasActive = list[list.length - 1]?.isActive ?? false;
    const entry: ResourceFlowEntry = {
      clientId: this.newClientId(),
      timestamp: now.toISOString(), time: this.formatHM(now),
      kind, isActive: !wasActive, flowRateLPerMin: null,
    };
    if (kind === 'o2') this.oxygenFlows = [...this.oxygenFlows, entry];
    else this.compressedAirFlows = [...this.compressedAirFlows, entry];
    this.persistDraft();
  }

  async onStopInfusion(pump: InfusionPumpEntry): Promise<void> {
    if (!this.canEdit) return;
    
    const now = new Date();
    const endAtTime = new Date(pump.endAt).getTime();
    if (endAtTime <= now.getTime()) {
      return; 
    }
    
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.stopInfusionTitle') || 'Parar Infusão',
      message: (this.translate.instant('monitorizacao.page.alerts.stopInfusionMessage', { name: pump.medicationName })) || `Deseja parar a infusão de ${pump.medicationName} agora?`,
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        { 
          text: this.translate.instant('monitorizacao.page.actions.stop') || 'Parar', 
          role: 'destructive',
          handler: () => {
             this.infusionPumps = this.infusionPumps.map(p => {
               if (p.clientId === pump.clientId) {
                  return { ...p, endAt: now.toISOString() };
               }
               return p;
             });
             this.persistDraft();
          }
        }
      ]
    });
    await alert.present();
  }

  // ---------------------------------------------------------------------------
  // Histórico (ver/editar/excluir tudo o que já foi lançado)
  // ---------------------------------------------------------------------------

  async openHistory(initialTab: HistoryTab = 'vitals'): Promise<void> {
    let reopenTab: HistoryTab | null = initialTab;
    while (reopenTab) {
      const tab = reopenTab;
      reopenTab = null;

      const modal = await this.modalController.create({
        component: HistoryModalComponent,
        cssClass: 'history-modal',
        componentProps: {
          initialTab: tab,
          vitalRecords: this.vitalRecords,
          agents: this.agents,
          events: this.clinicalEvents,
          balance: this.fluidBalance,
          readonly: !this.canEdit,
        },
      });
      await modal.present();
      const { data, role } = await modal.onDidDismiss<HistoryAction>();
      if (role !== 'action' || !data) return;

      await this.handleHistoryAction(data);
      reopenTab = data.type === 'vital' ? 'vitals'
        : data.type === 'agent' ? 'agents'
          : data.type === 'event' ? 'events'
            : 'balance';
    }
  }

  private async handleHistoryAction(action: HistoryAction): Promise<void> {
    if (action.type === 'vital') {
      if (action.action === 'delete') await this.onDeleteVitalRecord(action.item);
      // Edição de sinais vitais é feita célula a célula na grade principal.
      return;
    }
    if (action.type === 'agent') {
      if (action.action === 'edit') await this.onEditAgent(action.item);
      else await this.onDeleteAgent(action.item);
      return;
    }
    if (action.type === 'event') {
      if (action.action === 'edit') await this.onEditEvent(action.item);
      else await this.onDeleteEvent(action.item);
      return;
    }
    if (action.action === 'edit') await this.onEditBalance(action.item);
    else await this.onDeleteBalance(action.item);
  }

  async onFinalize(): Promise<void> {
    if (!this.canEdit) return;
    if (!this.isSurgeryFinished) {
      await this.encerrarCirurgia();
    } else {
      await this.encerrarAnestesia();
    }
  }

  private async encerrarCirurgia(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.finalizeSurgeryTitle'),
      subHeader: this.translate.instant('monitorizacao.page.alerts.finalizeSurgerySubtitle'),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('monitorizacao.page.actions.finalize'),
          handler: () => {
            this.isSurgeryFinished = true;
            this.surgeryEndTime = new Date();
            if (!this.vitalRecords.length) {
              this.addVitalRecord({ timestamp: this.surgeryEndTime.toISOString(), time: this.formatHM(this.surgeryEndTime) });
            } else {
              this.autoSnapshotFromLast();
            }
            this.persistDraft();
          },
        },
      ],
    });
    await alert.present();
  }

  private async encerrarAnestesia(): Promise<void> {
    const totalLancamentos = this.vitalRecords.length + this.agents.length + this.clinicalEvents.length + this.fluidBalance.length;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.finalizeAnesthesiaTitle'),
      subHeader: this.translate.instant('monitorizacao.page.alerts.finalizeAnesthesiaSubtitle'),
      message:
        `${this.translate.instant('monitorizacao.page.alerts.finalizeAnesthesiaTimeLabel')} ${this.anesthesiaTimer}\n`
        + `${this.translate.instant('monitorizacao.page.alerts.finalizeSurgeryTimeLabel')} ${this.surgeryTimer}\n`
        + `${this.translate.instant('monitorizacao.page.alerts.finalizeRecordsLabel')} ${totalLancamentos}\n`
        + `${this.translate.instant('monitorizacao.page.alerts.finalizePendingSyncLabel')} ${this.pendingSyncCount}\n\n`
        + `${this.translate.instant('monitorizacao.page.alerts.finalizeConfirmQuestion')}`,
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        { text: this.translate.instant('monitorizacao.page.actions.finalize'), role: 'destructive', handler: () => this.executarEncerramento() },
      ],
    });
    await alert.present();
  }

  private autoSnapshotFromLast(): void {
    const last = this.vitalRecords[this.vitalRecords.length - 1];
    if (!last) return;
    const now = new Date();
    const snapshot: VitalRecord = { ...last, clientId: this.newClientId(), timestamp: now.toISOString(), time: this.formatHM(now), isAuto: true };
    this.vitalRecords = [...this.vitalRecords, snapshot].sort(this.byTs);
    this.persistDraft();
  }

  private async executarEncerramento(): Promise<void> {
    const now = new Date();
    this.isAnesthesiaFinished = true;
    this.anesthesiaEndTime = now;

    if (this.surgeryId) this.anesthesiaRecordService.stopAutoMonitoring(this.surgeryId);
    clearInterval(this.tickSub);
    this.tickSub = undefined;
    this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
    this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.anesthesiaEndTime);

    if (this.vitalRecords.length) this.autoSnapshotFromLast();
    this.persistDraft();

    const loading = await this.toastController.create({
      message: this.translate.instant('monitorizacao.page.toasts.sendingFinalRecord'), duration: 0, position: 'top',
    });
    await loading.present();

    const record = this.buildDraftPayload();
    const surgeryIdNum = Number(this.surgeryId);

    try {
      const response: any = await firstValueFrom(this.anesthesiaRecordService.submitMonitoringRecord(record, surgeryIdNum));
      await loading.dismiss();
      localStorage.removeItem(MONITORING_DRAFT_KEY(this.surgeryId));
      localStorage.removeItem(`preAnesthesiaData_${this.surgeryId}`);
      localStorage.removeItem(`${FICHA_ANESTESICA_CACHE_KEY}${this.surgeryId}`);
      localStorage.removeItem(`surgery_cache_${this.surgeryId}`);

      this.anesthesiaRecordService.saveFinalizedMonitoringRecord(this.surgeryId, response?.data ?? response ?? record);
      this.anesthesiaRecordService.updatePendingStatus();

      await this.toast(this.translate.instant('monitorizacao.page.toasts.finalizeSuccess'), 'success', 3000);
    } catch (err: any) {
      console.error('[Encerramento] falha ao enviar, mantendo rascunho local', err);
      await loading.dismiss();
      const isNetworkError = !navigator.onLine || err?.status === 0 || !err?.status;
      if (isNetworkError) {
        await this.toast(this.translate.instant('monitorizacao.page.toasts.offlineSaved'), 'warning', 4000);
      } else {
        const msg = err?.error?.message || err?.message || this.translate.instant('monitorizacao.page.toasts.finalizeErrorGeneric');
        await this.toast(this.translate.instant('monitorizacao.page.toasts.finalizeErrorWrap', { msg }), 'danger', 5000);
      }
    } finally {
      this.encerramentoTimeout = setTimeout(() => this.router.navigate(['/pacientes']), 1500);
    }
  }


  private async toast(message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'primary', duration = 1400): Promise<void> {
    const t = await this.toastController.create({ message, duration, color, position: 'top' });
    await t.present();
  }

  private async confirmDelete(msg: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.alertController.create({
        header: this.translate.instant('monitorizacao.page.alerts.deleteTitle'),
        message: msg,
        buttons: [
          { text: this.translate.instant('common.cancel'), role: 'cancel', handler: () => resolve(false) },
          { text: this.translate.instant('monitorizacao.page.actions.delete'), role: 'destructive', handler: () => resolve(true) },
        ],
      }).then((alert) => alert.present());
    });
  }

  private replaceTimeInIso(originalIso: string, hhmm?: string): string {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return originalIso;
    const d = new Date(originalIso || Date.now());
    const [h, m] = hhmm.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  private newClientId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private formatHM(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  private byTs = (a: { timestamp: string }, b: { timestamp: string }) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

  goToFichaAnestesica(): void {
    const patientId = this.resolvePatientId();
    if (patientId) {
      this.router.navigate(['/ficha-anestesica', this.surgeryId, patientId]);
    } else {
      this.router.navigate(['/pacientes']);
    }
  }


  async openFichaAnestesicaModal(): Promise<void> {
    const data = await this.buildFichaAnestesicaRecordData();
    const modal = await this.modalController.create({
      component: RecordViewerModalComponent,
      componentProps: { data },
      cssClass: 'fa-sheet-modal',
      backdropDismiss: false,
    });
    await modal.present();
  }

  private async buildFichaAnestesicaRecordData(): Promise<RecordData> {
    const sections: RecordData['sections'] = [
      {
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.summarySectionTitle'),
        fields: [
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.anesthesiaTimeLabel'), value: this.anesthesiaTimer },
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.surgeryTimeLabel'), value: this.surgeryTimer },
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.vitalRecordsCountLabel'), value: this.vitalRecords.length },
        ],
      },
      {
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.teamSectionTitle'),
        fields: [
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.surgeonLabel'), value: this.selectedSurgery?.surgeonName || '--' },
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.procedureLabel'), value: this.selectedProcedure?.name || '--' },
        ],
      },
    ];

    const patientId = this.resolvePatientId();
    if (patientId) {
      let record = this.anesthesiaRecordService.getDraft(patientId);
      if (!record) {
        try {
          record = await firstValueFrom(this.anesthesiaRecordService.getLatestByPatient(this.surgeryId, patientId));
        } catch {
          record = null;
        }
      }
      if (record) {
        sections.push(...mapAnesthesiaRecordToRecordData(record));
      }
    }

    if (this.isSurgeryFinished || this.isAnesthesiaFinished) {
      sections.push(...this.buildMonitoringDetailSections());

      const cachedFinalized = this.anesthesiaRecordService.getFinalizedMonitoringRecord(this.surgeryId);
      if (cachedFinalized?.status !== undefined) {
        sections.push({
          title: this.translate.instant('monitorizacao.page.fichaAnestesica.statusSectionTitle'),
          fields: [
            { label: this.translate.instant('monitorizacao.page.fichaAnestesica.statusLabel'), value: SURGERY_STATUS_LABELS[cachedFinalized.status as SurgeryStatusEnum] ?? cachedFinalized.status ?? '--' },
            { label: this.translate.instant('monitorizacao.page.fichaAnestesica.updatedAtLabel'), value: formatDateTimeBR(cachedFinalized.monitoringUpdatedAt) ?? '--' },
          ],
        });
      }
    }

    const data: RecordData = { title: this.translate.instant('monitorizacao.page.fichaAnestesica.title'), sections };

    const cacheKey = `${FICHA_ANESTESICA_CACHE_KEY}${this.surgeryId}`;
    const previousRaw = localStorage.getItem(cacheKey);
    const previous: RecordData | null = previousRaw ? this.safeJsonParseLocal(previousRaw) : null;
    if (!previous || data.sections.length >= previous.sections.length) {
      this.cacheRecordViewerData(data);
      return data;
    }
    return previous;
  }

  private buildMonitoringDetailSections(): RecordSection[] {
    const sections: RecordSection[] = [];

    if (this.agents.length > 0) {
      sections.push({
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.agentsSectionTitle'),
        fields: this.agents.map((a) => ({
          label: a.time || '--',
          value: [
            a.name || (a.medicationId != null ? this.translate.instant('monitorizacao.common.medicationFallback', { id: a.medicationId }) : this.translate.instant('monitorizacao.common.agentFallback')),
            a.dose, a.route,
          ].filter(Boolean).join(' · '),
        })),
      });
    }

    if (this.clinicalEvents.length > 0) {
      sections.push({
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.eventsSectionTitle'),
        fields: this.clinicalEvents.map((e) => {
          const categoria = e.categoryLabel
            || (e.eventTypeId != null ? CLINICAL_EVENT_TYPE_LABELS[e.eventTypeId] : null)
            || e.category
            || e.type;
          return { label: e.time || '--', value: [categoria, e.description].filter(Boolean).join(' — ') };
        }),
      });
    }

    if (this.fluidBalance.length > 0) {
      sections.push({
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.fluidBalanceSectionTitle'),
        fields: this.fluidBalance.map((b) => ({
          label: b.time || '--',
          value: `${b.type === 'gain' ? this.translate.instant('monitorizacao.common.gain') : this.translate.instant('monitorizacao.common.loss')} · ${b.item} · ${b.volumeMl}ml`,
        })),
      });
    }

    return sections;
  }

  private cacheRecordViewerData(data: RecordData): void {
    try {
      localStorage.setItem(`${FICHA_ANESTESICA_CACHE_KEY}${this.surgeryId}`, JSON.stringify(data));
    } catch (err) {
      console.warn('[Monitorização] falha ao cachear resumo da Ficha Anestésica', err);
    }
  }

  private safeJsonParseLocal(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
