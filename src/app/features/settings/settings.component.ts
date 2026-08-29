import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  IonIcon,
  IonSpinner,
  IonModal,
  IonCheckbox,
  ToastController,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  settingsOutline, saveOutline, languageOutline, timerOutline, serverOutline,
  cloudOutline, businessOutline, lockClosedOutline, shieldCheckmarkOutline,
  refreshOutline, checkmarkCircleOutline, eyeOutline, eyeOffOutline,
  personCircleOutline, keyOutline, closeOutline, informationCircleOutline,
  linkOutline, globeOutline,
} from 'ionicons/icons';

import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { ApiUrlService } from '../../core/services/api-url.service';
import { HeaderActionButton } from '../../shared/components/header-institucional/header-action-button.model';
import {
  InstitutionSettingsCommand,
  UserSettingsCommand,
  UserSettingsDto,
} from '../../shared/models/settings.model';

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  admin: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonIcon,
    IonSpinner,
    IonModal,
    IonCheckbox,
    HeaderInstitucionalComponent,
    StatusBarComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingComponent implements OnInit {
  isAdminUser = false;
  loading = true;

  form!: FormGroup;
  saving = false;
  savedAt: Date | null = null;
  activeSection = 'geral';

  showAssinatura = false;
  aceiteAssinatura = false;
  senhaAssinatura = '';
  mostrarSenha = false;

  testing: Record<string, 'idle' | 'running' | 'ok' | 'fail'> = {
    siga: 'idle',
    aghu: 'idle',
  };

  readonly idiomas = [
    { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
    { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { value: 'es-ES', label: 'Español', flag: '🇪🇸' },
  ];

  readonly intervalos = [1, 3, 5, 10, 15];

  readonly sections: SettingsSection[] = [
    { id: 'geral', title: 'Preferências gerais', icon: 'language-outline', admin: false },
    { id: 'afericao', title: 'Aferição automática', icon: 'timer-outline', admin: false },
    { id: 'servidor', title: 'Servidor SIGA (dispositivo)', icon: 'globe-outline', admin: true },
    { id: 'integracoes', title: 'Integrações e APIs', icon: 'server-outline', admin: true },
    { id: 'seguranca', title: 'Segurança (SIGA)', icon: 'lock-closed-outline', admin: true },
    { id: 'hospital', title: 'Dados do hospital', icon: 'business-outline', admin: true },
  ];

  constructor(
    private fb: FormBuilder,
    private toast: ToastController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private apiUrlService: ApiUrlService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      settingsOutline, saveOutline, languageOutline, timerOutline, serverOutline,
      cloudOutline, businessOutline, lockClosedOutline, shieldCheckmarkOutline,
      refreshOutline, checkmarkCircleOutline, eyeOutline, eyeOffOutline,
      personCircleOutline, keyOutline, closeOutline, informationCircleOutline,
      linkOutline, globeOutline,
    });
  }

  ngOnInit(): void {
    this.isAdminUser = this.authService.isAdmin();

    this.form = this.fb.group({
      idioma: ['pt-BR', Validators.required],
      // Intervalo pessoal (usuário) — herda do institucional
      intervaloAfericao: [5, [Validators.required, Validators.min(1), Validators.max(60)]],
      usarIntervaloInstitucional: [true],

      // ADMIN
      intervaloInstitucional: [5, [Validators.min(1), Validators.max(60)]],
      urlSiga: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      urlAghu: ['', [Validators.pattern(/^https?:\/\/.+/)]],

      hospital: this.fb.group({
        nome: ['Hospital Universitário Antônio Pedro'],
        setor: ['Centro Cirúrgico — Anestesiologia'],
        cnpj: [''],
        cep: [''],
        logradouro: [''],
        numero: [''],
        bairro: [''],
        cidade: ['Niterói'],
        uf: ['RJ'],
      }),

      senhaAdmin: this.fb.group({
        atual: [''],
        nova: [''],
        confirmar: [''],
      }),
    });

    this.loadSettings();

    this.form.get('usarIntervaloInstitucional')!.valueChanges.subscribe((v) => {
      if (v) {
        this.form
          .get('intervaloAfericao')!
          .setValue(this.form.get('intervaloInstitucional')!.value, { emitEvent: false });
      }
    });
  }

  // ---------- helpers ----------

  get isAdmin(): boolean {
    return this.isAdminUser;
  }

  get servidorSigaAtual(): string {
    return this.apiUrlService.getRawUrl() ?? 'Não configurado';
  }

  alterarServidor(): void {
    this.router.navigate(['/configurar-servidor'], { queryParams: { redirect: '/settings' } });
  }

  get visibleSections(): SettingsSection[] {
    return this.sections.filter((s) => !s.admin || this.isAdmin);
  }

  get headerActionButtons(): HeaderActionButton[] {
    return [
      {
        id: 'salvar-config',
        icon: 'save-outline',
        color: 'primary',
        ariaLabel: 'Salvar configurações',
        label: 'Salvar',
        disabled: this.saving || this.loading,
        action: () => this.abrirAssinatura(),
      },
    ];
  }

  scrollTo(id: string): void {
    this.activeSection = id;
    document.getElementById('sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setIdioma(v: string): void {
    this.form.get('idioma')!.setValue(v);
  }

  setIntervalo(control: string, v: number): void {
    this.form.get(control)!.setValue(v);
  }

  get senhaValida(): boolean {
    const g = this.form.get('senhaAdmin')!.value;
    if (!g.atual && !g.nova && !g.confirmar) return true; // não está trocando
    return !!g.atual && !!g.nova && g.nova.length >= 6 && g.nova === g.confirmar;
  }

  get senhaMensagem(): string | null {
    const g = this.form.get('senhaAdmin')!.value;
    if (!g.atual && !g.nova && !g.confirmar) return null;
    if (!g.atual) return 'Informe a senha atual.';
    if (!g.nova || g.nova.length < 6) return 'A nova senha deve ter ao menos 6 caracteres.';
    if (g.nova !== g.confirmar) return 'A confirmação não confere com a nova senha.';
    return null;
  }

  formatCnpj(): void {
    const c = this.form.get('hospital.cnpj')!;
    const d = String(c.value ?? '').replace(/\D/g, '').slice(0, 14);
    const out = d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
    c.setValue(out, { emitEvent: false });
  }

  // ---------- conexão ----------

  async testarConexao(alvo: 'siga' | 'aghu'): Promise<void> {
    const url = alvo === 'siga' ? this.form.value.urlSiga : this.form.value.urlAghu;
    if (!url) {
      this.testing[alvo] = 'fail';
      return;
    }
    this.testing[alvo] = 'running';
    try {
      // Substituir pelo endpoint real de health-check do backend
      await new Promise((r) => setTimeout(r, 900));
      this.testing[alvo] = 'ok';
    } catch {
      this.testing[alvo] = 'fail';
    }
  }


  private loadSettings(): void {
    this.loading = true;
    this.settingsService.get().subscribe({
      next: (dto) => {
        this.isAdminUser = dto.isAdmin;
        this.applyDto(dto);
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        await this.toastMsg('Não foi possível carregar as configurações.', 'danger');
      },
    });
  }

  private applyDto(dto: UserSettingsDto): void {
    this.form.patchValue(
      {
        idioma: dto.language,
        intervaloAfericao: dto.monitoringIntervalMinutes,
        usarIntervaloInstitucional: dto.useInstitutionalInterval,
        intervaloInstitucional: dto.institutionalMonitoringIntervalMinutes,
      },
      { emitEvent: false },
    );

    if (dto.institution) {
      this.form.patchValue(
        {
          urlSiga: dto.institution.sigaApiUrl ?? '',
          urlAghu: dto.institution.aghuApiUrl ?? '',
          hospital: {
            nome: dto.institution.hospitalName ?? '',
            setor: dto.institution.hospitalSector ?? '',
            cnpj: dto.institution.hospitalCnpj ?? '',
            cep: dto.institution.hospitalCep ?? '',
            logradouro: dto.institution.hospitalStreet ?? '',
            numero: dto.institution.hospitalNumber ?? '',
            bairro: dto.institution.hospitalNeighborhood ?? '',
            cidade: dto.institution.hospitalCity ?? '',
            uf: dto.institution.hospitalState ?? '',
          },
        },
        { emitEvent: false },
      );
    }
  }

  abrirAssinatura(): void {
    if (!this.senhaValida) {
      this.toastMsg('Revise os campos de senha antes de salvar.', 'danger');
      this.scrollTo('seguranca');
      return;
    }
    this.aceiteAssinatura = false;
    this.senhaAssinatura = '';
    this.showAssinatura = true;
  }

  fecharAssinatura(): void {
    this.showAssinatura = false;
  }

  onAceiteAssinaturaChange(checked: boolean): void {
    this.aceiteAssinatura = checked;   
    this.cdr.detectChanges();
  }

  async confirmarSalvar(): Promise<void> {
    if (!this.aceiteAssinatura || this.senhaAssinatura.trim().length < 4) return;
    this.showAssinatura = false;
    this.saving = true;

    const v = this.form.getRawValue();

    try {
      const userCommand: UserSettingsCommand = {
        language: v.idioma,
        monitoringIntervalMinutes: v.usarIntervaloInstitucional
          ? v.intervaloInstitucional
          : v.intervaloAfericao,
        useInstitutionalInterval: v.usarIntervaloInstitucional,
      };

      let dto = await firstValueFrom(this.settingsService.updateUserSettings(userCommand));

      if (this.isAdmin) {
        const institutionCommand: InstitutionSettingsCommand = {
          monitoringIntervalMinutes: v.intervaloInstitucional,
          sigaApiUrl: (v.urlSiga || '').trim().replace(/\/+$/, '') || null,
          aghuApiUrl: (v.urlAghu || '').trim().replace(/\/+$/, '') || null,
          hospitalName: v.hospital.nome,
          hospitalSector: v.hospital.setor || null,
          hospitalCnpj: (v.hospital.cnpj || '').replace(/\D/g, '') || null,
          hospitalCep: (v.hospital.cep || '').replace(/\D/g, '') || null,
          hospitalStreet: v.hospital.logradouro || null,
          hospitalNumber: v.hospital.numero || null,
          hospitalNeighborhood: v.hospital.bairro || null,
          hospitalCity: v.hospital.cidade,
          hospitalState: v.hospital.uf,
        };

        dto = await firstValueFrom(this.settingsService.updateInstitutionSettings(institutionCommand));

        if (v.senhaAdmin.atual && v.senhaAdmin.nova) {
          await firstValueFrom(
            this.settingsService.changeAdminPassword({
              currentPassword: v.senhaAdmin.atual,
              newPassword: v.senhaAdmin.nova,
            }),
          );
        }
      }

      this.applyDto(dto);
      this.form.get('senhaAdmin')!.reset({ atual: '', nova: '', confirmar: '' });
      this.savedAt = new Date();
      await this.toastMsg('Configurações salvas com sucesso.', 'success');
    } catch (err: any) {
      const message = err?.error?.message || 'Não foi possível salvar. Tente novamente.';
      await this.toastMsg(message, 'danger');
    } finally {
      this.saving = false;
      this.senhaAssinatura = '';
    }
  }

  private async toastMsg(message: string, color: 'success' | 'danger'): Promise<void> {
    const t = await this.toast.create({ message, duration: 2400, color, position: 'top' });
    await t.present();
  }
}
