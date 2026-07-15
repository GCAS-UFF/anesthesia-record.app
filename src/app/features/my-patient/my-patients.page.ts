import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ToastController } from '@ionic/angular/standalone';
import { IonContent, IonSpinner, IonSkeletonText, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  checkmarkCircle,
  searchOutline,
  refreshOutline,
  pulseOutline,
  documentTextOutline,
  medicalOutline,
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { SurgeryService } from '../../core/services/surgery.service';
import { AuthService } from '../../core/services/auth.service';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { DateFilterComponent } from '../../shared/components/date-filter/date-filter.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SurgeryStatusEnum } from 'src/app/core/models/api-enums.model';

type MyPatientStatusFilter = 'all' | 'inProgress' | 'completed';

@Component({
  selector: 'app-my-patients',
  templateUrl: './my-patients.page.html',
  styleUrls: ['./my-patients.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonSpinner,
    IonSkeletonText,
    IonIcon,
    StatusBarComponent,
    HeaderInstitucionalComponent,
    DateFilterComponent,
    EmptyStateComponent,
  ],
  providers: [DatePipe],
})
export class MyPatientsPage implements OnInit {
  searchQuery = '';
  selectedStatus: MyPatientStatusFilter = 'all';
  selectedDate = new Date().toISOString().split('T')[0];
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
      pulseOutline,
      documentTextOutline,
      medicalOutline,
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

    const doctorId = this.authService.getCurrentUserId();

    let apiStatus: SurgeryStatusEnum | null = null;

    switch (this.selectedStatus) {
      case 'inProgress':
        apiStatus = SurgeryStatusEnum.EmProgresso;
        break;
      case 'completed':
        apiStatus = SurgeryStatusEnum.Concluido;
        break;
      case 'all':
      default:
        apiStatus = null;
        break;
    }

    this.surgeryService.getMyPatients(doctorId, this.selectedDate, this.searchQuery || undefined, apiStatus,
      this.currentPage, this.pageSize).subscribe({
        next: (response: any) => {
          const resultData = response.data || response;
          this.flattenData(resultData);
          this.applyStatusFilter();
          this.sortInProgressFirst();
          this.isRefreshing = false;
        },
        error: async () => {
          this.isRefreshing = false;
          const toast = await this.toastController.create({
            message: 'Falha ao carregar seus pacientes.',
            duration: 2500,
            color: 'danger',
          });
          await toast.present();
        },
      });
  }

  isMonitorizable(status: SurgeryStatusEnum | null): boolean {
    if (status == null)
      return false;

    return [
      SurgeryStatusEnum.Agendado,
      SurgeryStatusEnum.EmPreparacao,
      SurgeryStatusEnum.EmProgresso
    ].includes(status);
  }

  canGoToMonitorizacao(status: SurgeryStatusEnum | null): boolean {    
    if (status == null)
      return false;

    return this.isMonitorizable(status);
  }

  getMonitorizacaoButtonText(status: SurgeryStatusEnum | null): string {
    switch (status) {
      case SurgeryStatusEnum.EmProgresso:
        return 'Continuar Monitorização';
      case SurgeryStatusEnum.EmPreparacao:
        return 'Iniciar Monitorização';
      case SurgeryStatusEnum.Agendado:
        return 'Acessar Monitorização';
      default:
        return 'Monitorização';
    }
  }

  flattenData(response: any) {
    this.viewList = [];
    const dataArray = response.data || [];
    this.totalItems = response.totalItems;

    dataArray.forEach((item: any) => {
      const primaryProc =
        item.procedures?.find((p: any) => p.isPrimary) || item.procedures?.[0];
      const dt = new Date(item.expectedAt || item.surgeryDate || new Date());

      let completedTime: string | null = null;
      if (item.status === 3) {
        const endDt = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
        completedTime = this.datePipe.transform(endDt, 'HH:mm');
      }

      const status =
        item.status === 0 ? SurgeryStatusEnum.Agendado :
          item.status === 1 ? SurgeryStatusEnum.EmPreparacao :
            item.status === 2 ? SurgeryStatusEnum.EmProgresso :
              item.status === 3 ? SurgeryStatusEnum.Concluido :
                item.status === 4 ? SurgeryStatusEnum.Cancelada : null;

      this.viewList.push({
        id: item.surgeryId || item.id,
        patientId: item.patientId || item.id,
        patientName: item.fullName,
        age: item.age,
        birthDate: item.birthDate,
        record: item.medicalRecordNumber || item.record,
        room: item.room || item.location?.room || '',
        procedure:
          primaryProc && primaryProc.description && primaryProc.description !== 'Não informado'
            ? primaryProc.description
            : 'Procedimento não informado',
        status,
        date: this.datePipe.transform(dt, 'yyyy-MM-dd'),
        time: this.datePipe.transform(dt, 'HH:mm'),
        completedAt: completedTime,
      });
    });
  }

  private applyStatusFilter() {
    if (this.selectedStatus === 'all')
      return;

    this.viewList = this.viewList.filter((p) => {

      if (this.selectedStatus === 'inProgress') {
        return (
          p.status === SurgeryStatusEnum.EmPreparacao ||
          p.status === SurgeryStatusEnum.EmProgresso
        );
      }
      return p.status === SurgeryStatusEnum.Concluido;
    });
  }

  private sortInProgressFirst() {
    const rank = (s: any): number => {
      if (s === SurgeryStatusEnum.EmProgresso)
        return 0;
      if (s === SurgeryStatusEnum.EmPreparacao)
        return 1;
      if (s === SurgeryStatusEnum.Agendado)
        return 2;
      if (s === SurgeryStatusEnum.Concluido)
        return 3;

      return 4;
    };
    this.viewList.sort((a, b) => rank(a.status) - rank(b.status));
  }

  onSearchChange(searchTerm: string) {
    this.searchQuery = searchTerm;
    if (this.searchQuery.length > 3 || this.searchQuery.length === 0) {
      this.loadData();
    }
  }

  changeStatus(status: MyPatientStatusFilter) {
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

  onOpenMonitorizacao(id: string | number) {
    this.router.navigate(['/monitorizacao', id]);
  }

  onOpenFicha(id: string | number, patientId: string) {
    this.router.navigate(['/ficha-anestesica', id, patientId]);
  }

  handleRefresh() {
    if (this.isRefreshing) return;
    this.loadData();
  }
}