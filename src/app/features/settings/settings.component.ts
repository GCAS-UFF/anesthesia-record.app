import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

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
  linkOutline,
} from 'ionicons/icons';

import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';

export type SettingsProfile = 'usuario' | 'admin';

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  admin: boolean;
}

const STORAGE_KEY = 'huap.settings.v1';

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
  /** Perfil do usuário logado. Em produção vem do AuthService. */
  profile: SettingsProfile = 'admin';

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
    { id: 'integracoes', title: 'Integrações e APIs', icon: 'server-outline', admin: true },
    { id: 'seguranca', title: 'Segurança (SIGA)', icon: 'lock-closed-outline', admin: true },
    { id: 'hospital', title: 'Dados do hospital', icon: 'business-outline', admin: true },
  ];

  constructor(
    private fb: FormBuilder,
    private toast: ToastController,
  ) {
    addIcons({
      settingsOutline, saveOutline, languageOutline, timerOutline, serverOutline,
      cloudOutline, businessOutline, lockClosedOutline, shieldCheckmarkOutline,
      refreshOutline, checkmarkCircleOutline, eyeOutline, eyeOffOutline,
      personCircleOutline, keyOutline, closeOutline, informationCircleOutline,
      linkOutline,
    });
  }

  ngOnInit(): void {
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

    this.restore();

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
    return this.profile === 'admin';
  }

  get visibleSections(): SettingsSection[] {
    return this.sections.filter((s) => !s.admin || this.isAdmin);
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

  // ---------- persistência ----------

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.form.patchValue(JSON.parse(raw));
    } catch {
      /* ignore */
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

  buildPayload() {
    const v = this.form.getRawValue();
    return {
      perfil: this.profile,
      preferencias: {
        idioma: v.idioma,
        intervaloAfericaoMin: v.usarIntervaloInstitucional
          ? v.intervaloInstitucional
          : v.intervaloAfericao,
        usarIntervaloInstitucional: v.usarIntervaloInstitucional,
      },
      institucional: this.isAdmin
        ? {
            intervaloAfericaoMin: v.intervaloInstitucional,
            urlApiSiga: (v.urlSiga || '').trim().replace(/\/+$/, ''),
            urlApiAghu: (v.urlAghu || '').trim().replace(/\/+$/, ''),
            hospital: {
              nome: v.hospital.nome,
              setor: v.hospital.setor,
              cnpj: (v.hospital.cnpj || '').replace(/\D/g, ''),
              endereco: {
                cep: (v.hospital.cep || '').replace(/\D/g, ''),
                logradouro: v.hospital.logradouro,
                numero: v.hospital.numero,
                bairro: v.hospital.bairro,
                cidade: v.hospital.cidade,
                uf: v.hospital.uf,
              },
            },
            trocaSenhaAdmin:
              v.senhaAdmin.atual && v.senhaAdmin.nova
                ? { senhaAtual: v.senhaAdmin.atual, novaSenha: v.senhaAdmin.nova }
                : null,
          }
        : null,
    };
  }

  async confirmarSalvar(): Promise<void> {
    if (!this.aceiteAssinatura || this.senhaAssinatura.trim().length < 4) return;
    this.showAssinatura = false;
    this.saving = true;

    const payload = { ...this.buildPayload(), senhaConfirmacao: this.senhaAssinatura };
    console.log('[Configurações] payload', payload);

    try {
      // await this.settingsService.save(payload);
      await new Promise((r) => setTimeout(r, 700));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.form.getRawValue()));
      this.form.get('senhaAdmin')!.reset({ atual: '', nova: '', confirmar: '' });
      this.savedAt = new Date();
      await this.toastMsg('Configurações salvas com sucesso.', 'success');
    } catch {
      await this.toastMsg('Não foi possível salvar. Tente novamente.', 'danger');
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
