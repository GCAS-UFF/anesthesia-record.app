import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  saveOutline,
  cloudDoneOutline,
  personOutline,
  medkitOutline,
  fitnessOutline,
  heartOutline,
  pulseOutline,
  bodyOutline,
  flaskOutline,
  womanOutline,
  ellipsisHorizontalOutline,
  timeOutline,
  warningOutline,
  alertCircleOutline,
  documentTextOutline,
  medicalOutline,
  calendarOutline,
  addCircleOutline,
  closeOutline,
  chevronBackOutline,
  thermometerOutline,
} from 'ionicons/icons';

import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';

interface PreAnesthesiaSection {
  id: string;
  index: number;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-pre-anesthesic-record',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    HeaderInstitucionalComponent,
    StatusBarComponent
],
  templateUrl: './pre-anesthesic-record.html',
  styleUrls: ['./pre-anesthesic-record.component.scss'],
})
export class FichaPreAnestesicaComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  patientId: string | null = null;
  patient: any = null;

  isSaving = false;
  lastSavedAt: Date | null = null;
  autosaveTimer: any = null;

  activeSectionId = 'procedimento';

  readonly asaOptions = ['I', 'II', 'III', 'IV', 'V', 'VI', 'E'];
  readonly metsOptions = ['1 a 4 METs', '4 a 7 METs', '7 a 10 METs', 'Mais de 10 METs'];
  readonly mallampatiOptions = ['I', 'II', 'III', 'IV'];
  readonly porteOptions = ['Pequeno', 'Médio', 'Grande'];
  readonly tevOptions = ['Baixo', 'Moderado', 'Alto'];
  readonly nvpoOptions = ['Baixo', 'Moderado', 'Alto'];

  readonly dorScale = [0,1,2,3,4,5,6,7,8,9,10];

  readonly sections: PreAnesthesiaSection[] = [
    { id: 'procedimento', index: 1, title: 'Procedimento', icon: 'medkit-outline' },
    { id: 'exame-fisico', index: 2, title: 'Exame Físico', icon: 'fitness-outline' },
    { id: 'nivel-dor', index: 3, title: 'Nível de Dor', icon: 'thermometer-outline' },
    { id: 'cardio', index: 4, title: 'Condição Cardiovascular', icon: 'heart-outline' },
    { id: 'respiratoria', index: 5, title: 'Condição Respiratória', icon: 'pulse-outline' },
    { id: 'neurologica', index: 6, title: 'Condição Neurológica', icon: 'body-outline' },
    { id: 'renal', index: 7, title: 'Condição Renal', icon: 'flask-outline' },
    { id: 'endocrina', index: 8, title: 'Condição Endócrina', icon: 'medical-outline' },
    { id: 'ginecologica', index: 9, title: 'Condição Ginecológica', icon: 'woman-outline' },
    { id: 'outros', index: 10, title: 'Outros', icon: 'ellipsis-horizontal-outline' },
    { id: 'historico', index: 11, title: 'Histórico Pregresso', icon: 'time-outline' },
    { id: 'habitos', index: 12, title: 'Hábitos', icon: 'warning-outline' },
    { id: 'alergias', index: 13, title: 'Alergias', icon: 'alert-circle-outline' },
    { id: 'exames', index: 14, title: 'Exames', icon: 'document-text-outline' },
    { id: 'condicoes-clinicas', index: 15, title: 'Condições Clínicas', icon: 'medical-outline' },
    { id: 'programacao', index: 16, title: 'Programação', icon: 'calendar-outline' },
    { id: 'extras', index: 17, title: 'Extras', icon: 'add-circle-outline' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private location: Location,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline,
      saveOutline,
      cloudDoneOutline,
      personOutline,
      medkitOutline,
      fitnessOutline,
      heartOutline,
      pulseOutline,
      bodyOutline,
      flaskOutline,
      womanOutline,
      ellipsisHorizontalOutline,
      timeOutline,
      warningOutline,
      alertCircleOutline,
      documentTextOutline,
      medicalOutline,
      calendarOutline,
      addCircleOutline,
      closeOutline,
      chevronBackOutline,
      thermometerOutline,
    });
  }

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id');
    this.buildForm();
    this.setupAutosave();
    this.loadDraft();
    this.setupScrollSpy();
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    window.removeEventListener('scroll', this.onScroll, true);
  }

  private buildForm(): void {
    this.form = this.fb.group({      
      procedimento: this.fb.group({
        cirurgiaProposta: [''],
        lateralidade: [''],
        observacao: [''],
        dataConsulta: [new Date().toISOString().slice(0, 16)],
      }),

      exameFisico: this.fb.group({
        peso: [null],
        altura: [null],
        imc: [{ value: null, disabled: true }],
        pesoIdeal: [{ value: null, disabled: true }],
        pesoIdealCorrigido: [{ value: null, disabled: true }],
        frequenciaCardiaca: [null],
        pressaoSistolica: [null],
        pressaoDiastolica: [null],
        jejumSolidos: [8],
        jejumLiquidos: [8],
      }),

      nivelDor: this.fb.group({
        nivel: [null],
        descricao: [''],
      }),

      cardio: this.fb.group({
        possuiAfeccoes: [null],
        detalhes: [''],
        capacidadeMets: [null],
      }),

      respiratoria: this.fb.group({
        possuiAfeccoes: [null],
        detalhes: [''],
        asma: [false],
        riscoBroncoaspiracao: [null],
      }),

      neurologica: this.fb.group({
        possuiAfeccoes: [null],
        detalhes: [''],
      }),

      renal: this.fb.group({
        possuiAfeccoes: [null],
        detalhes: [''],
      }),

      endocrina: this.fb.group({
        possuiAfeccoes: [null],
        detalhes: [''],
      }),

      ginecologica: this.fb.group({
        possuiAfeccoes: [null],
        detalhes: [''],
        estaGravida: [null],
        idadeGestacional: [null],
        primeiraMenstruacao: [null],
        gestacoesAnteriores: [null],
        menopausa: [null],
        comorbidadeGestacional: [null],
        sofrimentoFetal: [null],
      }),

      outros: this.fb.group({
        outroProblemaSaude: [null],
        detalhes: [''],
        sindromeConhecida: [null],
        sindromeDetalhe: [''],
      }),

      historico: this.fb.group({
        usoRegularMedicamento: [null],
        medicamentos: [''],
        anestesiaAnterior: [null],
        anestesiaAnteriorDetalhe: [''],
        vacinacaoRecente: [null],
        prematuridade: [null],
        hipertermiaMalignaFamiliar: [null],
        autismoDiagnostico: [null],
        cirurgiasAnteriores: [null],
        cirurgiasAnterioresDetalhe: [''],
      }),

      habitos: this.fb.group({
        drogasIlicitas: [null],
        fumante: [null],
        tabagismoPassivo: [null],
        alcool: [null],
      }),

      alergias: this.fb.group({
        possuiAlergia: [null],
        detalhes: [''],
      }),

      exames: this.fb.group({
        possuiExames: [null],
        soropositivoHIV: [null],
        observacao: [''],
      }),

      condicoesClinicas: this.fb.group({
        mallampati: [null],
        aberturaBucalMenor3cm: [null],
        distanciaTireomentoniana: [null],
        extensaoCervicalLimitada: [null],
        denticaoAlterada: [null],
        proteseDentaria: [null],
        previsaoIotDificil: [null],
        classificacaoASA: [null, Validators.required],
      }),

      programacao: this.fb.group({
        tecnicaAnestesicaProposta: [null],
        tecnicaDetalhe: [''],
        medicacaoPreAnestesica: [null],
        medicacaoDetalhe: [''],
      }),

      extras: this.fb.group({
        solicitacaoSangue: [null],
        solicitacaoUti: [null],
        outrasObservacoes: [null],
        outrasObservacoesTexto: [''],
        riscoSangramento: [null],
        riscoNauseasVomitos: [null],
        protocoloMaltodextrina: [null],
        orientacoesPaciente: [null],
        riscoTEV: [null],
        cirurgiaOncologica: [null],
        porteCirurgia: [null],
      }),
    });

    this.form.get('exameFisico.peso')?.valueChanges.subscribe(() => this.recalcAntropometria());
    this.form.get('exameFisico.altura')?.valueChanges.subscribe(() => this.recalcAntropometria());
  }

  private recalcAntropometria(): void {
    const ef = this.form.get('exameFisico') as FormGroup;
    const peso = Number(ef.get('peso')?.value);
    const altura = Number(ef.get('altura')?.value);

    if (peso > 0 && altura > 0) {
      const alturaM = altura / 100;
      const imc = peso / (alturaM * alturaM);
      const pesoIdeal = 22 * alturaM * alturaM;
      const pesoIdealCorrigido = pesoIdeal + 0.4 * (peso - pesoIdeal);
      ef.get('imc')?.setValue(Number(imc.toFixed(2)), { emitEvent: false });
      ef.get('pesoIdeal')?.setValue(Number(pesoIdeal.toFixed(1)), { emitEvent: false });
      ef.get('pesoIdealCorrigido')?.setValue(Number(pesoIdealCorrigido.toFixed(1)), { emitEvent: false });
    }
  }


  setBool(path: string, value: boolean): void {
    this.form.get(path)?.setValue(value);
  }

  isBool(path: string, value: boolean): boolean {
    return this.form.get(path)?.value === value;
  }

  setValue(path: string, value: any): void {
    this.form.get(path)?.setValue(value);
  }

  isValue(path: string, value: any): boolean {
    return this.form.get(path)?.value === value;
  }


  private setupAutosave(): void {
    this.autosaveTimer = setInterval(() => this.saveDraft(), 20000);
  }

  private storageKey(): string {
    return `pre-anestesica:draft:${this.patientId ?? 'novo'}`;
  }

  saveDraft(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(this.form.getRawValue()));
      this.lastSavedAt = new Date();
    } catch {}
  }

  private loadDraft(): void {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) this.form.patchValue(JSON.parse(raw));
    } catch {}
  }

  private onScroll = () => {
    const scrollContainer = document.querySelector('.pre-scroll') as HTMLElement | null;
    if (!scrollContainer) return;
    const top = scrollContainer.scrollTop + 120;
    for (const s of this.sections) {
      const el = document.getElementById(`sec-${s.id}`);
      if (el && el.offsetTop <= top) this.activeSectionId = s.id;
    }
  };

  private setupScrollSpy(): void {
    setTimeout(() => {
      const scrollContainer = document.querySelector('.pre-scroll');
      scrollContainer?.addEventListener('scroll', this.onScroll, { passive: true });
    }, 300);
  }

  goToSection(id: string): void {
    this.activeSectionId = id;
    const el = document.getElementById(`sec-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setNivelDor(n: number): void {
    const map: Record<number, string> = {
      0: 'Nenhuma', 1: 'Leve', 2: 'Leve', 3: 'Leve',
      4: 'Moderada', 5: 'Moderada', 6: 'Moderada',
      7: 'Forte', 8: 'Muito forte', 9: 'Muito forte',
      10: 'Pior possível',
    };
    this.form.get('nivelDor.nivel')?.setValue(n);
    this.form.get('nivelDor.descricao')?.setValue(map[n]);
  }

  goBack(): void {
    this.location.back();
  }

  async salvar(): Promise<void> {
    this.saveDraft();
    if (this.form.invalid) {
      const t = await this.toastCtrl.create({
        message: 'Preencha os campos obrigatórios (Classificação ASA).',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
      await t.present();
      return;
    }
    this.isSaving = true;
    // TODO: chamar PreAnesthesiaService.save(this.buildPayload())
    setTimeout(async () => {
      this.isSaving = false;
      this.lastSavedAt = new Date();
      const t = await this.toastCtrl.create({
        message: 'Avaliação pré-anestésica salva com sucesso.',
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await t.present();
    }, 700);
  }

  buildPayload() {
    const raw = this.form.getRawValue();
    return {
      patientId: this.patientId,
      savedAt: new Date().toISOString(),
      ...raw,
      // Campo dedicado enviado ao back-end para o Nível de Dor
      painLevel: {
        score: raw?.nivelDor?.nivel ?? null,
        description: raw?.nivelDor?.descricao ?? null,
      },
    };
  }
}
