import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class Tab1Page {
  searchQuery = '';
  selectedStatus = 'all';
  selectedDate = '2026-03-21';

  procedures = [
    {
      id: 1,
      patient: "Mateus Ferreira",
      age: "24 anos",
      birth: "13/04/2000",
      record: "86433",
      room: "SALA 01",
      procedure: "Apendicectomia",
      status: "waiting",
      date: "2026-03-21",
      time: "09:30",
      isAllergy: true
    },
    {
      id: 2,
      patient: "Bruno Peçanha",
      age: "40 anos",
      birth: "15/08/1985",
      record: "54321",
      room: "SALA 02",
      procedure: "Colecistectomia",
      status: "waiting",
      date: "2026-03-21",
      time: "10:15",
      isAllergy: false
    },
    {
      id: 3,
      patient: "Luiza Furley",
      age: "33 anos",
      birth: "22/11/1992",
      record: "10293",
      room: "SALA 03",
      procedure: "Hernioplastia Inguinal",
      status: "waiting",
      date: "2026-03-21",
      time: "11:00",
      isAllergy: true
    }
  ];

  constructor() {}

  get filteredProcedures() {
    return this.procedures.filter(p => {
      const matchSearch = p.patient.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                         p.record.includes(this.searchQuery) ||
                         p.procedure.toLowerCase().includes(this.searchQuery.toLowerCase());
      
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
