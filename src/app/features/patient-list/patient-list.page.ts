import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SurgeryService } from '../../core/services/surgery.service';
import { PatientResponse } from '../../shared/models/patient.model';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { DateFilterComponent } from '../../shared/components/date-filter/date-filter.component';
import { ProcedureCardComponent } from '../../shared/components/procedure-card/procedure-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.page.html',
  styleUrls: ['./patient-list.page.scss'],
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
export class PatientListPage {
  searchQuery = '';
  selectedStatus = 'all';
  selectedDate = '2026-04-21';
  isRefreshing = false;

  viewList: any[] = [];

  constructor(
    private datePipe: DatePipe,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private surgeryService: SurgeryService
  ) {
    this.loadData();
  }

  loadData() {
    this.isRefreshing = true;
    const statusMap: any = { 'waiting': '0', 'completed': '1', 'all': null };
    const statusValue = statusMap[this.selectedStatus];

    this.surgeryService.getSurgeries(this.selectedDate, statusValue).subscribe({
      next: (response) => {
        this.flattenData(response);
        this.isRefreshing = false;
      },
      error: () => {
        this.isRefreshing = false;
        // Poderia adicionar um toast de erro aqui
      }
    });
  }

  flattenData(response: PatientResponse) {
    this.viewList = [];
    response.data.forEach(patient => {
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
    this.loadData();
  }

  onDateChange(newDate: string) {
    this.selectedDate = newDate;
    this.loadData();
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
    this.router.navigate(['/ficha-anestesica', id]);
  }

  onViewRegistro(id: number) {
    this.router.navigate(['/registro-cirurgia', id]);
  }

  /**
   * FA-038 - Refresh manual da lista
   */
  handleRefresh() {
    if (this.isRefreshing) return;
    this.loadData();
  }
}
