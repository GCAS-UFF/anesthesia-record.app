import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { PatientResponse } from './tab1.model';
import { StatusBarComponent } from '../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../shared/components/header-institucional/header-institucional.component';
import { SearchBarComponent } from '../shared/components/search-bar/search-bar.component';
import { StatusChipComponent } from '../shared/components/status-chip/status-chip.component';
import { DateFilterComponent } from '../shared/components/date-filter/date-filter.component';
import { ProcedureCardComponent } from '../shared/components/procedure-card/procedure-card.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    SearchBarComponent,
    StatusChipComponent,
    DateFilterComponent,
    ProcedureCardComponent,
    EmptyStateComponent
  ],
  providers: [DatePipe]
})
export class Tab1Page {
  searchQuery = '';
  selectedStatus = 'all';
  selectedDate = '2026-04-21';

  mockResponse: PatientResponse = {
    "data": [
      {
        "patientId": "PAC-000123",
        "id": 0,
        "medicalRecordNumber": "PRONT-456789",
        "fullName": "João da Silva",
        "birthDate": "1985-03-15T00:00:00",
        "gender": "M",
        "weightKg": 78.5,
        "heightCm": 175,
        "age": 41,
        "currentLocation": {
          "unit": { "code": "UND-01", "description": "Unidade de Internação Clínica" },
          "bed": "12B", "floor": "3", "room": "305"
        },
        "surgeries": [
          {
            "id": 1,
            "surgeryDate": "2026-04-21T09:30:00",
            "status": 0,
            "specialty": { "code": "ESP-001", "description": "Cirurgia Geral" },
            "location": { "surgicalCenter": { "code": "CC-01", "description": "Centro Cirúrgico Principal" }, "room": "Sala 2" },
            "procedures": [
              { "id": "PROC-001", "description": "Colecistectomia Videolaparoscópica", "cid": "K80.2", "isPrimary": true },
              { "id": "PROC-003", "description": "Hernioplastia Inguinal", "cid": "K40.9", "isPrimary": true },
              { "id": "PROC-002", "description": "Colangiografia Intraoperatória", "cid": "K83.1", "isPrimary": false }
            ]
          }
        ]
      },
      {
        "patientId": "PAC-000124",
        "id": 0,
        "medicalRecordNumber": "PRONT-456790",
        "fullName": "Maria Oliveira",
        "birthDate": "1990-07-22T00:00:00",
        "gender": "F",
        "weightKg": 62.3,
        "heightCm": 165,
        "age": 35,
        "currentLocation": {
          "unit": { "code": "UND-02", "description": "Unidade Cirúrgica" },
          "bed": "08A", "floor": "2", "room": "210"
        },
        "surgeries": [
          {
            "id": 2,
            "surgeryDate": "2026-04-21T10:15:00",
            "status": 0,
            "specialty": { "code": "ESP-003", "description": "Ortopedia" },
            "location": { "surgicalCenter": { "code": "CC-02", "description": "Centro Cirúrgico Ortopédico" }, "room": "Sala 4" },
            "procedures": [
              { "id": "PROC-004", "description": "Artroscopia de Joelho", "cid": "M23.2", "isPrimary": true },
              { "id": "PROC-005", "description": "Reconstrução de Ligamento Cruzado Anterior", "cid": "S83.5", "isPrimary": false }
            ]
          }
        ]
      },
      {
        "patientId": "PAC-000125",
        "id": 0,
        "medicalRecordNumber": "PRONT-456791",
        "fullName": "Carlos Eduardo Gomes",
        "birthDate": "1975-11-05T00:00:00",
        "gender": "M",
        "weightKg": 85.0,
        "heightCm": 180,
        "age": 50,
        "currentLocation": { "unit": { "code": "UND-01", "description": "Internação" }, "bed": "02", "floor": "1", "room": "102" },
        "surgeries": [
          {
            "id": 3,
            "surgeryDate": "2026-04-21T07:00:00",
            "status": 1,
            "specialty": { "code": "ESP-002", "description": "Urologia" },
            "location": { "surgicalCenter": { "code": "CC-01", "description": "Principal" }, "room": "Sala 1" },
            "procedures": [{ "id": "PROC-006", "description": "Nefrectomia Parcial", "cid": "C64", "isPrimary": true }]
          }
        ]
      },
      {
        "patientId": "PAC-000126",
        "id": 0,
        "medicalRecordNumber": "PRONT-456792",
        "fullName": "Ana Beatriz Souza",
        "birthDate": "2001-02-10T00:00:00",
        "gender": "F",
        "weightKg": 55.0,
        "heightCm": 160,
        "age": 25,
        "currentLocation": { "unit": { "code": "UND-03", "description": "Ginecologia" }, "bed": "05", "floor": "2", "room": "205" },
        "surgeries": [
          {
            "id": 4,
            "surgeryDate": "2026-04-21T14:30:00",
            "status": 0,
            "specialty": { "code": "ESP-004", "description": "Ginecologia" },
            "location": { "surgicalCenter": { "code": "CC-01", "description": "Principal" }, "room": "Sala 3" },
            "procedures": [{ "id": "PROC-007", "description": "Miomectomia", "cid": "D25", "isPrimary": true }]
          }
        ]
      },
      {
        "patientId": "PAC-000127",
        "id": 0,
        "medicalRecordNumber": "PRONT-456793",
        "fullName": "Roberto Almeida",
        "birthDate": "1960-08-30T00:00:00",
        "gender": "M",
        "weightKg": 90.0,
        "heightCm": 172,
        "age": 65,
        "currentLocation": { "unit": { "code": "UND-01", "description": "Internação" }, "bed": "10", "floor": "3", "room": "310" },
        "surgeries": [
          {
            "id": 5,
            "surgeryDate": "2026-04-21T16:00:00",
            "status": 0,
            "specialty": { "code": "ESP-005", "description": "Neurocirurgia" },
            "location": { "surgicalCenter": { "code": "CC-02", "description": "Ortopédico" }, "room": "Sala 5" },
            "procedures": [{ "id": "PROC-008", "description": "Laminectomia Lombar", "cid": "M51", "isPrimary": true }]
          }
        ]
      },
      {
        "patientId": "PAC-000128",
        "id": 0,
        "medicalRecordNumber": "PRONT-456794",
        "fullName": "Fernanda Lima",
        "birthDate": "1995-12-12T00:00:00",
        "gender": "F",
        "weightKg": 68.0,
        "heightCm": 168,
        "age": 30,
        "currentLocation": { "unit": { "code": "UND-02", "description": "Cirúrgica" }, "bed": "01", "floor": "1", "room": "101" },
        "surgeries": [
          {
            "id": 6,
            "surgeryDate": "2026-04-21T08:15:00",
            "status": 1,
            "specialty": { "code": "ESP-006", "description": "Plástica" },
            "location": { "surgicalCenter": { "code": "CC-01", "description": "Principal" }, "room": "Sala 2" },
            "procedures": [{ "id": "PROC-009", "description": "Rinoplastia Estética", "cid": "Z41.1", "isPrimary": true }]
          }
        ]
      },
      {
        "patientId": "PAC-000129",
        "id": 0,
        "medicalRecordNumber": "PRONT-456795",
        "fullName": "Lucas Mendes",
        "birthDate": "2010-04-18T00:00:00",
        "gender": "M",
        "weightKg": 45.0,
        "heightCm": 150,
        "age": 16,
        "currentLocation": { "unit": { "code": "UND-04", "description": "Pediatria" }, "bed": "03", "floor": "4", "room": "403" },
        "surgeries": [
          {
            "id": 7,
            "surgeryDate": "2026-04-21T11:00:00",
            "status": 0,
            "specialty": { "code": "ESP-007", "description": "Pediatria" },
            "location": { "surgicalCenter": { "code": "CC-01", "description": "Principal" }, "room": "Sala 1" },
            "procedures": [{ "id": "PROC-010", "description": "Apendicectomia", "cid": "K35", "isPrimary": true }]
          }
        ]
      }
    ],
    "totalItems": 7,
    "page": 1,
    "pageSize": 10
  };

  viewList: any[] = [];

  constructor(
    private datePipe: DatePipe,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.flattenData();
  }

  flattenData() {
    this.viewList = [];
    this.mockResponse.data.forEach(patient => {
      patient.surgeries.forEach(surgery => {
        const primaryProc = surgery.procedures.find(p => p.isPrimary) || surgery.procedures[0];
        const dt = new Date(surgery.surgeryDate);
        
        let completedTime = null;
        if (surgery.status === 1) {
            const endDt = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
            completedTime = this.datePipe.transform(endDt, 'HH:mm');
        }

        this.viewList.push({
          id: surgery.id,
          patientName: patient.fullName,
          age: patient.age,
          birthDate: patient.birthDate,
          record: patient.medicalRecordNumber,
          room: surgery.location.room,
          procedure: primaryProc ? primaryProc.description : 'Não informado',
          status: surgery.status === 0 ? 'waiting' : 'completed',
          date: this.datePipe.transform(dt, 'yyyy-MM-dd'),
          time: this.datePipe.transform(dt, 'HH:mm'),
          completedAt: completedTime
        });
      });
    });
  }

  get filteredProcedures() {
    let filtered = this.viewList.filter(p => {
      const matchSearch = p.patientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         p.record.includes(this.searchQuery) ||
                         p.procedure.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         p.room.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchStatus = this.selectedStatus === 'all' || p.status === this.selectedStatus;
      const matchDate = !this.selectedDate || p.date === this.selectedDate;

      return matchSearch && matchStatus && matchDate;
    });

    return filtered.sort((a, b) => {
        if (a.status === 'waiting' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'waiting') return 1;

        if (a.status === 'waiting' && b.status === 'waiting') {
            return a.time.localeCompare(b.time);
        }

        if (a.status === 'completed' && b.status === 'completed') {
            return b.completedAt.localeCompare(a.completedAt);
        }

        return 0;
    });
  }

  onSearchChange(searchTerm: string) {
    this.searchQuery = searchTerm;
  }

  changeStatus(status: string) {
    this.selectedStatus = status;
  }

  onDateChange(newDate: string) {
    this.selectedDate = newDate;
  }

  async onAssume(id: number) {
    const alert = await this.alertController.create({
      header: 'Assumir Paciente',
      message: 'Deseja realmente assumir este paciente e iniciar o preparo anestésico?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Assumindo paciente...',
              duration: 1000,
              spinner: 'circular'
            });
            await loading.present();

            await loading.onDidDismiss();

            const toast = await this.toastController.create({
              message: 'Paciente assumido com sucesso!',
              duration: 2000,
              color: 'success',
              icon: 'checkmark-circle'
            });
            await toast.present();
            
            // Simula o redirecionamento automático para a ficha após assumir
            this.onOpenFicha(id);
          }
        }
      ]
    });

    await alert.present();
  }

  onOpenFicha(id: number) {
    this.router.navigate(['/tabs/tab2'], { queryParams: { pacienteId: id } });
  }

  onViewRegistro(id: number) {
    this.router.navigate(['/tabs/tab3'], { queryParams: { pacienteId: id } });
  }
}
