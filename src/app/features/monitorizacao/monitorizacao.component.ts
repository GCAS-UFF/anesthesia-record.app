import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ModalController, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { finalize, Subscription } from 'rxjs';

import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { SurgeryService } from 'src/app/core/services/surgery.service';

import { StatusBarComponent } from 'src/app/shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from 'src/app/shared/components/header-institucional/header-institucional.component';
import { PatientInfoCardComponent } from 'src/app/shared/components/patient-info-card/patient-info-card.component';
import { ClinicalItemModalComponent } from 'src/app/shared/components/clinical-item-modal/clinical-item-modal.component';
import { QuickVitalInputComponent } from 'src/app/shared/components/quick-vital-input/quick-vital-input.component';

import { VitalSignsChartComponent } from './components/vital-signs-chart/vital-signs-chart.component';
import { AgentsChartComponent } from './components/agents-chart/agents-chart.component';
import { EventsChartComponent } from './components/events-chart/events-chart.component';
import { FluidBalanceChartComponent } from './components/fluid-balance-chart/fluid-balance-chart.component';
import { QuickActionSidebarComponent } from './components/quick-action-sidebar/quick-action-sidebar.component';
import { FinalizeAnesthesiaBarComponent } from './components/finalize-anesthesia-bar/finalize-anesthesia-bar.component';
import { HistoryDrawerComponent, HistoryTab } from './components/history-drawer/history-drawer.component';

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
  presentation?: string | null;
  medicationId?: number | null;
}
interface ClinicalEvent {
  clientId?: string; timestamp: string; time: string;
  type: string;
  description?: string;
  category?: string | null;
  itemId?: number | null;
  detail?: string | null;
}
interface FluidBalance {
  clientId?: string; timestamp: string; time: string;
  type: 'gain' | 'loss'; item: string; volumeMl: number;
  itemId?: number | null;
  detail?: string | null;
}
interface PositionEntry {
  clientId?: string; timestamp: string; time: string; position: string;
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
  startTimeAnesthesia: Date | null = null;
  startTimeSurgery: Date | null = null;
  anesthesiaStartTime: Date | null = null;
  surgeryStartTime: Date | null = null;
  surgeryEndTime: Date | null = null;
  anesthesiaEndTime: Date | null = null;
  anesthesiaTimer = '00:00:00';
  surgeryTimer = '00:00:00';
  private tickSub?: any;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalController: ModalController,
    private alertController: AlertController,
    private toastController: ToastController,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private surgeryService: SurgeryService,
    private cdr: ChangeDetectorRef,
  ) { }


  async ngOnInit() {
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
  }

  ngOnDestroy() {
    clearInterval(this.tickSub);
    clearInterval(this.autoMonitoringSub);
    this.pendingSub?.unsubscribe();
  }

  private async loadInitialData() {
    try {
      const draft = this.loadMonitoringDraft();
      if (draft) this.hydrateFromDraft(draft);

      const svc: any = this.surgeryService;
      const surgery = await (svc.getById?.(this.surgeryId)?.toPromise?.()
        ?? svc.getSurgery?.(this.surgeryId)?.toPromise?.()
        ?? svc.get?.(this.surgeryId)?.toPromise?.()
        ?? Promise.resolve(null));
      this.selectedSurgery = surgery;
      this.selectedProcedure = surgery?.procedures?.find((p: any) => p.isPrimary) || surgery?.procedures?.[0];
      this.patient = surgery?.patient
        ?? (this.patientService?.getById?.(surgery?.patientId)?.toPromise?.() ?? null);

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
    } catch (err) {
      console.error('[Monitorização] loadInitialData falhou', err);
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
      this.isSurgeryFinished = true;
    }

    if (this.isAnesthesiaStarted && !this.isSurgeryFinished) {
      this.startAutoMonitoring();
    }
  }

  private startClockTick() {
    if (this.isSurgeryFinished) {
      this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
      this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.surgeryEndTime);
      return;
    }
    this.tickSub = setInterval(() => {
      this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
      this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.surgeryEndTime);
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

  async iniciarAnestesia() {
    if (this.isAnesthesiaStarted) return;
    const now = new Date();
    this.startTimeAnesthesia = now;
    this.anesthesiaStartTime = now;
    this.isAnesthesiaStarted = true;

    await this.promptInitialPosition();

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
      await alert.present();
    });
  }

  iniciarCirurgia() {
    if (!this.isAnesthesiaStarted || this.isSurgeryStarted) return;
    const now = new Date();
    this.startTimeSurgery = now;
    this.surgeryStartTime = now;
    this.isSurgeryStarted = true;
    this.persistDraft();
  }

  private startAutoMonitoring() {
    clearInterval(this.autoMonitoringSub);
    const ms = Math.max(1, this.autoMonitoringIntervalMinutes) * 60 * 1000;
    this.autoMonitoringSub = setInterval(() => {
      if (this.isSurgeryFinished) return;
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
    if (!this.isAnesthesiaStarted || this.isSurgeryFinished || this.isVitalModalOpen) return;
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
            const key = data.label.trim().toLowerCase().replace(/\s+/g, '_');
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
    const modal = await this.modalController.create({
      component: QuickVitalInputComponent,
      cssClass: 'quick-vital-modal',
      backdropDismiss: false,
      componentProps: { customFields: this.customFields, isAuto: false, initialValue: record },
    });
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
    const ok = await this.confirmDelete(`Remover lançamento das ${record.time}?`);
    if (!ok) return;
    this.vitalRecords = this.vitalRecords.filter(r => r.clientId !== record.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onEditAgent(a: Agent) {
    const alert = await this.alertController.create({
      header: 'Editar agente',
      inputs: [
        { name: 'time', type: 'time', value: a.time, placeholder: 'HH:mm' },
        { name: 'name', type: 'text', value: a.name, placeholder: 'Nome' },
        { name: 'dose', type: 'text', value: a.dose || '', placeholder: 'Dose' },
        { name: 'route', type: 'text', value: a.route || '', placeholder: 'Via' },
        { name: 'presentation', type: 'text', value: a.presentation || '', placeholder: 'Apresentação' },
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
    if (!await this.confirmDelete(`Remover ${a.name}?`)) return;
    this.agents = this.agents.filter(x => x.clientId !== a.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }

  async onEditEvent(e: ClinicalEvent) {
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
    if (!await this.confirmDelete(`Remover ${b.item} (${b.volumeMl}ml)?`)) return;
    this.fluidBalance = this.fluidBalance.filter(x => x.clientId !== b.clientId);
    this.persistDraft();
    this.rebuildRecentActivity();
  }


  async openAgentModal() {
    if (this.isAgentModalOpen) return;
    this.isAgentModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'agent', mode: 'agent' },
        cssClass: 'clinical-item-modal',
      });
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
        presentation: data.presentation ?? null,
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
    if (this.isEventModalOpen) return;
    this.isEventModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'event', mode: 'event' },
        cssClass: 'clinical-item-modal',
      });
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
    if (this.isVitalModalOpen) return;
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
    } finally {
      this.isVitalModalOpen = false;
    }
  }

  async openCustomFieldModal() {
    return this.addCustomField();
  }

  async openBalanceModal() {
    if (this.isBalanceModalOpen) return;
    this.isBalanceModalOpen = true;
    try {
      const modal = await this.modalController.create({
        component: ClinicalItemModalComponent,
        componentProps: { type: 'balance', mode: 'balance' },
        cssClass: 'clinical-item-modal',
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      const now = new Date();
      const entry: FluidBalance = {
        clientId: this.newClientId(),
        timestamp: now.toISOString(), time: this.formatHM(now),
        type: data.type,
        item: data.item,
        volumeMl: Number(data.volumeMl),
        itemId: data.itemId ?? null,
        detail: data.detail ?? null,
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
    if (!pos || pos === this.posicaoAtual) return;
    this.registerPositionChange(pos);
  }

  private registerPositionChange(pos: string) {
    const now = new Date();
    const clientId = this.newClientId();
    const entry: PositionEntry = {
      clientId, timestamp: now.toISOString(), time: this.formatHM(now), position: pos,
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

  openHistoryDrawer(tab: HistoryTab = 'vitals') {
    this.historyDrawerTab = tab;
    this.drawerTab = tab;
    this.historyDrawerOpen = true;
    this.isDrawerOpen = true;
  }

  private rebuildRecentActivity() {
    const merged: any[] = [
      ...this.agents.map(a => ({
        time: a.time, icon: '💊', label: a.name, color: '#8b5cf6',
        ts: new Date(a.timestamp || 0).getTime(),
      })),
      ...this.clinicalEvents.map(e => ({
        time: e.time,
        icon: (e.type || '').toLowerCase() === 'position' ? '🧍' : '🔔',
        label: e.description || e.type,
        color: (e.type || '').toLowerCase() === 'position' ? '#16a34a' : '#f97316',
        ts: new Date(e.timestamp || 0).getTime(),
      })),
      ...this.fluidBalance.map(b => ({
        time: b.time,
        icon: b.type === 'gain' ? '💧' : '🩸',
        label: `${b.item} ${b.volumeMl}ml`,
        color: b.type === 'gain' ? '#22c55e' : '#dc2626',
        ts: new Date(b.timestamp || 0).getTime(),
      })),
    ];
    this.recentActivity = merged.sort((a, b) => b.ts - a.ts).slice(0, 3);
    this.cdr.markForCheck();
  }

  async openAnestesicaRecord() {
    console.warn('[Monitorização] PreAnestesicaViewerComponent não importado — ajuste o path.');
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
    this.isSurgeryFinished = true;
    this.surgeryEndTime = this.surgeryEndTime || now;
    this.anesthesiaEndTime = now;

    clearInterval(this.autoMonitoringSub);
    clearInterval(this.tickSub);
    this.tickSub = undefined;

    this.anesthesiaTimer = this.formatDuration(this.startTimeAnesthesia, this.anesthesiaEndTime);
    this.surgeryTimer = this.formatDuration(this.startTimeSurgery, this.surgeryEndTime);

    this.persistDraft();

    const loading = await this.toastController.create({
      message: 'Enviando registro final…', duration: 0, position: 'top',
    });
    await loading.present();

    const record = this.buildDraftPayload();

    try {
      await this.anesthesiaRecordService.saveRecord(record).toPromise();
      await loading.dismiss();
      localStorage.removeItem(MONITORING_DRAFT_KEY(this.surgeryId));
      await this.toast('✅ Anestesia encerrada e enviada com sucesso.', 'success', 3000);
    } catch (err) {
      console.error('[Encerramento] falha ao enviar, mantendo rascunho local', err);
      await loading.dismiss();
      await this.toast('⚠️ Sem conexão. Registro salvo localmente e será enviado automaticamente.',
        'warning', 4000);
    } finally {
      setTimeout(() => this.router.navigate(['/patient-list']), 1500);
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
