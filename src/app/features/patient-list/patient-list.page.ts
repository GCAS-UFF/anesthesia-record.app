import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AlertController, LoadingController, ToastController } from '@ionic/angular/standalone';
import { IonContent, IonSpinner, IonSkeletonText, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, checkmarkCircle } from 'ionicons/icons';
import { Router } from '@angular/router';
import { SurgeryService } from '../../core/services/surgery.service';
import { AuthService } from '../../core/services/auth.service';
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
    IonSpinner,
    IonSkeletonText,
    IonIcon,
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
export class PatientListPage implements OnInit {
  searchQuery = '';
  selectedStatus = 'all';
  selectedDate = '2026-04-21';
  isRefreshing = false;
  viewList: any[] = [];

  // Paginação
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  @ViewChild(IonContent, { static: false }) content!: IonContent;

  constructor(
    private datePipe: DatePipe,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private surgeryService: SurgeryService,
    private authService: AuthService
  ) {
    addIcons({ chevronBackOutline, chevronForwardOutline, checkmarkCircle });
  }

  ngOnInit() {
    // Carregamento inicial movido para o ngOnInit
    this.loadData();
  }

  async loadData() {
    this.isRefreshing = true;
    this.viewList = []; // Limpa a lista para mostrar o skeleton

    // Spinner e skeleton já são controlados por isRefreshing.
    // O LoadingController (modal) foi removido para evitar travamentos silenciosos em produção.

    // Rola para o topo ao carregar novos dados
    if (this.content) {
      this.content.scrollToTop(400);
    }

    // Fetch all for the date and filter in frontend to ensure reliability
    this.surgeryService.getSurgeries(this.selectedDate, undefined, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.totalItems = response.totalItems;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.flattenData(response);
        this.isRefreshing = false;
      },
      error: () => {
        this.isRefreshing = false;
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
          patientId: patient.id, // <-- ADICIONADO
          patientName: patient.fullName,
          age: patient.age,
          birthDate: patient.birthDate,
          record: patient.medicalRecordNumber,
          room: surgery.location.room,
          procedure: (primaryProc && primaryProc.description && primaryProc.description !== 'Não informado') 
                     ? primaryProc.description 
                     : 'Procedimento não informado',
          status: surgery.status === 3 ? 'completed' : 'waiting',
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
    this.currentPage = 1; // Reset para primeira página ao mudar filtro
    this.loadData();
  }

  onDateChange(newDate: string) {
    this.selectedDate = newDate;
    this.currentPage = 1; // Reset para primeira página ao mudar filtro
    this.loadData();
  }

  // Métodos de Navegação
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadData();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadData();
    }
  }

  async onAssume(surgeryId: number, patientId: string) {
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

            // Pega o ID do médico logado dinamicamente do AuthService
            const doctorId = this.authService.getCurrentUserId();

            this.surgeryService.assumePatient(patientId, doctorId).subscribe({
              next: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Paciente assumido com sucesso!',
                  duration: 2000,
                  color: 'success',
                  icon: 'checkmark-circle'
                });
                await toast.present();
                this.onOpenMonitorizacao(surgeryId);
              },
              error: async () => {
                await loading.dismiss();
                // Se der erro (ex: backend offline), mocka o sucesso
                const toast = await this.toastController.create({
                  message: 'Paciente assumido offline (Mock).',
                  duration: 2000,
                  color: 'warning'
                });
                await toast.present();
                this.onOpenMonitorizacao(surgeryId);
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  onOpenMonitorizacao(id: number) {
    this.router.navigate(['/monitorizacao', id]);
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
