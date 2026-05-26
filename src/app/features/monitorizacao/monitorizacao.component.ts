import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { AlertController, ActionSheetController, ModalController, IonButton, IonIcon } from '@ionic/angular/standalone';
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
  triangle
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

// Chart.js
import Chart from 'chart.js/auto';

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
    FormsModule
  ],
  templateUrl: './monitorizacao.component.html',
  styleUrls: ['./monitorizacao.component.scss']
})
export class MonitorizacaoComponent implements OnInit, AfterViewInit {
  pacienteId: string | null = null;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;
  isLoading = true;
  hasData = false;
  private chart: any;
  vitalRecords: MonitoringRecord[] = [];
  selectedRecord: MonitoringRecord | null = null;
  isNewRecord = false; // Removido private para uso no template se necessário
  customFields: { label: string, key: string }[] = [];

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

  @ViewChild('topEditor', { static: false, read: ElementRef }) topEditor!: ElementRef;

  constructor(
    private surgeryService: SurgeryService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private router: Router,
    private location: Location
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
      triangle
    });
  }

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
    if (this.pacienteId) {
      this.loadPatientData(this.pacienteId);
      this.loadFromLocalStorage();
    }
  }

  private loadPatientData(id: string) {
    this.isLoading = true;
    this.surgeryService.getSurgeries('2026-04-21').subscribe({
      next: (res) => {
        const patientData = res?.data?.find(p => p.surgeries.some(s => s.id === parseInt(id)));
        if (patientData) {
          this.patient = {
            ...patientData,
            gender: patientData.gender || 'M',
            birthDate: this.formatDate(patientData.birthDate || '1985-03-15T00:00:00')
          };
          this.selectedSurgery = patientData.surgeries.find(s => s.id === parseInt(id));
          this.selectedProcedure = this.selectedSurgery.procedures.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures[0];
        } else {
          this.setMockPatient(id);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.warn('Erro ao carregar dados do paciente da API. Usando dados mockados para testes.', err);
        this.setMockPatient(id);
        this.isLoading = false;
      }
    });
  }

  private setMockPatient(id: string) {
    this.patient = {
      fullName: 'Paciente de Teste (Mock)',
      gender: 'M',
      birthDate: '15/03/1985',
      medicalRecordNumber: '123456789',
      age: 41,
      weightKg: '75',
      bed: 'Leito 05',
      allergies: ['Dipirona', 'Penicilina']
    };
    this.selectedSurgery = {
      id: parseInt(id),
      location: {
        room: 'Sala 03'
      },
      status: 'SCHEDULED',
      anesthesiologists: [],
      procedures: [
        {
          description: 'APENDICECTOMIA',
          isPrimary: true
        }
      ]
    };
    this.selectedProcedure = this.selectedSurgery.procedures[0];
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
        this.posicaoAtual = parsed.posicaoAtual || null;
        
        if (this.isSurgeryStarted) {
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
      posicaoAtual: this.posicaoAtual
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
  }

  // --- CONTROLE TEMPORAL (FA-051) ---

  async iniciarAnestesia() {
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
            this.updateChartData();
          }
        }
      ]
    });
    await alert.present();
  }

  async iniciarCirurgia() {
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
                { text: 'Pular', role: 'cancel', handler: () => this.confirmarInicioCirurgia(time, null) },
                { text: 'Confirmar', handler: (pos) => this.confirmarInicioCirurgia(time, pos) }
              ]
            });
            await posAlert.present();
          }
        }
      ]
    });
    await timeAlert.present();
  }

  private confirmarInicioCirurgia(time: string, pos: string | null) {
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
    this.updateChartData();
  }

  async mudarPosicao(novaPosicao: string) {
    if (!this.isSurgeryStarted || this.posicaoAtual === novaPosicao) return;

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
            this.updateChartData();
          }
        }
      ]
    });
    await alert.present();
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
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
    }, 1000);
  }

  // Adiciona novo registro vindo do botão "+ Registro" (Lógica App-Base)
  addTimePoint() {
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

    this.updateChartData();
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
    this.selectedRecord = record;
    this.isNewRecord = false; // Registro existente
    this.scrollToEditor();
  }

  // Confirma o registro
  updateActiveRecord() {
    this.sortRecords(); // Re-ordena caso o horário tenha sido editado
    const wasNew = this.isNewRecord;
    this.selectedRecord = null;
    this.isNewRecord = false;
    this.updateChartData();
  }

  toggleSection(section: 'agents' | 'events' | 'balance', event: Event) {
    event.stopPropagation();
    this.expandedSections[section] = !this.expandedSections[section];
  }

  private getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // --- GESTÃO CLÍNICA (AGENTES, EVENTOS, BALANÇO) ---

  async openAgentModal(agent?: Agent) {
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
      this.updateChartData();
    } else if (role === 'delete' && data?.id) {
      this.deleteAgent(data.id);
    }
  }

  async openEventModal(type: 'event' | 'incident' | 'technique' | 'position', item?: ClinicalEvent) {
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
      this.updateChartData();
    } else if (role === 'delete' && data?.id) {
      this.deleteEvent(data.id);
    }
  }

  async openBalanceModal(balance?: FluidBalance) {
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
      this.updateChartData();
    } else if (role === 'delete' && data?.id) {
      this.deleteBalance(data.id);
    }
  }

  deleteAgent(id: string) { this.agents = this.agents.filter(a => a.id !== id); this.updateChartData(); }
  deleteEvent(id: string) { this.events = this.events.filter(e => e.id !== id); this.updateChartData(); }
  deleteBalance(id: string) { this.balanceItems = this.balanceItems.filter(b => b.id !== id); this.updateChartData(); }

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
    this.updateChartData(); // Atualiza o gráfico para refletir o cancelamento
  }

  async deleteRecord(record: MonitoringRecord) {
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
            this.updateChartData();
          }
        }
      ]
    });

    await alert.present();
  }

  async addCustomField() {
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
            this.customFields.push({ label: data.label, key: key });

            // Adiciona o campo em todos os registros existentes
            this.vitalRecords.forEach(rec => {
              if (!rec.custom) rec.custom = {};
              rec.custom[key] = "";
            });

            this.saveToLocalStorage();
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async editCustomFieldMenu(field: { label: string, key: string }) {
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
            field.label = data.label;
            this.saveToLocalStorage();
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async removeCustomField(field: { label: string, key: string }) {
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
            this.saveToLocalStorage();
          }
        }
      ]
    });
    await alert.present();
  }

  // --- LÓGICA DO GRÁFICO (FA-051) ---

  private createEmojiCanvas(emoji: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = '13px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 8, 9); // Ajuste fino no Y para centralizar o emoji no canvas menor
    }
    return canvas;
  }

  createChart() {
    const ctx = document.getElementById('vitalChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'FC (Pulso)',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointStyle: 'circle',
            pointRadius: 3,
            borderWidth: 1,
            tension: 0.3,
            spanGaps: true,
            yAxisID: 'y'
          },
          {
            label: 'PA Sistólica (V)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            pointStyle: (ctx: any) => {
                const canvas = document.createElement('canvas');
                canvas.width = 14;
                canvas.height = 14;
                const c = canvas.getContext('2d')!;
                c.strokeStyle = '#3b82f6';
                c.lineWidth = 1.5;
                c.beginPath();
                c.moveTo(2, 2);
                c.lineTo(7, 12);
                c.lineTo(12, 2);
                c.stroke();
                return canvas;
            },
            pointRadius: 5,
            borderWidth: 1.5,
            tension: 0.1,
            spanGaps: true,
            yAxisID: 'y'
          },
          {
            label: 'PA Diastólica (Λ)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            pointStyle: (ctx: any) => {
                const canvas = document.createElement('canvas');
                canvas.width = 14;
                canvas.height = 14;
                const c = canvas.getContext('2d')!;
                c.strokeStyle = '#3b82f6';
                c.lineWidth = 1.5;
                c.beginPath();
                c.moveTo(2, 12);
                c.lineTo(7, 2);
                c.lineTo(12, 12);
                c.stroke();
                return canvas;
            },
            pointRadius: 5,
            borderWidth: 1.5,
            tension: 0.1,
            spanGaps: true,
            yAxisID: 'y'
          },
          {
            label: 'PAM (▲)',
            data: [],
            borderColor: '#1e293b',
            backgroundColor: '#1e293b',
            pointStyle: 'triangle',
            pointRadius: 4,
            borderWidth: 1,
            tension: 0.1,
            spanGaps: true,
            yAxisID: 'y'
          },
          {
            label: 'SpO₂ (%)',
            data: [],
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            pointStyle: 'rect',
            pointRadius: 4,
            borderWidth: 1,
            tension: 0.1,
            spanGaps: true,
            yAxisID: 'ySpO2'
          },
          {
            label: 'Início Anestesia (X)',
            data: [],
            borderColor: '#8b5cf6',
            backgroundColor: '#8b5cf6',
            pointStyle: 'crossRot', // Forma um 'X'
            pointRadius: 4,
            borderWidth: 2,
            showLine: false
          },
          {
            label: 'Início Cirurgia (☉)',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: '#ffffff',
            pointStyle: (ctx: any) => {
                // Desenha o círculo com ponto no meio manualmente para paridade total
                const canvas = document.createElement('canvas');
                canvas.width = 14;
                canvas.height = 14;
                const c = canvas.getContext('2d')!;
                c.strokeStyle = '#f59e0b';
                c.lineWidth = 1.5;
                c.beginPath();
                c.arc(7, 7, 5, 0, Math.PI * 2);
                c.stroke();
                c.fillStyle = '#f59e0b';
                c.beginPath();
                c.arc(7, 7, 1.5, 0, Math.PI * 2);
                c.fill();
                return canvas;
            },
            pointRadius: 5,
            borderWidth: 2,
            showLine: false
          },
          // Datasets Clínicos (Novos)
          { label: 'Agentes', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Eventos', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Posições', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Ganhos', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
          { label: 'Perdas', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false }
        ]
      },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Usamos nossa legenda customizada
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (ctx: any) => {
              if (ctx.dataset.label === 'Agentes') {
                const agent = this.agents.find(a => a.time === ctx.label);
                return `Agente: ${agent?.name} (${agent?.dose})`;
              }
              if (ctx.dataset.label === 'Eventos') {
                const ev = this.events.find(e => e.time === ctx.label);
                return `Evento: ${ev?.name}`;
              }
              if (ctx.dataset.label === 'Ganhos' || ctx.dataset.label === 'Perdas') {
                const item = this.balanceItems.find(b => b.time === ctx.label);
                return `${item?.category}: ${item?.value}ml`;
              }
              return `${ctx.dataset.label}: ${ctx.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 220, // Aumentado para dar espaço aos ícones no topo
          ticks: {
            stepSize: 20,
            color: '#94a3b8',
            font: { size: 10, weight: 'bold' }
          },
          grid: { color: '#f1f5f9' }
        },
          ySpO2: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 80,
            max: 100,
            grid: { drawOnChartArea: false }, // Não sobrepor grid à esquerda
            ticks: {
              callback: (value) => value + '%',
              color: '#10b981',
              font: { weight: 'bold' }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });

    this.updateChartData();
  }

  private updateChartData() {
    if (!this.chart) return;

    // Usa todos os registros da tabela como fonte única de verdade para o gráfico
    const validRecords = this.vitalRecords;

    // Coleta todos os horários únicos registrados
    const timesArray: string[] = [];
    validRecords.forEach(r => timesArray.push(r.time));
    if (this.startTimeAnesthesia) timesArray.push(this.startTimeAnesthesia);
    if (this.startTimeSurgery) timesArray.push(this.startTimeSurgery);
    this.agents.forEach(a => timesArray.push(a.time));
    this.events.forEach(e => timesArray.push(e.time));
    this.balanceItems.forEach(b => timesArray.push(b.time));

    let sortedTimes: string[] = [];
    if (timesArray.length > 0) {
      // Pega o menor e o maior tempo
      const sorted = [...timesArray].sort((a, b) => a.localeCompare(b));
      const minTime = sorted[0];
      const maxTime = sorted[sorted.length - 1];

      // Gera todos os intervalos de 5 minutos entre o mínimo e o máximo
      const fullTimeLabels = new Set<string>(timesArray);
      const today = new Date().toISOString().split('T')[0];
      let current = new Date(`${today}T${minTime}:00`);
      const end = new Date(`${today}T${maxTime}:00`);

      while (current <= end) {
        fullTimeLabels.add(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        current = new Date(current.getTime() + 5 * 60000); // +5 minutos
      }

      sortedTimes = Array.from(fullTimeLabels).sort((a, b) => a.localeCompare(b));
    }

    this.hasData = timesArray.length > 0;
    this.chart.data.labels = sortedTimes;

    this.chart.data.datasets[0].data = sortedTimes.map(t => {
      const rec = validRecords.find(r => r.time === t);
      return rec ? rec.fc : null;
    });
    this.chart.data.datasets[1].data = sortedTimes.map(t => {
      const rec = validRecords.find(r => r.time === t);
      return rec ? rec.pas : null;
    });
    this.chart.data.datasets[2].data = sortedTimes.map(t => {
      const rec = validRecords.find(r => r.time === t);
      return rec ? rec.pad : null;
    });
    this.chart.data.datasets[3].data = sortedTimes.map(t => {
      const rec = validRecords.find(r => r.time === t);
      return rec ? rec.pam : null;
    });
    this.chart.data.datasets[4].data = sortedTimes.map(t => {
      const rec = validRecords.find(r => r.time === t);
      return rec ? rec.spo2 : null;
    });

    const anesDs = this.chart.data.datasets.find((d: any) => d.label && d.label.includes('Início Anestesia'));
    if (anesDs) {
      anesDs.data = sortedTimes.map(t => t === this.startTimeAnesthesia ? 100 : null);
    }

    const surgDs = this.chart.data.datasets.find((d: any) => d.label && d.label.includes('Início Cirurgia'));
    if (surgDs) {
      surgDs.data = sortedTimes.map(t => t === this.startTimeSurgery ? 100 : null);
    }

    const pillIcon = this.createEmojiCanvas('💊');
    const bellIcon = this.createEmojiCanvas('🔔');
    const positionIcon = this.createEmojiCanvas('🧍');
    const blueDrop = this.createEmojiCanvas('💧');
    const redDrop = this.createEmojiCanvas('🩸');

    const agentsDs = this.chart.data.datasets.find((d: any) => d.label === 'Agentes');
    if (agentsDs) {
      agentsDs.pointStyle = pillIcon;
      agentsDs.pointRadius = 7;
      agentsDs.data = sortedTimes.map(t => this.agents.find(a => a.time === t) ? 210 : null);
    }

    const eventsDs = this.chart.data.datasets.find((d: any) => d.label === 'Eventos');
    if (eventsDs) {
      eventsDs.pointStyle = bellIcon;
      eventsDs.pointRadius = 7;
      eventsDs.data = sortedTimes.map(t => this.events.find(e => e.time === t && e.type !== 'position') ? 200 : null);
    }

    const posDs = this.chart.data.datasets.find((d: any) => d.label === 'Posições');
    if (posDs) {
      posDs.pointStyle = positionIcon;
      posDs.pointRadius = 7;
      posDs.data = sortedTimes.map(t => this.events.find(e => e.time === t && e.type === 'position') ? 190 : null);
    }

    const gainsDs = this.chart.data.datasets.find((d: any) => d.label === 'Ganhos');
    if (gainsDs) {
      gainsDs.pointStyle = blueDrop;
      gainsDs.pointRadius = 7;
      gainsDs.data = sortedTimes.map(t => this.balanceItems.find(b => b.time === t && b.type === 'gain') ? 180 : null);
    }

    const lossesDs = this.chart.data.datasets.find((d: any) => d.label === 'Perdas');
    if (lossesDs) {
      lossesDs.pointStyle = redDrop;
      lossesDs.pointRadius = 7;
      lossesDs.data = sortedTimes.map(t => this.balanceItems.find(b => b.time === t && b.type === 'loss') ? 180 : null);
    }

    this.chart.update('none');
    this.saveToLocalStorage();
  }

  private prepareClinicalDatasets(): any[] {
    // Retorna datasets vazios com os labels corretos que o updateChartData vai preencher
    return [
      { label: 'Agentes', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
      { label: 'Eventos', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
      { label: 'Posições', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
      { label: 'Ganhos', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false },
      { label: 'Perdas', data: [], pointStyle: 'rect', pointRadius: 0, showLine: false }
    ];
  }
}
