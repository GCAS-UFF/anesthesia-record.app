import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ModalController, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { finalize, firstValueFrom, Subscription } from 'rxjs';

import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { OrientationService } from 'src/app/core/services/orientation.service';
import { SurgeryService } from 'src/app/core/services/surgery.service';
import { PreAnesthesicRecordService } from 'src/app/core/services/pre-anesthesic-record.service';
import { mapPreAnesthesiaToRecordData } from 'src/app/shared/models/pre-anesthesic.mapper';
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
  // Campos numéricos exigidos pelo contrato do backend (ver api-enums.model.ts).
  doseValue?: number | null;
  unit?: MedicationUnitEnum | null;
  routeId?: AdministrationRouteEnum | null;
}
interface ClinicalEvent {
  clientId?: string; timestamp: string; time: string;
  type: string;
  description?: string;
  category?: string | null;
  itemId?: number | null;
  detail?: string | null;
  // ID numérico exigido pelo contrato do backend.
  eventTypeId?: ClinicalEventTypeEnum | null;
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
  ],
})
export class MonitorizacaoComponent implements OnInit, OnDestroy {
  isLoading = true;
  surgeryId!: string;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;

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
    return this.isAnesthesiaFinished || this.isSurgeryFinished || this.isCancelled;
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
  private autoMonitoringSub?: any;

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
    private cdr: ChangeDetectorRef,
  ) { }

  private encerramentoTimeout?: any;

  async ngOnInit() {
    void this.orientationService.lockLandscape();

    this.surgeryId = this.route.snapshot.paramMap.get('id') || '';

    const qp = this.route.snapshot.queryParamMap;
    const nav = this.router.getCurrentNavigation()?.extras?.state as any
      || (history.state ?? {});

    this.patientAge = qp.get('age') ?? nav?.age ?? '';
    this.patientWeight = qp.get('weight') ?? nav?.weight ?? '--';
    this.patientAsa = qp.get('asa') ?? nav?.asa ?? '';

    await this.loadInitialData();
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

    this.openOverlays.forEach(overlay => overlay.dismiss().catch(() => {}));
    this.openOverlays.clear();

    this.orientationService.unlock();

    clearInterval(this.tickSub);
    clearInterval(this.autoMonitoringSub);
    clearTimeout(this.encerramentoTimeout);
    this.pendingSub?.unsubscribe();

    if (this.surgeryId) {
      this.anesthesiaRecordService.clearFinalizedMonitoringRecord(this.surgeryId);
    }
  }

  private async loadInitialData() {
    try {
      const draft = this.loadMonitoringDraft();
      if (draft) this.hydrateFromDraft(draft);

      const svc: any = this.surgeryService;
      let surgery = null;
      try {
        surgery = await (svc.getById?.(this.surgeryId)?.toPromise?.()
          ?? svc.getSurgery?.(this.surgeryId)?.toPromise?.()
          ?? svc.get?.(this.surgeryId)?.toPromise?.()
          ?? Promise.resolve(null));
        if (surgery) {
          localStorage.setItem(`surgery_cache_${this.surgeryId}`, JSON.stringify(surgery));
        }
      } catch (err) {
        console.warn('Falha ao buscar cirurgia na API. Tentando carregar cache local...');
      }

      if (!surgery) {
        const cached = localStorage.getItem(`surgery_cache_${this.surgeryId}`);
        if (cached) {
          surgery = JSON.parse(cached);
        }
      }

      this.selectedSurgery = surgery;
      this.selectedProcedure = surgery?.procedures?.find((p: any) => p.isPrimary) || surgery?.procedures?.[0];
      this.patient = surgery?.patient
        ?? (this.patientService?.getById?.(surgery?.patientId)?.toPromise?.() ?? null);

      this.isCancelled = surgery?.status === SurgeryStatusEnum.Cancelada
        || surgery?.patient?.status === SurgeryStatusEnum.Cancelada;
      if (this.isCancelled) {       
        this.isSurgeryFinished = true;
        this.isAnesthesiaFinished = true;
        const toast = await this.toastController.create({
          message: 'Este paciente está cancelado. Não é possível iniciar ou alterar a cirurgia.',
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

  private async loadMonitoringRecordFromApi(hasLocalDraft: boolean): Promise<void> {
    if (!this.surgeryId) return;

    let record: any = null;
    try {
      record = await firstValueFrom(
        this.anesthesiaRecordService.getMonitoringRecord(Number(this.surgeryId))
      );
    } catch (err) {
      console.warn('[Monitorização] Falha ao buscar registro de monitorização na API.', err);
    }
    if (!record) return;

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

    if (draft.anesthesiaStartTime) {
      this.startTimeAnesthesia = new Date(draft.anesthesiaStartTime);
      this.anesthesiaStartTime = this.startTimeAnesthesia;
      this.isAnesthesiaStarted = true;
    }
    if (draft.surgeryStartTime) {
      this.startTimeSurgery = new Date(draft.surgeryStartTime);
      this.surgeryStartTime = this.startTimeSurgery;
      this.isSurgeryStarted = true;
    }
    if (draft.surgeryEndTime) {
      this.surgeryEndTime = new Date(draft.surgeryEndTime);
      this.isSurgeryFinished = true;
    }
    if (draft.anesthesiaEndTime) {
      this.anesthesiaEndTime = new Date(draft.anesthesiaEndTime);
      this.isAnesthesiaFinished = true;
    }

    if (this.isAnesthesiaStarted && !this.isAnesthesiaFinished) {
      this.startAutoMonitoring();
    }
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
      message: 'Este paciente está cancelado. Não é possível iniciar ou alterar a cirurgia.',
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
        header: 'Editar Início Anestesia',
        inputs: [
          { name: 'time', type: 'time', value: this.formatHM(this.startTimeAnesthesia as Date) }
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Salvar', handler: (d) => {
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
        header: 'Posição inicial do paciente',
        subHeader: 'Selecione a posição em que a monitorização foi iniciada',
        backdropDismiss: false,
        inputs: this.posicoesPossiveis.map((p, i) => ({
          type: 'radio', label: p, value: p, checked: i === 0,
        })),
        buttons: [{
          text: 'Confirmar',
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
        header: 'Editar Início Cirurgia',
        inputs: [
          { name: 'time', type: 'time', value: this.formatHM(this.startTimeSurgery as Date) }
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Salvar', handler: (d) => {
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

  private startAutoMonitoring() {
    clearInterval(this.autoMonitoringSub);
    const ms = Math.max(1, this.autoMonitoringIntervalMinutes) * 60 * 1000;
    this.autoMonitoringSub = setInterval(() => {
      if (this.isAnesthesiaFinished) return;
      this.autoSnapshotFromLast();
    }, ms);
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
    if (this.isLocked) return;
    this.alertController.create({
      header: 'Frequência de monitorização',
      inputs: [{
        name: 'minutes', type: 'number', min: 1, max: 60,
        value: this.autoMonitoringIntervalMinutes,
        placeholder: 'Minutos',
      }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            const n = Number(data.minutes);
            if (n >= 1 && n <= 60) {
              this.autoMonitoringIntervalMinutes = n;
              if (this.isAnesthesiaStarted) this.startAutoMonitoring();
            }
          },
        },
      ],
    }).then(a => a.present());
  }

  async addTimePoint(_auto = false) {
    if (!this.isAnesthesiaStarted || this.isLocked || this.isVitalModalOpen) return;
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
      await this.toast('Sinais vitais salvos no rascunho local.', 'success');
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
    if (this.isLocked) return;
    const alert = await this.alertController.create({
      header: 'Novo campo personalizado',
      inputs: [
        { name: 'label', type: 'text', placeholder: 'Ex: Glicemia' },
        { name: 'unit', type: 'text', placeholder: 'Ex: mg/dL' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Adicionar',
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
    if (this.isLocked) return;
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
    if (data.timestamp) {
      updated.timestamp = new Date(data.timestamp).toISOString();
      updated.time = this.formatHM(new Date(updated.timestamp));
    }
    this.vitalRecords = this.vitalRecords
      .map(r => r.clientId === record.clientId ? updated : r)
      .sort(this.byTs);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onDeleteVital(record: VitalRecord) {
    if (this.isLocked) return;
    const ok = await this.confirmDelete(`Remover lançamento das ${record.time}?`);
    if (!ok) return;
    this.vitalRecords = this.vitalRecords.filter(r => r.clientId !== record.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }


 
  private async buildFichaAnestesicaRecordData(): Promise<RecordData> {
    const sections: RecordData['sections'] = [
      {
        title: 'Resumo da Monitorização',
        fields: [
          { label: 'Tempo de Anestesia', value: this.anesthesiaTimer },
          { label: 'Tempo de Cirurgia', value: this.surgeryTimer },
          { label: 'Sinais Vitais Registrados', value: this.vitalRecords.length }
        ]
      },
      {
        title: 'Equipe e Sala',
        fields: [
          { label: 'Cirurgião', value: this.selectedSurgery?.surgeonName || '--' },
          { label: 'Procedimento', value: this.selectedProcedure?.name || '--' }
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
          title: 'Status',
          fields: [
            { label: 'Status', value: SURGERY_STATUS_LABELS[cachedFinalized.status as SurgeryStatusEnum] ?? cachedFinalized.status ?? '--' },
            { label: 'Atualizado em', value: formatDateTimeBR(cachedFinalized.monitoringUpdatedAt) ?? '--' },
          ]
        });
      }
    }

    const data: RecordData = { title: 'Ficha Anestésica', sections };

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
        title: 'Agentes Administrados',
        fields: this.agents.map(a => ({
          label: a.time || '--',
          value: [a.name || (a.medicationId != null ? `Medicação #${a.medicationId}` : 'Agente'), a.dose, a.route].filter(Boolean).join(' · '),
        })),
      });
    }

    if (this.clinicalEvents.length > 0) {
      sections.push({
        title: 'Eventos Clínicos',
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
        title: 'Balanço Hídrico',
        fields: this.fluidBalance.map(b => ({
          label: b.time || '--',
          value: `${b.type === 'gain' ? 'Ganho' : 'Perda'} · ${b.item} · ${b.volumeMl}ml`,
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
    if (this.isLocked) return;
    const alert = await this.alertController.create({
      header: 'Editar agente',
      inputs: [
        { name: 'time', type: 'time', value: a.time, placeholder: 'HH:mm' },
        { name: 'name', type: 'text', value: a.name, placeholder: 'Nome' },
        { name: 'dose', type: 'text', value: a.dose || '', placeholder: 'Dose' },
        { name: 'route', type: 'text', value: a.route || '', placeholder: 'Via' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
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
    if (this.isLocked) return;
    if (!await this.confirmDelete(`Remover ${a.name}?`)) return;
    this.agents = this.agents.filter(x => x.clientId !== a.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onEditEvent(e: ClinicalEvent) {
    if (this.isLocked) return;
    const alert = await this.alertController.create({
      header: 'Editar evento',
      inputs: [
        { name: 'time', type: 'time', value: e.time, placeholder: 'HH:mm' },
        { name: 'type', type: 'text', value: e.type, placeholder: 'Tipo' },
        { name: 'description', type: 'textarea', value: e.description || '', placeholder: 'Descrição' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (d) => {
            const ts = this.replaceTimeInIso(e.timestamp, d.time);
            this.clinicalEvents = this.clinicalEvents.map(x => x.clientId === e.clientId
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

  async onDeleteEvent(e: ClinicalEvent) {
    if (this.isLocked) return;
    if (!await this.confirmDelete(`Remover evento "${e.description || e.type}"?`)) return;
    this.clinicalEvents = this.clinicalEvents.filter(x => x.clientId !== e.clientId);
    if ((e.type || '').toLowerCase() === 'position') {
      this.positionHistory = this.positionHistory.filter(p => p.clientId !== e.clientId);
      this.posicaoAtual = this.positionHistory[this.positionHistory.length - 1]?.position || this.posicaoAtual;
    }
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onEditBalance(b: FluidBalance) {
    if (this.isLocked) return;
    const alert = await this.alertController.create({
      header: 'Editar balanço',
      inputs: [
        { name: 'time', type: 'time', value: b.time, placeholder: 'HH:mm' },
        { name: 'item', type: 'text', value: b.item, placeholder: 'Item' },
        { name: 'volumeMl', type: 'number', value: String(b.volumeMl), placeholder: 'Volume (ml)' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
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
    if (this.isLocked) return;
    if (!await this.confirmDelete(`Remover ${b.item} (${b.volumeMl}ml)?`)) return;
    this.fluidBalance = this.fluidBalance.filter(x => x.clientId !== b.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }


  async openAgentModal() {
    if (this.isLocked || this.isAgentModalOpen) return;
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
    if (this.isLocked || this.isEventModalOpen) return;
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
        itemId: data.itemId ?? null,
        description: data.description ?? data.item ?? '',
        detail: data.detail ?? null,
        eventTypeId: data.eventTypeId ?? null,
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
    if (this.isLocked || this.isVitalModalOpen) return;
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
    if (this.isLocked || this.isBalanceModalOpen) return;
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
    if (this.isLocked || !pos || pos === this.posicaoAtual) return;
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
        label: a.name || (a.medicationId != null ? `Medicação #${a.medicationId}` : 'Agente'),
        color: '#8b5cf6',
        ts: new Date(a.timestamp || 0).getTime(),
      })),
      ...this.clinicalEvents.map(e => {
        const eventTypeLabel = e.eventTypeId != null ? CLINICAL_EVENT_TYPE_LABELS[e.eventTypeId] : null;
        return {
          time: e.time,
          icon: (e.type || '').toLowerCase() === 'position' ? '🧍' : '🔔',
          label: e.description || eventTypeLabel || e.type || 'Evento',
          color: (e.type || '').toLowerCase() === 'position' ? '#16a34a' : '#f97316',
          ts: new Date(e.timestamp || 0).getTime(),
        };
      }),
      ...this.fluidBalance.map(b => {

        const categoryLabel = b.categoryId != null ? FLUID_CATEGORY_LABELS[b.categoryId] : null;
        let displayName = b.item || categoryLabel || 'Outro';
        if (displayName === 'Outro' && b.detail) {
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

  async openAnestesicaRecord() {
    const patientId = this.resolvePatientId() ?? '';
    const payload = this.preAnesthesicService.getBestAvailable(Number(this.surgeryId), patientId);
    if (!payload) {
      this.toast('Ficha Pré-Anestésica não encontrada (ou offline).', 'warning');
      return;
    }

    try {
      const data: RecordData = mapPreAnesthesiaToRecordData(payload);

      const modal = await this.modalController.create({
        component: RecordViewerModalComponent,
        componentProps: { data },
        cssClass: 'fa-sheet-modal',
        backdropDismiss: false,
      });
      this.trackOverlay(modal);
      await modal.present();
    } catch (e) {
      console.error('Erro ao abrir Ficha Pré-Anestésica', e);
      this.toast('Erro ao abrir Ficha Pré-Anestésica', 'danger');
    }
  }

  private buildDraftPayload() {
    const sid = Number(this.surgeryId);
    return {
      id: sid, cirurgiaId: sid, surgeryId: sid,
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
    };
  }

  private persistDraft() {
    try {
      const draft = this.buildDraftPayload();
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
    if (this.isLocked) return;
    if (!this.isSurgeryFinished) {
      this.encerrarCirurgia();
    } else {
      this.encerrarAnestesia();
    }
  }

  async encerrarCirurgia() {
    const alert = await this.alertController.create({
      header: 'Finalizar Cirurgia',
      subHeader: 'Deseja marcar o fim da cirurgia?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Finalizar', handler: () => {
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
      header: 'Finalizar Anestesia',
      subHeader: 'Esta ação encerrará toda a monitorização.',
      message:
        `Tempo de anestesia: ${this.anesthesiaTimer}\n` +
        `Tempo de cirurgia: ${this.surgeryTimer}\n` +
        `Registros lançados: ${totalLancamentos}\n` +
        `Pendentes de sincronização: ${this.pendingSyncCount}\n\n` +
        `Deseja confirmar o encerramento?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Finalizar', role: 'destructive', handler: () => this.executarEncerramento() },
      ],
    });

    await alert.present();
  }

  private async executarEncerramento() {
    const now = new Date();
    this.isAnesthesiaFinished = true;
    this.anesthesiaEndTime = now;

    clearInterval(this.autoMonitoringSub);
    clearInterval(this.tickSub);
    this.tickSub = undefined;

    this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
    this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.anesthesiaEndTime);

    if (this.vitalRecords.length) {
      this.autoSnapshotFromLast();
    }

    this.persistDraft();

    const loading = await this.toastController.create({
      message: 'Enviando registro final…', duration: 0, position: 'top',
    });
    await loading.present();

    const record = this.buildDraftPayload();
    const surgeryIdNum = Number(this.surgeryId);

    try {

      const response: any = await this.anesthesiaRecordService.submitMonitoringRecord(record, surgeryIdNum).toPromise();
      await loading.dismiss();
      localStorage.removeItem(MONITORING_DRAFT_KEY(this.surgeryId));
      localStorage.removeItem(`preAnesthesiaData_${this.surgeryId}`);


      this.anesthesiaRecordService.saveFinalizedMonitoringRecord(
        this.surgeryId,
        response?.data ?? response ?? record,
      );

      this.anesthesiaRecordService.updatePendingStatus();

      await this.toast('✅ Anestesia encerrada e enviada com sucesso.', 'success', 3000);
    } catch (err) {
      console.error('[Encerramento] falha ao enviar, mantendo rascunho local', err);
      await loading.dismiss();

      await this.toast('⚠️ Sem conexão. Registro salvo localmente e será enviado automaticamente.',
        'warning', 4000);
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
        header: 'Excluir', message: msg,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: 'Excluir', role: 'destructive', handler: () => resolve(true) },
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
