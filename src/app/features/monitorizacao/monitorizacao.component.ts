import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonicModule } from '@ionic/angular';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surgeryService: SurgeryService,
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
    const lastRecord = this.vitalRecords[0];
    let newTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newRec: MonitoringRecord = {
      time: newTime,
      pas: lastRecord?.pas || 120,
      pad: lastRecord?.pad || 80,
      fc: lastRecord?.fc || 75,
      spo2: lastRecord?.spo2 || 99,
      temp: lastRecord?.temp || 36.5,
      etco2: lastRecord?.etco2 || 35
    };

    this.vitalRecords = [newRec, ...this.vitalRecords];
    this.selectedRecord = newRec;
    this.isNewRecord = true; // Marca que este registro foi acabado de criar
    this.hasData = true;
  }

  selectRecord(record: MonitoringRecord) {
    this.selectedRecord = record;
    this.isNewRecord = false; // Registro existente
  }

  // Confirma o registro
  updateActiveRecord() {
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

  deleteRecord(record: MonitoringRecord) {
    this.vitalRecords = this.vitalRecords.filter(r => r !== record);
    if (this.selectedRecord === record) {
      this.selectedRecord = null;
    }
  }
}
