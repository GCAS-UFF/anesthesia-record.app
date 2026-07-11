import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AlertController, LoadingController, ToastController } from '@ionic/angular/standalone';
import { IonContent, IonSpinner, IonSkeletonText, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  checkmarkCircle,
  searchOutline,
  refreshOutline,
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { SurgeryService } from '../../core/services/surgery.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { DateFilterComponent } from '../../shared/components/date-filter/date-filter.component';
import { ProcedureCardComponent } from '../../shared/components/procedure-card/procedure-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SurgeryStatusEnum } from 'src/app/core/models/api-enums.model';

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
    DateFilterComponent,
    ProcedureCardComponent,
    EmptyStateComponent,
  ],
  providers: [DatePipe],
})
export class PatientListPage implements OnInit {
  searchQuery = '';
  selectedStatus: SurgeryStatusEnum | null = null;
  selectedDate = Date.now() ? new Date().toISOString().split('T')[0] : '';
  isRefreshing = false;
  viewList: any[] = [];
  readonly SurgeryStatusEnum = SurgeryStatusEnum;

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
    private authService: AuthService,
  ) {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      checkmarkCircle,
      searchOutline,
      refreshOutline,
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isRefreshing = true;
    this.viewList = [];

    if (this.content) {
      this.content.scrollToTop(400);
    }

    this.surgeryService
      .getSurgeries(
        this.selectedDate,
        this.searchQuery || undefined,
        this.selectedStatus ?? undefined,
        this.currentPage,
        this.pageSize
      )
      .subscribe({
        next: (response: any) => {
          const resultData = response.data || response;
          this.totalItems = resultData.totalItems || 0;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
          this.flattenData(resultData);
          this.isRefreshing = false;
        },
        error: () => {
          this.isRefreshing = false;
        },
      });
  }

  flattenData(response: any) {
    this.viewList = [];
    const dataArray = response.data || [];

    dataArray.forEach((item: any) => {
      const primaryProc =
        item.procedures?.find((p: any) => p.isPrimary) || item.procedures?.[0];
      const dt = new Date(item.expectedAt || item.surgeryDate || new Date());

      let completedTime = null;
      if (item.status === 1 || item.status === 3) {
        const endDt = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
        completedTime = this.datePipe.transform(endDt, 'HH:mm');
      }

      this.viewList.push({
        id: item.surgeryId || item.id,
        patientId: item.patientId || item.id,
        patientName: item.fullName,
        age: item.age,
        birthDate: item.birthDate,
        record: item.medicalRecordNumber || item.record,
        room: item.room || item.location?.room || '',
        surgicalCenter: item.location?.surgicalCenter?.description || '',
        bed: item.currentLocation?.bed || '',
        floor: item.currentLocation?.floor || '',
        anesthesiologist: item.firstAnesthesiologist?.fullName || '',
        unit: item.currentLocation?.unit?.description || '',
        procedure:
          primaryProc && primaryProc.description && primaryProc.description !== 'Não informado'
            ? primaryProc.description
            : 'Procedimento não informado',
        status: item.status === 0 ? SurgeryStatusEnum.Agendado : item.status === 1 ? SurgeryStatusEnum.EmPreparacao : item.status === 2 ? SurgeryStatusEnum.EmProgresso : item.status === 3 ? SurgeryStatusEnum.Concluido : item.status === 4 ? SurgeryStatusEnum.Cancelada : null,
        date: this.datePipe.transform(dt, 'yyyy-MM-dd'),
        time: this.datePipe.transform(dt, 'HH:mm'),
        completedAt: completedTime,
      });
    });
  }

  onSearchChange(searchTerm: string) {
    this.searchQuery = searchTerm;
    if (this.searchQuery.length > 3 || this.searchQuery.length === 0)
      this.loadData();
  }

  changeStatus(status: SurgeryStatusEnum | null) {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.loadData();
  }

  onDateChange(newDate: string) {
    this.selectedDate = newDate;
    this.currentPage = 1;
    this.loadData();
  }

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

  async onAssume(surgeryId: string | number, patientId: string) {
    const alert = await this.alertController.create({
      header: 'Assumir Paciente',
      message: 'Deseja realmente assumir este paciente e iniciar o preparo anestésico?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
        {
          text: 'Confirmar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Assumindo paciente...',
              duration: 1000,
              spinner: 'circular',
            });
            await loading.present();

            const doctorId = this.authService.getCurrentUserId();

            this.surgeryService.assumePatient(patientId, Number(surgeryId), doctorId).subscribe({
              next: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Paciente assumido com sucesso!',
                  duration: 2000,
                  color: 'success',
                  icon: 'checkmark-circle',
                });
                await toast.present();
                this.onOpenMonitorizacao(surgeryId);
              },
              error: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message:
                    'Falha de comunicação com a API. Não foi possível assumir o paciente.',
                  duration: 3000,
                  color: 'danger',
                });
                await toast.present();
              },
            });
          },
        },
      ],
    });

    await alert.present();
  }

  onOpenMonitorizacao(id: string | number) {
    this.router.navigate(['/monitorizacao', id]);
  }

  onOpenFicha(id: string | number, patientId: string) {
    this.router.navigate(['/ficha-anestesica', id, patientId]);
  }

  onViewRegistro(id: string | number) {
    this.router.navigate(['/registro-cirurgia', id]);
  }

  handleRefresh() {
    if (this.isRefreshing) return;
    this.loadData();
  }
}