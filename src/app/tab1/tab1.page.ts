import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PatientResponse } from './tab1.model';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
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
          "unit": {
            "code": "UND-01",
            "description": "Unidade de Internação Clínica"
          },
          "bed": "12B",
          "floor": "3",
          "room": "305"
        },
        "surgeries": [
          {
            "id": 1,
            "surgeryDate": "2026-04-21T09:30:00",
            "status": 0,
            "specialty": {
              "code": "ESP-001",
              "description": "Cirurgia Geral"
            },
            "location": {
              "surgicalCenter": {
                "code": "CC-01",
                "description": "Centro Cirúrgico Principal"
              },
              "room": "Sala 2"
            },
            "procedures": [
              {
                "id": "PROC-001",
                "description": "Colecistectomia Videolaparoscópica",
                "cid": "K80.2",
                "isPrimary": true
              },
              {
                "id": "PROC-003",
                "description": "Hernioplastia Inguinal",
                "cid": "K40.9",
                "isPrimary": true
              },
              {
                "id": "PROC-002",
                "description": "Colangiografia Intraoperatória",
                "cid": "K83.1",
                "isPrimary": false
              }
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
          "unit": {
            "code": "UND-02",
            "description": "Unidade Cirúrgica"
          },
          "bed": "08A",
          "floor": "2",
          "room": "210"
        },
        "surgeries": [
          {
            "id": 2,
            "surgeryDate": "2026-04-21T10:15:00",
            "status": 0,
            "specialty": {
              "code": "ESP-003",
              "description": "Ortopedia"
            },
            "location": {
              "surgicalCenter": {
                "code": "CC-02",
                "description": "Centro Cirúrgico Ortopédico"
              },
              "room": "Sala 4"
            },
            "procedures": [
              {
                "id": "PROC-004",
                "description": "Artroscopia de Joelho",
                "cid": "M23.2",
                "isPrimary": true
              },
              {
                "id": "PROC-005",
                "description": "Reconstrução de Ligamento Cruzado Anterior",
                "cid": "S83.5",
                "isPrimary": false
              }
            ]
          }
        ]
      }
    ],
    "totalItems": 2,
    "page": 1,
    "pageSize": 10
  };

  viewList: any[] = [];

  constructor(private datePipe: DatePipe) {
    this.flattenData();
  }

  flattenData() {
    this.viewList = [];
    this.mockResponse.data.forEach(patient => {
      patient.surgeries.forEach(surgery => {
        const primaryProc = surgery.procedures.find(p => p.isPrimary) || surgery.procedures[0];
        const dt = new Date(surgery.surgeryDate);
        
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
          completedAt: null
        });
      });
    });
  }

  get filteredProcedures() {
    return this.viewList.filter(p => {
      const matchSearch = p.patientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         p.record.includes(this.searchQuery) ||
                         p.procedure.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         p.room.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchStatus = this.selectedStatus === 'all' || p.status === this.selectedStatus;
      const matchDate = !this.selectedDate || p.date === this.selectedDate;

      return matchSearch && matchStatus && matchDate;
    });
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value;
  }

  changeStatus(status: string) {
    this.selectedStatus = status;
  }

  onDateChange(event: any) {
    this.selectedDate = event.target.value;
  }
}
