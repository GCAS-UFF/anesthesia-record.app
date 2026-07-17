import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ToastController, LoadingController } from '@ionic/angular/standalone';
import { IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudDownloadOutline, medkitOutline, clipboardOutline, peopleOutline, checkmarkCircle, alertCircleOutline, refreshOutline, timeOutline, cloudDoneOutline, serverOutline, medicalOutline } from 'ionicons/icons';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { IntegrationService } from 'src/app/core/services/integration.service';
import { firstValueFrom } from 'rxjs';
import { MasterDataService } from 'src/app/core/services/master-data.service';

type IntegrationKey = 'medications' | 'employees' | 'procedures';
type IntegrationStatus = 'idle' | 'running' | 'success' | 'error';

interface IntegrationCardState {
  key: IntegrationKey;
  title: string;
  description: string;
  icon: string;
  status: IntegrationStatus;
  progress: number;
  lastSyncAt?: string;
  lastCount?: number;
  errorMessage?: string;
}

@Component({
  selector: 'app-aghu-integration',
  templateUrl: './aghu-integration.page.html',
  styleUrls: ['./aghu-integration.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonSpinner,
    IonIcon,
    StatusBarComponent,
    HeaderInstitucionalComponent,
  ],
  providers: [DatePipe],
})
export class AghuIntegrationPage implements OnDestroy, OnInit {
  cards: IntegrationCardState[] = [
    {
      key: 'medications',
      title: 'Medicamentos',
      description: 'Sincroniza o catálogo de medicamentos do AGHU (princípio ativo, apresentação, dose padrão).',
      icon: 'medkit-outline',
      status: 'idle',
      progress: 0,
    },
    {
      key: 'employees',
      title: 'Funcionários',
      description: 'Sincroniza a base de profissionais (anestesistas, cirurgiões, enfermagem) vinda do AGHU.',
      icon: 'people-outline',
      status: 'idle',
      progress: 0,
    },
    {
      key: 'procedures',
      title: 'Procedimentos',
      description: 'Sincroniza os procedimentos cirúrgicos cadastrados no AGHU para utilização no sistema.',
      icon: 'clipboard-outline',
      status: 'idle',
      progress: 0,
    },
  ];

  private timers = new Map<IntegrationKey, any>();

  constructor(private toastController: ToastController, private integrationService: IntegrationService, private datePipe: DatePipe, private masterDataService: MasterDataService, 
    private loadingController: LoadingController) {
    addIcons({
      cloudDownloadOutline,
      medkitOutline,
      peopleOutline,
      checkmarkCircle,
      alertCircleOutline,
      refreshOutline,
      timeOutline,
      cloudDoneOutline,
      serverOutline,
      medicalOutline,
      clipboardOutline
    });
  }

  ngOnInit(): void {
    this.getLastIntegration();
  }

  ngOnDestroy(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers.clear();
  }

  get isAnyRunning(): boolean {
    return this.cards.some((c) => c.status === 'running');
  }

  formatDate(iso?: string): string {
    if (!iso) return 'Nunca sincronizado';
    return this.datePipe.transform(iso, "dd/MM/yyyy 'às' HH:mm") ?? '';
  }

  async runIntegration(card: IntegrationCardState) {
    if (card.status === 'running')
      return;

    card.status = 'running';
    card.progress = 5;
    card.errorMessage = undefined;

    const timer = setInterval(() => {
      if (card.progress < 90) {
        card.progress = Math.min(90, card.progress + Math.random() * 8);
      }
    }, 400);
    this.timers.set(card.key, timer);

    try {
      let result;

      switch (card.key) {
        case 'medications':
          result = await this.integrationService.syncMedications();
          break;

        case 'employees':
          result = await this.integrationService.syncEmployees();
          break;

        case 'procedures':
          result = await this.integrationService.syncProcedures();
          break;
      }

      card.progress = 100;
      card.status = 'success';

      card.lastCount = result?.data;
      await this.getLastIntegration();

      await this.showToast(`${card.title} sincronizados com sucesso (${card.lastCount} registros).`, 'success',);
    } catch (err: any) {
      card.status = 'error';
      card.progress = 0;
      card.errorMessage =
        err?.message ?? 'Falha ao integrar com o AGHU. Tente novamente.';
      await this.showToast(card.errorMessage!, 'danger');
    } finally {
      const t = this.timers.get(card.key);
      if (t) clearInterval(t);
      this.timers.delete(card.key);
      this.updateMasterData();
    }
  }

  async runAll() {
    for (const c of this.cards) {
      if (c.status !== 'running') {
        this.runIntegration(c);
      }
    }
  }

  private async updateMasterData() {
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

    } finally {
      await loading.dismiss();
    }
  }

  async getLastIntegration() {
    try {
      const response: any = await this.integrationService.getLastIntegraionTime();

      if (!response?.valid) {
        return;
      }

      const data = response.data;

      this.cards.forEach(card => {
        switch (card.key) {
          case 'medications':
            card.lastSyncAt = data.medicines;
            break;

          case 'employees':
            card.lastSyncAt = data.professionals;
            break;

          case 'procedures':
            card.lastSyncAt = data.procedures;
            break;
        }
      });

    } catch (error) {
      console.error('Erro ao carregar última integração', error);
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'medium' = 'medium') {
    const toast = await this.toastController.create({
      message,
      duration: 2600,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
