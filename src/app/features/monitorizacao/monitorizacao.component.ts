import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule, AlertController, ActionSheetController } from '@ionic/angular';
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
  createOutline
} from 'ionicons/icons';

// Shared Components
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { PatientInfoCardComponent } from '../../shared/components/patient-info-card/patient-info-card.component';
import { QuickVitalInputComponent } from '../../shared/components/quick-vital-input/quick-vital-input.component';
import { MonitoringRecord } from 'src/app/core/models/monitoring-record.model';

// Services
import { SurgeryService } from 'src/app/core/services/surgery.service';

@Component({
  selector: 'app-monitorizacao',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    PatientInfoCardComponent,
    QuickVitalInputComponent,
    FormsModule
  ],
  templateUrl: './monitorizacao.component.html',
  styleUrls: ['./monitorizacao.component.scss']
})
export class MonitorizacaoComponent implements OnInit {
  pacienteId: string | null = null;
  patient: any = null;
  selectedSurgery: any = null;
  selectedProcedure: any = null;
  isLoading = true;
  hasData = false;

  // Lista de registros de sinais vitais
  vitalRecords: MonitoringRecord[] = [];

  selectedRecord: MonitoringRecord | null = null;
  private isNewRecord = false;
  customFields: { label: string, key: string }[] = [];

  @ViewChild('topEditor', { static: false, read: ElementRef }) topEditor!: ElementRef;

  constructor(
    private surgeryService: SurgeryService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
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
      createOutline
    });
  }

  ngOnInit() {
    this.pacienteId = this.route.snapshot.paramMap.get('id');
    if (this.pacienteId) {
      this.loadPatientData(this.pacienteId);
    }
  }

  private loadPatientData(id: string) {
    this.isLoading = true;
    // Buscando dados reais do paciente para o header
    this.surgeryService.getSurgeries('2026-04-21').subscribe(res => {
      const patientData = res.data.find(p => p.surgeries.some(s => s.id === parseInt(id)));
      if (patientData) {
        this.patient = {
          ...patientData,
          gender: patientData.gender || 'M',
          birthDate: this.formatDate(patientData.birthDate || '1985-03-15T00:00:00')
        };
        this.selectedSurgery = patientData.surgeries.find(s => s.id === parseInt(id));
        this.selectedProcedure = this.selectedSurgery.procedures.find((p: any) => p.isPrimary) || this.selectedSurgery.procedures[0];
      }
      this.isLoading = false;
    });
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
    this.selectedRecord = null;
    this.isNewRecord = false;
  }

  // Cancela a edição
  cancelEdit() {
    if (this.isNewRecord && this.selectedRecord) {
      // Se era um registro novo, removemos da lista
      this.vitalRecords = this.vitalRecords.filter(r => r !== this.selectedRecord);
    }
    this.selectedRecord = null;
    this.isNewRecord = false;
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
          }
        }
      ]
    });
    await alert.present();
  }
}
