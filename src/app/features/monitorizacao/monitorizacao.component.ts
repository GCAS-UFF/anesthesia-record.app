import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, ActionSheetController, ModalController, ToastController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, 
  documentTextOutline, 
  settingsOutline, 
  pulseOutline, 
  warningOutline, 
  listOutline, 
  addOutline, 
  trashOutline, 
  medkitOutline, 
  cutOutline, 
  flaskOutline, 
  bookmarkOutline, 
  waterOutline, 
  checkmarkDoneCircleOutline,
  checkmarkDoneOutline,
  statsChartOutline, 
  playOutline, 
  stopOutline, 
  saveOutline, 
  closeOutline, 
  createOutline, 
  triangle,
  refreshOutline,
  timeOutline
} from 'ionicons/icons';

// Shared Components
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { PatientInfoCardComponent } from '../../shared/components/patient-info-card/patient-info-card.component';
import { QuickVitalInputComponent } from '../../shared/components/quick-vital-input/quick-vital-input.component';
import { ClinicalItemModalComponent } from '../../shared/components/clinical-item-modal/clinical-item-modal.component';
import { MonitoringRecord } from 'src/app/core/models/monitoring-record.model';
import { Agent, ClinicalEvent, FluidBalance } from 'src/app/core/models/clinical-data.model';

// Services
import { SurgeryService } from 'src/app/core/services/surgery.service';
import { MonitoringService } from 'src/app/core/services/monitoring.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { AnesthesiaRecordService } from 'src/app/core/services/anesthesia-record.service';
import { MonitoringPayload, MonitoringCustomFieldPayload } from 'src/app/core/models/monitoring-payload.model';

// Chart.js removed from here, now in MonitorizacaoGraficoComponent

// Sub-components
import { MonitorizacaoTabelaComponent } from './components/monitorizacao-tabela/monitorizacao-tabela.component';
import { MonitorizacaoGraficoComponent } from './components/monitorizacao-grafico/monitorizacao-grafico.component';
import { MonitorizacaoSidebarComponent } from './components/monitorizacao-sidebar/monitorizacao-sidebar.component';

@Component({
  selector: 'app-monitorizacao',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    PatientInfoCardComponent,
    QuickVitalInputComponent,
    FormsModule,
    MonitorizacaoTabelaComponent,
    MonitorizacaoGraficoComponent,
    MonitorizacaoSidebarComponent
  ],
  templateUrl: './monitorizacao.component.html',
  styleUrls: ['./monitorizacao.component.scss']
})
export class MonitorizacaoComponent implements OnInit, AfterViewInit, OnDestroy {
  pacienteId: string | null = null;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;
  isLoading = true;
  hasData = false;
  // Chart is now managed by MonitorizacaoGraficoComponent
  vitalRecords: MonitoringRecord[] = [];
  selectedRecord: MonitoringRecord | null = null;
  isNewRecord = false; // Removido private para uso no template se necessário
  customFields: { label: string, key: string }[] = [];
  private autoRefreshInterval: any;
  autoMonitoringIntervalMinutes: number | null = null;

  // Dados Clínicos (Novo)
  agents: Agent[] = [];
  events: ClinicalEvent[] = [];
  
  expandedSections: any = {
    agents: true,
    events: true,
    balance: true
  };
  balanceItems: FluidBalance[] = [];
  
  // Controle de Posição
  posicoesPossiveis = [
    'SUPINA', 'PRONA', 'SENTADO', 
    'LATERAL ESQUERDO', 'LATERAL DIREITO', 
    'TRENDELENBURG', 'LITOTÔMICA'
  ];
  posicaoAtual: string | null = null;
  
  // Controle de Tempos e Timer
  startTimeAnesthesia: string | null = null;
  startTimeSurgery: string | null = null;
  timerValue: string = '00:00:00';
  private timerInterval: any;
  isAnesthesiaStarted = false;
  isSurgeryStarted = false;
  isSurgeryFinished = false;
  endTimeSurgery: string | null = null;

  @ViewChild('topEditor', { static: false, read: ElementRef }) topEditor!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private actionSheetController: ActionSheetController,
    private surgeryService: SurgeryService,
    private monitoringService: MonitoringService,
    private authService: AuthService,
    private anesthesiaRecordService: AnesthesiaRecordService
  ) {
    addIcons({
      arrowBackOutline,
      documentTextOutline,
      settingsOutline,
      pulseOutline,
      warningOutline,
      listOutline,
      addOutline,
      trashOutline,
      medkitOutline,
      cutOutline,
      flaskOutline,
      bookmarkOutline,
      waterOutline,
      checkmarkDoneCircleOutline,
      checkmarkDoneOutline,
      statsChartOutline, 
      playOutline, 
      stopOutline, 
      saveOutline, 
      closeOutline, 
      createOutline, 
      triangle,
      refreshOutline,
      timeOutline
    });
  }

  ngAfterViewInit() {
    // Chart creation moved to Grafico component
  }

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
    if (this.pacienteId) {
      this.loadPatientData(this.pacienteId);
      this.loadFromLocalStorage();
      this.startAutoRefresh();
    }
  }


  private startAutoRefresh() {
    // Polling leve dos dados cadastrais/status do paciente a cada 30 segundos
    this.autoRefreshInterval = setInterval(() => {
      if (this.pacienteId) {
        console.log('[Auto-Refresh] Atualizando dados cadastrais/procedimento do paciente...');
        this.loadPatientData(this.pacienteId);
      }
    }, 30000);
  }

  private stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }

  private loadPatientData(id: string) {
    if (!this.patient) {
      this.isLoading = true;
    }
    this.surgeryService.getSurgeries('2026-04-11').subscribe({
      next: (res: any) => {
        const dataArray = res?.data?.data || res?.data || [];
        const surgeryData = dataArray.find((s: any) => (s.surgeryId || s.id)?.toString() === id.toString());
        
        if (surgeryData) {
          this.patient = {
            ...surgeryData,
            gender: surgeryData.gender || 'M',
            birthDate: this.formatDate(surgeryData.birthDate || '1985-03-15T00:00:00')
          };
          this.selectedSurgery = { ...surgeryData, id: surgeryData.surgeryId || surgeryData.id };
          this.selectedProcedure = this.selectedSurgery.procedures?.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures?.[0];
          
          if (this.selectedSurgery?.id) {
            // Option B: Verificar Ficha Anestésica para garantir que a Monitorização tem onde salvar
            this.anesthesiaRecordService.getLatestByPatient(this.selectedSurgery.id.toString()).subscribe({
              next: (ficha) => {
                if (!ficha) {
                  this.createBlankRecordAndLoadMonitoring();
                } else {
                  this.loadMonitoringRecord(this.selectedSurgery.id);
                }
              },
              error: () => {
                this.createBlankRecordAndLoadMonitoring();
              }
            });
          } else {
            this.isLoading = false;
            this.hasData = true;
          }
        } else {
          this.handleLoadError();
        }
      },
      error: () => {
        this.handleLoadError();
      }
    });
  }

  private createBlankRecordAndLoadMonitoring() {
    this.anesthesiaRecordService.createBlankRecord(this.selectedSurgery.id).subscribe({
      next: () => {
        this.loadMonitoringRecord(this.selectedSurgery.id);
      },
      error: (err) => {
        console.error('[Monitoring] Erro ao criar Ficha Anestésica em branco', err);
        // Tenta carregar mesmo se der erro
        this.loadMonitoringRecord(this.selectedSurgery.id);
      }
    });
  }

  private loadMonitoringRecord(surgeryId: number) {
    this.monitoringService.getMonitoringData(surgeryId).subscribe({
      next: (data) => {
        if (data) {
          // Aqui faríamos a desserialização do JSON da API para o estado interno
        }
        this.isLoading = false;
        this.hasData = true;
      },
      error: (err) => {
        // 404 é esperado se não houver registros anteriores
        this.isLoading = false;
        this.hasData = true;
      }
    });
  }

  private async handleLoadError() {
    this.isLoading = false;
    const toast = await this.toastController.create({
      message: 'Falha ao carregar dados do paciente.',
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
    this.router.navigate(['/patient-list']);
  }

  private loadFromLocalStorage() {
    if (!this.pacienteId) return;
    const data = localStorage.getItem(`monitoring_record_${this.pacienteId}`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.vitalRecords = parsed.vitalRecords || [];
        this.customFields = parsed.customFields || [];
        this.agents = parsed.agents || [];
        this.events = parsed.events || [];
        this.balanceItems = parsed.balanceItems || [];
        this.startTimeAnesthesia = parsed.startTimeAnesthesia || null;
        this.startTimeSurgery = parsed.startTimeSurgery || null;
        this.isAnesthesiaStarted = parsed.isAnesthesiaStarted || false;
        this.isSurgeryStarted = parsed.isSurgeryStarted || false;
        this.isSurgeryFinished = parsed.isSurgeryFinished || false;
        this.posicaoAtual = parsed.posicaoAtual || null;
        this.autoMonitoringIntervalMinutes = parsed.autoMonitoringIntervalMinutes || null;
        
        if (parsed.timerValue) {
          this.timerValue = parsed.timerValue;
        }
        
        if (this.isSurgeryStarted && !this.isSurgeryFinished) {
          this.startTimer();
        }
        
        this.hasData = this.vitalRecords.length > 0 || 
                       !!this.startTimeAnesthesia || 
                       !!this.startTimeSurgery || 
                       this.agents.length > 0 || 
                       this.events.length > 0 || 
                       this.balanceItems.length > 0;
      } catch (e) {
        console.error('Erro ao recuperar do local storage', e);
      }
    }
  }

  private saveToLocalStorage() {
    if (!this.pacienteId) return;
    const data = {
      vitalRecords: this.vitalRecords,
      customFields: this.customFields,
      agents: this.agents,
      events: this.events,
      balanceItems: this.balanceItems,
      startTimeAnesthesia: this.startTimeAnesthesia,
      startTimeSurgery: this.startTimeSurgery,
      isAnesthesiaStarted: this.isAnesthesiaStarted,
      isSurgeryStarted: this.isSurgeryStarted,
      isSurgeryFinished: this.isSurgeryFinished,
      timerValue: this.timerValue,
      posicaoAtual: this.posicaoAtual,
      autoMonitoringIntervalMinutes: this.autoMonitoringIntervalMinutes
    };
    localStorage.setItem(`monitoring_record_${this.pacienteId}`, JSON.stringify(data));
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  voltar() {
    this.location.back();
  }

  abrirFicha() {
    this.router.navigate(['/ficha-anestesica', this.pacienteId]);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }

  // --- CONTROLE TEMPORAL (FA-051) ---

  async iniciarAnestesia() {
    if (this.isSurgeryFinished) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const defaultTime = this.startTimeAnesthesia || now;
    
    const alert = await this.alertController.create({
      header: 'Início da Anestesia',
      inputs: [{ name: 'time', type: 'time', value: defaultTime }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: (data) => {
            this.startTimeAnesthesia = data.time;
            this.isAnesthesiaStarted = true;
            this.updateChartDataLocal();
          }
        }
      ]
    });
    await alert.present();
  }

  async iniciarCirurgia() {
    if (this.isSurgeryFinished) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const defaultTime = this.startTimeSurgery || now;
    
    const timeAlert = await this.alertController.create({
      header: 'Início da Cirurgia',
      inputs: [{ name: 'time', type: 'time', value: defaultTime }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: async (data) => {
            const time = data.time;
            // Pop-up subsequente para escolher a posição
            const posAlert = await this.alertController.create({
              header: 'Posição Inicial',
              inputs: this.posicoesPossiveis.map(p => ({
                type: 'radio',
                label: p,
                value: p,
                checked: p === 'SUPINA'
              })),
              buttons: [
                { text: 'Pular', role: 'cancel', handler: () => this.promptForFrequency(time, null) },
                { text: 'Confirmar', handler: (pos) => this.promptForFrequency(time, pos) }
              ]
            });
            await posAlert.present();
          }
        }
      ]
    });
    await timeAlert.present();
  }

  async promptForFrequency(time: string, pos: string | null) {
    if (this.isSurgeryFinished) return;
    const alert = await this.alertController.create({
      header: 'Frequência de Monitoramento',
      message: 'De quanto em quanto tempo (em minutos) o app deve aferir os sinais vitais automaticamente?',
      inputs: [
        { 
          name: 'intervalMinutes',
          type: 'number', 
          placeholder: 'Ex: 5', 
          min: 1, 
          max: 120,
          value: this.autoMonitoringIntervalMinutes || 5
        }
      ],
      buttons: [
        { 
          text: 'Confirmar', 
          handler: (data) => {
            let value = parseInt(data.intervalMinutes, 10);
            if (isNaN(value) || value <= 0) value = 5; // Fallback se deixar vazio
            this.autoMonitoringIntervalMinutes = value;
            this.saveToLocalStorage();
            this.confirmarInicioCirurgia(time, pos);
          }
        }
      ],
      backdropDismiss: false
    });
    await alert.present();
  }

  async reconfigurarFrequencia() {
    if (this.isSurgeryFinished) return;
    const alert = await this.alertController.create({
      header: 'Frequência de Monitoramento',
      message: 'De quanto em quanto tempo (em minutos) o app deve aferir os sinais vitais automaticamente?',
      inputs: [
        { 
          name: 'intervalMinutes',
          type: 'number', 
          placeholder: 'Ex: 5', 
          min: 1, 
          max: 120,
          value: this.autoMonitoringIntervalMinutes || 5
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Confirmar', 
          handler: (data) => {
            let value = parseInt(data.intervalMinutes, 10);
            if (isNaN(value) || value <= 0) value = 5;
            this.autoMonitoringIntervalMinutes = value;
            this.saveToLocalStorage();
          }
        }
      ]
    });
    await alert.present();
  }

  private confirmarInicioCirurgia(time: string, pos: string | null) {
    if (this.isSurgeryFinished) return;
    const isFirstTime = !this.isSurgeryStarted;
    this.startTimeSurgery = time;
    this.isSurgeryStarted = true;
    
    if (pos) {
      this.posicaoAtual = pos;
      this.events.push({
        id: Date.now().toString(),
        time: time,
        type: 'position',
        name: `Posição: ${pos}`
      });
    }

    if (isFirstTime) {
      this.startTimer();
    }
    this.updateChartDataLocal();
  }

  async mudarPosicao(novaPosicao: string) {
    if (this.isSurgeryFinished || !this.isSurgeryStarted || this.posicaoAtual === novaPosicao) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const alert = await this.alertController.create({
      header: 'Mudar Posição',
      subHeader: novaPosicao,
      message: 'Confirme o horário da mudança:',
      inputs: [
        { name: 'time', type: 'time', value: now }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: (data) => {
            this.posicaoAtual = novaPosicao;
            this.events.push({
              id: Date.now().toString(),
              time: data.time,
              type: 'position',
              name: `Mudança de Posição: ${novaPosicao}`
            });
            this.updateChartDataLocal();
          }
        }
      ]
    });
    await alert.present();
  }

  async finalizarCirurgia() {
    const alert = await this.alertController.create({
      header: 'Finalizar Cirurgia',
      message: 'Tem certeza que deseja finalizar a cirurgia? Os registros da monitorização serão encerrados e não poderão ser mais alterados.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Finalizar',
          handler: () => {
            this.isSurgeryFinished = true;
            this.endTimeSurgery = this.getCurrentTime(); // Adicionando caso fosse útil
            this.stopAutoRefresh();
            if (this.timerInterval) {
              clearInterval(this.timerInterval);
            }
            
            // Consolidar Payload JSON
            const payload = this.buildMonitoringPayload();
            const storageKey = `monitoring_api_id_${this.selectedSurgery?.id}`;
            const monitoringId = localStorage.getItem(storageKey);
            
            // Enviar para API Real
            if (monitoringId) {
               this.monitoringService.updateMonitoringData(Number(monitoringId), payload).subscribe({
                 next: () => {
                   this.monitoringService.finalizeMonitoring(Number(monitoringId)).subscribe({
                     next: (res) => console.log('Cirurgia finalizada na API!', res),
                     error: (err) => console.error('Erro ao finalizar na API', err)
                   });
                 }
               });
            } else {
               this.monitoringService.createMonitoringData(payload).subscribe({
                 next: (res) => {
                   if (res?.data?.id) {
                     this.monitoringService.finalizeMonitoring(res.data.id).subscribe();
                   }
                 }
               });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Constrói o JSON no formato exigido pela futura API 
   * (conforme modelo MonitoringPayload)
   */
  private buildMonitoringPayload(): MonitoringPayload {
    // Helper para gerar um timestamp completo no dia de hoje
    const todayStr = new Date().toISOString().split('T')[0];
    const parseTime = (t: string | null) => t ? `${todayStr}T${t}:00Z` : null;

    return {
      anesthesiaRecordId: Number(this.selectedSurgery.id),
      surgeryId: Number(this.selectedSurgery.id),
      recordedByProfessionalId: Number(this.authService.getCurrentUserId() || 1),
      startedAt: parseTime(this.startTimeAnesthesia),
      endedAt: parseTime(this.endTimeSurgery),
      vitalSigns: this.vitalRecords.map(r => {
        const custom: MonitoringCustomFieldPayload[] = [];
        if (r.custom) {
          Object.keys(r.custom).forEach(k => {
             const fieldLabel = this.customFields.find(f => f.key === k)?.label || k;
             custom.push({ name: fieldLabel, value: r.custom![k] });
          });
        }
        return {
          timestamp: parseTime(r.time)!,
          systolicBloodPressure: r.pas,
          diastolicBloodPressure: r.pad,
          meanArterialPressure: r.pam,
          heartRate: r.fc,
          spo2: r.spo2,
          etco2: r.etco2,
          temperature: r.temp,
          bis: r.bis,
          pvc: r.pvc,
          pcap: r.pcap,
          customFields: custom
        };
      }),
      administeredAgents: this.agents.map(a => {
        // Separa dose e unidade se possível (ex: "150mg" -> 150, "mg")
        const match = a.dose.match(/([\d.]+)\s*([a-zA-Z]+)/);
        return {
          timestamp: parseTime(a.time)!,
          name: a.name,
          dose: match ? match[1] : a.dose,
          unit: (match ? match[2] : '') as any, // Cast temporário
          route: a.route as any, // Cast temporário
          presentation: a.presentation as any // Cast temporário
        };
      }),
      clinicalEvents: this.events.map(e => ({
        timestamp: parseTime(e.time)!,
        eventType: e.type as any, // Cast temporário para compilar caso haja diferença com enum, será refinado se preciso
        name: e.name,
        observations: null
      })),
      fluidBalances: this.balanceItems.map(b => ({
        timestamp: parseTime(b.time)!,
        balanceType: b.type as any, // Cast temporário para Enum
        category: b.category as any, // Cast temporário para Enum
        name: b.name,
        volumeMl: b.value
      }))
    };
  }

  private startTimer() {
    let secondsElapsed = 0;
    console.log('[Timer Debug] Iniciando timer. startTimeSurgery registrado:', this.startTimeSurgery);
    
    if (this.startTimeSurgery) {
      // Regex robusto para extrair horas, minutos e segundos (opcionais), com suporte a AM/PM (opcional)
      const match = this.startTimeSurgery.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = match[3] ? parseInt(match[3], 10) : 0;
        const ampm = match[4];
        
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
          } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
        
        const now = new Date();
        const startDateTime = new Date();
        startDateTime.setHours(hours, minutes, seconds, 0);
        
        console.log('[Timer Debug] startDateTime interpretado localmente:', startDateTime.toString());
        console.log('[Timer Debug] Horário atual (now):', now.toString());
        
        if (now.getTime() > startDateTime.getTime()) {
          secondsElapsed = Math.floor((now.getTime() - startDateTime.getTime()) / 1000);
          console.log('[Timer Debug] Segundos decorridos calculados:', secondsElapsed);
        } else {
          console.warn('[Timer Debug] Horário de início da cirurgia é no futuro ou inválido em relação ao horário atual.');
        }
      } else {
        console.warn('[Timer Debug] Formato de startTimeSurgery não reconhecido pelo regex:', this.startTimeSurgery);
      }
    }

    // Atualiza imediatamente antes de rodar o intervalo de 1s
    const hours = Math.floor(secondsElapsed / 3600);
    const minutes = Math.floor((secondsElapsed % 3600) / 60);
    const seconds = secondsElapsed % 60;
    this.timerValue = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.timerInterval = setInterval(() => {
      secondsElapsed++;
      const hrs = Math.floor(secondsElapsed / 3600);
      const mins = Math.floor((secondsElapsed % 3600) / 60);
      const secs = secondsElapsed % 60;

      this.timerValue = 
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      // Checa a cada 10 segundos se precisa repetir os sinais vitais
      if (secondsElapsed % 10 === 0) {
        this.checkAndAutoRepeatVitals();
      }
    }, 1000);
  }

  // Adiciona novo registro vindo do botão "+ Registro" (Lógica App-Base)
  addTimePoint() {
    if (this.isSurgeryFinished) return;
    // Se já estiver editando um registro (especialmente um novo), não deixa criar outro
    if (this.selectedRecord) {
      return;
    }

    const lastRecord = this.vitalRecords[0];
    let newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Evita duplicata exata de horário no mesmo minuto se clicar muito rápido
    if (lastRecord && lastRecord.time === newTime) {
      const [h, m] = newTime.split(':');
      newTime = `${h}:${parseInt(m) + 1}`;
    }

    const newRec: MonitoringRecord = {
      time: newTime,
      pas: lastRecord?.pas || 120,
      pad: lastRecord?.pad || 80,
      fc: lastRecord?.fc || 75,
      spo2: lastRecord?.spo2 || 99,
      temp: lastRecord?.temp || 36.5,
      etco2: lastRecord?.etco2 || 35,
      pam: lastRecord?.pam || 93,
      bis: lastRecord?.bis || 60,
      pvc: lastRecord?.pvc || 8,
      pcap: lastRecord?.pcap || 12,
      custom: {} // Inicializa objeto para campos customizados
    };

    // Inicializa campos customizados existentes
    this.customFields.forEach(field => {
      newRec.custom![field.key] = "";
    });

    this.vitalRecords = [newRec, ...this.vitalRecords];
    this.sortRecords(); // Garante a ordem cronológica
    this.selectedRecord = newRec;
    this.isNewRecord = true; // Marca que este registro foi acabado de criar
    this.hasData = true;

    this.updateChartDataLocal();
    this.scrollToEditor();
  }

  private scrollToEditor() {
    setTimeout(() => {
      if (this.topEditor) {
        this.topEditor.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  private sortRecords() {
    this.vitalRecords.sort((a, b) => {
      // Ordena do mais recente para o mais antigo (topo da tabela)
      return b.time.localeCompare(a.time);
    });
  }

  trackByRecords(index: number, record: MonitoringRecord) {
    // Identificador único para performance (combinação de tempo e id se houver)
    return record.id || record.time;
  }

  selectRecord(record: MonitoringRecord) {
    if (this.isSurgeryFinished) return;
    this.selectedRecord = record;
    this.isNewRecord = false; // Registro existente
    this.scrollToEditor();
  }

  // Confirma o registro
  updateActiveRecord() {
    if (this.isSurgeryFinished) return;
    this.sortRecords(); // Re-ordena caso o horário tenha sido editado
    const wasNew = this.isNewRecord;
    this.selectedRecord = null;
    this.isNewRecord = false;
    this.updateChartDataLocal();
  }

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  private getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // --- GESTÃO CLÍNICA (AGENTES, EVENTOS, BALANÇO) ---

  async openAgentModal(agent?: Agent) {
    if (this.isSurgeryFinished) return;
    const modal = await this.modalController.create({
      component: ClinicalItemModalComponent,
      componentProps: {
        type: 'agent',
        itemData: agent
      },
      cssClass: 'auto-height-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const newAgent: Agent = { ...data, id: agent?.id || Date.now().toString() };
      if (agent) {
        this.agents = this.agents.map(a => a.id === agent.id ? newAgent : a);
      } else {
        this.agents.push(newAgent);
      }
      this.updateChartDataLocal();
    } else if (role === 'delete' && data?.id) {
      this.deleteAgent(data.id);
    }
  }

  async openEventModal(type: 'event' | 'incident' | 'technique' | 'position', item?: ClinicalEvent) {
    if (this.isSurgeryFinished) return;
    const modal = await this.modalController.create({
      component: ClinicalItemModalComponent,
      componentProps: {
        type: 'event',
        itemData: item
      },
      cssClass: 'auto-height-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const newItem: ClinicalEvent = { ...data, type, id: item?.id || Date.now().toString() };
      if (item) {
        this.events = this.events.map(e => e.id === item.id ? newItem : e);
      } else {
        this.events.push(newItem);
      }
      this.updateChartDataLocal();
    } else if (role === 'delete' && data?.id) {
      this.deleteEvent(data.id);
    }
  }

  async openBalanceModal(balance?: FluidBalance) {
    if (this.isSurgeryFinished) return;
    const modal = await this.modalController.create({
      component: ClinicalItemModalComponent,
      componentProps: {
        type: 'balance',
        itemData: balance
      },
      cssClass: 'auto-height-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const newItem: FluidBalance = { ...data, id: balance?.id || Date.now().toString() };
      if (balance) {
        this.balanceItems = this.balanceItems.map(b => b.id === balance.id ? newItem : b);
      } else {
        this.balanceItems.push(newItem);
      }
      this.updateChartDataLocal();
    } else if (role === 'delete' && data?.id) {
      this.deleteBalance(data.id);
    }
  }

  deleteAgent(id: string) { if (this.isSurgeryFinished) return; this.agents = this.agents.filter(a => a.id !== id); this.updateChartDataLocal(); }
  deleteEvent(id: string) { if (this.isSurgeryFinished) return; this.events = this.events.filter(e => e.id !== id); this.updateChartDataLocal(); }
  deleteBalance(id: string) { if (this.isSurgeryFinished) return; this.balanceItems = this.balanceItems.filter(b => b.id !== id); this.updateChartDataLocal(); }

  getTotalGains() { return this.balanceItems.filter(b => b.type === 'gain').reduce((acc, b) => acc + (b.value || 0), 0); }
  getTotalLosses() { return this.balanceItems.filter(b => b.type === 'loss').reduce((acc, b) => acc + (b.value || 0), 0); }
  getNetBalance() { return this.getTotalGains() - this.getTotalLosses(); }

  // Cancela a edição
  cancelEdit() {
    if (this.isNewRecord && this.selectedRecord) {
      // Se era um registro novo, removemos da lista
      this.vitalRecords = this.vitalRecords.filter(r => r !== this.selectedRecord);
    }
    this.selectedRecord = null;
    this.isNewRecord = false;
    this.updateChartDataLocal(); // Atualiza o gráfico para refletir o cancelamento
  }

  async deleteRecord(record: MonitoringRecord) {
    if (this.isSurgeryFinished) return;
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: `Deseja realmente excluir o registro das ${record.time}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.vitalRecords = this.vitalRecords.filter(r => r !== record);
            if (this.selectedRecord === record) {
              this.selectedRecord = null;
            }
            this.updateChartDataLocal();
          }
        }
      ]
    });

    await alert.present();
  }

  async addCustomField() {
    if (this.isSurgeryFinished) return;
    const alert = await this.alertController.create({
      header: 'Novo Campo',
      message: 'Digite o nome da nova coluna (ex: Medicamento, PVC, etc)',
      inputs: [
        {
          name: 'label',
          type: 'text',
          placeholder: 'Nome do campo'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Adicionar',
          handler: (data) => {
            if (!data.label) return false;
            
            const key = 'custom_' + Date.now();
            this.customFields = [...this.customFields, { label: data.label, key: key }];

            // Adiciona o campo em todos os registros existentes
            this.vitalRecords.forEach(rec => {
              if (!rec.custom) rec.custom = {};
              rec.custom[key] = "";
            });
            this.vitalRecords = [...this.vitalRecords];

            this.saveToLocalStorage();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async editCustomFieldMenu(field: { label: string, key: string }) {
    if (this.isSurgeryFinished) return;
    const actionSheet = await this.actionSheetController.create({
      header: `Gerenciar Coluna: ${field.label}`,
      buttons: [
        {
          text: 'Renomear',
          icon: 'create-outline',
          handler: () => {
            this.renameCustomField(field);
          }
        },
        {
          text: 'Excluir Coluna',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            this.removeCustomField(field);
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async renameCustomField(field: { label: string, key: string }) {
    if (this.isSurgeryFinished) return;
    const alert = await this.alertController.create({
      header: 'Renomear Campo',
      inputs: [
        {
          name: 'label',
          type: 'text',
          value: field.label,
          placeholder: 'Novo nome'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            if (!data.label) return false;
            this.customFields = this.customFields.map(f => f.key === field.key ? { ...f, label: data.label } : f);
            this.saveToLocalStorage();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async removeCustomField(field: { label: string, key: string }) {
    if (this.isSurgeryFinished) return;
    const alert = await this.alertController.create({
      header: 'Excluir Coluna?',
      message: `Tem certeza que deseja remover a coluna "${field.label}"? Todos os dados preenchidos nela serão perdidos.`,
      buttons: [
        { text: 'Não', role: 'cancel' },
        {
          text: 'Sim, Excluir',
          cssClass: 'danger-button',
          handler: () => {
            // Remove da lista de cabeçalhos
            this.customFields = this.customFields.filter(f => f.key !== field.key);
            
            // Limpa os dados nos registros
            this.vitalRecords.forEach(rec => {
              if (rec.custom) {
                delete rec.custom[field.key];
              }
            });
            this.vitalRecords = [...this.vitalRecords];
            this.saveToLocalStorage();
          }
        }
      ]
    });
    await alert.present();
  }

  // Chart methods removed. Lógica do Gráfico foi movida para MonitorizacaoGraficoComponent.

  async reiniciarTeste() {
    const alert = await this.alertController.create({
      header: 'Confirmar Reinício',
      message: 'Isso apagará todos os dados cadastrados neste monitoramento localmente. Deseja reiniciar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: () => {
            // Limpa variáveis de estado
            this.isAnesthesiaStarted = false;
            this.isSurgeryStarted = false;
            this.isSurgeryFinished = false;
            this.timerValue = '00:00:00';
            this.startTimeAnesthesia = null;
            this.startTimeSurgery = null;
            this.posicaoAtual = null;
            
            // Limpa dados
            this.vitalRecords = [];
            this.agents = [];
            this.events = [];
            this.balanceItems = [];
            this.selectedRecord = null;
            this.isNewRecord = false;
            this.hasData = false;

            // Para o cronômetro
            if (this.timerInterval) {
              clearInterval(this.timerInterval);
              this.timerInterval = null;
            }

            // Limpa do LocalStorage
            if (this.pacienteId) {
              localStorage.removeItem(`monitoring_record_${this.pacienteId}`);
            }

            // Atualiza gráfico (Removido, as referências de array vão atualizar o filho)
            // Para garantir a propagação:
            this.vitalRecords = [...this.vitalRecords];
            this.agents = [...this.agents];
            this.events = [...this.events];
            this.balanceItems = [...this.balanceItems];
          }
        }
      ]
    });
    await alert.present();
  }

  checkAndAutoRepeatVitals() {
    // Apenas insere se a cirurgia estiver rodando (e não finalizada) e se houver dados
    if (!this.isSurgeryStarted || this.isSurgeryFinished || this.vitalRecords.length === 0) {
      return;
    }

    const lastRecord = this.vitalRecords[0];
    const [lastH, lastM] = lastRecord.time.split(':').map(x => parseInt(x, 10));

    const now = new Date();
    const lastRecordDate = new Date();
    lastRecordDate.setHours(lastH, lastM, 0, 0);

    const diffMs = now.getTime() - lastRecordDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const intervalSeconds = (this.autoMonitoringIntervalMinutes || 5) * 60;

    // Se passou o tempo configurado (ou mais) desde o último registro
    if (diffSeconds >= intervalSeconds) {
      const newTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const existingIndex = this.vitalRecords.findIndex(r => r.time === newTime);
      if (existingIndex > -1) {
        // Se já existe um registro para o minuto atual, atualiza seus dados
        this.vitalRecords[existingIndex] = {
          ...this.vitalRecords[existingIndex],
          ...lastRecord,
          time: newTime
        };
      } else {
        // Se não existe, insere um novo registro
        const newRec: MonitoringRecord = {
          ...lastRecord,
          id: undefined,
          time: newTime,
          custom: lastRecord.custom ? { ...lastRecord.custom } : {}
        };
        this.vitalRecords = [newRec, ...this.vitalRecords];
      }

      this.sortRecords();
      // Emissão para recriar referência para change detection no OnPush
      this.vitalRecords = [...this.vitalRecords];
      console.log('[Auto-Repeat] Sinais vitais repetidos/atualizados:', newTime);
      
      // FA-085: Transmissão Lógica Silenciosa
      this.sendMonitoringDataSilently();
    }
  }

  private sendMonitoringDataSilently() {
    if (!this.selectedSurgery?.id) return;
    const payload = this.buildMonitoringPayload();

    this.monitoringService.updateMonitoringData(Number(this.selectedSurgery.id), payload).subscribe({
      next: () => console.log('[Auto-Repeat] API atualizada silenciosamente.'),
      error: (err) => console.error('[Auto-Repeat] Erro API silenciosa:', err)
    });
  }

  // updateChartData foi removido, em vez disso disparamos novas referências quando array muda
  private updateChartDataLocal() {
    this.vitalRecords = [...this.vitalRecords];
    this.agents = [...this.agents];
    this.events = [...this.events];
    this.balanceItems = [...this.balanceItems];
    this.saveToLocalStorage();
  }
}
