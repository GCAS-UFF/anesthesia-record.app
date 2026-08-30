import { Component, ViewChild, OnInit, Input, NgZone } from '@angular/core';
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
import { AnesthesiaRecordService } from '../../core/services/anesthesia-record.service';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { DateFilterComponent } from '../../shared/components/date-filter/date-filter.component';
import { ProcedureCardComponent } from '../../shared/components/procedure-card/procedure-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SurgeryStatusEnum } from 'src/app/core/models/api-enums.model';
import { MasterDataService } from 'src/app/core/services/master-data.service';
import { firstValueFrom } from 'rxjs';

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
  isLoading = true;
  viewList: any[] = [];
  readonly SurgeryStatusEnum = SurgeryStatusEnum;
  currentUserId: number | null = null;
  canAssumePatient = true;
  isAdminUser = false;

  private userSubscription?: any;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  openCardId: string | number | null = null;

  @ViewChild(IonContent, { static: false }) content!: IonContent;

  constructor(
    private datePipe: DatePipe,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private surgeryService: SurgeryService,
    private authService: AuthService,
    private anesthesiaRecordService: AnesthesiaRecordService,
    private masterDataService: MasterDataService,
    private ngZone: NgZone
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
    this.isAdminUser = this.authService.isAdmin();
    this.ensureMasterData();
  }

  ionViewWillEnter() {
    this.ngZone.run(() => this.loadData());
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  private async ensureMasterData() {
    if (this.masterDataService.hasCache())
      return;

    const loading = await this.loadingController.create({
      spinner: 'crescent',
      message: 'Baixando medicamentos, profissionais e procedimentos...',
      backdropDismiss: false
    });

    await loading.present();

    try {

      const result = await firstValueFrom(
        this.masterDataService.downloadMasterData()
      );

      this.masterDataService.saveProfessionals(result.professionals);
      this.masterDataService.saveProcedures(result.procedures);
      this.masterDataService.saveMedications(result.medications);
      this.masterDataService.saveEvents(result.events);

    } finally {
      await loading.dismiss();
    }
  }

  async loadData() {
    this.isRefreshing = true;
    this.isLoading = true;
    this.viewList = [];
    this.currentUserId = Number(this.authService.getCurrentUserId());

    if (this.content) {
      this.content.scrollToTop(400);
    }

    this.surgeryService
      .getSurgeries(
        this.currentUserId,
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
          this.anesthesiaRecordService.cleanupStalePreAnesthesiaData(
            this.viewList.map(v => ({ id: v.id, status: v.status }))
          );
          this.canAssumePatient = this.isAdminUser ? false : resultData.canAssumePatient;
          this.isRefreshing = false;
          this.isLoading = false;
        },
        error: () => {
          this.isRefreshing = false;
          this.isLoading = false;
        },
      });
  }

  isCurrentUserFirstAnesthesiologist(procedure: any): boolean {
    if (!procedure.anesthesiologist)
      return false;

    return procedure.anesthesiologist.id === this.currentUserId;
  }

  isUserAssignedToThisPatient(procedure: any): boolean {
    if (!procedure?.anesthesiologist?.id)
      return false;

    return procedure.anesthesiologist.id === this.currentUserId;
  }

  isCurrentUserAssigned(procedure: any): boolean {
    if (!procedure.anesthesiologist?.id)
      return false;

    return procedure.anesthesiologist.id === this.currentUserId;
  }

  flattenData(response: any) {
    this.viewList = [];
    const dataArray = response.data || [];

    dataArray.forEach((item: any) => {
      const primaryProc =
        item.procedures?.find((p: any) => p.isPrimary) || item.procedures?.[0];
      const dt = new Date(item.expectedAt || item.surgeryDate || new Date());

      let completedTime = null;
      if (item.status === SurgeryStatusEnum.EmPreparacao || item.status === SurgeryStatusEnum.Concluido) {
        const endDt = new Date(dt.getTime() + 2 * 60 * 60 * 1000);
        completedTime = this.datePipe.transform(endDt, 'HH:mm');
      }

      this.viewList.push({
        id: item.surgeryId || item.id,
        patientId: item.patientId || item.id,
        patientName: item.fullName,
        age: item.age,
        surgeryDate: this.datePipe.transform(dt, 'yyyy-MM-dd'),
        birthDate: item.birthDate,
        record: item.medicalRecordNumber || item.record,
        room: item.room || item.location?.room || '',
        surgicalCenter: item.location?.surgicalCenter?.description || '',
        bed: item.currentLocation?.bed || '',
        floor: item.currentLocation?.floor || '',
        anesthesiologist: item.firstAnesthesiologist || null,
        unit: item.currentLocation?.unit?.description || '',
        procedure:
          primaryProc && primaryProc.description && primaryProc.description !== 'Não informado'
            ? primaryProc.description
            : 'Procedimento não informado',
        status: item.status === SurgeryStatusEnum.Agendado ? SurgeryStatusEnum.Agendado : item.status === SurgeryStatusEnum.EmPreparacao ? SurgeryStatusEnum.EmPreparacao : item.status === SurgeryStatusEnum.EmProgresso ? SurgeryStatusEnum.EmProgresso : item.status === SurgeryStatusEnum.Concluido ? SurgeryStatusEnum.Concluido : item.status === SurgeryStatusEnum.Cancelada ? SurgeryStatusEnum.Cancelada : null,
        date: this.datePipe.transform(dt, 'yyyy-MM-dd'),
        time: this.datePipe.transform(dt, 'HH:mm'),
        completedAt: completedTime,
        isPreAnesthesiaRecordDone: item.isPreAnesthesiaRecordDone || false,
      });
    });

    this.viewList.sort((a, b) => {
      const aMine = this.isMyActivePatient(a) ? 1 : 0;
      const bMine = this.isMyActivePatient(b) ? 1 : 0;
      return bMine - aMine;
    });
  }

  private isMyActivePatient(item: any): boolean {
    if (item.anesthesiologist?.id !== this.currentUserId) return false;
    return item.status !== SurgeryStatusEnum.Concluido && item.status !== SurgeryStatusEnum.Cancelada;
  }

  onSearchChange(searchTerm: string) {
    this.searchQuery = searchTerm;
    if (this.searchQuery.length > 3 || this.searchQuery.length === 0) {
      this.viewList = [];
      this.loadData();
    }
  }

  changeStatus(status: SurgeryStatusEnum | null) {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.viewList = [];
    this.loadData();
  }

  onDateChange(newDate: string) {
    this.selectedDate = newDate;
    this.currentPage = 1;
    this.viewList = [];
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

  async onAssume(surgeryId: string | number, patientId: string, isAlreadyAssigned: boolean = false) {
    if (this.isAdminUser) {
      return;
    }

    if (isAlreadyAssigned) {
      this.onOpenMonitorizacao(surgeryId);
      return;
    }

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
                this.onOpenPreAnesthesia(surgeryId, patientId);
              },
              error: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Falha de comunicação com a API. Não foi possível assumir o paciente.',
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

  onViewRegistro(id: string | number, patientId: string) {
    this.router.navigate(['/ficha-anestesica', id, patientId], { queryParams: { readOnly: true } });
  }

  handleRefresh() {
    if (this.isRefreshing) return;
    this.loadData();
  }

  onOpenChange(cardId: any | number | null) {
    this.openCardId = cardId;
  }

  async abandonPatient(surgeryId: string | number, patientId: string) {
    const alert = await this.alertController.create({
      header: this.isAdminUser ? 'Remover Médico' : 'Deixar Paciente',
      message: this.isAdminUser
        ? 'Deseja realmente remover o médico responsável por este paciente?'
        : 'Deseja realmente deixar esse paciente?',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
        {
          text: 'Confirmar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: this.isAdminUser ? 'Removendo médico...' : 'Deixando paciente...',
              duration: 1000,
              spinner: 'circular',
            });
            await loading.present();

            this.surgeryService.assumePatient(patientId, Number(surgeryId), 0).subscribe({
              next: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: this.isAdminUser ? 'Médico removido com sucesso!' : 'Paciente liberado com sucesso!',
                  duration: 2000,
                  color: 'success',
                  icon: 'checkmark-circle',
                });
                await toast.present();
                this.loadData();
              },
              error: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: this.isAdminUser
                    ? 'Falha de comunicação com a API. Não foi possível remover o médico.'
                    : 'Falha de comunicação com a API. Não foi possível liberar o paciente.',
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

  onOpenPreAnesthesia(id: string | number, patientId: string): void {
    if (!id || !patientId) {
      console.error('Id da cirurgia/ficha ou Patient ID não encontrado');
      return;
    }

    this.router.navigate(['/pre-anesthesia-record', id, patientId]);
  }

  onViewPreAnesthesia(id: string | number, patientId: string): void {
    if (!id || !patientId) {
      console.error('Id da cirurgia/ficha ou Patient ID não encontrado');
      return;
    }

    this.router.navigate(['/pre-anesthesia-record', id, patientId], { queryParams: { readOnly: true } });
  }

  async onReopenFicha(surgeryId: string | number) {
    if (!this.isAdminUser) return;

    const alert = await this.alertController.create({
      header: 'Reabrir Ficha',
      message: 'Deseja reabrir esta ficha finalizada? O médico responsável poderá editar e salvar novamente.',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
        {
          text: 'Reabrir',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Reabrindo ficha...',
              duration: 1000,
              spinner: 'circular',
            });
            await loading.present();

            this.anesthesiaRecordService.reopenAnesthesiaRecord(Number(surgeryId)).subscribe({
              next: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Ficha reaberta com sucesso!',
                  duration: 2000,
                  color: 'success',
                  icon: 'checkmark-circle',
                });
                await toast.present();
                this.loadData();
              },
              error: async () => {
                await loading.dismiss();
                const toast = await this.toastController.create({
                  message: 'Falha de comunicação com a API. Não foi possível reabrir a ficha.',
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
}