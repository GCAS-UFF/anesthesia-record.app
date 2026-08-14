import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  saveOutline,
  cloudDoneOutline,
  medkitOutline,
  fitnessOutline,
  heartOutline,
  bodyOutline,
  warningOutline,
  alertCircleOutline,
  documentTextOutline,
  medicalOutline,
  addCircleOutline,
  trashOutline,
  closeOutline,
  chevronBackOutline,
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  createOutline,
  closeCircleOutline,
  lockClosedOutline,
} from 'ionicons/icons';

import { HeaderInstitucionalComponent } from '../../shared/components/header-institucional/header-institucional.component';
import { StatusBarComponent } from '../../shared/components/status-bar/status-bar.component';

interface PreAnesthesiaSection {
  id: string;
  index: number;
  title: string;
  icon: string;
}

interface CheckOption {
  key: string;
  label: string;
}

interface CheckGroupDef {
  key: string;
  title: string;
  options: CheckOption[];
}

function slug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

function group(key: string, title: string, labels: string[]): CheckGroupDef {
  return { key, title, options: labels.map((l) => ({ key: slug(l), label: l })) };
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
    IonModal,
    IonCheckbox,
    HeaderInstitucionalComponent,
    StatusBarComponent,
  ],
  templateUrl: './pre-anesthesic-record.html',
  styleUrls: ['./pre-anesthesic-record.component.scss'],
})
export class FichaPreAnestesicaComponent implements OnInit, OnDestroy {
  form!: FormGroup;

  patientId: string | null = null;
  patient: any = null;

  isSaving = false;

  isSignModalOpen = false;
  signatureAgreed = false;
  signaturePassword = '';
  signatureError = '';

  loggedUser: any = null;
  lastSavedAt: Date | null = null;
  autosaveTimer: any = null;

  activeSectionId = 'procedimento';

  readonly asaOptions = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  readonly mallampatiOptions = ['I', 'II', 'III', 'IV'];

  readonly mucosasOptions = ['Coradas', 'Hipocoradas', 'Hipercoradas', 'Hidratadas', 'Desidratadas', 'Hiperhidratadas'];
  readonly denticaoOptions = ['Presente', 'Ausente', 'Prótese Superior', 'Prótese Inferior'];
  readonly interIncisivosOptions = ['> 3 cm', '< 3 cm', 'NA'];
  readonly incisivosSuperioresOptions = ['Curto', 'Longo', 'NA'];
  readonly relacaoIncisivosOptions = [
    'Maxilares alinhados aos mandibulares',
    'Maxilares anteriores',
    'Maxilares posteriores',
    'NA',
  ];
  readonly palatoOptions = ['Normal', 'Estreito', 'Ogival'];
  readonly simNaoNaOptions = ['Sim', 'Não', 'NA'];
  readonly pescocoComprimentoOptions = ['Normal', 'Longo', 'Curto'];
  readonly pescocoLarguraOptions = ['Normal', 'Grosso'];
  readonly esternoMentonianaOptions = ['> 12,5 cm', '< 12,5 cm'];
  readonly tireomentonianaOptions = ['\u2265 5 cm', '< 5 cm'];
  readonly normalAnormalOptions = ['Normal', 'Anormal'];

  readonly especialidadesHuap = [
    'Cardiologista',
    'Clínico Geral',
    'Pneumologista',
    'Nefrologista',
    'Endocrinologista',
    'Outra',
  ];

  readonly lateralidadeOptions = [
    'Direita',
    'Esquerda',
    'Bilateral',
    'Não se aplica',
  ];

  readonly cirurgiasAghu: string[] = [
    'Colecistectomia videolaparoscópica',
    'Herniorrafia inguinal',
    'Herniorrafia umbilical',
    'Apendicectomia',
    'Histerectomia total abdominal',
    'Cesariana',
    'Curetagem uterina',
    'Artroplastia total de quadril',
    'Artroplastia total de joelho',
    'Osteossíntese de fêmur',
    'Prostatectomia',
    'Ressecção transuretral de próstata (RTU)',
    'Nefrolitotripsia',
    'Tireoidectomia',
    'Mastectomia',
    'Facectomia com implante de LIO',
    'Amigdalectomia',
    'Septoplastia',
    'Laparotomia exploradora',
    'Gastrectomia',
    'Colectomia',
    'Craniotomia',
    'Laminectomia / Artrodese de coluna',
    'Safenectomia / Varizes de MMII',
  ];

  readonly comorbidadeGroups: CheckGroupDef[] = [
    group('cardiovascular', 'Cardiovascular', [
      'Sem alterações',
      'Hipertensão Arterial',
      'Cardiopatia',
      'Arritmia',
      'Insuficiência Cardíaca',
      'Outros',
    ]),
    group('respiratorio', 'Respiratório', [
      'Sem alterações',
      'Asma',
      'DPOC',
      'Bronquite',
      'Outros',
    ]),
    group('neurologico', 'Neurológico', [
      'Sem alterações',
      'Epilepsia',
      'Parkinson',
      'Neuropatia Periférica Diabética',
      'Outros',
    ]),
    group('genitoUrinario', 'Sistema gênito-urinário, incluindo DUM', [
      'Sem alterações',
      'Insuficiência renal',
      'Doença renal crônica',
      'Outros',
    ]),
    group('endocrino', 'Endócrino', [
      'Sem alterações',
      'Diabetes',
      'Síndrome metabólica',
      'Hipotireoidismo',
      'Hipertireoidismo',
      'Obesidade',
      'Outros',
    ]),
    group('digestivo', 'Digestivo', [
      'Sem alterações',
      'Refluxo gastroesofágico',
      'Úlcera gástrica',
      'Úlcera duodenal',
      'Outros',
    ]),
    group('imunologico', 'Imunológico', [
      'Sem alterações',
      'Lúpus',
      'Artrite reumatóide',
      'Tireoidite de Hashimoto',
      'Doença de Graves',
      'Outros',
    ]),
  ];

  readonly exameFisicoGroups: CheckGroupDef[] = [
    group('ausculaCardiaca', 'Ausculta cardíaca', [
      'Sem alterações',
      'Estalidos',
      'Cliques',
      'Terceira Bulha',
      'Quarta Bulha',
      'Hipofonese',
      'Outros',
    ]),
    group('ausculaPulmonar', 'Ausculta pulmonar', [
      'Sem alterações',
      'Estertores crepitantes',
      'Estertores grossos',
      'Sibilos',
      'Roncos',
      'Outros',
    ]),
    group('abdome', 'Abdome', ['Sem alterações']),
    group('membrosSuperiores', 'Membros Superiores', ['Sem alterações']),
    group('membrosInferiores', 'Membros Inferiores', ['Sem alterações']),
    group('dorsoLombar', 'Dorso e Região Lombar', ['Sem alterações']),
  ];

  readonly drogasOptions: CheckOption[] = ['Maconha', 'Cocaína', 'Heroína', 'LSD', 'Outros'].map(
    (l) => ({ key: slug(l), label: l }),
  );

  readonly alergiaOptions: CheckOption[] = ['Látex', 'Penicilina', 'Dipirona', 'Ibuprofeno', 'Outros'].map(
    (l) => ({ key: slug(l), label: l }),
  );

  readonly condutaOptions: CheckOption[] = [
    'Paciente liberado para o procedimento anestésico-cirúrgico',
    'Paciente orientado quanto ao jejum',
    'Termo de Consentimento informado para Anestesia ou Sedação foi aplicado após os esclarecimentos',
    'Termo de consentimento para Transfusão foi aplicado após os esclarecimentos',
    'Medicação pré-anestésica prescrita no prontuário',
  ].map((l) => ({ key: slug(l), label: l }));

  readonly sections: PreAnesthesiaSection[] = [
    { id: 'procedimento', index: 1, title: 'Procedimento', icon: 'medkit-outline' },
    { id: 'antropometria', index: 2, title: 'Antropometria e Sinais Vitais', icon: 'fitness-outline' },
    { id: 'comorbidades', index: 3, title: 'Comorbidades', icon: 'heart-outline' },
    { id: 'habitos', index: 4, title: 'Hábitos', icon: 'warning-outline' },
    { id: 'alergias', index: 5, title: 'Alergias e Reações Adversas', icon: 'alert-circle-outline' },
    { id: 'medicacoes', index: 6, title: 'Medicações em uso', icon: 'medical-outline' },
    { id: 'exame-fisico', index: 7, title: 'Exame Físico', icon: 'body-outline' },
    { id: 'exames', index: 8, title: 'Exames Complementares e Pareceres', icon: 'document-text-outline' },
    { id: 'conduta', index: 9, title: 'Classificação e Conduta', icon: 'checkmark-circle-outline' },
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
      medkitOutline,
      fitnessOutline,
      heartOutline,
      bodyOutline,
      warningOutline,
      alertCircleOutline,
      documentTextOutline,
      medicalOutline,
      addCircleOutline,
      trashOutline,
      closeOutline,
      chevronBackOutline,
      checkmarkCircleOutline,
      shieldCheckmarkOutline,
      createOutline,
      closeCircleOutline,
      lockClosedOutline,
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
    const sc = document.querySelector('.pre-scroll');
    sc?.removeEventListener('scroll', this.onScroll);
  }

  private checkGroup(def: CheckGroupDef): FormGroup {
    const controls: Record<string, any> = {};
    def.options.forEach((o) => (controls[o.key] = [false]));
    controls['outrosDescricao'] = [''];
    controls['observacoes'] = [''];
    return this.fb.group(controls);
  }

  private buildForm(): void {
    const comorbidades: Record<string, FormGroup> = {};
    this.comorbidadeGroups.forEach((g) => (comorbidades[g.key] = this.checkGroup(g)));

    const exameGroups: Record<string, FormGroup> = {};
    this.exameFisicoGroups.forEach((g) => (exameGroups[g.key] = this.checkGroup(g)));

    const drogasTipos: Record<string, any> = {};
    this.drogasOptions.forEach((o) => (drogasTipos[o.key] = [false]));

    const alergiaTipos: Record<string, any> = {};
    this.alergiaOptions.forEach((o) => (alergiaTipos[o.key] = [false]));

    const condutas: Record<string, any> = {};
    this.condutaOptions.forEach((o) => (condutas[o.key] = [false]));

    this.form = this.fb.group({
      procedimento: this.fb.group({
        cirurgias: this.fb.array([] as any[]),
        lateralidade: [''],
        diagnosticoPreOperatorio: [''],
        dataConsulta: [new Date().toISOString().slice(0, 16)],
        observacao: [''],
      }),

      antropometria: this.fb.group({
        peso: [null],
        altura: [null],
        imc: [{ value: null, disabled: true }],
        frequenciaCardiaca: [null],
        pressaoSistolica: [null],
        pressaoDiastolica: [null],
        saturacao: [null],
        temperatura: [null],
        jejumSolidos: [8],
        jejumLiquidos: [8],
      }),

      comorbidades: this.fb.group({
        ...comorbidades,
        outros: this.fb.group({ descricao: [''] }),
        historiaFamiliar: this.fb.group({ descricao: [''] }),
      }),

      habitos: this.fb.group({
        drogasIlicitas: [null],
        drogasTipos: this.fb.group(drogasTipos),
        drogasOutrosDescricao: [''],
        tabagista: [null],
        cargaTabagica: [''],
        etilista: [null],
        gramasAlcoolDia: [''],
      }),

      alergias: this.fb.group({
        possuiAlergia: [null],
        tipos: this.fb.group(alergiaTipos),
        outrosDescricao: [''],
        tipoReacao: [''],
        antecedentesAnestesicos: [''],
      }),

      medicacoes: this.fb.group({
        usaMedicacao: [null],
        itens: this.fb.array([this.novaMedicacao()]),
      }),

      exameFisico: this.fb.group({
        ...exameGroups,
        mucosas: [[] as string[]],
        denticao: [null],
        distanciaInterIncisivos: [null],
        comprimentoIncisivosSuperiores: [null],
        mallampati: [null],
        relacaoIncisivos: [null],
        palato: [null],
        protusaoMandibula: [null],
        pescocoComprimento: [null],
        pescocoLargura: [null],
        distanciaEsternocleidomentoniana: [null],
        distanciaTireomentoniana: [null],
        flexaoPescoco: [null],
        extensaoPescoco: [null],
        complacenciaEspacoMandibular: [null],
        observacoesViaAerea: [''],
        anomaliaCaixaToracica: [null],
        anomaliaCaixaToracicaDescricao: [''],
        previsaoIotDificil: [null],
      }),

      exames: this.fb.group({
        hemoglobina: [null],
        hematocrito: [null],
        leucocitos: [null],
        plaquetas: [null],
        tapInr: [null],
        ttpa: [null],
        glicemia: [null],
        ureia: [null],
        creatinina: [null],
        sodio: [null],
        potassio: [null],
        tp: [''],
        eas: [''],
        funcaoHepatica: [''],
        testeGravidez: [''],
        provaFuncaoRespiratoria: [''],
        ecg: [''],
        rxTorax: [''],
        ecocardiograma: [''],
        outrosExames: [''],
        parecerCardiologia: [''],
        outrosPareceres: this.fb.array([] as any[]),
      }),

      conduta: this.fb.group({
        asa: [null, Validators.required],
        emergencia: [false],
        naoLiberado: [false],
        motivoNaoLiberacao: [''],
        condutas: this.fb.group(condutas),
        anotacoes: [''],
      }),
    });

    this.form.get('antropometria.peso')?.valueChanges.subscribe(() => this.recalcImc());
    this.form.get('antropometria.altura')?.valueChanges.subscribe(() => this.recalcImc());
  }

  private recalcImc(): void {
    const g = this.form.get('antropometria') as FormGroup;
    const peso = Number(g.get('peso')?.value);
    const altura = Number(g.get('altura')?.value);
    if (peso > 0 && altura > 0) {
      const m = altura / 100;
      g.get('imc')?.setValue(Number((peso / (m * m)).toFixed(2)), { emitEvent: false });
    }
  }

  /* ---------------- cirurgias propostas ---------------- */

  get cirurgias(): FormArray {
    return this.form.get('procedimento.cirurgias') as FormArray;
  }

  cirurgiaSelecionada = '';

  addCirurgia(nome?: string): void {
    const valor = (nome ?? this.cirurgiaSelecionada ?? '').trim();
    if (!valor) return;
    if (this.cirurgias.value.some((c: any) => c.nome === valor)) return;
    this.cirurgias.push(this.fb.group({ nome: [valor], principal: [this.cirurgias.length === 0] }));
    this.cirurgiaSelecionada = '';
  }

  removeCirurgia(i: number): void {
    this.cirurgias.removeAt(i);
  }

  setCirurgiaPrincipal(i: number): void {
    this.cirurgias.controls.forEach((c, idx) => c.get('principal')?.setValue(idx === i));
  }

  private novaMedicacao(): FormGroup {
    return this.fb.group({ nome: [''], dose: [''], via: [''], frequencia: [''] });
  }

  get medicacoes(): FormArray {
    return this.form.get('medicacoes.itens') as FormArray;
  }

  addMedicacao(): void {
    this.medicacoes.push(this.novaMedicacao());
  }

  removeMedicacao(i: number): void {
    if (this.medicacoes.length > 1) this.medicacoes.removeAt(i);
    else this.medicacoes.at(0).reset();
  }


  get outrosPareceres(): FormArray {
    return this.form.get('exames.outrosPareceres') as FormArray;
  }

  addParecer(): void {
    this.outrosPareceres.push(this.fb.group({ especialidade: [''], descricao: [''] }));
  }

  removeParecer(i: number): void {
    this.outrosPareceres.removeAt(i);
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

  toggleMulti(path: string, value: string): void {
    const ctrl = this.form.get(path);
    if (!ctrl) return;
    const current: string[] = Array.isArray(ctrl.value) ? [...ctrl.value] : [];
    const idx = current.indexOf(value);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(value);
    ctrl.setValue(current);
    ctrl.markAsDirty();
  }

  isMulti(path: string, value: string): boolean {
    const v = this.form.get(path)?.value;
    return Array.isArray(v) && v.includes(value);
  }

  toggleValue(path: string): void {
    const ctrl = this.form.get(path);
    ctrl?.setValue(!ctrl.value);
  }

  isChecked(path: string): boolean {
    return !!this.form.get(path)?.value;
  }

  hasOutros(basePath: string): boolean {
    return !!this.form.get(`${basePath}.outros`)?.value;
  }

  groupControlPath(base: string, groupKey: string, optionKey: string): string {
    return `${base}.${groupKey}.${optionKey}`;
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
      if (!raw) return;
      const data = JSON.parse(raw);

      const cirurgias = data?.procedimento?.cirurgias ?? [];
      this.cirurgias.clear();
      cirurgias.forEach((c: any) =>
        this.cirurgias.push(this.fb.group({ nome: [c?.nome ?? ''], principal: [!!c?.principal] })),
      );

      const meds = data?.medicacoes?.itens ?? [];
      if (meds.length) {
        this.medicacoes.clear();
        meds.forEach((m: any) =>
          this.medicacoes.push(
            this.fb.group({
              nome: [m?.nome ?? ''],
              dose: [m?.dose ?? ''],
              via: [m?.via ?? ''],
              frequencia: [m?.frequencia ?? ''],
            }),
          ),
        );
      }

      const pareceres = data?.exames?.outrosPareceres ?? [];
      this.outrosPareceres.clear();
      pareceres.forEach((p: any) =>
        this.outrosPareceres.push(
          this.fb.group({ especialidade: [p?.especialidade ?? ''], descricao: [p?.descricao ?? ''] }),
        ),
      );

      this.form.patchValue(data);
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

  goBack(): void {
    this.location.back();
  }

  get expectedSignatureName(): string {
    return (this.loggedUser?.name || this.loggedUser?.fullName || '').trim();
  }

  async salvar(): Promise<void> {
    this.saveDraft();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const t = await this.toastCtrl.create({
        message: 'Preencha os campos obrigatórios (Classificação ASA).',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
      await t.present();
      return;
    }
    this.openSignModal();
  }

  openSignModal(): void {
    this.signatureAgreed = false;
    this.signaturePassword = '';
    this.signatureError = '';
    this.isSignModalOpen = true;
  }

  closeSignModal(): void {
    this.isSignModalOpen = false;
  }

  confirmarESalvar(): void {
    this.signatureError = '';

    if (!this.signatureAgreed) {
      this.signatureError = 'Você precisa marcar a confirmação de veracidade dos dados.';
      return;
    }

    const senha = (this.signaturePassword || '').trim();
    if (!senha) {
      this.signatureError = 'Informe sua senha para assinar digitalmente.';
      return;
    }

    this.isSignModalOpen = false;
    this.executarSalvamento(senha);
  }

  private async executarSalvamento(senha: string): Promise<void> {
    this.isSaving = true;
    const payload = { ...this.buildPayload(), assinatura: { senha } };

    // TODO: chamar PreAnesthesiaService.save(payload)
    // Validar senha no back
    console.log('[pre-anestesica] payload assinado', { ...payload, assinatura: { senha: '***' } });

    setTimeout(async () => {
      this.isSaving = false;
      this.lastSavedAt = new Date();
      this.signaturePassword = '';
      const t = await this.toastCtrl.create({
        message: 'Avaliação pré-anestésica assinada e salva com sucesso.',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
      await t.present();
    }, 700);
  }

  private selectedLabels(def: CheckGroupDef, value: any): string[] {
    return def.options.filter((o) => !!value?.[o.key]).map((o) => o.label);
  }

  buildPayload(): any {
    const raw = this.form.getRawValue();

    const comorbidades = this.comorbidadeGroups.map((g) => ({
      sistema: g.title,
      chave: g.key,
      achados: this.selectedLabels(g, raw.comorbidades[g.key]),
      outrosDescricao: raw.comorbidades[g.key]?.outrosDescricao ?? '',
      observacoes: raw.comorbidades[g.key]?.observacoes ?? '',
    }));

    const viaAerea = {
      mucosas: raw.exameFisico.mucosas,
      denticao: raw.exameFisico.denticao,
      distanciaInterIncisivos: raw.exameFisico.distanciaInterIncisivos,
      comprimentoIncisivosSuperiores: raw.exameFisico.comprimentoIncisivosSuperiores,
      mallampati: raw.exameFisico.mallampati,
      relacaoIncisivos: raw.exameFisico.relacaoIncisivos,
      palato: raw.exameFisico.palato,
      protusaoMandibula: raw.exameFisico.protusaoMandibula,
      pescocoComprimento: raw.exameFisico.pescocoComprimento,
      pescocoLargura: raw.exameFisico.pescocoLargura,
      distanciaEsternocleidomentoniana: raw.exameFisico.distanciaEsternocleidomentoniana,
      distanciaTireomentoniana: raw.exameFisico.distanciaTireomentoniana,
      flexaoPescoco: raw.exameFisico.flexaoPescoco,
      extensaoPescoco: raw.exameFisico.extensaoPescoco,
      complacenciaEspacoMandibular: raw.exameFisico.complacenciaEspacoMandibular,
      observacoes: raw.exameFisico.observacoesViaAerea,
      anomaliaCaixaToracica: raw.exameFisico.anomaliaCaixaToracica,
      anomaliaCaixaToracicaDescricao: raw.exameFisico.anomaliaCaixaToracicaDescricao,
      previsaoIotDificil: raw.exameFisico.previsaoIotDificil,
    };

    const exameFisico = this.exameFisicoGroups.map((g) => ({
      area: g.title,
      chave: g.key,
      achados: this.selectedLabels(g, raw.exameFisico[g.key]),
      outrosDescricao: raw.exameFisico[g.key]?.outrosDescricao ?? '',
      observacoes: raw.exameFisico[g.key]?.observacoes ?? '',
    }));

    return {
      patientId: this.patientId,
      procedimento: {
        cirurgias: raw.procedimento.cirurgias,
        lateralidade: raw.procedimento.lateralidade,
        diagnosticoPreOperatorio: raw.procedimento.diagnosticoPreOperatorio,
        dataConsulta: raw.procedimento.dataConsulta,
        observacao: raw.procedimento.observacao,
      },
      antropometria: raw.antropometria,
      comorbidades,
      comorbidadesOutros: raw.comorbidades.outros?.descricao ?? '',
      historiaFamiliar: raw.comorbidades.historiaFamiliar?.descricao ?? '',
      habitos: {
        drogasIlicitas: raw.habitos.drogasIlicitas,
        drogas: this.drogasOptions.filter((o) => raw.habitos.drogasTipos?.[o.key]).map((o) => o.label),
        drogasOutrosDescricao: raw.habitos.drogasOutrosDescricao,
        tabagista: raw.habitos.tabagista,
        cargaTabagica: raw.habitos.cargaTabagica,
        etilista: raw.habitos.etilista,
        gramasAlcoolDia: raw.habitos.gramasAlcoolDia,
      },
      alergias: {
        possuiAlergia: raw.alergias.possuiAlergia,
        substancias: this.alergiaOptions.filter((o) => raw.alergias.tipos?.[o.key]).map((o) => o.label),
        outrosDescricao: raw.alergias.outrosDescricao,
        tipoReacao: raw.alergias.tipoReacao,
        antecedentesAnestesicos: raw.alergias.antecedentesAnestesicos,
      },
      medicacoesEmUso: {
        usaMedicacao: raw.medicacoes.usaMedicacao,
        itens: (raw.medicacoes.itens ?? []).filter((m: any) => (m?.nome ?? '').trim()),
      },
      exameFisico: {
        viaAerea,
        areas: exameFisico,
      },
      exames: {
        laboratoriais: {
          hemoglobina: raw.exames.hemoglobina,
          hematocrito: raw.exames.hematocrito,
          leucocitos: raw.exames.leucocitos,
          plaquetas: raw.exames.plaquetas,
          tapInr: raw.exames.tapInr,
          ttpa: raw.exames.ttpa,
          glicemia: raw.exames.glicemia,
          ureia: raw.exames.ureia,
          creatinina: raw.exames.creatinina,
          sodio: raw.exames.sodio,
          potassio: raw.exames.potassio,
          tp: raw.exames.tp,
          eas: raw.exames.eas,
          funcaoHepatica: raw.exames.funcaoHepatica,
          testeGravidez: raw.exames.testeGravidez,
        },
        imagemEGraficos: {
          ecg: raw.exames.ecg,
          rxTorax: raw.exames.rxTorax,
          ecocardiograma: raw.exames.ecocardiograma,
          provaFuncaoRespiratoria: raw.exames.provaFuncaoRespiratoria,
          outrosExames: raw.exames.outrosExames,
        },
        pareceres: [
          { especialidade: 'Cardiologia', descricao: raw.exames.parecerCardiologia },
          ...(raw.exames.outrosPareceres ?? []),
        ].filter((p: any) => (p?.descricao ?? '').trim()),
      },
      assinaturaMeta: {
        assinadoPorId: this.loggedUser?.id ?? null,
        assinadoPorNome: this.expectedSignatureName,
        assinadoEm: new Date().toISOString(),
      },
      conduta: {
        asa: raw.conduta.asa,
        emergencia: raw.conduta.emergencia,
        naoLiberado: raw.conduta.naoLiberado,
        motivoNaoLiberacao: raw.conduta.motivoNaoLiberacao,
        condutas: this.condutaOptions
          .filter((o) => raw.conduta.condutas?.[o.key])
          .map((o) => o.label),
        anotacoes: raw.conduta.anotacoes,
      },
    };
  }
}
