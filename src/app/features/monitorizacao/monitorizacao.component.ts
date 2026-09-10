import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ModalController, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { finalize, firstValueFrom, Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { OrientationService } from 'src/app/core/services/orientation.service';
import { SurgeryService } from 'src/app/core/services/surgery.service';
import { PreAnesthesicRecordService } from 'src/app/core/services/pre-anesthesic-record.service';
import { SettingsService } from 'src/app/core/services/settings.service';
import { mapAnesthesiaRecordToRecordData } from 'src/app/shared/models/anesthesia-record.mapper';
import {
  SurgeryStatusEnum,
  SURGERY_STATUS_LABELS,
  MedicationUnitEnum,
  AdministrationRouteEnum,
  ClinicalEventTypeEnum,
  FluidCategoryEnum,
  FluidBalanceTypeEnum,
  SurgicalPositionEnum,
  CLINICAL_EVENT_TYPE_LABELS,
  FLUID_CATEGORY_LABELS,
  SURGICAL_POSITION_LABEL_TO_ID,
} from 'src/app/core/models/api-enums.model';
import { MonitoringPayload } from 'src/app/core/models/monitoring-payload.model';

import { StatusBarComponent } from 'src/app/shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from 'src/app/shared/components/header-institucional/header-institucional.component';
import { ClinicalItemModalComponent } from 'src/app/shared/components/clinical-item-modal/clinical-item-modal.component';
import { QuickVitalInputComponent } from 'src/app/shared/components/quick-vital-input/quick-vital-input.component';

import { VitalSignsChartComponent } from './components/vital-signs-chart/vital-signs-chart.component';
import { AgentsChartComponent } from './components/agents-chart/agents-chart.component';
import { EventsChartComponent } from './components/events-chart/events-chart.component';
import { FluidBalanceChartComponent } from './components/fluid-balance-chart/fluid-balance-chart.component';
import { QuickActionSidebarComponent } from './components/quick-action-sidebar/quick-action-sidebar.component';
import { FinalizeAnesthesiaBarComponent } from './components/finalize-anesthesia-bar/finalize-anesthesia-bar.component';
import { HistoryDrawerComponent, HistoryTab } from './components/history-drawer/history-drawer.component';
import { RecordViewerModalComponent, RecordData, RecordSection } from '../../shared/components/record-viewer-modal/record-viewer-modal.component';
import { formatDateTimeBR } from 'src/app/shared/utils/date-format.util';

interface VitalRecord {
  clientId?: string; timestamp: string; time: string;
  pas?: number; pad?: number; pam?: number;
  fc?: number; spo2?: number; etco2?: number;
  bis?: number; pvc?: number; pcap?: number; temp?: number;
  custom?: { [key: string]: number };
  isAuto?: boolean;
}

interface Agent {
  clientId?: string; timestamp: string; time: string;
  name: string;
  dose?: string | null;
  route?: string | null;
  medicationId?: number | null;
  doseValue?: number | null;
  unit?: MedicationUnitEnum | null;
  routeId?: AdministrationRouteEnum | null;
}
interface ClinicalEvent {
  clientId?: string; timestamp: string; time: string;
  type: string;
  description?: string;
  category?: string | null;
  categoryLabel?: string | null;
  itemId?: number | null;
  detail?: string | null;

  eventTypeId?: ClinicalEventTypeEnum | null;

  catalogEventId?: number | null;
  catalogEventName?: string | null;
}
interface FluidBalance {
  clientId?: string; timestamp: string; time: string;
  type: 'gain' | 'loss'; item: string; volumeMl: number;
  itemId?: number | null;
  detail?: string | null;
  // IDs numéricos exigidos pelo contrato do backend.
  categoryId?: FluidCategoryEnum | null;
  balanceTypeId?: FluidBalanceTypeEnum | null;
}
interface PositionEntry {
  clientId?: string; timestamp: string; time: string; position: string;
  // ID numérico exigido pelo contrato do backend.
  positionId?: SurgicalPositionEnum | null;
}


const MONITORING_DRAFT_KEY = (surgeryId: string) => `draft_monitoring_${surgeryId}`;

@Component({
  selector: 'app-monitorizacao',
  standalone: true,
  templateUrl: './monitorizacao.component.html',
  styleUrls: ['./monitorizacao.component.scss'],
  imports: [
    CommonModule, FormsModule,
    StatusBarComponent, HeaderInstitucionalComponent,
    VitalSignsChartComponent, AgentsChartComponent, EventsChartComponent,
    FluidBalanceChartComponent, QuickActionSidebarComponent,
    FinalizeAnesthesiaBarComponent, HistoryDrawerComponent,
    TranslatePipe,
  ],
})
export class MonitorizacaoComponent implements OnInit, OnDestroy {
  isLoading = true;
  surgeryId!: string;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;

  private monitoringRecordConfirmed = false;

  hoverTime: number | null = null;
  sharedHoverTime: number | null = null;

  isDrawerOpen = false;
  drawerTab: HistoryTab = 'vitals';
  historyDrawerOpen = false;
  historyDrawerTab: HistoryTab = 'vitals';

  patientAge = '';
  patientWeight: string | number = '--';
  patientAsa = '';

  expandedPanel: 'agents' | 'events' | 'balance' | null = null;

  get channelsGridRows(): string {
    const row = (k: 'agents' | 'events' | 'balance') =>
      this.expandedPanel === k ? 'minmax(0, 1fr)' : 'auto';
    const vitals = this.expandedPanel ? 'minmax(220px, 1fr)' : 'minmax(0, 1fr)';
    return `${vitals} ${row('agents')} ${row('events')} ${row('balance')}`;
  }

  togglePanel(key: 'agents' | 'events' | 'balance') {
    this.expandedPanel = this.expandedPanel === key ? null : key;
  }

  vitalRecords: VitalRecord[] = [];
  customFields: { key: string; label: string; unit?: string }[] = [];
  agents: Agent[] = [];
  clinicalEvents: ClinicalEvent[] = [];
  fluidBalance: FluidBalance[] = [];
  positionHistory: PositionEntry[] = [];

  isAnesthesiaStarted = false;
  isSurgeryStarted = false;
  isSurgeryFinished = false;
  isCancelled = false;
  startTimeAnesthesia: Date | null = null;
  startTimeSurgery: Date | null = null;
  anesthesiaStartTime: Date | null = null;
  surgeryStartTime: Date | null = null;
  surgeryEndTime: Date | null = null;
  anesthesiaEndTime: Date | null = null;
  isAnesthesiaFinished = false;
  anesthesiaTimer = '00:00:00';
  surgeryTimer = '00:00:00';
  private tickSub?: any;

  get isLocked(): boolean {
    // "Cirurgia finalizada" não bloqueia lançamentos — só "Anestesia finalizada" bloqueia.
    return this.isAnesthesiaFinished || this.isCancelled;
  }

  loggedUser: any = null;
  isResponsible = true;
  accessDenied = false;

  get canEdit(): boolean {
    return this.isResponsible && !this.isLocked;
  }

  viewStartTime: number | null = null;
  viewEndTime: number | null = null;

  posicaoAtual: string = '';
  posicoesPossiveis: string[] = [
    'Supina', 'Prona', 'Lateral Direita', 'Lateral Esquerda',
    'Litotomia', 'Trendelenburg', 'Trendelenburg Reverso',
    'Sentada', 'Canivete', 'Fowler',
  ];

  autoMonitoringIntervalMinutes = 5;
  private autoSnapshotSub?: Subscription;

  lastDraftSavedAt: Date | null = null;
  pendingSyncCount = 0;
  isSyncing = false;
  private pendingSub?: Subscription;

  private isVitalModalOpen = false;
  private isAgentModalOpen = false;
  private isEventModalOpen = false;
  private isBalanceModalOpen = false;
  private isPositionAlertOpen = false;

  recentActivity: Array<{ time: string; icon: string; label: string; color: string }> = [];

  private offlineQueue: any = null;
  private patientService: any = null;

  private resolvedPatientId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private surgeryService: SurgeryService,
    private preAnesthesicService: PreAnesthesicRecordService,
    private orientationService: OrientationService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) { }

  private encerramentoTimeout?: any;

  async ngOnInit() {
    void this.orientationService.lockLandscape();

    this.loggedUser = this.authService.getUser();
    this.surgeryId = this.route.snapshot.paramMap.get('id') || '';

    const qp = this.route.snapshot.queryParamMap;
    const nav = this.router.getCurrentNavigation()?.extras?.state as any
      || (history.state ?? {});

    this.patientAge = qp.get('age') ?? nav?.age ?? '';
    this.patientWeight = qp.get('weight') ?? nav?.weight ?? '--';
    this.patientAsa = qp.get('asa') ?? nav?.asa ?? '';

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
    this.rebuildRecentActivity();
    this.isLoading = false;

    this.anesthesiaRecordService.updatePendingStatus();

    if (this.surgeryId) {
      this.preAnesthesicService.getByAnesthesiaRecordId(Number(this.surgeryId)).subscribe((preData) => {
        if (preData) {
          localStorage.setItem(`preAnesthesiaData_${this.surgeryId}`, JSON.stringify(preData));
          if (preData.patientId) {
            this.resolvedPatientId = String(preData.patientId);
          }
        }
        this.buildFichaAnestesicaRecordData();
      });
    }
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

  ngOnDestroy() {
    this.isLeavingView = true;

    this.openOverlays.forEach(overlay => overlay.dismiss().catch(() => { }));
    this.openOverlays.clear();

    this.orientationService.unlock();

    clearInterval(this.tickSub);
    clearTimeout(this.encerramentoTimeout);
    this.pendingSub?.unsubscribe();
    this.autoSnapshotSub?.unsubscribe();

    if (this.surgeryId) {
      this.anesthesiaRecordService.clearFinalizedMonitoringRecord(this.surgeryId);
    }
  }

  private async loadInitialData() {
    try {
      const draft = this.loadMonitoringDraft();
      if (draft) this.hydrateFromDraft(draft);

      let surgery: any = null;
      const patientId = this.resolvePatientId();

      if (!patientId) {
        console.warn('[Monitorização] patientId não resolvido — não é possível buscar/assumir a cirurgia na API. Abrindo a tela a partir da listagem de pacientes garante esse dado.');
      }

      if (patientId) {
        try {
          const res: any = await firstValueFrom(this.surgeryService.getPatientDate(Number(this.surgeryId), patientId));
          surgery = res?.data ?? null;
        } catch (err) {
          console.warn('Falha ao buscar cirurgia na API. Tentando carregar cache local...', err);
        }

        if (surgery) {
          localStorage.setItem(`surgery_cache_${this.surgeryId}`, JSON.stringify(surgery));
        }
      }

      if (!surgery) {
        const cached = localStorage.getItem(`surgery_cache_${this.surgeryId}`);
        if (cached) {
          surgery = JSON.parse(cached);
        }
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
        const toast = await this.toastController.create({
          message: this.translate.instant('monitorizacao.page.alerts.patientCancelled'),
          duration: 3000,
          color: 'warning',
          position: 'top',
        });
        await toast.present();
      }

      if (!this.patientAge && this.patient?.age)
        this.patientAge = String(this.patient.age);
      if ((this.patientWeight === '--' || !this.patientWeight) && this.patient?.weightKg)
        this.patientWeight = this.patient.weightKg;
      if (!this.patientAsa) {
        const asaBack = this.selectedSurgery?.asaClassification
          || this.patient?.asa
          || this.selectedSurgery?.asa;
        if (asaBack) this.patientAsa = `ASA ${asaBack}`;
      }

      await this.loadMonitoringRecordFromApi(!!draft);
    } catch (err) {
      console.error('[Monitorização] loadInitialData falhou', err);
    }
  }
 
  private async ensureSurgeryAssumedIfNeeded(surgery: any, patientId: string): Promise<any | null> {
    const currentDoctorId = this.authService.getCurrentUserId();
    if (!currentDoctorId) {
      console.warn('[Monitorização] ensureSurgeryAssumedIfNeeded: currentDoctorId não resolvido, abortando.');
      return null;
    }

    const noOneResponsible = surgery?.firstAnesthesiologistId == null;
    const isMine = !noOneResponsible && String(surgery.firstAnesthesiologistId) === String(currentDoctorId);
    const isClosed = surgery?.status === SurgeryStatusEnum.Concluido || surgery?.status === SurgeryStatusEnum.Cancelada;

    if (isClosed) {
      console.info('[Monitorização] cirurgia já concluída/cancelada — não tenta assumir.', { status: surgery?.status });
      return null;
    }
    if (!(noOneResponsible || isMine)) {
      console.info('[Monitorização] cirurgia responsável por outro médico — não assume automaticamente.', {
        firstAnesthesiologistId: surgery?.firstAnesthesiologistId, currentDoctorId,
      });
      return null;
    }

    try {
      const existingMonitoring = await firstValueFrom(
        this.anesthesiaRecordService.getMonitoringRecord(Number(this.surgeryId))
      );
      if (existingMonitoring) {
        this.monitoringRecordConfirmed = true;
        return null;
      }
      console.info('[Monitorização] MonitoringRecord ainda não existe — vai assumir a cirurgia para criá-lo.');
    } catch (err) {
      
      console.warn('[Monitorização] getMonitoringRecord falhou ao checar existência — não vai tentar assumir.', err);
      return null;
    }

    try {
      await firstValueFrom(this.surgeryService.assumePatient(patientId, Number(this.surgeryId), currentDoctorId));
      const refreshed: any = await firstValueFrom(
        this.surgeryService.getPatientDate(Number(this.surgeryId), patientId)
      );
      const updated = refreshed?.data ?? null;
      if (updated) {
        localStorage.setItem(`surgery_cache_${this.surgeryId}`, JSON.stringify(updated));
      }
      this.monitoringRecordConfirmed = true;
      console.info('[Monitorização] cirurgia assumida automaticamente com sucesso.');
      return updated;
    } catch (err) {
      console.warn('[Monitorização] Falha ao assumir a cirurgia automaticamente.', err);
      return null;
    }
  }

  private async loadMonitoringRecordFromApi(hasLocalDraft: boolean): Promise<void> {
    if (!this.surgeryId) return;

    let record: any = null;
    try {
      record = await firstValueFrom(
        this.anesthesiaRecordService.getMonitoringRecord(Number(this.surgeryId))
      );
    } catch (err: any) {
      if (err?.status === 403) {
        this.accessDenied = true;
        const toast = await this.toastController.create({
          message: this.translate.instant('monitorizacao.page.alerts.accessDenied'),
          duration: 3500,
          color: 'warning',
          position: 'top',
        });
        await toast.present();
        this.router.navigate(['/pacientes']);
        return;
      }
      console.warn('[Monitorização] Falha ao buscar registro de monitorização na API.', err);
    }
    if (!record) 
      return;
    
    this.monitoringRecordConfirmed = true;

    this.isResponsible = !record.firstAnesthesiologistId ||
      String(record.firstAnesthesiologistId) === String(this.loggedUser?.id);

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

  private hydrateFromDraft(draft: any) {
    this.vitalRecords = draft.vitalRecords || [];
    this.customFields = draft.customFields || [];
    this.agents = draft.agents || [];
    this.clinicalEvents = draft.events || [];
    this.fluidBalance = draft.fluidBalance || [];
    this.positionHistory = draft.positions || [];
    this.posicaoAtual = this.positionHistory[this.positionHistory.length - 1]?.position || '';

    if (Number.isFinite(draft.autoMonitoringIntervalMinutes) && draft.autoMonitoringIntervalMinutes > 0) {
      this.autoMonitoringIntervalMinutes = draft.autoMonitoringIntervalMinutes;
    }

    if (this.isValidTimestamp(draft.anesthesiaStartTime)) {
      this.startTimeAnesthesia = new Date(draft.anesthesiaStartTime);
      this.anesthesiaStartTime = this.startTimeAnesthesia;
      this.isAnesthesiaStarted = true;
    }
    if (this.isValidTimestamp(draft.surgeryStartTime)) {
      this.startTimeSurgery = new Date(draft.surgeryStartTime);
      this.surgeryStartTime = this.startTimeSurgery;
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

  private startClockTick() {
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

  private async blockIfCancelled(): Promise<boolean> {
    if (!this.isCancelled) return false;
    const toast = await this.toastController.create({
      message: this.translate.instant('monitorizacao.page.alerts.patientCancelled'),
      duration: 2500,
      color: 'warning',
      position: 'top',
    });
    await toast.present();
    return true;
  }

  async iniciarAnestesia() {
    if (await this.blockIfCancelled()) return;
    if (this.isAnesthesiaStarted) {
      if (this.isAnesthesiaFinished) return;
      const alert = await this.alertController.create({
        header: this.translate.instant('monitorizacao.page.alerts.editAnesthesiaStartTitle'),
        inputs: [
          { name: 'time', type: 'time', value: this.formatHM(this.startTimeAnesthesia as Date) }
        ],
        buttons: [
          { text: this.translate.instant('common.cancel'), role: 'cancel' },
          {
            text: this.translate.instant('common.save'), handler: (d) => {
              if (!d.time) return;
              const oldIso = (this.startTimeAnesthesia as Date).toISOString();
              const iso = this.replaceTimeInIso(oldIso, d.time);
              this.startTimeAnesthesia = new Date(iso);
              this.anesthesiaStartTime = this.startTimeAnesthesia;

              if (this.vitalRecords.length > 0) {
                const first = this.vitalRecords[0];
                const firstTime = new Date(first.timestamp || 0).getTime();
                if (Math.abs(firstTime - new Date(oldIso).getTime()) < 60000) {
                  first.timestamp = iso;
                  first.time = d.time;
                  this.vitalRecords = [...this.vitalRecords]; // trigger change detection
                }
              }
              this.persistDraft();
            }
          }
        ]
      });
      await alert.present();
      return;
    }
   
    const patientId = this.resolvePatientId();
    if (patientId) {
      const updatedSurgery = await this.ensureSurgeryAssumedIfNeeded(this.selectedSurgery, patientId);
      if (updatedSurgery) {
        this.selectedSurgery = updatedSurgery;
      }
    }

    const now = new Date();
    this.startTimeAnesthesia = now;
    this.anesthesiaStartTime = now;
    this.isAnesthesiaStarted = true;

    await this.promptInitialPosition();

    if (!this.vitalRecords.length) {
      this.addVitalRecord({ timestamp: now.toISOString(), time: this.formatHM(now) });
    }

    this.startAutoMonitoring();
    this.persistDraft();
  }

  private async promptInitialPosition(): Promise<void> {
    if (this.isPositionAlertOpen) return;
    this.isPositionAlertOpen = true;
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: this.translate.instant('monitorizacao.page.alerts.initialPositionTitle'),
        subHeader: this.translate.instant('monitorizacao.page.alerts.initialPositionSubtitle'),
        backdropDismiss: false,
        inputs: this.posicoesPossiveis.map((p, i) => ({
          type: 'radio', label: p, value: p, checked: i === 0,
        })),
        buttons: [{
          text: this.translate.instant('monitorizacao.page.actions.confirm'),
          handler: (value: string) => {
            const pos = value || this.posicoesPossiveis[0];
            this.registerPositionChange(pos);
            this.isPositionAlertOpen = false;
            resolve();
          },
        }],
      });
      this.trackOverlay(alert);
      await alert.present();
    });
  }

  async iniciarCirurgia() {
    if (await this.blockIfCancelled())
      return;

    if (!this.isAnesthesiaStarted)
      return;

    if (this.isSurgeryStarted) {
      if (this.isAnesthesiaFinished || this.isSurgeryFinished) return;
      const alert = await this.alertController.create({
        header: this.translate.instant('monitorizacao.page.alerts.editSurgeryStartTitle'),
        inputs: [
          { name: 'time', type: 'time', value: this.formatHM(this.startTimeSurgery as Date) }
        ],
        buttons: [
          { text: this.translate.instant('common.cancel'), role: 'cancel' },
          {
            text: this.translate.instant('common.save'), handler: (d) => {
              if (!d.time) return;
              const oldIso = (this.startTimeSurgery as Date).toISOString();
              const iso = this.replaceTimeInIso(oldIso, d.time);
              this.startTimeSurgery = new Date(iso);
              this.surgeryStartTime = this.startTimeSurgery;

              if (this.vitalRecords.length > 0) {
                const first = this.vitalRecords[0];
                const firstTime = new Date(first.timestamp || 0).getTime();
                if (Math.abs(firstTime - new Date(oldIso).getTime()) < 60000) {
                  first.timestamp = iso;
                  first.time = d.time;
                  this.vitalRecords = [...this.vitalRecords]; // trigger change detection
                }
              }
              this.persistDraft();
            }
          }
        ]
      });
      await alert.present();
      return;
    }
    const now = new Date();
    this.startTimeSurgery = now;
    this.surgeryStartTime = now;
    this.isSurgeryStarted = true;

    if (!this.vitalRecords.length) {
      this.addVitalRecord({ timestamp: now.toISOString(), time: this.formatHM(now) });
    }

    this.persistDraft();
  }

  /**
   * O timer recorrente vive em AnesthesiaRecordService (singleton providedIn:'root'),
   * para sobreviver à navegação para outras telas. Chamada é idempotente por surgeryId.
   */
  private startAutoMonitoring() {
    if (!this.surgeryId) return;
    this.anesthesiaRecordService.startAutoMonitoring(this.surgeryId, this.autoMonitoringIntervalMinutes);
  }

  
  private subscribeToAutoSnapshots() {
    this.autoSnapshotSub = this.anesthesiaRecordService.autoSnapshotAdded$.subscribe(({ surgeryId, record }) => {
      if (surgeryId !== this.surgeryId) return;
      this.vitalRecords = [...this.vitalRecords, record].sort(this.byTs);
      this.rebuildRecentActivity();
      this.cdr.markForCheck();
    });
  }

  
  private async resolveAutoMonitoringInterval(): Promise<number> {
    const FALLBACK_MINUTES = 5;
    try {
      const settings = await firstValueFrom(this.settingsService.get());
      if (!settings) return FALLBACK_MINUTES;
      if (!settings.useInstitutionalInterval && settings.monitoringIntervalMinutes > 0) {
        return settings.monitoringIntervalMinutes;
      }
      if (settings.institutionalMonitoringIntervalMinutes > 0) {
        return settings.institutionalMonitoringIntervalMinutes;
      }
      if (settings.monitoringIntervalMinutes > 0) {
        return settings.monitoringIntervalMinutes;
      }
      return FALLBACK_MINUTES;
    } catch (err) {
      console.warn('[Monitorização] falha ao carregar configuração de intervalo, usando fallback', err);
      return FALLBACK_MINUTES;
    }
  }

  private autoSnapshotFromLast() {
    const last = this.vitalRecords[this.vitalRecords.length - 1];
    if (!last) return;

    const now = new Date();
    const snapshot: VitalRecord = {
      ...last,
      clientId: this.newClientId(),
      timestamp: now.toISOString(),
      time: this.formatHM(now),
      isAuto: true,
    };
    this.vitalRecords = [...this.vitalRecords, snapshot].sort(this.byTs);
    this.offlineQueue?.enqueue?.('vitalRecord', snapshot);
    this.persistDraft();
    this.cdr.markForCheck();
  }

  reconfigurarFrequencia() {
    if (!this.canEdit) return;
    this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.frequencyTitle'),
      inputs: [{
        name: 'minutes', type: 'number', min: 1, max: 60,
        value: this.autoMonitoringIntervalMinutes,
        placeholder: this.translate.instant('monitorizacao.page.alerts.minutesPlaceholder'),
      }],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: (data) => {
            const n = Number(data.minutes);
            if (n >= 1 && n <= 60) {
              this.autoMonitoringIntervalMinutes = n;
              this.persistDraft();
              if (this.isAnesthesiaStarted) this.startAutoMonitoring();
            }
          },
        },
      ],
    }).then(a => a.present());
  }

  async addTimePoint(_auto = false) {
    if (!this.isAnesthesiaStarted || !this.canEdit || this.isVitalModalOpen) return;
    this.isVitalModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: QuickVitalInputComponent,
        cssClass: 'quick-vital-modal',
        backdropDismiss: false,
        componentProps: { customFields: this.customFields, isAuto: false, initialValue: null },
      });
      this.trackOverlay(modal);
      await modal.present();
      const { data, role } = await modal.onDidDismiss();
      if (role !== 'confirm' || !data) return;

      this.addVitalRecord(data);
      await this.toast(this.translate.instant('monitorizacao.page.toasts.vitalSaved'), 'success');
    } finally {
      this.isVitalModalOpen = false;
    }
  }

  addVitalRecord(data: Partial<VitalRecord>) {
    const now = new Date();
    const record: VitalRecord = {
      clientId: this.newClientId(),
      timestamp: (data.timestamp && new Date(data.timestamp).toISOString()) || now.toISOString(),
      time: data.time || this.formatHM(now),
      ...data,
    };
    this.vitalRecords = [...this.vitalRecords, record].sort(this.byTs);
    this.offlineQueue?.enqueue?.('vitalRecord', record);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async addCustomField() {
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
          handler: (data) => {
            if (!data.label?.trim()) return false;
            const safeLabel = data.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            const key = `custom_${Date.now()}_${safeLabel}`;
            this.customFields = [...this.customFields, {
              key, label: data.label.trim(), unit: data.unit?.trim(),
            }];
            this.persistDraft();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  onEditVital(record: VitalRecord) { this.editVitalInline(record); }

  async editVitalInline(record: VitalRecord) {
    if (!this.canEdit) return;
    const modal = await this.modalController.create({
      component: QuickVitalInputComponent,
      cssClass: 'quick-vital-modal',
      backdropDismiss: false,
      componentProps: { customFields: this.customFields, isAuto: false, initialValue: record },
    });
    this.trackOverlay(modal);
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role !== 'confirm' || !data) return;
    const updated: VitalRecord = { ...record, ...data };

    let deltaMinutes = 0;
    if (data.time) {
      const oldMinuteEpoch = Math.floor(new Date(record.timestamp).getTime() / 60000);
      updated.timestamp = this.replaceTimeInIso(record.timestamp, data.time);
      updated.time = data.time;
      const newMinuteEpoch = Math.floor(new Date(updated.timestamp).getTime() / 60000);
      deltaMinutes = newMinuteEpoch - oldMinuteEpoch;
    }

    this.vitalRecords = deltaMinutes !== 0
      ? this.cascadeVitalTimeShift(record.clientId!, updated, deltaMinutes)
      : this.vitalRecords.map(r => r.clientId === record.clientId ? updated : r).sort(this.byTs);

    this.persistDraft();
    this.rebuildRecentActivity();
  }

  private cascadeVitalTimeShift(editedClientId: string, updatedRecord: VitalRecord, deltaMinutes: number): VitalRecord[] {
    const deltaMs = deltaMinutes * 60000;
    const originalSorted = [...this.vitalRecords].sort(this.byTs);
    const editedIndex = originalSorted.findIndex(r => r.clientId === editedClientId);
    if (editedIndex === -1) {
      return this.vitalRecords
        .map(r => r.clientId === editedClientId ? updatedRecord : r)
        .sort(this.byTs);
    }

    const shiftedByClientId = new Map<string, VitalRecord>();
    shiftedByClientId.set(editedClientId, updatedRecord);

    for (let i = editedIndex + 1; i < originalSorted.length; i++) {
      const entry = originalSorted[i];
      const newDate = new Date(new Date(entry.timestamp).getTime() + deltaMs);
      shiftedByClientId.set(entry.clientId!, {
        ...entry,
        timestamp: newDate.toISOString(),
        time: this.formatHM(newDate),
      });
    }

    const occupiedMinuteEpochs = new Set<number>();
    shiftedByClientId.forEach(r => occupiedMinuteEpochs.add(Math.floor(new Date(r.timestamp).getTime() / 60000)));

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

  async onDeleteVital(record: VitalRecord) {
    if (!this.canEdit) return;
    const ok = await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveVitalAt', { time: record.time }));
    if (!ok) return;
    this.vitalRecords = this.vitalRecords.filter(r => r.clientId !== record.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }



  private async buildFichaAnestesicaRecordData(): Promise<RecordData> {
    const sections: RecordData['sections'] = [
      {
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.summarySectionTitle'),
        fields: [
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.anesthesiaTimeLabel'), value: this.anesthesiaTimer },
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.surgeryTimeLabel'), value: this.surgeryTimer },
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.vitalRecordsCountLabel'), value: this.vitalRecords.length }
        ]
      },
      {
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.teamSectionTitle'),
        fields: [
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.surgeonLabel'), value: this.selectedSurgery?.surgeonName || '--' },
          { label: this.translate.instant('monitorizacao.page.fichaAnestesica.procedureLabel'), value: this.selectedProcedure?.name || '--' }
        ]
      }
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
          ]
        });
      }
    }

    const data: RecordData = { title: this.translate.instant('monitorizacao.page.fichaAnestesica.title'), sections };

    const cacheKey = `${this.FICHA_ANESTESICA_CACHE_KEY}${this.surgeryId}`;
    const previousRaw = localStorage.getItem(cacheKey);
    const previous: RecordData | null = previousRaw ? this.safeJsonParseLocal(previousRaw) : null;
    if (!previous || data.sections.length >= previous.sections.length) {
      this.cacheRecordViewerData(this.FICHA_ANESTESICA_CACHE_KEY, data);
      return data;
    }
    return previous;
  }

  private safeJsonParseLocal(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private buildMonitoringDetailSections(): RecordSection[] {
    const sections: RecordSection[] = [];

    if (this.agents.length > 0) {
      sections.push({
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.agentsSectionTitle'),
        fields: this.agents.map(a => ({
          label: a.time || '--',
          value: [a.name || (a.medicationId != null ? this.translate.instant('monitorizacao.common.medicationFallback', { id: a.medicationId }) : this.translate.instant('monitorizacao.common.agentFallback')), a.dose, a.route].filter(Boolean).join(' · '),
        })),
      });
    }

    if (this.clinicalEvents.length > 0) {
      sections.push({
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.eventsSectionTitle'),
        fields: this.clinicalEvents.map(e => {
          const categoria = (e as any).categoryLabel
            || (e.eventTypeId != null ? CLINICAL_EVENT_TYPE_LABELS[e.eventTypeId] : null)
            || e.category
            || e.type;
          return {
            label: e.time || '--',
            value: [categoria, e.description].filter(Boolean).join(' — '),
          };
        }),
      });
    }

    if (this.fluidBalance.length > 0) {
      sections.push({
        title: this.translate.instant('monitorizacao.page.fichaAnestesica.fluidBalanceSectionTitle'),
        fields: this.fluidBalance.map(b => ({
          label: b.time || '--',
          value: `${b.type === 'gain' ? this.translate.instant('monitorizacao.common.gain') : this.translate.instant('monitorizacao.common.loss')} · ${b.item} · ${b.volumeMl}ml`,
        })),
      });
    }

    return sections;
  }

  private openOverlays = new Set<HTMLIonModalElement | HTMLIonAlertElement>();

  private trackOverlay<T extends HTMLIonModalElement | HTMLIonAlertElement>(overlay: T): T {
    this.openOverlays.add(overlay);
    overlay.onDidDismiss().then(() => {
      this.openOverlays.delete(overlay);
    });
    return overlay;
  }

  async openFichaAnestesicaModal() {
    const data = await this.buildFichaAnestesicaRecordData();

    const modal = await this.modalController.create({
      component: RecordViewerModalComponent,
      componentProps: { data },
      cssClass: 'fa-sheet-modal',
      backdropDismiss: false,
    });
    this.trackOverlay(modal);
    await modal.present();
  }

  private readonly FICHA_ANESTESICA_CACHE_KEY = 'cache_ficha_anestesica_';

  private cacheRecordViewerData(prefix: string, data: RecordData): void {
    try {
      localStorage.setItem(`${prefix}${this.surgeryId}`, JSON.stringify(data));
    } catch (err) {
      console.warn('[Monitorização] falha ao cachear dados da ficha', err);
    }
  }



  async onEditAgent(a: Agent) {
    if (!this.canEdit) return;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.editAgentTitle'),
      inputs: [
        { name: 'time', type: 'time', value: a.time, placeholder: 'HH:mm' },
        { name: 'name', type: 'text', value: a.name, placeholder: this.translate.instant('monitorizacao.page.alerts.editAgentNamePlaceholder') },
        { name: 'dose', type: 'text', value: a.dose || '', placeholder: this.translate.instant('monitorizacao.page.alerts.editAgentDosePlaceholder') },
        { name: 'route', type: 'text', value: a.route || '', placeholder: this.translate.instant('monitorizacao.page.alerts.editAgentRoutePlaceholder') },
      ],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: (d) => {
            const ts = this.replaceTimeInIso(a.timestamp, d.time);
            this.agents = this.agents.map(x => x.clientId === a.clientId
              ? { ...x, ...d, timestamp: ts, time: d.time || x.time }
              : x).sort(this.byTs);
            this.persistDraft();
            this.rebuildRecentActivity();
          },
        },
      ],
    });
    await alert.present();
  }
  async onDeleteAgent(a: Agent) {
    if (!this.canEdit) return;
    if (!await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveAgent', { name: a.name }))) return;
    this.agents = this.agents.filter(x => x.clientId !== a.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onEditEvent(e: ClinicalEvent) {
    if (!this.canEdit || this.isEventModalOpen) return;
    this.isEventModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'event', initial: { ...e, time: e.time } },
        cssClass: 'clinical-item-modal',
      });
      this.trackOverlay(modal);
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;

      const ts = data.time ? this.replaceTimeInIso(e.timestamp, data.time) : e.timestamp;
      this.clinicalEvents = this.clinicalEvents.map(x => x.clientId === e.clientId
        ? {
          ...x,
          catalogEventId: data.catalogEventId ?? null,
          catalogEventName: data.catalogEventName ?? null,
          categoryLabel: data.categoryLabel ?? x.categoryLabel,
          eventTypeId: data.eventTypeId ?? x.eventTypeId,
          description: data.description ?? '',
          timestamp: ts,
          time: data.time || x.time,
        }
        : x).sort(this.byTs);
      this.persistDraft();
      this.rebuildRecentActivity();
    } finally {
      this.isEventModalOpen = false;
    }
  }

  async onDeleteEvent(e: ClinicalEvent) {
    if (!this.canEdit) return;
    if (!await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveEvent', { description: e.description || e.type }))) return;
    this.clinicalEvents = this.clinicalEvents.filter(x => x.clientId !== e.clientId);
    if ((e.type || '').toLowerCase() === 'position') {
      this.positionHistory = this.positionHistory.filter(p => p.clientId !== e.clientId);
      this.posicaoAtual = this.positionHistory[this.positionHistory.length - 1]?.position || this.posicaoAtual;
    }
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onEditBalance(b: FluidBalance) {
    if (!this.canEdit) return;
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.editBalanceTitle'),
      inputs: [
        { name: 'time', type: 'time', value: b.time, placeholder: 'HH:mm' },
        { name: 'item', type: 'text', value: b.item, placeholder: this.translate.instant('monitorizacao.page.alerts.editBalanceItemPlaceholder') },
        { name: 'volumeMl', type: 'number', value: String(b.volumeMl), placeholder: this.translate.instant('monitorizacao.page.alerts.editBalanceVolumePlaceholder') },
      ],
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('common.save'),
          handler: (d) => {
            const ts = this.replaceTimeInIso(b.timestamp, d.time);
            this.fluidBalance = this.fluidBalance.map(x => x.clientId === b.clientId
              ? { ...x, item: d.item, volumeMl: Number(d.volumeMl) || 0, timestamp: ts, time: d.time || x.time }
              : x).sort(this.byTs);
            this.persistDraft();
            this.rebuildRecentActivity();
          },
        },
      ],
    });
    await alert.present();
  }
  async onDeleteBalance(b: FluidBalance) {
    if (!this.canEdit) return;
    if (!await this.confirmDelete(this.translate.instant('monitorizacao.page.alerts.confirmRemoveBalance', { item: b.item, volume: b.volumeMl }))) return;
    this.fluidBalance = this.fluidBalance.filter(x => x.clientId !== b.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }


  async openAgentModal() {
    if (!this.canEdit || this.isAgentModalOpen) return;
    this.isAgentModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'agent', mode: 'agent' },
        cssClass: 'clinical-item-modal',
      });
      this.trackOverlay(modal);
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const entry: Agent = {
        clientId: this.newClientId(),
        timestamp: now.toISOString(), time: this.formatHM(now),
        medicationId: data.medicationId ?? null,
        name: data.name,
        dose: data.dose ?? null,
        route: data.route ?? null,
        doseValue: data.doseValue ?? null,
        unit: data.unit ?? null,
        routeId: data.routeId ?? null,
      };
      this.agents = [...this.agents, entry].sort(this.byTs);
      this.offlineQueue?.enqueue?.('agent', entry);
      this.persistDraft();
      this.rebuildRecentActivity();
    } finally {
      this.isAgentModalOpen = false;
    }
  }

  async openEventModal() {
    if (!this.canEdit || this.isEventModalOpen) return;
    this.isEventModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'event', mode: 'event' },
        cssClass: 'clinical-item-modal',
      });
      this.trackOverlay(modal);
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const entry: ClinicalEvent = {
        clientId: this.newClientId(),
        timestamp: now.toISOString(), time: this.formatHM(now),
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
      this.offlineQueue?.enqueue?.('event', entry);


      if ((entry.category || '').toLowerCase() === 'position' && entry.description) {
        const pos = entry.description.replace(/^Posição:\s*/i, '').trim();
        if (pos) {
          this.positionHistory = [...this.positionHistory, {
            clientId: entry.clientId, timestamp: entry.timestamp, time: entry.time, position: pos,
          }];
          this.posicaoAtual = pos;
        }
      }

      this.persistDraft();
      this.rebuildRecentActivity();
    } finally {
      this.isEventModalOpen = false;
    }
  }

  openDrawer(tab: HistoryTab = 'vitals') {
    this.drawerTab = tab;
    this.historyDrawerTab = tab;
    this.isDrawerOpen = true;
    this.historyDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.historyDrawerOpen = false;
  }

  async openVitalModal() {
    if (!this.canEdit || this.isVitalModalOpen) return;
    this.isVitalModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: QuickVitalInputComponent,
        cssClass: 'quick-vital-modal',
        backdropDismiss: false,
        componentProps: { customFields: this.customFields, isAuto: false, initialValue: null },
      });
      this.trackOverlay(modal);
      await modal.present();
      const { data, role } = await modal.onDidDismiss();
      if (role !== 'confirm' || !data) return;
      this.addVitalRecord(data);
    } finally {
      this.isVitalModalOpen = false;
    }
  }

  async openCustomFieldModal() {
    return this.addCustomField();
  }

  async openBalanceModal() {
    if (!this.canEdit || this.isBalanceModalOpen) return;
    this.isBalanceModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'balance', mode: 'balance' },
        cssClass: 'clinical-item-modal',
      });
      this.trackOverlay(modal);
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const entry: FluidBalance = {
        clientId: this.newClientId(),
        timestamp: now.toISOString(), time: this.formatHM(now),
        type: data.balanceType,
        item: data.itemLabel || data.label || data.item,
        volumeMl: Number(data.volumeMl),
        itemId: data.itemId ?? null,
        detail: data.detail ?? null,
        categoryId: data.categoryId ?? null,
        balanceTypeId: data.balanceTypeId ?? null,
      };
      this.fluidBalance = [...this.fluidBalance, entry].sort(this.byTs);
      this.offlineQueue?.enqueue?.('fluidBalance', entry);
      this.persistDraft();
      this.rebuildRecentActivity();
    } finally {
      this.isBalanceModalOpen = false;
    }
  }

  mudarPosicao(pos: string) {
    if (!this.canEdit || !pos || pos === this.posicaoAtual) return;
    this.registerPositionChange(pos);
  }

  private registerPositionChange(pos: string) {
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

    this.offlineQueue?.enqueue?.('position', entry);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  onSharedHover(ts: number | null) {
    this.sharedHoverTime = ts;
    this.hoverTime = ts;
  }

  private isLeavingView = false;

  ionViewWillLeave(): void {
    this.isLeavingView = true;   
    this.orientationService.unlock();
  }

  onViewBoundsChange(bounds: { min: number, max: number }) {
    if (this.isLeavingView) return;
    this.viewStartTime = bounds.min;
    this.viewEndTime = bounds.max;
    this.cdr.detectChanges();
  }

  private isPanning = false;
  private lastPanX = 0;

  onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // Apenas clique esquerdo ou toque
    this.isPanning = true;
    this.lastPanX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  onPointerMove(e: PointerEvent, chartRef: any) {
    if (!this.isPanning || !chartRef) return;
    const deltaX = e.clientX - this.lastPanX;
    this.lastPanX = e.clientX;
    if (deltaX !== 0) {
      chartRef.panChart(deltaX);
    }
  }

  onPointerUp(e: PointerEvent) {
    this.isPanning = false;
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  openHistoryDrawer(tab: HistoryTab = 'vitals') {
    this.historyDrawerTab = tab;
    this.drawerTab = tab;
    this.historyDrawerOpen = true;
    this.isDrawerOpen = true;
  }

  private rebuildRecentActivity() {
    const merged: any[] = [
      ...this.agents.map(a => ({
        time: a.time, icon: '💊',
        label: a.name || (a.medicationId != null ? this.translate.instant('monitorizacao.common.medicationFallback', { id: a.medicationId }) : this.translate.instant('monitorizacao.common.agentFallback')),
        color: '#8b5cf6',
        ts: new Date(a.timestamp || 0).getTime(),
      })),
      ...this.clinicalEvents.map(e => {
        const eventTypeLabel = e.eventTypeId != null ? CLINICAL_EVENT_TYPE_LABELS[e.eventTypeId] : null;
        return {
          time: e.time,
          icon: (e.type || '').toLowerCase() === 'position' ? '🧍' : '🔔',
          label: e.description || eventTypeLabel || e.type || this.translate.instant('monitorizacao.common.eventFallback'),
          color: (e.type || '').toLowerCase() === 'position' ? '#16a34a' : '#f97316',
          ts: new Date(e.timestamp || 0).getTime(),
        };
      }),
      ...this.fluidBalance.map(b => {

        const otherLabel = this.translate.instant('monitorizacao.common.otherItem');
        const categoryLabel = b.categoryId != null ? FLUID_CATEGORY_LABELS[b.categoryId] : null;
        let displayName = b.item || categoryLabel || otherLabel;
        if (displayName === otherLabel && b.detail) {
          displayName = b.detail;
        } else if (b.detail) {
          displayName = `${displayName} (${b.detail})`;
        }

        return {
          time: b.time,
          icon: b.type === 'gain' ? '💧' : '🩸',
          label: `${displayName} ${b.volumeMl}ml`,
          color: b.type === 'gain' ? '#22c55e' : '#dc2626',
          ts: new Date(b.timestamp || 0).getTime(),
        };
      }),
    ];
    this.recentActivity = merged.sort((a, b) => b.ts - a.ts).slice(0, 3);
    this.cdr.markForCheck();
  }

  /** Voltar da Monitorização deve sempre levar para a Ficha Anestésica, independente da origem da navegação. */
  goToFichaAnestesica(): void {
    const patientId = this.resolvePatientId();
    if (patientId) {
      this.router.navigate(['/ficha-anestesica', this.surgeryId, patientId]);
    } else {
      this.router.navigate(['/pacientes']);
    }
  }

  private buildDraftPayload() {
    const sid = Number(this.surgeryId);
    return {
      id: sid, cirurgiaId: sid, surgeryId: sid,
      // Necessários para a sincronização retomar/criar o MonitoringRecord no backend caso o
      // início da anestesia tenha acontecido sem conexão (ver ensureMonitoringRecordAssumed$
      // em AnesthesiaRecordService).
      patientId: this.resolvePatientId(),
      recordedByProfessionalId: this.authService.getCurrentUserId(),
      anesthesiaStartTime: this.anesthesiaStartTime?.toISOString?.() ?? null,
      surgeryStartTime: this.surgeryStartTime?.toISOString?.() ?? null,
      surgeryEndTime: this.surgeryEndTime?.toISOString?.() ?? null,
      anesthesiaEndTime: this.anesthesiaEndTime?.toISOString?.() ?? null,
      isMonitoringDraft: true,
      finalized: this.isAnesthesiaFinished,
      monitoringUpdatedAt: new Date().toISOString(),
      vitalRecords: this.vitalRecords,
      customFields: this.customFields,
      agents: this.agents,
      events: this.clinicalEvents,
      fluidBalance: this.fluidBalance,
      positions: this.positionHistory,
      posicaoAtual: this.posicaoAtual,
      autoMonitoringIntervalMinutes: this.autoMonitoringIntervalMinutes,
    };
  }

  private persistDraft() {
    try {
      const draft: any = this.buildDraftPayload();
      
      const existingRaw = localStorage.getItem(MONITORING_DRAFT_KEY(this.surgeryId));
      if (existingRaw) {
        try {
          if (JSON.parse(existingRaw)?._assumedConfirmed) {
            this.monitoringRecordConfirmed = true;
          }
        } catch {
          // rascunho anterior corrompido — ignora e segue com o estado atual do componente
        }
      }
      draft._assumedConfirmed = this.monitoringRecordConfirmed;

      localStorage.setItem(MONITORING_DRAFT_KEY(this.surgeryId), JSON.stringify(draft));
      this.lastDraftSavedAt = new Date();

      this.anesthesiaRecordService.updatePendingStatus();
    } catch (err) {
      console.warn('[Monitorização] falha ao gravar rascunho local', err);
    }
  }

  private loadMonitoringDraft(): any | null {
    try {
      const raw = localStorage.getItem(MONITORING_DRAFT_KEY(this.surgeryId));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private subscribeToPendingSync() {
    const subj = (this.anesthesiaRecordService as any).pendingDraftsCountSubject;
    if (subj?.subscribe) {
      this.pendingSub = subj.subscribe((n: number) => (this.pendingSyncCount = n));
    }
  }

  syncPendingNow() {
    this.isSyncing = true;
    const svc: any = this.anesthesiaRecordService;
    const result = svc.syncPendingDrafts?.();
    if (result?.pipe) {
      result.pipe(finalize(() => (this.isSyncing = false))).subscribe();
    } else {
      Promise.resolve(result).finally(() => (this.isSyncing = false));
    }
  }

  async clickFinalize() {
    if (!this.canEdit) return;
    if (!this.isSurgeryFinished) {
      this.encerrarCirurgia();
    } else {
      this.encerrarAnestesia();
    }
  }

  async encerrarCirurgia() {
    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.finalizeSurgeryTitle'),
      subHeader: this.translate.instant('monitorizacao.page.alerts.finalizeSurgerySubtitle'),
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        {
          text: this.translate.instant('monitorizacao.page.actions.finalize'), handler: () => {
            this.isSurgeryFinished = true;
            this.surgeryEndTime = new Date();

            if (!this.vitalRecords.length) {
              this.addVitalRecord({ timestamp: this.surgeryEndTime.toISOString(), time: this.formatHM(this.surgeryEndTime) });
            } else {
              this.autoSnapshotFromLast();
            }

            this.persistDraft();
            // Verificar se faz sentido enviar um patch pra API pra registrar o fim da cirurgia
          }
        },
      ],
    });
    await alert.present();
  }

  async encerrarAnestesia() {
    const totalLancamentos =
      this.vitalRecords.length +
      this.agents.length +
      this.clinicalEvents.length +
      this.fluidBalance.length;

    const alert = await this.alertController.create({
      header: this.translate.instant('monitorizacao.page.alerts.finalizeAnesthesiaTitle'),
      subHeader: this.translate.instant('monitorizacao.page.alerts.finalizeAnesthesiaSubtitle'),
      message:
        `${this.translate.instant('monitorizacao.page.alerts.finalizeAnesthesiaTimeLabel')} ${this.anesthesiaTimer}\n` +
        `${this.translate.instant('monitorizacao.page.alerts.finalizeSurgeryTimeLabel')} ${this.surgeryTimer}\n` +
        `${this.translate.instant('monitorizacao.page.alerts.finalizeRecordsLabel')} ${totalLancamentos}\n` +
        `${this.translate.instant('monitorizacao.page.alerts.finalizePendingSyncLabel')} ${this.pendingSyncCount}\n\n` +
        `${this.translate.instant('monitorizacao.page.alerts.finalizeConfirmQuestion')}`,
      buttons: [
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
        { text: this.translate.instant('monitorizacao.page.actions.finalize'), role: 'destructive', handler: () => this.executarEncerramento() },
      ],
    });

    await alert.present();
  }

  private async executarEncerramento() {
    const now = new Date();
    this.isAnesthesiaFinished = true;
    this.anesthesiaEndTime = now;

    if (this.surgeryId) this.anesthesiaRecordService.stopAutoMonitoring(this.surgeryId);
    clearInterval(this.tickSub);
    this.tickSub = undefined;

    this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
    this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.anesthesiaEndTime);

    if (this.vitalRecords.length) {
      this.autoSnapshotFromLast();
    }

    this.persistDraft();

    const loading = await this.toastController.create({
      message: this.translate.instant('monitorizacao.page.toasts.sendingFinalRecord'), duration: 0, position: 'top',
    });
    await loading.present();

    const record = this.buildDraftPayload();
    const surgeryIdNum = Number(this.surgeryId);

    try {

      const response: any = await this.anesthesiaRecordService.submitMonitoringRecord(record, surgeryIdNum).toPromise();
      await loading.dismiss();
      localStorage.removeItem(MONITORING_DRAFT_KEY(this.surgeryId));
      localStorage.removeItem(`preAnesthesiaData_${this.surgeryId}`);
      localStorage.removeItem(`${this.FICHA_ANESTESICA_CACHE_KEY}${this.surgeryId}`);
      localStorage.removeItem(`surgery_cache_${this.surgeryId}`);

      this.anesthesiaRecordService.saveFinalizedMonitoringRecord(
        this.surgeryId,
        response?.data ?? response ?? record,
      );

      this.anesthesiaRecordService.updatePendingStatus();

      await this.toast(this.translate.instant('monitorizacao.page.toasts.finalizeSuccess'), 'success', 3000);
    } catch (err: any) {
      console.error('[Encerramento] falha ao enviar, mantendo rascunho local', err);
      await loading.dismiss();

      const isNetworkError = !navigator.onLine || err?.status === 0 || !err?.status;
      if (isNetworkError) {
        await this.toast(this.translate.instant('monitorizacao.page.toasts.offlineSaved'),
          'warning', 4000);
      } else {
        const msg = err?.error?.message || err?.message || this.translate.instant('monitorizacao.page.toasts.finalizeErrorGeneric');
        await this.toast(this.translate.instant('monitorizacao.page.toasts.finalizeErrorWrap', { msg }),
          'danger', 5000);
      }
    } finally {
      this.encerramentoTimeout = setTimeout(() => this.router.navigate(['/pacientes']), 1500);
    }
  }

  private async toast(message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'primary', duration = 1400) {
    const t = await this.toastController.create({ message, duration, color, position: 'top' });
    await t.present();
  }

  private async confirmDelete(msg: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: this.translate.instant('monitorizacao.page.alerts.deleteTitle'), message: msg,
        buttons: [
          { text: this.translate.instant('common.cancel'), role: 'cancel', handler: () => resolve(false) },
          { text: this.translate.instant('monitorizacao.page.actions.delete'), role: 'destructive', handler: () => resolve(true) },
        ],
      });
      await alert.present();
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
}
