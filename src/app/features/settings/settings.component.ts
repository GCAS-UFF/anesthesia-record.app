import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';

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
  cloudOutline, businessOutline, shieldCheckmarkOutline,
  refreshOutline, checkmarkCircleOutline, closeCircleOutline, eyeOutline, eyeOffOutline,
  personCircleOutline, keyOutline, closeOutline, informationCircleOutline,
  linkOutline,
} from 'ionicons/icons';

import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { ApiUrlService } from '../../core/services/api-url.service';
import { HealthService } from '../../core/services/health.service';
import { HeaderActionButton } from '../../shared/components/header-institucional/header-action-button.model';
import {
  InstitutionSettingsCommand,
  InstitutionSettingsDto,
  UserSettingsCommand,
  UserSettingsDto,
} from '../../shared/models/settings.model';

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  admin: boolean;
}

interface AdminAccount {
  name: string;
  username: string;
  email: string;
  sector: string;
  role: string;
}

type ConnectionState = 'idle' | 'running' | 'ok' | 'fail';

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
  mostrarSenhaConta = false;

  sigaUrl = '';
  aghuUrl = '';
  testing: Record<'siga' | 'aghu', ConnectionState> = {
    siga: 'idle',
    aghu: 'idle',
  };
  healthStatus: { database: boolean; aghu: boolean } | null = null;
  institution: InstitutionSettingsDto | null = null;

  adminAccount: AdminAccount | null = null;
  passwordForm!: FormGroup;
  changingPassword = false;

  readonly idiomas = [
    { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
    { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { value: 'es-ES', label: 'Español', flag: '🇪🇸' },
  ];

  readonly intervalos = [1, 3, 5, 10, 15];

  readonly sections: SettingsSection[] = [
    { id: 'geral', title: 'Preferências gerais', icon: 'language-outline', admin: false },
    { id: 'afericao', title: 'Aferição automática', icon: 'timer-outline', admin: false },
    { id: 'integracoes', title: 'Integrações e APIs', icon: 'server-outline', admin: true },
    { id: 'admin-conta', title: 'Conta ADMIN', icon: 'person-circle-outline', admin: true },
    { id: 'hospital', title: 'Dados do hospital', icon: 'business-outline', admin: true },
  ];

  constructor(
    private fb: FormBuilder,
    private toast: ToastController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private apiUrlService: ApiUrlService,
    private healthService: HealthService,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      settingsOutline, saveOutline, languageOutline, timerOutline, serverOutline,
      cloudOutline, businessOutline, shieldCheckmarkOutline,
      refreshOutline, checkmarkCircleOutline, closeCircleOutline, eyeOutline, eyeOffOutline,
      personCircleOutline, keyOutline, closeOutline, informationCircleOutline,
      linkOutline,
    });
  }

  ngOnInit(): void {
    this.isAdminUser = this.authService.isAdmin();
    this.sigaUrl = this.apiUrlService.getRawUrl() ?? '';
    this.loadAdminAccount();

    this.form = this.fb.group({
      idioma: ['pt-BR', Validators.required],
      // Intervalo pessoal (usuário) — herda do institucional
      intervaloAfericao: [5, [Validators.required, Validators.min(1), Validators.max(60)]],
      usarIntervaloInstitucional: [true],

      // ADMIN
      intervaloInstitucional: [5, [Validators.min(1), Validators.max(60)]],

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
    });

    this.passwordForm = this.fb.group({
      atual: ['', Validators.required],
      nova: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', Validators.required],
    });

    this.loadSettings();
    this.refreshHealthStatus();

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


  get sigaStatusLabel(): 'ok' | 'fail' | 'unknown' {
    if (this.testing.siga === 'ok') return 'ok';
    if (this.testing.siga === 'fail') return 'fail';
    if (this.healthStatus) return this.healthStatus.database ? 'ok' : 'fail';
    return 'unknown';
  }

  get aghuStatusLabel(): 'ok' | 'fail' | 'unknown' {
    if (this.testing.aghu === 'ok') return 'ok';
    if (this.testing.aghu === 'fail') return 'fail';
    if (this.healthStatus) return this.healthStatus.aghu ? 'ok' : 'fail';
    return 'unknown';
  }

  async testarConexao(alvo: 'siga' | 'aghu'): Promise<void> {
    const raw = (alvo === 'siga' ? this.sigaUrl : this.aghuUrl || '').trim();

    if (!raw) {
      this.testing[alvo] = 'fail';
      return;
    }

    this.testing[alvo] = 'running';

    try {
      if (alvo === 'siga') {
        await firstValueFrom(this.healthService.checkHealthAt(raw));
        this.apiUrlService.setUrl(raw);
        this.sigaUrl = this.apiUrlService.getRawUrl() ?? raw;
        this.testing.siga = 'ok';
        await this.toastMsg('Conexão com a API SIGA validada e salva neste dispositivo.', 'success');
      } else {
        const result = await firstValueFrom(this.settingsService.testAghuConnection({ aghuBaseUrl: raw }));

        if (!result.connected) {
          this.testing.aghu = 'fail';
          return;
        }

        const command = this.buildInstitutionCommand({ aghuApiUrl: raw.replace(/\/+$/, '') });
        const dto = await firstValueFrom(this.settingsService.updateInstitutionSettings(command));

        this.institution = dto.institution;
        this.aghuUrl = dto.institution?.aghuApiUrl ?? raw;
        this.testing.aghu = 'ok';
        await this.toastMsg('Conexão com o AGHU validada e salva.', 'success');
      }
    } catch {
      this.testing[alvo] = 'fail';
      if (alvo === 'aghu') {
        await this.toastMsg('Não foi possível conectar ao AGHU. A configuração anterior foi mantida.', 'danger');
      }
    }
  }

  private buildInstitutionCommand(overrides: Partial<InstitutionSettingsCommand>): InstitutionSettingsCommand {
    const base = this.institution;

    return {
      monitoringIntervalMinutes: base?.monitoringIntervalMinutes ?? this.form?.value.intervaloInstitucional ?? 5,
      sigaApiUrl: base?.sigaApiUrl ?? null,
      aghuApiUrl: base?.aghuApiUrl ?? null,
      hospitalName: base?.hospitalName ?? 'Hospital Universitário Antônio Pedro',
      hospitalSector: base?.hospitalSector ?? null,
      hospitalCnpj: base?.hospitalCnpj ?? null,
      hospitalCep: base?.hospitalCep ?? null,
      hospitalStreet: base?.hospitalStreet ?? null,
      hospitalNumber: base?.hospitalNumber ?? null,
      hospitalNeighborhood: base?.hospitalNeighborhood ?? null,
      hospitalCity: base?.hospitalCity ?? 'Niterói',
      hospitalState: base?.hospitalState ?? 'RJ',
      ...overrides,
    };
  }

  private refreshHealthStatus(): void {
    this.healthService
      .checkHealth()
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.healthStatus = res?.data
          ? { database: !!res.data.database, aghu: !!res.data.aghu }
          : null;
      });
  }


  private loadAdminAccount(): void {
    const user = this.authService.getUser();

    if (!user) return;

    this.adminAccount = {
      name: user.name,
      username: user.username,
      email: user.email,
      sector: user.sector,
      role: user.role,
    };
  }

  get passwordMismatch(): boolean {
    const v = this.passwordForm?.value ?? {};
    return !!v.nova && !!v.confirmar && v.nova !== v.confirmar;
  }

  async alterarSenha(): Promise<void> {
    if (this.passwordForm.invalid || this.passwordMismatch) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.changingPassword = true;
    const v = this.passwordForm.value;

    try {
      await firstValueFrom(
        this.settingsService.changeAdminPassword({
          currentPassword: v.atual,
          newPassword: v.nova,
        }),
      );

      this.passwordForm.reset();
      await this.toastMsg('Senha atualizada com sucesso.', 'success');
    } catch (err: any) {
      const message = err?.error?.message || 'Não foi possível alterar a senha. Verifique a senha atual.';
      await this.toastMsg(message, 'danger');
    } finally {
      this.changingPassword = false;
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

    this.institution = dto.institution;

    if (dto.institution) {
      this.aghuUrl = dto.institution.aghuApiUrl ?? '';

      this.form.patchValue(
        {
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
        const institutionCommand = this.buildInstitutionCommand({
          monitoringIntervalMinutes: v.intervaloInstitucional,
          hospitalName: v.hospital.nome,
          hospitalSector: v.hospital.setor || null,
          hospitalCnpj: (v.hospital.cnpj || '').replace(/\D/g, '') || null,
          hospitalCep: (v.hospital.cep || '').replace(/\D/g, '') || null,
          hospitalStreet: v.hospital.logradouro || null,
          hospitalNumber: v.hospital.numero || null,
          hospitalNeighborhood: v.hospital.bairro || null,
          hospitalCity: v.hospital.cidade,
          hospitalState: v.hospital.uf,
        });

        dto = await firstValueFrom(this.settingsService.updateInstitutionSettings(institutionCommand));
      }

      this.applyDto(dto);
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
